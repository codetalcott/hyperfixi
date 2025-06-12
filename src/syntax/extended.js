/**
 * Extended syntax parser for HyperFixi  
 * Handles: fetch /url with option: value, option: value
 */

import { parseOptionValue, parseColon, parseComma } from '../core/parser.js';

/**
 * Supported option names in extended syntax
 */
export const EXTENDED_OPTIONS = {
    METHOD: 'method',
    BODY: 'body', 
    HEADERS: 'headers',
    TARGET: 'target',
    PLACEMENT: 'placement'
};

/**
 * Parse extended syntax: fetch /url with option: value, option: value
 * @param {Object} parser - Hyperscript parser instance
 * @param {Object} runtime - Hyperscript runtime instance
 * @param {Object} tokens - Token stream
 * @param {Object} command - Base command object  
 * @returns {Object} Updated command with options
 */
export function parseExtendedSyntax(parser, runtime, tokens, command) {
    // Parse comma-separated options
    do {
        const optionName = parseOptionName(parser, tokens);
        parseColon(parser, tokens);
        const optionValue = parseOptionValue(parser, tokens);
        
        // Store option in appropriate location
        storeOption(command, optionName, optionValue);
        
    } while (parseComma(tokens));
    
    return command;
}

/**
 * Parse an option name token
 * @param {Object} parser - Hyperscript parser instance
 * @param {Object} tokens - Token stream
 * @returns {string} Option name
 * @throws {Error} If invalid option name
 */
function parseOptionName(parser, tokens) {
    const validOptions = Object.values(EXTENDED_OPTIONS);
    
    for (const option of validOptions) {
        if (tokens.matchToken(option)) {
            return option;
        }
    }
    
    parser.raiseParseError(tokens, 
        `Expected option name (${validOptions.join(', ')})`);
}

/**
 * Store parsed option in command object
 * @param {Object} command - Command object
 * @param {string} optionName - Option name
 * @param {Object} optionValue - Parsed option value
 */
function storeOption(command, optionName, optionValue) {
    switch (optionName) {
        case EXTENDED_OPTIONS.TARGET:
            command.target = optionValue;
            break;
        case EXTENDED_OPTIONS.PLACEMENT:
            command.placement = optionValue;
            break;
        default:
            command.options[optionName] = optionValue;
            break;
    }
}

/**
 * Check if tokens indicate extended syntax
 * @param {Object} tokens - Token stream
 * @returns {boolean} True if extended syntax detected
 */
export function isExtendedSyntax(tokens) {
    return tokens.matchToken('with');
}

/**
 * Get supported option names for extended syntax
 * @returns {Array<string>} Supported option names
 */
export function getExtendedOptions() {
    return Object.values(EXTENDED_OPTIONS);
}