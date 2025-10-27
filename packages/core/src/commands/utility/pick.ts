/**
 * Enhanced Pick Command Implementation
 * Selects a random element from a collection or choice from options
 * 
 * Syntax: pick <item1>, <item2>, ... | pick from <array>
 * 
 * Modernized with CommandImplementation interface
 */

import type { CommandImplementation } from '../../types/core';
import type { TypedExecutionContext } from '../../types/command-types';
import type { UnifiedValidationResult } from '../../types/unified-types';

// Input type definition
export interface PickCommandInput {
  items?: any[]; // For direct item list
  array?: any[]; // For array-based picking
  fromKeyword?: 'from'; // For syntax validation
}

// Output type definition  
export interface PickCommandOutput {
  selectedItem: any;
  selectedIndex: number;
  sourceLength: number;
  sourceType: 'items' | 'array';
}

/**
 * Enhanced Pick Command with full type safety and validation
 */
export class PickCommand implements CommandImplementation<
  PickCommandInput,
  PickCommandOutput,
  TypedExecutionContext
> {
  metadata = {
    name: 'pick',
    description: 'The pick command selects a random element from a collection of items or from an array. It sets the selected item to the "it" context variable.',
    examples: [
      'pick "red", "green", "blue"',
      'pick from colors',
      'pick 1, 2, 3, 4, 5',
      'pick from document.querySelectorAll(".option")',
      'pick "heads", "tails"'
    ],
    syntax: 'pick <item1>, <item2>, ... | pick from <array>',
    category: 'utility' as const,
    version: '2.0.0'
  };

  validation = {
    validate(input: unknown): UnifiedValidationResult<PickCommandInput> {
      if (!input || typeof input !== 'object') {
        return {
          isValid: false,
          errors: [{
            type: 'syntax-error',
            message: 'Pick command requires an object input',
            suggestions: ['Provide an object with items array or array property']
          }],
          suggestions: ['Provide an object with items array or array property']
        };
      }

      const inputObj = input as any;

      // Must have either items or array
      if (!inputObj.items && !inputObj.array) {
        return {
          isValid: false,
          errors: [{
            type: 'missing-argument',
            message: 'Pick command requires items to choose from',
            suggestions: ['Provide an items array or use "from" with an array']
          }],
          suggestions: ['Provide an items array or use "from" with an array']
        };
      }

      // Cannot have both items and array
      if (inputObj.items && inputObj.array) {
        return {
          isValid: false,
          errors: [{
            type: 'syntax-error',
            message: 'Pick command cannot have both direct items and array',
            suggestions: ['Use either direct items or "from" array syntax, not both']
          }],
          suggestions: ['Use either direct items or "from" array syntax, not both']
        };
      }

      // Validate items if provided
      if (inputObj.items && !Array.isArray(inputObj.items)) {
        return {
          isValid: false,
          errors: [{
            type: 'type-mismatch',
            message: 'Items must be an array',
            suggestions: ['Provide an array of items to pick from']
          }],
          suggestions: ['Provide an array of items to pick from']
        };
      }

      // Validate array if provided
      if (inputObj.array && !Array.isArray(inputObj.array)) {
        return {
          isValid: false,
          errors: [{
            type: 'type-mismatch',
            message: 'Array must be an array type',
            suggestions: ['Provide a valid array to pick from']
          }],
          suggestions: ['Provide a valid array to pick from']
        };
      }

      // Check that we have at least one item
      const sourceArray = inputObj.items || inputObj.array;
      if (sourceArray.length === 0) {
        return {
          isValid: false,
          errors: [{
            type: 'syntax-error',
            message: 'Cannot pick from empty collection',
            suggestions: ['Provide at least one item to pick from']
          }],
          suggestions: ['Provide at least one item to pick from']
        };
      }

      return {
        isValid: true,
        errors: [],
        suggestions: [],
        data: {
          items: inputObj.items,
          array: inputObj.array,
          fromKeyword: inputObj.fromKeyword
        }
      };
    }
  };

  async execute(
    input: PickCommandInput,
    context: TypedExecutionContext
  ): Promise<PickCommandOutput> {
    const { items, array } = input;

    // Determine source array and type
    const sourceArray = items || array;
    const sourceType: 'items' | 'array' = items ? 'items' : 'array';

    if (!sourceArray || sourceArray.length === 0) {
      throw new Error('Cannot pick from empty collection');
    }

    // Generate random index
    const selectedIndex = Math.floor(Math.random() * sourceArray.length);
    const selectedItem = sourceArray[selectedIndex];

    // Set the selected item in context
    Object.assign(context, { it: selectedItem });

    return {
      selectedItem,
      selectedIndex,
      sourceLength: sourceArray.length,
      sourceType
    };
  }
}

/**
 * Factory function to create the enhanced pick command
 */
export function createPickCommand(): PickCommand {
  return new PickCommand();
}

export default PickCommand;