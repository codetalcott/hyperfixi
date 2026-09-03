/**
 * Regenerate docs/API_SURFACE.md — the committed snapshot of the extension
 * contract asserted by src/__tests__/api-surface.test.ts. Run after a
 * DELIBERATE contract change only:
 *
 *   cd packages/framework && npx tsx scripts/api-surface-report.ts
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractApiSurface } from './api-surface-lib';

const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.join(pkgRoot, 'docs', 'API_SURFACE.md');
writeFileSync(target, extractApiSurface(pkgRoot) + '\n');
console.log(`wrote ${target}`);
