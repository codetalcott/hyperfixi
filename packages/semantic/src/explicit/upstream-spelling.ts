/**
 * English writes upstream's spelling.
 *
 * The reader keeps accepting forms only core's engine ran (`set @a to v on X`,
 * `prepend`, `push url`, `X has .c`, …): a page written in them still reads.
 * But English is what both hosts read — upstream `_hyperscript` and
 * `@hyperfixi/engine` — and every translation reaches them through it
 * (`@lokascript/hyperscript-adapter` renders the parse back to English), so
 * the English render writes the form upstream reads (owner decision: "the
 * reader accepts, the renderer writes upstream", 2026-10-01; OPEN_ITEMS 2j).
 *
 * This rewrites the node before an English render; foreign renders keep their
 * own words. Each rewrite was measured: the core-only form on core and the
 * spelling below on upstream and on the engine leave the same DOM, the same
 * calls, the same `it` (Phase C2c of the engine cutover).
 *
 *   set @a to v on X                  → set @a of X to v
 *   go to /x                          → go to url "/x"  (a string destination)
 *   prepend X to Y                    → put X at start of Y
 *   open X as non-modal / as modal    → call X.show() / open X  (upstream's open is modal)
 *   push url X / replace url X        → call history.pushState(null,'',X) / replaceState
 *   copy "text"                       → call navigator.clipboard.writeText("text")
 *   swap <strategy> of X with Y       → put Y into / before / after / at start of /
 *                                       at end of X, put Y into X's outerHTML, remove X
 *                                       (core's `into` is innerHTML, `over` outerHTML)
 *   fetch "X" do not throw            → fetch "X" as text do not throw  (upstream reads
 *                                       a quoted URL followed by `do not` as a comparison)
 *   X has .c / I have .c              → X matches .c / I match .c
 *   me matches .c / me is a T         → I match .c / I am a T  (the third person a
 *                                       translation writes for upstream's first, A2)
 *   unless C X                        → X unless C  (a statement modifier, after its command)
 *   my?.a?.b                          → my.a.b  (a property chain is null-safe on both)
 *   previous <input/>.value           → the value of previous <input/>
 *   fetch /q?x=${my value}            → fetch `/q?x=${my value}`  (upstream interpolates a
 *                                       template literal, never a naked URL)
 *   swap #a with #b using view        → start view transition swap #a with #b end
 *     transition (and morph's tail)     (core ran the command inside
 *                                       document.startViewTransition; upstream's block
 *                                       runs its body there)
 *
 * Read and written as written, with no upstream spelling: `clone`, `process` (its
 * view-transition tail included: `process partials` is core's in either spelling).
 * Upstream rejects both, so where one runs it fails loudly. A form upstream READS,
 * with another meaning, is refused instead (unspelledForms, below).
 */

import type {
  BehaviorSemanticNode,
  CommandSemanticNode,
  CompoundSemanticNode,
  ConditionalSemanticNode,
  DefSemanticNode,
  ErrorClauses,
  EventHandlerSemanticNode,
  FeatureSemanticNode,
  LoopSemanticNode,
  SemanticNode,
  SemanticRole,
  SemanticValue,
  BlockCommandSemanticNode,
  ViewTransitionSemanticNode,
} from '../types';
import { isBlockCommand } from '../types';
import { CHILD_FIELDS } from '../fidelity';

type Roles = ReadonlyMap<SemanticRole, SemanticValue>;

/** Rewrite a node tree so that its English render is upstream's spelling. */
export function toUpstreamSpelling(node: SemanticNode): SemanticNode {
  switch (node.kind) {
    case 'command':
      return rewriteCommand(node as CommandSemanticNode);
    case 'event-handler': {
      const handler = node as EventHandlerSemanticNode;
      const out: EventHandlerSemanticNode = {
        ...handler,
        roles: rewriteRoles(handler.roles),
        body: rewriteAll(handler.body),
        ...rewriteErrorClauses(handler),
      };
      return out;
    }
    case 'compound': {
      const compound = node as CompoundSemanticNode;
      const out: CompoundSemanticNode = {
        ...compound,
        roles: rewriteRoles(compound.roles),
        statements: rewriteAll(compound.statements),
      };
      return out;
    }
    case 'conditional': {
      const conditional = node as ConditionalSemanticNode;
      const out: ConditionalSemanticNode = {
        ...conditional,
        roles: rewriteRoles(conditional.roles),
        thenBranch: rewriteAll(conditional.thenBranch),
        ...(conditional.elseBranch ? { elseBranch: rewriteAll(conditional.elseBranch) } : {}),
      };
      return out;
    }
    case 'loop': {
      const loop = node as LoopSemanticNode;
      const out: LoopSemanticNode = {
        ...loop,
        roles: rewriteRoles(loop.roles),
        body: rewriteAll(loop.body),
      };
      return out;
    }
    case 'behavior': {
      const behavior = node as BehaviorSemanticNode;
      const out: BehaviorSemanticNode = {
        ...behavior,
        eventHandlers: behavior.eventHandlers.map(
          h => toUpstreamSpelling(h) as EventHandlerSemanticNode
        ),
        ...(behavior.initBlock ? { initBlock: rewriteAll(behavior.initBlock) } : {}),
      };
      return out;
    }
    case 'def': {
      const def = node as DefSemanticNode;
      const out: DefSemanticNode = {
        ...def,
        body: rewriteAll(def.body),
        ...rewriteErrorClauses(def),
      };
      return out;
    }
    case 'feature': {
      const feature = node as FeatureSemanticNode;
      const out: FeatureSemanticNode = { ...feature, body: rewriteAll(feature.body) };
      return out;
    }
    default:
      return node;
  }
}

/**
 * The core-only forms a node holds that upstream has no spelling for and READS,
 * with another meaning: a swap whose strategy is core's morph (`morph`,
 * `innermorph`, `outermorph`) or `none`, or that has no content. Written as
 * they read, upstream and the engine take `swap morph of #t with x` for an
 * exchange of `#t`'s `morph` property with `x`. A translation that holds one is
 * refused (explicit/lossy.ts). Core-only forms upstream rejects (`clone`,
 * `process`) are not listed: where one runs, it fails loudly.
 */
export function unspelledForms(node: SemanticNode): string[] {
  const out: string[] = [];
  const visit = (value: unknown, depth: number): void => {
    if (depth > 64 || value === null || typeof value !== 'object') return;
    const rec = value as Record<string, unknown>;
    // toUpstreamSpelling writes every strategy it can as another command, so a
    // swap still holding one is a strategy it cannot write.
    const method =
      rec.action === 'swap' ? (rec.roles as Roles | undefined)?.get('method') : undefined;
    if (method) {
      const word = method.type === 'literal' ? String(method.value) : sourceText(method);
      out.push(`swap ${word ?? method.type}`);
    }
    for (const field of CHILD_FIELDS) {
      const child = rec[field];
      if (Array.isArray(child)) for (const c of child) visit(c, depth + 1);
    }
  };
  visit(toUpstreamSpelling(node), 0);
  return out;
}

function rewriteAll(nodes: readonly SemanticNode[]): SemanticNode[] {
  const out: SemanticNode[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]!;
    const next = nodes[i + 1];
    // unless C X → X unless C: upstream's guard is a statement modifier written
    // after the command (`toggle .foo unless I match .bar`); the flat guard
    // ahead of its command is core's prefix form, which upstream rejects.
    const condition =
      node.kind === 'command' && node.action === 'unless' ? node.roles.get('condition') : undefined;
    if (condition && next && !(next as { postfixUnless?: unknown }).postfixUnless) {
      out.push({
        ...toUpstreamSpelling(next),
        postfixUnless: rewriteValue(condition),
      } as SemanticNode);
      i++;
      continue;
    }
    out.push(toUpstreamSpelling(node));
  }
  return out;
}

function rewriteRoles(roles: Roles): Map<SemanticRole, SemanticValue> {
  return new Map([...roles].map(([role, value]) => [role, rewriteValue(value)]));
}

/** A handler's or a def's `catch` and `finally` bodies, which run as its body does. */
function rewriteErrorClauses(node: ErrorClauses): ErrorClauses {
  return {
    ...(node.catchBody ? { catchBody: rewriteAll(node.catchBody) } : {}),
    ...(node.finallyBody ? { finallyBody: rewriteAll(node.finallyBody) } : {}),
  };
}

/** Core's two words for a strategy (its STRATEGY_KEYWORDS): `swap into #t with x`. */
const SWAP_STRATEGY_ALIASES: Readonly<Record<string, string>> = {
  into: 'innerhtml',
  over: 'outerhtml',
};

const SWAP_PUT_MANNER: Readonly<Record<string, string>> = {
  beforebegin: 'before',
  afterend: 'after',
  afterbegin: 'at start of',
  beforeend: 'at end of',
};

/** The commands whose view-transition tail upstream spells as a block. */
const VIEW_TRANSITION_COMMANDS: ReadonlySet<string> = new Set(['swap', 'morph']);

/** The `manner` the reader gives `using view transition`: the word `transition`. */
function isViewTransitionManner(value: SemanticValue | undefined): boolean {
  const word =
    value?.type === 'literal' ? value.value : value?.type === 'expression' ? value.raw : undefined;
  return typeof word === 'string' && word.toLowerCase() === 'transition';
}

function rewriteCommand(original: CommandSemanticNode): SemanticNode {
  if (isBlockCommand(original)) {
    const block: BlockCommandSemanticNode = {
      ...original,
      roles: rewriteRoles(original.roles),
      body: rewriteAll(original.body),
    };
    return block;
  }
  if (
    VIEW_TRANSITION_COMMANDS.has(original.action) &&
    isViewTransitionManner(original.roles.get('manner' as SemanticRole))
  ) {
    // The tail leaves the command for a block around it, so a strategy swap
    // rewritten to a `put` below keeps its transition too.
    const roles = new Map(original.roles);
    roles.delete('manner' as SemanticRole);
    const block: ViewTransitionSemanticNode = {
      kind: 'command',
      action: 'viewTransition',
      roles: new Map(),
      body: [rewriteCommand({ ...original, roles })],
      ...(original.metadata ? { metadata: original.metadata } : {}),
    };
    return block;
  }
  const node: CommandSemanticNode = { ...original, roles: rewriteRoles(original.roles) };
  const roles = node.roles;
  const role = (name: string): SemanticValue | undefined => roles.get(name as SemanticRole);
  const command = (action: string, entries: Array<[string, SemanticValue | undefined]>) => {
    const out = new Map<SemanticRole, SemanticValue>();
    for (const [name, value] of entries) if (value) out.set(name as SemanticRole, value);
    const rewritten: CommandSemanticNode = {
      ...node,
      action: action as CommandSemanticNode['action'],
      roles: out,
    };
    return rewritten;
  };
  // As the reader builds them: a put's manner is a word its pattern pins (implicit),
  // go's `url` is a slot the renderer fills only when the value was written.
  const pinned = (value: string): SemanticValue => ({ type: 'literal', value, implicit: true });

  switch (node.action) {
    case 'set': {
      // `set @a to v on X` → `set @a of X to v`
      const destination = role('destination');
      const scope = role('scope');
      const owner = scope && sourceText(scope);
      if (destination?.type !== 'selector' || !destination.value.startsWith('@') || !owner) {
        return node;
      }
      return command('set', [
        ...[...roles].filter(([name]) => name !== 'scope' && name !== 'destination'),
        ['destination', { type: 'expression', raw: `${destination.value} of ${owner}` }],
      ]);
    }
    case 'go': {
      // A string destination is a URL: `go "/x"` scrolls to nothing on upstream.
      const destination = role('destination');
      if (
        destination?.type !== 'literal' ||
        typeof destination.value !== 'string' ||
        role('method')
      ) {
        return node;
      }
      return command('go', [...roles, ['method', { type: 'literal', value: 'url' }]]);
    }
    case 'open': {
      // Core's dialog mode: upstream's `open` is modal (showModal), and it reads
      // `as non-modal` as an expression, `(#d as non) - modal`. The non-modal
      // open of a dialog is its `show()` (core's `as non-modal`, documented for
      // dialogs only).
      const style = role('style');
      const mode = style ? sourceText(style)?.replace(/^"|"$/g, '').toLowerCase() : undefined;
      if (mode === 'modal') return command('open', [['patient', role('patient')]]);
      if (mode !== 'non-modal') return node;
      const target = role('patient') ? sourceText(role('patient')!) : 'me';
      if (!target) return node;
      const receiver = /^[#.@$:^\w-]+$/.test(target) ? target : `(${target})`;
      return command('call', [['patient', { type: 'expression', raw: `${receiver}.show()` }]]);
    }
    case 'prepend':
      return command('put', [
        ['patient', role('patient')],
        ['destination', role('destination')],
        ['manner', pinned('at start of')],
      ]);
    case 'push':
    case 'replace': {
      const url = role('patient') && sourceText(role('patient')!);
      if (!url) return node;
      const method = node.action === 'push' ? 'pushState' : 'replaceState';
      // As the reader writes a call's arguments back, so English is a fixed point.
      return command('call', [
        ['patient', { type: 'expression', raw: `history.${method}(null,'',${url})` }],
      ]);
    }
    case 'copy': {
      // Text only: what core copies for an element was not measured.
      const patient = role('patient');
      if (patient?.type === 'selector') return node;
      const text = patient && sourceText(patient);
      if (!text) return node;
      return command('call', [
        ['patient', { type: 'expression', raw: `navigator.clipboard.writeText(${text})` }],
      ]);
    }
    case 'swap': {
      const method = role('method');
      const target = role('destination');
      const content = role('patient');
      // A strategy that is also a keyword (`over`) reads as an expression.
      const word =
        method?.type === 'literal' ? method.value : method?.type === 'expression' ? method.raw : '';
      if (typeof word !== 'string' || !word || !target) return node;
      const strategy = SWAP_STRATEGY_ALIASES[word.toLowerCase()] ?? word.toLowerCase();
      if (strategy === 'delete') return command('remove', [['patient', target]]);
      if (!content) return node;
      if (strategy === 'innerhtml') {
        return command('put', [
          ['patient', content],
          ['destination', target],
        ]);
      }
      if (strategy === 'outerhtml') {
        return command('put', [
          ['patient', content],
          [
            'destination',
            { type: 'property-path', object: target, property: 'outerHTML', access: 'possessive' },
          ],
        ]);
      }
      const manner = SWAP_PUT_MANNER[strategy];
      if (!manner) return node;
      return command('put', [
        ['patient', content],
        ['destination', target],
        ['manner', pinned(manner)],
      ]);
    }
    case 'fetch': {
      // Upstream reads `"X" do not …` as a comparison; a conversion ends the URL.
      const source = role('source');
      if (
        !node.doNotThrow ||
        role('responseType') ||
        source?.type !== 'literal' ||
        source.interpolates
      ) {
        return node;
      }
      return command('fetch', [...roles, ['responseType', { type: 'expression', raw: 'text' }]]);
    }
    default:
      return node;
  }
}

/** A value as hyperscript source, for building an expression around it. */
function sourceText(value: SemanticValue): string | undefined {
  switch (value.type) {
    case 'selector':
    case 'reference':
      return String(value.value);
    case 'expression':
      return value.raw;
    case 'literal':
      return typeof value.value === 'string' ? JSON.stringify(value.value) : String(value.value);
    default:
      return undefined;
  }
}

function rewriteValue(value: SemanticValue): SemanticValue {
  switch (value.type) {
    case 'property-path': {
      const property = value.property.replace(/\?\./g, '.').replace(/^\./, '');
      const object = rewriteValue(value.object);
      return property === value.property && object === value.object
        ? value
        : { ...value, object, property };
    }
    case 'expression': {
      const raw = rewriteExpression(value.raw);
      return raw === value.raw ? value : { ...value, raw };
    }
    case 'literal':
      if (value.interpolates && typeof value.value === 'string') {
        return { type: 'expression', raw: `\`${value.value}\`` };
      }
      return value;
    default:
      return value;
  }
}

/** `previous <input/>.value` (the reader keeps a space before the dot). */
const POSITIONAL_PROPERTY =
  /^(previous|next|closest|first|last)\s+(<[^>]*\/>|[.#][\w-]+)\s*\.([A-Za-z_$][\w$]*)$/;

/** Rewrite an expression's source outside its string literals. */
export function rewriteExpression(raw: string): string {
  const positional = POSITIONAL_PROPERTY.exec(raw.trim());
  if (positional) return `the ${positional[3]} of ${positional[1]} ${positional[2]}`;
  return outsideStrings(raw, code =>
    code
      .replace(/\?\./g, '.')
      .replace(/\bdoes not have(\s+)(?=[.#[])/g, 'does not match$1')
      .replace(/\bhas(\s+)(?=[.#[])/g, 'matches$1')
      .replace(/\bhave(\s+)(?=[.#[])/g, 'match$1')
      // The third person a translation writes for upstream's first (M2, A2).
      .replace(/(^|[^\w$.#@*:-])me matches\b/g, '$1I match')
      .replace(/(^|[^\w$.#@*:-])me does not match\b/g, '$1I do not match')
      .replace(/(^|[^\w$.#@*:-])me is(\s+not)?(\s+an?\s)/g, '$1I am$2$3')
  );
}

/** Apply `rewrite` to the code between string literals, leaving the literals alone. */
function outsideStrings(raw: string, rewrite: (code: string) => string): string {
  let out = '';
  let code = '';
  for (let i = 0; i < raw.length; i++) {
    const quote = raw[i];
    if (quote === '"' || quote === "'" || quote === '`') {
      out += rewrite(code);
      code = '';
      let j = i + 1;
      while (j < raw.length && raw[j] !== quote) j += raw[j] === '\\' ? 2 : 1;
      out += raw.slice(i, j + 1);
      i = j;
    } else {
      code += quote;
    }
  }
  return out + rewrite(code);
}
