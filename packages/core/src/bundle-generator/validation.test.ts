/**
 * Validation Tests for Bundle Generator
 */

import { describe, it, expect } from 'vitest';
import { generateBundle } from './generator';
import {
  AVAILABLE_COMMANDS,
  AVAILABLE_BLOCKS,
  FULL_RUNTIME_ONLY_COMMANDS,
  isAvailableCommand,
  isAvailableBlock,
  requiresFullRuntime,
} from './template-capabilities';

describe('Bundle Generator Validation', () => {
  describe('generateBundle with validation', () => {
    it('should return errors for unknown commands', () => {
      const result = generateBundle({
        name: 'Test',
        commands: ['toggle', 'unknownCommand', 'add'],
      });

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('unknown-command');
      expect(result.errors[0].name).toBe('unknownCommand');
      expect(result.warnings).toContain("Unknown command 'unknownCommand' will not be included");
      expect(result.commands).toEqual(['toggle', 'add']);
    });

    it('should return errors for unknown blocks', () => {
      const result = generateBundle({
        name: 'Test',
        commands: ['toggle'],
        blocks: ['if', 'unknownBlock'],
      });

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('unknown-block');
      expect(result.errors[0].name).toBe('unknownBlock');
      expect(result.blocks).toEqual(['if']);
    });

    it('should throw in strict mode for unknown commands', () => {
      expect(() =>
        generateBundle({
          name: 'Test',
          commands: ['toggle', 'unknownCommand'],
          validation: { strict: true },
        })
      ).toThrow('Bundle generation failed (strict mode)');
    });

    it('should throw in strict mode for unknown blocks', () => {
      expect(() =>
        generateBundle({
          name: 'Test',
          commands: ['toggle'],
          blocks: ['unknownBlock'],
          validation: { strict: true },
        })
      ).toThrow('Bundle generation failed (strict mode)');
    });

    it('should succeed in strict mode with valid commands', () => {
      const result = generateBundle({
        name: 'Test',
        commands: ['toggle', 'add', 'remove'],
        blocks: ['if', 'repeat'],
        validation: { strict: true },
      });

      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(result.commands).toEqual(['toggle', 'add', 'remove']);
      expect(result.blocks).toEqual(['if', 'repeat']);
    });

    it('should include configurable maxLoopIterations in generated code', () => {
      const result = generateBundle({
        name: 'Test',
        commands: ['toggle'],
        blocks: ['repeat'],
        maxLoopIterations: 5000,
      });

      expect(result.code).toContain('MAX_LOOP_ITERATIONS = 5000');
    });

    it('should use default maxLoopIterations when not specified', () => {
      const result = generateBundle({
        name: 'Test',
        commands: ['toggle'],
        blocks: ['repeat'],
      });

      expect(result.code).toContain('MAX_LOOP_ITERATIONS = 1000');
    });
  });

  describe('template-capabilities', () => {
    it('should list all available commands', () => {
      expect(AVAILABLE_COMMANDS).toContain('toggle');
      expect(AVAILABLE_COMMANDS).toContain('add');
      expect(AVAILABLE_COMMANDS).toContain('remove');
      expect(AVAILABLE_COMMANDS).toContain('break');
      expect(AVAILABLE_COMMANDS).toContain('continue');
      expect(AVAILABLE_COMMANDS.length).toBeGreaterThan(20);
    });

    it('should list all available blocks', () => {
      expect(AVAILABLE_BLOCKS).toEqual(['if', 'repeat', 'for', 'while', 'fetch']);
    });

    it('should list full runtime only commands', () => {
      expect(FULL_RUNTIME_ONLY_COMMANDS).toContain('async');
      expect(FULL_RUNTIME_ONLY_COMMANDS).toContain('swap');
      expect(FULL_RUNTIME_ONLY_COMMANDS).toContain('morph');
      // break and continue are now available in lite bundles
      expect(FULL_RUNTIME_ONLY_COMMANDS).not.toContain('break');
      expect(FULL_RUNTIME_ONLY_COMMANDS).not.toContain('continue');
    });

    it('isAvailableCommand should return true for valid commands', () => {
      expect(isAvailableCommand('toggle')).toBe(true);
      expect(isAvailableCommand('add')).toBe(true);
      expect(isAvailableCommand('break')).toBe(true);
    });

    it('isAvailableCommand should return false for invalid commands', () => {
      expect(isAvailableCommand('unknown')).toBe(false);
      expect(isAvailableCommand('async')).toBe(false);
    });

    it('isAvailableBlock should return true for valid blocks', () => {
      expect(isAvailableBlock('if')).toBe(true);
      expect(isAvailableBlock('repeat')).toBe(true);
    });

    it('isAvailableBlock should return false for invalid blocks', () => {
      expect(isAvailableBlock('unknown')).toBe(false);
    });

    it('requiresFullRuntime should identify full runtime commands', () => {
      expect(requiresFullRuntime('async')).toBe(true);
      expect(requiresFullRuntime('swap')).toBe(true);
      expect(requiresFullRuntime('toggle')).toBe(false);
    });
  });

  describe('break/continue commands', () => {
    it('should include break command in generated code when requested', () => {
      const result = generateBundle({
        name: 'Test',
        commands: ['break', 'continue'],
        blocks: ['repeat'],
      });

      expect(result.code).toContain("case 'break':");
      expect(result.code).toContain("case 'continue':");
      expect(result.commands).toContain('break');
      expect(result.commands).toContain('continue');
    });

    it('should handle break/continue in block templates', () => {
      const result = generateBundle({
        name: 'Test',
        commands: ['toggle'],
        blocks: ['repeat', 'for', 'while'],
      });

      // Check that blocks catch break/continue signals
      expect(result.code).toContain("if (e?.type === 'break') break");
      expect(result.code).toContain("if (e?.type === 'continue')");
    });
  });
});
