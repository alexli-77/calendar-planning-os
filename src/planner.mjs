const DEFAULT_WINDOWS = {
  deep_work: ['09:30-11:30', '15:30-17:00'],
  admin: ['14:00-15:00', '16:30-17:00'],
  review: ['20:00-20:30'],
  buffer: ['16:00-16:30'],
  recovery: ['12:00-13:00']
};

const TYPE_LABELS = {
  deep_work: 'Deep Work',
  admin: 'Admin',
  review: 'Review',
  buffer: 'Buffer',
  recovery: 'Recovery'
};

export function buildDraft(input, options = {}) {
  validateInput(input, options.expectedPeriod);
  const timezone = input.timezone || 'UTC';
  const startDate = input.constraints?.startDate;
  const days = input.period === 'week' ? Number(input.constraints?.days || 5) : 1;
  const warnings = [];
  const events = [];
  const existingEvents = input.existingEvents || [];
  const routineEvents = input.routineEvents || [];
  const tasks = [...(input.tasks || [])].sort((a, b) => compareTasks(a, b, startDate));
  const dayUsage = new Map();

  for (const routine of routineEvents) {
    events.push(routine);
  }

  for (const task of tasks) {
    const type = normalizeType(task.type);
    const windowList = windowsForType(input.policy || {}, type);
    let placed = false;

    for (const dayOffset of dayOrderForTask(task, startDate, days)) {
      const date = addDays(startDate, dayOffset);
      if (!canPlaceTypeOnDay(dayUsage, date, type, input.policy || {})) continue;
      if (!canFitDayCapacity(dayUsage, date, task, input.policy || {})) continue;

      for (const window of windowList) {
        const candidate = candidateEvent(task, type, date, window, timezone);
        const conflict = firstConflict(candidate, existingEvents.concat(events));
        if (conflict) continue;
        events.push(candidate);
        markUsage(dayUsage, date, type);
        markMinutes(dayUsage, date, minutesBetween(candidate.start, candidate.end));
        addBufferIfNeeded(events, existingEvents, candidate, input.policy || {}, timezone, dayUsage);
        placed = true;
        break;
      }
      if (placed) break;
    }

    if (!placed) {
      warnings.push(`Could not place "${task.title}" without conflict; keep it in todo or adjust constraints.`);
    }
  }

  return {
    draftId: `draft_${startDate}_${input.period}`,
    mode: 'draft_only',
    period: input.period,
    timezone,
    events: sortEvents(events),
    warnings,
    evidence: input.evidence || {},
    writeback: {
      supported: false,
      reason: 'draft-only alpha'
    }
  };
}

export function formatMarkdown(draft) {
  const lines = [`# Calendar Draft (${draft.period})`, '', 'This is a draft. No calendar writeback has been performed.', ''];
  if (draft.events.length === 0) {
    lines.push('No draft events were generated.');
  } else {
    for (const event of draft.events) {
      const source = event.sourceTaskIds.length ? ` from ${event.sourceTaskIds.join(', ')}` : '';
      lines.push(`- ${timeRange(event)} ${event.title}${source}`);
      if (event.warnings.length) lines.push(`  - Warning: ${event.warnings.join('; ')}`);
    }
  }
  if (draft.warnings.length) {
    lines.push('', '## Warnings');
    for (const warning of draft.warnings) lines.push(`- ${warning}`);
  }
  if (draft.evidence?.localPolicyNotes?.length) {
    lines.push('', '## Local Policy');
    for (const note of draft.evidence.localPolicyNotes) lines.push(`- ${note}`);
  }
  return lines.join('\n');
}

export function explainDraft(draft) {
  const countByType = draft.events.reduce((acc, event) => {
    acc[event.type] = (acc[event.type] || 0) + 1;
    return acc;
  }, {});
  const parts = Object.entries(countByType).map(([type, count]) => `${count} ${type}`);
  return [
    `Draft ${draft.draftId} is ${draft.mode}.`,
    `It generated ${draft.events.length} event(s): ${parts.join(', ') || 'none'}.`,
    draft.warnings.length ? `Warnings: ${draft.warnings.length}.` : 'No draft-level warnings.',
    'Writeback is not supported in this alpha.'
  ].join('\n');
}

function validateInput(input, expectedPeriod) {
  if (!input || typeof input !== 'object') throw new Error('Input must be a JSON object.');
  if (expectedPeriod && input.period !== expectedPeriod) {
    throw new Error(`Expected period "${expectedPeriod}", got "${input.period}".`);
  }
  if (!input.constraints?.startDate) throw new Error('Input requires constraints.startDate.');
  if (!Array.isArray(input.tasks)) throw new Error('Input requires tasks array.');
  if (input.existingEvents && !Array.isArray(input.existingEvents)) throw new Error('existingEvents must be an array.');
  if (input.routineEvents && !Array.isArray(input.routineEvents)) throw new Error('routineEvents must be an array.');
}

function compareTasks(a, b, startDate) {
  const priority = { P0: 0, P1: 1, P2: 2, P3: 3 };
  const priorityDiff = (priority[a.priority] ?? 9) - (priority[b.priority] ?? 9);
  if (priorityDiff !== 0) return priorityDiff;
  const dueDiff = daysUntil(a.dueDate, startDate) - daysUntil(b.dueDate, startDate);
  if (dueDiff !== 0) return dueDiff;
  return Number(b.estimatedMinutes || 0) - Number(a.estimatedMinutes || 0);
}

function normalizeType(type) {
  if (type === 'deep_work' || type === 'admin' || type === 'review' || type === 'buffer' || type === 'recovery') return type;
  return 'admin';
}

function windowsForType(policy, type) {
  if (type === 'deep_work') return policy.deepWorkWindows || DEFAULT_WINDOWS.deep_work;
  if (type === 'admin') return policy.adminWindows || DEFAULT_WINDOWS.admin;
  if (type === 'review') return policy.reviewWindows || DEFAULT_WINDOWS.review;
  return DEFAULT_WINDOWS[type] || DEFAULT_WINDOWS.admin;
}

function canPlaceTypeOnDay(dayUsage, date, type, policy) {
  const usage = dayUsage.get(date) || {};
  if (type === 'deep_work') return (usage.deep_work || 0) < Number(policy.maxDeepWorkBlocksPerDay || 2);
  if (type === 'admin') return (usage.admin || 0) < Number(policy.maxAdminBlocksPerDay || 2);
  if (type === 'review') return (usage.review || 0) < Number(policy.maxReviewBlocksPerDay || 1);
  return true;
}

function canFitDayCapacity(dayUsage, date, task, policy) {
  const usage = dayUsage.get(date) || {};
  const maxMinutes = Number(policy.maxDraftedMinutesPerDay || 300);
  return Number(usage.minutes || 0) + Number(task.estimatedMinutes || 60) <= maxMinutes;
}

function markUsage(dayUsage, date, type) {
  const usage = dayUsage.get(date) || {};
  usage[type] = (usage[type] || 0) + 1;
  dayUsage.set(date, usage);
}

function markMinutes(dayUsage, date, minutes) {
  const usage = dayUsage.get(date) || {};
  usage.minutes = (usage.minutes || 0) + minutes;
  dayUsage.set(date, usage);
}

function candidateEvent(task, type, date, window, timezone) {
  const [startTime, endTime] = window.split('-');
  const start = `${date}T${startTime}:00${offsetForTimezone(timezone)}`;
  const hardEnd = `${date}T${endTime}:00${offsetForTimezone(timezone)}`;
  const estimatedEnd = addMinutesLocal(start, Number(task.estimatedMinutes || 60));
  const clipped = new Date(estimatedEnd) > new Date(hardEnd);
  const end = clipped ? hardEnd : estimatedEnd;
  const label = TYPE_LABELS[type] || 'Work';
  return {
    title: `${label}: ${task.title}`,
    start,
    end,
    type,
    sourceTaskIds: task.id ? [task.id] : [],
    confidence: 'medium',
    warnings: clipped ? [`Estimated ${task.estimatedMinutes || 60} minutes, but window ends earlier.`] : []
  };
}

function addBufferIfNeeded(events, existingEvents, previous, policy, timezone, dayUsage) {
  if (policy.includeBuffers === false) return;
  if (previous.type !== 'deep_work') return;
  const minutes = Number(policy.defaultBufferMinutes || 30);
  if (minutes <= 0) return;
  const start = previous.end;
  const end = addMinutesLocal(start, minutes);
  const candidate = {
    title: 'Buffer: transition after deep work',
    start,
    end,
    type: 'buffer',
    sourceTaskIds: previous.sourceTaskIds,
    confidence: 'high',
    warnings: []
  };
  if (firstConflict(candidate, existingEvents.concat(events))) return;
  events.push(candidate);
  markUsage(dayUsage, candidate.start.slice(0, 10), 'buffer');
  markMinutes(dayUsage, candidate.start.slice(0, 10), minutes);
}

function firstConflict(candidate, events) {
  return events.find((event) => overlaps(candidate, event));
}

function overlaps(a, b) {
  return new Date(a.start) < new Date(b.end) && new Date(b.start) < new Date(a.end);
}

function addDays(date, days) {
  const parsed = new Date(`${date}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function dayOrderForTask(task, startDate, days) {
  const all = Array.from({ length: days }, (_, index) => index);
  if (task.preferredDate) {
    const preferred = daysBetween(startDate, task.preferredDate);
    if (preferred >= 0 && preferred < days) {
      return [preferred, ...all.filter((day) => day !== preferred)];
    }
  }
  if (task.dueDate) {
    const due = daysBetween(startDate, task.dueDate);
    if (due >= 0 && due < days) {
      const beforeDue = all.filter((day) => day <= due);
      const afterDue = all.filter((day) => day > due);
      return beforeDue.concat(afterDue);
    }
  }
  return all;
}

function daysUntil(date, startDate) {
  if (!date) return Number.MAX_SAFE_INTEGER;
  return daysBetween(startDate, date);
}

function daysBetween(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  return Math.round((end.getTime() - start.getTime()) / 86400000);
}

function minutesBetween(start, end) {
  return Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000));
}

function sortEvents(events) {
  return events.sort((a, b) => new Date(a.start) - new Date(b.start));
}

function addMinutesLocal(iso, minutes) {
  const match = iso.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):00([+-]\d\d:\d\d|Z)$/);
  if (!match) throw new Error(`Cannot add minutes to invalid local timestamp: ${iso}`);
  const [, date, hour, minute, offset] = match;
  const total = Number(hour) * 60 + Number(minute) + minutes;
  const dayDelta = Math.floor(total / 1440);
  const minuteOfDay = ((total % 1440) + 1440) % 1440;
  const nextDate = addDays(date, dayDelta);
  const nextHour = String(Math.floor(minuteOfDay / 60)).padStart(2, '0');
  const nextMinute = String(minuteOfDay % 60).padStart(2, '0');
  return `${nextDate}T${nextHour}:${nextMinute}:00${offset}`;
}

function offsetForTimezone(timezone) {
  if (timezone === 'America/Toronto') return '-04:00';
  return 'Z';
}

function timeRange(event) {
  return `${event.start.slice(0, 10)} ${event.start.slice(11, 16)}-${event.end.slice(11, 16)}`;
}
