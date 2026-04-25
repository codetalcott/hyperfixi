/**
 * Slot substitution unit tests.
 */

import { describe, it, expect } from 'vitest';
import { substituteSlots } from './slots';

describe('substituteSlots', () => {
  it('returns the template unchanged when slot content is empty', () => {
    const tmpl = '<div><slot/></div>';
    expect(substituteSlots(tmpl, '')).toBe(tmpl);
  });

  it('replaces <slot/> with default content', () => {
    const result = substituteSlots('<div><slot/></div>', '<span>hi</span>');
    expect(result).toContain('<span>hi</span>');
    expect(result).not.toContain('<slot');
  });

  it('replaces <slot></slot> (explicit close) with default content', () => {
    const result = substituteSlots('<div><slot></slot></div>', 'plain text');
    expect(result).toContain('plain text');
    expect(result).not.toContain('<slot');
  });

  it('replaces named slots with matching content', () => {
    const tmpl = '<header><slot name="title"/></header><main><slot/></main>';
    const content = '<h1 slot="title">Hello</h1><p>Body</p>';
    const result = substituteSlots(tmpl, content);
    expect(result).toContain('<h1>Hello</h1>'); // slot="title" stripped
    expect(result).toContain('<p>Body</p>');
  });

  it('omits named-slot output when no matching content provided', () => {
    const tmpl = '<header><slot name="title"/></header><slot/>';
    const content = '<p>Body</p>'; // no slot="title" child
    const result = substituteSlots(tmpl, content);
    expect(result).not.toContain('slot'); // both placeholders removed
    expect(result).toContain('<p>Body</p>');
  });

  it('handles multiple named slots', () => {
    const tmpl = '<div><slot name="a"/></div><div><slot name="b"/></div>';
    const content = '<x slot="a">A</x><y slot="b">B</y>';
    const result = substituteSlots(tmpl, content);
    expect(result).toContain('<x>A</x>');
    expect(result).toContain('<y>B</y>');
  });

  it('preserves text nodes in default content', () => {
    const tmpl = '<div><slot/></div>';
    const result = substituteSlots(tmpl, 'plain words');
    expect(result).toContain('plain words');
  });
});
