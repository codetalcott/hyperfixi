import { createSimpleTokenizer } from '@lokascript/framework';

export const EnglishTodoTokenizer = createSimpleTokenizer({
  language: 'en',
  direction: 'ltr',
  keywords: ['add', 'complete', 'done', 'finish', 'list', 'show', 'to'],
  caseInsensitive: true,
});

export const SpanishTodoTokenizer = createSimpleTokenizer({
  language: 'es',
  direction: 'ltr',
  keywords: ['agregar', 'añadir', 'completar', 'terminar', 'listar', 'mostrar', 'a'],
  caseInsensitive: true,
});

export const JapaneseTodoTokenizer = createSimpleTokenizer({
  language: 'ja',
  direction: 'ltr',
  keywords: ['追加', '完了', '一覧', 'を', 'に'],
  caseInsensitive: false,
});
