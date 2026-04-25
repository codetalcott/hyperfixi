/**
 * Unit tests for detect_domain. Separate from parse_intent so failures
 * are attributable to classification vs. parsing.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { CrossDomainDispatcher } from '@lokascript/framework';
import { createDomainRegistry, DOMAIN_PRIORITY } from '../domain-registry.js';
import { detectDomain } from './detect-domain.js';

let dispatcher: CrossDomainDispatcher;

beforeAll(() => {
  const registry = createDomainRegistry();
  dispatcher = new CrossDomainDispatcher(registry, {
    minConfidence: 0.5,
    priority: DOMAIN_PRIORITY,
  });
});

describe('detectDomain', () => {
  it('rejects empty text', async () => {
    await expect(detectDomain(dispatcher, { text: '' })).rejects.toThrow(/text.*required/i);
  });

  it('classifies English SQL', async () => {
    const result = await detectDomain(dispatcher, {
      text: 'select name from users',
      language: 'en',
    });
    expect(result.matched).toBe(true);
    expect(result.domain).toBe('sql');
    expect(result.action).toBe('select');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('returns matched=false on unrecognized input instead of throwing', async () => {
    // detect_domain is pure classification — unlike parseIntent, it
    // surfaces "no match" as a result, not an error, so agents can
    // make decisions without catching exceptions.
    const result = await detectDomain(dispatcher, {
      text: 'zxqw',
      language: 'en',
    });
    expect(result.matched).toBe(false);
    expect(result.domain).toBeNull();
    expect(result.action).toBeNull();
    expect(result.confidence).toBe(0);
  });

  it('defaults language to "en" when omitted', async () => {
    const result = await detectDomain(dispatcher, { text: 'select name from users' });
    expect(result.language).toBe('en');
  });
});

// =============================================================================
// Dispatcher routing guard: `add` across domain-sql + domain-todo
// =============================================================================
//
// domain-sql aliases `add` → `insert` (requires `into <table>`). domain-todo
// uses `action: 'add'` (required `<item>` with greedy capture, optional
// `to <list>`). With both registered, routing depends on BOTH the `into`/`to`
// markers AND the DOMAIN_PRIORITY tiebreak — todo's greedy item role means
// input like `add Alice into users` parses successfully in todo too (as
// item="Alice into users"), and only priority keeps sql winning.
//
// These tests pin:
//   1. Constant-order invariant (cheap — blocks blind reorders of the array).
//   2. `add X into Y` → sql. Load-bearing on priority (both domains parse it).
//      Catches: priority reorder; sql's `add` alias or `into` marker breaking.
//   3. `add buy milk to groceries` → todo. Semantics-driven (sql has no `to`).
//      Catches: sql expanding to accept `to`; todo losing the `to` marker.
//   4. Bare `add X` → todo. Only todo parses it (sql requires `into`). If sql
//      ever relaxes its destination requirement this test flips, prompting a
//      new priority-tiebreak case.

describe('dispatcher routing: sql vs todo for `add`', () => {
  it('DOMAIN_PRIORITY places sql before todo (blocks blind reorders)', () => {
    expect(DOMAIN_PRIORITY.indexOf('sql')).toBeLessThan(DOMAIN_PRIORITY.indexOf('todo'));
  });

  it('"add Alice into users" routes to sql (both parse; priority breaks the tie)', async () => {
    const result = await detectDomain(dispatcher, {
      text: 'add Alice into users',
      language: 'en',
    });
    expect(result.matched).toBe(true);
    expect(result.domain).toBe('sql');
  });

  it('"add buy milk to groceries" routes to todo (semantics: sql has no `to` marker)', async () => {
    const result = await detectDomain(dispatcher, {
      text: 'add buy milk to groceries',
      language: 'en',
    });
    expect(result.matched).toBe(true);
    expect(result.domain).toBe('todo');
  });

  it('bare "add Alice" routes to todo (sql requires `into`; documents the current boundary)', async () => {
    const result = await detectDomain(dispatcher, { text: 'add Alice', language: 'en' });
    expect(result.matched).toBe(true);
    expect(result.domain).toBe('todo');
  });
});
