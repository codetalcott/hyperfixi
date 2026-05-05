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

  describe('dom-scope="isolated" boundary', () => {
    it('read stops at an isolation boundary that does not define the var', () => {
      const outer = document.createElement('div');
      const boundary = document.createElement('article');
      boundary.setAttribute('dom-scope', 'isolated');
      const inner = document.createElement('span');
      outer.appendChild(boundary);
      boundary.appendChild(inner);

      r.writeCaret(outer, 'theme', 'dark');
      // Inner can't see outer's theme — boundary blocks the walk.
      expect(r.readCaret(inner, 'theme')).toBeUndefined();
      expect(r.readCaret(boundary, 'theme')).toBeUndefined();
      // Outer itself is unaffected.
      expect(r.readCaret(outer, 'theme')).toBe('dark');
    });

    it('boundary itself can define the var (read returns boundary value)', () => {
      const outer = document.createElement('div');
      const boundary = document.createElement('article');
      boundary.setAttribute('dom-scope', 'isolated');
      const inner = document.createElement('span');
      outer.appendChild(boundary);
      boundary.appendChild(inner);

      r.writeCaret(outer, 'theme', 'dark');
      r.writeCaret(boundary, 'theme', 'light', boundary);
      // Inner sees boundary's local theme; outer's is shadowed.
      expect(r.readCaret(inner, 'theme')).toBe('light');
      expect(r.readCaret(boundary, 'theme')).toBe('light');
      expect(r.readCaret(outer, 'theme')).toBe('dark');
    });

    it('write from inside boundary falls back to lookupRoot when no owner is reachable', () => {
      const outer = document.createElement('div');
      const boundary = document.createElement('article');
      boundary.setAttribute('dom-scope', 'isolated');
      const inner = document.createElement('span');
      outer.appendChild(boundary);
      boundary.appendChild(inner);

      // Outer has count, but inner is inside the boundary — write from inner
      // should NOT reach outer; it should land on inner (lookupRoot fallback).
      r.writeCaret(outer, 'count', 99);
      r.writeCaret(inner, 'count', 1);
      expect(r.readCaret(inner, 'count')).toBe(1);
      // Inner's value is on inner itself; outer's stays.
      expect(r.readCaret(outer, 'count')).toBe(99);
    });

    it('two sibling boundaries hold independent ^var state', () => {
      const root = document.createElement('div');
      const a = document.createElement('article');
      a.setAttribute('dom-scope', 'isolated');
      const b = document.createElement('article');
      b.setAttribute('dom-scope', 'isolated');
      root.appendChild(a);
      root.appendChild(b);

      r.writeCaret(a, 'count', 1);
      r.writeCaret(b, 'count', 2);
      expect(r.readCaret(a, 'count')).toBe(1);
      expect(r.readCaret(b, 'count')).toBe(2);
    });
  });
});
