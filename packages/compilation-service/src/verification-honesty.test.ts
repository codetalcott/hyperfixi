/**
 * The verification and IR surfaces must not claim more than the parse saw.
 *
 * Found by round-tripping the hyperscript in *Hypermedia Systems* (2026-09-23):
 * `translate_code` reported `verification.faithful: true` for three of the
 * book's four bodies while carrying, in the same payload, a diagnostic that the
 * REFERENCE parse had left tokens unconsumed — so a body that lost its only
 * command (`on load click() me` → `on load`) scored 1.0 on every axis. And every
 * colon-qualified event (`htmx:beforeRequest`, `draggable:start`) was reported
 * as `trigger.event: "click"`, because the event arrives as an expression, not
 * a literal, and the fallback took over.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { CompilationService } from './service.js';

let service: CompilationService;

beforeAll(async () => {
  service = await CompilationService.create();
});

describe('faithful requires both parses to be complete', () => {
  it('a reference that left tokens unconsumed is never faithful (book ch. 7)', () => {
    const r = service.translate({ code: 'on load click() me', from: 'en', to: 'ja' });
    expect(r.ok).toBe(true);
    expect(r.verification?.ok).toBe(true);
    expect(r.verification?.referenceComplete).toBe(false);
    expect(r.verification?.faithful).toBe(false);
  });

  it('scoreFidelity says which side was truncated (book ch. 9 counter)', () => {
    const r = service.scoreFidelity({
      reference: {
        code: 'on click increment the textContent of the previous <output/>',
        language: 'en',
      },
      candidate: { code: 'on click increment textContent', language: 'en' },
    });
    expect(r.ok).toBe(true);
    expect(r.referenceComplete).toBe(false);
    expect(r.candidateComplete).toBe(true);
    expect(r.faithful).toBe(false);
    expect(r.diagnostics.some(d => d.code === 'INCOMPLETE_PARSE')).toBe(true);
  });

  it('a truncated candidate is never faithful either', () => {
    const r = service.scoreFidelity({
      reference: { code: 'on load call me.click()', language: 'en' },
      candidate: { code: 'on load click() me', language: 'en' },
    });
    expect(r.ok).toBe(true);
    expect(r.candidateComplete).toBe(false);
    expect(r.faithful).toBe(false);
  });

  it('complete parses keep the old verdict', () => {
    const r = service.translate({ code: 'on load call me.click()', from: 'en', to: 'es' });
    expect(r.verification?.referenceComplete).toBe(true);
    expect(r.verification?.candidateComplete).toBe(true);
    expect(r.verification?.faithful).toBe(true);
  });
});

describe('an event source is part of the verdict', () => {
  it('dropping `from #firstName` is not faithful and is named', () => {
    const r = service.scoreFidelity({
      reference: {
        code: 'on input from #firstName set #greeting.innerText to "Hello"',
        language: 'en',
      },
      candidate: { code: 'on input set #greeting.innerText to "Hello"', language: 'en' },
    });
    expect(r.ok).toBe(true);
    expect(r.faithful).toBe(false);
    expect(r.missingRoles).toContain('on.from:selector');
    expect(r.missingValues).toContain('on.from=#firstName');
  });

  it('a translation that keeps the source is faithful (book ch. 8 abort button)', () => {
    const r = service.translate({
      code: 'on htmx:beforeRequest from #contacts-btn remove @disabled from me',
      from: 'en',
      to: 'ja',
    });
    expect(r.code).toContain('#contacts-btn');
    expect(r.verification?.faithful).toBe(true);
  });
});

describe('colon-qualified events keep their name in the IR', () => {
  for (const event of ['htmx:beforeRequest', 'draggable:start']) {
    it(`validate() reports trigger.event ${event}, not click`, () => {
      const r = service.validate({ code: `on ${event} remove @disabled from me`, language: 'en' });
      expect(r.ok).toBe(true);
      expect(r.semantic?.trigger?.event).toBe(event);
    });

    it(`diff() compares ${event}, not click`, () => {
      const a = { code: `on ${event} remove @disabled from me`, language: 'en' };
      const b = { code: 'on click remove @disabled from me', language: 'en' };
      const r = service.diff({ a, b });
      expect(r.ok).toBe(true);
      expect(r.identical).toBe(false);
      expect(r.trigger?.a?.event).toBe(event);
    });
  }
});
