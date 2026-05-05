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
 * This wrapper forces 'hyperscript' mode via HYPERSCRIPT_LS_DEFAULT_MODE.
 * A dynamic import (not a static `import` declaration) is required: ESM
 * hoists static imports above sibling statements, which would cause the
 * underlying server to read the env var before it was set.
 */

process.env.HYPERSCRIPT_LS_DEFAULT_MODE = 'hyperscript';

// Indirection through a variable specifier: the underlying server is a
// side-effect-only entry point (no exports), so its emitted .d.ts isn't a
// module. TypeScript only enforces the "is a module" check on dynamic
// imports with literal-string specifiers, not variable specifiers.
const serverModule = '@lokascript/language-server';
await import(serverModule);

export {};
