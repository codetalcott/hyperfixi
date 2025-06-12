/**
 * Core parsing utilities for HyperFixi
 * Pure functions for parsing hyperscript tokens
 */

/**
 * Parse a URL expression from hyperscript tokens
 * @param {Object} parser - Hyperscript parser instance
 * @param {Object} tokens - Token stream
 * @returns {Object} Parsed URL expression
 */
export function parseURL(parser, tokens) {
    const url = parser.parseElementExpression();
    if (!url) {
        parser.raiseParseError(tokens, "Expected URL after 'fetch'");
    }
    return url;
}

/**
 * Parse a target selector expression
 * @param {Object} parser - Hyperscript parser instance
 * @param {Object} tokens - Token stream
 * @returns {Object} Parsed target expression
 */
export function parseTarget(parser, tokens) {
    return parser.parseElementExpression();
}

/**
 * Parse an option value expression
 * @param {Object} parser - Hyperscript parser instance
 * @param {Object} tokens - Token stream
 * @returns {Object} Parsed option value expression
 */
export function parseOptionValue(parser, tokens) {
    return parser.parseElementExpression();
}

/**
 * Parse a colon separator ':'
 * @param {Object} parser - Hyperscript parser instance
 * @param {Object} tokens - Token stream
 * @throws {Error} If colon not found
 */
export function parseColon(parser, tokens) {
    if (!tokens.matchToken(':')) {
        parser.raiseParseError(tokens, "Expected ':' after option name");
    }
}

/**
 * Parse comma separator ','
 * @param {Object} tokens - Token stream
 * @returns {boolean} True if comma was found and consumed
 */
export function parseComma(tokens) {
    return tokens.matchToken(',');
}

/**
 * Parse optional 'and' connector
 * @param {Object} tokens - Token stream
 * @returns {boolean} True if 'and' was found and consumed
 */
export function parseOptionalAnd(tokens) {
    return tokens.matchToken('and');
}

/**
 * Create a base command structure
 * @param {Object} url - Parsed URL expression
 * @returns {Object} Base command object
 */
export function createBaseCommand(url) {
    return {
        url: url,
        placement: null,
        target: null,
        options: {}
    };
}