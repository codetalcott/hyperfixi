/**
 * Core AST → Interchange Format Converter
 *
 * Converts the core parser's AST (types like 'eventHandler', 'binaryExpression',
 * 'possessiveExpression') into the shared interchange format (types like 'event',
 * 'binary', 'possessive').
 *
 * This replaces the 444-line core-parser-adapter.ts in the AOT compiler.
 *
 * **Role inference is injected, not owned here.** Naming the semantic role an
 * arg fills needs the command's `CommandSchema`, which lives in the
 * multilingual front-end — so `fromCoreAST` takes a `RoleInferrer` and the
 * engine keeps no dependency on it. Pass `schemaRoleInferrer` from
 * `@hyperfixi/core/multilingual` for the stock behaviour; see Arc 1 step 4 of
 * `docs-internal/ENGINE_MIGRATION_PLAN.md`.
 */

import type {
  InterchangeNode,
  EventNode,
  CommandNode,
  IfNode,
  RepeatNode,
  ForEachNode,
  WhileNode,
  EventModifiers,
} from './types';

// The core parser AST is untyped from our perspective — we only need
// the structural shape, not the exact imports (avoiding circular deps).
interface CoreNode {
  type: string;
  [key: string]: unknown;
}

/**
 * Names the semantic roles a command's positional args, modifiers and target
 * fill — the one part of the conversion the engine cannot do alone, because it
 * needs each command's `CommandSchema` from the multilingual front-end.
 *
 * Return null for "no roles" (no schema, or the schema bound nothing).
 *
 * The stock implementation is `schemaRoleInferrer` from
 * `@hyperfixi/core/multilingual`. Without one, only the two commands with
 * explicit cases below (`set`, `go`) get roles — measured over the engine
 * corpus, that is 2 of the 43 command names that otherwise would.
 */
export type RoleInferrer = (
  name: string,
  args: readonly InterchangeNode[],
  modifiers: Readonly<Record<string, unknown>> | undefined,
  target: InterchangeNode | undefined
) => Readonly<Record<string, InterchangeNode>> | null;

export interface FromCoreOptions {
  /** Schema-driven role inference for commands with no explicit case. */
  readonly inferRoles?: RoleInferrer;
}

/**
 * Convert a core parser AST node to an interchange node.
 *
 * @param node    the core parser's AST
 * @param options `inferRoles` supplies schema-driven role naming; omit it and
 *                the result carries roles only for `set` and `go`.
 */
export function fromCoreAST(node: CoreNode, options?: FromCoreOptions): InterchangeNode {
  return convertNode(node, options?.inferRoles ?? null);
}

/**
 * Extract position fields from a source node. Returns only fields that exist,
 * so spreading the result adds nothing when positions are absent.
 */
function pos(node: CoreNode): Record<string, number> {
  const p: Record<string, number> = {};
  if (typeof node.start === 'number') p.start = node.start;
  if (typeof node.end === 'number') p.end = node.end;
  if (typeof node.line === 'number') p.line = node.line;
  if (typeof node.column === 'number') p.column = node.column;
  return p;
}

/**
 * The recursion. `infer` is threaded rather than closed over, and is a REQUIRED
 * parameter on every helper below, so a conversion path that forgets to pass it
 * is a compile error rather than a silently role-less subtree.
 */
function convertNode(node: CoreNode, infer: RoleInferrer | null): InterchangeNode {
  if (!node) return { type: 'literal', value: null };

  switch (node.type) {
    case 'eventHandler':
      return convertEventHandler(node, infer);
    case 'command':
      return convertCommand(node, infer);
    case 'CommandSequence':
      return convertCommandSequence(node, infer);
    case 'Program': {
      const statements = (node.statements ?? []) as CoreNode[];
      if (statements.length === 0) {
        return { type: 'literal', value: null, ...pos(node) };
      }
      if (statements.length === 1) {
        return convertNode(statements[0], infer);
      }
      // Multiple top-level features — convert first; LSP processes one region at a time
      return convertNode(statements[0], infer);
    }
    case 'block':
      return convertBlock(node, infer);

    // Error nodes from resilient parsing
    case 'errorCommand':
      return {
        type: 'error' as const,
        message: (node.message as string) ?? 'Parse error',
        token: (node.token as string) ?? undefined,
        ...pos(node),
      };

    // Expression types
    case 'literal':
      return {
        type: 'literal',
        value: node.value as string | number | boolean | null,
        ...pos(node),
      };
    case 'string':
      return { type: 'literal', value: node.value as string, ...pos(node) };
    case 'selector':
      return {
        type: 'selector',
        value: (node.value ?? node.selector ?? '') as string,
        ...pos(node),
      };
    case 'contextReference':
      return {
        type: 'identifier',
        value: (node.name ?? node.contextType ?? '') as string,
        ...pos(node),
      };
    case 'identifier':
      return {
        type: 'identifier',
        value: (node.name ?? node.value ?? '') as string,
        name: (node.name ?? '') as string,
        ...pos(node),
      };
    case 'propertyAccess':
    case 'possessiveExpression':
      return convertPossessive(node, infer);
    case 'memberExpression':
      return convertMember(node, infer);
    case 'binaryExpression':
      return convertBinary(node, infer);
    case 'callExpression':
      return convertCall(node, infer);
    case 'unaryExpression':
      return {
        type: 'unary',
        operator: node.operator as string,
        operand: convertNode((node.argument as CoreNode) ?? (node.operand as CoreNode), infer),
        ...pos(node),
      };
    case 'timeExpression':
      return { type: 'literal', value: node.value as number, ...pos(node) };
    case 'templateLiteral':
      return { type: 'literal', value: (node.raw ?? '') as string, ...pos(node) };
    case 'variable':
      return {
        type: 'variable',
        name: (node.name ?? '') as string,
        scope: (node.scope ?? 'local') as 'local' | 'global' | 'element',
        ...pos(node),
      };
    case 'htmlSelector':
      return {
        type: 'selector',
        value: (node.value ?? node.selector ?? '') as string,
        ...pos(node),
      };
    case 'positional':
      return {
        type: 'positional',
        position: node.position as
          'first' | 'last' | 'next' | 'previous' | 'closest' | 'parent' | 'random',
        ...(node.target ? { target: convertNode(node.target as CoreNode, infer) } : {}),
        ...pos(node),
      };
    case 'positionalExpression':
      return {
        type: 'positional',
        position: node.operator as
          'first' | 'last' | 'next' | 'previous' | 'closest' | 'parent' | 'random',
        ...(node.argument ? { target: convertNode(node.argument as CoreNode, infer) } : {}),
        ...pos(node),
      };

    default:
      return {
        type: 'error' as const,
        message: `Unknown core AST node type: ${node.type}`,
        ...pos(node),
      };
  }
}

// =============================================================================
// CONVERSION HELPERS
// =============================================================================

function convertEventHandler(node: CoreNode, infer: RoleInferrer | null): EventNode {
  const event = (node.event ?? 'click') as string;
  const commands = (node.commands ?? node.body ?? []) as CoreNode[];
  const body = commands.map(cmd => convertNode(cmd, infer));

  const modifiers = buildEventModifiers(node);

  return { type: 'event', event, modifiers, body, ...pos(node) };
}

function convertCommand(node: CoreNode, infer: RoleInferrer | null): InterchangeNode {
  const name = node.name as string;

  // Convert __ERROR__ command nodes to proper ErrorNode
  if (name === '__ERROR__') {
    return {
      type: 'error' as const,
      message:
        ((node as Record<string, unknown>).diagnostics as Array<{ message: string }>)?.[0]
          ?.message ?? 'Parse error',
      ...pos(node),
    };
  }

  if (name === 'if' || name === 'unless') {
    return convertIfCommand(node, infer);
  }
  if (name === 'repeat') {
    return convertRepeatCommand(node, infer);
  }

  const args = ((node.args ?? []) as CoreNode[]).map(arg => convertNode(arg, infer));
  const target = node.target ? convertNode(node.target as CoreNode, infer) : undefined;
  const modifiers = node.modifiers
    ? convertModifiers(node.modifiers as Record<string, CoreNode>, infer)
    : undefined;

  const roles = inferRoles(name, args, modifiers, target, infer);

  return {
    type: 'command',
    name,
    args,
    ...(target ? { target } : {}),
    ...(modifiers && Object.keys(modifiers).length > 0 ? { modifiers } : {}),
    ...(roles ? { roles } : {}),
    ...(node.partial ? { partial: true } : {}),
    ...pos(node),
  } as CommandNode;
}

function convertIfCommand(node: CoreNode, infer: RoleInferrer | null): IfNode {
  const args = (node.args ?? []) as CoreNode[];
  let condition: InterchangeNode;
  let thenBranch: InterchangeNode[];
  let elseBranch: InterchangeNode[] | undefined;

  if (node.condition) {
    condition = convertNode(node.condition as CoreNode, infer);
    thenBranch = ((node.thenBranch ?? node.then ?? []) as CoreNode[]).map(n =>
      convertNode(n, infer)
    );
    elseBranch = node.elseBranch
      ? (node.elseBranch as CoreNode[]).map(n => convertNode(n, infer))
      : node.else
        ? (node.else as CoreNode[]).map(n => convertNode(n, infer))
        : undefined;
  } else {
    condition = args[0] ? convertNode(args[0], infer) : { type: 'literal', value: true };
    thenBranch = extractBlockCommands(args[1], infer);
    elseBranch = args[2] ? extractBlockCommands(args[2], infer) : undefined;
  }

  // 'unless' → negated condition
  if ((node.name as string) === 'unless') {
    condition = { type: 'unary', operator: 'not', operand: condition };
  }

  return {
    type: 'if',
    condition,
    thenBranch,
    ...(elseBranch ? { elseBranch } : {}),
    ...pos(node),
  } as IfNode;
}

function convertRepeatCommand(node: CoreNode, infer: RoleInferrer | null): InterchangeNode {
  const args = (node.args ?? []) as CoreNode[];
  if (args.length === 0) {
    return { type: 'repeat', body: [], ...pos(node) } as RepeatNode;
  }

  const loopTypeNode = args[0];
  const loopType = (loopTypeNode?.name ?? loopTypeNode?.value ?? 'forever') as string;
  const bodyBlock = args[args.length - 1];

  switch (loopType) {
    case 'times': {
      const count = args[1] ? convertNode(args[1], infer) : undefined;
      return {
        type: 'repeat',
        count,
        body: extractBlockCommands(bodyBlock, infer),
        ...pos(node),
      } as RepeatNode;
    }
    case 'for': {
      const itemName = (args[1]?.value ?? 'item') as string;
      const collection = args[2]
        ? convertNode(args[2], infer)
        : ({ type: 'identifier', value: '[]' } as const);
      return {
        type: 'foreach',
        itemName,
        collection,
        body: extractBlockCommands(bodyBlock, infer),
        ...pos(node),
      } as ForEachNode;
    }
    case 'while': {
      const condition = args[1]
        ? convertNode(args[1], infer)
        : ({ type: 'literal', value: true } as const);
      return {
        type: 'while',
        condition,
        body: extractBlockCommands(bodyBlock, infer),
        ...pos(node),
      } as WhileNode;
    }
    default:
      return {
        type: 'repeat',
        body: extractBlockCommands(bodyBlock, infer),
        ...pos(node),
      } as RepeatNode;
  }
}

function convertCommandSequence(node: CoreNode, infer: RoleInferrer | null): InterchangeNode {
  const commands = (node.commands ?? []) as CoreNode[];
  if (commands.length === 1) {
    return convertNode(commands[0], infer);
  }
  return {
    type: 'event',
    event: 'click',
    body: commands.map(cmd => convertNode(cmd, infer)),
    ...pos(node),
  } as EventNode;
}

function convertBlock(node: CoreNode, infer: RoleInferrer | null): InterchangeNode {
  const commands = (node.commands ?? []) as CoreNode[];
  if (commands.length === 1) {
    return convertNode(commands[0], infer);
  }
  return {
    type: 'event',
    event: 'click',
    body: commands.map(cmd => convertNode(cmd, infer)),
    ...pos(node),
  } as EventNode;
}

function convertPossessive(node: CoreNode, infer: RoleInferrer | null): InterchangeNode {
  const object = node.object
    ? convertNode(node.object as CoreNode, infer)
    : ({ type: 'identifier', value: 'me' } as const);
  const property =
    typeof node.property === 'string'
      ? node.property
      : (((node.property as CoreNode)?.name ?? (node.property as CoreNode)?.value ?? '') as string);

  return { type: 'possessive', object, property, ...pos(node) };
}

function convertMember(node: CoreNode, infer: RoleInferrer | null): InterchangeNode {
  const object = node.object
    ? convertNode(node.object as CoreNode, infer)
    : ({ type: 'identifier', value: 'me' } as const);
  const property =
    typeof node.property === 'string'
      ? node.property
      : node.property
        ? convertNode(node.property as CoreNode, infer)
        : ({ type: 'literal', value: '' } as const);

  return {
    type: 'member',
    object,
    property,
    computed: (node.computed ?? false) as boolean,
    ...pos(node),
  };
}

function convertBinary(node: CoreNode, infer: RoleInferrer | null): InterchangeNode {
  return {
    type: 'binary',
    operator: (node.operator ?? '') as string,
    left: convertNode(node.left as CoreNode, infer),
    right: convertNode(node.right as CoreNode, infer),
    ...pos(node),
  };
}

function convertCall(node: CoreNode, infer: RoleInferrer | null): InterchangeNode {
  const callee =
    typeof node.callee === 'string'
      ? ({ type: 'identifier', value: node.callee, name: node.callee } as const)
      : convertNode(node.callee as CoreNode, infer);
  const args = ((node.arguments ?? node.args ?? []) as CoreNode[]).map(a => convertNode(a, infer));

  return { type: 'call', callee, args, ...pos(node) };
}

function convertModifiers(
  modifiers: Record<string, CoreNode>,
  infer: RoleInferrer | null
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(modifiers)) {
    result[key] = convertNode(value, infer);
  }
  return result;
}

function buildEventModifiers(node: CoreNode): EventModifiers {
  return {
    ...(node.once ? { once: true } : {}),
    ...(node.debounce ? { debounce: node.debounce as number } : {}),
    ...(node.throttle ? { throttle: node.throttle as number } : {}),
    ...(node.prevent ? { prevent: true } : {}),
    ...(node.stop ? { stop: true } : {}),
    ...(node.capture ? { capture: true } : {}),
    ...(node.passive ? { passive: true } : {}),
    ...(node.from ? { from: node.from as string } : {}),
    ...(node.selector && !node.from ? { from: node.selector as string } : {}),
  };
}

function extractBlockCommands(
  block: CoreNode | undefined,
  infer: RoleInferrer | null
): InterchangeNode[] {
  if (!block) return [];
  if (block.type === 'block') {
    return ((block.commands ?? []) as CoreNode[]).map(cmd => convertNode(cmd, infer));
  }
  return [convertNode(block, infer)];
}

// =============================================================================
// ROLE INFERENCE
// =============================================================================

/**
 * Infer semantic roles from the core parser's positional args and modifiers.
 *
 * The core parser produces commands with positional args and modifier objects
 * but no named roles. `set` and `go` have explicit cases below — both are
 * shapes no schema models (see each case for why). Everything else defers to
 * the INJECTED `infer`, which is where the other 41 command names in the
 * engine corpus get their roles.
 *
 * Returns null if no roles can be inferred (no inferrer, or it declined).
 */
function inferRoles(
  name: string,
  args: InterchangeNode[],
  modifiers: Record<string, unknown> | undefined,
  target: InterchangeNode | undefined,
  infer: RoleInferrer | null
): Readonly<Record<string, InterchangeNode>> | null {
  const roles: Record<string, InterchangeNode> = {};

  switch (name) {
    // set :var to value  →  destination=:var, patient=value
    //
    // Stays here only for the legacy positional form `set :var value` (no `to`)
    // — schema-driven inference handles the canonical `set :var to value` form
    // correctly, but doesn't model the marker-less positional fallback.
    case 'set': {
      const toVal = modifiers?.to;
      const second = args[1] as { type?: string; name?: unknown; value?: unknown } | undefined;
      const marksTo =
        second?.type === 'identifier' &&
        String(second.name ?? second.value ?? '').toLowerCase() === 'to';

      // The CANONICAL `set x to y` form belongs to schema inference, which
      // models `to` as a marker (setSchema.argSkipTokens). This case existed
      // for the marker-less legacy form `set :var value`, but it was
      // intercepting both — taking args[1] blindly, which for the canonical
      // form is the `to` KEYWORD, so `set myVar to "value"` inferred
      // patient="to" and dropped the value. The traditional parser also
      // desugars `increment counter` into that same shape, so it was wrong
      // there too. Delegate rather than re-implement.
      if (marksTo && !toVal) {
        return infer
          ? infer(name, args, modifiers as Readonly<Record<string, unknown>> | undefined, target)
          : null;
      }

      if (args[0]) roles.destination = args[0];
      if (toVal && typeof toVal === 'object' && 'type' in (toVal as object)) {
        roles.patient = toVal as InterchangeNode;
      } else if (args[1]) {
        roles.patient = args[1];
      }
      break;
    }

    // go [to] <url> [in new window] / go back / go to <pos> of <el>
    //
    // Three producer shapes reach here (core `string` nodes convert to
    // interchange `literal`, so the traditional and buildAST shapes coincide):
    //  1. traditional parser: flat args, keywords + naked URLs as literals —
    //     [lit to, lit url, lit '/page'] / [lit to, lit '/about'] / [lit back]
    //  2. semantic compileSync: args:[], modifiers.on = destination,
    //     modifiers.method = literal 'url'
    //  3. buildAST goMapper: positional literal args [lit 'url', lit '/page'] …
    //
    // Schema inference can't produce these: goSchema.destination is a marker
    // role (markerOverride 'to') so it's excluded from positional binding, and
    // `method` lives only in rolePrefixLiteralVariants, which the schema engine
    // never reads.
    case 'go': {
      const kw = (n: unknown): string | undefined => {
        if (!n || typeof n !== 'object') return undefined;
        const v = n as { type?: string; name?: unknown; value?: unknown };
        if (v.type === 'identifier') {
          if (typeof v.name === 'string' && v.name !== '') return v.name;
          return typeof v.value === 'string' ? v.value : undefined;
        }
        if (v.type === 'literal' && typeof v.value === 'string') return v.value;
        return undefined;
      };
      const asNode = (x: unknown): InterchangeNode | undefined =>
        x && typeof x === 'object' && 'type' in (x as object) ? (x as InterchangeNode) : undefined;

      let destination: InterchangeNode | undefined;
      let method: InterchangeNode | undefined;

      const onMod = asNode(modifiers?.on);
      if (args.length === 0 && onMod) {
        // Shape 2 — semantic modifiers path.
        destination = onMod;
        if (kw(asNode(modifiers?.method)) === 'url') {
          method = { type: 'literal', value: 'url' };
        }
      } else {
        // Shapes 1 & 3 — flat positional args.
        const words = args.map(kw);
        const urlIdx = words.indexOf('url');
        if (urlIdx !== -1 && args[urlIdx + 1]) {
          destination = args[urlIdx + 1];
          method = { type: 'literal', value: 'url' };
        } else {
          const SKIP = new Set(['to', 'the']);
          const POSITION = new Set([
            'top',
            'middle',
            'bottom',
            'left',
            'center',
            'right',
            'smoothly',
            'instantly',
            'in',
            'new',
            'window',
          ]);
          const headIdx = args.findIndex((_, i) => {
            const w = words[i];
            return w === undefined || !SKIP.has(w);
          });
          const headWord = headIdx !== -1 ? words[headIdx] : undefined;
          const ofIdx = words.indexOf('of');
          if (headWord === 'back' || headWord === 'forward') {
            destination = { type: 'identifier', value: headWord, name: headWord };
          } else if (ofIdx !== -1 && args[ofIdx + 1]) {
            // scroll form: destination is the `of` target, skipping a `the`.
            destination = kw(args[ofIdx + 1]) === 'the' ? args[ofIdx + 2] : args[ofIdx + 1];
          } else if (headIdx !== -1 && !POSITION.has(headWord ?? '')) {
            destination = args[headIdx];
          }
          // position-only (`go to top`) → left for the target fallback below.
        }
      }

      // AOT GoCodegen emits history.back()/forward() only for an identifier-typed
      // destination; a literal `back` would codegen `location.href = "back"`.
      const destWord = kw(destination);
      if ((destWord === 'back' || destWord === 'forward') && destination?.type !== 'identifier') {
        destination = { type: 'identifier', value: destWord, name: destWord };
      }

      // Explicit cases bypass schema Pass-2 target binding — do it here.
      if (!destination && target) destination = target;

      if (destination) roles.destination = destination;
      if (method) roles.method = method;
      break;
    }

    default:
      // Every other command — the injected front-end inferrer, or no roles.
      return infer
        ? infer(name, args, modifiers as Readonly<Record<string, unknown>> | undefined, target)
        : null;
  }

  return Object.keys(roles).length > 0 ? roles : null;
}
