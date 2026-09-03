/**
 * Host-parser validity gate (F8): channel folding and warn-once, plus the
 * REAL vendored engine as the oracle for the strings that motivated the
 * gate — the block-header `then` class the F5 arc measured shipping as
 * silent parse errors, and the optional-connector class a naive string
 * check would misjudge.
 */

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  acceptedByHost,
  warnRejectedOnce,
  resetHostValidationWarnings,
} from '../src/host-validate';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('acceptedByHost — channel folding (mock hosts)', () => {
  it('accepts when the host exposes no parse() (nothing to validate against)', () => {
    expect(acceptedByHost({}, 'anything at all')).toBe(true);
  });

  it('accepts when parse() reports no errors', () => {
    expect(acceptedByHost({ parse: () => ({ errors: [] }) }, 'toggle .active')).toBe(true);
  });

  it('accepts when parse() returns nothing at all', () => {
    expect(acceptedByHost({ parse: () => undefined }, 'toggle .active')).toBe(true);
  });

  it('rejects when parse() collects grammar errors', () => {
    const host = { parse: () => ({ errors: [{ message: "Expected 'end' but found 'then'" }] }) };
    expect(acceptedByHost(host, 'repeat 3 times then add .x')).toBe(false);
  });

  it("rejects when the tokenizer's throw channel fires", () => {
    const host = {
      parse: () => {
        throw new Error('Unknown token');
      },
    };
    expect(acceptedByHost(host, '¤¤¤')).toBe(false);
  });
});

describe('acceptedByHost — real vendored engine', () => {
  let hs: { parse(s: string): { errors?: unknown[] } };

  beforeAll(() => {
    const vendor = readFileSync(
      path.join(__dirname, 'browser', 'vendor', '_hyperscript-0.9.93.min.js'),
      'utf8'
    );
    // The vendored build is a browser IIFE that assigns window._hyperscript.
    new Function(vendor).call(globalThis);
    const found = (globalThis as { _hyperscript?: typeof hs })._hyperscript;
    if (!found?.parse) throw new Error('vendored _hyperscript did not expose parse()');
    hs = found;
  });

  it('rejects a chain word after a block header (the F5 class)', () => {
    expect(acceptedByHost(hs, 'on click repeat 3 times then add .x to me')).toBe(false);
  });

  it('accepts sibling commands without a connector (the connector is optional)', () => {
    expect(acceptedByHost(hs, 'on click wait 2s remove me')).toBe(true);
  });

  it('accepts plain canonical hyperscript', () => {
    expect(acceptedByHost(hs, 'on click toggle .active on me')).toBe(true);
  });

  it('rejects text that never was hyperscript', () => {
    // e.g. a translation failure that leaked localized text into the gate
    expect(acceptedByHost(hs, 'alternar .active entonces poner "ok" en #msg')).toBe(false);
  });
});

describe('warnRejectedOnce', () => {
  beforeEach(() => resetHostValidationWarnings());

  it('warns once per language, with source and rendered text', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    warnRejectedOnce('es', 'src-a', 'english-a');
    warnRejectedOnce('es', 'src-b', 'english-b');
    warnRejectedOnce('ja', 'src-c', 'english-c');
    expect(warnSpy).toHaveBeenCalledTimes(2);
    expect(warnSpy.mock.calls[0][0]).toContain('lang="es"');
    expect(warnSpy.mock.calls[0][0]).toContain('src-a');
    expect(warnSpy.mock.calls[0][0]).toContain('english-a');
    expect(warnSpy.mock.calls[1][0]).toContain('lang="ja"');
    warnSpy.mockRestore();
  });
});
