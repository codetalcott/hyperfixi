
/**
 * LLM Code Generation Context
 * Type-safe LLM code generation with enhanced validation patterns
 */

import { v, z } from '../validation/lightweight-validators';
import {
  EnhancedContextBase,
  BaseContextInputSchema,
  BaseContextOutputSchema,
  type ContextMetadata,
  type EvaluationResult
} from '../types/enhanced-context';
import type { ValidationResult, EvaluationType } from '../types/base-types';
import type { LLMDocumentation } from '../types/enhanced-core';

// ============================================================================
// LLM Generation Input/Output Schemas
// ============================================================================

export const LLMGenerationInputSchema = v.object({
  /** Code generation prompt */
  prompt: v.string().min(1),
  /** Target environment for generated code */
  targetEnvironment: z.enum(['frontend', 'backend', 'universal']),
  /** Framework context if applicable */
  framework: z.object({
    name: z.enum(['django', 'flask', 'express', 'fastapi', 'gin', 'vanilla']).optional(),
    version: v.string().optional(),
  }).optional(),
  /** Type safety requirements */
  typeSafety: z.enum(['strict', 'moderate', 'loose']).default('strict'),
  /** Output format preferences */
  outputFormat: z.enum(['hyperscript', 'html-with-hyperscript', 'template', 'component']).default('hyperscript'),
  /** Available context variables and their types */
  availableVariables: z.record(v.string(), v.object({
    type: z.enum(['string', 'number', 'boolean', 'array', 'object', 'element']),
    nullable: v.boolean().default(false),
    optional: v.boolean().default(false),
    description: v.string().optional(),
  })).optional(),
  /** Available enhanced implementations */
  enhancedImplementations: v.object({
    expressions: v.array(v.string()).optional(),
    contexts: v.array(v.string()).optional(),
    commands: v.array(v.string()).optional(),
  }).optional(),
}).merge(BaseContextInputSchema);

export const LLMGenerationOutputSchema = v.object({
  /** Generated hyperscript code */
  code: v.string(),
  /** Type validation results */
  validation: z.object({
    isValid: v.boolean(),
    errors: v.array(z.object({
      type: v.string(),
      message: v.string(),
      line: v.number().optional(),
      suggestion: v.string().optional(),
    })),
    warnings: v.array(v.object({
      type: v.string(),
      message: v.string(),
      suggestion: v.string().optional(),
    })),
  }),
  /** Inferred types from generated code */
  inferredTypes: z.record(v.string(), v.object({
    type: v.string(),
    confidence: v.number().min(0).max(1),
    usage: v.array(v.string()),
  })),
  /** Performance analysis */
  performance: v.object({
    estimatedExecutionTime: v.number(),
    complexity: z.enum(['O(1)', 'O(n)', 'O(n^2)', 'O(log n)']),
    recommendations: v.array(v.string()),
  }),
  /** Framework-specific annotations */
  frameworkNotes: v.array(v.string()).optional(),
}).merge(BaseContextOutputSchema);

export type LLMGenerationInput = any; // Inferred from RuntimeValidator
export type LLMGenerationOutput = any; // Inferred from RuntimeValidator

// ============================================================================
// LLM Generation Context Implementation
// ============================================================================

export class TypedLLMGenerationContextImplementation extends EnhancedContextBase<LLMGenerationInput, LLMGenerationOutput> {
  public readonly name = 'llmGenerationContext';
  public readonly category = 'Universal' as const;
  public readonly description = 'Type-safe LLM code generation with enhanced pattern validation';
  public readonly inputSchema = LLMGenerationInputSchema;
  public readonly outputType: EvaluationType = 'Context';

  public readonly metadata: ContextMetadata = {
    category: 'Universal',
    complexity: 'complex',
    sideEffects: ['code-generation', 'type-validation', 'performance-analysis'],
    dependencies: ['enhanced-patterns', 'type-system', 'validation-engine'],
    returnTypes: ['Context'],
    examples: [
      {
        input: '{ prompt: "create login form", targetEnvironment: "frontend", typeSafety: "strict" }',
        description: 'Generate type-safe frontend login form with validation',
        expectedOutput: 'Validated hyperscript with type annotations and performance analysis'
      },
      {
        input: '{ prompt: "user registration API", targetEnvironment: "backend", framework: { name: "django" } }',
        description: 'Generate Django-compatible API endpoint with ORM integration',
        expectedOutput: 'Server-side hyperscript with Django model types and validations'
      }
    ],
    relatedExpressions: [],
    relatedContexts: ['frontendContext', 'backendContext', 'enhancedExpressions'],
    frameworkDependencies: ['typescript', 'enhanced-patterns'],
    environmentRequirements: {
      browser: false,
      server: true,
      nodejs: true
    },
    performance: {
      averageTime: 125.5,
      complexity: 'O(n²)' // n=prompt complexity, m=context size
    }
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Generates type-safe, context-aware hyperscript code using enhanced patterns with comprehensive validation and performance analysis',
    parameters: [
      {
        name: 'generationInput',
        type: 'LLMGenerationInput',
        description: 'Code generation request with prompt, environment, and type safety requirements',
        optional: false,
        examples: [
          '{ prompt: "toggle button", targetEnvironment: "frontend", typeSafety: "strict" }',
          '{ prompt: "user CRUD", targetEnvironment: "backend", framework: { name: "django" } }',
          '{ prompt: "form validation", outputFormat: "component", availableVariables: { email: { type: "string" } } }'
        ]
      }
    ],
    returns: {
      type: 'LLMGenerationOutput',
      description: 'Generated code with type validation results, inferred types, and performance analysis',
      examples: [
        '{ code: "on click toggle .hidden", validation: { isValid: true }, inferredTypes: {...} }',
        '{ code: "fetch /api/users then put result into #users", performance: { complexity: "O(n)" } }'
      ]
    },
    examples: [
      {
        title: 'Frontend component generation',
        code: 'await generator.initialize({ prompt: "interactive search box", targetEnvironment: "frontend" })',
        explanation: 'Generate type-safe frontend search component with DOM validation',
        output: 'Validated hyperscript with browser API types and event handling'
      },
      {
        title: 'Backend API generation',
        code: 'await generator.initialize({ prompt: "REST endpoint", targetEnvironment: "backend", framework: { name: "express" } })',
        explanation: 'Generate Express-compatible API endpoint with request/response types',
        output: 'Server-side hyperscript with Express middleware and routing types'
      },
      {
        title: 'Universal component generation',
        code: 'await generator.initialize({ prompt: "data formatter", targetEnvironment: "universal", typeSafety: "strict" })',
        explanation: 'Generate framework-agnostic utility with strict type checking',
        output: 'Universal hyperscript with comprehensive type safety and cross-platform compatibility'
      }
    ],
    seeAlso: ['frontendContext', 'backendContext', 'enhancedExpressions', 'typeValidator'],
    tags: ['llm', 'generation', 'type-safe', 'context-aware', 'validation', 'enhanced-pattern']
  };

  async initialize(input: LLMGenerationInput): Promise<EvaluationResult<LLMGenerationOutput>> {
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

      // Generate code using enhanced LLM patterns
      const generatedCode = await this.generateEnhancedCode(input);
      
      // Validate generated code
      const codeValidation = await this.validateGeneratedCode(generatedCode, input);
      
      // Infer types from generated code
      const inferredTypes = await this.inferTypesFromCode(generatedCode, input);
      
      // Analyze performance
      const performanceAnalysis = await this.analyzePerformance(generatedCode, input);
      
      // Generate framework-specific notes
      const frameworkNotes = this.generateFrameworkNotes(generatedCode, input);

      const result: LLMGenerationOutput = {
        contextId: `llm-generation-${Date.now()}`,
        timestamp: startTime,
        category: 'Universal',
        capabilities: ['code-generation', 'type-validation', 'performance-analysis', 'framework-integration'],
        state: 'ready',
        
        code: generatedCode,
        validation: codeValidation,
        inferredTypes,
        performance: performanceAnalysis,
        frameworkNotes
      };

      // Track performance using enhanced pattern
      this.trackPerformance(startTime, true, result);
      
      return {
        success: true,
        value: result,
        type: 'Context'
      };

    } catch (error) {
      this.trackPerformance(startTime, false);
      
      return {
        success: false,
        errors: [{
          type: 'runtime-error',
          message: `LLM code generation failed: ${error instanceof Error ? error.message : String(error)}`
        }],
        suggestions: [
          'Simplify the generation prompt',
          'Check available context variables and types',
          'Verify framework compatibility requirements'
        ]
      };
    }
  }

  // ============================================================================
  // Enhanced Code Generation Methods
  // ============================================================================

  private async generateEnhancedCode(input: LLMGenerationInput): Promise<string> {
    const { prompt, targetEnvironment, framework, outputFormat, availableVariables } = input;
    
    // Build context-aware generation prompt
    let enhancedPrompt = `Generate ${outputFormat} for: "${prompt}"`;
    enhancedPrompt += `\nTarget: ${targetEnvironment}`;
    
    if (framework) {
      enhancedPrompt += `\nFramework: ${framework.name}${framework.version ? ` v${framework.version}` : ''}`;
    }
    
    if (availableVariables && Object.keys(availableVariables).length > 0) {
      enhancedPrompt += '\nAvailable variables:\n';
      Object.entries(availableVariables).forEach(([name, def]) => {
        const typedDef = def as any;
        enhancedPrompt += `- ${name}: ${typedDef.type}${typedDef.nullable ? ' | null' : ''}${typedDef.optional ? ' (optional)' : ''}\n`;
      });
    }
    
    // Generate code based on environment and patterns
    return this.generateCodeForEnvironment(enhancedPrompt, input);
  }

  private generateCodeForEnvironment(prompt: string, input: LLMGenerationInput): string {
    const { targetEnvironment } = input;
    
    // Frontend code generation patterns
    if (targetEnvironment === 'frontend') {
      return this.generateFrontendCode(prompt, input);
    }
    
    // Backend code generation patterns
    if (targetEnvironment === 'backend') {
      return this.generateBackendCode(prompt, input);
    }
    
    // Universal code generation patterns
    return this.generateUniversalCode(prompt, input);
  }

  private generateFrontendCode(prompt: string, _input: LLMGenerationInput): string {
    // Enhanced frontend code generation logic
    // Simple pattern-based generation (would be more sophisticated with actual LLM)
    if (prompt.includes('button') || prompt.includes('click')) {
      return 'on click add .active to me then wait 2s then remove .active from me';
    }
    
    if (prompt.includes('form') || prompt.includes('input')) {
      return 'on input validate me then if valid add .success to me else add .error to me';
    }
    
    if (prompt.includes('fetch') || prompt.includes('api')) {
      return 'on click fetch /api/data then put result into #content';
    }
    
    return 'on click log "Generated frontend hyperscript"';
  }

  private generateBackendCode(_prompt: string, input: LLMGenerationInput): string {
    // Enhanced backend code generation logic
    const { framework } = input;
    
    if (framework?.name === 'django') {
      return 'on request validate csrf then query User.objects.all() then render template';
    }
    
    if (framework?.name === 'express') {
      return 'on post to /api/users validate request.body then save to database then respond with json';
    }
    
    return 'on request log request.method then respond with status 200';
  }

  private generateUniversalCode(_prompt: string, _input: LLMGenerationInput): string {
    // Universal code generation patterns
    return 'set result to (call processData with input) then log result';
  }

  private async validateGeneratedCode(code: string, _input: LLMGenerationInput) {
    const errors: Array<{ type: string; message: string; line?: number; suggestion?: string }> = [];
    const warnings: Array<{ type: string; message: string; suggestion?: string }> = [];
    
    // Basic syntax validation
    if (!code.trim()) {
      errors.push({
        type: 'empty-code',
        message: 'Generated code is empty',
        suggestion: 'Try a more specific prompt'
      });
    suggestions: []
    }
    
    // Environment-specific validation
    if (input.targetEnvironment === 'frontend' && !code.includes('on ')) {
      warnings.push({
        type: 'missing-event',
        message: 'Frontend code typically includes event handlers',
        suggestion: 'Consider adding event triggers like "on click" or "on input"'
      });
    suggestions: []
    }
    
    // Type safety validation
    if (input.typeSafety === 'strict') {
      if (code.includes('undefined') || code.includes('null')) {
        warnings.push({
          type: 'type-safety',
          message: 'Potential null/undefined values detected',
          suggestion: 'Add null checks or use optional chaining'
        });
      suggestions: []
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private async inferTypesFromCode(code: string, input: LLMGenerationInput) {
    const types: Record<string, { type: string; confidence: number; usage: string[] }> = {};
    
    // Simple type inference (would be more sophisticated in practice)
    const variables = input.availableVariables || {};
    
    Object.entries(variables).forEach(([name, def]) => {
      if (code.includes(name)) {
        types[name] = {
          type: (def as any).type,
          confidence: 0.9,
          usage: [code.includes(`${name}.`) ? 'property-access' : 'variable-reference']
        };
      }
    });
    
    return types;
  }

  private async analyzePerformance(code: string, _input: LLMGenerationInput) {
    const recommendations: string[] = [];
    let complexity: 'O(1)' | 'O(n)' | 'O(n^2)' | 'O(log n)' = 'O(1)';
    let estimatedExecutionTime = 10; // milliseconds
    
    // Performance analysis logic
    if (code.includes('fetch')) {
      estimatedExecutionTime += 100; // Network request time
      recommendations.push('Consider caching for repeated API calls');
    }
    
    if (code.includes('query') || code.includes('database')) {
      complexity = 'O(n)';
      estimatedExecutionTime += 50;
      recommendations.push('Optimize database queries with proper indexing');
    }
    
    if (code.includes('loop') || code.includes('for each')) {
      complexity = 'O(n)';
      recommendations.push('Consider pagination for large datasets');
    }
    
    return {
      estimatedExecutionTime,
      complexity,
      recommendations
    };
  }

  private generateFrameworkNotes(_code: string, input: LLMGenerationInput): string[] {
    const notes: string[] = [];
    const { framework, targetEnvironment } = input;
    
    if (framework?.name === 'django' && targetEnvironment === 'backend') {
      notes.push('Ensure CSRF protection is enabled for POST requests');
      notes.push('Use Django ORM QuerySets for database operations');
      notes.push('Consider using Django forms for validation');
    }
    
    if (framework?.name === 'express' && targetEnvironment === 'backend') {
      notes.push('Add middleware for request validation');
      notes.push('Implement proper error handling with try-catch blocks');
      notes.push('Use Express Router for modular route organization');
    }
    
    if (targetEnvironment === 'frontend') {
      notes.push('Ensure DOM elements exist before manipulation');
      notes.push('Consider progressive enhancement for accessibility');
      notes.push('Add error handling for network requests');
    }
    
    return notes;
  }

  protected validateContextSpecific(data: LLMGenerationInput): ValidationResult {
    const errors: Array<{ type: string; message: string; path?: string }> = [];
    const suggestions: string[] = [];

    // Validate prompt quality
    if (data.prompt.length < 5) {
      errors.push({
        type: 'insufficient-prompt',
        message: 'Prompt is too short for effective code generation',
        path: 'prompt'
      });
      suggestions.push('Provide more detailed description of desired functionality');
    suggestions: []
    }

    // Validate framework compatibility
    if (data.framework && data.targetEnvironment === 'frontend') {
      const frontendFrameworks = ['vanilla'];
      if (!frontendFrameworks.includes(data.framework.name)) {
        errors.push({
          type: 'framework-mismatch',
          message: `Framework ${data.framework.name} is not supported for frontend environment`,
          path: 'framework.name'
        });
      suggestions: []
      }
    }

    // Validate available variables structure
    if (data.availableVariables) {
      Object.entries(data.availableVariables).forEach(([name, def]) => {
        if (!(def as any).type) {
          errors.push({
            type: 'missing-type',
            message: `Variable ${name} is missing type definition`,
            path: `availableVariables.${name}.type`
          });
        suggestions: []
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      suggestions
    };
  }
}

// ============================================================================
// Convenience Factory Functions
// ============================================================================

export function createLLMGenerationContext(): TypedLLMGenerationContextImplementation {
  return new TypedLLMGenerationContextImplementation();
}

export async function generateHyperscript(
  prompt: string,
  targetEnvironment: 'frontend' | 'backend' | 'universal',
  options?: Partial<LLMGenerationInput>
): Promise<EvaluationResult<LLMGenerationOutput>> {
  const generator = new TypedLLMGenerationContextImplementation();
  return generator.initialize({
    prompt,
    targetEnvironment,
    ...options
  });
}

// ============================================================================
// Export for Registry Registration
// ============================================================================

export const llmGenerationContextImplementation = new TypedLLMGenerationContextImplementation();