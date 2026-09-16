# Architecture and implementation notes

## Boundaries

The React frontend sends same-origin requests to FastAPI. Pydantic validates user input and every structured AI response. A compiled LangGraph graph coordinates the workflow. Google Gemini handles structured generation and search-grounded research; SQLite saves cases and runs. No key is bundled into frontend JavaScript.

The default jurisdiction is Pakistan; territory selection narrows research prompts. No foreign jurisdiction is silently substituted. Primary sources are preferred, but the UI explicitly distinguishes source provenance from legal verification. Court and amendment verification still requires human review.

## Modules

| File | Responsibility |
|---|---|
| `backend/app/models.py` | Input, evidence, argument, review, research, report and run schemas |
| `backend/app/main.py` | API routes, upload limits, local security, background jobs and static app |
| `backend/app/workflow.py` | Eight-node LangGraph, independent advocates, two judge reviews, citation audit |
| `backend/app/provider.py` | Gemini structured responses, retries, errors and grounding metadata |
| `backend/app/extraction.py` | PDF, DOCX and text extraction; file limits and SHA-256 |
| `backend/app/store.py` | SQLite persistence and interrupted-run recovery |
| `backend/app/sample.py` | Synthetic case and deterministic demo provider |
| `backend/app/reporting.py` | Portable Markdown assessment export |
| `frontend/src/App.tsx` | Workspace, case tabs, research, agent team, dialogs and polling |

## State and adversarial independence

The case is copied before a run starts. Every run retains that snapshot and its source register. A subsequent upload cannot rewrite the inputs behind an old report.

Round 1 advocates receive the structured case, evidence assessment and research only. Their calls run concurrently with the same context. The judge receives both completed submissions. Round 2 advocates receive the previous round, including the judge's questions. The current-round submission is only shared with the judge after both advocates finish.

Each stage writes a running event, persists successful outputs, then writes a completed event. Failure records a failed event and preserves the last successful state. A 15-minute overall timeout bounds execution. Individual provider calls time out after 120 seconds; transient 429/5xx errors are retried at most twice. Runs interrupted by process restarts become `interrupted` on the next startup. They are retried as new runs, not resumed inside an opaque LLM call.

## Citation handling

The provider's grounding metadata determines source IDs and URLs; the model cannot invent entries in the source register. Supporting text passages are retained separately. Argument, review and final-authority citation IDs are checked against that register. Unknown IDs are removed and surfaced in citation warnings. Final authorities without any valid source are excluded. Evidence references are checked against the snapshot. Every supplied evidence item must be covered exactly once by the evidence analyst.

An ID match is a provenance check, not a semantic fact check. A known URL can still be stale, secondary, incorrectly applied or inaccessible. The report exposes this limitation rather than presenting its output as certified law.

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Safe configuration status and graph labels |
| GET / POST | `/api/cases` | List / create cases |
| POST | `/api/sample` | Create or reuse unchanged sample |
| GET | `/api/cases/{id}` | Case and evidence detail |
| POST | `/api/cases/{id}/evidence` | Add pasted evidence |
| POST | `/api/cases/{id}/upload` | Extract and attach a document |
| GET / POST | `/api/cases/{id}/runs` | History / start analysis |
| GET | `/api/runs/{id}` | Progress and partial/final output |
| GET | `/api/runs/{id}/export?format=markdown` | Markdown report |
| GET | `/api/runs/{id}/export?format=json` | Full run export |
| POST | `/api/search` | Standalone grounded legal research |

## Extension path

A production successor would use per-user authentication and database ownership, object storage for originals, OCR with page-level provenance, a maintained authoritative retrieval corpus, semantic citation checking, a human review queue and a durable worker system. Those are explicit extensions, not implied capabilities of this version.
