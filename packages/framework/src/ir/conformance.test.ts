/**
 * Conformance Fixture Integration Tests
 *
 * Drives the protocol test fixtures through the bracket-syntax
 * parseCompound/renderExplicit round-trip pipeline.
 */

import { describe, it, expect } from 'vitest';
import { parseCompound } from './explicit-parser';
import { renderExplicit } from './explicit-renderer';
import { fromProtocolJSON } from './protocol-json';
import type { CompoundSemanticNode } from '../core/types';

import compoundFixtures from '../../../intent/fixtures/compound.json';
import annotationFixtures from '../../../intent/fixtures/annotations.json';

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
