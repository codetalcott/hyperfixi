/**
 * AST Visitor Pattern Implementation
 * Provides traversal, analysis, and transformation capabilities for hyperscript ASTs
 */

import type { ASTNode, VisitorHandlers, VisitorContext } from '../types.js';

/**
 * Internal visitor context implementation
 */
class VisitorContextImpl implements VisitorContext {
  private _skipped = false;
  private _stopped = false;
  private _replaced: ASTNode | null = null;
  private _path: (string | number)[] = [];
  private _parent: ASTNode | null = null;
  private _scope = new Map<string, any>();

  constructor(path: (string | number)[] = [], parent: ASTNode | null = null) {
    this._path = [...path];
    this._parent = parent;
  }

  skip(): void {
    this._skipped = true;
  }

  stop(): void {
    this._stopped = true;
  }

  replace(node: ASTNode): void {
    this._replaced = node;
  }

  getPath(): (string | number)[] {
    return [...this._path];
  }

  getParent(): ASTNode | null {
    return this._parent;
  }

  getScope(): Map<string, any> {
    return new Map(this._scope);
  }

  setScope(key: string, value: any): void {
    this._scope.set(key, value);
  }

  // Internal methods for visitor implementation
  get skipped(): boolean {
    return this._skipped;
  }

  get stopped(): boolean {
    return this._stopped;
  }

  get replacement(): ASTNode | null {
    return this._replaced;
  }

  createChild(key: string | number, parent: ASTNode): VisitorContextImpl {
    const child = new VisitorContextImpl([...this._path, key], parent);
    // Inherit scope
    for (const [k, v] of this._scope) {
      child._scope.set(k, v);
    }
    return child;
  }
}

/**
 * AST Visitor class for traversing and analyzing hyperscript ASTs
 */
export class ASTVisitor {
  constructor(private handlers: VisitorHandlers) {}

  /**
   * Visit a node and its children
   */
  visit(node: ASTNode, context: VisitorContextImpl): ASTNode | null {
    if (!node) return null;

    // Call enter handler
    if (this.handlers.enter) {
      this.handlers.enter(node, context);
    }

    // Call type-specific handler
    const typeHandler = this.handlers[node.type];
    if (typeHandler) {
      typeHandler(node, context);
    }

    // Check if traversal should stop
    if (context.stopped) {
      return context.replacement || node;
    }

    // Check if children should be skipped
    if (!context.skipped) {
      // Visit children
      const visitedNode = this.visitChildren(node, context);
      if (visitedNode !== node) {
        node = visitedNode;
      }
    }

    // Call exit handler
    if (this.handlers.exit) {
      this.handlers.exit(node, context);
    }

    return context.replacement || node;
  }

  /**
   * Visit all children of a node
   */
  private visitChildren(node: ASTNode, context: VisitorContextImpl): ASTNode {
    const result = { ...node };
    let modified = false;

    // Visit all enumerable properties that could contain child nodes
    for (const [key, value] of Object.entries(node)) {
      if (key === 'type' || key === 'start' || key === 'end' || key === 'line' || key === 'column') {
        continue; // Skip metadata
      }

      if (Array.isArray(value)) {
        // Handle arrays of nodes
        const newArray: any[] = [];
        for (let i = 0; i < value.length; i++) {
          const item = value[i];
          if (this.isASTNode(item)) {
            const childContext = context.createChild(`${key}/${i}`, node);
            const visitedChild = this.visit(item, childContext);
            if (visitedChild) {
              newArray.push(visitedChild);
              if (visitedChild !== item) {
                modified = true;
              }
            } else {
              modified = true; // Child was removed
            }
            if (childContext.stopped) {
              break;
            }
          } else {
            newArray.push(item);
          }
        }
        if (modified || newArray.length !== value.length) {
          (result as any)[key] = newArray;
          modified = true;
        }
      } else if (this.isASTNode(value)) {
        // Handle single child nodes
        const childContext = context.createChild(key, node);
        const visitedChild = this.visit(value, childContext);
        if (visitedChild !== value) {
          (result as any)[key] = visitedChild;
          modified = true;
        }
        if (childContext.stopped) {
          break;
        }
      }
    }

    return modified ? result : node;
  }

  /**
   * Check if a value is an AST node
   */
  private isASTNode(value: any): value is ASTNode {
    return value && 
           typeof value === 'object' && 
           typeof value.type === 'string';
    // Note: start/end are optional for flexibility in testing
  }
}

/**
 * Visit an AST with a visitor
 */
export function visit(ast: ASTNode | null, visitor: ASTVisitor): ASTNode | null {
  if (!ast) return null;
  
  const context = new VisitorContextImpl();
  return visitor.visit(ast, context);
}

/**
 * Find all nodes matching a predicate
 */
export function findNodes(ast: ASTNode | null, predicate: (node: ASTNode) => boolean): ASTNode[] {
  if (!ast) return [];
  
  const results: ASTNode[] = [];
  
  const visitor = new ASTVisitor({
    enter(node) {
      if (predicate(node)) {
        results.push(node);
      }
    }
  });
  
  visit(ast, visitor);
  return results;
}

/**
 * Find the first node matching a predicate
 */
export function findFirst(ast: ASTNode | null, predicate: (node: ASTNode) => boolean): ASTNode | null {
  if (!ast) return null;
  
  let result: ASTNode | null = null;
  
  const visitor = new ASTVisitor({
    enter(node, context) {
      if (predicate(node)) {
        result = node;
        context.stop();
      }
    }
  });
  
  visit(ast, visitor);
  return result;
}

/**
 * Get all ancestors of a node in the AST
 */
export function getAncestors(ast: ASTNode | null, targetNode: ASTNode): ASTNode[] {
  if (!ast || !targetNode) return [];
  
  const ancestors: ASTNode[] = [];
  let found = false;
  
  function findPath(node: ASTNode, path: ASTNode[]): boolean {
    if (node === targetNode) {
      ancestors.push(...path.reverse());
      return true;
    }
    
    // Check all child properties
    for (const [key, value] of Object.entries(node)) {
      if (key === 'type' || key === 'start' || key === 'end' || key === 'line' || key === 'column') {
        continue;
      }
      
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item && typeof item === 'object' && typeof item.type === 'string') {
            if (findPath(item, [...path, node])) {
              return true;
            }
          }
        }
      } else if (value && typeof value === 'object' && typeof value.type === 'string') {
        if (findPath(value, [...path, node])) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  findPath(ast, []);
  return ancestors;
}

/**
 * Create a visitor that collects nodes by type
 */
export function createTypeCollector(types: string[]): ASTVisitor {
  const typeSet = new Set(types);
  const collected: Record<string, ASTNode[]> = {};
  
  for (const type of types) {
    collected[type] = [];
  }
  
  return new ASTVisitor({
    enter(node) {
      if (typeSet.has(node.type)) {
        collected[node.type].push(node);
      }
    }
  });
}

/**
 * Create a visitor that measures AST depth
 */
export function measureDepth(ast: ASTNode): number {
  let maxDepth = 0;
  let currentDepth = 0;
  
  const visitor = new ASTVisitor({
    enter() {
      currentDepth++;
      maxDepth = Math.max(maxDepth, currentDepth);
    },
    exit() {
      currentDepth--;
    }
  });
  
  visit(ast, visitor);
  return maxDepth;
}

/**
 * Create a visitor that counts nodes by type
 */
export function countNodeTypes(ast: ASTNode): Record<string, number> {
  const counts: Record<string, number> = {};
  
  const visitor = new ASTVisitor({
    enter(node) {
      counts[node.type] = (counts[node.type] || 0) + 1;
    }
  });
  
  visit(ast, visitor);
  return counts;
}