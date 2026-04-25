/**
 * Unit tests for parse_multilingual_intent.
 *
 * Uses the real domain registry + dispatcher so we're testing the actual
 * composition path, not a mock. This keeps tests honest — a parser change
 * upstream that breaks our expectations will surface here.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { CrossDomainDispatcher } from '@lokascript/framework';
import { createDomainRegistry, DOMAIN_PRIORITY } from '../domain-registry.js';
import { parseIntent, type ParseIntentDeps } from './parse-intent.js';

let deps: ParseIntentDeps;

beforeAll(() => {
  const registry = createDomainRegistry();
  const dispatcher = new CrossDomainDispatcher(registry, {
    minConfidence: 0.5,
    priority: DOMAIN_PRIORITY,
  });
  deps = { dispatcher, registry };
});

describe('parseIntent — input validation', () => {
  it('rejects empty text', async () => {
    await expect(parseIntent(deps, { text: '' })).rejects.toThrow(/text.*required/i);
  });

  it('rejects whitespace-only text', async () => {
    await expect(parseIntent(deps, { text: '   \n  ' })).rejects.toThrow(/text.*required/i);
  });

  it('rejects missing text field', async () => {
    // @ts-expect-error — deliberately testing the runtime guard on missing field
    await expect(parseIntent(deps, {})).rejects.toThrow(/text.*required/i);
  });
});

describe('parseIntent — domain hint handling', () => {
  it('treats empty-string domain as "no hint" (auto-detect)', async () => {
    // Empty string is what the siren-mcp bridge sends when the caller omits
    // the optional domain field (bridge uses Zod defaults, not a required flag).
    const result = await parseIntent(deps, {
      text: 'select name from users',
      language: 'en',
      domain: '',
    });
    expect(result.domain).toBe('sql');
    expect(result.action).toBe('select');
  });

  it('treats whitespace-only domain as "no hint"', async () => {
    const result = await parseIntent(deps, {
      text: 'select name from users',
      language: 'en',
      domain: '   ',
    });
    expect(result.domain).toBe('sql');
  });

  it('uses explicit domain hint when provided', async () => {
    const result = await parseIntent(deps, {
      text: 'select name from users',
      language: 'en',
      domain: 'sql',
    });
    expect(result.domain).toBe('sql');
    expect(result.action).toBe('select');
  });

  it('throws on unknown domain hint with helpful message', async () => {
    await expect(
      parseIntent(deps, {
        text: 'select name from users',
        language: 'en',
        domain: 'nonexistent',
      })
    ).rejects.toThrow(/unknown domain "nonexistent"/);
  });
});

describe('parseIntent — auto-detect path', () => {
  it('auto-detects SQL for an English SELECT query', async () => {
    const result = await parseIntent(deps, {
      text: 'select name from users',
      language: 'en',
    });
    expect(result.domain).toBe('sql');
    expect(result.action).toBe('select');
    expect(result.confidence).toBeGreaterThan(0);
    expect(typeof result.explicit).toBe('string');
    expect(result.explicit.startsWith('[select')).toBe(true);
  });

  it('throws when no domain matches the input', async () => {
    // A string that looks nothing like any registered domain. Actual domains
    // are surprisingly permissive, so we use a short nonsense token.
    await expect(
      parseIntent(deps, {
        text: 'zxqw',
        language: 'en',
      })
    ).rejects.toThrow(/no domain matched/i);
  });

  it('returns plain-object roles (not a Map) so the result is JSON-serializable', async () => {
    const result = await parseIntent(deps, {
      text: 'select name from users',
      language: 'en',
    });
    expect(result.roles).toBeInstanceOf(Object);
    expect(result.roles).not.toBeInstanceOf(Map);
    // Round-trip through JSON to confirm serializability.
    const roundTripped = JSON.parse(JSON.stringify(result));
    expect(roundTripped.action).toBe(result.action);
    expect(roundTripped.domain).toBe(result.domain);
  });
});

describe('parseIntent — multilingual path', () => {
  it('parses Japanese SQL with domain hint (canonical fixture phrasing)', async () => {
    // The Japanese SQL parser accepts "users から name 選択" (no を particle).
    // This phrasing is the canonical fixture in domain-sql tests.
    const result = await parseIntent(deps, {
      text: 'users から name 選択',
      language: 'ja',
      domain: 'sql',
    });
    expect(result.domain).toBe('sql');
    expect(result.action).toBe('select');
    expect(result.language).toBe('ja');
  });

  it('defaults language to "en" when not provided', async () => {
    const result = await parseIntent(deps, {
      text: 'select name from users',
    });
    expect(result.language).toBe('en');
  });
});
