/**
 * The core parser's AST, as one discriminated union
 *
 * Arc 2 step 2 of `docs-internal/ENGINE_MIGRATION_PLAN.md`; the arc's brief is
 * `docs-internal/HANDOFF-engine-arc2.md`. Until now the emitted node shapes
 * were described in **three** places that disagreed with each other and with
 * the parser: `parser/parser-types.ts` (15 kinds), 21 local
 * `type X = ASTNode & {…}` aliases in `parser/runtime.ts` (deleted by step 3,
 * which pointed each evaluator helper at its union member instead), and a
 * stale per-kind set in `types/base-types.ts` (its eleven per-kind interfaces
 * deleted by step 4: seven had no importer at all, the live four now resolve
 * here; `parser/parser-types.ts`' fifteen remain, for the measured reason in
 * `ENGINE_MIGRATION_PLAN.md` step 4). This file is the single description,
 * and every member below was checked against what the parser ACTUALLY emits
 * (a field census over the whole engine corpus, plus source inspection for the
 * kinds the corpus does not reach) rather than copied from any of the three.
 *
 * ## Scope: the full-parser vocabulary only
 *
 * The hybrid parser (`parser/hybrid/`) is a separate producer with its own
 * 16-kind vocabulary and its own typing in `parser/hybrid/ast-types.ts`. Arc 5
 * decides its fate, so it is deliberately NOT unified here.
 *
 * ## Positions are OPTIONAL, and that is not a concession
 *
 * The plan originally specified a required `{ start, end, line, column }` "the
 * parser always sets them". Measured 2026-09-01: it does not — the traditional
 * parser leaves 24 of 857 corpus nodes incomplete (seven producers, filed in
 * `PARSER_NEXT_STEPS.md`), and on the semantic path a value MATERIALIZED from a
 * schema default correctly has no span at all, because the word it stands for
 * was never written. A required position would force a fabricated one. The
 * fields stay optional on {@link BaseNode}; see #1043.
 *
 * ## Members no longer extend `ASTNode` (Arc 2 step 6)
 *
 * Until step 6, {@link BaseNode} extended `types/base-types.ASTNode` so that a
 * union member stayed assignable everywhere the old wide type was, and
 * adopting the union could be a per-file change. The cost was that `ASTNode`
 * carries `[key: string]: unknown`, and an inherited index signature makes
 * every member permit every field: `node.definitelyNotAField` type-checks, a
 * misspelled read returns `unknown` instead of erroring, and the exhaustive
 * switches of step 3 are the only thing in the file that a typo could not slip
 * past. That is the opposite of what a single description of the AST is for.
 *
 * So the inheritance is gone and {@link BaseNode} declares what it needs
 * itself — `type`, the four optional position fields, and the `raw` /
 * `diagnostics` that `ASTNode` used to supply. `ASTNode` KEEPS its index
 * signature: it is exported from `index.ts`, downstream packages type against
 * it, and it is still what the front end's honestly-wide return types say (see
 * `ast/legacy.ts`). What changed is that the two are now separate types, so
 * every crossing between them is a place the code has to say so.
 *
 * The crossings live in `ast/legacy.ts` — {@link AnyNode} for the wide
 * evaluator/executor entries that legitimately take either, and the
 * `toLegacy*` / `fromLegacy*` helpers for the rest. `git grep AnyNode` plus
 * `git grep fromLegacy` is 4.0's deletion list, once the public types are
 * redefined to the union.
 */

import type { ParseDiagnostic } from '../types/base-types';
import type { SlotKey, SlottedCommandName } from './command-slots';

// ===========================================================================
// Base
// ===========================================================================

/**
 * What every node has. `type` is narrowed by each member below into the
 * discriminant the unions switch on.
 */
export interface BaseNode {
  readonly type: string;
  readonly start?: number;
  readonly end?: number;
  readonly line?: number;
  readonly column?: number;
  readonly raw?: string;
  readonly diagnostics?: readonly ParseDiagnostic[];
}

// ===========================================================================
// Leaves
// ===========================================================================

/**
 * `raw` is OPTIONAL — measured 114 of 126 corpus literals carry it.
 * `parser/parser-types.ts` declared it required, which was wrong for the 12
 * that a command parser or a fold synthesizes rather than reads from a token.
 */
export interface LiteralNode extends BaseNode {
  readonly type: 'literal';
  readonly value: unknown;
  readonly raw?: string;
  readonly dataType?: 'string' | 'number' | 'boolean' | 'duration';
}

/** A string literal, kept distinct from `literal` — 26 corpus sites. */
export interface StringNode extends BaseNode {
  readonly type: 'string';
  readonly value: string;
}

/**
 * `scope` appears on 4 of 236 corpus identifiers: `:name` strips the sigil and
 * tags `element`, `$name` KEEPS its sigil in `name` and carries no scope. That
 * asymmetry is what `getVariableValue` expects of each — not an inconsistency.
 */
export interface IdentifierNode extends BaseNode {
  readonly type: 'identifier';
  readonly name: string;
  readonly scope?: 'local' | 'element' | 'global';
}

/**
 * `fromQuery` + `raw` travel together on a QUERY REFERENCE (`<button/>`,
 * `<.card/>`) — 14 of 87 corpus selectors. `value`/`selector` hold the stripped
 * css, `raw` the full `<…>` markup that `make` reads to CREATE an element
 * rather than query one.
 */
export interface SelectorNode extends BaseNode {
  readonly type: 'selector';
  readonly value: string;
  readonly selector?: string;
  readonly selectorType?: string;
  readonly fromQuery?: boolean;
  readonly raw?: string;
}

/** `@attr` — an attribute reference, never a css selector. */
export interface AttributeAccessNode extends BaseNode {
  readonly type: 'attributeAccess';
  readonly attributeName: string;
}

/**
 * A CSS property reference (`*opacity` → name `opacity`).
 *
 * One emitter (`semantic-integration.ts`'s set-destination builder), one
 * reader (`selector-type-detection.ts`'s `isCSSPropertySelectorNode`) — and
 * until 2026-09-01 the kind existed in NO type and NOT in the classifier's
 * universe. It was found the moment that emitter's construction was typed
 * against this union: the `as unknown as` it used to carry had silenced the
 * undeclared kind for as long as it existed. The sixth kind the hand-kept
 * universe missed.
 */
export interface CssPropertyNode extends BaseNode {
  readonly type: 'cssProperty';
  readonly name: string;
}

// ===========================================================================
// Composite expressions
// ===========================================================================

/** `coerceNumeric` appears on 9 of 20 corpus binaries (the arithmetic ones). */
export interface BinaryExpressionNode extends BaseNode {
  readonly type: 'binaryExpression';
  readonly operator: string;
  readonly left: Expr;
  readonly right: Expr;
  readonly coerceNumeric?: boolean;
  readonly ignoringCase?: boolean;
}

/**
 * `operand` is the REQUIRED field, and that is the correction this file makes.
 *
 * `parser/parser-types.ts` declared `argument` + `prefix` and no `operand`.
 * Measured: every corpus `unaryExpression` carries `operand`; only 2 of 3 carry
 * `argument`, and the shape the old type described — `argument` with no
 * `operand` — is emitted ONLY by `helpers/ast-helpers.createUnaryExpression`,
 * whose sole caller `Parser.createUnaryExpression` is itself never called. So
 * the declared type described a shape nothing reachable produces, while the
 * five `pratt-parser.ts` postfix sites emit `operand` alone.
 *
 * `argument` is kept as a deprecated alias because the interchange converter
 * reads it (`ast-utils/interchange/from-core.ts:163`, with a fallback) and the
 * two prefix sites still write it. `runtime.ts` already reads
 * `node.operand ?? node.argument`.
 */
export interface UnaryExpressionNode extends BaseNode {
  readonly type: 'unaryExpression';
  readonly operator: string;
  readonly operand: Expr;
  /** @deprecated Duplicate of {@link operand}; written by 2 of 7 emit sites. */
  readonly argument?: Expr;
  readonly prefix?: boolean;
}

export interface CallExpressionNode extends BaseNode {
  readonly type: 'callExpression';
  readonly callee: Expr;
  readonly arguments: Expr[];
  readonly isConstructor?: boolean;
}

/**
 * Dot access, one link per path segment. `property` is a NODE (an identifier),
 * not a string — `runtime.ts`'s local shape narrowed it to `{ name: string }`,
 * which is a compatible partial view of the same identifier node, not a
 * different shape.
 */
export interface MemberExpressionNode extends BaseNode {
  readonly type: 'memberExpression';
  readonly object: Expr;
  readonly property: Expr;
  readonly computed: boolean;
}

/** `#target's innerHTML`. `property` is an identifier node, as above. */
export interface PossessiveExpressionNode extends BaseNode {
  readonly type: 'possessiveExpression';
  readonly object: Expr;
  readonly property: Expr;
}

/**
 * `the value of #inp`. NOTE: this producer emits `line`/`column` but no
 * `start`/`end` — one of the seven incomplete-position producers filed in
 * `PARSER_NEXT_STEPS.md`. The optional positions on {@link BaseNode} are what
 * let this type be honest about that.
 */
export interface PropertyOfExpressionNode extends BaseNode {
  readonly type: 'propertyOfExpression';
  readonly property: Expr;
  readonly target: Expr;
}

export interface ArrayLiteralNode extends BaseNode {
  readonly type: 'arrayLiteral';
  readonly elements: Expr[];
}

export interface ObjectLiteralNode extends BaseNode {
  readonly type: 'objectLiteral';
  readonly properties: ReadonlyArray<{
    readonly key: Expr & { readonly valueType?: string };
    readonly value: Expr;
  }>;
}

export interface TemplateLiteralNode extends BaseNode {
  readonly type: 'templateLiteral';
  readonly value: string;
}

/** `value as Int`, and the `|`-chained pipe form. */
export interface AsExpressionNode extends BaseNode {
  readonly type: 'asExpression';
  readonly expression: Expr;
  /** A node from the pratt path, a bare string from the expression parser. */
  readonly targetType: Expr | string;
}

export interface BetweenExpressionNode extends BaseNode {
  readonly type: 'betweenExpression';
  readonly value: Expr;
  readonly min: Expr;
  readonly max: Expr;
  readonly negated?: boolean;
  readonly ignoringCase?: boolean;
}

/** `x is a Number` / `x is not a String`. Emitted by `pratt-parser.ts:700`. */
export interface TypeCheckExpressionNode extends BaseNode {
  readonly type: 'typeCheckExpression';
  readonly value: Expr;
  readonly typeName: string;
  readonly nullOk?: boolean;
  readonly negated?: boolean;
}

/** `<coll> where <predicate>`, and the sort forms. `pratt-parser.ts:508+`. */
export interface CollectionExpressionNode extends BaseNode {
  readonly type: 'collectionExpression';
  readonly operator: string;
  readonly collection: Expr;
  readonly right: Expr;
  readonly order?: 'asc' | 'desc';
}

/** The ternary. `parser.ts:3875`. */
export interface ConditionalExpressionNode extends BaseNode {
  readonly type: 'conditionalExpression';
  readonly test: Expr;
  readonly consequent: Expr;
  readonly alternate?: Expr;
}

/** A number with a trailing unit — `200ms`, `3s`. `parser.ts:816`. */
export interface StringPostfixNode extends BaseNode {
  readonly type: 'stringPostfix';
  readonly expression: Expr;
  readonly unit: string;
}

/** A `\(x) -> expr` block literal. `parser.ts:1884`. */
export interface BlockLiteralNode extends BaseNode {
  readonly type: 'blockLiteral';
  readonly parameters: string[];
  readonly body: Expr;
}

/**
 * Command-local, and NOT an alias of `callExpression` despite the name — Arc 2
 * step 1 scored that hypothesis false. Emitted by `event-commands.ts`, read
 * only by `commands/events/trigger.ts:101`.
 */
export interface FunctionCallNode extends BaseNode {
  readonly type: 'functionCall';
  readonly name: string;
  readonly args: Expr[];
}

// ===========================================================================
// Legacy expression members
//
// No in-repo producer remains for these two — measured 2026-09-01, grep plus
// the kind classifier. They survive only for EXTERNAL hand-built ASTs, because
// `buildAST` is public API, and their deletion rides the next minor version
// bump (`HANDOFF-convergence-next.md` item 2). Typed here so the evaluator's
// dispatch arms stay exhaustive until then.
// ===========================================================================

/** @deprecated Converged on {@link MemberExpressionNode} spellings in #1040. */
export interface PropertyAccessNode extends BaseNode {
  readonly type: 'propertyAccess';
  readonly object: Expr;
  readonly property: string | { readonly name: string };
}

/** @deprecated Converged on {@link IdentifierNode} in #1040. */
export interface ContextReferenceNode extends BaseNode {
  readonly type: 'contextReference';
  readonly contextType: string;
}

/**
 * A generic expression wrapper. 3 emitters / 3 readers — Arc 2 step 1 scored
 * the plan's "dead" hypothesis false.
 */
export interface GenericExpressionNode extends BaseNode {
  readonly type: 'expression';
  readonly value?: unknown;
  readonly operator?: string;
  readonly operands?: Expr[];
}

// ===========================================================================
// Statements and structure
// ===========================================================================

/**
 * `modifiers` appears on 34 of 246 corpus commands, `originalCommand` on 9
 * (parser sugar: `increment` becomes a `set` that records what was written).
 * `semanticRoles` is the SEMANTICS surface — where a materialized schema
 * default lives, held back from `args`, which is the SYNTAX surface.
 */
/**
 * `K` is the command whose `COMMAND_SLOTS` row keys `modifiers` (Arc 3 step
 * 2). The default is every command's keys, so a `CommandNode` that names no
 * `K` reads as it always did; a parser or command that names one gets its
 * row checked. `args` stays `Expr[]` — the positional arity is declared in
 * `COMMAND_ARITY` and pinned by test, not yet by type.
 */
export interface CommandNode<K extends SlottedCommandName = SlottedCommandName> extends BaseNode {
  readonly type: 'command';
  readonly name: string;
  readonly args: Expr[];
  readonly isBlocking: boolean;
  readonly body?: Stmt[];
  readonly modifiers?: Partial<Record<SlotKey<K>, Expr>>;
  readonly implicitTarget?: Expr;
  readonly originalCommand?: string;
  readonly semanticRoles?: Record<string, Expr>;
  /**
   * Set by `createPartialCommandNode` when a command parser returns null
   * mid-typing (`toggle` with no arguments yet); the LSP reads it to offer
   * argument completions. Never in a completed parse, so the corpus cannot see
   * it — declared from the emitter, not the census.
   */
  readonly partial?: boolean;
}

export interface BlockNode extends BaseNode {
  readonly type: 'block';
  readonly commands: Stmt[];
}

/**
 * `events` (31 of 32) carries every name of an `on a or b` handler; `event` is
 * the primary. `condition` is the `[filter]` form, `target` the `from` clause.
 *
 * ## Corrected and completed by Arc 2 step 4 (2026-09-01)
 *
 * `event` and `target` were declared `unknown`. Measured over the corpus AND
 * the constructs the corpus lacks (`catch`/`finally`, `of @attr`, `in <sel>`,
 * `from <sel>`, `or`-joined names), on both parse paths: `event` is ALWAYS a
 * string, `target` always a string when present. `unknown` was looser than
 * reality, and the runtime's `{}`-after-truthiness errors were the symptom.
 *
 * Seven fields were MISSING. `parser.ts` builds them at 7–11 sites each and
 * `runtime-base.ts` destructures every one — `types/base-types.ts` declared
 * them and this file did not. The conformance test never fired because the
 * engine corpus holds one `catch` and none of the others; it now feeds those
 * constructs explicitly (`EXTRA_SOURCES` in `union-conformance.test.ts`).
 *
 * `selector` is declared because the runtime destructures it, but NO parser
 * path emits it (the `from` clause lands in `target`). Kept typed rather than
 * deleted so the runtime read stays a compile-checked read of an absent field
 * — deleting the read is a behaviour decision, not a typing one.
 */
export interface EventHandlerNode extends BaseNode {
  readonly type: 'eventHandler';
  readonly event: string;
  readonly commands: Stmt[];
  readonly events?: string[];
  readonly condition?: Expr;
  readonly target?: string;
  readonly selector?: string;
  /** `on click(button, clientX)` — event properties destructured into locals. */
  readonly args?: string[];
  /** `on mutation of @attr`. */
  readonly attributeName?: string;
  /** `on change in <selector>` — a selector node the runtime observes. */
  readonly watchTarget?: Expr;
  /** `on <name>` where `<name>` is a registered custom event source. */
  readonly customEventSource?: string;
  /** `catch <symbol>` — shared with {@link DefNode}, as upstream shares `parseErrorAndFinally`. */
  readonly errorSymbol?: string;
  readonly errorHandler?: Stmt[];
  readonly finallyHandler?: Stmt[];
  readonly modifiers?: {
    readonly once?: boolean;
    readonly prevent?: boolean;
    readonly stop?: boolean;
    readonly debounce?: number;
    readonly throttle?: number;
  };
}

export interface BehaviorNode extends BaseNode {
  readonly type: 'behavior';
  readonly name: string;
  readonly parameters: string[];
  readonly eventHandlers: EventHandlerNode[];
  readonly initBlock?: Stmt;
}

/** `def name(params) … [catch e …] [finally …] end`. The catch/finally trio mirrors {@link EventHandlerNode}. */
export interface DefNode extends BaseNode {
  readonly type: 'def';
  readonly name: string;
  readonly params: string[];
  readonly body: Stmt[];
  readonly errorSymbol?: string;
  readonly errorHandler?: Stmt[];
  readonly finallyHandler?: Stmt[];
}

export interface InitBlockNode extends BaseNode {
  readonly type: 'initBlock';
  readonly commands: Stmt[];
}

/**
 * PascalCase on purpose. `CommandSequence` and `Program` are what the parser
 * emits, the AST-equivalence corpus pins them, and renaming would be a
 * behaviour change in a types-only arc.
 */
export interface CommandSequenceNode extends BaseNode {
  readonly type: 'CommandSequence';
  readonly commands: Stmt[];
}

export interface ProgramNode extends BaseNode {
  readonly type: 'Program';
  readonly statements: Stmt[];
}

/** Produced by the interchange converter for an unconvertible node. */
export interface ErrorNode extends BaseNode {
  readonly type: 'error';
  readonly message?: string;
}

// ===========================================================================
// Plugin escape hatch
// ===========================================================================

/**
 * A kind contributed at runtime through the node-evaluator registry
 * (`getRegisteredNodeEvaluator`). The registry stays, and this describes what
 * it holds.
 *
 * ## NOT a member of {@link Expr}, {@link Stmt} or {@link SyntaxNode}
 *
 * It was designed as one, and that design cannot compile — probed 2026-09-01
 * (#1051) and confirmed when step 3 shipped. `type: string` is not a literal,
 * so a `PluginNode` member widens every narrow in a switch over the union
 * (`n.type === 'literal'` yields `LiteralNode | PluginNode`) and makes the
 * `never` default impossible — destroying the exhaustiveness it was meant to
 * enable.
 *
 * What replaced it: `parser/runtime.ts` splits the evaluator in two. The inner
 * `evaluateKnown` takes a real union member and holds the exhaustive switch;
 * the outer `evaluateAST` keeps a wide parameter and consults this registry
 * AFTER the core kinds, so a plugin still cannot shadow a kind the parser
 * emits. `parser/__tests__/evaluator-routing.test.ts` pins both halves.
 */
export interface PluginNode extends BaseNode {
  readonly type: string;
  readonly payload?: unknown;
}

// ===========================================================================
// The unions
// ===========================================================================

export type Expr =
  | LiteralNode
  | StringNode
  | IdentifierNode
  | SelectorNode
  | AttributeAccessNode
  | CssPropertyNode
  | BinaryExpressionNode
  | UnaryExpressionNode
  | CallExpressionNode
  | MemberExpressionNode
  | PossessiveExpressionNode
  | PropertyOfExpressionNode
  | ArrayLiteralNode
  | ObjectLiteralNode
  | TemplateLiteralNode
  | AsExpressionNode
  | BetweenExpressionNode
  | TypeCheckExpressionNode
  | CollectionExpressionNode
  | ConditionalExpressionNode
  | StringPostfixNode
  | BlockLiteralNode
  | FunctionCallNode
  | PropertyAccessNode
  | ContextReferenceNode
  | GenericExpressionNode;

export type Stmt =
  | CommandNode
  | BlockNode
  | EventHandlerNode
  | BehaviorNode
  | DefNode
  | InitBlockNode
  | CommandSequenceNode
  | ProgramNode
  | ErrorNode;

/**
 * The full-parser vocabulary, as one type.
 *
 * NOT named `Node`. `Node` is a DOM global, this is a library about the DOM,
 * and `types/type-guards.ts` genuinely uses the DOM one (`value is Node`,
 * `(el as Node).nodeType`). A union named `Node` shadows it inside any file
 * that imports it and — worse — a file that FORGETS the import silently gets
 * the DOM type instead, which surfaces as "'type' does not exist in type
 * 'Node'" rather than as a missing import. Measured while adopting it in
 * `pratt-parser.ts`, where exactly that happened.
 *
 * `SyntaxNode` is the standard term for this (Roslyn, tree-sitter) and collides
 * with nothing.
 */
export type SyntaxNode = Expr | Stmt;

/** Every `type` string the full-parser vocabulary emits. */
export type SyntaxKind = SyntaxNode['type'];
