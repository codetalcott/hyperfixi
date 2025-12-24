/**
 * Sync Translations Script
 *
 * Generates translations for all patterns in all 13 supported languages
 * using the @hyperfixi/semantic language profiles.
 *
 * Usage: npx tsx scripts/sync-translations.ts [--db-path <path>] [--dry-run]
 *
 * Options:
 *   --db-path <path>  Path to database file (default: ./data/patterns.db)
 *   --dry-run         Show what would be done without making changes
 */

import Database from 'better-sqlite3';
import { existsSync } from 'fs';
import { resolve } from 'path';

// =============================================================================
// Configuration
// =============================================================================

const DEFAULT_DB_PATH = resolve(__dirname, '../data/patterns.db');

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const dbPathIndex = args.indexOf('--db-path');
const dbPath = dbPathIndex >= 0 && args[dbPathIndex + 1] ? args[dbPathIndex + 1] : DEFAULT_DB_PATH;

// Supported languages with their word orders
const LANGUAGES: Record<string, { name: string; wordOrder: string }> = {
  en: { name: 'English', wordOrder: 'SVO' },
  es: { name: 'Spanish', wordOrder: 'SVO' },
  fr: { name: 'French', wordOrder: 'SVO' },
  pt: { name: 'Portuguese', wordOrder: 'SVO' },
  id: { name: 'Indonesian', wordOrder: 'SVO' },
  sw: { name: 'Swahili', wordOrder: 'SVO' },
  zh: { name: 'Chinese', wordOrder: 'SVO' },
  de: { name: 'German', wordOrder: 'V2' },
  ja: { name: 'Japanese', wordOrder: 'SOV' },
  ko: { name: 'Korean', wordOrder: 'SOV' },
  tr: { name: 'Turkish', wordOrder: 'SOV' },
  qu: { name: 'Quechua', wordOrder: 'SOV' },
  ar: { name: 'Arabic', wordOrder: 'VSO' },
};

// Keyword translations for each language
const KEYWORD_TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    on: 'on',
    toggle: 'toggle',
    add: 'add',
    remove: 'remove',
    show: 'show',
    hide: 'hide',
    set: 'set',
    put: 'put',
    wait: 'wait',
    send: 'send',
    trigger: 'trigger',
    fetch: 'fetch',
    increment: 'increment',
    decrement: 'decrement',
    log: 'log',
    transition: 'transition',
    then: 'then',
    to: 'to',
    from: 'from',
    into: 'into',
    click: 'click',
    load: 'load',
    me: 'me',
  },
  es: {
    on: 'al',
    toggle: 'alternar',
    add: 'agregar',
    remove: 'quitar',
    show: 'mostrar',
    hide: 'ocultar',
    set: 'establecer',
    put: 'poner',
    wait: 'esperar',
    send: 'enviar',
    trigger: 'disparar',
    fetch: 'obtener',
    increment: 'incrementar',
    decrement: 'decrementar',
    log: 'registrar',
    transition: 'transición',
    then: 'luego',
    to: 'a',
    from: 'de',
    into: 'en',
    click: 'clic',
    load: 'carga',
    me: 'yo',
  },
  fr: {
    on: 'au',
    toggle: 'basculer',
    add: 'ajouter',
    remove: 'supprimer',
    show: 'afficher',
    hide: 'cacher',
    set: 'définir',
    put: 'mettre',
    wait: 'attendre',
    send: 'envoyer',
    trigger: 'déclencher',
    fetch: 'récupérer',
    increment: 'incrémenter',
    decrement: 'décrémenter',
    log: 'enregistrer',
    transition: 'transition',
    then: 'puis',
    to: 'à',
    from: 'de',
    into: 'dans',
    click: 'clic',
    load: 'chargement',
    me: 'moi',
  },
  pt: {
    on: 'ao',
    toggle: 'alternar',
    add: 'adicionar',
    remove: 'remover',
    show: 'mostrar',
    hide: 'esconder',
    set: 'definir',
    put: 'colocar',
    wait: 'esperar',
    send: 'enviar',
    trigger: 'disparar',
    fetch: 'buscar',
    increment: 'incrementar',
    decrement: 'decrementar',
    log: 'registrar',
    transition: 'transição',
    then: 'então',
    to: 'para',
    from: 'de',
    into: 'em',
    click: 'clique',
    load: 'carregar',
    me: 'eu',
  },
  de: {
    on: 'bei',
    toggle: 'umschalten',
    add: 'hinzufügen',
    remove: 'entfernen',
    show: 'anzeigen',
    hide: 'verbergen',
    set: 'setzen',
    put: 'legen',
    wait: 'warten',
    send: 'senden',
    trigger: 'auslösen',
    fetch: 'abrufen',
    increment: 'erhöhen',
    decrement: 'verringern',
    log: 'protokollieren',
    transition: 'übergang',
    then: 'dann',
    to: 'zu',
    from: 'von',
    into: 'in',
    click: 'klick',
    load: 'laden',
    me: 'mich',
  },
  ja: {
    on: 'で',
    toggle: '切り替え',
    add: '追加',
    remove: '削除',
    show: '表示',
    hide: '非表示',
    set: '設定',
    put: '入れる',
    wait: '待つ',
    send: '送信',
    trigger: 'トリガー',
    fetch: '取得',
    increment: '増加',
    decrement: '減少',
    log: 'ログ',
    transition: 'トランジション',
    then: 'そして',
    to: 'に',
    from: 'から',
    into: 'に',
    click: 'クリック',
    load: 'ロード',
    me: '自分',
  },
  ko: {
    on: '때',
    toggle: '토글',
    add: '추가',
    remove: '제거',
    show: '표시',
    hide: '숨기기',
    set: '설정',
    put: '넣기',
    wait: '대기',
    send: '보내기',
    trigger: '트리거',
    fetch: '가져오기',
    increment: '증가',
    decrement: '감소',
    log: '로그',
    transition: '전환',
    then: '그리고',
    to: '에',
    from: '에서',
    into: '에',
    click: '클릭',
    load: '로드',
    me: '나',
  },
  zh: {
    on: '当',
    toggle: '切换',
    add: '添加',
    remove: '移除',
    show: '显示',
    hide: '隐藏',
    set: '设置',
    put: '放入',
    wait: '等待',
    send: '发送',
    trigger: '触发',
    fetch: '获取',
    increment: '增加',
    decrement: '减少',
    log: '记录',
    transition: '过渡',
    then: '然后',
    to: '到',
    from: '从',
    into: '到',
    click: '点击',
    load: '加载',
    me: '我',
  },
  ar: {
    on: 'عند',
    toggle: 'تبديل',
    add: 'أضف',
    remove: 'أزل',
    show: 'أظهر',
    hide: 'أخفِ',
    set: 'عيّن',
    put: 'ضع',
    wait: 'انتظر',
    send: 'أرسل',
    trigger: 'أطلق',
    fetch: 'اجلب',
    increment: 'زِد',
    decrement: 'أنقص',
    log: 'سجّل',
    transition: 'انتقال',
    then: 'ثم',
    to: 'إلى',
    from: 'من',
    into: 'في',
    click: 'النقر',
    load: 'التحميل',
    me: 'أنا',
  },
  tr: {
    on: 'de',
    toggle: 'değiştir',
    add: 'ekle',
    remove: 'kaldır',
    show: 'göster',
    hide: 'gizle',
    set: 'ayarla',
    put: 'koy',
    wait: 'bekle',
    send: 'gönder',
    trigger: 'tetikle',
    fetch: 'getir',
    increment: 'artır',
    decrement: 'azalt',
    log: 'kaydet',
    transition: 'geçiş',
    then: 'sonra',
    to: 'e',
    from: 'dan',
    into: 'e',
    click: 'tıklama',
    load: 'yükleme',
    me: 'ben',
  },
  id: {
    on: 'saat',
    toggle: 'alihkan',
    add: 'tambah',
    remove: 'hapus',
    show: 'tampilkan',
    hide: 'sembunyikan',
    set: 'atur',
    put: 'taruh',
    wait: 'tunggu',
    send: 'kirim',
    trigger: 'picu',
    fetch: 'ambil',
    increment: 'tambah',
    decrement: 'kurangi',
    log: 'catat',
    transition: 'transisi',
    then: 'lalu',
    to: 'ke',
    from: 'dari',
    into: 'ke',
    click: 'klik',
    load: 'muat',
    me: 'saya',
  },
  sw: {
    on: 'wakati',
    toggle: 'badilisha',
    add: 'ongeza',
    remove: 'ondoa',
    show: 'onyesha',
    hide: 'ficha',
    set: 'weka',
    put: 'weka',
    wait: 'subiri',
    send: 'tuma',
    trigger: 'anzisha',
    fetch: 'leta',
    increment: 'ongeza',
    decrement: 'punguza',
    log: 'rekodi',
    transition: 'mpito',
    then: 'kisha',
    to: 'kwa',
    from: 'kutoka',
    into: 'ndani',
    click: 'kubofya',
    load: 'pakia',
    me: 'mimi',
  },
  qu: {
    on: 'kaptinpi',
    toggle: 't\'ikray',
    add: 'yapay',
    remove: 'hurquy',
    show: 'rikuchiy',
    hide: 'pakay',
    set: 'churay',
    put: 'churay',
    wait: 'suyay',
    send: 'kachay',
    trigger: 'qallariy',
    fetch: 'apamuya',
    increment: 'yapay',
    decrement: 'pisiyachiy',
    log: 'qillqay',
    transition: 't\'ikray',
    then: 'chaymanta',
    to: 'man',
    from: 'manta',
    into: 'man',
    click: 'ñit\'iy',
    load: 'chaqnay',
    me: 'ñuqa',
  },
};

// =============================================================================
// Translation Logic
// =============================================================================

interface CodeExample {
  id: string;
  title: string;
  raw_code: string;
  description: string;
  feature: string;
}

/**
 * Generate a translated version of hyperscript code for a given language.
 * This is a simplified translation that replaces keywords.
 */
function translateHyperscript(code: string, language: string): string {
  if (language === 'en') {
    return code;
  }

  const translations = KEYWORD_TRANSLATIONS[language];
  if (!translations) {
    return code;
  }

  let translated = code;

  // Sort keywords by length (longest first) to avoid partial replacements
  const sortedKeywords = Object.entries(KEYWORD_TRANSLATIONS.en).sort(
    ([a], [b]) => b.length - a.length
  );

  for (const [enKeyword, _] of sortedKeywords) {
    const targetKeyword = translations[enKeyword];
    if (targetKeyword && targetKeyword !== enKeyword) {
      // Use word boundary regex for safe replacement
      const regex = new RegExp(`\\b${enKeyword}\\b`, 'gi');
      translated = translated.replace(regex, targetKeyword);
    }
  }

  return translated;
}

/**
 * Determine confidence level for a translation.
 */
function getConfidence(language: string): number {
  // English is always 1.0 (canonical)
  if (language === 'en') return 1.0;

  // Well-tested languages get higher confidence
  if (['es', 'ja', 'ko', 'zh', 'ar'].includes(language)) return 0.85;

  // Other languages are auto-generated
  return 0.7;
}

// =============================================================================
// Main
// =============================================================================

async function syncTranslations() {
  console.log('Syncing translations...');
  console.log(`Database path: ${dbPath}`);
  if (dryRun) {
    console.log('DRY RUN - no changes will be made\n');
  }

  // Check database exists
  if (!existsSync(dbPath)) {
    console.error(`Database not found: ${dbPath}`);
    console.error('Run: npx tsx scripts/init-db.ts --force');
    process.exit(1);
  }

  const db = new Database(dbPath);

  try {
    // Get all code examples
    const examples = db.prepare('SELECT * FROM code_examples').all() as CodeExample[];
    console.log(`Found ${examples.length} code examples\n`);

    // Prepare statements
    const checkExists = db.prepare(
      'SELECT id FROM pattern_translations WHERE code_example_id = ? AND language = ?'
    );
    const insertTranslation = db.prepare(`
      INSERT INTO pattern_translations (code_example_id, language, hyperscript, word_order, confidence, verified_parses, translation_method)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const updateTranslation = db.prepare(`
      UPDATE pattern_translations
      SET hyperscript = ?, word_order = ?, confidence = ?, translation_method = ?, updated_at = CURRENT_TIMESTAMP
      WHERE code_example_id = ? AND language = ?
    `);

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    // Generate translations for each example and language
    for (const example of examples) {
      for (const [langCode, langInfo] of Object.entries(LANGUAGES)) {
        const translated = translateHyperscript(example.raw_code, langCode);
        const confidence = getConfidence(langCode);
        const verifiedParses = langCode === 'en' ? 1 : 0;

        // Check if translation exists
        const existing = checkExists.get(example.id, langCode) as { id: number } | undefined;

        if (existing) {
          if (!dryRun) {
            updateTranslation.run(
              translated,
              langInfo.wordOrder,
              confidence,
              'auto-generated',
              example.id,
              langCode
            );
          }
          updated++;
        } else {
          if (!dryRun) {
            insertTranslation.run(
              example.id,
              langCode,
              translated,
              langInfo.wordOrder,
              confidence,
              verifiedParses,
              'auto-generated'
            );
          }
          inserted++;
        }
      }
    }

    // Print summary
    console.log('\nSync complete!');
    console.log(`  - Inserted: ${inserted}`);
    console.log(`  - Updated: ${updated}`);
    console.log(`  - Skipped: ${skipped}`);

    // Print stats
    const stats = db
      .prepare(
        `
      SELECT language, COUNT(*) as count, AVG(confidence) as avg_confidence
      FROM pattern_translations
      GROUP BY language
      ORDER BY language
    `
      )
      .all() as { language: string; count: number; avg_confidence: number }[];

    console.log('\nTranslations by language:');
    for (const row of stats) {
      console.log(
        `  ${row.language}: ${row.count} patterns (avg confidence: ${row.avg_confidence.toFixed(2)})`
      );
    }
  } finally {
    db.close();
  }
}

// Run
syncTranslations().catch(console.error);
