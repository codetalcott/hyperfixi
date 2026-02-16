/**
 * Domain Scanner for Vite Plugin
 *
 * Scans source files for domain-specific DSL usage based on configurable
 * attribute patterns and keyword sets. Runs alongside the existing
 * hyperscript Scanner as an opt-in feature.
 */

import type { DomainScanRule, DomainFileUsage } from './types';

// =============================================================================
// Helpers
// =============================================================================

/**
 * Build regex patterns for extracting attribute values.
 */
function buildAttributePatterns(attributes: readonly string[]): RegExp[] {
  const patterns: RegExp[] = [];
  for (const attr of attributes) {
    const escaped = attr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    patterns.push(new RegExp(`${escaped}\\s*=\\s*"([^"]+)"`, 'g'));
    patterns.push(new RegExp(`${escaped}\\s*=\\s*'([^']+)'`, 'g'));
    patterns.push(new RegExp(`${escaped}\\s*=\\s*\`([^\`]+)\``, 'g'));
  }
  return patterns;
}

/**
 * Build regex patterns for extracting script tag contents.
 */
function buildScriptPatterns(scriptTypes: readonly string[]): RegExp[] {
  return scriptTypes.map(type => {
    const escaped = type.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`<script[^>]*type=["']?${escaped}["']?[^>]*>([\\s\\S]*?)<\\/script>`, 'gi');
  });
}

/**
 * Detect keywords in a snippet.
 */
function detectKeywords(
  snippet: string,
  keywords: Readonly<Record<string, readonly string[]>>
): { detectedKeywords: Set<string>; detectedLanguages: Set<string> } {
  const detectedKeywords = new Set<string>();
  const detectedLanguages = new Set<string>();

  for (const [lang, kwList] of Object.entries(keywords)) {
    for (const kw of kwList) {
      // Use word boundary for Latin characters, simple includes for non-Latin
      const isLatin = /^[a-zA-Z]/.test(kw);
      const found = isLatin
        ? new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(snippet)
        : snippet.includes(kw);

      if (found) {
        detectedKeywords.add(kw);
        detectedLanguages.add(lang);
      }
    }
  }

  return { detectedKeywords, detectedLanguages };
}

// =============================================================================
// DomainScanner
// =============================================================================

/**
 * Scanner that detects domain-specific syntax in source files.
 * Complements the existing hyperscript Scanner.
 */
export class DomainScanner {
  private rules: readonly DomainScanRule[];
  /** Pre-compiled regex for fast hasAnyDomainUsage check */
  private quickCheckPattern: RegExp | null;

  constructor(rules: readonly DomainScanRule[]) {
    this.rules = rules;

    // Build a quick-check regex from all attribute names
    const allAttrs = rules.flatMap(r => [...r.attributes]);
    const allScriptTypes = rules.flatMap(r => (r.scriptTypes ? [...r.scriptTypes] : []));
    const parts: string[] = [];

    for (const attr of allAttrs) {
      parts.push(attr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    }
    for (const type of allScriptTypes) {
      parts.push(type.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    }

    this.quickCheckPattern = parts.length > 0 ? new RegExp(parts.join('|'), 'i') : null;
  }

  /**
   * Fast pre-check: does this code contain any domain-related attributes?
   */
  hasAnyDomainUsage(code: string): boolean {
    if (!this.quickCheckPattern) return false;
    return this.quickCheckPattern.test(code);
  }

  /**
   * Scan a file for all registered domain syntaxes.
   * Returns one DomainFileUsage per domain that had matches.
   */
  scan(code: string, _id: string): DomainFileUsage[] {
    const results: DomainFileUsage[] = [];

    for (const rule of this.rules) {
      const snippets: string[] = [];

      // Extract from attributes
      const attrPatterns = buildAttributePatterns(rule.attributes);
      for (const pattern of attrPatterns) {
        pattern.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = pattern.exec(code))) {
          const value = match[1].trim();
          if (value) snippets.push(value);
        }
      }

      // Extract from script tags
      if (rule.scriptTypes) {
        const scriptPatterns = buildScriptPatterns(rule.scriptTypes);
        for (const pattern of scriptPatterns) {
          pattern.lastIndex = 0;
          let match: RegExpExecArray | null;
          while ((match = pattern.exec(code))) {
            const value = match[1].trim();
            if (value) snippets.push(value);
          }
        }
      }

      if (snippets.length === 0) continue;

      // Detect keywords in extracted snippets
      const allDetectedKeywords = new Set<string>();
      const allDetectedLanguages = new Set<string>();

      if (rule.keywords) {
        for (const snippet of snippets) {
          const { detectedKeywords, detectedLanguages } = detectKeywords(snippet, rule.keywords);
          for (const kw of detectedKeywords) allDetectedKeywords.add(kw);
          for (const lang of detectedLanguages) allDetectedLanguages.add(lang);
        }
      }

      results.push({
        domain: rule.domain,
        detectedKeywords: allDetectedKeywords,
        detectedLanguages: allDetectedLanguages,
        snippetCount: snippets.length,
      });
    }

    return results;
  }
}

// =============================================================================
// Helper: Convert DomainDescriptor.scanConfig to DomainScanRule
// =============================================================================

/**
 * Convert a DomainDescriptor's scanConfig to a DomainScanRule.
 * Returns null if the descriptor has no scanConfig.
 *
 * This allows DomainDescriptors from the framework to be used
 * directly with the Vite plugin scanner.
 */
export function descriptorToScanRule(descriptor: {
  name: string;
  scanConfig?: {
    attributes: readonly string[];
    scriptTypes?: readonly string[];
    keywords?: Readonly<Record<string, readonly string[]>>;
  };
}): DomainScanRule | null {
  if (!descriptor.scanConfig) return null;
  return {
    domain: descriptor.name,
    attributes: [...descriptor.scanConfig.attributes],
    scriptTypes: descriptor.scanConfig.scriptTypes
      ? [...descriptor.scanConfig.scriptTypes]
      : undefined,
    keywords: descriptor.scanConfig.keywords
      ? Object.fromEntries(
          Object.entries(descriptor.scanConfig.keywords).map(([k, v]) => [k, [...v]])
        )
      : undefined,
  };
}
