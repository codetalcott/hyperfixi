/**
 * ToggleCommand - Standalone V2 Implementation
 *
 * Toggles CSS classes, attributes, or interactive elements (dialog, details, select)
 *
 * This is a standalone implementation with NO V1 dependencies,
 * enabling true tree-shaking by inlining essential utilities.
 *
 * Features:
 * - CSS class toggling (add if absent, remove if present)
 * - Attribute toggling (@disabled, [@disabled="true"])
 * - CSS property toggling (*display, *visibility, *opacity)
 * - Smart element detection (dialog, details, select, summary)
 * - Dialog modal/non-modal modes (show/showModal)
 * - Temporal modifiers (for <duration>, until <event>)
 *
 * Syntax:
 *   toggle .active                           # Toggle class on me
 *   toggle .active on <target>               # Toggle class on target
 *   toggle @disabled                         # Toggle attribute
 *   toggle [@disabled="true"]                # Toggle attribute with value
 *   toggle #dialog                           # Toggle dialog (non-modal)
 *   toggle #dialog as modal                  # Toggle dialog (modal)
 *   toggle #details                          # Toggle details element
 *   toggle .active for 2s                    # Temporal: toggle for duration
 *   toggle .active until click               # Temporal: toggle until event
 *
 * @example
 *   toggle .active on me
 *   toggle @disabled
 *   toggle #myDialog as modal
 *   toggle .loading for 3s
 */

import type { ExecutionContext, TypedExecutionContext } from '../../types/core';
import type { ASTNode, ExpressionNode } from '../../types/base-types';
import type { ExpressionEvaluator } from '../../core/expression-evaluator';
import { isHTMLElement } from '../../utils/element-check';

/**
 * Typed input for ToggleCommand
 * Represents parsed arguments ready for execution
 */
export type ToggleCommandInput =
  | {
      type: 'classes';
      classes: string[];
      targets: HTMLElement[];
      duration?: number;
      untilEvent?: string;
    }
  | {
      type: 'attribute';
      name: string;
      value?: string;
      targets: HTMLElement[];
      duration?: number;
      untilEvent?: string;
    }
  | {
      type: 'css-property';
      property: 'display' | 'visibility' | 'opacity';
      targets: HTMLElement[];
    }
  | {
      type: 'dialog';
      mode: 'modal' | 'non-modal';
      targets: HTMLDialogElement[];
    }
  | {
      type: 'details';
      targets: HTMLDetailsElement[];
    }
  | {
      type: 'select';
      targets: HTMLSelectElement[];
    };

/**
 * ToggleCommand - Standalone V2 Implementation
 *
 * Self-contained implementation with no V1 dependencies.
 * Achieves tree-shaking by inlining all required utilities.
 *
 * V1 Size: 1,111 lines (with full validation, events, temporal modifiers)
 * V2 Size: ~600 lines (46% reduction, all features preserved)
 */
export class ToggleCommand {
  /**
   * Command name as registered in runtime
   */
  readonly name = 'toggle';

  /**
   * Command metadata for documentation and tooling
   */
  static readonly metadata = {
    description: 'Toggle classes, attributes, or interactive elements',
    syntax: [
      'toggle <class-expression> [on <target>]',
      'toggle @attribute [on <target>]',
      'toggle <element-selector> [as modal]',
      'toggle <expression> for <duration>',
      'toggle <expression> until <event>',
    ],
    examples: [
      'toggle .active on me',
      'toggle @disabled',
      'toggle [@disabled="true"]',
      'toggle "loading spinner"',
      'toggle #myDialog',
      'toggle #confirmDialog as modal',
      'toggle #faqSection',
      'toggle .loading for 2s',
      'toggle .active until click',
    ],
    category: 'dom',
    sideEffects: ['dom-mutation'],
  };

  /**
   * Parse raw AST nodes into typed command input
   *
   * Detects toggle type (classes, attributes, CSS properties, or smart elements)
   * and parses accordingly.
   *
   * Handles complex patterns:
   * - "toggle .class" (implicit target: me)
   * - "toggle .class on #target"
   * - "toggle #dialog" (smart element detection)
   * - "toggle #dialog as modal" (element with mode)
   * - "toggle .class for 2s" (temporal modifier)
   * - "toggle .class until click" (temporal modifier)
   *
   * @param raw - Raw command node with args and modifiers from AST
   * @param evaluator - Expression evaluator for evaluating AST nodes
   * @param context - Execution context with me, you, it, etc.
   * @returns Typed input object for execute()
   */
  async parseInput(
    raw: { args: ASTNode[]; modifiers: Record<string, ExpressionNode> },
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<ToggleCommandInput> {
    if (!raw.args || raw.args.length === 0) {
      throw new Error('toggle command requires an argument');
    }

    // Extract temporal modifiers from raw.modifiers
    let duration: number | undefined;
    let untilEvent: string | undefined;

    if (raw.modifiers?.for) {
      const durationValue = await evaluator.evaluate(raw.modifiers.for, context);
      if (typeof durationValue === 'number') {
        duration = durationValue;
      } else if (typeof durationValue === 'string') {
        // Parse duration strings like "2s", "500ms"
        duration = this.parseDuration(durationValue);
      }
    }

    if (raw.modifiers?.until) {
      const eventValue = await evaluator.evaluate(raw.modifiers.until, context);
      if (typeof eventValue === 'string') {
        untilEvent = eventValue;
      }
    }

    // Evaluate first argument to determine toggle type
    const firstArg = raw.args[0];

    // CRITICAL: Check for CLASS selector nodes before evaluating
    // Class selector nodes should extract their value directly to avoid DOM queries
    // that return empty NodeList (no elements match the class at parse time)
    //
    // ID selectors (#id) should be EVALUATED to get the actual DOM element
    // because they reference specific elements that exist in the DOM
    //
    // Parser creates TWO different node types:
    // - { type: 'selector', value: '.active' } - uses 'value' property
    // - { type: 'cssSelector', selectorType: 'class', selector: '.active' } - uses 'selector' property
    let firstValue: unknown;
    const argValue = (firstArg as any)?.value || (firstArg as any)?.selector;
    const isClassSelector = typeof argValue === 'string' && argValue.startsWith('.');
    if (
      ((firstArg as any)?.type === 'selector' ||
       (firstArg as any)?.type === 'cssSelector' ||
       (firstArg as any)?.type === 'classSelector') &&
      typeof argValue === 'string' &&
      isClassSelector  // Only extract CLASS selectors directly, not ID selectors
    ) {
      // Extract value directly from class selector node
      firstValue = argValue;
    } else {
      // Evaluate normally for ID selectors and other node types
      // This allows #myDialog to resolve to the actual DOM element
      firstValue = await evaluator.evaluate(firstArg, context);
    }

    // Pattern detection:
    // 1. Check if first value is an HTMLElement (smart element toggle)
    // 2. Check if it's a string starting with special characters (@, *, ., #)
    // 3. Check if firstArg is a bare identifier for smart element tag name (details, dialog, etc.)
    // 4. Determine targets (either from explicit target arg or context.me)

    let expressionType: 'class' | 'attribute' | 'css-property' | 'element' | 'unknown' = 'unknown';
    let expression = '';

    // Check if firstArg is a bare identifier for smart element tag names
    // e.g., "toggle details" where 'details' is an identifier node
    const firstArgName = (firstArg as any)?.name;
    const isBareSmartElementTag =
      (firstArg as any)?.type === 'identifier' &&
      typeof firstArgName === 'string' &&
      this.isSmartElementSelector(firstArgName);

    if (isHTMLElement(firstValue) || Array.isArray(firstValue) && firstValue.every(el => isHTMLElement(el))) {
      expressionType = 'element';
    } else if (isBareSmartElementTag) {
      // Bare tag name like "details", "dialog" - use as tag selector
      expressionType = 'element';
      expression = firstArgName;  // Use the tag name for DOM query
    } else if (typeof firstValue === 'string') {
      expression = firstValue.trim();

      if (expression.startsWith('@') || expression.startsWith('[@')) {
        expressionType = 'attribute';
      } else if (expression.startsWith('*')) {
        expressionType = 'css-property';
      } else if (expression.startsWith('.')) {
        expressionType = 'class';
      } else if (expression.startsWith('#') || this.isSmartElementSelector(expression)) {
        expressionType = 'element';
      } else {
        // Default to class if no special prefix
        expressionType = 'class';
      }
    }

    // Parse based on detected type
    switch (expressionType) {
      case 'attribute': {
        const { name, value } = this.parseAttribute(expression);
        const targetArgs = raw.args.slice(1);
        const targets = await this.resolveTargets(targetArgs, evaluator, context);
        return { type: 'attribute', name, value, targets, duration, untilEvent };
      }

      case 'css-property': {
        const property = this.parseCSSProperty(expression);
        if (!property) {
          throw new Error(`Invalid CSS property: ${expression}`);
        }
        const targetArgs = raw.args.slice(1);
        const targets = await this.resolveTargets(targetArgs, evaluator, context);
        return { type: 'css-property', property, targets };
      }

      case 'element': {
        // Smart element toggle: detect element type and handle accordingly
        let elements: HTMLElement[];

        if (isHTMLElement(firstValue)) {
          elements = [firstValue as HTMLElement];
        } else if (Array.isArray(firstValue) && firstValue.every(el => isHTMLElement(el))) {
          elements = firstValue as HTMLElement[];
        } else if (isBareSmartElementTag && expression) {
          // Bare tag name like "details" - query directly by tag name
          const selected = document.querySelectorAll(expression);
          elements = Array.from(selected).filter(
            (el): el is HTMLElement => isHTMLElement(el)
          );
        } else {
          // Resolve from selector
          elements = await this.resolveTargets([firstArg], evaluator, context);
        }

        // Check for mode specifier (e.g., "as modal" or "modal")
        // Can come from:
        // 1. raw.modifiers.as (parsed as "as modal" modifier)
        // 2. raw.args[1] being "modal" directly
        // 3. raw.args[1] being "as" and raw.args[2] being "modal"
        let mode: 'modal' | 'non-modal' = 'non-modal';

        // Check modifiers.as first (e.g., toggle #dialog as modal)
        if (raw.modifiers?.as) {
          const asValue = await evaluator.evaluate(raw.modifiers.as, context);
          if (typeof asValue === 'string' && asValue.toLowerCase() === 'modal') {
            mode = 'modal';
          }
        }

        // Check args for modal specifier
        if (mode === 'non-modal' && raw.args.length >= 2) {
          const secondArg = await evaluator.evaluate(raw.args[1], context);
          if (typeof secondArg === 'string') {
            const normalized = secondArg.toLowerCase();
            if (normalized === 'modal' || normalized === 'as modal') {
              mode = 'modal';
            } else if (normalized === 'as' && raw.args.length >= 3) {
              // Handle case where "as" and "modal" are separate args
              const thirdArg = await evaluator.evaluate(raw.args[2], context);
              if (typeof thirdArg === 'string' && thirdArg.toLowerCase() === 'modal') {
                mode = 'modal';
              }
            }
          }
        }

        // Detect element type
        const smartType = this.detectSmartElementType(elements);

        if (smartType === 'dialog') {
          return { type: 'dialog', mode, targets: elements as HTMLDialogElement[] };
        } else if (smartType === 'details') {
          // Handle SUMMARY elements - need to get parent DETAILS
          let detailsElements: HTMLDetailsElement[];
          if (elements.length > 0 && elements[0].tagName === 'SUMMARY') {
            // Summary elements: find parent details
            detailsElements = elements
              .map(el => el.closest('details'))
              .filter((parent): parent is HTMLDetailsElement => parent !== null);
          } else {
            detailsElements = elements as HTMLDetailsElement[];
          }
          return { type: 'details', targets: detailsElements };
        } else if (smartType === 'select') {
          return { type: 'select', targets: elements as HTMLSelectElement[] };
        } else {
          // Fallback to class toggle for non-smart elements
          const classes = this.parseClasses(expression);
          return { type: 'classes', classes, targets: elements, duration, untilEvent };
        }
      }

      case 'class':
      default: {
        // Class toggle
        const classes = this.parseClasses(expression || firstValue);
        if (classes.length === 0) {
          throw new Error('toggle command: no valid class names found');
        }
        const targetArgs = raw.args.slice(1);
        const targets = await this.resolveTargets(targetArgs, evaluator, context);
        return { type: 'classes', classes, targets, duration, untilEvent };
      }
    }
  }

  /**
   * Execute the toggle command
   *
   * Toggles classes, attributes, CSS properties, or smart elements.
   * Handles temporal modifiers for automatic reversion.
   *
   * @param input - Typed command input from parseInput()
   * @param context - Typed execution context
   * @returns Array of modified elements
   */
  async execute(
    input: ToggleCommandInput,
    context: TypedExecutionContext
  ): Promise<HTMLElement[]> {
    const modifiedElements: HTMLElement[] = [];

    switch (input.type) {
      case 'classes':
        for (const element of input.targets) {
          for (const className of input.classes) {
            element.classList.toggle(className);
          }
          modifiedElements.push(element);

          // Setup temporal modifier if specified
          if (input.duration && input.classes.length > 0) {
            this.setupTemporalModifier(element, 'class', input.classes[0], input.duration);
          }
          if (input.untilEvent && input.classes.length > 0) {
            this.setupEventModifier(element, 'class', input.classes[0], input.untilEvent);
          }
        }
        break;

      case 'attribute':
        for (const element of input.targets) {
          this.toggleAttribute(element, input.name, input.value);
          modifiedElements.push(element);

          // Setup temporal modifier if specified
          if (input.duration) {
            this.setupTemporalModifier(element, 'attribute', input.name, input.duration);
          }
          if (input.untilEvent) {
            this.setupEventModifier(element, 'attribute', input.name, input.untilEvent);
          }
        }
        break;

      case 'css-property':
        for (const element of input.targets) {
          this.toggleCSSProperty(element, input.property);
          modifiedElements.push(element);
        }
        break;

      case 'dialog':
        for (const dialog of input.targets) {
          this.toggleDialog(dialog, input.mode);
          modifiedElements.push(dialog);
        }
        break;

      case 'details':
        for (const details of input.targets) {
          this.toggleDetails(details);
          modifiedElements.push(details);
        }
        break;

      case 'select':
        for (const select of input.targets) {
          this.toggleSelect(select);
          modifiedElements.push(select);
        }
        break;
    }

    return modifiedElements;
  }

  // ========== Private Utility Methods ==========

  /**
   * Resolve target elements from AST args
   *
   * Inline version of dom-utils.resolveTargets
   * Handles: context.me default, HTMLElement, NodeList, CSS selectors
   *
   * @param args - Raw AST arguments
   * @param evaluator - Expression evaluator
   * @param context - Execution context
   * @returns Array of resolved HTMLElements
   */
  private async resolveTargets(
    args: ASTNode[],
    evaluator: ExpressionEvaluator,
    context: ExecutionContext
  ): Promise<HTMLElement[]> {
    // Filter out keyword identifiers (on, from, to, etc.) that are prepositions in syntax
    // For "toggle .active on #box", args would be ['.active', 'on', '#box']
    // We need to skip the 'on' identifier
    const KEYWORD_PREPOSITIONS = ['on', 'from', 'to', 'in', 'with', 'at'];
    const filteredArgs = args.filter(arg => {
      const argAny = arg as any;
      if (argAny?.type === 'identifier' && typeof argAny.name === 'string') {
        return !KEYWORD_PREPOSITIONS.includes(argAny.name.toLowerCase());
      }
      return true;
    });

    // Default to context.me if no target args
    if (!filteredArgs || filteredArgs.length === 0) {
      if (!context.me) {
        throw new Error('toggle command: no target specified and context.me is null');
      }
      if (!isHTMLElement(context.me)) {
        throw new Error('toggle command: context.me must be an HTMLElement');
      }
      return [context.me as HTMLElement];
    }

    const targets: HTMLElement[] = [];

    for (const arg of filteredArgs) {
      const evaluated = await evaluator.evaluate(arg, context);

      // Skip empty strings - treat as "no target specified"
      if (evaluated === '' || (typeof evaluated === 'string' && evaluated.trim() === '')) {
        continue;
      }

      if (isHTMLElement(evaluated)) {
        targets.push(evaluated as HTMLElement);
      } else if (evaluated instanceof NodeList) {
        const elements = Array.from(evaluated).filter(
          (el): el is HTMLElement => isHTMLElement(el)
        );
        targets.push(...elements);
      } else if (Array.isArray(evaluated)) {
        const elements = evaluated.filter(
          (el): el is HTMLElement => isHTMLElement(el)
        );
        targets.push(...elements);
      } else if (typeof evaluated === 'string') {
        try {
          const selected = document.querySelectorAll(evaluated);
          const elements = Array.from(selected).filter(
            (el): el is HTMLElement => isHTMLElement(el)
          );
          targets.push(...elements);
        } catch (error) {
          throw new Error(
            `Invalid CSS selector: "${evaluated}" - ${error instanceof Error ? error.message : String(error)}`
          );
        }
      } else {
        throw new Error(
          `Invalid toggle target: expected HTMLElement or CSS selector, got ${typeof evaluated}`
        );
      }
    }

    // If no valid targets found after filtering, default to context.me
    if (targets.length === 0) {
      if (!context.me) {
        throw new Error('toggle command: no target specified and context.me is null');
      }
      if (!isHTMLElement(context.me)) {
        throw new Error('toggle command: context.me must be an HTMLElement');
      }
      return [context.me as HTMLElement];
    }

    return targets;
  }

  /**
   * Parse class names from various input formats
   *
   * Handles:
   * - Single class: ".active" or "active"
   * - Multiple classes: "active selected" or ".active .selected"
   * - Array of classes: [".active", "selected"]
   *
   * @param classValue - Class value from AST
   * @returns Array of clean class names (no leading dots)
   */
  private parseClasses(classValue: unknown): string[] {
    if (!classValue) {
      return [];
    }

    if (typeof classValue === 'string') {
      return classValue
        .trim()
        .split(/[\s,]+/)
        .map(cls => {
          const trimmed = cls.trim();
          return trimmed.startsWith('.') ? trimmed.substring(1) : trimmed;
        })
        .filter(cls => cls.length > 0 && this.isValidClassName(cls));
    }

    if (Array.isArray(classValue)) {
      return classValue
        .map(cls => {
          const str = String(cls).trim();
          return str.startsWith('.') ? str.substring(1) : str;
        })
        .filter(cls => cls.length > 0 && this.isValidClassName(cls));
    }

    const str = String(classValue).trim();
    const cleanStr = str.startsWith('.') ? str.substring(1) : str;
    return cleanStr.length > 0 && this.isValidClassName(cleanStr) ? [cleanStr] : [];
  }

  /**
   * Validate CSS class name
   *
   * @param className - Class name to validate
   * @returns true if valid CSS class name
   */
  private isValidClassName(className: string): boolean {
    if (!className || className.trim().length === 0) {
      return false;
    }

    const cssClassNameRegex = /^[a-zA-Z_-][a-zA-Z0-9_-]*$/;
    return cssClassNameRegex.test(className.trim());
  }

  /**
   * Parse attribute name and value from expression
   *
   * Supports:
   * - [@attr="value"] → { name: "attr", value: "value" }
   * - [@attr] → { name: "attr", value: undefined }
   * - @attr → { name: "attr", value: undefined }
   *
   * @param expression - Attribute expression to parse
   * @returns Object with name and optional value
   */
  private parseAttribute(expression: string): { name: string; value?: string } {
    const trimmed = expression.trim();

    // Handle bracket syntax: [@attr="value"]
    if (trimmed.startsWith('[@') && trimmed.endsWith(']')) {
      const inner = trimmed.slice(2, -1);
      const equalIndex = inner.indexOf('=');

      if (equalIndex === -1) {
        return { name: inner.trim() };
      }

      const name = inner.slice(0, equalIndex).trim();
      let value = inner.slice(equalIndex + 1).trim();

      // Remove quotes
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      return { name, value };
    }

    // Handle direct syntax: @attr
    if (trimmed.startsWith('@')) {
      return { name: trimmed.substring(1).trim() };
    }

    throw new Error(`Invalid attribute syntax: ${expression}`);
  }

  /**
   * Toggle attribute on element
   *
   * If value is specified, toggles between that value and removal.
   * If no value, toggles between empty string and removal (boolean attribute).
   *
   * @param element - Element to modify
   * @param name - Attribute name
   * @param value - Optional attribute value
   */
  private toggleAttribute(element: HTMLElement, name: string, value?: string): void {
    const hasAttribute = element.hasAttribute(name);

    if (value !== undefined) {
      // Toggle with specific value
      if (hasAttribute && element.getAttribute(name) === value) {
        element.removeAttribute(name);
      } else {
        element.setAttribute(name, value);
      }
    } else {
      // Boolean attribute toggle
      if (hasAttribute) {
        element.removeAttribute(name);
      } else {
        element.setAttribute(name, '');
      }
    }
  }

  /**
   * Parse CSS property from expression
   *
   * Supports: *display, *visibility, *opacity
   *
   * @param expression - CSS property expression (e.g., "*display")
   * @returns Property name or null if invalid
   */
  private parseCSSProperty(expression: string): 'display' | 'visibility' | 'opacity' | null {
    const trimmed = expression.trim();

    if (!trimmed.startsWith('*')) {
      return null;
    }

    const property = trimmed.substring(1).trim();
    const supportedProperties = ['display', 'visibility', 'opacity'];

    if (supportedProperties.includes(property)) {
      return property as 'display' | 'visibility' | 'opacity';
    }

    return null;
  }

  /**
   * Toggle CSS property on element
   *
   * - display: toggles between 'none' and previous value (or 'block')
   * - visibility: toggles between 'hidden' and 'visible'
   * - opacity: toggles between '0' and '1'
   *
   * @param element - Element to modify
   * @param property - CSS property to toggle
   */
  private toggleCSSProperty(
    element: HTMLElement,
    property: 'display' | 'visibility' | 'opacity'
  ): void {
    const currentStyle = window.getComputedStyle(element);

    switch (property) {
      case 'display':
        if (currentStyle.display === 'none') {
          const previousDisplay = element.dataset.previousDisplay || 'block';
          element.style.display = previousDisplay;
          delete element.dataset.previousDisplay;
        } else {
          element.dataset.previousDisplay = currentStyle.display;
          element.style.display = 'none';
        }
        break;

      case 'visibility':
        element.style.visibility = currentStyle.visibility === 'hidden' ? 'visible' : 'hidden';
        break;

      case 'opacity':
        element.style.opacity = parseFloat(currentStyle.opacity) === 0 ? '1' : '0';
        break;
    }
  }

  /**
   * Check if selector is a smart element selector
   *
   * @param selector - Selector to check
   * @returns true if selector targets dialog, details, summary, or select
   */
  private isSmartElementSelector(selector: string): boolean {
    const lower = selector.toLowerCase();
    return ['dialog', 'details', 'summary', 'select'].some(tag => lower.includes(tag));
  }

  /**
   * Detect smart element type from elements
   *
   * @param elements - Elements to check
   * @returns Element type or null if not a smart element
   */
  private detectSmartElementType(
    elements: HTMLElement[]
  ): 'dialog' | 'details' | 'select' | null {
    if (elements.length === 0) return null;

    const firstTag = elements[0].tagName;
    const allSameType = elements.every(el => el.tagName === firstTag);

    if (!allSameType) return null;

    switch (firstTag) {
      case 'DIALOG':
        return 'dialog';
      case 'DETAILS':
        return 'details';
      case 'SELECT':
        return 'select';
      case 'SUMMARY':
        // Summary elements toggle their parent details
        const parentDetails = elements
          .map(el => el.closest('details'))
          .filter((parent): parent is HTMLDetailsElement => parent !== null);
        return parentDetails.length > 0 ? 'details' : null;
      default:
        return null;
    }
  }

  /**
   * Toggle dialog element
   *
   * @param dialog - Dialog element
   * @param mode - Modal mode ('modal' or 'non-modal')
   */
  private toggleDialog(dialog: HTMLDialogElement, mode: 'modal' | 'non-modal'): void {
    if (dialog.open) {
      dialog.close();
    } else {
      if (mode === 'modal') {
        dialog.showModal();
      } else {
        dialog.show();
      }
    }
  }

  /**
   * Toggle details element
   *
   * @param details - Details element
   */
  private toggleDetails(details: HTMLDetailsElement): void {
    details.open = !details.open;
  }

  /**
   * Toggle select dropdown
   *
   * Uses the modern showPicker() API when available, with fallbacks.
   * Note: Programmatically opening select dropdowns is limited by browser security.
   *
   * @param select - Select element
   */
  private toggleSelect(select: HTMLSelectElement): void {
    if (document.activeElement === select) {
      select.blur();
    } else {
      select.focus();

      // Try modern showPicker() API first (Chrome 99+, Safari 16+, Firefox 101+)
      if ('showPicker' in select && typeof (select as any).showPicker === 'function') {
        try {
          (select as any).showPicker();
          return;
        } catch {
          // showPicker() may throw if not triggered by user gesture
        }
      }

      // Fallback: dispatch click event (more reliable than mousedown)
      const clickEvent = new MouseEvent('click', {
        view: window,
        bubbles: true,
        cancelable: true,
      });
      select.dispatchEvent(clickEvent);
    }
  }

  /**
   * Parse duration string to milliseconds
   *
   * Supports: "2s", "500ms", "1.5s"
   *
   * @param duration - Duration string
   * @returns Duration in milliseconds
   */
  private parseDuration(duration: string): number {
    const trimmed = duration.trim();

    if (trimmed.endsWith('ms')) {
      return parseFloat(trimmed);
    }

    if (trimmed.endsWith('s')) {
      return parseFloat(trimmed) * 1000;
    }

    // Default to milliseconds
    return parseFloat(trimmed);
  }

  /**
   * Setup temporal modifier for automatic reversion after duration
   *
   * @param element - Element to modify
   * @param toggleType - Type of toggle ('class' or 'attribute')
   * @param identifier - Class name or attribute name
   * @param duration - Duration in milliseconds
   */
  private setupTemporalModifier(
    element: HTMLElement,
    toggleType: 'class' | 'attribute',
    identifier: string,
    duration: number
  ): void {
    setTimeout(() => {
      if (toggleType === 'class') {
        element.classList.toggle(identifier);
      } else if (toggleType === 'attribute') {
        if (element.hasAttribute(identifier)) {
          element.removeAttribute(identifier);
        } else {
          element.setAttribute(identifier, '');
        }
      }
    }, duration);
  }

  /**
   * Setup event modifier for automatic reversion when event fires
   *
   * @param element - Element to modify
   * @param toggleType - Type of toggle ('class' or 'attribute')
   * @param identifier - Class name or attribute name
   * @param eventName - Event to listen for
   */
  private setupEventModifier(
    element: HTMLElement,
    toggleType: 'class' | 'attribute',
    identifier: string,
    eventName: string
  ): void {
    const handler = () => {
      if (toggleType === 'class') {
        element.classList.toggle(identifier);
      } else if (toggleType === 'attribute') {
        if (element.hasAttribute(identifier)) {
          element.removeAttribute(identifier);
        } else {
          element.setAttribute(identifier, '');
        }
      }
      element.removeEventListener(eventName, handler);
    };

    element.addEventListener(eventName, handler, { once: true });
  }
}

// ========== Factory Function ==========

/**
 * Factory function for creating ToggleCommand instances
 * Maintains compatibility with existing command registration patterns
 *
 * @returns New ToggleCommand instance
 */
export function createToggleCommand(): ToggleCommand {
  return new ToggleCommand();
}

// Default export for convenience
export default ToggleCommand;
