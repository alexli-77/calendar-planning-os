# Calendar Decision Policy

<!--
Copy this file to calendar-decision-policy.md and edit it locally.
Do not commit personal calendar details.
-->

## Decision Order

1. Existing calendar events are hard constraints.
2. Fixed routines from `routines.yaml` are protected unless the user explicitly overrides them.
3. User instructions in the current request win over default preferences.
4. P0/P1 tasks and dated commitments come before optional work.
5. Use `energy-time-control` to choose the time of day and block shape.
6. Use `cognitive-clarity-planning` to decide whether vague work needs clarification first.
7. If the day is too full, leave a warning instead of filling every gap.

## Default Block Types

- `deep_work`: writing, coding, research, thinking, hard study.
- `admin`: email, forms, reimbursement, status updates, coordination.
- `review`: daily review, weekly review, planning, reflection.
- `recovery`: meals, movement, rest, commute, family/personal anchors.
- `buffer`: transition, overrun, and reset time.

## Personal Preferences

<!-- Keep these simple. Examples below are placeholders. -->

- Prefer deep work before lunch.
- Batch admin after lunch.
- Keep evenings light unless the user explicitly asks for work.
- Add buffers after hard blocks.
- Do not schedule more than 2 deep work blocks per day.

## Skill Use

- `energy-time-control` suggests when a task fits the user's energy.
- `cognitive-clarity-planning` checks whether the task is clear enough to schedule.
- Skills advise; this policy decides.

## Writeback

- Draft first.
- Show conflicts before confirmation.
- Ask before writing to a real calendar.
- Never overwrite existing calendar events automatically.
