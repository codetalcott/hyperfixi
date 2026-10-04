/**
 * The keyword → module map is DERIVED from `@hyperfixi/engine` (every module in
 * `everything` run against a fresh grammar), not copied. These tests pin the
 * derivation's shape and the selection rules, so a module that moves a keyword
 * upstream of this package shows up here, not in a user's bundle.
 */
import { describe, it, expect } from 'vitest';
import { everything } from '@hyperfixi/engine';
import {
  ENGINE_MODULES,
  COMMAND_KEYWORDS,
  FEATURE_KEYWORDS,
  SCANNABLE_KEYWORDS,
  resolveModules,
} from './engine-modules';

describe('ENGINE_MODULES (derived from the engine)', () => {
  it('lists every module in `everything`, in registration order', () => {
    expect(ENGINE_MODULES.length).toBe(everything.length);
    expect(ENGINE_MODULES.map(m => m.name)).toEqual(
      expect.arrayContaining(['on', 'add', 'remove', 'toggle', 'put', 'set', 'ifCommand', 'repeat'])
    );
    expect(ENGINE_MODULES[0].name).toBe('on');
  });

  it('maps a command keyword to the module that registers it', () => {
    expect(COMMAND_KEYWORDS.get('toggle')).toBe('toggle');
    expect(COMMAND_KEYWORDS.get('show')).toBe('hideShow');
    expect(COMMAND_KEYWORDS.get('hide')).toBe('hideShow');
    expect(COMMAND_KEYWORDS.get('call')).toBe('get_');
    expect(COMMAND_KEYWORDS.get('get')).toBe('get_');
    expect(COMMAND_KEYWORDS.get('for')).toBe('repeat');
    expect(COMMAND_KEYWORDS.get('break')).toBe('loopControl');
    expect(COMMAND_KEYWORDS.get('trigger')).toBe('send');
    expect(COMMAND_KEYWORDS.get('focus')).toBe('targetCommands');
    expect(COMMAND_KEYWORDS.get('start')).toBe('viewTransition');
    expect(COMMAND_KEYWORDS.get('fetch')).toBe('fetchCommand');
    expect(COMMAND_KEYWORDS.get('decrement')).toBe('increment');
  });

  it('maps a feature keyword to its module', () => {
    expect(FEATURE_KEYWORDS.get('on')).toBe('on');
    expect(FEATURE_KEYWORDS.get('def')).toBe('def');
    expect(FEATURE_KEYWORDS.get('behavior')).toBe('behavior');
    expect(FEATURE_KEYWORDS.get('live')).toBe('reactivity');
    expect(FEATURE_KEYWORDS.get('bind')).toBe('reactivity');
    expect(FEATURE_KEYWORDS.get('js')).toBe('js');
  });

  it('has no keyword for the forms the engine dropped', () => {
    for (const dropped of [
      'copy',
      'beep',
      'push',
      'replace',
      'prepend',
      'process',
      'clone',
      'unless',
    ]) {
      expect(COMMAND_KEYWORDS.has(dropped), dropped).toBe(false);
    }
  });

  it('exposes a scannable word list without on, if, and the reactive features', () => {
    for (const k of ['on', 'if', 'live', 'when', 'bind'])
      expect(SCANNABLE_KEYWORDS, k).not.toContain(k);
    expect(SCANNABLE_KEYWORDS).toEqual(
      expect.arrayContaining(['toggle', 'tell', 'make', 'pick', 'fetch', 'def'])
    );
    expect([...SCANNABLE_KEYWORDS].sort()).toEqual([...SCANNABLE_KEYWORDS]);
  });
});

describe('resolveModules', () => {
  const base = { blocks: [], positional: false, reactivity: false };

  it('always registers `on` and the conversions', () => {
    const { modules } = resolveModules({ ...base, commands: [] });
    expect(modules).toEqual(['on', 'conversions']);
  });

  it('adds the module for each command, with `toggleElement` beside `toggle`', () => {
    const { modules, unknown } = resolveModules({ ...base, commands: ['toggle', 'add', 'show'] });
    expect(modules).toEqual(['on', 'conversions', 'add', 'toggle', 'hideShow', 'toggleElement']);
    expect(unknown).toEqual([]);
  });

  it('orders the list as `everything` does, whatever the scan order', () => {
    const a = resolveModules({ ...base, commands: ['put', 'add', 'wait'] }).modules;
    const b = resolveModules({ ...base, commands: ['wait', 'put', 'add'] }).modules;
    expect(a).toEqual(b);
  });

  it('maps blocks to the control-flow modules', () => {
    const { modules } = resolveModules({
      ...base,
      commands: [],
      blocks: ['if', 'repeat', 'fetch'],
    });
    expect(modules).toEqual(
      expect.arrayContaining(['ifCommand', 'repeat', 'loopControl', 'fetchCommand'])
    );
  });

  it('maps the flags to the expression and feature modules', () => {
    const { modules } = resolveModules({
      commands: [],
      blocks: [],
      positional: true,
      reactivity: true,
      construct: true,
      cookies: true,
    });
    expect(modules).toEqual(
      expect.arrayContaining([
        'expressionsExtra',
        'reactivity',
        'liveTemplates',
        'construct',
        'cookies',
      ])
    );
  });

  it('reports a name the engine has no module for instead of guessing', () => {
    const { modules, unknown } = resolveModules({ ...base, commands: ['toggle', 'copy', 'beep'] });
    expect(unknown).toEqual(['beep', 'copy']);
    expect(modules).not.toContain('copy');
  });
});
