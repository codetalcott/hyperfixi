/**
 * InstallCommand - Standalone V2 Implementation
 *
 * Installs a behavior on an element with optional parameters
 *
 * This is a standalone implementation with NO V1 dependencies,
 * enabling true tree-shaking by inlining essential utilities.
 *
 * Features:
 * - Behavior installation on elements
 * - Parameter passing to behaviors
 * - Target resolution (me, selector, element, array)
 * - Behavior registry integration
 * - PascalCase validation
 * - Multiple target support
 *
 * Syntax:
 *   install <BehaviorName>
 *   install <BehaviorName> on <element>
 *   install <BehaviorName>(param: value, param2: value2)
 *   install <BehaviorName>(param: value) on <element>
 *
 * @example
 *   install Removable
 *   install Draggable on #box
 *   install Tooltip(text: "Help", position: "top")
 *   install Sortable(axis: "y") on .list
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import { isHTMLElement } from '../../utils/element-check';

/**
 * Typed input for InstallCommand
 */
export interface InstallCommandInput {
  /** Behavior name (PascalCase) */
  behaviorName: string;
  /** Optional parameters for behavior */
  parameters?: Record<string, unknown>;
  /** Target element(s) to install on (defaults to 'me') */
  target?: unknown;
}

/**
 * Output from install command execution
 */
export interface InstallCommandOutput {
  success: boolean;
  behaviorName: string;
  installedCount: number;
  instances: unknown[];
}

/**
 * InstallCommand - Standalone V2 Implementation
 *
 * Self-contained implementation with no V1 dependencies.
 * Achieves tree-shaking by inlining all required utilities.
 *
 * V1 Size: 321 lines
 * V2 Target: ~310 lines (inline utilities, standalone)
 */
export class InstallCommand {
  /**
   * Command name as registered in runtime
   */
  readonly name = 'install';

  /**
   * Command metadata for documentation and tooling
   */
  static readonly metadata = {
    description: 'Install a behavior on an element with optional parameters',
    syntax: [
      'install <BehaviorName>',
      'install <BehaviorName> on <element>',
      'install <BehaviorName>(param: value)',
      'install <BehaviorName>(param: value) on <element>',
    ],
    examples: [
      'install Removable',
      'install Draggable on #box',
      'install Tooltip(text: "Help", position: "top")',
      'install Sortable(axis: "y") on .list',
      'install MyBehavior(foo: 42) on the first <div/>',
    ],
    category: 'behaviors',
    sideEffects: ['behavior-installation', 'element-modification'],
  } as const;

  /**
   * Instance accessor for metadata (backward compatibility)
   */
  get metadata() {
    return InstallCommand.metadata;
  }

  /**
   * Parse raw AST nodes into typed command input
   *
   * @param raw - Raw command node with args and modifiers from AST
   * @param evaluator - Expression evaluator for evaluating AST nodes
   * @param context - Execution context with me, you, it, etc.
   * @returns Typed input object for execute()
   */
  async parseInput(
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<InstallCommandInput> {
    if (raw.args.length < 1) {
      throw new Error('install command requires a behavior name');
    }

    // First arg is behavior name
    // For "install Draggable", the behavior name is an identifier node
    // that should NOT be evaluated (which would return undefined for an undefined variable)
    const firstArg = raw.args[0] as any;
    let behaviorName: string;

    if (firstArg?.type === 'identifier' && typeof firstArg.name === 'string') {
      // Extract identifier name directly (e.g., "Draggable")
      behaviorName = firstArg.name;
    } else {
      // Evaluate for other node types (e.g., string literals)
      behaviorName = String(await evaluator.evaluate(firstArg, context));
    }

    // Validate PascalCase
    if (!/^[A-Z][a-zA-Z0-9_]*$/.test(behaviorName)) {
      throw new Error(`Behavior name must be PascalCase (start with uppercase): "${behaviorName}"`);
    }

    // Second arg (if present) is parameters object
    let parameters: Record<string, unknown> | undefined;
    if (raw.args.length >= 2) {
      const params = await evaluator.evaluate(raw.args[1], context);
      if (params && typeof params === 'object' && !Array.isArray(params)) {
        parameters = params as Record<string, unknown>;

        // Validate parameter names
        for (const paramName of Object.keys(parameters)) {
          if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(paramName)) {
            throw new Error(`Invalid parameter name: "${paramName}"`);
          }
        }
      }
    }

    // Check for "on" modifier (target)
    let target: unknown;
    if (raw.modifiers?.on) {
      target = await evaluator.evaluate(raw.modifiers.on, context);
    }

    return {
      behaviorName,
      parameters,
      target,
    };
  }

  /**
   * Execute the install command
   *
   * Installs a behavior on target element(s).
   *
   * @param input - Typed command input from parseInput()
   * @param context - Typed execution context
   * @returns Installation result
   */
  async execute(
    input: InstallCommandInput,
    context: TypedExecutionContext
  ): Promise<InstallCommandOutput> {
    const { behaviorName, parameters = {}, target } = input;

    try {
      // Resolve target element(s)
      const targetElements = this.resolveTarget(target, context);

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
        `Failed to install behavior "${behaviorName}": ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  // ========== Private Utility Methods ==========

  /**
   * Resolve the target element(s) for installation
   *
   * @param target - Target element(s) or selector
   * @param context - Execution context
   * @returns Array of HTMLElements
   */
  private resolveTarget(target: unknown, context: TypedExecutionContext): HTMLElement[] {
    // If no target specified, use 'me' (current element)
    if (target === undefined || target === null) {
      const me = context.me || context.locals.get('me');
      if (isHTMLElement(me)) {
        return [me as HTMLElement];
      }
      throw new Error('No target specified and "me" is not available in context');
    }

    // If already an HTMLElement
    if (isHTMLElement(target)) {
      return [target as HTMLElement];
    }

    // If array of elements
    if (Array.isArray(target)) {
      const elements = target.filter((t): t is HTMLElement => isHTMLElement(t));
      if (elements.length === 0) {
        throw new Error('Target array contains no valid HTMLElements');
      }
      return elements;
    }

    // If string (CSS selector or 'me')
    if (typeof target === 'string') {
      if (target === 'me') {
        const me = context.me || context.locals.get('me');
        if (isHTMLElement(me)) {
          return [me as HTMLElement];
        }
        throw new Error('"me" is not available in context');
      }

      // Query document for selector
      if (typeof document !== 'undefined') {
        const elements = document.querySelectorAll(target);
        const htmlElements = Array.from(elements).filter((el): el is HTMLElement =>
          isHTMLElement(el)
        );
        if (htmlElements.length === 0) {
          throw new Error(`No elements found matching selector: "${target}"`);
        }
        return htmlElements;
      }
      throw new Error('document is not available (not in browser environment)');
    }

    // Handle NodeList
    if (target && typeof target === 'object' && 'length' in target) {
      const elements = Array.from(target as any).filter((t): t is HTMLElement => isHTMLElement(t));
      if (elements.length === 0) {
        throw new Error('Target collection contains no valid HTMLElements');
      }
      return elements;
    }

    // If it's an object with element property (some wrapper type)
    if (typeof target === 'object' && 'element' in target) {
      const element = (target as any).element;
      if (isHTMLElement(element)) {
        return [element as HTMLElement];
      }
    }

    throw new Error(`Cannot resolve target to HTMLElement(s): ${String(target)}`);
  }

  /**
   * Check if behavior is defined in registry
   *
   * @param behaviorName - Name of behavior to check
   * @param context - Execution context
   * @returns True if behavior exists
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
   *
   * @param behaviorName - Name of behavior to install
   * @param element - Target element
   * @param parameters - Behavior parameters
   * @param context - Execution context
   * @returns Behavior instance
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

/**
 * Factory function to create InstallCommand instance
 */
export function createInstallCommand(): InstallCommand {
  return new InstallCommand();
}
