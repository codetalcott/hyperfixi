/**
 * Tool Count Guard
 *
 * The README's tool counts are hand-maintained prose, and every other
 * hand-maintained package list in this repo has drifted at least once (see the
 * guards added in #862/#865). This test is the same idea for the one number a
 * reader uses to judge the server's surface: it derives the counts from the
 * actual tool arrays and fails if the README disagrees.
 *
 * Two numbers, because they differ: 108 tools are DEFINED, but the 5
 * MCP-sampling tools are hidden from `tools/list` unless
 * LOKASCRIPT_MCP_LLM_TOOLS=1, so a default connection sees 103.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { analysisTools } from '../tools/analysis.js';
import { patternTools } from '../tools/patterns.js';
import { validationTools } from '../tools/validation.js';
import { lspBridgeTools } from '../tools/lsp-bridge.js';
import { languageDocsTools } from '../tools/language-docs.js';
import { profileTools } from '../tools/profiles.js';
import { compilationTools } from '../tools/compilation.js';
import { routeTools } from '../tools/routes.js';
import { samplingTools } from '../tools/llm-sampling.js';
import { dispatcherTools } from '../tools/dispatcher.js';
import { irTools } from '../tools/ir-tools.js';
import { debugTools } from '../tools/debug-tools.js';
import { inventoryTools } from '../tools/inventory.js';
import { trainingDataTools } from '../tools/training-data.js';
import { feedbackTools } from '../tools/feedback-tools.js';
import { lsePipelineTools } from '../tools/lse-pipeline.js';
import { grailTools } from '../tools/grail-tools.js';
import { lseCorrectionTools } from '../tools/lse-correction.js';
import { createDomainRegistry } from '../tools/domain-registry-setup.js';

// Every array spread into the `tools/list` response in index.ts. Keeping this
// list complete is the test's one manual step; a missing entry shows up as a
// count mismatch against the README rather than passing silently.
const STATIC_TOOL_ARRAYS = [
  analysisTools,
  patternTools,
  validationTools,
  lspBridgeTools,
  languageDocsTools,
  profileTools,
  compilationTools,
  routeTools,
  dispatcherTools,
  irTools,
  debugTools,
  inventoryTools,
  trainingDataTools,
  feedbackTools,
  lsePipelineTools,
  grailTools,
  lseCorrectionTools,
];

const README = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'README.md'),
  'utf8'
);

describe('Tool count guard', () => {
  const domainToolCount = createDomainRegistry().getToolDefinitions().length;
  const staticCount = STATIC_TOOL_ARRAYS.reduce((n, arr) => n + arr.length, 0);

  const definedCount = staticCount + domainToolCount + samplingTools.length;
  const defaultListedCount = definedCount - samplingTools.length;

  it('defines 108 tools and lists 103 by default', () => {
    expect(definedCount).toBe(108);
    expect(defaultListedCount).toBe(103);
  });

  it('every tool name is unique', () => {
    const names = [...STATIC_TOOL_ARRAYS.flat(), ...samplingTools].map(t => t.name);
    const dupes = names.filter((n, i) => names.indexOf(n) !== i);
    expect(dupes).toEqual([]);
  });

  it('README states both counts', () => {
    // Guards the prose a reader actually sees. If these fail, update README.md
    // rather than loosening the assertion.
    expect(README).toContain(`**${definedCount}** defined`);
    expect(README).toContain(`**${defaultListedCount} tools** by default`);
  });
});
