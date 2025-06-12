/**
 * Hyperscript integration for HyperFixi
 * Handles command registration and execution orchestration
 */

import { parseURL, createBaseCommand } from '../core/parser.js';
import { resolveExpression, buildFetchOptions, executeHTTPRequest, createFixiConfig } from '../core/executor.js';
import { mapPlacementToSwap, applySwap } from '../core/dom.js';

/**
 * Create a fetch command function for hyperscript registration
 * @param {Object} options - Configuration options
 * @param {Function} options.syntaxParser - Syntax parsing function
 * @param {Function} options.eventHandler - Event handling function (optional)
 * @returns {Function} Hyperscript command function
 */
export function createFetchCommand(options = {}) {
    const { syntaxParser, eventHandler = null } = options;
    
    if (!syntaxParser) {
        throw new Error('syntaxParser is required');
    }
    
    return function(parser, runtime, tokens) {
        // Parse the URL (required first argument)
        const url = parseURL(parser, tokens);
        
        // Create base command structure
        let command = createBaseCommand(url);
        
        // Parse syntax using provided parser
        command = syntaxParser(parser, runtime, tokens, command);
        
        // Return runtime execution step
        return {
            args: [command],
            execute: function(ctx) {
                return executeCommand(ctx, command, runtime, eventHandler);
            }
        };
    };
}

/**
 * Execute a parsed fetch command
 * @param {Object} ctx - Hyperscript execution context
 * @param {Object} command - Parsed command object
 * @param {Object} runtime - Hyperscript runtime
 * @param {Function|null} eventHandler - Optional event handler
 * @returns {Promise<string>} Response text
 */
async function executeCommand(ctx, command, runtime, eventHandler = null) {
    const element = ctx.me;
    let cfg = null;
    
    try {
        // Resolve dynamic expressions
        const url = await resolveExpression(command.url, runtime, ctx);
        const target = command.target ? 
            await resolveExpression(command.target, runtime, ctx) : element;
        
        // Build fetch options
        const fetchOptions = await buildFetchOptions(command, runtime, ctx);
        
        // Resolve placement if it's an expression
        const placement = typeof command.placement === 'string' ? 
            command.placement : 
            await resolveExpression(command.placement, runtime, ctx);
        
        const swapStrategy = mapPlacementToSwap(placement);
        
        // Create fixi-style config
        cfg = createFixiConfig(url, fetchOptions, element, ctx.event, target, swapStrategy);
        
        // Handle events if event handler provided
        if (eventHandler) {
            const shouldContinue = await eventHandler.handleBeforeEvents(element, cfg);
            if (!shouldContinue) return;
        }
        
        // Execute HTTP request
        const { response, text } = await executeHTTPRequest(url, fetchOptions);
        
        // Update config with response
        cfg.response = response;
        cfg.text = text;
        
        // Handle after events
        if (eventHandler) {
            const shouldSwap = await eventHandler.handleAfterEvents(element, cfg);
            if (!shouldSwap) return text;
        }
        
        // Apply DOM changes
        if (cfg.target && cfg.text) {
            applySwap(cfg.target, cfg.text, cfg.swap);
            
            // Handle swapped events
            if (eventHandler) {
                eventHandler.handleSwappedEvents(element, cfg);
            }
        }
        
        return text;
        
    } catch (error) {
        // Handle error events
        if (eventHandler) {
            eventHandler.handleErrorEvents(element, error, cfg, command);
        }
        throw error;
    } finally {
        // Handle finally events
        if (eventHandler && cfg) {
            eventHandler.handleFinallyEvents(element, cfg);
        }
    }
}

/**
 * Register a fetch command with hyperscript
 * @param {Object} hyperscript - Hyperscript instance
 * @param {Function} commandFunction - Command function to register
 * @param {string} commandName - Command name (default: 'fetch')
 */
export function registerCommand(hyperscript, commandFunction, commandName = 'fetch') {
    if (!hyperscript || !hyperscript.addCommand) {
        throw new Error('Invalid hyperscript instance');
    }
    
    hyperscript.addCommand(commandName, commandFunction);
}

/**
 * Create and register a fetch command in one step
 * @param {Object} hyperscript - Hyperscript instance
 * @param {Object} options - Command configuration options
 * @param {string} commandName - Command name (default: 'fetch')
 */
export function registerFetchCommand(hyperscript, options = {}, commandName = 'fetch') {
    const commandFunction = createFetchCommand(options);
    registerCommand(hyperscript, commandFunction, commandName);
}