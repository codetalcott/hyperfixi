/**
 * HyperFixi Core - Deno-Compatible Module
 * Minimal, working version for Deno runtime
 */

// ============================================================================
// Core Types (Simplified for Deno)
// ============================================================================

export interface TypedExecutionContext {
  readonly me: HTMLElement | null;
  readonly you: HTMLElement | null;
  readonly it: unknown;
  readonly locals: Map<string, unknown>;
  readonly globals: Map<string, unknown>;
  result: unknown;
}

export interface EvaluationResult<T = unknown> {
  success: boolean;
  value?: T;
  error?: {
    name: string;
    message: string;
    code: string;
    suggestions: string[];
  };
  type: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Array<{
    type: string;
    message: string;
    suggestion?: string;
  }>;
  suggestions: string[];
}

export interface CommandMetadata {
  category: string;
  complexity: 'simple' | 'medium' | 'complex';
  sideEffects: string[];
  examples: Array<{
    code: string;
    description: string;
    expectedOutput: unknown;
  }>;
  relatedCommands: string[];
}

export interface LLMDocumentation {
  summary: string;
  parameters: Array<{
    name: string;
    type: string;
    description: string;
    optional: boolean;
    examples: string[];
  }>;
  returns: {
    type: string;
    description: string;
    examples: unknown[];
  };
  examples: Array<{
    title: string;
    code: string;
    explanation: string;
    output: unknown;
  }>;
  seeAlso: string[];
  tags: string[];
}

export interface TypedCommandImplementation<_TInput = unknown[], TOutput = unknown> {
  readonly name: string;
  readonly syntax: string;
  readonly description: string;
  readonly outputType: string;
  readonly metadata: CommandMetadata;
  readonly documentation: LLMDocumentation;

  execute(context: TypedExecutionContext, ...args: unknown[]): Promise<EvaluationResult<TOutput>>;
  validate(args: unknown[]): ValidationResult;
}

// ============================================================================
// Environment Detection
// ============================================================================

export const isDeno = typeof Deno !== 'undefined';
export const isNode = false; // In Deno context
export const isBrowser = typeof window !== 'undefined';

export interface RuntimeInfo {
  name: 'deno' | 'node' | 'browser' | 'unknown';
  version: string;
  hasDOM: boolean;
  hasWebAPIs: boolean;
  typescript: boolean;
}

export function getRuntimeInfo(): RuntimeInfo {
  return {
    name: 'deno',
    version: Deno.version.deno,
    hasDOM: typeof document !== 'undefined',
    hasWebAPIs: typeof fetch !== 'undefined',
    typescript: true,
  };
}

export function getLLMRuntimeInfo() {
  const info = getRuntimeInfo();

  return {
    runtime: info.name,
    version: info.version,
    typescript: info.typescript,
    capabilities: {
      dom: info.hasDOM,
      webapis: info.hasWebAPIs,
      filesystem: true,
      networking: true,
      workers: true,
      esm: true,
    },
    features: {
      permissions: 'explicit',
      builtinTypescript: true,
      standardLibrary: 'https://deno.land/std',
      jsr: true,
      denoDeploy: true,
    },
    patterns: {
      imports: 'url-based',
      testing: 'deno-test',
      bundling: 'deno-bundle',
    },
  };
}

// ============================================================================
// Simple Hide Command (Deno-Compatible)
// ============================================================================

export class HideCommand
  implements TypedCommandImplementation<[HTMLElement | string | null], HTMLElement[]>
{
  public readonly name = 'hide' as const;
  public readonly syntax = 'hide [<target-expression>]';
  public readonly description = 'Hides one or more elements by setting display: none';
  public readonly outputType = 'element-list' as const;

  public readonly metadata: CommandMetadata = {
    category: 'dom-manipulation',
    complexity: 'simple',
    sideEffects: ['dom-mutation'],
    examples: [
      {
        code: 'hide me',
        description: 'Hide the current element',
        expectedOutput: [],
      },
    ],
    relatedCommands: ['show', 'toggle'],
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Hides HTML elements from view using CSS display property',
    parameters: [
      {
        name: 'target',
        type: 'element',
        description: 'Element(s) to hide. If omitted, hides the current element (me)',
        optional: true,
        examples: ['me', '<#modal/>', '<.button/>'],
      },
    ],
    returns: {
      type: 'element-list',
      description: 'Array of elements that were hidden',
      examples: [[]],
    },
    examples: [
      {
        title: 'Hide current element',
        code: 'on click hide me',
        explanation: 'When clicked, the button hides itself',
        output: [],
      },
    ],
    seeAlso: ['show', 'toggle'],
    tags: ['dom', 'visibility', 'css'],
  };

  execute(
    context: TypedExecutionContext,
    target?: HTMLElement | string | null
  ): Promise<EvaluationResult<HTMLElement[]>> {
    return Promise.resolve(
      (() => {
        try {
          const elements = this.resolveTargets(context, target);
          const hiddenElements: HTMLElement[] = [];

          for (const element of elements) {
            if (element) {
              // Store original display for show command
              if (!element.dataset.originalDisplay) {
                const computed = globalThis.getComputedStyle
                  ? globalThis.getComputedStyle(element)
                  : null;
                element.dataset.originalDisplay =
                  computed?.display === 'none' ? 'block' : computed?.display || 'block';
              }

              // Hide the element
              element.style.display = 'none';

              // Dispatch event if available
              if (typeof CustomEvent !== 'undefined') {
                element.dispatchEvent(
                  new CustomEvent('hyperscript:hidden', {
                    detail: { command: 'hide', timestamp: Date.now() },
                  })
                );
              }

              hiddenElements.push(element);
            }
          }

          return {
            success: true,
            value: hiddenElements,
            type: 'element-list',
          };
        } catch (error) {
          return {
            success: false,
            error: {
              name: 'HideCommandError',
              type: 'runtime-error',
              message: error instanceof Error ? error.message : 'Unknown error',
              code: 'HIDE_EXECUTION_FAILED',
              suggestions: ['Check if element exists', 'Verify element is not null'],
            },
            type: 'error',
          };
        }
      })()
    );
  }

  validate(args: unknown[]): ValidationResult {
    if (args.length > 1) {
      return {
        isValid: false,
        errors: [
          {
            type: 'invalid-arguments',
            message: 'Hide command accepts at most one argument',
            suggestion: 'Use hide me, hide element, or hide <selector/>',
            suggestions: [],
          },
        ],
        suggestions: ['Use hide me, hide element, or hide <selector/>'],
      };
    }

    return {
      isValid: true,
      errors: [],
      suggestions: [],
    };
  }

  private resolveTargets(
    context: TypedExecutionContext,
    target?: HTMLElement | string | null
  ): HTMLElement[] {
    // Default to context.me if no target specified
    if (target === undefined || target === null) {
      return context.me ? [context.me] : [];
    }

    // Handle HTMLElement directly
    if (target instanceof HTMLElement) {
      return [target];
    }

    // Handle CSS selector string
    if (typeof target === 'string' && typeof document !== 'undefined') {
      try {
        const elements = document.querySelectorAll(target);
        return Array.from(elements) as HTMLElement[];
      } catch {
        // Invalid selector, return empty array
        return [];
      }
    }

    return [];
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a hide command instance
 * @llm-bundle-size 2KB
 * @llm-description Type-safe hide command for Deno
 */
export function createHideCommand(): HideCommand {
  return new HideCommand();
}

/**
 * Create a minimal runtime for Deno
 * @llm-bundle-size 5KB
 * @llm-description Basic runtime with core functionality
 */
export function createMinimalRuntime() {
  return {
    commands: new Map<string, TypedCommandImplementation>(),
    environment: getRuntimeInfo(),

    addCommand(command: TypedCommandImplementation) {
      this.commands.set(command.name, command);
      return this;
    },

    getCommand(name: string) {
      return this.commands.get(name);
    },

    listCommands() {
      return Array.from(this.commands.keys());
    },
  };
}

// ============================================================================
// Logger for Deno
// ============================================================================

export const logger = {
  info: (message: string, ...args: unknown[]) => {
    console.log(`[HyperFixi] ${message}`, ...args);
  },

  warn: (message: string, ...args: unknown[]) => {
    console.warn(`[HyperFixi] ${message}`, ...args);
  },

  error: (message: string, ...args: unknown[]) => {
    console.error(`[HyperFixi] ${message}`, ...args);
  },

  debug: (message: string, ...args: unknown[]) => {
    if (Deno.env.get('DEBUG') === 'hyperfixi') {
      console.log(`[HyperFixi Debug] ${message}`, ...args);
    }
  },
};

// ============================================================================
// Performance Utilities
// ============================================================================

export const performance = {
  now: (): number => globalThis.performance.now(),

  mark: (name: string): void => {
    if (globalThis.performance?.mark) {
      globalThis.performance.mark(name);
    }
  },

  measure: (name: string, startMark?: string, endMark?: string): void => {
    if (globalThis.performance?.measure) {
      globalThis.performance.measure(name, startMark, endMark);
    }
  },
};
