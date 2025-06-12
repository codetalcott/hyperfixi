/**
 * Shorthand syntax parser for HyperFixi
 * Handles: fetch /url [and] <placement> <target>
 */

import { parseTarget, parseOptionalAnd } from '../core/parser.js';

/**
 * Parse shorthand syntax: fetch /url [and] <placement> <target>
 * @param {Object} parser - Hyperscript parser instance
 * @param {Object} runtime - Hyperscript runtime instance  
 * @param {Object} tokens - Token stream
 * @param {Object} command - Base command object
 * @returns {Object} Updated command with placement and target
 */
export function parseShorthandSyntax(parser, runtime, tokens, command) {
    // Optional 'and' connector for readability
    parseOptionalAnd(tokens);
    
    // Parse placement keywords
    if (tokens.matchToken('replace')) {
        command.placement = 'replace';
        command.target = parseTarget(parser, tokens);
    } else if (tokens.matchToken('put')) {
        if (!tokens.matchToken('into')) {
            parser.raiseParseError(tokens, "Expected 'into' after 'put'");
        }
        command.placement = 'put into';
        command.target = parseTarget(parser, tokens);
    } else if (tokens.matchToken('append')) {
        if (!tokens.matchToken('to')) {
            parser.raiseParseError(tokens, "Expected 'to' after 'append'");
        }
        command.placement = 'append to';
        command.target = parseTarget(parser, tokens);
    } else if (tokens.matchToken('prepend')) {
        if (!tokens.matchToken('to')) {
            parser.raiseParseError(tokens, "Expected 'to' after 'prepend'");
        }
        command.placement = 'prepend to';
        command.target = parseTarget(parser, tokens);
    }
    
    return command;
}

/**
 * Check if tokens indicate shorthand syntax
 * @param {Object} tokens - Token stream  
 * @returns {boolean} True if shorthand syntax detected
 */
export function isShorthandSyntax(tokens) {
    // Peek at next token without consuming
    const nextToken = tokens.currentToken();
    
    if (!nextToken) return true; // No more tokens = basic fetch
    
    // Check for shorthand keywords
    const shorthandKeywords = ['and', 'replace', 'put', 'append', 'prepend'];
    return shorthandKeywords.includes(nextToken.value);
}

/**
 * Get supported placement keywords for shorthand syntax
 * @returns {Array<string>} Supported placement keywords
 */
export function getShorthandPlacements() {
    return ['replace', 'put into', 'append to', 'prepend to'];
}