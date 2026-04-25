/**
 * Template Inventory — Public API
 */

export { InventoryServer } from './server';
export { extractSnippetsFromFile, extractSnippetsFromProject } from './extractor';
export { updateSnippetInFile, StaleFileError, ContentMismatchError } from './editor';
export type {
  Snippet,
  SnippetCategory,
  GroupBy,
  InventorySummary,
  InventoryConfig,
  ExtractorOptions,
} from './types';
