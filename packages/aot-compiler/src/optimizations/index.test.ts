/**
 * Optimization Pass Tests
 */

import { describe, it, expect } from 'vitest';
import {
  ConstantFoldingPass,
  SelectorCachingPass,
  DeadCodeEliminationPass,
  LoopUnrollingPass,
  OptimizationPipeline,
  optimize,
  createOptimizer,
} from './index.js';
import type {
  ASTNode,
  AnalysisResult,
  BinaryExpressionNode,
  LiteralNode,
  SelectorNode,
  CommandNode,
  SelectorInfo,
} from '../types/aot-types.js';

// =============================================================================
// HELPERS
// =============================================================================

/** Create a minimal AnalysisResult with sensible defaults. */
function createAnalysis(
  overrides: {
    pure?: ASTNode[];
    selectors?: SelectorInfo[];
    canThrow?: boolean;
    hasLoops?: boolean;
    hasAsync?: boolean;
  } = {}
): AnalysisResult {
  return {
    commandsUsed: new Set<string>(),
    variables: {
      locals: new Map(),
      globals: new Map(),
      contextVars: new Set(),
    },
    expressions: {
      pure: overrides.pure ?? [],
      dynamic: [],
      selectors: overrides.selectors ?? [],
    },
    controlFlow: {
      hasAsync: overrides.hasAsync ?? false,
      hasLoops: overrides.hasLoops ?? false,
      hasConditionals: false,
      canThrow: overrides.canThrow ?? false,
      maxNestingDepth: 0,
    },
    dependencies: {
      domQueries: [],
      eventTypes: [],
      behaviors: [],
      runtimeHelpers: [],
    },
    warnings: [],
  };
}

function literal(value: string | number | boolean | null): LiteralNode {
  return { type: 'literal', value };
}

function binary(operator: string, left: ASTNode, right: ASTNode): BinaryExpressionNode {
  return { type: 'binary', operator, left, right };
}

function selector(value: string): SelectorNode {
  return { type: 'selector', value };
}

function command(name: string, args: ASTNode[] = []): CommandNode {
  return { type: 'command', name, args };
}

// =============================================================================
// CONSTANT FOLDING PASS
// =============================================================================

describe('ConstantFoldingPass', () => {
  const pass = new ConstantFoldingPass();

  describe('shouldRun', () => {
    it('returns true when pure expressions exist', () => {
      const analysis = createAnalysis({ pure: [literal(5)] });
      expect(pass.shouldRun(analysis)).toBe(true);
    });

    it('returns false when no pure expressions', () => {
      const analysis = createAnalysis({ pure: [] });
      expect(pass.shouldRun(analysis)).toBe(false);
    });
  });

  describe('arithmetic', () => {
    it('folds addition', () => {
      const node = binary('+', literal(5), literal(3));
      const result = pass.transform(node, createAnalysis()) as LiteralNode;
      expect(result.type).toBe('literal');
      expect(result.value).toBe(8);
    });

    it('folds subtraction', () => {
      const result = pass.transform(
        binary('-', literal(10), literal(4)),
        createAnalysis()
      ) as LiteralNode;
      expect(result.value).toBe(6);
    });

    it('folds multiplication', () => {
      const result = pass.transform(
        binary('*', literal(3), literal(7)),
        createAnalysis()
      ) as LiteralNode;
      expect(result.value).toBe(21);
    });

    it('folds division', () => {
      const result = pass.transform(
        binary('/', literal(15), literal(3)),
        createAnalysis()
      ) as LiteralNode;
      expect(result.value).toBe(5);
    });

    it('folds modulo', () => {
      const result = pass.transform(
        binary('%', literal(17), literal(5)),
        createAnalysis()
      ) as LiteralNode;
      expect(result.value).toBe(2);
    });

    it('preserves division by zero unchanged', () => {
      const node = binary('/', literal(10), literal(0));
      const result = pass.transform(node, createAnalysis()) as BinaryExpressionNode;
      expect(result.type).toBe('binary');
      expect(result.operator).toBe('/');
    });

    it('preserves modulo by zero unchanged', () => {
      const node = binary('%', literal(10), literal(0));
      const result = pass.transform(node, createAnalysis()) as BinaryExpressionNode;
      expect(result.type).toBe('binary');
      expect(result.operator).toBe('%');
    });
  });

  describe('string concatenation', () => {
    it('folds & operator', () => {
      const result = pass.transform(
        binary('&', literal('hello'), literal(' world')),
        createAnalysis()
      ) as LiteralNode;
      expect(result.value).toBe('hello world');
    });
  });

  describe('logical operators', () => {
    it('folds "and" to false', () => {
      const result = pass.transform(
        binary('and', literal(true), literal(false)),
        createAnalysis()
      ) as LiteralNode;
      expect(result.value).toBe(false);
    });

    it('folds "or" to true', () => {
      const result = pass.transform(
        binary('or', literal(false), literal(true)),
        createAnalysis()
      ) as LiteralNode;
      expect(result.value).toBe(true);
    });

    it('folds && operator', () => {
      const result = pass.transform(
        binary('&&', literal(true), literal(true)),
        createAnalysis()
      ) as LiteralNode;
      expect(result.value).toBe(true);
    });

    it('folds || operator', () => {
      const result = pass.transform(
        binary('||', literal(false), literal(false)),
        createAnalysis()
      ) as LiteralNode;
      expect(result.value).toBe(false);
    });
  });

  describe('comparison operators', () => {
    it('folds "is" equality', () => {
      const result = pass.transform(
        binary('is', literal(5), literal(5)),
        createAnalysis()
      ) as LiteralNode;
      expect(result.value).toBe(true);
    });

    it('folds "is not" inequality', () => {
      const result = pass.transform(
        binary('is not', literal(5), literal(3)),
        createAnalysis()
      ) as LiteralNode;
      expect(result.value).toBe(true);
    });

    it('folds < operator', () => {
      const result = pass.transform(
        binary('<', literal(3), literal(5)),
        createAnalysis()
      ) as LiteralNode;
      expect(result.value).toBe(true);
    });

    it('folds > operator', () => {
      const result = pass.transform(
        binary('>', literal(5), literal(3)),
        createAnalysis()
      ) as LiteralNode;
      expect(result.value).toBe(true);
    });

    it('folds <= operator', () => {
      const result = pass.transform(
        binary('<=', literal(5), literal(5)),
        createAnalysis()
      ) as LiteralNode;
      expect(result.value).toBe(true);
    });

    it('folds >= operator', () => {
      const result = pass.transform(
        binary('>=', literal(3), literal(5)),
        createAnalysis()
      ) as LiteralNode;
      expect(result.value).toBe(false);
    });
  });

  describe('non-foldable expressions', () => {
    it('preserves binary with non-literal operands', () => {
      const node = binary('+', { type: 'identifier', value: 'x' }, literal(3));
      const result = pass.transform(node, createAnalysis()) as BinaryExpressionNode;
      expect(result.type).toBe('binary');
      expect(result.operator).toBe('+');
    });
  });

  describe('nested folding', () => {
    it('folds nested expressions bottom-up', () => {
      // (2 + 3) * 4 → 5 * 4 → 20
      const inner = binary('+', literal(2), literal(3));
      const outer = binary('*', inner, literal(4));
      const result = pass.transform(outer, createAnalysis()) as LiteralNode;
      expect(result.type).toBe('literal');
      expect(result.value).toBe(20);
    });
  });
});

// =============================================================================
// SELECTOR CACHING PASS
// =============================================================================

describe('SelectorCachingPass', () => {
  const pass = new SelectorCachingPass();

  describe('shouldRun', () => {
    it('returns true with multi-use cacheable selectors', () => {
      const analysis = createAnalysis({
        selectors: [
          {
            selector: '#btn',
            usages: [
              { file: 'a', line: 1, column: 1 },
              { file: 'a', line: 5, column: 1 },
            ],
            isId: true,
            canCache: true,
          },
        ],
      });
      expect(pass.shouldRun(analysis)).toBe(true);
    });

    it('returns false with single-use selectors', () => {
      const analysis = createAnalysis({
        selectors: [
          {
            selector: '#btn',
            usages: [{ file: 'a', line: 1, column: 1 }],
            isId: true,
            canCache: true,
          },
        ],
      });
      expect(pass.shouldRun(analysis)).toBe(false);
    });

    it('returns false with non-cacheable selectors', () => {
      const analysis = createAnalysis({
        selectors: [
          {
            selector: ':hover',
            usages: [
              { file: 'a', line: 1, column: 1 },
              { file: 'a', line: 2, column: 1 },
            ],
            isId: false,
            canCache: false,
          },
        ],
      });
      expect(pass.shouldRun(analysis)).toBe(false);
    });
  });

  describe('transform', () => {
    it('marks multi-use selectors with _cached and _cacheKey', () => {
      const analysis = createAnalysis({
        selectors: [
          {
            selector: '.btn-primary',
            usages: [
              { file: 'a', line: 1, column: 1 },
              { file: 'a', line: 5, column: 1 },
            ],
            isId: false,
            canCache: true,
          },
        ],
      });

      const ast: ASTNode = {
        type: 'event',
        event: 'click',
        body: [
          { type: 'command', name: 'add', args: [selector('.btn-primary')] },
          { type: 'command', name: 'remove', args: [selector('.btn-primary')] },
        ],
      };

      const result = pass.transform(ast, analysis);
      const body = result.body as ASTNode[];
      const sel1 = (body[0].args as ASTNode[])[0];
      const sel2 = (body[1].args as ASTNode[])[0];

      expect(sel1._cached).toBe(true);
      expect(sel1._cacheKey).toBe('_sel__btn_primary');
      expect(sel2._cached).toBe(true);
    });

    it('does not mark single-use selectors', () => {
      const analysis = createAnalysis({
        selectors: [
          {
            selector: '#btn',
            usages: [{ file: 'a', line: 1, column: 1 }],
            isId: true,
            canCache: true,
          },
        ],
      });

      const ast: ASTNode = {
        type: 'event',
        body: [{ type: 'command', name: 'add', args: [selector('#btn')] }],
      };

      const result = pass.transform(ast, analysis);
      const body = result.body as ASTNode[];
      const sel = (body[0].args as ASTNode[])[0];

      expect(sel._cached).toBeUndefined();
    });

    it('generates cache key with sanitized name', () => {
      const analysis = createAnalysis({
        selectors: [
          {
            selector: '.my-awesome--component',
            usages: [
              { file: 'a', line: 1, column: 1 },
              { file: 'a', line: 2, column: 1 },
            ],
            isId: false,
            canCache: true,
          },
        ],
      });

      const ast: ASTNode = {
        type: 'event',
        body: [{ type: 'command', name: 'add', args: [selector('.my-awesome--component')] }],
      };

      const result = pass.transform(ast, analysis);
      const sel = ((result.body as ASTNode[])[0].args as ASTNode[])[0];
      const key = sel._cacheKey as string;

      expect(key).toMatch(/^_sel_/);
      expect(key).not.toMatch(/[^a-zA-Z0-9_]/);
      expect(key.length).toBeLessThanOrEqual(25); // _sel_ (5) + 20
    });
  });
});

// =============================================================================
// DEAD CODE ELIMINATION PASS
// =============================================================================

describe('DeadCodeEliminationPass', () => {
  const pass = new DeadCodeEliminationPass();

  describe('shouldRun', () => {
    it('returns true when canThrow is true', () => {
      expect(pass.shouldRun(createAnalysis({ canThrow: true }))).toBe(true);
    });

    it('returns false when canThrow is false', () => {
      expect(pass.shouldRun(createAnalysis({ canThrow: false }))).toBe(false);
    });
  });

  describe('transform', () => {
    it('removes nodes after halt', () => {
      const ast: ASTNode = {
        type: 'event',
        event: 'click',
        body: [
          command('toggle', [selector('.a')]),
          command('halt'),
          command('log', [literal('never runs')]),
        ],
      };

      const result = pass.transform(ast, createAnalysis());
      const body = result.body as ASTNode[];

      expect(body).toHaveLength(2);
      expect((body[0] as CommandNode).name).toBe('toggle');
      expect((body[1] as CommandNode).name).toBe('halt');
    });

    it('removes nodes after exit', () => {
      const ast: ASTNode = {
        type: 'event',
        body: [command('exit'), command('log')],
      };

      const result = pass.transform(ast, createAnalysis());
      expect(result.body as ASTNode[]).toHaveLength(1);
    });

    it('removes nodes after return', () => {
      const ast: ASTNode = {
        type: 'event',
        body: [command('return'), command('toggle')],
      };

      const result = pass.transform(ast, createAnalysis());
      expect(result.body as ASTNode[]).toHaveLength(1);
    });

    it('preserves all nodes when no terminator present', () => {
      const ast: ASTNode = {
        type: 'event',
        body: [command('toggle'), command('add'), command('log')],
      };

      const result = pass.transform(ast, createAnalysis());
      expect(result.body as ASTNode[]).toHaveLength(3);
    });

    it('processes thenBranch and elseBranch independently', () => {
      const ast: ASTNode = {
        type: 'if',
        condition: literal(true),
        thenBranch: [command('halt'), command('log', [literal('dead')])],
        elseBranch: [command('toggle'), command('add')],
      };

      const result = pass.transform(ast, createAnalysis());
      expect(result.thenBranch as ASTNode[]).toHaveLength(1);
      expect(result.elseBranch as ASTNode[]).toHaveLength(2);
    });
  });
});

// =============================================================================
// LOOP UNROLLING PASS
// =============================================================================

describe('LoopUnrollingPass', () => {
  const pass = new LoopUnrollingPass();

  describe('shouldRun', () => {
    it('returns true when hasLoops is true', () => {
      expect(pass.shouldRun(createAnalysis({ hasLoops: true }))).toBe(true);
    });

    it('returns false when hasLoops is false', () => {
      expect(pass.shouldRun(createAnalysis({ hasLoops: false }))).toBe(false);
    });
  });

  describe('transform', () => {
    it('unrolls repeat 3 with single-command body', () => {
      const ast: ASTNode = {
        type: 'repeat',
        count: 3,
        body: [command('add', [selector('.a')])],
      };

      const result = pass.transform(ast, createAnalysis());
      expect(result.type).toBe('sequence');
      expect(result._unrolled).toBe(true);
      expect(result.commands as ASTNode[]).toHaveLength(3);
      for (const cmd of result.commands as CommandNode[]) {
        expect(cmd.name).toBe('add');
      }
    });

    it('refuses to unroll when count > 5', () => {
      const ast: ASTNode = {
        type: 'repeat',
        count: 10,
        body: [command('add')],
      };

      const result = pass.transform(ast, createAnalysis());
      expect(result.type).toBe('repeat');
    });

    it('refuses to unroll when body has > 3 commands', () => {
      const ast: ASTNode = {
        type: 'repeat',
        count: 2,
        body: [command('a'), command('b'), command('c'), command('d')],
      };

      const result = pass.transform(ast, createAnalysis());
      expect(result.type).toBe('repeat');
    });

    it('refuses to unroll when body uses :index', () => {
      const ast: ASTNode = {
        type: 'repeat',
        count: 3,
        body: [command('log', [{ type: 'variable', name: ':index', scope: 'local' }])],
      };

      const result = pass.transform(ast, createAnalysis());
      expect(result.type).toBe('repeat');
    });

    it('refuses to unroll when count is non-numeric (AST node)', () => {
      const ast: ASTNode = {
        type: 'repeat',
        count: { type: 'identifier', value: 'x' },
        body: [command('add')],
      };

      const result = pass.transform(ast, createAnalysis());
      expect(result.type).toBe('repeat');
    });

    it('unrolls nested repeat within event body', () => {
      const ast: ASTNode = {
        type: 'event',
        event: 'click',
        body: [
          {
            type: 'repeat',
            count: 2,
            body: [command('toggle', [selector('.a')])],
          },
        ],
      };

      const result = pass.transform(ast, createAnalysis());
      const body = result.body as ASTNode[];
      expect(body[0].type).toBe('sequence');
      expect(body[0]._unrolled).toBe(true);
      expect(body[0].commands as ASTNode[]).toHaveLength(2);
    });
  });
});

// =============================================================================
// OPTIMIZATION PIPELINE
// =============================================================================

describe('OptimizationPipeline', () => {
  it('level 0 returns AST unchanged', () => {
    const pipeline = new OptimizationPipeline();
    const ast = binary('+', literal(2), literal(3));
    const analysis = createAnalysis({ pure: [ast] });

    const result = pipeline.optimize(ast, analysis, 0);
    expect(result.type).toBe('binary');
    expect(result._optimizations).toBeUndefined();
  });

  it('level 1 runs only constant-folding and selector-caching', () => {
    const pipeline = new OptimizationPipeline();
    const ast = binary('+', literal(2), literal(3));
    const analysis = createAnalysis({
      pure: [ast],
      canThrow: true,
      hasLoops: true,
    });

    const result = pipeline.optimize(ast, analysis, 1);
    expect(result._optimizations).toContain('constant-folding');
    expect(result._optimizations).not.toContain('dead-code-elimination');
    expect(result._optimizations).not.toContain('loop-unrolling');
  });

  it('level 2 runs all applicable passes', () => {
    const pipeline = new OptimizationPipeline();
    const ast: ASTNode = {
      type: 'event',
      body: [binary('+', literal(1), literal(2)), command('halt'), command('log')],
    };
    const analysis = createAnalysis({
      pure: [literal(1)],
      canThrow: true,
      hasLoops: true,
    });

    const result = pipeline.optimize(ast, analysis, 2);
    expect(result._optimizations).toContain('constant-folding');
    expect(result._optimizations).toContain('dead-code-elimination');
    expect(result._optimizations).toContain('loop-unrolling');
  });

  it('addPass() adds a custom pass', () => {
    const pipeline = new OptimizationPipeline();
    const customPass = {
      name: 'custom-pass',
      shouldRun: () => true,
      transform: (ast: ASTNode) => ({ ...ast, _custom: true }),
    };
    pipeline.addPass(customPass);

    const ast = literal(42);
    const result = pipeline.optimize(ast, createAnalysis(), 2);
    expect(result._optimizations).toContain('custom-pass');
    expect(result._custom).toBe(true);
  });
});

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

describe('convenience exports', () => {
  it('createOptimizer() returns a pipeline', () => {
    const pipeline = createOptimizer();
    expect(pipeline).toBeInstanceOf(OptimizationPipeline);
  });

  it('optimize() applies optimizations', () => {
    const ast = binary('+', literal(1), literal(2));
    const analysis = createAnalysis({ pure: [ast] });
    const result = optimize(ast, analysis, 2);
    expect(result.type).toBe('literal');
    expect((result as LiteralNode).value).toBe(3);
  });
});
