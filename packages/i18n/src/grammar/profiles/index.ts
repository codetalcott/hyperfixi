/**
 * Language Profiles Index
 *
 * Concrete implementations of LanguageProfile for supported languages.
 * Each profile inherits from a language family default and adds
 * language-specific markers and rules.
 */

import type { LanguageProfile } from '../types';

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
        // 当 点击 时 增加 #count
        roleOrder: ['event', 'action', 'patient'],
        insertMarkers: true,
        custom: (parsed, _profile) => {
          // Handle 当...时 circumfix
          const event = parsed.roles.get('event');
          const action = parsed.roles.get('action');
          const patient = parsed.roles.get('patient');

          const parts = ['当', event?.translated || event?.value, '时'];
          parts.push(action?.translated || action?.value || '');
          if (patient) {
            parts.push(patient.translated || patient.value);
          }

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

  canonicalOrder: ['patient', 'event', 'action'],

  markers: [
    // Turkish case suffixes (simplified - real Turkish has vowel harmony)
    {
      form: '-i',
      role: 'patient',
      position: 'postposition',
      required: true,
      alternatives: ['-ı', '-u', '-ü'],
    },
    {
      form: '-e',
      role: 'destination',
      position: 'postposition',
      required: true,
      alternatives: ['-a'],
    },
    {
      form: '-den',
      role: 'source',
      position: 'postposition',
      required: true,
      alternatives: ['-dan'],
    },
    { form: '-de', role: 'event', position: 'postposition', required: true, alternatives: ['-da'] },
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
// Quechua (SOV, Quechuan)
// =============================================================================

export const quechuaProfile: LanguageProfile = {
  code: 'qu',
  name: 'Runasimi',

  wordOrder: 'SOV',
  adpositionType: 'postposition',
  morphology: 'agglutinative', // Actually polysynthetic
  direction: 'ltr',

  canonicalOrder: ['patient', 'source', 'destination', 'event', 'action'],

  markers: [
    { form: '-ta', role: 'patient', position: 'postposition', required: true },
    { form: '-man', role: 'destination', position: 'postposition', required: true },
    { form: '-manta', role: 'source', position: 'postposition', required: true },
    { form: '-pi', role: 'event', position: 'postposition', required: true },
    { form: '-wan', role: 'style', position: 'postposition', required: false },
    { form: 'hina', role: 'method', position: 'postposition', required: false }, // "as/like"
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
    { form: 'kama', role: 'method', position: 'preposition', required: false }, // "as/like"
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
    { form: 'mula sa', role: 'source', position: 'preposition', required: false },
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
};

export function getProfile(locale: string): LanguageProfile | undefined {
  return profiles[locale];
}

export function getSupportedLocales(): string[] {
  return Object.keys(profiles);
}
