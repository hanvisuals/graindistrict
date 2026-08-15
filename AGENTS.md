# Grain District repository instructions

Read `PROJECT_HANDOFF.md` completely before starting work in this repository. It is
the durable continuation record for the prior Codex sessions and contains the product
decisions, architecture, implemented fixes, tests, live QA evidence, Git state, and
known follow-up work.

Repository rules:

- Treat the current code and Git state as the source of truth.
- Inspect before changing; do not reconstruct context from assumptions.
- Preserve user-owned uncommitted changes in the development worktree identified in
  `PROJECT_HANDOFF.md`.
- The voiceover is the product's core. Chapters must create causal progress rather
  than merely divide text by time.
- Any accepted voiceover revision must invalidate and rebuild only the corresponding
  B-roll dependencies before the visual grid is built.
- Do not invent factual biography. Explicitly fictional or dramatized storytelling is
  allowed, but its story reality must stay internally consistent.
- Validate changes with focused automated tests and, for generation-flow changes,
  representative live browser/API tests when available.

