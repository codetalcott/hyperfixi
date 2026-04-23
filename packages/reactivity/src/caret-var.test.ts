/**
 * caret-var unit tests — `^name` read/write and inherited scope walking.
 * The parse layer is exercised via the integration test; here we test the
 * storage semantics in isolation via the Reactive API.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Reactive } from './signals';

describe('caret-var storage', () => {
  let r: Reactive;

  beforeEach(() => {
    r = new Reactive();
  });

  it('read returns undefined for an untouched name', () => {
    const el = document.createElement('div');
    expect(r.readCaret(el, 'any')).toBeUndefined();
  });

  it('write then read on the same element', () => {
    const el = document.createElement('div');
    r.writeCaret(el, 'counter', 1);
    expect(r.readCaret(el, 'counter')).toBe(1);
  });

  it('inherited scope: child reads parent var', () => {
    const grand = document.createElement('section');
    const parent = document.createElement('article');
    const child = document.createElement('p');
    grand.appendChild(parent);
    parent.appendChild(child);
    r.writeCaret(grand, 'theme', 'dark');
    expect(r.readCaret(child, 'theme')).toBe('dark');
    expect(r.readCaret(parent, 'theme')).toBe('dark');
    expect(r.readCaret(grand, 'theme')).toBe('dark');
  });

  it('write without explicit target updates the inherited owner', () => {
    const outer = document.createElement('div');
    const inner = document.createElement('span');
    outer.appendChild(inner);
    r.writeCaret(outer, 'x', 'a');
    // From inner, no explicit target → walks up, finds outer as owner, updates it.
    r.writeCaret(inner, 'x', 'b');
    expect(r.readCaret(outer, 'x')).toBe('b');
    expect(r.readCaret(inner, 'x')).toBe('b'); // inherited
  });

  it('shadowing requires explicit target to create a local owner', () => {
    const outer = document.createElement('div');
    const inner = document.createElement('span');
    outer.appendChild(inner);
    r.writeCaret(outer, 'x', 'outer-val');
    // Explicit target = inner → creates a new owner on inner, shadowing outer.
    r.writeCaret(inner, 'x', 'inner-val', inner);
    expect(r.readCaret(inner, 'x')).toBe('inner-val');
    expect(r.readCaret(outer, 'x')).toBe('outer-val');
  });

  it('write with explicit target bypasses inheritance walk', () => {
    const parent = document.createElement('div');
    const child = document.createElement('span');
    parent.appendChild(child);
    // Write from child but target parent explicitly.
    r.writeCaret(child, 'pinned', 'yes', parent);
    expect(r.readCaret(parent, 'pinned')).toBe('yes');
    expect(r.readCaret(child, 'pinned')).toBe('yes'); // inherits
  });
});
