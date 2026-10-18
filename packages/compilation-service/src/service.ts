/**
 * CompilationService — the main orchestrator.
 *
 * Accepts hyperscript in three formats (natural language, explicit syntax, LLM JSON),
 * validates it through semantic schemas and the engine, and translates, diffs, and scores it.
 * (It compiled to JavaScript through `@hyperfixi/aot-compiler` until 4.0, when the AOT compiler
 * retired, and rendered React/Vue/Svelte components and Playwright tests until 6.0.)
 */

import type {
  CompileRequest,
  ValidationResponse,
  TranslateRequest,
  TranslateResponse,
  DiffRequest,
  DiffResponse,
  GenerateRequest,
  GenerateResponse,
  ServiceOptions,
  SemanticJSON,
  SemanticJSONValue,
  Diagnostic,
  NormalizeResult,
} from './types.js';
import { diffBehaviors } from './diff/diff.js';
import { scoreNodes, type ScoreRequest, type ScoreResponse } from './scoring/score.js';
import { normalize, initNormalizer } from './input/normalize.js';
import {
  runValidationGates,
  initValidation,
  type ValidationFunctions,
} from './validation/gates.js';
import { extractOperations } from './operations/extract.js';

// =============================================================================
// Service
// =============================================================================

/** A variable semantic finds spelled like a word of some language, as the service reads it. */
interface CollisionFinding {
  readonly name: string;
  readonly occurrences: ReadonlyArray<unknown>;
  readonly rename: string | undefined;
  readonly message: string;
}

/** semantic's `findTranslationCollisions`, as the service calls it. */
type TranslationCollisionsFn = (
  code: string,
  from: string,
  to: string
) => ReadonlyArray<CollisionFinding>;

/** semantic's `findNameCollisions`: a variable spelled like a word of its own code's language. */
type NameCollisionsFn = (code: string, language: string) => ReadonlyArray<CollisionFinding>;

/** `@lokascript/semantic`'s refusal, by name (the service loads semantic dynamically). */
interface LossyTranslation {
  name: 'LossyTranslationError';
  message: string;
  partial: string;
  loss: { kind: string; lost: readonly string[] };
}

function isLossyTranslation(error: unknown): error is LossyTranslation {
  return (
    error instanceof Error &&
    error.name === 'LossyTranslationError' &&
    typeof (error as Partial<LossyTranslation>).partial === 'string'
  );
}

/** A semantic gate's error on English the engine reads: a warning, saying why. */
function readByTheEngine(diagnostic: Diagnostic): Diagnostic {
  if (diagnostic.severity !== 'error') return diagnostic;
  return {
    ...diagnostic,
    severity: 'warning',
    message:
      `${diagnostic.message} @hyperfixi/engine reads this code, so it runs as written; ` +
      "semantic's reading of it (the IR here, and a translation made from it) may leave part of it out.",
  };
}

export class CompilationService {
  private confidenceThreshold: number;
  private translateFn: ((code: string, from: string, to: string) => string) | null = null;
  private translationCollisionsFn: TranslationCollisionsFn | null = null;
  private nameCollisionsFn: NameCollisionsFn | null = null;
  /** semantic's `render`, for the English a translation runs as. */
  private renderFn: ((node: unknown, language: string) => string) | null = null;
  /**
   * `@hyperfixi/engine`'s first parse error for a source (null: it parses). Set by create()
   * when the engine is installed (an optional peer); without it there is no engine check.
   */
  private engineError: ((source: string) => string | null) | null = null;

  private constructor(options: ServiceOptions = {}) {
    this.confidenceThreshold = options.confidenceThreshold ?? 0.7;
  }

  /**
   * Create a CompilationService by dynamically importing dependencies.
   *
   * This async factory resolves @lokascript/semantic (and, when it is installed,
   * @hyperfixi/engine) at runtime.
   */
  static async create(options: ServiceOptions = {}): Promise<CompilationService> {
    const service = new CompilationService(options);

    // Import semantic package
    const semantic = await import('@lokascript/semantic');

    // Initialize normalizer with semantic parsing functions
    initNormalizer({
      parseSemantic: semantic.parseSemantic,
      parseExplicit: semantic.parseExplicit,
      isExplicitSyntax: semantic.isExplicitSyntax,
    });

    // Initialize validation with schema validator
    // Cast needed: our interface uses `unknown` to avoid importing semantic types
    initValidation({
      validateSemanticResult:
        semantic.validateSemanticResult as ValidationFunctions['validateSemanticResult'],
    });

    // Store translate function
    service.translateFn = semantic.translate;
    service.translationCollisionsFn = semantic.findTranslationCollisions;
    service.nameCollisionsFn = semantic.findNameCollisions;
    service.renderFn = semantic.render as (node: unknown, language: string) => string;

    // The engine the product runs (hyperfixi-hs.js), when it is installed. Natural-language
    // input has to be English it reads: semantic's grammar is more permissive than the
    // engine's, and a source only semantic accepts does nothing on a page.
    try {
      const engine = await import('@hyperfixi/engine');
      engine.register(...engine.everything);
      service.engineError = source => {
        try {
          return engine.api.parse(source).errors[0]?.message.split('\n')[0] ?? null;
        } catch (e) {
          return (e instanceof Error ? e.message : String(e)).split('\n')[0] ?? 'parse error';
        }
      };
    } catch {
      /* @hyperfixi/engine is not installed: validation is semantic's alone */
    }

    return service;
  }

  /**
   * The engine's verdict on natural-language input: its parse of the English the page would
   * run — the source as written, or a translation's English render (what
   * `@lokascript/hyperscript-adapter` hands the engine). Null when it parses, or when there is
   * nothing to check (explicit / JSON input, or no engine installed).
   */
  private engineDiagnostic(
    request: CompileRequest,
    normalized: NormalizeResult
  ): Diagnostic | null {
    if (!this.engineError || normalized.format !== 'natural' || !request.code) return null;
    const english = this.isEnglishAsWritten(request, normalized);
    let source = request.code;
    if (!english) {
      if (!this.renderFn || !normalized.node) return null;
      try {
        source = this.renderFn(normalized.node, 'en');
      } catch {
        return null;
      }
    }
    const error = this.engineError(source);
    if (!error) return null;
    return {
      severity: 'error',
      code: 'ENGINE_PARSE_ERROR',
      message: english
        ? `@hyperfixi/engine cannot read this: ${error}`
        : `@hyperfixi/engine cannot read its English (${source}): ${error}`,
      suggestion:
        "The engine reads upstream _hyperscript's grammar: check the command's syntax " +
        '(get_command_docs) and rewrite the part the error names.',
    };
  }

  /** Natural-language English: the source as written is what the engine runs. */
  private isEnglishAsWritten(request: CompileRequest, normalized: NormalizeResult): boolean {
    const language = request.language ?? 'en';
    return (
      normalized.format === 'natural' &&
      !!request.code &&
      (language === 'en' || language.startsWith('en-'))
    );
  }

  // ===========================================================================
  // Public API
  // ===========================================================================

  /**
   * Validate input: semantic's parse and schemas, and (for natural-language input) the
   * engine's parse of the English the page would run. For English, the engine's parse decides
   * `ok`, and semantic's own doubts are warnings, unless the request sets `confidence`.
   * Returns semantic representation and diagnostics.
   */
  validate(request: CompileRequest): ValidationResponse {
    const diagnostics: Diagnostic[] = [];

    // Normalize
    const normalized = normalize(request);

    // English as written is what the page runs, so for natural-language English the engine's
    // parse decides. When it reads the code, semantic's doubts (no reading, a low confidence, a
    // role its schema expects) are warnings: the code runs, but the IR may not show all of it.
    // Measured on the command-shape cases (testing-framework): semantic's gates rejected 90 of
    // the 1,128 the engine reads, and on the agent bench caught nothing the engine missed. Foreign
    // input runs as semantic's translation, so its gates stay errors there, as they do when
    // the request sets `confidence` (a bar for semantic's reading).
    const engineDecides =
      this.engineError !== null &&
      request.confidence === undefined &&
      this.isEnglishAsWritten(request, normalized);
    const engineRejects = engineDecides ? this.engineDiagnostic(request, normalized) : null;
    const advisory = engineDecides && !engineRejects ? readByTheEngine : undefined;

    diagnostics.push(...(advisory ? normalized.diagnostics.map(advisory) : normalized.diagnostics));

    if (!normalized.node) {
      if (engineRejects) diagnostics.push(engineRejects);
      return { ok: advisory !== undefined, diagnostics };
    }

    // Validate
    const threshold = request.confidence ?? this.confidenceThreshold;
    const gateResult = runValidationGates(
      normalized.node,
      normalized.confidence,
      threshold,
      advisory
    );
    diagnostics.push(...gateResult.diagnostics);

    const engineError = engineDecides
      ? engineRejects
      : gateResult.pass
        ? this.engineDiagnostic(request, normalized)
        : null;
    if (engineError) diagnostics.push(engineError);
    const ok = gateResult.pass && !engineError;
    diagnostics.push(...this.nameCollisions(request, normalized));

    const semanticJSON = ok ? nodeToSemanticJSON(normalized.node) : undefined;

    return {
      ok,
      semantic: semanticJSON,
      confidence: gateResult.adjustedConfidence,
      diagnostics,
    };
  }

  /**
   * A variable spelled like a word of the code's own language (es `si`, tr `i`): its readers
   * tell the two apart only by where it stands, so the warning suggests a rename. Moved here
   * from MCP `validate_hyperscript`, with its wording and its confidence floor.
   */
  private nameCollisions(request: CompileRequest, normalized: NormalizeResult): Diagnostic[] {
    const language = request.language ?? 'en';
    const english = language === 'en' || language.startsWith('en-');
    if (normalized.format !== 'natural' || !request.code || english) return [];
    if (!normalized.node || normalized.confidence < 0.5) return [];
    return (this.nameCollisionsFn?.(request.code, language) ?? []).map(finding => ({
      severity: 'warning' as const,
      code: 'NAME_COLLISION',
      message: finding.message,
      suggestion: finding.rename
        ? `Rename \`${finding.name}\` to \`${finding.rename}\` in the ${finding.occurrences.length} place(s) the parse reads it as the variable.`
        : `Rename \`${finding.name}\`.`,
    }));
  }

  /**
   * Translate hyperscript between languages.
   */
  translate(request: TranslateRequest): TranslateResponse {
    if (!this.translateFn) {
      return {
        ok: false,
        diagnostics: [
          {
            severity: 'error',
            code: 'NOT_INITIALIZED',
            message: 'Translation not available.',
          },
        ],
      };
    }

    try {
      const result = this.translateFn(request.code, request.from, request.to);

      // Arc 5's verified-translation badge: score the rendering against its
      // source (cross-language scoreFidelity). Advisory — verification can
      // fail to parse without flipping ok, and its diagnostics stay inside it.
      let verification: ScoreResponse | undefined;
      if (request.verify !== false) {
        verification = this.scoreFidelity({
          reference: { code: request.code, language: request.from },
          candidate: { code: result, language: request.to },
        });
      }

      return {
        ok: true,
        code: result,
        ...(verification !== undefined ? { verification } : {}),
        diagnostics: this.translationCollisions(request),
      };
    } catch (error) {
      // A translation that would lose part of the script is refused: say what
      // it loses, and keep the partial text out of `code`.
      if (isLossyTranslation(error)) {
        return {
          ok: false,
          partial: error.partial,
          loss: { kind: error.loss.kind, lost: [...error.loss.lost] },
          diagnostics: [
            {
              severity: 'error',
              code: 'LOSSY_TRANSLATION',
              message: error.message,
              suggestion:
                'The translation would drop the part listed in `loss.lost`. ' +
                'Rewrite that part of the source, or translate the rest without it.',
            },
          ],
        };
      }
      return {
        ok: false,
        diagnostics: [
          {
            severity: 'error',
            code: 'TRANSLATE_ERROR',
            message: error instanceof Error ? error.message : String(error),
          },
        ],
      };
    }
  }

  /**
   * A variable of the source that the target language reads as a value word
   * (tl `ako` is `me`): the translation reads the value, and no spelling of
   * the name tells them apart, so the fix is a rename before translating.
   */
  private translationCollisions(request: TranslateRequest): Diagnostic[] {
    const findings = this.translationCollisionsFn?.(request.code, request.from, request.to) ?? [];
    return findings.map(finding => ({
      severity: 'warning' as const,
      code: 'NAME_COLLISION',
      message: finding.message,
      suggestion: finding.rename
        ? `Rename \`${finding.name}\` to \`${finding.rename}\` in the source (${finding.occurrences.length} place(s)), then translate.`
        : `Rename \`${finding.name}\` in the source, then translate.`,
    }));
  }

  /**
   * Compare two hyperscript inputs at the behavior level.
   *
   * Both sides are independently normalized and validated, then compared
   * as abstract operations. Same behavior in different languages → identical.
   */
  diff(request: DiffRequest): DiffResponse {
    const diagnostics: Diagnostic[] = [];
    const threshold = request.confidence ?? this.confidenceThreshold;

    // Normalize both sides independently
    const normA = normalize({
      code: request.a.code,
      explicit: request.a.explicit,
      semantic: request.a.semantic,
      language: request.a.language,
      confidence: request.confidence,
    });
    diagnostics.push(...normA.diagnostics.map(d => ({ ...d, message: `[a] ${d.message}` })));

    const normB = normalize({
      code: request.b.code,
      explicit: request.b.explicit,
      semantic: request.b.semantic,
      language: request.b.language,
      confidence: request.confidence,
    });
    diagnostics.push(...normB.diagnostics.map(d => ({ ...d, message: `[b] ${d.message}` })));

    if (!normA.node || !normB.node) {
      return {
        ok: false,
        identical: false,
        trigger: null,
        operations: [],
        summary: 'Parse failed',
        diagnostics,
      };
    }

    // Validate both sides
    const gateA = runValidationGates(normA.node, normA.confidence, threshold);
    diagnostics.push(...gateA.diagnostics.map(d => ({ ...d, message: `[a] ${d.message}` })));

    const gateB = runValidationGates(normB.node, normB.confidence, threshold);
    diagnostics.push(...gateB.diagnostics.map(d => ({ ...d, message: `[b] ${d.message}` })));

    if (!gateA.pass || !gateB.pass) {
      return {
        ok: false,
        identical: false,
        trigger: null,
        operations: [],
        summary: 'Validation failed',
        diagnostics,
      };
    }

    // Extract operations from both
    const specA = extractOperations(normA.node);
    const specB = extractOperations(normB.node);

    // Diff
    const result = diffBehaviors(specA, specB);

    return {
      ok: true,
      identical: result.identical,
      trigger: result.trigger,
      operations: result.operations,
      summary: result.summary,
      diagnostics,
    };
  }

  /**
   * Score a candidate against a reference for structural fidelity — the
   * multilingual ratchet's scorers (docs/FIDELITY.md) applied to one pair of
   * inputs. Sides accept any input format and may be in different languages;
   * see src/scoring/score.ts for signal semantics. Complementary to diff():
   * diff answers "identical, and where not?", this answers "how faithful, and
   * what exactly is missing or hallucinated?".
   */
  scoreFidelity(request: ScoreRequest): ScoreResponse {
    const diagnostics: Diagnostic[] = [];
    const threshold = request.confidence ?? this.confidenceThreshold;

    const normRef = normalize({ ...request.reference, confidence: request.confidence });
    diagnostics.push(
      ...normRef.diagnostics.map(d => ({ ...d, message: `[reference] ${d.message}` }))
    );
    const normCand = normalize({ ...request.candidate, confidence: request.confidence });
    diagnostics.push(
      ...normCand.diagnostics.map(d => ({ ...d, message: `[candidate] ${d.message}` }))
    );

    if (!normRef.node || !normCand.node) {
      return { ok: false, diagnostics };
    }

    const gateRef = runValidationGates(normRef.node, normRef.confidence, threshold);
    const gateCand = runValidationGates(normCand.node, normCand.confidence, threshold);
    diagnostics.push(
      ...gateRef.diagnostics.map(d => ({ ...d, message: `[reference] ${d.message}` }))
    );
    diagnostics.push(
      ...gateCand.diagnostics.map(d => ({ ...d, message: `[candidate] ${d.message}` }))
    );
    if (!gateRef.pass || !gateCand.pass) {
      return { ok: false, diagnostics };
    }

    // A side whose parse left tokens unconsumed was scored on a TRUNCATED
    // node, so every score compares less than was written. Scoring a
    // translation against a truncated reference is how `on load click() me`
    // → `ロード を で` came out faithful 1.0 on every axis: both sides had
    // dropped the same command. The scores stay as measured; `faithful` — the
    // claim "this rendering is structurally exact" — needs both parses whole.
    const truncated = (...lists: Diagnostic[][]): boolean =>
      lists.some(ds => ds.some(d => d.code === 'UNCONSUMED_INPUT'));
    const referenceComplete = !truncated(normRef.diagnostics, gateRef.diagnostics);
    const candidateComplete = !truncated(normCand.diagnostics, gateCand.diagnostics);
    if (!referenceComplete || !candidateComplete) {
      const sides = [!referenceComplete && 'reference', !candidateComplete && 'candidate']
        .filter(Boolean)
        .join(' and ');
      diagnostics.push({
        severity: 'warning',
        code: 'INCOMPLETE_PARSE',
        message: `The ${sides} parse left tokens unconsumed, so the scores compare only what parsed; not faithful.`,
        suggestion:
          'The unconsumed tokens are named in the UNCONSUMED_INPUT diagnostics above. ' +
          'If the reference is truncated, a translation of it drops the same clause.',
      });
    }

    const report = scoreNodes(normRef.node, normCand.node);
    return {
      ok: true,
      diagnostics,
      ...report,
      faithful: report.faithful && referenceComplete && candidateComplete,
      referenceComplete,
      candidateComplete,
    };
  }

  /**
   * Generate a target-specific output from LSE (bracket syntax or protocol JSON).
   *
   * Accepts LSE produced by an LLM (via `lse_generate_with_correction` MCP tool),
   * validates it, and renders to the requested target format.
   *
   * Targets (`target` is required):
   * - 'intent-element' — HTML snippet with embedded `<lse-intent>` JSON
   *
   * (The react, vue and svelte targets were removed in 6.0 with `generateComponent`.)
   */
  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    const { lse, target, task } = request;
    const diagnostics: Diagnostic[] = [];

    const isJSON = lse.trimStart().startsWith('{');

    // ── intent-element: validate via @lokascript/intent, render HTML ───────
    if (target === 'intent-element') {
      try {
        const { parseExplicit, toProtocolJSON, validateProtocolJSON, fromProtocolJSON } =
          await import('@lokascript/framework');

        let node: import('@lokascript/framework').SemanticNode | null = null;

        if (isJSON) {
          let parsed: unknown;
          try {
            parsed = JSON.parse(lse);
          } catch {
            return {
              ok: false,
              diagnostics: [
                { severity: 'error', code: 'INVALID_JSON', message: 'LSE is not valid JSON' },
              ],
            };
          }
          const protoDiags = validateProtocolJSON(parsed as Record<string, unknown>);
          for (const d of protoDiags) {
            diagnostics.push({
              severity: d.severity as 'error' | 'warning' | 'info',
              code: d.code,
              message: d.message,
            });
          }
          if (!protoDiags.some(d => d.severity === 'error')) {
            node = fromProtocolJSON(parsed as Parameters<typeof fromProtocolJSON>[0]);
          }
        } else {
          try {
            node = parseExplicit(lse);
          } catch (e) {
            return {
              ok: false,
              diagnostics: [
                {
                  severity: 'error',
                  code: 'PARSE_ERROR',
                  message: e instanceof Error ? e.message : String(e),
                },
              ],
            };
          }
        }

        if (!node) {
          return { ok: false, diagnostics };
        }

        const protocol = toProtocolJSON(node);
        const protocolStr = JSON.stringify(protocol, null, 2);
        const taskComment = task ? `<!-- Task: ${task.replace(/-->/g, '-\\->')} -->\n` : '';

        // Infer a declarative trigger attribute from the node.
        //
        // - event-handler nodes carry their event name in roles.get('event')
        //   as a literal (wire-format trigger sugar is unwrapped into this
        //   shape by fromProtocolJSON). Emit trigger="<event>".
        // - Everything else gets trigger="load" — the element fires
        //   validation+execution on connect. This matches the default
        //   behavior and is the safest choice when no event is specified.
        let triggerAttr = 'load';
        if (node.kind === 'event-handler') {
          const eventValue = node.roles.get('event');
          if (
            eventValue &&
            eventValue.type === 'literal' &&
            typeof eventValue.value === 'string' &&
            eventValue.value.length > 0
          ) {
            triggerAttr = eventValue.value;
          }
        }
        const escapedTrigger = triggerAttr.replace(/"/g, '&quot;');

        const output = [
          `${taskComment}<lse-intent trigger="${escapedTrigger}">`,
          `  <script type="application/lse+json">`,
          protocolStr
            .split('\n')
            .map(l => `    ${l}`)
            .join('\n'),
          `  </script>`,
          `</lse-intent>`,
        ].join('\n');

        const semanticJSON = nodeToSemanticJSON(node);

        return { ok: true, output, protocol: semanticJSON, diagnostics };
      } catch (e) {
        return {
          ok: false,
          diagnostics: [
            {
              severity: 'error',
              code: 'INTERNAL_ERROR',
              message: e instanceof Error ? e.message : String(e),
            },
          ],
        };
      }
    }

    return {
      ok: false,
      diagnostics: [
        {
          severity: 'error',
          code: 'UNKNOWN_TARGET',
          message: `Unknown target '${String(target)}'. Available: intent-element`,
        },
      ],
    };
  }
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Flatten a SemanticValue (possibly nested property-path) to a string.
 */
function extractSemanticValueString(v: unknown): string {
  if (!v || typeof v !== 'object') return '';
  const sv = v as {
    type?: string;
    value?: unknown;
    raw?: string;
    object?: unknown;
    property?: string;
  };
  if (sv.type === 'property-path') {
    return `${extractSemanticValueString(sv.object)}.${sv.property ?? ''}`;
  }
  return String(sv.value ?? sv.raw ?? '');
}

/**
 * Convert a SemanticNode to SemanticJSON for the response.
 */
function nodeToSemanticJSON(node: unknown): SemanticJSON | undefined {
  if (!node || typeof node !== 'object') return undefined;

  const n = node as {
    kind?: string;
    action?: string;
    roles?: ReadonlyMap<string, unknown>;
    body?: unknown[];
    eventModifiers?: Record<string, unknown>;
  };

  if (!n.action) return undefined;

  const roles: Record<string, SemanticJSONValue> = {};

  if (n.roles && typeof n.roles.entries === 'function') {
    for (const [role, value] of n.roles.entries()) {
      if (role === 'event') continue; // Handled via trigger
      const v = value as { type?: string; value?: unknown; raw?: string };
      if (v && v.type) {
        if (v.type === 'property-path') {
          roles[role] = {
            type: 'property-path',
            value: extractSemanticValueString(v),
          };
        } else {
          const valueType = v.type as SemanticJSONValue['type'];
          roles[role] = {
            type: (['selector', 'literal', 'reference', 'expression'].includes(valueType)
              ? valueType
              : 'literal') as SemanticJSONValue['type'],
            value: (v.value ?? v.raw ?? '') as string | number | boolean,
          };
        }
      }
    }
  }

  // Handle event handlers
  if (n.kind === 'event-handler' || n.action === 'on') {
    const eventRole =
      n.roles && typeof n.roles.get === 'function'
        ? (n.roles.get('event') as { value?: unknown; raw?: unknown } | undefined)
        : undefined;

    // For event handlers, return the body command's semantic JSON
    if (n.body && n.body.length > 0) {
      const bodyJSON = nodeToSemanticJSON(n.body[0]);
      if (bodyJSON) {
        bodyJSON.trigger = {
          event: eventNameOf(eventRole),
          modifiers: n.eventModifiers,
        };
        return bodyJSON;
      }
    }

    return {
      action: n.action,
      roles,
      trigger: {
        event: eventNameOf(eventRole),
        modifiers: n.eventModifiers,
      },
    };
  }

  return { action: n.action, roles };
}

/**
 * The event name of a handler's `event` role. A colon-qualified event
 * (`htmx:beforeRequest`, `draggable:start`) arrives as an `expression` with
 * `raw`, not a literal with `value`, and reading `value` alone reported every
 * one of them as `click`.
 */
export function eventNameOf(eventRole: { value?: unknown; raw?: unknown } | undefined): string {
  const name = eventRole?.value ?? eventRole?.raw;
  return typeof name === 'string' && name.length > 0 ? name : 'click';
}
