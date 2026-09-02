/**
 * Slot-key parity: every `modifiers.<key>` a command's `parseInput` reads is
 * a key some parser EMITS for that command.
 *
 * Why this gate exists: #1068 shipped half of `trigger` — `parseInput` read
 * `modifiers.on` while the parser still pushed `on` into `args` — and core's
 * 7,974 tests stayed green, because every trigger fixture is hand-built.
 * A read with no emitter is exactly that shape, and it is static: no fixture
 * can hide it.
 *
 * Emitters, per command:
 *  - the core parser, measured by parsing the command's own documented
 *    examples (`metadata.examples`) and collecting the keys on every command
 *    node in the result;
 *  - `@lokascript/semantic`'s schema `ast.modifiers` descriptor for the
 *    action (the semantic path's keys — the shape `buildAST` emits);
 *  - the parser's generic tails, attached to any command: the `when`/`where`
 *    guards and `debounced`/`throttled` delays.
 *
 * A read outside all three is either dead (delete it) or an emitter the
 * examples do not reach (add an example). `KNOWN_UNEMITTED` holds the residue
 * measured when the gate was written, each with its reason; it is a ratchet —
 * shrink-only, and a new entry needs its reason here.
 */
import { describe, it, expect } from 'vitest';
import { commandSchemas } from '@lokascript/semantic';
import { parse } from '../../parser/parser';
import { commandExamples } from '../../parser/__tests__/engine-corpus';
import { parseInputModifierReads } from './parse-input-census';

const GENERIC_KEYS = new Set(['when', 'where', 'debounce', 'throttle']);

/**
 * A `parseInput` that lives on an abstract base, or a command registered
 * under an alias: its reads are checked against every name it serves.
 */
const SERVES: Record<string, readonly string[]> = {
  ContentInsertionCommand: ['append', 'prepend'],
  trigger: ['trigger', 'send'],
};

/**
 * Keys read today with no measured emitter. Shrink-only. Every entry is a read
 * that only a HAND-BUILT node can satisfy — neither parser produces the key —
 * which is the shape the missing-half bug wears; each is a deletion (with its
 * fixtures reshaped) waiting on its own PR.
 */
const KNOWN_UNEMITTED: Record<string, Record<string, string>> = {
  copy: { format: 'no parser emits `format`; one hand-built fixture' },
  if: {
    then: 'the parser puts branches in `args` as blocks; hand-built fallback only',
    else: 'same fallback as `then`',
  },
  pick: {
    from: 'the legacy `pick from <expr>` form parses positionally; hand-built fixtures only',
    flags: 'emitted by the `| <flags>` regex form, which the syntax list does not document',
  },
  repeat: {
    block: 'the parser puts the body in `args` as a block; hand-built fallback only',
    commands: 'same fallback as `block`',
  },
  take: { on: 'semantic emits `for`, the core parser `from`/`for`; four hand-built fixtures' },
  wait: {
    for: 'the parser emits one arrayLiteral of event specs in `args`; five hand-built fixtures',
    from: 'same — the event spec carries its source',
    or: 'same — the race form is the same arrayLiteral',
  },
};

function collectEmitted(node: unknown, into: Map<string, Set<string>>): void {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const n of node) collectEmitted(n, into);
    return;
  }
  const rec = node as Record<string, unknown>;
  if (rec.type === 'command' && typeof rec.name === 'string') {
    const keys = into.get(rec.name) ?? new Set<string>();
    for (const k of Object.keys((rec.modifiers as object | undefined) ?? {})) keys.add(k);
    into.set(rec.name, keys);
  }
  for (const v of Object.values(rec)) if (v && typeof v === 'object') collectEmitted(v, into);
}

function coreEmitted(): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const { source } of commandExamples()) {
    const result = parse(source);
    if (result.node) collectEmitted(result.node, out);
  }
  return out;
}

function semanticEmitted(): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const schema of Object.values(commandSchemas) as Array<{
    action: string;
    ast?: { modifiers?: Record<string, string> };
  }>) {
    out.set(schema.action, new Set(Object.keys(schema.ast?.modifiers ?? {})));
  }
  return out;
}

describe('slot-key parity (command reads ⊆ parser emits)', () => {
  const reads = parseInputModifierReads();
  const core = coreEmitted();
  const semantic = semanticEmitted();

  it('every modifier key a parseInput reads has an emitter', () => {
    const unemitted: Record<string, string[]> = {};
    for (const [command, { keys }] of Object.entries(reads)) {
      const emitted = new Set([
        ...(SERVES[command] ?? [command]).flatMap(n => [
          ...(core.get(n) ?? []),
          ...(semantic.get(n) ?? []),
        ]),
        ...GENERIC_KEYS,
      ]);
      const known = KNOWN_UNEMITTED[command] ?? {};
      const missing = keys.filter(k => !emitted.has(k) && !(k in known));
      if (missing.length) unemitted[command] = missing;
    }
    expect(
      unemitted,
      'reads with no emitter — dead read, or an example that never reaches it'
    ).toEqual({});
  });

  it('KNOWN_UNEMITTED is shrink-only: an entry whose key is emitted now must be deleted', () => {
    const stale: string[] = [];
    for (const [command, keys] of Object.entries(KNOWN_UNEMITTED)) {
      const emitted = new Set(
        (SERVES[command] ?? [command]).flatMap(n => [
          ...(core.get(n) ?? []),
          ...(semantic.get(n) ?? []),
        ])
      );
      const read = new Set(reads[command]?.keys ?? []);
      for (const key of Object.keys(keys)) {
        if (emitted.has(key) || !read.has(key)) stale.push(`${command}.${key}`);
      }
    }
    expect(stale).toEqual([]);
  });
});
