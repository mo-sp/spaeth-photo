# AGENTS.md

Behavioral guidelines for every agent (and human) working in this repository. They apply on top of `CLAUDE.md` and bias toward caution over speed; for trivial tasks, use judgment.

## 1. Think before coding

Don't assume. Don't hide confusion. Surface tradeoffs.

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them – don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity first

Minimum code that solves the problem. Nothing speculative.

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical changes

Touch only what you must. Clean up only your own mess.

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it – don't delete it.
- Remove imports/variables/functions that *your* changes made unused; leave pre-existing dead code unless asked.

The test: every changed line should trace directly to the request.

## 4. Goal-driven execution

Define success criteria. Loop until verified.

- "Add validation" → write tests for invalid inputs, then make them pass.
- "Fix the bug" → write a test that reproduces it, then make it pass.
- "Refactor X" → ensure tests pass before and after.

For multi-step tasks, state a brief plan: `[step] → verify: [check]`.

## 5. Comments and prose

Code should explain itself; comments explain only what the code cannot.

- Comment the *why* (a non-obvious constraint, a measured number, a rejected alternative), never the *what*.
- One or two lines. No essays, no restating the ruling, no narrative of how the code came to be.
- Doc comments on exported functions: one sentence. Parameters only when their meaning is not obvious from name and type.
- Design reasoning belongs in `docs/architecture.md`, not in source comments. Session narrative belongs in the private `SUMMARY.md`.
- Commit messages: Conventional style, subject ≤ 72 characters, body only when the diff does not explain itself.
- Language: English everywhere in this repository (code, comments, tests, commits, docs). The website UI is bilingual; the private content repo may be German.

These guidelines are working if diffs contain fewer unnecessary changes, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
