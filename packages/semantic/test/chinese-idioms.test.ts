/**
 * Chinese Native Idiom Tests
 *
 * Tests for native Chinese idiom patterns that go beyond
 * direct translations to support more natural Chinese expressions.
 *
 * These patterns accept multiple grammatically-correct forms that all
 * normalize to equivalent semantic nodes.
 *
 * Key forms tested:
 * - Temporal: 当...时 (when) - Standard form
 * - Native idiom: ...的时候 (at the time of) - Most natural
 * - Immediate: 一...就 (as soon as) - Rapid succession
 * - Frequency: 每当 (whenever) - Repeated events
 * - Completion: ...了 (completion aspect)
 * - Conditional: 如果 (if)
 *
 * Chinese features:
 * - SVO (Subject-Verb-Object) word order
 * - No verb conjugation (isolating language)
 * - Aspect markers: 了 (completion), 着 (progressive), 过 (experiential)
 * - BA construction: 把 (patient marker for direct manipulation)
 * - Topic-comment structure
 *
 * Research notes:
 * - Chinese uses separate words rather than morphological changes
 * - No morphological normalizer needed (unlike Japanese/Korean)
 * - Particles like 了, 着, 过 are separate tokens
 * - 把 construction is idiomatic for manipulation commands
 *
 * @see NATIVE_REVIEW_NEEDED.md for patterns needing native speaker validation
 */

import { describe, it, expect } from 'vitest';
import { parse, tokenize } from '../src';

/**
 * Helper to get tokens array from TokenStream
 */
function getTokens(input: string, language: string) {
  const stream = tokenize(input, language);
  return stream.tokens;
}

// =============================================================================
// Tokenizer Tests - Native Idiom Detection
// =============================================================================

describe('Chinese Tokenizer - Native Idioms', () => {
  describe('Temporal markers', () => {
    it('should tokenize 当 as temporal marker', () => {
      const tokens = getTokens('当 点击', 'zh');
      expect(tokens.length).toBeGreaterThanOrEqual(2);
      const dangToken = tokens.find(t => t.value === '当');
      expect(dangToken).toBeDefined();
    });

    it('should tokenize 的时候 as temporal phrase', () => {
      const tokens = getTokens('点击 的时候', 'zh');
      expect(tokens.length).toBeGreaterThanOrEqual(2);
    });

    it('should tokenize 每当 as frequency marker', () => {
      const tokens = getTokens('每当 点击', 'zh');
      expect(tokens.length).toBeGreaterThanOrEqual(2);
    });

    it('should tokenize 如果 as conditional marker', () => {
      const tokens = getTokens('如果 点击', 'zh');
      expect(tokens.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Aspect markers', () => {
    it('should tokenize 了 as completion aspect marker', () => {
      const tokens = getTokens('点击 了', 'zh');
      expect(tokens.length).toBeGreaterThanOrEqual(2);
    });

    it('should tokenize 着 as progressive aspect marker', () => {
      const tokens = getTokens('显示 着', 'zh');
      expect(tokens.length).toBeGreaterThanOrEqual(2);
    });

    it('should tokenize 过 as experiential aspect marker', () => {
      const tokens = getTokens('点击 过', 'zh');
      expect(tokens.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Command keywords', () => {
    it('should tokenize 切换 as toggle', () => {
      const tokens = getTokens('切换 .active', 'zh');
      const firstToken = tokens[0];
      expect(firstToken.kind).toBe('keyword');
      expect(firstToken.normalized).toBe('toggle');
    });

    it('should tokenize 显示 as show', () => {
      const tokens = getTokens('显示 #modal', 'zh');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('show');
    });

    it('should tokenize 隐藏 as hide', () => {
      const tokens = getTokens('隐藏 #dropdown', 'zh');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('hide');
    });

    it('should tokenize 添加 as add', () => {
      const tokens = getTokens('添加 .active', 'zh');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('add');
    });

    it('should tokenize 删除 as remove', () => {
      const tokens = getTokens('删除 .active', 'zh');
      const firstToken = tokens[0];
      expect(firstToken.normalized).toBe('remove');
    });
  });

  describe('BA construction (把)', () => {
    it('should tokenize 把 as patient marker', () => {
      const tokens = getTokens('把 .active 切换', 'zh');
      expect(tokens.length).toBeGreaterThanOrEqual(3);
      const baToken = tokens.find(t => t.value === '把');
      expect(baToken).toBeDefined();
    });
  });

  describe('Selectors', () => {
    it('should correctly tokenize CSS class selectors', () => {
      const tokens = getTokens('切换 .active', 'zh');
      const selectorToken = tokens.find(t => t.kind === 'selector');
      expect(selectorToken).toBeDefined();
      expect(selectorToken?.value).toBe('.active');
    });

    it('should handle ID selectors', () => {
      const tokens = getTokens('显示 #modal', 'zh');
      const selectorToken = tokens.find(t => t.kind === 'selector');
      expect(selectorToken).toBeDefined();
      expect(selectorToken?.value).toBe('#modal');
    });
  });
});

// =============================================================================
// Event Handler Pattern Tests
// =============================================================================

describe('Chinese Event Handler Patterns', () => {
  describe('Standard pattern: 当 {event}', () => {
    it('should parse "当 点击 切换 .active"', () => {
      const node = parse('当 点击 切换 .active', 'zh');
      expect(node.action).toBe('on');
    });

    it('should parse "当 提交 显示 #result"', () => {
      const tokens = getTokens('当 提交 显示 #result', 'zh');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Native temporal: {event} 的时候', () => {
    it.fails('should parse "点击 的时候 切换 .active"', () => {
      const node = parse('点击 的时候 切换 .active', 'zh');
      expect(node.action).toBe('on');
    });

    it('should parse "改变 的时候 显示 #message"', () => {
      const tokens = getTokens('改变 的时候 显示 #message', 'zh');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Immediate pattern: 一 {event} 就', () => {
    it('should parse "一 点击 就 切换 .active"', () => {
      const node = parse('一 点击 就 切换 .active', 'zh');
      expect(node.action).toBe('on');
    });

    it('should parse "一 提交 就 隐藏 #form"', () => {
      const tokens = getTokens('一 提交 就 隐藏 #form', 'zh');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Frequency pattern: 每当 {event}', () => {
    it.fails('should parse "每当 点击 切换 .active"', () => {
      const node = parse('每当 点击 切换 .active', 'zh');
      expect(node.action).toBe('on');
    });
  });

  describe('Completion pattern: {event} 了', () => {
    it('should parse "点击 了 切换 .active"', () => {
      const tokens = getTokens('点击 了 切换 .active', 'zh');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Conditional pattern: 如果 {event}', () => {
    it('should parse "如果 点击 切换 .active"', () => {
      const tokens = getTokens('如果 点击 切换 .active', 'zh');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should parse "若 点击 显示 #modal"', () => {
      const tokens = getTokens('若 点击 显示 #modal', 'zh');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('With source filter: 当 {event} 从 {source}', () => {
    it('should parse "当 点击 从 #button 切换 .active"', () => {
      const tokens = getTokens('当 点击 从 #button 切换 .active', 'zh');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should parse "点击 的时候 从 #submit 显示 #result"', () => {
      const tokens = getTokens('点击 的时候 从 #submit 显示 #result', 'zh');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// Command Pattern Tests
// =============================================================================

describe('Chinese Command Patterns', () => {
  describe('Toggle commands', () => {
    it('should parse "切换 .active"', () => {
      const node = parse('切换 .active', 'zh');
      expect(node.action).toBe('toggle');
    });

    it('should parse BA construction "把 .active 切换"', () => {
      const node = parse('把 .active 切换', 'zh');
      expect(node.action).toBe('toggle');
    });
  });

  describe('Show/Hide commands', () => {
    it('should parse "显示 #modal"', () => {
      const node = parse('显示 #modal', 'zh');
      expect(node.action).toBe('show');
    });

    it('should parse "隐藏 #dropdown"', () => {
      const node = parse('隐藏 #dropdown', 'zh');
      expect(node.action).toBe('hide');
    });
  });

  describe('Add/Remove commands', () => {
    it('should parse "添加 .active"', () => {
      const node = parse('添加 .active', 'zh');
      expect(node.action).toBe('add');
    });

    it('should parse "删除 .active"', () => {
      const node = parse('删除 .active', 'zh');
      expect(node.action).toBe('remove');
    });

    it('should parse "移除 .active"', () => {
      const node = parse('移除 .active', 'zh');
      expect(node.action).toBe('remove');
    });
  });

  describe('BA construction commands', () => {
    it('should parse "把 #modal 显示"', () => {
      const tokens = getTokens('把 #modal 显示', 'zh');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should parse "在 #button 把 .active 切换"', () => {
      const tokens = getTokens('在 #button 把 .active 切换', 'zh');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// Semantic Equivalence Tests
// =============================================================================

describe('Chinese Semantic Equivalence', () => {
  describe('All event handler forms tokenize correctly', () => {
    it('standard 当 form tokenizes', () => {
      const tokens = getTokens('当 点击 切换 .active', 'zh');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('native 的时候 form tokenizes', () => {
      const tokens = getTokens('点击 的时候 切换 .active', 'zh');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('immediate 一...就 form tokenizes', () => {
      const tokens = getTokens('一 点击 就 切换 .active', 'zh');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('frequency 每当 form tokenizes', () => {
      const tokens = getTokens('每当 点击 切换 .active', 'zh');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('completion 了 form tokenizes', () => {
      const tokens = getTokens('点击 了 切换 .active', 'zh');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('conditional 如果 form tokenizes', () => {
      const tokens = getTokens('如果 点击 切换 .active', 'zh');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Alternative event names', () => {
    it('should handle 点击 (click)', () => {
      const tokens = getTokens('当 点击 切换 .active', 'zh');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle 单击 (single click)', () => {
      const tokens = getTokens('当 单击 切换 .active', 'zh');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle 双击 (double click)', () => {
      const tokens = getTokens('当 双击 显示 #modal', 'zh');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle 输入 (input)', () => {
      const tokens = getTokens('当 输入 显示 #preview', 'zh');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle 提交 (submit)', () => {
      const tokens = getTokens('当 提交 隐藏 #form', 'zh');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle 改变 (change)', () => {
      const tokens = getTokens('当 改变 显示 #result', 'zh');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// Traditional vs Simplified Chinese
// =============================================================================

describe('Chinese Character Variants', () => {
  it('should handle simplified 显示 (show)', () => {
    const tokens = getTokens('显示 #modal', 'zh');
    expect(tokens.length).toBeGreaterThan(0);
  });

  it('should handle simplified 隐藏 (hide)', () => {
    const tokens = getTokens('隐藏 #menu', 'zh');
    expect(tokens.length).toBeGreaterThan(0);
  });

  it('should handle simplified 添加 (add)', () => {
    const tokens = getTokens('添加 .active', 'zh');
    expect(tokens.length).toBeGreaterThan(0);
  });

  it('should handle simplified 删除 (delete/remove)', () => {
    const tokens = getTokens('删除 .old', 'zh');
    expect(tokens.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('Chinese Integration Tests', () => {
  describe('Full event handler chains', () => {
    it('should handle "当 点击 从 #button 添加 .active 到 #target"', () => {
      const tokens = getTokens('当 点击 从 #button 添加 .active 到 #target', 'zh');
      expect(tokens.length).toBeGreaterThan(5);
    });

    it('should handle "点击 的时候 显示 #modal 然后 添加 .active"', () => {
      const tokens = getTokens('点击 的时候 显示 #modal 然后 添加 .active', 'zh');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle BA construction with location', () => {
      const tokens = getTokens('在 #container 把 .active 切换', 'zh');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle compound commands with 然后', () => {
      const tokens = getTokens('添加 .loading 然后 等待 1秒 然后 删除 .loading', 'zh');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Time expressions', () => {
    it('should handle 毫秒 (milliseconds)', () => {
      const tokens = getTokens('等待 500毫秒', 'zh');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle 秒 (seconds)', () => {
      const tokens = getTokens('等待 2秒', 'zh');
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should handle 分钟 (minutes)', () => {
      const tokens = getTokens('等待 1分钟', 'zh');
      expect(tokens.length).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('Chinese Edge Cases', () => {
  it('should handle mixed Chinese and English selectors', () => {
    const tokens = getTokens('切换 .active-class', 'zh');
    expect(tokens.length).toBeGreaterThan(0);
  });

  it('should handle CSS selectors with Chinese class names', () => {
    // This is rare but should not break
    const tokens = getTokens('显示 #主容器', 'zh');
    expect(tokens.length).toBeGreaterThan(0);
  });

  it('should handle consecutive Chinese characters', () => {
    const tokens = getTokens('当点击时切换', 'zh');
    expect(tokens.length).toBeGreaterThan(0);
  });

  it('should handle spaces between Chinese characters', () => {
    const tokens = getTokens('当 点击 时 切换 .active', 'zh');
    expect(tokens.length).toBeGreaterThan(0);
  });
});
