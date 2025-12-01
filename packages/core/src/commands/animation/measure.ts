/**
 * MeasureCommand - Standalone V2 Implementation
 *
 * Measures DOM element dimensions, positions, and properties
 *
 * This is a standalone implementation with NO V1 dependencies,
 * enabling true tree-shaking by inlining essential utilities.
 *
 * Features:
 * - Measure element dimensions (width, height)
 * - Measure positions (top, left, x, y)
 * - Measure scroll properties (scrollTop, scrollLeft, scrollWidth, scrollHeight)
 * - Measure client/offset dimensions
 * - Measure CSS properties with * prefix
 * - Store results in variables
 * - Multiple coordinate systems (viewport vs offsetParent)
 *
 * IMPORTANT - Coordinate System Differences:
 * - x/y: Position relative to offsetParent (for drag/positioning within containers)
 * - left/top: Position relative to viewport (for absolute screen positioning)
 * - offsetLeft/offsetTop: Same as x/y (explicit offset positioning)
 *
 * Syntax:
 *   measure
 *   measure <property>
 *   measure <target> <property>
 *   measure <property> and set <variable>
 *
 * @example
 *   measure
 *   measure width
 *   measure #element height
 *   measure scrollTop and set scrollPosition
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import { isHTMLElement } from '../../utils/element-check';

/**
 * Typed input for MeasureCommand
 */
export interface MeasureCommandInput {
  /** Target element (defaults to me) */
  target?: string | HTMLElement;
  /** Property to measure (width, height, etc.) */
  property?: string;
  /** Variable name to store result */
  variable?: string;
}

/**
 * Output from Measure command execution
 */
export interface MeasureCommandOutput {
  element: HTMLElement;
  property: string;
  value: number;
  unit: string;
  stored?: boolean;
}

/**
 * MeasureCommand - Standalone V2 Implementation
 *
 * Self-contained implementation with no V1 dependencies.
 * Achieves tree-shaking by inlining all required utilities.
 *
 * V1 Size: 326 lines (with dom-utils dependency)
 * V2 Target: ~350 lines (inline utilities, standalone)
 */
export class MeasureCommand {
  /**
   * Command name as registered in runtime
   */
  readonly name = 'measure';

  /**
   * Command metadata for documentation and tooling
   */
  static readonly metadata = {
    description: 'Measure DOM element dimensions, positions, and properties',
    syntax: [
      'measure',
      'measure <property>',
      'measure <target> <property>',
      'measure <property> and set <variable>',
    ],
    examples: [
      'measure',
      'measure width',
      'measure #element height',
      'measure scrollTop and set scrollPosition',
      'measure x and set dragX',
    ],
    category: 'animation',
    sideEffects: ['data-mutation'],
  };

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
  ): Promise<MeasureCommandInput> {
    let target: string | HTMLElement | undefined;
    let property: string | undefined;
    let variable: string | undefined;

    // Parse arguments (optional target and/or property)
    if (raw.args && raw.args.length > 0) {
      const firstArgNode = raw.args[0] as any;

      // For measure, identifiers like 'x', 'y', 'width' are property names, not variable lookups
      // So we need to check the node type first
      if (firstArgNode.type === 'identifier' && firstArgNode.name) {
        const name = firstArgNode.name.toLowerCase();
        // Check if it's a special context reference that should resolve to an element
        if (name === 'me' || name === 'it' || name === 'you') {
          const evaluated = await evaluator.evaluate(firstArgNode, context);
          if (isHTMLElement(evaluated)) {
            target = evaluated;
            // Second arg is property
            if (raw.args.length > 1) {
              const secondArg = raw.args[1] as any;
              if (secondArg.type === 'identifier' && secondArg.name) {
                property = secondArg.name;
              } else {
                property = String(await evaluator.evaluate(secondArg, context));
              }
            }
          }
        } else {
          // It's a property name like 'x', 'y', 'width', etc.
          property = firstArgNode.name;
        }
      } else {
        // Not an identifier - evaluate it
        const firstArg = await evaluator.evaluate(firstArgNode, context);

        // Check if first arg is a target element
        if (
          isHTMLElement(firstArg) ||
          (typeof firstArg === 'string' && (
            firstArg.startsWith('#') ||
            firstArg.startsWith('.')
          ))
        ) {
          target = firstArg as string | HTMLElement;

          // Second arg is property
          if (raw.args.length > 1) {
            const secondArgNode = raw.args[1] as any;
            if (secondArgNode.type === 'identifier' && secondArgNode.name) {
              property = secondArgNode.name;
            } else {
              property = String(await evaluator.evaluate(secondArgNode, context));
            }
          }
        } else if (typeof firstArg === 'string') {
          // First arg is property as a string
          property = firstArg;
        }
      }
    }

    // Extract variable from 'set' modifier (after 'and')
    if (raw.modifiers?.set) {
      variable = String(await evaluator.evaluate(raw.modifiers.set, context));
    }

    return {
      target,
      property,
      variable,
    };
  }

  /**
   * Execute the measure command
   *
   * Measures a property of an element and stores the result.
   *
   * @param input - Typed command input from parseInput()
   * @param context - Typed execution context
   * @returns Measurement result with value and unit
   */
  async execute(
    input: MeasureCommandInput,
    context: TypedExecutionContext
  ): Promise<MeasureCommandOutput> {
    const { target, property, variable } = input;

    // Resolve target element (default to context.me)
    const targetElement = await this.resolveElement(target, context);
    if (!targetElement) {
      throw new Error('measure command requires a valid target element');
    }

    // Default property to 'width' if not specified
    const measureProperty = property || 'width';

    // Get the measurement
    const measurement = this.getMeasurement(targetElement, measureProperty);

    // Store in variable if specified
    if (variable) {
      if (context.locals) {
        context.locals.set(variable, measurement.value);
      }
    }

    // Set the result in context.it
    Object.assign(context, { it: measurement.value });

    // Return format that runtime unwraps properly: { result, wasAsync }
    // This ensures context.it is set to the numeric value, not the full metadata object
    return {
      result: measurement.value,
      wasAsync: false,
      // Metadata for debugging/tooling
      element: targetElement,
      property: measureProperty,
      value: measurement.value,
      unit: measurement.unit,
      stored: !!variable,
    };
  }

  // ========== Private Utility Methods ==========

  /**
   * Resolve target element from various input types
   *
   * @param target - Target (element, selector, context ref, or undefined for me)
   * @param context - Execution context
   * @returns Resolved HTML element
   * @throws Error if element cannot be resolved
   */
  private async resolveElement(
    target: string | HTMLElement | undefined,
    context: TypedExecutionContext
  ): Promise<HTMLElement> {
    // If target is already an HTMLElement, return it
    if (isHTMLElement(target)) {
      return target as HTMLElement;
    }

    // If no target specified, use context.me
    if (!target) {
      const me = context.me;
      if (!me) {
        throw new Error('No target element - provide explicit target or ensure context.me is set');
      }
      return this.asHTMLElement(me);
    }

    // Handle string targets (context refs or CSS selectors)
    if (typeof target === 'string') {
      const trimmed = target.trim();

      // Handle context references
      if (trimmed === 'me') {
        if (!context.me) {
          throw new Error('Context reference "me" is not available');
        }
        return this.asHTMLElement(context.me);
      }

      if (trimmed === 'it') {
        if (!isHTMLElement(context.it)) {
          throw new Error('Context reference "it" is not an HTMLElement');
        }
        return context.it as HTMLElement;
      }

      if (trimmed === 'you') {
        if (!context.you) {
          throw new Error('Context reference "you" is not available');
        }
        return this.asHTMLElement(context.you);
      }

      // Handle CSS selector
      if (typeof document !== 'undefined') {
        const element = document.querySelector(trimmed);
        if (!element) {
          throw new Error(`Element not found with selector: ${trimmed}`);
        }
        if (!isHTMLElement(element)) {
          throw new Error(`Element found but is not an HTMLElement: ${trimmed}`);
        }
        return element as HTMLElement;
      }

      throw new Error('DOM not available - cannot resolve element selector');
    }

    throw new Error(`Invalid target type: ${typeof target}`);
  }

  /**
   * Convert value to HTMLElement
   *
   * @param value - Value to convert
   * @returns HTMLElement
   * @throws Error if value is not an HTMLElement
   */
  private asHTMLElement(value: unknown): HTMLElement {
    if (isHTMLElement(value)) {
      return value as HTMLElement;
    }
    throw new Error('Value is not an HTMLElement');
  }

  /**
   * Get measurement for a specific property
   *
   * @param element - Element to measure
   * @param property - Property name to measure
   * @returns Measurement value and unit
   */
  private getMeasurement(element: HTMLElement, property: string): { value: number; unit: string } {
    const computedStyle = getComputedStyle(element);

    // Handle CSS property shorthand syntax: *property (e.g., *opacity, *background-color)
    if (property.startsWith('*')) {
      const cssPropertyName = property.substring(1);
      const value = computedStyle.getPropertyValue(cssPropertyName);

      // Try to parse as number
      const numericValue = parseFloat(value);
      if (!isNaN(numericValue)) {
        // Extract unit from value
        const unitMatch = value.match(/([a-zA-Z%]+)$/);
        const unit = unitMatch ? unitMatch[1] : '';
        return { value: numericValue, unit };
      }

      // Return string value as-is for non-numeric properties
      return { value: value as any, unit: '' };
    }

    const prop = property.toLowerCase();

    // Get bounding rect for position/size measurements
    const rect = element.getBoundingClientRect();

    switch (prop) {
      // Dimension measurements
      case 'width':
        return { value: rect.width, unit: 'px' };

      case 'height':
        return { value: rect.height, unit: 'px' };

      // Viewport-relative positions
      case 'top':
        return { value: rect.top, unit: 'px' };

      case 'left':
        return { value: rect.left, unit: 'px' };

      case 'right':
        return { value: rect.right, unit: 'px' };

      case 'bottom':
        return { value: rect.bottom, unit: 'px' };

      // OffsetParent-relative positions (for dragging/positioning)
      case 'x':
        return { value: element.offsetLeft, unit: 'px' };

      case 'y':
        return { value: element.offsetTop, unit: 'px' };

      // Client dimensions (content + padding)
      case 'clientwidth':
      case 'client-width':
        return { value: element.clientWidth, unit: 'px' };

      case 'clientheight':
      case 'client-height':
        return { value: element.clientHeight, unit: 'px' };

      // Offset dimensions (content + padding + border)
      case 'offsetwidth':
      case 'offset-width':
        return { value: element.offsetWidth, unit: 'px' };

      case 'offsetheight':
      case 'offset-height':
        return { value: element.offsetHeight, unit: 'px' };

      // Scroll dimensions
      case 'scrollwidth':
      case 'scroll-width':
        return { value: element.scrollWidth, unit: 'px' };

      case 'scrollheight':
      case 'scroll-height':
        return { value: element.scrollHeight, unit: 'px' };

      // Scroll positions
      case 'scrolltop':
      case 'scroll-top':
        return { value: element.scrollTop, unit: 'px' };

      case 'scrollleft':
      case 'scroll-left':
        return { value: element.scrollLeft, unit: 'px' };

      // Offset positions
      case 'offsettop':
      case 'offset-top':
        return { value: element.offsetTop, unit: 'px' };

      case 'offsetleft':
      case 'offset-left':
        return { value: element.offsetLeft, unit: 'px' };

      // CSS property measurements (fallback)
      default:
        const cssValue = computedStyle.getPropertyValue(property);
        const numericValue = parseFloat(cssValue);

        if (!isNaN(numericValue)) {
          // Extract unit from CSS value
          const unitMatch = cssValue.match(/([a-zA-Z%]+)$/);
          const unit = unitMatch ? unitMatch[1] : 'px';
          return { value: numericValue, unit };
        }

        // Return 0 if cannot parse
        return { value: 0, unit: 'px' };
    }
  }
}

/**
 * Factory function to create MeasureCommand instance
 */
export function createMeasureCommand(): MeasureCommand {
  return new MeasureCommand();
}
