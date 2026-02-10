import { TemplateNode, TemplateContext, HyperscriptBlock, CompilationWarning } from './types';

/**
 * Utility functions for template processing
 */

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extract all template variables from a template string
 */
export function extractTemplateVariables(
  template: string,
  delimiters: { start: string; end: string } = { start: '{{', end: '}}' }
): string[] {
  const escapedStart = escapeRegex(delimiters.start);
  const escapedEnd = escapeRegex(delimiters.end);
  // Use a more flexible pattern that captures content between delimiters
  const pattern = new RegExp(
    `${escapedStart}\\s*([^${escapeRegex(delimiters.end[0])}]+?)\\s*${escapedEnd}`,
    'g'
  );
  const variables = new Set<string>();

  let match;
  while ((match = pattern.exec(template)) !== null) {
    if (match[1]) {
      variables.add(match[1].trim());
    }
  }

  return Array.from(variables).sort();
}

/**
 * Validate template syntax for common issues
 */
export function validateTemplate(template: string): CompilationWarning[] {
  const warnings: CompilationWarning[] = [];

  // Check for unclosed template variables
  const openCount = (template.match(/\{\{/g) || []).length;
  const closeCount = (template.match(/\}\}/g) || []).length;

  if (openCount !== closeCount) {
    warnings.push({
      type: 'invalid-hyperscript',
      message: `Mismatched template variable delimiters: ${openCount} opening, ${closeCount} closing`,
    });
  }

  // Check for unclosed HTML tags
  const tagPattern = /<(\/?)\s*([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g;
  const tagStack: string[] = [];
  let match;

  while ((match = tagPattern.exec(template)) !== null) {
    const [fullMatch, isClosing, tagName] = match;

    if (isClosing) {
      // Look for matching opening tag in the stack
      const matchIndex = tagStack.lastIndexOf(tagName);

      if (matchIndex === -1) {
        // No matching opening tag found
        warnings.push({
          type: 'invalid-hyperscript',
          message: `Unexpected closing tag: </${tagName}>`,
        });
      } else {
        // Found matching tag - any tags after it are unclosed
        const unclosedTags = tagStack.splice(matchIndex);
        // Remove the matched tag itself
        unclosedTags.shift();
        // Report remaining tags as unclosed
        for (const unclosedTag of unclosedTags) {
          warnings.push({
            type: 'invalid-hyperscript',
            message: `Unclosed tag: <${unclosedTag}>`,
          });
        }
      }
    } else {
      // Skip self-closing tags
      if (!isSelfClosingTag(tagName) && !fullMatch.endsWith('/>')) {
        tagStack.push(tagName);
      }
    }
  }

  // Check for unclosed tags at the end
  for (const tag of tagStack) {
    warnings.push({
      type: 'invalid-hyperscript',
      message: `Unclosed tag: <${tag}>`,
    });
  }

  return warnings;
}

/**
 * Optimize template AST for better performance
 */
export function optimizeTemplate(nodes: TemplateNode[]): TemplateNode[] {
  return nodes.map(node => optimizeNode(node)).filter(Boolean) as TemplateNode[];
}

/**
 * Optimize individual template node
 */
function optimizeNode(node: TemplateNode): TemplateNode | null {
  // Remove empty text nodes
  if (node.type === 'text' && (!node.content || node.content.trim() === '')) {
    return null;
  }

  // Optimize children recursively
  if (node.children) {
    node.children = optimizeTemplate(node.children);
  }

  // Merge adjacent text nodes
  if (node.children && node.children.length > 1) {
    const merged: TemplateNode[] = [];
    let currentText = '';

    for (const child of node.children) {
      if (child.type === 'text' && child.content) {
        currentText += child.content;
      } else {
        if (currentText) {
          merged.push({
            type: 'text',
            content: currentText,
          });
          currentText = '';
        }
        merged.push(child);
      }
    }

    if (currentText) {
      merged.push({
        type: 'text',
        content: currentText,
      });
    }

    node.children = merged;
  }

  return node;
}

/**
 * Convert template nodes to HTML string
 */
export function nodesToHtml(nodes: TemplateNode[]): string {
  return nodes.map(nodeToHtml).join('');
}

/**
 * Convert single template node to HTML
 */
function nodeToHtml(node: TemplateNode): string {
  switch (node.type) {
    case 'text':
      return escapeHtml(node.content || '');

    case 'element':
    case 'hyperscript': {
      if (!node.tagName) return '';

      let html = `<${node.tagName}`;

      if (node.attributes) {
        for (const [name, value] of Object.entries(node.attributes)) {
          html += ` ${name}`;
          if (value) {
            html += `="${escapeAttribute(value)}"`;
          }
        }
      }

      if (isSelfClosingTag(node.tagName)) {
        html += ' />';
      } else {
        html += '>';
        if (node.children) {
          html += nodesToHtml(node.children);
        }
        html += `</${node.tagName}>`;
      }

      return html;
    }

    default:
      return '';
  }
}

/**
 * Create template context with default values
 */
export function createTemplateContext(
  variables: Record<string, any> = {},
  options: Partial<TemplateContext> = {}
): TemplateContext {
  return {
    variables,
    components: {},
    functions: {},
    ...options,
  };
}

/**
 * Merge multiple template contexts
 */
export function mergeTemplateContexts(...contexts: TemplateContext[]): TemplateContext {
  const merged: TemplateContext = {
    variables: {},
    components: {},
    functions: {},
  };

  for (const context of contexts) {
    if (context.variables) {
      Object.assign(merged.variables!, context.variables);
    }
    if (context.components) {
      Object.assign(merged.components!, context.components);
    }
    if (context.functions) {
      Object.assign(merged.functions!, context.functions);
    }
    if (context.request) {
      merged.request = { ...merged.request, ...context.request };
    }
    if (context.user) {
      merged.user = { ...merged.user, ...context.user };
    }
  }

  return merged;
}

/**
 * Analyze template complexity
 */
export function analyzeTemplateComplexity(nodes: TemplateNode[]): {
  nodeCount: number;
  depth: number;
  variableCount: number;
  directiveCount: number;
  componentCount: number;
} {
  let nodeCount = 0;
  let maxDepth = 0;
  const variables = new Set<string>();
  let directiveCount = 0;
  let componentCount = 0;

  function traverse(nodes: TemplateNode[], depth: number = 0): void {
    maxDepth = Math.max(maxDepth, depth);

    for (const node of nodes) {
      nodeCount++;

      if (node.type === 'directive') {
        directiveCount++;
      }

      if (node.type === 'component') {
        componentCount++;
      }

      // Extract variables from text content
      if (node.content) {
        const nodeVars = extractTemplateVariables(node.content);
        nodeVars.forEach(v => variables.add(v));
      }

      // Extract variables from attributes
      if (node.attributes) {
        for (const value of Object.values(node.attributes)) {
          const attrVars = extractTemplateVariables(value);
          attrVars.forEach(v => variables.add(v));
        }
      }

      if (node.children) {
        traverse(node.children, depth + 1);
      }
    }
  }

  traverse(nodes);

  return {
    nodeCount,
    depth: maxDepth,
    variableCount: variables.size,
    directiveCount,
    componentCount,
  };
}

/**
 * Performance monitoring utilities
 */
export class TemplatePerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();

  startTiming(operation: string): () => void {
    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;

      if (!this.metrics.has(operation)) {
        this.metrics.set(operation, []);
      }

      this.metrics.get(operation)!.push(duration);
    };
  }

  getStats(operation: string): {
    count: number;
    total: number;
    average: number;
    min: number;
    max: number;
  } | null {
    const times = this.metrics.get(operation);
    if (!times || times.length === 0) {
      return null;
    }

    const total = times.reduce((sum, time) => sum + time, 0);
    const average = total / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);

    return {
      count: times.length,
      total,
      average,
      min,
      max,
    };
  }

  reset(): void {
    this.metrics.clear();
  }

  getAllStats(): Record<string, ReturnType<typeof this.getStats>> {
    const stats: Record<string, ReturnType<typeof this.getStats>> = {};

    for (const operation of this.metrics.keys()) {
      stats[operation] = this.getStats(operation);
    }

    return stats;
  }
}

/**
 * Template debugging utilities
 */
export function debugTemplate(
  template: string,
  context: TemplateContext = {}
): {
  variables: string[];
  missingVariables: string[];
  unusedVariables: string[];
  warnings: CompilationWarning[];
} {
  const templateVars = extractTemplateVariables(template);
  const contextVars = Object.keys(context.variables || {});

  const missingVariables = templateVars.filter(v => !contextVars.includes(v));
  const unusedVariables = contextVars.filter(v => !templateVars.includes(v));
  const warnings = validateTemplate(template);

  return {
    variables: templateVars,
    missingVariables,
    unusedVariables,
    warnings,
  };
}

/**
 * Utility helper functions
 */
function escapeHtml(text: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };

  return text.replace(/[&<>"']/g, char => htmlEscapes[char] ?? char);
}

function escapeAttribute(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function isSelfClosingTag(tagName: string): boolean {
  const selfClosingTags = [
    'area',
    'base',
    'br',
    'col',
    'embed',
    'hr',
    'img',
    'input',
    'link',
    'meta',
    'param',
    'source',
    'track',
    'wbr',
  ];
  return selfClosingTags.includes(tagName.toLowerCase());
}
