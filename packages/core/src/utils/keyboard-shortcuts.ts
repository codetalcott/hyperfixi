/**
 * Keyboard Shortcuts Utility
 * Parses keyboard shortcut syntax and creates event filters
 *
 * Syntax:
 *   key.enter          → Enter key
 *   key.esc            → Escape key
 *   key.ctrl+s         → Ctrl+S
 *   key.shift+alt+k    → Shift+Alt+K
 *   key.meta+z         → Meta/Command+Z
 *
 * Modifiers: ctrl, shift, alt, meta
 * Special keys: enter, esc, escape, space, tab, backspace, delete, etc.
 */

/**
 * Key name mappings for common keys
 */
const KEY_MAP: Record<string, string> = {
  // Special keys
  'enter': 'Enter',
  'esc': 'Escape',
  'escape': 'Escape',
  'space': ' ',
  'tab': 'Tab',
  'backspace': 'Backspace',
  'delete': 'Delete',
  'insert': 'Insert',
  'home': 'Home',
  'end': 'End',
  'pageup': 'PageUp',
  'pagedown': 'PageDown',

  // Arrow keys
  'up': 'ArrowUp',
  'down': 'ArrowDown',
  'left': 'ArrowLeft',
  'right': 'ArrowRight',
  'arrowup': 'ArrowUp',
  'arrowdown': 'ArrowDown',
  'arrowleft': 'ArrowLeft',
  'arrowright': 'ArrowRight',

  // Function keys
  'f1': 'F1',
  'f2': 'F2',
  'f3': 'F3',
  'f4': 'F4',
  'f5': 'F5',
  'f6': 'F6',
  'f7': 'F7',
  'f8': 'F8',
  'f9': 'F9',
  'f10': 'F10',
  'f11': 'F11',
  'f12': 'F12',
};

/**
 * Modifier keys
 */
const MODIFIERS = ['ctrl', 'shift', 'alt', 'meta'] as const;
type Modifier = typeof MODIFIERS[number];

/**
 * Parsed keyboard shortcut
 */
export interface KeyboardShortcut {
  key: string;
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
  originalSyntax: string;
}

/**
 * Parse keyboard shortcut syntax
 *
 * @param syntax - Shortcut syntax (e.g., "key.ctrl+s", "key.enter")
 * @returns Parsed shortcut or null if invalid
 *
 * @example
 * parseKeyboardShortcut("key.enter")
 * // => { key: "Enter", ctrl: false, shift: false, alt: false, meta: false }
 *
 * parseKeyboardShortcut("key.ctrl+s")
 * // => { key: "s", ctrl: true, shift: false, alt: false, meta: false }
 */
export function parseKeyboardShortcut(syntax: string): KeyboardShortcut | null {
  // Check if it's a keyboard shortcut syntax
  if (!syntax.startsWith('key.')) {
    return null;
  }

  // Remove 'key.' prefix
  const shortcut = syntax.substring(4).toLowerCase();

  // Parse modifiers and key
  const parts = shortcut.split('+');
  const modifiers: Set<Modifier> = new Set();
  let keyPart = '';

  for (const part of parts) {
    const trimmed = part.trim();
    if (MODIFIERS.includes(trimmed as Modifier)) {
      modifiers.add(trimmed as Modifier);
    } else {
      keyPart = trimmed;
    }
  }

  if (!keyPart) {
    return null; // No key specified
  }

  // Map key name to DOM key value
  const mappedKey = KEY_MAP[keyPart] || keyPart;

  return {
    key: mappedKey,
    ctrl: modifiers.has('ctrl'),
    shift: modifiers.has('shift'),
    alt: modifiers.has('alt'),
    meta: modifiers.has('meta'),
    originalSyntax: syntax
  };
}

/**
 * Create an event filter function for a keyboard shortcut
 *
 * @param shortcut - Parsed keyboard shortcut
 * @returns Event filter function
 *
 * @example
 * const shortcut = parseKeyboardShortcut("key.ctrl+s");
 * const filter = createKeyboardFilter(shortcut);
 * // Use filter(event) to check if event matches shortcut
 */
export function createKeyboardFilter(shortcut: KeyboardShortcut): (event: KeyboardEvent) => boolean {
  return (event: KeyboardEvent) => {
    // Check key
    if (event.key !== shortcut.key) {
      return false;
    }

    // Check modifiers
    if (event.ctrlKey !== shortcut.ctrl) return false;
    if (event.shiftKey !== shortcut.shift) return false;
    if (event.altKey !== shortcut.alt) return false;
    if (event.metaKey !== shortcut.meta) return false;

    return true;
  };
}

/**
 * Create a filter expression string for use in hyperscript
 *
 * @param shortcut - Parsed keyboard shortcut
 * @returns Filter expression string
 *
 * @example
 * createFilterExpression(parseKeyboardShortcut("key.ctrl+s"))
 * // => 'event.key === "s" && event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey'
 */
export function createFilterExpression(shortcut: KeyboardShortcut): string {
  const conditions: string[] = [];

  // Key condition
  conditions.push(`event.key === "${shortcut.key}"`);

  // Modifier conditions
  if (shortcut.ctrl) {
    conditions.push('event.ctrlKey');
  } else {
    conditions.push('!event.ctrlKey');
  }

  if (shortcut.shift) {
    conditions.push('event.shiftKey');
  } else {
    conditions.push('!event.shiftKey');
  }

  if (shortcut.alt) {
    conditions.push('event.altKey');
  } else {
    conditions.push('!event.altKey');
  }

  if (shortcut.meta) {
    conditions.push('event.metaKey');
  } else {
    conditions.push('!event.metaKey');
  }

  return conditions.join(' && ');
}

/**
 * Transform event type with keyboard shortcut to standard event + filter
 *
 * @param eventType - Event type (e.g., "key.ctrl+s" or "click")
 * @returns Transformed event configuration
 *
 * @example
 * transformKeyboardEvent("key.enter")
 * // => { type: "keydown", filter: 'event.key === "Enter" && ...' }
 *
 * transformKeyboardEvent("click")
 * // => { type: "click", filter: undefined }
 */
export function transformKeyboardEvent(eventType: string): { type: string; filter?: string } {
  const shortcut = parseKeyboardShortcut(eventType);

  if (!shortcut) {
    // Not a keyboard shortcut, return as-is
    return { type: eventType };
  }

  // Transform to keydown event with filter
  return {
    type: 'keydown',
    filter: createFilterExpression(shortcut)
  };
}

/**
 * Check if a string is a keyboard shortcut syntax
 *
 * @param syntax - String to check
 * @returns True if it's a keyboard shortcut syntax
 *
 * @example
 * isKeyboardShortcut("key.enter") // => true
 * isKeyboardShortcut("click")     // => false
 */
export function isKeyboardShortcut(syntax: string): boolean {
  return syntax.startsWith('key.') && parseKeyboardShortcut(syntax) !== null;
}

/**
 * Get human-readable description of a keyboard shortcut
 *
 * @param shortcut - Parsed keyboard shortcut
 * @returns Human-readable description
 *
 * @example
 * getShortcutDescription(parseKeyboardShortcut("key.ctrl+s"))
 * // => "Ctrl+S"
 */
export function getShortcutDescription(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];

  if (shortcut.ctrl) parts.push('Ctrl');
  if (shortcut.shift) parts.push('Shift');
  if (shortcut.alt) parts.push('Alt');
  if (shortcut.meta) parts.push('Meta');

  parts.push(shortcut.key);

  return parts.join('+');
}
