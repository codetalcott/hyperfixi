/**
 * Arc 1 step 6 — English is parsed by the core parser ALONE
 *
 * Until 2026-09-02 `parseCommandCore` offered every English command not on a
 * 27-entry skip list to the semantic front-end first and adopted its parse
 * mid-token-stream when it was confident. That in-loop path is deleted: a
 * non-English program falls back WHOLE-PROGRAM (the front-end renders to
 * English and the core parser parses the English), and English never reaches
 * the front-end at all. This file is what pins that.
 *
 * ## Why it is one file and not the five it replaces
 *
 * `semantic-resync-and`, `semantic-adoption-coverage`, `semantic-span`,
 * `toggle-skip-semantic` and `semantic-integration(-delegation)` each guarded a
 * defect of the deleted path — a resync stopping at `and`, a prefix-parse
 * adopted whole, a `[0, 0]` span, an attribute reference dropped by adoption.
 * None of those is representable any more: there is no adoption. Each of them
 * also opened with "the default config really does run semantic-first —
 * otherwise this file is vacuous", which is now false by design. The absolute
 * shapes they asserted are kept below as pins on the traditional parser;
 * everything comparative ("agrees with `{ traditional: true }`") is now a
 * tautology and is stated once, over the whole corpus, as the first test.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { hyperscript, config } from '../../api/hyperscript-api';
import { corpusSources, canonicalize } from './engine-corpus';
import { assertNodeOfKind } from '../../ast/guards';
import {
  enableDebugEvents,
  disableDebugEvents,
  getDebugStats,
  resetDebugStats,
} from '../../utils/debug-events';

function firstCommand(ast: unknown): Record<string, unknown> {
  const node = ast as Record<string, unknown>;
  if (node.type === 'eventHandler') {
    return (node.commands as Record<string, unknown>[])[0];
  }
  return node;
}

describe('English is parsed by the core parser alone', () => {
  it('the default path and `{ traditional: true }` produce byte-identical ASTs over the whole engine corpus', () => {
    // The strongest form of the step: not "a few sources agree", but every one.
    // If anyone re-introduces a front-end attempt on the English path, the
    // first source it adopts differently lands in `moved`.
    const moved: string[] = [];
    for (const source of corpusSources()) {
      const dflt = hyperscript.compileSync(source);
      const trad = hyperscript.compileSync(source, { traditional: true });
      if (dflt.ok !== trad.ok) moved.push(source);
      else if (JSON.stringify(canonicalize(dflt.ast)) !== JSON.stringify(canonicalize(trad.ast)))
        moved.push(source);
    }
    expect(moved).toEqual([]);
  });

  it('reports `parser: "traditional"` for an English compile, whatever the options', () => {
    // `meta.parser === 'semantic'` now means "the front-end PRODUCED this AST",
    // which only the non-English direct path can claim. Before step 6 it meant
    // "the analyzer was consulted", which was true of every default compile.
    expect(hyperscript.compileSync('toggle .active').meta.parser).toBe('traditional');
    expect(hyperscript.compileSync('toggle .active', { traditional: true }).meta.parser).toBe(
      'traditional'
    );
  });

  // The absolute shapes the retired files asserted, kept as pins on the one
  // parser that now runs. Each was once a defect of the deleted path.
  it('`log 1 and 2` is ONE log with a binary `and` argument (was: resync split at `and`)', () => {
    const result = hyperscript.compileSync('on click log 1 and 2');
    expect(result.ok).toBe(true);
    const handler = assertNodeOfKind(result.ast, 'eventHandler');
    expect(handler.commands).toHaveLength(1);
    const log = assertNodeOfKind(handler.commands[0], 'command');
    expect(log.name).toBe('log');
    expect(log.args).toHaveLength(1);
    expect(assertNodeOfKind(log.args[0], 'binaryExpression').operator).toBe('and');
  });

  it('`log "a" is not "b"` keeps the whole comparison (was: a prefix-parse adopted whole)', () => {
    const result = hyperscript.compileSync('on click log "a" is not "b"');
    expect(result.ok).toBe(true);
    const log = assertNodeOfKind(firstCommand(result.ast), 'command');
    expect(log.args).toHaveLength(1);
    expect(log.args[0].type).not.toBe('literal');
  });

  it('`call element.focus()` is one command, never a phantom second `focus` (was: resync stopped at a command word)', () => {
    const result = hyperscript.compileSync('call element.focus()');
    expect(result.ok).toBe(true);
    expect(assertNodeOfKind(result.ast, 'command').name).toBe('call');
  });

  it('`toggle @disabled on #target` keeps the attribute reference (was: adoption dropped the `@`)', () => {
    const result = hyperscript.compileSync('on click toggle @disabled on #target');
    expect(result.ok).toBe(true);
    const toggle = assertNodeOfKind(firstCommand(result.ast), 'command');
    expect(toggle.name).toBe('toggle');
    expect(assertNodeOfKind(toggle.args[0], 'attributeAccess').attributeName).toBe('disabled');
  });

  it('a command carries its own real span, not the `[0, 0]` placeholder', () => {
    const result = hyperscript.compileSync('log "x"');
    expect(result.ok).toBe(true);
    const log = assertNodeOfKind(result.ast, 'command');
    expect(log.start).toBe(0);
    expect(log.end).toBe(7);
    expect(log.line).toBe(1);
  });
});

describe('the front-end is consulted whole-program, and only for a non-English program', () => {
  afterEach(() => {
    config.semantic = true;
    disableDebugEvents();
    resetDebugStats();
  });

  it('a Spanish program takes the direct path and reports `parser: "semantic"`', async () => {
    const result = await hyperscript.compile('alternar .active', { language: 'es' });
    expect(result.ok).toBe(true);
    expect(result.meta.parser).toBe('semantic');
    expect(result.meta.directPath).toBe(true);
    expect(assertNodeOfKind(result.ast, 'command').name).toBe('toggle');
  });

  it('`config.semantic = false` means core parser only — a Spanish program is not rescued', async () => {
    config.semantic = false;
    const result = await hyperscript.compile('alternar .active', { language: 'es' });
    // The front-end was never asked. `alternar .active` is not a command the
    // core parser knows, so it comes back as what it looks like to an English
    // parser — a member expression — exactly as with no semantic bundle loaded.
    expect(result.meta.parser).toBe('traditional');
    expect((result.ast as { type?: string } | undefined)?.type).not.toBe('command');
  });

  it('`traditional: true` skips the front-end for a non-English program too', async () => {
    const result = await hyperscript.compile('alternar .active', {
      language: 'es',
      traditional: true,
    });
    expect(result.meta.parser).toBe('traditional');
    expect((result.ast as { type?: string } | undefined)?.type).not.toBe('command');
  });

  it('feeds `semanticDebug` once per program, from the whole-program path', async () => {
    // The `hyperfixi:semantic-parse` stats used to be updated by the in-loop
    // attempt on every English command. They now count front-end consultations,
    // which happen exactly once per non-English compile — and never for English.
    enableDebugEvents();
    resetDebugStats();
    // A source no earlier test compiled — the AST cache would otherwise answer
    // before the front-end is consulted, and the count would read 0.
    await hyperscript.compile('alternar .stats', { language: 'es' });
    hyperscript.compileSync('toggle .active');
    const stats = getDebugStats();
    expect(stats.totalParses).toBe(1);
    expect(stats.semanticSuccesses).toBe(1);
  });
});
