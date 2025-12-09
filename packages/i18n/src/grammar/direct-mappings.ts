/**
 * Direct Language-Pair Mappings
 *
 * Enables translation between language pairs without English pivot.
 * This reduces error compounding and provides more natural translations
 * for closely related languages or those with shared vocabulary.
 *
 * Currently supported pairs:
 * - Japanese ↔ Chinese (shared Kanji concepts)
 * - Spanish ↔ Portuguese (Romance language mutual intelligibility)
 * - Korean ↔ Japanese (SOV grammar similarity)
 */

import type { Dictionary } from '../types';
import { ja } from '../dictionaries/ja';
import { zh } from '../dictionaries/zh';
import { ko } from '../dictionaries/ko';
// Note: es and pt use hand-crafted mappings for better quality

// =============================================================================
// Types
// =============================================================================

export interface DirectMapping {
  /** Source language code */
  source: string;
  /** Target language code */
  target: string;
  /** Word mappings: source word -> target word */
  words: Record<string, string>;
  /** Category mappings for structured translation */
  categories?: Record<string, Record<string, string>>;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Create reverse mapping from an existing mapping
 */
function reverseMapping(mapping: DirectMapping): DirectMapping {
  const reversedWords: Record<string, string> = {};
  for (const [source, target] of Object.entries(mapping.words)) {
    reversedWords[target] = source;
  }

  const reversedCategories: Record<string, Record<string, string>> = {};
  if (mapping.categories) {
    for (const [category, words] of Object.entries(mapping.categories)) {
      reversedCategories[category] = {};
      for (const [source, target] of Object.entries(words)) {
        reversedCategories[category][target] = source;
      }
    }
  }

  const result: DirectMapping = {
    source: mapping.target,
    target: mapping.source,
    words: reversedWords,
  };

  if (Object.keys(reversedCategories).length > 0) {
    result.categories = reversedCategories;
  }

  return result;
}

/**
 * Build direct mapping from two dictionaries via English keys
 */
function buildMappingFromDictionaries(
  sourceDict: Dictionary,
  targetDict: Dictionary,
  sourceCode: string,
  targetCode: string
): DirectMapping {
  const words: Record<string, string> = {};
  const categories: Record<string, Record<string, string>> = {};

  // Map each category
  for (const category of ['commands', 'modifiers', 'events', 'logical', 'temporal', 'values', 'attributes'] as const) {
    const sourceCategory = sourceDict[category] as Record<string, string> | undefined;
    const targetCategory = targetDict[category] as Record<string, string> | undefined;

    if (sourceCategory && targetCategory) {
      categories[category] = {};

      for (const [englishKey, sourceWord] of Object.entries(sourceCategory)) {
        const targetWord = targetCategory[englishKey];
        if (targetWord && sourceWord !== targetWord) {
          words[sourceWord] = targetWord;
          categories[category][sourceWord] = targetWord;
        }
      }
    }
  }

  return {
    source: sourceCode,
    target: targetCode,
    words,
    categories,
  };
}

// =============================================================================
// Japanese ↔ Chinese Direct Mapping
// =============================================================================

/**
 * Japanese to Chinese mapping
 *
 * These languages share many concepts through Kanji/Hanzi,
 * making direct translation more accurate than pivot translation.
 */
export const jaZhMapping: DirectMapping = buildMappingFromDictionaries(ja, zh, 'ja', 'zh');

/**
 * Chinese to Japanese mapping (reverse of jaZh)
 */
export const zhJaMapping: DirectMapping = reverseMapping(jaZhMapping);

// =============================================================================
// Korean ↔ Japanese Direct Mapping
// =============================================================================

/**
 * Korean to Japanese mapping
 *
 * Both are SOV languages with postposition particles,
 * sharing grammatical structure that enables more natural translation.
 */
export const koJaMapping: DirectMapping = buildMappingFromDictionaries(ko, ja, 'ko', 'ja');

/**
 * Japanese to Korean mapping (reverse of koJa)
 */
export const jaKoMapping: DirectMapping = reverseMapping(koJaMapping);

// =============================================================================
// Spanish ↔ Portuguese Direct Mapping
// =============================================================================

/**
 * Spanish to Portuguese mapping
 *
 * These Romance languages have high mutual intelligibility,
 * with many cognates that translate directly.
 */
export const esPtMapping: DirectMapping = {
  source: 'es',
  target: 'pt',
  words: {
    // Commands - many are cognates
    'en': 'em',              // on (event)
    'decir': 'dizer',        // tell
    'disparar': 'disparar',  // trigger
    'enviar': 'enviar',      // send
    'tomar': 'pegar',        // take
    'poner': 'colocar',      // put
    'establecer': 'definir', // set
    'obtener': 'obter',      // get
    'agregar': 'adicionar',  // add
    'quitar': 'remover',     // remove
    'alternar': 'alternar',  // toggle
    'ocultar': 'esconder',   // hide
    'mostrar': 'mostrar',    // show
    'si': 'se',              // if
    'menos': 'a menos',      // unless
    'repetir': 'repetir',    // repeat
    'para': 'para',          // for
    'mientras': 'enquanto',  // while
    'hasta': 'até',          // until
    'continuar': 'continuar', // continue
    'romper': 'parar',       // break
    'detener': 'parar',      // halt
    'esperar': 'esperar',    // wait
    'buscar': 'buscar',      // fetch
    'llamar': 'chamar',      // call
    'retornar': 'retornar',  // return
    'hacer': 'fazer',        // make
    'registrar': 'registrar', // log
    'lanzar': 'lançar',      // throw
    'atrapar': 'capturar',   // catch
    'medir': 'medir',        // measure
    'transición': 'transição', // transition
    'incrementar': 'incrementar', // increment
    'decrementar': 'decrementar', // decrement
    'vincular': 'vincular',  // bind
    'predeterminar': 'padrão', // default
    'persistir': 'persistir', // persist
    'ir': 'ir',              // go
    'copiar': 'copiar',      // copy
    'escoger': 'escolher',   // pick
    'intercambiar': 'trocar', // swap
    'transformar': 'transformar', // morph
    'añadir': 'anexar',      // append
    'salir': 'sair',         // exit

    // Modifiers
    'a': 'para',             // to
    'de': 'de',              // from
    'dentro': 'em',          // into
    'con': 'com',            // with
    'como': 'como',          // as
    'por': 'por',            // by

    // Events
    'clic': 'clique',        // click
    'cambio': 'mudança',     // change
    'entrada': 'entrada',    // input
    'envío': 'envio',        // submit
    'carga': 'carregar',     // load
    'enfoque': 'foco',       // focus
    'desenfoque': 'desfoque', // blur

    // Logical
    'verdadero': 'verdadeiro', // true
    'falso': 'falso',        // false
    'y': 'e',                // and
    'o': 'ou',               // or
    'no': 'não',             // not
    'es': 'é',               // is

    // Temporal
    'segundos': 'segundos',  // seconds
    'milisegundos': 'milissegundos', // milliseconds

    // Values
    'nulo': 'nulo',          // null
    'indefinido': 'indefinido', // undefined
    'vacío': 'vazio',        // empty
  },
  categories: {
    commands: {
      'en': 'em',
      'decir': 'dizer',
      'tomar': 'pegar',
      'poner': 'colocar',
      'establecer': 'definir',
      'obtener': 'obter',
      'agregar': 'adicionar',
      'quitar': 'remover',
      'ocultar': 'esconder',
      'si': 'se',
      'mientras': 'enquanto',
      'hasta': 'até',
      'romper': 'parar',
      'detener': 'parar',
      'llamar': 'chamar',
      'hacer': 'fazer',
      'lanzar': 'lançar',
      'atrapar': 'capturar',
      'escoger': 'escolher',
      'intercambiar': 'trocar',
      'añadir': 'anexar',
      'salir': 'sair',
    },
    events: {
      'clic': 'clique',
      'cambio': 'mudança',
      'carga': 'carregar',
      'enfoque': 'foco',
      'desenfoque': 'desfoque',
    },
    logical: {
      'verdadero': 'verdadeiro',
      'y': 'e',
      'o': 'ou',
      'no': 'não',
      'es': 'é',
    },
  },
};

/**
 * Portuguese to Spanish mapping (reverse of esPt)
 */
export const ptEsMapping: DirectMapping = reverseMapping(esPtMapping);

// =============================================================================
// Mapping Registry
// =============================================================================

/**
 * Registry of direct translation pairs.
 * Key format: "source->target" (e.g., "ja->zh")
 */
export const directMappings: Map<string, DirectMapping> = new Map([
  // Japanese ↔ Chinese
  ['ja->zh', jaZhMapping],
  ['zh->ja', zhJaMapping],

  // Korean ↔ Japanese
  ['ko->ja', koJaMapping],
  ['ja->ko', jaKoMapping],

  // Spanish ↔ Portuguese
  ['es->pt', esPtMapping],
  ['pt->es', ptEsMapping],
]);

// =============================================================================
// Public API
// =============================================================================

/**
 * Check if direct mapping exists for a language pair
 */
export function hasDirectMapping(source: string, target: string): boolean {
  return directMappings.has(`${source}->${target}`);
}

/**
 * Get direct mapping for a language pair
 */
export function getDirectMapping(source: string, target: string): DirectMapping | undefined {
  return directMappings.get(`${source}->${target}`);
}

/**
 * Translate a single word using direct mapping
 */
export function translateWordDirect(
  word: string,
  source: string,
  target: string
): string | undefined {
  const mapping = getDirectMapping(source, target);
  if (!mapping) return undefined;
  return mapping.words[word];
}

/**
 * Get all supported direct translation pairs
 */
export function getSupportedDirectPairs(): Array<{ source: string; target: string }> {
  return Array.from(directMappings.keys()).map((key) => {
    const [source, target] = key.split('->');
    return { source, target };
  });
}
