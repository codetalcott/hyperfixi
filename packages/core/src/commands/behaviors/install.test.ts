/**
 * Install Command Unit Tests
 * Tests for behavior installation functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InstallCommand } from './install';
import type { TypedExecutionContext } from '../../types/command-types';

describe('InstallCommand', () => {
  let installCmd: InstallCommand;
  let mockContext: TypedExecutionContext;
  let mockElement: HTMLElement;
  let mockBehaviorRegistry: Map<string, any>;

  beforeEach(() => {
    installCmd = new InstallCommand();

    // Create mock element
    mockElement = document.createElement('div');
    mockElement.id = 'test-element';
    document.body.appendChild(mockElement);

    // Create mock behavior registry with install function
    mockBehaviorRegistry = new Map();
    const mockInstallFn = vi.fn(
      async (behaviorName: string, element: HTMLElement, params: Record<string, unknown>) => {
        return {
          id: `instance-${Date.now()}`,
          behaviorName,
          element,
          parameters: params,
          isInstalled: true,
        };
      }
    );

    // Create mock context
    mockContext = {
      locals: new Map([
        ['me', mockElement],
        [
          '_behaviors',
          {
            has: (name: string) => mockBehaviorRegistry.has(name),
            install: mockInstallFn,
          },
        ],
      ]),
      globals: new Map(),
      commandRegistry: {} as any,
      features: {} as any,
      parser: null as any,
    };
  });

  describe('metadata', () => {
    it('should have correct metadata', () => {
      expect(installCmd.name).toBe('install');
      expect(installCmd.metadata.name).toBe('install');
      expect(installCmd.metadata.category).toBe('behaviors');
      expect(installCmd.metadata.examples.length).toBeGreaterThan(0);
    });
  });

  describe('validation', () => {
    it('should validate correct input with behavior name only', () => {
      const input = { behaviorName: 'Removable' };
      const result = installCmd.validation.validate(input);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate correct input with parameters', () => {
      const input = {
        behaviorName: 'Tooltip',
        parameters: { text: 'Help', position: 'top' },
      };
      const result = installCmd.validation.validate(input);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate correct input with target', () => {
      const input = {
        behaviorName: 'Draggable',
        target: '#box',
      };
      const result = installCmd.validation.validate(input);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing behavior name', () => {
      const input = { parameters: {} };
      const result = installCmd.validation.validate(input);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === 'missing-argument')).toBe(true);
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it('should reject non-string behavior name', () => {
      const input = { behaviorName: 123 };
      const result = installCmd.validation.validate(input);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === 'type-mismatch')).toBe(true);
    });

    it('should reject behavior name not starting with uppercase', () => {
      const input = { behaviorName: 'removable' };
      const result = installCmd.validation.validate(input);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === 'validation-error')).toBe(true);
      expect(result.suggestions.some(s => s.includes('PascalCase'))).toBe(true);
    });

    it('should reject invalid behavior name characters', () => {
      const input = { behaviorName: 'My-Behavior' };
      const result = installCmd.validation.validate(input);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === 'validation-error')).toBe(true);
    });

    it('should reject non-object parameters', () => {
      const input = {
        behaviorName: 'Tooltip',
        parameters: 'invalid',
      };
      const result = installCmd.validation.validate(input);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === 'type-mismatch')).toBe(true);
    });

    it('should reject array as parameters', () => {
      const input = {
        behaviorName: 'Tooltip',
        parameters: ['text', 'Help'],
      };
      const result = installCmd.validation.validate(input);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === 'type-mismatch')).toBe(true);
    });

    it('should reject invalid parameter names', () => {
      const input = {
        behaviorName: 'Tooltip',
        parameters: { 'invalid-name': 'value' },
      };
      const result = installCmd.validation.validate(input);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('invalid-name'))).toBe(true);
    });

    it('should accept valid parameter names', () => {
      const input = {
        behaviorName: 'Tooltip',
        parameters: {
          text: 'Help',
          position: 'top',
          delay_ms: 500,
          $priority: 1,
          _internal: true,
        },
      };
      const result = installCmd.validation.validate(input);

      expect(result.isValid).toBe(true);
    });

    it('should reject null input', () => {
      const result = installCmd.validation.validate(null);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === 'syntax-error')).toBe(true);
    });

    it('should reject non-object input', () => {
      const result = installCmd.validation.validate('Removable');

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === 'syntax-error')).toBe(true);
    });
  });

  describe('execute', () => {
    beforeEach(() => {
      // Register a test behavior
      mockBehaviorRegistry.set('Removable', {
        name: 'Removable',
        eventHandlers: [],
      });
      mockBehaviorRegistry.set('Tooltip', {
        name: 'Tooltip',
        parameters: ['text', 'position'],
      });
    });

    it('should install behavior on default target (me)', async () => {
      const input = { behaviorName: 'Removable' };
      const result = await installCmd.execute(input, mockContext);

      expect(result.success).toBe(true);
      expect(result.behaviorName).toBe('Removable');
      expect(result.installedCount).toBe(1);
      expect(result.instances).toHaveLength(1);
    });

    it('should install behavior with parameters', async () => {
      const input = {
        behaviorName: 'Tooltip',
        parameters: { text: 'Help', position: 'top' },
      };
      const result = await installCmd.execute(input, mockContext);

      expect(result.success).toBe(true);
      expect(result.installedCount).toBe(1);

      // Verify install was called with correct parameters
      const installFn = (mockContext.locals.get('_behaviors') as any).install;
      expect(installFn).toHaveBeenCalledWith('Tooltip', mockElement, {
        text: 'Help',
        position: 'top',
      });
    });

    it('should install behavior on explicit element target', async () => {
      const customElement = document.createElement('div');
      customElement.id = 'custom';

      const input = {
        behaviorName: 'Removable',
        target: customElement,
      };
      const result = await installCmd.execute(input, mockContext);

      expect(result.success).toBe(true);
      expect(result.installedCount).toBe(1);

      const installFn = (mockContext.locals.get('_behaviors') as any).install;
      expect(installFn).toHaveBeenCalledWith('Removable', customElement, {});
    });

    it('should install behavior on multiple elements via array', async () => {
      const elem1 = document.createElement('div');
      const elem2 = document.createElement('div');

      const input = {
        behaviorName: 'Removable',
        target: [elem1, elem2],
      };
      const result = await installCmd.execute(input, mockContext);

      expect(result.success).toBe(true);
      expect(result.installedCount).toBe(2);
      expect(result.instances).toHaveLength(2);
    });

    it('should handle "me" string as target', async () => {
      const input = {
        behaviorName: 'Removable',
        target: 'me',
      };
      const result = await installCmd.execute(input, mockContext);

      expect(result.success).toBe(true);
      expect(result.installedCount).toBe(1);
    });

    it('should throw error if behavior is not defined', async () => {
      const input = { behaviorName: 'UndefinedBehavior' };

      await expect(installCmd.execute(input, mockContext)).rejects.toThrow(
        /Behavior "UndefinedBehavior" is not defined/
      );
    });

    it('should throw error if no target elements found', async () => {
      mockContext.locals.delete('me');
      const input = { behaviorName: 'Removable' };

      await expect(installCmd.execute(input, mockContext)).rejects.toThrow(/No target specified/);
    });

    it('should throw error if target array contains no HTMLElements', async () => {
      const input = {
        behaviorName: 'Removable',
        target: ['not', 'elements'],
      };

      await expect(installCmd.execute(input, mockContext)).rejects.toThrow(
        /Target array contains no valid HTMLElements/
      );
    });

    it('should handle CSS selector as target', async () => {
      const elem = document.createElement('div');
      elem.className = 'draggable';
      document.body.appendChild(elem);

      mockBehaviorRegistry.set('Draggable', { name: 'Draggable' });

      const input = {
        behaviorName: 'Draggable',
        target: '.draggable',
      };
      const result = await installCmd.execute(input, mockContext);

      expect(result.success).toBe(true);
      expect(result.installedCount).toBeGreaterThan(0);

      document.body.removeChild(elem);
    });

    it('should throw error for CSS selector with no matches', async () => {
      const input = {
        behaviorName: 'Removable',
        target: '.nonexistent',
      };

      await expect(installCmd.execute(input, mockContext)).rejects.toThrow(
        /No elements found matching selector/
      );
    });

    it('should handle object with element property', async () => {
      const elem = document.createElement('div');
      const wrapper = { element: elem };

      const input = {
        behaviorName: 'Removable',
        target: wrapper,
      };
      const result = await installCmd.execute(input, mockContext);

      expect(result.success).toBe(true);
      expect(result.installedCount).toBe(1);
    });

    it('should throw error for unresolvable target type', async () => {
      const input = {
        behaviorName: 'Removable',
        target: 123,
      };

      await expect(installCmd.execute(input, mockContext)).rejects.toThrow(
        /Cannot resolve target to HTMLElement/
      );
    });

    it('should throw error if behavior not defined when system unavailable', async () => {
      mockContext.locals.delete('_behaviors');

      const input = { behaviorName: 'Removable' };

      // When behavior system is unavailable, it will fail the behavior existence check first
      await expect(installCmd.execute(input, mockContext)).rejects.toThrow(
        /Behavior "Removable" is not defined/
      );
    });
  });

  describe('edge cases', () => {
    beforeEach(() => {
      mockBehaviorRegistry.set('TestBehavior', {
        name: 'TestBehavior',
      });
    });

    it('should handle behavior name with underscores', async () => {
      mockBehaviorRegistry.set('My_Behavior', { name: 'My_Behavior' });

      const input = { behaviorName: 'My_Behavior' };
      const result = await installCmd.execute(input, mockContext);

      expect(result.success).toBe(true);
    });

    it('should handle behavior name with numbers', async () => {
      mockBehaviorRegistry.set('Behavior2', { name: 'Behavior2' });

      const input = { behaviorName: 'Behavior2' };
      const result = await installCmd.execute(input, mockContext);

      expect(result.success).toBe(true);
    });

    it('should handle empty parameters object', async () => {
      const input = {
        behaviorName: 'TestBehavior',
        parameters: {},
      };
      const result = await installCmd.execute(input, mockContext);

      expect(result.success).toBe(true);
    });

    it('should handle complex parameter values', async () => {
      const input = {
        behaviorName: 'TestBehavior',
        parameters: {
          config: { nested: { value: 42 } },
          array: [1, 2, 3],
          callback: () => 'test',
          nullValue: null,
          undefinedValue: undefined,
        },
      };
      const result = await installCmd.execute(input, mockContext);

      expect(result.success).toBe(true);
    });

    it('should handle multiple installations on same element', async () => {
      mockBehaviorRegistry.set('Behavior1', { name: 'Behavior1' });
      mockBehaviorRegistry.set('Behavior2', { name: 'Behavior2' });

      const input1 = { behaviorName: 'Behavior1' };
      const result1 = await installCmd.execute(input1, mockContext);

      const input2 = { behaviorName: 'Behavior2' };
      const result2 = await installCmd.execute(input2, mockContext);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });
  });
});
