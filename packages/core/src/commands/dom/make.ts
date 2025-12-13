/**
 * MakeCommand - Decorated Implementation
 *
 * Creates DOM elements or class instances.
 * Uses Stage 3 decorators for reduced boilerplate.
 *
 * Syntax:
 *   make a <tag#id.class1.class2/>
 *   make a URL from "/path/", "origin"
 */

import type { ASTNode, ExecutionContext } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import { isHTMLElement } from '../../utils/element-check';
import { command, meta, createFactory, type DecoratedCommand , type CommandMetadata } from '../decorators';

/**
 * Raw input from RuntimeBase (before evaluation)
 */
export interface MakeCommandRawInput {
  args: ASTNode[];
  modifiers: Record<string, ASTNode>;
}

/**
 * Typed input after parsing
 */
export interface MakeCommandInput {
  article: 'a' | 'an';
  expression: string | HTMLElement;
  constructorArgs?: any[];
  variableName?: string;
}

/**
 * MakeCommand - Create DOM elements or class instances
 *
 * Before: 384 lines
 * After: ~350 lines (9% reduction)
 */
@meta({
  description: 'Create DOM elements or class instances',
  syntax: ['make a <tag#id.class1.class2/>', 'make a <ClassName> from <args> called <identifier>'],
  examples: ['make an <a.navlink/> called linkElement', 'make a URL from "/path/", "https://origin.example.com"'],
  sideEffects: ['dom-creation', 'data-mutation'],
})
@command({ name: 'make', category: 'dom' })
export class MakeCommand implements DecoratedCommand {
  declare readonly name: string;
  declare readonly metadata: CommandMetadata;


  // ============================================================================
  // INLINED UTILITIES (Zero External Dependencies)
  // ============================================================================

  /**
   * Resolve constructor arguments from "from" modifier
   *
   * Handles:
   * - make a URL from "/path/", "https://origin.example.com"
   * - make a Date from "2023-01-01"
   * - make a Map (no args)
   *
   * @param fromModifier - AST node for "from" modifier (array of args)
   * @param evaluator - Expression evaluator
   * @param context - Execution context
   * @returns Array of evaluated arguments
   */
  private async resolveConstructorArgs(
    fromModifier: ASTNode | undefined,
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<any[]> {
    if (!fromModifier) {
      return [];
    }

    // "from" modifier contains an array expression
    // e.g., make a URL from "/path/", "https://origin.example.com"
    // fromModifier = { type: 'arrayLiteral', args: [...] }

    if (fromModifier.type === 'arrayLiteral' && Array.isArray(fromModifier.args)) {
      const results: any[] = [];
      for (const arg of fromModifier.args) {
        const value = await evaluator.evaluate(arg, context);
        results.push(value);
      }
      return results;
    }

    // Single argument (not array)
    const value = await evaluator.evaluate(fromModifier, context);
    return Array.isArray(value) ? value : [value];
  }

  /**
   * Resolve variable name from "called" modifier
   *
   * Handles:
   * - make an <a.navlink/> called linkElement
   * - make a Map called myMap
   *
   * @param calledModifier - AST node for "called" modifier
   * @param evaluator - Expression evaluator
   * @param context - Execution context
   * @returns Variable name string or undefined
   */
  private async resolveVariableName(
    calledModifier: ASTNode | undefined,
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<string | undefined> {
    if (!calledModifier) {
      return undefined;
    }

    // "called" modifier is typically a symbol/identifier
    // e.g., called linkElement → { type: 'symbol', name: 'linkElement' }

    if (calledModifier.type === 'symbol' && typeof (calledModifier as any).name === 'string') {
      return (calledModifier as any).name;
    }

    // Fallback: evaluate as expression
    const value = await evaluator.evaluate(calledModifier, context);
    return typeof value === 'string' ? value : String(value);
  }

  /**
   * Create a DOM element from element expression
   *
   * Handles:
   * - <div/> → <div></div>
   * - <button.btn-primary/> → <button class="btn-primary"></button>
   * - <div#container.wrapper/> → <div id="container" class="wrapper"></div>
   * - <a#link.nav.active/> → <a id="link" class="nav active"></a>
   *
   * @param elementExpression - Element expression string (e.g., "<div#id.class/>")
   * @returns Created HTMLElement
   */
  private createDOMElement(elementExpression: string): HTMLElement {
    // Parse the element expression: <tag#id.class1.class2/>
    const content = elementExpression.slice(1, -2); // Remove < and />

    // Extract tag name
    let tagName = 'div'; // default
    let remainder = content;

    // Find where tag name ends (at first . or # or end)
    const tagMatch = content.match(/^([a-zA-Z][a-zA-Z0-9]*)/);
    if (tagMatch) {
      tagName = tagMatch[1];
      remainder = content.slice(tagMatch[0].length);
    }

    // Create the element
    const element = document.createElement(tagName);

    // Parse classes and ID
    const parts = remainder.split(/(?=[.#])/); // Split on . or # but keep the delimiter

    for (const part of parts) {
      if (part.startsWith('#')) {
        // Set ID
        const id = part.slice(1);
        if (id) {
          element.id = id;
        }
      } else if (part.startsWith('.')) {
        // Add class
        const className = part.slice(1);
        if (className) {
          element.classList.add(className);
        }
      }
    }

    return element;
  }

  /**
   * Create a class instance using constructor
   *
   * Handles:
   * - make a URL from "/path/", "https://origin.example.com"
   * - make a Date from "2023-01-01"
   * - make a Map
   * - make a CustomClass (checks window, global, and context variables)
   *
   * @param className - Class name string or HTMLElement
   * @param constructorArgs - Arguments to pass to constructor
   * @param context - Execution context (for custom classes)
   * @returns New instance
   */
  private createClassInstance(
    className: string | HTMLElement,
    constructorArgs: any[],
    context: ExecutionContext
  ): any {
    if (isHTMLElement(className)) {
      return className as HTMLElement;
    }

    const classNameStr = String(className);

    try {
      // Try to resolve the class constructor
      let Constructor: any;

      // Check common global constructors
      if (typeof window !== 'undefined') {
        Constructor = (window as any)[classNameStr];
      }

      // Fallback to global object
      if (!Constructor && typeof global !== 'undefined') {
        Constructor = (global as any)[classNameStr];
      }

      // Check context variables for custom classes
      if (!Constructor && context.variables && context.variables.has(classNameStr)) {
        Constructor = context.variables.get(classNameStr);
      }

      if (!Constructor || typeof Constructor !== 'function') {
        throw new Error(`Constructor '${classNameStr}' not found or is not a function`);
      }

      // Create the instance with constructor arguments
      if (constructorArgs.length === 0) {
        return new Constructor();
      } else {
        return new Constructor(...constructorArgs);
      }
    } catch (error) {
      throw new Error(
        `Failed to create instance of '${classNameStr}': ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Set a variable in execution context
   *
   * @param name - Variable name
   * @param value - Value to set
   * @param context - Execution context
   */
  private setVariableValue(name: string, value: any, context: ExecutionContext): void {
    // Set in local variables by default
    context.locals.set(name, value);
  }

  // ============================================================================
  // COMMAND INTERFACE
  // ============================================================================

  /**
   * Parse raw AST input into structured input object
   *
   * Make command syntax: "make (a|an) <expression> [from <arg-list>] [called <identifier>]"
   *
   * Examples:
   * - make a URL from "/path/", "https://origin.example.com"
   * - make an <a.navlink/> called linkElement
   * - make a Date from "2023-01-01"
   * - make an <div#content.container/>
   *
   * AST structure:
   * - args[0]: expression (class name or DOM element)
   * - modifiers.a or modifiers.an: article indicator
   * - modifiers.from: constructor arguments
   * - modifiers.called: variable name
   *
   * @param raw - Raw AST nodes and modifiers from the parser
   * @param evaluator - Expression evaluator for resolving AST nodes
   * @param context - Execution context
   * @returns Structured input object { article, expression, constructorArgs, variableName }
   */
  async parseInput(
    raw: MakeCommandRawInput,
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<MakeCommandInput> {
    // Evaluate expression from first argument
    const expression =
      raw.args.length > 0 ? await evaluator.evaluate(raw.args[0], context) : undefined;

    if (!expression) {
      throw new Error('Make command requires class name or DOM element expression');
    }

    // Check for 'a' or 'an' article modifier
    const hasA = raw.modifiers.a !== undefined;
    const hasAn = raw.modifiers.an !== undefined;
    const article = hasAn ? 'an' : hasA ? 'a' : 'a'; // default to 'a'

    // Resolve constructor arguments from "from" modifier
    const constructorArgs = await this.resolveConstructorArgs(
      raw.modifiers.from,
      evaluator,
      context
    );

    // Resolve variable name from "called" modifier
    const variableName = await this.resolveVariableName(raw.modifiers.called, evaluator, context);

    return {
      article,
      expression,
      constructorArgs,
      variableName,
    };
  }

  /**
   * Execute the make command
   *
   * Creates either:
   * 1. DOM element (if expression is "<tag#id.class/>")
   * 2. Class instance (if expression is class name)
   *
   * Side effects:
   * - Sets context.it to created instance
   * - Sets context.locals[variableName] if "called" modifier provided
   *
   * @param input - Parsed input from parseInput()
   * @param context - Execution context
   * @returns Created instance (HTMLElement or class instance)
   */
  async execute(input: MakeCommandInput, context: ExecutionContext): Promise<any> {
    const { expression, constructorArgs = [], variableName } = input;

    let result: any;

    // Check if this is a DOM element expression (starts with < and ends with />)
    if (typeof expression === 'string' && expression.startsWith('<') && expression.endsWith('/>')) {
      result = this.createDOMElement(expression);
    } else {
      // This is a JavaScript class instantiation
      result = this.createClassInstance(expression, constructorArgs, context);
    }

    // Set the result in context.it
    Object.assign(context, { it: result });

    // Store in variable if specified
    if (variableName) {
      this.setVariableValue(variableName, result, context);
    }

    return result;
  }

}

export const createMakeCommand = createFactory(MakeCommand);
export default MakeCommand;
