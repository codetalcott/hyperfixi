import { describe, it, expect } from 'vitest';
import { koreanTokenizer } from '../src/tokenizers/korean';

describe('Korean Extractor Migration', () => {
  it('should extract particles with vowel harmony metadata', () => {
    const tokens = koreanTokenizer.tokenize('.active 를 토글').tokens;

    // Find the particle token
    const particleToken = tokens.find(t => t.value === '를');
    expect(particleToken).toBeDefined();
    expect(particleToken?.kind).toBe('particle');
    expect(particleToken?.metadata?.particleRole).toBe('patient');
    expect(particleToken?.metadata?.particleConfidence).toBe(0.95);
    expect(particleToken?.metadata?.particleVariant).toBe('vowel');
  });

  it('should extract consonant-ending particle variant', () => {
    const tokens = koreanTokenizer.tokenize('#count 을 증가').tokens;

    const particleToken = tokens.find(t => t.value === '을');
    expect(particleToken).toBeDefined();
    expect(particleToken?.kind).toBe('particle');
    expect(particleToken?.metadata?.particleRole).toBe('patient');
    expect(particleToken?.metadata?.particleConfidence).toBe(0.95);
    expect(particleToken?.metadata?.particleVariant).toBe('consonant');
  });

  it('should extract keywords with normalization', () => {
    const tokens = koreanTokenizer.tokenize('토글').tokens;

    expect(tokens.length).toBe(1);
    expect(tokens[0].kind).toBe('keyword');
    expect(tokens[0].normalized).toBe('toggle');
  });

  it('should handle multi-character particles', () => {
    const tokens = koreanTokenizer.tokenize('#list 에서 .item 를 제거').tokens;

    const particleToken = tokens.find(t => t.value === '에서');
    expect(particleToken).toBeDefined();
    expect(particleToken?.kind).toBe('particle');
    expect(particleToken?.metadata?.particleRole).toBe('source');
    expect(particleToken?.metadata?.particleConfidence).toBe(0.8);
  });

  it('should use extractor-based tokenization', () => {
    // Verify that the tokenizer is using extractors by checking various token types
    const input = '.active 를 토글';
    const tokens = koreanTokenizer.tokenize(input).tokens;

    // Should have: selector, particle, keyword
    expect(tokens.length).toBe(3);
    expect(tokens[0].kind).toBe('selector'); // .active
    expect(tokens[1].kind).toBe('particle'); // 를
    expect(tokens[2].kind).toBe('keyword');  // 토글
  });

  it('should handle CSS selectors, particles, and keywords together', () => {
    const input = '#button 의 .active 를 토글';
    const tokens = koreanTokenizer.tokenize(input).tokens;

    expect(tokens.length).toBe(5);
    expect(tokens[0].value).toBe('#button');
    expect(tokens[0].kind).toBe('selector');
    expect(tokens[1].value).toBe('의');
    expect(tokens[1].kind).toBe('particle');
    expect(tokens[2].value).toBe('.active');
    expect(tokens[2].kind).toBe('selector');
    expect(tokens[3].value).toBe('를');
    expect(tokens[3].kind).toBe('particle');
    expect(tokens[4].value).toBe('토글');
    expect(tokens[4].kind).toBe('keyword');
  });

  it('should handle variable references', () => {
    const input = ':count 를 증가';
    const tokens = koreanTokenizer.tokenize(input).tokens;

    expect(tokens[0].value).toBe(':count');
    // Variable references are classified as identifiers (consistent with other tokenizers)
    expect(tokens[0].kind).toBe('identifier');
    expect(tokens[0].metadata?.type).toBe('variable-reference');
    expect(tokens[1].value).toBe('를');
    expect(tokens[1].kind).toBe('particle');
    expect(tokens[2].value).toBe('증가');
    expect(tokens[2].kind).toBe('keyword');
  });

  it('should extract direction particles with metadata', () => {
    const tokens = koreanTokenizer.tokenize('#list 로 이동').tokens;

    const particleToken = tokens.find(t => t.value === '로');
    expect(particleToken?.metadata?.particleRole).toBe('destination');
    expect(particleToken?.metadata?.particleVariant).toBe('vowel');
  });

  it('should extract manner particles', () => {
    const tokens = koreanTokenizer.tokenize('빠르게 처럼 이동').tokens;

    const particleToken = tokens.find(t => t.value === '처럼');
    expect(particleToken?.metadata?.particleRole).toBe('manner');
    expect(particleToken?.metadata?.particleConfidence).toBe(0.8);
  });
});
