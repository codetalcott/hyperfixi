/**
 * HyperFixi Hybrid Parser - Keyword Aliases
 *
 * Provides i18n-friendly aliases for commands and events.
 * Enables tree-shaking when only the parser is needed.
 */

export const COMMAND_ALIASES: Record<string, string> = {
  flip: 'toggle', switch: 'toggle', display: 'show', reveal: 'show',
  conceal: 'hide', increase: 'increment', decrease: 'decrement',
  fire: 'trigger', dispatch: 'send', navigate: 'go', goto: 'go',
};

export const EVENT_ALIASES: Record<string, string> = {
  clicked: 'click', pressed: 'keydown', changed: 'change',
  submitted: 'submit', loaded: 'load',
};

export function normalizeCommand(name: string): string {
  const lower = name.toLowerCase();
  return COMMAND_ALIASES[lower] || lower;
}

export function normalizeEvent(name: string): string {
  const lower = name.toLowerCase();
  return EVENT_ALIASES[lower] || lower;
}

/**
 * Add custom command aliases at runtime.
 */
export function addCommandAliases(aliases: Record<string, string>): void {
  Object.assign(COMMAND_ALIASES, aliases);
}

/**
 * Add custom event aliases at runtime.
 */
export function addEventAliases(aliases: Record<string, string>): void {
  Object.assign(EVENT_ALIASES, aliases);
}
