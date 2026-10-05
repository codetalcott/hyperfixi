/**
 * Each language registers its own hand-crafted patterns (src/patterns/handcrafted.ts),
 * so a single-language bundle no longer carries the other 23 languages'.
 *
 * The dispatchers used to name every language's function in a `switch`; now a
 * function a command file exports reaches the parser only if its language's
 * `patterns/handcrafted/<lang>.ts` registers it. These tests hold the two lists
 * together: an exported function no manifest registers would be silently unused.
 * (The move itself was checked by hashing every language's built pattern list
 * before and after it: identical in all 24.)
 */
import { describe, it, expect } from 'vitest';
import '../src/languages/_all';
import { handcrafted, registeredHandcrafted } from '../src/patterns/handcrafted';
import { tryGetProfile } from '../src/registry';
import * as add from '../src/patterns/add';
import * as append from '../src/patterns/append';
import * as decrement from '../src/patterns/decrement';
import * as eventHandler from '../src/patterns/event-handler';
import * as fetch from '../src/patterns/fetch';
import * as get from '../src/patterns/get';
import * as hide from '../src/patterns/hide';
import * as increment from '../src/patterns/increment';
import * as prepend from '../src/patterns/prepend';
import * as put from '../src/patterns/put';
import * as remove from '../src/patterns/remove';
import * as send from '../src/patterns/send';
import * as set from '../src/patterns/set';
import * as show from '../src/patterns/show';
import * as toggle from '../src/patterns/toggle';
import * as trigger from '../src/patterns/trigger';
import * as wait from '../src/patterns/wait';
import * as viewTransition from '../src/patterns/view-transition';

const COMMAND_FILES: Record<string, Record<string, unknown>> = {
  add,
  append,
  decrement,
  'event-handler': eventHandler,
  fetch,
  get,
  hide,
  increment,
  prepend,
  put,
  remove,
  send,
  set,
  show,
  toggle,
  trigger,
  wait,
  viewTransition,
};

/** `getTogglePatternsEs` → ['toggle', 'es', fn]: every per-language function exported. */
const exported = Object.entries(COMMAND_FILES).flatMap(([command, module]) =>
  Object.entries(module).flatMap(([name, fn]) => {
    const language = /^get\w+Patterns([A-Z][a-z])$/.exec(name)?.[1].toLowerCase();
    return language && typeof fn === 'function'
      ? [[command, language, fn as (profile: unknown) => unknown] as const]
      : [];
  })
);

describe('hand-crafted patterns, registered per language', () => {
  it('finds the per-language functions (a pattern that matched nothing would pass below)', () => {
    expect(exported.length).toBeGreaterThan(150);
  });

  it('registers every exported per-language function, and nothing else', () => {
    const registered = registeredHandcrafted().map(([command, language]) => `${command}:${language}`);
    const functions = exported.map(([command, language]) => `${command}:${language}`);
    expect(functions.filter(key => !registered.includes(key))).toEqual([]);
    expect(registered.filter(key => !functions.includes(key))).toEqual([]);
  });

  it.each(exported.map(([command, language, fn]) => [`${command}:${language}`, fn] as const))(
    '%s is that function',
    (key, fn) => {
      const [command, language] = key.split(':');
      expect(handcrafted(command, language)).toEqual(fn(tryGetProfile(language)));
    }
  );
});
