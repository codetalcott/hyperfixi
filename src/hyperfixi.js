// HyperFixi: Complete _hyperscript + fixi.js integration
// Implements unified fetch syntax with full fixi event compatibility
(function() {
    'use strict';
    
    console.log('🔧 Loading HyperFixi integration...');
    
    // Ensure dependencies are loaded
    if (typeof _hyperscript === 'undefined') {
        console.error('❌ _hyperscript not found');
        return;
    }
    
    console.log('✅ _hyperscript found:', _hyperscript.version);
    
    // Add the fetch command to hyperscript
    _hyperscript.addCommand('fetch', function(parser, runtime, tokens) {
        console.log('🔧 Parsing fetch command...');
        
        // Parse the URL (required first argument)
        let url = parser.parseElementExpression();
        if (!url) {
            parser.raiseParseError(tokens, "Expected URL after 'fetch'");
        }
        
        console.log('📝 Parsed URL expression');
        
        // Initialize command structure
        let command = {
            url: url,
            placement: null,
            target: null,
            options: {}
        };
        
        // Check what comes next to determine syntax form
        if (tokens.matchToken('with')) {
            // Extended syntax: fetch /url with method: 'POST', body: data
            command = parseExtendedSyntax(parser, runtime, tokens, command);
        } else {
            // Shorthand syntax: fetch /url [and] <placement> <target>
            command = parseShorthandSyntax(parser, runtime, tokens, command);
        }
        
        console.log('✅ Command parsed:', command);
        
        // Return the runtime execution step
        return {
            args: [command],
            execute: function(ctx) {
                return executeCommand.call(this, ctx, command, runtime);
            }
        };
    });
    
    // Parse shorthand syntax: fetch /url [and] <placement> <target>
    function parseShorthandSyntax(parser, runtime, tokens, command) {
        // Optional 'and' connector
        tokens.matchToken('and');
        
        // Look for placement keywords
        if (tokens.matchToken('replace')) {
            command.placement = 'replace';
            command.target = parser.parseElementExpression();
            console.log('📝 Parsed replace placement');
        } else if (tokens.matchToken('put')) {
            if (!tokens.matchToken('into')) {
                parser.raiseParseError(tokens, "Expected 'into' after 'put'");
            }
            command.placement = 'put into';
            command.target = parser.parseElementExpression();
            console.log('📝 Parsed put into placement');
        } else if (tokens.matchToken('append')) {
            if (!tokens.matchToken('to')) {
                parser.raiseParseError(tokens, "Expected 'to' after 'append'");
            }
            command.placement = 'append to';
            command.target = parser.parseElementExpression();
            console.log('📝 Parsed append to placement');
        } else if (tokens.matchToken('prepend')) {
            if (!tokens.matchToken('to')) {
                parser.raiseParseError(tokens, "Expected 'to' after 'prepend'");
            }
            command.placement = 'prepend to';
            command.target = parser.parseElementExpression();
            console.log('📝 Parsed prepend to placement');
        }
        
        return command;
    }
    
    // Parse extended syntax: fetch /url with option: value, option: value
    function parseExtendedSyntax(parser, runtime, tokens, command) {
        console.log('📝 Parsing extended syntax...');
        
        // Parse comma-separated options
        do {
            // Look for known option names
            let optionName = null;
            if (tokens.matchToken('method')) {
                optionName = 'method';
            } else if (tokens.matchToken('body')) {
                optionName = 'body';
            } else if (tokens.matchToken('headers')) {
                optionName = 'headers';
            } else if (tokens.matchToken('target')) {
                optionName = 'target';
            } else if (tokens.matchToken('placement')) {
                optionName = 'placement';
            } else {
                parser.raiseParseError(tokens, "Expected option name (method, body, headers, target, placement)");
            }
            
            if (!tokens.matchToken(':')) {
                parser.raiseParseError(tokens, "Expected ':' after option name");
            }
            
            let optionValue = parser.parseElementExpression();
            
            // Store in appropriate place
            if (optionName === 'target') {
                command.target = optionValue;
            } else if (optionName === 'placement') {
                command.placement = optionValue;
            } else {
                command.options[optionName] = optionValue;
            }
            
            console.log(`📝 Parsed option: ${optionName}`);
            
        } while (tokens.matchToken(','));
        
        return command;
    }
    
    // Execute the fetch command with full fixi event compatibility
    async function executeCommand(ctx, command, runtime) {
        let cfg = null;
        
        try {
            console.log('🚀 Executing fetch command:', command);
            
            // Get the triggering element
            const element = ctx.me;
            
            // Evaluate dynamic expressions
            const url = await runtime.resolve(command.url, ctx);
            console.log('🌐 Resolved URL:', url);
            
            // Build fixi-style config object
            cfg = {
                url: url,
                method: 'GET',
                headers: {},
                target: element,
                swap: 'outerHTML',
                trigger: ctx.event
            };
            
            // Configure request options
            if (command.options.method) {
                cfg.method = await runtime.resolve(command.options.method, ctx);
                console.log('🔧 Method:', cfg.method);
            }
            
            if (command.options.body) {
                cfg.body = await runtime.resolve(command.options.body, ctx);
                console.log('📦 Body:', cfg.body);
            }
            
            if (command.options.headers) {
                cfg.headers = { ...cfg.headers, ...await runtime.resolve(command.options.headers, ctx) };
                console.log('📋 Headers:', cfg.headers);
            }
            
            // Configure target and placement
            if (command.target) {
                cfg.target = await runtime.resolve(command.target, ctx);
                console.log('🎯 Target element:', cfg.target);
            }
            
            if (command.placement) {
                const placement = typeof command.placement === 'string' ? 
                    command.placement : 
                    await runtime.resolve(command.placement, ctx);
                
                // Map placement to fixi swap method
                switch (placement) {
                    case 'replace':
                        cfg.swap = 'outerHTML';
                        break;
                    case 'put into':
                        cfg.swap = 'innerHTML';
                        break;
                    case 'append to':
                        cfg.swap = 'beforeend';
                        break;
                    case 'prepend to':
                        cfg.swap = 'afterbegin';
                        break;
                    default:
                        cfg.swap = placement; // Allow custom swap methods
                }
            }
            
            // Emit fx:config event (fixi compatibility)
            const configEvent = new CustomEvent('fx:config', {
                detail: { cfg: cfg },
                bubbles: true,
                cancelable: true
            });
            
            element.dispatchEvent(configEvent);
            
            if (configEvent.defaultPrevented) {
                console.log('🚫 Request canceled by fx:config event');
                return;
            }
            
            // Emit fx:before event
            const beforeEvent = new CustomEvent('fx:before', {
                detail: { cfg: cfg },
                bubbles: true,
                cancelable: true
            });
            
            element.dispatchEvent(beforeEvent);
            
            if (beforeEvent.defaultPrevented) {
                console.log('🚫 Request canceled by fx:before event');
                return;
            }
            
            // Execute fetch with current config
            const fetchOptions = {
                method: cfg.method,
                body: cfg.body,
                headers: cfg.headers
            };
            
            const response = await fetch(cfg.url, fetchOptions);
            const text = await response.text();
            
            console.log('📨 Received response:', text);
            
            // Add response data to config
            cfg.response = response;
            cfg.text = text;
            
            // Emit fx:after event
            const afterEvent = new CustomEvent('fx:after', {
                detail: { cfg: cfg },
                bubbles: true,
                cancelable: true
            });
            
            element.dispatchEvent(afterEvent);
            
            if (afterEvent.defaultPrevented) {
                console.log('🚫 Swapping canceled by fx:after event');
                return text; // Still return response for then clauses
            }
            
            // Handle DOM manipulation using config
            if (cfg.target && cfg.text) {
                console.log('🎯 Swapping content using method:', cfg.swap);
                
                switch (cfg.swap) {
                    case 'outerHTML':
                        cfg.target.outerHTML = cfg.text;
                        console.log('🔄 Replaced element');
                        break;
                    case 'innerHTML':
                        cfg.target.innerHTML = cfg.text;
                        console.log('📥 Put content into element');
                        break;
                    case 'beforeend':
                        cfg.target.insertAdjacentHTML('beforeend', cfg.text);
                        console.log('➕ Appended content');
                        break;
                    case 'afterbegin':
                        cfg.target.insertAdjacentHTML('afterbegin', cfg.text);
                        console.log('⬆️ Prepended content');
                        break;
                    default:
                        console.log('ℹ️ Custom swap method:', cfg.swap);
                        if (typeof cfg.swap === 'function') {
                            cfg.swap(cfg);
                        } else {
                            // Default to outerHTML
                            cfg.target.outerHTML = cfg.text;
                        }
                }
                
                // Emit fx:swapped event
                const swappedEvent = new CustomEvent('fx:swapped', {
                    detail: { cfg: cfg },
                    bubbles: true
                });
                
                // Dispatch on document if element was removed
                try {
                    if (document.contains(element)) {
                        element.dispatchEvent(swappedEvent);
                    } else {
                        document.dispatchEvent(swappedEvent);
                    }
                } catch (e) {
                    document.dispatchEvent(swappedEvent);
                }
            }
            
            console.log('✅ Fetch completed successfully');
            return text;
            
        } catch (error) {
            console.error('❌ Fetch error:', error);
            
            // Emit fx:error event (fixi compatibility)
            const errorEvent = new CustomEvent('fx:error', {
                detail: { 
                    error: error, 
                    cfg: cfg || { url: url }, 
                    command: command 
                },
                bubbles: true
            });
            
            if (ctx.me) {
                ctx.me.dispatchEvent(errorEvent);
            }
            
            // Also emit fixi:error for hyperscript event handlers
            const fixiErrorEvent = new CustomEvent('fixi:error', {
                detail: { 
                    error: error, 
                    command: command 
                },
                bubbles: true
            });
            
            if (ctx.me) {
                ctx.me.dispatchEvent(fixiErrorEvent);
            }
            
            throw error;
        } finally {
            // Emit fx:finally event
            if (cfg && ctx.me) {
                const finallyEvent = new CustomEvent('fx:finally', {
                    detail: { cfg: cfg },
                    bubbles: true
                });
                
                ctx.me.dispatchEvent(finallyEvent);
            }
        }
    }
    
    console.log('✅ HyperFixi integration loaded successfully');
    
})();