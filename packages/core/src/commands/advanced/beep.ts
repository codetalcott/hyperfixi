/**
 * Beep Command Implementation
 * Provides debugging output for expressions with type information
 * Syntax: beep! <expression> [, <expression> ...]
 */

import { CommandImplementation, ExecutionContext } from '../../types/core';

export class BeepCommand implements CommandImplementation {
  name = 'beep';
  syntax = 'beep! <expression> [, <expression> ...]';
  description = 'Debug expressions by printing their values and types to console';
  isBlocking = false;

  async execute(context: ExecutionContext, ...args: any[]): Promise<void> {
    // If no arguments, do nothing (valid case)
    if (args.length === 0) {
      return;
    }

    // Process each expression
    for (const expression of args) {
      await this.debugExpression(context, expression);
    }
  }

  validate(args: any[]): string | null {
    // Beep command accepts any number of arguments, including zero
    return null;
  }

  private async debugExpression(context: ExecutionContext, value: any): Promise<void> {
    // Create hyperscript:beep event first to allow cancellation
    const beepEvent = new CustomEvent('hyperscript:beep', {
      detail: { value },
      cancelable: true,
      bubbles: true
    });

    // Dispatch event on the current element
    const eventCanceled = context.me ? !context.me.dispatchEvent(beepEvent) : false;

    // If event was canceled, don't log
    if (eventCanceled) {
      return;
    }

    // Generate debug output
    const sourceRepresentation = this.getSourceRepresentation(value);
    const displayValue = this.getDisplayValue(value);
    const typeInfo = this.getTypeInfo(value);

    console.log(
      `///_ BEEP! The expression (${sourceRepresentation}) evaluates to:`,
      displayValue,
      `of type ${typeInfo}`
    );
  }

  private getSourceRepresentation(value: any): string {
    try {
      if (value === null) return 'null';
      if (value === undefined) return 'undefined';
      if (typeof value === 'string') return `"${value}"`;
      if (typeof value === 'number') return String(value);
      if (typeof value === 'boolean') return String(value);
      if (typeof value === 'function') {
        return value.toString();
      }
      if (value instanceof Date) {
        return value.toISOString();
      }
      if (value instanceof RegExp) {
        return value.toString();
      }
      if (value instanceof HTMLElement) {
        return 'Element';
      }
      if (Array.isArray(value)) {
        // Check if it's an element collection
        if (value.length > 0 && value.every(item => item instanceof HTMLElement)) {
          return 'ElementCollection';
        }
        return `[${value.map(item => this.getSourceRepresentation(item)).join(',')}]`;
      }
      if (typeof value === 'object') {
        return JSON.stringify(value);
      }
      
      return String(value);
    } catch (error) {
      return `[Error: ${error.message}]`;
    }
  }

  private getDisplayValue(value: any): any {
    try {
      if (typeof value === 'string') {
        return `"${value}"`;
      }
      
      // For objects that might have getters that throw, create a safe version
      if (typeof value === 'object' && value !== null) {
        try {
          JSON.stringify(value); // Test if it's safely serializable
          return value;
        } catch (error) {
          // Create a safe representation
          const safeObj: any = {};
          for (const key in value) {
            try {
              safeObj[key] = value[key];
            } catch (propError) {
              safeObj[key] = `[Error: ${propError.message}]`;
            }
          }
          return safeObj;
        }
      }
      
      return value;
    } catch (error) {
      return `[Error: ${error.message}]`;
    }
  }

  private getTypeInfo(value: any): string {
    if (value === null) return 'object (null)';
    if (value === undefined) return 'undefined';
    
    const baseType = typeof value;
    
    if (baseType === 'object') {
      if (Array.isArray(value)) {
        // Check if it's an element collection
        if (value.length > 0 && value.every(item => item instanceof HTMLElement)) {
          return 'ElementCollection';
        }
        return 'Array';
      }
      
      if (value instanceof Date) return 'Date';
      if (value instanceof RegExp) return 'RegExp';
      if (value instanceof HTMLElement) {
        return 'HTMLElement';
      }
      
      return 'Object';
    }
    
    if (baseType === 'string') return 'String';
    if (baseType === 'number') return 'Number';
    if (baseType === 'boolean') return 'Boolean';
    if (baseType === 'function') return 'Function';
    
    return baseType;
  }
}