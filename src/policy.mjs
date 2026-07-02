import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const DAY_INDEX = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6
};

const DAY_NAMES = Object.entries(DAY_INDEX).reduce((acc, [name, index]) => {
  acc[index] = name;
  return acc;
}, {});

export function applyLocalPolicyFiles(input, flags = {}, cwd = process.cwd()) {
  const notes = [];
  const nextInput = structuredClone(input);

  if (flags['policy-file']) {
    const policyPath = resolve(cwd, flags['policy-file']);
    if (!existsSync(policyPath)) throw new Error(`Policy file not found: ${flags['policy-file']}`);
    const text = readFileSync(policyPath, 'utf8');
    nextInput.policyDecision = {
      source: flags['policy-file'],
      loaded: true,
      text
    };
    notes.push(`Loaded calendar decision policy from ${flags['policy-file']}.`);
  }

  if (flags['routines-file']) {
    const routinesPath = resolve(cwd, flags['routines-file']);
    if (!existsSync(routinesPath)) throw new Error(`Routines file not found: ${flags['routines-file']}`);
    const routines = parseRoutinesYaml(readFileSync(routinesPath, 'utf8'));
    const routineEvents = expandRoutineEvents(routines, nextInput);
    nextInput.routineEvents = [...(nextInput.routineEvents || []), ...routineEvents];
    nextInput.evidence = {
      ...(nextInput.evidence || {}),
      routinesFile: flags['routines-file'],
      routineEventCount: routineEvents.length
    };
    notes.push(`Loaded ${routineEvents.length} routine event(s) from ${flags['routines-file']}.`);
  }

  if (notes.length) {
    nextInput.evidence = {
      ...(nextInput.evidence || {}),
      localPolicyNotes: notes
    };
  }

  return nextInput;
}

export function parseRoutinesYaml(text) {
  const routines = {
    timezone: undefined,
    fixed_routines: []
  };
  const lines = text.split(/\r?\n/);
  let section = null;
  let current = null;

  for (const rawLine of lines) {
    const line = stripComment(rawLine);
    if (!line.trim()) continue;
    const trimmed = line.trim();

    if (!rawLine.startsWith(' ') && trimmed.endsWith(':')) {
      section = trimmed.slice(0, -1);
      continue;
    }

    if (!rawLine.startsWith(' ') && trimmed.includes(':')) {
      const [key, value] = splitKeyValue(trimmed);
      routines[key] = parseScalar(value);
      continue;
    }

    if (section !== 'fixed_routines') continue;

    if (trimmed.startsWith('- ')) {
      if (current) routines.fixed_routines.push(current);
      current = {};
      const first = trimmed.slice(2).trim();
      if (first) {
        const [key, value] = splitKeyValue(first);
        current[key] = parseScalar(value);
      }
      continue;
    }

    if (current && trimmed.includes(':')) {
      const [key, value] = splitKeyValue(trimmed);
      current[key] = parseScalar(value);
    }
  }

  if (current) routines.fixed_routines.push(current);
  return routines;
}

export function expandRoutineEvents(routines, input) {
  const startDate = input.constraints?.startDate;
  if (!startDate) throw new Error('Cannot expand routines without constraints.startDate.');
  const days = input.period === 'week' ? Number(input.constraints?.days || 5) : 1;
  const timezone = input.timezone || routines.timezone || 'UTC';
  const events = [];

  for (let offset = 0; offset < days; offset += 1) {
    const date = addDays(startDate, offset);
    const dayName = DAY_NAMES[new Date(`${date}T00:00:00Z`).getUTCDay()];
    for (const routine of routines.fixed_routines || []) {
      const daysForRoutine = normalizeDays(routine.days);
      if (daysForRoutine.length && !daysForRoutine.includes(dayName)) continue;
      if (!routine.time || !routine.title) continue;
      const [startTime, endTime] = String(routine.time).split('-');
      if (!startTime || !endTime) continue;
      const id = routineId(routine.title);
      events.push({
        title: `Routine: ${routine.title}`,
        start: `${date}T${startTime}:00${offsetForTimezone(timezone)}`,
        end: `${date}T${endTime}:00${offsetForTimezone(timezone)}`,
        type: normalizeRoutineType(routine.type),
        sourceTaskIds: [`routine:${id}`],
        confidence: 'high',
        warnings: [],
        protected: routine.protected !== false,
        source: 'routine'
      });
    }
  }

  return events;
}

function stripComment(line) {
  const hashIndex = line.indexOf('#');
  if (hashIndex === -1) return line;
  return line.slice(0, hashIndex);
}

function splitKeyValue(line) {
  const index = line.indexOf(':');
  return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
}

function parseScalar(value) {
  const trimmed = value.trim();
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return trimmed
      .slice(1, -1)
      .split(',')
      .map((item) => unquote(item.trim()))
      .filter(Boolean);
  }
  return unquote(trimmed);
}

function unquote(value) {
  return value.replace(/^["']|["']$/g, '');
}

function normalizeDays(days) {
  if (!days) return [];
  if (Array.isArray(days)) return days.map((day) => String(day).toLowerCase().slice(0, 3));
  return [String(days).toLowerCase().slice(0, 3)];
}

function normalizeRoutineType(type) {
  if (type === 'deep_work' || type === 'admin' || type === 'review' || type === 'buffer' || type === 'recovery') return type;
  return 'recovery';
}

function routineId(title) {
  return String(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'routine';
}

function addDays(date, days) {
  const parsed = new Date(`${date}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function offsetForTimezone(timezone) {
  if (timezone === 'America/Toronto') return '-04:00';
  return 'Z';
}
