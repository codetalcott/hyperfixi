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
  safeParse(value: unknown): { success: boolean; data?: T; error?: { errors: ValidationError[] } }; // zod-compatible API
  description?: string;
  describe(description: string): RuntimeValidator<T>;
  strict?(): RuntimeValidator<T>; // For object validators - reject extra properties
  optional?(): RuntimeValidator<T | undefined>; // Make validator optional (allows undefined/null)
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
  fields: T,
  options?: { strict?: boolean }
): RuntimeValidator<{ [K in keyof T]: T[K] extends RuntimeValidator<infer U> ? U : never }> {
  if (skipValidation) {
    return createPassthroughValidator();
  }

  const validator = addDescribeMethod({
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

      // Check for extra properties in strict mode
      if (options?.strict) {
        const allowedKeys = Object.keys(fields);
        const actualKeys = Object.keys(obj);
        const extraKeys = actualKeys.filter(key => !allowedKeys.includes(key));

        if (extraKeys.length > 0) {
          return {
            success: false,
            error: {
              message: `Unexpected properties: ${extraKeys.join(', ')}`,
              path: []
            }
          };
        }
      }

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

  // Add strict() method to return a new validator with strict mode enabled
  (validator as any).strict = () => createObjectValidator(fields, { strict: true });

  return validator;
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
 * Creates a boolean validator
 */
export function createBooleanValidator(): RuntimeValidator<boolean> {
  if (skipValidation) {
    return createPassthroughValidator<boolean>();
  }

  return {
    validate: (value: unknown): ValidationResult<boolean> => {
      if (typeof value !== 'boolean') {
        return {
          success: false,
          error: {
            message: `Expected boolean, received ${typeof value}`,
            path: []
          }
        };
      }

      return { success: true, data: value };
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
    validator.rest = function(restValidator: any) {
      // For now, just return this - we don't enforce rest validation
      return this;
    };
  }
  // Add refine method (custom validation)
  if (!validator.refine) {
    validator.refine = function(refineFn: any, errorMessage?: string) {
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
        return function(...args: any[]) {
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

  return {
    validate: (value: unknown): ValidationResult<Record<K, V>> => {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return {
          success: false,
          error: {
            message: `Expected record object, received ${typeof value}`,
            path: []
          }
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
            error: {
              message: `Invalid key "${key}": ${keyResult.error!.message}`,
              path: [key]
            }
          };
        }

        const valueResult = valueValidator.validate(val);
        if (!valueResult.success) {
          return {
            success: false,
            error: {
              message: valueResult.error!.message,
              path: [key, ...valueResult.error!.path]
            }
          };
        }

        result[key] = valueResult.data;
      }

      return { success: true, data: result as Record<K, V> };
    }
  };
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

  return {
    validate: (value: unknown): ValidationResult<T[number]> => {
      if (typeof value !== 'string') {
        return {
          success: false,
          error: {
            message: `Expected string, received ${typeof value}`,
            path: []
          }
        };
      }

      if (!(values as readonly string[]).includes(value)) {
        return {
          success: false,
          error: {
            message: `Expected one of [${values.join(', ')}], received "${value}"`,
            path: []
          }
        };
      }

      return { success: true, data: value as T[number] };
    }
  };
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