/**
 * Test helper functions for AddCommand discriminated union types
 */

import type { AddCommandInput } from '../add';

/**
 * Type guard to check if input is classes type
 */
export function isClassesInput(
  input: AddCommandInput
): input is Extract<AddCommandInput, { type: 'classes' }> {
  return input.type === 'classes';
}

/**
 * Type guard to check if input is attribute type
 */
export function isAttributeInput(
  input: AddCommandInput
): input is Extract<AddCommandInput, { type: 'attribute' }> {
  return input.type === 'attribute';
}

/**
 * Type guard to check if input is styles type
 */
export function isStylesInput(
  input: AddCommandInput
): input is Extract<AddCommandInput, { type: 'styles' }> {
  return input.type === 'styles';
}
