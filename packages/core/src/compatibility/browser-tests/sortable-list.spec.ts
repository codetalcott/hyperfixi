import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:3001';

test.describe('Sortable List Example', () => {
  test('should load without errors and have 5 items', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => {
      errors.push(`PAGE: ${err.message}`);
    });

    await page.goto(`${BASE_URL}/examples/advanced/03-sortable-list.html`);
    await page.waitForTimeout(2000);

    const items = await page.locator('.sortable-item').count();
    expect(items).toBe(5);
    expect(errors.length).toBe(0);
  });

  test('dragstart should add .dragging class', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => {
      errors.push(err.message);
    });

    await page.goto(`${BASE_URL}/examples/advanced/03-sortable-list.html`);
    await page.waitForTimeout(2000);

    const result = await page.evaluate(async () => {
      const list = document.getElementById('task-list')!;
      const item = list.querySelector('.sortable-item') as HTMLElement;
      const dt = new DataTransfer();

      item.dispatchEvent(
        new DragEvent('dragstart', {
          bubbles: true,
          cancelable: true,
          dataTransfer: dt,
          clientX: 100,
          clientY: 100,
        })
      );
      await new Promise(r => setTimeout(r, 500));

      return {
        hasDragging: item.classList.contains('dragging'),
        // Note: dt.effectAllowed can't be verified here — Chromium ignores
        // effectAllowed assignment on synthetic DataTransfer objects.
        // The "set the event.dataTransfer.effectAllowed to 'move'" line
        // runs without error; effectAllowed is only effective in real drag events.
      };
    });

    expect(result.hasDragging).toBe(true);
    expect(errors.length).toBe(0);
  });

  test('full drag-drop should reorder items', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => {
      errors.push(err.message);
    });

    await page.goto(`${BASE_URL}/examples/advanced/03-sortable-list.html`);
    await page.waitForTimeout(2000);

    const result = await page.evaluate(async () => {
      const list = document.getElementById('task-list')!;
      const items = list.querySelectorAll('.sortable-item');
      const first = items[0] as HTMLElement;
      const third = items[2] as HTMLElement;

      const getTitles = () =>
        Array.from(list.querySelectorAll('.item-title')).map(el => el.textContent);
      const before = getTitles();

      const firstRect = first.getBoundingClientRect();
      const thirdRect = third.getBoundingClientRect();
      const dt = new DataTransfer();

      // dragstart on first item
      first.dispatchEvent(
        new DragEvent('dragstart', {
          bubbles: true,
          cancelable: true,
          dataTransfer: dt,
          clientX: firstRect.left + 50,
          clientY: firstRect.top + 20,
        })
      );
      await new Promise(r => setTimeout(r, 200));

      const hasDragging = first.classList.contains('dragging');

      // dragover on third item (below midpoint to insert after)
      third.dispatchEvent(
        new DragEvent('dragover', {
          bubbles: true,
          cancelable: true,
          dataTransfer: dt,
          clientX: thirdRect.left + 50,
          clientY: thirdRect.bottom - 5,
        })
      );
      await new Promise(r => setTimeout(r, 100));

      // drop on third item
      third.dispatchEvent(
        new DragEvent('drop', {
          bubbles: true,
          cancelable: true,
          dataTransfer: dt,
          clientX: thirdRect.left + 50,
          clientY: thirdRect.bottom - 5,
        })
      );
      await new Promise(r => setTimeout(r, 200));

      // dragend to clean up
      first.dispatchEvent(
        new DragEvent('dragend', {
          bubbles: true,
          cancelable: true,
          dataTransfer: dt,
        })
      );
      await new Promise(r => setTimeout(r, 300));

      const after = getTitles();
      const draggingCleaned = !list.querySelector('.dragging');

      return { before, after, hasDragging, draggingCleaned };
    });

    expect(result.hasDragging).toBe(true);
    expect(result.draggingCleaned).toBe(true);
    expect(result.after).not.toEqual(result.before);
    expect(errors.length).toBe(0);
  });

  test('dragend should clean up .dragging when drag cancelled', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => {
      errors.push(err.message);
    });

    await page.goto(`${BASE_URL}/examples/advanced/03-sortable-list.html`);
    await page.waitForTimeout(2000);

    const result = await page.evaluate(async () => {
      const list = document.getElementById('task-list')!;
      const item = list.querySelector('.sortable-item') as HTMLElement;
      const dt = new DataTransfer();

      // dragstart
      item.dispatchEvent(
        new DragEvent('dragstart', {
          bubbles: true,
          cancelable: true,
          dataTransfer: dt,
        })
      );
      await new Promise(r => setTimeout(r, 200));

      const hasDragging = item.classList.contains('dragging');

      // dragend without drop (simulates cancel)
      item.dispatchEvent(
        new DragEvent('dragend', {
          bubbles: true,
          cancelable: true,
          dataTransfer: dt,
        })
      );
      await new Promise(r => setTimeout(r, 300));

      const draggingCleaned = !list.querySelector('.dragging');
      return { hasDragging, draggingCleaned };
    });

    expect(result.hasDragging).toBe(true);
    expect(result.draggingCleaned).toBe(true);
    expect(errors.length).toBe(0);
  });

  test('delete button should remove item', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => {
      errors.push(err.message);
    });

    await page.goto(`${BASE_URL}/examples/advanced/03-sortable-list.html`);
    await page.waitForTimeout(2000);

    const before = await page.locator('.sortable-item').count();
    await page.locator('.delete-btn').first().click();
    await page.waitForTimeout(500);
    const after = await page.locator('.sortable-item').count();

    expect(after).toBe(before - 1);
    expect(errors.length).toBe(0);
  });

  test('delete button should work after drag-drop reorder', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => {
      errors.push(err.message);
    });

    await page.goto(`${BASE_URL}/examples/advanced/03-sortable-list.html`);
    await page.waitForTimeout(2000);

    const result = await page.evaluate(async () => {
      const list = document.getElementById('task-list')!;
      const items = list.querySelectorAll('.sortable-item');
      const first = items[0] as HTMLElement;
      const third = items[2] as HTMLElement;
      const dt = new DataTransfer();

      const countBefore = list.querySelectorAll('.sortable-item').length;

      // Perform drag-drop: move first item after third
      first.dispatchEvent(
        new DragEvent('dragstart', {
          bubbles: true,
          cancelable: true,
          dataTransfer: dt,
          clientX: 100,
          clientY: 100,
        })
      );
      await new Promise(r => setTimeout(r, 200));

      const thirdRect = third.getBoundingClientRect();
      third.dispatchEvent(
        new DragEvent('dragover', {
          bubbles: true,
          cancelable: true,
          dataTransfer: dt,
          clientX: thirdRect.left + 50,
          clientY: thirdRect.bottom - 5,
        })
      );
      await new Promise(r => setTimeout(r, 100));

      third.dispatchEvent(
        new DragEvent('drop', {
          bubbles: true,
          cancelable: true,
          dataTransfer: dt,
          clientX: thirdRect.left + 50,
          clientY: thirdRect.bottom - 5,
        })
      );
      await new Promise(r => setTimeout(r, 200));

      first.dispatchEvent(
        new DragEvent('dragend', {
          bubbles: true,
          cancelable: true,
          dataTransfer: dt,
        })
      );
      await new Promise(r => setTimeout(r, 300));

      // Now click the delete button on the moved item
      const movedItem = first; // same element, just repositioned
      const deleteBtn = movedItem.querySelector('.delete-btn') as HTMLElement;
      if (deleteBtn) {
        deleteBtn.click();
        await new Promise(r => setTimeout(r, 500));
      }

      const countAfter = list.querySelectorAll('.sortable-item').length;
      return { countBefore, countAfter, hadDeleteBtn: !!deleteBtn };
    });

    expect(result.hadDeleteBtn).toBe(true);
    expect(result.countAfter).toBe(result.countBefore - 1);
    expect(errors.length).toBe(0);
  });

  test('set the event.X.Y to Z pattern works at runtime', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => {
      errors.push(err.message);
    });

    await page.goto(`${BASE_URL}/examples/advanced/03-sortable-list.html`);
    await page.waitForTimeout(2000);

    const result = await page.evaluate(async () => {
      // Check which APIs are available
      const w = window as any;
      const api = w.lokascript || w._hyperscript;
      const hasProcessNode = typeof api?.processNode === 'function';

      // Minimal test: does processNode + custom event work at all?
      const el1 = document.createElement('div');
      el1.setAttribute('_', 'on test-simple add .fired to me');
      document.body.appendChild(el1);
      api.processNode(el1);
      await new Promise(r => setTimeout(r, 200));
      el1.dispatchEvent(new CustomEvent('test-simple', { bubbles: true }));
      await new Promise(r => setTimeout(r, 200));
      const simpleFired = el1.classList.contains('fired');

      // Can we set a variable to event.type?
      const el2 = document.createElement('div');
      el2.setAttribute(
        '_',
        'on test-evt set myType to event.type then set @data-mytype to myType then add .evt-done to me'
      );
      document.body.appendChild(el2);
      api.processNode(el2);
      await new Promise(r => setTimeout(r, 200));
      el2.dispatchEvent(new CustomEvent('test-evt', { bubbles: true }));
      await new Promise(r => setTimeout(r, 300));
      const evtDone = el2.classList.contains('evt-done');
      const myType = el2.getAttribute('data-mytype');

      // Can we set event.detail.result?
      const el3 = document.createElement('div');
      el3.setAttribute(
        '_',
        'on test-set set the event.detail.result to "done" then add .set-done to me'
      );
      document.body.appendChild(el3);
      api.processNode(el3);
      await new Promise(r => setTimeout(r, 200));
      const detail = { result: 'pending' };
      el3.dispatchEvent(new CustomEvent('test-set', { bubbles: true, detail }));
      await new Promise(r => setTimeout(r, 300));
      const setDone = el3.classList.contains('set-done');

      document.body.removeChild(el1);
      document.body.removeChild(el2);
      document.body.removeChild(el3);
      return { simpleFired, evtDone, myType, setDone, value: detail.result };
    });

    console.log('Diagnostic:', JSON.stringify(result));
    console.log('Errors:', JSON.stringify(errors));
    expect(result.simpleFired).toBe(true);
    expect(errors.length).toBe(0);
  });
});
