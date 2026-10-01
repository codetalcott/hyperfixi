/**
 * Features other than `on`: `def`, `init`, `behavior`, `install`, and the
 * top-level `set`. Follows upstream `parsetree/features/*`.
 */
import type { Cmd, Feature, Handlers, NamedArgsNode } from './ast';
import { parseSet, type SetNode } from './commands/setters';
import { dotOrColonPath, namedArgumentList } from './expressions';
import type { Grammar, Parser } from './parser';
import { assignToNamespace, makeContext, runBlock, runList, scopeOf } from './runtime';
import { commandList, errorAndFinally, program } from './statements';
import { fn, get, isP, obj, then1 } from './util';

const path = (p: Parser) => dotOrColonPath(p) ?? p.err('Expected dotOrColonPath');

export interface DefFeature extends Feature, Handlers {
  type: 'defFeature';
  name: string;
  params: string[];
  body: Cmd[];
}

/**
 * `def name(params) <commands> [catch …] [finally …] [end]`. The function
 * returns its value directly when its body is synchronous and a promise when it
 * waits; an uncaught error is thrown or rejected the same way.
 */
export function def(g: Grammar): void {
  g.features.def = (p, start) => {
    const name = path(p);
    const namespace = name.split('.');
    const functionName = namespace.pop() ?? name;
    const params: string[] = [];
    if (p.matchOp('(') && !p.matchOp(')')) {
      do params.push(p.reqType('IDENTIFIER').value);
      while (p.matchOp(','));
      p.reqOp(')');
    }
    const body = commandList(p);
    const feature: DefFeature = {
      type: 'defFeature',
      name,
      displayName: `${functionName}(${params.join(', ')})`,
      params,
      body,
      ...errorAndFinally(p),
      start,
      end: p.endPos(),
      install: (target, source) => {
        const call = (...args: unknown[]) => {
          const ctx = makeContext(source, feature, target, null);
          params.forEach((param, i) => (ctx.locals[param] = args[i]));
          const result = then1(runBlock(ctx, body, feature), signal => get(signal, 'value'));
          // As upstream: once a function with a `finally` block has gone asynchronous, the
          // block's completion settles the call, so a late error does not reach the caller.
          return isP(result) && feature.finallyHandler
            ? result.then(undefined, () => undefined)
            : result;
        };
        // `hyperfunc` tells a caller to pass its context as the last argument.
        assignToNamespace(
          target,
          namespace,
          functionName,
          Object.assign(call, { hyperfunc: true, hypername: name })
        );
      },
    };
    return feature;
  };
}

export interface InitFeature extends Feature {
  type: 'initFeature';
  body: Cmd[];
  immediately: boolean;
}

/** `init [immediately] <commands>`: run once when the element is initialised. */
export function init(g: Grammar): void {
  g.features.init = (p, start) => {
    const immediately = !!p.match('immediately');
    const body = commandList(p);
    const feature: InitFeature = {
      type: 'initFeature',
      body,
      immediately,
      start,
      end: p.endPos(),
      install: target => {
        const run = () => void runList(body, makeContext(target, feature, target, null));
        if (immediately) run();
        else queueMicrotask(run);
      },
    };
    return feature;
  };
}

export interface BehaviorFeature extends Feature {
  type: 'behaviorFeature';
  name: string;
  params: string[];
  features: Feature[];
}

/** `behavior Name(params) <features> end`: a reusable set of features, installed by name. */
export function behavior(g: Grammar): void {
  g.features.behavior = (p, start) => {
    const name = path(p);
    const namespace = name.split('.');
    const behaviorName = namespace.pop() ?? name;
    const params: string[] = [];
    if (p.matchOp('(') && !p.matchOp(')')) {
      do params.push(p.reqType('IDENTIFIER').value);
      while (p.matchOp(','));
      p.reqOp(')');
    }
    const features = program(p).features;
    for (const feature of features) feature.behavior = name;
    const feature: BehaviorFeature = {
      type: 'behaviorFeature',
      name,
      params,
      features,
      start,
      end: p.endPos(),
      install: () =>
        assignToNamespace(
          null,
          namespace,
          behaviorName,
          (target: unknown, source: unknown, args: unknown) => {
            // Each installation gets the behavior's parameters in the behavior's own scope.
            if (obj(target))
              for (const param of params) scopeOf(target, name + 'Scope')[param] = get(args, param);
            for (const inner of features) inner.install(target, source);
          }
        ),
    };
    return feature;
  };
}

export interface InstallFeature extends Feature {
  type: 'installFeature';
  name: string;
  args?: NamedArgsNode;
}

/** `install Name(arg: value, …)`: apply a behavior to this element. */
export function install(g: Grammar): void {
  g.features.install = (p, start) => {
    const name = path(p);
    const args = namedArgumentList(p);
    const feature: InstallFeature = {
      type: 'installFeature',
      name,
      args,
      start,
      end: p.endPos(),
      install: (target, source) => {
        let found: unknown = globalThis;
        for (const part of name.split('.')) {
          found = get(found, part);
          if (typeof found !== 'object' && typeof found !== 'function')
            throw new Error('No such behavior defined as ' + name);
        }
        if (!fn(found)) throw new Error(name + ' is not a behavior');
        found(target, source, args?.ev(makeContext(target, feature, target, null)));
      },
    };
    return feature;
  };
}

export interface SetFeature extends Feature {
  type: 'setFeature';
  command: SetNode;
}

/** A `set` at the top of a script: initialise an element, global or inherited variable. */
export function setFeature(g: Grammar): void {
  g.features.set = (p, start) => {
    const command = parseSet(p, start);
    if ('scope' in command.target && command.target.scope === 'local') {
      p.err(
        'variables declared at the feature level cannot be locally scoped ' +
          '(use :foo, ^foo, $foo, or an @attribute target instead).'
      );
    }
    const feature: SetFeature = {
      type: 'setFeature',
      command,
      start,
      end: p.endPos(),
      install: target =>
        queueMicrotask(() => void command.run(makeContext(target, feature, target, null))),
    };
    return feature;
  };
}
