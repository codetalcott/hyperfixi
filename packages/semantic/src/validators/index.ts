/**
 * Semantic Validators
 *
 * Validates semantic parse results for correctness and type safety.
 */

export {
  validateSemanticResult,
  validateAndAdjustConfidence,
  getSchema,
  registerSchema,
  schemaRegistry,
  type ValidationError,
  type ValidationResult,
} from './command-validator';
