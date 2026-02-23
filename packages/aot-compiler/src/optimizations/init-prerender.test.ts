/**
 * Init Block Pre-Rendering Tests
 */

import { describe, it, expect } from 'vitest';
import {
  classifyCommand,
  classifyInitCommands,
  applyPureCommand,
  preRenderInitBlock,
  type PureCommand,
} from './init-prerender.js';
import type { ASTNode, CommandNode, SelectorNode, LiteralNode } from '../types/aot-types.js';

// =============================================================================
// HELPERS
// =============================================================================

function addCmd(className: string, targetId: string): CommandNode {
  return {
    type: 'command',
    name: 'add',
    args: [{ type: 'selector', value: `.${className}` } as SelectorNode],
    target: { type: 'selector', value: `#${targetId}` } as SelectorNode,
  };
}

function removeCmd(className: string, targetId: string): CommandNode {
  return {
    type: 'command',
    name: 'remove',
    args: [{ type: 'selector', value: `.${className}` } as SelectorNode],
    target: { type: 'selector', value: `#${targetId}` } as SelectorNode,
  };
}

function putCmd(text: string, targetId: string): CommandNode {
  return {
    type: 'command',
    name: 'put',
    args: [{ type: 'literal', value: text } as LiteralNode],
    target: { type: 'selector', value: `#${targetId}` } as SelectorNode,
  };
}

function setAttrCmd(attrName: string, value: string, targetId: string): CommandNode {
  return {
    type: 'command',
    name: 'set',
    args: [
      { type: 'identifier', value: `@${attrName}` } as ASTNode,
      { type: 'literal', value } as LiteralNode,
    ],
    target: { type: 'selector', value: `#${targetId}` } as SelectorNode,
  };
}

function impureCmd(name: string): CommandNode {
  return { type: 'command', name, args: [] };
}

// =============================================================================
// PURITY CLASSIFICATION TESTS
// =============================================================================

describe('classifyCommand', () => {
  it('classifies add .class to #id as pure', () => {
    const result = classifyCommand(addCmd('active', 'header'));
    expect(result).toEqual({ type: 'addClass', targetId: 'header', value: 'active' });
  });

  it('classifies remove .class from #id as pure', () => {
    const result = classifyCommand(removeCmd('hidden', 'content'));
    expect(result).toEqual({ type: 'removeClass', targetId: 'content', value: 'hidden' });
  });

  it('classifies put literal into #id as pure', () => {
    const result = classifyCommand(putCmd('Hello World', 'greeting'));
    expect(result).toEqual({ type: 'putContent', targetId: 'greeting', value: 'Hello World' });
  });

  it('classifies set @attr to literal on #id as pure', () => {
    const result = classifyCommand(setAttrCmd('data-theme', 'dark', 'root'));
    expect(result).toEqual({
      type: 'setAttribute',
      targetId: 'root',
      value: 'dark',
      attrName: 'data-theme',
    });
  });

  it('returns null for fetch command (impure)', () => {
    expect(classifyCommand(impureCmd('fetch'))).toBeNull();
  });

  it('returns null for wait command (impure)', () => {
    expect(classifyCommand(impureCmd('wait'))).toBeNull();
  });

  it('returns null for add with no target', () => {
    const cmd: CommandNode = {
      type: 'command',
      name: 'add',
      args: [{ type: 'selector', value: '.active' } as SelectorNode],
      // no target → targets implicit me, which is context-dependent
    };
    expect(classifyCommand(cmd)).toBeNull();
  });

  it('returns null for add with non-id target', () => {
    const cmd: CommandNode = {
      type: 'command',
      name: 'add',
      args: [{ type: 'selector', value: '.active' } as SelectorNode],
      target: { type: 'selector', value: '.some-class' } as SelectorNode,
    };
    expect(classifyCommand(cmd)).toBeNull();
  });

  it('returns null for put with variable value (dynamic)', () => {
    const cmd: CommandNode = {
      type: 'command',
      name: 'put',
      args: [{ type: 'variable', name: 'myVar', scope: 'local' } as ASTNode],
      target: { type: 'selector', value: '#el' } as SelectorNode,
    };
    expect(classifyCommand(cmd)).toBeNull();
  });

  it('returns null for non-command nodes', () => {
    expect(classifyCommand({ type: 'literal', value: 42 } as ASTNode)).toBeNull();
  });
});

describe('classifyInitCommands', () => {
  it('separates pure and impure commands', () => {
    const commands: ASTNode[] = [
      addCmd('active', 'header'),
      impureCmd('fetch'),
      putCmd('Hello', 'greeting'),
      impureCmd('wait'),
    ];

    const result = classifyInitCommands(commands);
    expect(result.pure).toHaveLength(2);
    expect(result.impure).toHaveLength(2);
    expect(result.pure[0].index).toBe(0);
    expect(result.pure[1].index).toBe(2);
    expect(result.impure[0].index).toBe(1);
    expect(result.impure[1].index).toBe(3);
  });

  it('handles all-pure commands', () => {
    const commands: ASTNode[] = [addCmd('a', 'el1'), addCmd('b', 'el2')];
    const result = classifyInitCommands(commands);
    expect(result.pure).toHaveLength(2);
    expect(result.impure).toHaveLength(0);
  });

  it('handles all-impure commands', () => {
    const commands: ASTNode[] = [impureCmd('fetch'), impureCmd('send')];
    const result = classifyInitCommands(commands);
    expect(result.pure).toHaveLength(0);
    expect(result.impure).toHaveLength(2);
  });

  it('handles empty commands', () => {
    const result = classifyInitCommands([]);
    expect(result.pure).toHaveLength(0);
    expect(result.impure).toHaveLength(0);
  });
});

// =============================================================================
// HTML MUTATION TESTS
// =============================================================================

describe('applyPureCommand', () => {
  describe('addClass', () => {
    it('adds class to element with existing classes', () => {
      const html = '<div id="header" class="main">Content</div>';
      const result = applyPureCommand(html, {
        type: 'addClass',
        targetId: 'header',
        value: 'active',
      });
      expect(result).toBe('<div id="header" class="main active">Content</div>');
    });

    it('adds class to element with no class attribute', () => {
      const html = '<div id="header">Content</div>';
      const result = applyPureCommand(html, {
        type: 'addClass',
        targetId: 'header',
        value: 'active',
      });
      expect(result).toBe('<div id="header" class="active">Content</div>');
    });

    it('does not duplicate existing class', () => {
      const html = '<div id="header" class="active">Content</div>';
      const result = applyPureCommand(html, {
        type: 'addClass',
        targetId: 'header',
        value: 'active',
      });
      expect(result).toBe('<div id="header" class="active">Content</div>');
    });

    it('returns unchanged HTML when element not found', () => {
      const html = '<div id="other">Content</div>';
      const result = applyPureCommand(html, {
        type: 'addClass',
        targetId: 'missing',
        value: 'active',
      });
      expect(result).toBe(html);
    });
  });

  describe('removeClass', () => {
    it('removes class from element', () => {
      const html = '<div id="content" class="hidden visible">Text</div>';
      const result = applyPureCommand(html, {
        type: 'removeClass',
        targetId: 'content',
        value: 'hidden',
      });
      expect(result).toBe('<div id="content" class="visible">Text</div>');
    });

    it('handles removing the only class', () => {
      const html = '<div id="content" class="hidden">Text</div>';
      const result = applyPureCommand(html, {
        type: 'removeClass',
        targetId: 'content',
        value: 'hidden',
      });
      // class attribute removed entirely
      expect(result).not.toContain('class=');
    });
  });

  describe('putContent', () => {
    it('replaces element content', () => {
      const html = '<span id="greeting"></span>';
      const result = applyPureCommand(html, {
        type: 'putContent',
        targetId: 'greeting',
        value: 'Hello World',
      });
      expect(result).toBe('<span id="greeting">Hello World</span>');
    });

    it('replaces existing content', () => {
      const html = '<span id="greeting">Old text</span>';
      const result = applyPureCommand(html, {
        type: 'putContent',
        targetId: 'greeting',
        value: 'New text',
      });
      expect(result).toBe('<span id="greeting">New text</span>');
    });

    it('escapes HTML in content', () => {
      const html = '<span id="el"></span>';
      const result = applyPureCommand(html, {
        type: 'putContent',
        targetId: 'el',
        value: '<script>alert("xss")</script>',
      });
      expect(result).toContain('&lt;script&gt;');
      expect(result).not.toContain('<script>');
    });
  });

  describe('setAttribute', () => {
    it('adds new attribute', () => {
      const html = '<div id="root">App</div>';
      const result = applyPureCommand(html, {
        type: 'setAttribute',
        targetId: 'root',
        value: 'dark',
        attrName: 'data-theme',
      });
      expect(result).toBe('<div id="root" data-theme="dark">App</div>');
    });

    it('replaces existing attribute', () => {
      const html = '<div id="root" data-theme="light">App</div>';
      const result = applyPureCommand(html, {
        type: 'setAttribute',
        targetId: 'root',
        value: 'dark',
        attrName: 'data-theme',
      });
      expect(result).toBe('<div id="root" data-theme="dark">App</div>');
    });
  });
});

// =============================================================================
// INTEGRATION TESTS
// =============================================================================

describe('preRenderInitBlock', () => {
  it('pre-renders all-pure init block', () => {
    const html = '<div id="header" class="main">Title</div><p id="greeting"></p>';
    const commands: ASTNode[] = [addCmd('active', 'header'), putCmd('Hello', 'greeting')];

    const result = preRenderInitBlock(html, commands);
    expect(result.preRenderedCount).toBe(2);
    expect(result.remainingInitCommands).toHaveLength(0);
    expect(result.html).toContain('class="main active"');
    expect(result.html).toContain('>Hello</p>');
  });

  it('preserves impure commands', () => {
    const html = '<div id="header"></div>';
    const commands: ASTNode[] = [addCmd('active', 'header'), impureCmd('fetch'), impureCmd('send')];

    const result = preRenderInitBlock(html, commands);
    expect(result.preRenderedCount).toBe(1);
    expect(result.remainingInitCommands).toHaveLength(2);
    expect((result.remainingInitCommands[0] as CommandNode).name).toBe('fetch');
    expect((result.remainingInitCommands[1] as CommandNode).name).toBe('send');
  });

  it('handles all-impure init block (no changes)', () => {
    const html = '<div id="header"></div>';
    const commands: ASTNode[] = [impureCmd('fetch'), impureCmd('wait')];

    const result = preRenderInitBlock(html, commands);
    expect(result.preRenderedCount).toBe(0);
    expect(result.remainingInitCommands).toHaveLength(2);
    expect(result.html).toBe(html);
  });

  it('handles empty init block', () => {
    const html = '<div>Content</div>';
    const result = preRenderInitBlock(html, []);
    expect(result.preRenderedCount).toBe(0);
    expect(result.remainingInitCommands).toHaveLength(0);
    expect(result.html).toBe(html);
  });

  it('counts only commands whose target was found in HTML', () => {
    const html = '<div id="header"></div>';
    const commands: ASTNode[] = [addCmd('active', 'header'), addCmd('active', 'missing-element')];

    const result = preRenderInitBlock(html, commands);
    expect(result.preRenderedCount).toBe(1); // only header found
  });

  it('applies multiple mutations to different elements', () => {
    const html = '<h1 id="title"></h1><p id="body"></p><footer id="foot"></footer>';
    const commands: ASTNode[] = [
      putCmd('Welcome', 'title'),
      putCmd('Content here', 'body'),
      addCmd('sticky', 'foot'),
    ];

    const result = preRenderInitBlock(html, commands);
    expect(result.preRenderedCount).toBe(3);
    expect(result.html).toContain('>Welcome</h1>');
    expect(result.html).toContain('>Content here</p>');
    expect(result.html).toContain('class="sticky"');
  });
});
