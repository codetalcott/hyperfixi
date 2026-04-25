#!/usr/bin/env npx tsx
/**
 * Generate Vite Keywords (Phase 4.2)
 *
 * Thin wrapper that delegates to the existing sync-keywords script
 * in packages/vite-plugin/scripts/sync-keywords.ts.
 *
 * Usage:
 *   npx tsx scripts/generate-vite-keywords.ts
 *   npx tsx scripts/generate-vite-keywords.ts --dry-run
 */

import { execSync } from 'child_process';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dryRun = process.argv.includes('--dry-run');
const vitePluginDir = path.resolve(__dirname, '../../vite-plugin');
const args = dryRun ? '-- --dry-run' : '';

console.log('=== Generate Vite Keywords ===\n');

try {
  execSync(`npm run sync-keywords --prefix "${vitePluginDir}" ${args}`, {
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '../../..'),
  });
} catch (error) {
  console.error('Failed to sync vite-plugin keywords');
  process.exit(1);
}
