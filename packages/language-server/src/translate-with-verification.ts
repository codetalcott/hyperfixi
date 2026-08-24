/**
 * `lokascript/translateWithVerification` — the custom LSP request behind the
 * editor's "show this handler in my language" command (agent-era arc 5
 * slice 2).
 *
 * Renders hyperscript into a target language via the semantic package's
 * deterministic grammar transformation and scores the rendering against the
 * source with the shared pairwise scorer (`@lokascript/semantic/fidelity` —
 * the same implementation behind `CompilationService.scoreFidelity()` and the
 * multilingual CI ratchet). `verification.faithful === true` is the badge the
 * editor shows: "this rendering is structurally exact".
 *
 * The semantic namespace is a parameter rather than an import: the server
 * treats `@lokascript/semantic` as optional (hyperscript-mode bundles shim it
 * to an empty module), so the handler probes for the exports it needs and
 * degrades to a clean error — mirroring `resolveMode()`'s probe pattern.
 */

import { scoreNodes, type FidelityReport } from '@lokascript/semantic/fidelity';

export interface TranslateWithVerificationParams {
  /** Hyperscript source (typically the `_="…"` attribute body or a selection). */
  code: string;
  /** Source language code (default 'en'). */
  from?: string;
  /** Target language code. */
  to: string;
}

export interface TranslateVerification extends Partial<FidelityReport> {
  /** Whether both sides parsed, making the report meaningful. */
  ok: boolean;
}

export interface TranslateWithVerificationResult {
  ok: boolean;
  /** The rendered translation, when ok. */
  code?: string;
  /** Advisory fidelity report; absent only when translation itself failed. */
  verification?: TranslateVerification;
  /** Human-readable failure reason, when not ok. */
  error?: string;
}

/** The semantic-package surface this handler needs (probed, never assumed). */
export interface SemanticLike {
  translate?: (code: string, from: string, to: string) => string;
  parseSemantic?: (code: string, language: string) => { node: unknown; confidence: number };
}

export function translateWithVerification(
  params: TranslateWithVerificationParams,
  semantic: SemanticLike | null | undefined
): TranslateWithVerificationResult {
  if (!params?.code?.trim()) {
    return { ok: false, error: 'No hyperscript code provided.' };
  }
  if (!params.to) {
    return { ok: false, error: 'No target language provided.' };
  }
  if (!semantic?.translate || !semantic.parseSemantic) {
    return {
      ok: false,
      error:
        'Multilingual support is not available in this server build ' +
        '(@lokascript/semantic is absent — hyperscript mode).',
    };
  }

  const from = params.from ?? 'en';
  let rendered: string;
  try {
    rendered = semantic.translate(params.code, from, params.to);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  // Advisory verification, mirroring CompilationService.translate(): a
  // verification that fails to parse never flips the translation's ok.
  let verification: TranslateVerification = { ok: false };
  try {
    const ref = semantic.parseSemantic(params.code, from);
    const cand = semantic.parseSemantic(rendered, params.to);
    if (ref?.node && cand?.node) {
      verification = { ok: true, ...scoreNodes(ref.node, cand.node) };
    }
  } catch {
    // verification stays { ok: false } — the translation itself is unaffected.
  }

  return { ok: true, code: rendered, verification };
}
