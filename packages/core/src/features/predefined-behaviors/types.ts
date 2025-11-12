/**
 * Types for predefined behaviors
 */

/**
 * Behavior definition interface
 */
export interface BehaviorDefinition {
  /** Behavior name */
  name: string;
  /** Parameter names */
  parameters?: string[];
  /** Initialize behavior on element */
  init(element: HTMLElement, options?: Record<string, any>): void;
  /** Cleanup behavior */
  destroy(element: HTMLElement): void;
}

/**
 * Behavior registry
 */
export interface BehaviorRegistry {
  register(definition: BehaviorDefinition): void;
  unregister(name: string): void;
  get(name: string): BehaviorDefinition | undefined;
  has(name: string): boolean;
  list(): string[];
}
