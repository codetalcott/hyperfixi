import { describe, it, expect } from 'vitest';
import { inferConventions } from '../conventions/convention-engine.js';

describe('inferConventions', () => {
  it('defaults to GET + json', () => {
    const result = inferConventions('/api/users');
    expect(result.method).toBe('GET');
    expect(result.responseFormat).toBe('json');
    expect(result.handlerName).toBe('getApiUsers');
  });

  it('uses explicit method from hx-post', () => {
    const result = inferConventions('/api/users', { explicitMethod: 'POST' });
    expect(result.method).toBe('POST');
    expect(result.handlerName).toBe('postApiUsers');
  });

  it('infers POST from form context', () => {
    const result = inferConventions('/api/users', { elementTag: 'form' });
    expect(result.method).toBe('POST');
    expect(result.notes).toContain('Inferred POST from <form> context');
  });

  it('explicit method overrides form context', () => {
    const result = inferConventions('/api/users', {
      elementTag: 'form',
      explicitMethod: 'PUT',
    });
    expect(result.method).toBe('PUT');
  });

  it('uses explicit response type from hyperscript', () => {
    const result = inferConventions('/api/users', { fetchResponseType: 'html' });
    expect(result.responseFormat).toBe('html');
  });

  it('infers html from URL pattern', () => {
    const result = inferConventions('/pages/dashboard');
    expect(result.responseFormat).toBe('html');
    expect(result.notes).toContain('Inferred html response from URL pattern');
  });

  it('infers html from partials URL', () => {
    const result = inferConventions('/partials/user-card');
    expect(result.responseFormat).toBe('html');
  });

  it('handles unknown response type', () => {
    const result = inferConventions('/api/data', { fetchResponseType: 'blob' });
    expect(result.responseFormat).toBe('json');
    expect(result.notes[0]).toMatch(/Unknown response type/);
  });

  it('generates correct handler name with params', () => {
    const result = inferConventions('/api/users/:id', { explicitMethod: 'DELETE' });
    expect(result.handlerName).toBe('deleteApiUsersById');
  });
});
