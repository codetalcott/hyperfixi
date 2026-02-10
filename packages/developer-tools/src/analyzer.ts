/**
 * Code Analyzer
 * Static analysis for HyperScript code and DOM structure
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { glob } from 'glob';
import type {
  AnalysisResult,
  ScriptAnalysis,
  ElementAnalysis,
  AnalysisIssue,
  AnalysisMetrics,
} from './types';

/**
 * HyperScript patterns and features
 */
const HYPERSCRIPT_PATTERNS = {
  events: /on\s+(\w+)/g,
  commands:
    /\b(add|remove|toggle|put|take|make|wait|send|trigger|call|get|set|log|halt|prevent|stop)\b/g,
  selectors:
    /<[^>]+>|#[\w-]+|\.[\w-]+|\[[\w-]+(=.*?)?\]|closest\s+[^,\s]+|first\s+[^,\s]+|last\s+[^,\s]+/g,
  references: /\b(me|my|you|your|it|its|the|this|that|target|event|detail)\b/g,
  operators:
    /\b(and|or|not|is|is\s+not|matches|contains|does\s+not\s+contain|starts\s+with|ends\s+with)\b/g,
  literals: /"[^"]*"|'[^']*'|\b\d+(?:\.\d+)?\b|\btrue\b|\bfalse\b|\bnull\b|\bundefined\b/g,
  variables: /\$\w+|\b[a-zA-Z_]\w*(?=\s*:)/g,
  functions: /\b\w+\s*\(/g,
  conditions: /\bif\b|\bthen\b|\belse\b|\bunless\b|\bwhen\b/g,
  loops: /\bfor\b|\bwhile\b|\brepeat\b|\buntil\b/g,
};

/**
 * Common issues to detect
 */
const ISSUE_PATTERNS = [
  {
    pattern: /on\s+[\w\s]+\s+from\s+nowhere/g,
    type: 'warning' as const,
    code: 'W001',
    message: 'Event listener without proper target',
    suggestion: 'Specify an event target or use "from me"',
  },
  {
    pattern: /put\s+.*\s+into\s+nowhere/g,
    type: 'error' as const,
    code: 'E001',
    message: 'Put command without target',
    suggestion: 'Specify a target element for the put command',
  },
  {
    pattern: /\bthen\s+\bthen\b/g,
    type: 'warning' as const,
    code: 'W002',
    message: 'Duplicate "then" keyword',
    suggestion: 'Remove duplicate "then" keyword',
  },
  {
    pattern: /\bme\b.*\bme\b/g,
    type: 'info' as const,
    code: 'I001',
    message: 'Multiple references to "me" in single expression',
    suggestion: 'Consider breaking into multiple statements for clarity',
  },
  {
    pattern: /<[^>]*[^/]>/g,
    type: 'info' as const,
    code: 'I002',
    message: 'CSS selector may be ambiguous',
    suggestion: 'Consider using more specific selectors',
  },
];

/**
 * Analyze a single project
 */
export async function analyzeProject(
  projectPath: string,
  options: {
    recursive?: boolean;
    format?: 'table' | 'json' | 'detailed';
    include?: string[];
    exclude?: string[];
  } = {}
): Promise<AnalysisResult[]> {
  const {
    recursive = true,
    include = ['**/*.html', '**/*.htm'],
    exclude = ['node_modules/**', 'dist/**'],
  } = options;

  // Find all HTML files (use Set to deduplicate)
  const patterns = include.map(pattern => path.join(projectPath, pattern));
  const fileSet = new Set<string>();

  for (const pattern of patterns) {
    const matches = await glob(pattern, {
      ignore: exclude,
      absolute: true,
    });
    matches.forEach(f => fileSet.add(f));
  }

  const files = Array.from(fileSet);

  // Analyze each file
  const results: AnalysisResult[] = [];
  for (const file of files) {
    try {
      const result = await analyzeFile(file);
      results.push(result);
    } catch (error) {
      // Add error result for files that couldn't be analyzed
      results.push({
        file: path.relative(projectPath, file),
        scripts: [],
        elements: [],
        dependencies: [],
        complexity: 0,
        issues: [
          {
            type: 'error',
            code: 'E002',
            message: `Failed to analyze file: ${error instanceof Error ? error.message : String(error)}`,
            line: 0,
            column: 0,
          },
        ],
        metrics: {
          totalScripts: 0,
          totalElements: 0,
          totalLines: 0,
          averageComplexity: 0,
          featuresUsed: [],
          commandsUsed: [],
          eventsUsed: [],
        },
      });
    }
  }

  return results;
}

/**
 * Analyze a single file
 */
export async function analyzeFile(filePath: string): Promise<AnalysisResult> {
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.split('\n');

  // Parse HTML and extract hyperscript
  const elements = parseElements(content);
  const scripts = extractHyperScripts(elements, lines);

  // Analyze scripts
  const analyzedScripts = scripts.map(script => analyzeScript(script, lines));

  // Extract dependencies
  const dependencies = extractDependencies(content);

  // Calculate complexity
  const complexity = calculateComplexity(analyzedScripts);

  // Collect all issues
  const issues = analyzedScripts.flatMap(script => script.issues);

  // Calculate metrics
  const metrics = calculateMetrics(analyzedScripts, elements);

  return {
    file: path.basename(filePath),
    scripts: analyzedScripts,
    elements,
    dependencies,
    complexity,
    issues,
    metrics,
  };
}

/**
 * Parse HTML elements
 */
function parseElements(html: string): ElementAnalysis[] {
  const elements: ElementAnalysis[] = [];
  const lines = html.split('\n');

  // Simple HTML parser - in production, would use a proper HTML parser
  const elementRegex = /<(\w+)([^>]*)>/g;
  let match;

  while ((match = elementRegex.exec(html)) !== null) {
    const [fullMatch, tag, attributes] = match;
    const lineNumber = html.substring(0, match.index).split('\n').length;
    const columnNumber = match.index - html.lastIndexOf('\n', match.index);

    // Parse attributes
    const attrs: Record<string, string> = {};
    const classes: string[] = [];
    let id: string | undefined;
    let hyperscript: string | undefined;

    // Handle both single and double quoted attributes, including nested quotes
    const attrRegex = /(\w+(?:-\w+)*)=(?:"([^"]*)"|'([^']*)')/g;
    let attrMatch;

    while ((attrMatch = attrRegex.exec(attributes)) !== null) {
      const [, name, doubleQuotedValue, singleQuotedValue] = attrMatch;
      const value = doubleQuotedValue ?? singleQuotedValue ?? '';
      attrs[name] = value;

      if (name === 'class') {
        classes.push(...value.split(/\s+/).filter(Boolean));
      } else if (name === 'id') {
        id = value;
      } else if (name === '_' || name.startsWith('_') || name === 'data-script') {
        hyperscript = value;
      }
    }

    elements.push({
      tag,
      id,
      classes,
      attributes: attrs,
      hyperscript,
      children: [], // Would need proper parsing for children
      line: lineNumber,
      column: columnNumber,
    });
  }

  return elements;
}

/**
 * Extract HyperScript code from elements
 */
function extractHyperScripts(
  elements: ElementAnalysis[],
  lines: string[]
): Array<{
  content: string;
  line: number;
  column: number;
}> {
  const scripts: Array<{ content: string; line: number; column: number }> = [];

  for (const element of elements) {
    if (element.hyperscript) {
      scripts.push({
        content: element.hyperscript,
        line: element.line,
        column: element.column,
      });
    }
  }

  return scripts;
}

/**
 * Analyze a single HyperScript
 */
function analyzeScript(
  script: { content: string; line: number; column: number },
  lines: string[]
): ScriptAnalysis {
  const { content, line, column } = script;

  // Extract features
  const features: string[] = [];
  const events: string[] = [];
  const selectors: string[] = [];
  const commands: string[] = [];
  const variables: string[] = [];
  const references: string[] = [];
  const issues: AnalysisIssue[] = [];

  // Analyze patterns
  for (const [featureName, pattern] of Object.entries(HYPERSCRIPT_PATTERNS)) {
    const matches = Array.from(content.matchAll(pattern));

    if (matches.length > 0) {
      features.push(featureName);

      switch (featureName) {
        case 'events':
          events.push(...matches.map(m => m[1]?.trim()).filter(Boolean));
          break;
        case 'commands':
          commands.push(...matches.map(m => m[0]).filter(Boolean));
          break;
        case 'selectors':
          selectors.push(...matches.map(m => m[0]).filter(Boolean));
          break;
        case 'variables':
          variables.push(...matches.map(m => m[0]).filter(Boolean));
          break;
        case 'references':
          references.push(...matches.map(m => m[0]).filter(Boolean));
          break;
      }
    }
  }

  // Check for issues
  for (const issuePattern of ISSUE_PATTERNS) {
    const matches = Array.from(content.matchAll(issuePattern.pattern));

    for (const match of matches) {
      const matchLine = content.substring(0, match.index).split('\n').length;
      const matchColumn = match.index! - content.lastIndexOf('\n', match.index!);

      issues.push({
        type: issuePattern.type,
        code: issuePattern.code,
        message: issuePattern.message,
        line: line + matchLine - 1,
        column: column + matchColumn,
        suggestion: issuePattern.suggestion,
      });
    }
  }

  // Calculate complexity
  const complexity = calculateScriptComplexity(content, features);

  return {
    content,
    line,
    column,
    features,
    complexity,
    events,
    selectors,
    commands,
    variables,
    references,
    issues,
  };
}

/**
 * Calculate script complexity score
 */
function calculateScriptComplexity(content: string, features: string[]): number {
  let score = 1; // Base complexity

  // Add complexity for different features
  const complexityWeights = {
    events: 1,
    commands: 1,
    selectors: 2,
    conditions: 3,
    loops: 4,
    functions: 2,
    variables: 1,
  };

  for (const feature of features) {
    const weight = complexityWeights[feature as keyof typeof complexityWeights] || 1;
    score += weight;
  }

  // Add complexity for nesting (rough estimate)
  const nestingLevel = (content.match(/\(/g) || []).length;
  score += nestingLevel;

  // Add complexity for length
  const lengthFactor = Math.floor(content.length / 50);
  score += lengthFactor;

  return Math.max(1, score);
}

/**
 * Calculate overall complexity
 */
function calculateComplexity(scripts: ScriptAnalysis[]): number {
  if (scripts.length === 0) return 0;

  const totalComplexity = scripts.reduce((sum, script) => sum + script.complexity, 0);
  return Math.round(totalComplexity / scripts.length);
}

/**
 * Extract dependencies from HTML
 */
function extractDependencies(html: string): string[] {
  const dependencies: Set<string> = new Set();

  // Look for script tags
  const scriptRegex = /<script[^>]*src=["']([^"']+)["']/g;
  let match;

  while ((match = scriptRegex.exec(html)) !== null) {
    const src = match[1];

    // Extract library names from CDN URLs
    if (src.includes('hyperscript') || src.includes('_hyperscript')) {
      dependencies.add('hyperscript');
    }
    if (src.includes('hyperfixi')) {
      dependencies.add('@hyperfixi/core');
    }
    if (src.includes('alpine')) {
      dependencies.add('alpinejs');
    }
    if (src.includes('htmx')) {
      dependencies.add('htmx.org');
    }
  }

  return Array.from(dependencies);
}

/**
 * Calculate analysis metrics
 */
function calculateMetrics(scripts: ScriptAnalysis[], elements: ElementAnalysis[]): AnalysisMetrics {
  const allFeatures = new Set<string>();
  const allCommands = new Set<string>();
  const allEvents = new Set<string>();
  let totalLines = 0;
  let totalComplexity = 0;

  for (const script of scripts) {
    script.features.forEach(feature => allFeatures.add(feature));
    script.commands.forEach(command => allCommands.add(command));
    script.events.forEach(event => allEvents.add(event));
    totalLines += script.content.split('\n').length;
    totalComplexity += script.complexity;
  }

  return {
    totalScripts: scripts.length,
    totalElements: elements.length,
    totalLines,
    averageComplexity: scripts.length > 0 ? Math.round(totalComplexity / scripts.length) : 0,
    featuresUsed: Array.from(allFeatures),
    commandsUsed: Array.from(allCommands),
    eventsUsed: Array.from(allEvents),
  };
}

/**
 * Generate analysis report
 */
export function generateReport(
  results: AnalysisResult[],
  format: 'table' | 'json' | 'detailed' = 'table'
): string {
  switch (format) {
    case 'json':
      return JSON.stringify(results, null, 2);

    case 'detailed':
      return generateDetailedReport(results);

    case 'table':
    default:
      return generateTableReport(results);
  }
}

/**
 * Generate table report
 */
function generateTableReport(results: AnalysisResult[]): string {
  const lines: string[] = [];

  lines.push('File Analysis Report');
  lines.push('='.repeat(50));
  lines.push('');

  for (const result of results) {
    lines.push(`📁 ${result.file}`);
    lines.push(`   Scripts: ${result.scripts.length}`);
    lines.push(`   Elements: ${result.elements.length}`);
    lines.push(`   Complexity: ${result.complexity}`);
    lines.push(`   Dependencies: ${result.dependencies.join(', ') || 'None'}`);

    if (result.issues.length > 0) {
      lines.push(`   Issues: ${result.issues.length}`);

      const errorCount = result.issues.filter(i => i.type === 'error').length;
      const warningCount = result.issues.filter(i => i.type === 'warning').length;
      const infoCount = result.issues.filter(i => i.type === 'info').length;

      if (errorCount > 0) lines.push(`     Errors: ${errorCount}`);
      if (warningCount > 0) lines.push(`     Warnings: ${warningCount}`);
      if (infoCount > 0) lines.push(`     Info: ${infoCount}`);
    }

    lines.push('');
  }

  // Summary
  const totalScripts = results.reduce((sum, r) => sum + r.scripts.length, 0);
  const totalElements = results.reduce((sum, r) => sum + r.elements.length, 0);
  const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);
  const avgComplexity =
    results.length > 0
      ? Math.round(results.reduce((sum, r) => sum + r.complexity, 0) / results.length)
      : 0;

  lines.push('Summary');
  lines.push('-'.repeat(20));
  lines.push(`Total Files: ${results.length}`);
  lines.push(`Total Scripts: ${totalScripts}`);
  lines.push(`Total Elements: ${totalElements}`);
  lines.push(`Total Issues: ${totalIssues}`);
  lines.push(`Average Complexity: ${avgComplexity}`);

  return lines.join('\n');
}

/**
 * Generate detailed report
 */
function generateDetailedReport(results: AnalysisResult[]): string {
  const lines: string[] = [];

  lines.push('# HyperScript Analysis Report');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');

  for (const result of results) {
    lines.push(`## ${result.file}`);
    lines.push('');

    // Metrics
    lines.push('### Metrics');
    lines.push('');
    lines.push(`- Scripts: ${result.metrics.totalScripts}`);
    lines.push(`- Elements: ${result.metrics.totalElements}`);
    lines.push(`- Lines: ${result.metrics.totalLines}`);
    lines.push(`- Average Complexity: ${result.metrics.averageComplexity}`);
    lines.push('');

    // Features
    if (result.metrics.featuresUsed.length > 0) {
      lines.push('### Features Used');
      lines.push('');
      result.metrics.featuresUsed.forEach(feature => {
        lines.push(`- ${feature}`);
      });
      lines.push('');
    }

    // Events Used
    if (result.metrics.eventsUsed.length > 0) {
      lines.push('### Events Used');
      lines.push('');
      result.metrics.eventsUsed.forEach(event => {
        lines.push(`- ${event}`);
      });
      lines.push('');
    }

    // Commands Used
    if (result.metrics.commandsUsed.length > 0) {
      lines.push('### Commands Used');
      lines.push('');
      result.metrics.commandsUsed.forEach(command => {
        lines.push(`- ${command}`);
      });
      lines.push('');
    }

    // Dependencies
    if (result.dependencies.length > 0) {
      lines.push('### Dependencies');
      lines.push('');
      result.dependencies.forEach(dep => {
        lines.push(`- ${dep}`);
      });
      lines.push('');
    }

    // Issues
    if (result.issues.length > 0) {
      lines.push('### Issues');
      lines.push('');

      const groupedIssues = {
        error: result.issues.filter(i => i.type === 'error'),
        warning: result.issues.filter(i => i.type === 'warning'),
        info: result.issues.filter(i => i.type === 'info'),
      };

      for (const [type, issues] of Object.entries(groupedIssues)) {
        if (issues.length > 0) {
          lines.push(`#### ${type.charAt(0).toUpperCase() + type.slice(1)}s`);
          lines.push('');

          for (const issue of issues) {
            lines.push(`- **${issue.code}**: ${issue.message} (${issue.line}:${issue.column})`);
            if (issue.suggestion) {
              lines.push(`  - *Suggestion*: ${issue.suggestion}`);
            }
          }
          lines.push('');
        }
      }
    }

    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Validate HyperScript syntax
 */
export function validateScript(content: string): AnalysisIssue[] {
  const issues: AnalysisIssue[] = [];

  // Check for issue patterns
  for (const issuePattern of ISSUE_PATTERNS) {
    const matches = Array.from(content.matchAll(issuePattern.pattern));

    for (const match of matches) {
      const matchLine = content.substring(0, match.index).split('\n').length;
      const matchColumn = match.index! - content.lastIndexOf('\n', match.index!);

      issues.push({
        type: issuePattern.type,
        code: issuePattern.code,
        message: issuePattern.message,
        line: matchLine,
        column: matchColumn,
        suggestion: issuePattern.suggestion,
      });
    }
  }

  // Basic syntax validation
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Check for unmatched parentheses
    const openParens = (line.match(/\(/g) || []).length;
    const closeParens = (line.match(/\)/g) || []).length;

    if (openParens !== closeParens) {
      issues.push({
        type: 'error',
        code: 'E003',
        message: 'Unmatched parentheses',
        line: i + 1,
        column: 0,
        suggestion: 'Check parentheses are properly matched',
      });
    }

    // Check for incomplete statements
    if (line.endsWith('then') || line.endsWith('else')) {
      issues.push({
        type: 'warning',
        code: 'W003',
        message: 'Incomplete statement',
        line: i + 1,
        column: line.length,
        suggestion: 'Complete the statement or remove trailing keyword',
      });
    }
  }

  return issues;
}

/**
 * Get suggestions for improving code
 */
export function getSuggestions(analysis: AnalysisResult): string[] {
  const suggestions: string[] = [];

  // Complexity suggestions
  if (analysis.complexity > 10) {
    suggestions.push('Consider breaking complex scripts into smaller, more focused scripts');
  }

  // Performance suggestions
  const selectorCount = analysis.scripts.reduce((sum, s) => sum + s.selectors.length, 0);
  if (selectorCount > 5) {
    suggestions.push('Consider caching frequently used selectors in variables');
  }

  // Maintainability suggestions
  const totalLength = analysis.scripts.reduce((sum, s) => sum + s.content.length, 0);
  if (totalLength > 500) {
    suggestions.push('Consider extracting common behavior into reusable components');
  }

  // Error-specific suggestions
  const errorCount = analysis.issues.filter(i => i.type === 'error').length;
  if (errorCount > 0) {
    suggestions.push('Fix critical errors before deploying to production');
  }

  return suggestions;
}
