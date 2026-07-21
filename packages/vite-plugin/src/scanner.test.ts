import { describe, it, expect } from 'vitest';
import { Scanner } from './scanner';

describe('Scanner', () => {
  const scanner = new Scanner({});

  describe('command detection', () => {
    it('detects toggle command', () => {
      const usage = scanner.scan('<button _="on click toggle .active">', 'test.html');
      expect(usage.commands.has('toggle')).toBe(true);
    });

    it('detects show/hide commands', () => {
      const usage = scanner.scan('<button _="on click show #modal">', 'test.html');
      expect(usage.commands.has('show')).toBe(true);

      const usage2 = scanner.scan('<button _="on click hide #modal">', 'test.html');
      expect(usage2.commands.has('hide')).toBe(true);
    });

    it('detects multiple commands in one script', () => {
      const usage = scanner.scan('<button _="on click add .foo then remove .bar">', 'test.html');
      expect(usage.commands.has('add')).toBe(true);
      expect(usage.commands.has('remove')).toBe(true);
    });

    it('detects increment/decrement', () => {
      const usage = scanner.scan('<button _="on click increment #count">', 'test.html');
      expect(usage.commands.has('increment')).toBe(true);

      const usage2 = scanner.scan('<button _="on click decrement #count">', 'test.html');
      expect(usage2.commands.has('decrement')).toBe(true);
    });

    it('detects put command', () => {
      const usage = scanner.scan('<button _="on click put \'hello\' into #output">', 'test.html');
      expect(usage.commands.has('put')).toBe(true);
    });

    it('detects set command', () => {
      const usage = scanner.scan('<button _="on click set :count to 0">', 'test.html');
      expect(usage.commands.has('set')).toBe(true);
    });

    it('detects wait command', () => {
      const usage = scanner.scan('<button _="on click wait 500ms then add .active">', 'test.html');
      expect(usage.commands.has('wait')).toBe(true);
      expect(usage.commands.has('add')).toBe(true);
    });

    it('detects log command', () => {
      const usage = scanner.scan('<button _="on click log \'clicked\'">', 'test.html');
      expect(usage.commands.has('log')).toBe(true);
    });

    it('detects send command', () => {
      const usage = scanner.scan('<button _="on click send myEvent to #target">', 'test.html');
      expect(usage.commands.has('send')).toBe(true);
    });

    it('detects trigger command', () => {
      const usage = scanner.scan('<button _="on click trigger click on #other">', 'test.html');
      expect(usage.commands.has('trigger')).toBe(true);
    });

    it('detects focus/blur commands', () => {
      const usage = scanner.scan('<button _="on click focus #input">', 'test.html');
      expect(usage.commands.has('focus')).toBe(true);

      const usage2 = scanner.scan('<button _="on click blur #input">', 'test.html');
      expect(usage2.commands.has('blur')).toBe(true);
    });
  });

  describe('block detection', () => {
    it('detects if block', () => {
      const usage = scanner.scan(
        '<button _="on click if me has .active then remove .active">',
        'test.html'
      );
      expect(usage.blocks.has('if')).toBe(true);
    });

    it('detects unless block (uses if block)', () => {
      const usage = scanner.scan(
        '<button _="on click unless me has .disabled add .active">',
        'test.html'
      );
      expect(usage.blocks.has('if')).toBe(true);
    });

    it('detects repeat block with literal number', () => {
      const usage = scanner.scan('<button _="on click repeat 3 times add .pulse">', 'test.html');
      expect(usage.blocks.has('repeat')).toBe(true);
    });

    it('detects repeat block with local variable', () => {
      const usage = scanner.scan(
        '<button _="on click repeat :count times add .pulse">',
        'test.html'
      );
      expect(usage.blocks.has('repeat')).toBe(true);
    });

    it('detects repeat block with global variable', () => {
      const usage = scanner.scan(
        '<button _="on click repeat $count times add .pulse">',
        'test.html'
      );
      expect(usage.blocks.has('repeat')).toBe(true);
    });

    it('detects repeat block with identifier', () => {
      const usage = scanner.scan(
        '<button _="on click repeat count times add .pulse">',
        'test.html'
      );
      expect(usage.blocks.has('repeat')).toBe(true);
    });

    it('detects for each block', () => {
      const usage = scanner.scan('<button _="on click for each item in items">', 'test.html');
      expect(usage.blocks.has('for')).toBe(true);
    });

    it('detects for every block', () => {
      const usage = scanner.scan('<button _="on click for every el in .items">', 'test.html');
      expect(usage.blocks.has('for')).toBe(true);
    });

    it('detects fetch block', () => {
      const usage = scanner.scan('<button _="on click fetch /api/data as json">', 'test.html');
      expect(usage.blocks.has('fetch')).toBe(true);
    });

    it('detects while block', () => {
      const usage = scanner.scan('<button _="on click while :running log \'tick\'">', 'test.html');
      expect(usage.blocks.has('while')).toBe(true);
    });

    it('detects multiple blocks', () => {
      const usage = scanner.scan(
        '<button _="on click if :ready fetch /api then for each item in it put item">',
        'test.html'
      );
      expect(usage.blocks.has('if')).toBe(true);
      expect(usage.blocks.has('fetch')).toBe(true);
      expect(usage.blocks.has('for')).toBe(true);
    });
  });

  describe('positional expression detection', () => {
    it('detects first', () => {
      const usage = scanner.scan('<button _="on click add .active to first <li/>">', 'test.html');
      expect(usage.positional).toBe(true);
    });

    it('detects last', () => {
      const usage = scanner.scan('<button _="on click add .active to last <li/>">', 'test.html');
      expect(usage.positional).toBe(true);
    });

    it('detects next', () => {
      const usage = scanner.scan(
        '<button _="on click add .active to next <button/>">',
        'test.html'
      );
      expect(usage.positional).toBe(true);
    });

    it('detects previous', () => {
      const usage = scanner.scan(
        '<button _="on click add .active to previous <button/>">',
        'test.html'
      );
      expect(usage.positional).toBe(true);
    });

    it('detects closest', () => {
      const usage = scanner.scan(
        '<button _="on click toggle .open on closest .card">',
        'test.html'
      );
      expect(usage.positional).toBe(true);
    });

    it('detects parent', () => {
      const usage = scanner.scan('<button _="on click add .active to parent">', 'test.html');
      expect(usage.positional).toBe(true);
    });

    it('does not false positive on similar words', () => {
      // 'firstly' does NOT match 'first' at word boundary - the 'l' after 'first' is not a boundary
      const usage = scanner.scan('<button _="on click put \'firstly\' into #output">', 'test.html');
      expect(usage.positional).toBe(false);

      // 'unfirst' also shouldn't match 'first' at word boundary
      const usage2 = scanner.scan(
        '<button _="on click put \'unfirst\' into #output">',
        'test.html'
      );
      expect(usage2.positional).toBe(false);

      // But 'first item' SHOULD match at word boundary
      const usage3 = scanner.scan('<button _="on click get first .item">', 'test.html');
      expect(usage3.positional).toBe(true);
    });
  });

  describe('attribute patterns', () => {
    it('handles double quotes', () => {
      const usage = scanner.scan('<button _="on click toggle .active">', 'test.html');
      expect(usage.commands.has('toggle')).toBe(true);
    });

    it('handles single quotes', () => {
      const usage = scanner.scan("<button _='on click toggle .active'>", 'test.html');
      expect(usage.commands.has('toggle')).toBe(true);
    });

    it('handles backticks', () => {
      const usage = scanner.scan('<button _=`on click toggle .active`>', 'test.html');
      expect(usage.commands.has('toggle')).toBe(true);
    });

    it('handles JSX template literal syntax', () => {
      const usage = scanner.scan('<Button _={`on click toggle .active`} />', 'test.tsx');
      expect(usage.commands.has('toggle')).toBe(true);
    });

    it('handles JSX double quote string syntax', () => {
      const usage = scanner.scan('<Button _={"on click toggle .active"} />', 'test.tsx');
      expect(usage.commands.has('toggle')).toBe(true);
    });

    it('handles JSX single quote string syntax', () => {
      const usage = scanner.scan("<Button _={'on click toggle .active'} />", 'test.tsx');
      expect(usage.commands.has('toggle')).toBe(true);
    });

    it('handles multiline hyperscript', () => {
      const code = `<button _="on click
        add .loading
        fetch /api
        remove .loading">`;
      const usage = scanner.scan(code, 'test.html');
      expect(usage.commands.has('add')).toBe(true);
      expect(usage.commands.has('remove')).toBe(true);
      expect(usage.blocks.has('fetch')).toBe(true);
    });

    it('handles multiple hyperscript attributes in one file', () => {
      const code = `
        <button _="on click toggle .a">A</button>
        <button _="on click show #b">B</button>
        <button _="on click hide #c">C</button>
      `;
      const usage = scanner.scan(code, 'test.html');
      expect(usage.commands.has('toggle')).toBe(true);
      expect(usage.commands.has('show')).toBe(true);
      expect(usage.commands.has('hide')).toBe(true);
    });
  });

  describe('file filtering', () => {
    it('should scan HTML files', () => {
      expect(scanner.shouldScan('page.html')).toBe(true);
      expect(scanner.shouldScan('page.htm')).toBe(true);
    });

    it('should scan Vue files', () => {
      expect(scanner.shouldScan('Component.vue')).toBe(true);
    });

    it('should scan Svelte files', () => {
      expect(scanner.shouldScan('Component.svelte')).toBe(true);
    });

    it('should scan JSX/TSX files', () => {
      expect(scanner.shouldScan('Component.jsx')).toBe(true);
      expect(scanner.shouldScan('Component.tsx')).toBe(true);
    });

    it('should scan Astro files', () => {
      expect(scanner.shouldScan('Page.astro')).toBe(true);
    });

    it('should not scan node_modules', () => {
      expect(scanner.shouldScan('node_modules/package/file.html')).toBe(false);
    });

    it('should not scan .git directory', () => {
      expect(scanner.shouldScan('.git/hooks/pre-commit')).toBe(false);
    });

    it('should not scan CSS/JSON files', () => {
      expect(scanner.shouldScan('styles.css')).toBe(false);
      expect(scanner.shouldScan('package.json')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('handles empty file', () => {
      const usage = scanner.scan('', 'test.html');
      expect(usage.commands.size).toBe(0);
      expect(usage.blocks.size).toBe(0);
      expect(usage.positional).toBe(false);
    });

    it('handles file with no hyperscript', () => {
      const code = '<button onclick="alert(1)">Click</button>';
      const usage = scanner.scan(code, 'test.html');
      expect(usage.commands.size).toBe(0);
    });

    it('handles hyperscript in script tag', () => {
      const code = '<script type="text/hyperscript">on click toggle .active</script>';
      const usage = scanner.scan(code, 'test.html');
      expect(usage.commands.has('toggle')).toBe(true);
    });
  });

  describe('language detection', () => {
    it('detects Japanese keywords', () => {
      const usage = scanner.scan('<button _="on click トグル .active">', 'test.html');
      expect(usage.detectedLanguages.has('ja')).toBe(true);
    });

    it('detects Japanese 切り替え (toggle)', () => {
      const usage = scanner.scan('<button _="on click 切り替え .active">', 'test.html');
      expect(usage.detectedLanguages.has('ja')).toBe(true);
    });

    it('detects Spanish keywords', () => {
      const usage = scanner.scan('<button _="on click alternar .active">', 'test.html');
      expect(usage.detectedLanguages.has('es')).toBe(true);
    });

    it('detects Korean keywords', () => {
      const usage = scanner.scan('<button _="on click 토글 .active">', 'test.html');
      expect(usage.detectedLanguages.has('ko')).toBe(true);
    });

    it('detects Chinese keywords', () => {
      const usage = scanner.scan('<button _="on click 切换 .active">', 'test.html');
      expect(usage.detectedLanguages.has('zh')).toBe(true);
    });

    it('detects Arabic keywords', () => {
      // Using 'بدّل' (badil - toggle) which is in the keyword list
      const usage = scanner.scan('<button _="on click بدّل .active">', 'test.html');
      expect(usage.detectedLanguages.has('ar')).toBe(true);
    });

    it('detects Turkish keywords', () => {
      const usage = scanner.scan('<button _="on click değiştir .active">', 'test.html');
      expect(usage.detectedLanguages.has('tr')).toBe(true);
    });

    it('detects German keywords', () => {
      const usage = scanner.scan('<button _="on click umschalten .active">', 'test.html');
      expect(usage.detectedLanguages.has('de')).toBe(true);
    });

    it('detects French keywords', () => {
      const usage = scanner.scan('<button _="on click basculer .active">', 'test.html');
      expect(usage.detectedLanguages.has('fr')).toBe(true);
    });

    it('detects Portuguese keywords', () => {
      const usage = scanner.scan('<button _="on click alternar .active">', 'test.html');
      // Note: 'alternar' is shared between Spanish and Portuguese
      expect(usage.detectedLanguages.has('es') || usage.detectedLanguages.has('pt')).toBe(true);
    });

    it('detects Indonesian keywords', () => {
      // Using 'tampilkan' (show) which is in the keyword list
      const usage = scanner.scan('<button _="on click tampilkan #modal">', 'test.html');
      expect(usage.detectedLanguages.has('id')).toBe(true);
    });

    it('detects Swahili keywords', () => {
      const usage = scanner.scan('<button _="on click badilisha .active">', 'test.html');
      expect(usage.detectedLanguages.has('sw')).toBe(true);
    });

    it('detects multiple languages in one file', () => {
      const code = `
        <button _="on click トグル .ja">Japanese</button>
        <button _="on click alternar .es">Spanish</button>
        <button _="on click 토글 .ko">Korean</button>
      `;
      const usage = scanner.scan(code, 'test.html');
      expect(usage.detectedLanguages.has('ja')).toBe(true);
      expect(usage.detectedLanguages.has('es')).toBe(true);
      expect(usage.detectedLanguages.has('ko')).toBe(true);
    });

    it('does not detect English as a language', () => {
      const usage = scanner.scan('<button _="on click toggle .active">', 'test.html');
      expect(usage.detectedLanguages.size).toBe(0);
    });

    it('returns empty set for English-only code', () => {
      const code = `
        <button _="on click toggle .a">A</button>
        <button _="on click show #b">B</button>
        <button _="on click hide #c">C</button>
      `;
      const usage = scanner.scan(code, 'test.html');
      expect(usage.detectedLanguages.size).toBe(0);
    });
  });

  describe('htmx/fixi attribute detection', () => {
    it('detects hx-get and infers fetch block', () => {
      const usage = scanner.scan('<button hx-get="/api">Load</button>', 'test.html');
      expect(usage.htmx?.hasHtmxAttributes).toBe(true);
      expect(usage.htmx?.httpMethods.has('GET')).toBe(true);
      expect(usage.blocks.has('fetch')).toBe(true);
      expect(usage.commands.has('put')).toBe(true);
    });

    it('detects hx-post and infers fetch block', () => {
      const usage = scanner.scan('<button hx-post="/api">Submit</button>', 'test.html');
      expect(usage.htmx?.hasHtmxAttributes).toBe(true);
      expect(usage.htmx?.httpMethods.has('POST')).toBe(true);
      expect(usage.blocks.has('fetch')).toBe(true);
    });

    it('detects multiple HTTP methods', () => {
      const code = `
        <button hx-get="/api/users">Load</button>
        <button hx-post="/api/users">Create</button>
        <button hx-delete="/api/users/1">Delete</button>
      `;
      const usage = scanner.scan(code, 'test.html');
      expect(usage.htmx?.httpMethods.has('GET')).toBe(true);
      expect(usage.htmx?.httpMethods.has('POST')).toBe(true);
      expect(usage.htmx?.httpMethods.has('DELETE')).toBe(true);
    });

    it('detects fx-action as fixi', () => {
      const usage = scanner.scan('<button fx-action="/api">Load</button>', 'test.html');
      expect(usage.htmx?.hasHtmxAttributes).toBe(true);
      expect(usage.htmx?.hasFixiAttributes).toBe(true);
    });

    it('detects fx-method', () => {
      const usage = scanner.scan(
        '<button fx-action="/api" fx-method="POST">Submit</button>',
        'test.html'
      );
      expect(usage.htmx?.hasFixiAttributes).toBe(true);
      expect(usage.htmx?.httpMethods.has('POST')).toBe(true);
    });

    it('detects morph swap and adds morph command', () => {
      const usage = scanner.scan('<div hx-get="/api" hx-swap="morph">', 'test.html');
      expect(usage.htmx?.swapStrategies.has('morph')).toBe(true);
      expect(usage.commands.has('morph')).toBe(true);
    });

    it('detects delete swap and adds remove command', () => {
      const usage = scanner.scan('<button hx-delete="/item" hx-swap="delete">', 'test.html');
      expect(usage.htmx?.swapStrategies.has('delete')).toBe(true);
      expect(usage.commands.has('remove')).toBe(true);
    });

    it('detects innerHTML swap and adds put command', () => {
      const usage = scanner.scan('<div hx-get="/api" hx-swap="innerHTML">', 'test.html');
      expect(usage.htmx?.swapStrategies.has('innerHTML')).toBe(true);
      expect(usage.commands.has('put')).toBe(true);
    });

    it('takes only the head token as the swap strategy', () => {
      const usage = scanner.scan(
        '<div hx-get="/api" hx-swap="outerHTML swap:200ms settle:100ms">',
        'test.html'
      );
      expect(usage.htmx?.swapStrategies.has('outerHTML')).toBe(true);
      expect(usage.htmx?.swapStrategies.has('swap:200ms')).toBe(false);
    });

    it('does not mistake a modifier-only hx-swap for a strategy', () => {
      const usage = scanner.scan('<div hx-get="/api" hx-swap="swap:200ms">', 'test.html');
      expect(usage.htmx?.swapStrategies.has('swap:200ms')).toBe(false);
      expect(usage.htmx?.swapStrategies.size).toBe(0);
    });

    it('keeps morph:innerHTML as a strategy despite its colon', () => {
      const usage = scanner.scan('<div hx-get="/api" hx-swap="morph:innerHTML">', 'test.html');
      expect(usage.htmx?.swapStrategies.has('morph:innerHTML')).toBe(true);
      expect(usage.commands.has('morph')).toBe(true);
    });

    it('pulls in the wait command for swap/settle timings', () => {
      const usage = scanner.scan(
        '<div hx-get="/api" hx-swap="innerHTML swap:200ms settle:100ms">',
        'test.html'
      );
      expect(usage.htmx?.needsSwapTiming).toBe(true);
      expect(usage.commands.has('wait')).toBe(true);
    });

    it('does not pull in wait when there are no timings', () => {
      const usage = scanner.scan('<div hx-get="/api" hx-swap="innerHTML">', 'test.html');
      expect(usage.commands.has('wait')).toBe(false);
    });

    it('scans hx-on:click as hyperscript', () => {
      const usage = scanner.scan('<button hx-on:click="toggle .active">', 'test.html');
      expect(usage.htmx?.hasHtmxAttributes).toBe(true);
      expect(usage.htmx?.onHandlers).toContain('toggle .active');
      expect(usage.commands.has('toggle')).toBe(true);
    });

    it('scans multiple hx-on handlers', () => {
      const code = `
        <button hx-on:click="toggle .a">A</button>
        <button hx-on:mouseover="add .hover">B</button>
      `;
      const usage = scanner.scan(code, 'test.html');
      expect(usage.htmx?.onHandlers).toHaveLength(2);
      expect(usage.commands.has('toggle')).toBe(true);
      expect(usage.commands.has('add')).toBe(true);
    });

    it('detects hx-confirm and adds if block', () => {
      const usage = scanner.scan('<button hx-delete="/x" hx-confirm="Sure?">', 'test.html');
      expect(usage.htmx?.usesConfirm).toBe(true);
      expect(usage.blocks.has('if')).toBe(true);
    });

    it('detects positional in hx-target', () => {
      const usage = scanner.scan('<button hx-get="/x" hx-target="closest .card">', 'test.html');
      expect(usage.positional).toBe(true);
    });

    it('detects positional next in hx-target', () => {
      const usage = scanner.scan('<button hx-get="/x" hx-target="next .item">', 'test.html');
      expect(usage.positional).toBe(true);
    });

    it('detects trigger modifiers - delay (debounce)', () => {
      const usage = scanner.scan(
        '<input hx-get="/search" hx-trigger="keyup delay:500ms">',
        'test.html'
      );
      expect(usage.htmx?.triggerModifiers.has('debounce')).toBe(true);
    });

    it('detects trigger modifiers - throttle', () => {
      const usage = scanner.scan(
        '<div hx-get="/updates" hx-trigger="scroll throttle:1s">',
        'test.html'
      );
      expect(usage.htmx?.triggerModifiers.has('throttle')).toBe(true);
    });

    it('detects trigger modifiers - once', () => {
      const usage = scanner.scan('<button hx-get="/api" hx-trigger="click once">', 'test.html');
      expect(usage.htmx?.triggerModifiers.has('once')).toBe(true);
    });

    it('detects hx-push-url', () => {
      const usage = scanner.scan('<a hx-get="/page" hx-push-url="true">', 'test.html');
      expect(usage.htmx?.urlManagement.has('push-url')).toBe(true);
    });

    it('detects hx-replace-url', () => {
      const usage = scanner.scan('<form hx-post="/submit" hx-replace-url="true">', 'test.html');
      expect(usage.htmx?.urlManagement.has('replace-url')).toBe(true);
    });

    it('detects fx-target', () => {
      const usage = scanner.scan('<button fx-action="/api" fx-target="#result">', 'test.html');
      expect(usage.htmx?.hasHtmxAttributes).toBe(true);
      expect(usage.htmx?.hasFixiAttributes).toBe(true);
    });

    it('detects fx-swap', () => {
      const usage = scanner.scan('<button fx-action="/api" fx-swap="innerHTML">', 'test.html');
      expect(usage.htmx?.hasFixiAttributes).toBe(true);
      expect(usage.htmx?.swapStrategies.has('innerHTML')).toBe(true);
    });

    it('does not detect htmx when no attributes present', () => {
      const usage = scanner.scan('<button onclick="alert(1)">Click</button>', 'test.html');
      expect(usage.htmx).toBeUndefined();
    });

    // ──── htmx v4 reactive / streaming surface ────

    it('detects hx-live and flags needsHxLive + needsReactivity', () => {
      const usage = scanner.scan('<div hx-live="put $count into me"></div>', 'test.html');
      expect(usage.htmx?.hasHtmxAttributes).toBe(true);
      expect(usage.htmx?.needsHxLive).toBe(true);
      expect(usage.htmx?.needsReactivity).toBe(true);
      expect(usage.needsReactivity).toBe(true);
    });

    it('detects sse-connect', () => {
      const usage = scanner.scan('<div sse-connect="/stream" sse-swap="tick"></div>', 'test.html');
      expect(usage.htmx?.hasHtmxAttributes).toBe(true);
      expect(usage.htmx?.needsSSE).toBe(true);
      // SSE alone doesn't require reactivity.
      expect(usage.htmx?.needsReactivity).toBeFalsy();
      expect(usage.needsReactivity).toBeFalsy();
    });

    it('detects sse-swap on its own (server determines event names)', () => {
      const usage = scanner.scan('<div sse-swap="patch"></div>', 'test.html');
      expect(usage.htmx?.needsSSE).toBe(true);
    });

    it('detects ws-connect and ws-send', () => {
      const usage = scanner.scan(
        '<div ws-connect="wss://example/api"><form ws-send><input name="m" /></form></div>',
        'test.html'
      );
      expect(usage.htmx?.hasHtmxAttributes).toBe(true);
      expect(usage.htmx?.needsWS).toBe(true);
      // WS alone doesn't require reactivity.
      expect(usage.htmx?.needsReactivity).toBeFalsy();
    });

    it('detects bind-to-property inside _= scripts and flags reactivity', () => {
      const usage = scanner.scan(`<input _="on input bind $val to me.value" />`, 'test.html');
      expect(usage.needsBindToProperty).toBe(true);
      expect(usage.needsReactivity).toBe(true);
    });

    it('detects plain bind/live/when inside _= scripts as needsReactivity', () => {
      const liveUsage = scanner.scan(`<div _="live put $tick into me"></div>`, 'test.html');
      expect(liveUsage.needsReactivity).toBe(true);

      const whenUsage = scanner.scan(
        `<div _="when $message changes put it into me end"></div>`,
        'test.html'
      );
      expect(whenUsage.needsReactivity).toBe(true);

      const bindUsage = scanner.scan(`<input _="bind $val to me" />`, 'test.html');
      expect(bindUsage.needsReactivity).toBe(true);
    });

    it('does not flag reactivity when no v4 features are present', () => {
      const usage = scanner.scan('<button _="on click toggle .active">x</button>', 'test.html');
      expect(usage.needsReactivity).toBeFalsy();
      expect(usage.needsBindToProperty).toBeFalsy();
    });

    // ──── Phase 8: localized v4 attribute detection ────

    it('detects Spanish hx-en-vivo as needsHxLive', () => {
      const usage = scanner.scan(
        '<div lang="es" hx-en-vivo="put $count into me"></div>',
        'test.html'
      );
      expect(usage.htmx?.hasHtmxAttributes).toBe(true);
      expect(usage.htmx?.needsHxLive).toBe(true);
      expect(usage.htmx?.needsReactivity).toBe(true);
    });

    it('detects Japanese hx-ライブ as needsHxLive', () => {
      const usage = scanner.scan(
        '<div lang="ja" hx-ライブ="put $count into me"></div>',
        'test.html'
      );
      expect(usage.htmx?.needsHxLive).toBe(true);
      expect(usage.htmx?.needsReactivity).toBe(true);
    });

    it('detects German hx-direkt as needsHxLive', () => {
      const usage = scanner.scan(
        '<div lang="de" hx-direkt="put $count into me"></div>',
        'test.html'
      );
      expect(usage.htmx?.needsHxLive).toBe(true);
    });

    it('detects Spanish sse-conectar as needsSSE', () => {
      const usage = scanner.scan(
        '<div lang="es" sse-conectar="/stream" sse-intercambiar="tick"></div>',
        'test.html'
      );
      expect(usage.htmx?.hasHtmxAttributes).toBe(true);
      expect(usage.htmx?.needsSSE).toBe(true);
    });

    it('detects Japanese sse-接続 as needsSSE', () => {
      const usage = scanner.scan('<div lang="ja" sse-接続="/stream"></div>', 'test.html');
      expect(usage.htmx?.needsSSE).toBe(true);
    });

    it('detects German ws-verbinden as needsWS', () => {
      const usage = scanner.scan(
        '<div lang="de" ws-verbinden="wss://example/api"></div>',
        'test.html'
      );
      expect(usage.htmx?.hasHtmxAttributes).toBe(true);
      expect(usage.htmx?.needsWS).toBe(true);
    });

    it('detects Korean ws-연결 as needsWS', () => {
      const usage = scanner.scan('<div lang="ko" ws-연결="wss://example/api"></div>', 'test.html');
      expect(usage.htmx?.needsWS).toBe(true);
    });

    it('does NOT flag needsHxLive on a localized non-live hx-* (e.g. hx-obtener)', () => {
      // Spanish hx-obtener is hx-get — must NOT trigger reactive routing.
      const usage = scanner.scan(
        '<button lang="es" hx-obtener="/api/users">x</button>',
        'test.html'
      );
      expect(usage.htmx?.hasHtmxAttributes).toBe(true);
      expect(usage.htmx?.needsHxLive).toBeFalsy();
      expect(usage.htmx?.needsReactivity).toBeFalsy();
    });

    it('handles complex htmx example', () => {
      const code = `
        <div hx-get="/api/users"
             hx-trigger="load, click from:#reload delay:300ms"
             hx-target="#users-list"
             hx-swap="morph"
             hx-push-url="true"
             hx-confirm="Load users?">
        </div>
      `;
      const usage = scanner.scan(code, 'test.html');
      expect(usage.htmx?.hasHtmxAttributes).toBe(true);
      expect(usage.htmx?.httpMethods.has('GET')).toBe(true);
      expect(usage.htmx?.swapStrategies.has('morph')).toBe(true);
      expect(usage.htmx?.triggerModifiers.has('debounce')).toBe(true);
      expect(usage.htmx?.urlManagement.has('push-url')).toBe(true);
      expect(usage.htmx?.usesConfirm).toBe(true);
      expect(usage.blocks.has('fetch')).toBe(true);
      expect(usage.blocks.has('if')).toBe(true);
      expect(usage.commands.has('morph')).toBe(true);
    });
  });
});

describe('Scanner command list derived from core (2026-07-20 audit regressions)', () => {
  const scanner = new Scanner({});

  it('detects empty (was missing from the old hardcoded regex)', () => {
    const usage = scanner.scan('<button _="on click empty #list">', 'test.html');
    expect(usage.commands.has('empty')).toBe(true);
  });

  it('detects full-runtime-only commands so tier routing sees them', () => {
    const usage = scanner.scan('<button _="on click tell <p/> in me add .x">', 'test.html');
    expect(usage.commands.has('tell')).toBe(true);

    const usage2 = scanner.scan('<button _="on click pick items 1 to 3 from :list">', 'test.html');
    expect(usage2.commands.has('pick')).toBe(true);
  });

  it('does NOT surface unless as a command (block detection owns it)', () => {
    const usage = scanner.scan('<button _="on click unless me has .off add .on">', 'test.html');
    expect(usage.commands.has('unless')).toBe(false);
    expect(usage.blocks.has('if')).toBe(true);
  });

  it('does NOT surface bind as a command (reactivity detection owns it)', () => {
    const usage = scanner.scan('<input _="on input bind $val to me.value">', 'test.html');
    expect(usage.commands.has('bind')).toBe(false);
    expect(usage.needsReactivity).toBe(true);
  });
});
