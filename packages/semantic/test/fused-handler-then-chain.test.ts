/**
 * A multi-command handler body is a THEN-CHAIN in every language.
 *
 * English has always produced `body: [compound{…, chainType: 'then'}]` for a
 * handler with more than one command — `parseBodyWithClauses` wraps >1 clause,
 * and the renderer re-emits `then` from that wrapper. The FUSED path in
 * `buildEventHandler` (taken when a `<command>-event-*` pattern wins, which it
 * does in 15 of the 23 languages) built its body by hand and left it FLAT, so
 * the same handler came back as `body: [fetch, put]` — no compound, no
 * chainType — and rendering it back to English silently dropped every `then`:
 *
 *   en   on click fetch "/api/data" then put it into #result
 *   he   ב click הבא "/api/data" אז שים את זה ב #result
 *   he → on click fetch "/api/data" put it into #result        ← `then` gone
 *
 * No recall metric can see this: `then` is neither an action nor a role, and
 * both sides carry the same two commands. Only the English round trip does,
 * which is why it surfaced through the corpus writer's round-trip veto (#973)
 * rather than through any of the eleven ratchet signals.
 *
 * Measured when this landed: fifteen languages lost the chain (bn, es, he, hi,
 * id, it, ms, pl, pt, ru, sw, th, tl, uk, vi); the eight whose pure trigger
 * pattern wins (ar, de, fr, ja, ko, qu, tr, zh) already kept it.
 */
import { describe, it, expect } from 'vitest';
import { parseSemantic, render } from '../src/index';
import type { SemanticNode } from '../src/types';

const LANGUAGES = [
  'ar', 'bn', 'de', 'es', 'fr', 'he', 'hi', 'id', 'it', 'ja', 'ko', 'ms',
  'pl', 'pt', 'qu', 'ru', 'sw', 'th', 'tl', 'tr', 'uk', 'vi', 'zh',
] as const;

const SOURCE = 'on click fetch /api/data then put it into #result';

function bodyOf(node: SemanticNode | null | undefined): Array<Record<string, unknown>> {
  return ((node as unknown as { body?: Array<Record<string, unknown>> })?.body ?? []);
}

describe('a fused handler body keeps its then-chain', () => {
  const reference = parseSemantic(SOURCE, 'en')?.node;
  const referenceEn = render(reference!, 'en');

  it('the English reference is a single then-compound', () => {
    const body = bodyOf(reference);
    expect(body).toHaveLength(1);
    expect(body[0].kind).toBe('compound');
    expect(body[0].chainType).toBe('then');
    expect(referenceEn).toContain(' then ');
  });

  it.each(LANGUAGES)('%s round-trips the `then`', language => {
    const foreign = render(reference!, language);
    const back = parseSemantic(foreign, language)?.node;
    expect(back, `${language} could not re-parse "${foreign}"`).toBeTruthy();
    expect(render(back!, 'en'), `${language} rendered "${foreign}"`).toBe(referenceEn);
  });

  it.each(LANGUAGES)('%s folds the body into one compound, like English', language => {
    const back = parseSemantic(render(reference!, language), language)?.node;
    const body = bodyOf(back);
    expect(body, `${language} left its body flat`).toHaveLength(1);
    expect(body[0].kind).toBe('compound');
    expect((body[0].statements as unknown[]) ?? []).toHaveLength(2);
  });

  it('a SINGLE-command body is not wrapped', () => {
    // The fold is for chains only — one command stays one command, in every
    // language, so nothing downstream sees a spurious wrapper.
    const one = parseSemantic('on click toggle .active', 'en')?.node;
    for (const language of LANGUAGES) {
      const back = parseSemantic(render(one!, language), language)?.node;
      const body = bodyOf(back);
      expect(body.length, `${language} wrapped a single command`).toBeLessThanOrEqual(1);
      if (body.length === 1) expect(body[0].kind).not.toBe('compound');
    }
  });
});
