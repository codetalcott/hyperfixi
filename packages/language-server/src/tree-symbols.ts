/**
 * Symbols read from the engine's parse of one region.
 *
 * The engine's tree says what a name IS: a `symbol` node carries its scope
 * (`local`, `element` for `:x`, `global` for `$x`) and its position, so a
 * variable written without a sigil, a parameter and a loop variable resolve
 * here, each inside the handler, `def` or behavior it belongs to. The regex
 * table (symbol-table.ts) cannot tell those from keywords; it stays as the
 * reader for a region the engine does not parse: one being typed, or one in
 * another language.
 *
 * The tree does not position the names a feature declares (a behavior's or a
 * `def`'s name and parameters, a handler's event and arguments, a loop's
 * variables, a sent event). Those are found in the text, searching forward
 * from the node that declares them: the grammar fixes their order there.
 */

import type { SymbolEntry, SymbolKind } from './symbol-table.js';

export interface TreeSite {
  /** The symbol's identity: its name, plus its scope for a scoped name. */
  key: string;
  /** The name as written, which is what a rename replaces. */
  name: string;
  kind: SymbolKind;
  scope: SymbolEntry['scope'];
  role: 'def' | 'use';
  /** Offset in the region's code. */
  offset: number;
  length: number;
}

export const SCOPE_SEP = '\u0000';

type Node = Record<string, unknown>;
const isNode = (value: unknown): value is Node =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const num = (value: unknown): number | undefined => (typeof value === 'number' ? value : undefined);
const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];

/** Commands whose `target`, when it is a bare name, is written (so: defined) there. */
const WRITES = new Set([
  'setCommand',
  'defaultCommand',
  'putCommand',
  'incrementCommand',
  'decrementCommand',
]);

const WORD_CHAR = /[\p{L}\p{N}_$]/u;

/**
 * The sites in one region, or null when `tree` is not an engine parse.
 * `regionIndex` keeps one region's scopes apart from another's.
 */
export function treeSites(tree: unknown, code: string, regionIndex: number): TreeSite[] | null {
  if (!isNode(tree)) return null;
  const program = isNode(tree.program) ? tree.program : tree;
  if (num(program.start) === undefined) return null;

  const sites: TreeSite[] = [];

  /** `word` as a whole name in `code[from, to)`, or -1. */
  const findWord = (word: string, from: number, to = code.length): number => {
    for (let i = code.indexOf(word, from); i >= 0 && i + word.length <= to;) {
      const before = i > 0 ? code[i - 1]! : ' ';
      const after = code[i + word.length] ?? ' ';
      if (!WORD_CHAR.test(before) && !WORD_CHAR.test(after)) return i;
      i = code.indexOf(word, i + 1);
    }
    return -1;
  };
  /** Just past the keyword a node starts with. */
  const afterKeyword = (start: number): number =>
    start + (/^\S+/.exec(code.slice(start))?.[0].length ?? 0);
  const firstStart = (nodes: unknown): number | undefined =>
    Array.isArray(nodes) && isNode(nodes[0]) ? num(nodes[0].start) : undefined;

  interface Scope {
    /** The handler, `def` or region whose locals these are. */
    local: string;
    /** The behavior or region whose `:x` these are. */
    element: string;
    /** The enclosing behavior's parameters. */
    behavior: { key: string; params: Set<string> } | null;
  }
  interface Found {
    node: Node;
    /** Where the name is in the region's code. */
    at: number;
    write: boolean;
    call: boolean;
  }

  const variable = (name: string, scopeKey: string, role: TreeSite['role'], offset: number) =>
    sites.push({
      key: name + SCOPE_SEP + scopeKey,
      name,
      kind: 'variable',
      scope: 'handler',
      role,
      offset,
      length: name.length,
    });

  /** One handler, `def`, `init`…: its declared names, then every name inside it. */
  function feature(node: Node, outer: Scope): void {
    const start = num(node.start) ?? 0;
    const end = num(node.end) ?? code.length;
    const type = node.type;

    if (type === 'behaviorFeature' && typeof node.name === 'string') {
      const scopeKey = `behavior ${regionIndex}:${start}`;
      // Parameters are keyed by the behavior's NAME: an `install` site in
      // another region names them too (`install Removable(removeButton: …)`).
      const paramsKey = `behavior ${node.name}`;
      const bodyStart = firstStart(node.features) ?? end;
      let cursor = afterKeyword(start);
      const nameAt = code.indexOf(node.name, cursor);
      if (nameAt >= 0 && nameAt < bodyStart) {
        sites.push({
          key: node.name,
          name: node.name,
          kind: 'behavior',
          scope: 'global',
          role: 'def',
          offset: nameAt,
          length: node.name.length,
        });
        cursor = nameAt + node.name.length;
      }
      const params = strings(node.params);
      for (const param of params) {
        const at = findWord(param, cursor, bodyStart);
        if (at < 0) continue;
        variable(param, paramsKey, 'def', at);
        cursor = at + param.length;
      }
      const inner: Scope = {
        local: scopeKey,
        element: scopeKey,
        behavior: { key: paramsKey, params: new Set(params) },
      };
      for (const child of Array.isArray(node.features) ? node.features : []) {
        if (isNode(child)) feature(child, inner);
      }
      return;
    }

    const scope: Scope = { ...outer, local: `local ${regionIndex}:${start}` };
    const declared = new Set<string>();
    const found: Found[] = [];
    /** `a.b(…)` calls, kept until it is known whether `a` is a variable here. */
    const dotted: Array<{ base: string; site: TreeSite }> = [];
    const bodyStart = firstStart(node.body) ?? end;

    if (type === 'defFeature' && typeof node.name === 'string') {
      let cursor = afterKeyword(start);
      const nameAt = code.indexOf(node.name, cursor);
      if (nameAt >= 0 && nameAt < bodyStart) {
        sites.push({
          key: node.name,
          name: node.name,
          kind: 'function',
          scope: 'global',
          role: 'def',
          offset: nameAt,
          length: node.name.length,
        });
        cursor = nameAt + node.name.length;
      }
      for (const param of strings(node.params)) {
        const at = findWord(param, cursor, bodyStart);
        if (at < 0) continue;
        declared.add(param);
        variable(param, scope.local, 'def', at);
        cursor = at + param.length;
      }
    } else if (type === 'installFeature' && typeof node.name === 'string') {
      const nameAt = code.indexOf(node.name, afterKeyword(start));
      if (nameAt >= 0 && nameAt < end) {
        sites.push({
          key: node.name,
          name: node.name,
          kind: 'behavior',
          scope: 'global',
          role: 'use',
          offset: nameAt,
          length: node.name.length,
        });
      }
      const args = isNode(node.args) ? node.args : null;
      let cursor = num(args?.start) ?? end;
      const values = Array.isArray(args?.values) ? args.values : [];
      for (const [i, argName] of strings(args?.names).entries()) {
        const at = findWord(argName, cursor, num(args?.end) ?? end);
        if (at < 0) continue;
        variable(argName, `behavior ${node.name}`, 'use', at);
        const value: unknown = values[i];
        cursor = (isNode(value) ? num(value.end) : undefined) ?? at + argName.length;
      }
    } else if (type === 'onFeature' && Array.isArray(node.events)) {
      let cursor = afterKeyword(start);
      for (const event of node.events) {
        if (!isNode(event) || typeof event.on !== 'string') continue;
        const at = code.indexOf(event.on, cursor);
        if (at < 0 || at >= bodyStart) continue;
        sites.push({
          key: 'event' + SCOPE_SEP + event.on,
          name: event.on,
          kind: 'event',
          scope: 'global',
          role: 'def',
          offset: at,
          length: event.on.length,
        });
        cursor = at + event.on.length;
        for (const arg of strings(event.args)) {
          const argAt = findWord(arg, cursor, bodyStart);
          if (argAt < 0) continue;
          declared.add(arg);
          variable(arg, scope.local, 'def', argAt);
          cursor = argAt + arg.length;
        }
      }
    }

    const seen = new WeakSet<object>();
    const writes = new WeakSet<object>();
    const calls = new WeakSet<object>();
    // `base`: a template string is parsed on its own, so the nodes inside
    // `${…}` are positioned from its first character, not the region's.
    const walk = (value: unknown, base = 0): void => {
      if (Array.isArray(value)) {
        for (const item of value) walk(item, base);
        return;
      }
      if (!isNode(value) || seen.has(value)) return;
      seen.add(value);
      const relStart = num(value.start);
      const relEnd = num(value.end);
      const at = relStart === undefined ? undefined : base + relStart;
      const nodeEnd = relEnd === undefined ? undefined : base + relEnd;

      if (value.type === 'symbol' && typeof value.name === 'string' && at !== undefined) {
        // `element x` and `the element's x` span the scope word too: the
        // name is the last thing in the node. A node whose text is not its
        // name (positioned by a parser this walk does not know) is left out.
        const name = value.name;
        const nameAt = [at, (nodeEnd ?? at) - name.length].find(
          offset => code.slice(offset, offset + name.length) === name
        );
        if (nameAt !== undefined) {
          found.push({ node: value, at: nameAt, write: writes.has(value), call: calls.has(value) });
        }
        return;
      }
      if (
        value.type === 'idRef' &&
        typeof value.value === 'string' &&
        at !== undefined &&
        code.slice(at + 1, at + 1 + value.value.length) === value.value
      ) {
        // `#out`: the site is the name, which is what the element's `id` holds.
        sites.push({
          key: '#' + value.value,
          name: value.value,
          kind: 'id',
          scope: 'global',
          role: 'use',
          offset: at + 1,
          length: value.value.length,
        });
        return;
      }
      if (typeof value.type === 'string' && WRITES.has(value.type) && isNode(value.target)) {
        if (value.target.type === 'symbol') writes.add(value.target);
      }
      if (value.type === 'functionCall' && isNode(value.root)) {
        if (value.root.type === 'symbol') calls.add(value.root);
        else dottedCall(value.root, base);
      }
      if (value.type === 'repeatCommand' && at !== undefined) {
        const expression = isNode(value.expression) ? value.expression : null;
        const loopBody = firstStart(value.body) ?? nodeEnd ?? code.length;
        if (typeof value.identifier === 'string') {
          const idAt = findWord(
            value.identifier,
            afterKeyword(at),
            num(expression?.start) ?? loopBody
          );
          if (idAt >= 0) {
            declared.add(value.identifier);
            variable(value.identifier, scope.local, 'def', idAt);
          }
        }
        if (typeof value.indexIdentifier === 'string') {
          const idAt = findWord(value.indexIdentifier, num(expression?.end) ?? at, loopBody);
          if (idAt >= 0) {
            declared.add(value.indexIdentifier);
            variable(value.indexIdentifier, scope.local, 'def', idAt);
          }
        }
      }
      if (value.type === 'sendCommand' && typeof value.event === 'string' && at !== undefined) {
        const eventAt = code.indexOf(value.event, afterKeyword(at));
        if (eventAt >= 0 && eventAt < (nodeEnd ?? code.length)) {
          sites.push({
            key: 'event' + SCOPE_SEP + value.event,
            name: value.event,
            kind: 'event',
            scope: 'global',
            role: 'use',
            offset: eventAt,
            length: value.event.length,
          });
        }
      }
      for (const [key, child] of Object.entries(value)) {
        if (typeof child === 'function') continue;
        // A behavior's own features are walked as features, above.
        if (key === 'features') continue;
        const inTemplate = key === 'parts' && value.type === 'string' && at !== undefined;
        walk(child, inTemplate ? at + 1 : base);
      }
    };

    /** `utils.greet(…)`: a call of the function a `def utils.greet` defines. */
    function dottedCall(root: Node, base: number): void {
      const parts: string[] = [];
      let cursor: Node | null = root;
      while (cursor && cursor.type === 'propertyAccess' && typeof cursor.prop === 'string') {
        parts.unshift(cursor.prop);
        cursor = isNode(cursor.root) ? cursor.root : null;
      }
      if (!cursor || cursor.type !== 'symbol' || typeof cursor.name !== 'string') return;
      // `$list.push(…)` is a method of a variable, never a `def`.
      if (cursor.scope !== 'local') return;
      const name = [cursor.name, ...parts].join('.');
      const rootStart = num(root.start);
      const at = rootStart === undefined ? undefined : base + rootStart;
      if (at === undefined || code.slice(at, at + name.length) !== name) return;
      dotted.push({
        base: cursor.name,
        site: {
          key: name,
          name,
          kind: 'function',
          scope: 'global',
          role: 'use',
          offset: at,
          length: name.length,
        },
      });
    }

    walk(node);

    // A sigil-less name is this feature's variable when something here
    // declares or writes it; otherwise the behavior's parameter, a called
    // function, or a name the runtime supplies (`me`, `it`, `event`, `window`).
    for (const { node: symbol, write } of found) {
      if (symbol.scope === 'local' && write) declared.add(symbol.name as string);
    }
    for (const { base, site } of dotted) {
      if (!declared.has(base) && !scope.behavior?.params.has(base)) sites.push(site);
    }
    for (const { node: symbol, at: offset, write, call } of found) {
      const name = symbol.name as string;
      const role = write ? 'def' : 'use';
      if (symbol.scope === 'element') {
        sites.push({
          key: name + SCOPE_SEP + scope.element,
          name,
          kind: 'variable',
          scope: 'local',
          role,
          offset,
          length: name.length,
        });
      } else if (symbol.scope === 'global') {
        sites.push({
          key: name,
          name,
          kind: 'variable',
          scope: 'global',
          role,
          offset,
          length: name.length,
        });
      } else if (declared.has(name)) {
        variable(name, scope.local, role, offset);
      } else if (scope.behavior?.params.has(name)) {
        variable(name, scope.behavior.key, 'use', offset);
      } else if (call) {
        sites.push({
          key: name,
          name,
          kind: 'function',
          scope: 'global',
          role: 'use',
          offset,
          length: name.length,
        });
      }
    }
  }

  const top: Scope = {
    local: `region ${regionIndex}`,
    element: `region ${regionIndex}`,
    behavior: null,
  };
  if (Array.isArray(program.features)) {
    for (const child of program.features) if (isNode(child)) feature(child, top);
  } else {
    feature(program, top);
  }
  return sites;
}

/**
 * The variable names an author can use at the END of `code`: the last
 * handler's (or `def`'s) own, its behavior's parameters, the `:x` of its
 * element or behavior, and every `$x`. `tree` is a parse of `code`.
 */
export function namesInScopeAtEnd(tree: unknown, code: string): string[] {
  const sites = treeSites(tree, code, 0);
  if (!sites || !isNode(tree)) return [];
  const program = isNode(tree.program) ? tree.program : tree;
  const scopes = new Set<string>();
  const last = Array.isArray(program.features) ? program.features.at(-1) : program;
  if (isNode(last) && last.type === 'behaviorFeature') {
    scopes.add(`behavior ${String(last.name)}`).add(`behavior 0:${num(last.start) ?? 0}`);
    const inner = Array.isArray(last.features) ? last.features.at(-1) : undefined;
    if (isNode(inner)) scopes.add(`local 0:${num(inner.start) ?? 0}`);
  } else if (isNode(last)) {
    scopes.add(`local 0:${num(last.start) ?? 0}`).add('region 0');
  }
  const names = new Set<string>();
  for (const site of sites) {
    if (site.kind !== 'variable') continue;
    if (site.scope === 'global' || scopes.has(site.key.split(SCOPE_SEP)[1] ?? ''))
      names.add(site.name);
  }
  return [...names];
}
