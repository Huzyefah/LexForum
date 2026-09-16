from .models import Run


def markdown_report(run: Run) -> str:
    r = run.report
    lines = [
        f"# LexForum · {run.snapshot.title}",
        "",
        f"Jurisdiction: Pakistan / {run.snapshot.province}",
        f"Analysis: {run.id} | {run.mode.upper()} | {run.completed_at}",
        f"Model: {run.model}",
        "",
        "> " + r.disclaimer,
        "",
    ]
    if run.mode == "demo":
        lines += ["> DEMONSTRATION ONLY. Fixed synthetic case; no live AI research was performed.", ""]
    lines += [
        "## Executive assessment",
        r.executive_summary,
        "",
        f"Overall risk: **{r.overall_risk}**",
        f"Confidence: **{r.confidence}** — {r.confidence_reason}",
        f"Argument strength: plaintiff **{r.plaintiff_strength}**, defense **{r.defense_strength}**",
        "",
    ]
    for title, authorities in [("Applicable law", r.applicable_law), ("Precedents", r.precedents)]:
        lines += [f"## {title}"]
        if not authorities:
            lines += ["No source-supported authority established. Independent research is required."]
        for a in authorities:
            lines += [
                f"### {a.title}",
                a.provision_or_holding,
                a.application,
                "Sources: " + ", ".join(a.source_ids),
                "Verify: " + a.verification_needed,
                "",
            ]
    lines += ["## Risks"]
    for risk in r.risks:
        lines += [
            f"### {risk.title} ({risk.severity})",
            risk.explanation,
            "Mitigation: " + risk.mitigation,
            "",
        ]
    for title, items in [
        ("Evidence gaps", r.evidence_gaps),
        ("Recommended next steps", r.next_steps),
        ("Limitations", r.limitations),
    ]:
        lines += [f"## {title}"] + [f"- {item}" for item in items] + [""]
    for round in run.rounds:
        lines += [f"## Adversarial round {round.number}"]
        for party in ("plaintiff", "defense"):
            submission = getattr(round, party)
            lines += [f"### {party.title()}", submission.thesis]
            for a in submission.arguments:
                lines += [
                    f"- **{a.title}** ({a.strength}): {a.position}",
                    f"  Evidence: {', '.join(a.evidence_ids) or 'None'}; sources: {', '.join(a.source_ids) or 'Unverified'}. Vulnerability: {a.vulnerability}",
                ]
            lines += ["Rebuttals:"] + ["- " + text for text in submission.rebuttals]
            lines += ["Concessions:"] + ["- " + text for text in submission.concessions]
        lines += ["### Judge evaluation", round.judge.assessment, ""]
    lines += ["## Evidence register"]
    for e in run.snapshot.evidence:
        lines += [f"- {e.id}: {e.title} | SHA-256: {e.sha256}"]
    lines += ["", "## Source register"]
    for s in run.research.sources:
        lines += [
            f"- [{s.id}: {s.title}]({s.url}) — {s.status}; retrieved {s.retrieved_at}",
            f"  Supporting passage: {s.excerpt}",
        ]
    lines += ["", "## Citation audit"] + ["- " + w for w in run.citation_warnings]
    return "\n".join(lines) + "\n"
