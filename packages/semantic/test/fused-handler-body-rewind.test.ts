/**
 * A generic fused event-handler pattern must not eat the first token of its
 * own body.
 *
 * These patterns end in an `{action}` slot meant to capture the wrapped
 * command's VERB — `event-handler-bn-sov` is `{event} তে {action}`, and the
 * body is then parsed from the tail AFTER the slot. That works only when the
 * verb really is the first body token. Two corpus shapes break it:
 *
 *   1. VERB-FINAL languages put the verb LAST, so the slot lands on the body's
 *      leading ARGUMENT. bn `ক্লিক তে আমি থেকে .highlight কে সরান` captured
 *      `আমি` as `action:reference="me"`; the tail parse began at the stranded
 *      `থেকে`, and `remove.source` fell back to its schema default — `me`
 *      again, but IMPLICIT, so the strict role signature scores it missing.
 *   2. An UNTRANSLATED verb (`repeat`, `pick` have no native surface in it/th)
 *      tokenizes as an identifier rather than a command keyword, so the slot
 *      captures it as a non-literal and the tail parse starts past it — the
 *      whole command disappears, action and all.
 *
 * The fix rewinds the body parse to the `{action}` slot's own start whenever
 * the slot captured something that is not a literal command name. A handler
 * whose slot captured a real literal verb still takes the flat path, and one
 * that captured no action at all still parses from the tail, so both keep
 * their previous token-identical parse.
 */
import { describe, it, expect } from 'vitest';
import { parse } from '../src/index';
import type { CommandSemanticNode, SemanticNode } from '../src/types';

function find(node: SemanticNode | null, action: string): CommandSemanticNode | null {
  if (!node) return null;
  let found: CommandSemanticNode | null = null;
  const walk = (n: SemanticNode): void => {
    if (!found && (n as CommandSemanticNode).action === action) found = n as CommandSemanticNode;
    const rec = n as unknown as Record<string, unknown>;
    for (const key of ['body', 'statements', 'thenBranch', 'elseBranch']) {
      const kids = rec[key];
      if (Array.isArray(kids)) kids.forEach(k => walk(k as SemanticNode));
    }
  };
  walk(node);
  return found;
}

function role(node: CommandSemanticNode | null, name: string) {
  return node?.roles.get(name as never) as
    | { type?: string; value?: unknown; implicit?: boolean }
    | undefined;
}

describe('a verb-final handler keeps the body argument ahead of its verb (bn)', () => {
  // Each body is `<source> থেকে <patient> কে সরান` — "remove <patient> from
  // <source>". Pre-fix the source VALUE was consumed by the `{action}` slot and
  // the role came back as the implicit schema default.
  const cases: ReadonlyArray<readonly [string, string, string]> = [
    ['ক্লিক তে আমি থেকে .highlight কে সরান', 'me', 'reference'],
    ['ক্লিক তে .items থেকে .active কে সরান', '.items', 'selector'],
    ['ক্লিক তে .tab থেকে .active কে সরান', '.tab', 'selector'],
  ];

  it.each(cases)('%s keeps source=%s', (code, expected, type) => {
    const node = find(parse(code, 'bn'), 'remove');
    expect(node, `bn: did not parse a remove out of: ${code}`).not.toBeNull();
    const source = role(node, 'source');
    expect(source?.value, `bn dropped the source clause`).toBe(expected);
    expect(source?.type).toBe(type);
    // The distinguishing half: `me` is also the schema DEFAULT for source, so
    // a value check alone passes on the broken parse for the first case.
    expect(source?.implicit, `bn defaulted the source instead of reading it`).not.toBe(true);
  });

  it('keeps the leading named-argument run of a render body', () => {
    const node = find(parse('ক্লিক তে users:$data দিয়ে #user-list কে রেন্ডার', 'bn'), 'render');
    expect(node, 'bn: handler render did not parse').not.toBeNull();
    expect(role(node, 'style')?.type, 'bn lost the with-phrase inside a handler').toBe(
      'expression'
    );
  });
});

describe('an untranslated body verb is not swallowed by the action slot', () => {
  // `repeat` and `pick` have no native surface in these languages, so they
  // tokenize as identifiers. Pre-fix the whole command vanished from the body.
  const cases: ReadonlyArray<readonly [string, string, string]> = [
    ['it', 'su click repeat item in .items aggiungere .processed a item', 'repeat'],
    ['th', 'เมื่อ click repeat item ใน .items เพิ่ม .processed ใน item', 'repeat'],
    ['it', 'su click pick caratteri 0 to 5 di #note', 'pick'],
    ['th', 'เมื่อ click pick อักขระ 0 to 5 ของ #note', 'pick'],
  ];

  it.each(cases)('%s recovers `%s`', (language, code, action) => {
    const parsed = parse(code, language);
    expect(parsed, `${language}: did not parse: ${code}`).not.toBeNull();
    expect(find(parsed, action), `${language} dropped the ${action} command entirely`).not.toBeNull();
  });
});

describe('handlers that were already correct are untouched', () => {
  it('bn still parses a body with no fronted argument', () => {
    const node = find(parse('ক্লিক তে .active কে টগল', 'bn'), 'toggle');
    expect(node).not.toBeNull();
    expect(role(node, 'patient')?.value).toBe('.active');
  });

  it('en still parses its own handler', () => {
    const node = find(parse('on click remove .highlight from me', 'en'), 'remove');
    expect(node).not.toBeNull();
    expect(role(node, 'source')?.value).toBe('me');
    expect(role(node, 'patient')?.value).toBe('.highlight');
  });
});
