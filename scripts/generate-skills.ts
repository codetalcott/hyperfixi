#!/usr/bin/env tsx
/**
 * Generate Agent Skills reference files from MCP server content.
 *
 * This script extracts reference documentation from the MCP server's
 * content.ts and generates markdown files for the Agent Skills standard.
 *
 * Usage:
 *   npm run generate:skills
 *   npx tsx scripts/generate-skills.ts
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// Import content from MCP server
import {
  getCommandsReference,
  getExpressionsGuide,
  getEventsReference,
  getCommonPatterns,
} from '../packages/mcp-server/src/resources/content.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
// The hyperfixi-developer skill's references. (This pointed at
// .github/skills/hyperscript/ until 4.0.1 — the adapter skill, which keeps only
// adapter-setup.md — so regenerating wrote orphan copies beside it and the files
// the developer skill links to were never refreshed.)
const SKILL_DIR = join(ROOT, '.github/skills/hyperfixi-developer/references');

const HEADER = `<!-- AUTO-GENERATED from packages/mcp-server/src/resources/content.ts -->
<!-- Do not edit directly. Run: npm run generate:skills -->

`;

interface SkillFile {
  name: string;
  content: string;
}

const files: SkillFile[] = [
  { name: 'commands.md', content: getCommandsReference() },
  { name: 'expressions.md', content: getExpressionsGuide() },
  { name: 'events.md', content: getEventsReference() },
  { name: 'patterns.md', content: getCommonPatterns() },
];

// Ensure directory exists
if (!existsSync(SKILL_DIR)) {
  mkdirSync(SKILL_DIR, { recursive: true });
  console.log(`Created directory: ${SKILL_DIR}`);
}

// Generate files
for (const { name, content } of files) {
  const filePath = join(SKILL_DIR, name);
  writeFileSync(filePath, HEADER + content);
  console.log(`Generated: .github/skills/hyperfixi-developer/references/${name}`);
}

console.log(`\nGenerated ${files.length} skill reference files`);
