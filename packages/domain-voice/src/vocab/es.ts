/**
 * Spanish voice vocabulary. Grammar (SVO, Latin script) comes from
 * `@lokascript/semantic`'s Spanish profile via the framework bridge.
 */

import type { DomainVocabulary } from '@lokascript/framework';
import { SCHEMA_OWNED_MARKERS } from './shared';

export const esVocabulary: DomainVocabulary = {
  keywords: {
    navigate: { primary: 'navegar', alternatives: ['ir'] },
    click: { primary: 'clic', alternatives: ['pulsar'] },
    type: { primary: 'escribir' },
    scroll: { primary: 'desplazar' },
    read: { primary: 'leer' },
    zoom: { primary: 'zoom' },
    select: { primary: 'seleccionar' },
    back: { primary: 'atrás', alternatives: ['volver'] },
    forward: { primary: 'adelante' },
    focus: { primary: 'enfocar' },
    close: { primary: 'cerrar' },
    open: { primary: 'abrir' },
    search: { primary: 'buscar' },
    help: { primary: 'ayuda' },
  },
  tokenizerKeywords: [
    'a',
    'en',
    'por',
    'el',
    'la',
    'de',
    'sur',
    'arriba',
    'abajo',
    'izquierda',
    'derecha',
    'más',
    'menos',
    'todo',
    'página',
    'diálogo',
  ],
  roleMarkerOverrides: { ...SCHEMA_OWNED_MARKERS },
};
