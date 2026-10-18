/**
 * CompilationService end-to-end tests.
 *
 * Tests the full pipeline: input detection → normalization → validation (semantic's schemas
 * and the engine's parse), and the operations built on it.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { CompilationService } from './service.js';
import { detectFormat } from './input/detect.js';

// =============================================================================
// Input Detection (unit tests — no service needed)
// =============================================================================

describe('detectFormat', () => {
  it('detects explicit syntax', () => {
    expect(detectFormat('[toggle patient:.active]')).toBe('explicit');
    expect(detectFormat('  [add patient:.highlight destination:#btn]  ')).toBe('explicit');
  });

  it('detects LLM JSON', () => {
    expect(detectFormat('{"action":"toggle","roles":{}}')).toBe('json');
    expect(detectFormat('  { "action": "add" }  ')).toBe('json');
  });

  it('falls back to natural language', () => {
    expect(detectFormat('on click toggle .active')).toBe('natural');
    expect(detectFormat('toggle .active on #btn')).toBe('natural');
    expect(detectFormat('')).toBe('natural');
  });

  it('treats invalid JSON as natural language', () => {
    expect(detectFormat('{not valid json}')).toBe('natural');
    expect(detectFormat('{ "noAction": true }')).toBe('natural');
  });
});

// =============================================================================
// Full Service Integration Tests
// =============================================================================

describe('CompilationService', () => {
  let service: CompilationService;

  beforeAll(async () => {
    service = await CompilationService.create();
  }, 30000);

  // ---------------------------------------------------------------------------
  // Natural Language Validation
  // ---------------------------------------------------------------------------

  describe('natural language', () => {
    it('validates English hyperscript', () => {
      const result = service.validate({
        code: 'on click toggle .active',
        language: 'en',
      });

      expect(result.ok).toBe(true);
      expect(result.semantic).toBeDefined();
      expect(result.semantic?.action).toBe('toggle');
      expect(result.diagnostics.filter(d => d.severity === 'error')).toHaveLength(0);
    });

    it('validates Japanese hyperscript', () => {
      const result = service.validate({
        code: 'クリック で .active を 切り替え',
        language: 'ja',
      });

      expect(result.ok).toBe(true);
      expect(result.semantic).toBeDefined();
    });

    it('validates Spanish hyperscript', () => {
      const result = service.validate({
        code: 'al hacer clic alternar .active',
        language: 'es',
      });

      expect(result.ok).toBe(true);
      expect(result.semantic).toBeDefined();
    });

    it('serializes property-path destination for set command', () => {
      const result = service.validate({
        code: 'on click set #output.innerHTML to "Hello!"',
        language: 'en',
      });

      expect(result.ok).toBe(true);
      expect(result.semantic?.action).toBe('set');
      expect(result.semantic?.roles.destination).toEqual({
        type: 'property-path',
        value: '#output.innerHTML',
      });
      expect(result.semantic?.roles.patient).toEqual({
        type: 'literal',
        value: 'Hello!',
      });
    });

    it('validates set with dotted me property (me.style.color)', () => {
      // The semantic parser may not resolve bare `me.prop` chains to property-path,
      // but validation (semantic's schemas and the engine's parse) should still succeed.
      const result = service.validate({
        code: 'on click set me.style.color to "red"',
        language: 'en',
      });

      expect(result.ok).toBe(true);
      expect(result.semantic?.action).toBe('set');
    });

    it('rejects low-confidence parses', () => {
      const result = service.validate({
        code: 'xyzzy blorp grunk',
        language: 'en',
        confidence: 0.9,
      });

      expect(result.ok).toBe(false);
      expect(
        result.diagnostics.some(
          d => d.code === 'LOW_CONFIDENCE' || d.code === 'PARSE_FAILED' || d.code === 'PARSE_ERROR'
        )
      ).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Explicit Syntax Validation
  // ---------------------------------------------------------------------------

  describe('explicit syntax', () => {
    it('validates explicit toggle', () => {
      const result = service.validate({
        explicit: '[toggle patient:.active]',
      });

      expect(result.ok).toBe(true);
      expect(result.confidence).toBe(1.0);
      expect(result.semantic?.action).toBe('toggle');
    });

    it('validates explicit with destination', () => {
      const result = service.validate({
        explicit: '[add patient:.highlight destination:#button]',
      });

      expect(result.ok).toBe(true);
      expect(result.semantic?.action).toBe('add');
    });

    it('rejects malformed explicit syntax', () => {
      const result = service.validate({
        explicit: '[not valid explicit',
      });

      expect(result.ok).toBe(false);
      expect(result.diagnostics.some(d => d.severity === 'error')).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // LLM JSON Validation
  // ---------------------------------------------------------------------------

  describe('LLM JSON', () => {
    it('validates semantic JSON', () => {
      const result = service.validate({
        semantic: {
          action: 'toggle',
          roles: {
            patient: { type: 'selector', value: '.active' },
          },
        },
      });

      expect(result.ok).toBe(true);
      expect(result.semantic?.action).toBe('toggle');
      expect(result.confidence).toBe(1.0);
    });

    it('validates JSON with event trigger', () => {
      const result = service.validate({
        semantic: {
          action: 'toggle',
          roles: {
            patient: { type: 'selector', value: '.active' },
            destination: { type: 'selector', value: '#btn' },
          },
          trigger: { event: 'click' },
        },
      });

      expect(result.ok).toBe(true);
      expect(result.semantic?.trigger?.event).toBe('click');
    });

    it('rejects invalid JSON structure', () => {
      const result = service.validate({
        semantic: {
          action: '',
          roles: {},
        },
      });

      expect(result.ok).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Auto-detected JSON in code field
  // ---------------------------------------------------------------------------

  describe('auto-detection', () => {
    it('detects JSON in code field', () => {
      const result = service.validate({
        code: '{"action":"toggle","roles":{"patient":{"type":"selector","value":".active"}}}',
      });

      expect(result.ok).toBe(true);
      expect(result.semantic?.action).toBe('toggle');
      expect(result.confidence).toBe(1.0);
    });

    it('detects explicit syntax in code field', () => {
      const result = service.validate({
        code: '[toggle patient:.active]',
      });

      expect(result.ok).toBe(true);
      expect(result.semantic?.action).toBe('toggle');
      expect(result.confidence).toBe(1.0);
    });
  });

  // ---------------------------------------------------------------------------
  // Validation Only
  // ---------------------------------------------------------------------------

  describe('translate() verification (arc 5)', () => {
    it('attaches a faithful verification to a clean cross-language translation', () => {
      const r = service.translate({ code: 'toggle .active on #panel', from: 'en', to: 'ko' });
      expect(r.ok).toBe(true);
      expect(r.code).toBeTruthy();
      expect(r.verification?.ok).toBe(true);
      expect(r.verification?.faithful).toBe(true);
      // The invariant value survived translation verbatim.
      expect(r.verification?.scores?.valueRecall).toBe(1);
    });

    it('omits verification when verify:false', () => {
      const r = service.translate({ code: 'toggle .active', from: 'en', to: 'ko', verify: false });
      expect(r.ok).toBe(true);
      expect(r.verification).toBeUndefined();
    });

    it('verification is advisory — its diagnostics never leak into the translate response', () => {
      const r = service.translate({ code: 'toggle .active on #panel', from: 'en', to: 'ja' });
      expect(r.ok).toBe(true);
      expect(r.diagnostics).toEqual([]);
    });
  });

  describe('scoreFidelity()', () => {
    it('scores an identical pair as faithful 1.0 across all signals', () => {
      const input = {
        code: 'on click add .busy to me then put "Loading" into #output',
        language: 'en',
      };
      const r = service.scoreFidelity({ reference: input, candidate: input });
      expect(r.ok).toBe(true);
      expect(r.faithful).toBe(true);
      expect(r.scores).toEqual({
        actionRecall: 1,
        multisetRecall: 1,
        precision: 1,
        roleFidelity: 1,
        valueRecall: 1,
      });
    });

    it('names a dropped command and its lost invariant value', () => {
      const r = service.scoreFidelity({
        reference: {
          code: 'on click add .busy to me then put "Loading" into #output',
          language: 'en',
        },
        candidate: { code: 'on click add .busy to me', language: 'en' },
      });
      expect(r.ok).toBe(true);
      expect(r.faithful).toBe(false);
      expect(r.missingActions).toContain('put');
      expect(r.missingValues).toContain('put.destination=#output');
      expect(r.scores?.precision).toBe(1); // nothing hallucinated
    });

    it('names a hallucinated command via precision', () => {
      const r = service.scoreFidelity({
        reference: { code: 'on click add .busy to me', language: 'en' },
        candidate: { code: 'on click add .busy to me then toggle .x on me', language: 'en' },
      });
      expect(r.ok).toBe(true);
      expect(r.spuriousActions).toContain('toggle');
      expect(r.scores?.actionRecall).toBe(1); // recall alone cannot see this
      expect(r.scores?.precision).toBeLessThan(1);
    });

    it('catches a silently rewritten target that every other signal misses', () => {
      // Same action, same roles, same types — only the invariant VALUE differs.
      const r = service.scoreFidelity({
        reference: { code: 'on click toggle .active on #panel', language: 'en' },
        candidate: { code: 'on click toggle .active on #other', language: 'en' },
      });
      expect(r.ok).toBe(true);
      expect(r.faithful).toBe(false);
      expect(r.scores?.actionRecall).toBe(1);
      expect(r.scores?.roleFidelity).toBe(1);
      expect(r.scores?.valueRecall).toBeLessThan(1);
      expect(r.missingValues).toContain('toggle.destination=#panel');
    });

    it('scores a faithful cross-language pair as faithful (ko vs en)', () => {
      const r = service.scoreFidelity({
        reference: { code: 'toggle .active', language: 'en' },
        candidate: { code: '토글 .active', language: 'ko' },
      });
      expect(r.ok).toBe(true);
      expect(r.faithful).toBe(true);
    });

    it('returns ok:false with side-tagged diagnostics when a side fails to parse', () => {
      const r = service.scoreFidelity({
        reference: { code: 'toggle .active', language: 'en' },
        candidate: { code: 'frobnicate the wibble', language: 'en' },
      });
      expect(r.ok).toBe(false);
      expect(r.scores).toBeUndefined();
      expect(r.diagnostics.some(d => d.message.startsWith('[candidate]'))).toBe(true);
    });
  });

  describe('validate()', () => {
    it('validates explicit syntax', () => {
      const result = service.validate({
        explicit: '[toggle patient:.active]',
      });

      expect(result.ok).toBe(true);
      expect(result.semantic).toBeDefined();
      expect(result.semantic?.action).toBe('toggle');
    });

    it("surfaces the parser's unconsumed-input warning (arc 3b)", () => {
      // `add .highlight #item` drops `#item` — the destination silently
      // defaults to `me`. The parser flags this on the node (severity warning,
      // code unconsumed-input, hoisted from any depth); normalize must lift it
      // into the response, or the validate/repair loop has nothing to react to.
      const result = service.validate({
        code: 'on click add .highlight #item',
        language: 'en',
      });

      // Semantic's lenient parse succeeds with a warning; the engine, which runs it on a
      // page, rejects it outright (`#item` is an unexpected token there and upstream).
      expect(result.ok).toBe(false);
      expect(result.diagnostics.find(d => d.code === 'ENGINE_PARSE_ERROR')?.message).toContain(
        '#item'
      );
      const warning = result.diagnostics.find(d => d.code === 'UNCONSUMED_INPUT');
      expect(warning).toBeDefined();
      expect(warning?.severity).toBe('warning');
      expect(warning?.message).toContain('#item');
      expect(warning?.suggestion).toContain('marker');

      // And the well-formed phrasing stays warning-free.
      const clean = service.validate({
        code: 'on click add .highlight to #item',
        language: 'en',
      });
      expect(clean.ok).toBe(true);
      expect(clean.diagnostics.filter(d => d.code === 'UNCONSUMED_INPUT')).toHaveLength(0);
    });

    it('flags inert shapes that consume every token (arc 3b gate 4)', () => {
      // Each of these parses at confidence 1.0 with everything consumed, and
      // is provably useless at runtime. The gate warns; it never blocks. Three
      // of them the engine rejects as well (as upstream does), which does block:
      // `ok` is the engine's verdict, and the warning still says what is wrong.
      const expectWarning = (code: string, warningCode: string, engineReads: boolean) => {
        const r = service.validate({ code, language: 'en' });
        expect(r.ok, code).toBe(engineReads);
        expect(
          r.diagnostics.some(d => d.code === 'ENGINE_PARSE_ERROR'),
          code
        ).toBe(!engineReads);
        const w = r.diagnostics.find(d => d.code === warningCode);
        expect(w, `${code} should carry ${warningCode}`).toBeDefined();
        expect(w?.severity).toBe('warning');
        expect(w?.suggestion).toBeTruthy();
      };
      expectWarning('on click add .done to all .todo', 'INERT_QUANTIFIER_TARGET', false);
      expectWarning('on click remove .active from all .row', 'INERT_QUANTIFIER_TARGET', false);
      expectWarning('on click set the text of #output to "Saved"', 'INERT_PROPERTY_WRITE', true);
      expectWarning(
        'on click if #box has class .danger add .warned to #box end',
        'HALF_PARSED_CONDITION',
        false
      );
    });

    it('does not warn on a query literal: the engine reads `<body/>`', () => {
      // UNSUPPORTED_QUERY_LITERAL described the AOT-compiled path (retired in 4.0), where
      // `<body/>` reached querySelector verbatim. agent-bench scores this phrasing correct.
      const r = service.validate({ code: 'on click add .modal-open to <body/>', language: 'en' });
      expect(r.ok).toBe(true);
      expect(r.diagnostics.filter(d => d.severity !== 'info')).toEqual([]);
    });

    it('rejects English the engine cannot read, and a translation whose English it cannot', () => {
      // Semantic reads `put … in` as `put … into`; the engine (and upstream) do not.
      const english = service.validate({ code: 'on click put "Saved" in #output', language: 'en' });
      expect(english.ok).toBe(false);
      const error = english.diagnostics.find(d => d.code === 'ENGINE_PARSE_ERROR');
      expect(error?.severity).toBe('error');
      expect(error?.message).toContain("'into'");
      expect(error?.suggestion).toBeTruthy();
      // The same command as the engine reads it: fine.
      expect(
        service.validate({ code: 'on click put "Saved" into #output', language: 'en' }).ok
      ).toBe(true);
      // A translation is checked as the English the adapter hands the engine.
      const spanish = service.validate({ code: 'al clic alternar .active en yo', language: 'es' });
      expect(spanish.ok).toBe(true);
      expect(spanish.diagnostics.some(d => d.code === 'ENGINE_PARSE_ERROR')).toBe(false);
    });

    it('accepts behavior definitions: the name is the node’s own field, not a role', () => {
      // The behavior schema requires its name as `patient`, but semantic's BehaviorNode keeps
      // the name and parameters as fields with no roles, so every behavior read as missing it.
      for (const [code, language] of [
        ['behavior Foo(x) on click toggle .on end', 'en'],
        ['振る舞い Foo(x)\n  クリックで .onを 切り替え\n  終わり\n終わり', 'ja'],
      ]) {
        const r = service.validate({ code, language });
        expect(r.ok, code).toBe(true);
        expect(r.semantic?.action, code).toBe('behavior');
        expect(
          r.diagnostics.filter(d => d.code === 'MISSING_REQUIRED_ROLE'),
          code
        ).toEqual([]);
      }
    });

    it('lets the engine decide English it reads: semantic’s doubts are warnings', () => {
      // `init` parses at a confidence under the default bar. The engine reads it, and the page
      // runs English as written, so the gate's error becomes a warning saying why.
      const init = service.validate({ code: "init set ^color to 'red'", language: 'en' });
      expect(init.ok).toBe(true);
      const low = init.diagnostics.find(d => d.code === 'LOW_CONFIDENCE');
      expect(low?.severity).toBe('warning');
      expect(low?.message).toContain('@hyperfixi/engine reads this code');
      expect(init.semantic?.action).toBe('init');

      // A quoted event name semantic does not read at all: ok, with no IR to show.
      const quoted = service.validate({
        code: 'on "refresh" put "Refreshed" into #output',
        language: 'en',
      });
      expect(quoted.ok).toBe(true);
      expect(quoted.semantic).toBeUndefined();
      expect(quoted.diagnostics.every(d => d.severity !== 'error')).toBe(true);
      expect(quoted.diagnostics.some(d => d.code === 'PARSE_FAILED')).toBe(true);

      // English the engine rejects is still an error, beside semantic's own complaints.
      const broken = service.validate({ code: 'on click toggle .active on', language: 'en' });
      expect(broken.ok).toBe(false);
      expect(broken.diagnostics.some(d => d.code === 'ENGINE_PARSE_ERROR')).toBe(true);
    });

    it('keeps semantic’s gates as errors for a set `confidence` and for foreign input', () => {
      // A request that sets `confidence` asks semantic's reading to meet that bar.
      const strict = service.validate({
        code: "init set ^color to 'red'",
        language: 'en',
        confidence: 0.7,
      });
      expect(strict.ok).toBe(false);
      expect(strict.diagnostics.find(d => d.code === 'LOW_CONFIDENCE')?.severity).toBe('error');

      // Foreign input runs as semantic's translation, so semantic's doubt is about what runs.
      const japanese = service.validate({ code: '隠す', language: 'ja' });
      expect(japanese.ok).toBe(false);
      expect(japanese.diagnostics.find(d => d.code === 'LOW_CONFIDENCE')?.severity).toBe('error');
    });

    it('inert-shape gate stays quiet on correct phrasings', () => {
      // False positives teach agents to distrust warnings; these must be clean.
      for (const code of [
        'on click add .done to .todo',
        'on click set the textContent of #output to "Saved"',
        'on click set #output\'s innerHTML to "Done"',
        'on click if #box matches .danger add .warned to #box end',
        'on click add .modal-open to body',
        'on click add .is-active to #item', // .is-* utility classes must not trip HALF_PARSED_CONDITION
      ]) {
        const r = service.validate({ code, language: 'en' });
        expect(r.ok, code).toBe(true);
        expect(
          r.diagnostics.filter(d => d.severity === 'warning'),
          `${code} should be warning-free`
        ).toHaveLength(0);
      }
    });

    it('returns errors for invalid input', () => {
      const result = service.validate({
        code: '',
      });

      expect(result.ok).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Translation
  // ---------------------------------------------------------------------------

  describe('translate()', () => {
    it('translates between languages', () => {
      const result = service.translate({
        code: 'toggle .active',
        from: 'en',
        to: 'es',
      });

      expect(result.ok).toBe(true);
      expect(result.code).toBeDefined();
      expect(result.code).not.toBe('toggle .active');
    });

    // A variable the target language reads as a value word: no spelling tells
    // them apart, so the translation says so and offers a rename (PR 116).
    it('warns about a variable the target language reads as a pronoun', () => {
      const result = service.translate({
        code: 'on click put ako into #out',
        from: 'en',
        to: 'tl',
      });

      expect(result.ok).toBe(true);
      expect(result.diagnostics).toHaveLength(1);
      expect(result.diagnostics[0]).toMatchObject({ severity: 'warning', code: 'NAME_COLLISION' });
      expect(result.diagnostics[0]!.message).toContain('`ako` is the pronoun `me`');
      expect(result.diagnostics[0]!.suggestion).toContain('`ako1`');
      // The verification sees the loss; the warning says why.
      expect(result.verification?.faithful).toBe(false);
    });

    it('says nothing for a name the target language reads as a name', () => {
      const result = service.translate({
        code: 'on click put x into #out',
        from: 'en',
        to: 'tl',
      });

      expect(result.diagnostics).toEqual([]);
      expect(result.verification?.faithful).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Error Cases
  // ---------------------------------------------------------------------------

  describe('error handling', () => {
    it('handles no input', () => {
      const result = service.validate({});
      expect(result.ok).toBe(false);
      expect(result.diagnostics.some(d => d.code === 'NO_INPUT')).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Pluggable Renderers
  // ---------------------------------------------------------------------------
});

// =============================================================================
// Custom Renderers via ServiceOptions
// =============================================================================

// =============================================================================
// intent-element target (generates <lse-intent> HTML snippets)
// =============================================================================

describe('CompilationService — intent-element target', () => {
  let service: CompilationService;

  beforeAll(async () => {
    service = await CompilationService.create();
  }, 30000);

  it('emits trigger="load" for a bare command node', async () => {
    const result = await service.generate({
      lse: '[toggle patient:.active]',
      target: 'intent-element',
    });
    expect(result.ok).toBe(true);
    expect(result.output).toContain('<lse-intent trigger="load">');
  });

  it('emits trigger="click" for an event-handler node (explicit syntax)', async () => {
    const result = await service.generate({
      lse: '[on event:click body:[toggle patient:.active]]',
      target: 'intent-element',
    });
    expect(result.ok).toBe(true);
    expect(result.output).toContain('<lse-intent trigger="click">');
  });

  it('emits trigger="click" for a command with JSON trigger.event sugar', async () => {
    // Wire-format trigger sugar — fromProtocolJSON unwraps this into an
    // event-handler node, so the output should carry trigger="click".
    const json = JSON.stringify({
      action: 'toggle',
      roles: { patient: { type: 'selector', value: '.active' } },
      trigger: { event: 'click' },
    });
    const result = await service.generate({
      lse: json,
      target: 'intent-element',
    });
    expect(result.ok).toBe(true);
    expect(result.output).toContain('<lse-intent trigger="click">');
  });

  it('emits trigger="mouseenter" for a custom event name', async () => {
    const result = await service.generate({
      lse: '[on event:mouseenter body:[add patient:.hover]]',
      target: 'intent-element',
    });
    expect(result.ok).toBe(true);
    expect(result.output).toContain('<lse-intent trigger="mouseenter">');
  });

  it('includes the task comment when provided', async () => {
    const result = await service.generate({
      lse: '[toggle patient:.active]',
      target: 'intent-element',
      task: 'Toggle the active class',
    });
    expect(result.ok).toBe(true);
    expect(result.output).toContain('<!-- Task: Toggle the active class -->');
  });

  it('embeds the protocol JSON as an inline script child', async () => {
    const result = await service.generate({
      lse: '[toggle patient:.active]',
      target: 'intent-element',
    });
    expect(result.ok).toBe(true);
    expect(result.output).toContain('<script type="application/lse+json">');
    expect(result.output).toContain('"action": "toggle"');
  });
});

// =============================================================================
// generate() targets
// =============================================================================

describe('CompilationService — generate() targets', () => {
  let service: CompilationService;

  beforeAll(async () => {
    service = await CompilationService.create();
  }, 30000);

  // 'js' was the default target until the AOT compiler retired (4.0).
  it("rejects the retired 'js' target with UNKNOWN_TARGET", async () => {
    const result = await service.generate({
      lse: '[toggle patient:.active]',
      target: 'js' as never,
    });
    expect(result.ok).toBe(false);
    expect(result.output).toBeUndefined();
    expect(result.diagnostics.some(d => d.code === 'UNKNOWN_TARGET')).toBe(true);
  });

  // react, vue and svelte were targets until 6.0 removed component generation.
  it.each(['react', 'vue', 'svelte'])(
    "rejects the removed '%s' target with UNKNOWN_TARGET",
    async target => {
      const result = await service.generate({
        lse: '[toggle patient:.active]',
        target: target as never,
      });
      expect(result.ok).toBe(false);
      expect(result.output).toBeUndefined();
      expect(result.diagnostics.some(d => d.code === 'UNKNOWN_TARGET')).toBe(true);
    }
  );
});
