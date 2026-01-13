import {
  TemplateNode,
  TemplateDirective,
  HyperscriptBlock,
  TemplateError,
  TemplateOptions,
} from './types';

/**
 * Template parser that handles HTML with embedded hyperscript and directives
 */
export class TemplateParser {
  private options: TemplateOptions;
  private position: number = 0;
  private template: string = '';
  private currentLine: number = 1;
  private currentColumn: number = 1;

  constructor(options: TemplateOptions = {}) {
    this.options = {
      delimiters: { start: '{{', end: '}}' },
      development: false,
      ...options,
    };
  }

  /**
   * Parse template string into AST
   */
  parse(template: string): TemplateNode[] {
    this.template = template;
    this.position = 0;
    this.currentLine = 1;
    this.currentColumn = 1;

    const nodes: TemplateNode[] = [];

    while (!this.isAtEnd()) {
      const node = this.parseNode();
      if (node) {
        nodes.push(node);
      }
    }

    return nodes;
  }

  /**
   * Parse a single template node
   */
  private parseNode(): TemplateNode | null {
    if (this.isAtEnd()) {
      return null;
    }

    // Check for HTML tag
    if (this.peek() === '<') {
      return this.parseElement();
    }

    // Parse text content (including template variables)
    return this.parseText();
  }

  /**
   * Parse HTML element with attributes and children
   */
  private parseElement(): TemplateNode | null {
    const location = { line: this.currentLine, column: this.currentColumn };

    if (!this.consume('<')) {
      throw this.error('Expected opening tag');
    }

    // Handle comments
    if (this.matches('!--')) {
      return this.parseComment();
    }

    // Handle closing tags - return null to signal parent to stop parsing children
    if (this.peek() === '/') {
      // This is a closing tag, skip it gracefully and return null
      // Don't throw - just consume and let parent handle it
      while (!this.isAtEnd() && this.peek() !== '>') {
        this.advance();
      }
      if (!this.isAtEnd()) {
        this.advance(); // consume '>'
      }
      return null; // Signal that we hit a closing tag
    }

    const tagName = this.parseTagName();
    if (!tagName) {
      throw this.error('Expected tag name');
    }

    const attributes = this.parseAttributes();
    const isSelfClosing = this.consume('/>') || this.isSelfClosingTag(tagName);

    if (!isSelfClosing && !this.consume('>')) {
      throw this.error('Expected closing >');
    }

    // Check for hyperscript directive attributes
    const hyperscriptAttrs = ['_', 'data-hyperscript', 'hx-script'];
    const hyperscriptCode = hyperscriptAttrs
      .map(attr => attributes[attr])
      .filter(Boolean)
      .join(' ');

    // Check for template directives
    const directive = this.parseDirectiveFromAttributes(attributes);

    let children: TemplateNode[] = [];

    // Parse children if not self-closing
    if (!isSelfClosing) {
      children = this.parseChildren(tagName);
    }

    const node: TemplateNode = {
      type: directive ? 'directive' : hyperscriptCode ? 'hyperscript' : 'element',
      tagName,
      attributes,
      children,
      location,
    };

    if (directive) {
      node.directive = directive;
    }

    if (hyperscriptCode) {
      node.hyperscript = hyperscriptCode;
    }

    return node;
  }

  /**
   * Parse element attributes
   */
  private parseAttributes(): Record<string, string> {
    const attributes: Record<string, string> = {};

    while (!this.isAtEnd() && this.peek() !== '>' && !this.matches('/>')) {
      this.skipWhitespace();

      if (this.peek() === '>' || this.matches('/>')) {
        break;
      }

      const attr = this.parseAttribute();
      if (attr) {
        attributes[attr.name] = attr.value;
      }
    }

    return attributes;
  }

  /**
   * Parse single attribute
   */
  private parseAttribute(): { name: string; value: string } | null {
    const name = this.parseAttributeName();
    if (!name) {
      return null;
    }

    this.skipWhitespace();

    if (!this.consume('=')) {
      // Boolean attribute
      return { name, value: '' };
    }

    this.skipWhitespace();

    const value = this.parseAttributeValue();
    return { name, value };
  }

  /**
   * Parse attribute name
   */
  private parseAttributeName(): string {
    let name = '';

    while (
      !this.isAtEnd() &&
      /[a-zA-Z0-9_:-]/.test(this.peek()) &&
      this.peek() !== '=' &&
      this.peek() !== '>' &&
      this.peek() !== ' '
    ) {
      name += this.advance();
    }

    return name;
  }

  /**
   * Parse attribute value (quoted or unquoted)
   */
  private parseAttributeValue(): string {
    if (this.peek() === '"') {
      return this.parseQuotedValue('"');
    } else if (this.peek() === "'") {
      return this.parseQuotedValue("'");
    } else {
      // Unquoted value
      let value = '';
      while (!this.isAtEnd() && this.peek() !== ' ' && this.peek() !== '>' && !this.matches('/>')) {
        value += this.advance();
      }
      return value;
    }
  }

  /**
   * Parse quoted attribute value
   */
  private parseQuotedValue(quote: string): string {
    if (!this.consume(quote)) {
      throw this.error(`Expected opening ${quote}`);
    }

    let value = '';
    while (!this.isAtEnd() && this.peek() !== quote) {
      if (this.peek() === '\\') {
        this.advance(); // Skip escape character
        if (!this.isAtEnd()) {
          value += this.advance(); // Add escaped character
        }
      } else {
        value += this.advance();
      }
    }

    if (!this.consume(quote)) {
      throw this.error(`Expected closing ${quote}`);
    }

    return value;
  }

  /**
   * Parse text content (including template variables)
   */
  private parseText(): TemplateNode {
    const location = { line: this.currentLine, column: this.currentColumn };
    let content = '';

    while (!this.isAtEnd() && this.peek() !== '<') {
      content += this.advance();
    }

    return {
      type: 'text',
      content,
      location,
    };
  }

  /**
   * Parse comment node
   */
  private parseComment(): TemplateNode {
    const location = { line: this.currentLine, column: this.currentColumn };

    // Skip '!--'
    this.position += 3;

    let content = '';
    while (!this.isAtEnd() && !this.matches('-->')) {
      content += this.advance();
    }

    if (!this.consume('-->')) {
      throw this.error('Expected closing -->');
    }

    return {
      type: 'text',
      content: `<!--${content}-->`,
      location,
    };
  }

  /**
   * Parse child elements until closing tag
   */
  private parseChildren(parentTag: string): TemplateNode[] {
    const children: TemplateNode[] = [];

    while (!this.isAtEnd()) {
      // Check for closing tag
      if (this.matches(`</${parentTag}`)) {
        this.position += parentTag.length + 2;
        this.skipWhitespace();
        if (!this.consume('>')) {
          throw this.error('Expected closing >');
        }
        break;
      }

      const child = this.parseNode();
      if (child) {
        children.push(child);
      }
    }

    return children;
  }

  /**
   * Parse tag name
   */
  private parseTagName(): string {
    let name = '';

    while (
      !this.isAtEnd() &&
      /[a-zA-Z0-9_:-]/.test(this.peek()) &&
      this.peek() !== ' ' &&
      this.peek() !== '>' &&
      this.peek() !== '/'
    ) {
      name += this.advance();
    }

    return name;
  }

  /**
   * Parse template directives from attributes
   */
  private parseDirectiveFromAttributes(
    attributes: Record<string, string>
  ): TemplateDirective | undefined {
    const directiveNames = [
      'v-if',
      'v-for',
      'v-show',
      'x-if',
      'x-for',
      'x-show',
      'hf-if',
      'hf-for',
      'hf-component',
    ];

    for (const [attr, value] of Object.entries(attributes)) {
      if (directiveNames.includes(attr)) {
        const name = attr.split('-')[1] || attr; // Extract directive name
        return {
          name,
          expression: value,
          attributes: { ...attributes },
        };
      }
    }

    return undefined;
  }

  /**
   * Extract hyperscript blocks from parsed nodes
   */
  extractHyperscriptBlocks(nodes: TemplateNode[]): HyperscriptBlock[] {
    const blocks: HyperscriptBlock[] = [];

    const traverse = (node: TemplateNode) => {
      if (node.type === 'hyperscript' && node.hyperscript) {
        const code = Array.isArray(node.hyperscript)
          ? node.hyperscript.join(' ')
          : node.hyperscript;

        blocks.push({
          code,
          variables: this.extractVariablesFromCode(code),
          components: this.extractComponentsFromCode(code),
          type: 'attribute',
          ...(node.location && { location: node.location }),
        });
      }

      if (node.children) {
        node.children.forEach(traverse);
      }
    };

    nodes.forEach(traverse);
    return blocks;
  }

  /**
   * Extract template variables from hyperscript code
   */
  private extractVariablesFromCode(code: string): string[] {
    const start = this.options.delimiters?.start ?? '{{';
    const end = this.options.delimiters?.end ?? '}}';
    const pattern = new RegExp(`\\${start}([^}]+)\\${end}`, 'g');
    const variables = new Set<string>();

    let match;
    while ((match = pattern.exec(code)) !== null) {
      if (match[1]) {
        variables.add(match[1].trim());
      }
    }

    return Array.from(variables);
  }

  /**
   * Extract component references from hyperscript code
   */
  private extractComponentsFromCode(code: string): string[] {
    // Look for component references in hyperscript
    const componentPattern = /\b(\w+)-component\b/g;
    const components = new Set<string>();

    let match;
    while ((match = componentPattern.exec(code)) !== null) {
      if (match[1]) {
        components.add(match[1]);
      }
    }

    return Array.from(components);
  }

  /**
   * Utility methods
   */
  private isAtEnd(): boolean {
    return this.position >= this.template.length;
  }

  private peek(): string {
    if (this.isAtEnd()) return '\0';
    return this.template[this.position];
  }

  private peekNext(): string {
    if (this.position + 1 >= this.template.length) return '\0';
    return this.template[this.position + 1];
  }

  private advance(): string {
    if (this.isAtEnd()) return '\0';

    const char = this.template[this.position++];

    if (char === '\n') {
      this.currentLine++;
      this.currentColumn = 1;
    } else {
      this.currentColumn++;
    }

    return char;
  }

  private consume(expected: string): boolean {
    if (this.matches(expected)) {
      this.position += expected.length;
      this.currentColumn += expected.length;
      return true;
    }
    return false;
  }

  private matches(text: string): boolean {
    if (this.position + text.length > this.template.length) {
      return false;
    }
    return this.template.substring(this.position, this.position + text.length) === text;
  }

  private skipWhitespace(): void {
    while (!this.isAtEnd() && /\s/.test(this.peek())) {
      this.advance();
    }
  }

  private isSelfClosingTag(tagName: string): boolean {
    const selfClosingTags = [
      'area',
      'base',
      'br',
      'col',
      'embed',
      'hr',
      'img',
      'input',
      'link',
      'meta',
      'param',
      'source',
      'track',
      'wbr',
    ];
    return selfClosingTags.includes(tagName.toLowerCase());
  }

  private error(message: string): TemplateError {
    return new TemplateError(message, 'parse', {
      line: this.currentLine,
      column: this.currentColumn,
    });
  }
}
