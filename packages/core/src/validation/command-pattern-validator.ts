/**
 * Enhanced Command Pattern Validator
 * Validates that commands follow the enhanced TypeScript pattern for LLM agents
 */

// Removed unused zod import

export interface PatternValidationResult {
  isEnhanced: boolean;
  score: number; // 0-100 compliance score
  passed: string[];
  failed: string[];
  suggestions: string[];
  details: {
    hasCorrectInterface: boolean;
    hasRequiredProperties: boolean;
    hasProperMetadata: boolean;
    hasLLMDocumentation: boolean;
    hasValidation: boolean;
    hasFactoryFunction: boolean;
    hasBundleAnnotations: boolean;
    hasStructuredErrors: boolean;
  };
}

export interface CommandAnalysis {
  commandName: string;
  filePath: string;
  validation: PatternValidationResult;
  recommendations: string[];
}

/**
 * Core pattern validator for individual commands
 */
export class CommandPatternValidator {
  /**
   * Validates if a command follows the enhanced TypeScript pattern
   */
  static validateCommand(
    CommandClass: new () => unknown,
    factoryFunction?: Function,
    sourceCode?: string
  ): PatternValidationResult {
    const passed: string[] = [];
    const failed: string[] = [];
    const suggestions: string[] = [];

    let score = 0;
    const maxScore = 8; // Total number of checks

    // Create instance for testing
    let instance: Record<string, unknown>;
    try {
      instance = new CommandClass() as Record<string, unknown>;
    } catch (error) {
      failed.push('Command class cannot be instantiated');
      suggestions.push('Fix constructor issues or provide proper options');
      return {
        isEnhanced: false,
        score: 0,
        passed,
        failed,
        suggestions,
        details: {
          hasCorrectInterface: false,
          hasRequiredProperties: false,
          hasProperMetadata: false,
          hasLLMDocumentation: false,
          hasValidation: false,
          hasFactoryFunction: false,
          hasBundleAnnotations: false,
          hasStructuredErrors: false,
        },
      };
    }

    // 1. Check TypedCommandImplementation interface compliance
    const hasCorrectInterface = this.validateInterface(instance);
    if (hasCorrectInterface) {
      passed.push('✅ Implements TypedCommandImplementation interface');
      score++;
    } else {
      failed.push('❌ Does not implement TypedCommandImplementation interface');
      suggestions.push(
        'Update class to implement TypedCommandImplementation<TInput, TOutput, TContext>'
      );
    }

    // 2. Check required properties
    const hasRequiredProperties = this.validateRequiredProperties(instance);
    if (hasRequiredProperties) {
      passed.push(
        '✅ Has all required properties (name, syntax, description, inputSchema, outputType)'
      );
      score++;
    } else {
      failed.push('❌ Missing required properties');
      suggestions.push('Add name, syntax, description, inputSchema, and outputType properties');
    }

    // 3. Check metadata structure
    const hasProperMetadata = this.validateMetadata(instance.metadata as Record<string, unknown>);
    if (hasProperMetadata) {
      passed.push('✅ Has properly structured CommandMetadata');
      score++;
    } else {
      failed.push('❌ Missing or invalid CommandMetadata');
      suggestions.push(
        'Add comprehensive metadata with category, complexity, sideEffects, examples, and relatedCommands'
      );
    }

    // 4. Check LLM documentation
    const hasLLMDocumentation = this.validateLLMDocumentation(
      instance.documentation as Record<string, unknown>
    );
    if (hasLLMDocumentation) {
      passed.push('✅ Has comprehensive LLMDocumentation');
      score++;
    } else {
      failed.push('❌ Missing or incomplete LLMDocumentation');
      suggestions.push(
        'Add detailed documentation with summary, parameters, returns, examples, seeAlso, and tags'
      );
    }

    // 5. Check validation method
    const hasValidation = this.validateValidationMethod(instance);
    if (hasValidation) {
      passed.push('✅ Has proper validate method with ValidationResult return type');
      score++;
    } else {
      failed.push('❌ Missing or incorrect validate method');
      suggestions.push('Implement validate(args: unknown[]): ValidationResult method');
    }

    // 6. Check factory function
    const hasFactoryFunction = factoryFunction !== undefined;
    if (hasFactoryFunction) {
      passed.push('✅ Has factory function for tree-shaking');
      score++;
    } else {
      failed.push('❌ Missing factory function');
      suggestions.push('Add createXCommand() factory function for modular imports');
    }

    // 7. Check bundle annotations in source code
    const hasBundleAnnotations = sourceCode ? this.validateBundleAnnotations(sourceCode) : false;
    if (hasBundleAnnotations) {
      passed.push('✅ Has @llm-bundle-size annotations');
      score++;
    } else {
      failed.push('❌ Missing @llm-bundle-size annotations');
      suggestions.push('Add @llm-bundle-size and @llm-description JSDoc annotations');
    }

    // 8. Check structured error handling
    const hasStructuredErrors = this.validateStructuredErrors(instance);
    if (hasStructuredErrors) {
      passed.push('✅ Uses structured error handling in execute method');
      score++;
    } else {
      failed.push('❌ Execute method does not return structured EvaluationResult');
      suggestions.push('Update execute method to return Promise<EvaluationResult<T>>');
    }

    const finalScore = Math.round((score / maxScore) * 100);
    const isEnhanced = finalScore >= 80; // 80% threshold for "enhanced"

    return {
      isEnhanced,
      score: finalScore,
      passed,
      failed,
      suggestions,
      details: {
        hasCorrectInterface,
        hasRequiredProperties,
        hasProperMetadata,
        hasLLMDocumentation,
        hasValidation,
        hasFactoryFunction,
        hasBundleAnnotations,
        hasStructuredErrors,
      },
    };
  }

  private static validateInterface(instance: Record<string, unknown>): boolean {
    return (
      typeof instance.name === 'string' &&
      typeof instance.syntax === 'string' &&
      typeof instance.description === 'string' &&
      typeof instance.outputType === 'string' &&
      instance.inputSchema !== undefined &&
      typeof instance.execute === 'function' &&
      typeof instance.validate === 'function'
    );
  }

  private static validateRequiredProperties(instance: Record<string, unknown>): boolean {
    return (
      typeof instance.name === 'string' &&
      instance.name.length > 0 &&
      typeof instance.syntax === 'string' &&
      instance.syntax.length > 0 &&
      typeof instance.description === 'string' &&
      instance.description.length > 0 &&
      typeof instance.outputType === 'string' &&
      instance.outputType.length > 0 &&
      instance.inputSchema !== undefined
    );
  }

  private static validateMetadata(metadata: Record<string, unknown>): boolean {
    if (!metadata || typeof metadata !== 'object') return false;

    return (
      typeof metadata.category === 'string' &&
      ['simple', 'medium', 'complex'].includes(metadata.complexity as string) &&
      Array.isArray(metadata.sideEffects) &&
      Array.isArray(metadata.examples) &&
      Array.isArray(metadata.relatedCommands) &&
      Array.isArray(metadata.examples) &&
      metadata.examples.every(
        (ex: Record<string, unknown>) =>
          typeof ex.code === 'string' && typeof ex.description === 'string'
      )
    );
  }

  private static validateLLMDocumentation(documentation: Record<string, unknown>): boolean {
    if (!documentation || typeof documentation !== 'object') return false;

    return (
      typeof documentation.summary === 'string' &&
      Array.isArray(documentation.parameters) &&
      typeof documentation.returns === 'object' &&
      Array.isArray(documentation.examples) &&
      Array.isArray(documentation.seeAlso) &&
      Array.isArray(documentation.tags) &&
      Array.isArray(documentation.parameters) &&
      documentation.parameters.every(
        (param: Record<string, unknown>) =>
          typeof param.name === 'string' &&
          typeof param.type === 'string' &&
          typeof param.description === 'string' &&
          typeof param.optional === 'boolean' &&
          Array.isArray(param.examples)
      )
    );
  }

  private static validateValidationMethod(instance: Record<string, unknown>): boolean {
    if (typeof instance.validate !== 'function') return false;

    try {
      // Test with empty args to see if it returns ValidationResult structure
      const result = instance.validate([]);
      return (
        typeof result === 'object' &&
        typeof result.isValid === 'boolean' &&
        Array.isArray(result.errors) &&
        Array.isArray(result.suggestions)
      );
    } catch {
      return false;
    }
  }

  private static validateBundleAnnotations(sourceCode: string): boolean {
    return sourceCode.includes('@llm-bundle-size') && sourceCode.includes('@llm-description');
  }

  private static validateStructuredErrors(instance: Record<string, unknown>): boolean {
    // This is harder to test without actually executing, but we can check method signature
    const executeMethod = (instance.execute as any).toString();
    return (
      executeMethod.includes('Promise<EvaluationResult') ||
      executeMethod.includes('EvaluationResult<') ||
      executeMethod.includes('success:') ||
      executeMethod.includes('error:')
    );
  }
}

/**
 * Batch validator for multiple commands
 */
export class CommandSuiteValidator {
  static async validateCommandSuite(
    commands: Array<{
      name: string;
      filePath: string;
      CommandClass: any;
      factoryFunction?: Function;
    }>
  ): Promise<{
    overall: {
      total: number;
      enhanced: number;
      averageScore: number;
      needsWork: number;
    };
    commands: CommandAnalysis[];
    recommendations: string[];
  }> {
    const analyses: CommandAnalysis[] = [];
    let totalScore = 0;
    let enhancedCount = 0;

    for (const command of commands) {
      // Read source code for annotation checking
      let sourceCode: string | undefined;
      try {
        const fs = await import('fs');
        sourceCode = fs.readFileSync(command.filePath, 'utf-8');
      } catch {
        // Source code reading failed, continue without it
      }

      const validation = CommandPatternValidator.validateCommand(
        command.CommandClass,
        command.factoryFunction,
        sourceCode
      );

      const recommendations = validation.suggestions.slice(0, 3); // Top 3 suggestions

      analyses.push({
        commandName: command.name,
        filePath: command.filePath,
        validation,
        recommendations,
      });

      totalScore += validation.score;
      if (validation.isEnhanced) enhancedCount++;
    }

    const averageScore = Math.round(totalScore / commands.length);
    const needsWork = commands.length - enhancedCount;

    // Generate overall recommendations
    const overallRecommendations: string[] = [];
    if (averageScore < 80) {
      overallRecommendations.push('Focus on improving validation methods and error handling');
    }
    if (enhancedCount < commands.length * 0.8) {
      overallRecommendations.push('Prioritize enhancing commands with lowest scores');
    }
    overallRecommendations.push('Consider creating command enhancement templates for consistency');

    return {
      overall: {
        total: commands.length,
        enhanced: enhancedCount,
        averageScore,
        needsWork,
      },
      commands: analyses,
      recommendations: overallRecommendations,
    };
  }
}

/**
 * Pretty print validation results
 */
export class ValidationReporter {
  static printCommandValidation(analysis: CommandAnalysis): void {
    const { commandName, validation } = analysis;
    const { score, isEnhanced, passed, failed, suggestions } = validation;

    console.log(`\n🔍 ${commandName} Command Analysis`);
    console.log(`📊 Score: ${score}/100 ${isEnhanced ? '✅ ENHANCED' : '⚠️  NEEDS WORK'}`);

    if (passed.length > 0) {
      console.log('\n✅ Passed Checks:');
      passed.forEach(check => console.log(`  ${check}`));
    }

    if (failed.length > 0) {
      console.log('\n❌ Failed Checks:');
      failed.forEach(check => console.log(`  ${check}`));
    }

    if (suggestions.length > 0) {
      console.log('\n💡 Suggestions:');
      suggestions.slice(0, 3).forEach(suggestion => console.log(`  • ${suggestion}`));
    }
  }

  static printSuiteValidation(
    result: Awaited<ReturnType<typeof CommandSuiteValidator.validateCommandSuite>>
  ): void {
    const { overall, commands, recommendations } = result;

    console.log('\n🏗️  HYPERFIXI COMMAND SUITE VALIDATION');
    console.log(`📈 Overall Score: ${overall.averageScore}/100`);
    console.log(`✅ Enhanced Commands: ${overall.enhanced}/${overall.total}`);
    console.log(`⚠️  Need Enhancement: ${overall.needsWork}`);

    console.log('\n📋 Command Breakdown:');
    commands
      .sort((a, b) => b.validation.score - a.validation.score)
      .forEach(cmd => {
        const status = cmd.validation.isEnhanced ? '✅' : '⚠️';
        console.log(`  ${status} ${cmd.commandName}: ${cmd.validation.score}/100`);
      });

    if (recommendations.length > 0) {
      console.log('\n🎯 Priority Recommendations:');
      recommendations.forEach(rec => console.log(`  • ${rec}`));
    }
  }
}
