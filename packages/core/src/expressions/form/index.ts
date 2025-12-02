/**
 * Form Expressions - Deep TypeScript Integration
 * Comprehensive form handling and validation with full type safety
 * Enhanced for LLM code agents with maximum type safety
 */

import type {
  TypedExpressionImplementation,
  TypedExecutionContext,
  EvaluationResult,
} from '../../types/command-types';

// ============================================================================
// Enhanced Form Values Expression
// ============================================================================

/**
 * Enhanced form values extraction with comprehensive validation
 */
export class FormValuesExpression
  implements TypedExpressionImplementation<Record<string, unknown>>
{
  public readonly name = 'form-values';
  public readonly category = 'object' as const;
  public readonly precedence = 1;
  public readonly associativity = 'left' as const;
  public readonly outputType = 'object' as const;

  public readonly analysisInfo = {
    isPure: false, // DOM queries are not pure
    canThrow: false,
    complexity: 'O(n)' as const,
    dependencies: ['DOM'],
  };

  

  async evaluate(
    _context: TypedExecutionContext,
    formElement: HTMLElement
  ): Promise<EvaluationResult<Record<string, unknown>>> {
    try {
      if (!formElement) {
        return {
          success: false,
          error: {
            name: 'FormValuesError',
            type: 'missing-argument',
            message: 'Form element is required',
            code: 'MISSING_FORM_ELEMENT',
            suggestions: ['Provide a valid form element', 'Ensure element exists in DOM'],
          },
          type: 'error',
        };
      }

      if (!(formElement instanceof HTMLElement)) {
        return {
          success: false,
          error: {
            name: 'FormValuesError',
            type: 'invalid-argument',
            message: 'Provided element is not a valid HTML element',
            code: 'INVALID_ELEMENT_TYPE',
            suggestions: ['Ensure element is an HTMLElement', 'Check element selection'],
          },
          type: 'error',
        };
      }

      const result: Record<string, unknown> = {};

      // Get all form fields from the element
      const selector = 'input, textarea, select, [role="checkbox"], [role="radio"]';
      const elements =
        formElement.tagName === 'FORM'
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
        type: 'object',
      };
    } catch (error) {
      return {
        success: false,
        error: {
          name: 'FormValuesError',
          type: 'runtime-error',
          message: error instanceof Error ? error.message : 'Form values extraction failed',
          code: 'FORM_VALUES_EXTRACTION_FAILED',
          suggestions: [
            'Check if form element is valid',
            'Ensure form fields have proper name or id attributes',
            'Verify form is in the DOM',
          ],
        },
        type: 'error',
      };
    }
  }

  private extractFieldValue(
    element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  ): unknown {
    const type = element.getAttribute('type')?.toLowerCase() || element.tagName.toLowerCase();

    switch (type) {
      case 'checkbox':
        const checkbox = element as HTMLInputElement;
        return checkbox.checked ? checkbox.value || true : false;

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
export class FormValidationExpression implements TypedExpressionImplementation<boolean> {
  public readonly name = 'form-validate';
  public readonly category = 'logical' as const;
  public readonly precedence = 1;
  public readonly associativity = 'left' as const;
  public readonly outputType = 'boolean' as const;

  public readonly analysisInfo = {
    isPure: false, // DOM queries and validation are not pure
    canThrow: false,
    complexity: 'O(n)' as const,
    dependencies: ['DOM'],
  };

  

  async evaluate(
    _context: TypedExecutionContext,
    formElement: HTMLElement,
    customRules?: Record<string, string>
  ): Promise<EvaluationResult<boolean>> {
    try {
      if (!formElement || !(formElement instanceof HTMLElement)) {
        return {
          success: false,
          error: {
            name: 'FormValidationError',
            type: 'invalid-argument',
            message: 'Valid form element is required',
            code: 'INVALID_FORM_ELEMENT',
            suggestions: ['Provide a valid HTMLElement', 'Ensure form exists in DOM'],
          },
          type: 'error',
        };
      }

      // Check HTML5 validation first
      const form = formElement.tagName === 'FORM' ? (formElement as HTMLFormElement) : null;
      if (form && !form.checkValidity()) {
        return {
          success: true,
          value: false,
          type: 'boolean',
        };
      }

      // Apply custom validation rules if provided
      if (customRules) {
        const formValues = await this.getFormValues(formElement);
        const isCustomValid = this.validateCustomRules(formValues, customRules);

        return {
          success: true,
          value: isCustomValid,
          type: 'boolean',
        };
      }

      // Form is valid
      return {
        success: true,
        value: true,
        type: 'boolean',
      };
    } catch (error) {
      return {
        success: false,
        error: {
          name: 'FormValidationError',
          type: 'validation-error',
          message: error instanceof Error ? error.message : 'Form validation failed',
          code: 'FORM_VALIDATION_FAILED',
          suggestions: [
            'Check form element and validation rules',
            'Ensure form is properly structured',
          ],
        },
        type: 'error',
      };
    }
  }

  private async getFormValues(formElement: HTMLElement): Promise<Record<string, unknown>> {
    const valuesExpr = new FormValuesExpression();
    const result = await valuesExpr.evaluate({} as TypedExecutionContext, formElement);
    return result.success ? (result.value ?? {}) : {};
  }

  private validateCustomRules(
    values: Record<string, unknown>,
    rules: Record<string, string>
  ): boolean {
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
export class FormSerializationExpression implements TypedExpressionImplementation<string> {
  public readonly name = 'form-serialize';
  public readonly category = 'conversion' as const;
  public readonly precedence = 1;
  public readonly associativity = 'left' as const;
  public readonly outputType = 'string' as const;

  public readonly analysisInfo = {
    isPure: false, // DOM queries are not pure
    canThrow: false,
    complexity: 'O(n)' as const,
    dependencies: ['DOM'],
  };

  

  async evaluate(
    context: TypedExecutionContext,
    formElement: HTMLElement,
    format: string = 'urlencoded'
  ): Promise<EvaluationResult<string>> {
    try {
      if (!formElement || !(formElement instanceof HTMLElement)) {
        return {
          success: false,
          error: {
            name: 'FormSerializationError',
            type: 'invalid-argument',
            message: 'Valid form element is required',
            code: 'INVALID_FORM_ELEMENT',
            suggestions: ['Provide a valid HTMLElement', 'Ensure form exists in DOM'],
          },
          type: 'error',
        };
      }

      // Get form values
      const valuesExpr = new FormValuesExpression();
      const valuesResult = await valuesExpr.evaluate(context, formElement);

      if (!valuesResult.success) {
        return valuesResult as unknown as EvaluationResult<string>;
      }

      const values = valuesResult.value as Record<string, unknown>;

      // Serialize based on format
      if (format === 'json') {
        return {
          success: true,
          value: JSON.stringify(values),
          type: 'string',
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
          type: 'string',
        };
      }
    } catch (error) {
      return {
        success: false,
        error: {
          name: 'FormSerializationError',
          type: 'runtime-error',
          message: error instanceof Error ? error.message : 'Form serialization failed',
          code: 'FORM_SERIALIZATION_FAILED',
          suggestions: ['Check form element and format parameter', 'Ensure form has valid fields'],
        },
        type: 'error',
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
  'form-values': new FormValuesExpression(),
  'form-validate': new FormValidationExpression(),
  'form-serialize': new FormSerializationExpression(),
} as const;

/**
 * Factory functions for creating enhanced form expressions
 */
export function createFormValues(): FormValuesExpression {
  return new FormValuesExpression();
}

export function createFormValidation(): FormValidationExpression {
  return new FormValidationExpression();
}

export function createFormSerialization(): FormSerializationExpression {
  return new FormSerializationExpression();
}

/**
 * Utility functions for form operations
 */
export async function extractFormValues(
  formElement: HTMLElement,
  context: TypedExecutionContext
): Promise<EvaluationResult<Record<string, unknown>>> {
  const expr = new FormValuesExpression();
  return expr.evaluate(context, formElement);
}

export async function validateForm(
  formElement: HTMLElement,
  context: TypedExecutionContext,
  customRules?: Record<string, string>
): Promise<EvaluationResult<boolean>> {
  const expr = new FormValidationExpression();
  return expr.evaluate(context, formElement, customRules);
}

export async function serializeForm(
  formElement: HTMLElement,
  context: TypedExecutionContext,
  format: string = 'urlencoded'
): Promise<EvaluationResult<string>> {
  const expr = new FormSerializationExpression();
  return expr.evaluate(context, formElement, format);
}

export default enhancedFormExpressions;
