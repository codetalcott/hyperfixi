/**
 * Enhanced Form Expressions - Deep TypeScript Integration
 * Comprehensive form handling and validation with full type safety
 * Enhanced for LLM code agents with maximum type safety
 */

import { v, type RuntimeValidator } from '../../validation/lightweight-validators';
import type {
  TypedExpressionImplementation,
  TypedExecutionContext,
  HyperScriptValue,
  EvaluationResult,
  LLMDocumentation
} from '../../types/enhanced-core';

// ============================================================================
// Enhanced Form Values Expression
// ============================================================================

/**
 * Enhanced form values extraction with comprehensive validation
 */
export class EnhancedFormValuesExpression implements TypedExpressionImplementation<Record<string, unknown>> {
  public readonly name = 'form-values';
  public readonly category = 'object' as const;
  public readonly precedence = 1;
  public readonly associativity = 'left' as const;
  public readonly outputType = 'object' as const;

  public readonly analysisInfo = {
    isPure: false, // DOM queries are not pure
    canThrow: false,
    complexity: 'O(n)' as const,
    dependencies: ['DOM']
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Extracts all form field values as a structured object with type validation',
    parameters: [
      {
        name: 'formElement',
        type: 'element',
        description: 'Form element or container with form fields',
        optional: false,
        examples: ['<form>', '<div>', 'document.querySelector("form")']
      }
    ],
    returns: {
      type: 'object',
      description: 'Object containing all form field values',
      examples: ['{"name": "John", "email": "john@example.com"}', '{"checked": true}']
    },
    examples: [
      {
        title: 'Basic form extraction',
        code: 'formValues(myForm)',
        explanation: 'Extract all field values from a form',
        output: '{"username": "john", "password": "***"}'
      },
      {
        title: 'Checkbox handling',
        code: 'formValues(form)',
        explanation: 'Properly handles checked/unchecked states',
        output: '{"notifications": true, "marketing": false}'
      },
      {
        title: 'Complex form',
        code: 'formValues(#signupForm)',
        explanation: 'Handle various input types in one form',
        output: '{"name": "Jane", "age": 25, "country": "US"}'
      }
    ],
    seeAlso: ['form-data', 'form-validate', 'serialize'],
    tags: ['form', 'extraction', 'values', 'fields']
  };

  async evaluate(context: TypedExecutionContext, formElement: HTMLElement): Promise<EvaluationResult<Record<string, unknown>>> {
    try {
      if (!formElement) {
        return {
          success: false,
          error: {
            name: 'FormValuesError',
            message: 'Form element is required',
            code: 'MISSING_FORM_ELEMENT',
            suggestions: ['Provide a valid form element', 'Ensure element exists in DOM']
          },
          type: 'error'
        };
      }

      if (!(formElement instanceof HTMLElement)) {
        return {
          success: false,
          error: {
            name: 'FormValuesError',
            message: 'Provided element is not a valid HTML element',
            code: 'INVALID_ELEMENT_TYPE',
            suggestions: ['Ensure element is an HTMLElement', 'Check element selection']
          },
          type: 'error'
        };
      }

      const result: Record<string, unknown> = {};
      
      // Get all form fields from the element
      const selector = 'input, textarea, select, [role="checkbox"], [role="radio"]';
      const elements = formElement.tagName === 'FORM' 
        ? formElement.querySelectorAll(selector)
        : formElement.querySelectorAll(selector);

      for (const element of elements) {
        const htmlElement = element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
        
        if (htmlElement.name || htmlElement.id) {
          const fieldName = htmlElement.name || htmlElement.id;
          const fieldValue = this.extractFieldValue(htmlElement);
          
          if (fieldValue !== undefined) {
            result[fieldName] = fieldValue;
          }
        }
      }

      return {
        success: true,
        value: result,
        type: 'object'
      };

    } catch (error) {
      return {
        success: false,
        error: {
          name: 'FormValuesError',
          message: error instanceof Error ? error.message : 'Form values extraction failed',
          code: 'FORM_VALUES_EXTRACTION_FAILED',
          suggestions: [
            'Check if form element is valid',
            'Ensure form fields have proper name or id attributes',
            'Verify form is in the DOM'
          ]
        },
        type: 'error'
      };
    }
  }

  private extractFieldValue(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): unknown {
    const type = element.getAttribute('type')?.toLowerCase() || element.tagName.toLowerCase();
    
    switch (type) {
      case 'checkbox':
        const checkbox = element as HTMLInputElement;
        return checkbox.checked ? (checkbox.value || true) : false;
        
      case 'radio':
        const radio = element as HTMLInputElement;
        return radio.checked ? radio.value : undefined;
        
      case 'number':
      case 'range':
        const numberInput = element as HTMLInputElement;
        const numValue = parseFloat(numberInput.value);
        return isNaN(numValue) ? null : numValue;
        
      case 'date':
      case 'datetime-local':
      case 'time':
        const dateInput = element as HTMLInputElement;
        return dateInput.value ? new Date(dateInput.value) : null;
        
      case 'file':
        const fileInput = element as HTMLInputElement;
        return fileInput.files ? Array.from(fileInput.files) : [];
        
      case 'select':
        const select = element as HTMLSelectElement;
        if (select.multiple) {
          return Array.from(select.selectedOptions).map(option => option.value);
        }
        return select.value;
        
      default:
        return element.value || '';
    }
  }
}

// ============================================================================
// Enhanced Form Validation Expression
// ============================================================================

/**
 * Enhanced form validation with custom rules
 */
export class EnhancedFormValidationExpression implements TypedExpressionImplementation<boolean> {
  public readonly name = 'form-validate';
  public readonly category = 'logical' as const;
  public readonly precedence = 1;
  public readonly associativity = 'left' as const;
  public readonly outputType = 'boolean' as const;

  public readonly analysisInfo = {
    isPure: false, // DOM queries and validation are not pure
    canThrow: false,
    complexity: 'O(n)' as const,
    dependencies: ['DOM']
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Validates form fields according to HTML5 validation rules and custom criteria',
    parameters: [
      {
        name: 'formElement',
        type: 'element',
        description: 'Form element to validate',
        optional: false,
        examples: ['<form>', 'document.querySelector("#myForm")']
      },
      {
        name: 'customRules',
        type: 'object',
        description: 'Custom validation rules (optional)',
        optional: true,
        examples: ['{"email": "required|email", "age": "min:18"}']
      }
    ],
    returns: {
      type: 'boolean',
      description: 'True if form is valid, false otherwise',
      examples: ['true', 'false']
    },
    examples: [
      {
        title: 'HTML5 validation',
        code: 'formValidate(myForm)',
        explanation: 'Use built-in HTML5 validation',
        output: true
      },
      {
        title: 'Custom validation rules',
        code: 'formValidate(form, {"password": "min:8"})',
        explanation: 'Add custom validation rules',
        output: false
      },
      {
        title: 'Required field check',
        code: 'formValidate(#signupForm)',
        explanation: 'Check all required fields are filled',
        output: true
      }
    ],
    seeAlso: ['form-values', 'form-errors'],
    tags: ['form', 'validation', 'rules', 'html5']
  };

  async evaluate(context: TypedExecutionContext, formElement: HTMLElement, customRules?: Record<string, string>): Promise<EvaluationResult<boolean>> {
    try {
      if (!formElement || !(formElement instanceof HTMLElement)) {
        return {
          success: false,
          error: {
            name: 'FormValidationError',
            message: 'Valid form element is required',
            code: 'INVALID_FORM_ELEMENT',
            suggestions: ['Provide a valid HTMLElement', 'Ensure form exists in DOM']
          },
          type: 'error'
        };
      }

      // Check HTML5 validation first
      const form = formElement.tagName === 'FORM' ? formElement as HTMLFormElement : null;
      if (form && !form.checkValidity()) {
        return {
          success: true,
          value: false,
          type: 'boolean'
        };
      }

      // Apply custom validation rules if provided
      if (customRules) {
        const formValues = await this.getFormValues(formElement);
        const isCustomValid = this.validateCustomRules(formValues, customRules);
        
        return {
          success: true,
          value: isCustomValid,
          type: 'boolean'
        };
      }

      // Form is valid
      return {
        success: true,
        value: true,
        type: 'boolean'
      };

    } catch (error) {
      return {
        success: false,
        error: {
          name: 'FormValidationError',
          message: error instanceof Error ? error.message : 'Form validation failed',
          code: 'FORM_VALIDATION_FAILED',
          suggestions: ['Check form element and validation rules', 'Ensure form is properly structured']
        },
        type: 'error'
      };
    }
  }

  private async getFormValues(formElement: HTMLElement): Promise<Record<string, unknown>> {
    const valuesExpr = new EnhancedFormValuesExpression();
    const result = await valuesExpr.evaluate({} as TypedExecutionContext, formElement);
    return result.success ? result.value : {};
  }

  private validateCustomRules(values: Record<string, unknown>, rules: Record<string, string>): boolean {
    for (const [fieldName, ruleString] of Object.entries(rules)) {
      const fieldValue = values[fieldName];
      const ruleList = ruleString.split('|');
      
      for (const rule of ruleList) {
        if (!this.validateRule(fieldValue, rule.trim())) {
          return false;
        }
      }
    }
    return true;
  }

  private validateRule(value: unknown, rule: string): boolean {
    if (rule === 'required') {
      return value !== null && value !== undefined && value !== '';
    }
    
    if (rule.startsWith('min:')) {
      const minValue = parseInt(rule.split(':')[1]);
      if (typeof value === 'string') {
        return value.length >= minValue;
      }
      if (typeof value === 'number') {
        return value >= minValue;
      }
    }
    
    if (rule.startsWith('max:')) {
      const maxValue = parseInt(rule.split(':')[1]);
      if (typeof value === 'string') {
        return value.length <= maxValue;
      }
      if (typeof value === 'number') {
        return value <= maxValue;
      }
    }
    
    if (rule === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return typeof value === 'string' && emailRegex.test(value);
    }
    
    return true; // Unknown rules pass by default
  }
}

// ============================================================================
// Enhanced Form Serialization Expression
// ============================================================================

/**
 * Enhanced form serialization for API submission
 */
export class EnhancedFormSerializationExpression implements TypedExpressionImplementation<string> {
  public readonly name = 'form-serialize';
  public readonly category = 'conversion' as const;
  public readonly precedence = 1;
  public readonly associativity = 'left' as const;
  public readonly outputType = 'string' as const;

  public readonly analysisInfo = {
    isPure: false, // DOM queries are not pure
    canThrow: false,
    complexity: 'O(n)' as const,
    dependencies: ['DOM']
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Serializes form data into URL-encoded string or JSON format',
    parameters: [
      {
        name: 'formElement',
        type: 'element',
        description: 'Form element to serialize',
        optional: false,
        examples: ['<form>', 'document.querySelector("form")']
      },
      {
        name: 'format',
        type: 'string',
        description: 'Serialization format',
        optional: true,
        defaultValue: 'urlencoded',
        examples: ['urlencoded', 'json']
      }
    ],
    returns: {
      type: 'string',
      description: 'Serialized form data',
      examples: ['name=John&email=john@example.com', '{"name":"John","email":"john@example.com"}']
    },
    examples: [
      {
        title: 'URL encoding',
        code: 'formSerialize(myForm)',
        explanation: 'Serialize as URL-encoded string',
        output: 'name=John&email=john%40example.com'
      },
      {
        title: 'JSON format',
        code: 'formSerialize(myForm, "json")',
        explanation: 'Serialize as JSON string',
        output: '{"name":"John","email":"john@example.com"}'
      }
    ],
    seeAlso: ['form-values', 'form-data'],
    tags: ['form', 'serialization', 'json', 'urlencoded']
  };

  async evaluate(context: TypedExecutionContext, formElement: HTMLElement, format: string = 'urlencoded'): Promise<EvaluationResult<string>> {
    try {
      if (!formElement || !(formElement instanceof HTMLElement)) {
        return {
          success: false,
          error: {
            name: 'FormSerializationError',
            message: 'Valid form element is required',
            code: 'INVALID_FORM_ELEMENT',
            suggestions: ['Provide a valid HTMLElement', 'Ensure form exists in DOM']
          },
          type: 'error'
        };
      }

      // Get form values
      const valuesExpr = new EnhancedFormValuesExpression();
      const valuesResult = await valuesExpr.evaluate(context, formElement);
      
      if (!valuesResult.success) {
        return valuesResult as EvaluationResult<string>;
      }

      const values = valuesResult.value;

      // Serialize based on format
      if (format === 'json') {
        return {
          success: true,
          value: JSON.stringify(values),
          type: 'string'
        };
      } else {
        // URL encoding
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(values)) {
          if (value !== undefined && value !== null) {
            params.append(key, String(value));
          }
        }
        
        return {
          success: true,
          value: params.toString(),
          type: 'string'
        };
      }

    } catch (error) {
      return {
        success: false,
        error: {
          name: 'FormSerializationError',
          message: error instanceof Error ? error.message : 'Form serialization failed',
          code: 'FORM_SERIALIZATION_FAILED',
          suggestions: ['Check form element and format parameter', 'Ensure form has valid fields']
        },
        type: 'error'
      };
    }
  }
}

// ============================================================================
// Expression Registry and Exports
// ============================================================================

/**
 * Enhanced form expressions registry
 */
export const enhancedFormExpressions = {
  'form-values': new EnhancedFormValuesExpression(),
  'form-validate': new EnhancedFormValidationExpression(),
  'form-serialize': new EnhancedFormSerializationExpression()
} as const;

/**
 * Factory functions for creating enhanced form expressions
 */
export function createEnhancedFormValues(): EnhancedFormValuesExpression {
  return new EnhancedFormValuesExpression();
}

export function createEnhancedFormValidation(): EnhancedFormValidationExpression {
  return new EnhancedFormValidationExpression();
}

export function createEnhancedFormSerialization(): EnhancedFormSerializationExpression {
  return new EnhancedFormSerializationExpression();
}

/**
 * Utility functions for form operations
 */
export async function extractFormValues(formElement: HTMLElement, context: TypedExecutionContext): Promise<EvaluationResult<Record<string, unknown>>> {
  const expr = new EnhancedFormValuesExpression();
  return expr.evaluate(context, formElement);
}

export async function validateForm(formElement: HTMLElement, context: TypedExecutionContext, customRules?: Record<string, string>): Promise<EvaluationResult<boolean>> {
  const expr = new EnhancedFormValidationExpression();
  return expr.evaluate(context, formElement, customRules);
}

export async function serializeForm(formElement: HTMLElement, context: TypedExecutionContext, format: string = 'urlencoded'): Promise<EvaluationResult<string>> {
  const expr = new EnhancedFormSerializationExpression();
  return expr.evaluate(context, formElement, format);
}

export default enhancedFormExpressions;