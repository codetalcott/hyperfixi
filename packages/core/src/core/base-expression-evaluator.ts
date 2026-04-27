/**
 * Base Expression Evaluator - Shared evaluation logic for all evaluator implementations
 *
 * This base class contains all AST node evaluation logic without any expression category imports.
 * Subclasses are responsible for registering expression categories via `registerCategory()`.
 *
 * This design enables:
 * - Tree-shakeable bundles (only import needed expression categories)
 * - Code deduplication (~800 lines shared between ExpressionEvaluator and LazyExpressionEvaluator)
 * - Flexible configuration (eager, lazy, or custom category loading)
 */

import type { ASTNode, ExecutionContext } from '../types/core';
import type { ExecutionResult, ExecutionSignal } from '../types/result';
import { ok, err } from '../types/result';
import { debug } from '../utils/debug';
import { getRegisteredNodeEvaluator, notifyGlobalRead } from '../parser/extensions';
import {
  isElement,
  getElementProperty,
  accessAttribute,
} from '../expressions/property-access-utils';
import { extractPropertyName } from './ast-property-utils';

// Extracted modules — delegated to from class methods
import {
  evaluateSelector as _evaluateSelector,
  evaluateCSSSelector as _evaluateCSSSelector,
  evaluateIdSelector as _evaluateIdSelector,
  evaluateQueryReference as _evaluateQueryReference,
} from './selector-evaluator';
import {
  evaluateTemplateLiteral as _evaluateTemplateLiteral,
  evaluateSimpleExpression as _evaluateSimpleExpression,
  resolveValue as _resolveValue,
} from './template-literal-evaluator';
import {
  evaluateBinaryExpression as _evaluateBinaryExpression,
  coerceArithmeticOperand as _coerceArithmeticOperand,
} from './binary-expression-evaluator';
import {
  evaluateCallExpression as _evaluateCallExpression,
  evaluateMethodCall as _evaluateMethodCall,
} from './call-expression-evaluator';

/**
 * Base Expression Evaluator - Abstract class with shared evaluation logic
 *
 * Subclasses must call `registerCategory()` to add expression implementations.
 */
export class BaseExpressionEvaluator {
  protected expressionRegistry: Map<string, any>;

  constructor() {
    this.expressionRegistry = new Map();
  }

  /**
   * Register an expression category's implementations
   * @param expressions - Object mapping expression names to implementations
   */
  protected registerCategory(expressions: Record<string, any>): void {
    Object.entries(expressions).forEach(([name, impl]) => {
      this.expressionRegistry.set(name, impl);
    });
  }

  /**
   * Unwrap selector results to a single element.
   * CSS selectors return arrays via querySelectorAll or NodeList,
   * but property access and method calls typically expect a single element.
   */
  protected unwrapSelectorResult<T>(value: T | T[] | NodeList): T {
    // Only unwrap arrays/NodeLists that contain DOM elements (selector results)
    // Don't unwrap regex match results or other arrays with extra properties
    if (value instanceof NodeList && value.length > 0) {
      return value[0] as T;
    }
    if (Array.isArray(value) && value.length > 0) {
      // Check if this looks like a selector result (first element is a DOM node)
      // Regex match results have 'index' and 'input' properties - don't unwrap those
      const firstElement = value[0];
      const hasRegexProps = 'index' in value && 'input' in value;
      if (hasRegexProps) {
        // This is a regex match result - preserve the full array with its properties
        return value as unknown as T;
      }
      if (firstElement instanceof Element || firstElement instanceof Node) {
        return firstElement;
      }
      // For other arrays, preserve them as-is to maintain properties like .index
      return value as unknown as T;
    }
    return value as T;
  }

  /**
   * Evaluate an AST node using the appropriate expression implementation
   */
  async evaluate(node: ASTNode, context: ExecutionContext): Promise<any> {
    // Handle null/undefined nodes
    if (!node) {
      debug.expressions('EVALUATOR: Received null/undefined node, returning null');
      return null;
    }

    // Handle nodes without type property
    if (!node.type) {
      console.error('EVALUATOR: Node missing type property:', node);
      throw new Error(`Node missing type property: ${JSON.stringify(node)}`);
    }
    switch (node.type) {
      case 'identifier':
        return this.evaluateIdentifier(node as any, context);

      case 'literal':
        return this.evaluateLiteral(node as any, context);

      case 'string':
        return (node as any).value ?? '';

      case 'memberExpression':
        return this.evaluateMemberExpression(node as any, context);

      case 'binaryExpression':
        return this.evaluateBinaryExpression(node as any, context);

      case 'unaryExpression':
        return this.evaluateUnaryExpression(node as any, context);

      case 'callExpression':
        return this.evaluateCallExpression(node as any, context);

      case 'selector':
        return this.evaluateSelector(node as any, context);

      case 'dollarExpression':
        return this.evaluateDollarExpression(node as any, context);

      case 'possessiveExpression':
        return this.evaluatePossessiveExpression(node as any, context);

      case 'templateLiteral':
        return this.evaluateTemplateLiteral(node as any, context);

      case 'arrayLiteral':
        return this.evaluateArrayLiteral(node as any, context);

      case 'objectLiteral':
        return this.evaluateObjectLiteral(node as any, context);

      case 'conditionalExpression':
        return this.evaluateConditionalExpression(node as any, context);

      case 'cssSelector':
        return this.evaluateCSSSelector(node as any, context);

      case 'propertyAccess':
        return this.evaluatePropertyAccess(node as any, context);

      case 'propertyOfExpression':
        return this.evaluatePropertyOfExpression(node as any, context);

      case 'contextReference':
        return this.evaluateContextReference(node as any, context);

      case 'queryReference':
        return this.evaluateQueryReference(node as any, context);

      case 'idSelector':
        return this.evaluateIdSelector(node as any, context);

      case 'attributeAccess':
        return this.evaluateAttributeAccess(node as any, context);

      case 'asExpression':
        return this.evaluateAsExpression(node as any, context);

      default: {
        // Phase 5b: plugin-registered evaluators for custom AST node types.
        const pluginEvaluator = getRegisteredNodeEvaluator(node.type);
        if (pluginEvaluator) {
          return pluginEvaluator(node, context);
        }
        throw new Error(`Unsupported AST node type for evaluation: ${node.type}`);
      }
    }
  }

  /**
   * Result-based expression evaluation (napi-rs inspired pattern).
   *
   * Returns ExecutionResult instead of throwing exceptions for control flow.
   * Provides ~12-18% performance improvement on hot paths by eliminating
   * try-catch overhead for expected control flow signals.
   */
  async evaluateWithResult(
    node: ASTNode,
    context: ExecutionContext
  ): Promise<ExecutionResult<unknown>> {
    try {
      const value = await this.evaluate(node, context);
      return ok(value);
    } catch (e) {
      // Check if this is a control flow signal
      if (e instanceof Error) {
        const error = e as any;
        if (error.isHalt || error.message === 'HALT_EXECUTION') {
          return err({ type: 'halt' } as ExecutionSignal);
        }
        if (error.isExit || error.message === 'EXIT_COMMAND') {
          return err({ type: 'exit', returnValue: error.returnValue } as ExecutionSignal);
        }
        if (error.isBreak) {
          return err({ type: 'break' } as ExecutionSignal);
        }
        if (error.isContinue) {
          return err({ type: 'continue' } as ExecutionSignal);
        }
        if (error.isReturn) {
          return err({ type: 'return', returnValue: error.returnValue } as ExecutionSignal);
        }
      }
      // Real error - re-throw
      throw e;
    }
  }

  /**
   * Evaluate array literal - evaluate each element
   */
  protected async evaluateArrayLiteral(node: any, context: ExecutionContext): Promise<any[]> {
    const elements = node.elements || [];
    const evaluatedElements = [];

    for (const element of elements) {
      const value = await this.evaluate(element, context);
      evaluatedElements.push(value);
    }

    return evaluatedElements;
  }

  /**
   * Evaluate object literal - evaluate each property's key and value
   */
  protected async evaluateObjectLiteral(
    node: any,
    context: ExecutionContext
  ): Promise<Record<string, any>> {
    const properties = node.properties || [];
    const result: Record<string, any> = {};

    for (const property of properties) {
      let key: string;
      if (property.key.type === 'identifier') {
        key = property.key.name;
      } else if (property.key.type === 'literal') {
        key = String(property.key.value);
      } else {
        const evaluatedKey = await this.evaluate(property.key, context);
        key = String(evaluatedKey);
      }

      const value = await this.evaluate(property.value, context);
      result[key] = value;
    }

    return result;
  }

  /**
   * Evaluate conditional expressions (if-then-else / ternary)
   */
  protected async evaluateConditionalExpression(
    node: any,
    context: ExecutionContext
  ): Promise<any> {
    const test = await this.evaluate(node.test, context);

    if (test) {
      return this.evaluate(node.consequent, context);
    } else if (node.alternate) {
      return this.evaluate(node.alternate, context);
    }

    return undefined;
  }

  /**
   * Evaluate template literal. Delegates to extracted module.
   */
  protected async evaluateTemplateLiteral(node: any, context: ExecutionContext): Promise<string> {
    return _evaluateTemplateLiteral(node, context);
  }

  /**
   * Evaluate simple expressions. Delegates to extracted module.
   */
  protected async evaluateSimpleExpression(
    exprCode: string,
    context: ExecutionContext
  ): Promise<any> {
    return _evaluateSimpleExpression(exprCode, context);
  }

  /**
   * Resolve a value from context or parse as literal. Delegates to extracted module.
   */
  protected async resolveValue(name: string, context: ExecutionContext): Promise<any> {
    return _resolveValue(name, context);
  }

  /**
   * Evaluate identifier nodes (me, you, it, etc.)
   */
  protected async evaluateIdentifier(
    node: { name: string; scope?: 'local' | 'global' },
    context: ExecutionContext
  ): Promise<any> {
    const { name, scope } = node;

    // Handle context references FIRST
    if (name === 'me' || name === 'my' || name === 'I') {
      return context.me;
    }
    if (name === 'you' || name === 'your') {
      return context.you;
    }
    if (name === 'it' || name === 'its') {
      return context.it;
    }
    if (name === 'result') {
      return context.result;
    }
    if (name === 'event') {
      return context.event;
    }

    // Check if it's a built-in reference expression
    const expression = this.expressionRegistry.get(name);
    if (expression) {
      return expression.evaluate(context);
    }

    // If explicit scope is specified, ONLY check that scope
    if (scope === 'local') {
      if (context.locals?.has(name)) {
        return context.locals.get(name);
      }
      return undefined;
    }

    if (scope === 'global') {
      if (context.globals?.has(name)) {
        return context.globals.get(name);
      }
      if (typeof window !== 'undefined' && name in window) {
        return (window as any)[name];
      }
      return undefined;
    }

    // No explicit scope - use normal resolution order
    if (context.locals?.has(name)) {
      return context.locals.get(name);
    }
    if (context.globals?.has(name)) {
      if (name.startsWith('$')) notifyGlobalRead(name.slice(1), context);
      return context.globals.get(name);
    }
    // Hyperscript convention: `$name` identifiers look up `name` in globals
    // (matches how setVariableValue stores them).
    if (name.startsWith('$') && context.globals?.has(name.slice(1))) {
      notifyGlobalRead(name.slice(1), context);
      return context.globals.get(name.slice(1));
    }
    if (context.variables?.has(name)) {
      return context.variables.get(name);
    }

    // Check JavaScript global objects
    if (typeof globalThis !== 'undefined' && name in globalThis) {
      return (globalThis as any)[name];
    }
    if (typeof window !== 'undefined' && name in window) {
      return (window as any)[name];
    }

    return undefined;
  }

  /**
   * Evaluate literal nodes (strings, numbers, booleans)
   */
  protected async evaluateLiteral(node: { value: any }, _context: ExecutionContext): Promise<any> {
    return node.value;
  }

  /**
   * Evaluate context reference nodes (me, it, you, event, etc.)
   * These are produced by the semantic AST builder for context-dependent values.
   */
  protected async evaluateContextReference(
    node: { contextType: string; name: string },
    context: ExecutionContext
  ): Promise<any> {
    const { contextType } = node;

    switch (contextType) {
      case 'me':
        return context.me;
      case 'it':
        return context.result;
      case 'you':
        return context.you;
      case 'event':
        return context.event;
      case 'body':
        return (
          (context.meta as { ownerDocument?: Document })?.ownerDocument?.body || document?.body
        );
      case 'detail':
        return (context.event as CustomEvent)?.detail;
      case 'target':
        return context.you || (context.event as Event)?.target;
      case 'sender':
        return (context.event as Event)?.target;
      default:
        // For unknown context types, try to look up in locals
        if (context.locals && context.locals.has(contextType)) {
          return context.locals.get(contextType);
        }
        debug.expressions(`Unknown context reference type: ${contextType}`);
        return undefined;
    }
  }

  /**
   * Evaluate member expressions (object.property)
   */
  protected async evaluateMemberExpression(node: any, context: ExecutionContext): Promise<any> {
    const { object, property, computed } = node;

    // Special case: handle command-like member expressions
    if (object.type === 'identifier' && ['add', 'remove'].includes(object.name)) {
      const commandName = object.name;
      const className = extractPropertyName(property);

      if (!context.me) {
        throw new Error('Context element "me" is null');
      }

      if (commandName === 'add') {
        context.me.classList.add(className);
      } else if (commandName === 'remove') {
        context.me.classList.remove(className);
      }

      return;
    }

    // Evaluate the object first
    let objectValue = await this.evaluate(object, context);

    if (computed) {
      // For computed access (arr[0], obj['key']), don't unwrap arrays
      // This preserves regex match arrays, user arrays, etc.
      const propertyValue = await this.evaluate(property, context);
      return objectValue[propertyValue];
    } else {
      // For dot access (obj.prop), unwrap selector results to single element
      // UNLESS the property is an array method/property (length, filter, map, etc.)
      // This allows (<.selector/> in me).length and .filter() to work correctly.
      const propertyName = extractPropertyName(property);
      const isArrayProp =
        Array.isArray(objectValue) &&
        typeof propertyName === 'string' &&
        (propertyName === 'length' || propertyName in Array.prototype);
      if (!isArrayProp) {
        objectValue = this.unwrapSelectorResult(objectValue);
      }

      if (typeof propertyName === 'string') {
        // Handle computed style access
        if (propertyName.startsWith('computed-')) {
          const styleProp = propertyName.substring('computed-'.length);
          if (objectValue && typeof window !== 'undefined' && objectValue instanceof Element) {
            const computedStyle = window.getComputedStyle(objectValue);
            return computedStyle.getPropertyValue(styleProp);
          }
          return undefined;
        }

        // Handle attribute access
        if (propertyName.startsWith('@')) {
          const attrName = propertyName.substring(1);
          if (objectValue && typeof objectValue.getAttribute === 'function') {
            return accessAttribute(objectValue, attrName);
          }
          return undefined;
        }

        // Handle _hyperscript shorthand for sibling access
        // 'previous' -> previousElementSibling, 'next' -> nextElementSibling
        if (objectValue && objectValue instanceof Element) {
          if (propertyName === 'previous' || propertyName === 'prev') {
            return objectValue.previousElementSibling;
          }
          if (propertyName === 'next') {
            return objectValue.nextElementSibling;
          }
        }
      }

      const value = objectValue?.[propertyName];

      // Bind functions to the object
      if (typeof value === 'function') {
        return value.bind(objectValue);
      }

      return value;
    }
  }

  /**
   * Coerce DOM elements to numeric/string value for arithmetic.
   * Delegates to extracted module.
   */
  private coerceArithmeticOperand(value: unknown): unknown {
    return _coerceArithmeticOperand(value);
  }

  protected async evaluateBinaryExpression(node: any, context: ExecutionContext): Promise<any> {
    return _evaluateBinaryExpression(
      node,
      context,
      this.evaluate.bind(this),
      this.unwrapSelectorResult.bind(this),
      this.expressionRegistry,
      this.evaluateSelector.bind(this)
    );
  }

  /**
   * Evaluate unary expressions (not, -, +, etc.)
   */
  protected async evaluateUnaryExpression(node: any, context: ExecutionContext): Promise<any> {
    const { operator, argument } = node;
    const operandValue = await this.evaluate(argument, context);

    switch (operator) {
      case 'not':
      case '!':
        const notExpr = this.expressionRegistry.get('not');
        return notExpr ? notExpr.evaluate(context, operandValue) : !operandValue;

      case 'no':
        const noExpr = this.expressionRegistry.get('no');
        return noExpr ? noExpr.evaluate(context, operandValue) : false;

      case 'some':
        if (operandValue === null || operandValue === undefined) return false;
        if (typeof operandValue === 'string') return operandValue.length > 0;
        if (Array.isArray(operandValue)) return operandValue.length > 0;
        if (operandValue instanceof NodeList) return operandValue.length > 0;
        if (operandValue instanceof HTMLCollection) return operandValue.length > 0;
        if (typeof operandValue === 'object') return Object.keys(operandValue).length > 0;
        return true;

      case 'exists':
        const existsExpr = this.expressionRegistry.get('exists');
        return existsExpr ? existsExpr.evaluate(context, operandValue) : operandValue != null;

      case 'does not exist':
        const doesNotExistExpr = this.expressionRegistry.get('doesNotExist');
        return doesNotExistExpr
          ? doesNotExistExpr.evaluate(context, operandValue)
          : operandValue == null;

      case '-':
        return -operandValue;

      case '+':
        return +operandValue;

      default:
        throw new Error(`Unsupported unary operator: ${operator}`);
    }
  }

  /**
   * Evaluate call expressions (function calls)
   *
   * This method handles function/method calls that have been PARSED INTO AST NODES
   * by the hyperscript parser. It processes:
   * - Constructor calls: `new Date()`
   * - Method calls: `#dialog.showModal()`, `element.getAttribute('id')`
   * - Function calls: `myFunction(arg1, arg2)`
   *
   * ARCHITECTURAL NOTE - Compare with FunctionCallExpression:
   * ───────────────────────────────────────────────────────
   * This method (BaseExpressionEvaluator):
   *   - Input: AST nodes from parser (callExpression with memberExpression/propertyAccess)
   *   - Processing: Extracts callee from AST, evaluates object and property separately
   *   - Structure: Type-safe, explicit AST structure with object/property fields
   *   - Error handling: Try-catch with exceptions
   *
   * FunctionCallExpression (expressions/function-calls):
   *   - Input: String paths or direct function references ("Math.max")
   *   - Processing: Parses string paths at runtime, traverses object hierarchy
   *   - Structure: Flexible string-based resolution with multi-context lookup
   *   - Error handling: Result-based pattern (no exceptions thrown)
   *
   * Both approaches coexist because they serve different execution pipelines:
   * 1. Parser-based (this method): Structured, from parsed hyperscript code
   * 2. Expression-based (FunctionCallExpression): Flexible, from runtime expressions
   *
   * @see FunctionCallExpression in packages/core/src/expressions/function-calls/index.ts
   * @see evaluateMethodCall() for the unified method call handler
   */
  protected async evaluateCallExpression(node: any, context: ExecutionContext): Promise<any> {
    return _evaluateCallExpression(
      node,
      context,
      this.evaluate.bind(this),
      this.unwrapSelectorResult.bind(this),
      this.expressionRegistry,
      this.evaluateSelector.bind(this)
    );
  }

  /**
   * Evaluate method calls on objects. Delegates to extracted module.
   */
  private async evaluateMethodCall(
    callee: any,
    args: any[],
    context: ExecutionContext
  ): Promise<any> {
    return _evaluateMethodCall(
      callee,
      args,
      context,
      this.evaluate.bind(this),
      this.unwrapSelectorResult.bind(this)
    );
  }

  /**
   * Evaluate CSS selector nodes
   */
  protected async evaluateSelector(
    node: { value: string },
    context: ExecutionContext
  ): Promise<HTMLElement[]> {
    return _evaluateSelector(node, context);
  }

  /**
   * Evaluate standalone attribute access nodes (@attr)
   *
   * When used in a command context (toggle, add, remove), returns the @-prefixed
   * string so the command can detect it as an attribute operation.
   * When used standalone with a context element, reads the attribute value.
   */
  protected evaluateAttributeAccess(
    node: { attributeName: string },
    context: ExecutionContext
  ): string | boolean | null {
    if (context.me && typeof (context.me as any).getAttribute === 'function') {
      return accessAttribute(context.me as Element, node.attributeName);
    }
    return `@${node.attributeName}`;
  }

  /**
   * Evaluate 'as' type conversion expressions (e.g., `x as Int`, `value as String`).
   *
   * `targetType` may arrive as a string (from the standalone expression-parser
   * fragment, which reads parameterized types like `Fixed:2` directly) or as
   * an AST node (from the Pratt parser, which calls `parseExpr` for the type
   * and emits e.g. `{ type: 'identifier', name: 'Int' }`). The downstream
   * `asExpression` evaluator requires a string, so normalize here.
   */
  protected async evaluateAsExpression(
    node: { expression: any; targetType: unknown },
    context: ExecutionContext
  ): Promise<unknown> {
    const value = await this.evaluate(node.expression, context);
    const asExpr = this.expressionRegistry.get('as');
    if (asExpr) {
      const targetType = this.normalizeAsTargetType(node.targetType);
      return asExpr.evaluate(context, value, targetType);
    }
    throw new Error(`Conversion type 'as' not registered`);
  }

  private normalizeAsTargetType(target: unknown): string {
    if (typeof target === 'string') return target;
    if (target && typeof target === 'object') {
      const t = target as { name?: unknown; value?: unknown };
      if (typeof t.name === 'string') return t.name;
      if (typeof t.value === 'string') return t.value;
    }
    return String(target);
  }

  /**
   * Get available expression names
   */
  getAvailableExpressions(): string[] {
    return Array.from(this.expressionRegistry.keys());
  }

  /**
   * Evaluate dollar expressions ($variable, $1, $window.foo)
   */
  protected async evaluateDollarExpression(
    node: { expression: any },
    context: ExecutionContext
  ): Promise<any> {
    const value = await this.evaluate(node.expression, context);

    if (node.expression.type === 'identifier') {
      const varName = node.expression.name;

      if (/^\d+$/.test(varName)) {
        return varName;
      }

      if (context.locals?.has(varName)) {
        return context.locals.get(varName);
      }

      if (varName === 'me' && context.me) return context.me;
      if (varName === 'you' && context.you) return context.you;
      if (varName === 'it' && context.it) return context.it;
      if (varName === 'result' && context.result) return context.result;

      if (typeof window !== 'undefined' && varName === 'window') {
        return window;
      }

      if (context.globals?.has(varName)) {
        return context.globals.get(varName);
      }

      return undefined;
    }

    return value;
  }

  /**
   * Evaluate possessive expressions (element's property)
   */
  protected async evaluatePossessiveExpression(node: any, context: ExecutionContext): Promise<any> {
    const { object, property } = node;

    const objectValue = this.unwrapSelectorResult(await this.evaluate(object, context));

    if (!objectValue) {
      return undefined;
    }

    const propertyName = extractPropertyName(property);

    if (typeof propertyName === 'string') {
      // Use getElementProperty for comprehensive property access handling
      // This handles: @attributes (with boolean support), *css-properties, special DOM properties, etc.
      if (isElement(objectValue)) {
        return getElementProperty(objectValue, propertyName);
      }

      // For non-element objects, fall back to direct property access
      return objectValue[propertyName];
    }

    return objectValue[propertyName];
  }

  /**
   * Check if an expression is registered
   */
  hasExpression(name: string): boolean {
    return this.expressionRegistry.has(name);
  }

  /**
   * Evaluate CSS selector nodes created by expression-parser
   */
  protected async evaluateCSSSelector(
    node: { selectorType: string; selector: string },
    context: ExecutionContext
  ): Promise<HTMLElement | HTMLElement[] | null> {
    return _evaluateCSSSelector(node, context);
  }

  /**
   * Evaluate ID selector expressions (#id)
   * Used when parsing "set the X of #target" syntax
   */
  protected async evaluateIdSelector(
    node: { value: string },
    context: ExecutionContext
  ): Promise<Element | null> {
    return _evaluateIdSelector(node, context);
  }

  /**
   * Evaluate query reference expressions (<selector/>)
   * Returns NodeList for compatibility with hyperscript selector semantics
   */
  protected async evaluateQueryReference(
    node: { selector: string },
    context: ExecutionContext
  ): Promise<NodeList> {
    return _evaluateQueryReference(node, context);
  }

  /**
   * Evaluate dot notation property access
   */
  protected async evaluatePropertyAccess(
    node: { object: ASTNode; property: { name?: string; value?: string } },
    context: ExecutionContext
  ): Promise<any> {
    const object = await this.evaluate(node.object, context);
    const propertyNode = node.property;

    if (object === null || object === undefined) {
      throw new Error(
        `Cannot access property "${propertyNode.name || propertyNode.value}" of ${object}`
      );
    }

    const propertyName = propertyNode.name || propertyNode.value;
    if (!propertyName) {
      throw new Error('Property name must be an identifier');
    }

    try {
      // Use DOM-aware property access for elements
      let value: unknown;
      if (isElement(object)) {
        value = getElementProperty(object, propertyName);
      } else {
        value = object[propertyName];
      }

      if (typeof value === 'function') {
        return value.bind(object);
      }

      return value;
    } catch (error) {
      throw new Error(`Error accessing property "${propertyName}": ${error}`);
    }
  }

  /**
   * Evaluate "the X of Y" property access pattern
   */
  protected async evaluatePropertyOfExpression(
    node: { property: { name?: string; value?: string }; target: ASTNode },
    context: ExecutionContext
  ): Promise<any> {
    const propertyNode = node.property;
    const propertyName = propertyNode.name || propertyNode.value;

    if (!propertyName) {
      throw new Error('Property name must be an identifier in "the X of Y" pattern');
    }

    const target = this.unwrapSelectorResult(await this.evaluate(node.target, context));

    if (target === null || target === undefined) {
      throw new Error(`Cannot access property "${propertyName}" of ${target}`);
    }

    try {
      // Use DOM-aware property access for elements
      let value: unknown;
      if (isElement(target)) {
        value = getElementProperty(target, propertyName);
      } else {
        value = target[propertyName];
      }

      if (typeof value === 'function') {
        return value.bind(target);
      }

      return value;
    } catch (error) {
      throw new Error(`Failed to access property "${propertyName}" on target: ${error}`);
    }
  }
}
