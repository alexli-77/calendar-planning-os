# Calendar Providers

Providers collect existing events so drafts avoid conflicts. They do not write to calendars in this alpha.

## Input Provider

Use events already present in the input JSON.

```bash
calendar-planning-os draft-week \
  --input examples/week-input.json \
  --provider input
```

## JSON File Provider

Use a local JSON file with an `events` array.

```bash
calendar-planning-os collect-events \
  --input examples/week-input.json \
  --provider json-file \
  --events-file examples/events.json
```

## Google Calendar

Use a Google Calendar private ICS URL or an exported `.ics` file. Keep private ICS URLs out of git.

```bash
calendar-planning-os draft-week \
  --input examples/week-input.json \
  --provider google-ics \
  --ics-file examples/events.ics
```

For a private URL:

```bash
calendar-planning-os collect-events \
  --input examples/week-input.json \
  --provider google-ics \
  --ics-url "$GOOGLE_CALENDAR_ICS_URL"
```

## Apple Calendar

The first Apple Calendar path is exported ICS. Export a calendar from Apple Calendar, then point the CLI at the file.

```bash
calendar-planning-os draft-week \
  --input examples/week-input.json \
  --provider apple-ics \
  --ics-file ~/Downloads/Home.ics
```

Direct Apple Calendar/EventKit access is intentionally not included yet because it needs macOS privacy permissions and more careful UX.

## Feishu Calendar

The first Feishu path uses `lark-cli` and the Calendar OpenAPI.

```bash
lark-cli auth login --scope "calendar:calendar:readonly"

calendar-planning-os collect-events \
  --input examples/week-input.json \
  --provider feishu-lark-cli \
  --calendar-id YOUR_CALENDAR_ID \
  --as user
```

This expects the local user to already have calendar read access. The command returns normalized existing events for draft conflict checks.

## Writeback

Writeback is disabled.

```bash
calendar-planning-os writeback --draft latest
```

This exits with an error on purpose. Calendar writes need a separate confirmed workflow.
