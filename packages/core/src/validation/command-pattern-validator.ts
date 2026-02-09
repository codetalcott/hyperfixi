/**
 * Command Pattern Validator (V2)
 *
 * Validates that commands follow the V2 decorator-based pattern:
 * - @command({ name, category }) decorator injects `name` property
 * - @meta({ description, syntax, examples, ... }) decorator injects `metadata` property
 * - execute() method for command logic
 * - validate() method as type guard
 * - createXCommand() factory function for tree-shaking
 */

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
    hasValidation: boolean;
    hasFactoryFunction: boolean;
    hasBundleAnnotations: boolean;
    hasAsyncExecute: boolean;
  };
}

export interface CommandAnalysis {
  commandName: string;
  filePath: string;
  validation: PatternValidationResult;
  recommendations: string[];
}

/**
 * Core pattern validator for individual commands (V2 decorator pattern)
 */
export class CommandPatternValidator {
  /**
   * Validates if a command follows the V2 decorator-based pattern
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
    const maxScore = 7;

    // Create instance for testing
    let instance: Record<string, unknown>;
    try {
      instance = new CommandClass() as Record<string, unknown>;
    } catch {
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
          hasValidation: false,
          hasFactoryFunction: false,
          hasBundleAnnotations: false,
          hasAsyncExecute: false,
        },
      };
    }

    // 1. Check V2 decorator interface compliance (name, metadata, execute, validate)
    const hasCorrectInterface = this.validateInterface(instance);
    if (hasCorrectInterface) {
      passed.push('Implements V2 decorator interface (name, metadata, execute, validate)');
      score++;
    } else {
      failed.push('Missing V2 decorator interface properties');
      suggestions.push('Apply @command and @meta decorators, implement execute() and validate()');
    }

    // 2. Check required metadata properties from @meta decorator
    const hasRequiredProperties = this.validateRequiredProperties(instance);
    if (hasRequiredProperties) {
      passed.push('Has all required metadata (description, syntax, examples, category)');
      score++;
    } else {
      failed.push('Missing required metadata properties');
      suggestions.push(
        'Ensure @meta decorator includes description, syntax, examples; @command includes category'
      );
    }

    // 3. Check metadata quality (optional fields populated)
    const hasProperMetadata = this.validateMetadataQuality(
      instance.metadata as Record<string, unknown>
    );
    if (hasProperMetadata) {
      passed.push('Has quality metadata (sideEffects, examples with 2+ items)');
      score++;
    } else {
      failed.push('Metadata quality could be improved');
      suggestions.push('Add sideEffects array and at least 2 usage examples');
    }

    // 4. Check validation method (optional in V2 — not all commands define it)
    const hasValidation = this.validateValidationMethod(instance);
    if (hasValidation) {
      passed.push('Has validate method (type guard)');
      score++;
    } else {
      failed.push('No validate method (optional)');
      suggestions.push('Consider adding validate(input: unknown): input is TInput type guard');
    }

    // 5. Check factory function
    const hasFactoryFunction = factoryFunction !== undefined;
    if (hasFactoryFunction) {
      passed.push('Has factory function for tree-shaking');
      score++;
    } else {
      failed.push('Missing factory function');
      suggestions.push('Add createXCommand() factory function for modular imports');
    }

    // 6. Check bundle annotations in source code
    const hasBundleAnnotations = sourceCode ? this.validateBundleAnnotations(sourceCode) : false;
    if (hasBundleAnnotations) {
      passed.push('Has @llm-bundle-size annotations');
      score++;
    } else {
      failed.push('Missing @llm-bundle-size annotations');
      suggestions.push('Add @llm-bundle-size and @llm-description JSDoc annotations');
    }

    // 7. Check execute is async
    const hasAsyncExecute = this.validateAsyncExecute(instance);
    if (hasAsyncExecute) {
      passed.push('Execute method is async');
      score++;
    } else {
      failed.push('Execute method should be async');
      suggestions.push('Make execute() return a Promise');
    }

    const finalScore = Math.round((score / maxScore) * 100);
    const isEnhanced = finalScore >= 80;

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
        hasValidation,
        hasFactoryFunction,
        hasBundleAnnotations,
        hasAsyncExecute,
      },
    };
  }

  /**
   * Check V2 decorator interface: name (from @command), metadata (from @meta),
   * execute method. validate is optional in V2 (not all commands define it).
   */
  private static validateInterface(instance: Record<string, unknown>): boolean {
    return (
      typeof instance.name === 'string' &&
      instance.metadata !== undefined &&
      typeof instance.metadata === 'object' &&
      typeof instance.execute === 'function'
    );
  }

  /**
   * Check required metadata fields populated by @command and @meta decorators
   */
  private static validateRequiredProperties(instance: Record<string, unknown>): boolean {
    if (typeof instance.name !== 'string' || instance.name.length === 0) return false;

    const metadata = instance.metadata as Record<string, unknown> | undefined;
    if (!metadata || typeof metadata !== 'object') return false;

    const syntax = metadata.syntax;
    const hasSyntax =
      (typeof syntax === 'string' && syntax.length > 0) ||
      (Array.isArray(syntax) && syntax.length > 0);

    return (
      typeof metadata.description === 'string' &&
      (metadata.description as string).length > 0 &&
      hasSyntax &&
      Array.isArray(metadata.examples) &&
      (metadata.examples as unknown[]).length > 0 &&
      typeof metadata.category === 'string' &&
      (metadata.category as string).length > 0
    );
  }

  /**
   * Check metadata quality — optional fields that indicate thorough documentation
   */
  private static validateMetadataQuality(metadata: Record<string, unknown>): boolean {
    if (!metadata || typeof metadata !== 'object') return false;

    const hasExamplesQuality =
      Array.isArray(metadata.examples) && (metadata.examples as unknown[]).length >= 2;

    const hasSideEffects =
      metadata.sideEffects === undefined || Array.isArray(metadata.sideEffects);

    return hasExamplesQuality && hasSideEffects;
  }

  /**
   * Check validate method exists and is callable.
   * V2 commands use validate as a type guard (returns boolean), not V1's
   * {isValid, errors[], suggestions[]} object.
   */
  private static validateValidationMethod(instance: Record<string, unknown>): boolean {
    if (typeof instance.validate !== 'function') return false;

    try {
      // V2 validate is a type guard — returns boolean
      const result = (instance.validate as (input: unknown) => unknown)({});
      return typeof result === 'boolean';
    } catch {
      // If it throws on invalid input, that's acceptable behavior
      return true;
    }
  }

  private static validateBundleAnnotations(sourceCode: string): boolean {
    return sourceCode.includes('@llm-bundle-size') && sourceCode.includes('@llm-description');
  }

  /**
   * Check that execute is an async function
   */
  private static validateAsyncExecute(instance: Record<string, unknown>): boolean {
    if (typeof instance.execute !== 'function') return false;

    // Check if the function is async (AsyncFunction constructor name)
    const executeFn = instance.execute as Function;
    return executeFn.constructor.name === 'AsyncFunction';
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

      const recommendations = validation.suggestions.slice(0, 3);

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

    console.log(`\n${commandName} Command Analysis`);
    console.log(`Score: ${score}/100 ${isEnhanced ? 'ENHANCED' : 'NEEDS WORK'}`);

    if (passed.length > 0) {
      console.log('\nPassed Checks:');
      passed.forEach(check => console.log(`  + ${check}`));
    }

    if (failed.length > 0) {
      console.log('\nFailed Checks:');
      failed.forEach(check => console.log(`  - ${check}`));
    }

    if (suggestions.length > 0) {
      console.log('\nSuggestions:');
      suggestions.slice(0, 3).forEach(suggestion => console.log(`  * ${suggestion}`));
    }
  }

  static printSuiteValidation(
    result: Awaited<ReturnType<typeof CommandSuiteValidator.validateCommandSuite>>
  ): void {
    const { overall, commands, recommendations } = result;

    console.log('\nCOMMAND SUITE VALIDATION');
    console.log(`Overall Score: ${overall.averageScore}/100`);
    console.log(`Enhanced Commands: ${overall.enhanced}/${overall.total}`);
    console.log(`Need Enhancement: ${overall.needsWork}`);

    console.log('\nCommand Breakdown:');
    commands
      .sort((a, b) => b.validation.score - a.validation.score)
      .forEach(cmd => {
        const status = cmd.validation.isEnhanced ? '+' : '-';
        console.log(`  ${status} ${cmd.commandName}: ${cmd.validation.score}/100`);
      });

    if (recommendations.length > 0) {
      console.log('\nPriority Recommendations:');
      recommendations.forEach(rec => console.log(`  * ${rec}`));
    }
  }
}
