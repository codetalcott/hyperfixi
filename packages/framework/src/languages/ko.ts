/**
 * Korean Grammar
 *
 * SOV word order, particles (을/를, 에, 에서, etc.), space-separated between words.
 * Agglutinative language with particles attaching to words.
 */

import type { GrammarProfile } from './types';

export const koreanGrammar = {
  code: 'ko',
  name: 'Korean',
  nativeName: '한국어',
  direction: 'ltr',
  script: 'hangul',
  wordOrder: 'SOV',
  markingStrategy: 'particle',
  usesSpaces: true, // Korean uses spaces between words, but particles attach
  verb: {
    position: 'end',
    suffixes: ['다', '요', '니다', '세요'],
    subjectDrop: true,
  },
  possessive: {
    marker: '의', // Possessive particle
    markerPosition: 'between',
  },
  roleMarkers: {
    patient: { primary: '을', alternatives: ['를'], position: 'after' },
    // 에서 is deliberately NOT a destination alternative: it is the SOURCE
    // primary ("at/from"), and listing it here let an unconsumed wait-line
    // tail (`문서 에서` — from document) satisfy the next SOV clause's
    // optional destination group (behavior-draggable's add captured
    // destination=문서 instead of the schema `me` default). A real Korean
    // destination renders 에/으로/로/의.
    destination: { primary: '에', alternatives: ['으로', '로', '의'], position: 'after' },
    source: { primary: '에서', alternatives: ['부터'], position: 'after' },
    style: { primary: '로', alternatives: ['으로'], position: 'after' },
    event: { primary: '을', alternatives: ['를'], position: 'after' }, // Event as object marker
  },
  tokenization: {
    particles: ['을', '를', '이', '가', '은', '는', '에', '에서', '으로', '로', '와', '과', '도'],
    boundaryStrategy: 'space',
  },
  // Korean writes a particle onto its noun (`#out에`, `나를`; M2 N5).
  attachedMarkers: {
    markers: ['을', '를', '에', '으로', '로', '의', '에서', '부터', '에게'],
    afterWords: 'all',
  },
} satisfies GrammarProfile;
