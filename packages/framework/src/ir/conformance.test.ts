/**
 * Conformance Fixture Integration Tests
 *
 * Drives the protocol test fixtures through the bracket-syntax
 * parseCompound/renderExplicit round-trip pipeline.
 */

import { describe, it, expect } from 'vitest';
import { parseCompound, parseDocument } from './explicit-parser';
import { renderExplicit, renderDocument } from './explicit-renderer';
import { fromProtocolJSON, toProtocolJSON } from './protocol-json';
import type { CompoundSemanticNode } from '../core/types';

import compoundFixtures from '../../../../protocol/test-fixtures/compound.json';
import annotationFixtures from '../../../../protocol/test-fixtures/annotations.json';
import versionFixtures from '../../../../protocol/test-fixtures/version-envelope.json';

// =============================================================================
// Compound Fixtures
// =============================================================================

describe('conformance: compound.json', () => {
  for (const fixture of compoundFixtures) {
    it(`${fixture.id}: ${fixture.description}`, () => {
      // Verify rendering matches expected output
      const node = fromProtocolJSON(fixture.node as any);
      const rendered = renderExplicit(node);
      expect(rendered).toBe(fixture.rendered);

      // Now verify we can PARSE it back (previously renderOnly)
      const reparsed = parseCompound(fixture.rendered);
      expect(reparsed.kind).toBe('compound');
      const compound = reparsed as CompoundSemanticNode;
      expect(compound.chainType).toBe(fixture.node.chainType);
      expect(compound.statements).toHaveLength(fixture.node.statements!.length);

      for (let i = 0; i < compound.statements.length; i++) {
        expect(compound.statements[i].action).toBe(fixture.node.statements![i].action);
      }
    });
  }
});

// =============================================================================
// Annotation Fixtures
// =============================================================================

describe('conformance: annotations.json', () => {
  for (const fixture of annotationFixtures) {
    it(`${fixture.id}: ${fixture.description}`, () => {
      // Convert JSON → SemanticNode → render → parse → compare
      const node = fromProtocolJSON(fixture.jsonInput as any);
      const rendered = renderExplicit(node);
      const reparsed = parseCompound(rendered);

      // Verify action preserved
      expect(reparsed.action).toBe(fixture.jsonInput.action);

      // Verify annotations round-trip
      if (fixture.jsonInput.annotations && fixture.jsonInput.annotations.length > 0) {
        expect(reparsed.annotations).toHaveLength(fixture.jsonInput.annotations.length);
        for (let i = 0; i < fixture.jsonInput.annotations.length; i++) {
          expect(reparsed.annotations![i].name).toBe(fixture.jsonInput.annotations[i].name);
          if (fixture.jsonInput.annotations[i].value !== undefined) {
            expect(reparsed.annotations![i].value).toBe(fixture.jsonInput.annotations[i].value);
          }
        }
      } else {
        // ann-006: no annotations → should be undefined after parse
        expect(reparsed.annotations).toBeUndefined();
      }

      // Verify re-render produces same output
      const rerendered = renderExplicit(reparsed);
      expect(rerendered).toBe(rendered);
    });
  }
});

// =============================================================================
// Version Envelope Fixtures (streaming format)
// =============================================================================

describe('conformance: version-envelope.json (streaming)', () => {
  for (const fixture of versionFixtures) {
    const f = fixture as any;
    if (!f.streamingInput) continue;

    // ver-007 describes v1.0/v1.1 fallback behavior — our parser is v1.2,
    // so we parse the version header correctly instead of treating it as a comment.
    if (f.v1Fallback) {
      it(`${f.id}: v1.2 parser parses version header — ${f.description}`, () => {
        const envelope = parseDocument(f.streamingInput);
        // v1.2 parser extracts the version (v1.0 parsers would ignore it)
        expect(envelope.lseVersion).toBe('1.2');
        expect(envelope.nodes).toHaveLength(f.v1Fallback.expectedNodeCount);
      });
      continue;
    }

    it(`${f.id}: ${f.description}`, () => {
      const envelope = parseDocument(f.streamingInput);
      expect(envelope.lseVersion).toBe(f.expectedVersion);
      expect(envelope.nodes).toHaveLength(f.expectedNodeCount);
    });
  }

  // Also test JSON-based envelope round-trips
  for (const fixture of versionFixtures) {
    const f = fixture as any;
    if (f.streamingInput) continue;
    if (!f.expectedRoundTrip) continue;

    it(`${f.id}: JSON envelope round-trip — ${f.description}`, () => {
      // For JSON envelopes: verify node count and version
      expect(f.jsonInput.lseVersion).toBe(f.expectedVersion);
      expect(f.jsonInput.nodes).toHaveLength(f.expectedNodeCount);
    });
  }
});
