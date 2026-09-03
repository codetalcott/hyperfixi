/**
 * Tests for the lokascript/translateWithVerification request handler.
 *
 * Exercises the handler with the REAL semantic package (a devDep bundled into
 * the server), so a faithful translation here means the same thing it means
 * in CompilationService.translate() — plus the degraded paths the server's
 * optional-semantic shim design requires.
 */

import { describe, it, expect } from 'vitest';
import * as semantic from '@lokascript/semantic';
import { translateWithVerification } from './translate-with-verification.js';

describe('translateWithVerification', () => {
  it('renders and verifies a faithful en→ko translation', () => {
    const r = translateWithVerification(
      { code: 'toggle .active on #panel', to: 'ko' },
      semantic as never
    );
    expect(r.ok).toBe(true);
    expect(r.code).toBeTruthy();
    expect(r.verification?.ok).toBe(true);
    expect(r.verification?.faithful).toBe(true);
    // The invariant target survived the rendering verbatim.
    expect(r.code).toContain('#panel');
  });

  it('defaults the source language to en', () => {
    const r = translateWithVerification({ code: 'toggle .active', to: 'ja' }, semantic as never);
    expect(r.ok).toBe(true);
    expect(r.verification?.faithful).toBe(true);
  });

  it('degrades cleanly when the semantic package is shimmed away', () => {
    // hyperscript-mode bundles replace @lokascript/semantic with `export {}`.
    const r = translateWithVerification({ code: 'toggle .active', to: 'ko' }, {});
    expect(r.ok).toBe(false);
    expect(r.error).toContain('hyperscript mode');
  });

  it('rejects empty input and missing target without touching semantic', () => {
    expect(translateWithVerification({ code: '   ', to: 'ko' }, {}).ok).toBe(false);
    expect(translateWithVerification({ code: 'toggle .active', to: '' as string }, {}).ok).toBe(
      false
    );
  });

  it('verification is advisory — an unparseable rendering does not flip ok', () => {
    // A translate stub that returns garbage: translation "succeeds", the
    // verification must fail closed without failing the request.
    const stub = {
      translate: () => 'zzz unparseable output zzz',
      parseSemantic: semantic.parseSemantic,
    };
    const r = translateWithVerification({ code: 'toggle .active', to: 'ko' }, stub as never);
    expect(r.ok).toBe(true);
    expect(r.verification?.ok).toBe(false);
    expect(r.verification?.faithful).toBeUndefined();
  });
});
