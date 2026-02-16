import { createMultilingualDSL } from '@lokascript/framework';
import type { MultilingualDSL } from '@lokascript/framework';
import { allSchemas } from './schemas/index';
import { enProfile, esProfile, jaProfile } from './profiles/index';
import {
  EnglishTodoTokenizer,
  SpanishTodoTokenizer,
  JapaneseTodoTokenizer,
} from './tokenizers/index';
import { todoCodeGenerator } from './generators/todo-generator';

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
    ],
    codeGenerator: todoCodeGenerator,
  });
}

// Re-exports
export { allSchemas, addSchema, completeSchema, listSchema } from './schemas/index';
export { enProfile, esProfile, jaProfile } from './profiles/index';
export { todoCodeGenerator } from './generators/todo-generator';
