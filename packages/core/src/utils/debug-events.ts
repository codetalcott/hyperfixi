/**
 * Debug Event System for Semantic Parsing
 *
 * Emits custom events that can be captured by debug panels or dev tools.
 * Events are only dispatched when debug mode is enabled.
 */

export interface SemanticParseEventDetail {
  /** The input being parsed */
  input: string;
  /** Language code */
  language: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Confidence threshold used */
  threshold: number;
  /** Whether semantic parsing succeeded */
  semanticSuccess: boolean;
  /** Whether fallback to traditional parser was triggered */
  fallbackTriggered: boolean;
  /** Command name if parsed */
  command?: string;
  /** Semantic roles captured */
  roles?: Record<string, string>;
  /** Any errors */
  errors?: string[];
  /** Timestamp */
  timestamp: number;
  /** Parse duration in ms */
  duration?: number;
}

export interface ParseCompleteEventDetail {
  /** The input being parsed */
  input: string;
  /** Final parse method used */
  method: 'semantic' | 'traditional' | 'expression';
  /** Whether parsing succeeded */
  success: boolean;
  /** Command name if parsed */
  command?: string;
  /** Any errors */
  errors?: string[];
  /** Timestamp */
  timestamp: number;
  /** Total parse duration in ms */
  duration?: number;
}

// Global debug state
let debugEnabled = false;
let debugEventTarget: EventTarget | null = null;

// Auto-enable debug if ?debug=semantic is in URL (runs on module load)
if (typeof window !== 'undefined' && typeof URLSearchParams !== 'undefined') {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('debug') === 'semantic') {
      debugEnabled = true;
      debugEventTarget = window;
      console.log('%c[HyperFixi] Semantic debug auto-enabled via URL param', 'color: #667eea; font-weight: bold');
    }
  } catch {
    // Ignore errors in restricted environments
  }
}

/**
 * Enable semantic parsing debug events.
 * Events will be dispatched on window (browser) or a custom EventTarget.
 */
export function enableDebugEvents(target?: EventTarget): void {
  debugEnabled = true;
  debugEventTarget = target ?? (typeof window !== 'undefined' ? window : null);
}

/**
 * Disable semantic parsing debug events.
 */
export function disableDebugEvents(): void {
  debugEnabled = false;
}

/**
 * Check if debug events are enabled.
 */
export function isDebugEnabled(): boolean {
  return debugEnabled;
}

/**
 * Emit a semantic parse attempt event.
 */
export function emitSemanticParseEvent(detail: SemanticParseEventDetail): void {
  if (!debugEnabled) return;

  // Store in event history for late-binding debug panels
  eventHistory.push(detail);
  if (eventHistory.length > MAX_EVENT_HISTORY) {
    eventHistory.shift();
  }

  // Always log to console when debug is enabled
  const method = detail.semanticSuccess ? 'semantic' : detail.fallbackTriggered ? 'fallback' : 'traditional';
  const confidencePercent = Math.round(detail.confidence * 100);
  const thresholdPercent = Math.round(detail.threshold * 100);

  const style = detail.semanticSuccess
    ? 'color: #4caf50; font-weight: bold'
    : detail.fallbackTriggered
      ? 'color: #ff9800; font-weight: bold'
      : 'color: #9e9e9e';

  console.groupCollapsed(
    `%c[Semantic] ${method.toUpperCase()} %c${detail.input.substring(0, 50)}${detail.input.length > 50 ? '...' : ''}`,
    style,
    'color: #888'
  );
  console.log(`Confidence: ${confidencePercent}% (threshold: ${thresholdPercent}%)`);
  if (detail.command) console.log(`Command: ${detail.command}`);
  if (detail.roles && Object.keys(detail.roles).length > 0) {
    console.log('Roles:', detail.roles);
  }
  if (detail.duration) console.log(`Duration: ${detail.duration.toFixed(2)}ms`);
  if (detail.errors?.length) console.log('Errors:', detail.errors);
  console.groupEnd();

  // Dispatch event for UI panels
  if (debugEventTarget) {
    const event = new CustomEvent('hyperfixi:semantic:parse', {
      detail,
      bubbles: true,
    });
    debugEventTarget.dispatchEvent(event);
  }
}

/**
 * Emit a parse complete event.
 */
export function emitParseCompleteEvent(detail: ParseCompleteEventDetail): void {
  if (!debugEnabled || !debugEventTarget) return;

  const event = new CustomEvent('hyperfixi:parse:complete', {
    detail,
    bubbles: true,
  });
  debugEventTarget.dispatchEvent(event);
}

/**
 * Debug statistics tracker.
 */
export interface DebugStats {
  totalParses: number;
  semanticSuccesses: number;
  semanticFallbacks: number;
  traditionalParses: number;
  averageConfidence: number;
  confidenceHistory: number[];
}

let stats: DebugStats = {
  totalParses: 0,
  semanticSuccesses: 0,
  semanticFallbacks: 0,
  traditionalParses: 0,
  averageConfidence: 0,
  confidenceHistory: [],
};

// Event history for late-binding debug panels
const MAX_EVENT_HISTORY = 50;
let eventHistory: SemanticParseEventDetail[] = [];

/**
 * Update debug statistics.
 */
export function updateDebugStats(event: SemanticParseEventDetail): void {
  stats.totalParses++;

  if (event.semanticSuccess) {
    stats.semanticSuccesses++;
  } else if (event.fallbackTriggered) {
    stats.semanticFallbacks++;
  } else {
    stats.traditionalParses++;
  }

  // Track confidence history (keep last 100)
  stats.confidenceHistory.push(event.confidence);
  if (stats.confidenceHistory.length > 100) {
    stats.confidenceHistory.shift();
  }

  // Calculate average
  stats.averageConfidence = stats.confidenceHistory.reduce((a, b) => a + b, 0) / stats.confidenceHistory.length;
}

/**
 * Get current debug statistics.
 */
export function getDebugStats(): Readonly<DebugStats> {
  return { ...stats };
}

/**
 * Reset debug statistics.
 */
export function resetDebugStats(): void {
  stats = {
    totalParses: 0,
    semanticSuccesses: 0,
    semanticFallbacks: 0,
    traditionalParses: 0,
    averageConfidence: 0,
    confidenceHistory: [],
  };
  eventHistory = [];
}

/**
 * Get event history for late-binding debug panels.
 * Returns events in chronological order (oldest first).
 */
export function getEventHistory(): readonly SemanticParseEventDetail[] {
  return [...eventHistory];
}

/**
 * Replay stored events to a callback (for late-binding debug panels).
 */
export function replayEvents(callback: (event: SemanticParseEventDetail) => void): void {
  for (const event of eventHistory) {
    callback(event);
  }
}
