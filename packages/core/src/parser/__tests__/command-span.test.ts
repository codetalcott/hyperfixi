/**
 * A command node spans the COMMAND, not just its last token
 *
 * The generic command path ended with `getPosition()`, which reports the
 * PREVIOUS token — after the argument loop, that is the last argument. So the
 * node claimed its final argument's span as its own:
 *
 *     log "hello"     →  start 4, end 11     ("hello")
 *                        should be 0..11     (the whole command)
 *
 * Measured over the documented command examples when this was found: **50 of
 * 183 started late**, across 19 commands — every one that reaches the generic
 * path rather than a specialized parser, which is exactly why `toggle` and
 * `add` were right and `log` was not.
 *
 * It matters because these are the spans LSP hover/diagnostic ranges use, and
 * that any error quoting a source span reads. Found while scoping the
 * convergence queue's "positions" item, whose premise was that the traditional
 * parser is the position ORACLE — it is, for 133 of 183; this closes the rest.
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../parser';
import { commandExamples } from './engine-corpus';

interface Span {
  name?: string;
  start?: number;
  end?: number;
  args?: unknown[];
}

function firstCommand(source: string): Span | null {
  const result = parse(source, {}) as { success?: boolean; node?: Record<string, unknown> };
  if (!result?.success || !result.node) return null;
  const node = result.node;
  const commands = node.commands as Span[] | undefined;
  const candidate = commands?.[0] ?? (node as Span);
  return candidate && (candidate as Span).name !== undefined ? (candidate as Span) : null;
}

describe('command node spans', () => {
  it('spans the whole command, not the last argument', () => {
    const cmd = firstCommand('log "hello"');
    expect(cmd).not.toBeNull();
    expect(cmd!.start).toBe(0);
    expect(cmd!.end).toBe(11);
  });

  it('holds for the specialized parsers too — they were always right', () => {
    // `toggle` and `add` reach dedicated parsers and already spanned correctly;
    // pinned so a future unification cannot silently regress them to the
    // generic path's old behaviour.
    for (const source of ['toggle .active on #panel', 'add .a to #b']) {
      const cmd = firstCommand(source);
      expect(cmd!.start, source).toBe(0);
      expect(cmd!.end, source).toBe(source.length);
    }
  });

  it('no documented single-command example starts after its keyword', () => {
    // The sweep that found the defect, kept as the gate. A bare
    // single-command source must span from offset 0 — anything later means the
    // node adopted an argument's span again.
    const late: string[] = [];

    for (const example of commandExamples()) {
      // Feature-level sources (`on …`, `init …`) wrap their commands, so
      // offset 0 is not the command keyword; the generic path is what is
      // under test here.
      if (/^(on|init|def|behavior)\b/.test(example.source)) continue;
      const cmd = firstCommand(example.source);
      if (!cmd || typeof cmd.start !== 'number') continue;
      if (cmd.start !== 0) late.push(`${cmd.name} start=${cmd.start} :: ${example.source}`);
    }

    expect(late).toEqual([]);
  });

  it('the sweep is not vacuous — it really examines the corpus', () => {
    // Guards the guard: a broken parse path would empty the loop above and the
    // `toEqual([])` would pass having checked nothing.
    const examined = commandExamples().filter(
      e => !/^(on|init|def|behavior)\b/.test(e.source) && firstCommand(e.source) !== null
    );
    expect(examined.length).toBeGreaterThan(100);
  });
});
