# Lose It!-style Today page — design

Approved 2026-08-05. Branch: `feat/loseit-today`. Done only when the user
approves it on the dev server.

## Goal

Rework the Today page around one number, the way Lose It! does it: how many
calories are left to eat today, where earned exercise calories *increase*
that number. Less text, tooltips for terminology, a weekly over/under chart.

## The math

**Remaining = Budget + Earned − Food**

- **Budget** — the existing `kcalTarget` (goal-derived intake floored at
  1,600, else the 1,750 anchor). Stable all day.
- **Earned** — Lose It!'s baseline bonus, adapted:
  `Earned = max(0, todayBurn − baselineBurn)` where
  `baselineBurn = BMR + typicalActive` (what the budget already assumed) and
  `todayBurn = basalKcal + activeKcal` when the Watch sent both, else
  `BMR + activeKcal`. Never negative. No BMR → no earn (0), ring still works.
  With no activity history `typicalActive` is 0, so all active burn counts —
  consistent, because the budget assumed none.
- **Food** — the day's logged kcal.

This preserves the codebase's stance against eating back *typical* activity:
only above-baseline burn adds calories.

## Watch pipeline

- `activity_logs` gains nullable `basal_kcal` (drizzle migration).
- `POST /api/activity` accepts optional `basalKcal`. Old payloads still work.
- Manual activity form gains an optional resting-kcal field.
- README documents adding Resting Energy to the existing Shortcut.

## The page

1. **Hero ring card** — SVG ring filled by `Food / (Budget + Earned)`, big
   Remaining number centered ("540 left" / "120 over" in the over colour).
   Equation strip beneath: `Budget − Food + Earned`, each term with a **?**
   tooltip. Protein meter stays beside it. "Log a meal →" stays.
2. **Ring tap → day detail** — expands in place: burn breakdown (Resting +
   Active vs baseline → bonus), Net, the goal's deficit-needed number, and
   the manual activity form. Old Goal/Energy-balance prose lives here now.
3. **Week bars** — last 7 days, intake vs that day's budget+earned; green
   under, over-colour over, hollow when nothing logged.
4. **Compact rows** — Goal, Session, Weigh-in, Body profile: one line each,
   existing forms expand on demand.
5. **Weight trend** — unchanged.

Tooltips via one `InfoTip.svelte`: ? button opens a floating explainer card,
closes on outside tap / Esc, `aria-expanded` + popover semantics.

## Not changing

Meals page, goal pacing/carry logic, Progress charts, the 1,600 floor, auth.
The energy-balance deficit readout survives inside the ring detail.

## Testing

TDD on the pure math (`src/lib/budget.ts`): basal+active, active-only,
no-history, clamp-at-zero, no-BMR. API validation tests for `basalKcal`.
Week-series builder tests. `npm run lint && npm run check && npm test &&
npm run build` before merge.
