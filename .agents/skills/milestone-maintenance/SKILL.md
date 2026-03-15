# Milestone Maintenance

Use this skill when a milestone requires repo-local orchestration upkeep.

## Steps
1. Verify the live repo state first.
2. Update only orchestration artifacts that are missing, stale, or role-confused.
3. Keep stable rules in `AGENTS.md`.
4. Keep only the current path in `PLANS.md`.
5. Keep durable project facts in `docs/orchestration/PROJECT_STATE.md`.
6. Keep workflow-process changes in `docs/orchestration/WORKFLOW_CHANGELOG.md`.
7. Keep reusable recipes only in `.agents/skills/`.

## Guardrails
- Do not invent project facts.
- Do not log fake history.
- Do not use orchestration files to silently resolve product ambiguity.
