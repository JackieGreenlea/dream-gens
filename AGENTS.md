# AGENTS.md

Build `dream-gens` in small, reviewable steps.

Rules:
- Do not overengineer.
- Prefer simple, readable code.
- Keep changes tightly scoped.
- Do not add features that were not requested.
- Inspect the local codebase first. Do not assume GitHub is current.
- Use strict schemas for structured model outputs.
- Preserve the product direction: prompt -> hidden blueprint -> saved story profile -> customize -> play.
- Do not expose the hidden blueprint in the UI unless explicitly requested.
- Do not promote every blueprint field into the saved story shape.
- Keep the app feeling like a consumer romance/smut story product, not a general writing tool or quest engine.
- Keep UI clean, calm, and easy to scan.
- Avoid broad refactors unless explicitly requested.
- If a task is too large, break it into smaller steps.

After each major task, report:
1. What changed
2. Why it changed
3. Which files were touched
4. Any schema or migration impact
5. Any judgment calls made
6. Anything intentionally deferred