/**
 * An allow list holds at every depth.
 *
 * Found by review (2026-11-12): with `allow` = `toggle`, a handler whose body
 * command carried a literal that was an array was planned with no diagnostic
 * and rendered to `toggle .a then call alert(1)`. The same value at the root
 * was refused, and so was the same text as a string. Two gaps met: the
 * protocol validator read the root's roles only, and the allow check let any
 * literal that is not a string through.
 */
import { describe, it, expect } from 'vitest';
import { planIntent } from './plan.js';

const allow = { allow: new Set(['toggle']) };
const toggle = (value: unknown) => ({
  action: 'toggle',
  roles: { patient: { type: 'literal', value } },
});
const handler = (body: unknown[]) => ({
  kind: 'event-handler',
  action: 'on',
  roles: { event: { type: 'literal', value: 'click' } },
  body,
});

const hostile = ['.a then call alert(1)'];

describe('planIntent with an allow list: values that are not plain', () => {
  it.each([
    ['at the root', toggle(hostile)],
    ['in a handler body', handler([toggle(hostile)])],
    ['in a compound', { kind: 'compound', action: 'then', statements: [toggle(hostile)] }],
    ['in a branch', handler([{ action: 'if', roles: {}, thenBranch: [toggle(hostile)] }])],
    ['as an object', handler([toggle({ toString: 'x' })])],
  ])('refuses an array or object literal %s', (_where, json) => {
    const plan = planIntent(json, allow);
    expect(plan.ok).toBe(false);
  });

  it('still plans a number, a boolean and a one-word literal in a handler body', () => {
    for (const value of [3, true, 'active']) {
      const plan = planIntent(handler([toggle(value)]), allow);
      expect(plan.ok, JSON.stringify(plan)).toBe(true);
    }
  });

  it('refuses the same text as a bare string (the control that always held)', () => {
    expect(planIntent(handler([toggle(hostile[0])]), allow).ok).toBe(false);
  });
});
