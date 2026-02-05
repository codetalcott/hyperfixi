/**
 * Static Analyzer
 *
 * Performs static analysis on hyperscript AST to gather information
 * for optimization and code generation.
 */

import type {
  ASTNode,
  AnalysisResult,
  VariableInfo,
  SelectorInfo,
  SourceLocation,
  CommandNode,
  EventHandlerNode,
  IfNode,
  RepeatNode,
  ForEachNode,
  WhileNode,
  VariableNode,
  SelectorNode,
  BinaryExpressionNode,
  CallExpressionNode,
} from '../types/aot-types.js';

// =============================================================================
// ANALYZER CLASS
// =============================================================================

/**
 * Static analyzer for hyperscript AST.
 */
export class Analyzer {
  /**
   * Analyze an AST and return analysis results.
   */
  analyze(ast: ASTNode): AnalysisResult {
    const visitor = new AnalysisVisitor();
    visitor.visit(ast);
    return visitor.getResult();
  }
}

// =============================================================================
// ANALYSIS VISITOR
// =============================================================================

/**
 * Visitor that walks the AST and collects analysis data.
 */
class AnalysisVisitor {
  private commandsUsed = new Set<string>();
  private localVars = new Map<string, VariableInfo>();
  private globalVars = new Map<string, VariableInfo>();
  private contextVars = new Set<string>();
  private pureExpressions: ASTNode[] = [];
  private dynamicExpressions: ASTNode[] = [];
  private selectors: SelectorInfo[] = [];
  private selectorMap = new Map<string, SelectorInfo>();
  private domQueries: string[] = [];
  private eventTypes: string[] = [];
  private behaviors: string[] = [];
  private runtimeHelpers = new Set<string>();
  private warnings: string[] = [];

  private hasAsync = false;
  private hasLoops = false;
  private hasConditionals = false;
  private canThrow = false;
  private currentNestingDepth = 0;
  private maxNestingDepth = 0;

  private currentLocation?: SourceLocation;

  /**
   * Visit an AST node and its children.
   */
  visit(node: ASTNode): void {
    if (!node) return;

    switch (node.type) {
      case 'event':
        this.visitEvent(node as EventHandlerNode);
        break;
      case 'command':
        this.visitCommand(node as CommandNode);
        break;
      case 'if':
        this.visitIf(node as IfNode);
        break;
      case 'repeat':
        this.visitRepeat(node as RepeatNode);
        break;
      case 'foreach':
        this.visitForEach(node as ForEachNode);
        break;
      case 'while':
        this.visitWhile(node as WhileNode);
        break;
      case 'variable':
        this.visitVariable(node as VariableNode, 'read');
        break;
      case 'selector':
        this.visitSelector(node as SelectorNode);
        break;
      case 'binary':
        this.visitBinary(node as BinaryExpressionNode);
        break;
      case 'call':
        this.visitCall(node as CallExpressionNode);
        break;
      case 'identifier':
        this.visitIdentifier(node);
        break;
      default:
        // Visit children for other node types
        this.visitChildren(node);
    }
  }

  /**
   * Get the analysis result.
   */
  getResult(): AnalysisResult {
    return {
      commandsUsed: this.commandsUsed,
      variables: {
        locals: this.localVars,
        globals: this.globalVars,
        contextVars: this.contextVars,
      },
      expressions: {
        pure: this.pureExpressions,
        dynamic: this.dynamicExpressions,
        selectors: this.selectors,
      },
      controlFlow: {
        hasAsync: this.hasAsync,
        hasLoops: this.hasLoops,
        hasConditionals: this.hasConditionals,
        canThrow: this.canThrow,
        maxNestingDepth: this.maxNestingDepth,
      },
      dependencies: {
        domQueries: [...new Set(this.domQueries)],
        eventTypes: [...new Set(this.eventTypes)],
        behaviors: [...new Set(this.behaviors)],
        runtimeHelpers: Array.from(this.runtimeHelpers),
      },
      warnings: this.warnings,
    };
  }

  // ===========================================================================
  // VISITOR METHODS
  // ===========================================================================

  private visitEvent(node: EventHandlerNode): void {
    this.eventTypes.push(node.event);

    // Check for event modifiers that need runtime helpers
    if (node.modifiers?.debounce) {
      this.runtimeHelpers.add('debounce');
    }
    if (node.modifiers?.throttle) {
      this.runtimeHelpers.add('throttle');
    }

    // Visit body
    if (node.body) {
      for (const child of node.body) {
        this.visit(child);
      }
    }
  }

  private visitCommand(node: CommandNode): void {
    this.commandsUsed.add(node.name);

    // Track commands that need runtime helpers
    switch (node.name) {
      case 'fetch':
        this.hasAsync = true;
        this.runtimeHelpers.add('fetchJSON');
        this.runtimeHelpers.add('fetchText');
        break;
      case 'wait':
      case 'settle':
        this.hasAsync = true;
        this.runtimeHelpers.add('wait');
        break;
      case 'toggle':
        this.runtimeHelpers.add('toggle');
        break;
      case 'send':
      case 'trigger':
        this.runtimeHelpers.add('send');
        break;
      case 'halt':
      case 'exit':
        this.canThrow = true;
        break;
      case 'throw':
        this.canThrow = true;
        break;
      case 'call':
        // May need behavior lookup
        if (node.args?.[0]?.type === 'identifier') {
          this.behaviors.push((node.args[0] as unknown as { value: string }).value);
        }
        break;
    }

    // Visit arguments and target
    if (node.args) {
      for (const arg of node.args) {
        this.visit(arg);
      }
    }
    if (node.target) {
      this.visit(node.target);
    }
  }

  private visitIf(node: IfNode): void {
    this.hasConditionals = true;
    this.enterNesting();

    this.visit(node.condition);

    for (const child of node.thenBranch) {
      this.visit(child);
    }

    if (node.elseIfBranches) {
      for (const branch of node.elseIfBranches) {
        this.visit(branch.condition);
        for (const child of branch.body) {
          this.visit(child);
        }
      }
    }

    if (node.elseBranch) {
      for (const child of node.elseBranch) {
        this.visit(child);
      }
    }

    this.exitNesting();
  }

  private visitRepeat(node: RepeatNode): void {
    this.hasLoops = true;
    this.enterNesting();

    if (node.count && typeof node.count !== 'number') {
      this.visit(node.count);
    }
    if (node.whileCondition) {
      this.visit(node.whileCondition);
    }

    for (const child of node.body) {
      this.visit(child);
    }

    this.exitNesting();
  }

  private visitForEach(node: ForEachNode): void {
    this.hasLoops = true;
    this.enterNesting();

    // Register loop variable as local
    this.registerVariable(node.itemName, 'local', 'write');
    if (node.indexName) {
      this.registerVariable(node.indexName, 'local', 'write');
    }

    this.visit(node.collection);

    for (const child of node.body) {
      this.visit(child);
    }

    this.exitNesting();
  }

  private visitWhile(node: WhileNode): void {
    this.hasLoops = true;
    this.enterNesting();

    this.visit(node.condition);

    for (const child of node.body) {
      this.visit(child);
    }

    this.exitNesting();
  }

  private visitVariable(node: VariableNode, access: 'read' | 'write'): void {
    const name =
      node.name.startsWith(':') || node.name.startsWith('$') ? node.name.slice(1) : node.name;

    this.registerVariable(name, node.scope, access);
  }

  private visitSelector(node: SelectorNode): void {
    const selector = node.value;

    // Track for selector caching optimization
    if (!this.selectorMap.has(selector)) {
      const info: SelectorInfo = {
        selector,
        usages: [],
        isId: selector.startsWith('#') && !selector.includes(' '),
        canCache: this.canCacheSelector(selector),
      };
      this.selectorMap.set(selector, info);
      this.selectors.push(info);
    }

    this.selectorMap
      .get(selector)!
      .usages.push(this.currentLocation ?? { file: '', line: 0, column: 0 });
    this.domQueries.push(selector);

    // Pure if it's a simple selector without pseudo-elements
    if (this.isPureSelector(selector)) {
      this.pureExpressions.push(node);
    } else {
      this.dynamicExpressions.push(node);
    }
  }

  private visitBinary(node: BinaryExpressionNode): void {
    this.visit(node.left);
    this.visit(node.right);

    // Check if this is a pure expression
    if (this.isPureExpression(node)) {
      this.pureExpressions.push(node);
    }

    // Some operators need runtime helpers
    switch (node.operator) {
      case 'contains':
        this.runtimeHelpers.add('contains');
        break;
      case 'matches':
        this.runtimeHelpers.add('matches');
        break;
    }
  }

  private visitCall(node: CallExpressionNode): void {
    this.visit(node.callee);
    if (node.args) {
      for (const arg of node.args) {
        this.visit(arg);
      }
    }

    // Mark as dynamic expression
    this.dynamicExpressions.push(node);
  }

  private visitIdentifier(node: ASTNode): void {
    const value =
      (node as { value?: string; name?: string }).value ?? (node as { name?: string }).name;

    if (!value) return;

    // Track context variable usage
    switch (value) {
      case 'me':
      case 'my':
        this.contextVars.add('me');
        break;
      case 'you':
      case 'your':
        this.contextVars.add('you');
        break;
      case 'it':
      case 'result':
        this.contextVars.add('it');
        break;
      case 'event':
        this.contextVars.add('event');
        break;
      case 'body':
      case 'document':
      case 'window':
        // Global references - always available
        break;
      default:
        // Could be a behavior or external reference
        if (value.charAt(0) === value.charAt(0).toUpperCase()) {
          this.behaviors.push(value);
        }
    }
  }

  // ===========================================================================
  // HELPER METHODS
  // ===========================================================================

  private visitChildren(node: ASTNode): void {
    for (const key of Object.keys(node)) {
      const value = node[key];
      if (value && typeof value === 'object') {
        if (Array.isArray(value)) {
          for (const item of value) {
            if (item && typeof item === 'object' && 'type' in item) {
              this.visit(item as ASTNode);
            }
          }
        } else if ('type' in value) {
          this.visit(value as ASTNode);
        }
      }
    }
  }

  private registerVariable(
    name: string,
    scope: 'local' | 'global' | 'element',
    access: 'read' | 'write'
  ): void {
    const map = scope === 'global' ? this.globalVars : this.localVars;

    if (!map.has(name)) {
      map.set(name, {
        name,
        scope,
        reads: [],
        writes: [],
        type: 'unknown',
      });
    }

    const info = map.get(name)!;
    const location = this.currentLocation ?? { file: '', line: 0, column: 0 };

    if (access === 'read') {
      info.reads.push(location);
    } else {
      info.writes.push(location);
    }
  }

  private enterNesting(): void {
    this.currentNestingDepth++;
    this.maxNestingDepth = Math.max(this.maxNestingDepth, this.currentNestingDepth);
  }

  private exitNesting(): void {
    this.currentNestingDepth--;
  }

  private canCacheSelector(selector: string): boolean {
    // Can cache simple selectors that don't change
    // Cannot cache if it uses :not(), :has(), or other dynamic pseudo-classes
    const dynamicPseudo =
      /:(not|has|is|where|nth-|first-|last-|only-|empty|focus|hover|active|visited)/i;
    return !dynamicPseudo.test(selector);
  }

  private isPureSelector(selector: string): boolean {
    // Pure selectors are static ID or class selectors
    return /^[#.][a-zA-Z_][a-zA-Z0-9_-]*$/.test(selector);
  }

  private isPureExpression(node: ASTNode): boolean {
    if (!node) return true;

    switch (node.type) {
      case 'literal':
        return true;
      case 'identifier': {
        const value = (node as { value?: string }).value;
        // Context variables are not pure (they change per invocation)
        return !['me', 'you', 'it', 'result', 'event'].includes(value ?? '');
      }
      case 'binary': {
        const bin = node as BinaryExpressionNode;
        return this.isPureExpression(bin.left) && this.isPureExpression(bin.right);
      }
      default:
        return false;
    }
  }
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Analyze an AST and return results.
 */
export function analyze(ast: ASTNode): AnalysisResult {
  const analyzer = new Analyzer();
  return analyzer.analyze(ast);
}

/**
 * Check if an AST contains async operations.
 */
export function hasAsyncOperations(ast: ASTNode): boolean {
  const result = analyze(ast);
  return result.controlFlow.hasAsync;
}

/**
 * Get all commands used in an AST.
 */
export function getCommandsUsed(ast: ASTNode): string[] {
  const result = analyze(ast);
  return Array.from(result.commandsUsed);
}

/**
 * Get required runtime helpers for an AST.
 */
export function getRequiredHelpers(ast: ASTNode): string[] {
  const result = analyze(ast);
  return result.dependencies.runtimeHelpers;
}

export default Analyzer;
