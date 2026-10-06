/**
 * Explicit Mode Module
 *
 * Provides the explicit [command role:value] syntax for learning,
 * debugging, and language-neutral representation.
 */

export { parseExplicit, isExplicitSyntax } from './parser';
export { SemanticRendererImpl, semanticRenderer, renderExplicit } from './renderer';
export { render } from './verified-render';
export {
  LossyTranslationError,
  findTranslationLoss,
  invariantValues,
  type TranslateOptions,
  type TranslationLoss,
  type TranslationLossKind,
} from './lossy';
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
