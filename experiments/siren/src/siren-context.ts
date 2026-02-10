/**
 * Siren context provider — exposes the current entity as `siren.*` in hyperscript.
 *
 * Usage in hyperscript:
 *   siren.properties        → current entity properties object
 *   siren.class              → current entity class array
 *   siren.actions            → array of action name strings
 *   siren.links              → array of link rel strings
 *   siren.action('name')     → full action object by name
 *   siren.link('rel')        → full link object by rel
 *   siren.entities           → sub-entity array
 */

import { getCurrentEntity } from './siren-client';
import type { SirenAction, SirenLink } from './types';

export interface SirenContextValue {
  readonly properties: Record<string, unknown>;
  readonly class: string[];
  readonly actions: string[];
  readonly links: string[];
  readonly entities: unknown[];
  action(name: string): SirenAction | undefined;
  link(rel: string): SirenLink | undefined;
}

function createSirenContextValue(): SirenContextValue {
  return {
    get properties() {
      return getCurrentEntity()?.properties ?? {};
    },
    get class() {
      return getCurrentEntity()?.class ?? [];
    },
    get actions() {
      return (getCurrentEntity()?.actions ?? []).map(a => a.name);
    },
    get links() {
      return (getCurrentEntity()?.links ?? []).flatMap(l => l.rel);
    },
    get entities() {
      return getCurrentEntity()?.entities ?? [];
    },
    action(name: string) {
      return getCurrentEntity()?.actions?.find(a => a.name === name);
    },
    link(rel: string) {
      return getCurrentEntity()?.links?.find(l => l.rel.includes(rel));
    },
  };
}

/**
 * Context provider definition for use in the LokaScript plugin.
 * Registered as the `siren` context variable.
 */
export const sirenContextProvider = {
  name: 'siren',
  provide: () => createSirenContextValue(),
  options: {
    description: 'Current Siren entity state',
    cache: false, // Must re-evaluate each access — entity can change between reads
  },
};
