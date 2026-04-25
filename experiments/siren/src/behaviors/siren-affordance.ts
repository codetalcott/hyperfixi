/**
 * SirenAffordance behavior — show/hide elements based on available Siren affordances.
 *
 * When a siren:entity event fires, elements with this behavior automatically
 * show or hide depending on whether the named action or link exists on the
 * current entity. This is the core "server drives the UI" pattern.
 *
 * Usage:
 *   <button _="behavior SirenAffordance(action: 'ship-order')
 *     on click execute siren action 'ship-order'">Ship</button>
 *
 *   <a _="behavior SirenAffordance(link: 'next')
 *     on click follow siren link 'next'">Next</a>
 */

import { getCurrentEntity, getConditionState } from '../siren-client';

export interface SirenAffordanceConfig {
  /** The DOM element to show/hide */
  element: HTMLElement;
  /** Show when this action name exists on the current entity */
  action?: string;
  /** Show when this link rel exists on the current entity */
  link?: string;
  /** Set aria-disabled when this condition is not met */
  precondition?: string;
}

export interface SirenAffordanceInstance {
  /** Remove the event listener and clean up */
  destroy(): void;
  /** Manually trigger a visibility update */
  update(): void;
}

/**
 * Create a SirenAffordance behavior instance.
 *
 * Listens for `siren:entity` events on `document` and toggles the element's
 * display based on whether the named action or link exists on the current entity.
 */
export function createSirenAffordance(config: SirenAffordanceConfig): SirenAffordanceInstance {
  const { element, action, link, precondition } = config;

  function update(): void {
    const entity = getCurrentEntity();
    let visible = false;

    if (action) {
      visible = entity?.actions?.some(a => a.name === action) ?? false;
    } else if (link) {
      visible = entity?.links?.some(l => l.rel.includes(link)) ?? false;
    }

    element.style.display = visible ? '' : 'none';
  }

  function updatePrecondition(): void {
    if (!precondition) return;
    const met = getConditionState().has(precondition);
    if (met) {
      element.removeAttribute('aria-disabled');
    } else {
      element.setAttribute('aria-disabled', 'true');
    }
  }

  // Hidden until first entity loads
  element.style.display = 'none';

  const entityListener = () => update();
  document.addEventListener('siren:entity', entityListener);

  const conditionsListener = precondition ? () => updatePrecondition() : null;
  if (conditionsListener) {
    document.addEventListener('siren:conditions', conditionsListener);
    updatePrecondition();
  }

  return {
    destroy() {
      document.removeEventListener('siren:entity', entityListener);
      if (conditionsListener) {
        document.removeEventListener('siren:conditions', conditionsListener);
      }
    },
    update() {
      update();
      updatePrecondition();
    },
  };
}
