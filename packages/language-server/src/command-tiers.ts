/**
 * Command and feature tiers for hyperscript vs LokaScript compatibility.
 *
 * LokaScript is a superset of _hyperscript with 100% compatibility.
 * This module defines which features are:
 * - hyperscript: Available in original _hyperscript (and LokaScript)
 * - lokascript: LokaScript extensions (not compatible with original _hyperscript)
 */

/**
 * Commands available in original _hyperscript.
 * These work in both _hyperscript and LokaScript.
 */
export const HYPERSCRIPT_COMMANDS = [
  // Core commands
  'add',
  'append',
  'call',
  'default',
  'exit',
  'fetch',
  'for',
  'get',
  'go',
  'halt',
  'hide',
  'if',
  'increment',
  'decrement',
  'js',
  'log',
  'put',
  'remove',
  'repeat',
  'return',
  'send',
  'set',
  'show',
  'take',
  'tell',
  'throw',
  'toggle',
  'transition',
  'trigger',
  'wait',
  'while',

  // Definitions
  'behavior',
  'def',
  'init',
  'on',
  'eventsource',
  'socket',
  'worker',
] as const;

/**
 * Commands that are LokaScript extensions.
 * These do NOT work in original _hyperscript.
 */
export const LOKASCRIPT_ONLY_COMMANDS = [
  'make',
  'settle',
  'measure',
  'transfer',
  'morph',
  'persist',
  'install',
  'process-partials',
] as const;

/**
 * All commands (hyperscript + lokascript extensions).
 */
export const ALL_COMMANDS = [...HYPERSCRIPT_COMMANDS, ...LOKASCRIPT_ONLY_COMMANDS] as const;

/**
 * Type conversion targets available in original _hyperscript.
 */
export const HYPERSCRIPT_AS_TARGETS = ['String', 'Number', 'Boolean', 'Array', 'Object'] as const;

/**
 * Extended type conversion targets (LokaScript only).
 */
export const LOKASCRIPT_ONLY_AS_TARGETS = [
  'Int',
  'Integer',
  'Float',
  'JSON',
  'FormData',
  'Date',
  'URLSearchParams',
  'Set',
  'Map',
] as const;

/**
 * Event modifiers available in original _hyperscript.
 */
export const HYPERSCRIPT_EVENT_MODIFIERS = [
  'once',
  'prevent',
  'stop',
  'capture',
  'passive',
] as const;

/**
 * Event modifiers that are LokaScript extensions.
 */
export const LOKASCRIPT_ONLY_EVENT_MODIFIERS = ['debounce', 'throttle'] as const;

/**
 * Syntax patterns that are LokaScript-only.
 * Used for detecting LokaScript features in hyperscript mode.
 */
export const LOKASCRIPT_SYNTAX_PATTERNS = {
  /**
   * Possessive dot notation: my.textContent, its.value, your.classList
   * Original _hyperscript uses space: my textContent
   */
  dotNotation: /\b(my|your|its)\.\w+/,

  /**
   * Optional chaining: my?.value
   */
  optionalChaining: /\b(my|your|its)\?\.\w+/,

  /**
   * Extended 'as' conversions
   */
  extendedAsConversion: /\bas\s+(Int|Integer|Float|JSON|FormData|Date|URLSearchParams|Set|Map)\b/i,

  /**
   * Debounce/throttle modifiers with duration: .debounce(300), .throttle(1s)
   */
  temporalModifiers: /\.(debounce|throttle)\s*\(\s*\d+/i,
} as const;

/**
 * Check if a command is hyperscript-compatible.
 */
export function isHyperscriptCommand(cmd: string): boolean {
  return HYPERSCRIPT_COMMANDS.includes(cmd.toLowerCase() as (typeof HYPERSCRIPT_COMMANDS)[number]);
}

/**
 * Check if a command is LokaScript-only.
 */
export function isLokascriptOnlyCommand(cmd: string): boolean {
  return LOKASCRIPT_ONLY_COMMANDS.includes(
    cmd.toLowerCase() as (typeof LOKASCRIPT_ONLY_COMMANDS)[number]
  );
}

/**
 * Detect LokaScript-only features in code.
 * Returns an array of detected features with their descriptions.
 */
export function detectLokascriptFeatures(
  code: string
): Array<{ feature: string; description: string; pattern: string }> {
  const detected: Array<{ feature: string; description: string; pattern: string }> = [];

  // Check for LokaScript-only commands
  for (const cmd of LOKASCRIPT_ONLY_COMMANDS) {
    const pattern = new RegExp(`\\b${cmd}\\b`, 'i');
    if (pattern.test(code)) {
      detected.push({
        feature: 'command',
        description: `'${cmd}' command is a LokaScript extension`,
        pattern: cmd,
      });
    }
  }

  // Check for dot notation
  if (LOKASCRIPT_SYNTAX_PATTERNS.dotNotation.test(code)) {
    detected.push({
      feature: 'syntax',
      description:
        "Dot notation (my.property) is a LokaScript extension. Use 'my property' for _hyperscript compatibility",
      pattern: 'dot-notation',
    });
  }

  // Check for optional chaining
  if (LOKASCRIPT_SYNTAX_PATTERNS.optionalChaining.test(code)) {
    detected.push({
      feature: 'syntax',
      description: 'Optional chaining (my?.property) is a LokaScript extension',
      pattern: 'optional-chaining',
    });
  }

  // Check for extended as conversions
  const asMatch = code.match(LOKASCRIPT_SYNTAX_PATTERNS.extendedAsConversion);
  if (asMatch) {
    detected.push({
      feature: 'conversion',
      description: `'as ${asMatch[1]}' is a LokaScript extension`,
      pattern: `as-${asMatch[1].toLowerCase()}`,
    });
  }

  // Check for temporal modifiers
  const temporalMatch = code.match(LOKASCRIPT_SYNTAX_PATTERNS.temporalModifiers);
  if (temporalMatch) {
    detected.push({
      feature: 'modifier',
      description: `'.${temporalMatch[1]}()' modifier is a LokaScript extension`,
      pattern: temporalMatch[1].toLowerCase(),
    });
  }

  return detected;
}

/**
 * Get commands available for a given mode.
 */
export function getCommandsForMode(mode: 'hyperscript' | 'lokascript'): readonly string[] {
  return mode === 'hyperscript' ? HYPERSCRIPT_COMMANDS : ALL_COMMANDS;
}

/**
 * Get event modifiers available for a given mode.
 */
export function getEventModifiersForMode(mode: 'hyperscript' | 'lokascript'): readonly string[] {
  return mode === 'hyperscript'
    ? HYPERSCRIPT_EVENT_MODIFIERS
    : [...HYPERSCRIPT_EVENT_MODIFIERS, ...LOKASCRIPT_ONLY_EVENT_MODIFIERS];
}
