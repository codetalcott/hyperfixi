/**
 * Siren HTTP client — thin fetch wrapper with Siren content negotiation.
 *
 * Module-level singleton: one current entity at a time.
 * Dispatches CustomEvents on `document` for entity/error/blocked state changes.
 */

import type {
  SirenEntity,
  SirenEntityEventDetail,
  SirenBlockedEventDetail,
  SirenErrorEventDetail,
} from './types';
import { classifyError } from './util';

// ---------------------------------------------------------------------------
// Module-level state (singleton)
// ---------------------------------------------------------------------------

let currentEntity: SirenEntity | null = null;
let currentUrl: string | null = null;

export function getCurrentEntity(): SirenEntity | null {
  return currentEntity;
}

export function getCurrentUrl(): string | null {
  return currentUrl;
}

/**
 * Set the current entity and fire `siren:entity`.
 * Exported for use by the fetch response type handler in plugin.ts.
 */
export function setCurrentEntity(entity: SirenEntity, url: string): void {
  const previousUrl = currentUrl;
  currentEntity = entity;
  currentUrl = url;

  const detail: SirenEntityEventDetail = { entity, url, previousUrl };
  document.dispatchEvent(new CustomEvent('siren:entity', { detail }));
}

/**
 * Reset client state. Useful for testing and teardown.
 */
export function resetClient(): void {
  currentEntity = null;
  currentUrl = null;
}

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

/**
 * Fetch a Siren entity from the given URL.
 *
 * Handles:
 * - 200: parse JSON → SirenEntity, store, dispatch siren:entity
 * - 201 + Location: follow redirect
 * - 204: return null (no content)
 * - 409: dispatch siren:blocked with cooperative affordance body
 * - 4xx/5xx: dispatch siren:error
 */
export async function fetchSiren(url: string, opts?: RequestInit): Promise<SirenEntity | null> {
  const headers = new Headers(opts?.headers as HeadersInit | undefined);
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/vnd.siren+json');
  }

  const requestOpts: RequestInit = { ...opts, headers };

  let response: Response;
  try {
    response = await fetch(url, requestOpts);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const detail: SirenErrorEventDetail = {
      status: 0,
      message,
      transient: true,
      url,
    };
    document.dispatchEvent(new CustomEvent('siren:error', { detail }));
    throw new Error(`Siren fetch failed for ${url}: ${message}`);
  }

  // 204 No Content
  if (response.status === 204) {
    return null;
  }

  // 201 Created + Location header → follow redirect
  if (response.status === 201) {
    const location = response.headers.get('Location');
    if (location) {
      const redirectUrl = new URL(location, url).href;
      return fetchSiren(redirectUrl);
    }
  }

  // 409 Conflict — cooperative affordance
  if (response.status === 409) {
    let body: SirenEntity | undefined;
    try {
      body = (await response.json()) as SirenEntity;
    } catch {
      // Body may not be valid JSON
    }

    const detail: SirenBlockedEventDetail = {
      message: (body?.properties?.message as string) ?? response.statusText,
      blockedAction: null,
      offeredActions: body?.actions ?? [],
    };
    document.dispatchEvent(new CustomEvent('siren:blocked', { detail }));
    return null;
  }

  // Non-2xx error
  if (!response.ok) {
    const { transient } = classifyError(response.status);
    const detail: SirenErrorEventDetail = {
      status: response.status,
      message: response.statusText,
      transient,
      url,
    };
    document.dispatchEvent(new CustomEvent('siren:error', { detail }));
    throw new Error(`Siren fetch error ${response.status}: ${response.statusText}`);
  }

  // 2xx success — parse entity
  const entity = (await response.json()) as SirenEntity;
  setCurrentEntity(entity, response.url || url);
  return entity;
}
