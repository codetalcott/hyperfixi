/**
 * Tests for the LSE pipeline MCP tools.
 *
 * lse_from_hyperscript returned `[get patient:null]` with ok: true and confidence 1 for every
 * input through 7.2.0 (it read a semantic node as the AST builder's tree), and no test named it.
 */

import { describe, it, expect } from 'vitest';
import { handleLsePipelineTool } from '../tools/lse-pipeline.js';

function parseResult(response: { content: Array<{ text: string }> }) {
  return JSON.parse(response.content[0].text);
}

describe('lse_from_hyperscript', () => {
  it('renders a command with its roles', async () => {
    const data = parseResult(
      await handleLsePipelineTool('lse_from_hyperscript', { code: 'toggle .open on #menu' })
    );
    expect(data.ok).toBe(true);
    expect(data.lse).toBe('[toggle patient:.open destination:#menu]');
    expect(data.protocol.action).toBe('toggle');
    expect(data.protocol.roles.destination.value).toBe('#menu');
  });

  it('renders an event handler with its body', async () => {
    const data = parseResult(
      await handleLsePipelineTool('lse_from_hyperscript', { code: 'on click add .seen to me' })
    );
    expect(data.ok).toBe(true);
    expect(data.lse).toBe('[on event:click body:[add patient:.seen destination:me]]');
  });

  it('reads another language into the same LSE', async () => {
    const data = parseResult(
      await handleLsePipelineTool('lse_from_hyperscript', {
        code: '#menu の .open を 切り替え',
        language: 'ja',
      })
    );
    expect(data.ok).toBe(true);
    expect(data.protocol.action).toBe('toggle');
    expect(data.protocol.roles.patient.value).toBe('.open');
    expect(data.protocol.roles.destination.value).toBe('#menu');
  });

  it('its LSE reads back through lse_to_hyperscript', async () => {
    const from = parseResult(
      await handleLsePipelineTool('lse_from_hyperscript', { code: 'toggle .open on #menu' })
    );
    const back = parseResult(await handleLsePipelineTool('lse_to_hyperscript', { lse: from.lse }));
    expect(back.ok).toBe(true);
    expect(back.lse).toBe(from.lse);
  });

  it('refuses a shape LSE cannot write yet, with the partial LSE apart', async () => {
    const data = parseResult(
      await handleLsePipelineTool('lse_from_hyperscript', {
        code: 'on click toggle .open on #menu then wait 200ms',
      })
    );
    expect(data.ok).toBe(false);
    expect(data.error).toMatch(/no LSE form yet/);
    expect(data.lse).toBeUndefined();
    expect(data.partial.lse).toContain('toggle patient:.open');
  });

  it('refuses a parse that left input unread', async () => {
    const data = parseResult(
      await handleLsePipelineTool('lse_from_hyperscript', { code: 'on click togle .open on #menu' })
    );
    expect(data.ok).toBe(false);
    expect(data.lse).toBeUndefined();
  });
});
