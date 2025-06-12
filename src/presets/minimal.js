/**
 * Minimal HyperFixi preset
 * Includes: Core functionality + shorthand syntax only
 * Target size: ~2KB
 */

import { parseShorthandSyntax } from '../syntax/shorthand.js';
import { createFetchCommand, registerCommand } from '../integrations/hyperscript.js';
import { createNoEventHandler } from '../integrations/fixi-events.js';

/**
 * Create minimal fetch command (shorthand syntax only, no events)
 * @returns {Function} Minimal fetch command function
 */
function createMinimalFetchCommand() {
    return createFetchCommand({
        syntaxParser: parseShorthandSyntax,
        eventHandler: createNoEventHandler()
    });
}

/**
 * Register minimal fetch command with hyperscript
 * @param {Object} hyperscript - Hyperscript instance
 * @param {string} commandName - Command name (default: 'fetch')
 */
export function register(hyperscript, commandName = 'fetch') {
    const command = createMinimalFetchCommand();
    registerCommand(hyperscript, command, commandName);
}

/**
 * Get minimal fetch command function (for manual registration)
 * @returns {Function} Command function
 */
export function getCommand() {
    return createMinimalFetchCommand();
}

/**
 * Minimal preset configuration
 */
export const minimal = {
    name: 'minimal',
    description: 'Shorthand syntax only, no events',
    targetSize: '2KB',
    features: [
        'fetch /url',
        'fetch /url and replace #target',
        'fetch /url and put into #target',
        'fetch /url and append to #target', 
        'fetch /url and prepend to #target'
    ],
    excludes: [
        'Extended syntax (with method:, body:)',
        'Fixi event compatibility',
        'Error events',
        'Event cancellation'
    ],
    register,
    getCommand
};

export default minimal;