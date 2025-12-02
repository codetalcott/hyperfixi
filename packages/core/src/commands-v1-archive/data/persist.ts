/**
 * Persist Command Implementation
 * Saves and restores values from localStorage or sessionStorage
 *
 * Syntax:
 *   persist <value> to local as <key>
 *   persist <value> to session as <key>
 *   restore <key> from local
 *   restore <key> from session
 *
 * Examples:
 *   persist my.value to local as 'username'
 *   restore 'username' from local then set my.value to it
 *   persist formData to session as 'draft' with ttl 3600000
 *
 * Features:
 * - Supports localStorage and sessionStorage
 * - Optional TTL (time-to-live) for automatic expiration
 * - Cross-tab synchronization via storage events
 * - Type-safe JSON serialization
 */

import { v } from '../../validation/lightweight-validators';
import type { CommandImplementation } from '../../types/core';
import type { TypedExecutionContext } from '../../types/command-types';
import type { ValidationResult } from '../../types/unified-types';

/**
 * Zod schema for PERSIST command input validation
 * Note: storage and operation defaults are handled in execute() method
 */
export const PersistCommandInputSchema = v.object({
  key: v.string().min(1).describe('Storage key'),
  value: v.any().describe('Value to persist (for save operations)').optional(),
  storage: v.enum(['local', 'session']).describe('Storage type (local or session - defaults to local)').optional(),
  ttl: v.number().describe('Time-to-live in milliseconds').optional(),
  operation: v.enum(['save', 'restore', 'remove']).describe('Operation type (defaults to save)').optional(),
}).describe('PERSIST command input parameters');

// Input type definition
export interface PersistCommandInput {
  key: string;
  value?: unknown;
  storage?: 'local' | 'session';
  ttl?: number;
  operation?: 'save' | 'restore' | 'remove';
}

type PersistCommandInputType = any; // Inferred from RuntimeValidator

// Output type definition
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
 * Persist Command with full type safety and validation
 * Handles localStorage and sessionStorage with TTL support
 */
export class PersistCommand implements CommandImplementation<
  PersistCommandInputType,
  PersistCommandOutput,
  TypedExecutionContext
> {
  name = 'persist' as const;
  inputSchema = PersistCommandInputSchema;

  metadata = {
    name: 'persist',
    description: 'Save and restore values from browser storage',
    examples: [
      'persist my.value to local as "username"',
      'restore "username" from local',
      'persist formData to session as "draft"',
      'persist data to local as "cache" with ttl 3600000'
    ],
    syntax: 'persist <value> to <storage> as <key> [with ttl <ms>] | restore <key> from <storage>',
    category: 'data',
    version: '1.0.0'
  };

  validation = {
    validate: (input: unknown) => this.validate(input)
  };

  async execute(
    input: PersistCommandInputType,
    context: TypedExecutionContext
  ): Promise<PersistCommandOutput> {
    // Parse input - handle different formats
    let normalizedInput: PersistCommandInput;

    if (typeof input === 'object' && input !== null) {
      normalizedInput = input as PersistCommandInput;
    } else {
      throw new Error('Invalid persist command input');
    }

    const {
      key,
      value,
      storage = 'local',
      ttl,
      operation = 'save'
    } = normalizedInput;

    // Get the appropriate storage
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

  /**
   * Get storage object (localStorage or sessionStorage)
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
      ...(ttl !== undefined && { ttl })
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
        ttl
      });

      return {
        success: true,
        operation: 'save',
        key,
        value,
        storage: storageType,
        timestamp
      };
    } catch (error) {
      // Handle storage quota exceeded or other errors
      this.dispatchEvent(context, 'persist:error', {
        key,
        operation: 'save',
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new Error(`Failed to persist value: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Restore a value from storage, checking TTL
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
          storage: storageType
        };
      }

      // Deserialize
      const storedValue: StoredValue = JSON.parse(serialized);
      const { value, timestamp, ttl } = storedValue;

      // Check if expired
      const now = Date.now();
      const isExpired = ttl !== undefined && (now - timestamp) > ttl;

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
          expired: true
        };
      }

      // Dispatch success event
      this.dispatchEvent(context, 'persist:restore', {
        key,
        value,
        storage: storageType
      });

      // Set the restored value in context.it for chaining
      context.it = value;

      return {
        success: true,
        operation: 'restore',
        key,
        value,
        storage: storageType,
        timestamp
      };
    } catch (error) {
      this.dispatchEvent(context, 'persist:error', {
        key,
        operation: 'restore',
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new Error(`Failed to restore value: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Remove a value from storage
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
        storage: storageType
      });

      return {
        success: true,
        operation: 'remove',
        key,
        storage: storageType
      };
    } catch (error) {
      this.dispatchEvent(context, 'persist:error', {
        key,
        operation: 'remove',
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new Error(`Failed to remove value: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Dispatch custom events for persist operations
   */
  private dispatchEvent(
    context: TypedExecutionContext,
    eventName: string,
    detail: Record<string, any>
  ): void {
    if (context.me instanceof HTMLElement) {
      const event = new CustomEvent(eventName, {
        detail,
        bubbles: true,
        cancelable: false
      });
      context.me.dispatchEvent(event);
    }
  }

  validate(input: unknown): ValidationResult<PersistCommandInputType> {
    try {
      const validInput = this.inputSchema.parse(input);
      return {
        isValid: true,
        errors: [],
        suggestions: [],
        data: validInput
      };
    } catch (error: any) {
      // Construct helpful error message and suggestions
      const suggestions = [
        'persist my.value to local as "username"',
        'restore "username" from local',
        'persist data to session as "draft"',
        'persist data to local as "key" with ttl 3600000'
      ];

      const errorMessage = error?.issues?.[0]?.message ||
                          error?.message ||
                          'Invalid PERSIST command input';

      return {
        isValid: false,
        errors: [{
          type: 'validation-error',
          code: 'VALIDATION_ERROR',
          message: `PERSIST command validation failed: ${errorMessage}`,
          path: '',
          suggestions
        }],
        suggestions
      };
    }
  }
}

/**
 * Factory function to create a new PersistCommand instance
 */
export function createPersistCommand(): PersistCommand {
  return new PersistCommand();
}

// Export command instance for direct use
export const enhancedPersistCommand = createPersistCommand();
