/**
 * Enhanced Fetch Command - Deep TypeScript Integration
 * HTTP request command with full event integration and type safety
 * Enhanced for LLM code agents with comprehensive validation
 */

import { z } from 'zod';
import type { 
  TypedCommandImplementation,
  TypedExecutionContext,
  EvaluationResult,
  ValidationResult,
  CommandMetadata,
  LLMDocumentation,
} from '../../types/enhanced-core.ts';
import { 
  emitConfigEvent, 
  emitBeforeEvent, 
  emitAfterEvent, 
  emitErrorEvent, 
  emitFinallyEvent, 
  emitSwappedEvent,
  dispatchCustomEvent 
} from '../../core/events.ts';

export interface FetchCommandOptions {
  method?: string;
  headers?: Record<string, string>;
  timeout?: number;
  credentials?: RequestCredentials;
}

/**
 * Input validation schema for LLM understanding
 */
const FetchCommandInputSchema = z.tuple([
  z.union([
    z.string().url(), // URL string
    z.function(),      // URL function
    z.string()         // Allow non-URL strings for relative paths
  ]),
  z.object({
    method: z.string().optional(),
    headers: z.record(z.string()).optional(),
    body: z.unknown().optional(),
    target: z.union([
      z.instanceof(HTMLElement),
      z.string() // CSS selector
    ]).optional(),
    format: z.enum(['json', 'text', 'html', 'blob', 'arrayBuffer']).optional(),
    placement: z.enum(['innerHTML', 'outerHTML', 'textContent', 'append', 'prepend', 'before', 'after']).optional(),
    timeout: z.number().positive().optional()
  }).optional()
]);

type FetchCommandInput = z.infer<typeof FetchCommandInputSchema>;

/**
 * Enhanced Fetch Command with full type safety for LLM agents
 */
export class FetchCommand implements TypedCommandImplementation<
  FetchCommandInput,
  any,  // Response data can be various types (JSON, text, blob, etc.)
  TypedExecutionContext
> {
  public readonly name = 'fetch' as const;
  public readonly syntax = 'fetch <url-expression> [as <type>] [into <target>]';
  public readonly description = 'Executes HTTP requests with comprehensive response processing and DOM integration';
  public readonly inputSchema = FetchCommandInputSchema;
  public readonly outputType = 'any' as const;
  
  public readonly metadata: CommandMetadata = {
    category: 'async-operation',
    complexity: 'complex',
    sideEffects: ['network-request', 'dom-mutation'],
    examples: [
      {
        code: 'fetch "/api/data"',
        description: 'Simple GET request to API endpoint',
        expectedOutput: {}
      },
      {
        code: 'fetch "/api/users" {method: "POST", body: data}',
        description: 'POST request with JSON data',
        expectedOutput: {}
      },
      {
        code: 'fetch "/content.html" {target: <#container/>, format: "html"}',
        description: 'Fetch HTML content and inject into container',
        expectedOutput: {}
      }
    ],
    relatedCommands: ['send', 'wait', 'put']
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Executes HTTP requests with comprehensive response processing, event integration, and DOM manipulation',
    parameters: [
      {
        name: 'url',
        type: 'string | function',
        description: 'URL to fetch from, can be absolute, relative, or function that returns URL',
        optional: false,
        examples: ['"/api/data"', '"https://api.example.com/users"', '() => buildApiUrl()']
      },
      {
        name: 'options',
        type: 'object',
        description: 'Request options including method, headers, body, target, format',
        optional: true,
        examples: ['{method: "POST"}', '{format: "json", target: "#result"}']
      }
    ],
    returns: {
      type: 'any',
      description: 'Response data in requested format (JSON object, text string, Blob, etc.)',
      examples: ['{data: "value"}', '"response text"', {}]
    },
    examples: [
      {
        title: 'Simple API call',
        code: 'on click fetch "/api/status" then log it',
        explanation: 'Fetch API status and log the response',
        output: {}
      },
      {
        title: 'POST with JSON data',
        code: 'fetch "/api/save" {method: "POST", body: formData, format: "json"}',
        explanation: 'Send form data as POST request and parse JSON response',
        output: {}
      },
      {
        title: 'Load content into DOM',
        code: 'fetch "/content.html" {target: <#main/>, placement: "innerHTML"}',
        explanation: 'Fetch HTML content and replace main element content',
        output: {}
      }
    ],
    seeAlso: ['send', 'wait', 'put', 'XMLHttpRequest', 'fetch API'],
    tags: ['http', 'ajax', 'async', 'network', 'api', 'dom']
  };
  
  private options: FetchCommandOptions;

  constructor(options: FetchCommandOptions = {}) {
    this.options = {
      method: 'GET',
      headers: {},
      timeout: 10000,
      credentials: 'same-origin',
      ...options,
    };
  }

  async execute(
    context: TypedExecutionContext, 
    url: FetchCommandInput[0], 
    options?: FetchCommandInput[1]
  ): Promise<EvaluationResult<any>> {
    const element = context.me as HTMLElement;
    let config: any = null;
    
    try {
      // Runtime validation for type safety
      const validationResult = this.validate([url, options]);
      if (!validationResult.isValid) {
        return {
          success: false,
          error: {
            name: 'ValidationError',
            message: validationResult.errors[0]?.message || 'Invalid input',
            code: 'FETCH_VALIDATION_FAILED',
            suggestions: validationResult.suggestions
          },
          type: 'error'
        };
      }
      
      // Resolve URL
      const resolvedUrl = this.resolveUrl(url, context);
      if (!resolvedUrl) {
        return {
          success: false,
          error: {
            name: 'FetchCommandError',
            message: 'Fetch command requires a valid URL',
            code: 'INVALID_URL',
            suggestions: ['Provide valid URL string', 'Check URL format', 'Use absolute or relative URLs']
          },
          type: 'error'
        };
      }

      // Build request configuration
      const configResult = this.buildConfigSafely(resolvedUrl, options, context);
      if (!configResult.success) {
        return {
          success: false,
          error: {
            name: 'FetchCommandError',
            message: configResult.error || 'Failed to build request configuration',
            code: 'CONFIG_BUILD_FAILED',
            suggestions: ['Check request options', 'Verify target selectors']
          },
          type: 'error'
        };
      }
      
      config = configResult.config;

      // Emit fx:config event - allows modification of config
      if (element && !emitConfigEvent(element, config)) {
        return {
          success: false,
          error: {
            name: 'FetchCommandError',
            message: 'Request cancelled by fx:config handler',
            code: 'REQUEST_CANCELLED_CONFIG',
            suggestions: ['Check fx:config event handlers']
          },
          type: 'error'
        };
      }

      // Emit fx:before event - final chance to cancel
      if (element && !emitBeforeEvent(element, config)) {
        return {
          success: false,
          error: {
            name: 'FetchCommandError',
            message: 'Request cancelled by fx:before handler',
            code: 'REQUEST_CANCELLED_BEFORE',
            suggestions: ['Check fx:before event handlers']
          },
          type: 'error'
        };
      }

      // Execute HTTP request
      const response = await this.executeRequest(config);
      
      // Process response
      const result = await this.processResponse(response, config);
      
      // Update config with response data
      config.response = response;
      config.result = result;

      // Emit fx:after event - allows response processing modification
      if (element && !emitAfterEvent(element, config)) {
        // Swapping cancelled, but return result
        return {
          success: true,
          value: result,
          type: 'any'
        };
      }

      // Apply result to target (if specified)
      if (config.target && config.result) {
        const applyResult = await this.applyResultSafely(config.target, config.result, config);
        if (!applyResult.success) {
          return {
            success: false,
            error: {
              name: 'FetchCommandError',
              message: applyResult.error || 'Failed to apply result to target',
              code: 'RESULT_APPLICATION_FAILED',
              suggestions: ['Check target element exists', 'Verify placement strategy']
            },
            type: 'error'
          };
        }
        
        // Emit fx:swapped event after DOM manipulation
        if (element) {
          emitSwappedEvent(element, config);
        }
      }

      // Dispatch enhanced success event with rich metadata
      if (element) {
        dispatchCustomEvent(element, 'hyperscript:fetch', {
          element,
          context,
          command: this.name,
          url: resolvedUrl,
          response,
          result,
          timestamp: Date.now(),
          metadata: this.metadata,
          config
        });
      }

      // Store result in context
      context.result = result;

      return {
        success: true,
        value: result,
        type: 'any'
      };

    } catch (error) {
      // Emit fx:error event
      if (element) {
        emitErrorEvent(element, error as Error, config, { name: 'fetch', url });
      }

      // Enhanced error handling with context
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const suggestions = [];
      
      if (errorMessage.includes('fetch')) {
        suggestions.push('Check network connectivity');
        suggestions.push('Verify URL is accessible');
      }
      if (errorMessage.includes('timeout')) {
        suggestions.push('Increase timeout value');
        suggestions.push('Check server response time');
      }
      if (errorMessage.includes('CORS')) {
        suggestions.push('Configure CORS headers on server');
        suggestions.push('Use credentials: "include" if needed');
      }
      
      return {
        success: false,
        error: {
          name: 'FetchCommandError',
          message: errorMessage,
          code: 'FETCH_EXECUTION_FAILED',
          suggestions: suggestions.length > 0 ? suggestions : ['Check URL and network', 'Verify request parameters']
        },
        type: 'error'
      };

    } finally {
      // Emit fx:finally event - always runs
      if (element && config) {
        emitFinallyEvent(element, config);
      }
    }
  }

  private buildConfigSafely(
    url: string, 
    options: FetchCommandInput[1], 
    context: TypedExecutionContext
  ): { success: boolean; config?: any; error?: string } {
    try {
      const config = this.buildConfig(url, options, context);
      return { success: true, config };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to build configuration'
      };
    }
  }
  
  private async applyResultSafely(
    target: HTMLElement, 
    result: any, 
    config: any
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await this.applyResult(target, result, config);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to apply result'
      };
    }
  }

  private resolveUrl(url: any, context: TypedExecutionContext): string | null {
    if (typeof url === 'string') {
      return url;
    }

    if (typeof url === 'function') {
      try {
        return String(url(context));
      } catch (error) {
        console.warn('Error resolving URL function:', error);
        return null;
      }
    }

    return null;
  }

  private buildConfig(url: string, options: any, context: TypedExecutionContext): any {
    const config = {
      url,
      method: this.options.method,
      headers: { ...this.options.headers },
      credentials: this.options.credentials,
      timeout: this.options.timeout,
      element: context.me,
      context,
      ...options,
    };

    // Parse common options
    if (options) {
      if (options.method) config.method = options.method;
      if (options.headers) config.headers = { ...config.headers, ...options.headers };
      if (options.body) config.body = options.body;
      if (options.target) config.target = this.resolveTarget(options.target, context);
      if (options.format) config.format = options.format;
    }

    return config;
  }

  private async executeRequest(config: any): Promise<Response> {
    const { url, method, headers, body, timeout, credentials } = config;

    const fetchOptions: RequestInit = {
      method,
      headers,
      credentials,
    };

    if (body && method !== 'GET' && method !== 'HEAD') {
      fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    // Add timeout support
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    fetchOptions.signal = controller.signal;

    try {
      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private async processResponse(response: Response, config: any): Promise<any> {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const format = config.format || 'text';

    switch (format.toLowerCase()) {
      case 'json':
        return await response.json();
      case 'text':
      case 'html':
        return await response.text();
      case 'blob':
        return await response.blob();
      case 'arrayBuffer':
        return await response.arrayBuffer();
      default:
        return await response.text();
    }
  }

  private resolveTarget(target: any, context: TypedExecutionContext): HTMLElement | null {
    if (target instanceof HTMLElement) {
      return target;
    }

    if (typeof target === 'string') {
      return document.querySelector(target);
    }

    // Default to context element
    return context.me as HTMLElement;
  }

  private async applyResult(target: HTMLElement, result: any, config: any): Promise<void> {
    if (!target || result == null) return;

    const placement = config.placement || 'innerHTML';

    switch (placement) {
      case 'innerHTML':
        target.innerHTML = String(result);
        break;
      case 'outerHTML':
        target.outerHTML = String(result);
        break;
      case 'textContent':
        target.textContent = String(result);
        break;
      case 'append':
        target.insertAdjacentHTML('beforeend', String(result));
        break;
      case 'prepend':
        target.insertAdjacentHTML('afterbegin', String(result));
        break;
      case 'before':
        target.insertAdjacentHTML('beforebegin', String(result));
        break;
      case 'after':
        target.insertAdjacentHTML('afterend', String(result));
        break;
      default:
        target.innerHTML = String(result);
    }
  }

  validate(args: unknown[]): ValidationResult {
    try {
      if (args.length === 0) {
        return {
          isValid: false,
          errors: [{
            type: 'missing-argument',
            message: 'Fetch command requires a URL',
            suggestion: 'Provide URL as first argument'
          }],
          suggestions: ['Use: fetch "/api/data"', 'Use: fetch "https://api.example.com"']
        };
      }

      if (args.length > 2) {
        return {
          isValid: false,
          errors: [{
            type: 'too-many-arguments',
            message: 'Fetch command accepts at most two arguments: URL and options',
            suggestion: 'Use URL and optional options object'
          }],
          suggestions: ['Use: fetch url options', 'Combine extra parameters into options object']
        };
      }

      const url = args[0];
      if (typeof url !== 'string' && typeof url !== 'function') {
        return {
          isValid: false,
          errors: [{
            type: 'invalid-url-type',
            message: 'Fetch command URL must be a string or function',
            suggestion: 'Use string URL or function that returns URL'
          }],
          suggestions: ['Use: "/api/data"', 'Use: () => buildUrl()']
        };
      }
      
      // Validate URL format if it's a string
      if (typeof url === 'string') {
        // Basic URL validation - allow relative and absolute URLs
        if (url.trim().length === 0) {
          return {
            isValid: false,
            errors: [{
              type: 'empty-url',
              message: 'URL cannot be empty',
              suggestion: 'Provide valid URL string'
            }],
            suggestions: ['Use relative URLs like "/api/data"', 'Use absolute URLs like "https://example.com"']
          };
        }
      }
      
      // Validate options if provided
      if (args.length > 1 && args[1] !== undefined && args[1] !== null) {
        const options = args[1];
        if (typeof options !== 'object' || Array.isArray(options)) {
          return {
            isValid: false,
            errors: [{
              type: 'invalid-options-type',
              message: 'Fetch options must be an object',
              suggestion: 'Use object with method, headers, body, etc.'
            }],
            suggestions: ['Use: {method: "POST", headers: {...}}', 'Use: {format: "json", target: "#result"}']
          };
        }
      }

      return {
        isValid: true,
        errors: [],
        suggestions: []
      };
      
    } catch (error) {
      return {
        isValid: false,
        errors: [{
          type: 'runtime-error',
          message: 'Validation failed with exception',
          suggestion: 'Check input types and values'
        }],
        suggestions: ['Ensure arguments match expected types']
      };
    }
  }
}

// ============================================================================
// Plugin Export for Tree-Shaking
// ============================================================================

/**
 * Plugin factory for modular imports
 * @llm-bundle-size 10KB
 * @llm-description Type-safe fetch command with comprehensive HTTP support, response processing, and DOM integration
 */
export function createFetchCommand(options?: FetchCommandOptions): FetchCommand {
  return new FetchCommand(options);
}

// Default export for convenience
export default FetchCommand;