/**
 * Validation tests for the LSE bridge module.
 *
 * Verifies that @hyperfixi/core/lse can consume @lokascript/framework/ir
 * via the optional peer dependency pattern.
 */
import { describe, it, expect } from 'vitest';
import {
  parseExplicit,
  renderExplicit,
  fromInterchangeNode,
  toProtocolJSON,
  fromProtocolJSON,
  isExplicitSyntax,
  isLSEAvailable,
  toEnvelopeJSON,
  fromEnvelopeJSON,
  isEnvelope,
  validateProtocolJSON,
} from './index';

describe('LSE bridge', () => {
  describe('isLSEAvailable', () => {
    it('returns true when framework is installed', () => {
      expect(isLSEAvailable()).toBe(true);
    });
  });

  describe('isExplicitSyntax', () => {
    it('detects bracket syntax', async () => {
      expect(await isExplicitSyntax('[toggle patient:.active]')).toBe(true);
      expect(await isExplicitSyntax('toggle .active')).toBe(false);
    });
  });

  describe('parseExplicit', () => {
    it('parses a simple command', async () => {
      const node = await parseExplicit('[toggle patient:.active]');
      expect(node.action).toBe('toggle');
      expect(node.roles.get('patient')).toEqual(
        expect.objectContaining({ type: 'selector', value: '.active' })
      );
    });

    it('parses a command with multiple roles', async () => {
      const node = await parseExplicit('[toggle patient:.active destination:#button]');
      expect(node.action).toBe('toggle');
      expect(node.roles.get('patient')).toEqual(
        expect.objectContaining({ type: 'selector', value: '.active' })
      );
      expect(node.roles.get('destination')).toEqual(
        expect.objectContaining({ type: 'selector', value: '#button' })
      );
    });

    it('parses literal values', async () => {
      const node = await parseExplicit('[put patient:"hello" destination:#output]');
      expect(node.action).toBe('put');
      expect(node.roles.get('patient')).toEqual(
        expect.objectContaining({ type: 'literal', value: 'hello' })
      );
    });

    it('parses flags', async () => {
      const node = await parseExplicit('[fetch patient:/api/data +json]');
      expect(node.action).toBe('fetch');
      const roles = Array.from(node.roles.entries()) as [string, any][];
      const flagEntry = roles.find(([, v]) => v.type === 'flag' && (v as any).name === 'json');
      expect(flagEntry).toBeDefined();
    });
  });

  describe('renderExplicit', () => {
    it('round-trips bracket syntax', async () => {
      const input = '[toggle patient:.active]';
      const node = await parseExplicit(input);
      const output = await renderExplicit(node);
      expect(output).toBe(input);
    });

    it('round-trips multi-role commands', async () => {
      const input = '[put patient:"hello" destination:#output]';
      const node = await parseExplicit(input);
      const output = await renderExplicit(node);
      expect(output).toBe(input);
    });
  });

  describe('fromInterchangeNode', () => {
    it('converts a command node', async () => {
      const interchangeNode = {
        type: 'command',
        name: 'toggle',
        args: [{ type: 'selector', value: '.active', selectorType: 'class' }],
      };
      const node = await fromInterchangeNode(interchangeNode);
      expect(node.action).toBe('toggle');
      expect(node.kind).toBe('command');
    });

    it('converts an event node', async () => {
      const interchangeNode = {
        type: 'event',
        event: 'click',
        body: [
          {
            type: 'command',
            name: 'toggle',
            args: [{ type: 'selector', value: '.active', selectorType: 'class' }],
          },
        ],
      };
      const node = await fromInterchangeNode(interchangeNode);
      expect(node.kind).toBe('event-handler');
    });

    it('handles unknown node gracefully', async () => {
      const node = await fromInterchangeNode({ type: 'unknown-type' });
      expect(node.kind).toBe('command');
      // fromInterchangeNode falls through to default case for unknown types
      expect(node).toBeDefined();
    });
  });

  describe('protocol JSON', () => {
    it('round-trips via toProtocolJSON/fromProtocolJSON', async () => {
      const original = await parseExplicit('[toggle patient:.active]');
      const json = await toProtocolJSON(original);
      expect(json.action).toBe('toggle');
      expect(json.roles).toBeDefined();
      expect(json.roles.patient).toEqual(
        expect.objectContaining({ type: 'selector', value: '.active' })
      );

      const restored = await fromProtocolJSON(json);
      expect(restored.action).toBe('toggle');
      expect(restored.roles.get('patient')).toEqual(
        expect.objectContaining({ type: 'selector', value: '.active' })
      );
    });

    it('validates protocol JSON', async () => {
      const valid = {
        action: 'toggle',
        roles: { patient: { type: 'selector', value: '.active' } },
      };
      const diagnostics = await validateProtocolJSON(valid);
      expect(diagnostics).toEqual([]);
    });

    it('returns diagnostics for invalid JSON', async () => {
      const diagnostics = await validateProtocolJSON(null);
      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0].severity).toBe('error');
    });
  });

  describe('envelope', () => {
    it('wraps and unwraps nodes', async () => {
      const node = await parseExplicit('[toggle patient:.active]');
      const envelope = { lseVersion: '1.2.0', nodes: [node] };
      const json = await toEnvelopeJSON(envelope);
      expect(await isEnvelope(json)).toBe(true);
      expect(json.lseVersion).toBe('1.2.0');
      expect(json.nodes).toHaveLength(1);

      const restored = await fromEnvelopeJSON(json);
      expect(restored.nodes).toHaveLength(1);
      expect(restored.nodes[0].action).toBe('toggle');
    });

    it('non-envelope returns false', async () => {
      expect(await isEnvelope({ action: 'toggle' })).toBe(false);
      expect(await isEnvelope(null)).toBe(false);
    });
  });
});
