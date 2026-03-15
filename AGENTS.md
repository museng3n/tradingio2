# TradingHub Repo-Local Orchestration Rules

## Workflow Constitution
- Milestone-based orchestration is the default workflow method for this repo.
- The old micro-job style is deprecated as the default and must not be used unless a milestone explicitly narrows to a truly atomic follow-up.
- Work must be evidence-first: inspect the live repo before making decisions.
- Truthfulness is mandatory. Do not invent project facts, checkpoints, semantics, or completion state.
- Protected product surfaces must not be changed casually, especially [frontend/TradingHub-Standalone (1).html](/C:/Users/musta/tradinghub2/frontend/TradingHub-Standalone%20(1).html).
- No visual drift, no silent scope expansion, and no silent structural decisions.

## Coordinator / Executor Model
- The coordinator defines the phase goal and the phase boundary.
- The executor must stay inside that boundary and complete the exact next safe step only.
- Accepted work must not be redone casually. Re-open a completed slice only if it becomes a true prerequisite or the live repo contradicts the accepted state.
- Raise early user/coordinator discussion when a requested phase would force a hidden semantic decision, UI drift, or cross-slice scope jump.

## File Role Separation
- `AGENTS.md` holds stable constitutional workflow rules only.
- `PLANS.md` holds the current orchestration milestone and the current execution path only.
- `docs/orchestration/PROJECT_STATE.md` holds accepted durable project facts only.
- `docs/orchestration/WORKFLOW_CHANGELOG.md` holds truthful workflow-process changes only.
- `.agents/skills/` holds reusable task recipes only and must not contain project facts.
- If one of these files is stale enough to mislead the next phase, the milestone is incomplete until it is corrected truthfully.

## Milestone Discipline
- Each milestone must end with repo-local orchestration maintenance when needed; this is part of completion, not an optional afterthought.
- Automatic updates are allowed only within truthfulness limits.
- Do not convert temporary assumptions into durable facts.
- Keep milestone documents concise, operational, and repo-native.

## Visible Output Discipline
- Protected frontend structure, wording, layout, and semantics must remain unchanged unless a phase explicitly authorizes a truthful binding inside existing slots.
- If a canonical UI slot does not exist, do not invent one.
- If a visible metric lacks exact backend semantics or coverage, treat it as blocked.

## Commit / Push Discipline
- Do not create commits unless the phase explicitly allows it and the work is complete, verified, and narrowly scoped.
- Do not push unless the phase explicitly authorizes a push and the pre-push checkpoint matches exactly.
- Every response must report the exact next step only, not a broad roadmap unless the phase requests it.

## Response Discipline
- Use repo evidence, not memory.
- Keep a fixed reporting structure that matches the requested phase output.
- After any “Exact next Codex prompt” output, include a short Arabic beginner explanation if the phase explicitly asks for that style.

## Productivity and Memory Hygiene
- Prefer preserving accepted facts in repo-local orchestration files over carrying them informally across turns.
- Re-read the minimal necessary files before acting.
- When in doubt, verify from the repo instead of inferring.

## Clean Phase Boundary Rule
- Product implementation, verification, publishing, and orchestration maintenance are separate phases unless the prompt explicitly combines them.
- Do not bleed work across phase boundaries.
