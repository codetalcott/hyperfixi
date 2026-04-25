/**
 * Plan UI behavior — renders siren:plan events as a step list.
 *
 * Listens to siren:plan and siren:entity events on document.
 * Renders an ordered list of plan steps with ARIA attributes.
 * Clears on successful entity load (plan is stale).
 *
 * Minimal — sets DOM structure, consumers style via CSS.
 */

import type { SirenPlanEventDetail } from '../types';

export interface SirenPlanUIConfig {
  /** Container element to render the plan into. */
  element: HTMLElement;
  /** Show total cost in the plan header. Default: true. */
  showCost?: boolean;
}

export interface SirenPlanUIInstance {
  /** Remove event listeners and clear the container. */
  destroy(): void;
  /** Clear the rendered plan without removing listeners. */
  clear(): void;
}

/**
 * Create a plan UI that renders siren:plan events into the given element.
 */
export function createSirenPlanUI(config: SirenPlanUIConfig): SirenPlanUIInstance {
  const { element, showCost = true } = config;

  function render(detail: SirenPlanEventDetail): void {
    element.innerHTML = '';

    if (detail.steps.length === 0) return;

    // Header
    const header = document.createElement('p');
    let headerText = `To execute ${detail.blockedAction}`;
    if (showCost && detail.totalCost > 0) {
      headerText += ` (cost: ${detail.totalCost})`;
    }
    headerText += ':';
    header.textContent = headerText;
    element.appendChild(header);

    // Step list
    const ol = document.createElement('ol');
    ol.setAttribute('aria-label', `Plan to unblock ${detail.blockedAction}`);

    for (const step of detail.steps) {
      const li = document.createElement('li');
      const params = Object.entries(step.params);
      if (params.length > 0) {
        const paramStr = params.map(([k, v]) => `${k}=${v}`).join(', ');
        li.textContent = `${step.name} (${paramStr})`;
      } else {
        li.textContent = step.name;
      }
      ol.appendChild(li);
    }

    element.appendChild(ol);
    element.setAttribute('data-siren-plan', detail.blockedAction);
  }

  function clear(): void {
    element.innerHTML = '';
    element.removeAttribute('data-siren-plan');
  }

  const planListener = ((e: CustomEvent<SirenPlanEventDetail>) => {
    render(e.detail);
  }) as EventListener;

  const entityListener = () => {
    clear();
  };

  document.addEventListener('siren:plan', planListener);
  document.addEventListener('siren:entity', entityListener);

  return {
    destroy() {
      document.removeEventListener('siren:plan', planListener);
      document.removeEventListener('siren:entity', entityListener);
      clear();
    },
    clear,
  };
}
