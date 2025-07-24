/**
 * Render Command Implementation
 * Processes HTML template elements with data interpolation, hyperscript directives, and web components
 * Compatible with official _hyperscript template.js extension + modern web component integration
 */

import { CommandImplementation, ExecutionContext } from '../../types/core';

export class RenderCommand implements CommandImplementation {
  name = 'render';
  syntax = 'render <template> [with <data>]';
  description = 'Renders a template element with optional data context and hyperscript directives';
  isBlocking = false;

  async execute(context: ExecutionContext, ...args: any[]): Promise<any> {
    if (args.length < 1) {
      throw new Error('Render command requires a template argument');
    }

    // Parse arguments: render template [with data]
    const templateRef = args[0];
    let data = {};
    
    // Check for "with" keyword and data
    if (args.length >= 3 && args[1] === 'with') {
      data = args[2];
    }

    // Resolve template element
    const templateElement = this.resolveTemplate(templateRef, context);
    if (!templateElement) {
      throw new Error(`Template not found: ${templateRef}`);
    }

    // Process template with data context
    const result = await this.processTemplate(templateElement, data, context);
    
    // Store result in context for hyperscript access
    context.result = result;
    
    return result;
  }

  private resolveTemplate(templateRef: any, context: ExecutionContext): HTMLTemplateElement | null {
    // Handle direct template element
    if (templateRef instanceof HTMLTemplateElement) {
      return templateRef;
    }

    // Handle CSS selector strings
    if (typeof templateRef === 'string') {
      if (templateRef.startsWith('#') || templateRef.startsWith('.') || 
          templateRef.includes('[') || templateRef.includes('>')) {
        const element = document.querySelector(templateRef);
        return element instanceof HTMLTemplateElement ? element : null;
      }
    }

    // Handle context references
    if (templateRef === 'me' && context.me instanceof HTMLTemplateElement) {
      return context.me;
    }
    if (templateRef === 'it' && context.it instanceof HTMLTemplateElement) {
      return context.it;
    }
    if (templateRef === 'you' && context.you instanceof HTMLTemplateElement) {
      return context.you;
    }

    return null;
  }

  private async processTemplate(
    templateElement: HTMLTemplateElement, 
    data: any, 
    context: ExecutionContext
  ): Promise<DocumentFragment> {
    // Use the fixed template processor which handles HTML escaping correctly
    const { FixedTemplateProcessor } = await import('./template-processor-fixed.js');
    
    const processor = new FixedTemplateProcessor();
    
    // Get template content as string
    const templateContent = templateElement.innerHTML;
    
    // Create template context with data
    const templateContext = this.createTemplateContext(data, context);
    
    // Process the template to HTML (this handles ${} interpolation with escaping)
    const html = await processor.processTemplate(templateContent, templateContext);
    
    // Convert HTML string back to DocumentFragment
    const fragment = document.createDocumentFragment();
    const div = document.createElement('div');
    div.innerHTML = html;
    
    // Move all child nodes to the fragment
    while (div.firstChild) {
      fragment.appendChild(div.firstChild);
    }
    
    return fragment;
  }

  private createTemplateContext(data: any, baseContext: ExecutionContext): ExecutionContext {
    const newLocals = new Map(baseContext.locals || new Map());
    
    // Add data properties to locals
    if (data && typeof data === 'object') {
      for (const [key, value] of Object.entries(data)) {
        newLocals.set(key, value);
      }
    }
    
    return {
      ...baseContext,
      locals: newLocals,
      // Make data available as template context
      templateData: data,
      // Enhanced result handling
      result: baseContext.result
    };
  }

  private async processTextNodes(node: Node, context: ExecutionContext): Promise<void> {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      const processedText = await this.interpolateText(text, context);
      node.textContent = processedText;
    } else {
      // Recursively process child nodes
      const children = Array.from(node.childNodes);
      for (const child of children) {
        await this.processTextNodes(child, context);
      }
    }
  }

  private async interpolateText(text: string, context: ExecutionContext): Promise<string> {
    // Process ${expression} interpolations
    const interpolationRegex = /\$\{([^}]+)\}/g;
    let result = text;

    // Collect all matches first to avoid regex state issues
    const matches: RegExpMatchArray[] = [];
    let match;
    while ((match = interpolationRegex.exec(text)) !== null) {
      matches.push(match);
    }
    
    // Process matches in reverse order to avoid position shifting
    for (let i = matches.length - 1; i >= 0; i--) {
      const currentMatch = matches[i];
      const expression = currentMatch[1].trim();
      console.debug(`=== INTERPOLATION DEBUG START ===`);
      console.debug(`Processing expression: "${expression}"`);
      console.debug(`Full match: "${currentMatch[0]}"`);
      
      try {
        let value: any;
        let shouldEscape = true;

        // Check for "unescaped" prefix
        if (expression.startsWith('unescaped ')) {
          const actualExpression = expression.substring('unescaped '.length).trim();
          console.debug(`Evaluating unescaped expression: "${actualExpression}"`);
          value = await this.evaluateExpression(actualExpression, context);
          shouldEscape = false;
        } else {
          console.debug(`Evaluating expression: "${expression}"`);
          console.debug('Expression context locals:', Array.from(context.locals.keys()));
          console.debug('Expression context locals values:', Array.from(context.locals.values()));
          console.debug('Context has it:', context.locals.has('it'));
          console.debug('Context get it:', context.locals.get('it'));
          
          // TEMPORARY DIRECT FIX for 'it' variable
          if (expression.trim() === 'it' && context.locals && context.locals.has('it')) {
            value = context.locals.get('it');
            console.debug(`Direct fix applied for 'it':`, value);
          } else {
            value = await this.evaluateExpression(expression, context);
            console.debug(`Evaluated "${expression}" to:`, value);
          }
          
          console.debug(`Type of result:`, typeof value);
        }

        const processedValue = shouldEscape ? this.escapeHtml(String(value)) : String(value);
        console.debug(`Processed value: "${processedValue}"`);
        result = result.replace(currentMatch[0], processedValue);
        console.debug(`Result after replacement:`, result);
      } catch (error) {
        console.warn(`Template interpolation error for "${expression}":`, error);
        result = result.replace(currentMatch[0], `[Error: ${expression}]`);
      }
      console.debug(`=== INTERPOLATION DEBUG END ===`);
    }
    return result;
  }

  private async processDirectives(fragment: DocumentFragment, context: ExecutionContext): Promise<void> {
    console.debug('processDirectives called');
    
    // Process directives in text content
    const walker = document.createTreeWalker(
      fragment,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    const textNodes: Text[] = [];
    let node: Node | null;

    while ((node = walker.nextNode())) {
      if (node.nodeType === Node.TEXT_NODE) {
        textNodes.push(node as Text);
      }
    }

    console.debug('Found text nodes:', textNodes.length);
    for (const textNode of textNodes) {
      await this.processDirectivesInText(textNode, context);
    }
  }

  private async processDirectivesInText(textNode: Text, context: ExecutionContext): Promise<void> {
    const content = textNode.textContent || '';
    console.debug('Processing text node content:', JSON.stringify(content));
    
    if (!content.includes('@')) {
      console.debug('No @ directives found in text');
      return;
    }

    console.debug('Found @ directives, processing...');
    const lines = content.split('\n');
    console.debug('Split into lines:', lines);
    let result: string[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const trimmedLine = line.trim();

      if (trimmedLine.startsWith('@repeat ')) {
        // Process repeat directive
        const [newLines, nextIndex] = await this.processRepeatBlock(lines, i, context);
        result.push(...newLines);
        i = nextIndex;
      } else if (trimmedLine.startsWith('@if ')) {
        // Process if directive  
        const [newLines, nextIndex] = await this.processIfBlock(lines, i, context);
        result.push(...newLines);
        i = nextIndex;
      } else if (trimmedLine.startsWith('@set ')) {
        // Handle @set directive - execute as hyperscript command
        try {
          const setCommand = trimmedLine.substring(1); // Remove @
          await this.executeHyperscriptCommand(setCommand, context);
        } catch (error) {
          console.warn(`Template @set directive error for "${trimmedLine}":`, error);
        }
        i++;
      } else if (trimmedLine.startsWith('@') && !trimmedLine.startsWith('@end') && !trimmedLine.startsWith('@else')) {
        // Other standalone directives - execute but don't include in output
        try {
          const directive = trimmedLine.substring(1);
          await this.evaluateExpression(directive, context);
        } catch (error) {
          console.warn(`Template directive error for "${trimmedLine}":`, error);
        }
        i++;
      } else {
        // Regular line - keep as-is
        result.push(line);
        i++;
      }
    }

    // Replace the text node content with processed result
    textNode.textContent = result.join('\n');
  }

  private async processRepeatBlock(lines: string[], startIndex: number, context: ExecutionContext): Promise<[string[], number]> {
    const repeatLine = lines[startIndex].trim();
    console.debug('Processing repeat line:', repeatLine);
    
    const repeatMatch = repeatLine.match(/^@repeat\s+(?:(\w+)\s+)?in\s+(.+)$/);
    
    if (!repeatMatch) {
      console.warn('Invalid @repeat syntax:', repeatLine);
      return [[], startIndex + 1];
    }

    const [, itemVar, arrayExpr] = repeatMatch;
    const iteratorVar = itemVar || 'it'; // Default to 'it' if no variable specified
    console.debug('Iterator variable:', iteratorVar, 'Array expression:', arrayExpr);

    // Find the @end directive
    let endIndex = startIndex + 1;
    let nestLevel = 1;
    while (endIndex < lines.length && nestLevel > 0) {
      const line = lines[endIndex].trim();
      if (line.startsWith('@repeat')) nestLevel++;
      if (line === '@end') nestLevel--;
      endIndex++;
    }

    if (nestLevel > 0) {
      console.warn('Missing @end for @repeat directive');
      return [[], lines.length];
    }

    // Extract content lines between @repeat and @end
    const contentLines = lines.slice(startIndex + 1, endIndex - 1);

    try {
      // Evaluate the array expression
      const array = await this.evaluateExpression(arrayExpr, context);
      console.debug('Evaluated array:', array);
      
      if (!Array.isArray(array)) {
        console.warn(`@repeat expression must evaluate to array: ${arrayExpr}`);
        return [[], endIndex];
      }

      // Generate repeated content
      const result: string[] = [];
      console.debug('Processing', array.length, 'items');
      
      for (const item of array) {
        console.debug('Processing item:', item);
        
        // Create new context with iterator variable
        const newLocals = new Map(context.locals);
        newLocals.set(iteratorVar, item);
        
        const iterContext = {
          ...context,
          locals: newLocals
        };

        console.debug('Iterator context locals keys:', Array.from(iterContext.locals.keys()));
        console.debug('Iterator context locals values:', Array.from(iterContext.locals.values()));
        console.debug('Iterator context it value:', iterContext.locals.get('it'));

        // Process each content line with the item context
        for (const contentLine of contentLines) {
          console.debug('Processing content line:', contentLine);
          
          // Recursively process any nested directives in content
          if (contentLine.trim().startsWith('@')) {
            // Handle nested directives if needed
            result.push(contentLine);
          } else {
            // Process interpolation in the content line with iterator context
            const interpolatedLine = await this.interpolateText(contentLine, iterContext);
            console.debug('Interpolated line:', interpolatedLine);
            result.push(interpolatedLine);
          }
        }
      }

      console.debug('Repeat result:', result);
      return [result, endIndex];
    } catch (error) {
      console.warn('Error processing @repeat:', error);
      return [[], endIndex];
    }
  }

  private async processIfBlock(lines: string[], startIndex: number, context: ExecutionContext): Promise<[string[], number]> {
    const ifLine = lines[startIndex].trim();
    const condition = ifLine.substring(3).trim(); // Remove '@if '

    // Find @else and @end
    let elseIndex = -1;
    let endIndex = startIndex + 1;
    let nestLevel = 1;

    while (endIndex < lines.length && nestLevel > 0) {
      const line = lines[endIndex].trim();
      if (line.startsWith('@if')) nestLevel++;
      if (line === '@else' && nestLevel === 1) elseIndex = endIndex;
      if (line === '@end') nestLevel--;
      endIndex++;
    }

    if (nestLevel > 0) {
      console.warn('Missing @end for @if directive');
      return [[], lines.length];
    }

    try {
      // Evaluate condition
      const conditionResult = await this.evaluateExpression(condition, context);

      // Choose which content to include
      let contentStart: number;
      let contentEnd: number;

      if (conditionResult) {
        // Include if branch
        contentStart = startIndex + 1;
        contentEnd = elseIndex !== -1 ? elseIndex : endIndex - 1;
      } else {
        // Include else branch (if exists)
        if (elseIndex !== -1) {
          contentStart = elseIndex + 1;
          contentEnd = endIndex - 1;
        } else {
          // No else branch - include nothing
          return [[], endIndex];
        }
      }

      const contentLines = lines.slice(contentStart, contentEnd);
      return [contentLines, endIndex];
    } catch (error) {
      console.warn('Error processing @if:', error);
      return [[], endIndex];
    }
  }

  private async processIfDirective(node: Node, condition: string, context: ExecutionContext): Promise<void> {
    const conditionResult = await this.evaluateExpression(condition, context);
    
    if (!conditionResult) {
      // Remove content until @else or @end
      this.removeConditionalContent(node, ['else', 'end']);
    }
    
    // Remove the directive node itself
    node.remove();
  }

  private async processRepeatDirective(node: Node, expression: string, context: ExecutionContext): Promise<void> {
    // Parse: repeat item in array
    const match = expression.match(/(\w+)\s+in\s+(.+)/);
    if (!match) {
      throw new Error(`Invalid repeat syntax: ${expression}`);
    }

    const [, itemVar, arrayExpr] = match;
    const array = await this.evaluateExpression(arrayExpr, context);

    if (!Array.isArray(array)) {
      throw new Error(`Repeat expression must evaluate to array: ${arrayExpr}`);
    }

    // Clone content for each array item
    const parent = node.parentNode;
    if (!parent) return;

    const contentNodes = this.getDirectiveContent(node, ['end']);
    
    for (let i = 0; i < array.length; i++) {
      const itemContext = {
        ...context,
        locals: new Map([
          ...(context.locals || new Map()),
          [itemVar, array[i]],
          ['@index', i],
          ['@first', i === 0],
          ['@last', i === array.length - 1]
        ])
      };

      for (const contentNode of contentNodes) {
        const clonedNode = contentNode.cloneNode(true);
        await this.processTextNodes(clonedNode, itemContext);
        parent.insertBefore(clonedNode, node);
      }
    }

    // Remove original content and directive
    this.removeConditionalContent(node, ['end'], true);
    node.remove();
  }

  private async processElseDirective(node: Node, context: ExecutionContext): Promise<void> {
    // Implementation depends on if/else logic
    node.remove();
  }

  private async processEndDirective(node: Node, context: ExecutionContext): Promise<void> {
    // End directive - remove the node
    node.remove();
  }

  private removeConditionalContent(startNode: Node, endDirectives: string[], includeEnd = false): void {
    const parent = startNode.parentNode;
    if (!parent) return;

    let currentNode = startNode.nextSibling;
    const nodesToRemove: Node[] = [];

    while (currentNode) {
      const nextNode = currentNode.nextSibling;
      
      if (currentNode.nodeType === Node.COMMENT_NODE || 
          (currentNode.nodeType === Node.TEXT_NODE && currentNode.textContent?.trim().startsWith('@'))) {
        const content = currentNode.textContent?.trim() || '';
        const directive = content.substring(1).trim();
        
        if (endDirectives.includes(directive)) {
          if (includeEnd) {
            nodesToRemove.push(currentNode);
          }
          break;
        }
      }
      
      nodesToRemove.push(currentNode);
      currentNode = nextNode;
    }

    for (const node of nodesToRemove) {
      node.remove();
    }
  }

  private getDirectiveContent(startNode: Node, endDirectives: string[]): Node[] {
    const contentNodes: Node[] = [];
    let currentNode = startNode.nextSibling;

    while (currentNode) {
      if (currentNode.nodeType === Node.COMMENT_NODE || 
          (currentNode.nodeType === Node.TEXT_NODE && currentNode.textContent?.trim().startsWith('@'))) {
        const content = currentNode.textContent?.trim() || '';
        const directive = content.substring(1).trim();
        
        if (endDirectives.includes(directive)) {
          break;
        }
      }
      
      contentNodes.push(currentNode);
      currentNode = currentNode.nextSibling;
    }

    return contentNodes;
  }

  private escapeHtml(text: string): string {
    // More robust HTML escaping for cross-browser compatibility
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private async executeHyperscriptCommand(command: string, context: ExecutionContext): Promise<any> {
    try {
      console.debug(`Executing hyperscript command: "${command}"`);
      
      // Use the hyperscript evaluator to execute the command
      const { evalHyperscript } = await import('../../compatibility/eval-hyperscript.js');
      const result = await evalHyperscript(command, context);
      
      console.debug(`Command result:`, result);
      return result;
    } catch (error) {
      throw new Error(`Hyperscript command execution failed: ${command} - ${error}`);
    }
  }

  private async evaluateExpression(expression: string, context: ExecutionContext): Promise<any> {
    try {
      // For simple variable lookups, try direct context resolution first
      const trimmedExpr = expression.trim();
      
      // Check for simple identifiers that can be resolved directly
      if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmedExpr)) {
        // Check locals first (this is critical for template iteration)
        if (context.locals && context.locals.has(trimmedExpr)) {
          const value = context.locals.get(trimmedExpr);
          console.debug(`Direct resolution of "${trimmedExpr}":`, value);
          return value;
        }
        
        // Check context properties
        if (trimmedExpr === 'me' && context.me !== undefined) return context.me;
        if (trimmedExpr === 'you' && context.you !== undefined) return context.you;
        if (trimmedExpr === 'it' && context.it !== undefined) return context.it;
        if (trimmedExpr === 'result' && context.result !== undefined) return context.result;
        
        // Check globals
        if (context.globals && context.globals.has(trimmedExpr)) {
          return context.globals.get(trimmedExpr);
        }
      }
      
      // For complex expressions, use the parser
      const { parseAndEvaluateExpression } = await import('../../parser/expression-parser.js');
      return await parseAndEvaluateExpression(expression, context);
    } catch (error) {
      throw new Error(`Expression evaluation failed: ${expression} - ${error}`);
    }
  }

  validate(args: any[]): string | null {
    if (args.length < 1) {
      return 'Render command requires a template argument';
    }
    
    if (args.length >= 2 && args[1] !== 'with') {
      return 'Invalid render syntax. Use: render template [with data]';
    }
    
    if (args.length === 2) {
      return 'Render "with" keyword requires data argument';
    }
    
    return null;
  }
}

export default RenderCommand;