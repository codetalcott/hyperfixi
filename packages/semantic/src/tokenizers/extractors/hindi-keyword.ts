/**
 * Hindi Keyword Extractor (Context-Aware)
 *
 * Handles Hindi word extraction for:
 * - Devanagari script (U+0900-U+097F, U+A8E0-U+A8FF)
 * - Mixed script words (Devanagari + ASCII)
 *
 * Integrates with morphological normalizer for verb conjugations.
 */

import type { ExtractionResult } from '../value-extractor-types';
import type { ContextAwareExtractor, TokenizerContext } from '../context-aware-extractor';

/**
 * Check if character is in the Devanagari script range.
 */
function isDevanagari(char: string): boolean {
  const code = char.charCodeAt(0);
  return (code >= 0x0900 && code <= 0x097f) || (code >= 0xa8e0 && code <= 0xa8ff);
}

/**
 * HindiKeywordExtractor - Context-aware extractor for Hindi words.
 */
export class HindiKeywordExtractor implements ContextAwareExtractor {
  readonly name = 'hindi-keyword';

  private context?: TokenizerContext;

  setContext(context: TokenizerContext): void {
    this.context = context;
  }

  canExtract(input: string, position: number): boolean {
    return isDevanagari(input[position]);
  }

  extract(input: string, position: number): ExtractionResult | null {
    if (!this.context) {
      throw new Error('HindiKeywordExtractor: context not set');
    }

    const startPos = position;

    // Extract a single Devanagari word (stops at the next space or non-Devanagari).
    //
    // Multi-word Hindi keyword phrases are matched BEFORE this extractor, so it no
    // longer needs its own hardcoded compound allowlist (Task #10 Phase C):
    //   - non-marker phrases (के लिए=for, जब तक=while, से पहले=before, के बाद=after,
    //     नहीं तो=else, …) tokenize via the base tokenizer's profile-driven
    //     `tryMultiWordKeyword` (#416), which runs first and emits ONE keyword token;
    //   - the remaining marker phrases that have no profile keyword (के साथ=with,
    //     के बारे में=about) are caught by HindiParticleExtractor, which is
    //     registered ahead of this extractor.
    let word = '';
    let pos = position;

    while (pos < input.length && isDevanagari(input[pos])) {
      word += input[pos];
      pos++;
    }

    // Hyphen-joined keyword recovery. Several hi profile/dict keywords are
    // `<verb>-करें` compounds (`साफ़-करें`=clear, `बंद-करें`=close, `खाली-करें`=empty,
    // `चिह्नित-करें`=select). The reader stops at `-`, so `साफ़-करें` split into three
    // tokens, the command verb never matched, and the action dropped
    // (keydown-key-is-syntax hi: `clear` lost, fid 0.5). When a `-` joins two
    // Devanagari runs, read the joined form and adopt it ONLY if it resolves to a
    // REGISTERED keyword — so hyphenated identifiers/selectors stay split as before.
    // See docs-internal/HANDOFF-lossy-tail.md (Arc 4 / keydown-key-is-syntax).
    if (
      this.context &&
      input[pos] === '-' &&
      pos + 1 < input.length &&
      isDevanagari(input[pos + 1])
    ) {
      let extPos = pos;
      let ext = word;
      while (extPos < input.length && (input[extPos] === '-' || isDevanagari(input[extPos]))) {
        ext += input[extPos++];
      }
      if (this.context.lookupKeyword(ext)) {
        word = ext;
        pos = extPos;
      }
    }

    // Underscore-joined keyword recovery — the `_` sibling of the hyphen
    // block above (and the swahili-keyword.ts mechanism). The i18n hi dict
    // joins the resize event as `आकार_बदलें`; the reader stops at `_`, so the
    // compound shattered into आकार + `_` + बदलें(→toggle), a PHANTOM toggle
    // command anchored on the stray verb (the hi window-resize mis-parse,
    // Arc F). Adopt the joined run ONLY if it resolves to a REGISTERED
    // keyword — underscore identifiers stay split exactly as before.
    if (
      this.context &&
      input[pos] === '_' &&
      pos + 1 < input.length &&
      isDevanagari(input[pos + 1])
    ) {
      let extPos = pos;
      let ext = word;
      while (extPos < input.length && (input[extPos] === '_' || isDevanagari(input[extPos]))) {
        ext += input[extPos++];
      }
      if (this.context.lookupKeyword(ext)) {
        word = ext;
        pos = extPos;
      }
    }

    if (!word) return null;

    // Look up keyword entry
    const keywordEntry = this.context.lookupKeyword(word);
    const normalized =
      keywordEntry && keywordEntry.normalized !== keywordEntry.native
        ? keywordEntry.normalized
        : undefined;

    // Try morphological normalization if available
    let morphNormalized: string | undefined;
    if (!keywordEntry && this.context.normalizer) {
      const morphResult = this.context.normalizer.normalize(word);
      if (morphResult.stem !== word && morphResult.confidence >= 0.7) {
        const stemEntry = this.context.lookupKeyword(morphResult.stem);
        if (stemEntry) {
          morphNormalized = stemEntry.normalized;
        }
      }
    }

    return {
      value: word,
      length: pos - startPos,
      metadata: {
        normalized: normalized || morphNormalized,
      },
    };
  }
}

/**
 * Create Hindi-specific extractors.
 */
export function createHindiExtractors(): ContextAwareExtractor[] {
  return [new HindiKeywordExtractor()];
}
