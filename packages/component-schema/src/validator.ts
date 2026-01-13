import Ajv, { JSONSchemaType, ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import {
  ComponentDefinition,
  ComponentCollection,
  ValidationResult,
  ValidationError,
} from './types';

// Import JSON schemas
import componentSchema from '../schemas/component.json';
import collectionSchema from '../schemas/collection.json';

/**
 * Component and Collection Validator using JSON Schema
 */
export class ComponentValidator {
  private ajv: Ajv;
  private componentValidator: ValidateFunction<any>;
  private collectionValidator: ValidateFunction<any>;

  constructor() {
    this.ajv = new Ajv({
      allErrors: true,
      verbose: true,
      strict: false,
    });

    // Add format validators (date-time, uri, etc.)
    addFormats(this.ajv);

    // Compile validators
    this.componentValidator = this.ajv.compile(componentSchema as any);
    this.collectionValidator = this.ajv.compile(collectionSchema as any);
  }

  /**
   * Validate a component definition
   */
  validateComponent(component: ComponentDefinition): ValidationResult {
    const valid = this.componentValidator(component);
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    if (!valid && this.componentValidator.errors) {
      for (const error of this.componentValidator.errors) {
        const validationError: ValidationError = {
          path: error.instancePath || error.schemaPath || '',
          message: error.message || 'Validation error',
          value: error.data,
          schema: error.schema,
        };

        // Categorize as warning or error based on severity
        if (this.isWarning(error)) {
          warnings.push(validationError);
        } else {
          errors.push(validationError);
        }
      }
    }

    // Additional semantic validations
    this.validateComponentSemantics(component, errors, warnings);

    return {
      valid: valid && errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate a component collection
   */
  validateCollection(collection: ComponentCollection): ValidationResult {
    const valid = this.collectionValidator(collection);
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    if (!valid && this.collectionValidator.errors) {
      for (const error of this.collectionValidator.errors) {
        errors.push({
          path: error.instancePath || error.schemaPath || '',
          message: error.message || 'Validation error',
          value: error.data,
          schema: error.schema,
        });
      }
    }

    // Validate individual components in collection
    for (const [componentId, componentDef] of Object.entries(collection.components)) {
      if (typeof componentDef === 'object') {
        const componentResult = this.validateComponent(componentDef);

        // Prefix component errors with component ID
        for (const error of componentResult.errors) {
          errors.push({
            ...error,
            path: `components.${componentId}.${error.path}`,
          });
        }

        for (const warning of componentResult.warnings) {
          warnings.push({
            ...warning,
            path: `components.${componentId}.${warning.path}`,
          });
        }
      }
    }

    // Additional collection-level validations
    this.validateCollectionSemantics(collection, errors, warnings);

    return {
      valid: valid && errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate component semantic rules beyond JSON schema
   */
  private validateComponentSemantics(
    component: ComponentDefinition,
    errors: ValidationError[],
    warnings: ValidationError[]
  ): void {
    // Validate hyperscript syntax patterns
    this.validateHyperscriptSyntax(component, errors, warnings);

    // Validate template variable usage
    this.validateTemplateVariables(component, errors, warnings);

    // Validate dependencies
    this.validateDependencies(component, errors, warnings);

    // Validate test consistency
    this.validateTestConsistency(component, errors, warnings);
  }

  /**
   * Validate collection semantic rules
   */
  private validateCollectionSemantics(
    collection: ComponentCollection,
    errors: ValidationError[],
    warnings: ValidationError[]
  ): void {
    // Check for component ID uniqueness
    const componentIds = new Set<string>();
    for (const [id, componentDef] of Object.entries(collection.components)) {
      if (typeof componentDef === 'object' && componentDef.id) {
        if (componentIds.has(componentDef.id)) {
          errors.push({
            path: `components.${id}.id`,
            message: `Duplicate component ID: ${componentDef.id}`,
            value: componentDef.id,
          });
        }
        componentIds.add(componentDef.id);
      }
    }

    // Validate component dependencies within collection
    this.validateInternalDependencies(collection, errors, warnings);
  }

  /**
   * Basic hyperscript syntax validation
   */
  private validateHyperscriptSyntax(
    component: ComponentDefinition,
    errors: ValidationError[],
    warnings: ValidationError[]
  ): void {
    const scripts = Array.isArray(component.hyperscript)
      ? component.hyperscript
      : [component.hyperscript];

    for (let i = 0; i < scripts.length; i++) {
      const script = scripts[i];
      if (!script) continue;

      const path = Array.isArray(component.hyperscript) ? `hyperscript[${i}]` : 'hyperscript';

      // Check for common syntax patterns
      if (
        !script.trim().startsWith('on ') &&
        !script.trim().startsWith('def ') &&
        !script.trim().startsWith('init')
      ) {
        warnings.push({
          path,
          message: 'Hyperscript should typically start with "on", "def", or "init"',
          value: script.substring(0, 50) + '...',
        });
      }

      // Check for template variable syntax consistency
      const templateVarPattern = /\{\{[^}]+\}\}/g;
      const templateVars = script.match(templateVarPattern) || [];

      if (templateVars.length > 0 && !component.template?.variables) {
        warnings.push({
          path,
          message: 'Template variables found in hyperscript but no template variables defined',
          value: templateVars,
        });
      }
    }
  }

  /**
   * Validate template variable consistency
   */
  private validateTemplateVariables(
    component: ComponentDefinition,
    errors: ValidationError[],
    warnings: ValidationError[]
  ): void {
    const templateVars = component.template?.variables;
    if (!templateVars) return;

    const scripts = Array.isArray(component.hyperscript)
      ? component.hyperscript.join(' ')
      : component.hyperscript;

    // Check if defined variables are actually used
    for (const [varName, varDef] of Object.entries(templateVars)) {
      const varPattern = new RegExp(`\\{\\{${varName}\\}\\}`, 'g');

      if (!varPattern.test(scripts) && !varPattern.test(component.template?.html ?? '')) {
        warnings.push({
          path: `template.variables.${varName}`,
          message: `Template variable "${varName}" is defined but not used`,
          value: varDef,
        });
      }

      // Validate required variables have no default
      if (varDef.required && varDef.default !== undefined) {
        warnings.push({
          path: `template.variables.${varName}`,
          message: 'Required variables should not have default values',
          value: varDef,
        });
      }
    }
  }

  /**
   * Validate component dependencies
   */
  private validateDependencies(
    component: ComponentDefinition,
    errors: ValidationError[],
    warnings: ValidationError[]
  ): void {
    const deps = component.dependencies;
    if (!deps) return;

    // Check for circular dependencies (basic check)
    if (deps.components?.includes(component.id)) {
      errors.push({
        path: 'dependencies.components',
        message: 'Component cannot depend on itself',
        value: component.id,
      });
    }

    // Validate CSS dependency formats
    deps.css?.forEach((css, index) => {
      if (!css.endsWith('.css') && !css.startsWith('http') && !css.includes('cdn')) {
        warnings.push({
          path: `dependencies.css[${index}]`,
          message: 'CSS dependency should be a .css file or CDN URL',
          value: css,
        });
      }
    });
  }

  /**
   * Validate test consistency with component definition
   */
  private validateTestConsistency(
    component: ComponentDefinition,
    errors: ValidationError[],
    warnings: ValidationError[]
  ): void {
    const validation = component.validation;
    const testing = component.testing;

    if (!testing || !validation) return;

    // Check if tests cover all declared events
    const declaredEvents = new Set(validation.events || []);
    const testedEvents = new Set<string>();

    testing.unit?.forEach(test => {
      const eventMatch = test.action.match(/(\w+)\s+/);
      if (eventMatch && eventMatch[1]) {
        testedEvents.add(eventMatch[1]);
      }
    });

    for (const event of declaredEvents) {
      if (!testedEvents.has(event)) {
        warnings.push({
          path: 'testing.unit',
          message: `No unit test found for declared event: ${event}`,
          value: event,
        });
      }
    }
  }

  /**
   * Validate internal component dependencies within a collection
   */
  private validateInternalDependencies(
    collection: ComponentCollection,
    errors: ValidationError[],
    warnings: ValidationError[]
  ): void {
    const componentIds = new Set<string>();

    // Collect all component IDs
    for (const [_, componentDef] of Object.entries(collection.components)) {
      if (typeof componentDef === 'object' && componentDef.id) {
        componentIds.add(componentDef.id);
      }
    }

    // Check dependencies
    for (const [componentKey, componentDef] of Object.entries(collection.components)) {
      if (typeof componentDef === 'object' && componentDef.dependencies?.components) {
        componentDef.dependencies.components.forEach(depId => {
          if (depId && !componentIds.has(depId)) {
            warnings.push({
              path: `components.${componentKey}.dependencies.components`,
              message: `Dependency "${depId}" not found in collection`,
              value: depId,
            });
          }
        });
      }
    }
  }

  /**
   * Determine if an AJV error should be treated as a warning
   */
  private isWarning(error: any): boolean {
    // Treat missing optional properties as warnings
    if (
      error.keyword === 'required' &&
      ['description', 'tags', 'template', 'metadata'].includes(error.params?.missingProperty)
    ) {
      return true;
    }

    // Treat format warnings as non-critical
    if (error.keyword === 'format') {
      return true;
    }

    return false;
  }
}

/**
 * Default validator instance
 */
export const validator = new ComponentValidator();

/**
 * Convenience functions
 */
export function validateComponent(component: ComponentDefinition): ValidationResult {
  return validator.validateComponent(component);
}

export function validateCollection(collection: ComponentCollection): ValidationResult {
  return validator.validateCollection(collection);
}
