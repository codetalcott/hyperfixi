import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setCurrentEntity, resetClient } from '../src/siren-client';
import { createSirenAffordance } from '../src/behaviors/siren-affordance';
import type { SirenEntity } from '../src/types';

beforeEach(() => {
  resetClient();
});

const entityWithShip: SirenEntity = {
  actions: [{ name: 'ship', href: '/orders/1/ship', method: 'POST' }],
  links: [
    { rel: ['self'], href: '/orders/1' },
    { rel: ['next'], href: '/orders/2' },
  ],
};

const entityWithoutShip: SirenEntity = {
  actions: [{ name: 'cancel', href: '/orders/1/cancel', method: 'DELETE' }],
  links: [{ rel: ['self'], href: '/orders/1' }],
};

describe('SirenAffordance behavior', () => {
  let element: HTMLElement;

  beforeEach(() => {
    element = document.createElement('button');
    document.body.appendChild(element);
  });

  afterEach(() => {
    element.remove();
  });

  describe('action-based visibility', () => {
    it('starts hidden', () => {
      const affordance = createSirenAffordance({ element, action: 'ship' });
      expect(element.style.display).toBe('none');
      affordance.destroy();
    });

    it('shows element when action exists', () => {
      const affordance = createSirenAffordance({ element, action: 'ship' });

      setCurrentEntity(entityWithShip, 'https://api.test/orders/1');

      expect(element.style.display).toBe('');
      affordance.destroy();
    });

    it('hides element when action removed', () => {
      const affordance = createSirenAffordance({ element, action: 'ship' });

      // First: show
      setCurrentEntity(entityWithShip, 'https://api.test/orders/1');
      expect(element.style.display).toBe('');

      // Then: hide
      setCurrentEntity(entityWithoutShip, 'https://api.test/orders/1');
      expect(element.style.display).toBe('none');

      affordance.destroy();
    });

    it('stays hidden when action never exists', () => {
      const affordance = createSirenAffordance({ element, action: 'nonexistent' });

      setCurrentEntity(entityWithShip, 'https://api.test/orders/1');

      expect(element.style.display).toBe('none');
      affordance.destroy();
    });
  });

  describe('link-based visibility', () => {
    it('shows element when link exists', () => {
      const affordance = createSirenAffordance({ element, link: 'next' });

      setCurrentEntity(entityWithShip, 'https://api.test/orders/1');

      expect(element.style.display).toBe('');
      affordance.destroy();
    });

    it('hides element when link removed', () => {
      const affordance = createSirenAffordance({ element, link: 'next' });

      setCurrentEntity(entityWithShip, 'https://api.test/orders/1');
      expect(element.style.display).toBe('');

      setCurrentEntity(entityWithoutShip, 'https://api.test/orders/1');
      expect(element.style.display).toBe('none');

      affordance.destroy();
    });
  });

  describe('cleanup', () => {
    it('stops listening after destroy', () => {
      const affordance = createSirenAffordance({ element, action: 'ship' });
      affordance.destroy();

      setCurrentEntity(entityWithShip, 'https://api.test/orders/1');

      // Still hidden because listener was removed
      expect(element.style.display).toBe('none');
    });
  });

  describe('manual update', () => {
    it('update() re-evaluates visibility', () => {
      const affordance = createSirenAffordance({ element, action: 'ship' });
      expect(element.style.display).toBe('none');

      // Set entity directly without event
      setCurrentEntity(entityWithShip, 'https://api.test/orders/1');
      // The event listener already fired, but let's test manual update too
      affordance.update();
      expect(element.style.display).toBe('');

      affordance.destroy();
    });
  });
});
