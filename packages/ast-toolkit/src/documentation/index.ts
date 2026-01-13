/**
 * Documentation Generator for AST Toolkit
 * Generates documentation from hyperscript AST nodes in various formats
 */

import { findNodes, ASTVisitor, visit } from '../visitor/index.js';
import { analyzeMetrics, calculateComplexity } from '../analyzer/index.js';
import { generate } from '../generator/index.js';
import type { ASTNode } from '../types.js';

// ============================================================================
// Types
// ============================================================================

export interface DocumentationOutput {
  /** Title of the documented code */
  title: string;
  /** Brief description */
  description: string;
  /** Event handlers documentation */
  eventHandlers: EventHandlerDoc[];
  /** Behavior definitions documentation */
  behaviors: BehaviorDoc[];
  /** Function definitions documentation */
  functions: FunctionDoc[];
  /** Overall code metrics */
  metrics: CodeMetrics;
  /** Generated timestamp */
  generatedAt: string;
}

export interface EventHandlerDoc {
  /** Event name (e.g., 'click', 'submit') */
  event: string;
  /** Source selector if any */
  selector?: string;
  /** Description of what the handler does */
  description: string;
  /** List of commands executed */
  commands: CommandDoc[];
  /** Original source code */
  source: string;
}

export interface BehaviorDoc {
  /** Behavior name */
  name: string;
  /** Parameters */
  parameters: string[];
  /** Description of what the behavior does */
  description: string;
  /** Event handlers within the behavior */
  eventHandlers: EventHandlerDoc[];
  /** Original source code */
  source: string;
}

export interface FunctionDoc {
  /** Function name */
  name: string;
  /** Parameters */
  parameters: string[];
  /** Return type description */
  returns?: string | undefined;
  /** Description of what the function does */
  description: string;
  /** Original source code */
  source: string;
}

export interface CommandDoc {
  /** Command name */
  name: string;
  /** Description of what the command does */
  description: string;
  /** Target element if any */
  target?: string | undefined;
}

export interface CodeMetrics {
  /** Total number of event handlers */
  eventHandlerCount: number;
  /** Total number of behaviors */
  behaviorCount: number;
  /** Total number of functions */
  functionCount: number;
  /** Total number of commands */
  commandCount: number;
  /** Complexity rating */
  complexity: 'simple' | 'moderate' | 'complex' | 'very complex';
  /** Cyclomatic complexity number */
  cyclomaticComplexity: number;
}

export interface MarkdownOptions {
  /** Include source code blocks */
  includeSource?: boolean;
  /** Include metrics section */
  includeMetrics?: boolean;
  /** Include table of contents */
  includeToc?: boolean;
  /** Heading level to start at (default: 1) */
  headingLevel?: number;
}

// ============================================================================
// Main Documentation Functions
// ============================================================================

/**
 * Generate documentation from an AST
 */
export function generateDocumentation(ast: ASTNode): DocumentationOutput {
  const eventHandlers = documentEventHandlers(ast);
  const behaviors = documentBehaviors(ast);
  const functions = documentFunctions(ast);
  const metrics = calculateCodeMetrics(ast);

  // Generate title based on content
  let title = 'Hyperscript Documentation';
  const firstBehavior = behaviors[0];
  if (firstBehavior) {
    title = `${firstBehavior.name} Behavior Documentation`;
  } else if (eventHandlers.length > 0) {
    const events = eventHandlers.map(h => h.event).filter((e, i, arr) => arr.indexOf(e) === i);
    title = `Event Handlers: ${events.join(', ')}`;
  }

  // Generate description
  let description = generateOverallDescription(eventHandlers, behaviors, functions);

  return {
    title,
    description,
    eventHandlers,
    behaviors,
    functions,
    metrics,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Generate Markdown documentation from an AST
 */
export function generateMarkdown(ast: ASTNode, options: MarkdownOptions = {}): string {
  const {
    includeSource = true,
    includeMetrics = true,
    includeToc = true,
    headingLevel = 1,
  } = options;

  const doc = generateDocumentation(ast);
  const h = (level: number) => '#'.repeat(headingLevel + level - 1);
  const lines: string[] = [];

  // Title
  lines.push(`${h(1)} ${doc.title}`);
  lines.push('');
  lines.push(doc.description);
  lines.push('');

  // Table of Contents
  if (includeToc && doc.eventHandlers.length + doc.behaviors.length + doc.functions.length > 2) {
    lines.push(`${h(2)} Table of Contents`);
    lines.push('');
    if (doc.eventHandlers.length > 0) {
      lines.push('- [Event Handlers](#event-handlers)');
      for (const handler of doc.eventHandlers) {
        lines.push(`  - [${handler.event}](#${slugify(handler.event)})`);
      }
    }
    if (doc.behaviors.length > 0) {
      lines.push('- [Behaviors](#behaviors)');
      for (const behavior of doc.behaviors) {
        lines.push(`  - [${behavior.name}](#${slugify(behavior.name)})`);
      }
    }
    if (doc.functions.length > 0) {
      lines.push('- [Functions](#functions)');
      for (const fn of doc.functions) {
        lines.push(`  - [${fn.name}](#${slugify(fn.name)})`);
      }
    }
    if (includeMetrics) {
      lines.push('- [Metrics](#metrics)');
    }
    lines.push('');
  }

  // Event Handlers
  if (doc.eventHandlers.length > 0) {
    lines.push(`${h(2)} Event Handlers`);
    lines.push('');

    for (const handler of doc.eventHandlers) {
      lines.push(`${h(3)} ${handler.event}`);
      lines.push('');
      if (handler.selector) {
        lines.push(`**Source:** \`${handler.selector}\``);
        lines.push('');
      }
      lines.push(handler.description);
      lines.push('');

      if (handler.commands.length > 0) {
        lines.push('**Commands:**');
        lines.push('');
        for (const cmd of handler.commands) {
          lines.push(`- \`${cmd.name}\`: ${cmd.description}`);
        }
        lines.push('');
      }

      if (includeSource) {
        lines.push('**Source Code:**');
        lines.push('');
        lines.push('```hyperscript');
        lines.push(handler.source);
        lines.push('```');
        lines.push('');
      }
    }
  }

  // Behaviors
  if (doc.behaviors.length > 0) {
    lines.push(`${h(2)} Behaviors`);
    lines.push('');

    for (const behavior of doc.behaviors) {
      const params = behavior.parameters.length > 0 ? `(${behavior.parameters.join(', ')})` : '';
      lines.push(`${h(3)} ${behavior.name}${params}`);
      lines.push('');
      lines.push(behavior.description);
      lines.push('');

      if (behavior.parameters.length > 0) {
        lines.push('**Parameters:**');
        lines.push('');
        for (const param of behavior.parameters) {
          lines.push(`- \`${param}\``);
        }
        lines.push('');
      }

      if (behavior.eventHandlers.length > 0) {
        lines.push('**Event Handlers:**');
        lines.push('');
        for (const handler of behavior.eventHandlers) {
          lines.push(`- \`on ${handler.event}\`: ${handler.description}`);
        }
        lines.push('');
      }

      if (includeSource) {
        lines.push('**Source Code:**');
        lines.push('');
        lines.push('```hyperscript');
        lines.push(behavior.source);
        lines.push('```');
        lines.push('');
      }
    }
  }

  // Functions
  if (doc.functions.length > 0) {
    lines.push(`${h(2)} Functions`);
    lines.push('');

    for (const fn of doc.functions) {
      const params = fn.parameters.length > 0 ? `(${fn.parameters.join(', ')})` : '()';
      lines.push(`${h(3)} ${fn.name}${params}`);
      lines.push('');
      lines.push(fn.description);
      lines.push('');

      if (fn.parameters.length > 0) {
        lines.push('**Parameters:**');
        lines.push('');
        for (const param of fn.parameters) {
          lines.push(`- \`${param}\``);
        }
        lines.push('');
      }

      if (fn.returns) {
        lines.push(`**Returns:** ${fn.returns}`);
        lines.push('');
      }

      if (includeSource) {
        lines.push('**Source Code:**');
        lines.push('');
        lines.push('```hyperscript');
        lines.push(fn.source);
        lines.push('```');
        lines.push('');
      }
    }
  }

  // Metrics
  if (includeMetrics) {
    lines.push(`${h(2)} Metrics`);
    lines.push('');
    lines.push('| Metric | Value |');
    lines.push('|--------|-------|');
    lines.push(`| Event Handlers | ${doc.metrics.eventHandlerCount} |`);
    lines.push(`| Behaviors | ${doc.metrics.behaviorCount} |`);
    lines.push(`| Functions | ${doc.metrics.functionCount} |`);
    lines.push(`| Commands | ${doc.metrics.commandCount} |`);
    lines.push(`| Complexity | ${doc.metrics.complexity} |`);
    lines.push(`| Cyclomatic Complexity | ${doc.metrics.cyclomaticComplexity} |`);
    lines.push('');
    lines.push(`*Generated: ${doc.generatedAt}*`);
  }

  return lines.join('\n');
}

/**
 * Generate HTML documentation from an AST
 */
export function generateHTML(ast: ASTNode, options: { title?: string } = {}): string {
  const doc = generateDocumentation(ast);
  const title = options.title || doc.title;

  const sections: string[] = [];

  // Event handlers section
  if (doc.eventHandlers.length > 0) {
    sections.push(`
      <section class="event-handlers">
        <h2>Event Handlers</h2>
        ${doc.eventHandlers
          .map(
            h => `
          <article class="event-handler">
            <h3>on ${escapeHtml(h.event)}</h3>
            ${h.selector ? `<p class="selector">Source: <code>${escapeHtml(h.selector)}</code></p>` : ''}
            <p>${escapeHtml(h.description)}</p>
            <ul class="commands">
              ${h.commands.map(c => `<li><code>${escapeHtml(c.name)}</code>: ${escapeHtml(c.description)}</li>`).join('')}
            </ul>
            <pre><code class="language-hyperscript">${escapeHtml(h.source)}</code></pre>
          </article>
        `
          )
          .join('')}
      </section>
    `);
  }

  // Behaviors section
  if (doc.behaviors.length > 0) {
    sections.push(`
      <section class="behaviors">
        <h2>Behaviors</h2>
        ${doc.behaviors
          .map(
            b => `
          <article class="behavior">
            <h3>${escapeHtml(b.name)}${b.parameters.length ? `(${escapeHtml(b.parameters.join(', '))})` : ''}</h3>
            <p>${escapeHtml(b.description)}</p>
            ${
              b.parameters.length
                ? `
              <h4>Parameters</h4>
              <ul>${b.parameters.map(p => `<li><code>${escapeHtml(p)}</code></li>`).join('')}</ul>
            `
                : ''
            }
            <pre><code class="language-hyperscript">${escapeHtml(b.source)}</code></pre>
          </article>
        `
          )
          .join('')}
      </section>
    `);
  }

  // Functions section
  if (doc.functions.length > 0) {
    sections.push(`
      <section class="functions">
        <h2>Functions</h2>
        ${doc.functions
          .map(
            f => `
          <article class="function">
            <h3>${escapeHtml(f.name)}(${escapeHtml(f.parameters.join(', '))})</h3>
            <p>${escapeHtml(f.description)}</p>
            ${f.returns ? `<p><strong>Returns:</strong> ${escapeHtml(f.returns)}</p>` : ''}
            <pre><code class="language-hyperscript">${escapeHtml(f.source)}</code></pre>
          </article>
        `
          )
          .join('')}
      </section>
    `);
  }

  // Metrics section
  sections.push(`
    <section class="metrics">
      <h2>Metrics</h2>
      <table>
        <tr><th>Metric</th><th>Value</th></tr>
        <tr><td>Event Handlers</td><td>${doc.metrics.eventHandlerCount}</td></tr>
        <tr><td>Behaviors</td><td>${doc.metrics.behaviorCount}</td></tr>
        <tr><td>Functions</td><td>${doc.metrics.functionCount}</td></tr>
        <tr><td>Commands</td><td>${doc.metrics.commandCount}</td></tr>
        <tr><td>Complexity</td><td>${doc.metrics.complexity}</td></tr>
      </table>
      <p class="timestamp">Generated: ${doc.generatedAt}</p>
    </section>
  `);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 900px; margin: 0 auto; padding: 2rem; }
    h1 { border-bottom: 2px solid #333; padding-bottom: 0.5rem; }
    h2 { color: #2563eb; margin-top: 2rem; }
    h3 { color: #374151; }
    pre { background: #f3f4f6; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; }
    code { font-family: 'SF Mono', Monaco, monospace; }
    .selector { color: #6b7280; font-size: 0.9rem; }
    .commands { list-style-type: none; padding-left: 1rem; }
    .commands li { margin: 0.5rem 0; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #d1d5db; padding: 0.5rem; text-align: left; }
    th { background: #f9fafb; }
    .timestamp { color: #9ca3af; font-size: 0.8rem; }
    article { margin: 1.5rem 0; padding: 1rem; border: 1px solid #e5e7eb; border-radius: 0.5rem; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p>${escapeHtml(doc.description)}</p>
  ${sections.join('\n')}
</body>
</html>`;
}

/**
 * Generate JSON documentation from an AST
 */
export function generateJSON(ast: ASTNode): string {
  return JSON.stringify(generateDocumentation(ast), null, 2);
}

// ============================================================================
// Helper Functions
// ============================================================================

function documentEventHandlers(ast: ASTNode): EventHandlerDoc[] {
  const handlers = findNodes(ast, node => node.type === 'eventHandler');

  return handlers.map(handler => {
    const data = handler as any;
    const commands = documentCommands(data.commands || []);

    return {
      event: data.event || 'unknown',
      selector: data.selector,
      description: generateEventHandlerDescription(data),
      commands,
      source: generate(handler),
    };
  });
}

function documentBehaviors(ast: ASTNode): BehaviorDoc[] {
  const behaviors = findNodes(ast, node => node.type === 'behavior');

  return behaviors.map(behavior => {
    const data = behavior as any;
    const eventHandlers = documentEventHandlers(behavior);

    return {
      name: data.name || 'unnamed',
      parameters: data.parameters || [],
      description: generateBehaviorDescription(data),
      eventHandlers,
      source: generate(behavior),
    };
  });
}

function documentFunctions(ast: ASTNode): FunctionDoc[] {
  const functions = findNodes(ast, node => node.type === 'function' || node.type === 'def');

  return functions.map(fn => {
    const data = fn as any;

    return {
      name: data.name || 'unnamed',
      parameters: data.parameters || data.params || [],
      returns: inferReturnType(data),
      description: generateFunctionDescription(data),
      source: generate(fn),
    };
  });
}

function documentCommands(commands: ASTNode[]): CommandDoc[] {
  return commands.map(cmd => {
    const data = cmd as any;
    return {
      name: data.name || 'unknown',
      description: getCommandDescription(data.name, data),
      target: data.target ? generate(data.target) : undefined,
    };
  });
}

function generateEventHandlerDescription(handler: any): string {
  const event = handler.event || 'event';
  const selector = handler.selector;
  const commandCount = (handler.commands || []).length;

  let desc = `Handles the '${event}' event`;
  if (selector) {
    desc += ` from elements matching '${selector}'`;
  }
  desc += `. Executes ${commandCount} command${commandCount !== 1 ? 's' : ''}.`;

  return desc;
}

function generateBehaviorDescription(behavior: any): string {
  const name = behavior.name || 'This behavior';
  const params = behavior.parameters || [];
  const body = behavior.body || behavior.eventHandlers || [];

  let desc = `${name} is a reusable behavior`;
  if (params.length > 0) {
    desc += ` that takes ${params.length} parameter${params.length !== 1 ? 's' : ''} (${params.join(', ')})`;
  }
  if (body.length > 0) {
    desc += ` and defines ${body.length} event handler${body.length !== 1 ? 's' : ''}`;
  }
  desc += '.';

  return desc;
}

function generateFunctionDescription(fn: any): string {
  const name = fn.name || 'This function';
  const params = fn.parameters || fn.params || [];

  let desc = `${name} is a custom function`;
  if (params.length > 0) {
    desc += ` that takes ${params.length} parameter${params.length !== 1 ? 's' : ''} (${params.join(', ')})`;
  }
  desc += '.';

  return desc;
}

function getCommandDescription(name: string, data: any): string {
  const descriptions: Record<string, string> = {
    add: 'Adds a class or attribute to an element',
    remove: 'Removes a class or attribute from an element',
    toggle: 'Toggles a class on an element',
    put: 'Puts content into an element',
    set: 'Sets a variable or property value',
    fetch: 'Makes an HTTP request',
    send: 'Sends a custom event',
    trigger: 'Triggers an event on an element',
    wait: 'Pauses execution for a duration',
    show: 'Shows an element',
    hide: 'Hides an element',
    log: 'Logs a message to the console',
    call: 'Calls a function',
    go: 'Navigates to a URL',
    take: 'Removes a class from other elements and adds it to this one',
  };

  return descriptions[name] || `Executes the '${name}' command`;
}

function inferReturnType(fn: any): string | undefined {
  if (fn.body && fn.body.type === 'returnStatement') {
    const arg = fn.body.argument;
    if (arg) {
      if (arg.type === 'literal') {
        return typeof arg.value;
      }
      return 'value';
    }
  }
  return undefined;
}

function generateOverallDescription(
  handlers: EventHandlerDoc[],
  behaviors: BehaviorDoc[],
  functions: FunctionDoc[]
): string {
  const parts: string[] = [];

  if (handlers.length > 0) {
    const events = handlers.map(h => h.event).filter((e, i, arr) => arr.indexOf(e) === i);
    parts.push(`Responds to ${events.join(', ')} event${events.length > 1 ? 's' : ''}`);
  }

  if (behaviors.length > 0) {
    parts.push(`defines ${behaviors.length} reusable behavior${behaviors.length > 1 ? 's' : ''}`);
  }

  if (functions.length > 0) {
    parts.push(`includes ${functions.length} custom function${functions.length > 1 ? 's' : ''}`);
  }

  if (parts.length === 0) {
    return 'No documented features.';
  }

  return parts.join(', ') + '.';
}

function calculateCodeMetrics(ast: ASTNode): CodeMetrics {
  const eventHandlers = findNodes(ast, node => node.type === 'eventHandler');
  const behaviors = findNodes(ast, node => node.type === 'behavior');
  const functions = findNodes(ast, node => node.type === 'function' || node.type === 'def');
  const commands = findNodes(ast, node => node.type === 'command');

  const complexity = calculateComplexity(ast);
  const cyclomatic = complexity.cyclomatic;

  let complexityRating: CodeMetrics['complexity'];
  if (cyclomatic <= 3) complexityRating = 'simple';
  else if (cyclomatic <= 7) complexityRating = 'moderate';
  else if (cyclomatic <= 10) complexityRating = 'complex';
  else complexityRating = 'very complex';

  return {
    eventHandlerCount: eventHandlers.length,
    behaviorCount: behaviors.length,
    functionCount: functions.length,
    commandCount: commands.length,
    complexity: complexityRating,
    cyclomaticComplexity: cyclomatic,
  };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .trim();
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
