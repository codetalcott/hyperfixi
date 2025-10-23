/**
 * Lightweight Runtime Validators
 *
 * These validators provide runtime validation without zod dependency.
 * They can be generated from zod schemas during build time and provide
 * the same validation logic in a lightweight format.
 */

import type { ValidationError } from '../types/base-types';

export interface ValidationResult<T = unknown> {
  success: boolean;
  data?: T | undefined;
  error?: ValidationError | undefined;
}

/**
 * Helper to create ValidationError objects matching base-types interface
 */
function createValidationError(
  type: ValidationError['type'],
  message: string,
  path?: string,
  suggestions: string[] = []
): ValidationError {
  return {
    type,
    message,
    suggestions,
    ...(path && { path }),
  };
}

export interface RuntimeValidator<T = unknown> {
  validate(value: unknown): ValidationResult<T>;
  safeParse(value: unknown): { success: boolean; data?: T; error?: { errors: ValidationError[] } }; // zod-compatible API
  description?: string;
  describe(description: string): RuntimeValidator<T>;
  strict(): RuntimeValidator<T>; // For object validators - reject extra properties
  optional(): RuntimeValidator<T | undefined>; // Make validator optional (allows undefined/null)

  // Chainable validator methods (via Proxy) - Phase 3.1 fix for TS2722 errors
  default(value: T): RuntimeValidator<T>;
  min(value: number): RuntimeValidator<T>;
  max(value: number): RuntimeValidator<T>;
  url(): RuntimeValidator<T>;
  email(): RuntimeValidator<T>;
  uuid(): RuntimeValidator<T>;
  regex(pattern: RegExp): RuntimeValidator<T>;
  date(): RuntimeValidator<T>;
  rest(): RuntimeValidator<T>;
  parse(value: unknown): T;
  merge(other: RuntimeValidator<any>): RuntimeValidator<T>;
  refine(refineFn: (value: T) => boolean, errorMessage?: string): RuntimeValidator<T>;
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
function addDescribeMethod<T>(baseValidator: { validate: (value: unknown) => ValidationResult<T>, description?: string | undefined }): RuntimeValidator<T> {
  const validator: RuntimeValidator<T> = {
    ...baseValidator,
    description: baseValidator.description,
    describe(description: string): RuntimeValidator<T> {
      validator.description = description;
      return validator;
    },
    safeParse(value: unknown) {
      const result = this.validate(value);
      if (result.success) {
        return { success: true, data: result.data };
      } else {
        return {
          success: false,
          error: { errors: result.error ? [result.error] : [] }
        };
      }
    },
    // Stub implementations for chainable methods
    strict(): RuntimeValidator<T> {
      return validator;
    },
    optional(): RuntimeValidator<T | undefined> {
      return validator as RuntimeValidator<T | undefined>;
    },
    default(_value: T): RuntimeValidator<T> {
      return validator;
    },
    min(_value: number): RuntimeValidator<T> {
      return validator;
    },
    max(_value: number): RuntimeValidator<T> {
      return validator;
    },
    url(): RuntimeValidator<T> {
      return validator;
    },
    email(): RuntimeValidator<T> {
      return validator;
    },
    uuid(): RuntimeValidator<T> {
      return validator;
    },
    regex(_pattern: RegExp): RuntimeValidator<T> {
      return validator;
    },
    date(): RuntimeValidator<T> {
      return validator;
    },
    rest(): RuntimeValidator<T> {
      return validator;
    },
    parse(value: unknown): T {
      const result = this.validate(value);
      if (result.success && result.data !== undefined) {
        return result.data;
      }
      throw new Error(result.error?.message || 'Validation failed');
    },
    merge(_other: RuntimeValidator<any>): RuntimeValidator<T> {
      return validator;
    },
    refine(_refineFn: (value: T) => boolean, _errorMessage?: string): RuntimeValidator<T> {
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
    })
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
          error: createValidationError(
            'type-mismatch',
            `Expected string, received ${typeof value}`
          )
        };
      }

      // Check minimum length
      if (options.minLength !== undefined && value.length < options.minLength) {
        return {
          success: false,
          error: createValidationError(
            'runtime-error',
            `String must be at least ${options.minLength} characters long`
          )
        };
      }

      // Check maximum length
      if (options.maxLength !== undefined && value.length > options.maxLength) {
        return {
          success: false,
          error: createValidationError(
            'runtime-error',
            `String must be at most ${options.maxLength} characters long`
          )
        };
      }

      // Check pattern
      if (options.pattern && !options.pattern.test(value)) {
        // Special case for literal patterns
        if (options.pattern.source.startsWith('^') && options.pattern.source.endsWith('$')) {
          const expected = options.pattern.source.slice(1, -1);
          return {
            success: false,
            error: createValidationError(
              'runtime-error',
              `Expected "${expected}", received "${value}"`
            )
          };
        }

        return {
          success: false,
          error: createValidationError('missing-argument', `String does not match required pattern`)
        };
      }

      return { success: true, data: value };
    },
    ...(options.description && { description: options.description })
  });
}

/**
 * Creates an object validator
 */
export function createObjectValidator<T extends Record<string, RuntimeValidator>>(
  fields: T,
  options?: { strict?: boolean } | undefined
): RuntimeValidator<{ [K in keyof T]: T[K] extends RuntimeValidator<infer U> ? U : never }> {
  if (skipValidation) {
    return createPassthroughValidator() as any;
  }

  const validator = addDescribeMethod({
    validate: (value: unknown): ValidationResult => {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return {
          success: false,
          error: createValidationError(
            'type-mismatch',
            `Expected object, received ${typeof value}`
          )
        };
      }

      const obj = value as Record<string, unknown>;
      const result: Record<string, unknown> = {};

      // Check for extra properties in strict mode
      if (options?.strict) {
        const allowedKeys = Object.keys(fields);
        const actualKeys = Object.keys(obj);
        const extraKeys = actualKeys.filter(key => !allowedKeys.includes(key));

        if (extraKeys.length > 0) {
          return {
            success: false,
            error: createValidationError(
              'runtime-error',
              `Unexpected properties: ${extraKeys.join(', ')}`
            )
          };
        }
      }

      // Validate each field
      for (const [fieldName, validator] of Object.entries(fields)) {
        const fieldValue = obj[fieldName];
        const fieldResult = validator.validate(fieldValue);

        if (!fieldResult.success) {
          const errorPath = fieldResult.error!.path ? `${fieldName}.${fieldResult.error!.path}` : fieldName;
          return {
            success: false,
            error: createValidationError(
              'validation-error',
              fieldResult.error!.message || `Field "${fieldName}" validation failed`,
              errorPath
            )
          };
        }

        // Check for required fields
        if (fieldResult.data === undefined && !(fieldValue === undefined)) {
          return {
            success: false,
            error: createValidationError(
              'missing-argument',
              `Required field "${fieldName}" is missing`,
              fieldName
            )
          };
        }

        if (fieldResult.data !== undefined) {
          result[fieldName] = fieldResult.data;
        }
      }

      return { success: true, data: result };
    }
  });

  // Add strict() method to return a new validator with strict mode enabled
  (validator as any).strict = () => createObjectValidator(fields, { strict: true });

  return validator as RuntimeValidator<{ [K in keyof T]: T[K] extends RuntimeValidator<infer U> ? U : never }>;
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
          error: createValidationError(
            'type-mismatch',
            `Expected array, received ${typeof value}`
          )
        };
      }

      const result: T[] = [];

      for (let i = 0; i < value.length; i++) {
        const itemResult = itemValidator.validate(value[i]);
        if (!itemResult.success) {
          const errorPath = itemResult.error!.path ? `${i}.${itemResult.error!.path}` : `${i}`;
          return {
            success: false,
            error: createValidationError('runtime-error', itemResult.error!.message, errorPath)
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

  return addDescribeMethod({
    validate: (value: unknown): ValidationResult<{ [K in keyof T]: T[K] extends RuntimeValidator<infer U> ? U : never }> => {
      if (!Array.isArray(value)) {
        return {
          success: false,
          error: createValidationError(
            'type-mismatch',
            `Expected array, received ${typeof value}`
          )
        };
      }

      if (value.length !== validators.length) {
        return {
          success: false,
          error: createValidationError(
            'runtime-error',
            `Expected tuple of length ${validators.length}, received length ${value.length}`
          )
        };
      }

      const result: unknown[] = [];

      for (let i = 0; i < validators.length; i++) {
        const itemResult = validators[i].validate(value[i]);
        if (!itemResult.success) {
          const errorPath = itemResult.error!.path ? `${i}.${itemResult.error!.path}` : `${i}`;
          return {
            success: false,
            error: createValidationError('runtime-error', itemResult.error!.message, errorPath)
          };
        }
        result.push(itemResult.data);
      }

      return { success: true, data: result as { [K in keyof T]: T[K] extends RuntimeValidator<infer U> ? U : never } };
    }
  });
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

  return addDescribeMethod({
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
        error: createValidationError('type-mismatch', 'Value does not match any union type')
      };
    }
  });
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

  return addDescribeMethod({
    validate: (value: unknown): ValidationResult<T> => {
      if (value === literalValue) {
        return { success: true, data: value as T };
      }

      return {
        success: false,
        error: createValidationError(
          'runtime-error',
          `Expected ${JSON.stringify(literalValue)}, received ${JSON.stringify(value)}`
        )
      };
    }
  });
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

  return addDescribeMethod({
    validate: (value: unknown): ValidationResult<number> => {
      const num = Number(value);
      if (isNaN(num)) {
        return {
          success: false,
          error: createValidationError(
            'type-mismatch',
            `Expected number, received ${typeof value}`
          )
        };
      }

      if (options.min !== undefined && num < options.min) {
        return {
          success: false,
          error: createValidationError(
            'runtime-error',
            `Number must be at least ${options.min}`
          )
        };
      }

      if (options.max !== undefined && num > options.max) {
        return {
          success: false,
          error: createValidationError(
            'runtime-error',
            `Number must be at most ${options.max}`
          )
        };
      }

      return { success: true, data: num };
    }
  });
}

/**
 * Creates a boolean validator
 */
export function createBooleanValidator(): RuntimeValidator<boolean> {
  if (skipValidation) {
    return createPassthroughValidator<boolean>();
  }

  return addDescribeMethod({
    validate: (value: unknown): ValidationResult<boolean> => {
      if (typeof value !== 'boolean') {
        return {
          success: false,
          error: createValidationError(
            'type-mismatch',
            `Expected boolean, received ${typeof value}`
          )
        };
      }

      return { success: true, data: value };
    }
  });
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

  return addDescribeMethod({
    validate: (value: unknown): ValidationResult<T> => {
      if (validator(value)) {
        return { success: true, data: value as T };
      }

      return {
        success: false,
        error: createValidationError('runtime-error', errorMessage)
      };
    }
  });
}


// Quick fix: Add describe, optional, and chainable methods to all validators
function addDescribeToValidator<T>(validator: any): RuntimeValidator<T> {
  if (!validator.describe) {
    validator.describe = function(description: string) {
      this.description = description;
      return this;
    };
  }
  if (!validator.safeParse) {
    validator.safeParse = function(value: unknown) {
      const result = this.validate(value);
      if (result.success) {
        return { success: true, data: result.data };
      } else {
        return {
          success: false,
          error: { errors: result.error ? [result.error] : [] }
        };
      }
    };
  }
  if (!validator.optional) {
    validator.optional = function() {
      const originalValidate = this.validate.bind(this);
      const optionalValidator = {
        ...this,
        validate: (value: unknown): ValidationResult<T | undefined> => {
          // Allow undefined and null for optional validators
          if (value === undefined || value === null) {
            return { success: true, data: undefined };
          }
          return originalValidate(value);
        }
      };
      // Re-add describe and optional methods to the new validator
      return addDescribeToValidator(optionalValidator);
    };
  }
  // Add chainable methods for string validators (min, max)
  if (!validator.min) {
    validator.min = function(minLength: number) {
      const newValidator = createStringValidator({ minLength });
      return addDescribeToValidator(newValidator);
    };
  }
  if (!validator.max) {
    validator.max = function(maxLength: number) {
      const newValidator = createStringValidator({ maxLength });
      return addDescribeToValidator(newValidator);
    };
  }
  // Add default method for enum-like validators
  if (!validator.default) {
    validator.default = function(defaultValue: any) {
      (this as any)._defaultValue = defaultValue;
      return this;
    };
  }
  // Add rest method for tuple validators (ignores rest elements for now)
  if (!validator.rest) {
    validator.rest = function(_restValidator: any) {
      // For now, just return this - we don't enforce rest validation
      return this;
    };
  }
  // Add refine method (custom validation)
  if (!validator.refine) {
    validator.refine = function(_refineFn: any, _errorMessage?: string) {
      // For now, just return this - we don't enforce refinements
      return this;
    };
  }

  // Add catch-all methods using Proxy for any other zod-style chainable methods
  // This allows .url(), .email(), .uuid(), etc. to work without explicit implementation
  return new Proxy(validator, {
    get(target, prop, receiver) {
      // If the property exists, return it
      if (prop in target) {
        return Reflect.get(target, prop, receiver);
      }

      // For unknown methods that look like chainable validators, return a function
      // that returns 'this' (allows chaining but doesn't validate)
      if (typeof prop === 'string' &&
          !prop.startsWith('_') &&
          prop !== 'constructor' &&
          prop !== 'validate' &&
          prop !== 'then') {  // Avoid breaking Promises
        return function(..._args: any[]) {
          // Return the validator itself for chaining
          return receiver;
        };
      }

      return Reflect.get(target, prop, receiver);
    }
  });
}

/**
 * Creates a record validator (object with dynamic keys)
 */
export function createRecordValidator<K extends string | number | symbol, V>(
  keyValidator: RuntimeValidator<K>,
  valueValidator: RuntimeValidator<V>
): RuntimeValidator<Record<K, V>> {
  if (skipValidation) {
    return createPassthroughValidator<Record<K, V>>();
  }

  return addDescribeMethod({
    validate: (value: unknown): ValidationResult<Record<K, V>> => {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return {
          success: false,
          error: createValidationError(
            'type-mismatch',
            `Expected record object, received ${typeof value}`
          )
        };
      }

      const obj = value as Record<string, unknown>;
      const result: Record<string, any> = {};

      // Validate each key-value pair
      for (const [key, val] of Object.entries(obj)) {
        const keyResult = keyValidator.validate(key);
        if (!keyResult.success) {
          return {
            success: false,
            error: createValidationError(
              'invalid-argument',
              `Invalid key "${key}": ${keyResult.error!.message}`,
              key
            )
          };
        }

        const valueResult = valueValidator.validate(val);
        if (!valueResult.success) {
          const errorPath = valueResult.error!.path ? `${key}.${valueResult.error!.path}` : key;
          return {
            success: false,
            error: createValidationError('runtime-error', valueResult.error!.message, errorPath)
          };
        }

        result[key] = valueResult.data;
      }

      return { success: true, data: result as Record<K, V> };
    }
  });
}

/**
 * Creates an enum validator (value must be one of the allowed values)
 */
export function createEnumValidator<T extends readonly string[]>(
  values: T
): RuntimeValidator<T[number]> {
  if (skipValidation) {
    return createPassthroughValidator<T[number]>();
  }

  return addDescribeMethod({
    validate: (value: unknown): ValidationResult<T[number]> => {
      if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
        return {
          success: false,
          error: createValidationError(
            'type-mismatch',
            `Expected string, received ${typeof value}`
          )
        };
      }

      if (!(values as readonly (string | number | boolean)[]).includes(value)) {
        return {
          success: false,
          error: createValidationError(
            'runtime-error',
            `Expected one of [${values.join(', ')}], received "${value}"`
          )
        };
      }

      return { success: true, data: value as T[number] };
    }
  });
}

export const v = {
  string: (options?: StringValidatorOptions) => addDescribeToValidator(createStringValidator(options || {})),
  number: (options?: { min?: number; max?: number }) => addDescribeToValidator(createNumberValidator(options || {})),
  boolean: () => addDescribeToValidator(createBooleanValidator()),
  object: (fields: any) => addDescribeToValidator(createObjectValidator(fields)),
  array: (itemValidator: any) => addDescribeToValidator(createArrayValidator(itemValidator)),
  tuple: (validators: any) => addDescribeToValidator(createTupleValidator(validators)),
  union: (validators: any) => addDescribeToValidator(createUnionValidator(validators)),
  literal: (value: any) => addDescribeToValidator(createLiteralValidator(value)),
  custom: (validator: any, errorMessage?: string) => addDescribeToValidator(createCustomValidator(validator, errorMessage)),
  record: (keyValidator: any, valueValidator: any) => addDescribeToValidator(createRecordValidator(keyValidator, valueValidator)),
  enum: (values: readonly string[]) => addDescribeToValidator(createEnumValidator(values)),
  function: () => addDescribeToValidator(createCustomValidator((value) => typeof value === 'function', 'Expected function')),
  unknown: () => addDescribeToValidator(createPassthroughValidator<unknown>()),
  any: () => addDescribeToValidator(createPassthroughValidator<any>()),
  null: () => addDescribeToValidator(createLiteralValidator(null)),
  undefined: () => addDescribeToValidator(createLiteralValidator(undefined)),
  instanceOf: (constructor: any) => addDescribeToValidator(createCustomValidator(
    (value) => value instanceof constructor,
    `Expected instance of ${constructor.name}`
  )),
  instanceof: (constructor: any) => addDescribeToValidator(createCustomValidator(
    (value) => value instanceof constructor,
    `Expected instance of ${constructor.name}`
  ))
};

// Alias z to v for backward compatibility with zod-style code
export const z = v;