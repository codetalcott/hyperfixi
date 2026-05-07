#!/usr/bin/env node
import { copyFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const sourceDir = join(here, '..', '..', 'hyperscript-adapter', 'dist');
const targetDir = join(here, '..', 'dist');

mkdirSync(targetDir, { recursive: true });

const entries = readdirSync(sourceDir).filter(name => name.endsWith('.global.js'));
if (entries.length === 0) {
  console.error(`No .global.js bundles found in ${sourceDir}. Did the adapter build run?`);
  process.exit(1);
}

let bytes = 0;
for (const name of entries) {
  const from = join(sourceDir, name);
  const to = join(targetDir, name);
  copyFileSync(from, to);
  bytes += statSync(to).size;
}
console.log(`Copied ${entries.length} bundles (${(bytes / 1024).toFixed(0)} KB total) into ${targetDir}`);
