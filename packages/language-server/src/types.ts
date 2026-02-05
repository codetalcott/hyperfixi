/**
 * Shared types for the Language Server
 *
 * Supports both original _hyperscript and LokaScript (superset with extensions).
 */

/**
 * Represents a hyperscript region extracted from an HTML document
 */
export interface HyperscriptRegion {
  code: string;
  startLine: number;
  startChar: number;
  endLine: number;
  endChar: number;
  type: 'attribute' | 'script';
}

/**
 * Server operating mode.
 *
 * - 'hyperscript': Restrict to _hyperscript-compatible syntax, English only
 * - 'hyperscript-i18n': Restrict to _hyperscript-compatible syntax, with multilingual support
 *                       (for users of @lokascript/hyperscript-adapter)
 * - 'lokascript': Allow all LokaScript features including extensions, with multilingual support
 * - 'auto': Detect based on available packages
 */
export type ServerMode = 'hyperscript' | 'hyperscript-i18n' | 'lokascript' | 'auto';

/**
 * Server configuration settings
 */
export interface ServerSettings {
  /**
   * Operating mode for syntax validation.
   *
   * - 'hyperscript': Enforce _hyperscript-compatible syntax, English only.
   *   For original _hyperscript users or LokaScript users wanting portability.
   * - 'hyperscript-i18n': Enforce _hyperscript-compatible syntax with multilingual keywords.
   *   For users of @lokascript/hyperscript-adapter who write in non-English languages.
   * - 'lokascript': Allow full LokaScript syntax including extensions.
   * - 'auto': Detect based on available packages (default).
   */
  mode: ServerMode;

  /**
   * Primary language for multilingual keyword support.
   * Only used in 'lokascript' mode.
   * @default 'en'
   */
  language: string;

  /**
   * Maximum number of diagnostics to report per file.
   * @default 100
   */
  maxDiagnostics: number;
}

/**
 * Default server settings
 */
export const defaultSettings: ServerSettings = {
  mode: 'auto',
  language: 'en',
  maxDiagnostics: 100,
};

/**
 * Position within a hyperscript region
 */
export interface RegionPosition {
  region: HyperscriptRegion;
  localLine: number;
  localChar: number;
}

/**
 * Word at a specific position
 */
export interface WordAtPosition {
  text: string;
  start: number;
  end: number;
}
