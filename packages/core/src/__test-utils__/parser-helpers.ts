/**
 * Type-safe parser test helpers
 * Provides properly typed helpers for parsing and AST assertions
 */

import type { CommandNode, ASTNode, Token, ParseError } from '../parser/types'

/**
 * Successful parse result
 */
export interface ParserTestSuccess {
  success: true
  node: CommandNode
  tokens: Token[]
  errors?: ParseError[]
}

/**
 * Failed parse result
 */
export interface ParserTestFailure {
  success: false
  error: Error | ParseError
  input: string
  tokens?: Token[]
}

/**
 * Discriminated union for parse results
 */
export type ParserTestResult = ParserTestSuccess | ParserTestFailure

/**
 * Type guard for successful parse
 */
export function isParseSuccess(result: ParserTestResult): result is ParserTestSuccess {
  return result.success === true
}

/**
 * Type guard for failed parse
 */
export function isParseFailure(result: ParserTestResult): result is ParserTestFailure {
  return result.success === false
}

/**
 * Assert that parse was successful
 */
export function assertParseSuccess(
  result: ParserTestResult
): asserts result is ParserTestSuccess {
  if (!result.success) {
    const error = result.error
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Parse failed: ${message}\nInput: ${result.input}`)
  }
}

/**
 * Assert that parse failed
 */
export function assertParseFailure(
  result: ParserTestResult
): asserts result is ParserTestFailure {
  if (result.success) {
    throw new Error('Expected parse to fail, but it succeeded')
  }
}

/**
 * Expect AST structure to match
 * Type-safe alternative to expecting on 'as any' nodes
 */
export function expectASTStructure(
  node: ASTNode | CommandNode,
  expected: Partial<CommandNode | ASTNode>
): void {
  for (const [key, value] of Object.entries(expected)) {
    const actualValue = (node as Record<string, unknown>)[key]

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      if (typeof actualValue !== 'object' || actualValue === null) {
        throw new Error(
          `Expected node.${key} to be an object, got ${typeof actualValue}`
        )
      }
      expectASTStructure(actualValue as ASTNode, value as Partial<ASTNode>)
    } else if (actualValue !== value) {
      throw new Error(
        `Expected node.${key} to be ${String(value)}, got ${String(actualValue)}`
      )
    }
  }
}

/**
 * Expect AST node to have a property
 */
export function expectNodeProperty<T = unknown>(
  node: ASTNode | CommandNode,
  property: string,
  expectedValue?: T
): void {
  if (!(property in node)) {
    throw new Error(`Expected node to have property '${property}'`)
  }

  if (expectedValue !== undefined) {
    const actualValue = (node as Record<string, unknown>)[property]
    if (actualValue !== expectedValue) {
      throw new Error(
        `Expected node.${property} to be ${String(expectedValue)}, got ${String(actualValue)}`
      )
    }
  }
}

/**
 * Expect command node with specific name
 */
export function expectCommandNode(
  node: ASTNode,
  expectedName: string
): asserts node is CommandNode {
  if (node.type !== 'Command') {
    throw new Error(`Expected Command node, got ${node.type}`)
  }

  const commandNode = node as CommandNode
  if (commandNode.name !== expectedName) {
    throw new Error(
      `Expected command '${expectedName}', got '${commandNode.name}'`
    )
  }
}

/**
 * Expect node to be a specific type
 */
export function expectNodeType<T extends ASTNode>(
  node: ASTNode,
  expectedType: T['type']
): asserts node is T {
  if (node.type !== expectedType) {
    throw new Error(`Expected ${expectedType} node, got ${node.type}`)
  }
}

/**
 * Get command arguments safely
 */
export function getCommandArguments(node: ASTNode): ASTNode[] {
  expectNodeType<CommandNode>(node, 'Command')
  return node.arguments || []
}

/**
 * Get command target safely
 */
export function getCommandTarget(node: ASTNode): ASTNode | undefined {
  expectNodeType<CommandNode>(node, 'Command')
  return node.target
}

/**
 * Safe node property accessor with type assertion
 */
export function getNodeProperty<T = unknown>(
  node: ASTNode | CommandNode,
  property: string
): T | undefined {
  if (property in node) {
    return (node as Record<string, unknown>)[property] as T
  }
  return undefined
}

/**
 * Builder pattern for creating test AST nodes
 */
export class TestNodeBuilder {
  private node: Partial<CommandNode> = {
    type: 'Command',
    position: {
      start: 0,
      end: 0,
      line: 1,
      column: 1,
    },
  }

  withName(name: string): this {
    this.node.name = name
    return this
  }

  withArguments(...args: ASTNode[]): this {
    this.node.arguments = args
    return this
  }

  withTarget(target: ASTNode): this {
    this.node.target = target
    return this
  }

  withPosition(start: number, end: number, line = 1, column = 1): this {
    this.node.position = { start, end, line, column }
    return this
  }

  build(): CommandNode {
    if (!this.node.name) {
      throw new Error('Command name is required')
    }
    return this.node as CommandNode
  }
}

/**
 * Create a test command node
 */
export function createTestCommandNode(
  name: string,
  args: ASTNode[] = []
): CommandNode {
  return new TestNodeBuilder()
    .withName(name)
    .withArguments(...args)
    .build()
}

/**
 * Create a test literal node
 */
export function createTestLiteral(
  value: string | number | boolean | null
): ASTNode {
  return {
    type: 'Literal',
    value,
    raw: String(value),
    position: { start: 0, end: 0, line: 1, column: 1 },
  }
}

/**
 * Create a test identifier node
 */
export function createTestIdentifier(name: string): ASTNode {
  return {
    type: 'Identifier',
    name,
    position: { start: 0, end: 0, line: 1, column: 1 },
  }
}

/**
 * Create a test selector node
 */
export function createTestSelector(selector: string): ASTNode {
  return {
    type: 'Selector',
    value: selector,
    position: { start: 0, end: 0, line: 1, column: 1 },
  }
}
