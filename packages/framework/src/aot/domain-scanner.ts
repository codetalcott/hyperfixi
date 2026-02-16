/**
 * Domain-Aware Scanner
 *
 * Extracts DSL snippets from HTML/template files based on domain-declared
 * attribute patterns and script types. Unlike the hyperscript-specific
 * HTMLScanner, this scanner is configured dynamically from DomainScanConfig.
 */

import type { DomainScanConfig, ExtractedSnippet } from './types';

// =============================================================================
// Helpers
// =============================================================================

/**
 * Build regex patterns for extracting attribute values.
 * Handles double-quoted, single-quoted, and backtick-quoted values.
 */
function buildAttributePatterns(attributes: readonly string[]): RegExp[] {
  const patterns: RegExp[] = [];
  for (const attr of attributes) {
    const escaped = attr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Match: attr="value", attr='value', attr=`value`
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
 * Count newlines before a position to determine line number.
 */
function getLineNumber(source: string, position: number): number {
  let line = 1;
  for (let i = 0; i < position && i < source.length; i++) {
    if (source[i] === '\n') line++;
  }
  return line;
}

/**
 * Try to extract an element ID near the matched attribute.
 * Looks backward in the source for an id="..." on the same element.
 */
function extractElementId(source: string, matchIndex: number): string | undefined {
  // Find the opening < before this attribute
  const before = source.lastIndexOf('<', matchIndex);
  if (before === -1) return undefined;

  const tagChunk = source.slice(before, matchIndex + 200);
  const idMatch = tagChunk.match(/\bid=["']([^"']+)["']/);
  return idMatch?.[1];
}

/**
 * Try to extract a lang attribute from the element.
 */
function extractLangAttribute(source: string, matchIndex: number): string | undefined {
  const before = source.lastIndexOf('<', matchIndex);
  if (before === -1) return undefined;

  const tagChunk = source.slice(before, matchIndex + 200);
  const langMatch = tagChunk.match(/\blang=["']([^"']+)["']/);
  return langMatch?.[1];
}

// =============================================================================
// DomainAwareScanner
// =============================================================================

/**
 * Scans HTML/template files for domain-specific snippets.
 *
 * Configured by DomainScanConfig objects, each declaring which
 * HTML attributes and script types a domain uses.
 */
export class DomainAwareScanner {
  private configs: readonly DomainScanConfig[];

  constructor(configs: readonly DomainScanConfig[]) {
    this.configs = configs;
  }

  /**
   * Extract all domain snippets from an HTML source string.
   */
  extract(source: string, filename: string): ExtractedSnippet[] {
    const snippets: ExtractedSnippet[] = [];

    for (const config of this.configs) {
      const defaultLang = config.defaultLanguage ?? 'en';

      // Extract from attributes
      const attrPatterns = buildAttributePatterns(config.attributes);
      for (const pattern of attrPatterns) {
        pattern.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = pattern.exec(source))) {
          const code = match[1].trim();
          if (!code) continue;

          const line = getLineNumber(source, match.index);
          const elementId = extractElementId(source, match.index);
          const langAttr = extractLangAttribute(source, match.index);

          snippets.push({
            domain: config.domain,
            code,
            language: langAttr ?? defaultLang,
            file: filename,
            line,
            column: 1,
            ...(elementId != null && { elementId }),
          });
        }
      }

      // Extract from script tags
      if (config.scriptTypes) {
        const scriptPatterns = buildScriptPatterns(config.scriptTypes);
        for (const pattern of scriptPatterns) {
          pattern.lastIndex = 0;
          let match: RegExpExecArray | null;
          while ((match = pattern.exec(source))) {
            const code = match[1].trim();
            if (!code) continue;

            const line = getLineNumber(source, match.index);

            snippets.push({
              domain: config.domain,
              code,
              language: defaultLang,
              file: filename,
              line,
              column: 1,
            });
          }
        }
      }
    }

    return snippets;
  }

  /**
   * Extract snippets from multiple files.
   */
  async extractFromFiles(
    files: string[],
    readFile: (path: string) => Promise<string>
  ): Promise<ExtractedSnippet[]> {
    const allSnippets: ExtractedSnippet[] = [];

    for (const file of files) {
      try {
        const source = await readFile(file);
        const snippets = this.extract(source, file);
        allSnippets.push(...snippets);
      } catch {
        // Skip files that can't be read
      }
    }

    return allSnippets;
  }
}
