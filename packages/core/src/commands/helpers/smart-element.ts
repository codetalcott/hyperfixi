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
export type SmartElementType = 'dialog' | 'details' | 'select' | 'popover' | null;

/**
 * Dialog mode for toggling
 */
export type DialogMode = 'modal' | 'non-modal';

/**
 * Whether the browser supports the Popover API
 */
const POPOVER_SUPPORTED =
  typeof HTMLElement !== 'undefined' && typeof HTMLElement.prototype.showPopover === 'function';

/**
 * Check if an element has the popover attribute and the browser supports the Popover API
 *
 * Unlike other smart element types (dialog, details, select) which are detected by
 * tag name, popover is detected by **attribute presence** since any HTML element
 * can have the `popover` attribute.
 *
 * @param element - Element to check
 * @returns true if the element has a popover attribute and the API is available
 */
export function isPopoverElement(element: HTMLElement): boolean {
  return POPOVER_SUPPORTED && element.hasAttribute('popover');
}

/**
 * Detect smart element type from an array of elements
 *
 * Returns the smart element type if all elements are the same smart type,
 * or null if mixed types or not smart elements.
 *
 * Detection priority:
 * 1. Popover attribute (checked first since any element can have it)
 * 2. Tag-based: dialog, details, select, summary
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

  // Check for popover attribute first (takes precedence since any element can have it)
  if (elements.every(el => isPopoverElement(el))) {
    return 'popover';
  }

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
 * Toggle a popover element
 *
 * Uses the native Popover API (togglePopover). Errors are suppressed
 * for idempotent behavior — calling toggle on an element already in the
 * target state will not throw.
 *
 * @param element - Element with popover attribute to toggle
 * @param force - Optional boolean to force show (true) or hide (false)
 *
 * @example
 * ```typescript
 * togglePopover(element);          // Toggle between shown/hidden
 * togglePopover(element, true);    // Force show
 * togglePopover(element, false);   // Force hide
 * ```
 */
export function togglePopover(element: HTMLElement, force?: boolean): void {
  try {
    element.togglePopover(force);
  } catch {
    // Suppress InvalidStateError when element is already in the target state
  }
}

/**
 * Show a popover element
 *
 * Uses the native Popover API (showPopover). Silently ignores if already shown.
 *
 * @param element - Element with popover attribute to show
 */
export function showPopover(element: HTMLElement): void {
  try {
    element.showPopover();
  } catch {
    // Suppress InvalidStateError when element is already shown
  }
}

/**
 * Hide a popover element
 *
 * Uses the native Popover API (hidePopover). Silently ignores if already hidden.
 *
 * @param element - Element with popover attribute to hide
 */
export function hidePopover(element: HTMLElement): void {
  try {
    element.hidePopover();
  } catch {
    // Suppress InvalidStateError when element is already hidden
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
    case 'popover':
      togglePopover(element);
      return true;
    default:
      return false;
  }
}

/**
 * Check if an element is a smart element
 *
 * @param element - Element to check
 * @returns true if element is a dialog, details, select, summary, or has popover attribute
 */
export function isSmartElement(element: HTMLElement): boolean {
  const tag = element.tagName;
  return (
    tag === 'DIALOG' ||
    tag === 'DETAILS' ||
    tag === 'SELECT' ||
    tag === 'SUMMARY' ||
    isPopoverElement(element)
  );
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
