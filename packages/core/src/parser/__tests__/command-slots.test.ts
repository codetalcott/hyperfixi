/**
 * `COMMAND_SLOTS` is a declared table; this pins it to the measured truth in
 * both directions (see the module header). Emitters: the core parser over
 * each command's documented examples, and the semantic schema descriptor.
 * Readers: every `modifiers.<key>` in a `parseInput` body.
 */
import { describe, it, expect } from 'vitest';
import { commandSchemas } from '@lokascript/semantic';
import { parse } from '../parser';
import { commandExamples } from './engine-corpus';
import { COMMAND_SLOTS, GENERIC_SLOT_KEYS } from '../command-slots';
import { parseInputModifierReads } from '../../commands/__tests__/parse-input-census';
import { COMMAND_NAMES } from '../../commands/manifest';

/** A `parseInput` on a base class or an alias serves several rows. */
const SERVES: Record<string, readonly string[]> = {
  ContentInsertionCommand: ['append', 'prepend'],
  VisibilityCommandBase: ['show', 'hide'],
  ControlFlowSignalBase: ['break', 'continue', 'exit'],
  trigger: ['trigger', 'send'],
};

/**
 * Declared keys with neither a measured emitter nor a reader — each with the
 * reason it is still real. Shrink-only.
 */
const KNOWN_PHANTOMS: Record<string, Record<string, string>> = {
  put: {
    at: 'emitted for `put X at Y`; no documented example uses the bare `at` form',
    'at end of': 'multi-word operation key; no documented example',
    'at start of': 'multi-word operation key; no documented example',
    after: 'emitted for `put X after Y`; no documented example',
    viewTransition: 'emitted by the `using view transition` tail; no documented example',
  },
  repeat: {
    bottomTested: 'emitted for `repeat … until/while … end`; no documented example',
    event: 'emitted for `repeat until event X`; no documented example',
    from: 'emitted for `repeat until event X from Y`; no documented example',
    times: 'emitted for `repeat N times`; the documented example uses the `{}` form',
    until: 'emitted for `repeat until …`; no documented example',
    while: 'emitted for `repeat while …`; no documented example',
  },
  'pseudo-command': {
    at: 'constructed, never parsed — the command lists the six prepositions it accepts',
    from: 'same',
    into: 'same',
    on: 'same',
    to: 'same',
    with: 'same',
  },
  copy: {
    to: 'the grammar marker `to clipboard`; the destination is always the clipboard, so nothing reads it',
  },
};

function walk(node: unknown, into: Map<string, Set<string>>): void {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const n of node) walk(n, into);
    return;
  }
  const rec = node as Record<string, unknown>;
  if (rec.type === 'command' && typeof rec.name === 'string') {
    const keys = into.get(rec.name) ?? new Set<string>();
    for (const k of Object.keys((rec.modifiers as object | undefined) ?? {})) keys.add(k);
    into.set(rec.name, keys);
  }
  for (const v of Object.values(rec)) if (v && typeof v === 'object') walk(v, into);
}

const generic = new Set<string>(GENERIC_SLOT_KEYS);

describe('COMMAND_SLOTS is the measured truth', () => {
  const core = new Map<string, Set<string>>();
  for (const { source } of commandExamples()) {
    const r = parse(source);
    if (r.node) walk(r.node, core);
  }
  const semantic = new Map<string, Set<string>>();
  for (const s of Object.values(commandSchemas) as Array<{
    action: string;
    ast?: { modifiers?: Record<string, string> };
  }>) {
    semantic.set(s.action, new Set(Object.keys(s.ast?.modifiers ?? {})));
  }
  const reads = new Map<string, Set<string>>();
  for (const [body, { keys }] of Object.entries(parseInputModifierReads())) {
    for (const name of SERVES[body] ?? [body]) {
      const set = reads.get(name) ?? new Set<string>();
      for (const k of keys) set.add(k);
      reads.set(name, set);
    }
  }

  it('has a row for every manifest command, and no row for a name the manifest lacks', () => {
    const rows = new Set(Object.keys(COMMAND_SLOTS));
    const manifest = new Set<string>(COMMAND_NAMES);
    expect([...manifest].filter(n => !rows.has(n))).toEqual([]);
    expect([...rows].filter(n => !manifest.has(n))).toEqual([]);
  });

  it('declares every key a parser emits or a command reads (the compile error this table exists for)', () => {
    const missing: Record<string, string[]> = {};
    for (const [name, declared] of Object.entries(COMMAND_SLOTS)) {
      const row = new Set<string>(declared);
      const needed = new Set([
        ...(core.get(name) ?? []),
        ...(semantic.get(name) ?? []),
        ...(reads.get(name) ?? []),
      ]);
      const m = [...needed].filter(k => !row.has(k) && !generic.has(k)).sort();
      if (m.length) missing[name] = m;
    }
    expect(missing).toEqual({});
  });

  it('declares no phantom key — a declared key nothing emits or reads is banked with a reason, shrink-only', () => {
    const phantoms: Record<string, string[]> = {};
    const stale: string[] = [];
    for (const [name, declared] of Object.entries(COMMAND_SLOTS)) {
      const live = new Set([
        ...(core.get(name) ?? []),
        ...(semantic.get(name) ?? []),
        ...(reads.get(name) ?? []),
      ]);
      const known = KNOWN_PHANTOMS[name] ?? {};
      const p = declared.filter(k => !live.has(k) && !(k in known));
      if (p.length) phantoms[name] = [...p];
      for (const k of Object.keys(known)) if (live.has(k)) stale.push(`${name}.${k}`);
    }
    expect(phantoms).toEqual({});
    expect(stale, 'KNOWN_PHANTOMS entries whose key is live now — delete them').toEqual([]);
  });
});
