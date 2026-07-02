import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export async function collectEvents(input, flags = {}) {
  const provider = flags.provider || 'input';
  if (provider === 'input') {
    return normalizeEvents(input.existingEvents || [], 'input');
  }
  if (provider === 'json-file') {
    return collectJsonFile(flags);
  }
  if (provider === 'google-ics' || provider === 'apple-ics') {
    return collectIcs(provider, flags);
  }
  if (provider === 'feishu-lark-cli') {
    return collectFeishuLarkCli(input, flags);
  }
  throw new Error(`Unknown calendar provider: ${provider}`);
}

export function mergeCollectedEvents(input, events, provider) {
  return {
    ...input,
    existingEvents: events,
    evidence: {
      ...(input.evidence || {}),
      calendarProvider: provider,
      existingEventCount: events.length
    }
  };
}

export function formatEventsMarkdown(events, provider) {
  const lines = [`# Existing Events (${provider})`, ''];
  if (events.length === 0) {
    lines.push('No existing events found.');
    return lines.join('\n');
  }
  for (const event of events) {
    lines.push(`- ${event.start} -> ${event.end}: ${event.title}`);
  }
  return lines.join('\n');
}

function collectJsonFile(flags) {
  const path = flags['events-file'];
  if (!path) throw new Error('json-file provider requires --events-file <path>');
  const fullPath = resolve(process.cwd(), path);
  const parsed = JSON.parse(readFileSync(fullPath, 'utf8'));
  const events = Array.isArray(parsed) ? parsed : parsed.events;
  return normalizeEvents(events || [], 'json-file');
}

async function collectIcs(provider, flags) {
  const source = flags['ics-file'] || flags['ics-url'];
  if (!source) throw new Error(`${provider} provider requires --ics-file <path> or --ics-url <url>`);
  const content = flags['ics-url'] ? await fetchText(source) : readFileSync(resolve(process.cwd(), source), 'utf8');
  return normalizeEvents(parseIcs(content), provider);
}

function collectFeishuLarkCli(input, flags) {
  const calendarId = flags['calendar-id'];
  if (!calendarId) throw new Error('feishu-lark-cli provider requires --calendar-id <id>');
  const identity = flags.as || 'user';
  const command = flags['lark-cli-bin'] || 'lark-cli';
  const { startUnix, endUnix } = rangeUnixSeconds(input);
  const path = `/open-apis/calendar/v4/calendars/${encodeURIComponent(calendarId)}/events?start_time=${startUnix}&end_time=${endUnix}&page_size=100`;
  const stdout = execFileSync(command, ['api', 'GET', path, '--as', identity], { encoding: 'utf8' });
  const parsed = JSON.parse(stdout);
  const items = parsed.data?.items || parsed.items || [];
  return normalizeEvents(items.map(feishuEventToExistingEvent), 'feishu-lark-cli');
}

function feishuEventToExistingEvent(item) {
  const start = feishuTimeToIso(item.start_time || item.start);
  const end = feishuTimeToIso(item.end_time || item.end);
  return {
    title: item.summary || item.title || 'Feishu Calendar Event',
    start,
    end,
    source: 'feishu-lark-cli',
    providerEventId: item.event_id || item.id
  };
}

function feishuTimeToIso(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  const timestamp = value.timestamp || value.timestamp_ms || value.date_time;
  if (!timestamp) return value.date ? `${value.date}T00:00:00Z` : '';
  const number = Number(timestamp);
  const ms = String(timestamp).length >= 13 ? number : number * 1000;
  return new Date(ms).toISOString();
}

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ICS: ${response.status} ${response.statusText}`);
  return response.text();
}

function parseIcs(content) {
  const events = [];
  const blocks = content.split('BEGIN:VEVENT').slice(1);
  for (const raw of blocks) {
    const block = raw.split('END:VEVENT')[0] || '';
    const title = readIcsValue(block, 'SUMMARY') || 'Calendar Event';
    const start = icsDateToIso(readIcsValue(block, 'DTSTART'));
    const end = icsDateToIso(readIcsValue(block, 'DTEND'));
    if (!start || !end) continue;
    events.push({ title, start, end });
  }
  return events;
}

function readIcsValue(block, key) {
  const lines = unfoldIcs(block).split(/\r?\n/);
  const line = lines.find((entry) => entry.startsWith(`${key}:`) || entry.startsWith(`${key};`));
  if (!line) return '';
  return line.slice(line.indexOf(':') + 1).trim();
}

function unfoldIcs(content) {
  return content.replace(/\r?\n[ \t]/g, '');
}

function icsDateToIso(value) {
  if (!value) return '';
  if (/^\d{8}$/.test(value)) {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T00:00:00Z`;
  }
  const match = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
  if (!match) return value;
  const [, year, month, day, hour, minute, second, z] = match;
  return `${year}-${month}-${day}T${hour}:${minute}:${second}${z || ''}`;
}

function normalizeEvents(events, source) {
  if (!Array.isArray(events)) throw new Error(`${source} provider did not return an event array`);
  return events
    .map((event) => ({
      title: event.title || event.summary || 'Calendar Event',
      start: event.start,
      end: event.end,
      source: event.source || source,
      providerEventId: event.providerEventId || event.id
    }))
    .filter((event) => event.start && event.end);
}

function rangeUnixSeconds(input) {
  const startDate = input.constraints?.startDate;
  const days = input.period === 'week' ? Number(input.constraints?.days || 5) : 1;
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + days);
  return {
    startUnix: Math.floor(start.getTime() / 1000),
    endUnix: Math.floor(end.getTime() / 1000)
  };
}
