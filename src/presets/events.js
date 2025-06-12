/**
 * Events HyperFixi preset
 * Includes: Standard features + full fixi event compatibility
 * Target size: ~6KB
 */

import { parseShorthandSyntax } from '../syntax/shorthand.js';
import { parseExtendedSyntax, isExtendedSyntax } from '../syntax/extended.js';
import { createFetchCommand, registerCommand } from '../integrations/hyperscript.js';
import { createFixiEventHandler } from '../integrations/fixi-events.js';

/**
 * Parse both shorthand and extended syntax (same as standard)
 * @param {Object} parser - Hyperscript parser instance
 * @param {Object} runtime - Hyperscript runtime instance
 * @param {Object} tokens - Token stream
 * @param {Object} command - Base command object
 * @returns {Object} Updated command object
 */
function parseEventsSyntax(parser, runtime, tokens, command) {
    if (isExtendedSyntax(tokens)) {
        return parseExtendedSyntax(parser, runtime, tokens, command);
    } else {
        return parseShorthandSyntax(parser, runtime, tokens, command);
    }
}

/**
 * Create events fetch command (full syntax + full fixi events)
 * @returns {Function} Events fetch command function
 */
function createEventsFetchCommand() {
    return createFetchCommand({
        syntaxParser: parseEventsSyntax,
        eventHandler: createFixiEventHandler()
    });
}

/**
 * Register events fetch command with hyperscript
 * @param {Object} hyperscript - Hyperscript instance
 * @param {string} commandName - Command name (default: 'fetch')
 */
export function register(hyperscript, commandName = 'fetch') {
    const command = createEventsFetchCommand();
    registerCommand(hyperscript, command, commandName);
}

/**
 * Get events fetch command function (for manual registration)
 * @returns {Function} Command function
 */
export function getCommand() {
    return createEventsFetchCommand();
}

/**
 * Events preset configuration
 */
export const events = {
    name: 'events',
    description: 'Full syntax + complete fixi event compatibility',
    targetSize: '6KB',
    features: [
        'All standard features',
        'Complete fixi event chain: fx:config, fx:before, fx:after',
        'Error events: fx:error, fx:finally',
        'Swapped events: fx:swapped',
        'Event cancellation (preventDefault)',
        'Full compatibility with fixi.js extensions'
    ],
    excludes: [
        'None - this is full compatibility mode'
    ],
    eventChain: [
        'fx:config - Configure request before sending',
        'fx:before - Just before HTTP request',
        'fx:after - After response received',
        'fx:error - On network errors',
        'fx:finally - Always after request',
        'fx:swapped - After DOM manipulation'
    ],
    register,
    getCommand
};

export default events;