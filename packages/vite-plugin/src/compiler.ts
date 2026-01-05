/**
 * Compiler
 *
 * Compiles hyperscript AST to JavaScript at build time.
 * Eliminates the need for runtime parsing.
 *
 * Multilingual support:
 * - For English: Uses HybridParser directly
 * - For other languages: Uses semantic parser to translate → AST → JavaScript
 * - Semantic parsing happens at BUILD time (zero runtime overhead)
 */

import { HybridParser } from '@hyperfixi/core/parser/hybrid/parser-core';
import type {
  ASTNode,
  CommandNode,
  EventNode,
  VariableNode,
  MemberNode,
  PossessiveNode,
  BinaryNode,
  CallNode,
  IdentifierNode,
  SelectorNode,
  LiteralNode,
  PositionalNode,
} from '@hyperfixi/core/parser/hybrid/ast-types';

// =============================================================================
// SEMANTIC PARSER INTEGRATION (optional)
// =============================================================================

/**
 * Semantic analyzer interface for multilingual support.
 * This matches the interface from @hyperfixi/semantic.
 */
interface SemanticAnalysisResult {
  confidence: number;
  node?: unknown;
  errors?: string[];
}

interface SemanticAnalyzer {
  analyze(input: string, language: string): SemanticAnalysisResult;
  supportsLanguage(language: string): boolean;
}

type BuildASTFn = (node: unknown) => { ast: ASTNode; warnings: string[] };

/**
 * Optional semantic parser for multilingual support.
 * Set via setSemanticParser() when semantic package is available.
 */
let semanticAnalyzer: SemanticAnalyzer | null = null;
let buildASTFn: BuildASTFn | null = null;

/**
 * Configure the semantic parser for multilingual compilation.
 * Call this with the semantic analyzer from @hyperfixi/semantic.
 *
 * @example
 * ```typescript
 * import { createSemanticAnalyzer, buildAST } from '@hyperfixi/semantic';
 * import { setSemanticParser } from '@hyperfixi/vite-plugin';
 *
 * setSemanticParser(createSemanticAnalyzer(), buildAST);
 * ```
 */
export function setSemanticParser(
  analyzer: SemanticAnalyzer,
  buildAST: BuildASTFn
): void {
  semanticAnalyzer = analyzer;
  buildASTFn = buildAST;
}

/**
 * Clear the semantic parser (for testing).
 */
export function clearSemanticParser(): void {
  semanticAnalyzer = null;
  buildASTFn = null;
}

/**
 * Check if semantic parser is available.
 */
export function hasSemanticParser(): boolean {
  return semanticAnalyzer !== null && buildASTFn !== null;
}

/**
 * Confidence threshold for using semantic parse results.
 */
const SEMANTIC_CONFIDENCE_THRESHOLD = 0.7;

// =============================================================================
// MULTILINGUAL PREPROCESSING
// =============================================================================

/**
 * Multilingual command aliases for preprocessing.
 * Maps non-ASCII keywords to English equivalents.
 */
let multilingualAliases: Record<string, string> = {};
let multilingualRegex: RegExp | null = null;

/**
 * Configure multilingual aliases for preprocessing.
 * This allows compilation of non-ASCII keywords by translating them to English
 * before parsing with HybridParser.
 *
 * @example
 * ```typescript
 * setMultilingualAliases({
 *   'トグル': 'toggle',
 *   '切り替え': 'toggle',
 *   '追加': 'add',
 *   'alternar': 'toggle',
 *   '토글': 'toggle',
 * });
 * ```
 */
export function setMultilingualAliases(aliases: Record<string, string>): void {
  multilingualAliases = { ...aliases };

  if (Object.keys(aliases).length > 0) {
    // Build regex pattern to match multilingual keywords
    const escapedKeys = Object.keys(aliases)
      .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|');
    multilingualRegex = new RegExp(`(^|\\s)(${escapedKeys})(?=\\s|\\.|$)`, 'g');
  } else {
    multilingualRegex = null;
  }
}

/**
 * Clear multilingual aliases (for testing).
 */
export function clearMultilingualAliases(): void {
  multilingualAliases = {};
  multilingualRegex = null;
}

/**
 * Get currently configured multilingual aliases.
 */
export function getMultilingualAliases(): Record<string, string> {
  return { ...multilingualAliases };
}

/**
 * Preprocess code to replace non-ASCII keywords with English equivalents.
 * This is needed because HybridParser's tokenizer only accepts ASCII identifiers.
 */
function preprocessMultilingual(code: string): string {
  if (!multilingualRegex) return code;

  return code.replace(multilingualRegex, (match, prefix, keyword) => {
    const english = multilingualAliases[keyword];
    return english ? prefix + english : match;
  });
}

// =============================================================================
// SANITIZATION UTILITIES
// =============================================================================

/**
 * Sanitize a class name for safe interpolation into JavaScript string literals.
 * Only allows valid CSS class name characters.
 */
function sanitizeClassName(name: string): string | null {
  // CSS class names: must start with letter, underscore, or hyphen
  // followed by letters, digits, underscores, or hyphens
  if (!/^-?[a-zA-Z_][a-zA-Z0-9_-]*$/.test(name)) {
    return null; // Invalid class name - fall back to runtime
  }
  return name;
}

/**
 * Sanitize a CSS selector for safe interpolation into JavaScript string literals.
 * Escapes characters that could break out of string context.
 */
function sanitizeSelector(selector: string): string {
  return selector
    .replace(/\\/g, '\\\\')  // Escape backslashes first
    .replace(/'/g, "\\'")     // Escape single quotes
    .replace(/\n/g, '\\n')    // Escape newlines
    .replace(/\r/g, '\\r')    // Escape carriage returns
    .replace(/\0/g, '');      // Remove null bytes
}

// =============================================================================
// TYPES
// =============================================================================

export interface CompiledHandler {
  /** Unique handler ID (h0, h1, etc.) */
  id: string;

  /** Event name (click, input, etc.) */
  event: string;

  /** Event modifiers */
  modifiers: {
    prevent?: boolean;
    stop?: boolean;
    once?: boolean;
    debounce?: number;
    throttle?: number;
  };

  /** Compiled JavaScript code */
  code: string;

  /** Whether handler needs the mini-evaluator for dynamic expressions */
  needsEvaluator: boolean;

  /** Original hyperscript for debugging */
  original: string;
}

export interface CompilationResult {
  /** All compiled handlers */
  handlers: CompiledHandler[];

  /** Whether any handler needs the expression evaluator */
  needsEvaluator: boolean;

  /** Whether any handler needs locals support */
  needsLocals: boolean;

  /** Whether any handler needs globals support */
  needsGlobals: boolean;

  /** Warnings during compilation */
  warnings: string[];

  /** Scripts that couldn't be compiled (need full runtime) */
  fallbacks: Array<{ id: string; script: string; reason: string }>;
}

// =============================================================================
// COMPILER
// =============================================================================

/**
 * Simple hash function for generating stable handler IDs.
 * Uses djb2 algorithm - fast and produces good distribution.
 */
function hashScript(script: string): string {
  let hash = 5381;
  for (let i = 0; i < script.length; i++) {
    hash = ((hash << 5) + hash) ^ script.charCodeAt(i);
  }
  // Convert to base36 for shorter IDs, take first 4 chars
  return Math.abs(hash).toString(36).slice(0, 4);
}

// Track used IDs to handle collisions
const usedIds = new Set<string>();

/**
 * Reset compiler state (for testing and between builds)
 */
export function resetCompiler(): void {
  usedIds.clear();
}

/**
 * Generate a semantic handler ID based on event, command, and content hash.
 * Format: {event}_{command}_{hash}
 * Example: click_toggle_3a2b
 */
function generateHandlerId(event: string, command: string, script: string): string {
  const hash = hashScript(script);
  let id = `${event}_${command}_${hash}`;

  // Handle unlikely hash collisions by appending a suffix
  let suffix = 0;
  while (usedIds.has(id)) {
    id = `${event}_${command}_${hash}${suffix++}`;
  }

  usedIds.add(id);
  return id;
}

/**
 * Compile options for multilingual support.
 */
export interface CompileOptions {
  /** Language code (ISO 639-1). Defaults to 'en'. */
  language?: string;
  /** Enable debug logging. */
  debug?: boolean;
}

/**
 * Compile a hyperscript string to JavaScript.
 *
 * For non-English languages, uses the semantic parser (if available)
 * to translate the input to an AST before compilation.
 *
 * @param script - The hyperscript code to compile
 * @param options - Compilation options including language
 * @returns Compiled handler or null if compilation failed
 */
export function compile(script: string, options: CompileOptions = {}): CompiledHandler | null {
  const { language = 'en', debug = false } = options;

  try {
    let ast: ASTNode;

    // For non-English, try semantic parser first
    if (language !== 'en' && semanticAnalyzer && buildASTFn) {
      if (semanticAnalyzer.supportsLanguage(language)) {
        const result = semanticAnalyzer.analyze(script, language);

        if (result.node && result.confidence >= SEMANTIC_CONFIDENCE_THRESHOLD) {
          const { ast: builtAST, warnings } = buildASTFn(result.node);

          if (debug && warnings.length > 0) {
            console.log(`[hyperfixi] Semantic AST warnings for "${script}":`, warnings);
          }

          ast = builtAST;

          if (debug) {
            console.log(`[hyperfixi] Compiled ${language}: "${script}" (confidence: ${result.confidence.toFixed(2)})`);
          }
        } else {
          // Semantic parsing failed or low confidence
          if (debug) {
            const reason = result.errors?.join(', ') || `low confidence (${result.confidence.toFixed(2)})`;
            console.log(`[hyperfixi] Semantic parse failed for "${script}": ${reason}`);
          }
          return null;
        }
      } else {
        // Language not supported by semantic parser
        if (debug) {
          console.log(`[hyperfixi] Language "${language}" not supported by semantic parser`);
        }
        return null;
      }
    } else if (language !== 'en') {
      // Non-English but no semantic parser available
      if (debug) {
        console.log(`[hyperfixi] Semantic parser not available for "${language}". Install @hyperfixi/semantic and call setSemanticParser().`);
      }
      return null;
    } else {
      // English or no semantic parser - use HybridParser with preprocessing
      // Preprocessing translates non-ASCII keywords to English before parsing
      const preprocessedScript = preprocessMultilingual(script);
      const parser = new HybridParser(preprocessedScript);
      ast = parser.parse();
    }

    return compileAST(ast, script);
  } catch (error) {
    if (debug) {
      console.warn(`[hyperfixi] Failed to compile: ${script}`, error);
    }
    return null;
  }
}

/**
 * Extract the primary command name from the AST body.
 * Used for generating semantic handler IDs.
 */
function extractPrimaryCommand(body: ASTNode[]): string {
  if (body.length === 0) return 'handler';

  const first = body[0];
  if (first.type === 'command') {
    return (first as CommandNode).name || 'cmd';
  }
  return first.type || 'handler';
}

/**
 * Compile an AST node to a handler
 */
function compileAST(ast: ASTNode, original: string): CompiledHandler | null {
  if (ast.type !== 'event') {
    // Non-event scripts (like behaviors) need full runtime
    return null;
  }

  const eventNode = ast as EventNode;
  const event = eventNode.event;
  const modifiers = eventNode.modifiers || {};
  const body = eventNode.body || [];

  const { code, needsEvaluator, needsLocals, needsGlobals } = compileBody(body);

  if (code === null || code === '') {
    // Body couldn't be compiled or is empty
    return null;
  }

  // Generate semantic ID: {event}_{command}_{hash}
  const command = extractPrimaryCommand(body);
  const id = generateHandlerId(event, command, original);

  return {
    id,
    event,
    modifiers: {
      prevent: modifiers.prevent,
      stop: modifiers.stop,
      once: modifiers.once,
      debounce: modifiers.debounce,
      throttle: modifiers.throttle,
    },
    code,
    needsEvaluator: needsEvaluator || needsLocals || needsGlobals,
    original,
  };
}

interface BodyCompilation {
  code: string | null;
  needsEvaluator: boolean;
  needsLocals: boolean;
  needsGlobals: boolean;
}

/**
 * Compile a command sequence to JavaScript
 */
function compileBody(nodes: ASTNode[]): BodyCompilation {
  const statements: string[] = [];
  let needsEvaluator = false;
  let needsLocals = false;
  let needsGlobals = false;

  for (const node of nodes) {
    const result = compileNode(node);
    if (result === null) {
      return { code: null, needsEvaluator: false, needsLocals: false, needsGlobals: false };
    }

    statements.push(result.code);
    needsEvaluator = needsEvaluator || result.needsEvaluator;
    needsLocals = needsLocals || result.needsLocals;
    needsGlobals = needsGlobals || result.needsGlobals;
  }

  return {
    code: statements.join('\n'),
    needsEvaluator,
    needsLocals,
    needsGlobals,
  };
}

interface NodeCompilation {
  code: string;
  needsEvaluator: boolean;
  needsLocals: boolean;
  needsGlobals: boolean;
}

/**
 * Compile a single AST node to JavaScript
 */
function compileNode(node: ASTNode): NodeCompilation | null {
  if (node.type === 'command') {
    return compileCommand(node as CommandNode);
  }

  // Blocks (if, repeat, for, while, fetch) need runtime for now
  // Could be expanded later for simple cases
  return null;
}

/**
 * Compile a command to JavaScript
 */
function compileCommand(cmd: CommandNode): NodeCompilation | null {
  const target = cmd.target ? compileTarget(cmd.target) : 'm';

  switch (cmd.name) {
    case 'toggle':
      return compileToggle(cmd.args, target);

    case 'add':
      return compileAdd(cmd.args, target);

    case 'remove':
      return compileRemove(cmd.args, target);

    case 'removeClass':
      return compileRemoveClass(cmd.args, target);

    case 'show':
      return { code: `${target}.style.display = ''`, needsEvaluator: false, needsLocals: false, needsGlobals: false };

    case 'hide':
      return { code: `${target}.style.display = 'none'`, needsEvaluator: false, needsLocals: false, needsGlobals: false };

    case 'focus':
      return { code: `${target}.focus()`, needsEvaluator: false, needsLocals: false, needsGlobals: false };

    case 'blur':
      return { code: `${target}.blur()`, needsEvaluator: false, needsLocals: false, needsGlobals: false };

    case 'log':
      return compileLog(cmd.args);

    case 'set':
      return compileSet(cmd.args);

    case 'increment':
      return compileIncrement(cmd.args);

    case 'decrement':
      return compileDecrement(cmd.args);

    case 'put':
      return compilePut(cmd.args, target, cmd.modifier);

    case 'send':
    case 'trigger':
      return compileTrigger(cmd.args, target);

    case 'wait':
      return compileWait(cmd.args);

    default:
      // Unknown command - can't compile
      return null;
  }
}

// =============================================================================
// COMMAND COMPILERS
// =============================================================================

function compileToggle(args: ASTNode[], target: string): NodeCompilation | null {
  const className = extractClassName(args[0]);
  if (!className) return null;

  if (target === 'm') {
    return { code: `m.classList.toggle('${className}')`, needsEvaluator: false, needsLocals: false, needsGlobals: false };
  }

  return {
    code: `${target}.forEach(el => el.classList.toggle('${className}'))`,
    needsEvaluator: false,
    needsLocals: false,
    needsGlobals: false,
  };
}

function compileAdd(args: ASTNode[], target: string): NodeCompilation | null {
  const className = extractClassName(args[0]);
  if (!className) return null;

  if (target === 'm') {
    return { code: `m.classList.add('${className}')`, needsEvaluator: false, needsLocals: false, needsGlobals: false };
  }

  return {
    code: `${target}.forEach(el => el.classList.add('${className}'))`,
    needsEvaluator: false,
    needsLocals: false,
    needsGlobals: false,
  };
}

function compileRemove(args: ASTNode[], target: string): NodeCompilation | null {
  // If no args, remove the element itself
  if (!args || args.length === 0) {
    return { code: `${target}.remove()`, needsEvaluator: false, needsLocals: false, needsGlobals: false };
  }

  // Otherwise remove a class
  const className = extractClassName(args[0]);
  if (!className) return null;

  if (target === 'm') {
    return { code: `m.classList.remove('${className}')`, needsEvaluator: false, needsLocals: false, needsGlobals: false };
  }

  return {
    code: `${target}.forEach(el => el.classList.remove('${className}'))`,
    needsEvaluator: false,
    needsLocals: false,
    needsGlobals: false,
  };
}

function compileRemoveClass(args: ASTNode[], target: string): NodeCompilation | null {
  const className = extractClassName(args[0]);
  if (!className) return null;

  if (target === 'm') {
    return { code: `m.classList.remove('${className}')`, needsEvaluator: false, needsLocals: false, needsGlobals: false };
  }

  return {
    code: `${target}.forEach(el => el.classList.remove('${className}'))`,
    needsEvaluator: false,
    needsLocals: false,
    needsGlobals: false,
  };
}

function compileLog(args: ASTNode[]): NodeCompilation | null {
  const compiled = args.map(compileExpression).filter(Boolean);
  if (compiled.length !== args.length) {
    // Some args couldn't be compiled
    return { code: `console.log(${compiled.join(', ')})`, needsEvaluator: true, needsLocals: false, needsGlobals: false };
  }

  return { code: `console.log(${compiled.join(', ')})`, needsEvaluator: false, needsLocals: false, needsGlobals: false };
}

function compileSet(args: ASTNode[]): NodeCompilation | null {
  if (args.length < 2) return null;

  const [target, value] = args;
  const compiledValue = compileExpression(value);
  if (!compiledValue) return null;

  // Local variable (:varName)
  if (target.type === 'variable') {
    const varNode = target as VariableNode;
    if (varNode.scope === 'local') {
      const varName = varNode.name.slice(1);
      return {
        code: `L.${varName} = ${compiledValue}`,
        needsEvaluator: false,
        needsLocals: true,
        needsGlobals: false,
      };
    }
    // Global variable ($varName)
    if (varNode.scope === 'global') {
      const varName = varNode.name.slice(1);
      return {
        code: `G.${varName} = ${compiledValue}`,
        needsEvaluator: false,
        needsLocals: false,
        needsGlobals: true,
      };
    }
  }

  // Property assignment (element's property)
  if (target.type === 'possessive') {
    const possNode = target as PossessiveNode;
    const obj = compileExpression(possNode.object);
    const prop = possNode.property;
    if (!obj) return null;

    // Style property (*opacity, *color, etc.)
    if (prop.startsWith('*')) {
      const styleProp = prop.slice(1);
      return {
        code: `${obj}.style.${styleProp} = ${compiledValue}`,
        needsEvaluator: false,
        needsLocals: false,
        needsGlobals: false,
      };
    }

    return {
      code: `${obj}.${prop} = ${compiledValue}`,
      needsEvaluator: false,
      needsLocals: false,
      needsGlobals: false,
    };
  }

  if (target.type === 'member') {
    const memNode = target as MemberNode;
    const obj = compileExpression(memNode.object);
    const prop = typeof memNode.property === 'string' ? memNode.property : null;
    if (!obj || !prop) return null;

    // Style property (*opacity, *color, etc.)
    if (prop.startsWith('*')) {
      const styleProp = prop.slice(1);
      return {
        code: `${obj}.style.${styleProp} = ${compiledValue}`,
        needsEvaluator: false,
        needsLocals: false,
        needsGlobals: false,
      };
    }

    return {
      code: `${obj}.${prop} = ${compiledValue}`,
      needsEvaluator: false,
      needsLocals: false,
      needsGlobals: false,
    };
  }

  return null;
}

function compileIncrement(args: ASTNode[]): NodeCompilation | null {
  if (args.length < 1) return null;

  const target = args[0];
  const amount = args.length > 1 ? compileExpression(args[1]) : '1';

  if (target.type === 'variable') {
    const varNode = target as VariableNode;
    if (varNode.scope === 'local') {
      const varName = varNode.name.slice(1);
      return {
        code: `L.${varName} = (L.${varName} || 0) + ${amount}`,
        needsEvaluator: false,
        needsLocals: true,
        needsGlobals: false,
      };
    }
    if (varNode.scope === 'global') {
      const varName = varNode.name.slice(1);
      return {
        code: `G.${varName} = (G.${varName} || 0) + ${amount}`,
        needsEvaluator: false,
        needsLocals: false,
        needsGlobals: true,
      };
    }
  }

  // Element textContent
  const compiled = compileExpression(target);
  if (compiled) {
    return {
      code: `${compiled}.textContent = (parseFloat(${compiled}.textContent) || 0) + ${amount}`,
      needsEvaluator: false,
      needsLocals: false,
      needsGlobals: false,
    };
  }

  return null;
}

function compileDecrement(args: ASTNode[]): NodeCompilation | null {
  if (args.length < 1) return null;

  const target = args[0];
  const amount = args.length > 1 ? compileExpression(args[1]) : '1';

  if (target.type === 'variable') {
    const varNode = target as VariableNode;
    if (varNode.scope === 'local') {
      const varName = varNode.name.slice(1);
      return {
        code: `L.${varName} = (L.${varName} || 0) - ${amount}`,
        needsEvaluator: false,
        needsLocals: true,
        needsGlobals: false,
      };
    }
    if (varNode.scope === 'global') {
      const varName = varNode.name.slice(1);
      return {
        code: `G.${varName} = (G.${varName} || 0) - ${amount}`,
        needsEvaluator: false,
        needsLocals: false,
        needsGlobals: true,
      };
    }
  }

  return null;
}

function compilePut(args: ASTNode[], target: string, modifier?: string): NodeCompilation | null {
  if (args.length < 1) return null;

  const content = compileExpression(args[0]);
  if (!content) return null;

  const mod = modifier || 'into';

  switch (mod) {
    case 'into':
      return { code: `${target}.innerHTML = ${content}`, needsEvaluator: false, needsLocals: false, needsGlobals: false };
    case 'before':
      return { code: `${target}.insertAdjacentHTML('beforebegin', ${content})`, needsEvaluator: false, needsLocals: false, needsGlobals: false };
    case 'after':
      return { code: `${target}.insertAdjacentHTML('afterend', ${content})`, needsEvaluator: false, needsLocals: false, needsGlobals: false };
    case 'at start of':
      return { code: `${target}.insertAdjacentHTML('afterbegin', ${content})`, needsEvaluator: false, needsLocals: false, needsGlobals: false };
    case 'at end of':
      return { code: `${target}.insertAdjacentHTML('beforeend', ${content})`, needsEvaluator: false, needsLocals: false, needsGlobals: false };
    default:
      return { code: `${target}.innerHTML = ${content}`, needsEvaluator: false, needsLocals: false, needsGlobals: false };
  }
}

function compileTrigger(args: ASTNode[], target: string): NodeCompilation | null {
  if (args.length < 1) return null;

  const eventName = compileExpression(args[0]);
  if (!eventName) return null;

  return {
    code: `${target}.dispatchEvent(new CustomEvent(${eventName}, { bubbles: true }))`,
    needsEvaluator: false,
    needsLocals: false,
    needsGlobals: false,
  };
}

function compileWait(args: ASTNode[]): NodeCompilation | null {
  if (args.length < 1) return null;

  const duration = compileExpression(args[0]);
  if (!duration) return null;

  return {
    code: `await new Promise(r => setTimeout(r, ${duration}))`,
    needsEvaluator: false,
    needsLocals: false,
    needsGlobals: false,
  };
}

// =============================================================================
// EXPRESSION COMPILER
// =============================================================================

function compileExpression(node: ASTNode): string | null {
  if (!node) return null;

  switch (node.type) {
    case 'literal': {
      const litNode = node as LiteralNode;
      return JSON.stringify(litNode.value);
    }

    case 'identifier': {
      const idNode = node as IdentifierNode;
      const val = idNode.value;
      if (val === 'me' || val === 'my') return 'm';
      if (val === 'you') return 'y';
      if (val === 'it') return 'it';
      if (val === 'event') return 'e';
      if (val === 'body') return 'document.body';
      if (val === 'document') return 'document';
      if (val === 'window') return 'window';
      return val;
    }

    case 'variable': {
      const varNode = node as VariableNode;
      const name = varNode.name.slice(1);
      return varNode.scope === 'local' ? `L.${name}` : `G.${name}`;
    }

    case 'selector': {
      const selNode = node as SelectorNode;
      const sanitized = sanitizeSelector(selNode.value);
      return `document.querySelector('${sanitized}')`;
    }

    case 'possessive': {
      const possNode = node as PossessiveNode;
      const obj = compileExpression(possNode.object);
      const prop = possNode.property;
      if (!obj) return null;

      // Style property
      if (prop.startsWith('*')) {
        return `${obj}.style.${prop.slice(1)}`;
      }
      return `${obj}.${prop}`;
    }

    case 'member': {
      const memNode = node as MemberNode;
      const obj = compileExpression(memNode.object);
      const prop = typeof memNode.property === 'string' ? memNode.property : null;
      if (!obj || !prop) return null;

      // Style property
      if (prop.startsWith('*')) {
        return `${obj}.style.${prop.slice(1)}`;
      }
      return `${obj}.${prop}`;
    }

    case 'binary': {
      const binNode = node as BinaryNode;
      const left = compileExpression(binNode.left);
      const right = compileExpression(binNode.right);
      if (!left || !right) return null;

      const op = binNode.operator;
      switch (op) {
        case '+':
        case '-':
        case '*':
        case '/':
        case '%':
          return `(${left} ${op} ${right})`;
        case '==':
        case 'is':
          return `(${left} == ${right})`;
        case '!=':
        case 'is not':
          return `(${left} != ${right})`;
        case '<':
        case '>':
        case '<=':
        case '>=':
          return `(${left} ${op} ${right})`;
        case 'and':
        case '&&':
          return `(${left} && ${right})`;
        case 'or':
        case '||':
          return `(${left} || ${right})`;
        case 'has': {
          // Special case: element has .class
          const rightSel = binNode.right as SelectorNode;
          const className = rightSel.value?.slice(1) || '';
          const sanitizedClass = sanitizeClassName(className);
          if (!sanitizedClass) return null; // Invalid class name - fall back to runtime
          return `${left}.classList.contains('${sanitizedClass}')`;
        }
        default:
          return null;
      }
    }

    case 'call': {
      const callNode = node as CallNode;
      const callee = callNode.callee;
      const args = (callNode.args || []).map(compileExpression);
      if (args.some((a: string | null) => a === null)) return null;

      if (callee.type === 'member' || callee.type === 'possessive') {
        const memCallee = callee as MemberNode | PossessiveNode;
        const obj = compileExpression(memCallee.object);
        const prop = typeof memCallee.property === 'string' ? memCallee.property : null;
        if (!obj || !prop) return null;
        return `${obj}.${prop}(${args.join(', ')})`;
      }

      const fn = compileExpression(callee);
      if (!fn) return null;
      return `${fn}(${args.join(', ')})`;
    }

    case 'positional': {
      const posNode = node as PositionalNode;
      const position = posNode.position;
      const target = posNode.target;

      switch (position) {
        case 'first':
          if (target?.type === 'selector') {
            const selNode = target as SelectorNode;
            const sanitized = sanitizeSelector(selNode.value);
            return `document.querySelector('${sanitized}')`;
          }
          return null; // Arrays need runtime

        case 'last':
          if (target?.type === 'selector') {
            const selNode = target as SelectorNode;
            const sanitized = sanitizeSelector(selNode.value);
            return `(()=>{const e=document.querySelectorAll('${sanitized}');return e[e.length-1]})()`;
          }
          return null; // Arrays need runtime

        case 'next':
          return 'm.nextElementSibling';

        case 'previous':
          return 'm.previousElementSibling';

        case 'closest':
          if (target?.type === 'selector') {
            const selNode = target as SelectorNode;
            const sanitized = sanitizeSelector(selNode.value);
            return `m.closest('${sanitized}')`;
          }
          return null;

        case 'parent':
          return 'm.parentElement';

        default:
          return null;
      }
    }

    default:
      return null;
  }
}

// =============================================================================
// HELPERS
// =============================================================================

function compileTarget(target: ASTNode): string {
  if (target.type === 'identifier') {
    const idNode = target as IdentifierNode;
    if (idNode.value === 'me' || idNode.value === 'my') return 'm';
    if (idNode.value === 'you') return 'y';
  }

  if (target.type === 'selector') {
    const selNode = target as SelectorNode;
    const sanitized = sanitizeSelector(selNode.value);
    return `document.querySelectorAll('${sanitized}')`;
  }

  const compiled = compileExpression(target);
  return compiled || 'm';
}

function extractClassName(node: ASTNode): string | null {
  if (!node) return null;

  if (node.type === 'selector') {
    const selNode = node as SelectorNode;
    const val = selNode.value;
    const rawClass = val.startsWith('.') ? val.slice(1) : val;
    // Sanitize class name before returning
    return sanitizeClassName(rawClass);
  }

  if (node.type === 'literal' || node.type === 'string') {
    const litNode = node as LiteralNode;
    const val = litNode.value;
    if (typeof val === 'string') {
      const rawClass = val.startsWith('.') ? val.slice(1) : val;
      return sanitizeClassName(rawClass);
    }
  }

  if (node.type === 'identifier') {
    const idNode = node as IdentifierNode;
    return sanitizeClassName(idNode.value);
  }

  return null;
}
