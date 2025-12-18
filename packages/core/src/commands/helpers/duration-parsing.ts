/**
 * Duration Parsing Helpers - Shared utilities for time/duration handling
 *
 * Used by: wait, transition, settle
 *
 * These utilities handle:
 * - Parsing duration strings (e.g., "2s", "500ms", "1.5 seconds")
 * - Converting between time units
 * - CSS property name conversion (camelCase to kebab-case)
 * - Parsing CSS duration lists for animations/transitions
 *
 * Bundle size savings: ~35 lines per command using these helpers
 */

/**
 * Internal helper to parse duration components from a string
 * @returns { number, milliseconds } or null if invalid
 */
function _parseDurationComponents(value: string): { number: number; milliseconds: number } | null {
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d+(?:\.\d+)?)\s*(s|ms|sec|seconds?|milliseconds?)?$/i);

  if (!match) {
    return null;
  }

  const number = parseFloat(match[1]);
  const unit = (match[2] || 'ms').toLowerCase();

  // Convert to milliseconds
  if (unit === 'ms' || unit === 'millisecond' || unit === 'milliseconds') {
    return { number, milliseconds: Math.floor(number) };
  } else if (unit === 's' || unit === 'sec' || unit === 'second' || unit === 'seconds') {
    return { number, milliseconds: Math.floor(number * 1000) };
  }

  return null;
}

/**
 * Parse duration value to milliseconds
 *
 * Supports:
 * - Numbers: treated as milliseconds
 * - Strings: "2s", "500ms", "1.5sec", "2 seconds", etc.
 *
 * @param value - Duration value to parse
 * @param defaultMs - Default value in milliseconds if parsing fails
 * @returns Duration in milliseconds
 */
export function parseDuration(value: unknown, defaultMs = 300): number {
  // Handle number (already in milliseconds)
  if (typeof value === 'number') {
    return Math.max(0, Math.floor(value));
  }

  // Handle string with suffix
  if (typeof value === 'string') {
    const result = _parseDurationComponents(value);
    return result ? result.milliseconds : defaultMs;
  }

  return defaultMs;
}

/**
 * Parse duration value with strict validation
 *
 * Similar to parseDuration but throws on invalid input instead of using default.
 *
 * @param value - Duration value to parse
 * @returns Duration in milliseconds
 * @throws Error if value cannot be parsed
 */
export function parseDurationStrict(value: unknown): number {
  // Handle number (already in milliseconds)
  if (typeof value === 'number') {
    if (value < 0) throw new Error('Duration must be >= 0');
    return Math.floor(value);
  }

  // Handle string with suffix
  if (typeof value === 'string') {
    const result = _parseDurationComponents(value);
    if (!result) {
      throw new Error(`Invalid duration format: "${value}"`);
    }
    return result.milliseconds;
  }

  throw new Error(`Invalid duration type: ${typeof value}`);
}

/**
 * Parse CSS duration string into array of milliseconds
 *
 * Used for parsing computed style values like transition-duration.
 *
 * @param durationString - CSS duration string (e.g., "1s, 0.5s")
 * @returns Array of durations in milliseconds
 */
export function parseCSSDurations(durationString: string): number[] {
  if (!durationString || durationString === 'none') {
    return [0];
  }

  return durationString.split(',').map((duration) => {
    const value = parseFloat(duration.trim());
    if (isNaN(value)) return 0;

    // Convert seconds to milliseconds
    if (duration.includes('s') && !duration.includes('ms')) {
      return value * 1000;
    }
    return value;
  });
}

/**
 * Calculate maximum total time from durations and delays
 *
 * Used for animation/transition timing calculations.
 *
 * @param durations - Array of durations in milliseconds
 * @param delays - Array of delays in milliseconds
 * @returns Maximum total time (duration + delay)
 */
export function calculateMaxAnimationTime(durations: number[], delays: number[]): number {
  let maxTime = 0;

  for (let i = 0; i < durations.length; i++) {
    const duration = durations[i] || 0;
    const delay = delays[i] || 0;
    const totalTime = duration + delay;
    maxTime = Math.max(maxTime, totalTime);
  }

  return maxTime;
}

/**
 * Convert camelCase to kebab-case
 *
 * Used for CSS property name conversion (e.g., backgroundColor -> background-color)
 *
 * @param str - String in camelCase
 * @returns String in kebab-case
 */
export function camelToKebab(str: string): string {
  return str.replace(/([A-Z])/g, '-$1').toLowerCase();
}

/**
 * Convert kebab-case to camelCase
 *
 * Used for converting CSS properties back to JS property names.
 *
 * @param str - String in kebab-case
 * @returns String in camelCase
 */
export function kebabToCamel(str: string): string {
  return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Format milliseconds as human-readable duration
 *
 * @param ms - Duration in milliseconds
 * @returns Formatted duration string (e.g., "1.5s", "500ms")
 */
export function formatDuration(ms: number): string {
  if (ms >= 1000) {
    const seconds = ms / 1000;
    return Number.isInteger(seconds) ? `${seconds}s` : `${seconds.toFixed(1)}s`;
  }
  return `${ms}ms`;
}
