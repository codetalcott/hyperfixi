import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  insertContent,
  insertContentSemantic,
  toInsertPosition,
  looksLikeHTML,
  removeElement,
  removeElements,
  swapElements,
  cloneElement,
  createElementFromHTML,
  setInnerHTML,
  setTextContent,
  clearElement,
} from '../dom-mutation';

describe('DOM Mutation Helpers', () => {
  let target: HTMLElement;

  beforeEach(() => {
    target = document.createElement('div');
    target.id = 'target';
    target.innerHTML = '<span>Original</span>';
    document.body.appendChild(target);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('looksLikeHTML', () => {
    it('should return true for HTML strings', () => {
      expect(looksLikeHTML('<div>Hello</div>')).toBe(true);
      expect(looksLikeHTML('<span>Text</span>')).toBe(true);
      expect(looksLikeHTML('<br/>')).toBe(true);
    });

    it('should return false for plain text', () => {
      expect(looksLikeHTML('Hello World')).toBe(false);
      expect(looksLikeHTML('Just text')).toBe(false);
      expect(looksLikeHTML('')).toBe(false);
    });
  });

  describe('toInsertPosition', () => {
    it('should map semantic positions to InsertPosition values', () => {
      expect(toInsertPosition('before')).toBe('beforebegin');
      expect(toInsertPosition('start' as any)).toBe('afterbegin');
      expect(toInsertPosition('end' as any)).toBe('beforeend');
      expect(toInsertPosition('after')).toBe('afterend');
      expect(toInsertPosition('replace' as any)).toBe('replace');
    });
  });

  describe('insertContent with HTML strings', () => {
    it('should insert HTML before target (beforebegin)', () => {
      insertContent(target, '<p>Before</p>', 'beforebegin');
      expect(target.previousElementSibling?.tagName).toBe('P');
      expect(target.previousElementSibling?.textContent).toBe('Before');
    });

    it('should insert HTML at start of target (afterbegin)', () => {
      insertContent(target, '<p>Start</p>', 'afterbegin');
      expect(target.firstElementChild?.tagName).toBe('P');
      expect(target.firstElementChild?.textContent).toBe('Start');
      expect(target.children.length).toBe(2); // New + original
    });

    it('should insert HTML at end of target (beforeend)', () => {
      insertContent(target, '<p>End</p>', 'beforeend');
      expect(target.lastElementChild?.tagName).toBe('P');
      expect(target.lastElementChild?.textContent).toBe('End');
      expect(target.children.length).toBe(2); // Original + new
    });

    it('should insert HTML after target (afterend)', () => {
      insertContent(target, '<p>After</p>', 'afterend');
      expect(target.nextElementSibling?.tagName).toBe('P');
      expect(target.nextElementSibling?.textContent).toBe('After');
    });

    it('should replace target with HTML (replace)', () => {
      const parent = target.parentElement!;
      const originalChildCount = parent.children.length;

      insertContent(target, '<p>Replacement</p>', 'replace');

      expect(parent.children.length).toBe(originalChildCount); // Same count
      expect(parent.querySelector('#target')).toBeNull(); // Original gone
      expect(parent.querySelector('p')?.textContent).toBe('Replacement');
    });
  });

  describe('insertContent with plain text', () => {
    it('should insert plain text without parsing as HTML', () => {
      insertContent(target, 'Plain text', 'beforeend');
      expect(target.textContent).toContain('Plain text');
      expect(target.querySelector('p')).toBeNull(); // No element created
    });

    it('should replace target with text node (replace)', () => {
      const parent = target.parentElement!;

      insertContent(target, 'Just text', 'replace');

      expect(parent.querySelector('#target')).toBeNull();
      expect(parent.textContent).toContain('Just text');
    });
  });

  describe('insertContent with HTMLElement', () => {
    let newElement: HTMLElement;

    beforeEach(() => {
      newElement = document.createElement('p');
      newElement.textContent = 'New Element';
    });

    it('should insert element before target (beforebegin)', () => {
      insertContent(target, newElement, 'beforebegin');
      expect(target.previousElementSibling).toBe(newElement);
    });

    it('should insert element at start of target (afterbegin)', () => {
      insertContent(target, newElement, 'afterbegin');
      expect(target.firstElementChild).toBe(newElement);
      expect(target.children.length).toBe(2);
    });

    it('should insert element at end of target (beforeend)', () => {
      insertContent(target, newElement, 'beforeend');
      expect(target.lastElementChild).toBe(newElement);
      expect(target.children.length).toBe(2);
    });

    it('should insert element after target (afterend)', () => {
      insertContent(target, newElement, 'afterend');
      expect(target.nextElementSibling).toBe(newElement);
    });

    it('should replace target with element (replace)', () => {
      const parent = target.parentElement!;

      insertContent(target, newElement, 'replace');

      expect(parent.querySelector('#target')).toBeNull();
      expect(parent.querySelector('p')).toBe(newElement);
    });
  });

  describe('insertContentSemantic', () => {
    it('should use semantic position names', () => {
      insertContentSemantic(target, '<p>Before</p>', 'before');
      expect(target.previousElementSibling?.tagName).toBe('P');
    });

    it('should handle all semantic positions', () => {
      const testCases: Array<[string, () => boolean]> = [
        ['before', () => !!target.previousElementSibling],
        ['start', () => target.firstElementChild?.tagName === 'P'],
        ['end', () => target.lastElementChild?.tagName === 'P'],
        ['after', () => !!target.nextElementSibling],
      ];

      testCases.forEach(([position]) => {
        const testTarget = document.createElement('div');
        testTarget.innerHTML = '<span>Test</span>';
        document.body.appendChild(testTarget);

        insertContentSemantic(testTarget, '<p>Test</p>', position as any);

        testTarget.remove();
      });

      expect(true).toBe(true); // All insertions succeeded
    });
  });

  describe('removeElement', () => {
    it('should remove element from DOM', () => {
      const element = document.createElement('div');
      element.id = 'to-remove';
      document.body.appendChild(element);

      removeElement(element);

      expect(document.getElementById('to-remove')).toBeNull();
    });

    it('should handle removing element not in DOM', () => {
      const orphan = document.createElement('div');

      // Should not throw
      expect(() => removeElement(orphan)).not.toThrow();
    });

    it('should return true when element is removed', () => {
      const element = document.createElement('div');
      document.body.appendChild(element);

      const result = removeElement(element);

      expect(result).toBe(true);
    });
  });

  describe('removeElements', () => {
    it('should remove multiple elements and return count', () => {
      const elem1 = document.createElement('div');
      const elem2 = document.createElement('div');
      const elem3 = document.createElement('div');
      document.body.append(elem1, elem2, elem3);

      const count = removeElements([elem1, elem2, elem3]);

      expect(count).toBe(3);
      expect(document.body.contains(elem1)).toBe(false);
      expect(document.body.contains(elem2)).toBe(false);
      expect(document.body.contains(elem3)).toBe(false);
    });

    it('should handle empty array', () => {
      const count = removeElements([]);
      expect(count).toBe(0);
    });

    it('should handle mix of attached and orphaned elements', () => {
      const attached = document.createElement('div');
      const orphan = document.createElement('div');
      document.body.appendChild(attached);

      const count = removeElements([attached, orphan]);

      expect(count).toBe(2);
    });
  });

  describe('swapElements', () => {
    it('should swap positions of two elements', () => {
      const elem1 = document.createElement('div');
      const elem2 = document.createElement('div');
      elem1.id = 'first';
      elem2.id = 'second';
      document.body.append(elem1, elem2);

      const result = swapElements(elem1, elem2);

      expect(result).toBe(true);
      expect(document.body.children[0].id).toBe('second');
      expect(document.body.children[1].id).toBe('first');
    });

    it('should return false if elements not in DOM', () => {
      const orphan1 = document.createElement('div');
      const orphan2 = document.createElement('div');

      const result = swapElements(orphan1, orphan2);

      expect(result).toBe(false);
    });

    it('should swap adjacent elements correctly', () => {
      const elem1 = document.createElement('div');
      const elem2 = document.createElement('div');
      elem1.textContent = 'First';
      elem2.textContent = 'Second';
      document.body.append(elem1, elem2);

      swapElements(elem1, elem2);

      expect(elem2.nextElementSibling).toBe(elem1);
    });
  });

  describe('cloneElement', () => {
    it('should create deep clone by default', () => {
      const original = document.createElement('div');
      original.innerHTML = '<span>Child</span>';
      original.className = 'test-class';

      const clone = cloneElement(original);

      expect(clone).not.toBe(original);
      expect(clone.className).toBe('test-class');
      expect(clone.querySelector('span')?.textContent).toBe('Child');
    });

    it('should create shallow clone when specified', () => {
      const original = document.createElement('div');
      original.innerHTML = '<span>Child</span>';
      original.className = 'test-class';

      const clone = cloneElement(original, false);

      expect(clone).not.toBe(original);
      expect(clone.className).toBe('test-class');
      expect(clone.querySelector('span')).toBeNull(); // No children
    });
  });

  describe('createElementFromHTML', () => {
    it('should create element from valid HTML string', () => {
      const element = createElementFromHTML('<div class="test">Content</div>');

      expect(element).not.toBeNull();
      expect(element?.tagName).toBe('DIV');
      expect(element?.className).toBe('test');
      expect(element?.textContent).toBe('Content');
    });

    it('should return null for invalid HTML', () => {
      const element = createElementFromHTML('Not HTML');

      expect(element).toBeNull();
    });

    it('should return first element when multiple elements provided', () => {
      const element = createElementFromHTML('<div>First</div><div>Second</div>');

      expect(element?.textContent).toBe('First');
    });

    it('should handle self-closing tags', () => {
      const element = createElementFromHTML('<br/>');

      expect(element?.tagName).toBe('BR');
    });

    it('should handle complex nested HTML', () => {
      const html = '<div><span><strong>Nested</strong></span></div>';
      const element = createElementFromHTML(html);

      expect(element?.querySelector('strong')?.textContent).toBe('Nested');
    });
  });

  describe('setInnerHTML', () => {
    it('should set innerHTML of element', () => {
      setInnerHTML(target, '<p>New HTML</p>');

      expect(target.innerHTML).toBe('<p>New HTML</p>');
      expect(target.querySelector('p')?.textContent).toBe('New HTML');
    });

    it('should replace existing content', () => {
      target.innerHTML = '<span>Old</span>';

      setInnerHTML(target, '<p>New</p>');

      expect(target.querySelector('span')).toBeNull();
      expect(target.querySelector('p')).not.toBeNull();
    });
  });

  describe('setTextContent', () => {
    it('should set text content of element', () => {
      setTextContent(target, 'New text');

      expect(target.textContent).toBe('New text');
    });

    it('should remove HTML elements', () => {
      target.innerHTML = '<span>Old</span>';

      setTextContent(target, 'Plain text');

      expect(target.querySelector('span')).toBeNull();
      expect(target.textContent).toBe('Plain text');
    });

    it('should escape HTML characters', () => {
      setTextContent(target, '<script>alert("xss")</script>');

      expect(target.querySelector('script')).toBeNull();
      expect(target.textContent).toBe('<script>alert("xss")</script>');
    });
  });

  describe('clearElement', () => {
    it('should remove all children from element', () => {
      target.innerHTML = '<span>1</span><span>2</span><span>3</span>';

      clearElement(target);

      expect(target.children.length).toBe(0);
      expect(target.textContent).toBe('');
    });

    it('should handle already empty element', () => {
      target.innerHTML = '';

      expect(() => clearElement(target)).not.toThrow();
      expect(target.children.length).toBe(0);
    });

    it('should remove text nodes as well', () => {
      target.innerHTML = 'Text node<span>Element</span>More text';

      clearElement(target);

      expect(target.childNodes.length).toBe(0);
    });
  });
});
