/**
 * An override marker in a verb-final language goes AFTER its value.
 *
 * `buildRoleToken` takes the marker's side from `profile.roleMarkers[role]`.
 * Where the profile carries no RoleMarker for that role there is nothing to
 * take a side from, and the fallback was `'before'` — which is simply wrong in
 * an SOV language: ja rendered `opacity を に 0` and bn `opacity কে তে 0`, the
 * marker stranded AHEAD of the value it marks. Neither re-parsed.
 *
 * Two things make the change safe, and each is pinned below.
 *
 * PASSTHROUGH EXEMPTION. `set`'s `scope` declares the marker `on` in all 24
 * languages — the i18n transformer keeps `on <scope>` verbatim, so the same
 * English word captures it back everywhere. A passthrough marker keeps
 * English's prepositional side; flipping it would emit `.tab on` where the
 * whole corpus writes `on .tab`.
 *
 * POST-VERB DURATION. Making the standalone pattern match this shape at all is
 * what let it match qu's stored corpus surface, which puts the duration AFTER
 * the verb — and there nothing reached it, so it was silently dropped on five
 * qu rows. That was the blocker filed against this fix. The trailing-duration
 * reclaim in `parseClause` is the other half, and without it the R1 role-set
 * flip and the R3 value ratchet both fire.
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
    | { type?: string; value?: unknown; raw?: string }
    | undefined;
}
const surface = (n: CommandSemanticNode | null, r: string): unknown =>
  role(n, r)?.raw ?? role(n, r)?.value;

describe('a verb-final language puts the override marker after its value', () => {
  it.each([
    ['ja', 'opacity を 0 に 300ms 遷移'],
    ['bn', 'opacity কে 0 তে 300ms সংক্রমণ'],
    ['ko', 'opacity 을 0 에 300ms 트랜지션'],
    ['qu', 'opacity ta 0 man 300ms pasay'],
  ] as const)('%s renders `%s`', (language, expected) => {
    // Pre-fix: `opacity を に 0 300ms 遷移` — `を に` adjacent, the goal marker
    // ahead of the goal it marks.
    expect(translate('transition opacity to 0 over 300ms', 'en', language)).toBe(expected);
  });

  it.each(['ja', 'bn', 'ko', 'qu'] as const)('%s re-parses every role', language => {
    const rendered = translate('transition opacity to 0 over 300ms', 'en', language);
    const t = find(parse(rendered, language), 'transition');
    expect(t, `${language}: did not re-parse: ${rendered}`).not.toBeNull();
    expect(surface(t, 'patient'), `${language}: ${rendered}`).toBe('opacity');
    expect(role(t, 'goal')?.value, `${language}: ${rendered}`).toBe(0);
    expect(role(t, 'duration')?.value, `${language}: ${rendered}`).toBe('300ms');
  });
});

describe('a PASSTHROUGH override keeps English’s side', () => {
  // `on` is the scope marker in all 24 languages, kept verbatim by the i18n
  // transformer, so the corpus writes `on .tab` — flipping it to `.tab on`
  // would put the generated pattern out of step with every stored row.
  it.each(['ja', 'ko', 'qu', 'bn'] as const)('%s renders `on` before the scope', language => {
    const rendered = translate('set @aria-selected to "false" on .tab', 'en', language);
    expect(rendered, `${language}`).toContain('on .tab');
    const s = find(parse(rendered, language), 'set');
    expect(role(s, 'scope')?.value, `${language} lost the scope: ${rendered}`).toBe('.tab');
  });
});

describe('a duration sitting AFTER the verb is reclaimed', () => {
  // The qu corpus surface, verbatim: the i18n transformer emits the duration
  // past the verb `pasay`, where no pattern reaches it.
  it('qu recovers a post-verb duration', () => {
    const stored = '*background-color ta "blue" man ñitiy pi pasay 500ms';
    const t = find(parse(stored, 'qu'), 'transition');
    expect(t, `qu: did not parse: ${stored}`).not.toBeNull();
    expect(surface(t, 'patient')).toBe('*background-color');
    expect(role(t, 'goal')?.value).toBe('blue');
    expect(role(t, 'duration')?.value, 'qu dropped the post-verb duration').toBe('500ms');
  });

  it('does not invent a duration from a trailing non-time token', () => {
    // The reclaim is gated on a literal time shape, so a bare number, a
    // selector or a block terminator never becomes a duration.
    const t = find(parse('*background-color ta "blue" man ñitiy pi pasay', 'qu'), 'transition');
    expect(t).not.toBeNull();
    expect(role(t, 'duration')).toBeUndefined();
  });
});

describe('SVO languages are untouched', () => {
  // Verified byte-identical against the pre-change tree; the new default is
  // gated on `wordOrder === 'SOV'`, so these cannot move by construction.
  it.each([
    ['es', 'transición opacity a 0 300ms'],
    ['de', 'übergang opacity zu 0 300ms'],
    ['fr', 'transition opacity à 0 300ms'],
    ['ar', 'انتقال opacity إلى 0 300ms'],
  ] as const)('%s still renders `%s`', (language, expected) => {
    expect(translate('transition opacity to 0 over 300ms', 'en', language)).toBe(expected);
  });
});
