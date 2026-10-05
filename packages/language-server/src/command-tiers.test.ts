/**
 * Command tiers must name the engine's keywords, and all of them.
 *
 * `LOKASCRIPT_ONLY_COMMANDS` once advertised `persist` (deleted in c8cd050e),
 * `transfer` (never existed anywhere in the repo), and `process-partials` (the
 * command was `process`). Nothing checked these lists against the engine, so the
 * LSP offered completions for commands the runtime rejects.
 *
 * The oracle is `@hyperfixi/engine`'s grammar: every module in `everything` run
 * against a fresh grammar, the way the Vite plugin and `verify:reference` read it.
 * (Until Phase C5 of the engine cutover this read core's command manifest as
 * source text; it leaves with core's engine in C6.)
 */

import { describe, it, expect } from 'vitest';
import { createGrammar, everything, parse, register } from '@hyperfixi/engine';
import {
  HYPERSCRIPT_COMMANDS,
  LOKASCRIPT_ONLY_COMMANDS,
  detectLokascriptFeatures,
} from './command-tiers';

function engineKeywords(): Set<string> {
  const keywords = new Set<string>();
  for (const mod of everything) {
    const grammar = createGrammar();
    mod(grammar);
    // The template text line registers under `#text`, which no script can spell.
    for (const key of Object.keys(grammar.commands)) if (!key.startsWith('#')) keywords.add(key);
    for (const key of Object.keys(grammar.features)) keywords.add(key);
  }
  return keywords;
}

/** In HYPERSCRIPT_COMMANDS without being engine keywords, each for its reason. */
const NOT_ENGINE_KEYWORDS = new Set([
  'while', // continues a `repeat`
  'eventsource', // upstream extensions (ext/*.js) the engine does not have
  'socket',
  'worker',
]);

describe('command tiers name the engine keywords', () => {
  const engine = engineKeywords();

  it('read the engine grammar (guards the oracle)', () => {
    expect(engine.size).toBeGreaterThan(55);
    expect(engine.has('toggle')).toBe(true);
    expect(engine.has('beep!')).toBe(true);
    expect(engine.has('on')).toBe(true);
  });

  it('every HYPERSCRIPT_COMMANDS entry is an engine keyword or a listed exception', () => {
    const ghosts = HYPERSCRIPT_COMMANDS.filter(
      name => !engine.has(name) && !NOT_ENGINE_KEYWORDS.has(name)
    );
    expect(ghosts).toEqual([]);
  });

  it('every engine keyword is in HYPERSCRIPT_COMMANDS', () => {
    const listed = new Set<string>(HYPERSCRIPT_COMMANDS);
    expect([...engine].filter(name => !listed.has(name)).sort()).toEqual([]);
  });

  it('lists no keyword twice', () => {
    expect(HYPERSCRIPT_COMMANDS.length).toBe(new Set(HYPERSCRIPT_COMMANDS).size);
  });

  it('has no LokaScript-only keyword: the engine follows upstream', () => {
    expect(LOKASCRIPT_ONLY_COMMANDS).toEqual([]);
  });
});

describe('detectLokascriptFeatures finds the engine additions in its parse', () => {
  register(...everything);

  it.each([
    ['new X()', 'set t to new Date()', 'new-expression'],
    ['toggle <element>', 'on click toggle #dialog', 'toggle-element'],
  ])('flags %s, with its offsets', (_label, code, pattern) => {
    const found = detectLokascriptFeatures(parse(code));
    expect(found.map(f => f.pattern)).toEqual([pattern]);
    const at = found[0];
    expect(typeof at.start).toBe('number');
    expect(code.slice(at.start, at.end)).toMatch(pattern === 'new-expression' ? /^new/ : /^toggle/);
  });

  it.each([
    'on click toggle .active on me',
    'on click toggle @disabled on #btn',
    'on click toggle between .a and .b',
    'set t to my value',
    'make a Date then put it into #out',
    'set new to 1',
  ])('stays silent on upstream code: %s', code => {
    expect(detectLokascriptFeatures(parse(code))).toEqual([]);
  });

  it('finds nothing in a tree it cannot read', () => {
    expect(detectLokascriptFeatures(null)).toEqual([]);
  });
});
