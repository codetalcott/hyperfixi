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
  SirenPlanEventDetail,
  BlockedResponse,
} from './types';
import { classifyError } from './util';
import {
  ConditionState,
  parseConditionsHeader,
  entityKeyFromUrl,
  dispatchConditionsChanged,
} from './condition-state';

// ---------------------------------------------------------------------------
// Module-level state (singleton)
// ---------------------------------------------------------------------------

let currentEntity: SirenEntity | null = null;
let currentUrl: string | null = null;
const conditionState = new ConditionState();

export function getConditionState(): ConditionState {
  return conditionState;
}

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
  conditionState.clear();
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
    let body: BlockedResponse | undefined;
    try {
      body = (await response.json()) as BlockedResponse;
    } catch {
      // Body may not be valid JSON
    }

    const isGrailBlocked = body?.class?.includes('blocked') &&
      typeof body?.properties?.blockedAction === 'string';

    const detail: SirenBlockedEventDetail = {
      message: (body?.properties?.message as string) ?? response.statusText,
      blockedAction: isGrailBlocked ? body!.properties.blockedAction : null,
      blockedCondition: isGrailBlocked ? body!.properties.blockedCondition : null,
      unmetConditions: isGrailBlocked
        ? (body!.properties.unmetConditions ?? [body!.properties.blockedCondition])
        : [],
      offeredActions: body?.actions ?? [],
      raw: isGrailBlocked ? body! : null,
    };

    // Track conditions from 409 body if present
    if (body?.['x-conditions']) {
      const entity = entityKeyFromUrl(url);
      const { added, removed } = conditionState.update(entity, body['x-conditions']);
      if (added.length > 0 || removed.length > 0) {
        dispatchConditionsChanged(conditionState, {
          entity,
          conditions: body['x-conditions'],
          added,
          removed,
        });
      }
    }

    document.dispatchEvent(new CustomEvent('siren:blocked', { detail }));

    // Auto-plan when we have enough GRAIL information
    if (isGrailBlocked && body!.actions?.length) {
      const actionsWithEffects = body!.actions!.filter(
        a => a.effects?.length || a.preconditions?.length,
      );
      if (actionsWithEffects.length > 0) {
        try {
          const { planFromEntity } = await import('./planner');
          const syntheticEntity: SirenEntity & { 'x-conditions'?: string[] } = {
            actions: body!.actions,
            properties: body!.properties as unknown as Record<string, unknown>,
            ...(body!['x-conditions'] ? { 'x-conditions': body!['x-conditions'] } : {}),
          };
          const result = planFromEntity(syntheticEntity, body!.properties.blockedAction);
          if (result && result.steps.length > 0) {
            const planDetail: SirenPlanEventDetail = {
              blockedAction: body!.properties.blockedAction,
              steps: result.steps.map(s => ({ name: s.name, params: { ...s.params } })),
              totalCost: result.totalCost,
              alternativeCount: result.alternativeCount,
              fromEntityActions: true,
            };
            document.dispatchEvent(new CustomEvent('siren:plan', { detail: planDetail }));
          }
        } catch {
          // Planner not available or failed — not fatal
        }
      }
    }

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

  // Track conditions from x-conditions header
  const conditionsHeader = response.headers.get('x-conditions');
  if (conditionsHeader) {
    const entityKey = entityKeyFromUrl(response.url || url);
    const conditions = parseConditionsHeader(conditionsHeader);
    const { added, removed } = conditionState.update(entityKey, conditions);
    if (added.length > 0 || removed.length > 0) {
      dispatchConditionsChanged(conditionState, {
        entity: entityKey,
        conditions,
        added,
        removed,
      });
    }
  }

  return entity;
}
