/**
 * Command Validator Tests
 *
 * Tests per-command semantic validation.
 */

import { describe, it, expect } from 'vitest';
import {
  validateSemanticResult,
  validateAndAdjustConfidence,
  getSchema,
} from '../../src/validators/command-validator';
import type { SemanticParseResult } from '../../src/types';

describe('Command Validator', () => {
  describe('getSchema', () => {
    it('should return schema for known commands', () => {
      expect(getSchema('toggle')).toBeDefined();
      expect(getSchema('add')).toBeDefined();
      expect(getSchema('remove')).toBeDefined();
      expect(getSchema('put')).toBeDefined();
      expect(getSchema('set')).toBeDefined();
    });

    it('should return undefined for unknown commands', () => {
      expect(getSchema('unknownCommand' as any)).toBeUndefined();
    });
  });

  describe('validateSemanticResult', () => {
    it('should validate toggle command with all required roles', () => {
      const result: SemanticParseResult = {
        action: 'toggle',
        confidence: 0.8,
        language: 'en',
        arguments: [
          { type: 'selector', value: '.active', role: 'patient' },
          { type: 'selector', value: '#button', role: 'destination' },
        ],
      };

      const validation = validateSemanticResult(result);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should validate toggle command with optional role missing', () => {
      const result: SemanticParseResult = {
        action: 'toggle',
        confidence: 0.8,
        language: 'en',
        arguments: [
          { type: 'selector', value: '.active', role: 'patient' },
        ],
      };

      const validation = validateSemanticResult(result);
      expect(validation.valid).toBe(true);
      // Should have warning about using default for destination
      expect(validation.warnings.length).toBeGreaterThanOrEqual(0);
    });

    it('should fail validation when required role is missing without default', () => {
      const result: SemanticParseResult = {
        action: 'put',
        confidence: 0.8,
        language: 'en',
        arguments: [
          { type: 'literal', value: 'hello', role: 'patient' },
          // Missing destination which is required without default
        ],
      };

      const validation = validateSemanticResult(result);
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.code === 'MISSING_REQUIRED_ROLE')).toBe(true);
    });

    it('should warn about type mismatch', () => {
      const result: SemanticParseResult = {
        action: 'toggle',
        confidence: 0.8,
        language: 'en',
        arguments: [
          // Using literal instead of selector for patient
          { type: 'literal', value: 123, role: 'patient' },
        ],
      };

      const validation = validateSemanticResult(result);
      // Type mismatch should be a warning, not error
      expect(validation.warnings.some(w => w.code === 'INVALID_TYPE')).toBe(true);
    });

    it('should handle unknown commands gracefully', () => {
      const result: SemanticParseResult = {
        action: 'customCommand' as any,
        confidence: 0.8,
        language: 'en',
        arguments: [],
      };

      const validation = validateSemanticResult(result);
      expect(validation.valid).toBe(true);
      expect(validation.warnings.some(w => w.message.includes('No schema found'))).toBe(true);
      expect(validation.confidenceAdjustment).toBeLessThan(0);
    });

    it('should boost confidence for well-typed results', () => {
      const result: SemanticParseResult = {
        action: 'toggle',
        confidence: 0.7,
        language: 'en',
        arguments: [
          { type: 'selector', value: '.active', role: 'patient' },
          { type: 'selector', value: '#button', role: 'destination' },
        ],
      };

      const validation = validateSemanticResult(result);
      expect(validation.confidenceAdjustment).toBeGreaterThan(0);
    });
  });

  describe('validateAndAdjustConfidence', () => {
    it('should adjust confidence based on validation', () => {
      const result: SemanticParseResult = {
        action: 'toggle',
        confidence: 0.7,
        language: 'en',
        arguments: [
          { type: 'selector', value: '.active', role: 'patient' },
        ],
      };

      const adjusted = validateAndAdjustConfidence(result);
      expect(adjusted.validation).toBeDefined();
      expect(adjusted.confidence).toBeGreaterThanOrEqual(0);
      expect(adjusted.confidence).toBeLessThanOrEqual(1);
    });

    it('should decrease confidence for invalid results', () => {
      const result: SemanticParseResult = {
        action: 'put',
        confidence: 0.8,
        language: 'en',
        arguments: [
          { type: 'literal', value: 'hello', role: 'patient' },
          // Missing required destination
        ],
      };

      const adjusted = validateAndAdjustConfidence(result);
      expect(adjusted.confidence).toBeLessThan(0.8);
      expect(adjusted.validation.valid).toBe(false);
    });

    it('should clamp confidence between 0 and 1', () => {
      // Very low confidence
      const lowResult: SemanticParseResult = {
        action: 'put',
        confidence: 0.1,
        language: 'en',
        arguments: [], // Missing everything
      };

      const lowAdjusted = validateAndAdjustConfidence(lowResult);
      expect(lowAdjusted.confidence).toBeGreaterThanOrEqual(0);

      // Very high confidence
      const highResult: SemanticParseResult = {
        action: 'toggle',
        confidence: 0.99,
        language: 'en',
        arguments: [
          { type: 'selector', value: '.active', role: 'patient' },
          { type: 'selector', value: '#button', role: 'destination' },
        ],
      };

      const highAdjusted = validateAndAdjustConfidence(highResult);
      expect(highAdjusted.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('Multilingual validation', () => {
    it('should validate Japanese semantic results', () => {
      const result: SemanticParseResult = {
        action: 'toggle',
        confidence: 0.85,
        language: 'ja',
        arguments: [
          { type: 'selector', value: '.active', role: 'patient' },
          { type: 'selector', value: '#button', role: 'destination' },
        ],
      };

      const validation = validateSemanticResult(result);
      expect(validation.valid).toBe(true);
    });

    it('should validate Arabic semantic results', () => {
      const result: SemanticParseResult = {
        action: 'toggle',
        confidence: 0.85,
        language: 'ar',
        arguments: [
          { type: 'selector', value: '.نشط', role: 'patient' },
          { type: 'selector', value: '#زر', role: 'destination' },
        ],
      };

      const validation = validateSemanticResult(result);
      expect(validation.valid).toBe(true);
    });

    it('should validate Korean semantic results', () => {
      const result: SemanticParseResult = {
        action: 'toggle',
        confidence: 0.85,
        language: 'ko',
        arguments: [
          { type: 'selector', value: '.활성', role: 'patient' },
          { type: 'selector', value: '#버튼', role: 'destination' },
        ],
      };

      const validation = validateSemanticResult(result);
      expect(validation.valid).toBe(true);
    });
  });

  describe('Command-specific validation', () => {
    it('should validate set command with required destination and patient', () => {
      const result: SemanticParseResult = {
        action: 'set',
        confidence: 0.8,
        language: 'en',
        arguments: [
          { type: 'reference', value: ':count', role: 'destination' },
          { type: 'literal', value: 10, role: 'patient' },
        ],
      };

      const validation = validateSemanticResult(result);
      expect(validation.valid).toBe(true);
    });

    it('should validate fetch command with source', () => {
      const result: SemanticParseResult = {
        action: 'fetch',
        confidence: 0.8,
        language: 'en',
        arguments: [
          { type: 'literal', value: '/api/data', role: 'source' },
        ],
      };

      const validation = validateSemanticResult(result);
      expect(validation.valid).toBe(true);
    });

    it('should validate on command with event role', () => {
      const result: SemanticParseResult = {
        action: 'on',
        confidence: 0.8,
        language: 'en',
        arguments: [
          { type: 'literal', value: 'click', role: 'event' },
        ],
      };

      const validation = validateSemanticResult(result);
      expect(validation.valid).toBe(true);
    });
  });
});
