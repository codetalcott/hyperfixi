/**
 * LLM Domain Introspection Tests
 *
 * Verifies describeCommands() / describeCommand() return well-formed,
 * JSON-serializable descriptions and — critically — that every generated
 * example actually parses in its own language (the round-trip test).
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { describeCommands, describeCommand, LLM_LANGUAGE_CODES, createLLMDSL } from '../index.js';
import type { MultilingualDSL } from '@lokascript/framework';

const ACTIONS = ['ask', 'summarize', 'analyze', 'translate'] as const;

describe('LLM Domain Introspection', () => {
  let llm: MultilingualDSL;

  beforeAll(() => {
    llm = createLLMDSL();
  });

  describe('describeCommands()', () => {
    it('describes all 4 commands', () => {
      const commands = describeCommands();
      expect(commands).toHaveLength(4);
      expect(commands.map(c => c.action).sort()).toEqual([...ACTIONS].sort());
    });

    it('exposes category, primaryRole, and description for each command', () => {
      for (const cmd of describeCommands()) {
        expect(cmd.category).toBe('llm');
        expect(cmd.primaryRole).toBe('patient');
        expect(cmd.description.length).toBeGreaterThan(0);
      }
    });

    it('provides a non-empty example for every command in every language', () => {
      for (const cmd of describeCommands()) {
        expect(Object.keys(cmd.examples).sort()).toEqual([...LLM_LANGUAGE_CODES].sort());
        for (const code of LLM_LANGUAGE_CODES) {
          expect(cmd.examples[code], `${cmd.action}/${code}`).toBeTruthy();
          expect(cmd.examples[code].trim().length).toBeGreaterThan(0);
        }
      }
    });

    it('describes roles with required flag, types, and markers', () => {
      const ask = describeCommand('ask');
      expect(ask).toBeDefined();
      const source = ask!.roles.find(r => r.role === 'source');
      expect(source).toBeDefined();
      expect(source!.required).toBe(false);
      expect(source!.expectedTypes).toContain('expression');
      // markers come straight from the schema's markerOverride
      expect(source!.markers).toMatchObject({
        en: 'from',
        es: 'de',
        ja: 'から',
        ar: 'من',
        ko: '에서',
        zh: '从',
        tr: 'dan',
        fr: 'de',
      });
    });

    it('marks the required patient role on every command', () => {
      for (const cmd of describeCommands()) {
        const patient = cmd.roles.find(r => r.role === 'patient');
        expect(patient, cmd.action).toBeDefined();
        expect(patient!.required, cmd.action).toBe(true);
      }
    });

    it('produces JSON-serializable output', () => {
      expect(() => JSON.stringify(describeCommands())).not.toThrow();
      const roundTripped = JSON.parse(JSON.stringify(describeCommands()));
      expect(roundTripped).toEqual(describeCommands());
    });
  });

  describe('describeCommand()', () => {
    it('returns a single command by action', () => {
      const summarize = describeCommand('summarize');
      expect(summarize?.action).toBe('summarize');
    });

    it('returns undefined for an unknown action', () => {
      expect(describeCommand('frobnicate')).toBeUndefined();
    });
  });

  describe('round-trip: every generated example parses in its language', () => {
    for (const cmd of describeCommands()) {
      for (const code of LLM_LANGUAGE_CODES) {
        it(`${cmd.action} / ${code}: "${cmd.examples[code]}" compiles`, () => {
          const result = llm.compile(cmd.examples[code], code);
          expect(result.ok, JSON.stringify(result.errors)).toBe(true);
          expect(result.code).toBeTruthy();
        });
      }
    }
  });

  describe('round-trip: examples compile to the correct action', () => {
    for (const cmd of describeCommands()) {
      it(`${cmd.action}: English example yields action "${cmd.action}"`, () => {
        const node = llm.parse(cmd.examples.en, 'en');
        expect(node.action).toBe(cmd.action);
      });
    }
  });
});
