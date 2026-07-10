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
 * KNOWN_MISMATCHES is the ratchet baseline — the mismatches that existed when
 * this test landed. Three guards run over it:
 *   1. NO NEW mismatches — a fresh dict↔profile disagreement fails immediately.
 *   2. NO STALE entries — an allowlisted entry that is no longer a real mismatch
 *      (dict changed its emission, or the word now reads correctly) fails so the
 *      allowlist stays pruned. (Previously promised in this comment but never
 *      enforced; added 2026-06-15.)
 *   3. EVERY entry is categorized — see the two buckets below.
 *
 * Two categories of allowlisted mismatch:
 *   • DEAD — the action has no semantic ActionType/schema, so the semantic side
 *     models no such command and the dict's translation can never be parsed
 *     (harmless: never exercised by the corpus). These are `DEAD_SCHEMA_COMMANDS`
 *     (`catch`/`pushUrl`/`replaceUrl` are real _hyperscript commands not yet
 *     ported to the semantic schema set; `until` is only a loop sub-keyword).
 *     They are deliberately KEPT — the translations are useful data for when the
 *     commands gain schemas — not deleted.
 *   • LIVE — the action IS modeled, but the dict emits a word the profile/patterns
 *     don't read as that action: a genuine i18n↔profile gap. Fixing one is a
 *     dict↔profile realign (the proven family) and is fidelity-affecting, so it
 *     belongs to the fidelity track (Phase 1), not this instrumentation pass.
 */
import { describe, it, expect } from 'vitest';
import '../src';
import { getPatternsForLanguage, tryGetProfile } from '../src/registry';
import { commandSchemas } from '../src/generators/command-schemas';
import { dictionaries } from '../../i18n/src/dictionaries';

const LANGS = [
  'ar',
  'bn',
  'de',
  'es',
  'fr',
  'he',
  'hi',
  'id',
  'it',
  'ja',
  'ko',
  'ms',
  'pl',
  'pt',
  'qu',
  'ru',
  'sw',
  'th',
  'tl',
  'tr',
  'uk',
  'vi',
  'zh',
];

const KNOWN_MISMATCHES = new Set([
  'ar:catch:التقط',
  'ar:pushUrl:ادفع رابط',
  'ar:replaceUrl:استبدل رابط',
  'ar:select:اختر',
  'bn:clone:কপি',
  'de:catch:fangen',
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
  'ja:pushUrl:URLプッシュ',
  'ja:replaceUrl:URL置換',
  'ja:select:選択',
  'ko:catch:잡다',
  'ko:pushUrl:URL푸시',
  'ko:replaceUrl:URL교체',
  'ko:select:선택',
  'ms:break:henti',
  'ms:catch:tangkap',
  'ms:pushUrl:tolak_url',
  'ms:replaceUrl:ganti_url',
  'ms:select:pilih',
  'pl:catch:złap',
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
  // qu:default resolved (default-value drill, L4): profile primary realigned to
  // the dict render ñawpaq_kaq + the underscore-compound fold forms it from the
  // shattered ñawpaq/_/kaq run.
  'qu:on:kaqpi',
  'qu:open:kichay',
  'qu:pushUrl:url_tanqay',
  'qu:replaceUrl:url_tikray',
  'qu:select:akllay',
  'qu:throw:wikchuy',
  // qu:transition resolved (transition precision drill): dict realigned to the
  // profile primary `pasay` (was `tikray`, which collided with toggle).
  // qu:unless resolved (HANDOFF-lossy-tail unless-condition): dict realigned to the
  // spaced `mana sichus` + quechua profile reads it as `unless` (was `mana_sichus`,
  // which `_`-split to mana(=false)+sichus(=if)).
  'qu:until:hayk_akama',
  // qu:while resolved (HANDOFF-r1-post-cluster-residue item 2): dict realigned to
  // the profile primary `kaykamaqa` (was `kay_kaq`, unknown to the profile).
  'ru:catch:поймать',
  'ru:pushUrl:добавить_url',
  'ru:replaceUrl:заменить_url',
  'ru:select:выбрать',
  'ru:until:до',
  'sw:async:sainkroni',
  'sw:catch:shika',
  'sw:copy:nakili',
  // sw:default resolved (default-value drill, L4): `msingi` (the dict render)
  // added as a profile alternative alongside chaguo-msingi.
  'sw:pushUrl:sukumaUrl',
  'sw:replaceUrl:badilishaUrl',
  // sw:return resolved (worker-block arc): the dict emitted `rudi` ("go back"),
  // which the profile reads as nothing — sw could not parse its own `return`. The
  // dict now emits `rudisha`, the profile's primary. Surfaced once `worker`'s body
  // stopped being dropped and `return` finally had to parse.
  'sw:select:chagua',
  // sw:transition resolved (transition precision drill): `mpito` added as a
  // profile alternative — the rendered verb now anchors.
  'th:clone:คัดลอก',
  'th:select:เลือก',
  // th:transition resolved (transition precision drill): dict realigned to the
  // profile primary `เปลี่ยนผ่าน` (was `เปลี่ยน`, the profile's `change` keyword).
  'tl:break:itigil',
  'tl:catch:hulihin',
  'tl:clone:kopyahin',
  'tl:pushUrl:itulak_url',
  'tl:replaceUrl:palitan_url',
  'tr:catch:yakala',
  'tr:pushUrl:urlEkle',
  'tr:replaceUrl:urlDeğiştir',
  'tr:select:seç',
  // tr:while resolved (HANDOFF-r1-post-cluster-residue item 2): dict realigned to
  // the profile primary `süresince` (was `iken`, the tr WHEN primary).
  'uk:catch:зловити',
  'uk:pushUrl:додати_url',
  'uk:replaceUrl:замінити_url',
  'uk:select:вибрати',
  'uk:until:до',
  'vi:break:dừng',
  'vi:catch:bắt',
  'vi:clone:sao chép',
  'vi:prepend:thêm đầu',
  'vi:pushUrl:pushUrl',
  // vi:render resolved (HANDOFF-lossy-tail render cluster): dict realigned
  // `hiển thị`→`kết xuất` (the profile's render primary); `hiển thị` collided with
  // `show`, so render-template/morph-template parsed render as `show`.
  'vi:replaceUrl:thayThếUrl',
  'vi:select:chọn',
  // vi:unless resolved (HANDOFF-lossy-tail unless-condition): vietnamese profile
  // primary realigned `trừ_khi`→`trừ khi` so the spaced dict form reads as `unless`
  // (the bare `khi` was previously mistaken for a second `on` handler).
  'zh:catch:捕获',
  'zh:pushUrl:推送网址',
  'zh:replaceUrl:替换网址',
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
    const credit = (w: string) => (fused && !onWords.has(w.toLowerCase()) ? fused[1] : pat.command);
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
        if (!ok && !KNOWN_MISMATCHES.has(key))
          fresh.push(`${key} → read as [${[...readAs].join(',')}]`);
      }
      expect(fresh, `new dict↔profile mismatches:\n${fresh.join('\n')}`).toEqual([]);
    });
  }
});

// Memoize readings per language for the guards below.
const readingsCache = new Map<string, Map<string, Set<string>>>();
function readingsForCached(lang: string): Map<string, Set<string>> {
  let r = readingsCache.get(lang);
  if (!r) {
    r = readingsFor(lang);
    readingsCache.set(lang, r);
  }
  return r;
}

/**
 * Commands present in the i18n dicts but with NO semantic ActionType/schema, so
 * the emission can never be parsed (harmless — never exercised by the corpus).
 * `catch`/`pushUrl`/`replaceUrl` are real _hyperscript commands not yet ported to
 * the semantic schema set; `until` is only a loop sub-keyword (`repeat until …`).
 * Kept (not deleted) so the translations survive for when the commands gain schemas.
 */
const DEAD_SCHEMA_COMMANDS = new Set(['catch', 'pushUrl', 'replaceUrl', 'until']);

function parseKey(key: string): { lang: string; action: string; word: string } {
  const [lang, action, ...rest] = key.split(':');
  return { lang, action, word: rest.join(':') };
}

describe('KNOWN_MISMATCHES stays pruned (no stale allowlist entries)', () => {
  it('every allowlisted entry is still a real, current mismatch', () => {
    const stale: string[] = [];
    for (const key of KNOWN_MISMATCHES) {
      const { lang, action, word } = parseKey(key);
      const dict = (dictionaries as any)[lang];
      const emitted = dict?.commands?.[action];
      if (emitted === undefined) {
        stale.push(`${key} — dict no longer defines commands.${action}`);
        continue;
      }
      if (String(emitted) !== word) {
        stale.push(`${key} — dict now emits "${emitted}", not "${word}"`);
        continue;
      }
      const readAs = readingsForCached(lang).get(String(word).toLowerCase()) ?? new Set<string>();
      if (readAs.has(action)) {
        stale.push(
          `${key} — now reads correctly as [${[...readAs].join(',')}]; remove from allowlist`
        );
      }
    }
    expect(
      stale,
      `stale KNOWN_MISMATCHES entries (fixed but still listed — prune them):\n${stale.join('\n')}`
    ).toEqual([]);
  });
});

describe('KNOWN_MISMATCHES entries are categorized (dead-schema vs live-gap)', () => {
  const modeled = new Set(Object.keys(commandSchemas));

  it('DEAD_SCHEMA_COMMANDS are genuinely unmodeled (no semantic schema)', () => {
    const wronglyDead = [...DEAD_SCHEMA_COMMANDS].filter(a => modeled.has(a));
    expect(
      wronglyDead,
      `listed DEAD but now HAVE a semantic schema — reclassify as a live i18n gap:\n${wronglyDead.join('\n')}`
    ).toEqual([]);
  });

  it('every allowlisted action is either dead-listed or schema-modeled', () => {
    const uncategorized: string[] = [];
    for (const key of KNOWN_MISMATCHES) {
      const { action } = parseKey(key);
      if (!DEAD_SCHEMA_COMMANDS.has(action) && !modeled.has(action)) {
        uncategorized.push(`${key} — action "${action}" is neither dead-listed nor schema-modeled`);
      }
    }
    expect(
      uncategorized,
      `uncategorized allowlist entries (add the action to DEAD_SCHEMA_COMMANDS or give it a schema):\n${uncategorized.join(
        '\n'
      )}`
    ).toEqual([]);
  });
});
