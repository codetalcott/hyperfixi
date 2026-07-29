/**
 * HTML Scanner
 *
 * Extracts hyperscript code from HTML files and other source formats.
 * Supports _ attributes, data-hs attributes, and script tags.
 */

import type {
  ExtractedScript,
  SourceLocation,
  ScannerOptions,
  ScanResult,
} from '../types/aot-types.js';

// =============================================================================
// DEFAULT OPTIONS
// =============================================================================

const DEFAULT_OPTIONS: Required<ScannerOptions> = {
  attributeNames: ['_', 'data-hs', 'data-hyperscript'],
  includeScriptTags: true,
  defaultLanguage: 'en',
};

// =============================================================================
// REGEX PATTERNS
// =============================================================================

/**
 * Match an HTML attribute with its value.
 * Handles: attr="value", attr='value', attr=value
 */
function createAttributeRegex(attrName: string): RegExp {
  const escaped = attrName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`${escaped}\\s*=\\s*(?:"([^"]*?)"|'([^']*?)'|([^\\s>]+))`, 'gi');
}

/**
 * Match an HTML element with its attributes.
 */
const ELEMENT_REGEX = /<([a-z][a-z0-9-]*)\s+([^>]*?)>/gi;

/**
 * Match script tags with type="text/hyperscript".
 */
const SCRIPT_TAG_REGEX =
  /<script\s+[^>]*type\s*=\s*["']text\/hyperscript["'][^>]*>([\s\S]*?)<\/script>/gi;

/**
 * Extract id attribute from element.
 */
const ID_REGEX = /\bid\s*=\s*["']([^"']+)["']/i;

/**
 * Extract class attribute from element.
 */
const CLASS_REGEX = /\bclass\s*=\s*["']([^"']+)["']/i;

/**
 * Extract lang attribute from element.
 */
const LANG_REGEX = /\blang\s*=\s*["']([^"']+)["']/i;

// =============================================================================
// HTML SCANNER CLASS
// =============================================================================

/**
 * Scanner for extracting hyperscript from HTML sources.
 */
export class HTMLScanner {
  private options: Required<ScannerOptions>;
  private attributeRegexes: Map<string, RegExp>;

  constructor(options: ScannerOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.attributeRegexes = new Map();

    for (const attr of this.options.attributeNames) {
      this.attributeRegexes.set(attr, createAttributeRegex(attr));
    }
  }

  /**
   * Extract hyperscript from HTML source code.
   */
  extract(source: string, filename: string): ExtractedScript[] {
    const scripts: ExtractedScript[] = [];

    // Extract from attributes
    scripts.push(...this.extractFromAttributes(source, filename));

    // Extract from script tags
    if (this.options.includeScriptTags) {
      scripts.push(...this.extractFromScriptTags(source, filename));
    }

    return scripts;
  }

  /**
   * Extract hyperscript from element attributes.
   */
  private extractFromAttributes(source: string, filename: string): ExtractedScript[] {
    const scripts: ExtractedScript[] = [];
    let elementMatch: RegExpExecArray | null;

    // Reset regex state
    ELEMENT_REGEX.lastIndex = 0;

    while ((elementMatch = ELEMENT_REGEX.exec(source)) !== null) {
      const tagName = elementMatch[1];
      const attributes = elementMatch[2];
      const elementStart = elementMatch.index;

      // Calculate line/column for this element
      const location = this.calculateLocation(source, elementStart, filename);

      // Check each hyperscript attribute
      for (const [attrName, regex] of this.attributeRegexes) {
        regex.lastIndex = 0;
        const attrMatch = regex.exec(attributes);

        if (attrMatch) {
          // Value can be in groups 1, 2, or 3 depending on quote style
          const code = attrMatch[1] ?? attrMatch[2] ?? attrMatch[3];

          if (code && code.trim()) {
            // Get element identifiers
            const elementId = this.extractId(attributes);
            const elementSelector = this.buildSelector(tagName, attributes, elementId);
            const language = this.extractLanguage(attributes) ?? this.options.defaultLanguage;

            // Decode HTML entities
            const decodedCode = this.decodeHTMLEntities(code);

            scripts.push({
              code: decodedCode,
              location: {
                ...location,
                column: location.column + attrMatch.index,
              },
              elementId,
              elementSelector,
              language,
              attributeName: attrName,
            });
          }
        }
      }
    }

    return scripts;
  }

  /**
   * Extract hyperscript from script tags.
   */
  private extractFromScriptTags(source: string, filename: string): ExtractedScript[] {
    const scripts: ExtractedScript[] = [];
    let match: RegExpExecArray | null;

    // Reset regex state
    SCRIPT_TAG_REGEX.lastIndex = 0;

    while ((match = SCRIPT_TAG_REGEX.exec(source)) !== null) {
      const code = match[1].trim();

      if (code) {
        const location = this.calculateLocation(source, match.index, filename);

        scripts.push({
          code,
          location,
          language: this.options.defaultLanguage,
          attributeName: 'script',
        });
      }
    }

    return scripts;
  }

  /**
   * Calculate line and column from character offset.
   */
  private calculateLocation(source: string, offset: number, filename: string): SourceLocation {
    const before = source.slice(0, offset);
    const lines = before.split('\n');
    const line = lines.length;
    const column = (lines[lines.length - 1]?.length ?? 0) + 1;

    return { file: filename, line, column };
  }

  /**
   * Extract ID from attributes string.
   */
  private extractId(attributes: string): string | undefined {
    const match = ID_REGEX.exec(attributes);
    return match?.[1];
  }

  /**
   * Extract language from attributes string.
   */
  private extractLanguage(attributes: string): string | undefined {
    const match = LANG_REGEX.exec(attributes);
    return match?.[1];
  }

  /**
   * Build a CSS selector for an element.
   */
  private buildSelector(tagName: string, attributes: string, elementId?: string): string {
    // Prefer ID selector
    if (elementId) {
      return `#${elementId}`;
    }

    // Build selector from tag and classes
    let selector = tagName;

    const classMatch = CLASS_REGEX.exec(attributes);
    if (classMatch) {
      const classes = classMatch[1].split(/\s+/).filter(Boolean);
      if (classes.length > 0) {
        selector += '.' + classes.join('.');
      }
    }

    // Add attribute selector as fallback
    for (const attrName of this.options.attributeNames) {
      if (attributes.includes(attrName + '=')) {
        selector += `[${attrName}]`;
        break;
      }
    }

    return selector;
  }

  /**
   * Decode HTML entities in attribute values.
   */
  private decodeHTMLEntities(text: string): string {
    return text
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
      .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
  }
}

// =============================================================================
// VUE SCANNER
// =============================================================================

/**
 * Scanner for Vue Single File Components.
 */
export class VueScanner extends HTMLScanner {
  /**
   * Extract hyperscript from Vue SFC.
   */
  extract(source: string, filename: string): ExtractedScript[] {
    // Extract template section
    const templateMatch = /<template[^>]*>([\s\S]*?)<\/template>/i.exec(source);

    if (!templateMatch) {
      return [];
    }

    const template = templateMatch[1];
    const templateOffset = templateMatch.index + templateMatch[0].indexOf('>') + 1;

    // Extract from template content
    const scripts = super.extract(template, filename);

    // Adjust line numbers for template offset
    const linesBefore = source.slice(0, templateOffset).split('\n').length - 1;

    for (const script of scripts) {
      script.location.line += linesBefore;
    }

    return scripts;
  }
}

// =============================================================================
// SVELTE SCANNER
// =============================================================================

/**
 * Scanner for Svelte components.
 */
export class SvelteScanner extends HTMLScanner {
  /**
   * Extract hyperscript from Svelte component.
   * Svelte components are HTML-like, so we can use the base scanner
   * but need to exclude script and style blocks.
   */
  extract(source: string, filename: string): ExtractedScript[] {
    // Remove script and style blocks
    let cleanedSource = source
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, match => ' '.repeat(match.length))
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, match => ' '.repeat(match.length));

    return super.extract(cleanedSource, filename);
  }
}

// =============================================================================
// JSX SCANNER
// =============================================================================

/**
 * Scanner for JSX/TSX files.
 */
export class JSXScanner {
  private options: Required<ScannerOptions>;

  constructor(options: ScannerOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Extract hyperscript from JSX source.
   * Handles both regular attributes and spread attributes.
   */
  extract(source: string, filename: string): ExtractedScript[] {
    const scripts: ExtractedScript[] = [];

    // Match JSX hyperscript attributes: _="code" or _={'code'} or _={`code`}
    for (const attrName of this.options.attributeNames) {
      const escaped = attrName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      // String literal value: _="..."
      const stringRegex = new RegExp(`${escaped}\\s*=\\s*["']([^"']+)["']`, 'g');
      let match: RegExpExecArray | null;

      while ((match = stringRegex.exec(source)) !== null) {
        const code = match[1];
        if (code && code.trim()) {
          scripts.push({
            code,
            location: this.calculateLocation(source, match.index, filename),
            language: this.options.defaultLanguage,
            attributeName: attrName,
          });
        }
      }

      // Template literal value: _={`...`}
      const templateRegex = new RegExp(`${escaped}\\s*=\\s*\\{\\s*\`([^\`]+)\`\\s*\\}`, 'g');

      while ((match = templateRegex.exec(source)) !== null) {
        const code = match[1];
        if (code && code.trim()) {
          scripts.push({
            code,
            location: this.calculateLocation(source, match.index, filename),
            language: this.options.defaultLanguage,
            attributeName: attrName,
          });
        }
      }

      // String expression value: _={'...'} or _={"..."}
      const exprRegex = new RegExp(`${escaped}\\s*=\\s*\\{\\s*["']([^"']+)["']\\s*\\}`, 'g');

      while ((match = exprRegex.exec(source)) !== null) {
        const code = match[1];
        if (code && code.trim()) {
          scripts.push({
            code,
            location: this.calculateLocation(source, match.index, filename),
            language: this.options.defaultLanguage,
            attributeName: attrName,
          });
        }
      }
    }

    return scripts;
  }

  /**
   * Calculate line and column from character offset.
   */
  private calculateLocation(source: string, offset: number, filename: string): SourceLocation {
    const before = source.slice(0, offset);
    const lines = before.split('\n');
    const line = lines.length;
    const column = (lines[lines.length - 1]?.length ?? 0) + 1;

    return { file: filename, line, column };
  }
}

// =============================================================================
// MULTI-FILE SCANNER
// =============================================================================

/**
 * Scan multiple files for hyperscript.
 */
export async function scanFiles(
  files: string[],
  readFile: (path: string) => Promise<string>,
  options: ScannerOptions = {}
): Promise<ScanResult> {
  const result: ScanResult = {
    scripts: [],
    files: [],
    errors: [],
  };

  const htmlScanner = new HTMLScanner(options);
  const vueScanner = new VueScanner(options);
  const svelteScanner = new SvelteScanner(options);
  const jsxScanner = new JSXScanner(options);

  for (const file of files) {
    try {
      const content = await readFile(file);
      let scripts: ExtractedScript[] = [];

      if (file.endsWith('.vue')) {
        scripts = vueScanner.extract(content, file);
      } else if (file.endsWith('.svelte')) {
        scripts = svelteScanner.extract(content, file);
      } else if (file.match(/\.(jsx|tsx)$/)) {
        scripts = jsxScanner.extract(content, file);
      } else if (file.match(/\.(html|htm)$/)) {
        scripts = htmlScanner.extract(content, file);
      }

      result.scripts.push(...scripts);
      result.files.push(file);
    } catch (error) {
      result.errors.push({
        file,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return result;
}

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

/**
 * Create a scanner for the appropriate file type.
 */
export function createScanner(
  filename: string,
  options?: ScannerOptions
): HTMLScanner | JSXScanner {
  if (filename.endsWith('.vue')) {
    return new VueScanner(options);
  }
  if (filename.endsWith('.svelte')) {
    return new SvelteScanner(options);
  }
  if (filename.match(/\.(jsx|tsx)$/)) {
    return new JSXScanner(options);
  }
  return new HTMLScanner(options);
}

export default HTMLScanner;
