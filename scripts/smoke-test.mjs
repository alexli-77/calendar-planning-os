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

const day = run(['draft-day', '--input', 'examples/day-input.json', '--format', 'markdown']);
if (!day.includes('Calendar Draft')) throw new Error('day draft markdown missing title');

let writebackFailed = false;
try {
  run(['writeback', '--draft', 'latest']);
} catch (error) {
  writebackFailed = error.status === 2;
}
if (!writebackFailed) throw new Error('writeback should fail in draft-only alpha');

console.log('Smoke tests passed.');
