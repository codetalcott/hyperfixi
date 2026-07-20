import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  register,
  vocabFor,
  isLangRegistered,
  hasAnyVocab,
  onVocabUpdate,
  resetRegistry,
  warnMissingLangOnce,
} from '../src/registry.js';

beforeEach(() => {
  resetRegistry();
});

describe('register', () => {
  it('stores vocab under the normalized language code', () => {
    register('es-MX', { hyperfixi: { attrs: { 'hx-obtener': 'hx-get' } } });
    expect(isLangRegistered('es')).toBe(true);
    expect(vocabFor('es')?.attrs?.['hx-obtener']).toBe('hx-get');
  });

  it('replaces vocab wholesale on re-register', () => {
    register('es', { hyperfixi: { attrs: { 'hx-obtener': 'hx-get' } } });
    register('es', { hyperfixi: { events: { clic: 'click' } } });
    expect(vocabFor('es')?.attrs).toBeUndefined();
    expect(vocabFor('es')?.events?.clic).toBe('click');
  });

  it('tolerates an empty payload', () => {
    register('fr', {});
    expect(isLangRegistered('fr')).toBe(true);
    expect(hasAnyVocab()).toBe(true);
  });

  it('notifies subscribers, and unsubscribe works', () => {
    const seen = vi.fn();
    const off = onVocabUpdate(seen);
    register('es', { hyperfixi: {} });
    expect(seen).toHaveBeenCalledTimes(1);
    off();
    register('ja', { hyperfixi: {} });
    expect(seen).toHaveBeenCalledTimes(1);
  });
});

describe('warnMissingLangOnce', () => {
  it('warns exactly once per language', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    warnMissingLangOnce('de');
    warnMissingLangOnce('de');
    warnMissingLangOnce('fr');
    expect(warn).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });

  it('warns again after the language later registers and registry resets', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    warnMissingLangOnce('de');
    register('de', { hyperfixi: {} }); // clears the warned flag
    resetRegistry();
    warnMissingLangOnce('de');
    expect(warn).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });
});
