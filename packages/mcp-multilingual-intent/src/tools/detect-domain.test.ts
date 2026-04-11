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
