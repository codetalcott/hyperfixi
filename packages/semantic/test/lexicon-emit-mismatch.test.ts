/**
 * Lexicon emit-mismatch ratchet (the architectural answer to "grep the word
 * in all four places").
 *
 * For every language, every i18n dict `commands.<action>` emission is checked
 * against what the semantic side actually READS that word as (profile keywords
 * primary+alternatives, plus the head literal of every registered pattern).
 * A mismatch = the transformer emits a word that parses as a DIFFERENT action
 * (the kung/آخر/mettre/동안/wyczyść class — 30+ instances across sessions 2–4)
 * or as nothing at all.
 *
 * KNOWN_MISMATCHES is the ratchet baseline: the mismatches that existed when
 * this test landed (mostly commands with no live corpus pattern — catch,
 * pushUrl — plus tails tracked in the roadmap §10). Fixing one REMOVES its
 * entry (the test fails if an allowlisted entry disappears but is still
 * listed — keep it pruned). Introducing a NEW mismatch fails immediately.
 */
import { describe, it, expect } from 'vitest';
import '../src';
import { getPatternsForLanguage, tryGetProfile } from '../src/registry';
import { dictionaries } from '../../i18n/src/dictionaries';

const LANGS = ['ar','bn','de','es','fr','he','hi','id','it','ja','ko','ms','pl','pt','qu','ru','sw','th','tl','tr','uk','vi','zh'];

const KNOWN_MISMATCHES = new Set([
  'ar:catch:التقط',
  'ar:measure:قس',
  'ar:pushUrl:ادفع رابط',
  'ar:replaceUrl:استبدل رابط',
  'ar:select:اختر',
  'bn:clone:কপি',
  'de:catch:fangen',
  'de:get:erhalten',
  'de:pushUrl:urlHinzufügen',
  'de:replaceUrl:urlErsetzen',
  'de:select:auswählen',
  'es:catch:atrapar',
  'es:pushUrl:pushUrl',
  'es:replaceUrl:reemplazarUrl',
  'fr:break:arrêter',
  'fr:catch:attraper',
  'fr:pushUrl:pousserUrl',
  'fr:replaceUrl:remplacerUrl',
  'fr:until:jusquà',
  'fr:while:tantque',
  'hi:break:रोकें',
  'hi:catch:पकड़ें',
  'hi:clone:कॉपी',
  'hi:pushUrl:url_जोड़ें',
  'hi:replaceUrl:url_बदलें',
  'hi:select:चुनें',
  'hi:unless:जब_तक_नहीं',
  'hi:while:जब_तक',
  'id:break:hentikan',
  'id:catch:tangkap',
  'id:close:tutup',
  'id:pushUrl:tambahUrl',
  'id:replaceUrl:gantiUrl',
  'id:select:pilih',
  'it:catch:catturare',
  'it:pushUrl:pushUrl',
  'it:replaceUrl:sostituireUrl',
  'ja:catch:捕まえる',
  'ja:exit:終了',
  'ja:pushUrl:URLプッシュ',
  'ja:replaceUrl:URL置換',
  'ja:select:選択',
  'ja:unless:でなければ',
  'ko:catch:잡다',
  'ko:exit:종료',
  'ko:pushUrl:URL푸시',
  'ko:replaceUrl:URL교체',
  'ko:select:선택',
  'ko:unless:아니면',
  'ms:break:henti',
  'ms:catch:tangkap',
  'ms:pushUrl:tolak_url',
  'ms:replaceUrl:ganti_url',
  'ms:select:pilih',
  'pl:catch:złap',
  'pl:get:pobierz',
  'pl:pushUrl:dodajUrl',
  'pl:replaceUrl:zamieńUrl',
  'pl:select:wybierz',
  'pt:catch:capturar',
  'pt:pushUrl:pushUrl',
  'pt:replaceUrl:substituirUrl',
  'qu:async:mana_suyaspa',
  'qu:break:p_akiy',
  'qu:catch:hapsiy',
  'qu:continue:purichiy',
  'qu:default:ñawpaq_kaq',
  'qu:on:kaqpi',
  'qu:open:kichay',
  'qu:pushUrl:url_tanqay',
  'qu:replaceUrl:url_tikray',
  'qu:select:akllay',
  'qu:throw:wikchuy',
  'qu:transition:tikray',
  'qu:unless:mana_sichus',
  'qu:until:hayk_akama',
  'qu:while:kay_kaq',
  'ru:catch:поймать',
  'ru:install:установить',
  'ru:pushUrl:добавить_url',
  'ru:replaceUrl:заменить_url',
  'ru:select:выбрать',
  'ru:until:до',
  'sw:async:sainkroni',
  'sw:catch:shika',
  'sw:copy:nakili',
  'sw:default:msingi',
  'sw:pushUrl:sukumaUrl',
  'sw:replaceUrl:badilishaUrl',
  'sw:return:rudi',
  'sw:select:chagua',
  'sw:transition:mpito',
  'th:clone:คัดลอก',
  'th:select:เลือก',
  'th:transition:เปลี่ยน',
  'tl:break:itigil',
  'tl:catch:hulihin',
  'tl:clone:kopyahin',
  'tl:pushUrl:itulak_url',
  'tl:replaceUrl:palitan_url',
  'tr:catch:yakala',
  'tr:pushUrl:urlEkle',
  'tr:replaceUrl:urlDeğiştir',
  'tr:select:seç',
  'tr:unless:değilse',
  'tr:while:iken',
  'uk:catch:зловити',
  'uk:install:встановити',
  'uk:pushUrl:додати_url',
  'uk:replaceUrl:замінити_url',
  'uk:select:вибрати',
  'uk:until:до',
  'vi:break:dừng',
  'vi:catch:bắt',
  'vi:clone:sao chép',
  'vi:prepend:thêm đầu',
  'vi:pushUrl:pushUrl',
  'vi:render:hiển thị',
  'vi:replaceUrl:thayThếUrl',
  'vi:select:chọn',
  'vi:unless:trừ khi',
  'zh:catch:捕获',
  'zh:pushUrl:推送网址',
  'zh:replaceUrl:替换网址',
  'zh:take:获取',
  'zh:while:当',
]);

function readingsFor(lang: string): Map<string, Set<string>> {
  const read = new Map<string, Set<string>>();
  const add = (word: unknown, meaning: string) => {
    if (typeof word !== 'string' || !word) return;
    const w = word.toLowerCase();
    if (!read.has(w)) read.set(w, new Set());
    read.get(w)!.add(meaning);
  };
  const p = tryGetProfile(lang) as any;
  for (const [action, kw] of Object.entries<any>(p?.keywords ?? {})) {
    add(kw.primary, action);
    for (const alt of kw.alternatives ?? []) add(alt, action);
  }
  const onWords = new Set(
    [p?.keywords?.on?.primary, ...(p?.keywords?.on?.alternatives ?? [])]
      .filter(Boolean)
      .map((w: string) => w.toLowerCase())
  );
  for (const pat of getPatternsForLanguage(lang)) {
    const head = (pat as any).template?.tokens?.[0];
    if (head?.type !== 'literal') continue;
    const fused = pat.command === 'on' && /^([a-z]+)-event-/.exec(pat.id);
    const credit = (w: string) =>
      fused && !onWords.has(w.toLowerCase()) ? fused[1] : pat.command;
    add(head.value, credit(head.value));
    for (const alt of head.alternatives ?? []) add(alt, credit(alt));
  }
  return read;
}

describe('i18n dict emissions are readable as the action they translate', () => {
  for (const lang of LANGS) {
    it(`[${lang}] no NEW emit-mismatches`, () => {
      const dict = (dictionaries as any)[lang];
      if (!dict?.commands) return;
      const read = readingsFor(lang);
      const fresh: string[] = [];
      for (const [action, word] of Object.entries<any>(dict.commands)) {
        const readAs = read.get(String(word).toLowerCase()) ?? new Set();
        const ok = readAs.has(action);
        const key = `${lang}:${action}:${word}`;
        if (!ok && !KNOWN_MISMATCHES.has(key)) fresh.push(`${key} → read as [${[...readAs].join(',')}]`);
      }
      expect(fresh, `new dict↔profile mismatches:\n${fresh.join('\n')}`).toEqual([]);
    });
  }
});
