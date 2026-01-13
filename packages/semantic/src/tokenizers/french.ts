/**
 * French Tokenizer
 *
 * Tokenizes French hyperscript input.
 * French characteristics:
 * - SVO word order
 * - Space-separated words
 * - Prepositions
 * - Accent marks (é, è, ê, ë, à, â, ù, û, ô, î, ï, ç, œ, æ)
 */

import type { LanguageToken, TokenKind, TokenStream } from '../types';
import {
  BaseTokenizer,
  TokenStreamImpl,
  createToken,
  createPosition,
  isWhitespace,
  isSelectorStart,
  isQuote,
  isDigit,
  isUrlStart,
} from './base';

// =============================================================================
// French Character Classification
// =============================================================================

function isFrenchLetter(char: string): boolean {
  return /[a-zA-ZàâäéèêëîïôùûüçœæÀÂÄÉÈÊËÎÏÔÙÛÜÇŒÆ]/.test(char);
}

function isFrenchIdentifierChar(char: string): boolean {
  return isFrenchLetter(char) || /[0-9_-]/.test(char);
}

// =============================================================================
// French Prepositions
// =============================================================================

const PREPOSITIONS = new Set([
  'à', // to, at
  'a', // to, at (no accent)
  'de', // of, from
  'du', // de + le
  'des', // de + les
  'dans', // in
  'sur', // on
  'sous', // under
  'avec', // with
  'sans', // without
  'par', // by
  'pour', // for
  'entre', // between
  'avant', // before
  'après', // after
  'apres', // after (no accent)
  'depuis', // since, from
  'vers', // towards
  'chez', // at (someone's place)
  'contre', // against
  'au', // à + le
  'aux', // à + les
]);

// =============================================================================
// French Keywords
// =============================================================================

const FRENCH_KEYWORDS: Map<string, string> = new Map([
  // Commands - Class/Attribute operations
  ['basculer', 'toggle'],
  ['permuter', 'toggle'],
  ['alterner', 'toggle'],
  ['ajouter', 'add'],
  ['supprimer', 'remove'],
  ['enlever', 'remove'],
  ['retirer', 'remove'],
  // Commands - Content operations
  ['mettre', 'put'],
  ['placer', 'put'],
  ['annexer', 'append'],
  ['préfixer', 'prepend'],
  ['prefixer', 'prepend'],
  ['prendre', 'take'],
  ['faire', 'make'],
  ['créer', 'make'],
  ['creer', 'make'],
  ['cloner', 'clone'],
  ['copier', 'clone'],
  ['transformer', 'morph'],
  ['transmuter', 'morph'],
  // Commands - Variable operations
  ['définir', 'set'],
  ['definir', 'set'],
  ['établir', 'set'],
  ['etablir', 'set'],
  ['obtenir', 'get'],
  ['incrémenter', 'increment'],
  ['incrementer', 'increment'],
  ['augmenter', 'increment'],
  ['décrémenter', 'decrement'],
  ['decrementer', 'decrement'],
  ['diminuer', 'decrement'],
  ['enregistrer', 'log'],
  ['journaliser', 'log'],
  ['afficher', 'log'],
  // Commands - Visibility
  ['montrer', 'show'],
  ['afficher', 'show'],
  ['cacher', 'hide'],
  ['masquer', 'hide'],
  ['transition', 'transition'],
  ['animer', 'transition'],
  // Commands - Events
  ['sur', 'on'],
  ['quand', 'on'],
  ['lors', 'on'],
  ['déclencher', 'trigger'],
  ['declencher', 'trigger'],
  ['envoyer', 'send'],
  // Commands - DOM focus
  ['focaliser', 'focus'],
  ['concentrer', 'focus'],
  ['défocaliser', 'blur'],
  ['defocaliser', 'blur'],
  // Commands - Navigation
  ['aller', 'go'],
  ['naviguer', 'go'],
  // Commands - Async
  ['attendre', 'wait'],
  ['chercher', 'fetch'],
  ['récupérer', 'fetch'],
  ['recuperer', 'fetch'],
  ['stabiliser', 'settle'],
  // Commands - Control flow
  ['si', 'if'],
  ['sinon', 'else'],
  ['répéter', 'repeat'],
  ['repeter', 'repeat'],
  ['pour', 'for'],
  ['tant que', 'while'],
  ['pendant', 'while'],
  ['continuer', 'continue'],
  ['arrêter', 'halt'],
  ['arreter', 'halt'],
  ['stopper', 'halt'],
  ['lancer', 'throw'],
  ['appeler', 'call'],
  ['retourner', 'return'],
  ['renvoyer', 'return'],
  // Commands - Advanced
  ['js', 'js'],
  ['asynchrone', 'async'],
  ['dire', 'tell'],
  ['défaut', 'default'],
  ['defaut', 'default'],
  ['initialiser', 'init'],
  ['comportement', 'behavior'],
  ['installer', 'install'],
  ['mesurer', 'measure'],
  ["jusqu'à", 'until'],
  ['jusqua', 'until'],
  ['événement', 'event'],
  ['evenement', 'event'],
  // Modifiers
  ['dans', 'into'],
  ['avant', 'before'],
  ['après', 'after'],
  ['apres', 'after'],
  // Control flow helpers
  ['alors', 'then'],
  ['puis', 'then'],
  ['ensuite', 'then'],
  ['fin', 'end'],
  ['terminer', 'end'],
  ['finir', 'end'],
  // Events
  ['clic', 'click'],
  ['click', 'click'],
  ['entrée', 'input'],
  ['entree', 'input'],
  ['changement', 'change'],
  ['soumission', 'submit'],
  ['touche bas', 'keydown'],
  ['touche haut', 'keyup'],
  ['souris dessus', 'mouseover'],
  ['souris dehors', 'mouseout'],
  ['focus', 'focus'],
  ['flou', 'blur'],
  ['chargement', 'load'],
  ['défilement', 'scroll'],
  ['defilement', 'scroll'],
  // References
  ['moi', 'me'],
  ['je', 'me'],
  ['mon', 'my'],
  ['il', 'it'],
  ['ça', 'it'],
  ['ca', 'it'],
  ['résultat', 'result'],
  ['resultat', 'result'],
  ['événement', 'event'],
  ['evenement', 'event'],
  ['cible', 'target'],
  // Positional
  ['premier', 'first'],
  ['première', 'first'],
  ['premiere', 'first'],
  ['dernier', 'last'],
  ['dernière', 'last'],
  ['derniere', 'last'],
  ['suivant', 'next'],
  ['précédent', 'previous'],
  ['precedent', 'previous'],
  // Boolean
  ['vrai', 'true'],
  ['faux', 'false'],
  // Time units
  ['seconde', 's'],
  ['secondes', 's'],
  ['milliseconde', 'ms'],
  ['millisecondes', 'ms'],
  ['minute', 'm'],
  ['minutes', 'm'],
  ['heure', 'h'],
  ['heures', 'h'],
]);

// =============================================================================
// French Tokenizer Implementation
// =============================================================================

export class FrenchTokenizer extends BaseTokenizer {
  readonly language = 'fr';
  readonly direction = 'ltr' as const;

  tokenize(input: string): TokenStream {
    const tokens: LanguageToken[] = [];
    let pos = 0;

    while (pos < input.length) {
      if (isWhitespace(input[pos])) {
        pos++;
        continue;
      }

      if (isSelectorStart(input[pos])) {
        const selectorToken = this.trySelector(input, pos);
        if (selectorToken) {
          tokens.push(selectorToken);
          pos = selectorToken.position.end;
          continue;
        }
      }

      if (isQuote(input[pos])) {
        const stringToken = this.tryString(input, pos);
        if (stringToken) {
          tokens.push(stringToken);
          pos = stringToken.position.end;
          continue;
        }
      }

      if (isUrlStart(input, pos)) {
        const urlToken = this.tryUrl(input, pos);
        if (urlToken) {
          tokens.push(urlToken);
          pos = urlToken.position.end;
          continue;
        }
      }

      if (
        isDigit(input[pos]) ||
        (input[pos] === '-' && pos + 1 < input.length && isDigit(input[pos + 1]))
      ) {
        const numberToken = this.extractNumber(input, pos);
        if (numberToken) {
          tokens.push(numberToken);
          pos = numberToken.position.end;
          continue;
        }
      }

      const varToken = this.tryVariableRef(input, pos);
      if (varToken) {
        tokens.push(varToken);
        pos = varToken.position.end;
        continue;
      }

      if (isFrenchLetter(input[pos])) {
        const wordToken = this.extractWord(input, pos);
        if (wordToken) {
          tokens.push(wordToken);
          pos = wordToken.position.end;
          continue;
        }
      }

      const operatorToken = this.tryOperator(input, pos);
      if (operatorToken) {
        tokens.push(operatorToken);
        pos = operatorToken.position.end;
        continue;
      }

      pos++;
    }

    return new TokenStreamImpl(tokens, 'fr');
  }

  classifyToken(token: string): TokenKind {
    const lower = token.toLowerCase();
    if (PREPOSITIONS.has(lower)) return 'particle';
    if (FRENCH_KEYWORDS.has(lower)) return 'keyword';
    if (token.startsWith('#') || token.startsWith('.') || token.startsWith('[')) return 'selector';
    if (token.startsWith('"') || token.startsWith("'")) return 'literal';
    if (/^\d/.test(token)) return 'literal';
    return 'identifier';
  }

  private extractWord(input: string, startPos: number): LanguageToken | null {
    let pos = startPos;
    let word = '';

    while (pos < input.length && isFrenchIdentifierChar(input[pos])) {
      word += input[pos++];
    }

    if (!word) return null;

    const lower = word.toLowerCase();
    const normalized = FRENCH_KEYWORDS.get(lower);

    if (normalized) {
      return createToken(word, 'keyword', createPosition(startPos, pos), normalized);
    }

    if (PREPOSITIONS.has(lower)) {
      return createToken(word, 'particle', createPosition(startPos, pos));
    }

    return createToken(word, 'identifier', createPosition(startPos, pos));
  }

  private extractNumber(input: string, startPos: number): LanguageToken | null {
    let pos = startPos;
    let number = '';

    if (input[pos] === '-' || input[pos] === '+') {
      number += input[pos++];
    }

    while (pos < input.length && isDigit(input[pos])) {
      number += input[pos++];
    }

    if (pos < input.length && input[pos] === '.') {
      number += input[pos++];
      while (pos < input.length && isDigit(input[pos])) {
        number += input[pos++];
      }
    }

    let unitPos = pos;
    while (unitPos < input.length && isWhitespace(input[unitPos])) {
      unitPos++;
    }

    const remaining = input.slice(unitPos).toLowerCase();
    if (remaining.startsWith('millisecondes') || remaining.startsWith('milliseconde')) {
      number += 'ms';
      pos = unitPos + (remaining.startsWith('millisecondes') ? 13 : 12);
    } else if (remaining.startsWith('secondes') || remaining.startsWith('seconde')) {
      number += 's';
      pos = unitPos + (remaining.startsWith('secondes') ? 8 : 7);
    } else if (remaining.startsWith('minutes') || remaining.startsWith('minute')) {
      number += 'm';
      pos = unitPos + (remaining.startsWith('minutes') ? 7 : 6);
    } else if (remaining.startsWith('heures') || remaining.startsWith('heure')) {
      number += 'h';
      pos = unitPos + (remaining.startsWith('heures') ? 6 : 5);
    }

    if (!number || number === '-' || number === '+') return null;

    return createToken(number, 'literal', createPosition(startPos, pos));
  }

  private tryOperator(input: string, pos: number): LanguageToken | null {
    const twoChar = input.slice(pos, pos + 2);
    if (['==', '!=', '<=', '>=', '&&', '||', '->'].includes(twoChar)) {
      return createToken(twoChar, 'operator', createPosition(pos, pos + 2));
    }

    const oneChar = input[pos];
    if (['<', '>', '!', '+', '-', '*', '/', '='].includes(oneChar)) {
      return createToken(oneChar, 'operator', createPosition(pos, pos + 1));
    }

    if (['(', ')', '{', '}', ',', ';', ':'].includes(oneChar)) {
      return createToken(oneChar, 'punctuation', createPosition(pos, pos + 1));
    }

    return null;
  }
}

export const frenchTokenizer = new FrenchTokenizer();
