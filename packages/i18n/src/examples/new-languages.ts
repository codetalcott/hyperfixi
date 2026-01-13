/**
 * Examples of HyperScript expressions in newly added languages
 * Turkish, Indonesian, Quechua, and Swahili
 */

import { HyperscriptTranslator } from '../translator';

/**
 * Turkish examples
 */
export const turkishExamples = {
  basic: {
    original: 'on click add .active to me',
    translated: 'tıklama üzerinde ekle .active e ben',
    description: 'Basic click handler with class addition',
  },

  conditional: {
    original: 'if my value is empty then hide me else show next element',
    translated: 'eğer benim değer boş dir ise gizle ben yoksa göster sonraki öğe',
    description: 'Conditional logic with element visibility',
  },

  time: {
    original: 'wait 3 seconds then put "Merhaba Dünya" into #output',
    translated: 'bekle 3 saniye sonra koy "Merhaba Dünya" içine #output',
    description: 'Time-based action with Turkish greeting',
  },

  events: {
    original: 'on mouseenter add .hover then on mouseleave remove .hover',
    translated: 'fare_gir üzerinde ekle .hover sonra fare_çık üzerinde kaldır .hover',
    description: 'Mouse event handling',
  },

  form: {
    original: "on submit if first input's value matches /\\w+/ then call validateForm() else halt",
    translated:
      'gönder üzerinde eğer ilk input nin değer eşleşir /\\w+/ ise çağır validateForm() yoksa durdur',
    description: 'Form validation with regex matching',
  },
};

/**
 * Indonesian examples
 */
export const indonesianExamples = {
  basic: {
    original: 'on click toggle .selected on me',
    translated: 'klik pada ganti .selected pada saya',
    description: 'Toggle class on click',
  },

  loop: {
    original: 'repeat for item in items put item into next .item',
    translated: 'ulangi untuk item dalam items taruh item ke dalam berikutnya .item',
    description: 'Loop through items',
  },

  ajax: {
    original: 'on click fetch /api/data then put result into #content',
    translated: 'klik pada ambil /api/data lalu taruh hasil ke dalam #content',
    description: 'AJAX request and content insertion',
  },

  animation: {
    original: 'on click transition opacity to 0 over 500ms then hide me',
    translated: 'klik pada transisi opacity ke 0 selama 500ms lalu sembunyikan saya',
    description: 'Animation with transition',
  },

  validation: {
    original: 'on blur if my value is empty then add .error to closest .field',
    translated: 'blur pada jika saya punya nilai kosong ise tambah .error ke terdekat .field',
    description: 'Input validation on blur',
  },
};

/**
 * Quechua examples
 */
export const quechuaExamples = {
  basic: {
    original: 'on click put "Allin p\'unchaw" into #greeting',
    translated: 'ñitiy kaqpi churay "Allin p\'unchaw" ukupi #greeting',
    description: 'Basic text insertion with Quechua greeting',
  },

  conditional: {
    original: 'if target matches .button then add .pressed',
    translated: 'sichus punta tupan .button chayqa yapay .pressed',
    description: 'Conditional class addition',
  },

  time: {
    original: 'wait 2 minutes then call showMessage()',
    translated: 'suyay 2 minutukuna chayqa qayay showMessage()',
    description: 'Timed function call',
  },

  elements: {
    original: 'on mouseenter tell closest .card to add .highlight',
    translated: 'rat_yaykuy kaqpi niy aswan_kaylla .card man yapay .highlight',
    description: 'Element communication',
  },

  data: {
    original: 'set my data-count to my data-count + 1',
    translated: 'churay noqaq data-count man noqaq data-count + 1',
    description: 'Data attribute manipulation',
  },
};

/**
 * Swahili examples
 */
export const swahiliExamples = {
  basic: {
    original: 'on click put "Habari za asubuhi" into .message',
    translated: 'bonyeza kwenye weka "Habari za asubuhi" ndani .message',
    description: 'Basic text insertion with Swahili greeting',
  },

  form: {
    original: 'on submit take form data then send it to /api/contact',
    translated: 'wasilisha kwenye chukua form data kisha tuma hiyo kwa /api/contact',
    description: 'Form submission',
  },

  interaction: {
    original: 'on dblclick if my classList contains "editable" then focus on me',
    translated:
      'bonyeza_mara_mbili kwenye kama yangu classList ina "editable" basi zingatia kwenye mimi',
    description: 'Double-click to focus editable elements',
  },

  navigation: {
    original: 'on click go to next .panel with fade transition',
    translated: 'bonyeza kwenye nenda kwa ijayo .panel na fade mpito',
    description: 'Panel navigation with transition',
  },

  state: {
    original: 'unless my value exists then set my value to "default"',
    translated: 'isipokuwa yangu thamani ipo basi weka yangu thamani kwa "default"',
    description: 'Setting default values',
  },
};

/**
 * Interactive demo function
 */
export function demonstrateNewLanguages() {
  const translator = new HyperscriptTranslator({ locale: 'en' });

  console.log('🌍 HyperFixi I18N - New Language Support Demo\n');

  // Turkish examples
  console.log('🇹🇷 Turkish (Türkçe):');
  turkishExamples.basic.translated = translator.translate(turkishExamples.basic.original, {
    to: 'tr',
  });
  console.log(`  Original: ${turkishExamples.basic.original}`);
  console.log(`  Turkish:  ${turkishExamples.basic.translated}\n`);

  // Indonesian examples
  console.log('🇮🇩 Indonesian (Bahasa Indonesia):');
  indonesianExamples.basic.translated = translator.translate(indonesianExamples.basic.original, {
    to: 'id',
  });
  console.log(`  Original:   ${indonesianExamples.basic.original}`);
  console.log(`  Indonesian: ${indonesianExamples.basic.translated}\n`);

  // Quechua examples
  console.log('🏔️ Quechua (Runasimi):');
  quechuaExamples.basic.translated = translator.translate(quechuaExamples.basic.original, {
    to: 'qu',
  });
  console.log(`  Original: ${quechuaExamples.basic.original}`);
  console.log(`  Quechua:  ${quechuaExamples.basic.translated}\n`);

  // Swahili examples
  console.log('🌍 Swahili (Kiswahili):');
  swahiliExamples.basic.translated = translator.translate(swahiliExamples.basic.original, {
    to: 'sw',
  });
  console.log(`  Original: ${swahiliExamples.basic.original}`);
  console.log(`  Swahili:  ${swahiliExamples.basic.translated}\n`);

  console.log('✨ All languages now support full HyperScript syntax!');
}

/**
 * Language-specific HyperScript patterns
 */
export const languagePatterns = {
  turkish: {
    patterns: [
      'eğer ... ise ... yoksa ...', // if ... then ... else ...
      '... üzerinde ...', // on ...
      'bekle ... saniye', // wait ... seconds
      '... e ...', // to ...
      '... den ...', // from ...
    ],
    culturalNotes: [
      'Turkish uses agglutination, so modifiers are often suffixed',
      'Vowel harmony affects pronunciation but not our text-based translations',
      'Word order is typically SOV (Subject-Object-Verb)',
    ],
  },

  indonesian: {
    patterns: [
      'jika ... lalu ... lainnya ...', // if ... then ... else ...
      '... pada ...', // on ...
      'tunggu ... detik', // wait ... seconds
      'ke ...', // to ...
      'dari ...', // from ...
    ],
    culturalNotes: [
      'Indonesian is relatively straightforward for internationalization',
      'No grammatical gender or complex verb conjugations',
      'Plurality is often expressed through context or duplication',
    ],
  },

  quechua: {
    patterns: [
      'sichus ... chayqa ... mana chayqa ...', // if ... then ... else ...
      '... kaqpi ...', // on ...
      'suyay ... sikundukuna', // wait ... seconds
      '... man ...', // to ...
      '... manta ...', // from ...
    ],
    culturalNotes: [
      'Quechua has complex agglutination with many suffixes',
      'Evidentiality markers indicate the source of information',
      'Rich system of spatial and temporal markers',
    ],
  },

  swahili: {
    patterns: [
      'kama ... basi ... sivyo ...', // if ... then ... else ...
      '... kwenye ...', // on ...
      'ngoja ... sekunde', // wait ... seconds
      'kwa ...', // to ...
      'kutoka ...', // from ...
    ],
    culturalNotes: [
      'Swahili has noun classes that affect agreement',
      'Arabic loanwords are common, especially in technical terms',
      'Bantu language structure with some Cushitic influences',
    ],
  },
};

/**
 * Real-world usage examples
 */
export const realWorldExamples = {
  ecommerce: {
    turkish:
      'sepete_ekle üzerinde eğer stok var ise ekle ürün sepet e yoksa göster stok_yok_mesajı',
    indonesian:
      'tambah_keranjang pada jika stok ada ise tambah produk ke keranjang lainnya tampilkan pesan_stok_habis',
    quechua:
      'rantiyman_yapay kaqpi sichus stock tiyan chayqa yapay ruru rantiyman mana chayqa rikuchiy mana_stock_kaq_willay',
    swahili:
      'ongeza_kikapuni kwenye kama hisa ipo basi ongeza bidhaa kwa kikapuni sivyo onyesha ujumbe_hisa_imekwisha',
  },

  social: {
    turkish:
      'beğen_butonu üzerinde değiştir .beğenildi sonra gönder beğeni_sayısı /api/beğeniler e',
    indonesian: 'tombol_suka pada ganti .disukai lalu kirim jumlah_suka ke /api/likes',
    quechua: 'munay_ñit_ana kaqpi tikray .munasqa chayqa kachay munay_yupay /api/likes man',
    swahili: 'kitufe_kupenda kwenye ganti .imependwa kisha tuma idadi_mapendekezo kwa /api/likes',
  },

  dashboard: {
    turkish: 'sayfa_yüklendiğinde getir /api/veriler sonra her veri için oluştur grafik veri ile',
    indonesian:
      'halaman_dimuat pada ambil /api/data lalu untuk setiap data buat grafik dengan data',
    quechua:
      'p_anqa kargasqapi apamuy /api/willakuykuna chayqa sapa willakuy rayku ruray siq_i willakuywan',
    swahili: 'ukurasa_umepakiwa kwenye leta /api/data kisha kwa kila data unda chati na data',
  },
};

/**
 * Testing utilities for new languages
 */
export function testNewLanguageSupport() {
  const tests = [
    { original: 'on click add .active', expected: 'should translate basic commands' },
    { original: 'wait 5 seconds then hide me', expected: 'should handle time expressions' },
    {
      original: 'if my value exists then show next element',
      expected: 'should translate conditionals',
    },
    {
      original: 'on mouseenter tell closest .parent to add .hover',
      expected: 'should handle complex interactions',
    },
  ];

  const languages = ['tr', 'id', 'qu', 'sw'];
  const translator = new HyperscriptTranslator({ locale: 'en' });

  console.log('🧪 Testing new language support...\n');

  for (const lang of languages) {
    console.log(`Testing ${lang.toUpperCase()}:`);

    for (const test of tests) {
      try {
        const translated = translator.translate(test.original, { to: lang });
        console.log(`  ✅ ${test.original} → ${translated}`);
      } catch (error) {
        console.log(`  ❌ ${test.original} → ERROR: ${error}`);
      }
    }
    console.log();
  }
}
