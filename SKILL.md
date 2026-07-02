---
name: calendar-planning-os
description: Generate draft-only calendar plans from weekly plans, daily todos, user policy, and existing calendar events. Use when the user asks to turn plans into calendar blocks, schedule work, or design calendar writeback. First version must not write to real calendars.
---

# calendar-planning-os

Use this skill when planning how tasks should become calendar drafts.

## Core Boundary

Calendar writes are high-risk. The default behavior is draft-only.

Never write to a real calendar unless all of these are true:

- the user explicitly asks for writeback,
- the command is a writeback command,
- the target provider and calendar are known,
- the draft was previously shown to the user,
- the user confirmed the exact draft,
- conflict and overwrite checks pass,
- undo or revert behavior is documented.

## Planning Principles

- Treat calendar time as attention budget, not a place to dump tasks.
- Prefer blocks over tiny task fragments.
- Keep deep work blocks protected and sparse.
- Leave buffers between demanding blocks.
- Do not fill the whole day.
- Use task priority, due date, preferred date, and estimated effort together.
- Use existing calendar events as hard constraints.
- Put admin and follow-up tasks into batches.
- Mark uncertain items as warnings instead of pretending the schedule is perfect.

## User Rules

Use `calendar-policy.md` as the durable place for user-specific scheduling rules.

Store simple rules there, such as:

- preferred deep work windows,
- protected personal time,
- meeting limits,
- buffer rules,
- writeback preferences.

Do not bury stable scheduling preferences in prompts or code.

## Draft Block Types

- `deep_work`: writing, coding, research, strategic thinking.
- `admin`: email, reimbursement, checklists, follow-up, updates.
- `review`: daily review, weekly review, planning.
- `buffer`: transition, overrun, unplanned work.
- `recovery`: meals, rest, commute, exercise, low-energy recovery.

## Output Expectations

Return both:

- structured JSON for machines,
- concise Markdown for Feishu or dashboard cards.

Every event should include:

- title,
- start and end,
- type,
- source task ids or titles,
- confidence,
- warnings when relevant.

Draft quality checks:

- higher priority tasks come before lower priority tasks,
- due tasks are not pushed later without a warning,
- daily draft minutes stay under the user's budget when possible,
- generated buffers do not overlap meetings or task blocks.

## Daily OS Integration

`daily-os-feishu` should call this project as an optional engine. Daily OS owns Feishu messages and user confirmation. This project owns calendar planning logic.

## Provider Boundary

Providers may collect existing events from:

- input JSON,
- JSON files,
- Google Calendar private ICS or exported ICS,
- Apple Calendar exported ICS,
- Feishu Calendar through `lark-cli`.

Provider collection is read-only. Writeback remains disabled until a separate confirmed workflow exists.
