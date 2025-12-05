/**
 * Standardized Command Metadata System
 *
 * Inspired by napi-rs patterns: systematic type definitions, zero-boilerplate,
 * single source of truth for all command metadata.
 *
 * Benefits:
 * - Consistent metadata format across all 43+ commands
 * - Better documentation generation
 * - IDE tooling support
 * - Validation improvements
 */

// ============================================================================
// Command Categories
// ============================================================================

/**
 * Standard command category values (lowercase, hyphenated)
 */
export type CommandCategory =
  | 'animation'
  | 'async'
  | 'control-flow'
  | 'data'
  | 'dom'
  | 'content'
  | 'navigation'
  | 'utility'
  | 'advanced'
  | 'event'
  | 'storage'
  | 'execution'
  | 'templates'
  | 'behaviors';

/**
 * All valid category values as an array (for validation)
 */
export const COMMAND_CATEGORIES: CommandCategory[] = [
  'animation',
  'async',
  'control-flow',
  'data',
  'dom',
  'content',
  'navigation',
  'utility',
  'advanced',
  'event',
  'storage',
  'execution',
  'templates',
  'behaviors',
];

// ============================================================================
// Side Effects
// ============================================================================

/**
 * Standard side effect values
 *
 * Categories:
 * - DOM: dom-mutation, dom-query, dom-creation, dom-observation, element-modification
 * - Context: context-modification, context-switching, context-mutation, state-mutation
 * - Control Flow: conditional-execution, iteration, control-flow, execution-termination
 * - Events: event-listening, event-dispatch, event-dispatching, event-prevention, event-listeners, custom-events
 * - Execution: command-execution, code-execution, function-execution, method-execution, async-execution
 * - Data: data-mutation, data-binding, property-transfer
 * - I/O: network, storage, navigation, clipboard, clipboard-write, console, console-output
 * - UI: animation, focus, scroll
 * - Templates: template-execution, behavior-installation
 * - Utility: random-selection, debugging, error-throwing
 */
export type CommandSideEffect =
  // DOM operations
  | 'dom-mutation'
  | 'dom-query'
  | 'dom-creation'
  | 'dom-observation'
  | 'element-modification'
  // Context operations
  | 'context-modification'
  | 'context-switching'
  | 'context-mutation'
  | 'state-mutation'
  // Control flow
  | 'conditional-execution'
  | 'iteration'
  | 'control-flow'
  | 'execution-termination'
  // Timing
  | 'time'
  // Event operations
  | 'event-listening'
  | 'event-dispatch'
  | 'event-dispatching'
  | 'event-prevention'
  | 'event-listeners'
  | 'custom-events'
  // Execution
  | 'command-execution'
  | 'code-execution'
  | 'function-execution'
  | 'method-execution'
  | 'async-execution'
  // Data operations
  | 'data-mutation'
  | 'data-binding'
  | 'property-transfer'
  // I/O operations
  | 'network'
  | 'storage'
  | 'navigation'
  | 'clipboard'
  | 'clipboard-write'
  | 'console'
  | 'console-output'
  // UI operations
  | 'animation'
  | 'focus'
  | 'scroll'
  // Template operations
  | 'template-execution'
  | 'behavior-installation'
  // Utility operations
  | 'random-selection'
  | 'debugging'
  | 'error-throwing';

/**
 * All valid side effect values as an array (for validation)
 */
export const COMMAND_SIDE_EFFECTS: CommandSideEffect[] = [
  // DOM operations
  'dom-mutation',
  'dom-query',
  'dom-creation',
  'dom-observation',
  'element-modification',
  // Context operations
  'context-modification',
  'context-switching',
  'context-mutation',
  'state-mutation',
  // Control flow
  'conditional-execution',
  'iteration',
  'control-flow',
  'execution-termination',
  // Timing
  'time',
  // Event operations
  'event-listening',
  'event-dispatch',
  'event-dispatching',
  'event-prevention',
  'event-listeners',
  'custom-events',
  // Execution
  'command-execution',
  'code-execution',
  'function-execution',
  'method-execution',
  'async-execution',
  // Data operations
  'data-mutation',
  'data-binding',
  'property-transfer',
  // I/O operations
  'network',
  'storage',
  'navigation',
  'clipboard',
  'clipboard-write',
  'console',
  'console-output',
  // UI operations
  'animation',
  'focus',
  'scroll',
  // Template operations
  'template-execution',
  'behavior-installation',
  // Utility operations
  'random-selection',
  'debugging',
  'error-throwing',
];

// ============================================================================
// Command Metadata Interface
// ============================================================================

/**
 * Standardized command metadata interface
 *
 * REQUIRED fields: description, syntax, examples, category
 * OPTIONAL fields: sideEffects, deprecated, aliases, relatedCommands, version
 */
export interface CommandMetadata {
  /**
   * Short description of what the command does (1-2 sentences)
   * @required
   */
  readonly description: string;

  /**
   * Command syntax pattern(s)
   * Single string for simple commands, array for multiple variants
   * @required
   * @example 'set <target> to <value>'
   * @example ['wait <time>', 'wait for <event>']
   */
  readonly syntax: string | readonly string[];

  /**
   * Array of usage examples (at least 2 recommended)
   * @required
   */
  readonly examples: readonly string[];

  /**
   * Command category (lowercase, hyphenated)
   * @required
   */
  readonly category: CommandCategory;

  /**
   * Side effects produced by this command
   * @optional
   */
  readonly sideEffects?: readonly CommandSideEffect[];

  /**
   * Whether this command is deprecated
   * @optional @default false
   */
  readonly deprecated?: boolean;

  /**
   * Deprecation message explaining replacement
   * @optional (required if deprecated is true)
   */
  readonly deprecationMessage?: string;

  /**
   * Alternative command names
   * @optional
   */
  readonly aliases?: readonly string[];

  /**
   * Names of related commands
   * @optional
   */
  readonly relatedCommands?: readonly string[];

  /**
   * Semantic version string
   * @optional @default '1.0.0'
   */
  readonly version?: string;

  /**
   * Whether this command is blocking (waits for completion)
   * @optional @default false
   */
  readonly isBlocking?: boolean;

  /**
   * Whether this command accepts a body (commands between start and 'end')
   * @optional @default false
   */
  readonly hasBody?: boolean;

  /**
   * Performance characteristics
   * @optional
   */
  readonly performance?: {
    readonly complexity?: 'O(1)' | 'O(n)' | 'O(n log n)' | 'O(n²)';
    readonly isAsync?: boolean;
    readonly mayBlock?: boolean;
  };
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validation result for command metadata
 */
export interface MetadataValidationResult {
  readonly isValid: boolean;
  readonly errors: string[];
  readonly warnings: string[];
}

/**
 * Validate command metadata against the standard schema
 */
export function validateCommandMetadata(
  metadata: unknown,
  commandName: string
): MetadataValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!metadata || typeof metadata !== 'object') {
    return {
      isValid: false,
      errors: [`${commandName}: metadata must be an object`],
      warnings: [],
    };
  }

  const m = metadata as Record<string, unknown>;

  // Required fields
  if (typeof m.description !== 'string' || m.description.length === 0) {
    errors.push(`${commandName}: metadata.description is required and must be a non-empty string`);
  }

  if (!m.syntax || (typeof m.syntax !== 'string' && !Array.isArray(m.syntax))) {
    errors.push(`${commandName}: metadata.syntax is required and must be a string or string[]`);
  }

  if (!Array.isArray(m.examples) || m.examples.length === 0) {
    errors.push(`${commandName}: metadata.examples is required and must be a non-empty array`);
  } else if (m.examples.length < 2) {
    warnings.push(`${commandName}: metadata.examples should have at least 2 examples`);
  }

  if (typeof m.category !== 'string') {
    errors.push(`${commandName}: metadata.category is required`);
  } else if (!COMMAND_CATEGORIES.includes(m.category as CommandCategory)) {
    errors.push(
      `${commandName}: metadata.category '${m.category}' is not valid. ` +
        `Valid categories: ${COMMAND_CATEGORIES.join(', ')}`
    );
  }

  // Optional field validation
  if (m.sideEffects !== undefined) {
    if (!Array.isArray(m.sideEffects)) {
      errors.push(`${commandName}: metadata.sideEffects must be an array`);
    } else {
      for (const effect of m.sideEffects) {
        if (!COMMAND_SIDE_EFFECTS.includes(effect as CommandSideEffect)) {
          warnings.push(
            `${commandName}: unknown side effect '${effect}'. ` +
              `Known effects: ${COMMAND_SIDE_EFFECTS.join(', ')}`
          );
        }
      }
    }
  }

  if (m.deprecated === true && typeof m.deprecationMessage !== 'string') {
    warnings.push(`${commandName}: deprecated commands should include deprecationMessage`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Normalize category to lowercase hyphenated format
 * Handles common variants like 'DOM' -> 'dom', 'ControlFlow' -> 'control-flow'
 */
export function normalizeCategory(category: string): CommandCategory {
  // Handle common uppercase variants
  const normalized = category
    .replace(/([a-z])([A-Z])/g, '$1-$2') // camelCase to hyphenated
    .toLowerCase();

  if (COMMAND_CATEGORIES.includes(normalized as CommandCategory)) {
    return normalized as CommandCategory;
  }

  // Return as-is (may be invalid, caught by validation)
  return normalized as CommandCategory;
}

// ============================================================================
// Metadata Helpers
// ============================================================================

/**
 * Create a command metadata object with defaults
 */
export function createCommandMetadata(
  partial: Partial<CommandMetadata> & {
    description: string;
    syntax: string | readonly string[];
    examples: readonly string[];
    category: CommandCategory;
  }
): CommandMetadata {
  return {
    version: '1.0.0',
    isBlocking: false,
    hasBody: false,
    ...partial,
  };
}

/**
 * Merge command metadata with defaults
 */
export function mergeCommandMetadata(
  base: CommandMetadata,
  overrides: Partial<CommandMetadata>
): CommandMetadata {
  return {
    ...base,
    ...overrides,
    // Merge arrays instead of replacing
    examples: overrides.examples
      ? [...base.examples, ...overrides.examples]
      : base.examples,
    sideEffects: overrides.sideEffects
      ? [...(base.sideEffects ?? []), ...overrides.sideEffects]
      : base.sideEffects,
    aliases: overrides.aliases
      ? [...(base.aliases ?? []), ...overrides.aliases]
      : base.aliases,
    relatedCommands: overrides.relatedCommands
      ? [...(base.relatedCommands ?? []), ...overrides.relatedCommands]
      : base.relatedCommands,
  };
}

/**
 * Get syntax as array (normalizes single string to array)
 */
export function getSyntaxArray(metadata: CommandMetadata): readonly string[] {
  return Array.isArray(metadata.syntax) ? metadata.syntax : [metadata.syntax];
}

/**
 * Format metadata for documentation
 */
export function formatMetadataForDocs(
  commandName: string,
  metadata: CommandMetadata
): string {
  const lines: string[] = [];

  lines.push(`## ${commandName}`);
  lines.push('');
  lines.push(metadata.description);
  lines.push('');

  lines.push('### Syntax');
  lines.push('');
  const syntaxes = getSyntaxArray(metadata);
  for (const syntax of syntaxes) {
    lines.push(`\`\`\`hyperscript`);
    lines.push(syntax);
    lines.push(`\`\`\``);
  }
  lines.push('');

  lines.push('### Examples');
  lines.push('');
  for (const example of metadata.examples) {
    lines.push(`\`\`\`hyperscript`);
    lines.push(example);
    lines.push(`\`\`\``);
  }
  lines.push('');

  lines.push(`**Category:** ${metadata.category}`);

  if (metadata.sideEffects && metadata.sideEffects.length > 0) {
    lines.push(`**Side Effects:** ${metadata.sideEffects.join(', ')}`);
  }

  if (metadata.deprecated) {
    lines.push(`**DEPRECATED:** ${metadata.deprecationMessage || 'This command is deprecated.'}`);
  }

  if (metadata.relatedCommands && metadata.relatedCommands.length > 0) {
    lines.push(`**See Also:** ${metadata.relatedCommands.join(', ')}`);
  }

  return lines.join('\n');
}

// ============================================================================
// Command Registry Types
// ============================================================================

/**
 * Command registration entry
 */
export interface CommandRegistryEntry {
  readonly name: string;
  readonly metadata: CommandMetadata;
  readonly implementation: unknown; // Actual command class/function
}

/**
 * Command metadata registry for tooling
 */
export class CommandMetadataRegistry {
  private commands: Map<string, CommandRegistryEntry> = new Map();

  /**
   * Register a command with its metadata
   */
  register(name: string, metadata: CommandMetadata, implementation: unknown): void {
    const validation = validateCommandMetadata(metadata, name);
    if (!validation.isValid) {
      console.warn(`CommandMetadataRegistry: Invalid metadata for '${name}':`, validation.errors);
    }
    if (validation.warnings.length > 0) {
      console.debug(`CommandMetadataRegistry: Warnings for '${name}':`, validation.warnings);
    }

    this.commands.set(name, { name, metadata, implementation });
  }

  /**
   * Get command entry by name
   */
  get(name: string): CommandRegistryEntry | undefined {
    return this.commands.get(name);
  }

  /**
   * Get all command names
   */
  getCommandNames(): string[] {
    return Array.from(this.commands.keys());
  }

  /**
   * Get commands by category
   */
  getByCategory(category: CommandCategory): CommandRegistryEntry[] {
    return Array.from(this.commands.values()).filter(
      (entry) => entry.metadata.category === category
    );
  }

  /**
   * Get all deprecated commands
   */
  getDeprecated(): CommandRegistryEntry[] {
    return Array.from(this.commands.values()).filter((entry) => entry.metadata.deprecated);
  }

  /**
   * Validate all registered commands
   */
  validateAll(): Map<string, MetadataValidationResult> {
    const results = new Map<string, MetadataValidationResult>();
    for (const [name, entry] of this.commands) {
      results.set(name, validateCommandMetadata(entry.metadata, name));
    }
    return results;
  }

  /**
   * Generate documentation for all commands
   */
  generateDocs(): string {
    const sections: string[] = [];

    // Group by category
    const byCategory = new Map<CommandCategory, CommandRegistryEntry[]>();
    for (const entry of this.commands.values()) {
      const category = entry.metadata.category;
      if (!byCategory.has(category)) {
        byCategory.set(category, []);
      }
      byCategory.get(category)!.push(entry);
    }

    // Generate docs for each category
    for (const category of COMMAND_CATEGORIES) {
      const commands = byCategory.get(category);
      if (!commands || commands.length === 0) continue;

      sections.push(`# ${category.charAt(0).toUpperCase() + category.slice(1)} Commands`);
      sections.push('');

      for (const entry of commands.sort((a, b) => a.name.localeCompare(b.name))) {
        sections.push(formatMetadataForDocs(entry.name, entry.metadata));
        sections.push('');
        sections.push('---');
        sections.push('');
      }
    }

    return sections.join('\n');
  }
}

/**
 * Default global command metadata registry
 */
export const commandMetadataRegistry = new CommandMetadataRegistry();
