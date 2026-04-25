/**
 * Voice/Accessibility Domain Tests
 *
 * Validates the multilingual voice DSL across 8 languages (EN, ES, JA, AR, KO, ZH, TR, FR)
 * covering SVO, SOV, and VSO word orders, with role value verification,
 * compilation output assertions (executable JS), renderer round-trips,
 * alternative keywords, and edge cases.
 *
 * ~180 tests covering:
 * - Language support (8 languages)
 * - Per-language parse tests (8 languages × key commands)
 * - English alternative keywords (go, press, tap, enter, say, find)
 * - Spanish alternative keywords (ir, pulsar, volver)
 * - French alternative keywords (aller, écrire, rechercher)
 * - Cross-language semantic equivalence
 * - Compilation to executable JS
 * - Renderer round-trips (8 languages)
 * - Error handling
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createVoiceDSL, renderVoice, toVoiceActionSpec, voiceCodeGenerator } from '../index';
import type { MultilingualDSL } from '@lokascript/framework';
import { extractRoleValue } from '@lokascript/framework';

describe('Voice Domain', () => {
  let voice: MultilingualDSL;

  beforeAll(() => {
    voice = createVoiceDSL();
  });

  // ===========================================================================
  // Language Support
  // ===========================================================================

  describe('Language Support', () => {
    it('should support 8 languages', () => {
      const langs = voice.getSupportedLanguages();
      expect(langs).toContain('en');
      expect(langs).toContain('es');
      expect(langs).toContain('ja');
      expect(langs).toContain('ar');
      expect(langs).toContain('ko');
      expect(langs).toContain('zh');
      expect(langs).toContain('tr');
      expect(langs).toContain('fr');
      expect(langs).toHaveLength(8);
    });

    it('should reject unsupported language', () => {
      expect(() => voice.parse('click submit', 'de')).toThrow();
    });
  });

  // ===========================================================================
  // English (SVO)
  // ===========================================================================

  describe('English (SVO)', () => {
    // navigate
    it('parses "navigate to home"', () => {
      const result = voice.parse('navigate to home', 'en');
      expect(result.action).toBe('navigate');
      expect(extractRoleValue(result, 'destination')).toBe('home');
    });

    it('parses "navigate to settings"', () => {
      const result = voice.parse('navigate to settings', 'en');
      expect(result.action).toBe('navigate');
      expect(extractRoleValue(result, 'destination')).toBe('settings');
    });

    // click
    it('parses "click submit"', () => {
      const result = voice.parse('click submit', 'en');
      expect(result.action).toBe('click');
      expect(extractRoleValue(result, 'patient')).toBe('submit');
    });

    it('parses "click #login-btn"', () => {
      const result = voice.parse('click #login-btn', 'en');
      expect(result.action).toBe('click');
      expect(extractRoleValue(result, 'patient')).toBe('#login-btn');
    });

    // type
    it('parses "type hello"', () => {
      const result = voice.parse('type hello', 'en');
      expect(result.action).toBe('type');
      expect(extractRoleValue(result, 'patient')).toBe('hello');
    });

    it('parses "type hello into #search"', () => {
      const result = voice.parse('type hello into #search', 'en');
      expect(result.action).toBe('type');
      expect(extractRoleValue(result, 'patient')).toBe('hello');
      expect(extractRoleValue(result, 'destination')).toBe('#search');
    });

    // scroll
    it('parses "scroll down"', () => {
      const result = voice.parse('scroll down', 'en');
      expect(result.action).toBe('scroll');
      expect(extractRoleValue(result, 'manner')).toBe('down');
    });

    it('parses "scroll up"', () => {
      const result = voice.parse('scroll up', 'en');
      expect(result.action).toBe('scroll');
      expect(extractRoleValue(result, 'manner')).toBe('up');
    });

    // read
    it('parses "read #article"', () => {
      const result = voice.parse('read #article', 'en');
      expect(result.action).toBe('read');
      expect(extractRoleValue(result, 'patient')).toBe('#article');
    });

    // zoom
    it('parses "zoom in"', () => {
      const result = voice.parse('zoom in', 'en');
      expect(result.action).toBe('zoom');
      expect(extractRoleValue(result, 'manner')).toBe('in');
    });

    it('parses "zoom out"', () => {
      const result = voice.parse('zoom out', 'en');
      expect(result.action).toBe('zoom');
      expect(extractRoleValue(result, 'manner')).toBe('out');
    });

    // select
    it('parses "select all"', () => {
      const result = voice.parse('select all', 'en');
      expect(result.action).toBe('select');
      expect(extractRoleValue(result, 'patient')).toBe('all');
    });

    // back / forward
    it('parses "back"', () => {
      const result = voice.parse('back', 'en');
      expect(result.action).toBe('back');
    });

    it('parses "forward"', () => {
      const result = voice.parse('forward', 'en');
      expect(result.action).toBe('forward');
    });

    // focus
    it('parses "focus #username"', () => {
      const result = voice.parse('focus #username', 'en');
      expect(result.action).toBe('focus');
      expect(extractRoleValue(result, 'patient')).toBe('#username');
    });

    // close
    it('parses "close tab"', () => {
      const result = voice.parse('close tab', 'en');
      expect(result.action).toBe('close');
      expect(extractRoleValue(result, 'patient')).toBe('tab');
    });

    it('parses "close dialog"', () => {
      const result = voice.parse('close dialog', 'en');
      expect(result.action).toBe('close');
      expect(extractRoleValue(result, 'patient')).toBe('dialog');
    });

    // open
    it('parses "open settings"', () => {
      const result = voice.parse('open settings', 'en');
      expect(result.action).toBe('open');
      expect(extractRoleValue(result, 'patient')).toBe('settings');
    });

    // search
    it('parses "search hello"', () => {
      const result = voice.parse('search hello', 'en');
      expect(result.action).toBe('search');
      expect(extractRoleValue(result, 'patient')).toBe('hello');
    });

    it('parses "search hello in page"', () => {
      const result = voice.parse('search hello in page', 'en');
      expect(result.action).toBe('search');
      expect(extractRoleValue(result, 'patient')).toBe('hello');
      expect(extractRoleValue(result, 'destination')).toBe('page');
    });

    // help
    it('parses "help"', () => {
      const result = voice.parse('help', 'en');
      expect(result.action).toBe('help');
    });

    it('parses "help navigate"', () => {
      const result = voice.parse('help navigate', 'en');
      expect(result.action).toBe('help');
      expect(extractRoleValue(result, 'patient')).toBe('navigate');
    });

    // validation
    it('validates correct input', () => {
      const result = voice.validate('click submit', 'en');
      expect(result.valid).toBe(true);
    });

    // compilation
    it('compiles "click submit" to JS with click', () => {
      const result = voice.compile('click submit', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('.click()');
    });

    it('compiles "navigate to /home" to JS with location', () => {
      const result = voice.compile('navigate to /home', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('window.location.href');
    });

    it('compiles "scroll down" to JS with scrollBy', () => {
      const result = voice.compile('scroll down', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('scrollBy');
    });

    it('compiles "back" to JS with history.go', () => {
      const result = voice.compile('back', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('history.go');
    });

    it('compiles "read #article" to JS with SpeechSynthesis', () => {
      const result = voice.compile('read #article', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('SpeechSynthesisUtterance');
    });

    it('compiles "zoom in" to JS with body.style.zoom', () => {
      const result = voice.compile('zoom in', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('zoom');
    });

    it('compiles "close tab" to JS with window.close', () => {
      const result = voice.compile('close tab', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('window.close');
    });

    it('compiles "open /new-page" to JS with window.open', () => {
      const result = voice.compile('open /new-page', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('window.open');
    });

    it('compiles "search hello" to JS with searchInput', () => {
      const result = voice.compile('search hello', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('searchInput');
    });

    it('compiles "forward" to JS with history.go', () => {
      const result = voice.compile('forward', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('history.go');
    });

    it('compiles "focus #username" to JS with .focus()', () => {
      const result = voice.compile('focus #username', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('.focus()');
    });

    it('compiles "select all" to JS with Range selection', () => {
      const result = voice.compile('select all', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('selectNodeContents');
    });

    it('compiles "type hello into #search" to JS with value', () => {
      const result = voice.compile('type hello into #search', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('value');
      expect(result.code).toContain('input');
    });

    it('compiles "help" to JS with console.log', () => {
      const result = voice.compile('help', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('console.log');
    });
  });

  // ===========================================================================
  // English Alternative Keywords
  // ===========================================================================

  describe('English alternative keywords', () => {
    it('parses "go" as navigate', () => {
      const result = voice.parse('go to home', 'en');
      expect(result.action).toBe('navigate');
    });

    it('parses "press" as click', () => {
      const result = voice.parse('press submit', 'en');
      expect(result.action).toBe('click');
    });

    it('parses "tap" as click', () => {
      const result = voice.parse('tap submit', 'en');
      expect(result.action).toBe('click');
    });

    it('parses "enter" as type', () => {
      const result = voice.parse('enter hello', 'en');
      expect(result.action).toBe('type');
    });

    it('parses "say" as read', () => {
      const result = voice.parse('say #article', 'en');
      expect(result.action).toBe('read');
    });

    it('parses "find" as search', () => {
      const result = voice.parse('find hello', 'en');
      expect(result.action).toBe('search');
    });
  });

  // ===========================================================================
  // Spanish (SVO)
  // ===========================================================================

  describe('Spanish (SVO)', () => {
    it('parses "navegar a inicio"', () => {
      const result = voice.parse('navegar a inicio', 'es');
      expect(result.action).toBe('navigate');
      expect(extractRoleValue(result, 'destination')).toBe('inicio');
    });

    it('parses "clic enviar"', () => {
      const result = voice.parse('clic enviar', 'es');
      expect(result.action).toBe('click');
      expect(extractRoleValue(result, 'patient')).toBe('enviar');
    });

    it('parses "escribir hola"', () => {
      const result = voice.parse('escribir hola', 'es');
      expect(result.action).toBe('type');
      expect(extractRoleValue(result, 'patient')).toBe('hola');
    });

    it('parses "desplazar abajo"', () => {
      const result = voice.parse('desplazar abajo', 'es');
      expect(result.action).toBe('scroll');
      expect(extractRoleValue(result, 'manner')).toBe('abajo');
    });

    it('parses "leer #articulo"', () => {
      const result = voice.parse('leer #articulo', 'es');
      expect(result.action).toBe('read');
      expect(extractRoleValue(result, 'patient')).toBe('#articulo');
    });

    it('parses "seleccionar todo"', () => {
      const result = voice.parse('seleccionar todo', 'es');
      expect(result.action).toBe('select');
    });

    it('parses "cerrar pestaña"', () => {
      const result = voice.parse('cerrar pestaña', 'es');
      expect(result.action).toBe('close');
    });

    it('parses "abrir configuración"', () => {
      const result = voice.parse('abrir configuración', 'es');
      expect(result.action).toBe('open');
    });

    it('parses "buscar hola"', () => {
      const result = voice.parse('buscar hola', 'es');
      expect(result.action).toBe('search');
    });

    it('parses "atrás"', () => {
      const result = voice.parse('atrás', 'es');
      expect(result.action).toBe('back');
    });

    it('parses "adelante"', () => {
      const result = voice.parse('adelante', 'es');
      expect(result.action).toBe('forward');
    });

    it('parses "ayuda"', () => {
      const result = voice.parse('ayuda', 'es');
      expect(result.action).toBe('help');
    });

    it('compiles "clic enviar" to JS', () => {
      const result = voice.compile('clic enviar', 'es');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('.click()');
    });
  });

  // ===========================================================================
  // Spanish Alternative Keywords
  // ===========================================================================

  describe('Spanish alternative keywords', () => {
    it('parses "ir" as navigate', () => {
      const result = voice.parse('ir a inicio', 'es');
      expect(result.action).toBe('navigate');
    });

    it('parses "pulsar" as click', () => {
      const result = voice.parse('pulsar enviar', 'es');
      expect(result.action).toBe('click');
    });

    it('parses "volver" as back', () => {
      const result = voice.parse('volver', 'es');
      expect(result.action).toBe('back');
    });
  });

  // ===========================================================================
  // Japanese (SOV)
  // ===========================================================================

  describe('Japanese (SOV)', () => {
    it('parses "ホーム に 移動" (navigate to home)', () => {
      const result = voice.parse('ホーム に 移動', 'ja');
      expect(result.action).toBe('navigate');
    });

    it('parses "送信 を クリック" (click submit)', () => {
      const result = voice.parse('送信 を クリック', 'ja');
      expect(result.action).toBe('click');
    });

    it('parses "こんにちは を 入力" (type hello)', () => {
      const result = voice.parse('こんにちは を 入力', 'ja');
      expect(result.action).toBe('type');
    });

    it('parses "下 スクロール" (scroll down)', () => {
      const result = voice.parse('下 スクロール', 'ja');
      expect(result.action).toBe('scroll');
    });

    it('parses "記事 を 読む" (read article)', () => {
      const result = voice.parse('記事 を 読む', 'ja');
      expect(result.action).toBe('read');
    });

    it('parses "拡大 ズーム" (zoom in)', () => {
      const result = voice.parse('拡大 ズーム', 'ja');
      expect(result.action).toBe('zoom');
    });

    it('parses "全て を 選択" (select all)', () => {
      const result = voice.parse('全て を 選択', 'ja');
      expect(result.action).toBe('select');
    });

    it('parses "戻る" (back)', () => {
      const result = voice.parse('戻る', 'ja');
      expect(result.action).toBe('back');
    });

    it('parses "進む" (forward)', () => {
      const result = voice.parse('進む', 'ja');
      expect(result.action).toBe('forward');
    });

    it('parses "タブ を 閉じる" (close tab)', () => {
      const result = voice.parse('タブ を 閉じる', 'ja');
      expect(result.action).toBe('close');
    });

    it('parses "設定 を 開く" (open settings)', () => {
      const result = voice.parse('設定 を 開く', 'ja');
      expect(result.action).toBe('open');
    });

    it('parses "こんにちは を 検索" (search hello)', () => {
      const result = voice.parse('こんにちは を 検索', 'ja');
      expect(result.action).toBe('search');
    });

    it('parses "ヘルプ" (help)', () => {
      const result = voice.parse('ヘルプ', 'ja');
      expect(result.action).toBe('help');
    });

    it('compiles "送信 を クリック" to JS', () => {
      const result = voice.compile('送信 を クリック', 'ja');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('.click()');
    });
  });

  // ===========================================================================
  // Arabic (VSO)
  // ===========================================================================

  describe('Arabic (VSO)', () => {
    it('parses "انتقل إلى الرئيسية" (navigate to home)', () => {
      const result = voice.parse('انتقل إلى الرئيسية', 'ar');
      expect(result.action).toBe('navigate');
    });

    it('parses "انقر على إرسال" (click submit)', () => {
      const result = voice.parse('انقر على إرسال', 'ar');
      expect(result.action).toBe('click');
    });

    it('parses "اكتب مرحبا" (type hello)', () => {
      const result = voice.parse('اكتب مرحبا', 'ar');
      expect(result.action).toBe('type');
    });

    it('parses "تمرير أسفل" (scroll down)', () => {
      const result = voice.parse('تمرير أسفل', 'ar');
      expect(result.action).toBe('scroll');
    });

    it('parses "اقرأ #مقال" (read article)', () => {
      const result = voice.parse('اقرأ #مقال', 'ar');
      expect(result.action).toBe('read');
    });

    it('parses "أغلق الحوار" (close dialog)', () => {
      const result = voice.parse('أغلق الحوار', 'ar');
      expect(result.action).toBe('close');
    });

    it('parses "افتح إعدادات" (open settings)', () => {
      const result = voice.parse('افتح إعدادات', 'ar');
      expect(result.action).toBe('open');
    });

    it('parses "ابحث عن مرحبا" (search hello)', () => {
      const result = voice.parse('ابحث عن مرحبا', 'ar');
      expect(result.action).toBe('search');
    });

    it('parses "رجوع" (back)', () => {
      const result = voice.parse('رجوع', 'ar');
      expect(result.action).toBe('back');
    });

    it('parses "تقدم" (forward)', () => {
      const result = voice.parse('تقدم', 'ar');
      expect(result.action).toBe('forward');
    });

    it('parses "مساعدة" (help)', () => {
      const result = voice.parse('مساعدة', 'ar');
      expect(result.action).toBe('help');
    });

    it('compiles "انقر على إرسال" to JS', () => {
      const result = voice.compile('انقر على إرسال', 'ar');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('.click()');
    });
  });

  // ===========================================================================
  // Korean (SOV)
  // ===========================================================================

  describe('Korean (SOV)', () => {
    it('parses "홈 로 이동" (navigate to home)', () => {
      const result = voice.parse('홈 로 이동', 'ko');
      expect(result.action).toBe('navigate');
    });

    it('parses "제출 을 클릭" (click submit)', () => {
      const result = voice.parse('제출 을 클릭', 'ko');
      expect(result.action).toBe('click');
    });

    it('parses "안녕 을 입력" (type hello)', () => {
      const result = voice.parse('안녕 을 입력', 'ko');
      expect(result.action).toBe('type');
    });

    it('parses "아래 스크롤" (scroll down)', () => {
      const result = voice.parse('아래 스크롤', 'ko');
      expect(result.action).toBe('scroll');
    });

    it('parses "기사 을 읽기" (read article)', () => {
      const result = voice.parse('기사 을 읽기', 'ko');
      expect(result.action).toBe('read');
    });

    it('parses "전체 를 선택" (select all)', () => {
      const result = voice.parse('전체 를 선택', 'ko');
      expect(result.action).toBe('select');
    });

    it('parses "탭 를 닫기" (close tab)', () => {
      const result = voice.parse('탭 를 닫기', 'ko');
      expect(result.action).toBe('close');
    });

    it('parses "설정 을 열기" (open settings)', () => {
      const result = voice.parse('설정 을 열기', 'ko');
      expect(result.action).toBe('open');
    });

    it('parses "뒤로" (back)', () => {
      const result = voice.parse('뒤로', 'ko');
      expect(result.action).toBe('back');
    });

    it('parses "앞으로" (forward)', () => {
      const result = voice.parse('앞으로', 'ko');
      expect(result.action).toBe('forward');
    });

    it('parses "도움말" (help)', () => {
      const result = voice.parse('도움말', 'ko');
      expect(result.action).toBe('help');
    });

    it('compiles "제출 을 클릭" to JS', () => {
      const result = voice.compile('제출 을 클릭', 'ko');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('.click()');
    });
  });

  // ===========================================================================
  // Chinese (SVO)
  // ===========================================================================

  describe('Chinese (SVO)', () => {
    it('parses "导航 到 首页" (navigate to home)', () => {
      const result = voice.parse('导航 到 首页', 'zh');
      expect(result.action).toBe('navigate');
    });

    it('parses "点击 提交" (click submit)', () => {
      const result = voice.parse('点击 提交', 'zh');
      expect(result.action).toBe('click');
    });

    it('parses "输入 你好" (type hello)', () => {
      const result = voice.parse('输入 你好', 'zh');
      expect(result.action).toBe('type');
    });

    it('parses "滚动 下" (scroll down)', () => {
      const result = voice.parse('滚动 下', 'zh');
      expect(result.action).toBe('scroll');
    });

    it('parses "朗读 #文章" (read article)', () => {
      const result = voice.parse('朗读 #文章', 'zh');
      expect(result.action).toBe('read');
    });

    it('parses "选择 全部" (select all)', () => {
      const result = voice.parse('选择 全部', 'zh');
      expect(result.action).toBe('select');
    });

    it('parses "关闭 标签" (close tab)', () => {
      const result = voice.parse('关闭 标签', 'zh');
      expect(result.action).toBe('close');
    });

    it('parses "打开 设置" (open settings)', () => {
      const result = voice.parse('打开 设置', 'zh');
      expect(result.action).toBe('open');
    });

    it('parses "搜索 你好" (search hello)', () => {
      const result = voice.parse('搜索 你好', 'zh');
      expect(result.action).toBe('search');
    });

    it('parses "返回" (back)', () => {
      const result = voice.parse('返回', 'zh');
      expect(result.action).toBe('back');
    });

    it('parses "前进" (forward)', () => {
      const result = voice.parse('前进', 'zh');
      expect(result.action).toBe('forward');
    });

    it('parses "帮助" (help)', () => {
      const result = voice.parse('帮助', 'zh');
      expect(result.action).toBe('help');
    });

    it('compiles "点击 提交" to JS', () => {
      const result = voice.compile('点击 提交', 'zh');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('.click()');
    });
  });

  // ===========================================================================
  // Turkish (SOV)
  // ===========================================================================

  describe('Turkish (SOV)', () => {
    it('parses "ana-sayfa ya git" (navigate to home)', () => {
      const result = voice.parse('ana-sayfa ya git', 'tr');
      expect(result.action).toBe('navigate');
    });

    it('parses "gönder tıkla" (click submit)', () => {
      const result = voice.parse('gönder tıkla', 'tr');
      expect(result.action).toBe('click');
    });

    it('parses "merhaba yaz" (type hello)', () => {
      const result = voice.parse('merhaba yaz', 'tr');
      expect(result.action).toBe('type');
    });

    it('parses "aşağı kaydır" (scroll down)', () => {
      const result = voice.parse('aşağı kaydır', 'tr');
      expect(result.action).toBe('scroll');
    });

    it('parses "makale oku" (read article)', () => {
      const result = voice.parse('makale oku', 'tr');
      expect(result.action).toBe('read');
    });

    it('parses "sekme kapat" (close tab)', () => {
      const result = voice.parse('sekme kapat', 'tr');
      expect(result.action).toBe('close');
    });

    it('parses "ayarlar aç" (open settings)', () => {
      const result = voice.parse('ayarlar aç', 'tr');
      expect(result.action).toBe('open');
    });

    it('parses "merhaba ara" (search hello)', () => {
      const result = voice.parse('merhaba ara', 'tr');
      expect(result.action).toBe('search');
    });

    it('parses "geri" (back)', () => {
      const result = voice.parse('geri', 'tr');
      expect(result.action).toBe('back');
    });

    it('parses "ileri" (forward)', () => {
      const result = voice.parse('ileri', 'tr');
      expect(result.action).toBe('forward');
    });

    it('parses "yardım" (help)', () => {
      const result = voice.parse('yardım', 'tr');
      expect(result.action).toBe('help');
    });

    it('compiles "gönder tıkla" to JS', () => {
      const result = voice.compile('gönder tıkla', 'tr');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('.click()');
    });
  });

  // ===========================================================================
  // French (SVO)
  // ===========================================================================

  describe('French (SVO)', () => {
    it('parses "naviguer vers accueil"', () => {
      const result = voice.parse('naviguer vers accueil', 'fr');
      expect(result.action).toBe('navigate');
      expect(extractRoleValue(result, 'destination')).toBe('accueil');
    });

    it('parses "cliquer sur envoyer"', () => {
      const result = voice.parse('cliquer sur envoyer', 'fr');
      expect(result.action).toBe('click');
      expect(extractRoleValue(result, 'patient')).toBe('envoyer');
    });

    it('parses "taper bonjour"', () => {
      const result = voice.parse('taper bonjour', 'fr');
      expect(result.action).toBe('type');
      expect(extractRoleValue(result, 'patient')).toBe('bonjour');
    });

    it('parses "défiler bas"', () => {
      const result = voice.parse('défiler bas', 'fr');
      expect(result.action).toBe('scroll');
    });

    it('parses "lire #article"', () => {
      const result = voice.parse('lire #article', 'fr');
      expect(result.action).toBe('read');
    });

    it('parses "fermer onglet"', () => {
      const result = voice.parse('fermer onglet', 'fr');
      expect(result.action).toBe('close');
    });

    it('parses "ouvrir menu"', () => {
      const result = voice.parse('ouvrir menu', 'fr');
      expect(result.action).toBe('open');
    });

    it('parses "chercher bonjour"', () => {
      const result = voice.parse('chercher bonjour', 'fr');
      expect(result.action).toBe('search');
    });

    it('parses "retour"', () => {
      const result = voice.parse('retour', 'fr');
      expect(result.action).toBe('back');
    });

    it('parses "avancer"', () => {
      const result = voice.parse('avancer', 'fr');
      expect(result.action).toBe('forward');
    });

    it('parses "aide"', () => {
      const result = voice.parse('aide', 'fr');
      expect(result.action).toBe('help');
    });

    it('compiles "cliquer sur envoyer" to JS', () => {
      const result = voice.compile('cliquer sur envoyer', 'fr');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('.click()');
    });
  });

  // ===========================================================================
  // French Alternative Keywords
  // ===========================================================================

  describe('French alternative keywords', () => {
    it('parses "aller" as navigate', () => {
      const result = voice.parse('aller vers accueil', 'fr');
      expect(result.action).toBe('navigate');
    });

    it('parses "écrire" as type', () => {
      const result = voice.parse('écrire bonjour', 'fr');
      expect(result.action).toBe('type');
    });

    it('parses "rechercher" as search', () => {
      const result = voice.parse('rechercher bonjour', 'fr');
      expect(result.action).toBe('search');
    });
  });

  // ===========================================================================
  // Semantic Equivalence (Cross-Language)
  // ===========================================================================

  describe('Semantic Equivalence', () => {
    it('"click" produces same action across EN and ES', () => {
      const en = voice.parse('click submit', 'en');
      const es = voice.parse('clic enviar', 'es');
      expect(en.action).toBe(es.action);
      expect(en.action).toBe('click');
    });

    it('"click" produces same action across EN and JA (SOV)', () => {
      const en = voice.parse('click submit', 'en');
      const ja = voice.parse('送信 を クリック', 'ja');
      expect(en.action).toBe(ja.action);
      expect(en.action).toBe('click');
    });

    it('"click" produces same action across EN and AR (VSO)', () => {
      const en = voice.parse('click submit', 'en');
      const ar = voice.parse('انقر على إرسال', 'ar');
      expect(en.action).toBe(ar.action);
      expect(en.action).toBe('click');
    });

    it('"navigate" produces same action across EN, KO, and ZH', () => {
      const en = voice.parse('navigate to home', 'en');
      const ko = voice.parse('홈 로 이동', 'ko');
      const zh = voice.parse('导航 到 首页', 'zh');
      expect(en.action).toBe(ko.action);
      expect(en.action).toBe(zh.action);
      expect(en.action).toBe('navigate');
    });

    it('"scroll" produces same action across TR and FR', () => {
      const tr = voice.parse('aşağı kaydır', 'tr');
      const fr = voice.parse('défiler bas', 'fr');
      expect(tr.action).toBe(fr.action);
      expect(tr.action).toBe('scroll');
    });

    it('"back" produces same action across all 8 languages', () => {
      const en = voice.parse('back', 'en');
      const es = voice.parse('atrás', 'es');
      const ja = voice.parse('戻る', 'ja');
      const ar = voice.parse('رجوع', 'ar');
      const ko = voice.parse('뒤로', 'ko');
      const zh = voice.parse('返回', 'zh');
      const tr = voice.parse('geri', 'tr');
      const fr = voice.parse('retour', 'fr');
      const actions = [en, es, ja, ar, ko, zh, tr, fr].map(r => r.action);
      expect(new Set(actions).size).toBe(1);
      expect(actions[0]).toBe('back');
    });

    it('"help" produces same action across all 8 languages', () => {
      const en = voice.parse('help', 'en');
      const es = voice.parse('ayuda', 'es');
      const ja = voice.parse('ヘルプ', 'ja');
      const ar = voice.parse('مساعدة', 'ar');
      const ko = voice.parse('도움말', 'ko');
      const zh = voice.parse('帮助', 'zh');
      const tr = voice.parse('yardım', 'tr');
      const fr = voice.parse('aide', 'fr');
      const actions = [en, es, ja, ar, ko, zh, tr, fr].map(r => r.action);
      expect(new Set(actions).size).toBe(1);
      expect(actions[0]).toBe('help');
    });

    it('"close" produces same action across EN, JA, KO', () => {
      const en = voice.parse('close tab', 'en');
      const ja = voice.parse('タブ を 閉じる', 'ja');
      const ko = voice.parse('탭 를 닫기', 'ko');
      expect(en.action).toBe(ja.action);
      expect(en.action).toBe(ko.action);
      expect(en.action).toBe('close');
    });

    it('"open" produces same action across EN, ES, AR', () => {
      const en = voice.parse('open settings', 'en');
      const es = voice.parse('abrir configuración', 'es');
      const ar = voice.parse('افتح إعدادات', 'ar');
      expect(en.action).toBe(es.action);
      expect(en.action).toBe(ar.action);
      expect(en.action).toBe('open');
    });
  });

  // ===========================================================================
  // Renderer
  // ===========================================================================

  describe('Renderer', () => {
    it('renders click to English', () => {
      const node = voice.parse('click submit', 'en');
      const rendered = renderVoice(node, 'en');
      expect(rendered).toContain('click');
      expect(rendered).toContain('submit');
    });

    it('renders click to Spanish', () => {
      const node = voice.parse('click submit', 'en');
      const rendered = renderVoice(node, 'es');
      expect(rendered).toContain('clic');
    });

    it('renders click to Japanese (SOV order)', () => {
      const node = voice.parse('click submit', 'en');
      const rendered = renderVoice(node, 'ja');
      expect(rendered).toContain('クリック');
      // SOV: patient before verb
      const patientIdx = rendered.indexOf('submit');
      const verbIdx = rendered.indexOf('クリック');
      if (patientIdx >= 0 && verbIdx >= 0) {
        expect(patientIdx).toBeLessThan(verbIdx);
      }
    });

    it('renders click to Arabic (with على marker)', () => {
      const node = voice.parse('click submit', 'en');
      const rendered = renderVoice(node, 'ar');
      expect(rendered).toContain('انقر');
      expect(rendered).toContain('على');
    });

    it('renders click to Korean (SOV order)', () => {
      const node = voice.parse('click submit', 'en');
      const rendered = renderVoice(node, 'ko');
      expect(rendered).toContain('클릭');
    });

    it('renders click to Chinese', () => {
      const node = voice.parse('click submit', 'en');
      const rendered = renderVoice(node, 'zh');
      expect(rendered).toContain('点击');
    });

    it('renders click to Turkish (SOV order)', () => {
      const node = voice.parse('click submit', 'en');
      const rendered = renderVoice(node, 'tr');
      expect(rendered).toContain('tıkla');
    });

    it('renders click to French (with sur marker)', () => {
      const node = voice.parse('click submit', 'en');
      const rendered = renderVoice(node, 'fr');
      expect(rendered).toContain('cliquer');
      expect(rendered).toContain('sur');
    });

    it('renders navigate with destination', () => {
      const node = voice.parse('navigate to home', 'en');
      const rendered = renderVoice(node, 'en');
      expect(rendered).toContain('navigate');
      expect(rendered).toContain('home');
    });

    it('renders navigate to Japanese (SOV: dest marker verb)', () => {
      const node = voice.parse('navigate to home', 'en');
      const rendered = renderVoice(node, 'ja');
      expect(rendered).toContain('移動');
      expect(rendered).toContain('home');
    });

    it('renders scroll with manner', () => {
      const node = voice.parse('scroll down', 'en');
      const rendered = renderVoice(node, 'en');
      expect(rendered).toBe('scroll down');
    });

    it('renders bare back command', () => {
      const node = voice.parse('back', 'en');
      const rendered = renderVoice(node, 'en');
      expect(rendered).toBe('back');
    });

    it('renders bare help command', () => {
      const node = voice.parse('help', 'en');
      const rendered = renderVoice(node, 'en');
      expect(rendered).toBe('help');
    });

    it('renders search with query', () => {
      const node = voice.parse('search hello', 'en');
      const rendered = renderVoice(node, 'en');
      expect(rendered).toContain('search');
      expect(rendered).toContain('hello');
    });

    it('renders type with destination', () => {
      const node = voice.parse('type hello into #search', 'en');
      const rendered = renderVoice(node, 'en');
      expect(rendered).toContain('type');
      expect(rendered).toContain('hello');
    });

    it('renders zoom', () => {
      const node = voice.parse('zoom in', 'en');
      const rendered = renderVoice(node, 'en');
      expect(rendered).toContain('zoom');
      expect(rendered).toContain('in');
    });

    it('renders open', () => {
      const node = voice.parse('open settings', 'en');
      const rendered = renderVoice(node, 'en');
      expect(rendered).toContain('open');
      expect(rendered).toContain('settings');
    });

    it('renders focus', () => {
      const node = voice.parse('focus #username', 'en');
      const rendered = renderVoice(node, 'en');
      expect(rendered).toContain('focus');
    });
  });

  // ===========================================================================
  // Error Handling
  // ===========================================================================

  describe('Error Handling', () => {
    it('returns errors for invalid input', () => {
      const result = voice.validate('completely invalid gibberish xyz', 'en');
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('returns errors for empty input', () => {
      const result = voice.validate('', 'en');
      expect(result.valid).toBe(false);
    });

    it('compile returns ok:false for invalid input', () => {
      const result = voice.compile('completely invalid gibberish xyz', 'en');
      expect(result.ok).toBe(false);
    });
  });

  // ===========================================================================
  // Security — XSS Prevention in Code Generator
  //
  // The tokenizer strips most special characters before they reach the code
  // generator, so we test esc() by constructing SemanticNodes manually with
  // malicious role values and passing them directly to the generator.
  // ===========================================================================

  describe('Security', () => {
    it('escapes single quotes in generated JS', () => {
      // Construct a SemanticNode with a single-quote in the role value
      const node: import('@lokascript/framework').SemanticNode = {
        kind: 'command',
        action: 'click',
        roles: new Map([['patient', { type: 'literal' as const, value: "test'value" }]]),
      };
      const code = voiceCodeGenerator.generate(node);
      // The single quote must be escaped so it doesn't break out of the string literal
      expect(code).not.toContain("'test'value'");
      expect(code).toContain("\\'");
    });

    it('escapes backticks in generated JS', () => {
      const node: import('@lokascript/framework').SemanticNode = {
        kind: 'command',
        action: 'click',
        roles: new Map([['patient', { type: 'literal' as const, value: 'test`value' }]]),
      };
      const code = voiceCodeGenerator.generate(node);
      expect(code).toContain('\\`');
    });

    it('escapes dollar signs in generated JS', () => {
      const node: import('@lokascript/framework').SemanticNode = {
        kind: 'command',
        action: 'click',
        roles: new Map([['patient', { type: 'literal' as const, value: 'test${alert(1)}' }]]),
      };
      const code = voiceCodeGenerator.generate(node);
      // The $ should be escaped so template literals can't execute
      expect(code).toContain('\\$');
      // Should not contain an unescaped $ (i.e., $ not preceded by \)
      expect(code).not.toMatch(/(?<!\\)\$\{alert/);
    });

    it('escapes newlines in generated JS', () => {
      const node: import('@lokascript/framework').SemanticNode = {
        kind: 'command',
        action: 'navigate',
        roles: new Map([['destination', { type: 'literal' as const, value: 'test\nvalue' }]]),
      };
      const code = voiceCodeGenerator.generate(node);
      // The literal newline in the value must be escaped to \\n in the string
      expect(code).toContain('\\n');
      // Should not contain an actual unescaped newline inside a string literal
      expect(code).not.toMatch(/href = 'test\nvalue'/);
    });
  });

  // ===========================================================================
  // Code Generation Quality
  // ===========================================================================

  describe('Code Generation Quality', () => {
    it('_findEl uses idempotent guard (no redeclaration)', () => {
      const result = voice.compile('click submit', 'en');
      expect(result.ok).toBe(true);
      // Should use window._findEl guard, not bare function declaration
      expect(result.code).toContain('window._findEl');
    });

    it('select all does not use deprecated execCommand', () => {
      const result = voice.compile('select all', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).not.toContain('execCommand');
      expect(result.code).toContain('selectNodeContents');
    });

    it('zoom does not use non-standard body.style.zoom', () => {
      const result = voice.compile('zoom in', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).not.toContain('body.style.zoom');
      expect(result.code).toContain('transform');
    });

    it('zoom reset clears transform', () => {
      const result = voice.compile('zoom reset', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toContain("dataset.zoom = '1'");
    });
  });

  // ===========================================================================
  // VoiceActionSpec Converter
  // ===========================================================================

  describe('toVoiceActionSpec', () => {
    it('converts click to spec', () => {
      const node = voice.parse('click submit', 'en');
      const spec = toVoiceActionSpec(node, 'en');
      expect(spec.action).toBe('click');
      expect(spec.target).toBe('submit');
      expect(spec.metadata.sourceLanguage).toBe('en');
    });

    it('converts scroll to spec with direction', () => {
      const node = voice.parse('scroll down', 'en');
      const spec = toVoiceActionSpec(node, 'en');
      expect(spec.action).toBe('scroll');
      expect(spec.direction).toBe('down');
    });

    it('converts navigate to spec with target', () => {
      const node = voice.parse('navigate to home', 'en');
      const spec = toVoiceActionSpec(node, 'en');
      expect(spec.action).toBe('navigate');
      expect(spec.target).toBe('home');
    });
  });
});
