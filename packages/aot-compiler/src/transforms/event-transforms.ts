/**
 * Event Handler Transforms
 *
 * Generates complete event handler code including event binding,
 * modifier handling, and cleanup.
 */

import type {
  ASTNode,
  EventHandlerNode,
  CommandNode,
  CodegenContext,
  GeneratedHandler,
  AnalysisResult,
  EventModifiers,
  IfNode,
  RepeatNode,
  ForEachNode,
  WhileNode,
} from '../types/aot-types.js';
import { sanitizeSelector } from './expression-transforms.js';
import {
  generateCommand,
  generateIf,
  generateRepeat,
  generateForEach,
  generateWhile,
} from './command-transforms.js';

// =============================================================================
// EVENT HANDLER CODEGEN
// =============================================================================

/**
 * Code generator for event handlers.
 */
export class EventHandlerCodegen {
  private ctx: CodegenContext;
  private analysis: AnalysisResult;

  constructor(ctx: CodegenContext, analysis: AnalysisResult) {
    this.ctx = ctx;
    this.analysis = analysis;
  }

  /**
   * Generate complete code for an event handler.
   */
  generate(node: EventHandlerNode): GeneratedHandler {
    const eventName = node.event;
    const modifiers = node.modifiers ?? {};
    const body = node.body ?? [];

    // Generate the handler function body
    const bodyCode = this.generateBody(body);
    const isAsync = this.analysis.controlFlow.hasAsync;

    // Build event listener options
    const listenerOptions = this.buildListenerOptions(modifiers);

    // Generate modifier handling code
    const modifierCode = this.generateModifierCode(modifiers);

    // Generate the complete handler function
    const handlerCode = this.generateHandlerFunction(eventName, bodyCode, modifierCode, isAsync);

    // Generate binding code
    const bindingCode = this.generateBindingCode(eventName, modifiers, listenerOptions);

    // Generate cleanup code
    const cleanup = this.generateCleanupCode(eventName, modifiers);

    // Collect required imports
    const imports = this.collectImports();

    return {
      handlerCode,
      bindingCode,
      cleanup,
      async: isAsync,
      imports,
    };
  }

  // ===========================================================================
  // BODY GENERATION
  // ===========================================================================

  /**
   * Generate code for the handler body.
   */
  private generateBody(nodes: ASTNode[]): string {
    const statements: string[] = [];

    for (const node of nodes) {
      const code = this.generateNode(node);
      if (code) {
        statements.push(code);
      }
    }

    return statements.join('\n');
  }

  /**
   * Generate code for a single AST node.
   */
  private generateNode(node: ASTNode): string | null {
    switch (node.type) {
      case 'command':
        return this.generateCommandCode(node as CommandNode);

      case 'if':
        return generateIf(node as IfNode, this.ctx, nodes => this.generateBody(nodes));

      case 'repeat':
        return generateRepeat(node as RepeatNode, this.ctx, nodes => this.generateBody(nodes));

      case 'foreach':
        return generateForEach(node as ForEachNode, this.ctx, nodes => this.generateBody(nodes));

      case 'while':
        return generateWhile(node as WhileNode, this.ctx, nodes => this.generateBody(nodes));

      case 'event': {
        // Nested event node (from CommandSequence conversion) — inline its body
        const nested = node as EventHandlerNode;
        return this.generateBody(nested.body ?? []);
      }

      default:
        // Unknown node type
        return null;
    }
  }

  /**
   * Generate code for a command.
   */
  private generateCommandCode(node: CommandNode): string | null {
    const result = generateCommand(node, this.ctx);
    if (!result) {
      return null;
    }
    return result.code;
  }

  // ===========================================================================
  // MODIFIER HANDLING
  // ===========================================================================

  /**
   * Build AddEventListenerOptions from modifiers.
   */
  private buildListenerOptions(modifiers: EventModifiers): AddEventListenerOptions {
    const options: AddEventListenerOptions = {};

    if (modifiers.once) {
      options.once = true;
    }
    if (modifiers.passive) {
      options.passive = true;
    }
    if (modifiers.capture) {
      options.capture = true;
    }

    return options;
  }

  /**
   * Generate code for event modifiers (prevent, stop).
   */
  private generateModifierCode(modifiers: EventModifiers): string {
    const code: string[] = [];

    if (modifiers.prevent) {
      code.push('_event.preventDefault();');
    }
    if (modifiers.stop) {
      code.push('_event.stopPropagation();');
    }

    return code.join('\n');
  }

  // ===========================================================================
  // HANDLER FUNCTION GENERATION
  // ===========================================================================

  /**
   * Generate the complete handler function.
   */
  private generateHandlerFunction(
    _eventName: string,
    bodyCode: string,
    modifierCode: string,
    isAsync: boolean
  ): string {
    const asyncKeyword = isAsync ? 'async ' : '';
    const handlerId = this.ctx.handlerId;

    // Build context initialization
    const contextInit = `const _ctx = _rt.createContext(_event, this);`;

    // Combine modifier code and body
    const combinedBody = [modifierCode, bodyCode].filter(Boolean).join('\n');

    // Wrap in try-catch for halt/exit handling
    const needsTryCatch = this.analysis.controlFlow.canThrow;

    let functionBody: string;

    if (needsTryCatch) {
      functionBody = `${contextInit}
  try {
    ${combinedBody}
  } catch (_e) {
    if (_e === _rt.HALT) {
      _event.preventDefault();
      return;
    }
    if (_e === _rt.EXIT) {
      return;
    }
    throw _e;
  }`;
    } else {
      functionBody = `${contextInit}
  ${combinedBody}`;
    }

    return `${asyncKeyword}function _handler_${handlerId}(_event) {
  ${functionBody}
}`;
  }

  // ===========================================================================
  // BINDING CODE GENERATION
  // ===========================================================================

  /**
   * Generate code to bind the handler to an element.
   */
  private generateBindingCode(
    eventName: string,
    modifiers: EventModifiers,
    options: AddEventListenerOptions
  ): string {
    const handlerId = this.ctx.handlerId;
    const event = JSON.stringify(eventName);

    // Build handler reference (may be wrapped)
    let handler = `_handler_${handlerId}`;

    // Apply debounce wrapper
    if (modifiers.debounce) {
      this.ctx.requireHelper('debounce');
      handler = `_rt.debounce(${handler}, ${modifiers.debounce})`;
    }

    // Apply throttle wrapper
    if (modifiers.throttle) {
      this.ctx.requireHelper('throttle');
      handler = `_rt.throttle(${handler}, ${modifiers.throttle})`;
    }

    // Build options argument
    const optionsKeys = Object.keys(options).filter(k => (options as Record<string, unknown>)[k]);
    const optionsArg =
      optionsKeys.length > 0 ? `, { ${optionsKeys.map(k => `${k}: true`).join(', ')} }` : '';

    // Event delegation
    if (modifiers.from) {
      const delegateSelector = JSON.stringify(modifiers.from);
      this.ctx.requireHelper('delegate');
      return `_rt.delegate(_el, ${event}, ${delegateSelector}, ${handler}${optionsArg});`;
    }

    return `_el.addEventListener(${event}, ${handler}${optionsArg});`;
  }

  // ===========================================================================
  // CLEANUP CODE GENERATION
  // ===========================================================================

  /**
   * Generate cleanup code for removing the handler.
   */
  private generateCleanupCode(eventName: string, modifiers: EventModifiers): string | null {
    // No cleanup needed for once handlers
    if (modifiers.once) {
      return null;
    }

    const handlerId = this.ctx.handlerId;
    const event = JSON.stringify(eventName);
    const capture = modifiers.capture ? ', true' : '';

    return `_el.removeEventListener(${event}, _handler_${handlerId}${capture});`;
  }

  // ===========================================================================
  // IMPORTS COLLECTION
  // ===========================================================================

  /**
   * Collect required runtime imports.
   */
  private collectImports(): string[] {
    const imports = ['createContext'];

    // Add helpers from context
    for (const helper of this.ctx.requiredHelpers) {
      if (!imports.includes(helper)) {
        imports.push(helper);
      }
    }

    // Add helpers from analysis
    for (const helper of this.analysis.dependencies.runtimeHelpers) {
      if (!imports.includes(helper)) {
        imports.push(helper);
      }
    }

    return imports;
  }
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Generate a complete event handler.
 */
export function generateEventHandler(
  node: EventHandlerNode,
  ctx: CodegenContext,
  analysis: AnalysisResult
): GeneratedHandler {
  const codegen = new EventHandlerCodegen(ctx, analysis);
  return codegen.generate(node);
}

/**
 * Generate binding code for multiple handlers.
 */
export function generateBindings(
  handlers: Array<{
    selector: string;
    eventName: string;
    handlerId: string;
    options?: AddEventListenerOptions;
  }>
): string {
  const bindings: string[] = [];

  for (const { selector, eventName, handlerId, options } of handlers) {
    const sanitized = sanitizeSelector(selector);
    const event = JSON.stringify(eventName);

    const optionsKeys = options
      ? Object.keys(options).filter(k => (options as Record<string, unknown>)[k])
      : [];
    const optionsArg =
      optionsKeys.length > 0 ? `, { ${optionsKeys.map(k => `${k}: true`).join(', ')} }` : '';

    bindings.push(
      `document.querySelectorAll('${sanitized}').forEach(_el => _el.addEventListener(${event}, _handler_${handlerId}${optionsArg}));`
    );
  }

  return bindings.join('\n');
}

/**
 * Generate initialization code that runs when DOM is ready.
 */
export function generateInitialization(
  handlers: Array<{
    selector: string;
    eventName: string;
    handlerId: string;
    options?: AddEventListenerOptions;
  }>
): string {
  const bindings = generateBindings(handlers);

  return `_rt.ready(() => {
${bindings}
});`;
}

export default EventHandlerCodegen;
