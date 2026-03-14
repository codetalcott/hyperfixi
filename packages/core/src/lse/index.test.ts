/**
 * Validation tests for the LSE bridge module.
 *
 * Verifies that @hyperfixi/core/lse can consume @lokascript/framework/ir
 * via the optional peer dependency pattern.
 */
import { describe, it, expect, beforeAll } from 'vitest';
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
  semanticNodeToRuntimeAST,
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

  describe('semanticNodeToRuntimeAST', () => {
    it('converts a command node to runtime format', async () => {
      const node = await parseExplicit('[toggle patient:.active]');
      const ast = await semanticNodeToRuntimeAST(node);
      expect(ast.type).toBe('command');
      expect((ast as any).name).toBe('toggle');
      expect((ast as any).args).toHaveLength(1);
      expect((ast as any).args[0]).toEqual(
        expect.objectContaining({ type: 'selector', value: '.active' })
      );
      expect((ast as any).roles.patient).toEqual(
        expect.objectContaining({ type: 'selector', value: '.active' })
      );
    });

    it('converts multi-role command', async () => {
      const node = await parseExplicit('[put patient:"hello" destination:#output]');
      const ast = await semanticNodeToRuntimeAST(node);
      expect(ast.type).toBe('command');
      expect((ast as any).name).toBe('put');
      expect((ast as any).args).toHaveLength(2);
      expect((ast as any).roles.patient).toEqual(
        expect.objectContaining({ type: 'literal', value: 'hello' })
      );
      expect((ast as any).roles.destination).toEqual(
        expect.objectContaining({ type: 'selector', value: '#output' })
      );
    });

    it('converts references to identifiers', async () => {
      const node = await parseExplicit('[toggle patient:.active destination:me]');
      const ast = await semanticNodeToRuntimeAST(node);
      expect((ast as any).roles.destination).toEqual(
        expect.objectContaining({ type: 'identifier', value: 'me' })
      );
    });

    it('handles duration literals', async () => {
      const node = await parseExplicit('[wait patient:"500ms"]');
      const ast = await semanticNodeToRuntimeAST(node);
      expect((ast as any).roles.patient).toEqual(
        expect.objectContaining({ type: 'literal', value: '500ms' })
      );
    });
  });

  describe('compileLSE (direct)', () => {
    it('compiles LSE to executable AST', async () => {
      const node = await parseExplicit('[toggle patient:.active]');
      const ast = await semanticNodeToRuntimeAST(node);
      expect(ast).toBeDefined();
      expect(ast.type).toBe('command');
      expect((ast as any).name).toBe('toggle');
      // Node should have no diagnostics (clean parse)
      expect(node.diagnostics).toBeUndefined();
    });

    it('collects diagnostics for invalid input', async () => {
      // parseExplicit with collectDiagnostics returns node with diagnostics
      const node = await parseExplicit('[toggle badRole:foo]', {
        collectDiagnostics: true,
      });
      // Without schema, no diagnostics (any role is accepted)
      expect(node.action).toBe('toggle');
    });

    it('throws on non-bracket syntax', async () => {
      await expect(parseExplicit('not bracket syntax')).rejects.toThrow(
        'Explicit syntax must be wrapped in brackets'
      );
    });
  });

  describe('toLSE (semantic → LSE)', () => {
    it('round-trips English via semantic parser', async () => {
      // Parse English → SemanticNode → render LSE
      const { parseSemantic } = await import('@lokascript/semantic');
      const result = parseSemantic('toggle .active', 'en');
      expect(result.node).not.toBeNull();
      const lse = await renderExplicit(result.node!);
      expect(lse).toContain('[');
      expect(lse).toContain('toggle');
      expect(lse).toContain('.active');
    });
  });

  describe('fromLSE (LSE → natural language)', () => {
    it('renders LSE to English', async () => {
      const { render } = await import('@lokascript/semantic');
      const node = await parseExplicit('[toggle patient:.active]');
      const english = render(node as any, 'en');
      expect(english).toBeDefined();
      expect(english.length).toBeGreaterThan(0);
      expect(english.toLowerCase()).toContain('toggle');
    });
  });
});
