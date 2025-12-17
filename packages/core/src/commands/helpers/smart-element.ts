/**
 * Smart Element Helpers
 *
 * Phase 3 Consolidation: Shared utilities for smart element detection and toggling
 * Used by toggle command and potentially other DOM commands.
 *
 * Smart elements are interactive HTML elements with special toggle behavior:
 * - dialog: toggles open/close with modal support
 * - details: toggles open attribute
 * - summary: toggles parent details element
 * - select: toggles focus/picker
 *
 * Provides:
 * - Smart element type detection
 * - Element-specific toggle implementations
 * - Target resolution for summary elements
 */

import { isHTMLElement } from '../../utils/element-check';

/**
 * Types of smart elements that have special toggle behavior
 */
export type SmartElementType = 'dialog' | 'details' | 'select' | null;

/**
 * Dialog mode for toggling
 */
export type DialogMode = 'modal' | 'non-modal';

/**
 * Detect smart element type from an array of elements
 *
 * Returns the smart element type if all elements are the same smart type,
 * or null if mixed types or not smart elements.
 *
 * Special handling for SUMMARY: resolves to 'details' type since
 * summary elements toggle their parent details.
 *
 * @param elements - Elements to check
 * @returns Smart element type or null
 *
 * @example
 * ```typescript
 * const type = detectSmartElementType([dialog1, dialog2]);
 * if (type === 'dialog') {
 *   toggleDialog(dialog1, 'modal');
 * }
 * ```
 */
export function detectSmartElementType(elements: HTMLElement[]): SmartElementType {
  if (elements.length === 0) return null;

  const firstTag = elements[0].tagName;
  const allSameType = elements.every(el => el.tagName === firstTag);

  if (!allSameType) return null;

  switch (firstTag) {
    case 'DIALOG':
      return 'dialog';
    case 'DETAILS':
      return 'details';
    case 'SELECT':
      return 'select';
    case 'SUMMARY': {
      // Summary elements toggle their parent details
      const parentDetails = elements
        .map(el => el.closest('details'))
        .filter((parent): parent is HTMLDetailsElement => parent !== null);
      return parentDetails.length > 0 ? 'details' : null;
    }
    default:
      return null;
  }
}

/**
 * Resolve smart element targets
 *
 * For SUMMARY elements, returns parent DETAILS elements.
 * For other elements, returns them unchanged.
 *
 * @param elements - Elements to resolve
 * @returns Resolved target elements
 */
export function resolveSmartElementTargets(elements: HTMLElement[]): HTMLElement[] {
  if (elements.length === 0) return [];

  const firstTag = elements[0].tagName;

  if (firstTag === 'SUMMARY') {
    // Map summary elements to their parent details
    return elements
      .map(el => el.closest('details'))
      .filter((parent): parent is HTMLDetailsElement => parent !== null);
  }

  return elements;
}

/**
 * Toggle a dialog element
 *
 * Opens the dialog if closed, closes if open.
 * Supports both modal and non-modal modes.
 *
 * @param dialog - Dialog element to toggle
 * @param mode - Dialog mode ('modal' or 'non-modal')
 *
 * @example
 * ```typescript
 * toggleDialog(dialog, 'modal');   // Opens with showModal()
 * toggleDialog(dialog, 'non-modal'); // Opens with show()
 * ```
 */
export function toggleDialog(dialog: HTMLDialogElement, mode: DialogMode): void {
  if (dialog.open) {
    dialog.close();
  } else {
    if (mode === 'modal') {
      dialog.showModal();
    } else {
      dialog.show();
    }
  }
}

/**
 * Toggle a details element
 *
 * Toggles the open attribute.
 *
 * @param details - Details element to toggle
 *
 * @example
 * ```typescript
 * toggleDetails(details); // Expands if collapsed, collapses if expanded
 * ```
 */
export function toggleDetails(details: HTMLDetailsElement): void {
  details.open = !details.open;
}

/**
 * Toggle a select element
 *
 * Opens the dropdown picker if not focused, blurs if focused.
 * Uses the modern showPicker() API when available, with fallbacks.
 *
 * Note: Programmatically opening select dropdowns is limited by browser
 * security - showPicker() may only work when triggered by user gesture.
 *
 * @param select - Select element to toggle
 *
 * @example
 * ```typescript
 * toggleSelect(select); // Opens picker or blurs
 * ```
 */
export function toggleSelect(select: HTMLSelectElement): void {
  if (document.activeElement === select) {
    select.blur();
  } else {
    select.focus();

    // Try modern showPicker() API first (Chrome 99+, Safari 16+, Firefox 101+)
    if ('showPicker' in select && typeof (select as any).showPicker === 'function') {
      try {
        (select as any).showPicker();
        return;
      } catch {
        // showPicker() may throw if not triggered by user gesture
      }
    }

    // Fallback: dispatch click event (more reliable than mousedown)
    const clickEvent = new MouseEvent('click', {
      view: window,
      bubbles: true,
      cancelable: true,
    });
    select.dispatchEvent(clickEvent);
  }
}

/**
 * Toggle a smart element based on its type
 *
 * Dispatches to the appropriate toggle function based on element type.
 *
 * @param element - Element to toggle
 * @param type - Smart element type
 * @param options - Options for specific element types
 * @returns true if toggled, false if unsupported type
 *
 * @example
 * ```typescript
 * const type = detectSmartElementType([element]);
 * if (type) {
 *   toggleSmartElement(element, type, { dialogMode: 'modal' });
 * }
 * ```
 */
export function toggleSmartElement(
  element: HTMLElement,
  type: SmartElementType,
  options?: { dialogMode?: DialogMode }
): boolean {
  switch (type) {
    case 'dialog':
      toggleDialog(element as HTMLDialogElement, options?.dialogMode ?? 'non-modal');
      return true;
    case 'details':
      toggleDetails(element as HTMLDetailsElement);
      return true;
    case 'select':
      toggleSelect(element as HTMLSelectElement);
      return true;
    default:
      return false;
  }
}

/**
 * Check if an element is a smart element
 *
 * @param element - Element to check
 * @returns true if element is a dialog, details, select, or summary
 */
export function isSmartElement(element: HTMLElement): boolean {
  const tag = element.tagName;
  return tag === 'DIALOG' || tag === 'DETAILS' || tag === 'SELECT' || tag === 'SUMMARY';
}

/**
 * Type guard for dialog elements
 *
 * @param element - Element to check
 * @returns true if element is an HTMLDialogElement
 */
export function isDialogElement(element: HTMLElement): element is HTMLDialogElement {
  return element.tagName === 'DIALOG';
}

/**
 * Type guard for details elements
 *
 * @param element - Element to check
 * @returns true if element is an HTMLDetailsElement
 */
export function isDetailsElement(element: HTMLElement): element is HTMLDetailsElement {
  return element.tagName === 'DETAILS';
}

/**
 * Type guard for select elements
 *
 * @param element - Element to check
 * @returns true if element is an HTMLSelectElement
 */
export function isSelectElement(element: HTMLElement): element is HTMLSelectElement {
  return element.tagName === 'SELECT';
}

/**
 * Type guard for summary elements
 *
 * @param element - Element to check
 * @returns true if element is a summary element
 */
export function isSummaryElement(element: HTMLElement): boolean {
  return element.tagName === 'SUMMARY';
}
