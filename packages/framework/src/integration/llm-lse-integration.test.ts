/**
 * End-to-End Integration Tests — LLM ↔ LSE Pipeline
 *
 * Tests the full integration of system prompts, training data,
 * feedback loops, and registry convenience methods.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  DomainRegistry,
  generatePrompt,
  synthesizeFromSchemas,
  toJSONL,
  parseJSONL,
  buildFeedback,
  needsDisambiguation,
  buildDisambiguation,
  PatternTracker,
  parseExplicit,
  renderExplicit,
  semanticNodeToJSON,
  createCommandNode,
  createSelector,
  createLiteral,
  createExpression,
  defineCommand,
  defineRole,
} from '../index';

// =============================================================================
// Test schemas (minimal — for fast, self-contained tests)
// =============================================================================

const testSchemas = [
  defineCommand({
    action: 'fetch',
    description: 'Fetch data from a URL',
    category: 'source',
    primaryRole: 'source',
    roles: [
      defineRole({
        role: 'source',
        description: 'URL to fetch from',
        required: true,
        expectedTypes: ['expression'],
      }),
      defineRole({
        role: 'style',
        description: 'Response format',
        required: false,
        expectedTypes: ['expression'],
      }),
      defineRole({
        role: 'destination',
        description: 'Target element',
        required: false,
        expectedTypes: ['selector'],
      }),
    ],
  }),
  defineCommand({
    action: 'toggle',
    description: 'Toggle a class on an element',
    category: 'mutation',
    primaryRole: 'patient',
    roles: [
      defineRole({
        role: 'patient',
        description: 'CSS class or attribute to toggle',
        required: true,
        expectedTypes: ['selector'],
      }),
      defineRole({
        role: 'destination',
        description: 'Target element',
        required: false,
        expectedTypes: ['selector'],
      }),
    ],
  }),
];

// =============================================================================
// Pillar 1: System Prompt Generation → Parse round-trip
// =============================================================================

describe('Pillar 1: System Prompt Generation', () => {
  it('generates prompt containing all commands', () => {
    const prompt = generatePrompt({
      domain: 'test',
      description: 'Test domain',
      schemas: testSchemas,
    });

    expect(prompt.text).toContain('fetch');
    expect(prompt.text).toContain('toggle');
    expect(prompt.metadata.commandCount).toBe(2);
    expect(prompt.metadata.domain).toBe('test');
  });

  it('prompt includes role documentation', () => {
    const prompt = generatePrompt({
      domain: 'test',
      description: 'Test domain',
      schemas: testSchemas,
    });

    expect(prompt.text).toContain('source');
    expect(prompt.text).toContain('patient');
    expect(prompt.text).toContain('URL to fetch from');
  });

  it('prompt includes examples in bracket syntax', () => {
    const prompt = generatePrompt({
      domain: 'test',
      description: 'Test domain',
      schemas: testSchemas,
      outputFormat: 'explicit',
    });

    expect(prompt.text).toContain('[fetch');
    expect(prompt.text).toContain('[toggle');
  });

  it('prompt includes JSON format examples', () => {
    const prompt = generatePrompt({
      domain: 'test',
      description: 'Test domain',
      schemas: testSchemas,
      outputFormat: 'json',
    });

    expect(prompt.text).toContain('"action"');
    expect(prompt.text).toContain('"roles"');
  });

  it('respects token budget', () => {
    const small = generatePrompt({
      domain: 'test',
      description: 'Test domain',
      schemas: testSchemas,
      maxTokens: 200,
    });

    const large = generatePrompt({
      domain: 'test',
      description: 'Test domain',
      schemas: testSchemas,
      maxTokens: 10000,
    });

    expect(small.text.length).toBeLessThan(large.text.length);
  });
});

// =============================================================================
// Pillar 2: Training Data → JSONL Round-trip
// =============================================================================

describe('Pillar 2: Training Data Generation', () => {
  it('synthesizes pairs from schemas', () => {
    const result = synthesizeFromSchemas(testSchemas, { domain: 'test' });

    expect(result.pairs.length).toBeGreaterThan(0);
    expect(result.metadata.domain).toBe('test');
    expect(result.metadata.commandCount).toBe(2);
  });

  it('each pair has required fields', () => {
    const result = synthesizeFromSchemas(testSchemas, { domain: 'test' });

    for (const pair of result.pairs) {
      expect(pair.domain).toBe('test');
      expect(pair.action).toBeTruthy();
      expect(pair.explicit).toContain('[');
      expect(pair.natural).toBeTruthy();
      expect(pair.quality).toBeGreaterThanOrEqual(0);
      expect(pair.quality).toBeLessThanOrEqual(1);
    }
  });

  it('JSONL round-trips correctly', () => {
    const result = synthesizeFromSchemas(testSchemas, { domain: 'test' });
    const jsonl = toJSONL(result.pairs);
    const parsed = parseJSONL(jsonl);

    expect(parsed.length).toBe(result.pairs.length);
    for (let i = 0; i < parsed.length; i++) {
      expect(parsed[i].metadata.action).toBe(result.pairs[i].action);
      expect(parsed[i].completion).toBe(result.pairs[i].explicit);
    }
  });

  it('synthetic examples parse back at full confidence', () => {
    const result = synthesizeFromSchemas(testSchemas, { domain: 'test' });

    for (const pair of result.pairs) {
      // Each explicit syntax should parse without error
      const node = parseExplicit(pair.explicit);
      expect(node.action).toBe(pair.action);
    }
  });

  it('respects maxPairsPerCommand', () => {
    const result = synthesizeFromSchemas(testSchemas, {
      domain: 'test',
      maxPairsPerCommand: 2,
    });

    // Count pairs per action
    const counts = new Map<string, number>();
    for (const pair of result.pairs) {
      counts.set(pair.action, (counts.get(pair.action) || 0) + 1);
    }

    for (const count of counts.values()) {
      expect(count).toBeLessThanOrEqual(2);
    }
  });
});

// =============================================================================
// Pillar 3: Feedback Loop
// =============================================================================

describe('Pillar 3: Feedback Loop', () => {
  // --- 3A: Structured Error Feedback ---

  it('invalid bracket syntax → structured feedback with hints', () => {
    const feedback = buildFeedback(
      '[fetch]',
      'explicit',
      [{ severity: 'error', message: 'Required role source missing', code: 'missing-role' }],
      { getSchema: a => testSchemas.find(s => s.action === a) },
      'fetch'
    );

    expect(feedback.accepted).toBe(false);
    expect(feedback.diagnostics[0].fixType).toBe('missing_role');
    expect(feedback.hints.length).toBeGreaterThan(0);
    expect(feedback.schema?.requiredRoles).toContain('source');
    expect(feedback.correctedExample?.explicit).toContain('[fetch');
  });

  it('accepted input → accepted: true, no corrected example', () => {
    const feedback = buildFeedback(
      '[fetch source:/api/users]',
      'explicit',
      [],
      { getSchema: a => testSchemas.find(s => s.action === a) },
      'fetch'
    );

    expect(feedback.accepted).toBe(true);
    expect(feedback.correctedExample).toBeUndefined();
  });

  // --- 3B: Confidence-Aware Disambiguation ---

  it('borderline confidence → disambiguation', () => {
    expect(needsDisambiguation(0.6)).toBe(true);
    expect(needsDisambiguation(0.9)).toBe(false);
    expect(needsDisambiguation(0.3)).toBe(false);
  });

  it('buildDisambiguation produces sorted candidates', () => {
    const nodeA = createCommandNode('toggle', { patient: createSelector('#button') });
    const nodeB = createCommandNode('toggle', { patient: createSelector('.button') });

    const result = buildDisambiguation('toggle button', [
      { action: 'toggle', confidence: 0.55, node: nodeB },
      { action: 'toggle', confidence: 0.65, node: nodeA },
    ]);

    expect(result.candidates[0].confidence).toBe(0.65);
    expect(result.candidates[1].confidence).toBe(0.55);
    expect(result.question).toContain('Which did you mean?');
  });

  // --- 3C: Pattern Hit-Rate Tracking ---

  it('tracker records events and computes hit rates', () => {
    const tracker = new PatternTracker();

    tracker.record({
      timestamp: Date.now(),
      domain: 'flow',
      action: 'fetch',
      language: 'en',
      inputFormat: 'explicit',
      confidence: 0.95,
      outcome: 'accepted',
    });
    tracker.record({
      timestamp: Date.now(),
      domain: 'flow',
      action: 'fetch',
      language: 'en',
      inputFormat: 'explicit',
      confidence: 0.4,
      outcome: 'rejected',
      diagnosticCodes: ['missing-role'],
    });

    const summary = tracker.getSummary();
    expect(summary.totalEvents).toBe(2);
    expect(summary.byCommand['fetch'].rate).toBe(0.5);
    expect(summary.byOutcome['accepted']).toBe(1);
    expect(summary.byOutcome['rejected']).toBe(1);
    expect(summary.topFailures[0].code).toBe('missing-role');
  });

  it('tracker exports as JSONL', () => {
    const tracker = new PatternTracker();
    tracker.record({
      timestamp: 1000,
      domain: 'flow',
      action: 'fetch',
      language: 'en',
      inputFormat: 'explicit',
      confidence: 0.9,
      outcome: 'accepted',
    });

    const jsonl = tracker.exportJSONL();
    const parsed = JSON.parse(jsonl);
    expect(parsed.action).toBe('fetch');
  });
});

// =============================================================================
// Pillar 4: Registry Convenience Methods
// =============================================================================

describe('Pillar 4: Registry Convenience Methods', () => {
  let registry: DomainRegistry;

  beforeAll(() => {
    registry = new DomainRegistry();
    registry.register({
      name: 'test-domain',
      description: 'Integration test domain',
      languages: ['en'],
      inputLabel: 'command',
      inputDescription: 'Test command',
      schemas: testSchemas,
      getDSL: () => {
        throw new Error('Not implemented for this test');
      },
    });
  });

  it('generatePrompt returns prompt for domain with schemas', () => {
    const prompt = registry.generatePrompt('test-domain');
    expect(prompt).not.toBeNull();
    expect(prompt!.text).toContain('fetch');
    expect(prompt!.text).toContain('toggle');
    expect(prompt!.metadata.commandCount).toBe(2);
  });

  it('generatePrompt returns null for unknown domain', () => {
    expect(registry.generatePrompt('nonexistent')).toBeNull();
  });

  it('generateTrainingData returns pairs for domain with schemas', () => {
    const result = registry.generateTrainingData('test-domain');
    expect(result).not.toBeNull();
    expect(result!.pairs.length).toBeGreaterThan(0);
    expect(result!.metadata.domain).toBe('test-domain');
  });

  it('generateTrainingData returns null for unknown domain', () => {
    expect(registry.generateTrainingData('nonexistent')).toBeNull();
  });

  it('buildFeedback returns structured feedback', () => {
    const feedback = registry.buildFeedback(
      'test-domain',
      '[fetch source:/api/users]',
      'explicit',
      [{ severity: 'error', message: 'Required role source missing', code: 'missing-role' }]
    );

    expect(feedback).not.toBeNull();
    expect(feedback!.accepted).toBe(false);
    expect(feedback!.diagnostics[0].fixType).toBe('missing_role');
    // Schema info is included because action was detected from input
    expect(feedback!.schema?.action).toBe('fetch');
    expect(feedback!.hints.length).toBeGreaterThan(0);
  });

  it('buildFeedback returns null for unknown domain', () => {
    expect(registry.buildFeedback('nonexistent', '[test]', 'explicit', [])).toBeNull();
  });

  it('getSchemas returns schemas for domain', () => {
    const schemas = registry.getSchemas('test-domain');
    expect(schemas).not.toBeNull();
    expect(schemas!.length).toBe(2);
  });

  it('setSchemas attaches schemas post-registration', () => {
    const reg = new DomainRegistry();
    reg.register({
      name: 'lazy',
      description: 'Lazy schema domain',
      languages: ['en'],
      inputLabel: 'input',
      inputDescription: 'Test input',
      getDSL: () => {
        throw new Error('Not implemented');
      },
    });

    // Initially no schemas
    expect(reg.getSchemas('lazy')).toBeNull();

    // Attach schemas
    reg.setSchemas('lazy', testSchemas);

    expect(reg.getSchemas('lazy')!.length).toBe(2);
    const prompt = reg.generatePrompt('lazy');
    expect(prompt).not.toBeNull();
  });
});

// =============================================================================
// Cross-Cutting: Explicit Syntax ↔ JSON Round-trip
// =============================================================================

describe('Cross-Cutting: Explicit ↔ JSON Round-trip', () => {
  it('node → explicit → parse → node preserves structure', () => {
    const original = createCommandNode('fetch', {
      source: createExpression('/api/users'),
      style: createLiteral('json'),
      destination: createSelector('#list'),
    });

    const explicit = renderExplicit(original);
    const parsed = parseExplicit(explicit);

    expect(parsed.action).toBe('fetch');
    expect(parsed.roles.get('source')).toBeDefined();
    expect(parsed.roles.get('style')).toBeDefined();
    expect(parsed.roles.get('destination')).toBeDefined();
  });

  it('node → JSON → node preserves action and roles', () => {
    const original = createCommandNode('toggle', {
      patient: createSelector('.active'),
    });

    const json = semanticNodeToJSON(original);
    expect(json.action).toBe('toggle');
    expect(json.roles['patient']).toBeDefined();
  });
});
