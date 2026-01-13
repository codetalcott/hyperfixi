/**
 * ProcessPartialsCommand - Decorated Implementation
 *
 * Multi-target swaps from <hx-partial> elements.
 * Uses Stage 3 decorators for reduced boilerplate.
 *
 * Syntax:
 *   process partials in <content>
 *   process partials in it using view transition
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import { morphAdapter, type MorphOptions } from '../../lib/morph-adapter';
import { withViewTransition, isViewTransitionsSupported } from '../../lib/view-transitions';
import { isHTMLElement } from '../../utils/element-check';
import type { SwapStrategy } from './swap';
import {
  command,
  meta,
  createFactory,
  type DecoratedCommand,
  type CommandMetadata,
} from '../decorators';
import {
  validatePartialContent,
  getPartialValidationConfig,
} from '../../validation/partial-validator';
import {
  emitPartialValidationWarnings,
  formatIssuesAsStrings,
} from '../../validation/partial-warning-formatter';
import type { PartialValidationResult } from '../../validation/partial-validation-types';

// ============================================================================
// Types
// ============================================================================

export interface ParsedPartial {
  target: string;
  strategy: SwapStrategy;
  content: string;
}

export interface ProcessPartialsCommandInput {
  html: string;
  useViewTransition?: boolean;
  morphOptions?: MorphOptions;
}

export interface ProcessPartialsResult {
  count: number;
  targets: string[];
  errors: string[];
  /** Validation warnings (non-blocking) */
  validationWarnings: string[];
  /** Detailed validation results per target */
  validationDetails?: Record<string, PartialValidationResult>;
}

// ============================================================================
// Strategy Mapping
// ============================================================================

const STRATEGY_MAP: Record<string, SwapStrategy> = {
  morph: 'morph',
  morphouter: 'morphOuter',
  innerhtml: 'innerHTML',
  outerhtml: 'outerHTML',
  beforebegin: 'beforeBegin',
  afterbegin: 'afterBegin',
  beforeend: 'beforeEnd',
  afterend: 'afterEnd',
  delete: 'delete',
  none: 'none',
};

// ============================================================================
// Partial Processing Functions
// ============================================================================

export function extractPartials(html: string): ParsedPartial[] {
  const partials: ParsedPartial[] = [];
  const container = document.createElement('div');
  container.innerHTML = html;
  const partialElements = container.querySelectorAll('hx-partial');

  for (const element of partialElements) {
    const target = element.getAttribute('target');
    if (!target) {
      console.warn('hx-partial element missing target attribute, skipping');
      continue;
    }

    const strategyAttr = element.getAttribute('strategy')?.toLowerCase() || 'morph';
    const strategy = STRATEGY_MAP[strategyAttr] || 'morph';
    const content = element.innerHTML;

    partials.push({ target, strategy, content });
  }

  return partials;
}

function executePartialSwap(
  partial: ParsedPartial,
  morphOptions?: MorphOptions
): { success: boolean; error?: string } {
  const { target, strategy, content } = partial;

  const targetElement = document.querySelector(target);
  if (!targetElement || !isHTMLElement(targetElement)) {
    return { success: false, error: `Target "${target}" not found` };
  }

  try {
    switch (strategy) {
      case 'morph':
        morphAdapter.morphInner(targetElement, content, morphOptions);
        break;
      case 'morphOuter':
        morphAdapter.morph(targetElement, content, morphOptions);
        break;
      case 'innerHTML':
        targetElement.innerHTML = content;
        break;
      case 'outerHTML':
        targetElement.outerHTML = content;
        break;
      case 'beforeBegin':
        targetElement.insertAdjacentHTML('beforebegin', content);
        break;
      case 'afterBegin':
        targetElement.insertAdjacentHTML('afterbegin', content);
        break;
      case 'beforeEnd':
        targetElement.insertAdjacentHTML('beforeend', content);
        break;
      case 'afterEnd':
        targetElement.insertAdjacentHTML('afterend', content);
        break;
      case 'delete':
        targetElement.remove();
        break;
      case 'none':
        break;
      default:
        return { success: false, error: `Unknown strategy "${strategy}"` };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export function processPartials(html: string, morphOptions?: MorphOptions): ProcessPartialsResult {
  const partials = extractPartials(html);
  const config = getPartialValidationConfig();
  const result: ProcessPartialsResult = {
    count: 0,
    targets: [],
    errors: [],
    validationWarnings: [],
    validationDetails: {},
  };

  for (const partial of partials) {
    // Validate partial content before swapping
    if (config.enabled) {
      const validation = validatePartialContent(partial.content, partial.target);

      if (validation.totalIssues > 0) {
        // Emit console warnings in dev mode
        if (config.showWarnings) {
          emitPartialValidationWarnings(validation);
        }

        // Add to warnings array for programmatic access
        result.validationWarnings.push(...formatIssuesAsStrings(validation));
        result.validationDetails![partial.target] = validation;
      }
    }

    // Always proceed with swap (non-blocking)
    const swapResult = executePartialSwap(partial, morphOptions);

    if (swapResult.success) {
      result.count++;
      result.targets.push(partial.target);
    } else if (swapResult.error) {
      result.errors.push(`${partial.target}: ${swapResult.error}`);
    }
  }

  return result;
}

// ============================================================================
// ProcessPartialsCommand - Decorated Implementation
// ============================================================================

/**
 * ProcessPartialsCommand - Multi-target swaps from <hx-partial> elements
 *
 * Before: ~130 lines (builder pattern section)
 * After: ~100 lines (decorator pattern)
 */
@meta({
  description: 'Process <hx-partial> elements for multi-target swaps',
  syntax: ['process partials in <content>', 'process partials in <content> using view transition'],
  examples: [
    'process partials in it',
    'process partials in fetchedHtml',
    'process partials in it using view transition',
  ],
  sideEffects: ['dom-mutation'],
})
@command({ name: 'process', category: 'dom' })
export class ProcessPartialsCommand implements DecoratedCommand {
  declare readonly name: string;
  declare readonly metadata: CommandMetadata;

  async parseInput(
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<ProcessPartialsCommandInput> {
    const args = raw.args;

    if (!args || args.length === 0) {
      throw new Error('process partials command requires content argument');
    }

    const evaluatedArgs: unknown[] = [];
    const argStrings: string[] = [];
    for (const arg of args) {
      const evaluated = await evaluator.evaluate(arg, context);
      evaluatedArgs.push(evaluated);
      if (typeof evaluated === 'string') {
        argStrings.push(evaluated.toLowerCase());
      }
    }

    const partialsIndex = argStrings.findIndex(s => s === 'partials');
    if (partialsIndex === -1) {
      throw new Error('process command expects "partials" keyword: process partials in <content>');
    }

    const inIndex = argStrings.findIndex(s => s === 'in');
    if (inIndex === -1 || inIndex <= partialsIndex) {
      throw new Error(
        'process partials command expects "in" keyword: process partials in <content>'
      );
    }

    const contentArg = evaluatedArgs[inIndex + 1];

    let html: string;
    if (typeof contentArg === 'string') {
      html = contentArg;
    } else if (isHTMLElement(contentArg)) {
      html = (contentArg as HTMLElement).outerHTML;
    } else if (contentArg && typeof (contentArg as any).text === 'function') {
      html = await (contentArg as Response).text();
    } else {
      throw new Error('process partials: content must be an HTML string or element');
    }

    const usingIndex = argStrings.findIndex(s => s === 'using');
    let useViewTransition = false;
    if (usingIndex !== -1) {
      const remaining = argStrings.slice(usingIndex + 1).join(' ');
      if (remaining.includes('view') && remaining.includes('transition')) {
        useViewTransition = true;
      }
    }

    return {
      html,
      useViewTransition,
      morphOptions: { preserveChanges: true },
    };
  }

  async execute(
    input: ProcessPartialsCommandInput,
    context: TypedExecutionContext
  ): Promise<ProcessPartialsResult> {
    const { html, useViewTransition, morphOptions } = input;

    const performProcessing = () => processPartials(html, morphOptions);

    let result: ProcessPartialsResult;

    if (useViewTransition && isViewTransitionsSupported()) {
      await withViewTransition(() => {
        result = performProcessing();
      });
    } else {
      result = performProcessing();
    }

    (context as any).it = result!;

    window.dispatchEvent(
      new CustomEvent('hyperfixi:partials', {
        detail: result!,
      })
    );

    if (result!.errors.length > 0) {
      console.warn('Some partials failed to process:', result!.errors);
    }

    return result!;
  }
}

// ============================================================================
// Exports
// ============================================================================

export const createProcessPartialsCommand = createFactory(ProcessPartialsCommand);

// Legacy export for compatibility
export const processPartialsCommand = createProcessPartialsCommand();

export default ProcessPartialsCommand;
