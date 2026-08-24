/**
 * Compilation Tools
 *
 * MCP tools for the LokaScript compilation service.
 * Compile, validate, translate, generate tests, and generate components.
 */

import type { Tool } from '@modelcontextprotocol/server';

// Lazy-import compilation service (resolved at first call)
let servicePromise: Promise<any> | null = null;

async function getService() {
  if (!servicePromise) {
    servicePromise = import('@lokascript/compilation-service').then(async mod => {
      return mod.CompilationService.create();
    });
  }
  return servicePromise;
}

// =============================================================================
// Tool Definitions
// =============================================================================

export const compilationTools: Tool[] = [
  {
    name: 'compile_hyperscript',
    description:
      'Compile hyperscript to optimized JavaScript — the FINAL step of the agent loop (generate → validate_and_compile → repair → compile_hyperscript). Validate first: this tool reports the same failures but returns JavaScript only on success. Accepts natural language (code + language), explicit syntax (explicit), or LLM JSON (semantic). Common roles: patient (what to act on), destination (where to), source (where from). Use get_command_docs for per-command roles. Examples: explicit="[toggle patient:.active destination:#btn]", semantic={ action: "toggle", roles: { patient: { type: "selector", value: ".active" } } }',
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'Natural language hyperscript (requires language)',
        },
        explicit: {
          type: 'string',
          description: 'Explicit syntax: [command role:value ...]',
        },
        semantic: {
          type: 'object',
          description: 'LLM JSON: { action, roles, trigger }',
          properties: {
            action: { type: 'string' },
            roles: { type: 'object' },
            trigger: { type: 'object' },
          },
        },
        language: {
          type: 'string',
          description: 'ISO 639-1 language code (required for code input)',
        },
        confidence: {
          type: 'number',
          description: 'Minimum confidence threshold (default 0.7)',
        },
      },
    },
  },
  {
    name: 'validate_and_compile',
    description:
      'START HERE when generating hyperscript: parse into semantic IR with diagnostics, without generating JavaScript. Returns action, roles, and trigger structure so you can check the parse matches your intent. Accepts natural language, explicit bracket syntax, or LLM JSON — same input formats as compile_hyperscript. On failure, apply the diagnostics and re-validate (get_code_fixes maps error codes to concrete fixes; get_command_docs lists per-command roles); once valid, call compile_hyperscript for JavaScript. This validate → repair → compile loop is deterministic — no LLM in the checker.',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Natural language hyperscript' },
        explicit: { type: 'string', description: 'Explicit syntax' },
        semantic: { type: 'object', description: 'LLM JSON' },
        language: { type: 'string', description: 'Language code' },
        confidence: { type: 'number', description: 'Minimum confidence' },
      },
    },
  },
  {
    name: 'translate_code',
    description:
      'Translate hyperscript between any of 24 languages via full semantic parsing — deterministic grammar transformation (SVO/SOV/VSO word order), not LLM translation. Every result carries a `verification` report (the output scored against the source via score_fidelity): verification.faithful === true is the claim "this rendering is structurally exact", so present it alongside the translation when showing code to a user for review. Higher fidelity than translate_hyperscript; preferred for production translations.',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Hyperscript code to translate' },
        from: { type: 'string', description: 'Source language code' },
        to: { type: 'string', description: 'Target language code' },
      },
      required: ['code', 'from', 'to'],
    },
  },
  {
    name: 'generate_tests',
    description:
      'Generate Playwright behavior tests from hyperscript. Extracts abstract operations and renders them as test assertions.',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Natural language hyperscript' },
        explicit: { type: 'string', description: 'Explicit syntax' },
        semantic: { type: 'object', description: 'LLM JSON' },
        language: { type: 'string', description: 'Language code' },
        testName: { type: 'string', description: 'Custom test name' },
        executionMode: {
          type: 'string',
          enum: ['runtime', 'compiled'],
          description: 'How to load hyperscript in test (default runtime)',
        },
        framework: {
          type: 'string',
          description: 'Test framework to target (default "playwright")',
        },
      },
    },
  },
  {
    name: 'generate_component',
    description:
      'Generate a React component from hyperscript. Maps semantic operations to React hooks and JSX, Vue 3 Composition API and templates, or Svelte 5 runes. Supports react (default), vue, and svelte frameworks.',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Natural language hyperscript' },
        explicit: { type: 'string', description: 'Explicit syntax' },
        semantic: { type: 'object', description: 'LLM JSON' },
        language: { type: 'string', description: 'Language code' },
        componentName: { type: 'string', description: 'Custom component name' },
        typescript: {
          type: 'boolean',
          description: 'TypeScript output (default true)',
        },
        framework: {
          type: 'string',
          description: 'Component framework to target: "react" (default), "vue", or "svelte"',
        },
      },
    },
  },
  {
    name: 'score_fidelity',
    description:
      "Score a candidate hyperscript snippet against a reference for structural fidelity — the multilingual CI ratchet's deterministic scorers applied to one pair. Returns actionRecall/multisetRecall/precision/roleFidelity/valueRecall (each 0–1), plus the exact missing/spurious actions and lost invariant values (e.g. a silently rewritten target: toggle.destination=#panel). Sides accept any input format and may be in DIFFERENT languages, so it also verifies a translation preserved meaning. Use after editing or translating code to prove the result faithful; diff_behaviors answers identical-or-not, this answers how-faithful-and-what-drifted.",
    inputSchema: {
      type: 'object',
      properties: {
        reference: {
          type: 'object',
          description: 'The trusted side (code/explicit/semantic + language)',
          properties: {
            code: { type: 'string' },
            explicit: { type: 'string' },
            semantic: { type: 'object' },
            language: { type: 'string' },
          },
        },
        candidate: {
          type: 'object',
          description: 'The side being checked (same shape as reference)',
          properties: {
            code: { type: 'string' },
            explicit: { type: 'string' },
            semantic: { type: 'object' },
            language: { type: 'string' },
          },
        },
        confidence: { type: 'number', description: 'Minimum confidence threshold' },
      },
      required: ['reference', 'candidate'],
    },
  },
  {
    name: 'diff_behaviors',
    description:
      'Compare two hyperscript inputs at the behavior level. Returns whether they are semantically identical, trigger diffs, and per-operation diffs. Works across languages and input formats.',
    inputSchema: {
      type: 'object',
      properties: {
        a: {
          type: 'object',
          description: 'First input (code, explicit, or semantic)',
          properties: {
            code: { type: 'string' },
            explicit: { type: 'string' },
            semantic: { type: 'object' },
            language: { type: 'string' },
          },
        },
        b: {
          type: 'object',
          description: 'Second input (code, explicit, or semantic)',
          properties: {
            code: { type: 'string' },
            explicit: { type: 'string' },
            semantic: { type: 'object' },
            language: { type: 'string' },
          },
        },
        confidence: { type: 'number', description: 'Minimum confidence threshold' },
      },
      required: ['a', 'b'],
    },
  },
];

// =============================================================================
// Tool Handler
// =============================================================================

// Appended as a second content block on failed compile/validate results so an
// agent's next step is always named in the result itself, not just implied by
// the tool descriptions. Kept out of content[0], which stays pure JSON.
const REPAIR_HINT =
  'Next step: apply the diagnostics above and re-run validate_and_compile. ' +
  'If an error names a code (e.g. MISSING.ARGUMENT), get_code_fixes returns concrete fixes for it; ' +
  'get_command_docs lists the roles each command accepts.';

function compileResult(result: { ok: boolean }): {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
} {
  const content: Array<{ type: string; text: string }> = [
    { type: 'text', text: JSON.stringify(result, null, 2) },
  ];
  if (!result.ok) {
    content.push({ type: 'text', text: REPAIR_HINT });
  }
  return { content, isError: !result.ok };
}

export async function handleCompilationTool(
  name: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  try {
    const service = await getService();

    switch (name) {
      case 'compile_hyperscript': {
        const result = service.compile({
          code: args.code as string | undefined,
          explicit: args.explicit as string | undefined,
          semantic: args.semantic as any,
          language: args.language as string | undefined,
          confidence: args.confidence as number | undefined,
        });
        return compileResult(result);
      }

      case 'validate_and_compile': {
        const result = service.validate({
          code: args.code as string | undefined,
          explicit: args.explicit as string | undefined,
          semantic: args.semantic as any,
          language: args.language as string | undefined,
          confidence: args.confidence as number | undefined,
        });
        return compileResult(result);
      }

      case 'translate_code': {
        const result = service.translate({
          code: args.code as string,
          from: args.from as string,
          to: args.to as string,
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          isError: !result.ok,
        };
      }

      case 'generate_tests': {
        const result = service.generateTests({
          code: args.code as string | undefined,
          explicit: args.explicit as string | undefined,
          semantic: args.semantic as any,
          language: args.language as string | undefined,
          testName: args.testName as string | undefined,
          executionMode: args.executionMode as 'runtime' | 'compiled' | undefined,
          framework: args.framework as string | undefined,
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          isError: !result.ok,
        };
      }

      case 'generate_component': {
        const result = service.generateComponent({
          code: args.code as string | undefined,
          explicit: args.explicit as string | undefined,
          semantic: args.semantic as any,
          language: args.language as string | undefined,
          componentName: args.componentName as string | undefined,
          typescript: args.typescript as boolean | undefined,
          framework: args.framework as string | undefined,
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          isError: !result.ok,
        };
      }

      case 'score_fidelity': {
        const result = service.scoreFidelity({
          reference: args.reference as any,
          candidate: args.candidate as any,
          confidence: args.confidence as number | undefined,
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          isError: !result.ok,
        };
      }

      case 'diff_behaviors': {
        const result = service.diff({
          a: args.a as any,
          b: args.b as any,
          confidence: args.confidence as number | undefined,
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          isError: !result.ok,
        };
      }

      default:
        return {
          content: [{ type: 'text', text: `Unknown compilation tool: ${name}` }],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error in ${name}: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}
