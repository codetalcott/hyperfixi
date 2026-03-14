/**
 * @lokascript/lse-conformance
 *
 * Conformance test fixtures for the LokaScript Explicit Syntax (LSE) protocol.
 * Any LSE implementation in any language can validate against these fixtures.
 *
 * Usage:
 *   import { loadFixture, listFixtures, loadAllFixtures } from '@lokascript/lse-conformance';
 *
 *   const basic = loadFixture('basic');
 *   // [{ id: 'basic-001', description: '...', input: '[toggle patient:.active]', expected: {...} }, ...]
 */

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * List all available fixture categories.
 * @returns Array of fixture names (without .json extension)
 */
export function listFixtures() {
  return readdirSync(__dirname)
    .filter((f) => f.endsWith('.json') && f !== 'package.json')
    .map((f) => f.replace('.json', ''));
}

/**
 * Load a single fixture category by name.
 * @param {string} name - Fixture name (e.g., 'basic', 'conditionals', 'loops')
 * @returns Array of test case objects
 */
export function loadFixture(name) {
  const filePath = join(__dirname, `${name}.json`);
  return JSON.parse(readFileSync(filePath, 'utf-8'));
}

/**
 * Load all fixtures as a map of category → test cases.
 * @returns Object mapping fixture names to their test case arrays
 */
export function loadAllFixtures() {
  const result = {};
  for (const name of listFixtures()) {
    result[name] = loadFixture(name);
  }
  return result;
}
