import asyncio
from typing import Any, TypedDict

from langgraph.graph import END, START, StateGraph

from .models import (
    Event,
    EvidenceAnalysis,
    JudicialReview,
    Report,
    Round,
    Run,
    StructuredCase,
    Submission,
    now,
)
from .provider import GeminiProvider
from .store import Store

NODES = [
    ("structure", "Structure case"),
    ("research", "Research Pakistani law"),
    ("evidence", "Evaluate evidence"),
    ("round1_arguments", "Round 1 · independent arguments"),
    ("round1_judge", "Round 1 · judicial review"),
    ("round2_arguments", "Round 2 · rebuttals"),
    ("round2_judge", "Round 2 · judicial review"),
    ("report", "Compile risk report"),
]


class State(TypedDict, total=False):
    run: Run
    pending: dict[str, Any]


def audit_references(value, source_ids: set[str], evidence_ids: set[str], warnings: list[str]):
    """Remove nonexistent references. This verifies IDs, not the truth of cited propositions."""
    if isinstance(value, dict):
        for key, item in value.items():
            if key in ("source_ids", "evidence_ids") and isinstance(item, list):
                allowed = source_ids if key == "source_ids" else evidence_ids
                invalid = [ref for ref in item if ref not in allowed]
                if invalid:
                    warnings.append(f"Removed unknown {key}: {', '.join(map(str, invalid))}.")
                value[key] = [ref for ref in item if ref in allowed]
            else:
                audit_references(item, source_ids, evidence_ids, warnings)
    elif isinstance(value, list):
        for item in value:
            audit_references(item, source_ids, evidence_ids, warnings)
    return value


def build_graph(provider, store: Store):
    graph = StateGraph(State)

    def context(run: Run) -> dict:
        return {
            "case": run.snapshot.model_dump(),
            "structured": run.structured.model_dump() if run.structured else None,
            "research": run.research.model_dump(exclude={"search_suggestions_html"})
            if run.research
            else None,
            "evidence_analysis": run.evidence_analysis.model_dump() if run.evidence_analysis else None,
            "previous_rounds": [r.model_dump() for r in run.rounds],
        }

    def validate_result(result, run):
        data = audit_references(
            result.model_dump(),
            {s.id for s in run.research.sources} if run.research else set(),
            {e.id for e in run.snapshot.evidence},
            run.citation_warnings,
        )
        return type(result).model_validate(data)

    async def structure(state):
        run = state["run"]
        run.structured = await provider.structured(
            "Case intake analyst",
            "Summarize the case, identify individually numbered claims C1, C2 etc, factual chronology, issues and missing facts. Link only supplied evidence IDs. Make the research query anonymous.",
            {"case": run.snapshot.model_dump()},
            StructuredCase,
        )
        run.structured = validate_result(run.structured, run)
        return {"run": run}

    async def research(state):
        run = state["run"]
        run.research = await provider.research(run.structured.research_query, run.snapshot.province)
        return {"run": run}

    async def evidence(state):
        run = state["run"]
        run.evidence_analysis = await provider.structured(
            "Independent evidence analyst",
            "Evaluate EVERY supplied evidence item once using its exact evidence_id. Identify relevance, supported/challenged claim IDs, contradictions, completeness and limitations. Do not certify authenticity, handwriting, chain of custody or admissibility. If no evidence, return empty findings and state the gap.",
            context(run),
            EvidenceAnalysis,
        )
        valid_ids = {e.id for e in run.snapshot.evidence}
        returned_ids = [f.evidence_id for f in run.evidence_analysis.findings]
        if set(returned_ids) != valid_ids or len(returned_ids) != len(valid_ids):
            raise ValueError("Evidence analysis did not cover exactly the supplied evidence. Retry this run.")
        return {"run": run}

    def arguments(round_number):
        async def node(state):
            run = state["run"]
            base = context(run)
            instruction = (
                "Build your strongest evidence-based opening case independently."
                if round_number == 1
                else "Respond specifically to the opposing first-round arguments and the judge questions. Revise weak arguments, concede unsupported points, and explain what changed. Do not just repeat the opening."
            )
            # Both receive exactly the same prior state, never the opponent's current-round submission.
            plaintiff, defense = await asyncio.gather(
                *[
                    provider.structured(
                        f"{party} advocate",
                        instruction
                        + " Cite provided source_ids and evidence_ids per argument. For uncited legal propositions explicitly state verification required. Give argument strength, vulnerabilities and concessions.",
                        base,
                        Submission,
                    )
                    for party in ("Plaintiff", "Defense")
                ]
            )
            return {
                "pending": {
                    "plaintiff": validate_result(plaintiff, run),
                    "defense": validate_result(defense, run),
                }
            }

        return node

    def judge(round_number):
        async def node(state):
            run = state["run"]
            pending = state["pending"]
            review = await provider.structured(
                "Neutral judge evaluator",
                f"Evaluate both sides in round {round_number}. Compare legal and evidentiary support, identify unresolved issues and specific questions for rebuttal. In round 2 evaluate whether the round-1 objections were resolved. This is an analytical assessment, not a ruling. No numerical win predictions.",
                {**context(run), "current_submissions": {k: v.model_dump() for k, v in pending.items()}},
                JudicialReview,
            )
            run.rounds.append(Round(number=round_number, **pending, judge=validate_result(review, run)))
            return {"run": run, "pending": {}}

        return node

    async def report(state):
        run = state["run"]
        result = await provider.structured(
            "Final legal risk reviewer",
            "Synthesize both adversarial rounds into a practical risk report. Include applicable law and actual precedents only where supported by supplied source IDs; otherwise omit and explain the research gap. Distinguish argument strength from outcome prediction. Confidence is an uncalibrated qualitative assessment of the available material, never a win probability. Include provincial/currentness limitations and prioritized next steps. If evidence or sources are absent, confidence must be Low.",
            context(run),
            Report,
        )
        result = validate_result(result, run)
        # An authority cannot survive as a cited authority when it has no valid source.
        for field in ("applicable_law", "precedents"):
            items = getattr(result, field)
            for item in items:
                if not item.source_ids:
                    run.citation_warnings.append(f"Excluded unsupported authority: {item.title}.")
            setattr(result, field, [item for item in items if item.source_ids])
        if not run.research.sources or not run.snapshot.evidence:
            result.confidence = "Low"
            result.confidence_reason += (
                " Confidence capped at Low because sources or submitted evidence are missing."
            )
        if not result.precedents:
            result.limitations.append(
                "No source-supported precedent was established in this run. Verify case law independently."
            )
        result.limitations.extend(run.citation_warnings)
        run.report = result
        return {"run": run}

    functions = [structure, research, evidence, arguments(1), judge(1), arguments(2), judge(2), report]
    for (key, label), fn in zip(NODES, functions):

        def wrap(fn=fn, key=key, label=label):
            async def execute(state):
                run = state["run"]
                run.events.append(Event(node=key, label=label, status="running"))
                store.save_run(run)
                try:
                    result = await fn(state)
                    run.events.append(Event(node=key, label=label, status="completed"))
                    store.save_run(run)
                    return result
                except Exception:
                    run.events.append(Event(node=key, label=label, status="failed"))
                    store.save_run(run)
                    raise

            return execute

        graph.add_node(key, wrap())
    chain = [START] + [key for key, _ in NODES] + [END]
    for left, right in zip(chain, chain[1:]):
        graph.add_edge(left, right)
    return graph.compile()


async def execute_run(run: Run, store: Store, provider=None):
    owned_provider = provider is None
    try:
        run.status = "running"
        store.save_run(run)
        if provider is None:
            if run.mode == "demo":
                from .sample import DemoProvider

                provider = DemoProvider()
            else:
                provider = GeminiProvider()
        await asyncio.wait_for(build_graph(provider, store).ainvoke({"run": run, "pending": {}}), timeout=900)
        run.status = "completed"
        run.completed_at = now()
    except asyncio.CancelledError:
        run.status = "interrupted"
        run.error = "Analysis interrupted. Start a new run to retry."
        raise
    except TimeoutError:
        run.status = "failed"
        run.error = (
            "Analysis exceeded 15 minutes. Partial results were saved. Retry when the provider is available."
        )
    except Exception as exc:
        from .provider import ProviderError

        run.status = "failed"
        run.error = (
            str(exc)
            if isinstance(exc, (ProviderError, ValueError))
            else "Analysis failed. Partial results were saved. Please retry."
        )
    finally:
        store.save_run(run)
        if owned_provider and isinstance(provider, GeminiProvider):
            await provider.close()
