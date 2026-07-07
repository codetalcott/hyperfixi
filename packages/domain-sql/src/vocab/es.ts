/**
 * Spanish SQL vocabulary. Grammar comes from `@lokascript/semantic`'s
 * Spanish profile via the framework bridge.
 */

import type { DomainVocabulary } from '@lokascript/framework';
import { SCHEMA_OWNED_MARKERS } from './shared';

export const esVocabulary: DomainVocabulary = {
  keywords: {
    select: { primary: 'seleccionar' },
    insert: { primary: 'insertar', alternatives: ['agregar', 'añadir'] },
    update: { primary: 'actualizar', alternatives: ['cambiar', 'modificar'] },
    delete: { primary: 'eliminar', alternatives: ['quitar', 'borrar'] },
    get: { primary: 'obtener' },
  },
  tokenizerKeywords: [
    'de',
    'en',
    'donde',
    'establecer',
    'valores',
    'límite',
    'y',
    'o',
    'no',
    'nulo',
    'verdadero',
    'falso',
    'entre',
    'como',
    'es',
  ],
  roleMarkerOverrides: { ...SCHEMA_OWNED_MARKERS },
};
