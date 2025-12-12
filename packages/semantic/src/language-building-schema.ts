/**
 * Language Building Schema
 *
 * This file defines the schema for adding languages and commands to the semantic parser.
 * It serves as both documentation and validation for ensuring all required pieces are in place.
 *
 * ## Adding a New Language
 *
 * Required steps:
 * 1. Create language profile in generators/language-profiles.ts
 * 2. Create tokenizer in tokenizers/{language}.ts
 * 3. Register tokenizer in tokenizers/index.ts
 * 4. Create morphological normalizer in tokenizers/morphology/{language}-normalizer.ts (for agglutinative/inflected languages)
 * 5. Add event handler patterns in patterns/event-handler.ts (if different from generated)
 * 6. Add tests in test/official-examples.test.ts
 * 7. Add morphology tests in test/morphology.test.ts (if normalizer created)
 *
 * ## Adding a New Command
 *
 * Required steps:
 * 1. Define command schema in generators/command-schemas.ts
 * 2. Wire schema in patterns/index.ts (generatePatternsForCommand)
 * 3. Add keywords to ALL language profiles in generators/language-profiles.ts
 * 4. Add keywords to ALL tokenizers' keyword maps
 * 5. Add tests for all languages in test/official-examples.test.ts
 *
 * ## Morphological Infrastructure
 *
 * Languages with verb conjugations or inflections need morphological normalizers:
 * - Japanese: て-form, た-form, ます-form, ている, etc.
 * - Korean: 다 ending, 요/니다 forms, 았/었 past tense
 * - Spanish: Conjugations (-ar, -er, -ir), reflexive verbs (mostrarse)
 * - Arabic: Prefix/suffix stripping (ال, ي, ت, ن, أ, ون, ين)
 * - Turkish: Vowel harmony, tense suffixes (-iyor, -di, -miş)
 *
 * The normalizer extracts the stem and provides a confidence score.
 * Pattern matching uses stemmed forms when exact/normalized matches fail.
 *
 * ## Common Pitfalls
 *
 * - Keywords in language profiles but NOT in tokenizer keyword maps
 *   → Tokens classified as 'identifier' instead of 'keyword'
 *   → Pattern matching fails
 *
 * - Particle conflicts (e.g., Japanese 'に' used for both events and destinations)
 *   → Event handler patterns match command patterns
 *   → Solution: Use distinct particles or adjust pattern priorities
 *
 * - Missing keyword alternatives
 *   → Native speakers may use different words for same concept
 *   → Include common alternatives in both profile and tokenizer
 *
 * - Missing morphological normalizer for agglutinative languages
 *   → Conjugated verb forms won't be recognized
 *   → Solution: Create normalizer and integrate with tokenizer
 */

// =============================================================================
// Language Checklist Schema
// =============================================================================

export interface LanguageChecklist {
  /** ISO 639-1 language code */
  code: string;

  /** Human-readable language name */
  name: string;

  /** Word order (SVO, SOV, VSO) */
  wordOrder: 'SVO' | 'SOV' | 'VSO';

  /** Writing direction */
  direction: 'ltr' | 'rtl';

  /** Required files */
  files: {
    /** Language profile exists in generators/language-profiles.ts */
    languageProfile: boolean;

    /** Tokenizer exists in tokenizers/{code}.ts */
    tokenizer: boolean;

    /** Tokenizer registered in tokenizers/index.ts */
    tokenizerRegistered: boolean;

    /** Morphological normalizer in tokenizers/morphology/{code}-normalizer.ts */
    morphologicalNormalizer: boolean;

    /** Event handler patterns in patterns/event-handler.ts (optional for generated) */
    eventHandlerPatterns: boolean;

    /** Tests in test/official-examples.test.ts */
    tests: boolean;

    /** Morphology tests in test/morphology.test.ts */
    morphologyTests: boolean;
  };

  /** Morphological infrastructure details */
  morphology: {
    /** Whether this language needs morphological normalization */
    needed: boolean;

    /** Why it's needed (or not needed) */
    reason: string;

    /** Types of inflections handled */
    inflectionTypes: string[];

    /** Whether the normalizer is integrated with the tokenizer */
    integratedWithTokenizer: boolean;

    /** Confidence threshold for stemmed matches */
    confidenceThreshold: number;
  };

  /** Keywords defined in language profile */
  profileKeywords: string[];

  /** Keywords defined in tokenizer keyword map */
  tokenizerKeywords: string[];

  /** Keywords missing from tokenizer (profile has, tokenizer doesn't) */
  missingFromTokenizer: string[];

  /** Particles/markers that may cause conflicts */
  potentialConflicts: ParticleConflict[];
}

export interface ParticleConflict {
  /** The particle/marker */
  particle: string;

  /** What it's used for (e.g., 'destination', 'event', 'object') */
  usedFor: string[];

  /** Whether this causes actual pattern conflicts */
  isResolved: boolean;

  /** How it was resolved */
  resolution?: string;
}

// =============================================================================
// Command Checklist Schema
// =============================================================================

export interface CommandChecklist {
  /** Command action name */
  action: string;

  /** Whether schema exists in generators/command-schemas.ts */
  schemaExists: boolean;

  /** Whether wired in patterns/index.ts (false for hand-crafted patterns) */
  wiredInPatterns: boolean;

  /** Whether this command uses hand-crafted patterns instead of generated */
  usesHandCraftedPatterns: boolean;

  /** Languages with profile keywords defined */
  profileKeywordsIn: string[];

  /** Languages with tokenizer keywords defined */
  tokenizerKeywordsIn: string[];

  /** Languages missing tokenizer keywords */
  missingTokenizerKeywordsIn: string[];

  /** Tests exist for each language */
  testsFor: string[];
}

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * Validates that a language has all required pieces in place.
 */
export function validateLanguage(checklist: LanguageChecklist): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required files
  if (!checklist.files.languageProfile) {
    errors.push(`Missing language profile for ${checklist.code}`);
  }
  if (!checklist.files.tokenizer) {
    errors.push(`Missing tokenizer for ${checklist.code}`);
  }
  if (!checklist.files.tokenizerRegistered) {
    errors.push(`Tokenizer not registered for ${checklist.code}`);
  }
  if (!checklist.files.tests) {
    warnings.push(`No tests found for ${checklist.code}`);
  }

  // Check keyword sync
  if (checklist.missingFromTokenizer.length > 0) {
    errors.push(
      `Keywords in profile but not tokenizer for ${checklist.code}: ` +
        checklist.missingFromTokenizer.join(', ')
    );
  }

  // Check particle conflicts
  const unresolvedConflicts = checklist.potentialConflicts.filter(c => !c.isResolved);
  if (unresolvedConflicts.length > 0) {
    for (const conflict of unresolvedConflicts) {
      warnings.push(
        `Unresolved particle conflict in ${checklist.code}: ` +
          `'${conflict.particle}' used for ${conflict.usedFor.join(' and ')}`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates that a command has all required pieces in place.
 */
export function validateCommand(checklist: CommandChecklist): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!checklist.schemaExists) {
    errors.push(`Missing schema for command: ${checklist.action}`);
  }

  // Hand-crafted patterns don't need to be wired
  if (!checklist.wiredInPatterns && !checklist.usesHandCraftedPatterns) {
    errors.push(`Command not wired in patterns/index.ts: ${checklist.action}`);
  }

  if (checklist.missingTokenizerKeywordsIn.length > 0) {
    errors.push(
      `Command ${checklist.action} missing tokenizer keywords in: ` +
        checklist.missingTokenizerKeywordsIn.join(', ')
    );
  }

  // All languages should have tests
  const allLanguages = ['en', 'ja', 'ar', 'es', 'ko', 'tr', 'zh'];
  const missingTests = allLanguages.filter(lang => !checklist.testsFor.includes(lang));
  if (missingTests.length > 0) {
    warnings.push(
      `Command ${checklist.action} missing tests for: ${missingTests.join(', ')}`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// =============================================================================
// Current State Documentation
// =============================================================================

/**
 * Documents the current state of language support.
 * Update this when adding new languages or commands.
 */
export const SUPPORTED_LANGUAGES: LanguageChecklist[] = [
  {
    code: 'en',
    name: 'English',
    wordOrder: 'SVO',
    direction: 'ltr',
    files: {
      languageProfile: true,
      tokenizer: true,
      tokenizerRegistered: true,
      morphologicalNormalizer: false,
      eventHandlerPatterns: true,
      tests: true,
      morphologyTests: false,
    },
    morphology: {
      needed: false,
      reason: 'English has minimal inflection; keywords match base forms',
      inflectionTypes: [],
      integratedWithTokenizer: false,
      confidenceThreshold: 1.0,
    },
    profileKeywords: [
      'toggle', 'add', 'remove', 'put', 'set', 'show', 'hide',
      'append', 'prepend', 'increment', 'decrement', 'wait',
      'fetch', 'go', 'trigger', 'send', 'log',
    ],
    tokenizerKeywords: [
      'toggle', 'add', 'remove', 'put', 'set', 'get', 'show', 'hide',
      'append', 'prepend', 'take', 'increment', 'decrement', 'wait',
      'fetch', 'go', 'trigger', 'send', 'call', 'return', 'log',
    ],
    missingFromTokenizer: [],
    potentialConflicts: [],
  },
  {
    code: 'ja',
    name: 'Japanese',
    wordOrder: 'SOV',
    direction: 'ltr',
    files: {
      languageProfile: true,
      tokenizer: true,
      tokenizerRegistered: true,
      morphologicalNormalizer: true,
      eventHandlerPatterns: true,
      tests: true,
      morphologyTests: true,
    },
    morphology: {
      needed: true,
      reason: 'Japanese is agglutinative with rich verb conjugation',
      inflectionTypes: [
        'て-form (切り替えて)',
        'た-form/past (切り替えた)',
        'ます-form/polite (切り替えます)',
        'ている/progressive (切り替えている)',
        'ない/negative (切り替えない)',
        'する verbs (トグルする → トグル)',
      ],
      integratedWithTokenizer: true,
      confidenceThreshold: 0.7,
    },
    profileKeywords: [
      '切り替え', '追加', '削除', '置く', '設定', '表示', '隠す',
      '末尾追加', '先頭追加', '増加', '減少', '待つ', '取得',
      '前往', '引き金', '送信', 'ログ',
    ],
    tokenizerKeywords: [
      '切り替え', '切り替える', 'トグル', 'トグルする',
      '追加', '追加する', '削除', '削除する',
      '置く', '入れる', 'セット', 'セットする', '設定', '設定する',
      '取得', '取得する', '表示', '表示する', '隠す', '非表示',
      '増加', '増加する', '増やす', '減少', '減少する', '減らす',
      '待つ', '待機', '送信', '送信する',
      'トリガー', '発火', '引き金',
      '末尾追加', '末尾に追加', 'アペンド',
      '先頭追加', '先頭に追加', 'プリペンド',
      '呼び出す', '返す', 'ログ',
    ],
    missingFromTokenizer: [], // Now synced
    potentialConflicts: [
      {
        particle: 'に',
        usedFor: ['destination', 'time'],
        isResolved: true,
        resolution: 'Removed に from event handler alternatives; use で for events',
      },
    ],
  },
  {
    code: 'ko',
    name: 'Korean',
    wordOrder: 'SOV',
    direction: 'ltr',
    files: {
      languageProfile: true,
      tokenizer: true,
      tokenizerRegistered: true,
      morphologicalNormalizer: true,
      eventHandlerPatterns: false, // Uses generated patterns
      tests: true,
      morphologyTests: true,
    },
    morphology: {
      needed: true,
      reason: 'Korean is agglutinative with verb conjugation and honorific forms',
      inflectionTypes: [
        '다 ending/dictionary (바꾸다 → 바꾸)',
        '요 ending/polite (바꿔요 → 바꾸)',
        '니다 ending/formal (바꿉니다 → 바꾸)',
        '세요 ending/honorific (바꾸세요 → 바꾸)',
        '았/었 past tense (바꿨어 → 바꾸)',
        'Vowel harmony for particles',
      ],
      integratedWithTokenizer: true,
      confidenceThreshold: 0.7,
    },
    profileKeywords: [
      '토글', '추가', '제거', '놓다', '설정', '보이다', '숨기다',
      '추가', '앞에추가', '증가', '감소', '기다리다', '가져오다',
      '가다', '트리거', '보내다', '로그',
    ],
    tokenizerKeywords: [
      '토글', '토글하다', '바꾸다', '전환',
      '추가', '추가하다', '제거', '제거하다',
      '놓다', '넣다', '세트', '설정', '설정하다',
      '가져오다', '얻다', '보이다', '표시', '숨기다', '숨김',
      '증가', '증가하다', '늘리다', '감소', '감소하다', '줄이다',
      '기다리다', '대기', '보내다', '전송',
      '트리거', '발동', '호출', '반환', '로그',
    ],
    missingFromTokenizer: [], // Check and update as needed
    potentialConflicts: [],
  },
  {
    code: 'ar',
    name: 'Arabic',
    wordOrder: 'VSO',
    direction: 'rtl',
    files: {
      languageProfile: true,
      tokenizer: true,
      tokenizerRegistered: true,
      morphologicalNormalizer: true,
      eventHandlerPatterns: true,
      tests: true,
      morphologyTests: true,
    },
    morphology: {
      needed: true,
      reason: 'Arabic has complex root-pattern morphology with prefixes/suffixes',
      inflectionTypes: [
        'Definite article ال (البدل → بدل)',
        'Conjunction prefixes و/ف (والبدل → بدل)',
        'Preposition prefixes ب/ل (ببدل → بدل)',
        'Present tense markers ي/ت/ن/أ (يبدل → بدل)',
        'Plural suffixes ون/ين (مستخدمون → مستخدم)',
        'Diacritics normalization (بدّل = بدل)',
      ],
      integratedWithTokenizer: true,
      confidenceThreshold: 0.7,
    },
    profileKeywords: [
      'بدل', 'أضف', 'أزل', 'ضع', 'اضبط', 'أظهر', 'أخف',
      'ألحق', 'سبق', 'زد', 'أنقص', 'انتظر', 'جلب',
      'اذهب', 'تشغيل', 'أرسل', 'سجل',
    ],
    tokenizerKeywords: [
      'بدّل', 'بدل', 'غيّر', 'غير',
      'أضف', 'إضافة', 'أزل', 'إزالة',
      'ضع', 'اضبط', 'عيّن',
      'أظهر', 'إظهار', 'أخف', 'إخفاء',
      'زد', 'زيادة', 'أنقص', 'إنقاص',
      'انتظر', 'جلب', 'اذهب',
      'تشغيل', 'أطلق', 'أرسل', 'سجل',
      'ألحق', 'سبق',
    ],
    missingFromTokenizer: [], // Check and update as needed
    potentialConflicts: [],
  },
  {
    code: 'es',
    name: 'Spanish',
    wordOrder: 'SVO',
    direction: 'ltr',
    files: {
      languageProfile: true,
      tokenizer: true,
      tokenizerRegistered: true,
      morphologicalNormalizer: true,
      eventHandlerPatterns: true,
      tests: true,
      morphologyTests: true,
    },
    morphology: {
      needed: true,
      reason: 'Spanish has verb conjugations and reflexive verb forms',
      inflectionTypes: [
        '-ar conjugations (alternando, alternado → alternar)',
        '-er conjugations (escondiendo → esconder)',
        '-ir conjugations (similar pattern)',
        'Reflexive verbs (mostrarse → mostrar)',
        'Reflexive pronouns (se muestra → mostrar)',
        'Imperative reflexive (muéstrate → mostrar)',
      ],
      integratedWithTokenizer: true,
      confidenceThreshold: 0.7,
    },
    profileKeywords: [
      'alternar', 'añadir', 'quitar', 'poner', 'establecer',
      'mostrar', 'ocultar', 'añadir', 'anteponer',
      'incrementar', 'decrementar', 'esperar', 'obtener',
      'ir', 'disparar', 'enviar', 'registrar',
    ],
    tokenizerKeywords: [
      'alternar', 'cambiar', 'toggle',
      'añadir', 'agregar', 'quitar', 'eliminar', 'remover',
      'poner', 'colocar', 'establecer', 'configurar',
      'obtener', 'mostrar', 'ocultar', 'esconder',
      'incrementar', 'aumentar', 'decrementar', 'disminuir',
      'esperar', 'enviar', 'disparar', 'activar',
      'llamar', 'devolver', 'registrar', 'log',
      'anteponer', 'preponer',
    ],
    missingFromTokenizer: [], // Check and update as needed
    potentialConflicts: [],
  },
  {
    code: 'tr',
    name: 'Turkish',
    wordOrder: 'SOV',
    direction: 'ltr',
    files: {
      languageProfile: true,
      tokenizer: true,
      tokenizerRegistered: true,
      morphologicalNormalizer: true,
      eventHandlerPatterns: false, // Uses generated patterns
      tests: true,
      morphologyTests: true,
    },
    morphology: {
      needed: true,
      reason: 'Turkish is highly agglutinative with vowel harmony',
      inflectionTypes: [
        'Vowel harmony (değiştir + iyor → değiştiriyor)',
        'Present continuous -iyor/-ıyor/-uyor/-üyor',
        'Past tense -di/-dı/-du/-dü',
        'Reported past -miş/-mış/-muş/-müş',
        'Person suffixes -im/-sin/-iz',
        'Negation -me/-ma',
        'Infinitive -mek/-mak',
      ],
      integratedWithTokenizer: true,
      confidenceThreshold: 0.7,
    },
    profileKeywords: [
      'değiştir', 'ekle', 'kaldır', 'koy', 'ayarla',
      'göster', 'gizle', 'ekle', 'öneekle',
      'artır', 'azalt', 'bekle', 'getir',
      'git', 'tetikle', 'gönder', 'kaydet',
    ],
    tokenizerKeywords: [
      'değiştir', 'değistir',
      'ekle', 'kaldır', 'sil',
      'koy', 'yerleştir', 'ayarla', 'belirle',
      'al', 'getir', 'göster', 'gizle', 'sakla',
      'artır', 'arttır', 'azalt', 'eksilt',
      'bekle', 'gönder', 'tetikle', 'ateşle',
      'çağır', 'döndür', 'kaydet', 'logla',
      'öneekle',
    ],
    missingFromTokenizer: [], // Check and update as needed
    potentialConflicts: [],
  },
  {
    code: 'zh',
    name: 'Chinese',
    wordOrder: 'SVO',
    direction: 'ltr',
    files: {
      languageProfile: true,
      tokenizer: true,
      tokenizerRegistered: true,
      morphologicalNormalizer: false,
      eventHandlerPatterns: false, // Uses generated patterns
      tests: true,
      morphologyTests: false,
    },
    morphology: {
      needed: false,
      reason: 'Chinese is isolating with no verb conjugation; keywords match base forms',
      inflectionTypes: [],
      integratedWithTokenizer: false,
      confidenceThreshold: 1.0,
    },
    profileKeywords: [
      '切换', '添加', '移除', '放置', '设置',
      '显示', '隐藏', '追加', '前置',
      '增加', '减少', '等待', '获取',
      '前往', '触发', '发送', '日志',
    ],
    tokenizerKeywords: [
      '切换', '添加', '加', '移除', '删除', '去掉',
      '放置', '放', '放入', '追加', '附加', '前置', '预置',
      '获取', '取得', '获得',
      '制作', '创建', '复制', '设置', '设定',
      '增加', '减少', '日志', '记录',
      '显示', '展示', '隐藏', '过渡',
      '当', '触发', '发送', '聚焦', '失焦',
      '前往', '跳转', '等待', '稳定',
    ],
    missingFromTokenizer: [], // All keywords now present
    potentialConflicts: [],
  },
];

/**
 * Documents the current state of command support.
 */
export const SUPPORTED_COMMANDS: CommandChecklist[] = [
  {
    action: 'toggle',
    schemaExists: true,
    wiredInPatterns: false,
    usesHandCraftedPatterns: true, // Hand-crafted in patterns/toggle.ts
    profileKeywordsIn: ['en', 'ja', 'ar', 'es', 'ko', 'tr', 'zh'],
    tokenizerKeywordsIn: ['en', 'ja', 'ar', 'es', 'ko', 'tr', 'zh'],
    missingTokenizerKeywordsIn: [],
    testsFor: ['en', 'ja', 'ar', 'es', 'ko', 'tr'],
  },
  {
    action: 'add',
    schemaExists: true,
    wiredInPatterns: true,
    usesHandCraftedPatterns: false,
    profileKeywordsIn: ['en', 'ja', 'ar', 'es', 'ko', 'tr', 'zh'],
    tokenizerKeywordsIn: ['en', 'ja', 'ar', 'es', 'ko', 'tr', 'zh'],
    missingTokenizerKeywordsIn: [],
    testsFor: ['en'],
  },
  {
    action: 'append',
    schemaExists: true,
    wiredInPatterns: true,
    usesHandCraftedPatterns: false,
    profileKeywordsIn: ['en', 'ja', 'ar', 'es', 'ko', 'tr', 'zh'],
    tokenizerKeywordsIn: ['en', 'ja', 'ar', 'es', 'ko', 'tr', 'zh'],
    missingTokenizerKeywordsIn: [],
    testsFor: ['en', 'ja', 'es', 'ar'],
  },
  {
    action: 'prepend',
    schemaExists: true,
    wiredInPatterns: true,
    usesHandCraftedPatterns: false,
    profileKeywordsIn: ['en', 'ja', 'ar', 'es', 'ko', 'tr', 'zh'],
    tokenizerKeywordsIn: ['en', 'ja', 'ar', 'es', 'ko', 'tr', 'zh'],
    missingTokenizerKeywordsIn: [],
    testsFor: ['en', 'ja', 'es'],
  },
  {
    action: 'trigger',
    schemaExists: true,
    wiredInPatterns: true,
    usesHandCraftedPatterns: false,
    profileKeywordsIn: ['en', 'ja', 'ar', 'es', 'ko', 'tr', 'zh'],
    tokenizerKeywordsIn: ['en', 'ja', 'ar', 'es', 'ko', 'tr', 'zh'],
    missingTokenizerKeywordsIn: [],
    testsFor: ['en', 'ja', 'es', 'ar'],
  },
  {
    action: 'set',
    schemaExists: true,
    wiredInPatterns: true,
    usesHandCraftedPatterns: false,
    profileKeywordsIn: ['en', 'ja', 'ar', 'es', 'ko', 'tr', 'zh'],
    tokenizerKeywordsIn: ['en', 'ja', 'ar', 'es', 'ko', 'tr', 'zh'],
    missingTokenizerKeywordsIn: [],
    testsFor: ['en', 'ja', 'es', 'ar', 'ko', 'tr'],
  },
  // ... add other commands as needed
];

// =============================================================================
// Process Documentation
// =============================================================================

/**
 * Step-by-step process for adding a new language.
 */
export const ADD_LANGUAGE_PROCESS = `
# Adding a New Language

## Step 1: Create Language Profile
File: packages/semantic/src/generators/language-profiles.ts

Add a new profile with:
- code: ISO 639-1 code (e.g., 'de' for German)
- name: Human-readable name
- wordOrder: 'SVO', 'SOV', or 'VSO'
- direction: 'ltr' or 'rtl'
- keywords: Map of command → { primary, alternatives, normalized }
- particles: Object marking case/role particles
- prepositions: Destination/source markers

## Step 2: Create Tokenizer
File: packages/semantic/src/tokenizers/{code}.ts

Copy structure from similar language tokenizer:
- Character classification functions (if non-Latin script)
- KEYWORDS map: native words → English normalized
- Particle detection
- Word extraction logic

## Step 3: Register Tokenizer
File: packages/semantic/src/tokenizers/index.ts

- Import tokenizer
- Add to tokenizers map
- Add to exports

## Step 4: Add Event Handler Patterns (if needed)
File: packages/semantic/src/patterns/event-handler.ts

If the language needs custom event handler syntax:
- Add pattern for standard event form
- Add pattern for source-filtered events
- Add event name translations

## Step 5: Add Tests
File: packages/semantic/test/official-examples.test.ts

Add tests for:
- Basic commands (toggle, add, put)
- Commands with targets
- Multilingual equivalents section
- AST equivalence tests

## Step 6: Update Documentation
File: packages/semantic/src/language-building-schema.ts

Add entry to SUPPORTED_LANGUAGES array.
`;

/**
 * Step-by-step process for adding a new command.
 */
export const ADD_COMMAND_PROCESS = `
# Adding a New Command

## Step 1: Define Command Schema
File: packages/semantic/src/generators/command-schemas.ts

Add schema with:
- action: command name
- description: what it does
- category: 'dom-class', 'dom-content', 'variable', etc.
- primaryRole: main semantic role
- roles: array of RoleSpec with:
  - role: semantic role name
  - description
  - required: boolean
  - expectedTypes: ['selector', 'literal', 'reference', 'expression']
  - default: optional default value
  - svoPosition/sovPosition: word order hints

## Step 2: Add Keywords to Language Profiles
File: packages/semantic/src/generators/language-profiles.ts

For EACH language profile, add:
\`\`\`typescript
{command}: {
  primary: 'native_word',
  alternatives: ['alt1', 'alt2'],
  normalized: 'command',
}
\`\`\`

## Step 3: Add Keywords to Tokenizers
Files: packages/semantic/src/tokenizers/{language}.ts

For EACH tokenizer's KEYWORDS map, add:
\`\`\`typescript
['native_word', 'command'],
['alternative1', 'command'],
['alternative2', 'command'],
\`\`\`

## Step 4: Wire Schema in Pattern Registry
File: packages/semantic/src/patterns/index.ts

- Import schema from generators
- Add to generatedPatterns array:
  \`...generatePatternsForCommand({command}Schema),\`

## Step 5: Add Tests
File: packages/semantic/test/official-examples.test.ts

Add tests for:
- English syntax
- Each supported language
- Edge cases (implicit targets, etc.)

## Step 6: Update Documentation
File: packages/semantic/src/language-building-schema.ts

Add entry to SUPPORTED_COMMANDS array.
`;
