/**
 * DOM Processing Module
 * Handles attribute processing and event handler setup for hyperscript
 */

import type { ASTNode, ExecutionContext } from '../types/core';
import type { CompileResult } from './hyperscript-api';
import { createContext } from '../core/context';
import { debug } from '../utils/debug';

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_EVENT_TYPE = 'click';
const DEFAULT_LANGUAGE = 'en';

// =============================================================================
// Type for compile functions (to avoid circular dependency)
// =============================================================================

type CompileFunction = (code: string, options?: any) => CompileResult;
type CompileAsyncFunction = (code: string, options?: any) => Promise<CompileResult>;
type GetRuntimeFunction = () => any;

// These will be injected from hyperscript-api.ts
let compileSyncFn: CompileFunction;
let compileAsyncFn: CompileAsyncFunction;
let getRuntimeFn: GetRuntimeFunction;

/**
 * Initialize the DOM processor with compile functions
 * Called from hyperscript-api.ts to avoid circular dependency
 */
export function initializeDOMProcessor(
  compileSync: CompileFunction,
  compileAsync: CompileAsyncFunction,
  getRuntime: GetRuntimeFunction
): void {
  compileSyncFn = compileSync;
  compileAsyncFn = compileAsync;
  getRuntimeFn = getRuntime;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Log compilation error with optional debug details
 */
function logCompileError(element: Element, code: string, result: CompileResult): void {
  console.error(`Failed to compile hyperscript on element:`, element);
  console.error(`Code: "${code}"`);

  if (result.errors?.length) {
    result.errors.forEach((error, i) => {
      console.error(`Error ${i + 1}: ${error.message} (line ${error.line}, col ${error.column})`);
    });
  }

  // Log detailed parse information using debug.parse
  debug.parse('Compilation failed - error details:', {
    code,
    errors: result.errors,
    codeLines: code.split('\n'),
    element: element.tagName,
  });
}

/**
 * Detect language from element attributes or document.
 * Checks: data-lang, lang attribute, closest parent with lang, document lang.
 */
export function detectLanguage(element: Element): string {
  // Check data-lang attribute on element (explicit hyperscript language)
  const dataLang = element.getAttribute('data-lang');
  if (dataLang) return dataLang;

  // Check lang attribute (HTML standard) on element or closest parent
  const langAttr = element.closest('[lang]')?.getAttribute('lang');
  if (langAttr) return langAttr.split('-')[0]; // 'en-US' → 'en'

  // Check document language
  if (typeof document !== 'undefined') {
    const docLang = document.documentElement?.lang;
    if (docLang) return docLang.split('-')[0];
  }

  // Default to English
  return DEFAULT_LANGUAGE;
}

// =============================================================================
// AST Type Guards
// =============================================================================

/**
 * Type guard for EventHandler AST nodes
 */
interface EventHandlerAST extends ASTNode {
  type: 'eventHandler';
  event?: string;
  commands?: ASTNode[];
}

function isEventHandlerAST(ast: ASTNode): ast is EventHandlerAST {
  return ast.type === 'eventHandler';
}

/**
 * Type guard for Feature AST nodes (legacy)
 */
interface FeatureAST extends ASTNode {
  type: 'FeatureNode';
  name?: string;
  args?: Array<{ value?: string }>;
  body?: ASTNode;
}

function isFeatureAST(ast: ASTNode): ast is FeatureAST {
  return ast.type === 'FeatureNode';
}

/**
 * Extract event information from AST
 */
export function extractEventInfo(ast: ASTNode): { eventType: string; body: ASTNode } | null {
  try {
    // Handle the actual HyperFixi AST structure
    if (isEventHandlerAST(ast)) {
      const eventType = ast.event || DEFAULT_EVENT_TYPE;
      const commands = ast.commands;

      // Create a body node from the commands
      const body: ASTNode = {
        type: 'CommandSequence',
        commands: commands || [],
        start: ast.start || 0,
        end: ast.end || 0,
        line: ast.line || 1,
        column: ast.column || 1,
      };

      debug.event('Extracted event info:', {
        type: ast.type,
        eventType,
        commandCount: commands?.length || 0,
      });
      return { eventType, body };
    }

    // Handle legacy AST structures
    if (isFeatureAST(ast) && ast.name === 'on') {
      const eventType = ast.args?.[0]?.value || DEFAULT_EVENT_TYPE;
      const body = ast.body || ast;
      debug.event('Extracted event info:', { type: ast.type, eventType });
      return { eventType, body };
    }

    // Handle direct command sequences
    if (ast.type === 'CommandSequence' || ast.type === 'Block') {
      debug.event('Extracted event info:', { type: ast.type, eventType: DEFAULT_EVENT_TYPE });
      return { eventType: DEFAULT_EVENT_TYPE, body: ast };
    }

    console.warn('⚠️ Unknown AST structure for event extraction:', ast.type);
    return null;
  } catch (error) {
    console.error('❌ Error extracting event info:', error);
    return null;
  }
}

/**
 * Execute hyperscript AST
 */
async function executeHyperscriptAST(ast: ASTNode, context: ExecutionContext): Promise<unknown> {
  try {
    return await getRuntimeFn().execute(ast, context);
  } catch (error) {
    console.error('Error executing hyperscript AST:', error);
    throw error;
  }
}

/**
 * Set up event handler for hyperscript "on" statements
 */
export function setupEventHandler(element: Element, ast: ASTNode, context: ExecutionContext): void {
  try {
    // Parse the event from the AST (simplified - assumes "on eventName" structure)
    const eventInfo = extractEventInfo(ast);

    if (!eventInfo) {
      console.error('❌ Could not extract event information from AST:', ast);
      return;
    }

    debug.event('Setting up event handler:', {
      element: element.tagName,
      eventType: eventInfo.eventType,
    });

    // Add event listener
    const eventHandler = async (event: Event) => {
      try {
        // Set event context
        context.locals.set('event', event);
        context.locals.set('target', event.target);

        // Execute the event handler body
        await executeHyperscriptAST(eventInfo.body, context);
      } catch (error) {
        console.error('❌ Error executing hyperscript event handler:', error);
        console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        console.error('❌ Event info body:', eventInfo.body);
        console.error('❌ Context:', context);
      }
    };

    element.addEventListener(eventInfo.eventType, eventHandler);
    debug.event('Event handler attached:', eventInfo.eventType);
  } catch (error) {
    console.error('Error setting up event handler:', error);
  }
}

/**
 * Create hyperscript execution context for an element
 */
export function createHyperscriptContext(element?: HTMLElement | null): ExecutionContext {
  return createContext(element);
}

/**
 * Async processing for multilingual hyperscript (uses direct AST path)
 */
async function processHyperscriptAttributeAsync(
  element: Element,
  hyperscriptCode: string,
  lang: string
): Promise<void> {
  try {
    debug.runtime('Processing multilingual hyperscript:', { code: hyperscriptCode, lang });

    // Use direct AST path
    const compileResult = await compileAsyncFn(hyperscriptCode, { language: lang });

    if (!compileResult.ok) {
      logCompileError(element, hyperscriptCode, compileResult);
      return;
    }

    if (!compileResult.ast) {
      console.warn('⚠️ No AST generated for hyperscript:', hyperscriptCode);
      return;
    }

    debug.runtime('Successfully compiled multilingual hyperscript:', {
      code: hyperscriptCode,
      lang,
      directPath: compileResult.meta.directPath,
      confidence: compileResult.meta.confidence,
    });

    // Create execution context for this element
    const context = createHyperscriptContext(element as HTMLElement);

    // Check if this is an event handler (starts with "on ")
    if (hyperscriptCode.trim().startsWith('on ') || compileResult.ast.type === 'eventHandler') {
      debug.event('Setting up multilingual event handler:', { code: hyperscriptCode, lang });
      setupEventHandler(element, compileResult.ast, context);
    } else {
      debug.runtime('Executing immediate multilingual hyperscript:', hyperscriptCode);
      void executeHyperscriptAST(compileResult.ast, context);
    }
  } catch (error) {
    console.error('❌ Error processing multilingual hyperscript:', error, 'on element:', element);
  }
}

/**
 * Synchronous processing for English hyperscript (traditional path)
 */
function processHyperscriptAttributeSync(element: Element, hyperscriptCode: string): void {
  try {
    debug.runtime('Processing hyperscript:', hyperscriptCode);

    // Compile the hyperscript code
    const compileResult = compileSyncFn(hyperscriptCode);

    if (!compileResult.ok) {
      logCompileError(element, hyperscriptCode, compileResult);
      return;
    }

    if (!compileResult.ast) {
      console.warn('⚠️ No AST generated for hyperscript:', hyperscriptCode);
      return;
    }

    debug.runtime('Successfully compiled hyperscript:', hyperscriptCode);
    debug.runtime('Generated AST:', compileResult.ast);

    // Create execution context for this element
    const context = createHyperscriptContext(element as HTMLElement);

    // Check if this is an event handler (starts with "on ")
    if (hyperscriptCode.trim().startsWith('on ')) {
      debug.event('Setting up event handler for:', hyperscriptCode);
      debug.event('Element for event handler:', element);
      debug.event('AST for event handler:', compileResult.ast);

      try {
        debug.event('About to call setupEventHandler...');
        setupEventHandler(element, compileResult.ast, context);
        debug.event('setupEventHandler completed successfully');
      } catch (setupError) {
        console.error('❌ Error in setupEventHandler:', setupError);
        console.error(
          '❌ setupError stack:',
          setupError instanceof Error ? setupError.stack : 'No stack trace'
        );
        throw setupError; // Re-throw to see it in outer catch
      }
    } else {
      debug.runtime('Executing immediate hyperscript:', hyperscriptCode);
      // Execute immediately for non-event code
      void executeHyperscriptAST(compileResult.ast, context);
    }
  } catch (error) {
    console.error('❌ Error processing hyperscript attribute:', error, 'on element:', element);
  }
}

/**
 * Process a single hyperscript attribute on an element
 */
export function processHyperscriptAttribute(element: Element, hyperscriptCode: string): void {
  // Detect language from element
  const lang = detectLanguage(element);

  // For non-English, use async multilingual path
  if (lang !== DEFAULT_LANGUAGE) {
    void processHyperscriptAttributeAsync(element, hyperscriptCode, lang);
    return;
  }

  // For English, use synchronous path
  processHyperscriptAttributeSync(element, hyperscriptCode);
}

/**
 * Process DOM elements to initialize hyperscript behaviors
 */
export function process(element: Element): void {
  try {
    // Process the element itself if it has hyperscript
    const hyperscriptAttr = element.getAttribute('_');
    if (hyperscriptAttr) {
      processHyperscriptAttribute(element, hyperscriptAttr);
    }

    // Process all child elements with hyperscript attributes
    const hyperscriptElements = element.querySelectorAll('[_]');
    hyperscriptElements.forEach(child => {
      const childHyperscriptAttr = child.getAttribute('_');
      if (childHyperscriptAttr) {
        processHyperscriptAttribute(child, childHyperscriptAttr);
      }
    });
  } catch (error) {
    console.error('Error processing hyperscript node:', error);
  }
}
