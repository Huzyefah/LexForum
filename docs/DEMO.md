# Bootcamp presentation guide

## Five-minute walkthrough

1. **Problem (30 seconds):** A case narrative alone hides contested facts, missing exhibits and counterarguments. LexForum creates one reviewable record of those issues.
2. **Intake (45 seconds):** Open the sample or create a case. Point out province, parties, remedy and narrative. The sample is fictional; avoid using sensitive real material during a presentation.
3. **Evidence (45 seconds):** Inspect the agreement, email thread and advance payment. Explain that text extraction and a fingerprint do not prove authenticity.
4. **Agents (90 seconds):** Show the four specialist roles and two rounds. Compare plaintiff and defense positions; show the judge's first-round questions and second-round rebuttals. Explain that independence means separate prompts and shared prior context, not different underlying models.
5. **Report (60 seconds):** Show risk, qualitative confidence, source links, gaps and next steps. Open the source register and explain the difference between grounded citations and verified legal authority. Export Markdown or JSON.
6. **Architecture and limits (30 seconds):** React → FastAPI → LangGraph → Gemini/Search → SQLite. Explain that production authentication, OCR and lawyer review remain future work.

## Reliable fallback

Use **Offline demonstration** on the unchanged sample if internet access or provider quota fails. This exercises the same graph with fixed outputs and is visibly labeled. Say explicitly that it demonstrates orchestration and UI behavior, not a live inference or legal search.

## Questions to prepare for

- **Why LangGraph?** The stateful graph makes the order, round boundaries and persisted stage outputs explicit.
- **How are opposing agents independent?** They draft concurrently from the same pre-round context and do not receive the other's current draft.
- **How do you avoid made-up citations?** Source URLs come from provider grounding metadata; generated reference IDs are checked. Semantic citation verification still needs human review.
- **What does confidence mean?** A qualitative assessment of record completeness and reasoning support, not a win probability or calibrated accuracy score.
- **What if the provider fails?** The run records an actionable error and preserves partial outputs. No fabricated fallback is substituted into live results.
- **Does this replace lawyers?** No. It structures research and preparation; a qualified advocate must verify law and strategy.
