/**
 * Expression Type Registry - Centralized Definition System
 *
 * Inspired by napi-rs patterns: systematic type mapping, zero-boilerplate,
 * single source of truth for all expression types.
 *
 * Benefits:
 * - Single source of truth for 24+ expression types
 * - Auto-generated TypeScript types
 * - Consistent coercion functions between types
 * - Easier to add new expression types
 * - Better error messages with type context
 */

import type { ExecutionContext, EvaluationType, HyperScriptValueType } from '../types/base-types';

// ============================================================================
// Core Type Definitions
// ============================================================================

/**
 * JavaScript runtime types that expression values can be
 */
export type JSRuntimeType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'null'
  | 'undefined'
  | 'object'
  | 'array'
  | 'function'
  | 'element'
  | 'element-list'
  | 'node-list'
  | 'event'
  | 'date'
  | 'regexp'
  | 'promise'
  | 'symbol'
  | 'unknown';

/**
 * Type coercion function signature
 */
export type CoercionFn<TFrom = unknown, TTo = unknown> = (
  value: TFrom,
  context?: ExecutionContext
) => TTo | null;

/**
 * Type guard function signature
 */
export type TypeGuardFn<T = unknown> = (value: unknown) => value is T;

/**
 * Expression type definition - describes a single expression type
 */
export interface ExpressionTypeDefinition<T = unknown> {
  /** Unique name for this type (e.g., 'Element', 'String', 'CSSSelector') */
  readonly name: string;

  /** HyperScript type name (lowercase, e.g., 'element', 'string') */
  readonly hyperscriptType: HyperScriptValueType;

  /** TypeScript type string for documentation */
  readonly tsType: string;

  /** Runtime type check function */
  readonly isType: TypeGuardFn<T>;

  /** Default value when coercion fails */
  readonly defaultValue: T | null;

  /** Coercion functions to convert TO this type from other types */
  readonly coerceFrom?: Partial<Record<string, CoercionFn<unknown, T>>>;

  /** Optional description for documentation */
  readonly description?: string;

  /** Example values for documentation */
  readonly examples?: T[];
}

/**
 * Expression type registry configuration
 */
export interface ExpressionTypeRegistryConfig {
  /** Enable strict mode (throw on unknown types) */
  strictMode?: boolean;
  /** Enable coercion caching */
  cacheCoercions?: boolean;
}

// ============================================================================
// Type Registry Implementation
// ============================================================================

/**
 * Expression Type Registry - Central hub for all expression type definitions
 */
export class ExpressionTypeRegistry {
  private types: Map<string, ExpressionTypeDefinition> = new Map();
  private coercionCache: Map<string, unknown> = new Map();
  private config: ExpressionTypeRegistryConfig;

  constructor(config: ExpressionTypeRegistryConfig = {}) {
    this.config = {
      strictMode: false,
      cacheCoercions: true,
      ...config,
    };

    // Register built-in types
    this.registerBuiltinTypes();
  }

  /**
   * Register a new expression type
   */
  register<T>(definition: ExpressionTypeDefinition<T>): void {
    if (this.types.has(definition.name)) {
      console.warn(`ExpressionTypeRegistry: Overwriting existing type '${definition.name}'`);
    }
    this.types.set(definition.name, definition as ExpressionTypeDefinition);
  }

  /**
   * Get a type definition by name
   */
  get(name: string): ExpressionTypeDefinition | undefined {
    return this.types.get(name);
  }

  /**
   * Check if a type is registered
   */
  has(name: string): boolean {
    return this.types.has(name);
  }

  /**
   * Get all registered type names
   */
  getTypeNames(): string[] {
    return Array.from(this.types.keys());
  }

  /**
   * Infer the type of a value
   */
  inferType(value: unknown): string {
    for (const [name, def] of this.types) {
      if (def.isType(value)) {
        return name;
      }
    }
    return 'Unknown';
  }

  /**
   * Get the HyperScript type for a value
   */
  getHyperScriptType(value: unknown): HyperScriptValueType {
    const typeName = this.inferType(value);
    const typeDef = this.types.get(typeName);
    return typeDef?.hyperscriptType ?? 'unknown';
  }

  /**
   * Coerce a value to a target type
   */
  coerce<T>(value: unknown, targetType: string, context?: ExecutionContext): T | null {
    const targetDef = this.types.get(targetType);
    if (!targetDef) {
      if (this.config.strictMode) {
        throw new Error(`Unknown target type: ${targetType}`);
      }
      return null;
    }

    // Already the correct type?
    if (targetDef.isType(value)) {
      return value as T;
    }

    // Check cache
    if (this.config.cacheCoercions) {
      const cacheKey = `${this.inferType(value)}:${targetType}:${JSON.stringify(value)}`;
      if (this.coercionCache.has(cacheKey)) {
        return this.coercionCache.get(cacheKey) as T;
      }
    }

    // Find coercion function
    const sourceType = this.inferType(value);
    const coerceFn = targetDef.coerceFrom?.[sourceType];

    if (coerceFn) {
      const result = coerceFn(value, context) as T | null;

      // Cache result
      if (this.config.cacheCoercions && result !== null) {
        const cacheKey = `${sourceType}:${targetType}:${JSON.stringify(value)}`;
        this.coercionCache.set(cacheKey, result);
      }

      return result;
    }

    // Return default or null
    return targetDef.defaultValue as T | null;
  }

  /**
   * Check if a value can be coerced to a type
   */
  canCoerce(value: unknown, targetType: string): boolean {
    const targetDef = this.types.get(targetType);
    if (!targetDef) return false;

    if (targetDef.isType(value)) return true;

    const sourceType = this.inferType(value);
    return targetDef.coerceFrom?.[sourceType] !== undefined;
  }

  /**
   * Get coercion path between two types (for debugging)
   */
  getCoercionInfo(
    sourceType: string,
    targetType: string
  ): { possible: boolean; direct: boolean; via?: string } {
    const targetDef = this.types.get(targetType);
    if (!targetDef) return { possible: false, direct: false };

    if (sourceType === targetType) {
      return { possible: true, direct: true };
    }

    if (targetDef.coerceFrom?.[sourceType]) {
      return { possible: true, direct: true };
    }

    return { possible: false, direct: false };
  }

  /**
   * Clear the coercion cache
   */
  clearCache(): void {
    this.coercionCache.clear();
  }

  /**
   * Get type statistics
   */
  getStats(): { typeCount: number; cacheSize: number; typeNames: string[] } {
    return {
      typeCount: this.types.size,
      cacheSize: this.coercionCache.size,
      typeNames: this.getTypeNames(),
    };
  }

  // ============================================================================
  // Built-in Type Registration
  // ============================================================================

  private registerBuiltinTypes(): void {
    // String type
    this.register<string>({
      name: 'String',
      hyperscriptType: 'string',
      tsType: 'string',
      isType: (v): v is string => typeof v === 'string',
      defaultValue: '',
      description: 'Text string value',
      examples: ['hello', 'world', ''],
      coerceFrom: {
        Number: (v) => String(v),
        Boolean: (v) => String(v),
        Null: () => '',
        Undefined: () => '',
        Array: (v) => (Array.isArray(v) ? v.join(', ') : null),
        Object: (v) => {
          try {
            return JSON.stringify(v);
          } catch {
            return String(v);
          }
        },
        Element: (v) =>
          v instanceof Element ? v.textContent ?? v.outerHTML : null,
      },
    });

    // Number type
    this.register<number>({
      name: 'Number',
      hyperscriptType: 'number',
      tsType: 'number',
      isType: (v): v is number => typeof v === 'number' && !isNaN(v),
      defaultValue: 0,
      description: 'Numeric value (integer or float)',
      examples: [0, 1, 3.14, -42],
      coerceFrom: {
        String: (v) => {
          const n = parseFloat(v as string);
          return isNaN(n) ? null : n;
        },
        Boolean: (v) => (v ? 1 : 0),
        Null: () => 0,
        Undefined: () => null,
      },
    });

    // Boolean type
    this.register<boolean>({
      name: 'Boolean',
      hyperscriptType: 'boolean',
      tsType: 'boolean',
      isType: (v): v is boolean => typeof v === 'boolean',
      defaultValue: false,
      description: 'True or false value',
      examples: [true, false],
      coerceFrom: {
        String: (v) => {
          const s = (v as string).toLowerCase().trim();
          if (s === 'true' || s === 'yes' || s === '1') return true;
          if (s === 'false' || s === 'no' || s === '0' || s === '') return false;
          return s.length > 0; // Non-empty string is truthy
        },
        Number: (v) => (v as number) !== 0,
        Null: () => false,
        Undefined: () => false,
        Array: (v) => (Array.isArray(v) ? v.length > 0 : false),
        Element: (v) => v instanceof Element,
        ElementList: (v) => Array.isArray(v) && v.length > 0,
      },
    });

    // Element type
    this.register<Element>({
      name: 'Element',
      hyperscriptType: 'element',
      tsType: 'Element | HTMLElement',
      isType: (v): v is Element => v instanceof Element,
      defaultValue: null,
      description: 'DOM Element',
      coerceFrom: {
        String: (v, ctx) => {
          // Try as CSS selector
          const selector = v as string;
          if (selector.startsWith('#') || selector.startsWith('.') || selector.match(/^[\w-]+$/)) {
            try {
              return document.querySelector(selector);
            } catch {
              return null;
            }
          }
          return null;
        },
        ElementList: (v) => (Array.isArray(v) && v.length > 0 ? v[0] : null),
        NodeList: (v) => {
          const list = v as NodeList;
          return list.length > 0 ? (list[0] as Element) : null;
        },
      },
    });

    // ElementList type (non-empty array of Elements)
    this.register<Element[]>({
      name: 'ElementList',
      hyperscriptType: 'element-list',
      tsType: 'Element[]',
      isType: (v): v is Element[] =>
        Array.isArray(v) && v.length > 0 && v.every((item) => item instanceof Element),
      defaultValue: [],
      description: 'Array of DOM Elements',
      coerceFrom: {
        Element: (v) => (v instanceof Element ? [v] : []),
        NodeList: (v) => Array.from(v as NodeList) as Element[],
        String: (v) => {
          try {
            return Array.from(document.querySelectorAll(v as string));
          } catch {
            return [];
          }
        },
        Array: (v) => {
          const arr = v as unknown[];
          if (arr.every((item) => item instanceof Element)) {
            return arr as Element[];
          }
          return [];
        },
      },
    });

    // Array type
    this.register<unknown[]>({
      name: 'Array',
      hyperscriptType: 'array',
      tsType: 'unknown[]',
      isType: (v): v is unknown[] => Array.isArray(v),
      defaultValue: [],
      description: 'Array of values',
      coerceFrom: {
        String: (v) => {
          const s = v as string;
          // Try JSON parse first
          try {
            const parsed = JSON.parse(s);
            if (Array.isArray(parsed)) return parsed;
          } catch {
            // Not JSON, split by comma
          }
          return s.split(',').map((item) => item.trim());
        },
        ElementList: (v) => v as Element[],
        NodeList: (v) => Array.from(v as NodeList),
        Object: (v) => Object.values(v as object),
      },
    });

    // Object type
    this.register<Record<string, unknown>>({
      name: 'Object',
      hyperscriptType: 'object',
      tsType: 'Record<string, unknown>',
      isType: (v): v is Record<string, unknown> =>
        typeof v === 'object' && v !== null && !Array.isArray(v) && !(v instanceof Element),
      defaultValue: {},
      description: 'Plain JavaScript object',
      coerceFrom: {
        String: (v) => {
          try {
            const parsed = JSON.parse(v as string);
            if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
              return parsed;
            }
          } catch {
            // Not valid JSON
          }
          return null;
        },
        Array: (v) => {
          const arr = v as unknown[];
          const obj: Record<string, unknown> = {};
          arr.forEach((item, index) => {
            obj[String(index)] = item;
          });
          return obj;
        },
      },
    });

    // Null type
    this.register<null>({
      name: 'Null',
      hyperscriptType: 'null',
      tsType: 'null',
      isType: (v): v is null => v === null,
      defaultValue: null,
      description: 'Null value',
    });

    // Undefined type
    this.register<undefined>({
      name: 'Undefined',
      hyperscriptType: 'undefined',
      tsType: 'undefined',
      isType: (v): v is undefined => v === undefined,
      defaultValue: undefined,
      description: 'Undefined value',
    });

    // Function type
    this.register<Function>({
      name: 'Function',
      hyperscriptType: 'function',
      tsType: 'Function',
      isType: (v): v is Function => typeof v === 'function',
      defaultValue: null,
      description: 'JavaScript function',
    });

    // Event type
    this.register<Event>({
      name: 'Event',
      hyperscriptType: 'event',
      tsType: 'Event',
      isType: (v): v is Event => v instanceof Event,
      defaultValue: null,
      description: 'DOM Event',
    });

    // NodeList type (intermediate, converts to ElementList)
    this.register<NodeList>({
      name: 'NodeList',
      hyperscriptType: 'element-list',
      tsType: 'NodeList',
      isType: (v): v is NodeList => v instanceof NodeList,
      defaultValue: null,
      description: 'DOM NodeList (typically from querySelectorAll)',
      coerceFrom: {
        Array: (v) => {
          // Can't coerce array to NodeList directly
          return null;
        },
      },
    });

    // Unknown type (fallback)
    this.register<unknown>({
      name: 'Unknown',
      hyperscriptType: 'unknown',
      tsType: 'unknown',
      isType: (): v is unknown => true,
      defaultValue: null,
      description: 'Unknown/any value type',
    });
  }
}

// ============================================================================
// Default Registry Instance
// ============================================================================

/**
 * Default global expression type registry
 */
export const expressionTypeRegistry = new ExpressionTypeRegistry();

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Infer the type of a value using the default registry
 */
export function inferExpressionType(value: unknown): string {
  return expressionTypeRegistry.inferType(value);
}

/**
 * Coerce a value to a target type using the default registry
 */
export function coerceToType<T>(
  value: unknown,
  targetType: string,
  context?: ExecutionContext
): T | null {
  return expressionTypeRegistry.coerce<T>(value, targetType, context);
}

/**
 * Check if a value can be coerced to a type
 */
export function canCoerceToType(value: unknown, targetType: string): boolean {
  return expressionTypeRegistry.canCoerce(value, targetType);
}

/**
 * Get the HyperScript type name for a value
 */
export function getHyperScriptTypeName(value: unknown): HyperScriptValueType {
  return expressionTypeRegistry.getHyperScriptType(value);
}

// ============================================================================
// Type-Safe Coercion Helpers
// ============================================================================

/**
 * Coerce value to string
 */
export function coerceToString(value: unknown, context?: ExecutionContext): string {
  return expressionTypeRegistry.coerce<string>(value, 'String', context) ?? '';
}

/**
 * Coerce value to number
 */
export function coerceToNumber(value: unknown, context?: ExecutionContext): number | null {
  return expressionTypeRegistry.coerce<number>(value, 'Number', context);
}

/**
 * Coerce value to boolean
 */
export function coerceToBoolean(value: unknown, context?: ExecutionContext): boolean {
  return expressionTypeRegistry.coerce<boolean>(value, 'Boolean', context) ?? false;
}

/**
 * Coerce value to Element
 */
export function coerceToElement(value: unknown, context?: ExecutionContext): Element | null {
  return expressionTypeRegistry.coerce<Element>(value, 'Element', context);
}

/**
 * Coerce value to Element array
 */
export function coerceToElementList(value: unknown, context?: ExecutionContext): Element[] {
  return expressionTypeRegistry.coerce<Element[]>(value, 'ElementList', context) ?? [];
}

/**
 * Coerce value to array
 */
export function coerceToArray(value: unknown, context?: ExecutionContext): unknown[] {
  return expressionTypeRegistry.coerce<unknown[]>(value, 'Array', context) ?? [];
}

/**
 * Coerce value to object
 */
export function coerceToObject(
  value: unknown,
  context?: ExecutionContext
): Record<string, unknown> | null {
  return expressionTypeRegistry.coerce<Record<string, unknown>>(value, 'Object', context);
}
