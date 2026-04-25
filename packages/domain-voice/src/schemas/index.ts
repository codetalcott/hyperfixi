import { defineCommand, defineRole } from '@lokascript/framework';
import type { CommandSchema } from '@lokascript/framework';

// =============================================================================
// navigate — Go to URL, page section, or ARIA landmark
//   EN: navigate to home / go to /settings
//   ES: navegar a inicio
//   JA: ホーム に 移動
//   AR: انتقل إلى الرئيسية
//   KO: 홈 으로 이동
//   ZH: 导航 到 首页
//   TR: ana-sayfa ya git
//   FR: naviguer vers accueil
// =============================================================================

export const navigateSchema = defineCommand({
  action: 'navigate',
  description: 'Navigate to a URL, page section, or ARIA landmark',
  category: 'navigation',
  primaryRole: 'destination',
  roles: [
    defineRole({
      role: 'destination',
      description: 'URL, page section, or ARIA landmark to navigate to',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 1,
      sovPosition: 1,
      markerOverride: {
        en: 'to',
        es: 'a',
        ja: 'に',
        ar: 'إلى',
        ko: '로',
        zh: '到',
        tr: 'ya',
        fr: 'vers',
      },
    }),
  ],
});

// =============================================================================
// click — Click an element by selector, text content, or ARIA label
//   EN: click the submit button / click #submit
//   ES: clic en enviar
//   JA: 送信ボタン を クリック
//   AR: انقر على إرسال
//   KO: 제출 을 클릭
//   ZH: 点击 提交
//   TR: gönder i tıkla
//   FR: cliquer sur envoyer
// =============================================================================

export const clickSchema = defineCommand({
  action: 'click',
  description: 'Click an element identified by selector, text content, or ARIA label',
  category: 'interaction',
  primaryRole: 'patient',
  roles: [
    defineRole({
      role: 'patient',
      description: 'The element to click',
      required: true,
      expectedTypes: ['expression', 'selector'],
      svoPosition: 1,
      sovPosition: 1,
      markerOverride: {
        ja: 'を',
        ko: '을',
        ar: 'على',
        fr: 'sur',
      },
    }),
  ],
});

// =============================================================================
// type — Type text into an input field
//   EN: type hello into search / type hello world
//   ES: escribir hola en búsqueda
//   JA: 検索 に こんにちは を 入力
//   AR: اكتب مرحبا في البحث
//   KO: 검색 에 안녕 을 입력
//   ZH: 输入 你好 到 搜索
//   TR: arama ya merhaba yaz
//   FR: taper bonjour dans recherche
// =============================================================================

export const typeSchema = defineCommand({
  action: 'type',
  description: 'Type text into an input field',
  category: 'interaction',
  primaryRole: 'patient',
  roles: [
    defineRole({
      role: 'patient',
      description: 'The text to type',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 2,
      sovPosition: 2,
      markerOverride: { ja: 'を', ko: '을' },
    }),
    defineRole({
      role: 'destination',
      description: 'The input field to type into',
      required: false,
      expectedTypes: ['expression', 'selector'],
      svoPosition: 1,
      sovPosition: 3,
      markerOverride: {
        en: 'into',
        es: 'en',
        ja: 'に',
        ar: 'في',
        ko: '에',
        zh: '到',
        tr: 'ya',
        fr: 'dans',
      },
    }),
  ],
});

// =============================================================================
// scroll — Scroll the page or element
//   EN: scroll down / scroll up by 500
//   ES: desplazar abajo
//   JA: 下 に スクロール
//   AR: تمرير لأسفل
//   KO: 아래 로 스크롤
//   ZH: 滚动 下
//   TR: aşağı kaydır
//   FR: défiler bas
// =============================================================================

export const scrollSchema = defineCommand({
  action: 'scroll',
  description: 'Scroll the page or a specific element',
  category: 'navigation',
  primaryRole: 'manner',
  roles: [
    defineRole({
      role: 'manner',
      description: 'Direction to scroll (up, down, left, right, top, bottom)',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 2,
      sovPosition: 2,
    }),
    defineRole({
      role: 'quantity',
      description: 'Amount to scroll (pixels or "page")',
      required: false,
      expectedTypes: ['expression'],
      svoPosition: 1,
      sovPosition: 1,
      markerOverride: {
        en: 'by',
        es: 'por',
        ja: 'だけ',
        ar: 'ب',
        ko: '만큼',
        zh: '幅',
        tr: 'kadar',
        fr: 'de',
      },
    }),
  ],
});

// =============================================================================
// read — Read element content aloud via TTS
//   EN: read the heading / read #article
//   ES: leer el título
//   JA: 見出し を 読む
//   AR: اقرأ العنوان
//   KO: 제목 을 읽기
//   ZH: 朗读 标题
//   TR: başlık oku
//   FR: lire le titre
// =============================================================================

export const readSchema = defineCommand({
  action: 'read',
  description: 'Read element content aloud using text-to-speech',
  category: 'accessibility',
  primaryRole: 'patient',
  roles: [
    defineRole({
      role: 'patient',
      description: 'The element whose content to read aloud',
      required: true,
      expectedTypes: ['expression', 'selector'],
      svoPosition: 1,
      sovPosition: 1,
      markerOverride: { ja: 'を', ko: '을' },
    }),
  ],
});

// =============================================================================
// zoom — Zoom the page in or out
//   EN: zoom in / zoom out / zoom reset
//   ES: zoom más / zoom menos
//   JA: ズーム イン / ズーム アウト
//   AR: تكبير / تصغير
//   KO: 확대 / 축소
//   ZH: 缩放 放大 / 缩放 缩小
//   TR: yakınlaş / uzaklaş
//   FR: zoomer / dézoomer
// =============================================================================

export const zoomSchema = defineCommand({
  action: 'zoom',
  description: 'Zoom the page in or out',
  category: 'accessibility',
  primaryRole: 'manner',
  roles: [
    defineRole({
      role: 'manner',
      description: 'Zoom direction (in, out, reset)',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 1,
      sovPosition: 1,
    }),
  ],
});

// =============================================================================
// select — Select text or an element
//   EN: select all / select the paragraph
//   ES: seleccionar todo
//   JA: 全て を 選択
//   AR: اختر الكل
//   KO: 전체 를 선택
//   ZH: 选择 全部
//   TR: hepsi seç
//   FR: sélectionner tout
// =============================================================================

export const selectSchema = defineCommand({
  action: 'select',
  description: 'Select text content or an element',
  category: 'interaction',
  primaryRole: 'patient',
  roles: [
    defineRole({
      role: 'patient',
      description: 'The element or text to select',
      required: true,
      expectedTypes: ['expression', 'selector'],
      svoPosition: 1,
      sovPosition: 1,
      markerOverride: { ja: 'を', ko: '를' },
    }),
  ],
});

// =============================================================================
// back — Navigate back in history
//   EN: back / go back
//   ES: atrás
//   JA: 戻る
//   AR: رجوع
//   KO: 뒤로
//   ZH: 返回
//   TR: geri
//   FR: retour
// =============================================================================

export const backSchema = defineCommand({
  action: 'back',
  description: 'Navigate to the previous page in history',
  category: 'navigation',
  primaryRole: 'quantity',
  roles: [
    defineRole({
      role: 'quantity',
      description: 'Number of pages to go back (default: 1)',
      required: false,
      expectedTypes: ['expression'],
      svoPosition: 1,
      sovPosition: 1,
    }),
  ],
});

// =============================================================================
// forward — Navigate forward in history
//   EN: forward
//   ES: adelante
//   JA: 進む
//   AR: تقدم
//   KO: 앞으로
//   ZH: 前进
//   TR: ileri
//   FR: avancer
// =============================================================================

export const forwardSchema = defineCommand({
  action: 'forward',
  description: 'Navigate to the next page in history',
  category: 'navigation',
  primaryRole: 'quantity',
  roles: [
    defineRole({
      role: 'quantity',
      description: 'Number of pages to go forward (default: 1)',
      required: false,
      expectedTypes: ['expression'],
      svoPosition: 1,
      sovPosition: 1,
    }),
  ],
});

// =============================================================================
// focus — Move keyboard focus to an element
//   EN: focus search / focus #email
//   ES: enfocar búsqueda
//   JA: 検索 に フォーカス
//   AR: ركّز على البحث
//   KO: 검색 에 포커스
//   ZH: 聚焦 搜索
//   TR: arama ya odakla
//   FR: focaliser recherche
// =============================================================================

export const focusSchema = defineCommand({
  action: 'focus',
  description: 'Move keyboard focus to an element',
  category: 'accessibility',
  primaryRole: 'patient',
  roles: [
    defineRole({
      role: 'patient',
      description: 'The element to focus',
      required: true,
      expectedTypes: ['expression', 'selector'],
      svoPosition: 1,
      sovPosition: 1,
      markerOverride: {
        ja: 'に',
        ko: '에',
        ar: 'على',
        tr: 'ya',
      },
    }),
  ],
});

// =============================================================================
// close — Close tab, dialog, or modal
//   EN: close / close dialog / close tab
//   ES: cerrar / cerrar diálogo
//   JA: 閉じる / ダイアログ を 閉じる
//   AR: أغلق / أغلق الحوار
//   KO: 닫기 / 대화상자 를 닫기
//   ZH: 关闭 / 关闭 对话框
//   TR: kapat / diyalog kapat
//   FR: fermer / fermer dialogue
// =============================================================================

export const closeSchema = defineCommand({
  action: 'close',
  description: 'Close the current tab, dialog, or modal',
  category: 'interaction',
  primaryRole: 'patient',
  roles: [
    defineRole({
      role: 'patient',
      description: 'What to close (tab, dialog, modal, menu)',
      required: false,
      expectedTypes: ['expression'],
      svoPosition: 1,
      sovPosition: 1,
      markerOverride: { ja: 'を', ko: '를' },
    }),
  ],
});

// =============================================================================
// open — Open a link, tab, or menu
//   EN: open settings / open #menu
//   ES: abrir configuración
//   JA: 設定 を 開く
//   AR: افتح الإعدادات
//   KO: 설정 을 열기
//   ZH: 打开 设置
//   TR: ayarlar aç
//   FR: ouvrir paramètres
// =============================================================================

export const openSchema = defineCommand({
  action: 'open',
  description: 'Open a link in a new tab, or open a menu/dropdown',
  category: 'interaction',
  primaryRole: 'patient',
  roles: [
    defineRole({
      role: 'patient',
      description: 'What to open (link, tab, menu, URL)',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 1,
      sovPosition: 1,
      markerOverride: { ja: 'を', ko: '을' },
    }),
  ],
});

// =============================================================================
// search — Search on page or via search form
//   EN: search hello / search hello in page
//   ES: buscar hola en página
//   JA: ページ で こんにちは を 検索
//   AR: ابحث عن مرحبا في الصفحة
//   KO: 페이지 에서 안녕 을 검색
//   ZH: 搜索 你好
//   TR: sayfa da merhaba ara
//   FR: chercher bonjour dans page
// =============================================================================

export const searchSchema = defineCommand({
  action: 'search',
  description: 'Search for text on the page or via a search form',
  category: 'interaction',
  primaryRole: 'patient',
  roles: [
    defineRole({
      role: 'patient',
      description: 'The search query text',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 2,
      sovPosition: 2,
      markerOverride: {
        ar: 'عن',
        ja: 'を',
        ko: '을',
      },
    }),
    defineRole({
      role: 'destination',
      description: 'Where to search (page, site, or search field)',
      required: false,
      expectedTypes: ['expression'],
      svoPosition: 1,
      sovPosition: 3,
      markerOverride: {
        en: 'in',
        es: 'en',
        ja: 'で',
        ar: 'في',
        ko: '에서',
        zh: '在',
        tr: 'da',
        fr: 'dans',
      },
    }),
  ],
});

// =============================================================================
// help — List available commands or get help
//   EN: help / help navigate
//   ES: ayuda / ayuda navegar
//   JA: ヘルプ / 移動 の ヘルプ
//   AR: مساعدة / مساعدة انتقل
//   KO: 도움말 / 이동 도움말
//   ZH: 帮助 / 导航 帮助
//   TR: yardım / git yardım
//   FR: aide / aide naviguer
// =============================================================================

export const helpSchema = defineCommand({
  action: 'help',
  description: 'List available voice commands or get help for a specific command',
  category: 'meta',
  primaryRole: 'patient',
  roles: [
    defineRole({
      role: 'patient',
      description: 'Specific command to get help for (optional)',
      required: false,
      expectedTypes: ['expression'],
      svoPosition: 1,
      sovPosition: 1,
    }),
  ],
});

// =============================================================================
// All Schemas
// =============================================================================

export const allSchemas: CommandSchema[] = [
  navigateSchema,
  clickSchema,
  typeSchema,
  scrollSchema,
  readSchema,
  zoomSchema,
  selectSchema,
  backSchema,
  forwardSchema,
  focusSchema,
  closeSchema,
  openSchema,
  searchSchema,
  helpSchema,
];
