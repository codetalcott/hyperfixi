export interface Token {
  type: string;
  value: string;
  start: number;
  end: number;
}

export interface ParseRule {
  (parser: any, runtime: any, tokens: Token[]): any;
}

export interface Hyperscript {
  addCommand(keyword: string, definition: ParseRule): void;
  addFeature(feature: any): void;
  addLeafExpression(expression: any): void;
  addIndirectExpression(expression: any): void;
  evaluate(src: string, ctx?: any): any;
  parse(src: string): any;
  processNode(node: Element): void;
  version: string;
  browserInit(): void;
  internals: {
    lexer: any;
    parser: any;
    runtime: any;
    Lexer: any;
    Tokens: any;
    Parser: any;
    Runtime: any;
  };
  ElementCollection: any;
}

declare const _hyperscript: Hyperscript;
export { _hyperscript };
export default _hyperscript;