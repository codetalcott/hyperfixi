/**
 * Tool Count Guard
 *
 * The README's tool counts are hand-maintained prose, and every other
 * hand-maintained package list in this repo has drifted at least once (see the
 * guards added in #862/#865). This test is the same idea for the one number a
 * reader uses to judge the server's surface: it derives the counts from the
 * actual tool arrays and fails if the README disagrees.
 *
 * Three numbers, because they differ: 89 tools are DEFINED; a default
 * connection lists the 14 core tools (see ../toolsets.ts); with every toolset
 * on it lists 84, since the 5 MCP-sampling tools also need
 * LOKASCRIPT_MCP_LLM_TOOLS=1. (Every tool was listed by default until the
 * toolsets: 84. 108 / 103 until 4.0, when compile_hyperscript and execute_lse
 * retired with the AOT compiler; 106 / 101 until domains 4.0.0 retired jsx and
 * its four tools; 96 / 91 until 7.0 removed validate_hyperscript,
 * translate_hyperscript and parse_multilingual; 93 / 88 until domains 7.1.0
 * took learn and its four tools.)
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
import {
  STATIC_TOOLSETS,
  TOOLSET_NAMES,
  listedTools,
  parseToolsets,
  toolsetOf,
} from '../toolsets.js';

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
  const registry = createDomainRegistry();
  const isDomainTool = (name: string) => registry.canHandle(name);
  const listable = [
    ...STATIC_TOOL_ARRAYS.flat(),
    ...(registry.getToolDefinitions() as unknown as Array<{ name: string }>),
  ];

  const definedCount = listable.length + samplingTools.length;
  const defaultListedCount = listedTools(
    listable,
    parseToolsets(undefined).enabled,
    isDomainTool
  ).length;
  const allListedCount = listedTools(listable, parseToolsets('all').enabled, isDomainTool).length;

  it('defines 89 tools, lists 14 by default and 84 with every toolset', () => {
    expect(definedCount).toBe(89);
    expect(defaultListedCount).toBe(14);
    expect(allListedCount).toBe(84);
  });

  it('every listable tool belongs to a toolset', () => {
    // A tool with no toolset is never listed: add it to STATIC_TOOLSETS.
    expect(listable.filter(t => toolsetOf(t.name, isDomainTool) === undefined)).toEqual([]);
  });

  it('STATIC_TOOLSETS names no tool that is gone', () => {
    const names = new Set(listable.map(t => t.name));
    expect(Object.keys(STATIC_TOOLSETS).filter(name => !names.has(name))).toEqual([]);
  });

  it('every toolset holds a tool', () => {
    const used = new Set(listable.map(t => toolsetOf(t.name, isDomainTool)));
    expect(TOOLSET_NAMES.filter(name => !used.has(name))).toEqual([]);
  });

  it('the tools 7.0 removed stay removed', () => {
    // MIGRATION.md: validate_and_compile and translate_code replace them
    const names = [...STATIC_TOOL_ARRAYS.flat(), ...samplingTools].map(t => t.name);
    for (const removed of ['validate_hyperscript', 'translate_hyperscript', 'parse_multilingual']) {
      expect(names).not.toContain(removed);
    }
  });

  it('every tool name is unique', () => {
    const names = [...STATIC_TOOL_ARRAYS.flat(), ...samplingTools].map(t => t.name);
    const dupes = names.filter((n, i) => names.indexOf(n) !== i);
    expect(dupes).toEqual([]);
  });

  it('README states the counts', () => {
    // Guards the prose a reader actually sees. If these fail, update README.md
    // rather than loosening the assertion.
    expect(README).toContain(`**${definedCount}** defined`);
    expect(README).toContain(`**${defaultListedCount} tools** by default`);
    expect(README).toContain(`**${allListedCount}** with every toolset`);
  });

  it('README lists each toolset with its size', () => {
    for (const name of TOOLSET_NAMES) {
      const size = listable.filter(t => toolsetOf(t.name, isDomainTool) === name).length;
      // Prettier pads table cells, so match the row loosely on whitespace.
      expect(README).toMatch(new RegExp(`\\| \`${name}\`\\s*\\| ${size}\\s*\\|`));
    }
  });
});
