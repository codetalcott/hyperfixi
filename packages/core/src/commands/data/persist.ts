/**
 * PersistCommand - Standalone V2 Implementation
 *
 * Saves and restores values from localStorage or sessionStorage
 *
 * This is a standalone implementation with NO V1 dependencies,
 * enabling true tree-shaking by inlining essential utilities.
 *
 * Features:
 * - Save values to localStorage or sessionStorage
 * - Restore values with automatic expiration checking
 * - Remove values from storage
 * - TTL (time-to-live) support for automatic expiration
 * - JSON serialization with metadata
 * - Custom events for operations
 * - Type-safe storage handling
 *
 * Syntax:
 *   persist <value> to local as <key>
 *   persist <value> to session as <key>
 *   persist <value> to local as <key> with ttl <milliseconds>
 *   restore <key> from local
 *   restore <key> from session
 *   remove <key> from local
 *
 * @example
 *   persist myValue to local as 'username'
 *   persist formData to session as 'draft'
 *   persist data to local as 'cache' with ttl 3600000
 *   restore 'username' from local
 *   remove 'cache' from local
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import { isHTMLElement } from '../../utils/element-check';

/**
 * Typed input for PersistCommand
 */
export interface PersistCommandInput {
  /** Storage key */
  key: string;
  /** Value to persist (for save operations) */
  value?: unknown;
  /** Storage type (local or session) */
  storage?: 'local' | 'session';
  /** Time-to-live in milliseconds */
  ttl?: number;
  /** Operation type */
  operation?: 'save' | 'restore' | 'remove';
}

/**
 * Output from Persist command execution
 */
export interface PersistCommandOutput {
  success: boolean;
  operation: 'save' | 'restore' | 'remove';
  key: string;
  value?: unknown;
  storage: 'local' | 'session';
  timestamp?: number;
  expired?: boolean;
}

/**
 * Stored value format with metadata
 */
interface StoredValue {
  value: unknown;
  timestamp: number;
  ttl?: number;
}

/**
 * PersistCommand - Standalone V2 Implementation
 *
 * Self-contained implementation with no V1 dependencies.
 * Achieves tree-shaking by inlining all required utilities.
 *
 * V1 Size: 390 lines (with validation dependencies)
 * V2 Target: ~370 lines (inline validation, standalone)
 */
export class PersistCommand {
  /**
   * Command name as registered in runtime
   */
  readonly name = 'persist';

  /**
   * Command metadata for documentation and tooling
   */
  static readonly metadata = {
    description: 'Save and restore values from browser storage with TTL support',
    syntax: [
      'persist <value> to <storage> as <key>',
      'persist <value> to <storage> as <key> with ttl <ms>',
      'restore <key> from <storage>',
      'remove <key> from <storage>',
    ],
    examples: [
      'persist myValue to local as "username"',
      'persist formData to session as "draft"',
      'persist data to local as "cache" with ttl 3600000',
      'restore "username" from local',
      'remove "cache" from local',
    ],
    category: 'data',
    sideEffects: ['storage', 'data-mutation'],
  };

  /**
   * Parse raw AST nodes into typed command input
   *
   * @param raw - Raw command node with args and modifiers from AST
   * @param evaluator - Expression evaluator for evaluating AST nodes
   * @param context - Execution context with me, you, it, etc.
   * @returns Typed input object for execute()
   */
  async parseInput(
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<PersistCommandInput> {
    // Detect operation from command name/modifiers
    let operation: 'save' | 'restore' | 'remove' = 'save';
    let key: string;
    let value: unknown;
    let storage: 'local' | 'session' | undefined;
    let ttl: number | undefined;

    // Check for 'restore' or 'remove' operations (might be separate command names)
    if (raw.modifiers?.from) {
      operation = 'restore';
      // First arg is key for restore
      key = String(await evaluator.evaluate(raw.args[0], context));
      storage = String(await evaluator.evaluate(raw.modifiers.from, context)) as 'local' | 'session';
    } else {
      // Save operation
      operation = 'save';
      // First arg is value
      value = await evaluator.evaluate(raw.args[0], context);

      // Extract storage from 'to' modifier
      if (raw.modifiers?.to) {
        storage = String(await evaluator.evaluate(raw.modifiers.to, context)) as 'local' | 'session';
      }

      // Extract key from 'as' modifier
      if (raw.modifiers?.as) {
        key = String(await evaluator.evaluate(raw.modifiers.as, context));
      } else {
        throw new Error('persist command requires "as <key>" modifier');
      }

      // Extract optional TTL from 'ttl' modifier
      if (raw.modifiers?.ttl) {
        ttl = Number(await evaluator.evaluate(raw.modifiers.ttl, context));
      }
    }

    return {
      key,
      value,
      storage: storage || 'local',
      ttl,
      operation,
    };
  }

  /**
   * Execute the persist command
   *
   * Performs save, restore, or remove operation on browser storage.
   *
   * @param input - Typed command input from parseInput()
   * @param context - Typed execution context
   * @returns Operation result with success status
   */
  async execute(
    input: PersistCommandInput,
    context: TypedExecutionContext
  ): Promise<PersistCommandOutput> {
    const { key, value, storage = 'local', ttl, operation = 'save' } = input;

    // Validate key
    if (!key || typeof key !== 'string' || key.trim() === '') {
      throw new Error('persist command requires a valid storage key');
    }

    // Get storage object
    const storageObj = this.getStorage(storage);
    if (!storageObj) {
      throw new Error(`Storage not available: ${storage}Storage`);
    }

    // Perform the requested operation
    switch (operation) {
      case 'save':
        return await this.saveValue(key, value, storageObj, storage, ttl, context);

      case 'restore':
        return await this.restoreValue(key, storageObj, storage, context);

      case 'remove':
        return await this.removeValue(key, storageObj, storage, context);

      default:
        throw new Error(`Unknown persist operation: ${operation}`);
    }
  }

  // ========== Private Utility Methods ==========

  /**
   * Get storage object (localStorage or sessionStorage)
   *
   * @param type - Storage type ('local' or 'session')
   * @returns Storage object or null if not available
   */
  private getStorage(type: 'local' | 'session'): Storage | null {
    if (typeof window === 'undefined') {
      return null; // Not in browser environment
    }

    try {
      return type === 'local' ? window.localStorage : window.sessionStorage;
    } catch (error) {
      console.warn(`Storage not available: ${type}Storage`, error);
      return null;
    }
  }

  /**
   * Save a value to storage with optional TTL
   *
   * @param key - Storage key
   * @param value - Value to save
   * @param storage - Storage object
   * @param storageType - Storage type name
   * @param ttl - Optional time-to-live in milliseconds
   * @param context - Execution context
   * @returns Save operation result
   */
  private async saveValue(
    key: string,
    value: unknown,
    storage: Storage,
    storageType: 'local' | 'session',
    ttl: number | undefined,
    context: TypedExecutionContext
  ): Promise<PersistCommandOutput> {
    const timestamp = Date.now();

    // Create stored value with metadata
    const storedValue: StoredValue = {
      value,
      timestamp,
      ...(ttl !== undefined && { ttl }),
    };

    try {
      // Serialize and store
      const serialized = JSON.stringify(storedValue);
      storage.setItem(key, serialized);

      // Dispatch success event
      this.dispatchEvent(context, 'persist:save', {
        key,
        value,
        storage: storageType,
        timestamp,
        ttl,
      });

      return {
        success: true,
        operation: 'save',
        key,
        value,
        storage: storageType,
        timestamp,
      };
    } catch (error) {
      // Handle storage quota exceeded or other errors
      this.dispatchEvent(context, 'persist:error', {
        key,
        operation: 'save',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new Error(
        `Failed to persist value: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Restore a value from storage, checking TTL
   *
   * @param key - Storage key
   * @param storage - Storage object
   * @param storageType - Storage type name
   * @param context - Execution context
   * @returns Restore operation result
   */
  private async restoreValue(
    key: string,
    storage: Storage,
    storageType: 'local' | 'session',
    context: TypedExecutionContext
  ): Promise<PersistCommandOutput> {
    try {
      const serialized = storage.getItem(key);

      if (serialized === null) {
        // Key not found
        this.dispatchEvent(context, 'persist:notfound', { key });

        return {
          success: false,
          operation: 'restore',
          key,
          value: null,
          storage: storageType,
        };
      }

      // Deserialize
      const storedValue: StoredValue = JSON.parse(serialized);
      const { value, timestamp, ttl } = storedValue;

      // Check if expired
      const now = Date.now();
      const isExpired = ttl !== undefined && now - timestamp > ttl;

      if (isExpired) {
        // Remove expired value
        storage.removeItem(key);

        this.dispatchEvent(context, 'persist:expired', { key, timestamp, ttl });

        return {
          success: false,
          operation: 'restore',
          key,
          value: null,
          storage: storageType,
          expired: true,
        };
      }

      // Dispatch success event
      this.dispatchEvent(context, 'persist:restore', {
        key,
        value,
        storage: storageType,
      });

      // Set the restored value in context.it for chaining
      Object.assign(context, { it: value });

      return {
        success: true,
        operation: 'restore',
        key,
        value,
        storage: storageType,
        timestamp,
      };
    } catch (error) {
      this.dispatchEvent(context, 'persist:error', {
        key,
        operation: 'restore',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new Error(
        `Failed to restore value: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Remove a value from storage
   *
   * @param key - Storage key
   * @param storage - Storage object
   * @param storageType - Storage type name
   * @param context - Execution context
   * @returns Remove operation result
   */
  private async removeValue(
    key: string,
    storage: Storage,
    storageType: 'local' | 'session',
    context: TypedExecutionContext
  ): Promise<PersistCommandOutput> {
    try {
      storage.removeItem(key);

      this.dispatchEvent(context, 'persist:remove', {
        key,
        storage: storageType,
      });

      return {
        success: true,
        operation: 'remove',
        key,
        storage: storageType,
      };
    } catch (error) {
      this.dispatchEvent(context, 'persist:error', {
        key,
        operation: 'remove',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new Error(
        `Failed to remove value: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Dispatch custom events for persist operations
   *
   * @param context - Execution context
   * @param eventName - Event name
   * @param detail - Event detail object
   */
  private dispatchEvent(
    context: TypedExecutionContext,
    eventName: string,
    detail: Record<string, any>
  ): void {
    if (isHTMLElement(context.me)) {
      const event = new CustomEvent(eventName, {
        detail,
        bubbles: true,
        cancelable: false,
      });
      (context.me as HTMLElement).dispatchEvent(event);
    }
  }
}

/**
 * Factory function to create PersistCommand instance
 */
export function createPersistCommand(): PersistCommand {
  return new PersistCommand();
}
