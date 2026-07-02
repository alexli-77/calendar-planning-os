# Calendar Skills And Decision Policy

Calendar planning uses three layers:

1. User reality: existing calendar events and fixed routines.
2. Advisory skills: reusable knowledge about energy and task clarity.
3. Decision policy: the final ordering rules used by the calendar planner.

## What Belongs Where

Put fixed personal time in `routines.yaml`, based on `policies/routines.example.yaml`.

Examples:

- meals,
- exercise,
- commute,
- recurring meetings,
- family or personal anchors.

Put planning preferences in `calendar-decision-policy.md`, based on `policies/calendar-decision-policy.example.md`.

Examples:

- whether mornings are protected for deep work,
- how full a day should be,
- whether evenings can hold work,
- how to resolve conflicts.

Put reusable knowledge in skills.

Examples:

- `energy-time-control`: maps work to energy windows and recovery needs.
- `cognitive-clarity-planning`: decides whether vague work needs clarification before scheduling.

## Boundary

Skills do not write calendars. They return advice. The planner still has to:

- respect existing events,
- respect fixed routines,
- apply explicit user instructions,
- produce warnings when a schedule would be overloaded.

## CLI Usage

Use local policy files with draft commands:

```bash
node bin/calendar-planning-os.mjs draft-week \
  --input examples/week-input.json \
  --policy-file policies/calendar-decision-policy.example.md \
  --routines-file policies/routines.example.yaml \
  --format markdown
```

`--policy-file` loads the decision policy as evidence for the draft.

`--routines-file` expands fixed routines across the requested day/week range. Routine blocks appear in the draft and also prevent task blocks from being placed on top of them.
