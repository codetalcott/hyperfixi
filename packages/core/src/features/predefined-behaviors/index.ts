/**
 * Predefined Behaviors Export Module
 *
 * This module exports all predefined behaviors for HyperFixi
 */

export {
  modalBehaviorDefinition,
  createModalBehavior,
  type ModalBehaviorOptions
} from './modal-behavior';

export {
  dropdownBehaviorDefinition,
  createDropdownBehavior,
  type DropdownBehaviorOptions
} from './dropdown-behavior';

export {
  toggleGroupBehaviorDefinition,
  createToggleGroupBehavior,
  type ToggleGroupBehaviorOptions
} from './toggle-group-behavior';

export type { BehaviorDefinition, BehaviorRegistry } from './types';

/**
 * Registry of all predefined behaviors
 */
export const predefinedBehaviors = {
  'modal-behavior': () => import('./modal-behavior').then(m => m.default),
  'dropdown-behavior': () => import('./dropdown-behavior').then(m => m.default),
  'toggle-group-behavior': () => import('./toggle-group-behavior').then(m => m.default),
} as const;

/**
 * Get a behavior definition by name
 */
export async function getBehavior(name: string) {
  const loader = predefinedBehaviors[name as keyof typeof predefinedBehaviors];
  if (!loader) {
    throw new Error(`Behavior '${name}' not found`);
  }
  return loader();
}

/**
 * List all available behavior names
 */
export function listBehaviors(): string[] {
  return Object.keys(predefinedBehaviors);
}
