/**
 * Command Metadata System Tests
 *
 * Tests for the standardized command metadata system inspired by napi-rs patterns.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  validateCommandMetadata,
  normalizeCategory,
  createCommandMetadata,
  mergeCommandMetadata,
  getSyntaxArray,
  formatMetadataForDocs,
  CommandMetadataRegistry,
  COMMAND_CATEGORIES,
  COMMAND_SIDE_EFFECTS,
  type CommandMetadata,
  type CommandCategory,
  type CommandSideEffect,
} from './command-metadata';

describe('Command Metadata Validation', () => {
  describe('validateCommandMetadata', () => {
    it('should validate correct metadata', () => {
      const metadata: CommandMetadata = {
        description: 'Add CSS classes to elements',
        syntax: 'add <classes> [to <target>]',
        examples: ['add .active to me', 'add .highlighted'],
        category: 'dom',
      };

      const result = validateCommandMetadata(metadata, 'add');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require description', () => {
      const metadata = {
        syntax: 'test',
        examples: ['test'],
        category: 'dom',
      };

      const result = validateCommandMetadata(metadata, 'test');
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('description'))).toBe(true);
    });

    it('should require syntax', () => {
      const metadata = {
        description: 'Test command',
        examples: ['test'],
        category: 'dom',
      };

      const result = validateCommandMetadata(metadata, 'test');
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('syntax'))).toBe(true);
    });

    it('should require examples as non-empty array', () => {
      const metadata = {
        description: 'Test command',
        syntax: 'test',
        examples: [],
        category: 'dom',
      };

      const result = validateCommandMetadata(metadata, 'test');
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('examples'))).toBe(true);
    });

    it('should warn for single example', () => {
      const metadata: CommandMetadata = {
        description: 'Test command',
        syntax: 'test',
        examples: ['test'],
        category: 'dom',
      };

      const result = validateCommandMetadata(metadata, 'test');
      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.includes('at least 2 examples'))).toBe(true);
    });

    it('should require valid category', () => {
      const metadata = {
        description: 'Test command',
        syntax: 'test',
        examples: ['test', 'test2'],
        category: 'invalid-category',
      };

      const result = validateCommandMetadata(metadata, 'test');
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('category'))).toBe(true);
    });

    it('should accept array syntax', () => {
      const metadata: CommandMetadata = {
        description: 'Wait command',
        syntax: ['wait <time>', 'wait for <event>'],
        examples: ['wait 2s', 'wait for click'],
        category: 'async',
      };

      const result = validateCommandMetadata(metadata, 'wait');
      expect(result.isValid).toBe(true);
    });

    it('should validate sideEffects array', () => {
      const metadata: CommandMetadata = {
        description: 'Test command',
        syntax: 'test',
        examples: ['test', 'test2'],
        category: 'dom',
        sideEffects: ['dom-mutation', 'unknown-effect' as unknown as CommandSideEffect],
      };

      const result = validateCommandMetadata(metadata, 'test');
      expect(result.isValid).toBe(true); // Unknown effects are warnings, not errors
      expect(result.warnings.some(w => w.includes('unknown-effect'))).toBe(true);
    });

    it('should warn about deprecated without message', () => {
      const metadata: CommandMetadata = {
        description: 'Old command',
        syntax: 'old',
        examples: ['old', 'old2'],
        category: 'utility',
        deprecated: true,
      };

      const result = validateCommandMetadata(metadata, 'old');
      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.includes('deprecationMessage'))).toBe(true);
    });
  });
});

describe('Category Normalization', () => {
  describe('normalizeCategory', () => {
    it('should normalize uppercase to lowercase', () => {
      expect(normalizeCategory('DOM')).toBe('dom');
      expect(normalizeCategory('ASYNC')).toBe('async');
    });

    it('should handle camelCase', () => {
      expect(normalizeCategory('controlFlow')).toBe('control-flow');
    });

    it('should preserve already normalized categories', () => {
      expect(normalizeCategory('dom')).toBe('dom');
      expect(normalizeCategory('control-flow')).toBe('control-flow');
    });
  });
});

describe('Metadata Helpers', () => {
  describe('createCommandMetadata', () => {
    it('should create metadata with defaults', () => {
      const metadata = createCommandMetadata({
        description: 'Test command',
        syntax: 'test',
        examples: ['test'],
        category: 'dom',
      });

      expect(metadata.version).toBe('1.0.0');
      expect(metadata.isBlocking).toBe(false);
      expect(metadata.hasBody).toBe(false);
    });

    it('should allow overriding defaults', () => {
      const metadata = createCommandMetadata({
        description: 'Test command',
        syntax: 'test',
        examples: ['test'],
        category: 'dom',
        version: '2.0.0',
        isBlocking: true,
      });

      expect(metadata.version).toBe('2.0.0');
      expect(metadata.isBlocking).toBe(true);
    });
  });

  describe('mergeCommandMetadata', () => {
    it('should merge metadata with overrides', () => {
      const base: CommandMetadata = {
        description: 'Base description',
        syntax: 'test',
        examples: ['example1'],
        category: 'dom',
        sideEffects: ['dom-mutation'],
      };

      const merged = mergeCommandMetadata(base, {
        description: 'New description',
        examples: ['example2'],
        sideEffects: ['dom-query'],
      });

      expect(merged.description).toBe('New description');
      expect(merged.examples).toEqual(['example1', 'example2']);
      expect(merged.sideEffects).toEqual(['dom-mutation', 'dom-query']);
    });
  });

  describe('getSyntaxArray', () => {
    it('should convert string syntax to array', () => {
      const metadata: CommandMetadata = {
        description: 'Test',
        syntax: 'test <arg>',
        examples: ['test'],
        category: 'dom',
      };

      expect(getSyntaxArray(metadata)).toEqual(['test <arg>']);
    });

    it('should return array syntax as-is', () => {
      const metadata: CommandMetadata = {
        description: 'Test',
        syntax: ['test <arg1>', 'test <arg2>'],
        examples: ['test'],
        category: 'dom',
      };

      expect(getSyntaxArray(metadata)).toEqual(['test <arg1>', 'test <arg2>']);
    });
  });

  describe('formatMetadataForDocs', () => {
    it('should format metadata as markdown', () => {
      const metadata: CommandMetadata = {
        description: 'Add CSS classes to elements',
        syntax: 'add <classes> [to <target>]',
        examples: ['add .active to me', 'add .highlighted'],
        category: 'dom',
        sideEffects: ['dom-mutation'],
      };

      const docs = formatMetadataForDocs('add', metadata);

      expect(docs).toContain('## add');
      expect(docs).toContain('Add CSS classes to elements');
      expect(docs).toContain('### Syntax');
      expect(docs).toContain('add <classes> [to <target>]');
      expect(docs).toContain('### Examples');
      expect(docs).toContain('add .active to me');
      expect(docs).toContain('**Category:** dom');
      expect(docs).toContain('**Side Effects:** dom-mutation');
    });

    it('should format deprecated commands', () => {
      const metadata: CommandMetadata = {
        description: 'Old command',
        syntax: 'old',
        examples: ['old'],
        category: 'utility',
        deprecated: true,
        deprecationMessage: 'Use new instead',
      };

      const docs = formatMetadataForDocs('old', metadata);
      expect(docs).toContain('**DEPRECATED:** Use new instead');
    });
  });
});

describe('CommandMetadataRegistry', () => {
  let registry: CommandMetadataRegistry;

  beforeEach(() => {
    registry = new CommandMetadataRegistry();
  });

  describe('registration', () => {
    it('should register command with metadata', () => {
      const metadata: CommandMetadata = {
        description: 'Test command',
        syntax: 'test',
        examples: ['test', 'test2'],
        category: 'dom',
      };

      registry.register('test', metadata, {});

      expect(registry.get('test')).toBeDefined();
      expect(registry.get('test')?.metadata).toBe(metadata);
    });
  });

  describe('querying', () => {
    beforeEach(() => {
      registry.register(
        'add',
        {
          description: 'Add classes',
          syntax: 'add',
          examples: ['add .a', 'add .b'],
          category: 'dom',
        },
        {}
      );
      registry.register(
        'remove',
        {
          description: 'Remove classes',
          syntax: 'remove',
          examples: ['remove .a', 'remove .b'],
          category: 'dom',
        },
        {}
      );
      registry.register(
        'wait',
        {
          description: 'Wait',
          syntax: 'wait',
          examples: ['wait 1s', 'wait 2s'],
          category: 'async',
        },
        {}
      );
    });

    it('should get command names', () => {
      const names = registry.getCommandNames();
      expect(names).toContain('add');
      expect(names).toContain('remove');
      expect(names).toContain('wait');
    });

    it('should get commands by category', () => {
      const domCommands = registry.getByCategory('dom');
      expect(domCommands).toHaveLength(2);
      expect(domCommands.map(c => c.name)).toContain('add');
      expect(domCommands.map(c => c.name)).toContain('remove');

      const asyncCommands = registry.getByCategory('async');
      expect(asyncCommands).toHaveLength(1);
      expect(asyncCommands[0].name).toBe('wait');
    });

    it('should get deprecated commands', () => {
      registry.register(
        'old',
        {
          description: 'Old',
          syntax: 'old',
          examples: ['old', 'old2'],
          category: 'utility',
          deprecated: true,
        },
        {}
      );

      const deprecated = registry.getDeprecated();
      expect(deprecated).toHaveLength(1);
      expect(deprecated[0].name).toBe('old');
    });
  });

  describe('validation', () => {
    it('should validate all commands', () => {
      registry.register(
        'valid',
        {
          description: 'Valid command',
          syntax: 'valid',
          examples: ['valid', 'valid2'],
          category: 'dom',
        },
        {}
      );
      registry.register(
        'invalid',
        {
          description: '',
          syntax: 'invalid',
          examples: [],
          category: 'invalid-cat' as unknown as CommandCategory,
        } as unknown as CommandMetadata,
        {}
      );

      const results = registry.validateAll();

      expect(results.get('valid')?.isValid).toBe(true);
      expect(results.get('invalid')?.isValid).toBe(false);
    });
  });
});

describe('Constants', () => {
  it('should have valid command categories', () => {
    expect(COMMAND_CATEGORIES).toContain('dom');
    expect(COMMAND_CATEGORIES).toContain('async');
    expect(COMMAND_CATEGORIES).toContain('control-flow');
    expect(COMMAND_CATEGORIES).toContain('animation');
    expect(COMMAND_CATEGORIES).toContain('data');
    expect(COMMAND_CATEGORIES).toContain('utility');
  });

  it('should have valid side effects', () => {
    expect(COMMAND_SIDE_EFFECTS).toContain('dom-mutation');
    expect(COMMAND_SIDE_EFFECTS).toContain('dom-query');
    expect(COMMAND_SIDE_EFFECTS).toContain('time');
    expect(COMMAND_SIDE_EFFECTS).toContain('event-listening');
    expect(COMMAND_SIDE_EFFECTS).toContain('data-mutation');
  });
});
