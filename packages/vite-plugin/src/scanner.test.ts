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
      const usage = scanner.scan('<button _="on click if me has .active then remove .active">', 'test.html');
      expect(usage.blocks.has('if')).toBe(true);
    });

    it('detects unless block (uses if block)', () => {
      const usage = scanner.scan('<button _="on click unless me has .disabled add .active">', 'test.html');
      expect(usage.blocks.has('if')).toBe(true);
    });

    it('detects repeat block with literal number', () => {
      const usage = scanner.scan('<button _="on click repeat 3 times add .pulse">', 'test.html');
      expect(usage.blocks.has('repeat')).toBe(true);
    });

    it('detects repeat block with local variable', () => {
      const usage = scanner.scan('<button _="on click repeat :count times add .pulse">', 'test.html');
      expect(usage.blocks.has('repeat')).toBe(true);
    });

    it('detects repeat block with global variable', () => {
      const usage = scanner.scan('<button _="on click repeat $count times add .pulse">', 'test.html');
      expect(usage.blocks.has('repeat')).toBe(true);
    });

    it('detects repeat block with identifier', () => {
      const usage = scanner.scan('<button _="on click repeat count times add .pulse">', 'test.html');
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
      const usage = scanner.scan('<button _="on click add .active to next <button/>">', 'test.html');
      expect(usage.positional).toBe(true);
    });

    it('detects previous', () => {
      const usage = scanner.scan('<button _="on click add .active to previous <button/>">', 'test.html');
      expect(usage.positional).toBe(true);
    });

    it('detects closest', () => {
      const usage = scanner.scan('<button _="on click toggle .open on closest .card">', 'test.html');
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
      const usage2 = scanner.scan('<button _="on click put \'unfirst\' into #output">', 'test.html');
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
});
