/**
 * AI-Friendly APIs for AST Toolkit
 * Provides natural language interfaces for AST explanation, code generation, and analysis
 */

import { findNodes, calculateComplexity, analyzeMetrics, detectCodeSmells } from '../index.js';
import type { ASTNode, ComplexityMetrics, CodeSmell, AnalysisResult } from '../types.js';
import {
  searchPatterns,
  getLLMExamples,
  isPatternsReferenceAvailable,
  type PatternEntry,
  type LLMExample,
} from '../pattern-matching/patterns-bridge.js';

// ============================================================================
// Natural Language Explanation
// ============================================================================

export interface ExplanationOptions {
  includeComplexity?: boolean;
  includePatterns?: boolean;
  includeSmells?: boolean;
  detail?: 'brief' | 'detailed' | 'comprehensive';
  audience?: 'developer' | 'beginner' | 'expert';
}

export interface CodeExplanation {
  overview: string;
  structure: string;
  behavior: string;
  complexity?: string;
  patterns?: string[];
  smells?: string[];
  suggestions?: string[];
}

/**
 * Generate natural language explanation of AST code
 */
export function explainCode(ast: ASTNode, options: ExplanationOptions = {}): CodeExplanation {
  const {
    includeComplexity = true,
    includePatterns = true,
    includeSmells = true,
    detail = 'detailed',
    audience = 'developer',
  } = options;

  const explanation: CodeExplanation = {
    overview: generateOverview(ast, audience),
    structure: describeStructure(ast, detail),
    behavior: describeBehavior(ast, detail),
    patterns: [],
    smells: [],
    suggestions: [],
  };

  if (includeComplexity) {
    explanation.complexity = describeComplexity(ast, audience);
  }

  if (includePatterns) {
    explanation.patterns = identifyPatterns(ast);
  }

  if (includeSmells) {
    const analysis = analyzeMetrics(ast);
    explanation.smells = describeCodeSmells(analysis.smells, audience);
    explanation.suggestions = generateSuggestions(analysis, audience);
  }

  return explanation;
}

/**
 * Generate a high-level overview of the code
 */
function generateOverview(ast: ASTNode, audience: string): string {
  const eventHandlers = findNodes(ast, node => node.type === 'eventHandler');
  const behaviors = findNodes(ast, node => node.type === 'behavior');
  const functions = findNodes(ast, node => node.type === 'function' || node.type === 'def');

  const parts: string[] = [];

  if (audience === 'beginner') {
    parts.push('This hyperscript code defines interactive web page behavior.');
  } else {
    parts.push('This hyperscript program implements client-side interactivity.');
  }

  if (eventHandlers.length > 0) {
    const eventTypes = eventHandlers
      .map(h => (h as any).event)
      .filter((e, i, arr) => arr.indexOf(e) === i);
    if (audience === 'beginner') {
      parts.push(
        `It responds to ${eventHandlers.length} user action${eventHandlers.length > 1 ? 's' : ''} (${eventTypes.join(', ')}).`
      );
    } else {
      parts.push(
        `Contains ${eventHandlers.length} event handler${eventHandlers.length > 1 ? 's' : ''} for ${eventTypes.join(', ')} events.`
      );
    }
  }

  if (behaviors.length > 0) {
    parts.push(`Defines ${behaviors.length} reusable behavior${behaviors.length > 1 ? 's' : ''}.`);
  }

  if (functions.length > 0) {
    parts.push(`Includes ${functions.length} custom function${functions.length > 1 ? 's' : ''}.`);
  }

  return parts.join(' ');
}

/**
 * Describe the structural organization of the code
 */
function describeStructure(ast: ASTNode, detail: string): string {
  const structure: string[] = [];

  if (ast.type === 'program') {
    const features = (ast as any).features || [];
    structure.push(
      `Program with ${features.length} top-level feature${features.length !== 1 ? 's' : ''}:`
    );

    for (const feature of features) {
      switch (feature.type) {
        case 'eventHandler':
          const selector = feature.selector ? ` on ${feature.selector}` : '';
          structure.push(`  • Event handler for '${feature.event}'${selector}`);
          if (detail === 'comprehensive' && feature.commands) {
            structure.push(
              `    Contains ${feature.commands.length} command${feature.commands.length !== 1 ? 's' : ''}`
            );
          }
          break;
        case 'behavior':
          structure.push(`  • Behavior definition: ${feature.name || 'anonymous'}`);
          break;
        case 'function':
        case 'def':
          structure.push(`  • Function definition: ${feature.name || 'anonymous'}`);
          break;
        default:
          structure.push(`  • ${feature.type} feature`);
      }
    }
  } else {
    structure.push(`Single ${ast.type} feature`);
  }

  return structure.join('\n');
}

/**
 * Describe what the code does behaviorally
 */
function describeBehavior(ast: ASTNode, detail: string): string {
  const behaviors: string[] = [];
  const eventHandlers = findNodes(ast, node => node.type === 'eventHandler');

  if (eventHandlers.length === 0) {
    return 'No interactive behavior defined.';
  }

  for (const handler of eventHandlers) {
    const handlerData = handler as any;
    const event = handlerData.event;
    const selector = handlerData.selector;
    const commands = handlerData.commands || [];

    let description = `When user ${getEventDescription(event)}`;

    if (selector) {
      description += ` on elements matching '${selector}'`;
    }

    description += `, the code will:`;
    behaviors.push(description);

    if (detail === 'brief') {
      behaviors.push(`  • Execute ${commands.length} action${commands.length !== 1 ? 's' : ''}`);
    } else {
      for (const command of commands) {
        behaviors.push(`  • ${describeCommand(command, detail)}`);
      }
    }

    behaviors.push(''); // Empty line between handlers
  }

  return behaviors.join('\n').trim();
}

/**
 * Get user-friendly description of an event
 */
function getEventDescription(event: string): string {
  const eventMap: Record<string, string> = {
    click: 'clicks',
    hover: 'hovers over',
    focus: 'focuses on',
    blur: 'leaves',
    submit: 'submits',
    change: 'changes',
    keyup: 'releases a key on',
    keydown: 'presses a key on',
    mouseover: 'moves mouse over',
    mouseout: 'moves mouse away from',
    load: 'page loads with',
  };

  return eventMap[event] || `triggers '${event}' event on`;
}

/**
 * Describe what a command does
 */
function describeCommand(command: any, detail: string): string {
  const name = command.name;
  const args = command.args || [];
  const target = command.target;

  switch (name) {
    case 'add':
      const addArg = args[0]?.value || 'class';
      return `Add ${addArg} to ${describeTarget(target)}`;

    case 'remove':
      const removeArg = args[0]?.value || 'class';
      return `Remove ${removeArg} from ${describeTarget(target)}`;

    case 'toggle':
      const toggleArg = args[0]?.value || 'class';
      return `Toggle ${toggleArg} on ${describeTarget(target)}`;

    case 'put':
      const putValue = args[0]?.value || 'value';
      return `Set content to '${putValue}' ${target ? `on ${describeTarget(target)}` : ''}`;

    case 'fetch':
      const url = args[0]?.value || 'URL';
      return `Make HTTP request to ${url}`;

    case 'set':
      const varName = command.variable?.name || 'variable';
      const value = command.value?.value || 'value';
      return `Set variable '${varName}' to ${value}`;

    case 'if':
      return `Check condition and execute commands conditionally`;

    case 'log':
      const logValue = args[0]?.value || 'message';
      return `Log '${logValue}' to console`;

    case 'wait':
      const duration = args[0]?.value || 'time';
      return `Wait for ${duration}`;

    case 'send':
      const event = args[0]?.value || 'event';
      return `Send '${event}' event`;

    default:
      return `Execute '${name}' command${args.length > 0 ? ` with ${args.length} argument${args.length !== 1 ? 's' : ''}` : ''}`;
  }
}

/**
 * Describe a target element or selector
 */
function describeTarget(target: any): string {
  if (!target) return 'current element';

  if (target.type === 'identifier') {
    const name = target.name;
    switch (name) {
      case 'me':
        return 'current element';
      case 'it':
        return 'current context';
      case 'you':
        return 'event target';
      default:
        return name;
    }
  }

  if (target.type === 'selector') {
    return `elements matching '${target.value}'`;
  }

  return 'target element';
}

/**
 * Describe code complexity in natural language
 */
function describeComplexity(ast: ASTNode, audience: string): string {
  const complexity = calculateComplexity(ast);
  const descriptions: string[] = [];

  if (audience === 'beginner') {
    if (complexity.cyclomatic <= 3) {
      descriptions.push('This code is simple and easy to understand.');
    } else if (complexity.cyclomatic <= 7) {
      descriptions.push('This code has moderate complexity with some branching logic.');
    } else {
      descriptions.push(
        'This code is complex with multiple decision points that may be hard to follow.'
      );
    }
  } else {
    descriptions.push(
      `Cyclomatic complexity: ${complexity.cyclomatic} (${getCyclomaticRating(complexity.cyclomatic)})`
    );
    descriptions.push(
      `Cognitive complexity: ${complexity.cognitive} (${getCognitiveRating(complexity.cognitive)})`
    );

    if (audience === 'expert') {
      descriptions.push(
        `Halstead metrics: vocabulary=${complexity.halstead.vocabulary}, length=${complexity.halstead.length}, difficulty=${complexity.halstead.difficulty.toFixed(2)}`
      );
    }
  }

  return descriptions.join('\n');
}

function getCyclomaticRating(complexity: number): string {
  if (complexity <= 3) return 'simple';
  if (complexity <= 7) return 'moderate';
  if (complexity <= 10) return 'complex';
  return 'very complex';
}

function getCognitiveRating(complexity: number): string {
  if (complexity <= 5) return 'easy to understand';
  if (complexity <= 10) return 'moderate mental load';
  if (complexity <= 15) return 'high mental load';
  return 'very hard to understand';
}

/**
 * Identify common patterns in the code
 */
function identifyPatterns(ast: ASTNode): string[] {
  const patterns: string[] = [];
  const eventHandlers = findNodes(ast, node => node.type === 'eventHandler');

  // Check for common UI patterns
  const clickHandlers = eventHandlers.filter(h => (h as any).event === 'click');
  const hoverHandlers = eventHandlers.filter(h => (h as any).event === 'hover');

  if (clickHandlers.length > 1) {
    patterns.push('Multiple click handlers suggest interactive UI elements');
  }

  if (hoverHandlers.length > 0) {
    patterns.push('Hover interactions for improved user experience');
  }

  // Check for toggle patterns
  const toggleCommands = findNodes(
    ast,
    node => node.type === 'command' && (node as any).name === 'toggle'
  );

  if (toggleCommands.length > 0) {
    patterns.push('Toggle functionality for state management');
  }

  // Check for AJAX patterns
  const fetchCommands = findNodes(
    ast,
    node => node.type === 'command' && (node as any).name === 'fetch'
  );

  if (fetchCommands.length > 0) {
    patterns.push('AJAX requests for dynamic content loading');
  }

  // Check for form handling
  const submitHandlers = eventHandlers.filter(h => (h as any).event === 'submit');
  if (submitHandlers.length > 0) {
    patterns.push('Form submission handling');
  }

  return patterns;
}

/**
 * Describe code smells in natural language
 */
function describeCodeSmells(smells: CodeSmell[], audience: string): string[] {
  return smells.map(smell => {
    if (audience === 'beginner') {
      return translateSmellForBeginner(smell);
    } else {
      return smell.message;
    }
  });
}

function translateSmellForBeginner(smell: CodeSmell): string {
  switch (smell.type) {
    case 'excessive-nesting':
      return 'Code is nested too deeply, making it hard to read';
    case 'duplicate-code':
      return 'Some code is repeated and could be simplified';
    case 'long-command-chain':
      return 'Too many actions in one place - consider breaking them up';
    case 'complex-condition':
      return 'Complex logic condition that might be confusing';
    default:
      return smell.message;
  }
}

/**
 * Generate improvement suggestions
 */
function generateSuggestions(analysis: AnalysisResult, audience: string): string[] {
  const suggestions: string[] = [];

  if (analysis.maintainabilityIndex < 70) {
    if (audience === 'beginner') {
      suggestions.push('Consider simplifying the code to make it easier to maintain');
    } else {
      suggestions.push(
        'Refactor to improve maintainability (current index: ' +
          analysis.maintainabilityIndex.toFixed(1) +
          ')'
      );
    }
  }

  if (analysis.complexity.cyclomatic > 10) {
    suggestions.push('Break down complex logic into smaller, focused functions');
  }

  if (analysis.smells.some(s => s.type === 'duplicate-code')) {
    suggestions.push('Extract common code into reusable behaviors or functions');
  }

  if (analysis.smells.some(s => s.type === 'long-command-chain')) {
    suggestions.push('Split long command chains into separate event handlers');
  }

  return suggestions;
}

// ============================================================================
// Code Generation Assistance
// ============================================================================

export interface CodeGenerationOptions {
  style?: 'minimal' | 'verbose' | 'documented';
  includeComments?: boolean;
  targetAudience?: 'beginner' | 'intermediate' | 'expert';
}

export interface CodeTemplate {
  pattern: string;
  description: string;
  code: string;
  explanation: string;
  variations?: CodeTemplate[];
}

/**
 * Generate hyperscript code templates based on intent
 */
export function generateCodeTemplate(
  intent: string,
  options: CodeGenerationOptions = {}
): CodeTemplate {
  const { style = 'documented', includeComments = true, targetAudience = 'intermediate' } = options;

  const normalizedIntent = intent.toLowerCase().trim();

  // Pattern matching for common intents
  if (normalizedIntent.includes('toggle') && normalizedIntent.includes('class')) {
    return generateToggleClassTemplate(options);
  }

  if (
    normalizedIntent.includes('fetch') ||
    normalizedIntent.includes('ajax') ||
    normalizedIntent.includes('api')
  ) {
    return generateFetchTemplate(options);
  }

  if (normalizedIntent.includes('form') && normalizedIntent.includes('submit')) {
    return generateFormSubmitTemplate(options);
  }

  if (normalizedIntent.includes('modal') || normalizedIntent.includes('popup')) {
    return generateModalTemplate(options);
  }

  if (normalizedIntent.includes('validate') || normalizedIntent.includes('validation')) {
    return generateValidationTemplate(options);
  }

  // Default template
  return generateBasicEventHandlerTemplate(intent, options);
}

function generateToggleClassTemplate(options: CodeGenerationOptions): CodeTemplate {
  const { style, includeComments, targetAudience } = options;

  let code = `on click toggle .active`;
  let explanation =
    "This creates a click handler that toggles the 'active' class on the clicked element.";

  if (style === 'verbose' || targetAudience === 'beginner') {
    code = `on click from me toggle .active on me`;
    explanation =
      "When this element is clicked, it will add or remove the 'active' class from itself.";
  }

  if (includeComments && style === 'documented') {
    code = `-- Toggle active state when clicked\n${code}`;
  }

  return {
    pattern: 'toggle-class',
    description: 'Toggle CSS class on click',
    code,
    explanation,
    variations: [
      {
        pattern: 'toggle-class-target',
        description: 'Toggle class on different element',
        code: `on click toggle .active on #target`,
        explanation:
          "Toggle the 'active' class on an element with id 'target' when this element is clicked.",
      },
      {
        pattern: 'toggle-multiple-classes',
        description: 'Toggle multiple classes',
        code: `on click toggle .active .visible .enabled`,
        explanation: 'Toggle multiple classes at once when clicked.',
      },
    ],
  };
}

function generateFetchTemplate(options: CodeGenerationOptions): CodeTemplate {
  const { style, includeComments } = options;

  let code = `on click fetch /api/data then put it into #result`;

  if (style === 'verbose') {
    code = `on click from me fetch /api/data as json then put result into #result`;
  }

  if (includeComments && style === 'documented') {
    code = `-- Fetch data from API and display it\n${code}`;
  }

  return {
    pattern: 'fetch-data',
    description: 'Fetch data from API',
    code,
    explanation:
      "When clicked, this will make an HTTP request to '/api/data' and put the response into an element with id 'result'.",
    variations: [
      {
        pattern: 'fetch-with-loading',
        description: 'Fetch with loading indicator',
        code: `on click add .loading then fetch /api/data then remove .loading then put it into #result`,
        explanation:
          'Show a loading state while fetching data, then hide it and display the result.',
      },
      {
        pattern: 'fetch-with-error-handling',
        description: 'Fetch with error handling',
        code: `on click fetch /api/data catch log 'Error loading data' then put 'Failed to load' into #result`,
        explanation: 'Handle errors by logging them and showing a fallback message.',
      },
    ],
  };
}

function generateFormSubmitTemplate(options: CodeGenerationOptions): CodeTemplate {
  const { style, includeComments } = options;

  let code = `on submit fetch /api/submit with form then put 'Success!' into #message`;

  if (style === 'verbose') {
    code = `on submit from form prevent default then fetch /api/submit with form as formData then put 'Form submitted successfully!' into #message`;
  }

  if (includeComments && style === 'documented') {
    code = `-- Handle form submission with AJAX\n${code}`;
  }

  return {
    pattern: 'form-submit',
    description: 'Handle form submission',
    code,
    explanation:
      'When the form is submitted, prevent the default browser behavior and submit the form data via AJAX.',
    variations: [
      {
        pattern: 'form-validation',
        description: 'Form with validation',
        code: `on submit if form.checkValidity() then fetch /api/submit with form else add .error`,
        explanation: 'Validate the form before submission and show error styling if invalid.',
      },
    ],
  };
}

function generateModalTemplate(options: CodeGenerationOptions): CodeTemplate {
  const { style, includeComments } = options;

  let code = `on click toggle .modal-open on body`;

  if (style === 'verbose') {
    code = `on click from .modal-trigger toggle .modal-open on body then focus on #modal-content`;
  }

  if (includeComments && style === 'documented') {
    code = `-- Open/close modal dialog\n${code}`;
  }

  return {
    pattern: 'modal-toggle',
    description: 'Modal dialog toggle',
    code,
    explanation: 'Toggle a modal dialog by adding/removing a CSS class on the body element.',
    variations: [
      {
        pattern: 'modal-with-overlay',
        description: 'Modal with overlay close',
        code: `on click from .modal-trigger toggle .modal-open on body
on click from .modal-overlay toggle .modal-open on body`,
        explanation: 'Open modal with trigger, and close it by clicking the overlay background.',
      },
    ],
  };
}

function generateValidationTemplate(options: CodeGenerationOptions): CodeTemplate {
  const { style, includeComments } = options;

  let code = `on input if target.value.length < 3 then add .invalid else remove .invalid`;

  if (style === 'verbose') {
    code = `on input from input[required] if target.value.length < 3 then add .invalid to target else remove .invalid from target`;
  }

  if (includeComments && style === 'documented') {
    code = `-- Real-time form validation\n${code}`;
  }

  return {
    pattern: 'input-validation',
    description: 'Real-time input validation',
    code,
    explanation: 'Validate input as the user types and show visual feedback.',
    variations: [
      {
        pattern: 'email-validation',
        description: 'Email format validation',
        code: `on input if target.value matches /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/ then remove .invalid else add .invalid`,
        explanation: 'Validate email format using a regular expression.',
      },
    ],
  };
}

function generateBasicEventHandlerTemplate(
  intent: string,
  options: CodeGenerationOptions
): CodeTemplate {
  const { includeComments } = options;

  let code = `on click log 'Button clicked'`;

  if (includeComments) {
    code = `-- ${intent}\n${code}`;
  }

  return {
    pattern: 'basic-handler',
    description: 'Basic event handler',
    code,
    explanation: 'A simple event handler that responds to user interaction.',
  };
}

// ============================================================================
// Intent Recognition
// ============================================================================

export interface RecognizedIntent {
  intent: string;
  confidence: number;
  parameters: Record<string, string>;
  suggestions: string[];
  /** Matching patterns from the patterns-reference database */
  matchingPatterns?: PatternEntry[];
  /** LLM examples for this intent from the database */
  examples?: LLMExample[];
}

/**
 * Recognize intent from natural language description
 */
export function recognizeIntent(description: string): RecognizedIntent {
  const normalizedDesc = description.toLowerCase().trim();

  // Define intent patterns
  const intentPatterns = [
    {
      pattern: /(toggle|switch) (class|css class) ([\w\-\.]+)/,
      intent: 'toggle-class',
      confidence: 0.9,
      extractor: (match: RegExpMatchArray) => ({ class: match[3] }),
    },
    {
      pattern: /(fetch|get|load) (data|api)?\s*from\s+([\w\/\-\.]+)/,
      intent: 'fetch-data',
      confidence: 0.85,
      extractor: (match: RegExpMatchArray) => ({ url: match[3] }),
    },
    {
      pattern: /(submit|send) (form|data)/,
      intent: 'form-submit',
      confidence: 0.8,
      extractor: () => ({}),
    },
    {
      pattern: /(open|show|close|hide) (modal|popup|dialog)/,
      intent: 'modal-toggle',
      confidence: 0.85,
      extractor: () => ({}),
    },
    {
      pattern: /(validate|check) (input|form|field)/,
      intent: 'input-validation',
      confidence: 0.8,
      extractor: () => ({}),
    },
    {
      pattern: /(add|remove) (class|css class) ([\w\-\.]+)/,
      intent: 'modify-class',
      confidence: 0.8,
      extractor: (match: RegExpMatchArray) => ({ action: match[1], class: match[3] }),
    },
  ];

  for (const { pattern, intent, confidence, extractor } of intentPatterns) {
    const match = normalizedDesc.match(pattern);
    if (match) {
      return {
        intent,
        confidence,
        parameters: extractor(match),
        suggestions: generateIntentSuggestions(intent),
      };
    }
  }

  // Fallback for unrecognized intents
  return {
    intent: 'custom',
    confidence: 0.3,
    parameters: { description: normalizedDesc },
    suggestions: [
      'Try describing what should happen when user clicks, types, or interacts',
      'Examples: "toggle class active", "fetch data from API", "submit form"',
    ],
  };
}

/**
 * Recognize intent from natural language description with patterns-reference integration
 *
 * This async variant queries the patterns-reference database for:
 * - Matching patterns from 53 validated patterns
 * - LLM examples from 212 curated examples with quality scores
 *
 * Falls back to regex-based recognition if patterns-reference is unavailable.
 */
export async function recognizeIntentAsync(
  description: string,
  options: { language?: string; limit?: number } = {}
): Promise<RecognizedIntent> {
  const { language = 'en', limit = 5 } = options;

  // First try the sync regex-based recognition
  const baseResult = recognizeIntent(description);

  // If patterns-reference is not available, return the base result
  if (!isPatternsReferenceAvailable()) {
    return baseResult;
  }

  try {
    // Search patterns database for matching patterns
    const matchingPatterns = await searchPatterns(description);

    // Get LLM examples for this intent
    const examples = await getLLMExamples(description, language, limit);

    // If we found matching patterns with better confidence, use them
    const topPattern = matchingPatterns[0];
    if (topPattern) {
      // Combine database results with regex-based recognition
      const enhancedResult: RecognizedIntent = {
        ...baseResult,
        // Boost confidence if we found matching patterns
        confidence: Math.max(baseResult.confidence, topPattern.confidence * 0.9),
        matchingPatterns: matchingPatterns.slice(0, limit),
        examples,
        suggestions: [
          ...baseResult.suggestions,
          ...matchingPatterns.slice(0, 3).map(p => p.title || `Pattern: ${p.command || 'custom'}`),
        ],
      };

      // If the pattern has a clear command, use it as the intent
      if (topPattern.command && topPattern.confidence > 0.8) {
        enhancedResult.intent = topPattern.command;
        enhancedResult.parameters = {
          ...baseResult.parameters,
          patternId: topPattern.id,
          patternCode: topPattern.code,
        };
      }

      return enhancedResult;
    }

    // No matching patterns found, but add any LLM examples we found
    if (examples.length > 0) {
      return {
        ...baseResult,
        examples,
      };
    }

    return baseResult;
  } catch (error) {
    // If patterns-reference fails, fall back to base result
    console.warn('patterns-reference lookup failed:', error);
    return baseResult;
  }
}

/**
 * Check if enhanced intent recognition is available
 * (patterns-reference database is installed and initialized)
 */
export function isEnhancedIntentRecognitionAvailable(): boolean {
  return isPatternsReferenceAvailable();
}

function generateIntentSuggestions(intent: string): string[] {
  const suggestions: Record<string, string[]> = {
    'toggle-class': [
      'Specify which element should be targeted',
      'Consider what visual change the class provides',
      'Think about the initial state',
    ],
    'fetch-data': [
      'Specify the API endpoint URL',
      'Consider error handling',
      'Think about loading states',
    ],
    'form-submit': [
      'Consider form validation',
      'Think about success/error feedback',
      'Consider data format (JSON, FormData)',
    ],
    'modal-toggle': [
      'Consider how to close the modal',
      'Think about focus management',
      'Consider overlay click behavior',
    ],
    'input-validation': [
      'Define validation rules',
      'Consider when to show feedback',
      'Think about error messages',
    ],
  };

  return suggestions[intent] || [];
}

// ============================================================================
// Code Quality Insights
// ============================================================================

export interface QualityInsight {
  category: 'performance' | 'maintainability' | 'readability' | 'best-practice';
  level: 'info' | 'warning' | 'error';
  message: string;
  suggestion: string;
  automated?: boolean; // Whether this can be auto-fixed
}

/**
 * Generate AI-powered insights about code quality
 */
export function generateQualityInsights(ast: ASTNode): QualityInsight[] {
  const insights: QualityInsight[] = [];
  const analysis = analyzeMetrics(ast);

  // Performance insights
  const eventHandlers = findNodes(ast, node => node.type === 'eventHandler');
  if (eventHandlers.length > 10) {
    insights.push({
      category: 'performance',
      level: 'warning',
      message: `Found ${eventHandlers.length} event handlers`,
      suggestion: 'Consider using event delegation for better performance with many handlers',
      automated: false,
    });
  }

  // Maintainability insights
  if (analysis.maintainabilityIndex < 50) {
    insights.push({
      category: 'maintainability',
      level: 'error',
      message: 'Low maintainability index',
      suggestion: 'Refactor complex logic into smaller, focused behaviors',
      automated: false,
    });
  }

  // Readability insights
  if (analysis.complexity.cognitive > 15) {
    insights.push({
      category: 'readability',
      level: 'warning',
      message: 'High cognitive complexity detected',
      suggestion: 'Break down complex conditional logic into named functions',
      automated: false,
    });
  }

  // Best practice insights
  const fetchCommands = findNodes(
    ast,
    node => node.type === 'command' && (node as any).name === 'fetch'
  );

  for (const fetchCmd of fetchCommands) {
    // Check if fetch has error handling
    const parent = findParentHandler(ast, fetchCmd);
    if (parent && !hasErrorHandling(parent)) {
      insights.push({
        category: 'best-practice',
        level: 'info',
        message: 'Fetch request without error handling',
        suggestion: 'Add error handling with "catch" or conditional logic',
        automated: true,
      });
    }
  }

  return insights;
}

function findParentHandler(ast: ASTNode, targetNode: ASTNode): ASTNode | null {
  // Simplified parent finding - in practice this would need proper tree traversal
  const handlers = findNodes(ast, node => node.type === 'eventHandler');

  for (const handler of handlers) {
    const commands = findNodes(handler, node => node === targetNode);
    if (commands.length > 0) {
      return handler;
    }
  }

  return null;
}

function hasErrorHandling(handler: ASTNode): boolean {
  // Check if handler contains error handling patterns
  const errorKeywords = findNodes(
    handler,
    node => node.type === 'command' && ['catch', 'error', 'fail'].includes((node as any).name)
  );

  return errorKeywords.length > 0;
}

// ============================================================================
// Export Main AI Interface
// ============================================================================

export interface AIAssistant {
  explainCode: typeof explainCode;
  generateCodeTemplate: typeof generateCodeTemplate;
  recognizeIntent: typeof recognizeIntent;
  recognizeIntentAsync: typeof recognizeIntentAsync;
  generateQualityInsights: typeof generateQualityInsights;
  isEnhancedIntentRecognitionAvailable: typeof isEnhancedIntentRecognitionAvailable;
}

/**
 * Create an AI assistant instance with all capabilities
 */
export function createAIAssistant(): AIAssistant {
  return {
    explainCode,
    generateCodeTemplate,
    recognizeIntent,
    recognizeIntentAsync,
    generateQualityInsights,
    isEnhancedIntentRecognitionAvailable,
  };
}
