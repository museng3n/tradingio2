# Push Readiness

Use this skill when a local checkpoint may be published.

## Steps
1. Verify branch, local `HEAD`, `origin/main`, and ahead/behind counts.
2. Confirm no tracked drift exists.
3. Confirm only accepted unrelated untracked artifacts remain.
4. Audit the target diff or commit for scope cleanliness.
5. If any mismatch exists, stop and report it precisely.

## Guardrails
- Never push on assumed state.
- Never hide a mismatch behind a summary.
