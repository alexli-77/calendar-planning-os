# calendar-planning-os

Draft-first calendar planning CLI and skill for Daily OS.

This project turns weekly plans, daily todos, user calendar policy, and existing events into calendar drafts. The first version does not write to a real calendar.

## Commands

```bash
calendar-planning-os --help
calendar-planning-os draft-week --input examples/week-input.json
calendar-planning-os draft-day --input examples/day-input.json
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

## Example

```bash
node bin/calendar-planning-os.mjs draft-week --input examples/week-input.json --format both
```
