/**
 * Main Hyperscript API
 * Provides a clean, type-safe public interface for hyperscript compilation and execution
 */

import { parse } from '../parser/parser.js';
import { Runtime, type RuntimeOptions } from '../runtime/runtime.js';
import { createContext, createChildContext } from '../core/context.js';
import type { ASTNode, ExecutionContext, ParseError } from '../types/base-types.js';

// ============================================================================
// API Types
// ============================================================================

export interface CompilationResult {
  success: boolean;
  ast?: ASTNode;
  errors: ParseError[];
  tokens: import('../types/core.js').Token[];
  compilationTime: number;
}

export interface HyperscriptAPI {
  // Core compilation and execution
  compile(code: string): CompilationResult;
  execute(ast: ASTNode, context?: ExecutionContext): Promise<any>;
  run(code: string, context?: ExecutionContext): Promise<any>;
  
  // DOM processing (HTMX compatibility)
  processNode(element: Element): void;
  process(element: Element): void; // Alias for processNode
  
  // Context management
  createContext(element?: HTMLElement | null): ExecutionContext;
  createChildContext(parent: ExecutionContext, element?: HTMLElement | null): ExecutionContext;
  
  // Utilities
  isValidHyperscript(code: string): boolean;
  version: string;
  
  // Advanced
  createRuntime(options?: RuntimeOptions): Runtime;
  parse: typeof parse;
}

// ============================================================================
// Internal Runtime Instance
// ============================================================================

const defaultRuntime = new Runtime();

// ============================================================================
// API Implementation
// ============================================================================

/**
 * Compile hyperscript code into an Abstract Syntax Tree (AST)
 */
function compile(code: string): CompilationResult {
  // Input validation
  if (typeof code !== 'string') {
    throw new TypeError('Code must be a string');
  }

  const startTime = performance.now();
  
  try {
    const parseResult = parse(code);
    const compilationTime = performance.now() - startTime;
    
    if (parseResult.success && parseResult.node) {
      return {
        success: true,
        ast: parseResult.node,
        errors: [],
        tokens: parseResult.tokens,
        compilationTime
      };
    } else {
      return {
        success: false,
        errors: parseResult.error ? [parseResult.error] : [],
        tokens: parseResult.tokens,
        compilationTime
      };
    }
  } catch (error) {
    const compilationTime = performance.now() - startTime;
    
    return {
      success: false,
      errors: [{
        message: error instanceof Error ? error.message : 'Unknown compilation error',
        position: 0,
        line: 1,
        column: 1
      }],
      tokens: [],
      compilationTime
    };
  }
}

/**
 * Execute a compiled AST with the given execution context
 */
async function execute(ast: ASTNode, context?: ExecutionContext): Promise<any> {
  if (!ast) {
    throw new Error('AST is required for execution');
  }

  const executionContext = context || createContext();
  return await defaultRuntime.execute(ast, executionContext);
}

/**
 * Compile and execute hyperscript code in one operation
 */
async function run(code: string, context?: ExecutionContext): Promise<any> {
  const compiled = compile(code);
  
  if (!compiled.success) {
    const errorMsg = compiled.errors.length > 0 
      ? compiled.errors[0].message 
      : 'Unknown compilation error';
    throw new Error(`Compilation failed: ${errorMsg}`);
  }

  return await execute(compiled.ast!, context);
}

/**
 * Check if the given code is valid hyperscript syntax
 */
function isValidHyperscript(code: string): boolean {
  try {
    const result = compile(code);
    return result.success;
  } catch {
    return false;
  }
}

/**
 * Create a new runtime instance with custom options
 */
function createRuntimeInstance(options?: RuntimeOptions): Runtime {
  return new Runtime(options);
}

/**
 * Get the current version of hyperfixi
 */
function getVersion(): string {
  // In a real implementation, this would be injected during build
  return '0.1.0';
}

// ============================================================================
// Public API Object
// ============================================================================

/**
 * Process DOM elements to initialize hyperscript behaviors
 */
function processNode(element: Element): void {
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

/**
 * Process a single hyperscript attribute on an element
 */
function processHyperscriptAttribute(element: Element, hyperscriptCode: string): void {
  try {
    console.log('🔍 Processing hyperscript attribute:', hyperscriptCode, 'on element:', element);
    
    // Compile the hyperscript code
    const compileResult = compile(hyperscriptCode);
    
    if (!compileResult.success) {
      console.error(`❌ Failed to compile hyperscript on element:`, element);
      console.error(`❌ Hyperscript code: "${hyperscriptCode}"`);
      console.error(`❌ Parse errors:`, compileResult.errors);
      compileResult.errors.forEach((error, index) => {
        console.error(`❌ Error ${index + 1}: ${error.message} at line ${error.line}, column ${error.column}`);
      });
      return;
    }
    
    if (!compileResult.ast) {
      console.warn('⚠️ No AST generated for hyperscript:', hyperscriptCode);
      return;
    }
    
    console.log('✅ Successfully compiled hyperscript:', hyperscriptCode);
    console.log('📊 Generated AST:', compileResult.ast);
    
    // Create execution context for this element
    const context = createHyperscriptContext(element as HTMLElement);
    
    // Check if this is an event handler (starts with "on ")
    if (hyperscriptCode.trim().startsWith('on ')) {
      console.log('🎯 Setting up event handler for:', hyperscriptCode);
      setupEventHandler(element, compileResult.ast, context);
    } else {
      console.log('⚡ Executing immediate hyperscript:', hyperscriptCode);
      // Execute immediately for non-event code
      executeHyperscriptAST(compileResult.ast, context);
    }
    
  } catch (error) {
    console.error('❌ Error processing hyperscript attribute:', error, 'on element:', element);
  }
}

/**
 * Set up event handler for hyperscript "on" statements
 */
function setupEventHandler(element: Element, ast: ASTNode, context: ExecutionContext): void {
  try {
    // Parse the event from the AST (simplified - assumes "on eventName" structure)
    const eventInfo = extractEventInfo(ast);
    if (!eventInfo) {
      console.error('Could not extract event information from AST:', ast);
      return;
    }
    
    // Add event listener
    element.addEventListener(eventInfo.eventType, async (event) => {
      try {
        // Set event context
        context.variables?.set('event', event);
        context.variables?.set('target', event.target);
        
        // Execute the event handler body
        await executeHyperscriptAST(eventInfo.body, context);
      } catch (error) {
        console.error('Error executing hyperscript event handler:', error);
      }
    });
    
    console.log(`Set up ${eventInfo.eventType} event handler on element:`, element);
    
  } catch (error) {
    console.error('Error setting up event handler:', error);
  }
}

/**
 * Extract event information from AST
 */
function extractEventInfo(ast: ASTNode): { eventType: string; body: ASTNode } | null {
  try {
    console.log('🔍 Extracting event info from AST:', ast);
    
    // Handle the actual HyperFixi AST structure
    if (ast.type === 'eventHandler') {
      const eventType = (ast as any).event || 'click';
      const commands = (ast as any).commands;
      
      console.log(`✅ Found event handler: ${eventType} with ${commands?.length || 0} commands`);
      
      // Create a body node from the commands
      const body: ASTNode = {
        type: 'CommandSequence',
        commands: commands || [],
        start: ast.start || 0,
        end: ast.end || 0,
        line: ast.line || 1,
        column: ast.column || 1
      };
      
      return { eventType, body };
    }
    
    // Handle legacy AST structures
    if (ast.type === 'FeatureNode' && (ast as any).name === 'on') {
      const eventType = (ast as any).args?.[0]?.value || 'click';
      const body = (ast as any).body || ast;
      return { eventType, body };
    }
    
    // Handle direct command sequences
    if (ast.type === 'CommandSequence' || ast.type === 'Block') {
      return { eventType: 'click', body: ast }; // Default to click
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
async function executeHyperscriptAST(ast: ASTNode, context: ExecutionContext): Promise<any> {
  try {
    return await defaultRuntime.execute(ast, context);
  } catch (error) {
    console.error('Error executing hyperscript AST:', error);
    throw error;
  }
}

/**
 * Create hyperscript execution context for an element
 */
function createHyperscriptContext(element?: HTMLElement | null): ExecutionContext {
  return createContext(element);
}

/**
 * Alias for processNode for HTMX API compatibility
 */
function process(element: Element): void {
  return processNode(element);
}

export const hyperscript: HyperscriptAPI = {
  // Core compilation and execution
  compile,
  execute,
  run,
  
  // DOM processing (HTMX compatibility)
  processNode,
  process,
  
  // Context management
  createContext,
  createChildContext,
  
  // Utilities
  isValidHyperscript,
  version: getVersion(),
  
  // Advanced
  createRuntime: createRuntimeInstance,
  parse
};

// ============================================================================
// Default Export
// ============================================================================

export default hyperscript;