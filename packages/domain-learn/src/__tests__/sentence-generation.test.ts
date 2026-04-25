/**
 * Sentence Generation Tests — Verify morphology rendering across languages
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  createLearnDSL,
  generateForFunction,
  generateAllFunctions,
  generateCrossLingual,
  generateGloss,
  renderLearn,
  ALL_VERBS,
  ALL_FUNCTIONS,
} from '../index';
import type { MultilingualDSL } from '@lokascript/framework';

describe('Sentence Generation', () => {
  let learn: MultilingualDSL;

  beforeAll(() => {
    learn = createLearnDSL();
  });

  describe('English Sentences', () => {
    it('should render commanding form', () => {
      const node = learn.parse('[add patient:.active destination:#button]', 'explicit');
      const result = generateForFunction(node, 'commanding', 'en');
      expect(result).not.toBeNull();
      expect(result!.sentence).toContain('add');
      expect(result!.sentence).toContain('.active');
      expect(result!.sentence).toContain('#button');
      expect(result!.function).toBe('commanding');
    });

    it('should render describing form with thirdPerson', () => {
      const node = learn.parse('[add patient:.active destination:#button]', 'explicit');
      const result = generateForFunction(node, 'describing', 'en');
      expect(result).not.toBeNull();
      expect(result!.sentence).toContain('adds');
      expect(result!.sentence).toContain('the system');
    });

    it('should render narrating form with past tense', () => {
      const node = learn.parse('[add patient:.active destination:#button]', 'explicit');
      const result = generateForFunction(node, 'narrating', 'en');
      expect(result).not.toBeNull();
      expect(result!.sentence).toContain('added');
    });

    it('should render questioning form', () => {
      const node = learn.parse('[add patient:.active destination:#button]', 'explicit');
      const result = generateForFunction(node, 'questioning', 'en');
      expect(result).not.toBeNull();
      expect(result!.sentence).toContain('Did');
    });

    it('should render negating form', () => {
      const node = learn.parse('[add patient:.active destination:#button]', 'explicit');
      const result = generateForFunction(node, 'negating', 'en');
      expect(result).not.toBeNull();
      expect(result!.sentence).toContain('did not');
    });

    it('should render planning form', () => {
      const node = learn.parse('[add patient:.active destination:#button]', 'explicit');
      const result = generateForFunction(node, 'planning', 'en');
      expect(result).not.toBeNull();
      expect(result!.sentence).toContain('will');
    });

    it('should render progressing form', () => {
      const node = learn.parse('[add patient:.active destination:#button]', 'explicit');
      const result = generateForFunction(node, 'progressing', 'en');
      expect(result).not.toBeNull();
      expect(result!.sentence).toContain('adding');
    });

    it('should handle irregular verbs correctly', () => {
      const node = learn.parse('[go destination:#page]', 'explicit');
      const past = generateForFunction(node, 'narrating', 'en');
      expect(past).not.toBeNull();
      expect(past!.sentence).toContain('went');
    });

    it('should handle source-role verbs', () => {
      const node = learn.parse('[remove patient:.active source:#button]', 'explicit');
      const result = generateForFunction(node, 'commanding', 'en');
      expect(result).not.toBeNull();
      expect(result!.sentence).toContain('from');
    });
  });

  describe('Japanese Sentences (SOV)', () => {
    it('should render te-form command', () => {
      const node = learn.parse('[add patient:.active destination:#button]', 'explicit');
      const result = generateForFunction(node, 'commanding', 'ja');
      expect(result).not.toBeNull();
      expect(result!.sentence).toContain('追加して');
    });

    it('should render polite present (masu)', () => {
      const node = learn.parse('[add patient:.active destination:#button]', 'explicit');
      const result = generateForFunction(node, 'describing', 'ja');
      expect(result).not.toBeNull();
      expect(result!.sentence).toContain('追加します');
      expect(result!.sentence).toContain('システム');
    });

    it('should place verb last in SOV order', () => {
      const node = learn.parse('[add patient:.active destination:#button]', 'explicit');
      const result = generateForFunction(node, 'commanding', 'ja');
      expect(result).not.toBeNull();
      // Verb should be at the end
      const sentence = result!.sentence;
      expect(sentence.endsWith('追加して')).toBe(true);
    });
  });

  describe('Arabic Sentences (VSO)', () => {
    it('should render imperative', () => {
      const node = learn.parse('[add patient:.active destination:#button]', 'explicit');
      const result = generateForFunction(node, 'commanding', 'ar');
      expect(result).not.toBeNull();
      expect(result!.sentence).toContain('أضِف');
    });
  });

  describe('All Languages x All Functions', () => {
    const languages = ['en', 'ja', 'es', 'ar', 'zh', 'ko', 'fr', 'tr', 'de', 'pt'];

    it('should generate sentences for all 70 language x function combinations', () => {
      const node = learn.parse('[add patient:.active destination:#button]', 'explicit');
      let count = 0;
      for (const lang of languages) {
        for (const fn of ALL_FUNCTIONS) {
          const result = generateForFunction(node, fn, lang);
          expect(result).not.toBeNull();
          expect(result!.sentence.length).toBeGreaterThan(0);
          count++;
        }
      }
      expect(count).toBe(70);
    });
  });

  describe('generateAllFunctions', () => {
    it('should return 7 sentences for English', () => {
      const node = learn.parse('[add patient:.active destination:#button]', 'explicit');
      const results = generateAllFunctions(node, 'en');
      expect(results).toHaveLength(7);
    });
  });

  describe('generateCrossLingual', () => {
    it('should return sentences for all registered languages', () => {
      const node = learn.parse('[add patient:.active destination:#button]', 'explicit');
      const results = generateCrossLingual(node, 'commanding');
      expect(results.length).toBe(10);
    });
  });

  describe('renderLearn', () => {
    it('should render DSL text in English', () => {
      const node = learn.parse('[add patient:.active destination:#button]', 'explicit');
      const text = renderLearn(node, 'en');
      expect(text).toContain('add');
      expect(text).toContain('.active');
    });

    it('should render DSL text in Japanese', () => {
      const node = learn.parse('[add patient:.active destination:#button]', 'explicit');
      const text = renderLearn(node, 'ja');
      expect(text).toContain('追加して');
    });
  });

  describe('generateGloss', () => {
    it('should produce interlinear gloss for add', () => {
      const node = learn.parse('[add patient:.active destination:#button]', 'explicit');
      const gloss = generateGloss(node, 'commanding', 'ja');
      expect(gloss).not.toBeNull();
      expect(gloss!.tokens.length).toBeGreaterThan(0);
      expect(gloss!.roles.length).toBe(gloss!.tokens.length);
      expect(gloss!.english.length).toBe(gloss!.tokens.length);
      expect(gloss!.roles).toContain('VERB');
    });
  });
});
