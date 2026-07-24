/**
 * Explicit Mode Module
 *
 * Provides the explicit [command role:value] syntax for learning,
 * debugging, and language-neutral representation.
 */

export { parseExplicit, isExplicitSyntax } from './parser';
export { SemanticRendererImpl, semanticRenderer, render, renderExplicit } from './renderer';
export {
  toExplicit,
  fromExplicit,
  translate,
  parseAny,
  roundTrip,
  getAllTranslations,
  getAllTranslationsWithStatus,
  validateTranslation,
} from './converter';
