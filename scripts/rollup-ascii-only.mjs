/**
 * Rollup output plugin: escape every non-ASCII character as `\uXXXX`.
 *
 * Why this exists
 * ---------------
 * The bundles carry 24 languages of keyword tables plus a handful of
 * script-specific regexes, so they contained ~21,000 raw non-ASCII characters.
 * A browser that decodes the file as anything other than UTF-8 — a static host
 * that omits `charset=utf-8` on a `text/javascript` response, served to a page
 * with no `<meta charset>` — reinterprets those bytes with the document's
 * fallback encoding (windows-1252). Two failure modes follow, and a downstream
 * consumer hit the first against the published 2.9.0:
 *
 *   1. FATAL. A regex character class whose endpoints mangle into the wrong
 *      order stops being a valid regex, and regex literals are validated at
 *      PARSE time — so the whole bundle fails to load:
 *
 *        Invalid regular expression: /[Ù‹-Ù’Ù°]/g: Range out of order in character class
 *
 *      `window.hyperfixi` is then simply `undefined`, every `_=` attribute
 *      silently does nothing, and nothing in the console mentions encoding.
 *
 *   2. SILENT. Where the file still parses, every non-ASCII string literal is
 *      quietly corrupted — the Arabic/CJK/Cyrillic keyword tables stop matching,
 *      which reads as "multilingual is broken" rather than "wrong charset".
 *
 * Escaping at the output boundary removes the whole class: the emitted file is
 * pure ASCII, so it decodes identically under every encoding. Measured cost is
 * +0.1-0.2 KB gzipped on the big bundles (gzip collapses the repeated `\u`
 * runs); `dist/index.js` actually shrinks.
 *
 * This is the second half of the fix. The first half is at the source: the raw
 * regex literals (`/[ً-ْٰ]/g` in
 * `packages/framework/src/core/tokenization/token-utils.ts` and 27 siblings) are
 * now written with `\uXXXX` escapes, because NO bundler option can fix those
 * downstream — esbuild treats a regex literal as opaque and copies it verbatim
 * even under `charset: 'ascii'`, which is why the tsup-built packages needed the
 * source change.
 *
 * This plugin is still required for the STRING half: rollup does not escape
 * string literals, and the 24-language keyword tables are ~21,000 non-ASCII
 * characters of them. It also keeps a future raw literal from reaching a
 * shipped bundle. (Terser's own `ascii_only` would cover the outputs it
 * minifies, but several outputs here are not minified at all.)
 *
 * Escaping per UTF-16 code unit is deliberate: surrogate pairs emit both halves
 * (`😀`), which is the correct encoding of an astral character in JS
 * source and round-trips through both string and regex literals.
 */

import MagicString from 'magic-string';

/**
 * Replace every non-ASCII code unit with its `\uXXXX` escape.
 *
 * Safe in every JavaScript context that can hold a non-ASCII character:
 * string literals, template literals, and regex literals all accept `\uXXXX`
 * with identical meaning. Comments become literally-escaped text, which is
 * inert. Identifiers are not a concern — bundled code has ASCII identifiers.
 *
 * @param {string} code
 * @returns {string}
 */
export function escapeNonAscii(code) {
  // eslint-disable-next-line no-control-regex
  return code.replace(/[^\x00-\x7F]/g, ch => '\\u' + ch.charCodeAt(0).toString(16).padStart(4, '0'));
}

/**
 * Wrap a rollup config (or array of them) so every output gets the escape as
 * its LAST transform. Prefer this over hand-placing `asciiOnly()` in a plugins
 * array: `renderChunk` hooks run in plugin order and terser DECODES `\uXXXX`
 * escapes back to raw characters, so an escape that runs before terser is
 * simply undone. `dist/index.min.js` hit exactly that — its terser sits in
 * `output.plugins`, which runs after all input-level plugins.
 *
 * @template T
 * @param {T} config - a rollup config object or array of them
 * @returns {T}
 */
export function withAsciiOnly(config) {
  const apply = one => {
    const outputs = Array.isArray(one.output) ? one.output : [one.output];
    return {
      ...one,
      output: outputs.filter(Boolean).map(output => ({
        ...output,
        // Output-level plugins run after every input-level plugin, so appending
        // here guarantees the escape is the final transform regardless of where
        // the config happens to place terser.
        plugins: [...(output.plugins ?? []), asciiOnly()],
      })),
    };
  };
  return Array.isArray(config) ? config.map(apply) : apply(config);
}

/**
 * @returns {import('rollup').Plugin}
 */
export function asciiOnly() {
  return {
    name: 'ascii-only',
    renderChunk(code, _chunk, options) {
      // eslint-disable-next-line no-control-regex
      const pattern = /[^\x00-\x7F]/g;
      if (!pattern.test(code)) return null; // already ASCII — leave the map alone
      pattern.lastIndex = 0;

      const s = new MagicString(code);
      let match;
      while ((match = pattern.exec(code)) !== null) {
        const i = match.index;
        s.overwrite(i, i + 1, '\\u' + code.charCodeAt(i).toString(16).padStart(4, '0'));
      }

      return {
        code: s.toString(),
        map: options.sourcemap ? s.generateMap({ hires: true }) : null,
      };
    },
  };
}
