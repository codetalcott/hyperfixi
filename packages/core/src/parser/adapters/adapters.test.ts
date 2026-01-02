/**
 * Parser Adapters Test Suite
 *
 * Tests for the modular parser adapter system.
 */

import { describe, it, expect } from 'vitest';
import {
  createStandardParser,
  createFullParser,
  createParser,
  getParserTierInfo,
  STANDARD_COMMANDS,
  STANDARD_CAPABILITIES,
  FULL_CAPABILITIES,
} from './index';

describe('Parser Adapters', () => {
  describe('StandardParser', () => {
    it('should create a standard parser instance', () => {
      const parser = createStandardParser();
      expect(parser.tier).toBe('standard');
      expect(parser.name).toContain('Standard');
    });

    it('should have standard capabilities', () => {
      const parser = createStandardParser();
      expect(parser.capabilities.fullExpressions).toBe(true);
      expect(parser.capabilities.blockCommands).toBe(true);
      expect(parser.capabilities.eventModifiers).toBe(true);
      expect(parser.capabilities.behaviors).toBe(false);
      expect(parser.capabilities.functions).toBe(false);
    });

    it('should support standard commands', () => {
      const parser = createStandardParser();
      expect(parser.supportsCommand('toggle')).toBe(true);
      expect(parser.supportsCommand('add')).toBe(true);
      expect(parser.supportsCommand('set')).toBe(true);
      expect(parser.supportsCommand('transition')).toBe(true);
    });

    it('should parse simple event handler', () => {
      const parser = createStandardParser();
      const result = parser.parse('on click toggle .active');
      expect(result.success).toBe(true);
      expect(result.node).toBeDefined();
    });

    it('should parse expression with operators', () => {
      const parser = createStandardParser();
      const result = parser.parse('on click set x to 1 + 2 * 3');
      expect(result.success).toBe(true);
    });

    it('should parse if/else blocks', () => {
      const parser = createStandardParser();
      const result = parser.parse('on click if my.checked show #panel else hide #panel');
      expect(result.success).toBe(true);
    });

    it('should parse repeat blocks', () => {
      const parser = createStandardParser();
      const result = parser.parse('on click repeat 3 times log "hello" end');
      expect(result.success).toBe(true);
    });

    it('should parse fetch blocks', () => {
      const parser = createStandardParser();
      const result = parser.parse('on click fetch /api/data as json then log result');
      expect(result.success).toBe(true);
    });

    it('should parse transition command', () => {
      const parser = createStandardParser();
      const result = parser.parse('on click transition opacity to 0 over 500ms');
      expect(result.success).toBe(true);
    });

    it('should handle empty input', () => {
      const parser = createStandardParser();
      const result = parser.parse('');
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('empty');
    });

    it('should return list of supported commands', () => {
      const parser = createStandardParser();
      const commands = parser.getSupportedCommands();
      expect(commands).toContain('toggle');
      expect(commands).toContain('add');
      expect(commands).toContain('set');
      expect(commands.length).toBeGreaterThanOrEqual(20);
    });
  });

  describe('FullParser', () => {
    it('should create a full parser instance', () => {
      const parser = createFullParser();
      expect(parser.tier).toBe('full');
      expect(parser.name).toContain('Full');
    });

    it('should have full capabilities', () => {
      const parser = createFullParser();
      expect(parser.capabilities.fullExpressions).toBe(true);
      expect(parser.capabilities.blockCommands).toBe(true);
      expect(parser.capabilities.eventModifiers).toBe(true);
      expect(parser.capabilities.behaviors).toBe(true);
      expect(parser.capabilities.functions).toBe(true);
      expect(parser.capabilities.semanticParsing).toBe(true);
    });

    it('should support all full commands', () => {
      const parser = createFullParser();
      expect(parser.supportsCommand('toggle')).toBe(true);
      expect(parser.supportsCommand('behavior')).toBe(false); // behavior is not a command, it's a definition
      expect(parser.supportsCommand('fetch')).toBe(true);
      expect(parser.supportsCommand('morph')).toBe(true);
    });

    it('should parse simple event handler', () => {
      const parser = createFullParser();
      const result = parser.parse('on click toggle .active');
      expect(result.success).toBe(true);
      expect(result.node).toBeDefined();
    });

    it('should return many supported commands', () => {
      const parser = createFullParser();
      const commands = parser.getSupportedCommands();
      expect(commands.length).toBeGreaterThanOrEqual(40);
    });
  });

  describe('Parser Factory', () => {
    it('should create standard parser via factory', () => {
      const parser = createParser('standard');
      expect(parser.tier).toBe('standard');
    });

    it('should create full parser via factory', () => {
      const parser = createParser('full');
      expect(parser.tier).toBe('full');
    });

    it('should throw on unknown tier', () => {
      // @ts-expect-error Testing invalid tier
      expect(() => createParser('unknown')).toThrow('Unknown parser tier');
    });
  });

  describe('Parser Tier Info', () => {
    it('should return info for all tiers', () => {
      const info = getParserTierInfo();
      expect(info.standard).toBeDefined();
      expect(info.full).toBeDefined();
    });

    it('should include command counts', () => {
      const info = getParserTierInfo();
      expect(info.standard.commands).toBeGreaterThanOrEqual(20);
      expect(info.full.commands).toBeGreaterThanOrEqual(40);
    });

    it('should include features list', () => {
      const info = getParserTierInfo();
      expect(info.standard.features.length).toBeGreaterThan(0);
      expect(info.full.features.length).toBeGreaterThan(0);
    });
  });

  describe('Capability Presets', () => {
    it('should define standard capabilities', () => {
      expect(STANDARD_CAPABILITIES.fullExpressions).toBe(true);
      expect(STANDARD_CAPABILITIES.behaviors).toBe(false);
    });

    it('should define full capabilities', () => {
      expect(FULL_CAPABILITIES.fullExpressions).toBe(true);
      expect(FULL_CAPABILITIES.behaviors).toBe(true);
    });

    it('should define standard commands list', () => {
      expect(STANDARD_COMMANDS).toContain('toggle');
      expect(STANDARD_COMMANDS).toContain('add');
      expect(STANDARD_COMMANDS.length).toBeGreaterThanOrEqual(20);
    });
  });

  describe('Cross-Parser Compatibility', () => {
    const testCases = [
      'on click toggle .active',
      'on click add .highlight to #target',
      'on click set x to 5',
      'on click wait 100ms then log "done"',
      'on input if my.value is empty hide #submit',
    ];

    for (const code of testCases) {
      it(`should parse "${code.substring(0, 30)}..." consistently`, () => {
        const standard = createStandardParser();
        const full = createFullParser();

        const standardResult = standard.parse(code);
        const fullResult = full.parse(code);

        expect(standardResult.success).toBe(fullResult.success);

        if (standardResult.success && fullResult.success) {
          // Both should produce valid AST nodes
          expect(standardResult.node).toBeDefined();
          expect(fullResult.node).toBeDefined();
        }
      });
    }
  });
});
