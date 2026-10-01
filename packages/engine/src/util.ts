/**
 * Sync-until-promise plumbing and the few value guards the engine needs.
 *
 * The engine never awaits a value that is not a promise: every evaluation
 * returns its value directly, and only a real thenable makes the rest of the
 * work continue in a `.then`. That is what lets a handler made of synchronous
 * commands finish before `dispatchEvent` returns.
 */

export type MaybeP<T> = T | PromiseLike<T>;

export const isP = (v: unknown): v is PromiseLike<unknown> =>
  typeof v === 'object' && v !== null && 'then' in v && typeof v.then === 'function';

/** Continue with `f` now, or after `v` resolves if it is a promise. */
export const then1 = <R>(v: unknown, f: (v: unknown) => MaybeP<R>): MaybeP<R> =>
  isP(v) ? v.then(f) : f(v);

/** Continue with every value resolved; synchronous when none is a promise. */
export const all = <R>(vals: unknown[], f: (vals: unknown[]) => MaybeP<R>): MaybeP<R> =>
  vals.some(isP) ? Promise.all(vals).then(f) : f(vals);

/** Anything but null/undefined can be indexed in JavaScript. */
export const obj = (v: unknown): v is Record<string, unknown> => v != null;

export const fn = (v: unknown): v is (...args: unknown[]) => unknown => typeof v === 'function';

export const get = (o: unknown, key: string): unknown => (obj(o) ? o[key] : undefined);

export const set = (o: unknown, key: string, value: unknown): void => {
  if (obj(o)) o[key] = value;
};

export const isEl = (v: unknown): v is Element => v instanceof Element;

// Asked by reading the iterator, as upstream does: a proxy (`cookies`) answers a `get`, not an `in`.
export const isIterable = (v: unknown): v is Iterable<unknown> =>
  typeof v === 'object' && v !== null && typeof Reflect.get(v, Symbol.iterator) === 'function';

/**
 * The operand of a JavaScript arithmetic or relational operator. The assertion
 * is for the type checker only: at run time the language coerces the value
 * exactly as it does in `a + b` or `a < b` written in JavaScript, which is the
 * semantics hyperscript's operators have.
 */
export const num = (v: unknown): number => v as number;
