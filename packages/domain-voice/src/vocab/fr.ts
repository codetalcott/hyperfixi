/**
 * French voice vocabulary. Grammar (SVO, Latin script) comes from
 * `@lokascript/semantic`'s French profile via the framework bridge.
 */

import type { DomainVocabulary } from '@lokascript/framework';
import { SCHEMA_OWNED_MARKERS } from './shared';

export const frVocabulary: DomainVocabulary = {
  keywords: {
    navigate: { primary: 'naviguer', alternatives: ['aller'] },
    click: { primary: 'cliquer' },
    type: { primary: 'taper', alternatives: ['écrire'] },
    scroll: { primary: 'défiler' },
    read: { primary: 'lire' },
    zoom: { primary: 'zoomer' },
    select: { primary: 'sélectionner' },
    back: { primary: 'retour' },
    forward: { primary: 'avancer' },
    focus: { primary: 'focaliser' },
    close: { primary: 'fermer' },
    open: { primary: 'ouvrir' },
    search: { primary: 'chercher', alternatives: ['rechercher'] },
    help: { primary: 'aide' },
  },
  tokenizerKeywords: [
    'vers',
    'dans',
    'de',
    'sur',
    'le',
    'la',
    'les',
    'un',
    'une',
    'haut',
    'bas',
    'gauche',
    'droite',
    'onglet',
    'dialogue',
    'page',
    'tout',
  ],
  roleMarkerOverrides: { ...SCHEMA_OWNED_MARKERS },
};
