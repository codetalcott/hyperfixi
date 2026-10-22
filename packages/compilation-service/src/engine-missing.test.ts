/**
 * With no @hyperfixi/engine installed, validation is the semantic parser's alone, and the result
 * says so. The documented `npx @hyperfixi/mcp-server` installed no engine until 7.5.0 (it was an
 * optional peer): every error only the engine catches came back ok, and nothing in the result
 * showed the check had not run (7.3.0 live test).
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('@hyperfixi/engine', () => {
  throw new Error('Cannot find package @hyperfixi/engine');
});

describe('validate() without the engine', () => {
  it('says the engine check was skipped, and does not change the verdict', async () => {
    const { CompilationService } = await import('./service.js');
    const service = await CompilationService.create();
    // The engine rejects this (`toggle .active #panel`); semantic alone reads it.
    const r = service.validate({ code: 'on click toggle .active #panel' });
    const skipped = r.diagnostics.find(d => d.code === 'ENGINE_CHECK_SKIPPED');
    expect(skipped?.severity).toBe('info');
    expect(r.diagnostics.some(d => d.code === 'ENGINE_PARSE_ERROR')).toBe(false);
  });

  it('is not reported for explicit syntax, which the engine never checks', async () => {
    const { CompilationService } = await import('./service.js');
    const service = await CompilationService.create();
    const r = service.validate({ explicit: '[toggle patient:.active]' });
    expect(r.diagnostics.some(d => d.code === 'ENGINE_CHECK_SKIPPED')).toBe(false);
  });
});
