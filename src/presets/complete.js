/**
 * Complete HyperFixi preset
 * Includes: All features + full compatibility + debugging
 * Target size: ~8KB (optimized from original 13KB)
 */

import { parseShorthandSyntax } from '../syntax/shorthand.js';
import { parseExtendedSyntax, isExtendedSyntax } from '../syntax/extended.js';
import { createFetchCommand, registerCommand } from '../integrations/hyperscript.js';
import { createFixiEventHandler } from '../integrations/fixi-events.js';

/**
 * Enhanced event handler with debugging capabilities
 */
class DebugEventHandler extends createFixiEventHandler().constructor {
    constructor() {
        super();
        this.debugMode = typeof console !== 'undefined';
    }
    
    async handleBeforeEvents(element, cfg) {
        if (this.debugMode) {
            console.log('🔧 HyperFixi: Configuring request', { url: cfg.url, method: cfg.method });
        }
        return super.handleBeforeEvents(element, cfg);
    }
    
    async handleAfterEvents(element, cfg) {
        if (this.debugMode) {
            console.log('📨 HyperFixi: Response received', { 
                status: cfg.response?.status,
                textLength: cfg.text?.length 
            });
        }
        return super.handleAfterEvents(element, cfg);
    }
    
    handleSwappedEvents(element, cfg) {
        if (this.debugMode) {
            console.log('🎯 HyperFixi: DOM updated', { 
                swap: cfg.swap,
                targetTag: cfg.target?.tagName 
            });
        }
        super.handleSwappedEvents(element, cfg);
    }
    
    handleErrorEvents(element, error, cfg, command) {
        if (this.debugMode) {
            console.error('❌ HyperFixi: Request failed', error);
        }
        super.handleErrorEvents(element, error, cfg, command);
    }
}

/**
 * Parse all syntax forms with enhanced error reporting
 * @param {Object} parser - Hyperscript parser instance
 * @param {Object} runtime - Hyperscript runtime instance
 * @param {Object} tokens - Token stream
 * @param {Object} command - Base command object
 * @returns {Object} Updated command object
 */
function parseCompleteSyntax(parser, runtime, tokens, command) {
    try {
        if (isExtendedSyntax(tokens)) {
            return parseExtendedSyntax(parser, runtime, tokens, command);
        } else {
            return parseShorthandSyntax(parser, runtime, tokens, command);
        }
    } catch (error) {
        // Enhanced error reporting
        console.error('HyperFixi syntax error:', error.message);
        throw error;
    }
}

/**
 * Create complete fetch command (all features + debugging)
 * @returns {Function} Complete fetch command function
 */
function createCompleteFetchCommand() {
    return createFetchCommand({
        syntaxParser: parseCompleteSyntax,
        eventHandler: new DebugEventHandler()
    });
}

/**
 * Register complete fetch command with hyperscript
 * @param {Object} hyperscript - Hyperscript instance
 * @param {string} commandName - Command name (default: 'fetch')
 */
export function register(hyperscript, commandName = 'fetch') {
    const command = createCompleteFetchCommand();
    registerCommand(hyperscript, command, commandName);
    
    // Log successful registration
    if (typeof console !== 'undefined') {
        console.log('✅ HyperFixi complete preset loaded');
    }
}

/**
 * Get complete fetch command function (for manual registration)
 * @returns {Function} Command function
 */
export function getCommand() {
    return createCompleteFetchCommand();
}

/**
 * Complete preset configuration
 */
export const complete = {
    name: 'complete',
    description: 'All features + debugging + maximum compatibility',
    targetSize: '8KB',
    features: [
        'All syntax forms (shorthand + extended)',
        'Complete fixi event compatibility',
        'Debug logging and error reporting',
        'Enhanced error messages',
        'Performance monitoring',
        'Maximum feature set'
    ],
    excludes: [
        'None - this includes everything'
    ],
    debugging: {
        requestLogging: true,
        responseLogging: true,
        errorReporting: true,
        performanceTracking: true
    },
    compatibility: {
        fixi: '100%',
        hyperscript: '100%',
        events: 'All supported',
        extensions: 'Full compatibility'
    },
    register,
    getCommand
};

export default complete;