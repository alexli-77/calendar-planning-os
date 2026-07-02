import { execFileSync } from 'node:child_process';

const cli = new URL('../bin/calendar-planning-os.mjs', import.meta.url).pathname;

function run(args) {
  return execFileSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
}

const help = run(['--help']);
if (!help.includes('draft-week')) throw new Error('help output is missing draft-week');

const week = run(['draft-week', '--input', 'examples/week-input.json', '--format', 'json']);
const parsed = JSON.parse(week);
if (parsed.mode !== 'draft_only') throw new Error('draft mode must be draft_only');
if (!Array.isArray(parsed.events) || parsed.events.length === 0) throw new Error('week draft should include events');
if (parsed.writeback.supported !== false) throw new Error('writeback must be disabled');
const deepWork = parsed.events.find((event) => event.sourceTaskIds.includes('LEO-111'));
if (!deepWork || !deepWork.end.includes('T11:00:00')) throw new Error('90-minute deep work block should end at 11:00');
const buffer = parsed.events.find((event) => event.type === 'buffer' && event.sourceTaskIds.includes('LEO-111'));
if (!buffer || buffer.start !== deepWork.end) throw new Error('deep work should receive an immediate transition buffer');
assertChronological(parsed.events);
assertNoOverlaps(parsed.events);

const day = run(['draft-day', '--input', 'examples/day-input.json', '--format', 'markdown']);
if (!day.includes('Calendar Draft')) throw new Error('day draft markdown missing title');

const collected = run(['collect-events', '--input', 'examples/week-input.json', '--provider', 'json-file', '--events-file', 'examples/events.json']);
const collectedJson = JSON.parse(collected);
if (collectedJson.provider !== 'json-file') throw new Error('json-file provider did not report provider name');
if (collectedJson.events.length !== 2) throw new Error('json-file provider should collect 2 events');

const ics = run(['collect-events', '--input', 'examples/week-input.json', '--provider', 'google-ics', '--ics-file', 'examples/events.ics']);
const icsJson = JSON.parse(ics);
if (icsJson.events.length !== 2) throw new Error('google-ics provider should collect 2 events');

const shifted = run(['draft-week', '--input', 'examples/week-input.json', '--provider', 'json-file', '--events-file', 'examples/events.json', '--format', 'json']);
const shiftedJson = JSON.parse(shifted);
const shiftedDeepWork = shiftedJson.events.find((event) => event.sourceTaskIds.includes('LEO-111'));
if (!shiftedDeepWork || shiftedDeepWork.start === '2026-07-06T09:30:00-04:00') {
  throw new Error('existing event conflict should move LEO-111 out of the occupied 09:30 slot');
}
assertChronological(shiftedJson.events);
assertNoOverlaps(shiftedJson.events.concat(collectedJson.events));

let writebackFailed = false;
try {
  run(['writeback', '--draft', 'latest']);
} catch (error) {
  writebackFailed = error.status === 2;
}
if (!writebackFailed) throw new Error('writeback should fail in draft-only alpha');

console.log('Smoke tests passed.');

function assertChronological(events) {
  for (let index = 1; index < events.length; index += 1) {
    if (new Date(events[index - 1].start) > new Date(events[index].start)) {
      throw new Error('events should be sorted chronologically');
    }
  }
}

function assertNoOverlaps(events) {
  const sorted = [...events].sort((a, b) => new Date(a.start) - new Date(b.start));
  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1];
    const current = sorted[index];
    if (new Date(previous.end) > new Date(current.start)) {
      throw new Error(`events should not overlap: ${previous.title} / ${current.title}`);
    }
  }
}
