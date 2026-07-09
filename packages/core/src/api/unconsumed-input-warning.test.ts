/**
 * unconsumed-input-warning.test.ts
 *
 * The semantic parser scores a pattern by how many of ITS OWN roles were filled,
 * never by how much of the input was consumed. A short pattern can therefore fill
 * every role, report high confidence, and silently discard a trailing clause —
 * the defect behind `fetch … with { … }`.
 *
 * This is a DIAGNOSTIC, not a scoring change: the dropped span is reported through
 * `meta.warnings` while confidence and the chosen parse stay exactly as they were.
 * Pricing input coverage into the score would move the multilingual fidelity
 * baseline across 24 languages and must be measured first.
 */
import { describe, it, expect } from 'vitest';

import { hyperscript } from './hyperscript-api.js';

describe('meta.warnings reports unconsumed input', () => {
  it('names the dropped span when a pattern ignores a trailing clause', async () => {
    // `via POST con { … }` has no Spanish fetch pattern, so `fetch-es` matches the
    // URL alone and drops the rest.
    const result = await hyperscript.compile("buscar '/x' via POST con { body: 'a' }", {
      language: 'es',
    });

    expect(result.meta.warnings).toBeDefined();
    expect(result.meta.warnings!.join('\n')).toContain("via POST con { body: 'a' }");
  });

  it('leaves confidence and the chosen parse untouched', async () => {
    const result = await hyperscript.compile("buscar '/x' via POST con { body: 'a' }", {
      language: 'es',
    });

    // The warning is inert: this still parses, still on the semantic direct path.
    expect(result.ok).toBe(true);
    expect(result.meta.parser).toBe('semantic');
    expect(result.meta.directPath).toBe(true);
  });

  it('stays silent when the pattern accounts for the whole input', async () => {
    const result = await hyperscript.compile("buscar '/x' como json", { language: 'es' });

    expect(result.meta.confidence).toBe(1);
    expect(result.meta.warnings).toBeUndefined();
  });
});
