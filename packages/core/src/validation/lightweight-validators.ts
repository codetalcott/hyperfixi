/**
 * Lightweight Runtime Validators
 * 
 * These validators provide runtime validation without zod dependency.
 * They can be generated from zod schemas during build time and provide
 * the same validation logic in a lightweight format.
 */

export interface ValidationError {
  message: string;
  path: (string | number)[];
}

export interface ValidationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: ValidationError;
}

export interface RuntimeValidator<T = unknown> {
  validate(value: unknown): ValidationResult<T>;
  description?: string;
  describe(description: string): RuntimeValidator<T>;
}

// Environment-based validation control
const isProduction = typeof process !== 'undefined' 
  ? process.env.NODE_ENV === 'production'
  : false; // Default to development mode in browser environments
const skipValidation = isProduction || 
  (typeof process !== 'undefined' && process.env.HYPERFIXI_SKIP_VALIDATION === 'true') ||
  (typeof globalThis !== 'undefined' && (globalThis as any).HYPERFIXI_SKIP_VALIDATION === 'true');

/**
 * Helper function to add describe method to any validator
 */
function addDescribeMethod<T>(baseValidator: { validate: (value: unknown) => ValidationResult<T>, description?: string }): RuntimeValidator<T> {
  const validator = {
    ...baseValidator,
    describe(description: string): RuntimeValidator<T> {
      validator.description = description;
      return validator;
    }
  };
  return validator;
}

/**
 * Creates a passthrough validator for production builds
 */
function createPassthroughValidator<T>(): RuntimeValidator<T> {
  return addDescribeMethod({
    validate: (value: unknown): ValidationResult<T> => ({
      success: true,
      data: value as T
    }),
    description: undefined as string | undefined
  });
}

/**
 * String validator options
 */
export interface StringValidatorOptions {
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  optional?: boolean;
  description?: string;
}

/**
 * Creates a string validator
 */
export function createStringValidator(options: StringValidatorOptions = {}): RuntimeValidator<string> {
  if (skipValidation) {
    return createPassthroughValidator<string>();
  }

  return addDescribeMethod({
    validate: (value: unknown): ValidationResult<string> => {
      // Handle optional values
      if (options.optional && (value === undefined || value === null)) {
        return { success: true, data: undefined };
      }

      // Check if value is a string
      if (typeof value !== 'string') {
        return {
          success: false,
          error: {
            message: `Expected string, received ${typeof value}`,
            path: []
          }
        };
      }

      // Check minimum length
      if (options.minLength !== undefined && value.length < options.minLength) {
        return {
          success: false,
          error: {
            message: `String must be at least ${options.minLength} characters long`,
            path: []
          }
        };
      }

      // Check maximum length
      if (options.maxLength !== undefined && value.length > options.maxLength) {
        return {
          success: false,
          error: {
            message: `String must be at most ${options.maxLength} characters long`,
            path: []
          }
        };
      }

      // Check pattern
      if (options.pattern && !options.pattern.test(value)) {
        // Special case for literal patterns
        if (options.pattern.source.startsWith('^') && options.pattern.source.endsWith('$')) {
          const expected = options.pattern.source.slice(1, -1);
          return {
            success: false,
            error: {
              message: `Expected "${expected}", received "${value}"`,
              path: []
            }
          };
        }
        
        return {
          success: false,
          error: {
            message: `String does not match required pattern`,
            path: []
          }
        };
      }

      return { success: true, data: value };
    },
    description: options.description
  });
}

/**
 * Creates an object validator
 */
export function createObjectValidator<T extends Record<string, RuntimeValidator>>(
  fields: T
): RuntimeValidator<{ [K in keyof T]: T[K] extends RuntimeValidator<infer U> ? U : never }> {
  if (skipValidation) {
    return createPassthroughValidator();
  }

  return addDescribeMethod({
    validate: (value: unknown): ValidationResult => {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return {
          success: false,
          error: {
            message: `Expected object, received ${typeof value}`,
            path: []
          }
        };
      }

      const obj = value as Record<string, unknown>;
      const result: Record<string, unknown> = {};

      // Validate each field
      for (const [fieldName, validator] of Object.entries(fields)) {
        const fieldValue = obj[fieldName];
        const fieldResult = validator.validate(fieldValue);

        if (!fieldResult.success) {
          return {
            success: false,
            error: {
              message: fieldResult.error!.message || `Field "${fieldName}" validation failed`,
              path: [fieldName, ...fieldResult.error!.path]
            }
          };
        }

        // Check for required fields
        if (fieldResult.data === undefined && !(fieldValue === undefined)) {
          return {
            success: false,
            error: {
              message: `Required field "${fieldName}" is missing`,
              path: [fieldName]
            }
          };
        }

        if (fieldResult.data !== undefined) {
          result[fieldName] = fieldResult.data;
        }
      }

      return { success: true, data: result };
    }
  });
}

/**
 * Creates an array validator
 */
export function createArrayValidator<T>(
  itemValidator: RuntimeValidator<T>
): RuntimeValidator<T[]> {
  if (skipValidation) {
    return createPassthroughValidator<T[]>();
  }

  return addDescribeMethod({
    validate: (value: unknown): ValidationResult<T[]> => {
      if (!Array.isArray(value)) {
        return {
          success: false,
          error: {
            message: `Expected array, received ${typeof value}`,
            path: []
          }
        };
      }

      const result: T[] = [];

      for (let i = 0; i < value.length; i++) {
        const itemResult = itemValidator.validate(value[i]);
        if (!itemResult.success) {
          return {
            success: false,
            error: {
              message: itemResult.error!.message,
              path: [i, ...itemResult.error!.path]
            }
          };
        }
        result.push(itemResult.data!);
      }

      return { success: true, data: result };
    }
  });
}

/**
 * Creates a tuple validator
 */
export function createTupleValidator<T extends readonly RuntimeValidator[]>(
  validators: T
): RuntimeValidator<{ [K in keyof T]: T[K] extends RuntimeValidator<infer U> ? U : never }> {
  if (skipValidation) {
    return createPassthroughValidator();
  }

  return {
    validate: (value: unknown): ValidationResult => {
      if (!Array.isArray(value)) {
        return {
          success: false,
          error: {
            message: `Expected array, received ${typeof value}`,
            path: []
          }
        };
      }

      if (value.length !== validators.length) {
        return {
          success: false,
          error: {
            message: `Expected tuple of length ${validators.length}, received length ${value.length}`,
            path: []
          }
        };
      }

      const result: unknown[] = [];

      for (let i = 0; i < validators.length; i++) {
        const itemResult = validators[i].validate(value[i]);
        if (!itemResult.success) {
          return {
            success: false,
            error: {
              message: itemResult.error!.message,
              path: [i, ...itemResult.error!.path]
            }
          };
        }
        result.push(itemResult.data);
      }

      return { success: true, data: result };
    }
  };
}

/**
 * Creates a union validator
 */
export function createUnionValidator<T>(
  validators: RuntimeValidator<T>[]
): RuntimeValidator<T> {
  if (skipValidation) {
    return createPassthroughValidator<T>();
  }

  return {
    validate: (value: unknown): ValidationResult<T> => {
      const errors: string[] = [];

      for (const validator of validators) {
        const result = validator.validate(value);
        if (result.success) {
          return result;
        }
        errors.push(result.error!.message);
      }

      return {
        success: false,
        error: {
          message: 'Value does not match any union type',
          path: []
        }
      };
    }
  };
}

/**
 * Creates a literal validator for specific values
 */
export function createLiteralValidator<T extends string | number | boolean>(
  literalValue: T
): RuntimeValidator<T> {
  if (skipValidation) {
    return createPassthroughValidator<T>();
  }

  return {
    validate: (value: unknown): ValidationResult<T> => {
      if (value === literalValue) {
        return { success: true, data: value as T };
      }

      return {
        success: false,
        error: {
          message: `Expected ${JSON.stringify(literalValue)}, received ${JSON.stringify(value)}`,
          path: []
        }
      };
    }
  };
}

/**
 * Utility to create validators that mirror zod schemas
 */

/**
 * Creates a number validator
 */
export function createNumberValidator(options: { min?: number; max?: number } = {}): RuntimeValidator<number> {
  if (skipValidation) {
    return createPassthroughValidator<number>();
  }

  return {
    validate: (value: unknown): ValidationResult<number> => {
      const num = Number(value);
      if (isNaN(num)) {
        return {
          success: false,
          error: {
            message: `Expected number, received ${typeof value}`,
            path: []
          }
        };
      }

      if (options.min !== undefined && num < options.min) {
        return {
          success: false,
          error: {
            message: `Number must be at least ${options.min}`,
            path: []
          }
        };
      }

      if (options.max !== undefined && num > options.max) {
        return {
          success: false,
          error: {
            message: `Number must be at most ${options.max}`,
            path: []
          }
        };
      }

      return { success: true, data: num };
    }
  };
}

/**
 * Creates a custom validator
 */
export function createCustomValidator<T>(
  validator: (value: unknown) => boolean,
  errorMessage = 'Custom validation failed'
): RuntimeValidator<T> {
  if (skipValidation) {
    return createPassthroughValidator<T>();
  }

  return {
    validate: (value: unknown): ValidationResult<T> => {
      if (validator(value)) {
        return { success: true, data: value as T };
      }

      return {
        success: false,
        error: {
          message: errorMessage,
          path: []
        }
      };
    }
  };
}


// Quick fix: Add describe method to all validators
function addDescribeToValidator<T>(validator: any): RuntimeValidator<T> {
  if (!validator.describe) {
    validator.describe = function(description: string) {
      this.description = description;
      return this;
    };
  }
  return validator;
}

export const v = {
  string: (options?: StringValidatorOptions) => addDescribeToValidator(createStringValidator(options || {})),
  number: (options?: { min?: number; max?: number }) => addDescribeToValidator(createNumberValidator(options || {})),
  object: (fields: any) => addDescribeToValidator(createObjectValidator(fields)),
  array: (itemValidator: any) => addDescribeToValidator(createArrayValidator(itemValidator)),
  tuple: (validators: any) => addDescribeToValidator(createTupleValidator(validators)),
  union: (validators: any) => addDescribeToValidator(createUnionValidator(validators)),
  literal: (value: any) => addDescribeToValidator(createLiteralValidator(value)),
  custom: (validator: any, errorMessage?: string) => addDescribeToValidator(createCustomValidator(validator, errorMessage)),
  unknown: () => addDescribeToValidator(createPassthroughValidator<unknown>()),
  any: () => addDescribeToValidator(createPassthroughValidator<any>()),
  null: () => addDescribeToValidator(createLiteralValidator(null)),
  undefined: () => addDescribeToValidator(createLiteralValidator(undefined)),
  instanceOf: (constructor: any) => addDescribeToValidator(createCustomValidator(
    (value) => value instanceof constructor,
    `Expected instance of ${constructor.name}`
  ))
};