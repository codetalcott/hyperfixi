/**
 * Integration tests for the i18n parser integration.
 *
 * Tests the actual esKeywords and jaKeywords providers
 * work correctly with the core parser.
 */

import { describe, it, expect } from 'vitest';
import { esKeywords } from './es';
import { jaKeywords } from './ja';
import { frKeywords } from './fr';
import { deKeywords } from './de';
import { arKeywords } from './ar';
import { koKeywords } from './ko';
import { zhKeywords } from './zh';
import { trKeywords } from './tr';
import { createKeywordProvider, createEnglishProvider } from './create-provider';
import { es } from '../dictionaries/es';
import { ja } from '../dictionaries/ja';

describe('KeywordProvider Integration', () => {
  describe('Spanish Provider (esKeywords)', () => {
    it('should resolve Spanish commands to English', () => {
      expect(esKeywords.resolve('alternar')).toBe('toggle');
      expect(esKeywords.resolve('poner')).toBe('put');
      expect(esKeywords.resolve('establecer')).toBe('set');
      expect(esKeywords.resolve('mostrar')).toBe('show');
      expect(esKeywords.resolve('ocultar')).toBe('hide');
    });

    it('should resolve Spanish keywords with priority (commands over modifiers)', () => {
      // Note: Spanish 'en' maps to multiple English words:
      // - commands.on = 'en' (for event handlers)
      // - modifiers.in = 'en' (for prepositions)
      // - modifiers.into = 'en'
      // The resolver prioritizes commands, so 'en' → 'on'
      expect(esKeywords.resolve('en')).toBe('on');
    });

    it('should resolve Spanish events', () => {
      expect(esKeywords.resolve('clic')).toBe('click');
    });

    it('should resolve Spanish modifiers', () => {
      expect(esKeywords.resolve('a')).toBe('to');
      // Note: 'de' maps to both 'from' and 'of' in Spanish dictionary
      // Since modifiers are processed together, the last one wins
      // But commands/logical have priority, so 'de' → 'of' (modifiers.of = 'de')
      expect(esKeywords.resolve('con')).toBe('with');
    });

    it('should resolve Spanish logical operators', () => {
      expect(esKeywords.resolve('y')).toBe('and');
      expect(esKeywords.resolve('o')).toBe('or');
      expect(esKeywords.resolve('no')).toBe('not');
      expect(esKeywords.resolve('entonces')).toBe('then');
      expect(esKeywords.resolve('sino')).toBe('else');
    });

    it('should allow English fallback', () => {
      // English keywords should resolve to themselves
      expect(esKeywords.resolve('toggle')).toBe('toggle');
      expect(esKeywords.resolve('on')).toBe('on');
      expect(esKeywords.resolve('click')).toBe('click');
    });

    it('should correctly identify commands', () => {
      // Spanish commands
      expect(esKeywords.isCommand('alternar')).toBe(true);
      expect(esKeywords.isCommand('poner')).toBe(true);
      // English commands (fallback)
      expect(esKeywords.isCommand('toggle')).toBe(true);
      expect(esKeywords.isCommand('put')).toBe(true);
      // Non-commands
      expect(esKeywords.isCommand('unknown')).toBe(false);
    });

    it('should return locale code', () => {
      expect(esKeywords.locale).toBe('es');
    });

    it('should provide completions list', () => {
      const commands = esKeywords.getCommands();
      expect(commands.length).toBeGreaterThan(0);
      expect(commands).toContain('alternar');
      // Should also contain English fallbacks
      expect(commands).toContain('toggle');
    });

    it('should translate English to locale', () => {
      expect(esKeywords.toLocale('toggle')).toBe('alternar');
      expect(esKeywords.toLocale('put')).toBe('poner');
    });
  });

  describe('Japanese Provider (jaKeywords)', () => {
    it('should resolve Japanese commands to English', () => {
      expect(jaKeywords.resolve('切り替え')).toBe('toggle');
      expect(jaKeywords.resolve('置く')).toBe('put');
      expect(jaKeywords.resolve('設定')).toBe('set');
      expect(jaKeywords.resolve('表示')).toBe('show');
      expect(jaKeywords.resolve('隠す')).toBe('hide');
    });

    it('should resolve Japanese keywords based on dictionary', () => {
      // Note: Japanese 'で' maps to both 'on' (commands) and 'at' (modifiers)
      // With priority, commands win, so 'で' → 'on'
      expect(jaKeywords.resolve('で')).toBe('on');
    });

    it('should resolve Japanese events', () => {
      expect(jaKeywords.resolve('クリック')).toBe('click');
    });

    it('should resolve Japanese modifiers', () => {
      expect(jaKeywords.resolve('に')).toBe('to');
      expect(jaKeywords.resolve('から')).toBe('from');
      expect(jaKeywords.resolve('と')).toBe('with');
    });

    it('should resolve Japanese logical operators', () => {
      expect(jaKeywords.resolve('そして')).toBe('and');
      expect(jaKeywords.resolve('または')).toBe('or');
      expect(jaKeywords.resolve('ではない')).toBe('not');
      expect(jaKeywords.resolve('それから')).toBe('then');
      // Note: Japanese dictionary has 'そうでなければ' for 'otherwise', not 'else'
      expect(jaKeywords.resolve('そうでなければ')).toBe('otherwise');
    });

    it('should allow English fallback', () => {
      expect(jaKeywords.resolve('toggle')).toBe('toggle');
      expect(jaKeywords.resolve('on')).toBe('on');
      expect(jaKeywords.resolve('click')).toBe('click');
    });

    it('should return locale code', () => {
      expect(jaKeywords.locale).toBe('ja');
    });
  });

  describe('French Provider (frKeywords)', () => {
    it('should resolve French commands to English', () => {
      expect(frKeywords.resolve('basculer')).toBe('toggle');
      expect(frKeywords.resolve('mettre')).toBe('put');
      expect(frKeywords.resolve('définir')).toBe('set');
      expect(frKeywords.resolve('montrer')).toBe('show');
      expect(frKeywords.resolve('cacher')).toBe('hide');
    });

    it('should resolve French events', () => {
      expect(frKeywords.resolve('clic')).toBe('click');
    });

    it('should resolve French modifiers', () => {
      expect(frKeywords.resolve('à')).toBe('to');
      expect(frKeywords.resolve('avec')).toBe('with');
    });

    it('should resolve French logical operators', () => {
      expect(frKeywords.resolve('et')).toBe('and');
      expect(frKeywords.resolve('ou')).toBe('or');
      expect(frKeywords.resolve('non')).toBe('not');
      expect(frKeywords.resolve('alors')).toBe('then');
      expect(frKeywords.resolve('sinon')).toBe('else');
    });

    it('should allow English fallback', () => {
      expect(frKeywords.resolve('toggle')).toBe('toggle');
      expect(frKeywords.resolve('on')).toBe('on');
      expect(frKeywords.resolve('click')).toBe('click');
    });

    it('should return locale code', () => {
      expect(frKeywords.locale).toBe('fr');
    });

    it('should translate English to locale', () => {
      expect(frKeywords.toLocale('toggle')).toBe('basculer');
      expect(frKeywords.toLocale('put')).toBe('mettre');
    });
  });

  describe('German Provider (deKeywords)', () => {
    it('should resolve German commands to English', () => {
      expect(deKeywords.resolve('umschalten')).toBe('toggle');
      expect(deKeywords.resolve('setzen')).toBe('put');
      expect(deKeywords.resolve('festlegen')).toBe('set');
      expect(deKeywords.resolve('zeigen')).toBe('show');
      expect(deKeywords.resolve('verstecken')).toBe('hide');
    });

    it('should resolve German events', () => {
      expect(deKeywords.resolve('klick')).toBe('click');
    });

    it('should resolve German modifiers', () => {
      expect(deKeywords.resolve('zu')).toBe('to');
      expect(deKeywords.resolve('mit')).toBe('with');
    });

    it('should resolve German logical operators', () => {
      expect(deKeywords.resolve('und')).toBe('and');
      expect(deKeywords.resolve('oder')).toBe('or');
      expect(deKeywords.resolve('nicht')).toBe('not');
      expect(deKeywords.resolve('dann')).toBe('then');
      expect(deKeywords.resolve('sonst')).toBe('else');
    });

    it('should allow English fallback', () => {
      expect(deKeywords.resolve('toggle')).toBe('toggle');
      expect(deKeywords.resolve('on')).toBe('on');
      expect(deKeywords.resolve('click')).toBe('click');
    });

    it('should return locale code', () => {
      expect(deKeywords.locale).toBe('de');
    });

    it('should translate English to locale', () => {
      expect(deKeywords.toLocale('toggle')).toBe('umschalten');
      expect(deKeywords.toLocale('put')).toBe('setzen');
    });
  });

  describe('Arabic Provider (arKeywords)', () => {
    it('should resolve Arabic commands to English', () => {
      expect(arKeywords.resolve('بدل')).toBe('toggle');
      expect(arKeywords.resolve('ضع')).toBe('put');
      expect(arKeywords.resolve('اضبط')).toBe('set');
      expect(arKeywords.resolve('اظهر')).toBe('show');
      expect(arKeywords.resolve('اخف')).toBe('hide');
    });

    it('should resolve Arabic events', () => {
      expect(arKeywords.resolve('نقر')).toBe('click');
    });

    it('should resolve Arabic modifiers', () => {
      expect(arKeywords.resolve('إلى')).toBe('to');
      expect(arKeywords.resolve('مع')).toBe('with');
    });

    it('should resolve Arabic logical operators', () => {
      expect(arKeywords.resolve('و')).toBe('and');
      expect(arKeywords.resolve('أو')).toBe('or');
      expect(arKeywords.resolve('ليس')).toBe('not');
      expect(arKeywords.resolve('ثم')).toBe('then');
      expect(arKeywords.resolve('وإلا')).toBe('else');
    });

    it('should allow English fallback', () => {
      expect(arKeywords.resolve('toggle')).toBe('toggle');
      expect(arKeywords.resolve('on')).toBe('on');
      expect(arKeywords.resolve('click')).toBe('click');
    });

    it('should return locale code', () => {
      expect(arKeywords.locale).toBe('ar');
    });

    it('should handle RTL text correctly (Arabic script)', () => {
      // Arabic uses right-to-left script, but the parser works on tokens
      // which are separated by whitespace/operators, so direction doesn't matter
      expect(arKeywords.resolve('على')).toBe('on');
      expect(arKeywords.resolve('بدل')).toBe('toggle');
      // Verify round-trip works for commands
      expect(arKeywords.toLocale('toggle')).toBe('بدل');
      expect(arKeywords.toLocale('on')).toBe('على');
    });

    it('should translate English to locale', () => {
      expect(arKeywords.toLocale('toggle')).toBe('بدل');
      expect(arKeywords.toLocale('put')).toBe('ضع');
    });
  });

  describe('Korean Provider (koKeywords)', () => {
    it('should resolve Korean commands to English', () => {
      expect(koKeywords.resolve('토글')).toBe('toggle');
      expect(koKeywords.resolve('넣다')).toBe('put');
      expect(koKeywords.resolve('설정')).toBe('set');
      expect(koKeywords.resolve('보이다')).toBe('show');
      expect(koKeywords.resolve('숨기다')).toBe('hide');
    });

    it('should resolve Korean modifiers', () => {
      // Note: '에' is a conflict (used for both 'on' and 'to')
      // Commands have priority, so '에' → 'on'
      expect(koKeywords.resolve('와')).toBe('with');
      expect(koKeywords.resolve('에서')).toBe('from');
    });

    it('should resolve Korean logical operators', () => {
      expect(koKeywords.resolve('그리고')).toBe('and');
      expect(koKeywords.resolve('또는')).toBe('or');
      expect(koKeywords.resolve('아니')).toBe('not'); // dictionary uses '아니'
      expect(koKeywords.resolve('그러면')).toBe('then');
      // Note: '아니면' is used for both 'unless' (command) and 'else' (logical)
      // Both commands and logical have priority=true, so logical overwrites commands
      expect(koKeywords.resolve('아니면')).toBe('else');
    });

    it('should allow English fallback', () => {
      expect(koKeywords.resolve('toggle')).toBe('toggle');
      expect(koKeywords.resolve('on')).toBe('on');
      expect(koKeywords.resolve('click')).toBe('click');
    });

    it('should return locale code', () => {
      expect(koKeywords.locale).toBe('ko');
    });

    it('should handle Hangul script correctly', () => {
      // Korean uses syllabic blocks (Hangul)
      expect(koKeywords.resolve('에')).toBe('on'); // commands.on has priority
      expect(koKeywords.resolve('토글')).toBe('toggle');
      // Verify round-trip
      expect(koKeywords.toLocale('toggle')).toBe('토글');
      expect(koKeywords.toLocale('on')).toBe('에');
    });
  });

  describe('Chinese Provider (zhKeywords)', () => {
    it('should resolve Chinese commands to English', () => {
      expect(zhKeywords.resolve('切换')).toBe('toggle');
      expect(zhKeywords.resolve('放置')).toBe('put');
      expect(zhKeywords.resolve('设置')).toBe('set');
      expect(zhKeywords.resolve('显示')).toBe('show');
      expect(zhKeywords.resolve('隐藏')).toBe('hide');
    });

    it('should resolve Chinese modifiers', () => {
      expect(zhKeywords.resolve('到')).toBe('to');
      expect(zhKeywords.resolve('与')).toBe('with'); // dictionary uses '与' not '用'
    });

    it('should resolve Chinese logical operators', () => {
      expect(zhKeywords.resolve('和')).toBe('and');
      expect(zhKeywords.resolve('或')).toBe('or');
      expect(zhKeywords.resolve('非')).toBe('not');
      expect(zhKeywords.resolve('那么')).toBe('then');
      expect(zhKeywords.resolve('否则')).toBe('else');
    });

    it('should allow English fallback', () => {
      expect(zhKeywords.resolve('toggle')).toBe('toggle');
      expect(zhKeywords.resolve('on')).toBe('on');
      expect(zhKeywords.resolve('click')).toBe('click');
    });

    it('should return locale code', () => {
      expect(zhKeywords.locale).toBe('zh');
    });

    it('should handle Chinese characters correctly', () => {
      // Chinese uses logographic characters
      // Note: '当' (dāng) is used for 'when' (logical), 'while' (commands), and 'on' (commands)
      // Since 'when' appears last in dictionary iteration, '当' → 'when'
      expect(zhKeywords.resolve('当')).toBe('when');
      expect(zhKeywords.resolve('切换')).toBe('toggle');
      // Round-trip for toggle
      expect(zhKeywords.toLocale('toggle')).toBe('切换');
      // Note: toLocale('on') still returns '当' (forward map), even though reverse is 'when'
      expect(zhKeywords.toLocale('on')).toBe('当');
    });
  });

  describe('Turkish Provider (trKeywords)', () => {
    it('should resolve Turkish commands to English', () => {
      expect(trKeywords.resolve('değiştir')).toBe('toggle');
      expect(trKeywords.resolve('koy')).toBe('put');
      expect(trKeywords.resolve('ayarla')).toBe('set');
      expect(trKeywords.resolve('göster')).toBe('show');
      expect(trKeywords.resolve('gizle')).toBe('hide');
    });

    it('should resolve Turkish modifiers', () => {
      // Note: 'için' is commands.for, 'e' is modifiers.to
      expect(trKeywords.resolve('e')).toBe('to');
      expect(trKeywords.resolve('ile')).toBe('with');
    });

    it('should resolve Turkish logical operators', () => {
      expect(trKeywords.resolve('ve')).toBe('and');
      expect(trKeywords.resolve('veya')).toBe('or');
      expect(trKeywords.resolve('değil')).toBe('not');
      expect(trKeywords.resolve('sonra')).toBe('then'); // dictionary uses 'sonra'
      expect(trKeywords.resolve('yoksa')).toBe('else');
    });

    it('should allow English fallback', () => {
      expect(trKeywords.resolve('toggle')).toBe('toggle');
      expect(trKeywords.resolve('on')).toBe('on');
      expect(trKeywords.resolve('click')).toBe('click');
    });

    it('should return locale code', () => {
      expect(trKeywords.locale).toBe('tr');
    });

    it('should handle Turkish special characters correctly', () => {
      // Turkish uses extended Latin with special chars: ı, ğ, ş, ç, ö, ü
      expect(trKeywords.resolve('üzerinde')).toBe('on');
      expect(trKeywords.resolve('değiştir')).toBe('toggle');
      // Verify round-trip
      expect(trKeywords.toLocale('toggle')).toBe('değiştir');
      expect(trKeywords.toLocale('on')).toBe('üzerinde');
    });
  });

  describe('createKeywordProvider factory', () => {
    it('should create provider from dictionary', () => {
      const provider = createKeywordProvider(es, 'es');
      expect(provider.locale).toBe('es');
      expect(provider.resolve('alternar')).toBe('toggle');
    });

    it('should support disabling English fallback', () => {
      const provider = createKeywordProvider(es, 'es', {
        allowEnglishFallback: false,
      });

      // Spanish should still work
      expect(provider.resolve('alternar')).toBe('toggle');
      // English should NOT work (no fallback)
      expect(provider.resolve('toggle')).toBeUndefined();
    });
  });

  describe('createEnglishProvider', () => {
    it('should create English-only provider', () => {
      const provider = createEnglishProvider();
      expect(provider.locale).toBe('en');
      expect(provider.resolve('toggle')).toBe('toggle');
      expect(provider.resolve('on')).toBe('on');
      expect(provider.resolve('alternar')).toBeUndefined();
    });
  });
});
