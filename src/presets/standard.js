/**
 * Standard HyperFixi preset
 * Includes: Shorthand + extended syntax, minimal events
 * Target size: ~4KB
 */

import { parseShorthandSyntax } from '../syntax/shorthand.js';
import { parseExtendedSyntax, isExtendedSyntax } from '../syntax/extended.js';
import { createFetchCommand, registerCommand } from '../integrations/hyperscript.js';
import { createMinimalEventHandler } from '../integrations/fixi-events.js';

/**
 * Parse both shorthand and extended syntax
 * @param {Object} parser - Hyperscript parser instance
 * @param {Object} runtime - Hyperscript runtime instance
 * @param {Object} tokens - Token stream
 * @param {Object} command - Base command object
 * @returns {Object} Updated command object
 */
function parseStandardSyntax(parser, runtime, tokens, command) {
    if (isExtendedSyntax(tokens)) {
        // Extended syntax: fetch /url with method: 'POST', body: data
        return parseExtendedSyntax(parser, runtime, tokens, command);
    } else {
        // Shorthand syntax: fetch /url and replace #target
        return parseShorthandSyntax(parser, runtime, tokens, command);
    }
}

/**
 * Create standard fetch command (both syntax forms, minimal events)
 * @returns {Function} Standard fetch command function
 */
function createStandardFetchCommand() {
    return createFetchCommand({
        syntaxParser: parseStandardSyntax,
        eventHandler: createMinimalEventHandler()
    });
}

/**
 * Register standard fetch command with hyperscript
 * @param {Object} hyperscript - Hyperscript instance
 * @param {string} commandName - Command name (default: 'fetch')
 */
export function register(hyperscript, commandName = 'fetch') {
    const command = createStandardFetchCommand();
    registerCommand(hyperscript, command, commandName);
}

/**
 * Get standard fetch command function (for manual registration)
 * @returns {Function} Command function
 */
export function getCommand() {
    return createStandardFetchCommand();
}

/**
 * Standard preset configuration
 */
export const standard = {
    name: 'standard',
    description: 'Shorthand + extended syntax, minimal events',
    targetSize: '4KB',
    features: [
        'All shorthand syntax',
        'Extended syntax with method:, body:, headers:',
        'Custom target and placement options',
        'Basic error handling (fixi:error events)',
        'Response available for then clauses'
    ],
    excludes: [
        'Full fixi event chain (fx:config, fx:before, etc.)',
        'Event cancellation capabilities',
        'Advanced event debugging'
    ],
    register,
    getCommand
};

export default standard;