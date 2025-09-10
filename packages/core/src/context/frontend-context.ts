/**
 * Frontend Context Implementation
 * Type-safe browser-based hyperscript context following enhanced pattern
 */

import { v, type RuntimeValidator } from '../validation/lightweight-validators';
import {
  EnhancedContextBase,
  BaseContextInputSchema,
  BaseContextOutputSchema,
  type BaseContextInput,
  type BaseContextOutput,
  type ContextMetadata,
  type ValidationResult,
  type EvaluationResult
} from '../types/enhanced-context';
import type { LLMDocumentation, EvaluationType } from '../types/enhanced-core';

// ============================================================================
// Frontend Context Input/Output Schemas
// ============================================================================

export const FrontendContextInputSchema = v.object({
  /** DOM environment */
  dom: z.object({
    document: v.any().optional(), // Browser Document
    window: v.any().optional(),   // Browser Window
  }).optional(),
  /** Browser APIs */
  apis: v.object({
    fetch: z.function().optional(),
    localStorage: v.any().optional(),
    sessionStorage: v.any().optional(),
    location: v.any().optional(),
  }).optional(),
  /** User interaction state */
  userState: v.object({
    isAuthenticated: v.boolean().optional(),
    permissions: v.array(v.string()).optional(),
    preferences: z.record(v.string(), v.unknown()).optional(),
  }).optional(),
}).merge(BaseContextInputSchema);

export const FrontendContextOutputSchema = v.object({
  /** Frontend-specific capabilities */
  query: z.function(), // DOM query function
  on: z.function(),    // Event handler function
  apis: z.object({
    fetch: z.function(),
    storage: z.object({
      get: z.function(),
      set: z.function(),
      remove: z.function(),
    }),
    navigation: v.object({
      navigate: z.function(),
      back: z.function(),
      forward: z.function(),
    }),
  }),
}).merge(BaseContextOutputSchema);

export type FrontendContextInput = z.infer<typeof FrontendContextInputSchema>;
export type FrontendContextOutput = z.infer<typeof FrontendContextOutputSchema>;

// ============================================================================
// Frontend Context Implementation
// ============================================================================

export class TypedFrontendContextImplementation extends EnhancedContextBase<FrontendContextInput, FrontendContextOutput> {
  public readonly name = 'frontendContext';
  public readonly category = 'Frontend' as const;
  public readonly description = 'Type-safe frontend hyperscript context with DOM access and browser APIs';
  public readonly inputSchema = FrontendContextInputSchema;
  public readonly outputType: EvaluationType = 'Context';

  public readonly metadata: ContextMetadata = {
    category: 'Frontend',
    complexity: 'simple',
    sideEffects: ['dom-manipulation', 'api-calls', 'storage-access'],
    dependencies: ['document', 'window', 'browser-apis'],
    returnTypes: ['Context'],
    examples: [
      {
        input: '{ dom: { document }, apis: { fetch, localStorage } }',
        description: 'Initialize frontend context with DOM and browser APIs',
        expectedOutput: 'TypedFrontendContext with query, event, and API capabilities'
      },
      {
        input: '{ userState: { isAuthenticated: true, permissions: ["read", "write"] } }',
        description: 'Frontend context with authenticated user state',
        expectedOutput: 'Context with user-aware capabilities'
      }
    ],
    relatedContexts: ['backendContext', 'universalContext'],
    frameworkDependencies: ['browser'],
    environmentRequirements: {
      browser: true,
      server: false
    },
    performance: {
      averageTime: 2.5,
      complexity: 'O(1)'
    }
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Creates type-safe frontend context for browser-based hyperscript execution with DOM access, event handling, and browser API integration',
    parameters: [
      {
        name: 'contextData',
        type: 'FrontendContextInput',
        description: 'Frontend-specific context initialization data including DOM references and browser APIs',
        optional: false,
        examples: [
          '{ dom: { document, window } }',
          '{ apis: { fetch, localStorage }, userState: { isAuthenticated: true } }',
          '{ dom: { document }, userState: { permissions: ["admin"] } }'
        ]
      }
    ],
    returns: {
      type: 'FrontendContext',
      description: 'Initialized frontend context with DOM query capabilities, event handling, and browser API access',
      examples: [
        'context.query("button").on("click", handler)',
        'context.apis.storage.set("key", "value")',
        'context.apis.navigation.navigate("/path")'
      ]
    },
    examples: [
      {
        title: 'Basic DOM interaction',
        code: 'const context = new TypedFrontendContextImplementation(); await context.initialize({ dom: { document } })',
        explanation: 'Create frontend context for DOM manipulation and event handling',
        output: 'Context with query() and on() methods for DOM interaction'
      },
      {
        title: 'Full browser API context',
        code: 'await context.initialize({ dom: { document, window }, apis: { fetch, localStorage } })',
        explanation: 'Initialize complete frontend context with all browser capabilities',
        output: 'Full-featured browser context with API access'
      },
      {
        title: 'User-aware frontend context',
        code: 'await context.initialize({ userState: { isAuthenticated: true, permissions: ["write"] } })',
        explanation: 'Create context with user authentication and permission awareness',
        output: 'Context with user-aware capabilities and permission checking'
      }
    ],
    seeAlso: ['backendContext', 'universalContext', 'enhancedExpressions'],
    tags: ['context', 'frontend', 'browser', 'dom', 'type-safe', 'enhanced-pattern']
  };

  async initialize(input: FrontendContextInput): Promise<EvaluationResult<FrontendContextOutput>> {
    const startTime = Date.now();
    
    try {
      // Validate input using enhanced pattern
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          suggestions: validation.suggestions
        };
      }

      // Create enhanced frontend context
      const context: FrontendContextOutput = {
        contextId: `frontend-${Date.now()}`,
        timestamp: startTime,
        category: 'Frontend',
        capabilities: ['dom-query', 'event-handling', 'api-access', 'storage', 'navigation'],
        state: 'ready',
        
        // Enhanced DOM query function
        query: this.createEnhancedQuery(input.dom?.document),
        
        // Enhanced event handling
        on: this.createEnhancedEventHandler(),
        
        // Enhanced browser APIs
        apis: {
          fetch: this.createEnhancedFetch(input.apis?.fetch),
          storage: this.createEnhancedStorage(input.apis?.localStorage, input.apis?.sessionStorage),
          navigation: this.createEnhancedNavigation(input.apis?.location),
        }
      };

      // Track performance using enhanced pattern
      this.trackPerformance(startTime, true, context);
      
      return {
        success: true,
        value: context,
        type: 'Context'
      };

    } catch (error) {
      this.trackPerformance(startTime, false);
      
      return {
        success: false,
        errors: [{
          type: 'runtime-error',
          message: `Frontend context initialization failed: ${error instanceof Error ? error.message : String(error)}`
        }],
        suggestions: [
          'Ensure document and window are available',
          'Verify browser API compatibility',
          'Check user state validity'
        ]
      };
    }
  }

  // ============================================================================
  // Enhanced Helper Methods (following enhanced expression pattern)
  // ============================================================================

  private createEnhancedQuery(document?: any) {
    return (selector: string) => {
      if (!document) {
        throw new Error('DOM document not available in frontend context');
      }
      return document.querySelectorAll(selector);
    };
  }

  private createEnhancedEventHandler() {
    return (element: any, event: string, handler: Function) => {
      if (element && typeof element.addEventListener === 'function') {
        element.addEventListener(event, handler);
      }
    };
  }

  private createEnhancedFetch(fetchApi?: Function) {
    return async (url: string, options?: any) => {
      if (!fetchApi) {
        throw new Error('Fetch API not available in frontend context');
      }
      return await fetchApi(url, options);
    };
  }

  private createEnhancedStorage(localStorage?: any, sessionStorage?: any) {
    return {
      get: (key: string, useSession = false) => {
        const storage = useSession ? sessionStorage : localStorage;
        return storage ? storage.getItem(key) : null;
      },
      set: (key: string, value: string, useSession = false) => {
        const storage = useSession ? sessionStorage : localStorage;
        if (storage) storage.setItem(key, value);
      },
      remove: (key: string, useSession = false) => {
        const storage = useSession ? sessionStorage : localStorage;
        if (storage) storage.removeItem(key);
      }
    };
  }

  private createEnhancedNavigation(location?: any) {
    return {
      navigate: (path: string) => {
        if (location) location.href = path;
      },
      back: () => {
        if (history && typeof history.back === 'function') history.back();
      },
      forward: () => {
        if (history && typeof history.forward === 'function') history.forward();
      }
    };
  }

  protected validateContextSpecific(data: FrontendContextInput): ValidationResult {
    const errors: Array<{ type: string; message: string; path?: string }> = [];
    const suggestions: string[] = [];

    // Validate browser environment availability
    if (data.dom && !data.dom.document) {
      errors.push({
        type: 'missing-dependency',
        message: 'DOM document is required for frontend context',
        path: 'dom.document'
      });
      suggestions.push('Ensure context is initialized in browser environment');
    }

    // Validate user state structure
    if (data.userState && data.userState.permissions) {
      if (!Array.isArray(data.userState.permissions)) {
        errors.push({
          type: 'invalid-type',
          message: 'User permissions must be an array of strings',
          path: 'userState.permissions'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      suggestions
    };
  }
}

// ============================================================================
// Convenience Factory Function
// ============================================================================

export function createFrontendContext(): TypedFrontendContextImplementation {
  return new TypedFrontendContextImplementation();
}

// ============================================================================
// Export for Registry Registration
// ============================================================================

export const frontendContextImplementation = new TypedFrontendContextImplementation();