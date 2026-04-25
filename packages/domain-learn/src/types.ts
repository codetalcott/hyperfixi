/**
 * Domain-Learn Types
 *
 * Types for the learning domain DSL, extending the framework with
 * communicative functions, morphology tables, and sentence rendering.
 */

// ─── Communicative Functions ────────────────────────────────────

/** The 7 communicative functions that exercises can target */
export type CommunicativeFunction =
  | 'commanding' // imperative: "Add .active to #button"
  | 'describing' // present: "The system adds .active to #button"
  | 'narrating' // past: "The system added .active to #button"
  | 'questioning' // question: "Did the system add .active to #button?"
  | 'negating' // negative: "The system did not add .active to #button"
  | 'planning' // future: "The system will add .active to #button"
  | 'progressing'; // progressive: "The system is adding .active to #button"

export const ALL_FUNCTIONS: readonly CommunicativeFunction[] = [
  'commanding',
  'describing',
  'narrating',
  'questioning',
  'negating',
  'planning',
  'progressing',
];

// ─── Core Verbs ─────────────────────────────────────────────────

/** The 15 core verbs in the learning domain */
export type CoreVerb =
  | 'add'
  | 'remove'
  | 'toggle'
  | 'put'
  | 'set'
  | 'show'
  | 'hide'
  | 'get'
  | 'wait'
  | 'fetch'
  | 'send'
  | 'go'
  | 'increment'
  | 'decrement'
  | 'take';

export const ALL_VERBS: readonly CoreVerb[] = [
  'add',
  'remove',
  'toggle',
  'put',
  'set',
  'show',
  'hide',
  'get',
  'wait',
  'fetch',
  'send',
  'go',
  'increment',
  'decrement',
  'take',
];

// ─── Semantic Roles ─────────────────────────────────────────────

export type SemanticRole =
  | 'patient' // direct object: .active, #input
  | 'destination' // allative: to #button
  | 'source' // ablative: from #list
  | 'instrument' // instrumental: with .class
  | 'possessive' // genitive
  | 'manner' // how
  | 'style'; // in what manner

// ─── Verb Valence ───────────────────────────────────────────────

export type VerbValence = 'intransitive' | 'transitive' | 'ditransitive';

export interface CommandProfile {
  verb: CoreVerb;
  valence: VerbValence;
  targetRole: SemanticRole | null;
  hasPatient: boolean;
}

// ─── Sentence Frame ─────────────────────────────────────────────

export interface SentenceFrame {
  function: CommunicativeFunction;
  template: string;
  verbForm: string;
  example: string;
}

export interface LanguageFrames {
  code: string;
  wordOrder: 'SVO' | 'SOV' | 'VSO';
  frames: SentenceFrame[];
}

// ─── Rendered Output ────────────────────────────────────────────

export interface RenderedSentence {
  language: string;
  function: CommunicativeFunction;
  sentence: string;
  verbForm: string;
  verbValue: string;
}

export interface InterlinearGloss {
  tokens: string[];
  roles: string[];
  english: string[];
}

// ─── Per-Language Form Interfaces ───────────────────────────────

export interface EnglishForms {
  base: string;
  thirdPerson: string;
  past: string;
  pastParticiple: string;
  presentParticiple: string;
}

export interface JapaneseForms {
  dictionary: string;
  verbClass: 'godan' | 'ichidan' | 'suru' | 'kuru' | 'special';
  stem: string;
  masu: string;
  mashita: string;
  ta: string;
  te: string;
  nai: string;
  masen: string;
  potential: string;
  volitional: string;
  ba: string;
  tara: string;
}

export interface SpanishPersonForms {
  yo: string;
  tu: string;
  el: string;
  nosotros: string;
  vosotros: string;
  ellos: string;
}

export interface SpanishForms {
  infinitive: string;
  verbClass: 'ar' | 'er' | 'ir';
  irregular: boolean;
  present: SpanishPersonForms;
  preterite: SpanishPersonForms;
  imperfect: SpanishPersonForms;
  future: SpanishPersonForms;
  imperative: { tu: string; usted: string; ustedes: string };
  gerund: string;
  pastParticiple: { ms: string; fs: string; mp: string; fp: string };
}

export interface ArabicPersonForms {
  howa: string;
  hiya: string;
  anta: string;
  anti: string;
  ana: string;
  hum: string;
  nahnu: string;
}

export interface ArabicForms {
  root: string;
  form: 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI' | 'VII' | 'VIII' | 'X';
  past: ArabicPersonForms;
  present: ArabicPersonForms;
  imperative: { ms: string; fs: string; mp: string };
  activeParticiple: string;
  passiveParticiple: string;
  masdar: string;
}

export interface ChineseForms {
  base: string;
  pinyin: string;
  patterns: {
    completed: string;
    experience: string;
    progressive: string;
    future: string;
    negPresent: string;
    negPast: string;
  };
}

export interface KoreanForms {
  dictionary: string;
  verbClass: 'hada' | 'native' | 'special';
  stem: string;
  hapnida: string;
  haesseumnida: string;
  haeyo: string;
  haesseoyo: string;
  imperative: string;
  past: string;
  negative: string;
  progressive: string;
  future: string;
}

export interface FrenchPersonForms {
  je: string;
  tu: string;
  il: string;
  nous: string;
  vous: string;
  ils: string;
}

export interface FrenchForms {
  infinitive: string;
  imperative: { tu: string; vous: string };
  present: FrenchPersonForms;
  passeCompose: { il: string; je: string };
  imparfait: { il: string };
  futur: { il: string };
  gerondif: string;
}

export interface TurkishForms {
  dictionary: string;
  imperative: { sen: string; siz: string };
  present: {
    ben: string;
    sen: string;
    o: string;
    biz: string;
    siz: string;
    onlar: string;
  };
  past: { o: string; ben: string };
  future: { o: string };
  negative: { o: string };
  progressive: { o: string };
  gerund: string;
}

export interface GermanPersonForms {
  ich: string;
  du: string;
  er: string;
  wir: string;
  ihr: string;
  sie: string;
}

export interface GermanForms {
  infinitive: string;
  separablePrefix: string;
  imperative: { du: string; Sie: string };
  present: GermanPersonForms;
  past: { ich: string; er: string };
  perfect: { er: string };
  future: { er: string };
  presentParticiple: string;
}

export interface PortuguesePersonForms {
  eu: string;
  voce: string;
  ele: string;
  nos: string;
  voces: string;
  eles: string;
}

export interface PortugueseForms {
  infinitive: string;
  imperative: { voce: string; voces: string };
  present: PortuguesePersonForms;
  preterite: { ele: string; eu: string };
  imperfect: { ele: string };
  future: { ele: string };
  gerund: string;
}

// ─── Any Forms Union ────────────────────────────────────────────

export type AnyForms =
  | EnglishForms
  | JapaneseForms
  | SpanishForms
  | ArabicForms
  | ChineseForms
  | KoreanForms
  | FrenchForms
  | TurkishForms
  | GermanForms
  | PortugueseForms;

// ─── Extended Language Profile ──────────────────────────────────

import type { PatternGenLanguageProfile } from '@lokascript/framework';

export interface LearnLanguageProfile {
  /** Base framework profile for pattern generation */
  patternProfile: PatternGenLanguageProfile;
  /** Morphology table: verb → conjugation forms */
  morphologyTable: Record<string, AnyForms>;
  /** Sentence frames per communicative function */
  frames: LanguageFrames;
  /** Default sentence subject */
  defaultSubject: string;
}
