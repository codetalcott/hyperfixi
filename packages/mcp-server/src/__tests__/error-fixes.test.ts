/**
 * get_code_fixes covers the codes the agent loop actually produces.
 *
 * SERVER_INSTRUCTIONS sends an agent from validate_and_compile's diagnostics to get_code_fixes.
 * Through 7.2.0 the registry held only the dotted catalog of core's pre-4.0 engine, so every code
 * validate_and_compile emits (ENGINE_PARSE_ERROR, UNCONSUMED_INPUT, …) answered "No automated
 * fixes", and get_diagnostics' `parse-error` and `low-confidence` mapped to keys that did not exist.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { ErrorFixes, getFixesForDiagnostic, getFixesForError } from '../tools/error-fixes.js';
import { handleValidationTool } from '../tools/validation.js';

const HERE = dirname(fileURLToPath(import.meta.url));

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return name.endsWith('.ts') && !name.includes('.test.') ? [path] : [];
  });
}

/** Codes that name no mistake in the caller's code, so no fix applies. */
const NOT_FIXABLE: Record<string, string> = {
  NOT_INITIALIZED: 'the service was called before it loaded semantic',
  TRANSLATE_ERROR: 'an exception inside translate, reported with its message',
  SUGGESTION: "an info-level note carrying the validator's own suggestion",
};

describe('get_code_fixes covers compilation-service', () => {
  // Every UPPER_SNAKE code compilation-service writes: as `code: '…'`, plus the one it picks by
  // condition (`? 'UNCONSUMED_INPUT'`).
  const dir = join(HERE, '..', '..', '..', 'compilation-service', 'src');
  const emitted = new Set<string>();
  for (const file of sourceFiles(dir)) {
    const src = readFileSync(file, 'utf8');
    for (const m of src.matchAll(/code: '([A-Z][A-Z_]+)'/g)) emitted.add(m[1]!);
    for (const m of src.matchAll(/\? '([A-Z][A-Z_]+)'/g)) emitted.add(m[1]!);
  }

  it('finds the codes it is checking', () => {
    for (const code of ['ENGINE_PARSE_ERROR', 'UNCONSUMED_INPUT', 'LOSSY_TRANSLATION']) {
      expect(emitted).toContain(code);
    }
  });

  it('has fixes for every code validate_and_compile, translate_code or score_fidelity emits', () => {
    const missing = [...emitted].filter(
      code => !(code in NOT_FIXABLE) && getFixesForError(code).length === 0
    );
    expect(missing).toEqual([]);
  });
});

describe('getFixesForDiagnostic', () => {
  it('maps every code get_diagnostics emits onto a key that exists', () => {
    const src = readFileSync(join(HERE, '..', 'tools', 'lsp-bridge.ts'), 'utf8');
    const codes = new Set([...src.matchAll(/code: '([a-z]+(?:-[a-z]+)+)'/g)].map(m => m[1]!));
    expect(codes.size).toBeGreaterThan(5);
    const missing = [...codes].filter(code => getFixesForDiagnostic(code).length === 0);
    expect(missing).toEqual([]);
  });
});

describe('get_code_fixes', () => {
  const call = async (args: Record<string, unknown>) => {
    const res = await handleValidationTool('get_code_fixes', args);
    return { isError: res.isError, data: JSON.parse(res.content[0]!.text) };
  };

  it('answers the code validate_and_compile gives an engine parse error', async () => {
    const { isError, data } = await call({ errorCode: 'ENGINE_PARSE_ERROR' });
    expect(isError).toBeFalsy();
    expect(data.hasFixes).toBe(true);
    expect(data.fixes[0].isPreferred).toBe(true);
  });

  it('answers UNCONSUMED_INPUT with the role-marker fix first', async () => {
    const { data } = await call({ errorCode: 'UNCONSUMED_INPUT' });
    expect(data.fixes[0].code).toBe('add-role-marker');
  });

  it('answers the parse-failure variants alike', async () => {
    const failed = (await call({ errorCode: 'PARSE_FAILED' })).data.fixes;
    expect((await call({ errorCode: 'PARSE_ERROR' })).data.fixes).toEqual(failed);
    expect((await call({ diagnosticCode: 'semantic-error' })).data.fixes).toEqual(failed);
  });

  it('lists validate_and_compile codes under their own category', async () => {
    const { data } = await call({ listAll: true });
    expect(data.byCategory.VALIDATE_AND_COMPILE).toContain('UNCONSUMED_INPUT');
    expect(data.totalFixableErrors).toBe(Object.keys(ErrorFixes).length);
  });
});
