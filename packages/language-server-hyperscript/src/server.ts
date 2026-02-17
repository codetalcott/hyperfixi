#!/usr/bin/env node
/**
 * Hyperscript Language Server (original _hyperscript mode)
 *
 * Thin wrapper around @lokascript/language-server that defaults to
 * 'hyperscript' mode — enforcing _hyperscript-compatible syntax only.
 *
 * The underlying language server supports multiple modes:
 * - 'hyperscript': English-only, _hyperscript-compatible commands
 * - 'hyperscript-i18n': Multilingual _hyperscript-compatible commands
 * - 'lokascript': Full LokaScript extensions
 * - 'auto': Detect based on available packages
 *
 * This wrapper forces 'hyperscript' mode by setting the
 * HYPERSCRIPT_LS_DEFAULT_MODE environment variable before the
 * language server module initializes.
 */

// Set the default mode before importing the server
process.env.HYPERSCRIPT_LS_DEFAULT_MODE = 'hyperscript';

// The language server starts itself on import (module-level execution)
import '@lokascript/language-server';
