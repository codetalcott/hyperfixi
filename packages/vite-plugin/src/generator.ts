/**
 * Generator
 *
 * Generates minimal LokaScript bundles based on detected usage.
 * Uses shared templates from @lokascript/core/bundle-generator.
 * Supports multilingual semantic parsing when enabled.
 */

import type { AggregatedUsage, HyperfixiPluginOptions } from './types';
import {
  COMMAND_IMPLEMENTATIONS as COMMAND_IMPL_TS,
  BLOCK_IMPLEMENTATIONS as BLOCK_IMPL_TS,
  STYLE_COMMANDS,
  ELEMENT_ARRAY_COMMANDS,
  MORPH_COMMANDS,
  LITE_PARSER_TEMPLATE,
  HYBRID_PARSER_TEMPLATE,
  canUseLiteParser,
  FULL_RUNTIME_ONLY_COMMANDS,
  isAvailableCommand,
} from '@lokascript/core/bundle-generator';
import {
  resolveSemanticConfig,
  generateSemanticIntegrationCode,
  getSemanticExports,
  getSemanticBundleSize,
  type SemanticConfig,
} from './semantic-integration';

// =============================================================================
// BUNDLE GENERATOR
// =============================================================================

/**
 * Generator options interface
 */
interface GeneratorOptions {
  name: string;
  commands: string[];
  blocks?: string[];
  positionalExpressions?: boolean;
  htmxIntegration?: boolean;
  globalName?: string;
  /** @deprecated Parser is now embedded directly. This option is ignored. */
  parserImportPath?: string;
  autoInit?: boolean;
  esModule?: boolean;
  /** Parser type to embed: 'lite' for regex-based, 'hybrid' for full AST */
  parserType?: 'lite' | 'hybrid';
}

/**
 * Strip TypeScript type annotations for JavaScript output.
 *
 * Uses comprehensive regex patterns to handle all TypeScript-specific syntax:
 * - Generic type casts: `as Record<string, any>`, `as Map<K, V>`
 * - Variable type annotations: `const x: Type = ...`
 * - Function parameter types: `(param: Type) => ...`
 * - Return type annotations: `function foo(): Type { ... }`
 * - Utility types: `Partial<T>`, `Pick<T, K>`, `Omit<T, K>`
 */
function stripTypes(code: string): string {
  return (
    code
      // Remove " as Type<...>" casts with generics (handles nested angle brackets)
      // Matches: as Record<string, any>, as Map<K, V>, as Partial<SomeType>
      .replace(/\s+as\s+\w+<[^>]*(?:<[^>]*>[^>]*)*>/g, '')
      // Remove " as Type" simple casts (after generic removal)
      .replace(/\s+as\s+\w+(?:\[\])?/g, '')
      // Remove variable/const/let type annotations with generics (including array types)
      // Matches: const x: Map<string, number>, let y: Record<K, V>, const z: Promise<void>[]
      .replace(/:\s*\w+<[^>]*(?:<[^>]*>[^>]*)*>(?:\[\])?(?=\s*[=;,)\]])/g, '')
      // Remove simple type annotations in declarations
      // Matches: const x: string, let y: number, but NOT in ternary or object literals
      .replace(
        /:\s*(?:string|number|boolean|any|unknown|void|never|null|undefined|object|symbol|bigint)(?=\s*[=;,)\]])/g,
        ''
      )
      // Remove interface/type name annotations (e.g., ": SomeInterface")
      // Only when followed by = ; , ) ] to avoid breaking ternary operators
      .replace(/:\s*[A-Z]\w*(?:\[\])?(?=\s*[=;,)\]])/g, '')
      // Remove ": Type" in catch clauses like "catch (error: unknown)"
      .replace(/\((\w+):\s*(?:\w+|unknown|any)\)/g, '($1)')
      // Remove Promise generic parameters
      .replace(/Promise<[^>]+>/g, 'Promise')
      // Remove Array generic parameters
      .replace(/Array<[^>]+>/g, 'Array')
      // Remove function return type annotations
      // Matches: function foo(): Type {, async (): Promise => {
      .replace(/\):\s*\w+(?:<[^>]*>)?(?:\[\])?\s*(?=[{=])/g, ') ')
      // Remove arrow function return types
      .replace(/\):\s*\w+(?:<[^>]*>)?\s*=>/g, ') =>')
      // Clean up any remaining TransitionEvent or specific DOM types
      .replace(
        /:\s*(?:TransitionEvent|MouseEvent|KeyboardEvent|Event|Element|HTMLElement|Node)(?=\s*[=;,)\]])/g,
        ''
      )
      // Remove non-null assertions (property! -> property)
      // Matches: block.condition!, obj.prop!, but NOT !condition or !=
      .replace(/(\w)!(?=[,;)\].\s])/g, '$1')
  );
}

// Get JavaScript-formatted implementations (type annotations stripped)
const COMMAND_IMPLEMENTATIONS: Record<string, string> = {};
const BLOCK_IMPLEMENTATIONS: Record<string, string> = {};

for (const [name, code] of Object.entries(COMMAND_IMPL_TS)) {
  COMMAND_IMPLEMENTATIONS[name] = stripTypes(code);
}

for (const [name, code] of Object.entries(BLOCK_IMPL_TS)) {
  BLOCK_IMPLEMENTATIONS[name] = stripTypes(code);
}

/**
 * Generate bundle code from configuration
 */
function generateBundleCode(config: GeneratorOptions): string {
  const {
    name,
    commands,
    blocks = [],
    htmxIntegration = false,
    globalName = 'hyperfixi',
    positionalExpressions = false,
    autoInit = true,
    esModule = true,
    parserType = 'hybrid',
  } = config;

  const needsStyleHelpers = commands.some(cmd => STYLE_COMMANDS.includes(cmd));
  const needsElementArrayHelper = commands.some(cmd => ELEMENT_ARRAY_COMMANDS.includes(cmd));
  const needsMorphlex = commands.some(cmd => MORPH_COMMANDS.includes(cmd));
  const hasBlocks = blocks.length > 0;
  const hasReturn = commands.includes('return');

  const commandCases = commands
    .filter(cmd => COMMAND_IMPLEMENTATIONS[cmd])
    .map(cmd => COMMAND_IMPLEMENTATIONS[cmd])
    .join('\n');

  const blockCases = blocks
    .filter(block => BLOCK_IMPLEMENTATIONS[block])
    .map(block => BLOCK_IMPLEMENTATIONS[block])
    .join('\n');

  // Select parser template based on type
  const parserTemplate = parserType === 'lite' ? LITE_PARSER_TEMPLATE : HYBRID_PARSER_TEMPLATE;

  // Morphlex import for DOM morphing
  const morphlexImport = needsMorphlex
    ? `import { morph as morphlexMorph, morphInner as morphlexMorphInner } from 'morphlex';\n\n`
    : '';

  return `/**
 * LokaScript ${name} Bundle (Auto-Generated)
 *
 * Generated by: @lokascript/vite-plugin
 * Parser: ${parserType}
 * Commands: ${commands.join(', ')}${blocks.length > 0 ? `\n * Blocks: ${blocks.join(', ')}` : ''}${positionalExpressions ? '\n * Positional expressions: enabled' : ''}${needsMorphlex ? '\n * Morphing: morphlex (~2.5KB)' : ''}
 *
 * DO NOT EDIT - This file is automatically regenerated.
 */

${morphlexImport}// Embedded ${parserType} parser (no external dependencies)
${parserTemplate}

// Runtime state
const globalVars = new Map();
${hasBlocks ? 'const MAX_LOOP_ITERATIONS = 1000;' : ''}

async function evaluate(node, ctx) {
  switch (node.type) {
    case 'literal': return node.value;

    case 'identifier':
      if (node.value === 'me' || node.value === 'my') return ctx.me;
      if (node.value === 'it') return ctx.it;
      if (node.value === 'you') return ctx.you;
      if (node.value === 'event') return ctx.event;
      if (node.value === 'body') return document.body;
      if (node.value === 'document') return document;
      if (node.value === 'window') return window;
      if (ctx.locals.has(node.value)) return ctx.locals.get(node.value);
      if (node.value in ctx.me) return ctx.me[node.value];
      return node.value;

    case 'contextReference':
      // Semantic AST format for context references (me, you, it, etc.)
      switch (node.contextType || node.name) {
        case 'me': return ctx.me;
        case 'it': return ctx.it;
        case 'you': return ctx.you;
        case 'event': return ctx.event;
        case 'body': return document.body;
        case 'document': return document;
        case 'window': return window;
        default: return ctx.me;
      }

    case 'variable':
      if (node.scope === 'local') return ctx.locals.get(node.name.slice(1));
      const gName = node.name.slice(1);
      if (globalVars.has(gName)) return globalVars.get(gName);
      return window[node.name];

    case 'selector':
      const elements = document.querySelectorAll(node.value);
      return elements.length === 1 ? elements[0] : Array.from(elements);

    case 'binary':
      return evaluateBinary(node, ctx);

    case 'possessive':
    case 'member':
      const obj = await evaluate(node.object, ctx);
      if (obj == null) return undefined;
      const prop = node.computed ? await evaluate(node.property, ctx) : node.property;
      return obj[prop];

    case 'call': {
      let callContext = null;
      let callee;

      if (node.callee.type === 'member' || node.callee.type === 'possessive') {
        callContext = await evaluate(node.callee.object, ctx);
        const p = node.callee.computed
          ? await evaluate(node.callee.property, ctx)
          : node.callee.property;
        callee = callContext?.[p];
      } else {
        callee = await evaluate(node.callee, ctx);
      }

      const args = await Promise.all(node.args.map(a => evaluate(a, ctx)));
      if (typeof callee === 'function') return callee.apply(callContext, args);
      return undefined;
    }
${
  positionalExpressions
    ? `
    case 'positional':
      return evaluatePositional(node, ctx);
`
    : ''
}
    default: return undefined;
  }
}

async function evaluateBinary(node, ctx) {
  if (node.operator === 'has') {
    const left = await evaluate(node.left, ctx);
    if (left instanceof Element && node.right.type === 'selector' && node.right.value.startsWith('.')) {
      return left.classList.contains(node.right.value.slice(1));
    }
    return false;
  }

  const left = await evaluate(node.left, ctx);
  const right = await evaluate(node.right, ctx);

  switch (node.operator) {
    case '+': return left + right;
    case '-': return left - right;
    case '*': return left * right;
    case '/': return left / right;
    case '%': return left % right;
    case '==': case 'is': return left == right;
    case '!=': case 'is not': return left != right;
    case '<': return left < right;
    case '>': return left > right;
    case '<=': return left <= right;
    case '>=': return left >= right;
    case 'and': case '&&': return left && right;
    case 'or': case '||': return left || right;
    case 'contains': case 'includes':
      if (typeof left === 'string') return left.includes(right);
      if (Array.isArray(left)) return left.includes(right);
      if (left instanceof Element) return left.contains(right);
      return false;
    case 'matches':
      if (left instanceof Element) return left.matches(right);
      if (typeof left === 'string') return new RegExp(right).test(left);
      return false;
    default: return undefined;
  }
}
${
  positionalExpressions
    ? `
function evaluatePositional(node, ctx) {
  const target = node.target;
  let elements = [];

  let selector = null;
  if (target.type === 'selector') {
    selector = target.value;
  } else if (target.type === 'identifier') {
    selector = target.value;
  } else if (target.type === 'htmlSelector') {
    selector = target.value;
  }
  if (selector) {
    elements = Array.from(document.querySelectorAll(selector));
  }

  switch (node.position) {
    case 'first': return elements[0] || null;
    case 'last': return elements[elements.length - 1] || null;
    case 'next': return ctx.me.nextElementSibling;
    case 'previous': return ctx.me.previousElementSibling;
    case 'closest': return target.value ? ctx.me.closest(target.value) : null;
    case 'parent': return ctx.me.parentElement;
    default: return elements[0] || null;
  }
}
`
    : ''
}
${
  needsStyleHelpers
    ? `
const isStyleProp = (prop) => prop?.startsWith('*');
const getStyleName = (prop) => prop.substring(1);
const setStyleProp = (el, prop, value) => {
  if (!isStyleProp(prop)) return false;
  el.style.setProperty(getStyleName(prop), String(value));
  return true;
};
`
    : ''
}

${
  needsElementArrayHelper
    ? `
const toElementArray = (val) => {
  if (Array.isArray(val)) return val.filter(e => e instanceof Element);
  if (val instanceof Element) return [val];
  if (typeof val === 'string') return Array.from(document.querySelectorAll(val));
  return [];
};
`
    : ''
}

async function executeCommand(cmd, ctx) {
  const getTarget = async () => {
    // Support both HybridParser (cmd.target) and semantic AST (cmd.modifiers.on) formats
    const target = cmd.target || cmd.modifiers?.on;
    if (!target) return [ctx.me];
    const t = await evaluate(target, ctx);
    if (Array.isArray(t)) return t;
    if (t instanceof Element) return [t];
    if (typeof t === 'string') return Array.from(document.querySelectorAll(t));
    return [ctx.me];
  };

  const getClassName = (node) => {
    if (!node) return '';
    if (node.type === 'selector') return node.value.slice(1);
    if (node.type === 'string' || node.type === 'literal') {
      const val = node.value;
      return typeof val === 'string' && val.startsWith('.') ? val.slice(1) : String(val);
    }
    if (node.type === 'identifier') return node.value;
    return '';
  };

  switch (cmd.name) {
${commandCases}

    default:
      console.warn(\`${name} bundle: Unknown command '\${cmd.name}'\`);
      return null;
  }
}
${
  hasBlocks
    ? `
async function executeBlock(block, ctx) {
  switch (block.type) {
${blockCases}

    default:
      console.warn(\`${name} bundle: Unknown block '\${block.type}'\`);
      return null;
  }
}
`
    : ''
}
async function executeSequence(nodes, ctx) {
  let result;
  for (const node of nodes) {
    if (node.type === 'command') {
      result = await executeCommand(node, ctx);
    }${
      hasBlocks
        ? ` else if (['if', 'repeat', 'for', 'while', 'fetch'].includes(node.type)) {
      result = await executeBlock(node, ctx);
    }`
        : ''
    }
  }
  return result;
}
${
  hasBlocks
    ? `
async function executeSequenceWithBlocks(nodes, ctx) {
  try {
    return await executeSequence(nodes, ctx);
  } catch (e) {
    if (e?.type === 'return') throw e;
    throw e;
  }
}
`
    : ''
}
async function executeAST(ast, me, event) {
  const ctx = { me, event, locals: new Map() };

  if (ast.type === 'sequence') {
    ${hasReturn || hasBlocks ? "try { return await executeSequence(ast.commands, ctx); } catch (e) { if (e?.type === 'return') return e.value; throw e; }" : 'return executeSequence(ast.commands, ctx);'}
  }

  if (ast.type === 'event') {
    const eventNode = ast;
    const eventName = eventNode.event;

    if (eventName === 'init') {
      ${hasReturn || hasBlocks ? "try { await executeSequence(eventNode.body, ctx); } catch (e) { if (e?.type !== 'return') throw e; }" : 'await executeSequence(eventNode.body, ctx);'}
      return;
    }

    const target = eventNode.filter ? await evaluate(eventNode.filter, ctx) : me;
    const targetEl = target instanceof Element ? target : me;
    const mods = eventNode.modifiers;

    let handler = async (e) => {
      if (mods.prevent) e.preventDefault();
      if (mods.stop) e.stopPropagation();

      const handlerCtx = {
        me, event: e,
        you: e.target instanceof Element ? e.target : undefined,
        locals: new Map(),
      };
      ${hasReturn || hasBlocks ? "try { await executeSequence(eventNode.body, handlerCtx); } catch (err) { if (err?.type !== 'return') throw err; }" : 'await executeSequence(eventNode.body, handlerCtx);'}
    };

    if (mods.debounce) {
      let timeout;
      const orig = handler;
      handler = async (e) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => orig(e), mods.debounce);
      };
    }

    if (mods.throttle) {
      let lastCall = 0;
      const orig = handler;
      handler = async (e) => {
        const now = Date.now();
        if (now - lastCall >= mods.throttle) {
          lastCall = now;
          await orig(e);
        }
      };
    }

    targetEl.addEventListener(eventName, handler, { once: !!mods.once });
    return;
  }

  // Handle single command (not wrapped in event or sequence)
  if (ast.type === 'command') {
    return executeCommand(ast, ctx);
  }

  return null;
}

function processElement(el) {
  const code = el.getAttribute('_');
  if (!code) return;

  try {
    const ast = ${parserType === 'lite' ? 'parseLite(code)' : 'new HybridParser(code).parse()'};
    executeAST(ast, el);
  } catch (err) {
    console.error('LokaScript ${name} error:', err, 'Code:', code);
  }
}

function processElements(root = document) {
  const elements = root.querySelectorAll('[_]');
  elements.forEach(processElement);
}

const api = {
  version: '1.0.0-${name.toLowerCase().replace(/\s+/g, '-')}',

  parse(code) {
    return ${parserType === 'lite' ? 'parseLite(code)' : 'new HybridParser(code).parse()'};
  },

  async execute(code, element) {
    const me = element || document.body;
    const ast = ${parserType === 'lite' ? 'parseLite(code)' : 'new HybridParser(code).parse()'};
    return executeAST(ast, me);
  },

  run: async (code, element) => api.execute(code, element),
  eval: async (code, element) => api.execute(code, element),

  init: processElements,
  process: processElements,

  commands: ${JSON.stringify(commands)},
  ${blocks.length > 0 ? `blocks: ${JSON.stringify(blocks)},` : ''}
  parserName: '${parserType}',
};
${
  autoInit
    ? `
if (typeof window !== 'undefined') {
  window.${globalName} = api;
  window._hyperscript = api;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => processElements());
  } else {
    processElements();
  }
${
  htmxIntegration
    ? `
  document.addEventListener('htmx:afterSettle', (e) => {
    const target = e.detail?.target;
    if (target) processElements(target);
  });
`
    : ''
}
}
`
    : ''
}
${
  esModule
    ? `
export default api;
export { api, processElements };
`
    : ''
}`;
}

// =============================================================================
// GENERATOR CLASS
// =============================================================================

/**
 * Generator class for creating minimal bundles
 */
export class Generator {
  private debug: boolean;

  constructor(options: Pick<HyperfixiPluginOptions, 'debug'>) {
    this.debug = options.debug ?? false;
  }

  /**
   * Generate bundle code from aggregated usage
   */
  generate(usage: AggregatedUsage, options: HyperfixiPluginOptions): string {
    const commands = [...usage.commands, ...(options.extraCommands ?? [])];
    const blocks = [...usage.blocks, ...(options.extraBlocks ?? [])];
    const positional = usage.positional || options.positional || false;

    // Resolve semantic configuration
    const semanticConfig = resolveSemanticConfig(options, usage.detectedLanguages);

    // If no usage detected and no semantic, return empty module
    if (commands.length === 0 && blocks.length === 0 && !positional && !semanticConfig.enabled) {
      return this.generateEmptyBundle(options);
    }

    // Check for commands that require full runtime - if found, fall back to full bundle
    const unsupportedCommands = this.getUnsupportedCommands(commands);
    if (unsupportedCommands.length > 0) {
      if (this.debug) {
        console.log(
          `[hyperfixi] Commands detected that require full runtime: ${unsupportedCommands.join(', ')}\n` +
            `  Falling back to full browser bundle for complete functionality.`
        );
      }
      return this.generateDevFallback('full');
    }

    // Select parser type: use lite if possible for smaller bundles
    const parserType = canUseLiteParser(commands, blocks, positional) ? 'lite' : 'hybrid';

    const config: GeneratorOptions = {
      name: options.bundleName ?? 'ViteAutoGenerated',
      commands,
      blocks,
      positionalExpressions: positional,
      htmxIntegration: options.htmx ?? usage.htmx?.hasHtmxAttributes ?? false,
      globalName: options.globalName ?? 'hyperfixi',
      parserType,
      autoInit: true,
      esModule: true,
    };

    if (this.debug) {
      const bundleInfo: Record<string, unknown> = {
        commands,
        blocks,
        positional,
        htmx: config.htmxIntegration,
        semantic: semanticConfig.enabled,
        parserType,
      };

      if (semanticConfig.enabled && semanticConfig.bundleType) {
        const sizeInfo = getSemanticBundleSize(semanticConfig.bundleType);
        bundleInfo.semanticBundle = semanticConfig.bundleType;
        bundleInfo.semanticSize = sizeInfo.gzip;
        bundleInfo.languages = [...semanticConfig.languages];
        bundleInfo.grammar = semanticConfig.grammarEnabled;
      }

      console.log('[hyperfixi] Generating bundle:', bundleInfo);

      // Warn if semantic bundle is large
      if (semanticConfig.bundleType === 'all' || semanticConfig.bundleType === 'priority') {
        console.log(
          `[hyperfixi] Note: Using '${semanticConfig.bundleType}' semantic bundle (${getSemanticBundleSize(semanticConfig.bundleType).gzip}). ` +
            `Consider using 'region' option to select a smaller regional bundle if all languages aren't needed.`
        );
      }
    }

    // Generate base bundle code
    let bundleCode = generateBundleCode(config);

    // Add semantic integration if enabled
    if (semanticConfig.enabled) {
      bundleCode = this.addSemanticIntegration(bundleCode, semanticConfig);
    }

    return bundleCode;
  }

  /**
   * Add semantic integration code to the bundle
   */
  private addSemanticIntegration(bundleCode: string, config: SemanticConfig): string {
    const semanticCode = generateSemanticIntegrationCode(config);
    const semanticExports = getSemanticExports(config);

    // Insert semantic imports after the parser imports
    const parserImportEnd = bundleCode.indexOf('// Runtime state');
    if (parserImportEnd === -1) {
      // Fallback: prepend to code
      bundleCode = semanticCode + '\n' + bundleCode;
    } else {
      bundleCode =
        bundleCode.slice(0, parserImportEnd) +
        semanticCode +
        '\n\n' +
        bundleCode.slice(parserImportEnd);
    }

    // Replace parser usage with parseWithSemantic in processElement
    // Matches both: `const ast = new HybridParser(code).parse();` and `const ast = parseLite(code);`
    bundleCode = bundleCode.replace(
      /function processElement\(el\) \{\s*const code = el\.getAttribute\('_'\);\s*if \(!code\) return;\s*try \{\s*const ast = (?:new HybridParser\(code\)\.parse\(\)|parseLite\(code\));/g,
      `function processElement(el) {
  const code = el.getAttribute('_');
  if (!code) return;

  try {
    const ast = parseWithSemantic(code);`
    );

    // Replace parser usage in api.parse
    // Matches both: `return new HybridParser(code).parse();` and `return parseLite(code);`
    bundleCode = bundleCode.replace(
      /parse\(code\) \{\s*return (?:new HybridParser\(code\)\.parse\(\)|parseLite\(code\));/g,
      `parse(code, lang = null) {
    return parseWithSemantic(code, lang);`
    );

    // Replace parser usage in api.execute
    // Matches both: `const ast = new HybridParser(code).parse();` and `const ast = parseLite(code);`
    bundleCode = bundleCode.replace(
      /async execute\(code, element\) \{\s*const me = element \|\| document\.body;\s*const ast = (?:new HybridParser\(code\)\.parse\(\)|parseLite\(code\));/g,
      `async execute(code, element, lang = null) {
    const me = element || document.body;
    const ast = parseWithSemantic(code, lang);`
    );

    // Add semantic exports to the api object
    if (semanticExports.length > 0) {
      // Match parserName with either 'lite' or 'hybrid' value
      const apiExportsMarkerRegex = /parserName: '(?:lite|hybrid)',/;
      const additionalApiProps = semanticExports.map(exp => `  ${exp},`).join('\n');
      bundleCode = bundleCode.replace(
        apiExportsMarkerRegex,
        `parserName: 'semantic',\n${additionalApiProps}`
      );
    }

    return bundleCode;
  }

  /**
   * Get commands that require the full runtime and are not available in generated bundles
   */
  private getUnsupportedCommands(commands: string[]): string[] {
    const unsupported: string[] = [];

    for (const cmd of commands) {
      if (FULL_RUNTIME_ONLY_COMMANDS.includes(cmd as (typeof FULL_RUNTIME_ONLY_COMMANDS)[number])) {
        unsupported.push(cmd);
      } else if (!isAvailableCommand(cmd) && !COMMAND_IMPLEMENTATIONS[cmd]) {
        // Command exists but has no implementation in lite bundles
        unsupported.push(cmd);
      }
    }

    return unsupported;
  }

  /**
   * Check if any commands require full runtime and should trigger fallback
   */
  requiresFullRuntime(commands: string[]): boolean {
    return this.getUnsupportedCommands(commands).length > 0;
  }

  /**
   * Generate an empty bundle when no hyperscript is detected
   */
  private generateEmptyBundle(options: HyperfixiPluginOptions): string {
    const globalName = options.globalName ?? 'hyperfixi';

    return `/**
 * LokaScript Empty Bundle (Auto-Generated)
 *
 * No hyperscript usage detected. This bundle provides a minimal API.
 * Add hyperscript attributes (_="...") to your HTML to enable features.
 *
 * Generated by: @lokascript/vite-plugin
 */

const api = {
  version: '1.0.0-empty',
  commands: [],
  parserName: 'none',

  parse() {
    console.warn('LokaScript: No parser loaded. Add hyperscript to your HTML to enable parsing.');
    return { type: 'empty' };
  },

  async execute(code, element) {
    console.warn('LokaScript: No commands loaded. Detected commands will be automatically included.');
    return null;
  },

  run: async (code, element) => api.execute(code, element),
  eval: async (code, element) => api.execute(code, element),

  init() {},
  process() {},
};

if (typeof window !== 'undefined') {
  (window).${globalName} = api;
  (window)._hyperscript = api;
}

export default api;
export { api };
`;
  }

  /**
   * Generate a development fallback bundle
   */
  generateDevFallback(fallback: 'hybrid-complete' | 'full'): string {
    const bundle =
      fallback === 'full' ? '@lokascript/core/browser' : '@lokascript/core/browser/hybrid-complete';

    return `/**
 * LokaScript Dev Fallback Bundle
 *
 * Using pre-built ${fallback} bundle for faster development.
 * Production builds will generate minimal bundles.
 *
 * Generated by: @lokascript/vite-plugin
 */

export * from '${bundle}';
export { default } from '${bundle}';
`;
  }
}
