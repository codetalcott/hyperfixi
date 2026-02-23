/**
 * Template Inventory Tool — Type Definitions
 *
 * Data model for extracted hyperscript and htmx snippets
 * with byte-offset tracking for safe inline editing.
 */

/** Category of a detected attribute */
export type SnippetCategory =
  | 'hyperscript'
  | 'htmx-request'
  | 'htmx-swap'
  | 'htmx-target'
  | 'htmx-trigger'
  | 'htmx-other'
  | 'fixi';

/** Grouping mode for the UI */
export type GroupBy = 'file' | 'category' | 'command' | 'event' | 'element';

/**
 * A single extracted snippet from a template file.
 * Carries byte offsets so edits can safely splice back into the source.
 */
export interface Snippet {
  /** Unique ID: hash of filePath + byteOffset */
  id: string;

  /** Absolute path to the source file */
  filePath: string;

  /** Relative path from project root (for display) */
  relativePath: string;

  /** The attribute name: '_', 'hx-get', 'hx-post', 'hx-target', 'fx-action', etc. */
  attributeName: string;

  /** The raw attribute value (the code inside quotes) */
  value: string;

  /** Whether the value spans multiple lines */
  isMultiline: boolean;

  /** 1-indexed line number where the attribute starts */
  line: number;

  /** 1-indexed column number where the attribute name starts */
  column: number;

  /** Byte offset of the first character of the attribute value (after the opening quote) */
  valueByteOffset: number;

  /** Byte offset of the last character of the attribute value (before the closing quote) */
  valueByteEndOffset: number;

  /** The quote character used: '"', "'", or '`' */
  quoteChar: string;

  /** The opening tag of the enclosing HTML element (e.g., '<button class="btn">') */
  elementTag: string;

  /** The HTML element type (e.g., 'button', 'div', 'input') */
  elementType: string;

  /** Classification of the attribute */
  category: SnippetCategory;

  /** Detected hyperscript commands within the value (e.g., ['toggle', 'add']) */
  commands: string[];

  /** Detected event names within hyperscript (e.g., ['click', 'load']) */
  events: string[];

  /** File modification time (ms) at scan time, for cache invalidation */
  fileMtime: number;
}

/** Summary statistics for the inventory */
export interface InventorySummary {
  totalFiles: number;
  totalSnippets: number;
  byCategory: Record<string, number>;
  byCommand: Record<string, number>;
  byEvent: Record<string, number>;
  byElementType: Record<string, number>;
}

/** Configuration for the inventory server */
export interface InventoryConfig {
  /** Project directory to scan */
  projectDir: string;

  /** Server port (default: 4200) */
  port: number;

  /** Open browser automatically (default: true) */
  open: boolean;

  /** Watch for file changes (default: true) */
  watch: boolean;

  /** Additional glob patterns to include */
  include?: string[];

  /** Additional glob patterns to exclude */
  exclude?: string[];
}

/** Configuration for the extractor */
export interface ExtractorOptions {
  /** Additional glob patterns to include */
  include?: string[];

  /** Additional glob patterns to exclude */
  exclude?: string[];
}
