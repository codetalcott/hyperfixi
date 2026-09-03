/**
 * A marker-less optional slot must not eat the verb its own pattern is waiting
 * for.
 *
 * The generated command patterns give an optional role slot a marker literal
 * only where the profile has one. ja's duration group is `[間 {duration}]`, so
 * it cannot fire without `間`; tr's is a bare `[{duration}]` sitting directly in
 * front of the verb literal. On `.card e .expanded i değiştir` that bare slot
 * captured the verb as `duration:literal="toggle"`, the trailing `değiştir`
 * literal had nothing left, `toggle-tr-generated` FAILED outright, and matching
 * fell to `toggle-tr-generated-simple`, which has no destination role — so the
 * destination was silently dropped.
 *
 * The matcher already skipped a command verb in a TRAILING optional slot. That
 * scoping was deliberate: a mid-pattern capture is supposed to fail so a richer
 * fallback can reclaim the tail. But the premise does not hold when the
 * pattern's OWN next literal is waiting for this exact token — skipping the
 * slot lets the same pattern complete with MORE roles, not fewer. So the skip
 * now also applies mid-pattern, gated on the next pattern token being a literal
 * the verb itself satisfies.
 *
 * The BARE surface is the part no gate could see: every corpus toggle row sits
 * inside a handler, and `toggle .active on #panel` — the plainest two-role
 * toggle there is — did not parse AT ALL in bn or tr.
 */
import { describe, it, expect } from 'vitest';
import { parse, translate } from '../src/index';
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
    | { type?: string; raw?: string; value?: unknown; implicit?: boolean }
    | undefined;
}

describe('the BARE two-role toggle parses in a marker-less language', () => {
  // Not reachable through the corpus: every corpus toggle row is inside a
  // handler. Both of these returned NO parse at all.
  it.each([
    ['bn', '#panel তে .active কে টগল'],
    ['tr', '#panel e .active i değiştir'],
  ] as const)('%s parses `toggle .active on #panel`', (language, code) => {
    const node = find(parse(code, language), 'toggle');
    expect(node, `${language}: bare toggle did not parse: ${code}`).not.toBeNull();
    expect(role(node, 'destination')?.value, `${language} lost the destination`).toBe('#panel');
    expect(role(node, 'patient')?.value).toBe('.active');
  });

  it.each(['bn', 'tr'] as const)('%s round-trips it through the renderer', language => {
    const rendered = translate('toggle .active on #panel', 'en', language);
    const node = find(parse(rendered, language), 'toggle');
    expect(node, `${language}: render did not re-parse: ${rendered}`).not.toBeNull();
    expect(role(node, 'destination')?.value).toBe('#panel');
    expect(role(node, 'patient')?.value).toBe('.active');
  });

  it('tr keeps a POSITIONAL destination through the same slot', () => {
    // The same pattern, reached with an expression-typed destination.
    const node = find(parse('enyakın .card e .expanded i değiştir', 'tr'), 'toggle');
    expect(node).not.toBeNull();
    expect(role(node, 'destination')?.raw).toBe('closest .card');
    expect(role(node, 'patient')?.value).toBe('.expanded');
  });
});

describe('a real duration still binds — the slot is skipped, not removed', () => {
  it.each(['bn', 'ja', 'ko'] as const)('%s keeps `for 2s`', language => {
    const rendered = translate('toggle .loading for 2s', 'en', language);
    const node = find(parse(rendered, language), 'toggle');
    expect(node, `${language}: did not re-parse: ${rendered}`).not.toBeNull();
    // The guard fires only on a COMMAND VERB the next literal is waiting for; a
    // time literal is neither, so the slot still captures it.
    expect(role(node, 'duration')?.value, `${language} lost the duration`).toBe('2s');
  });
});

describe('the postpositional destination group requires its own marker', () => {
  // The former KNOWN RESIDUAL pin, now fixed: tr's `[{destination} [e]]` group
  // could bind the destination role WITHOUT its marker (the sub-group carries
  // `renderRequired: true` but was optional for parsing), so on
  // `.loading i 2s değiştir` the leading `.loading` was taken as the
  // DESTINATION and the required `{patient}` then faced the particle `i` and
  // failed — the whole parse died. The matcher now fails a group that captured
  // a role but consumed no token matching its renderRequired marker sub-group,
  // rolling the value back to the slot that owns it.
  it('tr parses the bare `toggle .loading for 2s`', () => {
    const rendered = translate('toggle .loading for 2s', 'en', 'tr');
    expect(rendered).toBe('.loading i 2s değiştir');
    const node = find(parse(rendered, 'tr'), 'toggle');
    expect(node).not.toBeNull();
    expect(role(node, 'patient')?.value).toBe('.loading');
    expect(role(node, 'duration')?.value).toBe('2s');
  });

  it('tr parses the bare transition forms the same shape broke', () => {
    const node = find(parse('*background-color i "blue" e 500ms geçiş', 'tr'), 'transition');
    expect(node).not.toBeNull();
    expect(role(node, 'goal')?.value).toBe('blue');
    expect(role(node, 'duration')?.value).toBe('500ms');
  });

  it('an explicit marked destination still binds through the same group', () => {
    const node = find(parse('#panel e .loading i 2s değiştir', 'tr'), 'toggle');
    expect(node).not.toBeNull();
    expect(role(node, 'destination')?.value).toBe('#panel');
    expect(role(node, 'patient')?.value).toBe('.loading');
    expect(role(node, 'duration')?.value).toBe('2s');
  });
});

describe('render pattern selection ignores an implicit reference role', () => {
  // The en parse of `toggle .loading for 2s` carries a matcher-injected
  // `destination: me (implicit)`. Scoring that as a real role picked hi's
  // `{patient} को {destination} पर टॉगल` — no duration slot — and `for 2s`
  // dropped in silence (toggle-class-temporary hi/qu, wrapped and bare).
  // Implicit REFERENCE roles now score as absent; implicit literals (repeat's
  // loopType) still count, or every loop word would stop rendering.
  it.each(['hi', 'qu'] as const)('%s keeps `for 2s` through the round trip', language => {
    const rendered = translate('toggle .loading for 2s', 'en', language);
    const node = find(parse(rendered, language), 'toggle');
    expect(node, `${language}: did not re-parse: ${rendered}`).not.toBeNull();
    expect(role(node, 'duration')?.value, `${language} lost the duration`).toBe('2s');
  });

  it('repeat-forever still renders its loop word (implicit literal counts)', () => {
    const rendered = translate('repeat forever toggle .pulse wait 1s end', 'en', 'es');
    expect(rendered).toContain('forever');
  });
});

describe('a marker-less slot yields only when skipping consumes the whole clause', () => {
  // The per-slot guard above skips a marker-less optional slot when the
  // pattern's very next token is a literal the verb satisfies. Where an
  // OPTIONAL GROUP sits between the slot and that literal
  // (`[{method}] [using view {manner}] 交換`) the test looks at the group's
  // first token, sees no match, and lets the slot swallow the verb — so a bare
  // `swap #a with #b` did not parse AT ALL in bn/hi/ja/ko/qu/tr.
  //
  // Widening the per-slot test to look THROUGH skippable groups was measured to
  // work AND to break the ja goal-reclaim lock, because both shapes are
  // identical at the slot. What separates them is the OUTCOME: skipping lets
  // swap consume its clause entirely, while the ja no-goal transition variant
  // completes having eaten only `opacity を 遷移` and STRANDS `0 に 300ms`.
  // So the skip is speculative and adopted only when the clause is consumed.
  const SOV = ['ja', 'bn', 'hi', 'ko', 'qu', 'tr'] as const;

  it.each(SOV)('%s parses the bare `swap #a with #b`', language => {
    const rendered = translate('swap #a with #b', 'en', language);
    const node = find(parse(rendered, language), 'swap');
    expect(node, `${language}: bare swap did not parse: ${rendered}`).not.toBeNull();
    expect(role(node, 'destination')?.value, `${language} lost the destination`).toBe('#a');
    expect(role(node, 'patient')?.value, `${language} lost the patient`).toBe('#b');
  });

  it('tl (verb-FIRST) keeps the patient its own `sa` marker was eating', () => {
    // Not a verb at all: tl's `palitan_pwesto [{method}] sa {destination} …`
    // had the bare `[{method}]` spend the `sa` the pattern itself owes.
    const node = find(parse('palitan_pwesto sa #a nang #b', 'tl'), 'swap');
    expect(node).not.toBeNull();
    expect(role(node, 'destination')?.value).toBe('#a');
    expect(role(node, 'patient')?.value).toBe('#b');
  });

  it('the ja goal-reclaim lock still holds — a STRANDED tail is not adopted', () => {
    // The control. Skipping ja's `[{duration}]` slot lets the no-goal variant
    // complete on `opacity を 遷移` while leaving `0 に 300ms` unconsumed; the
    // clause-end gate refuses it, the pattern fails as before, and the
    // verb-anchoring fallback reclaims both roles.
    const node = parse(
      'クリック で 私 から もし effect である "fade" opacity を 遷移 0 に 300ms 終わり',
      'ja'
    );
    const transition = find(node, 'transition');
    expect(transition).not.toBeNull();
    expect(String(role(transition, 'goal')?.value)).toBe('0');
    expect(role(transition, 'duration')?.value).toBe('300ms');
  });
});
