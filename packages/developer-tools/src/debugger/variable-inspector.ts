/**
 * Variable Inspector - Inspects and displays debug variables
 */

import type { DebugVariable } from '../types';

/**
 * Extended variable with additional inspection details
 */
export interface InspectedVariable extends DebugVariable {
  /** Child variables (for objects/arrays) */
  children?: InspectedVariable[];
  /** Whether children have been loaded */
  childrenLoaded?: boolean;
  /** Number of children (if applicable) */
  childCount?: number;
  /** Variable reference ID for lazy loading */
  variablesReference?: number;
}

/**
 * Variable scope
 */
export type VariableScope = 'local' | 'global' | 'closure' | 'this' | 'arguments';

/**
 * Variable Inspector class
 */
export class VariableInspector {
  private nextReferenceId: number = 1;
  private references: Map<number, any> = new Map();
  private maxDepth: number;
  private maxChildren: number;

  constructor(options: { maxDepth?: number; maxChildren?: number } = {}) {
    this.maxDepth = options.maxDepth ?? 5;
    this.maxChildren = options.maxChildren ?? 100;
  }

  /**
   * Inspect a value and create variable representation
   */
  inspect(
    name: string,
    value: any,
    scope: VariableScope = 'local',
    depth: number = 0
  ): InspectedVariable {
    const type = this.getType(value);

    const variable: InspectedVariable = {
      name,
      value: this.formatValue(value, type),
      type,
      scope,
    };

    // Handle complex types
    if (depth < this.maxDepth && this.isExpandable(type)) {
      const referenceId = this.nextReferenceId++;
      this.references.set(referenceId, value);
      variable.variablesReference = referenceId;
      variable.childCount = this.getChildCount(value, type);
      variable.childrenLoaded = false;
    }

    return variable;
  }

  /**
   * Get children of a variable by reference
   */
  getChildren(referenceId: number): InspectedVariable[] {
    const value = this.references.get(referenceId);
    if (value === undefined) return [];

    const type = this.getType(value);
    return this.extractChildren(value, type);
  }

  /**
   * Extract children from a complex value
   */
  private extractChildren(value: any, type: string): InspectedVariable[] {
    const children: InspectedVariable[] = [];

    if (type === 'array') {
      const arr = value as any[];
      const length = Math.min(arr.length, this.maxChildren);

      for (let i = 0; i < length; i++) {
        children.push(this.inspect(`[${i}]`, arr[i], 'local', 1));
      }

      if (arr.length > this.maxChildren) {
        children.push({
          name: '...',
          value: `${arr.length - this.maxChildren} more items`,
          type: 'info',
          scope: 'local',
        });
      }
    } else if (type === 'object') {
      const obj = value as Record<string, any>;
      const keys = Object.keys(obj).slice(0, this.maxChildren);

      for (const key of keys) {
        children.push(this.inspect(key, obj[key], 'local', 1));
      }

      const totalKeys = Object.keys(obj).length;
      if (totalKeys > this.maxChildren) {
        children.push({
          name: '...',
          value: `${totalKeys - this.maxChildren} more properties`,
          type: 'info',
          scope: 'local',
        });
      }
    } else if (type === 'map') {
      const map = value as Map<any, any>;
      let count = 0;

      for (const [k, v] of map) {
        if (count >= this.maxChildren) {
          children.push({
            name: '...',
            value: `${map.size - count} more entries`,
            type: 'info',
            scope: 'local',
          });
          break;
        }
        children.push(this.inspect(`[${this.formatValue(k, this.getType(k))}]`, v, 'local', 1));
        count++;
      }
    } else if (type === 'set') {
      const set = value as Set<any>;
      let count = 0;

      for (const item of set) {
        if (count >= this.maxChildren) {
          children.push({
            name: '...',
            value: `${set.size - count} more items`,
            type: 'info',
            scope: 'local',
          });
          break;
        }
        children.push(this.inspect(`[${count}]`, item, 'local', 1));
        count++;
      }
    }

    return children;
  }

  /**
   * Get the type of a value
   */
  private getType(value: any): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';

    const type = typeof value;

    if (type === 'object') {
      if (Array.isArray(value)) return 'array';
      if (value instanceof Map) return 'map';
      if (value instanceof Set) return 'set';
      if (value instanceof Date) return 'date';
      if (value instanceof RegExp) return 'regexp';
      if (value instanceof Error) return 'error';
      if (value instanceof Promise) return 'promise';

      // Check for DOM elements
      if (typeof HTMLElement !== 'undefined' && value instanceof HTMLElement) {
        return 'element';
      }

      // Check constructor name
      const ctorName = value.constructor?.name;
      if (ctorName && ctorName !== 'Object') {
        return ctorName.toLowerCase();
      }

      return 'object';
    }

    return type;
  }

  /**
   * Format a value for display
   */
  private formatValue(value: any, type: string): any {
    switch (type) {
      case 'string':
        return `"${this.truncate(value, 100)}"`;

      case 'number':
      case 'boolean':
        return String(value);

      case 'null':
        return 'null';

      case 'undefined':
        return 'undefined';

      case 'function':
        const fnName = value.name || 'anonymous';
        return `ƒ ${fnName}()`;

      case 'array':
        return `Array(${value.length})`;

      case 'object':
        const keys = Object.keys(value);
        return `Object {${keys.slice(0, 3).join(', ')}${keys.length > 3 ? ', ...' : ''}}`;

      case 'map':
        return `Map(${value.size})`;

      case 'set':
        return `Set(${value.size})`;

      case 'date':
        return value.toISOString();

      case 'regexp':
        return value.toString();

      case 'error':
        return `${value.name}: ${value.message}`;

      case 'promise':
        return 'Promise';

      case 'element':
        const el = value as HTMLElement;
        const tag = el.tagName.toLowerCase();
        const id = el.id ? `#${el.id}` : '';
        const classes = el.className ? `.${el.className.split(' ').join('.')}` : '';
        return `<${tag}${id}${classes}>`;

      default:
        try {
          return String(value);
        } catch {
          return '[unserializable]';
        }
    }
  }

  /**
   * Check if type is expandable
   */
  private isExpandable(type: string): boolean {
    return ['object', 'array', 'map', 'set'].includes(type);
  }

  /**
   * Get child count for a value
   */
  private getChildCount(value: any, type: string): number {
    switch (type) {
      case 'array':
        return value.length;
      case 'object':
        return Object.keys(value).length;
      case 'map':
      case 'set':
        return value.size;
      default:
        return 0;
    }
  }

  /**
   * Truncate string for display
   */
  private truncate(str: string, maxLength: number): string {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength - 3) + '...';
  }

  /**
   * Inspect multiple values
   */
  inspectMany(
    values: Record<string, any>,
    scope: VariableScope = 'local'
  ): InspectedVariable[] {
    return Object.entries(values).map(([name, value]) =>
      this.inspect(name, value, scope)
    );
  }

  /**
   * Clear references (call when session ends)
   */
  clear(): void {
    this.references.clear();
    this.nextReferenceId = 1;
  }

  /**
   * Create scope variables from context
   */
  createScopeVariables(context: {
    locals?: Record<string, any>;
    globals?: Record<string, any>;
    me?: any;
    it?: any;
    you?: any;
  }): InspectedVariable[] {
    const variables: InspectedVariable[] = [];

    // Add special variables
    if (context.me !== undefined) {
      variables.push(this.inspect('me', context.me, 'this'));
    }
    if (context.it !== undefined) {
      variables.push(this.inspect('it', context.it, 'local'));
    }
    if (context.you !== undefined) {
      variables.push(this.inspect('you', context.you, 'local'));
    }

    // Add locals
    if (context.locals) {
      for (const [name, value] of Object.entries(context.locals)) {
        variables.push(this.inspect(name, value, 'local'));
      }
    }

    // Add globals
    if (context.globals) {
      for (const [name, value] of Object.entries(context.globals)) {
        variables.push(this.inspect(name, value, 'global'));
      }
    }

    return variables;
  }
}

export default VariableInspector;
