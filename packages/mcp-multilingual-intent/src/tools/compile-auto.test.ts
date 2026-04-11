/**
 * Unit tests for compile_auto. Focuses on the detect-plus-compile one-shot
 * path: success case, no-match case, and the requirement that errors
 * surface as a result object (not exceptions) so agents can retry.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { CrossDomainDispatcher } from '@lokascript/framework';
import { createDomainRegistry, DOMAIN_PRIORITY } from '../domain-registry.js';
import { compileAuto } from './compile-auto.js';

let dispatcher: CrossDomainDispatcher;

beforeAll(() => {
  const registry = createDomainRegistry();
  dispatcher = new CrossDomainDispatcher(registry, {
    minConfidence: 0.5,
    priority: DOMAIN_PRIORITY,
  });
});

describe('compileAuto', () => {
  it('rejects empty text', async () => {
    await expect(compileAuto(dispatcher, { text: '' })).rejects.toThrow(/text.*required/i);
  });

  it('compiles English SQL end-to-end', async () => {
    const result = await compileAuto(dispatcher, {
      text: 'select name from users',
      language: 'en',
    });
    expect(result.domain).toBe('sql');
    expect(result.ok).toBe(true);
    expect(typeof result.code).toBe('string');
    expect(result.code?.toLowerCase()).toContain('select');
  });

  it('returns ok=false on no-match (does not throw)', async () => {
    // Unlike parseIntent, compile_auto surfaces no-match as a structured
    // failure so agents can distinguish "unparseable" from "parse error".
    const result = await compileAuto(dispatcher, {
      text: 'zxqw',
      language: 'en',
    });
    expect(result.ok).toBe(false);
    expect(result.domain).toBeNull();
    expect(result.errors).toBeDefined();
    expect(result.errors?.length).toBeGreaterThan(0);
  });

  it('defaults language to "en" when omitted', async () => {
    const result = await compileAuto(dispatcher, { text: 'select name from users' });
    expect(result.language).toBe('en');
  });
});
