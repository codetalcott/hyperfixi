/**
 * Throwing shim for @hyperfixi/engine.
 *
 * The language server dynamically imports @hyperfixi/engine in a try/catch (for parse
 * errors and positions). This shim throws on import so the catch block fires and the server
 * uses its Chevrotain parser + fallback diagnostics instead, as standalone mode always has.
 * (Until Phase C4 the server imported @hyperfixi/core here, shimmed the same way.)
 */
throw new Error('shim: @hyperfixi/engine not available in standalone mode');
