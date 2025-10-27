/**
 * Enhanced Form Expression Tests
 * Comprehensive testing of form operations with TypeScript integration
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { 
  EnhancedFormValuesExpression,
  EnhancedFormValidationExpression,
  EnhancedFormSerializationExpression,
  enhancedFormExpressions,
  extractFormValues,
  validateForm,
  serializeForm
} from './index';
import type { TypedExecutionContext } from '../../types/enhanced-core';

// Mock context for testing
function createMockContext(): TypedExecutionContext {
  return {
    me: document.createElement('div'),
    you: document.createElement('button'),
    it: null,
    locals: new Map(),
    globals: new Map(),
    result: null,
    meta: {
      startTime: Date.now(),
      commandStack: [],
      debugMode: false
    }
  };
}

// Create a mock form with various input types
function createMockForm(): HTMLFormElement {
  const form = document.createElement('form');
  
  // Text input
  const textInput = document.createElement('input');
  textInput.type = 'text';
  textInput.name = 'username';
  textInput.value = 'john_doe';
  form.appendChild(textInput);
  
  // Email input
  const emailInput = document.createElement('input');
  emailInput.type = 'email';
  emailInput.name = 'email';
  emailInput.value = 'john@example.com';
  form.appendChild(emailInput);
  
  // Number input
  const numberInput = document.createElement('input');
  numberInput.type = 'number';
  numberInput.name = 'age';
  numberInput.value = '25';
  form.appendChild(numberInput);
  
  // Checkbox (checked)
  const checkbox1 = document.createElement('input');
  checkbox1.type = 'checkbox';
  checkbox1.name = 'notifications';
  checkbox1.value = 'yes';
  checkbox1.checked = true;
  form.appendChild(checkbox1);
  
  // Checkbox (unchecked)
  const checkbox2 = document.createElement('input');
  checkbox2.type = 'checkbox';
  checkbox2.name = 'marketing';
  checkbox2.value = 'yes';
  checkbox2.checked = false;
  form.appendChild(checkbox2);
  
  // Radio buttons
  const radio1 = document.createElement('input');
  radio1.type = 'radio';
  radio1.name = 'gender';
  radio1.value = 'male';
  radio1.checked = true;
  form.appendChild(radio1);
  
  const radio2 = document.createElement('input');
  radio2.type = 'radio';
  radio2.name = 'gender';
  radio2.value = 'female';
  radio2.checked = false;
  form.appendChild(radio2);
  
  // Select element
  const select = document.createElement('select');
  select.name = 'country';
  const option1 = document.createElement('option');
  option1.value = 'us';
  option1.textContent = 'United States';
  option1.selected = true;
  select.appendChild(option1);
  const option2 = document.createElement('option');
  option2.value = 'ca';
  option2.textContent = 'Canada';
  select.appendChild(option2);
  form.appendChild(select);
  
  // Textarea
  const textarea = document.createElement('textarea');
  textarea.name = 'bio';
  textarea.value = 'Software developer';
  form.appendChild(textarea);
  
  return form;
}

describe('Enhanced Form Values Expression', () => {
  let expression: EnhancedFormValuesExpression;
  let context: TypedExecutionContext;

  beforeEach(() => {
    expression = new EnhancedFormValuesExpression();
    context = createMockContext();
  });

  describe('Basic Form Values Extraction', () => {
    test('extracts values from complete form', async () => {
      const form = createMockForm();
      const result = await expression.evaluate(context, form);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual({
          username: 'john_doe',
          email: 'john@example.com',
          age: 25,
          notifications: 'yes',
          marketing: false,
          gender: 'male',
          country: 'us',
          bio: 'Software developer'
        });
        expect(result.type).toBe('object');
      }
    });

    test('handles empty form', async () => {
      const form = document.createElement('form');
      const result = await expression.evaluate(context, form);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual({});
      }
    });

    test('handles div container with form fields', async () => {
      const div = document.createElement('div');
      
      const input = document.createElement('input');
      input.type = 'text';
      input.name = 'test';
      input.value = 'value';
      div.appendChild(input);
      
      const result = await expression.evaluate(context, div);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual({ test: 'value' });
      }
    });
  });

  describe('Input Type Handling', () => {
    test('handles text inputs correctly', async () => {
      const form = document.createElement('form');
      const input = document.createElement('input');
      input.type = 'text';
      input.name = 'name';
      input.value = 'John';
      form.appendChild(input);
      
      const result = await expression.evaluate(context, form);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.name).toBe('John');
      }
    });

    test('handles number inputs with conversion', async () => {
      const form = document.createElement('form');
      const input = document.createElement('input');
      input.type = 'number';
      input.name = 'count';
      input.value = '42';
      form.appendChild(input);
      
      const result = await expression.evaluate(context, form);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.count).toBe(42);
        expect(typeof result.value.count).toBe('number');
      }
    });

    test('handles checkbox states correctly', async () => {
      const form = document.createElement('form');
      
      const checked = document.createElement('input');
      checked.type = 'checkbox';
      checked.name = 'checked';
      checked.value = 'yes';
      checked.checked = true;
      form.appendChild(checked);
      
      const unchecked = document.createElement('input');
      unchecked.type = 'checkbox';
      unchecked.name = 'unchecked';
      unchecked.value = 'yes';
      unchecked.checked = false;
      form.appendChild(unchecked);
      
      const result = await expression.evaluate(context, form);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.checked).toBe('yes');
        expect(result.value.unchecked).toBe(false);
      }
    });

    test('handles radio button selection', async () => {
      const form = document.createElement('form');
      
      const radio1 = document.createElement('input');
      radio1.type = 'radio';
      radio1.name = 'choice';
      radio1.value = 'option1';
      radio1.checked = false;
      form.appendChild(radio1);
      
      const radio2 = document.createElement('input');
      radio2.type = 'radio';
      radio2.name = 'choice';
      radio2.value = 'option2';
      radio2.checked = true;
      form.appendChild(radio2);
      
      const result = await expression.evaluate(context, form);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.choice).toBe('option2');
      }
    });

    test('handles select elements', async () => {
      const form = document.createElement('form');
      const select = document.createElement('select');
      select.name = 'language';
      
      const option1 = document.createElement('option');
      option1.value = 'en';
      option1.selected = false;
      select.appendChild(option1);
      
      const option2 = document.createElement('option');
      option2.value = 'es';
      option2.selected = true;
      select.appendChild(option2);
      
      form.appendChild(select);
      
      const result = await expression.evaluate(context, form);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.language).toBe('es');
      }
    });
  });

  describe('Error Handling', () => {
    test('handles null form element', async () => {
      const result = await expression.evaluate(context, null as any);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('MISSING_FORM_ELEMENT');
      }
    });

    test('handles invalid element type', async () => {
      const result = await expression.evaluate(context, 'not an element' as any);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_ELEMENT_TYPE');
      }
    });
  });

  describe('Edge Cases', () => {
    test('handles fields without name or id', async () => {
      const form = document.createElement('form');
      const input = document.createElement('input');
      input.type = 'text';
      input.value = 'orphan';
      // No name or id
      form.appendChild(input);
      
      const result = await expression.evaluate(context, form);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(Object.keys(result.value)).toHaveLength(0);
      }
    });

    test('uses id when name is not available', async () => {
      const form = document.createElement('form');
      const input = document.createElement('input');
      input.type = 'text';
      input.id = 'field-id';
      input.value = 'test-value';
      form.appendChild(input);
      
      const result = await expression.evaluate(context, form);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value['field-id']).toBe('test-value');
      }
    });
  });
});

describe('Enhanced Form Validation Expression', () => {
  let expression: EnhancedFormValidationExpression;
  let context: TypedExecutionContext;

  beforeEach(() => {
    expression = new EnhancedFormValidationExpression();
    context = createMockContext();
  });

  describe('HTML5 Validation', () => {
    test('validates valid form', async () => {
      const form = document.createElement('form');
      // Mock checkValidity to return true
      form.checkValidity = () => true;
      
      const result = await expression.evaluate(context, form);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(true);
        expect(result.type).toBe('boolean');
      }
    });

    test('invalidates form with HTML5 errors', async () => {
      const form = document.createElement('form');
      // Mock checkValidity to return false
      form.checkValidity = () => false;
      
      const result = await expression.evaluate(context, form);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(false);
      }
    });

    test('handles non-form elements gracefully', async () => {
      const div = document.createElement('div');
      
      const result = await expression.evaluate(context, div);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(true);
      }
    });
  });

  describe('Custom Validation Rules', () => {
    test('validates with custom required rule', async () => {
      const form = createMockForm();
      const customRules = {
        username: 'required'
      };
      
      const result = await expression.evaluate(context, form, customRules);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(true);
      }
    });

    test('fails validation with empty required field', async () => {
      const form = document.createElement('form');
      const input = document.createElement('input');
      input.name = 'required_field';
      input.value = '';
      form.appendChild(input);
      
      const customRules = {
        required_field: 'required'
      };
      
      const result = await expression.evaluate(context, form, customRules);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(false);
      }
    });

    test('validates string length with min rule', async () => {
      const form = document.createElement('form');
      const input = document.createElement('input');
      input.name = 'password';
      input.value = 'short';
      form.appendChild(input);
      
      const customRules = {
        password: 'min:8'
      };
      
      const result = await expression.evaluate(context, form, customRules);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(false);
      }
    });

    test('validates email format', async () => {
      const form = document.createElement('form');
      const input = document.createElement('input');
      input.name = 'email';
      input.value = 'invalid-email';
      form.appendChild(input);
      
      const customRules = {
        email: 'email'
      };
      
      const result = await expression.evaluate(context, form, customRules);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(false);
      }
    });

    test('validates multiple rules with pipe separator', async () => {
      const form = document.createElement('form');
      const input = document.createElement('input');
      input.name = 'email';
      input.value = 'test@example.com';
      form.appendChild(input);
      
      const customRules = {
        email: 'required|email'
      };
      
      const result = await expression.evaluate(context, form, customRules);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(true);
      }
    });
  });

  describe('Error Handling', () => {
    test('handles invalid form element', async () => {
      const result = await expression.evaluate(context, null as any);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_FORM_ELEMENT');
      }
    });
  });
});

describe('Enhanced Form Serialization Expression', () => {
  let expression: EnhancedFormSerializationExpression;
  let context: TypedExecutionContext;

  beforeEach(() => {
    expression = new EnhancedFormSerializationExpression();
    context = createMockContext();
  });

  describe('URL Encoding Format', () => {
    test('serializes form as URL-encoded string', async () => {
      const form = document.createElement('form');
      
      const input1 = document.createElement('input');
      input1.name = 'name';
      input1.value = 'John Doe';
      form.appendChild(input1);
      
      const input2 = document.createElement('input');
      input2.name = 'email';
      input2.value = 'john@example.com';
      form.appendChild(input2);
      
      const result = await expression.evaluate(context, form);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toContain('name=John+Doe');
        expect(result.value).toContain('email=john%40example.com');
        expect(result.type).toBe('string');
      }
    });

    test('handles special characters in URL encoding', async () => {
      const form = document.createElement('form');
      
      const input = document.createElement('input');
      input.name = 'special';
      input.value = 'test & value = 100%';
      form.appendChild(input);
      
      const result = await expression.evaluate(context, form);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toContain('special=');
        // Should be URL encoded
        expect(result.value).toContain('%');
      }
    });
  });

  describe('JSON Format', () => {
    test('serializes form as JSON string', async () => {
      const form = document.createElement('form');
      
      const input1 = document.createElement('input');
      input1.name = 'name';
      input1.value = 'John';
      form.appendChild(input1);
      
      const input2 = document.createElement('input');
      input2.type = 'number';
      input2.name = 'age';
      input2.value = '25';
      form.appendChild(input2);
      
      const result = await expression.evaluate(context, form, 'json');
      
      expect(result.success).toBe(true);
      if (result.success) {
        const parsed = JSON.parse(result.value);
        expect(parsed.name).toBe('John');
        expect(parsed.age).toBe(25);
      }
    });

    test('handles complex form data in JSON', async () => {
      const form = createMockForm();
      
      const result = await expression.evaluate(context, form, 'json');
      
      expect(result.success).toBe(true);
      if (result.success) {
        const parsed = JSON.parse(result.value);
        expect(parsed.username).toBe('john_doe');
        expect(parsed.age).toBe(25);
        expect(parsed.notifications).toBe('yes');
        expect(parsed.marketing).toBe(false);
      }
    });
  });

  describe('Edge Cases', () => {
    test('handles empty form', async () => {
      const form = document.createElement('form');
      
      const result = await expression.evaluate(context, form);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('');
      }
    });

    test('excludes null and undefined values', async () => {
      const form = document.createElement('form');
      
      const input1 = document.createElement('input');
      input1.name = 'valid';
      input1.value = 'value';
      form.appendChild(input1);
      
      const input2 = document.createElement('input');
      input2.name = 'empty';
      input2.value = '';
      form.appendChild(input2);
      
      const result = await expression.evaluate(context, form);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toContain('valid=value');
        expect(result.value).toContain('empty=');
      }
    });
  });

  describe('Error Handling', () => {
    test('handles invalid form element', async () => {
      const result = await expression.evaluate(context, null as any);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_FORM_ELEMENT');
      }
    });
  });
});

describe('Expression Registry', () => {
  test('exports all enhanced form expressions', () => {
    expect(enhancedFormExpressions['form-values']).toBeInstanceOf(EnhancedFormValuesExpression);
    expect(enhancedFormExpressions['form-validate']).toBeInstanceOf(EnhancedFormValidationExpression);
    expect(enhancedFormExpressions['form-serialize']).toBeInstanceOf(EnhancedFormSerializationExpression);
  });
});

describe('Utility Functions', () => {
  let context: TypedExecutionContext;

  beforeEach(() => {
    context = createMockContext();
  });

  test('extractFormValues utility works', async () => {
    const form = createMockForm();
    const result = await extractFormValues(form, context);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.username).toBe('john_doe');
      expect(result.value.age).toBe(25);
    }
  });

  test('validateForm utility works', async () => {
    const form = createMockForm();
    const result = await validateForm(form, context);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(typeof result.value).toBe('boolean');
    }
  });

  test('serializeForm utility works', async () => {
    const form = createMockForm();
    const result = await serializeForm(form, context);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(typeof result.value).toBe('string');
      expect(result.value).toContain('username=john_doe');
    }
  });
});

describe('Performance Characteristics', () => {
  let context: TypedExecutionContext;

  beforeEach(() => {
    context = createMockContext();
  });

  test('handles large forms efficiently', async () => {
    const form = document.createElement('form');
    
    // Create 100 input fields
    for (let i = 0; i < 100; i++) {
      const input = document.createElement('input');
      input.name = `field_${i}`;
      input.value = `value_${i}`;
      form.appendChild(input);
    }
    
    const expr = new EnhancedFormValuesExpression();
    const startTime = performance.now();
    const result = await expr.evaluate(context, form);
    const endTime = performance.now();
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(Object.keys(result.value)).toHaveLength(100);
    }
    
    // Should be very fast
    expect(endTime - startTime).toBeLessThan(50); // Less than 50ms
  });

  test('handles many validation operations efficiently', async () => {
    const forms = Array(50).fill(0).map(() => createMockForm());
    const expr = new EnhancedFormValidationExpression();
    
    const startTime = performance.now();
    const promises = forms.map(form => expr.evaluate(context, form));
    const results = await Promise.all(promises);
    const endTime = performance.now();
    
    // All should succeed
    results.forEach(result => {
      expect(result.success).toBe(true);
    });
    
    // Should be very fast
    expect(endTime - startTime).toBeLessThan(100); // Less than 100ms for 50 operations
  });
});