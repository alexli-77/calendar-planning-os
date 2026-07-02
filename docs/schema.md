# Calendar Draft Schema

This project is draft-first. Its job is to produce a proposed schedule, not to write to a calendar.

## Input

```json
{
  "period": "week",
  "timezone": "America/Toronto",
  "policy": {
    "deepWorkWindows": ["09:30-11:30"],
    "adminWindows": ["14:00-15:00"],
    "reviewWindows": ["20:00-20:30"],
    "maxDeepWorkBlocksPerDay": 2,
    "defaultBufferMinutes": 30
  },
  "tasks": [
    {
      "id": "LEO-111",
      "title": "Bootstrap calendar-planning-os optional CLI and skill",
      "type": "deep_work",
      "priority": "P1",
      "estimatedMinutes": 90,
      "source": "linear"
    }
  ],
  "existingEvents": [
    {
      "title": "Meeting",
      "start": "2026-07-06T13:00:00-04:00",
      "end": "2026-07-06T14:00:00-04:00"
    }
  ],
  "constraints": {
    "startDate": "2026-07-06",
    "days": 5
  },
  "evidence": {
    "calendarProvider": "input",
    "existingEventCount": 1
  }
}
```

## Output

```json
{
  "draftId": "draft_2026-07-06_week",
  "mode": "draft_only",
  "period": "week",
  "timezone": "America/Toronto",
  "events": [
    {
      "title": "Deep Work: Bootstrap calendar-planning-os",
      "start": "2026-07-06T09:30:00-04:00",
      "end": "2026-07-06T11:00:00-04:00",
      "type": "deep_work",
      "sourceTaskIds": ["LEO-111"],
      "confidence": "medium",
      "warnings": []
    }
  ],
  "warnings": [],
  "writeback": {
    "supported": false,
    "reason": "draft-only alpha"
  }
}
```

## Existing Event

Existing events are read-only calendar constraints.

```json
{
  "title": "Existing meeting",
  "start": "2026-07-06T13:00:00-04:00",
  "end": "2026-07-06T14:00:00-04:00",
  "source": "google-ics",
  "providerEventId": "optional"
}
```

## Providers

Provider names:

- `input`
- `json-file`
- `google-ics`
- `apple-ics`
- `feishu-lark-cli`

See [providers.md](providers.md).

## Rules

- Draft events must not overlap existing events.
- Existing events are hard constraints.
- Use warnings instead of silently dropping work.
- A draft is not a commitment.
- Writeback must be a separate confirmed step.
