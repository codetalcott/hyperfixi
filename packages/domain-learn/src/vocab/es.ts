/**
 * Spanish learn vocabulary (the 15 core verbs). Grammar comes from
 * `@lokascript/semantic`'s Spanish profile via the framework bridge;
 * morphology tables and sentence frames stay hand-authored in
 * `../profiles/es.ts`.
 */

import type { DomainVocabulary } from '@lokascript/framework';
import { SCHEMA_OWNED_MARKERS } from './shared';

export const esVocabulary: DomainVocabulary = {
  keywords: {
    add: { primary: 'agregar', alternatives: ['agrega'] },
    remove: { primary: 'quitar', alternatives: ['quita'] },
    toggle: { primary: 'alternar', alternatives: ['alterna'] },
    put: { primary: 'poner', alternatives: ['pon'] },
    set: { primary: 'establecer', alternatives: ['establece'] },
    show: { primary: 'mostrar', alternatives: ['muestra'] },
    hide: { primary: 'ocultar', alternatives: ['oculta'] },
    get: { primary: 'obtener', alternatives: ['obtén'] },
    wait: { primary: 'esperar', alternatives: ['espera'] },
    fetch: { primary: 'buscar', alternatives: ['busca'] },
    send: { primary: 'enviar', alternatives: ['envía'] },
    go: { primary: 'ir', alternatives: ['ve'] },
    increment: { primary: 'incrementar', alternatives: ['incrementa'] },
    decrement: { primary: 'decrementar', alternatives: ['decrementa'] },
    take: { primary: 'tomar', alternatives: ['toma'] },
  },
  roleMarkerOverrides: { ...SCHEMA_OWNED_MARKERS },
};
