/**
 * Additional Tests for RemoveCommand (Attributes & Styles)
 *
 * Tests the restored V1 features:
 * - Attribute removal: remove @attr, remove [@attr]
 * - Inline style removal: remove *property, remove *background-color
 *
 * These tests validate the discriminated union pattern implementation
 * that enables RemoveCommand to handle multiple input types.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RemoveCommand } from '../remove';
import type { ExecutionContext, TypedExecutionContext } from '../../../types/core';
import type { ASTNode } from '../../../types/base-types.ts';

// ========== Test Utilities ==========

function createMockContext(): ExecutionContext & TypedExecutionContext {
  const meElement = document.createElement('div');
  meElement.setAttribute('data-test', 'value');
  meElement.setAttribute('aria-label', 'Test Element');
  meElement.style.opacity = '0.5';
  meElement.style.backgroundColor = 'blue';

  return {
    me: meElement,
    you: undefined,
    it: undefined,
    result: undefined,
    locals: new Map(),
    target: meElement,
    detail: undefined,
  } as any;
}

function createMockEvaluator() {
  return {
    evaluate: async (node: ASTNode, context: ExecutionContext) => {
      if (typeof node === 'object' && node !== null && 'value' in node) {
        return (node as any).value;
      }
      return node;
    },
  };
}

// ========== Attribute Removal Tests ==========

describe('RemoveCommand - Attribute Support', () => {
  let command: RemoveCommand;

  beforeEach(() => {
    command = new RemoveCommand();
  });

  describe('parseInput - Attribute Syntax', () => {
    it('should parse bracket syntax with attribute name: [@data-test]', async () => {
      const context = createMockContext();
      const evaluator = {
        evaluate: async () => '[@data-test]',
      };

      const input = await command.parseInput(
        { args: [{ value: '[@data-test]' } as any], modifiers: {} },
        evaluator as any,
        context
      );

      expect(input.type).toBe('attribute');
      if (input.type === 'attribute') {
        expect(input.name).toBe('data-test');
        expect(input.targets).toEqual([context.me]);
      }
    });

    it('should parse direct @ syntax: @data-value', async () => {
      const context = createMockContext();
      const evaluator = {
        evaluate: async () => '@data-value',
      };

      const input = await command.parseInput(
        { args: [{ value: '@data-value' } as any], modifiers: {} },
        evaluator as any,
        context
      );

      expect(input.type).toBe('attribute');
      if (input.type === 'attribute') {
        expect(input.name).toBe('data-value');
        expect(input.targets).toEqual([context.me]);
      }
    });

    it('should parse ARIA attribute: [@aria-label]', async () => {
      const context = createMockContext();
      const evaluator = {
        evaluate: async () => '[@aria-label]',
      };

      const input = await command.parseInput(
        { args: [{ value: '[@aria-label]' } as any], modifiers: {} },
        evaluator as any,
        context
      );

      expect(input.type).toBe('attribute');
      if (input.type === 'attribute') {
        expect(input.name).toBe('aria-label');
      }
    });

    it('should parse boolean attribute: @disabled', async () => {
      const context = createMockContext();
      const evaluator = {
        evaluate: async () => '@disabled',
      };

      const input = await command.parseInput(
        { args: [{ value: '@disabled' } as any], modifiers: {} },
        evaluator as any,
        context
      );

      expect(input.type).toBe('attribute');
      if (input.type === 'attribute') {
        expect(input.name).toBe('disabled');
      }
    });
  });

  describe('execute - Attribute Removal', () => {
    it('should remove data attribute', async () => {
      const context = createMockContext();
      const element = document.createElement('div');
      element.setAttribute('data-test', 'value');
      element.setAttribute('data-keep', 'keep-this');

      await command.execute(
        { type: 'attribute', name: 'data-test', targets: [element] },
        context
      );

      expect(element!.hasAttribute('data-test')).toBe(false);
      expect(element!.getAttribute('data-keep')).toBe('keep-this'); // Preserved
    });

    it('should remove ARIA attribute', async () => {
      const context = createMockContext();
      const element = document.createElement('div');
      element.setAttribute('aria-label', 'Test Label');
      element.setAttribute('aria-hidden', 'true');

      await command.execute(
        { type: 'attribute', name: 'aria-label', targets: [element] },
        context
      );

      expect(element!.hasAttribute('aria-label')).toBe(false);
      expect(element!.getAttribute('aria-hidden')).toBe('true'); // Preserved
    });

    it('should remove boolean attribute', async () => {
      const context = createMockContext();
      const element = document.createElement('button');
      element.setAttribute('disabled', '');

      await command.execute(
        { type: 'attribute', name: 'disabled', targets: [element] },
        context
      );

      expect(element!.hasAttribute('disabled')).toBe(false);
    });

    it('should remove attribute from multiple elements', async () => {
      const context = createMockContext();
      const el1 = document.createElement('div');
      const el2 = document.createElement('div');
      el1.setAttribute('data-status', 'active');
      el2.setAttribute('data-status', 'inactive');

      await command.execute(
        { type: 'attribute', name: 'data-status', targets: [el1, el2] },
        context
      );

      expect(el1.hasAttribute('data-status')).toBe(false);
      expect(el2.hasAttribute('data-status')).toBe(false);
    });

    it('should safely handle removing non-existent attribute', async () => {
      const context = createMockContext();
      const element = document.createElement('div');
      element.setAttribute('data-existing', 'value');

      // Should not throw error
      await command.execute(
        { type: 'attribute', name: 'data-nonexistent', targets: [element] },
        context
      );

      // Existing attribute should remain
      expect(element!.getAttribute('data-existing')).toBe('value');
    });
  });

  describe('validate - Attribute Input', () => {
    it('should validate correct attribute input', () => {
      const element = document.createElement('div');
      const input = {
        type: 'attribute' as const,
        name: 'data-test',
        targets: [element],
      };
      expect(command.validate(input)).toBe(true);
    });

    it('should reject attribute input without name', () => {
      const element = document.createElement('div');
      const input = {
        type: 'attribute' as const,
        targets: [element],
      };
      expect(command.validate(input)).toBe(false);
    });

    it('should reject attribute input with empty name', () => {
      const element = document.createElement('div');
      const input = {
        type: 'attribute' as const,
        name: '',
        targets: [element],
      };
      expect(command.validate(input)).toBe(false);
    });

    it('should reject attribute input with non-string name', () => {
      const element = document.createElement('div');
      const input = {
        type: 'attribute' as const,
        name: 123,
        targets: [element],
      };
      expect(command.validate(input)).toBe(false);
    });

    it('should reject attribute input without targets', () => {
      const input = {
        type: 'attribute' as const,
        name: 'data-test',
      };
      expect(command.validate(input)).toBe(false);
    });
  });
});

// ========== Style Removal Tests ==========

describe('RemoveCommand - Style Support', () => {
  let command: RemoveCommand;

  beforeEach(() => {
    command = new RemoveCommand();
  });

  describe('parseInput - Style Syntax', () => {
    it('should parse CSS property shorthand: *opacity', async () => {
      const context = createMockContext();
      const evaluator = {
        evaluate: async () => '*opacity',
      };

      const input = await command.parseInput(
        { args: [{ value: '*opacity' } as any], modifiers: {} },
        evaluator as any,
        context
      );

      expect(input.type).toBe('styles');
      if (input.type === 'styles') {
        expect(input.properties).toEqual(['opacity']);
        expect(input.targets).toEqual([context.me]);
      }
    });

    it('should parse kebab-case property: *background-color', async () => {
      const context = createMockContext();
      const evaluator = {
        evaluate: async () => '*background-color',
      };

      const input = await command.parseInput(
        { args: [{ value: '*background-color' } as any], modifiers: {} },
        evaluator as any,
        context
      );

      expect(input.type).toBe('styles');
      if (input.type === 'styles') {
        expect(input.properties).toEqual(['background-color']);
      }
    });

    it('should parse camelCase property: *backgroundColor', async () => {
      const context = createMockContext();
      const evaluator = {
        evaluate: async () => '*backgroundColor',
      };

      const input = await command.parseInput(
        { args: [{ value: '*backgroundColor' } as any], modifiers: {} },
        evaluator as any,
        context
      );

      expect(input.type).toBe('styles');
      if (input.type === 'styles') {
        expect(input.properties).toEqual(['backgroundColor']);
      }
    });

    it('should parse complex property: *border-top-color', async () => {
      const context = createMockContext();
      const evaluator = {
        evaluate: async () => '*border-top-color',
      };

      const input = await command.parseInput(
        { args: [{ value: '*border-top-color' } as any], modifiers: {} },
        evaluator as any,
        context
      );

      expect(input.type).toBe('styles');
      if (input.type === 'styles') {
        expect(input.properties).toEqual(['border-top-color']);
      }
    });
  });

  describe('execute - Style Removal', () => {
    it('should remove single inline style', async () => {
      const context = createMockContext();
      const element = document.createElement('div');
      element.style.opacity = '0.5';
      element.style.color = 'red';

      await command.execute(
        { type: 'styles', properties: ['opacity'], targets: [element] },
        context
      );

      expect(element!.style.opacity).toBe('');
      expect(element!.style.color).toBe('red'); // Preserved
    });

    it('should remove multiple inline styles', async () => {
      const context = createMockContext();
      const element = document.createElement('div');
      element.style.opacity = '0.5';
      element.style.backgroundColor = 'blue';
      element.style.color = 'red';

      await command.execute(
        { type: 'styles', properties: ['opacity', 'background-color'], targets: [element] },
        context
      );

      expect(element!.style.opacity).toBe('');
      expect(element!.style.backgroundColor).toBe('');
      expect(element!.style.color).toBe('red'); // Preserved
    });

    it('should handle kebab-case property names correctly', async () => {
      const context = createMockContext();
      const element = document.createElement('div');
      element.style.backgroundColor = 'blue';

      await command.execute(
        { type: 'styles', properties: ['background-color'], targets: [element] },
        context
      );

      expect(element!.style.backgroundColor).toBe('');
    });

    it('should remove styles from multiple elements', async () => {
      const context = createMockContext();
      const el1 = document.createElement('div');
      const el2 = document.createElement('div');
      el1.style.opacity = '0.8';
      el2.style.opacity = '0.6';

      await command.execute(
        { type: 'styles', properties: ['opacity'], targets: [el1, el2] },
        context
      );

      expect(el1.style.opacity).toBe('');
      expect(el2.style.opacity).toBe('');
    });

    it('should safely handle removing non-existent style', async () => {
      const context = createMockContext();
      const element = document.createElement('div');
      element.style.color = 'red';

      // Should not throw error
      await command.execute(
        { type: 'styles', properties: ['opacity'], targets: [element] },
        context
      );

      // Existing style should remain
      expect(element!.style.color).toBe('red');
    });
  });

  describe('validate - Style Input', () => {
    it('should validate correct styles input', () => {
      const element = document.createElement('div');
      const input = {
        type: 'styles' as const,
        properties: ['opacity', 'background-color'],
        targets: [element],
      };
      expect(command.validate(input)).toBe(true);
    });

    it('should reject styles input without properties', () => {
      const element = document.createElement('div');
      const input = {
        type: 'styles' as const,
        targets: [element],
      };
      expect(command.validate(input)).toBe(false);
    });

    it('should reject styles input with null properties', () => {
      const element = document.createElement('div');
      const input = {
        type: 'styles' as const,
        properties: null,
        targets: [element],
      };
      expect(command.validate(input)).toBe(false);
    });

    it('should reject styles input with non-array properties', () => {
      const element = document.createElement('div');
      const input = {
        type: 'styles' as const,
        properties: 'opacity',
        targets: [element],
      };
      expect(command.validate(input)).toBe(false);
    });

    it('should reject styles input with empty properties array', () => {
      const element = document.createElement('div');
      const input = {
        type: 'styles' as const,
        properties: [],
        targets: [element],
      };
      expect(command.validate(input)).toBe(false);
    });

    it('should reject styles input with non-string properties', () => {
      const element = document.createElement('div');
      const input = {
        type: 'styles' as const,
        properties: [123, 456],
        targets: [element],
      };
      expect(command.validate(input)).toBe(false);
    });
  });
});

// ========== Integration Tests ==========

describe('RemoveCommand - Integration (Attributes & Styles)', () => {
  let command: RemoveCommand;

  beforeEach(() => {
    command = new RemoveCommand();
  });

  it('should remove attribute end-to-end', async () => {
    const context = createMockContext();
    context.me!.setAttribute('data-temp', 'temporary');
    const evaluator = {
      evaluate: async () => '@data-temp',
    };

    // Parse input
    const input = await command.parseInput(
      { args: [{ value: '@data-temp' } as any], modifiers: {} },
      evaluator as any,
      context
    );

    // Validate
    expect(command.validate(input)).toBe(true);

    // Execute
    await command.execute(input, context);

    // Verify
    expect(context.me!.hasAttribute('data-temp')).toBe(false);
  });

  it('should remove style end-to-end', async () => {
    const context = createMockContext();
    context.me!.style.opacity = '0.7';
    const evaluator = {
      evaluate: async () => '*opacity',
    };

    // Parse input
    const input = await command.parseInput(
      { args: [{ value: '*opacity' } as any], modifiers: {} },
      evaluator as any,
      context
    );

    // Validate
    expect(command.validate(input)).toBe(true);

    // Execute
    await command.execute(input, context);

    // Verify
    expect(context.me!.style.opacity).toBe('');
  });

  it('should preserve classes when removing attributes', async () => {
    const context = createMockContext();
    context.me!.className = 'keep-me';
    context.me!.setAttribute('data-remove', 'value');
    const evaluator = {
      evaluate: async () => '@data-remove',
    };

    const input = await command.parseInput(
      { args: [{ value: '@data-remove' } as any], modifiers: {} },
      evaluator as any,
      context
    );

    await command.execute(input, context);

    // Classes should be preserved
    expect(context.me!.classList.contains('keep-me')).toBe(true);
    expect(context.me!.hasAttribute('data-remove')).toBe(false);
  });

  it('should preserve attributes when removing styles', async () => {
    const context = createMockContext();
    context.me!.setAttribute('data-keep', 'value');
    context.me!.style.opacity = '0.5';
    const evaluator = {
      evaluate: async () => '*opacity',
    };

    const input = await command.parseInput(
      { args: [{ value: '*opacity' } as any], modifiers: {} },
      evaluator as any,
      context
    );

    await command.execute(input, context);

    // Attributes should be preserved
    expect(context.me!.getAttribute('data-keep')).toBe('value');
    expect(context.me!.style.opacity).toBe('');
  });
});
