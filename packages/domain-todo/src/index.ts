/**
 * @lokascript/domain-todo — Multilingual Todo DSL
 *
 * An example domain built on @lokascript/framework demonstrating
 * natural-language todo management in 8 languages covering SVO, SOV,
 * and VSO word orders.
 *
 * @example
 * ```typescript
 * import { createTodoDSL } from '@lokascript/domain-todo';
 *
 * const todo = createTodoDSL();
 *
 * // English (SVO)
 * todo.compile('add milk to groceries', 'en');
 * // → { ok: true, code: '{"action":"add","item":"milk","list":"groceries"}' }
 *
 * // Spanish (SVO)
 * todo.compile('agregar leche a compras', 'es');
 *
 * // Japanese (SOV)
 * todo.compile('ミルク を 追加', 'ja');
 *
 * // Arabic (VSO)
 * todo.compile('أضف حليب', 'ar');
 *
 * // Korean (SOV)
 * todo.compile('우유 를 추가', 'ko');
 *
 * // Chinese (SVO)
 * todo.compile('添加 牛奶', 'zh');
 *
 * // Turkish (SOV)
 * todo.compile('süt ekle', 'tr');
 *
 * // French (SVO)
 * todo.compile('ajouter lait', 'fr');
 * ```
 */

import { createMultilingualDSL, type MultilingualDSL } from '@lokascript/framework';
import { allSchemas } from './schemas/index';
import {
  enProfile,
  esProfile,
  jaProfile,
  arProfile,
  koProfile,
  zhProfile,
  trProfile,
  frProfile,
} from './profiles/index';
import {
  EnglishTodoTokenizer,
  SpanishTodoTokenizer,
  JapaneseTodoTokenizer,
  ArabicTodoTokenizer,
  KoreanTodoTokenizer,
  ChineseTodoTokenizer,
  TurkishTodoTokenizer,
  FrenchTodoTokenizer,
} from './tokenizers/index';
import { todoCodeGenerator } from './generators/todo-generator';

/**
 * Create a multilingual todo DSL instance with all 8 supported languages.
 */
export function createTodoDSL(): MultilingualDSL {
  return createMultilingualDSL({
    name: 'Todo',
    schemas: allSchemas,
    languages: [
      {
        code: 'en',
        name: 'English',
        nativeName: 'English',
        tokenizer: EnglishTodoTokenizer,
        patternProfile: enProfile,
      },
      {
        code: 'es',
        name: 'Spanish',
        nativeName: 'Español',
        tokenizer: SpanishTodoTokenizer,
        patternProfile: esProfile,
      },
      {
        code: 'ja',
        name: 'Japanese',
        nativeName: '日本語',
        tokenizer: JapaneseTodoTokenizer,
        patternProfile: jaProfile,
      },
      {
        code: 'ar',
        name: 'Arabic',
        nativeName: 'العربية',
        tokenizer: ArabicTodoTokenizer,
        patternProfile: arProfile,
      },
      {
        code: 'ko',
        name: 'Korean',
        nativeName: '한국어',
        tokenizer: KoreanTodoTokenizer,
        patternProfile: koProfile,
      },
      {
        code: 'zh',
        name: 'Chinese',
        nativeName: '中文',
        tokenizer: ChineseTodoTokenizer,
        patternProfile: zhProfile,
      },
      {
        code: 'tr',
        name: 'Turkish',
        nativeName: 'Türkçe',
        tokenizer: TurkishTodoTokenizer,
        patternProfile: trProfile,
      },
      {
        code: 'fr',
        name: 'French',
        nativeName: 'Français',
        tokenizer: FrenchTodoTokenizer,
        patternProfile: frProfile,
      },
    ],
    codeGenerator: todoCodeGenerator,
  });
}

// Re-export schemas
export { allSchemas, addSchema, completeSchema, listSchema } from './schemas/index';

// Re-export profiles
export {
  enProfile,
  esProfile,
  jaProfile,
  arProfile,
  koProfile,
  zhProfile,
  trProfile,
  frProfile,
  allProfiles,
} from './profiles/index';

// Re-export generators
export { todoCodeGenerator } from './generators/todo-generator';
export { renderTodo } from './generators/todo-renderer';

// Re-export tokenizers
export {
  EnglishTodoTokenizer,
  SpanishTodoTokenizer,
  JapaneseTodoTokenizer,
  ArabicTodoTokenizer,
  KoreanTodoTokenizer,
  ChineseTodoTokenizer,
  TurkishTodoTokenizer,
  FrenchTodoTokenizer,
} from './tokenizers/index';

// =============================================================================
// Domain Scan Config (for AOT / Vite plugin integration)
// =============================================================================

/** HTML attribute and script-type patterns for AOT scanning */
export const todoScanConfig = {
  attributes: ['data-todo', '_todo'] as const,
  scriptTypes: ['text/todo'] as const,
  defaultLanguage: 'en',
};
