import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createSirenPlanUI } from '../src/behaviors/siren-plan-ui';
import type { SirenPlanEventDetail } from '../src/types';

function dispatchPlan(detail: SirenPlanEventDetail): void {
  document.dispatchEvent(new CustomEvent('siren:plan', { detail }));
}

function dispatchEntity(): void {
  document.dispatchEvent(
    new CustomEvent('siren:entity', {
      detail: { entity: { class: ['order'] }, url: '/orders/1', previousUrl: null },
    }),
  );
}

const SAMPLE_PLAN: SirenPlanEventDetail = {
  blockedAction: 'ship-order',
  steps: [
    { name: 'add-item', params: {} },
    { name: 'update-order', params: { status: 'processing' } },
    { name: 'ship-order', params: {} },
  ],
  totalCost: 4,
  alternativeCount: 1,
  fromEntityActions: true,
};

describe('SirenPlanUI', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('renders step list on siren:plan event', () => {
    const ui = createSirenPlanUI({ element: container });

    dispatchPlan(SAMPLE_PLAN);

    const items = container.querySelectorAll('li');
    expect(items.length).toBe(3);
    expect(items[0].textContent).toBe('add-item');
    expect(items[1].textContent).toBe('update-order (status=processing)');
    expect(items[2].textContent).toBe('ship-order');

    ui.destroy();
  });

  it('shows cost when showCost is true', () => {
    const ui = createSirenPlanUI({ element: container, showCost: true });

    dispatchPlan(SAMPLE_PLAN);

    const header = container.querySelector('p');
    expect(header?.textContent).toContain('cost: 4');

    ui.destroy();
  });

  it('hides cost when showCost is false', () => {
    const ui = createSirenPlanUI({ element: container, showCost: false });

    dispatchPlan(SAMPLE_PLAN);

    const header = container.querySelector('p');
    expect(header?.textContent).not.toContain('cost');

    ui.destroy();
  });

  it('sets aria-label on the list', () => {
    const ui = createSirenPlanUI({ element: container });

    dispatchPlan(SAMPLE_PLAN);

    const ol = container.querySelector('ol');
    expect(ol?.getAttribute('aria-label')).toBe('Plan to unblock ship-order');

    ui.destroy();
  });

  it('sets data-siren-plan attribute', () => {
    const ui = createSirenPlanUI({ element: container });

    dispatchPlan(SAMPLE_PLAN);

    expect(container.getAttribute('data-siren-plan')).toBe('ship-order');

    ui.destroy();
  });

  it('clears on siren:entity event', () => {
    const ui = createSirenPlanUI({ element: container });

    dispatchPlan(SAMPLE_PLAN);
    expect(container.querySelectorAll('li').length).toBe(3);

    dispatchEntity();
    expect(container.innerHTML).toBe('');
    expect(container.hasAttribute('data-siren-plan')).toBe(false);

    ui.destroy();
  });

  it('clear() empties container', () => {
    const ui = createSirenPlanUI({ element: container });

    dispatchPlan(SAMPLE_PLAN);
    expect(container.querySelectorAll('li').length).toBe(3);

    ui.clear();
    expect(container.innerHTML).toBe('');

    ui.destroy();
  });

  it('destroy() stops listening', () => {
    const ui = createSirenPlanUI({ element: container });

    ui.destroy();

    dispatchPlan(SAMPLE_PLAN);
    expect(container.innerHTML).toBe('');
  });

  it('handles empty steps array', () => {
    const ui = createSirenPlanUI({ element: container });

    dispatchPlan({ ...SAMPLE_PLAN, steps: [] });
    expect(container.innerHTML).toBe('');

    ui.destroy();
  });

  it('replaces previous plan on new siren:plan event', () => {
    const ui = createSirenPlanUI({ element: container });

    dispatchPlan(SAMPLE_PLAN);
    expect(container.querySelectorAll('li').length).toBe(3);

    dispatchPlan({
      ...SAMPLE_PLAN,
      steps: [{ name: 'pay', params: {} }],
      totalCost: 1,
    });
    expect(container.querySelectorAll('li').length).toBe(1);
    expect(container.querySelector('li')?.textContent).toBe('pay');

    ui.destroy();
  });
});
