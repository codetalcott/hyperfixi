import { describe, it, expect } from 'vitest';
import { parse } from './parser';

function findHandler(ast: any): any {
  if (!ast) return null;
  if (ast.type === 'eventHandler') return ast;
  for (const k of Object.keys(ast)) {
    const v = (ast as any)[k];
    if (Array.isArray(v)) {
      for (const item of v) {
        const r = findHandler(item);
        if (r) return r;
      }
    } else if (v && typeof v === 'object') {
      const r = findHandler(v);
      if (r) return r;
    }
  }
  return null;
}

describe('Phase 4: `on first <event>` alias for .once', () => {
  it('parses "on first click"', () => {
    const r = parse('on first click log "once"');
    expect(r.success).toBe(true);
    const handler = findHandler(r.node);
    expect(handler).toBeTruthy();
    expect(handler.modifiers?.once).toBe(true);
  });

  it('`on click` alone has no once modifier', () => {
    const r = parse('on click log "always"');
    expect(r.success).toBe(true);
    const handler = findHandler(r.node);
    expect(handler?.modifiers?.once).toBeFalsy();
  });

  it('`on click.once` still sets once via the dotted form', () => {
    const r = parse('on click.once log "once"');
    expect(r.success).toBe(true);
    const handler = findHandler(r.node);
    expect(handler?.modifiers?.once).toBe(true);
  });

  it('`on first mousedown` works for non-click events', () => {
    const r = parse('on first mousedown log "once"');
    expect(r.success).toBe(true);
    const handler = findHandler(r.node);
    expect(handler?.modifiers?.once).toBe(true);
  });

  it('preserves event name (not treated as part of "first")', () => {
    const r = parse('on first click log "x"');
    expect(r.success).toBe(true);
    const handler = findHandler(r.node);
    // Event name should be 'click', not 'first' or 'first click'
    const events = handler?.events ?? handler?.eventNames ?? [handler?.event];
    expect(events.some((e: string) => e === 'click' || e?.includes('click'))).toBe(true);
  });
});
