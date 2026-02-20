import { describe, it, expect } from 'vitest';
import { DomainRegistry } from '../api/domain-registry';
import { registryToAOTBackends } from './registry-bridge';

describe('registryToAOTBackends', () => {
  it('converts domains with scanConfig to backends', async () => {
    const registry = new DomainRegistry();

    registry.register({
      name: 'test-domain',
      description: 'Test domain',
      languages: ['en'],
      inputLabel: 'input',
      inputDescription: 'Test input',
      getDSL: () => import('@lokascript/domain-sql').then(m => m.createSQLDSL()),
      scanConfig: {
        attributes: ['data-test'],
        scriptTypes: ['text/test'],
        defaultLanguage: 'en',
      },
    });

    const backends = await registryToAOTBackends(registry);
    expect(backends).toHaveLength(1);
    expect(backends[0].domain).toBe('test-domain');
    expect(backends[0].scanConfig.domain).toBe('test-domain');
    expect(backends[0].scanConfig.attributes).toEqual(['data-test']);
    expect(backends[0].dsl).toBeDefined();
    expect(backends[0].codeGenerator).toBeDefined();
  });

  it('skips domains without scanConfig', async () => {
    const registry = new DomainRegistry();

    registry.register({
      name: 'with-config',
      description: 'Has scanConfig',
      languages: ['en'],
      inputLabel: 'input',
      inputDescription: 'Test',
      getDSL: () => import('@lokascript/domain-sql').then(m => m.createSQLDSL()),
      scanConfig: {
        attributes: ['data-with'],
        defaultLanguage: 'en',
      },
    });

    registry.register({
      name: 'without-config',
      description: 'No scanConfig',
      languages: ['en'],
      inputLabel: 'input',
      inputDescription: 'Test',
      getDSL: () => import('@lokascript/domain-sql').then(m => m.createSQLDSL()),
      // no scanConfig
    });

    const backends = await registryToAOTBackends(registry);
    expect(backends).toHaveLength(1);
    expect(backends[0].domain).toBe('with-config');
  });

  it('returns empty array when no domains have scanConfig', async () => {
    const registry = new DomainRegistry();

    registry.register({
      name: 'no-scan',
      description: 'No scanConfig',
      languages: ['en'],
      inputLabel: 'input',
      inputDescription: 'Test',
      getDSL: () => import('@lokascript/domain-sql').then(m => m.createSQLDSL()),
    });

    const backends = await registryToAOTBackends(registry);
    expect(backends).toHaveLength(0);
  });

  it('codeGenerator produces JSON from semantic node', async () => {
    const registry = new DomainRegistry();

    registry.register({
      name: 'gen-test',
      description: 'Generator test',
      languages: ['en'],
      inputLabel: 'input',
      inputDescription: 'Test',
      getDSL: () => import('@lokascript/domain-sql').then(m => m.createSQLDSL()),
      scanConfig: {
        attributes: ['data-gen'],
        defaultLanguage: 'en',
      },
    });

    const backends = await registryToAOTBackends(registry);
    const node = {
      action: 'select',
      roles: new Map([['source', { type: 'expression' as const, raw: 'users' }]]),
    };
    const output = backends[0].codeGenerator.generate(node as any);
    const parsed = JSON.parse(output);
    expect(parsed.action).toBe('select');
  });
});
