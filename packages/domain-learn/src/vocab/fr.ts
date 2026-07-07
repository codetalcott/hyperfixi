/**
 * French learn vocabulary (the 15 core verbs). Grammar comes from
 * `@lokascript/semantic`'s French profile via the framework bridge;
 * morphology tables and sentence frames stay hand-authored in
 * `../profiles/fr.ts`.
 */

import type { DomainVocabulary } from '@lokascript/framework';
import { SCHEMA_OWNED_MARKERS } from './shared';

export const frVocabulary: DomainVocabulary = {
  keywords: {
    add: { primary: 'ajouter', alternatives: ['ajoute'] },
    remove: { primary: 'retirer', alternatives: ['retire'] },
    toggle: { primary: 'basculer', alternatives: ['bascule'] },
    put: { primary: 'mettre', alternatives: ['mets'] },
    set: { primary: 'définir', alternatives: ['définis'] },
    show: { primary: 'montrer', alternatives: ['montre'] },
    hide: { primary: 'cacher', alternatives: ['cache'] },
    get: { primary: 'obtenir', alternatives: ['obtiens'] },
    wait: { primary: 'attendre', alternatives: ['attends'] },
    fetch: { primary: 'récupérer', alternatives: ['récupère'] },
    send: { primary: 'envoyer', alternatives: ['envoie'] },
    go: { primary: 'aller', alternatives: ['va'] },
    increment: { primary: 'incrémenter', alternatives: ['incrémente'] },
    decrement: { primary: 'décrémenter', alternatives: ['décrémente'] },
    take: { primary: 'prendre', alternatives: ['prends'] },
  },
  roleMarkerOverrides: { ...SCHEMA_OWNED_MARKERS },
};
