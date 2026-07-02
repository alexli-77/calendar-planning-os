import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const deny = [
  /app_secret\s*[:=]\s*["']?[^"'\s]+/i,
  /authorization:\s*bearer\s+[a-z0-9._-]+/i,
  /xox[baprs]-[a-z0-9-]+/i,
  /sk-[a-z0-9]{20,}/i
];

const ignoreDirs = new Set(['.git', 'node_modules', 'dist', 'data', 'drafts', 'logs']);
const files = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (ignoreDirs.has(entry)) continue;
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) walk(path);
    else files.push(path);
  }
}

walk(process.cwd());

for (const file of files) {
  const content = readFileSync(file, 'utf8');
  for (const pattern of deny) {
    if (pattern.test(content)) throw new Error(`Potential secret found in ${file}`);
  }
}

console.log('Privacy scan passed.');
