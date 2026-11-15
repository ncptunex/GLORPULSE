# GLORPULSE: working rules for agents

Product vision, scope, principles and safety wording: `product.md` (this folder). Do not restate them here.

## Document authority

| Document | Authoritative for |
|---|---|
| `product.md` | Product vision, scope and principles |
| `requirements.md` | Functional requirements and acceptance criteria |
| `references.md` | Source evidence and verification status |
| `docs/person-a-logic-decisions.md` | Recorded implementation decisions |
| Code comments | Implementation clarification only |

If authoritative documents conflict, report the conflict to the user. Do not silently choose one.

## Hard constraints
- `src/shared/types.ts` changes only when both Person A and Person B agree. Ask first.
- Health logic (`src/logic`, `src/data`) never touches the UI or localStorage. The UI only displays what the logic returns.
- Derived results (baselines, positions, runs, alerts) are never stored (`requirements.md` DR-04).
- Do not change baseline, deviation, persistence or alert rules, or add thresholds, unless explicitly asked. Contact Flight Surgeon stays legend-only (D-10).
- Medical text needs a verified source ID from `references.md`, or reads "No sourced guidance available". Never invent ranges, advice or hazard links.
- A source is verified only after the full document was read, and only for the claims listed in `references.md`. Keep `src/data/sources.ts` in step with `references.md`.
- No new dependencies unless both people agree.

## Before finishing code changes
Run `npm run typecheck`, `npx vitest run` and `npm run build`, and report the results. Leave `package-lock.json` alone unless asked.
