/**
 * Fetch Command Patterns (hand-crafted)
 *
 * Most languages parse `fetch <url>` via the auto-generated
 * `fetch-{lang}-generated` pattern, which marks the `source` URL with the
 * profile's source marker (zh `从`). Chinese needs a hand-crafted variant
 * because the i18n grammar transformer runs `fetch /api/data` through its
 * generic argument parser, which defaults the leading argument to the `patient`
 * role and therefore marks it with the BA particle `把` — emitting
 * `抓取 把 /api/data` (and `抓取 把 /api/data 的 json` for `fetch … as json`,
 * with `的` standing in for `as`). Neither matches the generated `抓取 从 …`
 * form, so a `fetch` inside an event block / then-chain dropped (degenerate
 * `{on}`). See docs-internal/ZH_BLOCK_BODY_SCOPE.md (#3).
 *
 * This pattern tolerates the BA marker (`把`, optional) before the `source` URL
 * — mirroring the `toggle-zh-ba` / `wait-zh-ba` convention — and the `的` / `作为`
 * "as" marker before the optional `responseType`. The `从`-marked form is still
 * covered by the generated pattern.
 */

import type { LanguagePattern } from '../types';

function getFetchPatternsZh(): LanguagePattern[] {
  return [
    {
      id: 'fetch-zh-ba',
      language: 'zh',
      command: 'fetch',
      priority: 105,
      template: {
        format: '抓取 把 {source} 的 {responseType}',
        tokens: [
          { type: 'literal', value: '抓取', alternatives: ['取', '获得'] },
          // BA-marked source (transformer output); 从 also tolerated for symmetry
          // with the generated source-marked form.
          {
            type: 'group',
            optional: true,
            tokens: [{ type: 'literal', value: '把', alternatives: ['从', '由'] }],
          },
          { type: 'role', role: 'source', expectedTypes: ['literal', 'expression'] },
          // Optional "as <responseType>": transformer emits 的; 作为 is the natural form.
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: '的', alternatives: ['作为', '当作'] },
              { type: 'role', role: 'responseType', expectedTypes: ['literal', 'expression'] },
            ],
          },
        ],
      },
      extraction: {
        source: { marker: '把', markerAlternatives: ['从', '由'] },
        responseType: { marker: '的', markerAlternatives: ['作为', '当作'] },
      },
    },
  ];
}

function getFetchPatternsMs(): LanguagePattern[] {
  return [
    {
      // Malay fetch. The transformer emits `ambil_dari {source}` for `fetch <url>`
      // (the verb `ambil_dari` already carries "from"), and `… sebagai {responseType}`
      // for `as json`. The generated pattern expected a separate `dari` source marker
      // (`ambil_dari dari …`), so the marker-less transform output dropped. This
      // tolerates the optional `dari` and the `sebagai` responseType. See
      // ZH_BLOCK_BODY_SCOPE.md (#2 sweep / ms profile; same shape as fetch-zh-ba).
      id: 'fetch-ms',
      language: 'ms',
      command: 'fetch',
      priority: 105,
      template: {
        format: 'ambil_dari dari {source} sebagai {responseType}',
        tokens: [
          { type: 'literal', value: 'ambil_dari', alternatives: ['muat', 'ambil'] },
          {
            type: 'group',
            optional: true,
            tokens: [{ type: 'literal', value: 'dari' }],
          },
          { type: 'role', role: 'source', expectedTypes: ['literal', 'expression'] },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'sebagai', alternatives: ['sbg'] },
              { type: 'role', role: 'responseType', expectedTypes: ['literal', 'expression'] },
            ],
          },
        ],
      },
      extraction: {
        source: { marker: 'dari' },
        responseType: { marker: 'sebagai', markerAlternatives: ['sbg'] },
      },
    },
  ];
}

function getFetchPatternsFr(): LanguagePattern[] {
  return [
    {
      // French fetch. For `fetch <url>` (no `from`) the i18n transformer emits a
      // marker-less `récupérer /api/data` (dict `fetch: récupérer`; profile primary
      // `chercher`), but the generated pattern requires a `de` source marker
      // (`chercher de …`), so the marker-less form dropped — collapsing an
      // `async fetch … then put …` / `fetch … as JSON then put …` body to a phantom
      // `set` (degenerate `{on, set}`). Tolerates the optional `de` and the `comme`
      // responseType. Same shape as fetch-ms / fetch-zh-ba; the `de`-marked form is
      // still covered by the generated pattern.
      id: 'fetch-fr',
      language: 'fr',
      command: 'fetch',
      priority: 105,
      template: {
        format: 'chercher de {source} comme {responseType}',
        tokens: [
          { type: 'literal', value: 'chercher', alternatives: ['récupérer'] },
          {
            type: 'group',
            optional: true,
            tokens: [{ type: 'literal', value: 'de' }],
          },
          { type: 'role', role: 'source', expectedTypes: ['literal', 'expression'] },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'comme' },
              { type: 'role', role: 'responseType', expectedTypes: ['literal', 'expression'] },
            ],
          },
        ],
      },
      extraction: {
        source: { marker: 'de' },
        responseType: { marker: 'comme' },
      },
    },
  ];
}

function getFetchPatternsPt(): LanguagePattern[] {
  return [
    {
      // Portuguese fetch — same marker-less-transform shape as French (above).
      // `fetch <url>` emits `buscar /api/data` (dict + profile `buscar`), but the
      // generated pattern requires a `de` source marker, so the marker-less form
      // dropped. Tolerates the optional `de` and the `como` responseType.
      id: 'fetch-pt',
      language: 'pt',
      command: 'fetch',
      priority: 105,
      template: {
        format: 'buscar de {source} como {responseType}',
        tokens: [
          { type: 'literal', value: 'buscar' },
          {
            type: 'group',
            optional: true,
            tokens: [{ type: 'literal', value: 'de' }],
          },
          { type: 'role', role: 'source', expectedTypes: ['literal', 'expression'] },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'como' },
              { type: 'role', role: 'responseType', expectedTypes: ['literal', 'expression'] },
            ],
          },
        ],
      },
      extraction: {
        source: { marker: 'de' },
        responseType: { marker: 'como' },
      },
    },
  ];
}

// Shared shape for the marker-less `fetch <url>` recovery (see fetch-fr / fetch-pt):
// `<verb> [<from-marker>] {source} [<as-marker> {responseType}]`. For `fetch <url>`
// (no `from`) the i18n transformer emits a marker-less `<verb> /api/data`, but the
// generated pattern requires the source marker — so `fetch` dropped (the body kept
// {on, put}, fid ~0.67: a faithful-but-incomplete pass that silently lost `fetch`).
function markerlessFetch(
  id: string,
  language: string,
  verb: string,
  fromMarker: string,
  asMarker: string,
  verbAlternatives?: string[],
  fromMarkerAlternatives?: string[]
): LanguagePattern {
  return {
    id,
    language,
    command: 'fetch',
    priority: 105,
    template: {
      format: `${verb} ${fromMarker} {source} ${asMarker} {responseType}`,
      tokens: [
        {
          type: 'literal',
          value: verb,
          ...(verbAlternatives ? { alternatives: verbAlternatives } : {}),
        },
        {
          type: 'group',
          optional: true,
          tokens: [
            {
              type: 'literal',
              value: fromMarker,
              ...(fromMarkerAlternatives ? { alternatives: fromMarkerAlternatives } : {}),
            },
          ],
        },
        { type: 'role', role: 'source', expectedTypes: ['literal', 'expression'] },
        {
          type: 'group',
          optional: true,
          tokens: [
            { type: 'literal', value: asMarker },
            { type: 'role', role: 'responseType', expectedTypes: ['literal', 'expression'] },
          ],
        },
      ],
    },
    extraction: {
      source: {
        marker: fromMarker,
        ...(fromMarkerAlternatives ? { markerAlternatives: fromMarkerAlternatives } : {}),
      },
      responseType: { marker: asMarker },
    },
  };
}

/**
 * Get fetch patterns for a specific language.
 */
export function getFetchPatternsForLanguage(language: string): LanguagePattern[] {
  switch (language) {
    case 'zh':
      return getFetchPatternsZh();
    case 'ms':
      return getFetchPatternsMs();
    case 'fr':
      return getFetchPatternsFr();
    case 'pt':
      return getFetchPatternsPt();
    // Marker-less fetch recovery for languages whose generated pattern requires a
    // source marker the transformer doesn't emit for `fetch <url>` (no `from`).
    case 'es':
      return [markerlessFetch('fetch-es', 'es', 'buscar', 'de', 'como')];
    case 'pl':
      return [markerlessFetch('fetch-pl', 'pl', 'pobierz', 'z', 'jako')];
    case 'id':
      // dict emits `ambil`, profile primary is `muat` — accept both.
      return [markerlessFetch('fetch-id', 'id', 'muat', 'dari', 'sebagai', ['ambil'])];
    case 'sw':
      return [markerlessFetch('fetch-sw', 'sw', 'leta', 'kutoka', 'kama')];
    case 'he':
      // transformer inserts the `את` accusative particle (`הבא את /url`) where the
      // generated pattern expects `מ` (from); accept either. Verb alt `טען`.
      return [markerlessFetch('fetch-he', 'he', 'הבא', 'מ', 'כ', ['טען'], ['את'])];
    default:
      return [];
  }
}
