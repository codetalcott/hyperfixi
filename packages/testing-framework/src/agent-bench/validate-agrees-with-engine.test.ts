/**
 * `CompilationService.validate` (MCP `validate_and_compile`) rejects no English the engine reads.
 *
 * Its `ok` is what an agent's repair loop acts on, so a false error sends the agent to "fix"
 * code that runs. Measured 2026-10-18 on 6.0.0: of the 1,128 command-shape cases the engine
 * reads (upstream's own tests and core's reference examples), validate rejected 90: all 15
 * behavior definitions (the name is a BehaviorNode field, which the schema check read as a
 * missing role), 73 parses under semantic's default confidence bar (`init`, `when`, `def`,
 * `live`, bare `hide`, …), a quoted event name semantic does not read, and `wait for <event>`.
 * For English the engine's parse now decides, and semantic's doubts are warnings. The bench's
 * 16 rejected phrasings were all the engine's (ENGINE_PARSE_ERROR), so none of them moved.
 *
 * @vitest-environment node
 * As agent-bench.test.ts: the engine registers against this environment's globals.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CASES_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../multilingual/command-shapes.cases.json'
);

interface Case {
  id: string;
  source: string;
}

describe('validate agrees with the engine on English it reads', () => {
  let validate: (code: string) => { ok: boolean };
  let engineReads: (code: string) => boolean;

  beforeAll(async () => {
    const { CompilationService } = await import('@lokascript/compilation-service');
    const service = await CompilationService.create();
    validate = code => service.validate({ code, language: 'en' });
    const engine = await import('@hyperfixi/engine');
    engine.register(...engine.everything);
    engineReads = code => {
      try {
        return engine.api.parse(code).errors.length === 0;
      } catch {
        return false;
      }
    };
  }, 60_000);

  it('rejects none of the command-shape cases the engine reads', () => {
    const cases = (JSON.parse(readFileSync(CASES_PATH, 'utf8')) as { cases: Case[] }).cases;
    const readable = cases.filter(c => engineReads(c.source));
    // A harvest that lost most of its cases would make this vacuous.
    expect(readable.length).toBeGreaterThan(1000);
    const rejected = readable
      .filter(c => !validate(c.source).ok)
      .map(c => `${c.id} ${JSON.stringify(c.source.slice(0, 70))}`);
    expect(rejected).toEqual([]);
  });
});
