/**
 * A top-level command SEQUENCE parses to every command, not just the first.
 *
 * These tests deliberately do NOT assert "does it parse". It always parsed, at
 * confidence 1.0 — `parseInternal` had no program layer for plain commands, so
 * Stage 2 matched the first command and returned, dropping the rest in silence:
 *
 *                                     inside a handler        top level
 *   add .a to #x then add .b to #y    [on, add, add]  ✓       [add]       ✗
 *   bind $n to #a bind $n to #b       [on, bind, bind] ✓      [bind]      ✗
 *
 * They assert on the captured command list, on the lowered AST, and on the
 * derived confidence.
 *
 * Note the English corpus form is JUXTAPOSED (`bind … bind …`); only the
 * translations insert a conjunction (es `entonces`, fr `alors`). A then-only fix
 * would pass 23 languages and fail English, so both forms are covered here.
 *
 * This drop was invisible to the multilingual fidelity ratchet: every language
 * dropped the second `bind` identically, so the action signatures agreed and the
 * row scored fidelity 1.0. `collectActions` is a Set, so `[bind, bind]` and
 * `[bind]` are indistinguishable to R0-recall and R1 alike. The per-language
 * coverage below is the proof the ratchet could not give.
 */
import { describe, it, expect } from 'vitest';
import { parse, parseSemantic, buildAST } from '../src';
import type { CommandSemanticNode, CompoundSemanticNode, SemanticNode } from '../src/types';

/** Flatten every command action in a parsed tree (mirrors fidelity.ts CHILD_FIELDS). */
function actionsOf(node: unknown, depth = 0): string[] {
  if (!node || typeof node !== 'object' || depth > 32) return [];
  const rec = node as Record<string, unknown>;
  const out: string[] = [];
  if (typeof rec.action === 'string' && rec.action !== 'compound') out.push(rec.action);
  for (const field of [
    'body',
    'statements',
    'thenBranch',
    'elseBranch',
    'eventHandlers',
  ] as const) {
    const child = rec[field];
    if (Array.isArray(child)) for (const c of child) out.push(...actionsOf(c, depth + 1));
    else if (child && typeof child === 'object') out.push(...actionsOf(child, depth + 1));
  }
  return out;
}

function hasUnconsumedInput(node: SemanticNode): boolean {
  return (node.diagnostics ?? []).some(d => d.code === 'unconsumed-input');
}

describe('top-level command sequence: every command is captured', () => {
  it('splits a then-chained sequence (was truncated to the first command)', () => {
    const node = parse('add .a to #x then add .b to #y', 'en') as CompoundSemanticNode;

    expect(node.kind).toBe('compound');
    expect(node.statements.map(s => (s as CommandSemanticNode).action)).toEqual(['add', 'add']);
    expect(hasUnconsumedInput(node)).toBe(false);
  });

  it('splits a JUXTAPOSED sequence — the English corpus form, which has no `then`', () => {
    const node = parse(
      'bind $name to #input-a bind $name to #input-b',
      'en'
    ) as CompoundSemanticNode;

    expect(node.kind).toBe('compound');
    expect(node.statements.map(s => (s as CommandSemanticNode).action)).toEqual(['bind', 'bind']);
    expect(hasUnconsumedInput(node)).toBe(false);
  });

  it('carries a real confidence, not the `?? 0.8` default for a metadata-less compound', () => {
    // createCompoundNode sets no confidence; parseWithConfidence falls back to 0.8.
    // The guard sets the mean of its clauses, so a clean two-command sequence is 1.0.
    const result = parseSemantic('add .a to #x then add .b to #y', 'en');

    expect(result.node?.kind).toBe('compound');
    expect(result.confidence).toBe(1);
  });
});

describe('top-level command sequence: AST lowering', () => {
  it('lowers to a CommandSequence, never a Program', () => {
    const { ast } = buildAST(parse('add .a to #x then add .b to #y', 'en')) as {
      ast: { type: string; commands?: unknown[] };
    };

    expect(ast.type).toBe('CommandSequence');
    expect(ast.commands).toHaveLength(2);
  });

  it('a multi-handler program is still a Program', () => {
    const { ast } = buildAST(parse('on click toggle .a end on keyup toggle .b end', 'en')) as {
      ast: { type: string };
    };

    expect(ast.type).toBe('Program');
  });
});

/**
 * The 24 corpus translations of `bind-two-way`, inlined: `@hyperfixi/patterns-reference`
 * depends on this package, so importing it here would be a dependency cycle. The
 * DB-driven equivalent is the `multilingual-validation` sweep.
 *
 * Every language must capture BOTH binds. Before this fix each dropped one
 * identically, which is exactly why the ratchet read the row as faithful.
 */
const BIND_TWO_WAY: Array<[language: string, code: string]> = [
  ['ar', 'اربط $name إلى #input-a ثم اربط $name إلى #input-b'],
  ['bn', '$name কে #input-a তে বাইন্ড তারপর $name কে #input-b তে বাইন্ড'],
  ['de', 'bind $name zu #input-a dann bind $name zu #input-b'],
  ['en', 'bind $name to #input-a bind $name to #input-b'],
  ['es', 'bind $name a #input-a entonces bind $name a #input-b'],
  ['fr', 'bind $name à #input-a alors bind $name à #input-b'],
  ['he', 'קשור $name ל #input-a אז קשור $name ל #input-b'],
  ['hi', '$name को #input-a में bind फिर $name को #input-b में bind'],
  ['id', 'bind $name ke #input-a lalu bind $name ke #input-b'],
  ['it', 'bind $name in #input-a allora bind $name in #input-b'],
  ['ja', '$name を #input-a に バインド それから $name を #input-b に バインド'],
  ['ko', '$name 를 #input-a 에 바인드 그러면 $name 를 #input-b 에 바인드'],
  ['ms', 'bind $name ke #input-a kemudian bind $name ke #input-b'],
  ['pl', 'bind $name do #input-a wtedy bind $name do #input-b'],
  ['pt', 'bind $name para #input-a então bind $name para #input-b'],
  ['qu', '$name ta #input-a man bind chayqa $name ta #input-b man bind'],
  ['ru', 'bind $name в #input-a затем bind $name в #input-b'],
  ['sw', 'bind $name kwa #input-a kisha bind $name kwa #input-b'],
  ['th', 'bind $name ใน #input-a แล้ว bind $name ใน #input-b'],
  ['tl', 'bind $name sa #input-a pagkatapos bind $name sa #input-b'],
  ['tr', '$name i #input-a e bind ardından $name i #input-b e bind'],
  ['uk', 'bind $name в #input-a тоді bind $name в #input-b'],
  ['vi', 'bind $name vào #input-a rồi bind $name vào #input-b'],
  ['zh', '绑定 $name 到 #input-a 那么 绑定 $name 到 #input-b'],
];

describe('top-level command sequence: all 24 languages (bind-two-way)', () => {
  it.each(BIND_TWO_WAY)('%s captures both binds', (lang, code) => {
    const node = parse(code, lang);

    expect(node.kind).toBe('compound');
    expect(actionsOf(node)).toEqual(['bind', 'bind']);
    expect(hasUnconsumedInput(node)).toBe(false);
  });
});

describe('top-level command sequence: the guard is additive', () => {
  it('leaves a genuine single command untouched', () => {
    const node = parse('toggle .active', 'en');

    expect(node.kind).toBe('command');
    expect((node as CommandSemanticNode).action).toBe('toggle');
  });

  it('leaves a single command whose tail is NOT a command untouched, and still warns', () => {
    // The remainder must parse into a second command for the guard to fire.
    const node = parse('set x to 5 +', 'en');

    expect(node.kind).toBe('command');
    expect(actionsOf(node)).toEqual(['set']);
    expect(hasUnconsumedInput(node)).toBe(true);
  });

  it('does not flatten a block body into a sibling clause', () => {
    // `repeat 3 times toggle .x end` leaves `toggle .x end` unconsumed. The clause
    // parser would read it as a SIBLING (`compound[repeat, toggle]` — a loop with
    // no body). BLOCK_BODY_ACTIONS is excluded from the guard, so the pre-existing
    // body-drop stays visible via `unconsumed-input` rather than being flattened.
    const node = parse('repeat 3 times toggle .x end', 'en');

    expect(node.kind).toBe('command');
    expect((node as CommandSemanticNode).action).toBe('repeat');
    expect(hasUnconsumedInput(node)).toBe(true);
  });

  it('does not change a sequence nested inside an event handler', () => {
    const node = parse('on click add .a to #x then add .b to #y', 'en');

    expect(node.kind).toBe('event-handler');
    expect(actionsOf(node)).toEqual(['on', 'add', 'add']);
  });
});

describe('top-level command sequence: the SOV trailing-event guard still wins', () => {
  it('keeps the `on click` wrapper on a multi-command SOV body with a fused trailing event', () => {
    // `.active を 切り替え それから .b を 削除 クリック で` = "on click: toggle .active
    // then remove .b". parseBodyWithClauses alone yields compound[toggle, remove]
    // and loses the handler, so the SOV guard must claim this input first. This
    // is the input that pins the guard ORDER inside Stage 2.
    const node = parse('.active を 切り替え それから .b を 削除 クリック で', 'ja');

    expect(node.kind).toBe('event-handler');
    expect(actionsOf(node)).toEqual(['on', 'toggle', 'remove']);
  });
});
