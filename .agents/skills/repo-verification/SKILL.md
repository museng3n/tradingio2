# Repo Verification

Use this skill when a phase must confirm the live repo state before any decision.

## Steps
1. Verify the repo root and branch.
2. Read local `HEAD` and the current `origin/main`.
3. Refresh `origin` when remote freshness matters.
4. Check tracked drift with `git status --short --branch`.
5. List untracked files with `git ls-files --others --exclude-standard`.
6. Report mismatches exactly; do not smooth them over.

## Output Rule
- Separate tracked drift from unrelated untracked artifacts.
- State whether the accepted handoff still matches fully.
