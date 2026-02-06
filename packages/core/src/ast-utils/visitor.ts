/**
 * AST Visitor Pattern Implementation
 * Provides traversal, analysis, and transformation capabilities for hyperscript ASTs.
 *
 * Extracted from @lokascript/ast-toolkit during consolidation.
 */

import type { ASTNode, VisitorHandlers, VisitorContext } from './types.js';

class VisitorContextImpl implements VisitorContext {
  private _skipped = false;
  private _stopped = false;
  private _replaced: ASTNode | ASTNode[] | null | undefined = undefined;
  private _hasReplacement = false;
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

  replace(node: ASTNode | ASTNode[] | null): void {
    this._replaced = node;
    this._hasReplacement = true;
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

  get skipped(): boolean {
    return this._skipped;
  }

  get stopped(): boolean {
    return this._stopped;
  }

  get replacement(): ASTNode | ASTNode[] | null | undefined {
    return this._replaced;
  }

  get hasReplacement(): boolean {
    return this._hasReplacement;
  }

  createChild(key: string | number, parent: ASTNode): VisitorContextImpl {
    const child = new VisitorContextImpl([...this._path, key], parent);
    for (const [k, v] of this._scope) {
      child._scope.set(k, v);
    }
    return child;
  }
}

export class ASTVisitor {
  constructor(private handlers: VisitorHandlers) {}

  visit(node: ASTNode, context: VisitorContextImpl): ASTNode | ASTNode[] | null {
    if (!node) return null;

    if (this.handlers.enter) {
      this.handlers.enter(node, context);
    }

    const typeHandler = this.handlers[node.type];
    if (typeHandler) {
      typeHandler(node, context);
    }

    if (context.stopped || context.hasReplacement) {
      return context.replacement as ASTNode | ASTNode[] | null;
    }

    if (!context.skipped) {
      const visitedNode = this.visitChildren(node, context);
      if (visitedNode !== node) {
        node = visitedNode;
      }
    }

    if (this.handlers.exit) {
      this.handlers.exit(node, context);
    }

    if (context.hasReplacement) {
      return context.replacement as ASTNode | ASTNode[] | null;
    }
    return node;
  }

  private visitChildren(node: ASTNode, context: VisitorContextImpl): ASTNode {
    const result = { ...node };
    let modified = false;

    for (const [key, value] of Object.entries(node)) {
      if (
        key === 'type' ||
        key === 'start' ||
        key === 'end' ||
        key === 'line' ||
        key === 'column'
      ) {
        continue;
      }

      if (Array.isArray(value)) {
        const newArray: any[] = [];
        for (let i = 0; i < value.length; i++) {
          const item = value[i];
          if (this.isASTNode(item)) {
            const childContext = context.createChild(`${key}/${i}`, node);
            const visitedChild = this.visit(item, childContext);
            if (visitedChild === null) {
              modified = true;
            } else if (Array.isArray(visitedChild)) {
              newArray.push(...visitedChild);
              modified = true;
            } else {
              newArray.push(visitedChild);
              if (visitedChild !== item) {
                modified = true;
              }
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

  private isASTNode(value: any): value is ASTNode {
    return value && typeof value === 'object' && typeof value.type === 'string';
  }
}

export function visit(ast: ASTNode | null, visitor: ASTVisitor): ASTNode | null {
  if (!ast) return null;

  const context = new VisitorContextImpl();
  const result = visitor.visit(ast, context);

  if (result === null) return null;
  if (Array.isArray(result)) return result.length > 0 ? result[0]! : null;
  return result;
}

export function findNodes(ast: ASTNode | null, predicate: (node: ASTNode) => boolean): ASTNode[] {
  if (!ast) return [];

  const results: ASTNode[] = [];
  const visitor = new ASTVisitor({
    enter(node) {
      if (predicate(node)) {
        results.push(node);
      }
    },
  });

  visit(ast, visitor);
  return results;
}

export function findFirst(
  ast: ASTNode | null,
  predicate: (node: ASTNode) => boolean
): ASTNode | null {
  if (!ast) return null;

  let result: ASTNode | null = null;
  const visitor = new ASTVisitor({
    enter(node, context) {
      if (predicate(node)) {
        result = node;
        context.stop();
      }
    },
  });

  visit(ast, visitor);
  return result;
}

export function getAncestors(ast: ASTNode | null, targetNode: ASTNode): ASTNode[] {
  if (!ast || !targetNode) return [];

  const ancestors: ASTNode[] = [];

  function findPath(node: ASTNode, path: ASTNode[]): boolean {
    if (node === targetNode) {
      ancestors.push(...path.reverse());
      return true;
    }

    for (const [key, value] of Object.entries(node)) {
      if (
        key === 'type' ||
        key === 'start' ||
        key === 'end' ||
        key === 'line' ||
        key === 'column'
      ) {
        continue;
      }

      if (Array.isArray(value)) {
        for (const item of value) {
          if (item && typeof item === 'object' && typeof item.type === 'string') {
            if (findPath(item, [...path, node])) return true;
          }
        }
      } else if (value && typeof value === 'object' && typeof (value as any).type === 'string') {
        if (findPath(value as any, [...path, node])) return true;
      }
    }

    return false;
  }

  findPath(ast, []);
  return ancestors;
}

export function createTypeCollector(types: string[]): ASTVisitor {
  const typeSet = new Set(types);
  const collected: Record<string, ASTNode[]> = {};
  for (const type of types) {
    collected[type] = [];
  }

  return new ASTVisitor({
    enter(node) {
      if (typeSet.has(node.type)) {
        collected[node.type]!.push(node);
      }
    },
  });
}

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
    },
  });

  visit(ast, visitor);
  return maxDepth;
}

export function countNodeTypes(ast: ASTNode): Record<string, number> {
  const counts: Record<string, number> = {};
  const visitor = new ASTVisitor({
    enter(node) {
      counts[node.type] = (counts[node.type] || 0) + 1;
    },
  });

  visit(ast, visitor);
  return counts;
}

export function createVisitorContext(): VisitorContextImpl {
  return new VisitorContextImpl();
}

export { VisitorContextImpl };
