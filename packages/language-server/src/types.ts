/**
 * Shared types for the LokaScript Language Server
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
 * Server configuration settings
 */
export interface ServerSettings {
  language: string;
  maxDiagnostics: number;
}

/**
 * Default server settings
 */
export const defaultSettings: ServerSettings = {
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
