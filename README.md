# calendar-planning-os

Draft-first calendar planning CLI and skill for Daily OS.

This project turns weekly plans, daily todos, user calendar policy, and existing events into calendar drafts. The first version does not write to a real calendar.

## Commands

```bash
calendar-planning-os --help
calendar-planning-os draft-week --input examples/week-input.json
calendar-planning-os draft-day --input examples/day-input.json
calendar-planning-os draft-week --input examples/week-input.json --routines-file policies/routines.example.yaml --policy-file policies/calendar-decision-policy.example.md
calendar-planning-os collect-events --input examples/week-input.json --provider google-ics --ics-file examples/events.ics
calendar-planning-os explain --input examples/week-input.json
calendar-planning-os writeback --draft latest
```

`writeback` is intentionally disabled in this alpha skeleton. Calendar writes must be added later with explicit confirmation, provider-specific safety checks, and undo/revert behavior.

## Install Locally

```bash
npm install
npm link
calendar-planning-os --help
```

## Boundary

- Produces draft JSON and Markdown.
- Does not require provider tokens.
- Does not read or write a real calendar by default.
- Does not store personal calendar data in the repository.
- Can be called by `daily-os-feishu` as an optional engine.
- Can collect existing events from input JSON, JSON files, Google/Apple ICS, or Feishu via `lark-cli`.

## Draft Logic

The planner uses:

- task priority,
- due date and preferred date,
- estimated minutes,
- user-defined work windows,
- daily block limits,
- existing calendar events,
- transition buffers after deep work.

If it cannot place a task cleanly, it leaves a warning instead of writing over calendar time.

## Input

The CLI accepts a JSON input file with:

- `period`: `day` or `week`
- `timezone`
- `policy`
- `tasks`
- `existingEvents`
- `constraints`

See [docs/schema.md](docs/schema.md).

Provider setup is in [docs/providers.md](docs/providers.md).

Calendar rules belong in `calendar-policy.md`; start from [calendar-policy.example.md](calendar-policy.example.md).

Calendar decision rules can also be split into:

- [policies/calendar-decision-policy.example.md](policies/calendar-decision-policy.example.md) for the final decision order.
- [policies/routines.example.yaml](policies/routines.example.yaml) for fixed user routines that do not appear in OKRs.
- [skills/energy-time-control](skills/energy-time-control/SKILL.md) and [skills/cognitive-clarity-planning](skills/cognitive-clarity-planning/SKILL.md) as optional advisory skills.

## Example

```bash
node bin/calendar-planning-os.mjs draft-week --input examples/week-input.json --format both
```
