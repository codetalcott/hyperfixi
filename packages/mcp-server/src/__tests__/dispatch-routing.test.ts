/**
 * Dispatch Routing Guard
 *
 * index.ts routes tools/call through a chain of `if` guards, several of which
 * match on a NAME PREFIX and return unconditionally. A prefix guard placed
 * above a more specific one silently swallows it, and the tool answers with the
 * wrong handler's error.
 *
 * That is not hypothetical: `analyze_content` is an MCP-sampling tool, but
 * `name.startsWith('analyze_')` routes analysis tools ~120 lines earlier, so
 * the sampling branch was unreachable for it and it answered "Unknown analysis
 * tool: analyze_content" for as long as both have existed.
 *
 * index.ts calls main() at module scope, so importing it would start a stdio
 * server — these assertions read it as source instead. That keeps the guard
 * honest: it checks the actual dispatch code, not a restatement of the rule.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { samplingTools } from '../tools/llm-sampling.js';
import { analysisTools, handleAnalysisTool } from '../tools/analysis.js';

const INDEX_SRC = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '..', 'index.ts'),
  'utf8'
);

const SAMPLING_NAMES = samplingTools.map(t => t.name);

describe('Dispatch routing guards', () => {
  it('sampling tools are dispatched by the derived set, not a hand-written list', () => {
    // The original bug was one hand-maintained copy of the sampling names
    // drifting from another. Deriving both sites from samplingTools is what
    // makes the fix durable, so pin it. Matched loosely on whitespace: prettier
    // may rewrap these lines, and a reflow is not a regression.
    expect(INDEX_SRC).toMatch(/SAMPLING_TOOL_NAMES\s*=\s*new Set\(\s*samplingTools\.map/);
    expect(INDEX_SRC).toMatch(/if\s*\(\s*SAMPLING_TOOL_NAMES\.has\(name\)\s*\)/);
  });

  it('no prefix guard swallows a sampling tool name', () => {
    const lines = INDEX_SRC.split('\n');
    const offenders: string[] = [];

    lines.forEach((line, i) => {
      const match = line.match(/name\.startsWith\('([^']+)'\)/);
      if (!match) return;
      const prefix = match[1];

      const shadowed = SAMPLING_NAMES.filter(n => n.startsWith(prefix));
      if (shadowed.length === 0) return;

      // The guard may claim such a name only if it excludes the sampling set.
      // Look at the enclosing condition, not just this line.
      const condition = lines.slice(Math.max(0, i - 3), i + 4).join('\n');
      if (!condition.includes('SAMPLING_TOOL_NAMES.has(name)')) {
        offenders.push(
          `line ${i + 1}: startsWith('${prefix}') swallows ${shadowed.join(', ')} ` +
            `without excluding SAMPLING_TOOL_NAMES`
        );
      }
    });

    expect(offenders).toEqual([]);
  });

  it('the analysis handler does not claim any sampling tool', () => {
    // The other half of the same invariant, from the handler's side: if a
    // sampling name ever becomes a real analysis tool, the exclusion above
    // would start hiding a working tool instead of fixing a broken one.
    const analysisNames = analysisTools.map(t => t.name);
    for (const name of SAMPLING_NAMES) {
      expect(analysisNames).not.toContain(name);
    }
  });

  it('analyze_content is not answerable by the analysis handler', async () => {
    // Behavioral: this is the exact wrong answer the shadowing produced.
    const result = await handleAnalysisTool('analyze_content', { code: 'toggle .active' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Unknown analysis tool');
  });
});
