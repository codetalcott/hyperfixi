import type { PatternGenLanguageProfile } from '@lokascript/framework';

export const enProfile: PatternGenLanguageProfile = {
  code: 'en',
  wordOrder: 'SVO',
  keywords: {
    add: { primary: 'add' },
    complete: { primary: 'complete', alternatives: ['done', 'finish'] },
    list: { primary: 'list', alternatives: ['show'] },
  },
  roleMarkers: {},
};

export const esProfile: PatternGenLanguageProfile = {
  code: 'es',
  wordOrder: 'SVO',
  keywords: {
    add: { primary: 'agregar', alternatives: ['añadir'] },
    complete: { primary: 'completar', alternatives: ['terminar'] },
    list: { primary: 'listar', alternatives: ['mostrar'] },
  },
  roleMarkers: {},
};

export const jaProfile: PatternGenLanguageProfile = {
  code: 'ja',
  wordOrder: 'SOV',
  keywords: {
    add: { primary: '追加' },
    complete: { primary: '完了' },
    list: { primary: '一覧' },
  },
  roleMarkers: {},
};

export const allProfiles = [enProfile, esProfile, jaProfile];
