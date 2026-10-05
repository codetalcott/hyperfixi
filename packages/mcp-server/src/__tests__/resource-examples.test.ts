/**
 * The hyperscript the MCP resources teach must run on the engine.
 *
 * `hyperscript://docs/commands`, `/expressions`, `/events` and
 * `hyperscript://examples/common` are what an agent reads before writing
 * hyperscript, and `npm run generate:skills` copies them into the repo's
 * hyperfixi-developer skill. Until 4.0.1 they taught core 3.x: `on
 * submit.prevent`, `on input.debounce(300ms)`, `on keydown.enter`, `swap #t
 * innerHTML`, `while …`, a bare `[attr]` selector, a `parent` keyword, `you` as
 * the event target — forms the engine rejects, or (worse) parses as something
 * else (`on click.prevent` listens for an event named `click.prevent`).
 *
 * Checked here: every `_="…"` in an ```html fence parses as a script on the
 * engine, and every example in a table's third column parses as commands.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import {
  getCommandsReference,
  getExpressionsGuide,
  getEventsReference,
  getCommonPatterns,
} from '../resources/content.js';

type Engine = typeof import('@hyperfixi/engine');
let engine: Engine;

beforeAll(async () => {
  engine = await import('@hyperfixi/engine');
  engine.register(...engine.everything);
});

const DOCS: Record<string, () => string> = {
  'docs/commands': getCommandsReference,
  'docs/expressions': getExpressionsGuide,
  'docs/events': getEventsReference,
  'examples/common': getCommonPatterns,
};

function scripts(markdown: string): string[] {
  const out: string[] = [];
  for (const [, body] of markdown.matchAll(/```html\n([\s\S]*?)```/g))
    for (const [, code] of body.matchAll(/(?<![\w-])_="([^"]*)"/g)) out.push(code);
  return out;
}

function tableExamples(markdown: string): string[] {
  const out: string[] = [];
  for (const line of markdown.split('\n')) {
    const cells = line.split('|').map(c => c.trim());
    const code = cells[3]?.match(/^`([^`]+)`$/)?.[1];
    if (code && !code.includes('...') && !code.includes('…')) out.push(code);
  }
  return out;
}

function parseError(fn: () => unknown): string | null {
  try {
    fn();
    return null;
  } catch (e) {
    return (e as Error).message.split('\n')[0];
  }
}

describe('MCP resource examples run on @hyperfixi/engine', () => {
  it.each(Object.keys(DOCS))('%s: every _="…" in an html fence parses', name => {
    const found = scripts(DOCS[name]());
    const failures = found
      .map(code => [code, parseError(() => engine.parseProgram(code))] as const)
      .filter(([, err]) => err)
      .map(([code, err]) => `${err}: ${code.replace(/\s+/g, ' ')}`);
    expect(failures).toEqual([]);
  });

  it('docs/commands: every table example parses as commands', () => {
    const found = tableExamples(getCommandsReference());
    expect(found.length).toBeGreaterThan(20);
    const failures = found.filter(code => parseError(() => engine.parse(code)));
    expect(failures).toEqual([]);
  });

  it('finds the fences (a pattern that matched nothing would pass everything above)', () => {
    const total = Object.values(DOCS).reduce((n, doc) => n + scripts(doc()).length, 0);
    expect(total).toBeGreaterThanOrEqual(19);
  });

  it('teaches none of core 3.x’s dotted event modifiers (they parse as other event names)', () => {
    const dotted = /on [a-z]+\.(prevent|stop|once|debounce|throttle|enter|escape|ctrl)\b/;
    for (const doc of Object.values(DOCS)) {
      const code = [...scripts(doc()), ...tableExamples(doc())];
      expect(code.filter(c => dotted.test(c))).toEqual([]);
    }
  });
});
