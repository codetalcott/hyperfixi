/**
 * Engine parser parity: the canonical-validity gates' strings on `@hyperfixi/engine`.
 *
 * Every English string those gates put to upstream `hyperscript.org`'s parser — each corpus
 * row, its English re-render, and the English render of every authored translation — is put
 * to the new engine's parser as well. The two must agree on whether it parses. The engine is
 * meant to replace core's, and the multilingual product reaches an engine as English text, so
 * a string upstream reads and the engine rejects (or the reverse) is a translation that works
 * on one host and not the other.
 *
 * Unlike the foreign canonical-validity gate, this needs no fresh `populate`: it compares two
 * parsers on the SAME strings, so a stale patterns.db changes which strings are asked, not
 * whether the parsers agree. It always runs.
 *
 * On a failure, run one string on both engines:
 * `npx tsx packages/engine/tools/probe.mts '<source>'`.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import {
  checkCorpusRenderValidity,
  loadCanonicalParser,
  type CanonicalValidate,
} from './canonical-validity';
import { checkForeignRenderValidity } from './foreign-canonical-validity';

describe('engine parser parity (R4 strings on @hyperfixi/engine)', () => {
  const asked = new Set<string>();
  const disagreements: string[] = [];

  beforeAll(async () => {
    const { api, everything, register } = await import('@hyperfixi/engine');
    register(...everything);
    const upstream = await loadCanonicalParser();
    const engine: CanonicalValidate = source => {
      try {
        return api.parse(source).errors.map(error => error.message);
      } catch (e) {
        return ['threw: ' + (e instanceof Error ? e.message.split('\n')[0] : String(e))];
      }
    };
    // Upstream's verdict is the one handed back, so the gates' own logic is unchanged.
    const both: CanonicalValidate = source => {
      const up = upstream(source);
      if (!asked.has(source)) {
        asked.add(source);
        const mine = engine(source);
        if ((up.length === 0) !== (mine.length === 0)) {
          disagreements.push(
            `${JSON.stringify(source)}\n      upstream: ${up[0]?.split('\n')[0] ?? 'accepts'}` +
              `\n      engine:   ${mine[0]?.split('\n')[0] ?? 'accepts'}`
          );
        }
      }
      return up;
    };
    await checkCorpusRenderValidity({ validate: both });
    await checkForeignRenderValidity({ validate: both });
  }, 300_000);

  it('asks about a real corpus (sanity: patterns.db has rows)', () => {
    expect(asked.size).toBeGreaterThan(100);
  });

  it('the two parsers agree on every string', () => {
    expect(disagreements).toEqual([]);
  });
});
