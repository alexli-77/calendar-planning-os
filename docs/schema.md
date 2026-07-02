# Calendar Draft Schema

This project is draft-first. Its job is to produce a proposed schedule, not to write to a calendar.

## Input

```json
{
  "period": "week",
  "timezone": "America/Toronto",
  "policy": {
    "deepWorkWindows": ["09:30-11:30", "15:30-17:00"],
    "adminWindows": ["14:00-15:00", "16:30-17:00"],
    "reviewWindows": ["20:00-20:30"],
    "maxDeepWorkBlocksPerDay": 2,
    "maxAdminBlocksPerDay": 2,
    "maxReviewBlocksPerDay": 1,
    "maxDraftedMinutesPerDay": 300,
    "defaultBufferMinutes": 30,
    "includeBuffers": true
  },
  "tasks": [
    {
      "id": "LEO-111",
      "title": "Bootstrap calendar-planning-os optional CLI and skill",
      "type": "deep_work",
      "priority": "P1",
      "estimatedMinutes": 90,
      "source": "linear",
      "dueDate": "2026-07-07",
      "preferredDate": "2026-07-06"
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

## Task Fields

- `id`: stable task id, such as a Linear issue id or Daily OS item id.
- `title`: short human-readable title.
- `type`: `deep_work`, `admin`, `review`, `buffer`, or `recovery`.
- `priority`: `P0`, `P1`, `P2`, or `P3`.
- `estimatedMinutes`: expected effort for the draft block.
- `source`: where the task came from, such as `linear`, `daily-os`, `daily-todo`, or `github`.
- `dueDate`: optional `YYYY-MM-DD`; earlier due dates are placed first.
- `preferredDate`: optional `YYYY-MM-DD`; the planner tries that day first when it is inside the draft range.

## Policy Fields

- `deepWorkWindows`, `adminWindows`, `reviewWindows`: local time windows in `HH:MM-HH:MM` format.
- `maxDeepWorkBlocksPerDay`: cap for demanding work blocks.
- `maxAdminBlocksPerDay`: cap for admin batches.
- `maxReviewBlocksPerDay`: cap for review blocks.
- `maxDraftedMinutesPerDay`: soft daily task budget. Existing events do not count toward this number.
- `defaultBufferMinutes`: buffer length after deep work.
- `includeBuffers`: set to `false` to stop auto-adding buffers after deep work.

## Rules

- Draft events must not overlap existing events.
- Existing events are hard constraints.
- Earlier priorities and due dates are placed first.
- Preferred dates are honored when possible.
- Deep work can automatically receive a buffer after it.
- If a task is larger than a window, the event is clipped and receives a warning.
- Use warnings instead of silently dropping work.
- A draft is not a commitment.
- Writeback must be a separate confirmed step.
