import { describe, it, expect, beforeEach } from 'vitest';
import { setCurrentEntity, resetClient } from '../src/siren-client';
import { sirenContextProvider } from '../src/siren-context';
import type { SirenEntity } from '../src/types';

beforeEach(() => {
  resetClient();
});

const fullEntity: SirenEntity = {
  class: ['order', 'active'],
  properties: { status: 'pending', total: 99.50 },
  actions: [
    { name: 'ship', href: '/orders/1/ship', method: 'POST', fields: [{ name: 'carrier', type: 'text' }] },
    { name: 'cancel', href: '/orders/1/cancel', method: 'DELETE' },
  ],
  links: [
    { rel: ['self'], href: '/orders/1' },
    { rel: ['collection', 'orders'], href: '/orders' },
    { rel: ['next'], href: '/orders/2' },
  ],
  entities: [
    { class: ['item'], rel: ['item'], properties: { productCode: 'ABC' } },
  ],
};

describe('siren-context', () => {
  function getSirenContext() {
    return sirenContextProvider.provide();
  }

  describe('with no entity', () => {
    it('returns empty defaults', () => {
      const siren = getSirenContext();

      expect(siren.properties).toEqual({});
      expect(siren.class).toEqual([]);
      expect(siren.actions).toEqual([]);
      expect(siren.links).toEqual([]);
      expect(siren.entities).toEqual([]);
    });

    it('action() returns undefined', () => {
      const siren = getSirenContext();
      expect(siren.action('ship')).toBeUndefined();
    });

    it('link() returns undefined', () => {
      const siren = getSirenContext();
      expect(siren.link('self')).toBeUndefined();
    });
  });

  describe('with entity loaded', () => {
    beforeEach(() => {
      setCurrentEntity(fullEntity, 'https://api.test/orders/1');
    });

    it('exposes properties', () => {
      const siren = getSirenContext();
      expect(siren.properties).toEqual({ status: 'pending', total: 99.50 });
    });

    it('exposes class array', () => {
      const siren = getSirenContext();
      expect(siren.class).toEqual(['order', 'active']);
    });

    it('exposes action names', () => {
      const siren = getSirenContext();
      expect(siren.actions).toEqual(['ship', 'cancel']);
    });

    it('exposes link rels (flattened)', () => {
      const siren = getSirenContext();
      expect(siren.links).toEqual(['self', 'collection', 'orders', 'next']);
    });

    it('exposes sub-entities', () => {
      const siren = getSirenContext();
      expect(siren.entities).toHaveLength(1);
    });

    it('action() returns full action by name', () => {
      const siren = getSirenContext();
      const action = siren.action('ship');
      expect(action).toBeDefined();
      expect(action!.name).toBe('ship');
      expect(action!.method).toBe('POST');
      expect(action!.href).toBe('/orders/1/ship');
      expect(action!.fields).toHaveLength(1);
    });

    it('action() returns undefined for missing action', () => {
      const siren = getSirenContext();
      expect(siren.action('nonexistent')).toBeUndefined();
    });

    it('link() returns full link by rel', () => {
      const siren = getSirenContext();
      const link = siren.link('self');
      expect(link).toBeDefined();
      expect(link!.href).toBe('/orders/1');
    });

    it('link() matches any rel in the array', () => {
      const siren = getSirenContext();
      const byCollection = siren.link('collection');
      const byOrders = siren.link('orders');
      expect(byCollection).toBeDefined();
      expect(byOrders).toBeDefined();
      expect(byCollection).toBe(byOrders); // Same link object
    });

    it('link() returns undefined for missing rel', () => {
      const siren = getSirenContext();
      expect(siren.link('nonexistent')).toBeUndefined();
    });
  });

  describe('reactivity', () => {
    it('reflects entity changes on subsequent access', () => {
      const siren = getSirenContext();
      expect(siren.properties).toEqual({});

      setCurrentEntity(fullEntity, 'https://api.test/orders/1');
      // Same context object, but getter re-evaluates
      expect(siren.properties).toEqual({ status: 'pending', total: 99.50 });
    });
  });

  describe('provider options', () => {
    it('has cache disabled', () => {
      expect(sirenContextProvider.options.cache).toBe(false);
    });
  });
});
