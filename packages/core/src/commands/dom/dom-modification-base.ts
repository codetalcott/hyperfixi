/**
 * DOMModificationBase - Shared logic for add/remove commands
 *
 * This base class contains common patterns for DOM modification commands
 * that handle classes, attributes, and styles.
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import type { DecoratedCommand, CommandMetadata } from '../decorators';
import { resolveTargetsFromArgs } from '../helpers/element-resolution';
import { parseClasses } from '../helpers/class-manipulation';
import { isAttributeSyntax } from '../helpers/attribute-manipulation';
import { isCSSPropertySyntax } from '../helpers/style-manipulation';
import { evaluateFirstArg } from '../helpers/selector-type-detection';
import { isValidTargetArray, isValidStringArray, isValidType } from '../helpers/input-validator';

/** Mode type for DOM modification */
export type DOMModificationMode = 'add' | 'remove';

/** Base input types shared between add and remove */
export type ClassModificationInput = {
  type: 'classes';
  classes: string[];
  targets: HTMLElement[];
};

export type AttributeModificationInput = {
  type: 'attribute';
  name: string;
  value?: string; // Only used by add
  targets: HTMLElement[];
};

export type StyleModificationInput = {
  type: 'styles';
  styles?: Record<string, string>; // Used by add
  properties?: string[]; // Used by remove
  targets: HTMLElement[];
};

export type ElementRemovalInput = {
  type: 'element';
  targets: HTMLElement[];
};

/** Raw input type for parseInput */
export interface RawCommandInput {
  args: ASTNode[];
  modifiers: Record<string, ExpressionNode>;
  commandName?: string;
}

/**
 * Abstract base class for DOM modification commands (add, remove)
 */
export abstract class DOMModificationBase implements DecoratedCommand {
  declare readonly name: string;
  declare readonly metadata: CommandMetadata;

  /** Subclasses define their mode */
  protected abstract readonly mode: DOMModificationMode;

  /** Subclasses define the preposition keyword (to/from) */
  protected abstract readonly preposition: string;

  /**
   * Shared: Resolve targets from remaining args
   */
  protected async resolveTargets(
    args: ASTNode[],
    evaluator: ExpressionEvaluator,
    context: ExecutionContext,
    modifiers: Record<string, ExpressionNode>
  ): Promise<HTMLElement[]> {
    return resolveTargetsFromArgs(
      args,
      evaluator,
      context,
      this.mode,
      { filterPrepositions: true, fallbackModifierKey: this.preposition },
      modifiers
    );
  }

  /**
   * Shared: Evaluate first argument with class selector handling
   */
  protected async evaluateFirst(
    arg: ASTNode,
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<{ value: unknown }> {
    return evaluateFirstArg(arg, evaluator, context);
  }

  /**
   * Shared: Parse class names from value
   */
  protected parseClassNames(value: unknown): string[] {
    return parseClasses(value);
  }

  /**
   * Shared: Check if value is attribute syntax
   */
  protected isAttribute(value: string): boolean {
    return isAttributeSyntax(value.trim());
  }

  /**
   * Shared: Check if value is CSS property syntax
   */
  protected isCSSProperty(value: string): boolean {
    return isCSSPropertySyntax(value.trim());
  }

  /**
   * Shared base validation for targets
   */
  protected validateTargets(targets: unknown): targets is HTMLElement[] {
    return Array.isArray(targets) && isValidTargetArray(targets);
  }

  /**
   * Shared validation for type discriminator
   */
  protected validateType<T extends string>(type: unknown, validTypes: readonly T[]): type is T {
    return isValidType(type, validTypes);
  }

  /**
   * Shared validation for string arrays
   */
  protected validateStringArray(arr: unknown, minLength = 1): arr is string[] {
    return Array.isArray(arr) && isValidStringArray(arr, minLength);
  }
}
