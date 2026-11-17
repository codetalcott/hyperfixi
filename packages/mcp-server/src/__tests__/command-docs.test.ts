/**
 * get_command_docs answers from the reference the editor reads (`@hyperfixi/core/reference`,
 * `HOVER_DOCS`), which core's `verify:reference` holds to the engine. Before 2026-11-17 it
 * answered from `@lokascript/semantic`'s command schemas (and a hand-written table), which
 * nothing checked against the engine: `swap` was documented with a strategy the engine does
 * not read, `go` without its `to`, and `prepend`, `push`, `copy` as commands.
 */
import { describe, it, expect } from 'vitest';
import * as engine from '@hyperfixi/engine';
import { createCompleter, type CompletionEngine } from '@hyperfixi/engine/next-words';
import { commands as reference } from '@hyperfixi/core/reference';
import { handleLanguageDocsTool } from '../tools/language-docs.js';

engine.register(...engine.everything);
const { groups } = createCompleter(engine as unknown as CompletionEngine);

const docs = async (command: string) =>
  JSON.parse(
    (await handleLanguageDocsTool('get_command_docs', { command })).content[0]!.text as string
  );
const search = async (query: string) =>
  JSON.parse(
    (await handleLanguageDocsTool('search_language_elements', { query, types: ['command'] }))
      .content[0]!.text as string
  );
/** Does the engine read `source`: as a script, or as the commands of a handler? */
const reads = (source: string): boolean => {
  for (const candidate of [source, `on click\n${source}\nend`]) {
    try {
      engine.parse(candidate);
      return true;
    } catch {
      // try the next form
    }
  }
  return false;
};

describe('get_command_docs', () => {
  it('documents every command and feature keyword of the engine', async () => {
    const keywords = [...new Set([...groups.commands, ...groups.features])];
    expect(keywords.length).toBeGreaterThan(50);
    const missing: string[] = [];
    for (const keyword of keywords) {
      const answer = await docs(keyword);
      if (!answer.found || !answer.description || !answer.examples?.length) missing.push(keyword);
    }
    expect(missing).toEqual([]);
  });

  it("gives the reference's syntax and examples, and the engine reads each example", async () => {
    const unread: string[] = [];
    for (const [name, ref] of Object.entries(reference)) {
      const answer = await docs(name);
      expect(answer.syntax, name).toBe(ref.syntax);
      expect(answer.examples, name).toEqual(ref.examples);
      expect(answer.kind, name).toBe('command');
      for (const example of answer.examples as string[]) {
        if (!reads(example)) unread.push(`${name}: ${example}`);
      }
    }
    expect(unread).toEqual([]);
  });

  it('documents what the engine reads where the semantic schema says otherwise', async () => {
    const swap = await docs('swap');
    expect(swap.syntax).toBe('swap target with value');
    expect(reads(swap.examples[0])).toBe(true);
    expect((await docs('go')).syntax).toMatch(/^go to /);
    // The semantic model is still there, apart, for the explicit and JSON forms.
    expect(swap.semantic.roles.length).toBeGreaterThan(0);
    expect(swap.semantic.roleSyntax).toContain('swap');
  });

  it('documents a feature', async () => {
    const on = await docs('on');
    expect(on).toMatchObject({ found: true, kind: 'feature' });
    expect(reads(on.examples[0])).toBe(true);
    expect((await docs('beep!')).found).toBe(true);
  });

  it('says an action of the multilingual layer is no command of the engine', async () => {
    for (const name of ['prepend', 'push', 'copy']) {
      expect(reads(`${name} "a" to #b`), name).toBe(false);
      const answer = await docs(name);
      expect(answer.found, name).toBe(false);
      expect(answer.message, name).toMatch(/not a command of the engine/);
      expect(answer.semantic.roles.length, name).toBeGreaterThan(0);
    }
  });

  it('answers an unknown name with the engine keywords, and nearby ones', async () => {
    const answer = await docs('togg');
    expect(answer.found).toBe(false);
    expect(answer.suggestions).toContain('toggle');
    expect(answer.availableCommands).toEqual(expect.arrayContaining(['toggle', 'on', 'swap']));
    expect(answer.availableCommands).not.toContain('prepend');
  });
});

describe('search_language_elements, commands', () => {
  it("finds the engine's commands, with the reference's syntax", async () => {
    const { results } = await search('swap');
    const swap = results.find((r: { name: string }) => r.name === 'swap');
    expect(swap.syntax).toBe('swap target with value');
  });

  it('finds no command the engine does not have', async () => {
    const { results } = await search('prepend');
    expect(results.filter((r: { type: string; name: string }) => r.name === 'prepend')).toEqual([]);
  });
});
