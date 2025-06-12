/**
 * HyperFixi - Modular tree-shakeable entry point
 * Unified fetch syntax for _hyperscript + fixi.js integration
 */

// === PRESETS (Most common usage) ===
export { default as minimal } from './presets/minimal.js';
export { default as standard } from './presets/standard.js';
export { default as events } from './presets/events.js';
export { default as complete } from './presets/complete.js';

// === CORE UTILITIES (For custom builds) ===
export { 
    parseURL, 
    parseTarget, 
    parseOptionValue,
    createBaseCommand 
} from './core/parser.js';

export { 
    executeHTTPRequest,
    resolveExpression,
    buildFetchOptions,
    createFixiConfig 
} from './core/executor.js';

export { 
    mapPlacementToSwap,
    applySwap,
    SWAP_STRATEGIES 
} from './core/dom.js';

export { 
    createCustomEvent,
    emitEvent,
    FIXI_EVENTS,
    HYPERFIXI_EVENTS 
} from './core/events.js';

// === SYNTAX PARSERS (For custom syntax combinations) ===
export { 
    parseShorthandSyntax,
    isShorthandSyntax,
    getShorthandPlacements 
} from './syntax/shorthand.js';

export { 
    parseExtendedSyntax,
    isExtendedSyntax,
    getExtendedOptions,
    EXTENDED_OPTIONS 
} from './syntax/extended.js';

export { 
    validatePlacementSequence,
    getAllPlacements,
    isValidPlacement,
    getSwapStrategy,
    PLACEMENTS 
} from './syntax/placement.js';

// === INTEGRATIONS (For custom event handling) ===
export { 
    createFetchCommand,
    registerCommand,
    registerFetchCommand 
} from './integrations/hyperscript.js';

export { 
    FixiEventHandler,
    MinimalEventHandler,
    NoEventHandler,
    createFixiEventHandler,
    createMinimalEventHandler,
    createNoEventHandler 
} from './integrations/fixi-events.js';

// === CONVENIENCE FUNCTIONS ===

/**
 * Quick registration with minimal preset (most common)
 * @param {Object} hyperscript - Hyperscript instance
 */
export function registerMinimal(hyperscript) {
    const { minimal } = await import('./presets/minimal.js');
    minimal.register(hyperscript);
}

/**
 * Quick registration with standard preset (recommended)
 * @param {Object} hyperscript - Hyperscript instance
 */
export function registerStandard(hyperscript) {
    const { standard } = await import('./presets/standard.js');
    standard.register(hyperscript);
}

/**
 * Quick registration with events preset (full compatibility)
 * @param {Object} hyperscript - Hyperscript instance
 */
export function registerEvents(hyperscript) {
    const { events } = await import('./presets/events.js');
    events.register(hyperscript);
}

/**
 * Quick registration with complete preset (everything)
 * @param {Object} hyperscript - Hyperscript instance
 */
export function registerComplete(hyperscript) {
    const { complete } = await import('./presets/complete.js');
    complete.register(hyperscript);
}

// === METADATA ===
export const VERSION = '0.2.0';
export const PRESETS = ['minimal', 'standard', 'events', 'complete'];

/**
 * Get information about available presets
 * @returns {Object} Preset information
 */
export function getPresetInfo() {
    return {
        minimal: {
            size: '~2KB',
            features: 'Shorthand syntax only',
            useCase: 'Basic GET requests'
        },
        standard: {
            size: '~4KB', 
            features: 'Shorthand + extended syntax',
            useCase: 'Most applications'
        },
        events: {
            size: '~6KB',
            features: 'Standard + full fixi events',
            useCase: 'Full compatibility'
        },
        complete: {
            size: '~8KB',
            features: 'Everything + debugging',
            useCase: 'Maximum functionality'
        }
    };
}

/**
 * Analyze bundle size for current import
 * @returns {Object} Size analysis
 */
export function analyzeBundleSize() {
    // This would be replaced by build tooling
    return {
        estimated: 'Use build tools for accurate analysis',
        recommendation: 'Import specific presets for optimal size'
    };
}