/**
 * Form/Input Operations Expressions
 * Comprehensive implementation of hyperscript form manipulation capabilities
 * Generated from LSP data with TDD implementation
 */

import { ExpressionImplementation, ExecutionContext } from '../../types/core';

/**
 * Form values extraction expression
 */
export class FormValuesExpression implements ExpressionImplementation {
  name = 'formValues';
  category = 'Form';
  description = 'Extracts all form field values as an object';

  async evaluate(context: ExecutionContext, formElement: any): Promise<any> {
    if (!formElement) return {};
    
    const result: any = {};
    
    // Handle form elements
    if (formElement.tagName === 'FORM') {
      // Use querySelectorAll to get all form fields
      const elements = formElement.querySelectorAll('input, textarea, select');
      
      // Process each form element
      for (const element of elements) {
        if (element.name) {
          if (element.type === 'checkbox') {
            if (element.checked) {
              result[element.name] = element.value || 'on';
            }
          } else if (element.type === 'radio') {
            if (element.checked) {
              result[element.name] = element.value;
            }
          } else {
            result[element.name] = element.value;
          }
        }
      }
    }
    
    return result;
  }

  validate(args: any[]): string | null {
    if (args.length === 0) return 'Form element required';
    return null;
  }
}

/**
 * Form data extraction expression
 */
export class FormDataExpression implements ExpressionImplementation {
  name = 'formData';
  category = 'Form';
  description = 'Creates FormData object from form';

  async evaluate(context: ExecutionContext, formElement: any): Promise<any> {
    if (!formElement || formElement.tagName !== 'FORM') {
      return {};
    }
    
    try {
      return new FormData(formElement);
    } catch (error) {
      // Fallback for test environments
      const result: any = {};
      const elements = formElement.elements || [];
      
      for (const element of elements) {
        if (element.name && element.value !== undefined) {
          result[element.name] = element.value;
        }
      }
      
      return result;
    }
  }

  validate(args: any[]): string | null {
    if (args.length === 0) return 'Form element required';
    return null;
  }
}

/**
 * Get input value expression
 */
export class GetValueExpression implements ExpressionImplementation {
  name = 'getValue';
  category = 'Form';
  description = 'Gets the value of a form field';

  async evaluate(context: ExecutionContext, element: any): Promise<string> {
    if (!element) return '';
    
    if (element.type === 'checkbox' || element.type === 'radio') {
      return element.checked ? element.value || 'on' : '';
    }
    
    return element.value || '';
  }

  validate(args: any[]): string | null {
    if (args.length === 0) return 'Element required';
    return null;
  }
}

/**
 * Set input value expression
 */
export class SetValueExpression implements ExpressionImplementation {
  name = 'setValue';
  category = 'Form';
  description = 'Sets the value of a form field';

  async evaluate(context: ExecutionContext, element: any, value: any): Promise<void> {
    if (!element) return;
    
    if (element.type === 'checkbox' || element.type === 'radio') {
      element.checked = Boolean(value);
    } else {
      element.value = String(value);
    }
  }

  validate(args: any[]): string | null {
    if (args.length === 0) return 'Element and value required';
    if (args.length === 1) return 'Value required';
    return null;
  }
}

/**
 * Form validation expressions
 */
export class IsValidExpression implements ExpressionImplementation {
  name = 'isValid';
  category = 'Form';
  description = 'Checks if form field is valid';

  async evaluate(context: ExecutionContext, element: any): Promise<boolean> {
    if (!element) return true;
    
    // Use HTML5 validation API
    if (element.checkValidity) {
      return element.checkValidity();
    }
    
    return true;
  }

  validate(args: any[]): string | null {
    if (args.length === 0) return 'Element required';
    return null;
  }
}

export class ValidationMessageExpression implements ExpressionImplementation {
  name = 'validationMessage';
  category = 'Form';
  description = 'Gets validation message for form field';

  async evaluate(context: ExecutionContext, element: any): Promise<string> {
    if (!element) return '';
    
    return element.validationMessage || '';
  }

  validate(args: any[]): string | null {
    if (args.length === 0) return 'Element required';
    return null;
  }
}

export class IsRequiredExpression implements ExpressionImplementation {
  name = 'isRequired';
  category = 'Form';
  description = 'Checks if form field is required';

  async evaluate(context: ExecutionContext, element: any): Promise<boolean> {
    if (!element) return false;
    
    return element.required || false;
  }

  validate(args: any[]): string | null {
    if (args.length === 0) return 'Element required';
    return null;
  }
}

/**
 * Checkbox and radio operations
 */
export class IsCheckedExpression implements ExpressionImplementation {
  name = 'isChecked';
  category = 'Form';
  description = 'Checks if checkbox or radio button is checked';

  async evaluate(context: ExecutionContext, element: any): Promise<boolean> {
    if (!element) return false;
    
    return element.checked || false;
  }

  validate(args: any[]): string | null {
    if (args.length === 0) return 'Element required';
    return null;
  }
}

export class SetCheckedExpression implements ExpressionImplementation {
  name = 'setChecked';
  category = 'Form';
  description = 'Sets checked state of checkbox or radio button';

  async evaluate(context: ExecutionContext, element: any, checked: boolean): Promise<void> {
    if (!element) return;
    
    element.checked = Boolean(checked);
  }

  validate(args: any[]): string | null {
    if (args.length < 2) return 'Element and checked state required';
    return null;
  }
}

export class GetRadioValueExpression implements ExpressionImplementation {
  name = 'getRadioValue';
  category = 'Form';
  description = 'Gets value of checked radio button in group';

  async evaluate(context: ExecutionContext, form: any, name: string): Promise<string | null> {
    if (!form || !name) return null;
    
    const radios = form.querySelectorAll(`input[type="radio"][name="${name}"]`);
    
    for (const radio of radios) {
      if (radio.checked) {
        return radio.value;
      }
    }
    
    return null;
  }

  validate(args: any[]): string | null {
    if (args.length < 2) return 'Form and radio name required';
    return null;
  }
}

export class GetCheckboxValuesExpression implements ExpressionImplementation {
  name = 'getCheckboxValues';
  category = 'Form';
  description = 'Gets values of all checked checkboxes in group';

  async evaluate(context: ExecutionContext, form: any, name: string): Promise<string[]> {
    if (!form || !name) return [];
    
    const checkboxes = form.querySelectorAll(`input[type="checkbox"][name="${name}"]`);
    const values: string[] = [];
    
    for (const checkbox of checkboxes) {
      if (checkbox.checked) {
        values.push(checkbox.value);
      }
    }
    
    return values;
  }

  validate(args: any[]): string | null {
    if (args.length < 2) return 'Form and checkbox name required';
    return null;
  }
}

/**
 * Select operations
 */
export class GetSelectedValueExpression implements ExpressionImplementation {
  name = 'getSelectedValue';
  category = 'Form';
  description = 'Gets value of selected option in select element';

  async evaluate(context: ExecutionContext, select: any): Promise<string> {
    if (!select) return '';
    
    return select.value || '';
  }

  validate(args: any[]): string | null {
    if (args.length === 0) return 'Select element required';
    return null;
  }
}

export class GetSelectedTextExpression implements ExpressionImplementation {
  name = 'getSelectedText';
  category = 'Form';
  description = 'Gets text of selected option in select element';

  async evaluate(context: ExecutionContext, select: any): Promise<string> {
    if (!select || !select.options) return '';
    
    const selectedOption = select.options[select.selectedIndex];
    return selectedOption ? selectedOption.text : '';
  }

  validate(args: any[]): string | null {
    if (args.length === 0) return 'Select element required';
    return null;
  }
}

export class GetSelectedValuesExpression implements ExpressionImplementation {
  name = 'getSelectedValues';
  category = 'Form';
  description = 'Gets values of all selected options in multi-select';

  async evaluate(context: ExecutionContext, select: any): Promise<string[]> {
    if (!select || !select.options) return [];
    
    const values: string[] = [];
    
    for (let i = 0; i < select.options.length; i++) {
      const option = select.options[i];
      if (option.selected) {
        values.push(option.value);
      }
    }
    
    return values;
  }

  validate(args: any[]): string | null {
    if (args.length === 0) return 'Select element required';
    return null;
  }
}

export class SetSelectedValueExpression implements ExpressionImplementation {
  name = 'setSelectedValue';
  category = 'Form';
  description = 'Sets selected option by value';

  async evaluate(context: ExecutionContext, select: any, value: string): Promise<void> {
    if (!select) return;
    
    select.value = value;
  }

  validate(args: any[]): string | null {
    if (args.length < 2) return 'Select element and value required';
    return null;
  }
}

/**
 * File input operations
 */
export class HasFilesExpression implements ExpressionImplementation {
  name = 'hasFiles';
  category = 'Form';
  description = 'Checks if file input has files selected';

  async evaluate(context: ExecutionContext, input: any): Promise<boolean> {
    if (!input || input.type !== 'file') return false;
    
    return (input.files?.length || 0) > 0;
  }

  validate(args: any[]): string | null {
    if (args.length === 0) return 'File input required';
    return null;
  }
}

export class GetFileCountExpression implements ExpressionImplementation {
  name = 'getFileCount';
  category = 'Form';
  description = 'Gets number of selected files';

  async evaluate(context: ExecutionContext, input: any): Promise<number> {
    if (!input || input.type !== 'file') return 0;
    
    return input.files?.length || 0;
  }

  validate(args: any[]): string | null {
    if (args.length === 0) return 'File input required';
    return null;
  }
}

export class GetFileNamesExpression implements ExpressionImplementation {
  name = 'getFileNames';
  category = 'Form';
  description = 'Gets names of selected files';

  async evaluate(context: ExecutionContext, input: any): Promise<string[]> {
    if (!input || input.type !== 'file' || !input.files) return [];
    
    const names: string[] = [];
    for (const file of input.files) {
      names.push(file.name);
    }
    
    return names;
  }

  validate(args: any[]): string | null {
    if (args.length === 0) return 'File input required';
    return null;
  }
}

/**
 * Form state and manipulation
 */
export class IsDisabledExpression implements ExpressionImplementation {
  name = 'isDisabled';
  category = 'Form';
  description = 'Checks if form field is disabled';

  async evaluate(context: ExecutionContext, element: any): Promise<boolean> {
    if (!element) return true;
    
    return element.disabled || false;
  }

  validate(args: any[]): string | null {
    if (args.length === 0) return 'Element required';
    return null;
  }
}

export class SetDisabledExpression implements ExpressionImplementation {
  name = 'setDisabled';
  category = 'Form';
  description = 'Sets disabled state of form field';

  async evaluate(context: ExecutionContext, element: any, disabled: boolean): Promise<void> {
    if (!element) return;
    
    element.disabled = Boolean(disabled);
  }

  validate(args: any[]): string | null {
    if (args.length < 2) return 'Element and disabled state required';
    return null;
  }
}

export class ClearValueExpression implements ExpressionImplementation {
  name = 'clearValue';
  category = 'Form';
  description = 'Clears value of form field';

  async evaluate(context: ExecutionContext, element: any): Promise<void> {
    if (!element) return;
    
    if (element.type === 'checkbox' || element.type === 'radio') {
      element.checked = false;
    } else if (element.tagName === 'SELECT') {
      element.selectedIndex = -1;
    } else {
      element.value = '';
    }
  }

  validate(args: any[]): string | null {
    if (args.length === 0) return 'Element required';
    return null;
  }
}

export class ResetFormExpression implements ExpressionImplementation {
  name = 'resetForm';
  category = 'Form';
  description = 'Resets form to original values';

  async evaluate(context: ExecutionContext, form: any): Promise<void> {
    if (!form || form.tagName !== 'FORM') return;
    
    if (form.reset) {
      form.reset();
    }
  }

  validate(args: any[]): string | null {
    if (args.length === 0) return 'Form element required';
    return null;
  }
}

/**
 * Advanced form operations
 */
export class SerializeFormExpression implements ExpressionImplementation {
  name = 'serializeForm';
  category = 'Form';
  description = 'Serializes form data as URL-encoded string';

  async evaluate(context: ExecutionContext, form: any): Promise<string> {
    if (!form || form.tagName !== 'FORM') return '';
    
    try {
      const formData = new FormData(form);
      const params = new URLSearchParams();
      
      for (const [key, value] of formData.entries()) {
        params.append(key, String(value));
      }
      
      return params.toString();
    } catch (error) {
      // Fallback for test environments
      const elements = form.elements || [];
      const params: string[] = [];
      
      for (const element of elements) {
        if (element.name && element.value !== undefined) {
          params.push(`${encodeURIComponent(element.name)}=${encodeURIComponent(element.value)}`);
        }
      }
      
      return params.join('&');
    }
  }

  validate(args: any[]): string | null {
    if (args.length === 0) return 'Form element required';
    return null;
  }
}

export class GetFormFieldExpression implements ExpressionImplementation {
  name = 'getFormField';
  category = 'Form';
  description = 'Gets form field by name';

  async evaluate(context: ExecutionContext, form: any, name: string): Promise<any> {
    if (!form || !name) return null;
    
    return form.querySelector(`[name="${name}"]`) || 
           form.querySelector(`#${name}`) || 
           null;
  }

  validate(args: any[]): string | null {
    if (args.length < 2) return 'Form and field name required';
    return null;
  }
}

export class GetFormFieldsExpression implements ExpressionImplementation {
  name = 'getFormFields';
  category = 'Form';
  description = 'Gets all form fields';

  async evaluate(context: ExecutionContext, form: any): Promise<any[]> {
    if (!form) return [];
    
    const fields = form.querySelectorAll('input, textarea, select, button');
    return Array.from(fields);
  }

  validate(args: any[]): string | null {
    if (args.length === 0) return 'Form element required';
    return null;
  }
}

export class ValidateFormExpression implements ExpressionImplementation {
  name = 'validateForm';
  category = 'Form';
  description = 'Validates entire form and returns errors';

  async evaluate(context: ExecutionContext, form: any): Promise<any> {
    if (!form) return { isValid: true, errors: {} };
    
    const errors: any = {};
    let isValid = true;
    
    const fields = form.querySelectorAll('input, textarea, select');
    
    for (const field of fields) {
      if (field.checkValidity && !field.checkValidity()) {
        isValid = false;
        if (field.name) {
          errors[field.name] = field.validationMessage || 'Invalid value';
        }
      }
    }
    
    return { isValid, errors };
  }

  validate(args: any[]): string | null {
    if (args.length === 0) return 'Form element required';
    return null;
  }
}

export class FocusFieldExpression implements ExpressionImplementation {
  name = 'focusField';
  category = 'Form';
  description = 'Sets focus to form field';

  async evaluate(context: ExecutionContext, element: any): Promise<void> {
    if (!element || !element.focus) return;
    
    element.focus();
  }

  validate(args: any[]): string | null {
    if (args.length === 0) return 'Element required';
    return null;
  }
}

export class BlurFieldExpression implements ExpressionImplementation {
  name = 'blurField';
  category = 'Form';
  description = 'Removes focus from form field';

  async evaluate(context: ExecutionContext, element: any): Promise<void> {
    if (!element || !element.blur) return;
    
    element.blur();
  }

  validate(args: any[]): string | null {
    if (args.length === 0) return 'Element required';
    return null;
  }
}

/**
 * Export all form expressions
 */
export const formExpressions: ExpressionImplementation[] = [
  new FormValuesExpression(),
  new FormDataExpression(),
  new GetValueExpression(),
  new SetValueExpression(),
  new IsValidExpression(),
  new ValidationMessageExpression(),
  new IsRequiredExpression(),
  new IsCheckedExpression(),
  new SetCheckedExpression(),
  new GetRadioValueExpression(),
  new GetCheckboxValuesExpression(),
  new GetSelectedValueExpression(),
  new GetSelectedTextExpression(),
  new GetSelectedValuesExpression(),
  new SetSelectedValueExpression(),
  new HasFilesExpression(),
  new GetFileCountExpression(),
  new GetFileNamesExpression(),
  new IsDisabledExpression(),
  new SetDisabledExpression(),
  new ClearValueExpression(),
  new ResetFormExpression(),
  new SerializeFormExpression(),
  new GetFormFieldExpression(),
  new GetFormFieldsExpression(),
  new ValidateFormExpression(),
  new FocusFieldExpression(),
  new BlurFieldExpression(),
];

export default formExpressions;