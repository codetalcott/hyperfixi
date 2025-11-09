/**
 * Install Command Implementation
 * Installs a behavior on an element
 *
 * Syntax:
 *   install <BehaviorName>
 *   install <BehaviorName> on <element>
 *   install <BehaviorName>(param: value, param2: value2)
 *   install <BehaviorName>(param: value) on <element>
 *
 * Examples:
 *   install Removable
 *   install Draggable on #box
 *   install Tooltip(text: "Help", position: "top")
 *   install Sortable(axis: "y") on .list
 *
 * This implements the official _hyperscript install command for behaviors
 * See: https://hyperscript.org/features/behavior/
 */

import type { CommandImplementation } from '../../types/core';
import type { TypedExecutionContext } from '../../types/command-types';
import type { UnifiedValidationResult } from '../../types/unified-types';
import type { ValidationError } from '../../types/base-types';

// Input type definition
export interface InstallCommandInput {
  behaviorName: string;
  parameters?: Record<string, unknown>;
  target?: unknown; // Element or expression that resolves to element(s)
}

// Output type definition
export interface InstallCommandOutput {
  success: boolean;
  behaviorName: string;
  installedCount: number;
  instances: unknown[];
}

/**
 * Install Command with full type safety and validation
 * Connects hyperscript syntax to programmatic behaviors API
 */
export class InstallCommand
  implements CommandImplementation<InstallCommandInput, InstallCommandOutput, TypedExecutionContext>
{
  name = 'install';

  metadata = {
    name: 'install',
    description:
      'Installs a behavior on an element. Behaviors are reusable bundles of hyperscript code that can be attached to elements.',
    examples: [
      'install Removable',
      'install Draggable on #box',
      'install Tooltip(text: "Help", position: "top")',
      'install Sortable(axis: "y") on .list',
      'install MyBehavior(foo: 42) on the first <div/>',
    ],
    syntax:
      'install <BehaviorName> | install <BehaviorName>(<params>) | install <BehaviorName> on <element> | install <BehaviorName>(<params>) on <element>',
    category: 'behaviors' as const,
    version: '1.0.0',
  };

  validation = {
    validate(input: unknown): UnifiedValidationResult<InstallCommandInput> {
      const errors: ValidationError[] = [];

      if (!input || typeof input !== 'object') {
        return {
          isValid: false,
          errors: [
            {
              type: 'syntax-error',
              message: 'Install command requires an object input',
              suggestions: ['Provide an object with behaviorName and optional parameters/target'],
            },
          ],
          suggestions: ['Provide an object with behaviorName and optional parameters/target'],
        };
      }

      const inputObj = input as any;

      // Validate behavior name is present and is a string
      if (!inputObj.behaviorName) {
        errors.push({
          type: 'missing-argument',
          message: 'Install command requires a behavior name',
          suggestions: ['Provide the name of a behavior to install'],
        });
      } else if (typeof inputObj.behaviorName !== 'string') {
        errors.push({
          type: 'type-mismatch',
          message: 'Behavior name must be a string',
          suggestions: ['Provide a valid behavior name as a string'],
        });
      } else if (!/^[A-Z][a-zA-Z0-9_]*$/.test(inputObj.behaviorName)) {
        errors.push({
          type: 'validation-error',
          message:
            'Behavior name must start with uppercase letter and contain only letters, numbers, and underscores',
          suggestions: [
            'Use PascalCase for behavior names (e.g., "Removable", "MyBehavior")',
            'Behavior names should start with a capital letter',
          ],
        });
      }

      // Validate parameters if provided
      if (inputObj.parameters !== undefined) {
        if (
          typeof inputObj.parameters !== 'object' ||
          inputObj.parameters === null ||
          Array.isArray(inputObj.parameters)
        ) {
          errors.push({
            type: 'type-mismatch',
            message: 'Parameters must be an object with key-value pairs',
            suggestions: ['Provide parameters as { key: value, ... }'],
          });
        } else {
          // Validate parameter names are valid identifiers
          for (const paramName of Object.keys(inputObj.parameters)) {
            if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(paramName)) {
              errors.push({
                type: 'validation-error',
                message: `Invalid parameter name: "${paramName}"`,
                suggestions: ['Parameter names must be valid JavaScript identifiers'],
              });
            }
          }
        }
      }

      // Target validation is light - will be resolved at execution time
      // (could be 'me', CSS selector, or expression)

      if (errors.length > 0) {
        return {
          isValid: false,
          errors,
          suggestions: errors.flatMap(e => e.suggestions || []),
        };
      }

      return {
        isValid: true,
        data: inputObj as InstallCommandInput,
        errors: [],
        suggestions: [],
      };
    },
  };

  async execute(
    input: InstallCommandInput,
    context: TypedExecutionContext
  ): Promise<InstallCommandOutput> {
    const { behaviorName, parameters = {}, target } = input;

    try {
      // Resolve target element(s)
      const targetElements = await this.resolveTarget(target, context);

      if (targetElements.length === 0) {
        throw new Error('No target elements found to install behavior on');
      }

      // Check if behavior is defined
      const exists = this.behaviorExists(behaviorName, context);

      if (!exists) {
        throw new Error(
          `Behavior "${behaviorName}" is not defined. Define it using the 'behavior' keyword before installing.`
        );
      }

      // Install behavior on each target element
      const instances = [];
      for (const element of targetElements) {
        const instance = await this.installBehavior(behaviorName, element, parameters, context);
        instances.push(instance);
      }

      return {
        success: true,
        behaviorName,
        installedCount: instances.length,
        instances,
      };
    } catch (error) {
      throw new Error(
        `Failed to install behavior "${behaviorName}": ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Resolve the target element(s) for installation
   * Returns array of HTMLElements
   */
  private async resolveTarget(
    target: unknown,
    context: TypedExecutionContext
  ): Promise<HTMLElement[]> {
    // If no target specified, use 'me' (current element)
    if (target === undefined || target === null) {
      // Check context.me first (primary location), then fall back to locals
      const me = context.me || context.locals.get('me');
      if (me instanceof HTMLElement) {
        return [me];
      }
      throw new Error('No target specified and "me" is not available in context');
    }

    // If already an HTMLElement
    if (target instanceof HTMLElement) {
      return [target];
    }

    // If array of elements
    if (Array.isArray(target)) {
      const elements = target.filter(t => t instanceof HTMLElement);
      if (elements.length === 0) {
        throw new Error('Target array contains no valid HTMLElements');
      }
      return elements;
    }

    // If string (CSS selector)
    if (typeof target === 'string') {
      if (target === 'me') {
        // Check context.me first (primary location), then fall back to locals
        const me = context.me || context.locals.get('me');
        if (me instanceof HTMLElement) {
          return [me];
        }
        throw new Error('"me" is not available in context');
      }

      // Query document for selector
      if (typeof document !== 'undefined') {
        const elements = document.querySelectorAll(target);
        const htmlElements = Array.from(elements).filter(el => el instanceof HTMLElement);
        if (htmlElements.length === 0) {
          throw new Error(`No elements found matching selector: "${target}"`);
        }
        return htmlElements;
      }
      throw new Error('document is not available (not in browser environment)');
    }

    // If it's an object with element property (some wrapper type)
    if (typeof target === 'object' && 'element' in target) {
      const element = (target as any).element;
      if (element instanceof HTMLElement) {
        return [element];
      }
    }

    throw new Error(`Cannot resolve target to HTMLElement(s): ${String(target)}`);
  }

  /**
   * Check if behavior is defined
   */
  private behaviorExists(behaviorName: string, context: TypedExecutionContext): boolean {
    // Check context for behaviors registry
    const behaviorRegistry = context.locals.get('_behaviors');
    if (behaviorRegistry && typeof behaviorRegistry === 'object') {
      const registry = behaviorRegistry as Map<string, unknown>;
      return registry.has(behaviorName);
    }

    // Check global hyperscript runtime if available
    if (typeof globalThis !== 'undefined') {
      const hyperscriptGlobal = (globalThis as any)._hyperscript;
      if (hyperscriptGlobal?.behaviors) {
        return hyperscriptGlobal.behaviors.has(behaviorName);
      }
    }

    return false;
  }

  /**
   * Install behavior on element using programmatic API
   */
  private async installBehavior(
    behaviorName: string,
    element: HTMLElement,
    parameters: Record<string, unknown>,
    context: TypedExecutionContext
  ): Promise<unknown> {
    // Get behaviors registry from context
    const behaviorRegistry = context.locals.get('_behaviors');
    if (behaviorRegistry && typeof behaviorRegistry === 'object') {
      const registry = behaviorRegistry as any;
      if (registry.install && typeof registry.install === 'function') {
        return await registry.install(behaviorName, element, parameters);
      }
    }

    // Fallback to global hyperscript runtime
    if (typeof globalThis !== 'undefined') {
      const hyperscriptGlobal = (globalThis as any)._hyperscript;
      if (hyperscriptGlobal?.behaviors?.install) {
        return await hyperscriptGlobal.behaviors.install(behaviorName, element, parameters);
      }
    }

    throw new Error('Behavior system not available in context');
  }
}

// Export singleton instance for registration
export const installCommand = new InstallCommand();
