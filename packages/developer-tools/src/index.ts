/**
 * @hyperfixi/developer-tools (private): the template inventory.
 * The Prism highlighter is its own entry, `./prism-hyperscript-i18n`.
 */

export { InventoryServer, extractSnippetsFromProject, extractSnippetsFromFile } from './inventory';
export { updateSnippetInFile, StaleFileError, ContentMismatchError } from './inventory';
export type {
  Snippet,
  SnippetCategory,
  GroupBy,
  InventorySummary,
  InventoryConfig,
  ExtractorOptions,
} from './inventory';
