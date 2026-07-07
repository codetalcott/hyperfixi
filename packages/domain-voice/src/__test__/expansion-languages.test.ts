/**
 * Bridge-era languages (arc Phase 2 expansion): German, Portuguese, Russian.
 *
 * Each language was added with ONE vocab file (14 voice verbs + marker/
 * direction/target words) — grammar comes from @lokascript/semantic's profiles
 * through the framework bridge. Mirrors the per-language blocks in
 * voice-domain.test.ts, plus parse → SemanticNode → renderVoice round-trips.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import type { MultilingualDSL } from '@lokascript/framework';
import { extractRoleValue } from '@lokascript/framework';
import { createVoiceDSL, renderVoice } from '../index';

let voice: MultilingualDSL;

beforeAll(() => {
  voice = createVoiceDSL();
});

describe('Voice Domain — bridge-era languages', () => {
  it('supports 11 languages', () => {
    const languages = voice.getSupportedLanguages();
    expect(languages).toHaveLength(11);
    for (const code of ['de', 'pt', 'ru']) {
      expect(languages).toContain(code);
    }
  });

  describe('German (SVO)', () => {
    it('parses navigate to destination', () => {
      const node = voice.parse('navigieren zu home', 'de');
      expect(node.action).toBe('navigate');
      expect(extractRoleValue(node, 'destination')).toBe('home');
    });

    it('parses click on patient', () => {
      const node = voice.parse('klicken submit', 'de');
      expect(node.action).toBe('click');
      expect(extractRoleValue(node, 'patient')).toBe('submit');
    });

    it('parses type into destination', () => {
      const node = voice.parse('eingeben hello in search', 'de');
      expect(node.action).toBe('type');
      expect(extractRoleValue(node, 'patient')).toBe('hello');
      expect(extractRoleValue(node, 'destination')).toBe('search');
    });

    it('parses scroll with direction', () => {
      const node = voice.parse('scrollen hoch', 'de');
      expect(node.action).toBe('scroll');
      expect(extractRoleValue(node, 'manner')).toBe('hoch');
    });
  });

  describe('Portuguese (SVO)', () => {
    it('parses navigate to destination', () => {
      const node = voice.parse('navegar para home', 'pt');
      expect(node.action).toBe('navigate');
      expect(extractRoleValue(node, 'destination')).toBe('home');
    });

    it('parses click on patient', () => {
      const node = voice.parse('clicar submit', 'pt');
      expect(node.action).toBe('click');
      expect(extractRoleValue(node, 'patient')).toBe('submit');
    });

    it('parses type into destination', () => {
      const node = voice.parse('digitar hello em search', 'pt');
      expect(node.action).toBe('type');
      expect(extractRoleValue(node, 'patient')).toBe('hello');
      expect(extractRoleValue(node, 'destination')).toBe('search');
    });
  });

  describe('Russian (SVO)', () => {
    it('parses navigate to destination', () => {
      const node = voice.parse('перейти на home', 'ru');
      expect(node.action).toBe('navigate');
      expect(extractRoleValue(node, 'destination')).toBe('home');
    });

    it('parses click on patient', () => {
      const node = voice.parse('нажать submit', 'ru');
      expect(node.action).toBe('click');
      expect(extractRoleValue(node, 'patient')).toBe('submit');
    });

    it('parses type into destination', () => {
      const node = voice.parse('ввести hello в search', 'ru');
      expect(node.action).toBe('type');
      expect(extractRoleValue(node, 'patient')).toBe('hello');
      expect(extractRoleValue(node, 'destination')).toBe('search');
    });
  });

  // ===========================================================================
  // Round-trips: parse native → SemanticNode → renderVoice → re-parse
  // ===========================================================================

  describe('Round-trips (parse → render → re-parse)', () => {
    const cases: Array<[string, string]> = [
      ['de', 'navigieren zu home'],
      ['de', 'klicken submit'],
      ['de', 'eingeben hello in search'],
      ['de', 'scrollen hoch'],
      ['de', 'suchen hello in seite'],
      ['pt', 'navegar para home'],
      ['pt', 'clicar submit'],
      ['pt', 'digitar hello em search'],
      ['pt', 'rolar cima'],
      ['ru', 'перейти на home'],
      ['ru', 'нажать submit'],
      ['ru', 'ввести hello в search'],
      ['ru', 'прокрутить вверх'],
    ];

    it.each(cases)('[%s] "%s" survives a render round-trip', (lang, source) => {
      const node = voice.parse(source, lang);
      const rendered = renderVoice(node, lang);

      const original = voice.compile(source, lang);
      const roundTripped = voice.compile(rendered, lang);
      expect(original.ok).toBe(true);
      expect(roundTripped.ok).toBe(true);
      expect(roundTripped.code).toBe(original.code);
    });
  });
});
