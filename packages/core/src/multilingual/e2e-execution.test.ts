/**
 * End-to-End Execution Tests
 *
 * Tests the complete path: semantic parse → AST build → runtime execute
 * Verifies that commands parsed from any language execute correctly.
 *
 * Word order by language:
 * - SVO (Subject-Verb-Object): en, es, pt, fr, zh, id, sw
 * - SOV (Subject-Object-Verb): ja, ko, tr, qu
 * - VSO (Verb-Subject-Object): ar
 * - V2 (Verb-Second): de
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { parse, buildAST } from '@lokascript/semantic';
import { createMinimalRuntime } from '../runtime/runtime-experimental';
import { createContext } from '../core/context';
import type { ASTNode } from '../types/base-types';

// Import all commands for the test runtime
import { createToggleCommand } from '../commands/dom/toggle';
import { createAddCommand } from '../commands/dom/add';
import { createRemoveCommand } from '../commands/dom/remove';
import { createShowCommand } from '../commands/dom/show';
import { createHideCommand } from '../commands/dom/hide';
import { createSetCommand } from '../commands/data/set';
import { createIncrementCommand } from '../commands/data/increment';
import { createDecrementCommand } from '../commands/data/decrement';
import { createPutCommand } from '../commands/dom/put';
import { createLogCommand } from '../commands/utility/log';
import { createWaitCommand } from '../commands/async/wait';

// =============================================================================
// Test Setup
// =============================================================================

let dom: JSDOM;
let document: Document;
let runtime: ReturnType<typeof createMinimalRuntime>;

beforeEach(() => {
  dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  document = dom.window.document;

  // Create runtime with test commands
  runtime = createMinimalRuntime([
    createToggleCommand(),
    createAddCommand(),
    createRemoveCommand(),
    createShowCommand(),
    createHideCommand(),
    createSetCommand(),
    createIncrementCommand(),
    createDecrementCommand(),
    createPutCommand(),
    createLogCommand(),
    createWaitCommand(),
  ]);
});

/**
 * Helper to execute semantic code
 */
async function executeCode(code: string, lang: string, element: Element): Promise<void> {
  const semanticNode = parse(code, lang);
  const result = buildAST(semanticNode);
  const ctx = createContext(element as HTMLElement);
  await runtime.execute(result.ast as ASTNode, ctx);
}

// =============================================================================
// Toggle Command - All Languages (correct word order)
// =============================================================================

describe('Toggle Command E2E', () => {
  // SVO languages (Verb-Object order)
  const svoTestCases = [
    { lang: 'en', code: 'toggle .active' },
    { lang: 'es', code: 'alternar .active' },
    { lang: 'pt', code: 'alternar .active' },
    { lang: 'fr', code: 'basculer .active' },
    { lang: 'zh', code: '切换 .active' },
  ];

  // SOV languages (Object-Verb order)
  const sovTestCases = [
    { lang: 'ja', code: '.active を トグル' },
    { lang: 'ko', code: '.active 를 토글' },
    { lang: 'tr', code: '.active i değiştir' }, // Accusative marker 'i' required
  ];

  // V2 languages
  const v2TestCases = [{ lang: 'de', code: 'umschalten .active' }];

  // VSO languages
  const vsoTestCases = [{ lang: 'ar', code: 'بدّل .active' }];

  const allTestCases = [...svoTestCases, ...sovTestCases, ...v2TestCases, ...vsoTestCases];

  allTestCases.forEach(({ lang, code }) => {
    it(`${lang}: "${code}" toggles .active class`, async () => {
      const element = document.createElement('div');
      document.body.appendChild(element);

      expect(element.classList.contains('active')).toBe(false);

      await executeCode(code, lang, element);

      expect(element.classList.contains('active')).toBe(true);

      // Toggle again
      await executeCode(code, lang, element);

      expect(element.classList.contains('active')).toBe(false);
    });
  });
});

// =============================================================================
// Add Command - All Languages
// =============================================================================

describe('Add Command E2E', () => {
  const testCases = [
    // SVO
    { lang: 'en', code: 'add .highlight' },
    { lang: 'es', code: 'añadir .highlight' },
    { lang: 'ar', code: 'أضف .highlight' },
    // SOV
    { lang: 'ja', code: '.highlight を 追加' },
    { lang: 'ko', code: '.highlight 를 추가' },
  ];

  testCases.forEach(({ lang, code }) => {
    it(`${lang}: "${code}" adds .highlight class`, async () => {
      const element = document.createElement('div');
      document.body.appendChild(element);

      expect(element.classList.contains('highlight')).toBe(false);

      await executeCode(code, lang, element);

      expect(element.classList.contains('highlight')).toBe(true);
    });
  });
});

// =============================================================================
// Remove Command - All Languages
// =============================================================================

describe('Remove Command E2E', () => {
  const testCases = [
    // SVO
    { lang: 'en', code: 'remove .selected' },
    { lang: 'es', code: 'quitar .selected' },
    { lang: 'ar', code: 'احذف .selected' },
    // SOV
    { lang: 'ja', code: '.selected を 削除' },
    { lang: 'ko', code: '.selected 를 제거' },
  ];

  testCases.forEach(({ lang, code }) => {
    it(`${lang}: "${code}" removes .selected class`, async () => {
      const element = document.createElement('div');
      element.classList.add('selected');
      document.body.appendChild(element);

      expect(element.classList.contains('selected')).toBe(true);

      await executeCode(code, lang, element);

      expect(element.classList.contains('selected')).toBe(false);
    });
  });
});

// =============================================================================
// Show/Hide Commands - Select Languages
// =============================================================================

describe('Show Command E2E', () => {
  const testCases = [
    { lang: 'en', code: 'show me' },
    { lang: 'es', code: 'mostrar me' },
  ];

  testCases.forEach(({ lang, code }) => {
    it(`${lang}: "${code}" shows hidden element`, async () => {
      const element = document.createElement('div');
      element.style.display = 'none';
      document.body.appendChild(element);

      await executeCode(code, lang, element);

      expect(element.style.display).not.toBe('none');
    });
  });
});

describe('Hide Command E2E', () => {
  const testCases = [
    { lang: 'en', code: 'hide me' },
    { lang: 'es', code: 'ocultar me' },
  ];

  testCases.forEach(({ lang, code }) => {
    it(`${lang}: "${code}" hides visible element`, async () => {
      const element = document.createElement('div');
      document.body.appendChild(element);

      await executeCode(code, lang, element);

      expect(element.style.display).toBe('none');
    });
  });
});

// =============================================================================
// Put Command - Select Languages
// =============================================================================

describe('Put Command E2E', () => {
  it('en: put content into element', async () => {
    const element = document.createElement('div');
    document.body.appendChild(element);

    await executeCode("put 'Hello World' into me", 'en', element);

    expect(element.innerHTML).toBe('Hello World');
  });

  it('es: put content into element', async () => {
    const element = document.createElement('div');
    document.body.appendChild(element);

    await executeCode("poner 'Hola Mundo' en me", 'es', element);

    expect(element.innerHTML).toBe('Hola Mundo');
  });
});

// =============================================================================
// Commands with explicit targets
// =============================================================================

describe('Commands with explicit targets', () => {
  it('en: toggle on specific target', async () => {
    const source = document.createElement('button');
    const target = document.createElement('div');
    target.id = 'target';
    document.body.appendChild(source);
    document.body.appendChild(target);

    await executeCode('toggle .active on #target', 'en', source);

    expect(target.classList.contains('active')).toBe(true);
    expect(source.classList.contains('active')).toBe(false);
  });

  it('ja: toggle on specific target (SOV order)', async () => {
    const source = document.createElement('button');
    const target = document.createElement('div');
    target.id = 'target';
    document.body.appendChild(source);
    document.body.appendChild(target);

    await executeCode('#target の .active を トグル', 'ja', source);

    expect(target.classList.contains('active')).toBe(true);
  });

  it('ko: toggle on specific target (SOV order)', async () => {
    const source = document.createElement('button');
    const target = document.createElement('div');
    target.id = 'target';
    document.body.appendChild(source);
    document.body.appendChild(target);

    await executeCode('#target 의 .active 를 토글', 'ko', source);

    expect(target.classList.contains('active')).toBe(true);
  });
});

// =============================================================================
// Increment/Decrement Commands
// =============================================================================

describe('Increment Command E2E', () => {
  it('en: increment counter variable', async () => {
    const element = document.createElement('div');
    document.body.appendChild(element);

    const ctx = createContext(element);
    ctx.locals.set('counter', 5);

    const semanticNode = parse('increment counter', 'en');
    const result = buildAST(semanticNode);
    await runtime.execute(result.ast as ASTNode, ctx);

    expect(ctx.locals.get('counter')).toBe(6);
  });
});

describe('Decrement Command E2E', () => {
  it('en: decrement counter variable', async () => {
    const element = document.createElement('div');
    document.body.appendChild(element);

    const ctx = createContext(element);
    ctx.locals.set('counter', 5);

    const semanticNode = parse('decrement counter', 'en');
    const result = buildAST(semanticNode);
    await runtime.execute(result.ast as ASTNode, ctx);

    expect(ctx.locals.get('counter')).toBe(4);
  });
});
