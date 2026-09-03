/**
 * BARE-surface en→foreign render-fidelity gate.
 *
 * WHY THIS EXISTS
 * ---------------
 * Every corpus row that exercises a command wraps it in an event handler, so
 * the eleven multilingual signals, `render-fidelity`, and 8,800 unit tests are
 * all blind to the PLAIN form of the same command. That blindness is not
 * theoretical: measured 2026-08-27, `hyperfixi.translate('toggle .active on
 * #panel', 'en', 'bn')` produced a surface that did not parse back AT ALL — the
 * plainest two-role toggle there is — and neither did tl/vi's bare `set the
 * *background-color of #theme to "#ff6600"`. Both were pre-existing, both were
 * found by hand, and nothing in CI could have reported either.
 *
 * It matters because the bare form is a first-class public surface: MCP
 * `translate_code`, `hyperfixi.translate`/`getAllTranslations`, core's
 * `MultilingualHyperscript` and the VS Code "Show in my language" badge are all
 * routinely handed a single command with no handler around it.
 *
 * WHAT IT ASSERTS
 * ---------------
 * Exactly what `render-fidelity` asserts — render the English into each
 * language, parse it back, require that no action and no role went missing —
 * but over the HANDLER-STRIPPED body of each corpus pattern instead of the
 * whole row. Same ratchet shape, same allowlist contract, and it delegates to
 * `checkRenderFidelity` so the two can never drift in how they score.
 *
 * NOT REDUNDANT. Of the 69 failing pairs this gate sees today, **37 are
 * invisible to the wrapped gate** — they pass wrapped and fail bare, because a
 * fused per-command handler pattern binds a role the standalone pattern misses.
 * Four of the 37 do not parse back at all.
 *
 * DERIVED, NOT HAND-PICKED. The corpus supplies the constructs; there is no
 * command list to maintain here. A hand-written one would drift exactly the way
 * `scripts/test-check-all.sh` and the ci.yml job lists did.
 *
 * DB DEPENDENCY. Same as the wrapped gate: the SET of corpus rows depends on a
 * fresh `populate`, so this runs only when the caller asserts one.
 */
import { getAllPatterns } from '@hyperfixi/patterns-reference';
import { parseSemantic } from '@lokascript/semantic';
import { checkRenderFidelity, type RenderFidelityResult } from './render-fidelity';

/** A corpus row reduced to the body of its event handler. */
export interface BareBody {
  readonly id: string;
  readonly rawCode: string;
}

/**
 * Strip a leading `on <event> [from <source>] ` handler head.
 *
 * Deliberately only the simple head: a row whose handler carries modifiers this
 * does not recognize keeps its head, still parses as a handler, and is dropped
 * by the guard in {@link deriveBareBodies} rather than being scored wrongly.
 */
function stripHandlerHead(english: string): string | null {
  const match = /^on\s+\S+(\s+from\s+\S+)?\s+/.exec(english);
  if (!match) return null;
  const body = english.slice(match[0].length).trim();
  return body.length > 0 ? body : null;
}

/**
 * Reduce the corpus to the handler bodies that are meaningful bare.
 *
 * Three exclusions, each because the row has no bare surface to score:
 *  - no handler head (a `behavior`/`socket`/`eventsource` block, or already bare);
 *  - the stripped body does not parse as English at all;
 *  - the stripped body STILL parses as an event handler. A block-shaped body
 *    (`if … end`) re-anchors as one, which leaks a phantom `on` action into the
 *    reference that then "goes missing" on the round trip for reasons that have
 *    nothing to do with the bare surface. Measured: 7 rows, and they accounted
 *    for 24 of the 61 apparent bare-only failures before the guard existed.
 */
export function deriveBareBodies(
  patterns: ReadonlyArray<{ id: string; rawCode: string }>
): BareBody[] {
  const bodies: BareBody[] = [];
  for (const pattern of patterns) {
    const body = stripHandlerHead(pattern.rawCode);
    if (!body) continue;
    let reference;
    try {
      reference = parseSemantic(body, 'en')?.node ?? null;
    } catch {
      continue;
    }
    if (!reference) continue;
    if ((reference as { action?: string }).action === 'on') continue;
    bodies.push({ id: pattern.id, rawCode: body });
  }
  return bodies;
}

/** Score every corpus handler BODY, bare, in every language. */
export async function checkBareRenderFidelity(opts?: {
  languages?: readonly string[];
}): Promise<RenderFidelityResult> {
  const patterns = await getAllPatterns({ limit: 1000 });
  const bodies = deriveBareBodies(patterns);
  return opts?.languages
    ? checkRenderFidelity({ languages: opts.languages, patterns: bodies })
    : checkRenderFidelity({ patterns: bodies });
}
