import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fs/promises before importing the module
vi.mock('node:fs/promises', () => ({
  mkdir: vi.fn(async () => {}),
  writeFile: vi.fn(async () => {}),
}));

// Mock the server-bridge package
const mockGenerate = vi.fn();
const mockCreateManifest = vi.fn(() => ({ version: 1 }));
const mockSaveManifest = vi.fn(async () => {});

vi.mock('@hyperfixi/server-bridge', () => ({
  generate: mockGenerate,
  createManifest: mockCreateManifest,
  saveManifest: mockSaveManifest,
}));

describe('server-bridge integration (mocked)', () => {
  let runServerBridge: typeof import('./server-bridge-integration').runServerBridge;
  let resetServerBridgeState: typeof import('./server-bridge-integration').resetServerBridgeState;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Fresh import each time to reset module state
    const mod = await import('./server-bridge-integration');
    runServerBridge = mod.runServerBridge;
    resetServerBridgeState = mod.resetServerBridgeState;
    resetServerBridgeState();
  });

  it('outputs conflict warnings when generate returns conflicts', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    mockGenerate.mockResolvedValueOnce({
      routes: [{ method: 'GET', path: '/api/users' }],
      generated: { files: [{ path: 'routes.ts', content: '// routes' }] },
      scan: { routes: [], conflicts: [{ routeKey: 'GET:/api/users', conflicts: [], sources: [] }] },
    });

    await runServerBridge('/tmp/test', { framework: 'express' }, true);

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('1 route conflict(s) detected'));

    warnSpy.mockRestore();
    logSpy.mockRestore();
  });

  it('writes files when routes are found', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { writeFile: mockWriteFile, mkdir: mockMkdir } = await import('node:fs/promises');

    mockGenerate.mockResolvedValueOnce({
      routes: [{ method: 'GET', path: '/api/data' }],
      generated: {
        files: [
          { path: 'api-data.ts', content: '// handler' },
          { path: 'index.ts', content: '// index' },
        ],
      },
      scan: { routes: [], conflicts: [] },
    });

    await runServerBridge('/tmp/test', { framework: 'express' }, false, true);

    expect(mockMkdir).toHaveBeenCalled();
    expect(mockWriteFile).toHaveBeenCalledTimes(2);

    logSpy.mockRestore();
  });

  it('skips generation when routes unchanged', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { writeFile: mockWriteFile } = await import('node:fs/promises');

    const result = {
      routes: [{ method: 'GET', path: '/api/users' }],
      generated: { files: [{ path: 'routes.ts', content: '// routes' }] },
      scan: { routes: [], conflicts: [] },
    };

    // First call — writes
    mockGenerate.mockResolvedValueOnce(result);
    await runServerBridge('/tmp/test', { framework: 'express' }, true, true);
    const writeCountAfterFirst = (mockWriteFile as ReturnType<typeof vi.fn>).mock.calls.length;

    // Second call with same routes — should skip
    mockGenerate.mockResolvedValueOnce(result);
    await runServerBridge('/tmp/test', { framework: 'express' }, true);
    const writeCountAfterSecond = (mockWriteFile as ReturnType<typeof vi.fn>).mock.calls.length;

    // No additional writes
    expect(writeCountAfterSecond).toBe(writeCountAfterFirst);

    logSpy.mockRestore();
  });
});
