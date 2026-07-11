/**
 * Language Profiles Index
 *
 * Concrete implementations of LanguageProfile for supported languages.
 * Each profile inherits from a language family default and adds
 * language-specific markers and rules.
 */

import type { LanguageProfile, SemanticRole } from '../types';
import { reorderRoles, insertMarkers } from '../types';

// =============================================================================
// English (Reference Language)
// =============================================================================

export const englishProfile: LanguageProfile = {
  code: 'en',
  name: 'English',

  wordOrder: 'SVO',
  adpositionType: 'preposition',
  morphology: 'fusional',
  direction: 'ltr',

  canonicalOrder: [
    'event',
    'action',
    'patient',
    'source',
    'destination',
    'quantity',
    'duration',
    'method',
    'style',
  ],

  markers: [
    { form: 'on', role: 'event', position: 'preposition', required: true },
    { form: 'to', role: 'destination', position: 'preposition', required: false },
    { form: 'into', role: 'destination', position: 'preposition', required: false },
    { form: 'from', role: 'source', position: 'preposition', required: false },
    { form: 'with', role: 'style', position: 'preposition', required: false },
    { form: 'by', role: 'quantity', position: 'preposition', required: false },
    { form: 'as', role: 'method', position: 'preposition', required: false },
    { form: 'over', role: 'duration', position: 'preposition', required: false },
    { form: 'for', role: 'duration', position: 'preposition', required: false },
  ],
};

// =============================================================================
// Japanese (SOV, Postpositions)
// =============================================================================

export const japaneseProfile: LanguageProfile = {
  code: 'ja',
  name: '日本語',

  wordOrder: 'SOV',
  adpositionType: 'postposition',
  morphology: 'agglutinative',
  direction: 'ltr',

  // Japanese: Object comes before verb, markers follow nouns
  // "on click increment #count" → "#count を クリック で 増加"
  canonicalOrder: ['patient', 'event', 'action'],

  markers: [
    // Particles (postpositions)
    { form: 'を', role: 'patient', position: 'postposition', required: true },
    { form: 'に', role: 'destination', position: 'postposition', required: true },
    { form: 'から', role: 'source', position: 'postposition', required: true },
    { form: 'で', role: 'event', position: 'postposition', required: true },
    { form: 'で', role: 'style', position: 'postposition', required: false },
    { form: 'と', role: 'style', position: 'postposition', required: false },
    { form: 'へ', role: 'destination', position: 'postposition', required: false },
  ],

  rules: [
    {
      name: 'event-handler',
      description: 'Transform event handlers to Japanese SOV order',
      priority: 100,
      match: {
        commands: ['on'],
        requiredRoles: ['event', 'action'],
        optionalRoles: ['patient'],
      },
      transform: {
        // #count を クリック で 増加
        roleOrder: ['patient', 'event', 'action'],
        insertMarkers: true,
      },
    },
    {
      name: 'put-into',
      description: 'Transform put X into Y to Japanese order',
      priority: 90,
      match: {
        commands: ['put', '置く'],
        requiredRoles: ['action', 'patient', 'destination'],
      },
      transform: {
        // X を Y に 置く
        roleOrder: ['patient', 'destination', 'action'],
        insertMarkers: true,
      },
    },
    {
      name: 'set-to',
      description: 'Transform set X to Y to Japanese verb-final order',
      priority: 90,
      match: {
        commands: ['set', '設定'],
        requiredRoles: ['action', 'patient', 'destination'],
        // Skip a set whose value swept up a trailing block terminator (`set X to Y
        // end` — the body of an inline `if … then set … end`): verb-final reorder
        // would push the verb past `end` and break the block. These parse fine
        // verb-medial (the default).
        predicate: parsed => !/(^|\s)end$/i.test((parsed.original ?? '').trim()),
      },
      transform: {
        // X を Y に 設定 — verb-final, matching the generated SOV set pattern
        // (markerOverride: を on the destination / に on the value). Default reorder
        // emitted verb-MEDIAL (`X を 設定 Y に`), unmatched by any set pattern.
        roleOrder: ['patient', 'destination', 'action'],
        insertMarkers: true,
      },
    },
    {
      name: 'bind-to',
      description: 'Transform bind $var to #el to Japanese verb-final order',
      priority: 90,
      match: {
        commands: ['bind', 'バインド'],
        requiredRoles: ['action', 'patient', 'destination'],
      },
      transform: {
        // $var を #el に バインド
        roleOrder: ['patient', 'destination', 'action'],
        insertMarkers: true,
      },
    },
  ],
};

// =============================================================================
// Korean (SOV, Postpositions - similar to Japanese)
// =============================================================================

export const koreanProfile: LanguageProfile = {
  code: 'ko',
  name: '한국어',

  wordOrder: 'SOV',
  adpositionType: 'postposition',
  morphology: 'agglutinative',
  direction: 'ltr',

  canonicalOrder: ['patient', 'event', 'action'],

  markers: [
    // Korean particles (with vowel harmony variants)
    { form: '를', role: 'patient', position: 'postposition', required: true, alternatives: ['을'] },
    { form: '에', role: 'destination', position: 'postposition', required: true },
    { form: '에서', role: 'source', position: 'postposition', required: true },
    // Event marker — the semantic *-event-ko-sov-* patterns anchor on 할 때
    // (the generator profile's eventMarker); without it every ko handler
    // emitted a bare event name no fused pattern could anchor.
    { form: '할 때', role: 'event', position: 'postposition', required: true },
    {
      form: '로',
      role: 'style',
      position: 'postposition',
      required: false,
      alternatives: ['으로'],
    },
    { form: '와', role: 'style', position: 'postposition', required: false, alternatives: ['과'] },
    {
      form: '로',
      role: 'method',
      position: 'postposition',
      required: false,
      alternatives: ['으로'],
    }, // "as" - same as instrument
  ],

  rules: [
    {
      name: 'event-handler',
      description: 'Transform event handlers to Korean SOV order',
      priority: 100,
      match: {
        commands: ['on'],
        requiredRoles: ['event', 'action'],
      },
      transform: {
        roleOrder: ['patient', 'event', 'action'],
        insertMarkers: true,
      },
    },
    {
      name: 'put-into',
      description: 'Transform put X into Y to Korean verb-final order',
      priority: 90,
      match: {
        commands: ['put', '넣다'],
        requiredRoles: ['action', 'patient', 'destination'],
        // Standalone put only (e.g. a then-chain clause): an event handler whose
        // action is `put` must keep the event mid-stream, so don't verb-final it.
        predicate: parsed => !parsed.roles.has('event'),
      },
      transform: {
        // X 를 Y 에 넣다 (patient, destination, verb-last)
        roleOrder: ['patient', 'destination', 'action'],
        insertMarkers: true,
      },
    },
    {
      name: 'set-to',
      description: 'Transform set X to Y to Korean verb-final order',
      priority: 90,
      match: {
        commands: ['set', '설정'],
        requiredRoles: ['action', 'patient', 'destination'],
        // Skip a set whose value swept up a trailing block terminator (`set X to Y
        // end` — the body of an inline `if … then set … end`): verb-final reorder
        // would push the verb past `end` and break the block. These parse fine
        // verb-medial (the default).
        predicate: parsed => !/(^|\s)end$/i.test((parsed.original ?? '').trim()),
      },
      transform: {
        // X 를 Y 에 설정 — verb-final, matching the generated SOV set pattern.
        roleOrder: ['patient', 'destination', 'action'],
        insertMarkers: true,
      },
    },
    {
      name: 'bind-to',
      description: 'Transform bind $var to #el to Korean verb-final order',
      priority: 90,
      match: {
        commands: ['bind', '바인드'],
        requiredRoles: ['action', 'patient', 'destination'],
      },
      transform: {
        // $var 를 #el 에 바인드
        roleOrder: ['patient', 'destination', 'action'],
        insertMarkers: true,
      },
    },
  ],
};

// =============================================================================
// Chinese (SVO, Topic-Prominent)
// =============================================================================

export const chineseProfile: LanguageProfile = {
  code: 'zh',
  name: '中文',

  wordOrder: 'SVO', // But topic-prominent allows flexibility
  adpositionType: 'preposition',
  morphology: 'isolating',
  direction: 'ltr',

  // Chinese typically uses topic-comment structure
  // Can front the object for emphasis: "#count 在 点击时 增加"
  canonicalOrder: ['event', 'action', 'patient', 'destination'],

  markers: [
    { form: '当', role: 'event', position: 'preposition', required: true },
    { form: '时', role: 'event', position: 'postposition', required: true }, // Circumfix with 当
    { form: '把', role: 'patient', position: 'preposition', required: false }, // BA construction
    { form: '到', role: 'destination', position: 'preposition', required: false },
    { form: '从', role: 'source', position: 'preposition', required: false },
    { form: '用', role: 'style', position: 'preposition', required: false },
    { form: '的', role: 'method', position: 'postposition', required: false },
  ],

  rules: [
    {
      name: 'event-handler-standard',
      description: 'Standard event handler: 当 X 时 Y',
      priority: 100,
      match: {
        // Don't match commands - match by statement type having event role
        requiredRoles: ['event', 'action'],
      },
      transform: {
        // 当 EVENT 时 ACTION [patient] [destination] [source] [style] [method] ...
        roleOrder: ['event', 'action', 'patient'],
        insertMarkers: true,
        custom: (parsed, profile) => {
          // Handle 当...时 circumfix wrapping the event, then emit the action,
          // then any remaining roles in canonical order with their markers.
          // Earlier this function emitted only event/action/patient and silently
          // dropped destination, source, style, etc. — that produced truncated
          // output for `send X to Y`, `fetch /api with method:...`, etc.
          const event = parsed.roles.get('event');
          const action = parsed.roles.get('action');

          // Build the post-action role list using the canonical order minus
          // event/action, plus a safety net for any roles not in the order.
          const remaining = new Map(parsed.roles);
          remaining.delete('event');
          remaining.delete('action');

          const remainingOrder: SemanticRole[] = (profile.canonicalOrder || []).filter(
            r => r !== 'event' && r !== 'action'
          );
          const reordered = reorderRoles(remaining, remainingOrder);
          const markedTokens = insertMarkers(reordered, profile.markers, profile.adpositionType);

          const parts: string[] = ['当', event?.translated || event?.value || '', '时'];
          if (action) parts.push(action.translated || action.value);
          parts.push(...markedTokens);

          return parts.filter(Boolean).join(' ');
        },
      },
    },
    {
      name: 'ba-construction',
      description: 'BA construction for object-fronting: 把 X Y',
      priority: 80,
      match: {
        commands: ['put', 'set', 'move'],
        requiredRoles: ['action', 'patient', 'destination'],
      },
      transform: {
        // 把 X 放 到 Y
        roleOrder: ['patient', 'action', 'destination'],
        insertMarkers: true,
      },
    },
    {
      name: 'bind-to',
      description: 'Bind binds a variable to an element: 绑定 X 到 Y (no 把)',
      priority: 90,
      match: {
        commands: ['bind', '绑定'],
        requiredRoles: ['action', 'patient', 'destination'],
      },
      transform: {
        // Plain SVO without the 把 object-fronting: the bound variable is the
        // semantic destination (not a fronted patient), and `到` marks the
        // target element. Custom so the patient does not pick up 把.
        roleOrder: ['action', 'patient', 'destination'],
        custom: parsed => {
          const action = parsed.roles.get('action');
          const patient = parsed.roles.get('patient');
          const destination = parsed.roles.get('destination');
          const verb = action?.translated || action?.value || '';
          const v = patient?.translated || patient?.value || '';
          const d = destination?.translated || destination?.value || '';
          return [verb, v, '到', d].filter(Boolean).join(' ');
        },
      },
    },
  ],
};

// =============================================================================
// Arabic (VSO, RTL)
// =============================================================================

export const arabicProfile: LanguageProfile = {
  code: 'ar',
  name: 'العربية',

  wordOrder: 'VSO',
  adpositionType: 'preposition',
  morphology: 'fusional', // Root-pattern morphology
  direction: 'rtl',

  // Arabic VSO: Verb first, then subject, then object
  canonicalOrder: ['action', 'agent', 'patient', 'destination', 'source'],

  markers: [
    { form: 'عند', role: 'event', position: 'preposition', required: true },
    { form: 'إلى', role: 'destination', position: 'preposition', required: false },
    { form: 'في', role: 'destination', position: 'preposition', required: false },
    { form: 'من', role: 'source', position: 'preposition', required: false },
    // بـ- notation: trailing hyphen indicates prefix that attaches without space
    { form: 'بـ-', role: 'style', position: 'preposition', required: false },
    { form: 'مع', role: 'style', position: 'preposition', required: false },
    // كـ- notation: "as/like" prefix for manner
    { form: 'كـ-', role: 'method', position: 'preposition', required: false },
  ],

  rules: [
    {
      name: 'event-handler-vso',
      description: 'VSO event handler: VERB TARGET عند EVENT',
      priority: 100,
      match: {
        commands: ['on'],
        requiredRoles: ['event', 'action'],
      },
      transform: {
        // زِد #count عند النقر (increment #count on click)
        roleOrder: ['action', 'patient', 'event'],
        insertMarkers: true,
      },
    },
  ],
};

// =============================================================================
// Turkish (SOV, Agglutinative)
// =============================================================================

export const turkishProfile: LanguageProfile = {
  code: 'tr',
  name: 'Türkçe',

  wordOrder: 'SOV',
  adpositionType: 'postposition',
  morphology: 'agglutinative',
  direction: 'ltr',

  // NOTE: roles absent from this order are safety-net-appended AFTER the verb
  // by reorderRoles. That stranding is what the semantic parser's generated
  // patterns + reclaim tolerances were built around, so extending this order
  // wholesale re-renders (and breaks) the whole tr corpus — fix individual
  // defective shapes with per-command `rules` below instead (see the
  // wait/repeat-until rules from the transformer-rendering arc).
  canonicalOrder: ['patient', 'event', 'action'],

  markers: [
    // Turkish case suffixes - using spaced form for tokenization
    // Note: Real Turkish attaches these as suffixes, but we use spaces
    // so the semantic tokenizer can properly parse them
    {
      form: 'i',
      role: 'patient',
      position: 'postposition',
      required: true,
      alternatives: ['ı', 'u', 'ü'],
    },
    {
      form: 'e',
      role: 'destination',
      position: 'postposition',
      required: true,
      alternatives: ['a'],
    },
    {
      form: 'den',
      role: 'source',
      position: 'postposition',
      required: true,
      alternatives: ['dan'],
    },
    { form: 'de', role: 'event', position: 'postposition', required: true, alternatives: ['da'] },
    { form: 'ile', role: 'style', position: 'postposition', required: false },
    { form: 'olarak', role: 'method', position: 'postposition', required: false },
  ],

  rules: [
    {
      name: 'event-handler-sov',
      description: 'SOV event handler',
      priority: 100,
      match: {
        commands: ['on'],
        requiredRoles: ['event', 'action'],
      },
      transform: {
        roleOrder: ['patient', 'event', 'action'],
        insertMarkers: true,
      },
    },
    {
      name: 'put-into',
      description: 'Transform put X into Y to Turkish verb-final order',
      priority: 90,
      match: {
        commands: ['put', 'koy'],
        requiredRoles: ['action', 'patient', 'destination'],
        // Standalone put only (e.g. a then-chain clause): an event handler whose
        // action is `put` must keep the event mid-stream, so don't verb-final it.
        predicate: parsed => !parsed.roles.has('event'),
      },
      transform: {
        // X i Y e koy (patient, destination, verb-last)
        roleOrder: ['patient', 'destination', 'action'],
        insertMarkers: true,
      },
    },
    {
      name: 'set-to',
      description: 'Transform set X to Y to Turkish verb-final order',
      priority: 90,
      match: {
        commands: ['set', 'ayarla'],
        requiredRoles: ['action', 'patient', 'destination'],
        // Skip a set whose value swept up a trailing block terminator (`set X to Y
        // end` — the body of an inline `if … then set … end`): verb-final reorder
        // would push the verb past `end` and break the block. These parse fine
        // verb-medial (the default).
        predicate: parsed => !/(^|\s)end$/i.test((parsed.original ?? '').trim()),
      },
      transform: {
        // X i Y e ayarla — verb-final, matching the generated SOV set pattern.
        roleOrder: ['patient', 'destination', 'action'],
        insertMarkers: true,
      },
    },
    {
      name: 'bind-to',
      description: 'Transform bind $var to #el to Turkish verb-final order',
      priority: 90,
      match: {
        commands: ['bind'],
        requiredRoles: ['action', 'patient', 'destination'],
      },
      transform: {
        // $var i #el e bağla
        roleOrder: ['patient', 'destination', 'action'],
        insertMarkers: true,
      },
    },
    {
      name: 'wait-oblique-verb-final',
      description: "Keep wait's from-phrase and or-run inside the clause, verb-final",
      priority: 90,
      match: {
        commands: ['wait', 'bekle'],
        // Only the multi-argument form (`wait for X or Y from Z`) strands:
        // without this rule the safety-net appends duration+source AFTER the
        // verb (`bekle … belge den`), and the stranded from-phrase is captured
        // by the NEXT statement as a junk trigger event (behavior-sortable R3).
        requiredRoles: ['action', 'duration', 'source'],
        // Never reorder a fused single-line handler — its event must stay put.
        predicate: parsed => !parsed.roles.has('event'),
      },
      transform: {
        // belge den pointermove(clientY) veya pointerup(clientY) bekle
        roleOrder: ['patient', 'source', 'duration', 'action'],
        insertMarkers: true,
      },
    },
    {
      name: 'repeat-until-event-verb-final',
      description: "Keep repeat-until-event's from-phrase before the verb",
      priority: 90,
      match: {
        commands: ['repeat', 'tekrarla'],
        requiredRoles: ['action', 'patient', 'source'],
        // Gate to the until-event head; `repeat for item in .items` also
        // carries patient+source and must keep its (parseable) default order.
        predicate: parsed => /^repeat\s+until\s+event\b/i.test((parsed.original ?? '').trim()),
      },
      transform: {
        // kadar olay pointerup i belge den tekrarla — matched semantic-side by
        // repeat-tr-until-head-verb-final.
        roleOrder: ['patient', 'source', 'action'],
        insertMarkers: true,
      },
    },
  ],
};

// =============================================================================
// Spanish (SVO, Romance)
// =============================================================================

export const spanishProfile: LanguageProfile = {
  code: 'es',
  name: 'Español',

  wordOrder: 'SVO',
  adpositionType: 'preposition',
  morphology: 'fusional',
  direction: 'ltr',

  canonicalOrder: ['event', 'action', 'patient', 'destination'],

  markers: [
    // Event: "En hacer clic" or "Al hacer clic"
    { form: 'en', role: 'event', position: 'preposition', required: true },
    // Destination: Prioritize 'a' over 'en' to avoid collision with event marker
    { form: 'a', role: 'destination', position: 'preposition', required: false },
    { form: 'hacia', role: 'destination', position: 'preposition', required: false }, // "Towards"
    { form: 'de', role: 'source', position: 'preposition', required: false },
    { form: 'con', role: 'style', position: 'preposition', required: false },
    { form: 'por', role: 'quantity', position: 'preposition', required: false },
    { form: 'como', role: 'method', position: 'preposition', required: false },
  ],
};

// =============================================================================
// German (SVO, Germanic)
// =============================================================================

export const germanProfile: LanguageProfile = {
  code: 'de',
  name: 'Deutsch',

  wordOrder: 'SVO', // V2 in main clauses, but SVO for our purposes
  adpositionType: 'preposition',
  morphology: 'fusional',
  direction: 'ltr',

  canonicalOrder: ['event', 'action', 'patient', 'destination'],

  markers: [
    { form: 'bei', role: 'event', position: 'preposition', required: true },
    { form: 'zu', role: 'destination', position: 'preposition', required: false },
    { form: 'in', role: 'destination', position: 'preposition', required: false },
    { form: 'von', role: 'source', position: 'preposition', required: false },
    { form: 'aus', role: 'source', position: 'preposition', required: false },
    { form: 'mit', role: 'style', position: 'preposition', required: false },
    { form: 'um', role: 'quantity', position: 'preposition', required: false },
    { form: 'als', role: 'method', position: 'preposition', required: false },
  ],
};

// =============================================================================
// French (SVO, Romance)
// =============================================================================

export const frenchProfile: LanguageProfile = {
  code: 'fr',
  name: 'Français',

  wordOrder: 'SVO',
  adpositionType: 'preposition',
  morphology: 'fusional',
  direction: 'ltr',

  canonicalOrder: ['event', 'action', 'patient', 'destination'],

  markers: [
    { form: 'sur', role: 'event', position: 'preposition', required: true },
    { form: 'à', role: 'destination', position: 'preposition', required: false },
    { form: 'dans', role: 'destination', position: 'preposition', required: false },
    { form: 'de', role: 'source', position: 'preposition', required: false },
    { form: 'avec', role: 'style', position: 'preposition', required: false },
    { form: 'par', role: 'quantity', position: 'preposition', required: false },
    { form: 'comme', role: 'method', position: 'preposition', required: false },
  ],
};

// =============================================================================
// Portuguese (SVO, Romance)
// =============================================================================

export const portugueseProfile: LanguageProfile = {
  code: 'pt',
  name: 'Português',

  wordOrder: 'SVO',
  adpositionType: 'preposition',
  morphology: 'fusional',
  direction: 'ltr',

  canonicalOrder: ['event', 'action', 'patient', 'destination'],

  markers: [
    { form: 'em', role: 'event', position: 'preposition', required: true },
    { form: 'para', role: 'destination', position: 'preposition', required: false },
    { form: 'em', role: 'destination', position: 'preposition', required: false },
    { form: 'de', role: 'source', position: 'preposition', required: false },
    { form: 'com', role: 'style', position: 'preposition', required: false },
    { form: 'por', role: 'quantity', position: 'preposition', required: false },
    { form: 'como', role: 'method', position: 'preposition', required: false },
  ],
};

// =============================================================================
// Indonesian (SVO, Austronesian)
// =============================================================================

export const indonesianProfile: LanguageProfile = {
  code: 'id',
  name: 'Bahasa Indonesia',

  wordOrder: 'SVO',
  adpositionType: 'preposition',
  morphology: 'agglutinative',
  direction: 'ltr',

  canonicalOrder: ['event', 'action', 'patient', 'destination'],

  markers: [
    { form: 'pada', role: 'event', position: 'preposition', required: true },
    { form: 'ke', role: 'destination', position: 'preposition', required: false },
    { form: 'dari', role: 'source', position: 'preposition', required: false },
    { form: 'dengan', role: 'style', position: 'preposition', required: false },
    { form: 'sebagai', role: 'method', position: 'preposition', required: false },
  ],
};

// =============================================================================
// Malay (SVO, Austronesian) — grammar mirrors Indonesian (shared function words:
// pada / ke / dari / dengan / sebagai). Without this profile the transformer threw
// "Unknown target locale: ms", so no ms translation could be generated at all.
// =============================================================================

export const malayProfile: LanguageProfile = {
  code: 'ms',
  name: 'Bahasa Melayu',

  wordOrder: 'SVO',
  adpositionType: 'preposition',
  morphology: 'agglutinative',
  direction: 'ltr',

  canonicalOrder: ['event', 'action', 'patient', 'destination'],

  markers: [
    // ms marks the event clause with `apabila` ("when/on") — matching the semantic
    // ms event-handler pattern (`apabila {event} {body}`) and the ms dict's
    // `on: apabila`. (Indonesian uses `pada` here; the two diverge on the event head.)
    { form: 'apabila', role: 'event', position: 'preposition', required: true },
    { form: 'ke', role: 'destination', position: 'preposition', required: false },
    { form: 'dari', role: 'source', position: 'preposition', required: false },
    { form: 'dengan', role: 'style', position: 'preposition', required: false },
    { form: 'sebagai', role: 'method', position: 'preposition', required: false },
  ],
};

// =============================================================================
// Quechua (SOV, Quechuan)
// =============================================================================

export const quechuaProfile: LanguageProfile = {
  code: 'qu',
  name: 'Runasimi',

  wordOrder: 'SOV',
  adpositionType: 'postposition',
  morphology: 'agglutinative', // Actually polysynthetic
  direction: 'ltr',

  // NOTE: roles absent from this order are safety-net-appended AFTER the verb
  // (see the Turkish profile note) — extend via per-command `rules`, not here.
  canonicalOrder: ['patient', 'source', 'destination', 'event', 'action'],

  markers: [
    // Quechua case suffixes - using spaced form for tokenization
    // Note: Real Quechua attaches these as suffixes, but we use spaces
    // so the semantic tokenizer can properly parse them
    { form: 'ta', role: 'patient', position: 'postposition', required: true },
    { form: 'man', role: 'destination', position: 'postposition', required: true },
    { form: 'manta', role: 'source', position: 'postposition', required: true },
    { form: 'pi', role: 'event', position: 'postposition', required: true },
    { form: 'wan', role: 'style', position: 'postposition', required: false },
    { form: 'hina', role: 'method', position: 'postposition', required: false }, // "as/like"
  ],

  rules: [
    {
      name: 'wait-oblique-verb-final',
      description: "Keep wait's from-phrase and or-run inside the clause, verb-final",
      priority: 90,
      match: {
        commands: ['wait', 'suyay'],
        // Only `wait for X or Y from Z` strands: duration is missing from
        // canonicalOrder, so the or-run lands AFTER the verb and the next
        // trigger glues it into its event (behavior-sortable R3). See the
        // matching Turkish rule.
        requiredRoles: ['action', 'duration', 'source'],
        predicate: parsed => !parsed.roles.has('event'),
      },
      transform: {
        // qillqa manta pointermove(clientY) utaq pointerup(clientY) suyay
        roleOrder: ['patient', 'source', 'duration', 'action'],
        insertMarkers: true,
      },
    },
  ],
};

// =============================================================================
// Swahili (SVO, Bantu)
// =============================================================================

export const swahiliProfile: LanguageProfile = {
  code: 'sw',
  name: 'Kiswahili',

  wordOrder: 'SVO',
  adpositionType: 'preposition',
  morphology: 'agglutinative',
  direction: 'ltr',

  canonicalOrder: ['event', 'action', 'patient', 'destination'],

  markers: [
    { form: 'kwenye', role: 'event', position: 'preposition', required: true },
    { form: 'kwa', role: 'destination', position: 'preposition', required: false },
    { form: 'kutoka', role: 'source', position: 'preposition', required: false },
    { form: 'na', role: 'style', position: 'preposition', required: false },
    // `kuwa`, not `kama`: sw `kama` is the IF keyword — rendering the method
    // role ("as X") with it grew a phantom `if` at semantic parse time. See the
    // matching comment in dictionaries/sw.ts (modifiers.as).
    { form: 'kuwa', role: 'method', position: 'preposition', required: false }, // "as/become"
  ],
};

// =============================================================================
// Bengali (SOV, Postpositions - similar to Japanese/Korean)
// =============================================================================

export const bengaliProfile: LanguageProfile = {
  code: 'bn',
  name: 'বাংলা',

  wordOrder: 'SOV',
  adpositionType: 'postposition',
  morphology: 'agglutinative',
  direction: 'ltr',

  // Bengali: Object comes before verb, postpositions follow nouns
  // "on click increment #count" → "#count কে ক্লিক এ বৃদ্ধি"
  // NOTE: roles absent from this order are safety-net-appended AFTER the verb
  // (see the Turkish profile note) — extend via per-command `rules`, not here.
  canonicalOrder: ['patient', 'event', 'action'],

  markers: [
    // Postpositions
    { form: 'কে', role: 'patient', position: 'postposition', required: true },
    { form: 'তে', role: 'destination', position: 'postposition', required: true },
    { form: 'এ', role: 'event', position: 'postposition', required: true },
    { form: 'থেকে', role: 'source', position: 'postposition', required: true },
    { form: 'দিয়ে', role: 'style', position: 'postposition', required: false },
    { form: 'জন্য', role: 'duration', position: 'postposition', required: false },
  ],

  rules: [
    {
      name: 'event-handler',
      description: 'Transform event handlers to Bengali SOV order',
      priority: 100,
      match: {
        commands: ['on'],
        requiredRoles: ['event', 'action'],
        optionalRoles: ['patient'],
      },
      transform: {
        // #count কে ক্লিক এ বৃদ্ধি
        roleOrder: ['patient', 'event', 'action'],
        insertMarkers: true,
      },
    },
    {
      name: 'put-into',
      description: 'Transform put X into Y to Bengali verb-final order',
      priority: 90,
      match: {
        commands: ['put', 'রাখুন'],
        requiredRoles: ['action', 'patient', 'destination'],
        // Standalone put only (e.g. a then-chain clause): an event handler whose
        // action is `put` must keep the event mid-stream, so don't verb-final it.
        predicate: parsed => !parsed.roles.has('event'),
      },
      transform: {
        // X কে Y তে রাখুন (patient, destination, verb-last)
        roleOrder: ['patient', 'destination', 'action'],
        insertMarkers: true,
      },
    },
    {
      name: 'set-to',
      description: 'Transform set X to Y to Bengali verb-final order',
      priority: 90,
      match: {
        commands: ['set', 'সেট'],
        requiredRoles: ['action', 'patient', 'destination'],
        // Skip a set whose value swept up a trailing block terminator (`set X to Y
        // end` — the body of an inline `if … then set … end`): verb-final reorder
        // would push the verb past `end` and break the block. These parse fine
        // verb-medial (the default).
        predicate: parsed => !/(^|\s)end$/i.test((parsed.original ?? '').trim()),
      },
      transform: {
        // X কে Y তে সেট — verb-final, matching the generated SOV set pattern.
        roleOrder: ['patient', 'destination', 'action'],
        insertMarkers: true,
      },
    },
    {
      name: 'bind-to',
      description: 'Transform bind $var to #el to Bengali verb-final order',
      priority: 90,
      match: {
        commands: ['bind', 'বাইন্ড'],
        requiredRoles: ['action', 'patient', 'destination'],
      },
      transform: {
        // $var কে #el তে বাইন্ড
        roleOrder: ['patient', 'destination', 'action'],
        insertMarkers: true,
      },
    },
  ],
};

// =============================================================================
// Italian (SVO, Romance)
// =============================================================================

export const italianProfile: LanguageProfile = {
  code: 'it',
  name: 'Italiano',

  wordOrder: 'SVO',
  adpositionType: 'preposition',
  morphology: 'fusional',
  direction: 'ltr',

  canonicalOrder: ['event', 'action', 'patient', 'destination'],

  markers: [
    { form: 'su', role: 'event', position: 'preposition', required: true },
    { form: 'in', role: 'destination', position: 'preposition', required: false },
    { form: 'a', role: 'destination', position: 'preposition', required: false },
    { form: 'da', role: 'source', position: 'preposition', required: false },
    { form: 'di', role: 'source', position: 'preposition', required: false },
    { form: 'con', role: 'style', position: 'preposition', required: false },
    { form: 'come', role: 'method', position: 'preposition', required: false },
  ],
};

// =============================================================================
// Russian (SVO, Slavic)
// =============================================================================

export const russianProfile: LanguageProfile = {
  code: 'ru',
  name: 'Русский',

  wordOrder: 'SVO',
  adpositionType: 'preposition',
  morphology: 'fusional',
  direction: 'ltr',

  canonicalOrder: ['event', 'action', 'patient', 'destination'],

  markers: [
    { form: 'при', role: 'event', position: 'preposition', required: true },
    { form: 'в', role: 'destination', position: 'preposition', required: false },
    { form: 'на', role: 'destination', position: 'preposition', required: false },
    { form: 'к', role: 'destination', position: 'preposition', required: false },
    { form: 'из', role: 'source', position: 'preposition', required: false },
    { form: 'от', role: 'source', position: 'preposition', required: false },
    { form: 'с', role: 'source', position: 'preposition', required: false },
    { form: 'с', role: 'style', position: 'preposition', required: false },
    { form: 'со', role: 'style', position: 'preposition', required: false },
    { form: 'как', role: 'method', position: 'preposition', required: false },
  ],
};

// =============================================================================
// Ukrainian (SVO, Slavic)
// =============================================================================

export const ukrainianProfile: LanguageProfile = {
  code: 'uk',
  name: 'Українська',

  wordOrder: 'SVO',
  adpositionType: 'preposition',
  morphology: 'fusional',
  direction: 'ltr',

  canonicalOrder: ['event', 'action', 'patient', 'destination'],

  markers: [
    { form: 'при', role: 'event', position: 'preposition', required: true },
    { form: 'в', role: 'destination', position: 'preposition', required: false },
    { form: 'на', role: 'destination', position: 'preposition', required: false },
    { form: 'до', role: 'destination', position: 'preposition', required: false },
    { form: 'з', role: 'source', position: 'preposition', required: false },
    { form: 'від', role: 'source', position: 'preposition', required: false },
    { form: 'із', role: 'source', position: 'preposition', required: false },
    { form: 'з', role: 'style', position: 'preposition', required: false },
    { form: 'із', role: 'style', position: 'preposition', required: false },
    { form: 'як', role: 'method', position: 'preposition', required: false },
  ],
};

// =============================================================================
// Vietnamese (SVO, Isolating)
// =============================================================================

export const vietnameseProfile: LanguageProfile = {
  code: 'vi',
  name: 'Tiếng Việt',

  wordOrder: 'SVO',
  adpositionType: 'preposition',
  morphology: 'isolating',
  direction: 'ltr',

  canonicalOrder: ['event', 'action', 'patient', 'destination'],

  markers: [
    { form: 'khi', role: 'event', position: 'preposition', required: true },
    { form: 'vào', role: 'destination', position: 'preposition', required: false },
    { form: 'cho', role: 'destination', position: 'preposition', required: false },
    { form: 'đến', role: 'destination', position: 'preposition', required: false },
    { form: 'từ', role: 'source', position: 'preposition', required: false },
    { form: 'khỏi', role: 'source', position: 'preposition', required: false },
    { form: 'với', role: 'style', position: 'preposition', required: false },
    { form: 'như', role: 'method', position: 'preposition', required: false },
  ],
};

// =============================================================================
// Hindi (SOV, Postpositions)
// =============================================================================

export const hindiProfile: LanguageProfile = {
  code: 'hi',
  name: 'हिन्दी',

  wordOrder: 'SOV',
  adpositionType: 'postposition',
  morphology: 'fusional',
  direction: 'ltr',

  // Hindi: Object comes before verb, postpositions follow nouns
  // "on click increment #count" → "#count को क्लिक पर बढ़ाएं"
  canonicalOrder: ['patient', 'event', 'action'],

  markers: [
    { form: 'को', role: 'patient', position: 'postposition', required: true },
    { form: 'में', role: 'destination', position: 'postposition', required: true },
    { form: 'पर', role: 'destination', position: 'postposition', required: false },
    { form: 'पर', role: 'event', position: 'postposition', required: true },
    { form: 'से', role: 'source', position: 'postposition', required: true },
    { form: 'से', role: 'style', position: 'postposition', required: false },
    { form: 'साथ', role: 'style', position: 'postposition', required: false },
    { form: 'के रूप में', role: 'method', position: 'postposition', required: false },
  ],

  rules: [
    {
      name: 'event-handler',
      description: 'Transform event handlers to Hindi SOV order',
      priority: 100,
      match: {
        commands: ['on'],
        requiredRoles: ['event', 'action'],
        optionalRoles: ['patient'],
      },
      transform: {
        // #count को क्लिक पर बढ़ाएं
        roleOrder: ['patient', 'event', 'action'],
        insertMarkers: true,
      },
    },
    {
      name: 'put-into',
      description: 'Transform put X into Y to Hindi verb-final order',
      priority: 90,
      match: {
        commands: ['put', 'रखें'],
        requiredRoles: ['action', 'patient', 'destination'],
      },
      transform: {
        // "hi" को #out में रखें
        roleOrder: ['patient', 'destination', 'action'],
        insertMarkers: true,
      },
    },
    {
      name: 'set-to',
      description: 'Transform set X to Y to Hindi verb-final order',
      priority: 90,
      match: {
        commands: ['set', 'सेट'],
        requiredRoles: ['action', 'patient', 'destination'],
        // Skip a set whose value swept up a trailing block terminator (`set X to Y
        // end` — the body of an inline `if … then set … end`): verb-final reorder
        // would push the verb past `end` and break the block. These parse fine
        // verb-medial (the default).
        predicate: parsed => !/(^|\s)end$/i.test((parsed.original ?? '').trim()),
      },
      transform: {
        // #x.innerText को इसका.name में सेट — verb-final, matching the generated
        // SOV set pattern (set schema markerOverride puts को on the destination /
        // में on the value). The default reorder emitted verb-MEDIAL
        // (`#x को सेट … में`), which no set pattern matched → bare-event fallback.
        roleOrder: ['patient', 'destination', 'action'],
        insertMarkers: true,
      },
    },
    {
      name: 'bind-to',
      description: 'Transform bind $var to #el to Hindi verb-final order',
      priority: 90,
      match: {
        commands: ['bind', 'बाइंड', 'बांधें'],
        requiredRoles: ['action', 'patient', 'destination'],
      },
      transform: {
        // $greeting को #name-input में bind — verb-final, matching the generated SOV
        // bind pattern (`{destination} को {source} में bind`). The default reorder
        // emitted verb-MEDIAL (`$greeting को bind #name-input में`), which the
        // verb-final pattern never matched → the bare-event fallback mis-anchored
        // the fronted `$greeting` as a phantom `on` event (the rf=0.00 bind residue).
        // ja/ko/zh/tr/bn already carry this rule; hi was the only SOV gap.
        roleOrder: ['patient', 'destination', 'action'],
        insertMarkers: true,
      },
    },
  ],
};

// =============================================================================
// Tagalog (VSO, Prepositions)
// =============================================================================

export const tagalogProfile: LanguageProfile = {
  code: 'tl',
  name: 'Tagalog',

  wordOrder: 'VSO',
  adpositionType: 'preposition',
  morphology: 'agglutinative',
  direction: 'ltr',

  // Tagalog VSO: Verb first, then subject, then object
  canonicalOrder: ['action', 'agent', 'patient', 'destination', 'source'],

  markers: [
    { form: 'kapag', role: 'event', position: 'preposition', required: true },
    { form: 'sa', role: 'destination', position: 'preposition', required: false },
    // mula_sa (underscore) matches the tl dict and the semantic profile's
    // source marker — the spaced form emitted two tokens the generated
    // patterns' single mula_sa literal could never match, so `remove X
    // mula sa Y` lost its source and the schema default fabricated me.
    { form: 'mula_sa', role: 'source', position: 'preposition', required: false },
    { form: 'nang', role: 'style', position: 'preposition', required: false },
    { form: 'bilang', role: 'method', position: 'preposition', required: false },
  ],

  rules: [
    {
      name: 'event-handler-vso',
      description: 'VSO event handler: VERB TARGET kapag EVENT',
      priority: 100,
      match: {
        commands: ['on'],
        requiredRoles: ['event', 'action'],
      },
      transform: {
        // palitan #count kapag click (toggle #count on click)
        roleOrder: ['action', 'patient', 'event'],
        insertMarkers: true,
      },
    },
  ],
};

// =============================================================================
// Thai (SVO, Isolating, No Spaces)
// =============================================================================

export const thaiProfile: LanguageProfile = {
  code: 'th',
  name: 'ไทย',

  wordOrder: 'SVO',
  adpositionType: 'preposition',
  morphology: 'isolating',
  direction: 'ltr',

  canonicalOrder: ['event', 'action', 'patient', 'destination'],

  markers: [
    { form: 'เมื่อ', role: 'event', position: 'preposition', required: true },
    { form: 'ใน', role: 'destination', position: 'preposition', required: false },
    { form: 'ไปยัง', role: 'destination', position: 'preposition', required: false },
    { form: 'จาก', role: 'source', position: 'preposition', required: false },
    { form: 'ด้วย', role: 'style', position: 'preposition', required: false },
    { form: 'เป็น', role: 'method', position: 'preposition', required: false },
  ],
};

// =============================================================================
// Polish (SVO, Fusional, Imperative)
// =============================================================================

export const polishProfile: LanguageProfile = {
  code: 'pl',
  name: 'Polski',

  wordOrder: 'SVO',
  adpositionType: 'preposition',
  morphology: 'fusional',
  direction: 'ltr',

  canonicalOrder: ['event', 'action', 'patient', 'destination'],

  markers: [
    { form: 'gdy', role: 'event', position: 'preposition', required: true },
    { form: 'przy', role: 'event', position: 'preposition', required: false },
    { form: 'do', role: 'destination', position: 'preposition', required: false },
    { form: 'w', role: 'destination', position: 'preposition', required: false },
    { form: 'na', role: 'destination', position: 'preposition', required: false },
    { form: 'z', role: 'source', position: 'preposition', required: false },
    { form: 'od', role: 'source', position: 'preposition', required: false },
    { form: 'ze', role: 'source', position: 'preposition', required: false },
    { form: 'z', role: 'style', position: 'preposition', required: false },
    { form: 'ze', role: 'style', position: 'preposition', required: false },
    { form: 'jako', role: 'method', position: 'preposition', required: false },
  ],
};

// =============================================================================
// Hebrew (SVO, RTL, Prepositions)
// =============================================================================

export const hebrewProfile: LanguageProfile = {
  code: 'he',
  name: 'עברית',

  wordOrder: 'SVO', // Modern Hebrew is predominantly SVO (Biblical Hebrew was VSO)
  adpositionType: 'preposition',
  morphology: 'fusional', // Root-and-pattern (Semitic), like Arabic
  direction: 'rtl',

  canonicalOrder: ['event', 'action', 'patient', 'destination'],

  // Hebrew uses single-letter prefix prepositions (ב, ל, מ, כ) that attach to
  // the following word. For tokenization we treat them as spaced forms.
  markers: [
    { form: 'ב', role: 'event', position: 'preposition', required: true },
    { form: 'על', role: 'destination', position: 'preposition', required: false },
    { form: 'אל', role: 'destination', position: 'preposition', required: false },
    { form: 'ל', role: 'destination', position: 'preposition', required: false },
    { form: 'את', role: 'patient', position: 'preposition', required: false }, // Direct object marker
    { form: 'מ', role: 'source', position: 'preposition', required: false },
    { form: 'מן', role: 'source', position: 'preposition', required: false },
    { form: 'עם', role: 'style', position: 'preposition', required: false },
    { form: 'כ', role: 'method', position: 'preposition', required: false },
  ],

  rules: [
    {
      name: 'bind-to',
      description: 'Bind binds a variable to an element: קשור X ל Y',
      priority: 90,
      match: {
        commands: ['bind', 'קשור'],
        requiredRoles: ['action', 'patient', 'destination'],
      },
      transform: {
        // The bound variable is the semantic destination (kept bare, no את
        // object marker), and ל marks the target element. Custom so the
        // variable does not pick up את and the element uses ל (not על).
        roleOrder: ['action', 'patient', 'destination'],
        custom: parsed => {
          const action = parsed.roles.get('action');
          const patient = parsed.roles.get('patient');
          const destination = parsed.roles.get('destination');
          const verb = action?.translated || action?.value || '';
          const v = patient?.translated || patient?.value || '';
          const d = destination?.translated || destination?.value || '';
          return [verb, v, 'ל', d].filter(Boolean).join(' ');
        },
      },
    },
  ],
};

// =============================================================================
// Profile Registry
// =============================================================================

export const profiles: Record<string, LanguageProfile> = {
  en: englishProfile,
  ja: japaneseProfile,
  ko: koreanProfile,
  zh: chineseProfile,
  ar: arabicProfile,
  tr: turkishProfile,
  es: spanishProfile,
  de: germanProfile,
  fr: frenchProfile,
  pt: portugueseProfile,
  id: indonesianProfile,
  ms: malayProfile,
  qu: quechuaProfile,
  sw: swahiliProfile,
  bn: bengaliProfile,
  // New profiles
  it: italianProfile,
  ru: russianProfile,
  uk: ukrainianProfile,
  vi: vietnameseProfile,
  hi: hindiProfile,
  tl: tagalogProfile,
  th: thaiProfile,
  pl: polishProfile,
  he: hebrewProfile,
};

export function getProfile(locale: string): LanguageProfile | undefined {
  return profiles[locale];
}

export function getSupportedLocales(): string[] {
  return Object.keys(profiles);
}
