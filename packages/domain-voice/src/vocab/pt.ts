/**
 * Portuguese voice vocabulary (bridge-era language, arc Phase 2). Grammar (SVO,
 * Latin script) comes from `@lokascript/semantic`'s Portuguese profile via the
 * framework bridge — one vocab file, no hand-authored profile/tokenizer.
 */

import type { DomainVocabulary } from '@lokascript/framework';
import { SCHEMA_OWNED_MARKERS } from './shared';

export const ptVocabulary: DomainVocabulary = {
  keywords: {
    navigate: { primary: 'navegar' },
    click: { primary: 'clicar' },
    type: { primary: 'digitar' },
    scroll: { primary: 'rolar' },
    read: { primary: 'ler' },
    zoom: { primary: 'ampliar' },
    select: { primary: 'selecionar' },
    back: { primary: 'voltar' },
    forward: { primary: 'avançar' },
    focus: { primary: 'focar' },
    close: { primary: 'fechar' },
    open: { primary: 'abrir' },
    search: { primary: 'procurar' },
    help: { primary: 'ajuda' },
  },
  // Schema markers (destination→para/em, quantity→por) + direction/target words.
  tokenizerKeywords: [
    'para',
    'em',
    'por',
    'cima',
    'baixo',
    'esquerda',
    'direita',
    'dentro',
    'fora',
    'redefinir',
    'aba',
    'diálogo',
    'página',
    'tudo',
  ],
  roleMarkerOverrides: { ...SCHEMA_OWNED_MARKERS },
};
