/**
 * Semantic Analysis Module for AST Toolkit
 * Provides intent extraction, similarity detection, and code variation generation for LLMs
 */

import { findNodes, visit, calculateComplexity } from '../index.js';
import type { ASTNode, ComplexityMetrics } from '../types.js';

// ============================================================================
// Semantic Types
// ============================================================================

export interface SemanticIntent {
  type: 'interaction' | 'data-flow' | 'state-change' | 'ui-update' | 'validation' | 'navigation';
  confidence: number;
  description: string;
  patterns: string[];
  examples: string[];
}

export interface CodeSimilarity {
  similarity: number; // 0-1 score
  commonPatterns: string[];
  differences: string[];
  structuralSimilarity: number;
  behavioralSimilarity: number;
}

export interface CodeVariation {
  type: 'syntactic' | 'semantic' | 'structural';
  original: string;
  variation: string;
  description: string;
  preservesMeaning: boolean;
}

export interface SemanticAnalysis {
  intents: SemanticIntent[];
  patterns: SemanticPattern[];
  concepts: string[];
  relationships: SemanticRelationship[];
  complexity: SemanticComplexity;
}

export interface SemanticPattern {
  name: string;
  description: string;
  frequency: number;
  nodes: ASTNode[];
  category:
    | 'event-handling'
    | 'dom-manipulation'
    | 'data-processing'
    | 'control-flow'
    | 'ui-interaction';
}

export interface SemanticRelationship {
  from: ASTNode;
  to: ASTNode;
  type: 'calls' | 'modifies' | 'depends-on' | 'triggers' | 'updates';
  strength: number; // 0-1
}

export interface SemanticComplexity {
  conceptualComplexity: number;
  interactionComplexity: number;
  dataFlowComplexity: number;
  cognitiveLoad: number;
}

// ============================================================================
// Intent Extraction
// ============================================================================

/**
 * Extract semantic intents from AST code
 */
export function extractIntents(ast: ASTNode): SemanticIntent[] {
  const intents: SemanticIntent[] = [];

  // Analyze event handlers for interaction intents
  const eventHandlers = findNodes(ast, node => node.type === 'eventHandler');
  for (const handler of eventHandlers) {
    const handlerIntents = analyzeEventHandlerIntent(handler as any);
    intents.push(...handlerIntents);
  }

  // Analyze commands for specific action intents
  const commands = findNodes(ast, node => node.type === 'command');
  for (const command of commands) {
    const commandIntents = analyzeCommandIntent(command as any);
    intents.push(...commandIntents);
  }

  // Analyze overall program structure for high-level intents
  const programIntents = analyzeProgramIntent(ast);
  intents.push(...programIntents);

  return deduplicateIntents(intents);
}

function analyzeEventHandlerIntent(handler: any): SemanticIntent[] {
  const intents: SemanticIntent[] = [];
  const event = handler.event;
  const commands = handler.commands || [];

  // Determine primary intent based on event type and commands
  switch (event) {
    case 'click':
      intents.push(analyzeClickIntent(handler, commands));
      break;
    case 'submit':
      intents.push(analyzeSubmitIntent(handler, commands));
      break;
    case 'change':
    case 'input':
      intents.push(analyzeInputIntent(handler, commands));
      break;
    case 'hover':
    case 'mouseenter':
    case 'mouseleave':
      intents.push(analyzeHoverIntent(handler, commands));
      break;
    default:
      intents.push(analyzeGenericInteractionIntent(handler, commands));
  }

  return intents;
}

function analyzeClickIntent(handler: any, commands: any[]): SemanticIntent {
  const commandTypes = commands.map(cmd => cmd.name);

  if (commandTypes.includes('toggle')) {
    return {
      type: 'state-change',
      confidence: 0.9,
      description: 'Toggle element state or visibility',
      patterns: ['toggle-state', 'show-hide', 'activate-deactivate'],
      examples: ['toggle modal visibility', 'activate/deactivate button', 'show/hide menu'],
    };
  }

  if (commandTypes.includes('fetch')) {
    return {
      type: 'data-flow',
      confidence: 0.85,
      description: 'Load data from server on user interaction',
      patterns: ['ajax-loading', 'dynamic-content', 'user-triggered-fetch'],
      examples: ['load more content', 'fetch user details', 'refresh data'],
    };
  }

  if (commandTypes.some(cmd => ['add', 'remove'].includes(cmd))) {
    return {
      type: 'ui-update',
      confidence: 0.8,
      description: 'Modify element appearance or structure',
      patterns: ['class-manipulation', 'style-update', 'element-modification'],
      examples: ['highlight selection', 'change button style', 'update element class'],
    };
  }

  if (commandTypes.includes('put')) {
    return {
      type: 'ui-update',
      confidence: 0.75,
      description: 'Update element content or value',
      patterns: ['content-update', 'value-assignment', 'text-replacement'],
      examples: ['update counter', 'set form value', 'display message'],
    };
  }

  return {
    type: 'interaction',
    confidence: 0.6,
    description: 'Generic user click interaction',
    patterns: ['user-click', 'button-press', 'element-activation'],
    examples: ['button click', 'link activation', 'element selection'],
  };
}

function analyzeSubmitIntent(handler: any, commands: any[]): SemanticIntent {
  const commandTypes = commands.map(cmd => cmd.name);

  if (commandTypes.includes('fetch')) {
    return {
      type: 'data-flow',
      confidence: 0.95,
      description: 'Submit form data to server',
      patterns: ['form-submission', 'data-posting', 'server-communication'],
      examples: ['submit contact form', 'save user preferences', 'post comment'],
    };
  }

  if (commandTypes.some(cmd => ['if', 'validate'].includes(cmd))) {
    return {
      type: 'validation',
      confidence: 0.9,
      description: 'Validate form data before submission',
      patterns: ['form-validation', 'data-verification', 'input-checking'],
      examples: ['validate email format', 'check required fields', 'verify password strength'],
    };
  }

  return {
    type: 'data-flow',
    confidence: 0.8,
    description: 'Process form submission',
    patterns: ['form-processing', 'data-handling', 'user-input-processing'],
    examples: ['handle form data', 'process user input', 'submit information'],
  };
}

function analyzeInputIntent(handler: any, commands: any[]): SemanticIntent {
  const commandTypes = commands.map(cmd => cmd.name).filter(Boolean);

  // Look for conditional structures that might indicate validation
  const hasConditional = commands.some(
    cmd =>
      cmd.type === 'conditional' ||
      cmd.type === 'if' ||
      (cmd.condition && typeof cmd.condition === 'object')
  );

  if (hasConditional || commandTypes.some(cmd => ['validate', 'matches'].includes(cmd))) {
    return {
      type: 'validation',
      confidence: 0.9,
      description: 'Real-time input validation',
      patterns: ['live-validation', 'input-checking', 'immediate-feedback'],
      examples: ['validate email as user types', 'check password strength', 'verify field format'],
    };
  }

  if (commandTypes.some(cmd => ['add', 'remove', 'toggle'].includes(cmd))) {
    return {
      type: 'ui-update',
      confidence: 0.85,
      description: 'Update UI based on input changes',
      patterns: ['dynamic-ui', 'input-responsive', 'visual-feedback'],
      examples: ['show error state', 'update character count', 'highlight invalid input'],
    };
  }

  return {
    type: 'interaction',
    confidence: 0.7,
    description: 'Respond to user input',
    patterns: ['input-handling', 'user-typing', 'field-interaction'],
    examples: ['handle text input', 'process field changes', 'react to user typing'],
  };
}

function analyzeHoverIntent(handler: any, commands: any[]): SemanticIntent {
  return {
    type: 'ui-update',
    confidence: 0.8,
    description: 'Provide visual feedback on hover',
    patterns: ['hover-effects', 'visual-feedback', 'interactive-preview'],
    examples: ['show tooltip', 'highlight on hover', 'preview content'],
  };
}

function analyzeGenericInteractionIntent(handler: any, commands: any[]): SemanticIntent {
  return {
    type: 'interaction',
    confidence: 0.5,
    description: `Handle ${handler.event} event`,
    patterns: ['event-handling', 'user-interaction', 'responsive-behavior'],
    examples: [`respond to ${handler.event}`, 'handle user action', 'process event'],
  };
}

function analyzeCommandIntent(command: any): SemanticIntent[] {
  const intents: SemanticIntent[] = [];

  switch (command.name) {
    case 'fetch':
      intents.push({
        type: 'data-flow',
        confidence: 0.9,
        description: 'Load data from external source',
        patterns: ['ajax-request', 'data-loading', 'http-communication'],
        examples: ['fetch API data', 'load remote content', 'get server response'],
      });
      break;

    case 'put':
      intents.push({
        type: 'ui-update',
        confidence: 0.85,
        description: 'Update element content or value',
        patterns: ['content-insertion', 'value-setting', 'text-update'],
        examples: ['set element text', 'update form value', 'insert HTML content'],
      });
      break;

    case 'add':
    case 'remove':
    case 'toggle':
      intents.push({
        type: 'state-change',
        confidence: 0.8,
        description: 'Modify element state or appearance',
        patterns: ['state-manipulation', 'class-management', 'style-control'],
        examples: ['toggle visibility', 'change element state', 'update appearance'],
      });
      break;
  }

  return intents;
}

function analyzeProgramIntent(ast: ASTNode): SemanticIntent[] {
  const intents: SemanticIntent[] = [];

  // Count different types of features
  const eventHandlers = findNodes(ast, node => node.type === 'eventHandler');
  const behaviors = findNodes(ast, node => node.type === 'behavior');
  const functions = findNodes(ast, node => node.type === 'function' || node.type === 'def');

  if (eventHandlers.length >= 3) {
    intents.push({
      type: 'interaction',
      confidence: 0.8,
      description: 'Interactive web application with multiple user interactions',
      patterns: ['multi-interaction', 'rich-ui', 'interactive-app'],
      examples: ['interactive dashboard', 'complex form', 'dynamic web app'],
    });
  }

  if (behaviors.length > 0) {
    intents.push({
      type: 'interaction',
      confidence: 0.7,
      description: 'Reusable behavior components for modular interaction',
      patterns: ['modular-behavior', 'component-based', 'reusable-interactions'],
      examples: ['modal behavior', 'dropdown behavior', 'tooltip behavior'],
    });
  }

  if (functions.length > 0) {
    intents.push({
      type: 'data-flow',
      confidence: 0.6,
      description: 'Custom data processing and utility functions',
      patterns: ['custom-logic', 'data-processing', 'utility-functions'],
      examples: ['validation helper', 'data formatter', 'calculation function'],
    });
  }

  return intents;
}

function deduplicateIntents(intents: SemanticIntent[]): SemanticIntent[] {
  const unique = new Map<string, SemanticIntent>();

  for (const intent of intents) {
    const key = `${intent.type}-${intent.description}`;
    const existing = unique.get(key);

    if (!existing || intent.confidence > existing.confidence) {
      unique.set(key, intent);
    }
  }

  return Array.from(unique.values());
}

// ============================================================================
// Similarity Detection
// ============================================================================

/**
 * Compare two AST nodes for semantic similarity
 */
export function calculateSimilarity(ast1: ASTNode, ast2: ASTNode): CodeSimilarity {
  const structuralSim = calculateStructuralSimilarity(ast1, ast2);
  const behavioralSim = calculateBehavioralSimilarity(ast1, ast2);
  const patterns1 = extractSemanticPatterns(ast1);
  const patterns2 = extractSemanticPatterns(ast2);

  const commonPatterns = findCommonPatterns(patterns1, patterns2);
  const differences = findDifferences(ast1, ast2);

  const overall = (structuralSim + behavioralSim) / 2;

  return {
    similarity: overall,
    commonPatterns: commonPatterns.map(p => p.name),
    differences,
    structuralSimilarity: structuralSim,
    behavioralSimilarity: behavioralSim,
  };
}

function calculateStructuralSimilarity(ast1: ASTNode, ast2: ASTNode): number {
  // Compare node types and structure
  const nodes1 = collectNodeTypes(ast1);
  const nodes2 = collectNodeTypes(ast2);

  const intersection = nodes1.filter(n => nodes2.includes(n));
  const union = [...new Set([...nodes1, ...nodes2])];

  return intersection.length / union.length;
}

function calculateBehavioralSimilarity(ast1: ASTNode, ast2: ASTNode): number {
  // Compare intents and behaviors
  const intents1 = extractIntents(ast1);
  const intents2 = extractIntents(ast2);

  let matchCount = 0;
  const total = Math.max(intents1.length, intents2.length);

  for (const intent1 of intents1) {
    const match = intents2.find(
      intent2 =>
        intent1.type === intent2.type && intent1.patterns.some(p => intent2.patterns.includes(p))
    );
    if (match) matchCount++;
  }

  return total > 0 ? matchCount / total : 0;
}

function collectNodeTypes(ast: ASTNode): string[] {
  const types: string[] = [];

  function traverse(node: any) {
    if (!node || typeof node !== 'object') return;

    if (node.type) {
      types.push(node.type);
    }

    // Traverse all properties that might contain child nodes
    for (const [key, value] of Object.entries(node)) {
      if (key === 'features' || key === 'commands' || key === 'then' || key === 'else') {
        if (Array.isArray(value)) {
          value.forEach(child => traverse(child));
        } else if (value) {
          traverse(value);
        }
      }
    }
  }

  traverse(ast);
  return types;
}

function findCommonPatterns(
  patterns1: SemanticPattern[],
  patterns2: SemanticPattern[]
): SemanticPattern[] {
  return patterns1.filter(p1 =>
    patterns2.some(p2 => p1.category === p2.category && p1.name === p2.name)
  );
}

function findDifferences(ast1: ASTNode, ast2: ASTNode): string[] {
  const differences: string[] = [];

  const types1 = collectNodeTypes(ast1);
  const types2 = collectNodeTypes(ast2);

  const counts1 = new Map<string, number>();
  const counts2 = new Map<string, number>();

  // Count occurrences of each type
  for (const type of types1) {
    counts1.set(type, (counts1.get(type) || 0) + 1);
  }

  for (const type of types2) {
    counts2.set(type, (counts2.get(type) || 0) + 1);
  }

  // Find nodes only in ast1
  for (const [type, count1] of counts1) {
    const count2 = counts2.get(type) || 0;
    if (count2 === 0) {
      differences.push(`${type} only in first AST`);
    } else if (count1 !== count2) {
      differences.push(`${type} count differs: ${count1} vs ${count2}`);
    }
  }

  // Find nodes only in ast2
  for (const [type, count2] of counts2) {
    if (!counts1.has(type)) {
      differences.push(`${type} only in second AST`);
    }
  }

  // Add structural differences
  const events1 = findNodes(ast1, node => node.type === 'eventHandler')
    .map(h => (h as any).event)
    .filter(Boolean);
  const events2 = findNodes(ast2, node => node.type === 'eventHandler')
    .map(h => (h as any).event)
    .filter(Boolean);

  const uniqueEvents1 = events1.filter(e => !events2.includes(e));
  const uniqueEvents2 = events2.filter(e => !events1.includes(e));

  if (uniqueEvents1.length > 0) {
    differences.push(`Events only in first AST: ${uniqueEvents1.join(', ')}`);
  }

  if (uniqueEvents2.length > 0) {
    differences.push(`Events only in second AST: ${uniqueEvents2.join(', ')}`);
  }

  return differences;
}

// ============================================================================
// Code Variation Generation
// ============================================================================

/**
 * Generate semantic variations of AST code
 */
export function generateVariations(
  ast: ASTNode,
  options: {
    maxVariations?: number;
    types?: ('syntactic' | 'semantic' | 'structural')[];
    preserveSemantics?: boolean;
  } = {}
): CodeVariation[] {
  const {
    maxVariations = 10,
    types = ['syntactic', 'semantic', 'structural'],
    preserveSemantics = true,
  } = options;

  const variations: CodeVariation[] = [];

  if (types.includes('syntactic')) {
    variations.push(...generateSyntacticVariations(ast, preserveSemantics));
  }

  if (types.includes('semantic')) {
    variations.push(...generateSemanticVariations(ast, preserveSemantics));
  }

  if (types.includes('structural')) {
    variations.push(...generateStructuralVariations(ast, preserveSemantics));
  }

  return variations.slice(0, maxVariations);
}

function generateSyntacticVariations(ast: ASTNode, preserveSemantics: boolean): CodeVariation[] {
  const variations: CodeVariation[] = [];

  // Variation: Explicit vs implicit selectors
  const eventHandlers = findNodes(ast, node => node.type === 'eventHandler');
  for (const handler of eventHandlers) {
    const handlerData = handler as any;
    if (!handlerData.selector || handlerData.selector === 'me') {
      variations.push({
        type: 'syntactic',
        original: `on ${handlerData.event || 'click'}`,
        variation: `on ${handlerData.event || 'click'} from me`,
        description: 'Make implicit element selector explicit',
        preservesMeaning: true,
      });
    } else {
      variations.push({
        type: 'syntactic',
        original: `on ${handlerData.event || 'click'} from ${handlerData.selector}`,
        variation: `on ${handlerData.event || 'click'}`,
        description: 'Make explicit selector implicit',
        preservesMeaning: true,
      });
    }
  }

  // Variation: Command chaining vs separate lines
  for (const handler of eventHandlers) {
    const handlerData = handler as any;
    if (handlerData.commands && handlerData.commands.length > 1) {
      variations.push({
        type: 'syntactic',
        original: 'multiple commands in one handler',
        variation: 'separate event handlers for each command',
        description: 'Split command chain into separate handlers',
        preservesMeaning: preserveSemantics,
      });
    }
  }

  return variations;
}

function generateSemanticVariations(ast: ASTNode, preserveSemantics: boolean): CodeVariation[] {
  const variations: CodeVariation[] = [];

  // Variation: Different approaches to same intent
  const commands = findNodes(ast, node => node.type === 'command');
  for (const command of commands) {
    const cmdData = command as any;

    switch (cmdData.name) {
      case 'toggle':
        variations.push({
          type: 'semantic',
          original: 'toggle .class',
          variation: 'if .class then remove .class else add .class',
          description: 'Replace toggle with explicit conditional logic',
          preservesMeaning: true,
        });
        break;

      case 'put':
        variations.push({
          type: 'semantic',
          original: 'put "text" into #element',
          variation: 'set #element.textContent to "text"',
          description: 'Use property assignment instead of put command',
          preservesMeaning: true,
        });
        break;
    }
  }

  return variations;
}

function generateStructuralVariations(ast: ASTNode, preserveSemantics: boolean): CodeVariation[] {
  const variations: CodeVariation[] = [];

  // Variation: Extract common patterns into behaviors
  const eventHandlers = findNodes(ast, node => node.type === 'eventHandler');
  if (eventHandlers.length > 2) {
    variations.push({
      type: 'structural',
      original: 'multiple similar event handlers',
      variation: 'extract common logic into reusable behavior',
      description: 'Refactor repeated patterns into behavior definitions',
      preservesMeaning: true,
    });
  }

  // Variation: Combine related handlers
  const clickHandlers = eventHandlers.filter(h => (h as any).event === 'click');
  if (clickHandlers.length > 1) {
    variations.push({
      type: 'structural',
      original: 'separate click handlers',
      variation: 'combined click handler with conditional logic',
      description: 'Merge related handlers using conditional commands',
      preservesMeaning: preserveSemantics,
    });
  }

  return variations;
}

// ============================================================================
// Pattern Extraction
// ============================================================================

/**
 * Extract semantic patterns from AST
 */
export function extractSemanticPatterns(ast: ASTNode): SemanticPattern[] {
  const patterns: SemanticPattern[] = [];

  // Event handling patterns
  patterns.push(...extractEventHandlingPatterns(ast));

  // DOM manipulation patterns
  patterns.push(...extractDOMManipulationPatterns(ast));

  // Data processing patterns
  patterns.push(...extractDataProcessingPatterns(ast));

  // Control flow patterns
  patterns.push(...extractControlFlowPatterns(ast));

  // UI interaction patterns
  patterns.push(...extractUIInteractionPatterns(ast));

  return patterns;
}

function extractEventHandlingPatterns(ast: ASTNode): SemanticPattern[] {
  const patterns: SemanticPattern[] = [];
  const eventHandlers = findNodes(ast, node => node.type === 'eventHandler');

  if (eventHandlers.length === 0) {
    return patterns;
  }

  // Group by event type
  const eventGroups = new Map<string, any[]>();
  for (const handler of eventHandlers) {
    const event = (handler as any).event || 'unknown';
    if (!eventGroups.has(event)) {
      eventGroups.set(event, []);
    }
    eventGroups.get(event)!.push(handler);
  }

  // Add patterns for multiple event handlers (even if different types)
  if (eventHandlers.length > 1) {
    patterns.push({
      name: 'multiple-event-handlers-pattern',
      description: `Multiple event handlers in program`,
      frequency: eventHandlers.length,
      nodes: eventHandlers,
      category: 'event-handling',
    });
  }

  // Add patterns for specific event type groupings
  for (const [event, handlers] of eventGroups) {
    if (handlers.length > 1) {
      patterns.push({
        name: `${event}-event-pattern`,
        description: `Multiple ${event} event handlers`,
        frequency: handlers.length,
        nodes: handlers,
        category: 'event-handling',
      });
    }
  }

  return patterns;
}

function extractDOMManipulationPatterns(ast: ASTNode): SemanticPattern[] {
  const patterns: SemanticPattern[] = [];
  const manipulationCommands = findNodes(
    ast,
    node =>
      node.type === 'command' && ['add', 'remove', 'toggle', 'put'].includes((node as any).name)
  );

  // Group by command type
  const commandGroups = new Map<string, any[]>();
  for (const cmd of manipulationCommands) {
    const name = (cmd as any).name;
    if (!commandGroups.has(name)) {
      commandGroups.set(name, []);
    }
    commandGroups.get(name)!.push(cmd);
  }

  for (const [command, commands] of commandGroups) {
    if (commands.length > 1) {
      patterns.push({
        name: `${command}-manipulation-pattern`,
        description: `Multiple ${command} operations`,
        frequency: commands.length,
        nodes: commands,
        category: 'dom-manipulation',
      });
    }
  }

  return patterns;
}

function extractDataProcessingPatterns(ast: ASTNode): SemanticPattern[] {
  const patterns: SemanticPattern[] = [];
  const fetchCommands = findNodes(
    ast,
    node => node.type === 'command' && (node as any).name === 'fetch'
  );

  if (fetchCommands.length > 0) {
    patterns.push({
      name: 'ajax-data-loading-pattern',
      description: 'AJAX data loading operations',
      frequency: fetchCommands.length,
      nodes: fetchCommands,
      category: 'data-processing',
    });
  }

  return patterns;
}

function extractControlFlowPatterns(ast: ASTNode): SemanticPattern[] {
  const patterns: SemanticPattern[] = [];
  const conditionals = findNodes(ast, node => node.type === 'conditional' || node.type === 'if');

  if (conditionals.length > 0) {
    patterns.push({
      name: 'conditional-logic-pattern',
      description: 'Conditional branching logic',
      frequency: conditionals.length,
      nodes: conditionals,
      category: 'control-flow',
    });
  }

  return patterns;
}

function extractUIInteractionPatterns(ast: ASTNode): SemanticPattern[] {
  const patterns: SemanticPattern[] = [];

  // Look for modal patterns (toggle + class manipulation)
  const toggleCommands = findNodes(
    ast,
    node => node.type === 'command' && (node as any).name === 'toggle'
  );

  const modalTogglePattern = toggleCommands.filter(cmd => {
    const args = (cmd as any).args || [];
    return args.some((arg: any) => arg.value && arg.value.includes('modal'));
  });

  if (modalTogglePattern.length > 0) {
    patterns.push({
      name: 'modal-toggle-pattern',
      description: 'Modal dialog toggle interaction',
      frequency: modalTogglePattern.length,
      nodes: modalTogglePattern,
      category: 'ui-interaction',
    });
  }

  return patterns;
}

// ============================================================================
// Comprehensive Semantic Analysis
// ============================================================================

/**
 * Perform comprehensive semantic analysis of AST
 */
export function analyzeSemantics(ast: ASTNode): SemanticAnalysis {
  const intents = extractIntents(ast);
  const patterns = extractSemanticPatterns(ast);
  const concepts = extractConcepts(ast);
  const relationships = extractRelationships(ast);
  const complexity = calculateSemanticComplexity(ast);

  return {
    intents,
    patterns,
    concepts,
    relationships,
    complexity,
  };
}

function extractConcepts(ast: ASTNode): string[] {
  const concepts = new Set<string>();

  // Extract concepts from event types
  const eventHandlers = findNodes(ast, node => node.type === 'eventHandler');
  for (const handler of eventHandlers) {
    const event = (handler as any).event;
    concepts.add(`${event}-interaction`);
  }

  // Extract concepts from command types
  const commands = findNodes(ast, node => node.type === 'command');
  for (const command of commands) {
    const name = (command as any).name;
    concepts.add(`${name}-operation`);
  }

  // Extract concepts from selectors
  const selectors = findNodes(ast, node => node.type === 'selector');
  for (const selector of selectors) {
    const value = (selector as any).value;
    if (value) {
      if (value.startsWith('#')) concepts.add('id-targeting');
      if (value.startsWith('.')) concepts.add('class-targeting');
      if (value.includes('form')) concepts.add('form-handling');
      if (value.includes('button')) concepts.add('button-interaction');
    }
  }

  return Array.from(concepts);
}

function extractRelationships(ast: ASTNode): SemanticRelationship[] {
  const relationships: SemanticRelationship[] = [];

  // Find command chains within event handlers
  const eventHandlers = findNodes(ast, node => node.type === 'eventHandler');
  for (const handler of eventHandlers) {
    const commands = (handler as any).commands || [];

    for (let i = 0; i < commands.length - 1; i++) {
      const current = commands[i];
      const next = commands[i + 1];

      relationships.push({
        from: current,
        to: next,
        type: 'triggers',
        strength: 0.8,
      });
    }
  }

  // Find fetch -> put relationships
  const fetchCommands = findNodes(
    ast,
    node => node.type === 'command' && (node as any).name === 'fetch'
  );
  const putCommands = findNodes(
    ast,
    node => node.type === 'command' && (node as any).name === 'put'
  );

  // Simple heuristic: fetch followed by put in same handler
  for (const handler of eventHandlers) {
    const commands = (handler as any).commands || [];
    for (let i = 0; i < commands.length - 1; i++) {
      if (commands[i].name === 'fetch' && commands[i + 1].name === 'put') {
        relationships.push({
          from: commands[i],
          to: commands[i + 1],
          type: 'updates',
          strength: 0.9,
        });
      }
    }
  }

  return relationships;
}

function calculateSemanticComplexity(ast: ASTNode): SemanticComplexity {
  const intents = extractIntents(ast);
  const patterns = extractSemanticPatterns(ast);
  const concepts = extractConcepts(ast);
  const relationships = extractRelationships(ast);

  // Calculate conceptual complexity based on number of unique concepts
  const conceptualComplexity = Math.min(concepts.length / 10, 1);

  // Calculate interaction complexity based on event handlers and their commands
  const eventHandlers = findNodes(ast, node => node.type === 'eventHandler');
  const totalCommands = eventHandlers.reduce(
    (sum, handler) => sum + ((handler as any).commands || []).length,
    0
  );
  const interactionComplexity = Math.min(totalCommands / 20, 1);

  // Calculate data flow complexity based on fetch commands and relationships
  const dataFlowNodes = findNodes(
    ast,
    node => node.type === 'command' && ['fetch', 'put', 'set'].includes((node as any).name)
  );
  const dataFlowComplexity = Math.min(dataFlowNodes.length / 10, 1);

  // Calculate cognitive load based on all factors
  const cognitiveLoad = (conceptualComplexity + interactionComplexity + dataFlowComplexity) / 3;

  return {
    conceptualComplexity,
    interactionComplexity,
    dataFlowComplexity,
    cognitiveLoad,
  };
}
