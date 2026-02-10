/**
 * Siren hypermedia type definitions.
 * Standalone — no external dependencies.
 * See: https://github.com/kevinswiber/siren
 */

export interface SirenEntity {
  class?: string[];
  properties?: Record<string, unknown>;
  actions?: SirenAction[];
  links?: SirenLink[];
  entities?: SirenSubEntity[];
}

export interface SirenAction {
  name: string;
  title?: string;
  method?: string;
  href: string;
  type?: string;
  fields?: SirenField[];
  /** Cooperative affordance: preconditions that must be met */
  preconditions?: string[];
  /** Cooperative affordance: effects of this action */
  effects?: string[];
}

export interface SirenField {
  name: string;
  type?: string;
  value?: unknown;
  title?: string;
  description?: string;
  options?: unknown[];
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  minlength?: number;
  maxlength?: number;
  pattern?: string;
}

export interface SirenLink {
  rel: string[];
  href: string;
  title?: string;
}

export interface SirenSubEntity {
  class?: string[];
  rel?: string[];
  href?: string;
  properties?: Record<string, unknown>;
}

/** Detail payload for siren:entity CustomEvent */
export interface SirenEntityEventDetail {
  entity: SirenEntity;
  url: string;
  previousUrl: string | null;
}

/** Detail payload for siren:blocked CustomEvent */
export interface SirenBlockedEventDetail {
  message: string;
  blockedAction: string | null;
  offeredActions: SirenAction[];
}

/** Detail payload for siren:error CustomEvent */
export interface SirenErrorEventDetail {
  status: number;
  message: string;
  transient: boolean;
  url: string;
}
