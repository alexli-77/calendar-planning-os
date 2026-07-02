#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildDraft, explainDraft, formatMarkdown } from '../src/planner.mjs';

const HELP = `calendar-planning-os

Draft-first calendar planning CLI for Daily OS.

Usage:
  calendar-planning-os --help
  calendar-planning-os draft-week --input examples/week-input.json [--format json|markdown|both]
  calendar-planning-os draft-day --input examples/day-input.json [--format json|markdown|both]
  calendar-planning-os explain --input examples/week-input.json
  calendar-planning-os writeback --draft latest

Notes:
  - draft-week and draft-day produce draft output only.
  - writeback is disabled in this alpha skeleton.
`;

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const flags = {};
  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = rest[i + 1];
    if (!next || next.startsWith('--')) {
      flags[key] = true;
    } else {
      flags[key] = next;
      i += 1;
    }
  }
  return { command, flags };
}

function readJson(path) {
  if (!path) throw new Error('Missing --input <file>');
  const fullPath = resolve(process.cwd(), path);
  return JSON.parse(readFileSync(fullPath, 'utf8'));
}

function printDraft(draft, format) {
  if (format === 'json') {
    console.log(JSON.stringify(draft, null, 2));
    return;
  }
  if (format === 'markdown') {
    console.log(formatMarkdown(draft));
    return;
  }
  console.log(formatMarkdown(draft));
  console.log('\n```json');
  console.log(JSON.stringify(draft, null, 2));
  console.log('```');
}

async function main() {
  const { command, flags } = parseArgs(process.argv.slice(2));
  if (!command || command === '--help' || command === 'help') {
    console.log(HELP);
    return;
  }

  if (command === 'writeback') {
    console.error('writeback is disabled in this draft-only alpha. Show the draft to the user and require explicit confirmation before adding provider writeback.');
    process.exitCode = 2;
    return;
  }

  if (command === 'draft-week' || command === 'draft-day') {
    const input = readJson(flags.input);
    const expectedPeriod = command === 'draft-week' ? 'week' : 'day';
    const draft = buildDraft(input, { expectedPeriod });
    printDraft(draft, flags.format || 'both');
    return;
  }

  if (command === 'explain') {
    const input = readJson(flags.input);
    const draft = buildDraft(input, { expectedPeriod: input.period || 'week' });
    console.log(explainDraft(draft));
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
