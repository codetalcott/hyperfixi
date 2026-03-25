/**
 * Integration tests for GRAIL tools against the real grail.yaml.
 *
 * These tests validate response shapes and planning logic without
 * running grail_run (which would execute real shell commands).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { resolve } from 'node:path';
import { handleGrailTool, _resetRegistry } from '../../../packages/mcp-server/src/tools/grail-tools.js';

function parseResult(response: { content: Array<{ text: string }> }) {
  return JSON.parse(response.content[0].text);
}

const repoRoot = resolve(import.meta.dirname, '../../..');

beforeAll(() => {
  process.env.GRAIL_YAML = resolve(repoRoot, 'grail.yaml');
  process.env.GRAIL_CWD = repoRoot;
  _resetRegistry();
});

afterAll(() => {
  delete process.env.GRAIL_YAML;
  delete process.env.GRAIL_CWD;
  _resetRegistry();
});

describe('grail_list against real grail.yaml', () => {
  it('returns conditions and affordances from hyperfixi config', async () => {
    const response = await handleGrailTool('grail_list', {});
    const data = parseResult(response);

    expect(data.conditions).toContain('project.lint.passing');
    expect(data.conditions).toContain('project.typecheck.passing');
    expect(data.conditions).toContain('project.tests.passing');
    expect(data.affordances).toContain('run-lint');
    expect(data.affordances).toContain('run-tests');
    expect(data.affordances).toContain('release-publish');
  });
});

describe('grail_info against real grail.yaml', () => {
  it('returns workflow graph with enables relationships', async () => {
    const response = await handleGrailTool('grail_info', {});
    const data = parseResult(response);

    expect(data.conditions['project.lint.passing']).toBeDefined();
    expect(data.affordances['run-tests'].preconditions).toContain('project.lint.passing');
    expect(data.enablesGraph).toBeDefined();

    // run-lint should enable run-tests (lint.passing is a precondition of run-tests)
    expect(data.enablesGraph['run-lint']).toContain('run-tests');
  });
});

describe('grail_check returns truth vector', () => {
  it('includes truth in response for reuse by plan/run', { timeout: 60_000 }, async () => {
    const response = await handleGrailTool('grail_check', {});
    const data = parseResult(response);

    expect(data.truth).toBeDefined();
    expect(typeof data.truth).toBe('object');
    // Should have entries for every condition in the config
    expect('project.lint.passing' in data.truth).toBe(true);
    expect(typeof data.truth['project.lint.passing']).toBe('boolean');
  });
});

describe('grail_plan with pre-evaluated truth (fast path)', () => {
  // Use a synthetic truth vector — no shell evaluation needed
  const truth: Record<string, boolean> = {
    'project.lint.passing': true,
    'project.typecheck.passing': true,
    'project.tests.passing': false,
    'project.versions.consistent': false,
    'project.clean.workdir': false,
    'pkg.built': false,
    'pkg.tests.passing': false,
  };

  it('plans for release-publish using cached truth (instant)', async () => {
    const response = await handleGrailTool('grail_plan', {
      goal: 'release-publish',
      truth,
    });
    const data = parseResult(response);

    expect(data.goal).toBe('release-publish');
    expect(typeof data.feasible).toBe('boolean');
    if (data.feasible) {
      expect(data.steps.length).toBeGreaterThan(0);
      expect(data.totalCost).toBeGreaterThan(0);
      expect(data.steps[data.steps.length - 1].action).toBe('release-publish');
    } else {
      expect(data.reason).toBeDefined();
    }
  });

  it('plans for run-lint (no preconditions — single step)', async () => {
    const response = await handleGrailTool('grail_plan', {
      goal: 'run-lint',
      truth,
    });
    const data = parseResult(response);

    expect(data.feasible).toBe(true);
    expect(data.steps.length).toBe(1);
    expect(data.steps[0].action).toBe('run-lint');
  });

  it('returns infeasible for unknown goal', async () => {
    const response = await handleGrailTool('grail_plan', {
      goal: 'nonexistent',
    });
    const data = parseResult(response);

    expect(data.feasible).toBe(false);
    expect(data.reason).toBe('unknown affordance');
  });
});

describe('grail_run with pre-evaluated truth (fast path)', () => {
  it('previews run-lint without evaluating conditions', async () => {
    const response = await handleGrailTool('grail_run', {
      action: 'run-lint',
      dry_run: true,
      truth: { 'project.lint.passing': true },
    });
    const data = parseResult(response);

    expect(data.dry_run).toBe(true);
    expect(data.preconditions_met).toBe(true);
    expect(data.cmd).toContain('npm run lint');
  });

  it('skips evaluation for actions with no preconditions', async () => {
    // run-lint has no preconditions — should be instant even without truth
    const response = await handleGrailTool('grail_run', {
      action: 'run-lint',
      dry_run: true,
    });
    const data = parseResult(response);

    expect(data.dry_run).toBe(true);
    expect(data.preconditions_met).toBe(true);
  });
});
