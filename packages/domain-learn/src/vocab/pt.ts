/**
 * Portuguese learn vocabulary (the 15 core verbs). Grammar comes from
 * `@lokascript/semantic`'s Portuguese profile via the framework bridge;
 * morphology tables and sentence frames stay hand-authored in
 * `../profiles/pt.ts`.
 */

import type { DomainVocabulary } from '@lokascript/framework';
import { SCHEMA_OWNED_MARKERS } from './shared';

export const ptVocabulary: DomainVocabulary = {
  keywords: {
    add: { primary: 'adicionar', alternatives: ['adicione'] },
    remove: { primary: 'remover', alternatives: ['remova'] },
    toggle: { primary: 'alternar', alternatives: ['alterne'] },
    put: { primary: 'colocar', alternatives: ['coloque'] },
    set: { primary: 'definir', alternatives: ['defina'] },
    show: { primary: 'mostrar', alternatives: ['mostre'] },
    hide: { primary: 'esconder', alternatives: ['esconda'] },
    get: { primary: 'obter', alternatives: ['obtenha'] },
    wait: { primary: 'esperar', alternatives: ['espere'] },
    fetch: { primary: 'buscar', alternatives: ['busque'] },
    send: { primary: 'enviar', alternatives: ['envie'] },
    go: { primary: 'ir', alternatives: ['vá'] },
    increment: { primary: 'incrementar', alternatives: ['incremente'] },
    decrement: { primary: 'decrementar', alternatives: ['decremente'] },
    take: { primary: 'pegar', alternatives: ['pegue'] },
  },
  roleMarkerOverrides: { ...SCHEMA_OWNED_MARKERS },
};
