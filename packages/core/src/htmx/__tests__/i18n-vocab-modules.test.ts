/**
 * Smoke-test the generated vocab modules. Phase 8c of
 * htmx-v4-reactive-streaming.md.
 *
 * The generator at `packages/core/scripts/gen-htmx-vocab.mjs` emits one
 * self-registering ES script per priority language. These tests confirm
 * the artifacts are valid JS, call `window.__hyperfixi_i18n.register`
 * with the expected language code, and contain at least the localized
 * forms for the keywords filled in 8c-prep.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resetOrchestrator, isLangRegistered } from '../i18n-orchestrator.js';
import { resetHooks } from '../i18n-hooks.js';

const REPO_ROOT = resolve(fileURLToPath(import.meta.url), '../../../../../..');
const VOCAB_DIR = resolve(REPO_ROOT, 'packages/core/vocab/htmx');

const PRIORITY_LANGS = ['en', 'es', 'fr', 'ja', 'zh', 'ar', 'ko', 'de', 'pt'];

async function loadVocabModule(lang: string): Promise<void> {
  const path = resolve(VOCAB_DIR, `${lang}.js`);
  const source = await readFile(path, 'utf-8');
  // Each module is an IIFE — evaluating it triggers the register call.
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  new Function(source)();
}

describe('generated htmx vocab modules', () => {
  beforeEach(() => {
    resetOrchestrator();
    resetHooks();
  });

  afterEach(() => {
    resetOrchestrator();
    resetHooks();
  });

  for (const lang of PRIORITY_LANGS) {
    it(`${lang}.js loads and registers via window.__hyperfixi_i18n`, async () => {
      await loadVocabModule(lang);
      expect(isLangRegistered(lang)).toBe(true);
    });
  }

  describe('Spanish localized attrs', () => {
    beforeEach(async () => {
      await loadVocabModule('es');
    });

    it('maps the Phase-8c-prep keywords to canonical English', async () => {
      const path = resolve(VOCAB_DIR, 'es.js');
      const source = await readFile(path, 'utf-8');
      // Spot-check the four 8c-prep-added keywords (connect, live, etc.)
      // and the always-present target/swap/send.
      expect(source).toContain('"hx-objetivo": "hx-target"');
      expect(source).toContain('"hx-en-vivo": "hx-live"');
      expect(source).toContain('"sse-conectar": "sse-connect"');
      expect(source).toContain('"ws-conectar": "ws-connect"');
      expect(source).toContain('"ws-enviar": "ws-send"');
    });

    it('includes the events block from the i18n dictionary', async () => {
      const path = resolve(VOCAB_DIR, 'es.js');
      const source = await readFile(path, 'utf-8');
      expect(source).toContain('"clic": "click"');
      expect(source).toContain('"cambiar": "change"');
    });
  });

  describe('Japanese vocab', () => {
    it('maps localized SSE/WS attrs', async () => {
      const path = resolve(VOCAB_DIR, 'ja.js');
      const source = await readFile(path, 'utf-8');
      expect(source).toContain('"sse-接続": "sse-connect"');
      expect(source).toContain('"hx-ライブ": "hx-live"');
    });
  });

  describe('German vocab', () => {
    it('emits a localized hx-live (not the English loanword)', async () => {
      const path = resolve(VOCAB_DIR, 'de.js');
      const source = await readFile(path, 'utf-8');
      expect(source).toContain('"hx-direkt": "hx-live"');
      expect(source).toContain('"sse-verbinden": "sse-connect"');
      expect(source).toContain('"ws-senden": "ws-send"');
    });
  });

  describe('Portuguese vocab', () => {
    it('maps the Phase 8 keywords (added after initial 8-lang rollout)', async () => {
      const path = resolve(VOCAB_DIR, 'pt.js');
      const source = await readFile(path, 'utf-8');
      expect(source).toContain('"hx-ao-vivo": "hx-live"');
      expect(source).toContain('"sse-conectar": "sse-connect"');
      expect(source).toContain('"ws-conectar": "ws-connect"');
      expect(source).toContain('"ws-enviar": "ws-send"');
    });
  });

  describe('English emits an empty (but valid) registration', () => {
    it('en.js calls register but has no attrs/events to localize', async () => {
      const path = resolve(VOCAB_DIR, 'en.js');
      const source = await readFile(path, 'utf-8');
      expect(source).toContain("register('en'");
      expect(source).toContain('attrs: {}');
      expect(source).toContain('events: {}');
    });
  });

  describe('orchestrator-aware load-order guard', () => {
    it('logs a warning if the orchestrator is missing', async () => {
      const path = resolve(VOCAB_DIR, 'es.js');
      const source = await readFile(path, 'utf-8');
      const w = window as unknown as { __hyperfixi_i18n?: unknown };
      const original = w.__hyperfixi_i18n;
      delete w.__hyperfixi_i18n;
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      try {
        // eslint-disable-next-line @typescript-eslint/no-implied-eval
        new Function(source)();
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('loaded before the htmx-compat orchestrator')
        );
      } finally {
        consoleSpy.mockRestore();
        w.__hyperfixi_i18n = original;
      }
    });
  });
});

// Inline import for vi.spyOn usage above; keeps the test file self-contained.
import { vi } from 'vitest';
