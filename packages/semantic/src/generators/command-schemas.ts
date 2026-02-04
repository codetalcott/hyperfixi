/**
 * Command Schemas
 *
 * Defines the semantic structure of each hyperscript command.
 * Used by the pattern generator to create language-specific patterns.
 */

import type { SemanticRole, ActionType, SemanticValue } from '../types';

// =============================================================================
// Command Schema Types
// =============================================================================

/**
 * A role specification in a command schema.
 */
export interface RoleSpec {
  /** The semantic role */
  readonly role: SemanticRole;
  /** Description of what this role represents */
  readonly description: string;
  /** Whether this role is required */
  readonly required: boolean;
  /** Expected value types */
  readonly expectedTypes: Array<'selector' | 'literal' | 'reference' | 'expression'>;
  /** Default value if not provided */
  readonly default?: SemanticValue;
  /** Position hint for SVO languages (higher = earlier) */
  readonly svoPosition?: number;
  /** Position hint for SOV languages (higher = earlier) */
  readonly sovPosition?: number;
  /**
   * Override the default role marker for this command.
   * Maps language code to the marker to use (e.g., { en: 'to', es: 'a' }).
   * If not specified, uses the language profile's default roleMarker.
   */
  readonly markerOverride?: Record<string, string>;
}

/**
 * A precondition that must be met before command execution.
 * Used for runtime error documentation.
 */
export interface CommandPrecondition {
  /** Human-readable condition description */
  readonly condition: string;
  /** Error code thrown when precondition fails */
  readonly errorCode: string;
  /** Error message template */
  readonly message: string;
}

/**
 * A command schema defines the semantic structure of a command.
 */
export interface CommandSchema {
  /** The action type (command name) */
  readonly action: ActionType;
  /** Human-readable description */
  readonly description: string;
  /** Roles this command accepts */
  readonly roles: RoleSpec[];
  /** The primary role (what the command acts on) */
  readonly primaryRole: SemanticRole;
  /** Category for grouping */
  readonly category: CommandCategory;
  /** Whether this command typically has a body (like event handlers) */
  readonly hasBody?: boolean;
  /** Notes about special handling */
  readonly notes?: string;

  // Runtime error documentation (optional for backward compatibility)

  /** Possible runtime error codes this command can throw */
  readonly errorCodes?: readonly string[];
  /** Preconditions that must be met before execution */
  readonly preconditions?: readonly CommandPrecondition[];
  /** Recovery hints mapping error code to suggestion */
  readonly recoveryHints?: Readonly<Record<string, string>>;
}

/**
 * Command categories for organization.
 */
export type CommandCategory =
  | 'dom-class' // Class/attribute manipulation
  | 'dom-content' // Content manipulation
  | 'dom-visibility' // Show/hide
  | 'variable' // Variable operations
  | 'event' // Event handling
  | 'async' // Async operations
  | 'navigation' // URL/navigation
  | 'control-flow'; // Control flow

// =============================================================================
// Command Schema Definitions
// =============================================================================

/**
 * Toggle command: adds class/attribute if absent, removes if present.
 *
 * Patterns:
 * - EN: toggle .active on #button
 * - JA: #button の .active を 切り替え
 * - AR: بدّل .active على #button
 */
export const toggleSchema: CommandSchema = {
  action: 'toggle',
  description: 'Toggle a class or attribute on/off',
  category: 'dom-class',
  primaryRole: 'patient',
  roles: [
    {
      role: 'patient',
      description: 'The class or attribute to toggle',
      required: true,
      expectedTypes: ['selector'],
      svoPosition: 1,
      sovPosition: 2,
    },
    {
      role: 'destination',
      description: 'The target element (defaults to me)',
      required: false,
      expectedTypes: ['selector', 'reference'],
      default: { type: 'reference', value: 'me' },
      svoPosition: 2,
      sovPosition: 1,
    },
  ],
  // Runtime error documentation
  errorCodes: ['MISSING_ARGUMENT', 'NO_VALID_CLASS_NAMES', 'INVALID_CSS_PROPERTY'],
  preconditions: [
    {
      condition: 'Command has at least one argument',
      errorCode: 'MISSING_ARGUMENT',
      message: 'toggle command requires an argument',
    },
    {
      condition: 'Class names are valid CSS identifiers',
      errorCode: 'NO_VALID_CLASS_NAMES',
      message: 'toggle command: no valid class names found',
    },
  ],
  recoveryHints: {
    MISSING_ARGUMENT: 'Add a class selector (.classname) or attribute to toggle',
    NO_VALID_CLASS_NAMES: 'Ensure class names start with a dot (.) and are valid CSS identifiers',
    INVALID_CSS_PROPERTY: 'Check CSS property name syntax (use kebab-case)',
  },
};

/**
 * Add command: adds a class or attribute.
 */
export const addSchema: CommandSchema = {
  action: 'add',
  description: 'Add a class or attribute to an element',
  category: 'dom-class',
  primaryRole: 'patient',
  roles: [
    {
      role: 'patient',
      description: 'The class or attribute to add',
      required: true,
      expectedTypes: ['selector'],
      svoPosition: 1,
      sovPosition: 2,
    },
    {
      role: 'destination',
      description: 'The target element (defaults to me)',
      required: false,
      expectedTypes: ['selector', 'reference'],
      default: { type: 'reference', value: 'me' },
      svoPosition: 2,
      sovPosition: 1,
    },
  ],
  // Runtime error documentation
  errorCodes: ['MISSING_ARGUMENT', 'NO_VALID_CLASS_NAMES', 'PROPERTY_REQUIRES_VALUE'],
  preconditions: [
    {
      condition: 'Command has at least one argument',
      errorCode: 'MISSING_ARGUMENT',
      message: 'add command requires an argument',
    },
  ],
  recoveryHints: {
    MISSING_ARGUMENT: 'Add a class selector (.classname) or attribute to add',
    NO_VALID_CLASS_NAMES: 'Ensure class names start with a dot (.) and are valid CSS identifiers',
    PROPERTY_REQUIRES_VALUE: 'When adding a property (*prop), provide a value argument',
  },
};

/**
 * Remove command: removes a class or attribute.
 */
export const removeSchema: CommandSchema = {
  action: 'remove',
  description: 'Remove a class or attribute from an element',
  category: 'dom-class',
  primaryRole: 'patient',
  roles: [
    {
      role: 'patient',
      description: 'The class or attribute to remove',
      required: true,
      expectedTypes: ['selector'],
      svoPosition: 1,
      sovPosition: 2,
    },
    {
      role: 'source',
      description: 'The element to remove from (defaults to me)',
      required: false,
      expectedTypes: ['selector', 'reference'],
      default: { type: 'reference', value: 'me' },
      svoPosition: 2,
      sovPosition: 1,
    },
  ],
  // Runtime error documentation
  errorCodes: ['MISSING_ARGUMENT', 'NO_VALID_CLASS_NAMES'],
  preconditions: [
    {
      condition: 'Command has at least one argument',
      errorCode: 'MISSING_ARGUMENT',
      message: 'remove command requires an argument',
    },
  ],
  recoveryHints: {
    MISSING_ARGUMENT: 'Add a class selector (.classname) or attribute to remove',
    NO_VALID_CLASS_NAMES: 'Ensure class names start with a dot (.) and are valid CSS identifiers',
  },
};

/**
 * Put command: puts content into a target.
 *
 * Patterns:
 * - EN: put "hello" into #output
 * - JA: #output に "hello" を 置く
 * - AR: ضع "hello" في #output
 */
export const putSchema: CommandSchema = {
  action: 'put',
  description: 'Put content into a target element or variable',
  category: 'dom-content',
  primaryRole: 'patient',
  roles: [
    {
      role: 'patient',
      description: 'The content to put',
      required: true,
      expectedTypes: ['literal', 'selector', 'reference', 'expression'],
      svoPosition: 1,
      sovPosition: 1, // SOV: patient comes first (を marker)
    },
    {
      role: 'destination',
      description: 'Where to put the content',
      required: true,
      expectedTypes: ['selector', 'reference'],
      svoPosition: 2,
      sovPosition: 2, // SOV: destination comes second (に/에/a marker)
    },
  ],
  // Runtime error documentation
  errorCodes: [
    'MISSING_ARGUMENTS',
    'MISSING_CONTENT',
    'MISSING_POSITION',
    'INVALID_POSITION',
    'NO_TARGET',
    'NO_ELEMENTS',
  ],
  preconditions: [
    {
      condition: 'Command has content and position arguments',
      errorCode: 'MISSING_ARGUMENTS',
      message: 'put requires arguments',
    },
    {
      condition: 'Content to put is specified',
      errorCode: 'MISSING_CONTENT',
      message: 'put requires content',
    },
    {
      condition: 'Position keyword is specified (into, before, after, etc.)',
      errorCode: 'MISSING_POSITION',
      message: 'put requires position keyword',
    },
  ],
  recoveryHints: {
    MISSING_ARGUMENTS: 'Use syntax: put <content> into/before/after <target>',
    MISSING_CONTENT: 'Add content to put (string, element, or expression)',
    MISSING_POSITION: 'Add position keyword: into, before, after, at start of, at end of',
    INVALID_POSITION: 'Valid positions: into, before, after, at start of, at end of',
    NO_TARGET: 'Ensure target element exists or use "me" reference',
    NO_ELEMENTS: 'Check that the selector matches existing elements',
  },
};

/**
 * Set command: sets a property or variable.
 *
 * Patterns:
 * - EN: set :count to 10
 * - ES: establecer :count a 10
 * - JA: :count を 10 に 設定
 * - KO: :x 에 5 을 설정 (uses default markers)
 * - TR: :x e 5 i ayarla (uses default markers)
 *
 * Note: Only override markers for SVO languages where patient has no default marker.
 * SOV languages (Korean, Japanese, Turkish) already have correct object markers.
 */
export const setSchema: CommandSchema = {
  action: 'set',
  description: 'Set a property or variable to a value',
  category: 'variable',
  primaryRole: 'destination',
  roles: [
    {
      role: 'destination',
      description: 'The property or variable to set',
      required: true,
      expectedTypes: ['selector', 'reference', 'expression'],
      svoPosition: 1,
      sovPosition: 1,
      // Override destination marker for English (remove 'on', use no marker)
      // SOV languages swap markers: variable gets patient marker (を/를/i)
      // Arabic (VSO): no marker before variable
      markerOverride: {
        en: '', // No marker before destination in English: "set :x to 5"
        ja: 'を', // "x を 10 に 設定" - variable gets object marker
        ko: '를', // "x 를 10 으로 설정" - variable gets object marker
        tr: 'i', // "x i 10 e ayarla" - variable gets accusative marker
        ar: '', // "عيّن x إلى 10" - no marker before variable
        sw: '', // "seti x kwenye 10" - no marker before variable
        tl: '', // "itakda x sa 10" - no marker before variable
        bn: 'কে', // "x কে 10 তে সেট" - patient marker on variable
        qu: 'ta', // "x ta 10 man churay" - patient marker on variable
      },
    },
    {
      role: 'patient',
      description: 'The value to set',
      required: true,
      expectedTypes: ['literal', 'expression', 'reference'],
      svoPosition: 2,
      sovPosition: 2,
      // Override patient marker for SVO languages with their native prepositions
      // SOV languages swap markers: value gets destination marker (に/으로/e)
      // Arabic (VSO): إلى preposition before value
      markerOverride: {
        en: 'to', // "set :x to 5"
        es: 'a', // "establecer x a 10"
        pt: 'para', // "definir x para 10"
        fr: 'à', // "définir x à 10"
        de: 'auf', // "setze x auf 10"
        id: 'ke', // "atur x ke 10"
        ja: 'に', // "x を 10 に 設定" - value gets destination marker
        ko: '으로', // "x 를 10 으로 설정" - value gets manner/instrument marker
        tr: 'e', // "x i 10 e ayarla" - value gets dative marker
        ar: 'إلى', // "عيّن x إلى 10" - value gets preposition "to"
        sw: 'kwenye', // "seti x kwenye 10" - destination prep before value
        tl: 'sa', // "itakda x sa 10" - destination prep before value
        bn: 'তে', // "x কে 10 তে সেট" - destination marker on value
        qu: 'man', // "x ta 10 man churay" - destination marker on value
      },
    },
  ],
  // Runtime error documentation
  errorCodes: ['MISSING_TARGET', 'INVALID_TARGET', 'MISSING_VALUE', 'INVALID_SYNTAX'],
  preconditions: [
    {
      condition: 'Command has a target variable or property',
      errorCode: 'MISSING_TARGET',
      message: 'set command requires a target',
    },
    {
      condition: 'Target is a valid variable or property reference',
      errorCode: 'INVALID_TARGET',
      message: 'set command target must be a string or object literal',
    },
    {
      condition: 'Value is specified with "to" keyword',
      errorCode: 'MISSING_VALUE',
      message: 'set command requires a value (use "to" keyword)',
    },
  ],
  recoveryHints: {
    MISSING_TARGET: 'Add a target: set :variable to value OR set element.property to value',
    INVALID_TARGET:
      'Use local variable (:name), element property (el.prop), or "the X of Y" syntax',
    MISSING_VALUE: 'Add "to <value>" to specify what to set',
    INVALID_SYNTAX: 'Use syntax: set <target> to <value>',
  },
};

/**
 * Show command: makes an element visible.
 */
export const showSchema: CommandSchema = {
  action: 'show',
  description: 'Make an element visible',
  category: 'dom-visibility',
  primaryRole: 'patient',
  roles: [
    {
      role: 'patient',
      description: 'The element to show',
      required: true, // Changed from false - patient is primary role
      expectedTypes: ['selector', 'reference'],
      default: { type: 'reference', value: 'me' },
      svoPosition: 1,
      sovPosition: 1,
    },
    {
      role: 'style',
      description: 'Animation style (fade, slide, etc.)',
      required: false,
      expectedTypes: ['literal'],
      svoPosition: 2,
      sovPosition: 2,
    },
  ],
};

/**
 * Hide command: makes an element invisible.
 */
export const hideSchema: CommandSchema = {
  action: 'hide',
  description: 'Make an element invisible',
  category: 'dom-visibility',
  primaryRole: 'patient',
  roles: [
    {
      role: 'patient',
      description: 'The element to hide',
      required: true, // Changed from false - patient is primary role
      expectedTypes: ['selector', 'reference'],
      default: { type: 'reference', value: 'me' },
      svoPosition: 1,
      sovPosition: 1,
    },
    {
      role: 'style',
      description: 'Animation style (fade, slide, etc.)',
      required: false,
      expectedTypes: ['literal'],
      svoPosition: 2,
      sovPosition: 2,
    },
  ],
};

/**
 * On command: event handler.
 */
export const onSchema: CommandSchema = {
  action: 'on',
  description: 'Handle an event',
  category: 'event',
  primaryRole: 'event',
  hasBody: true,
  roles: [
    {
      role: 'event',
      description: 'The event to handle',
      required: true,
      expectedTypes: ['literal'],
      svoPosition: 1,
      sovPosition: 2,
    },
    {
      role: 'source',
      description: 'The element to listen on (defaults to me)',
      required: false,
      expectedTypes: ['selector', 'reference'],
      default: { type: 'reference', value: 'me' },
      svoPosition: 2,
      sovPosition: 1,
    },
  ],
};

/**
 * Trigger command: dispatches an event.
 * Supports namespaced events like "draggable:start".
 */
export const triggerSchema: CommandSchema = {
  action: 'trigger',
  description: 'Trigger/dispatch an event',
  category: 'event',
  primaryRole: 'event',
  roles: [
    {
      role: 'event',
      description: 'The event to trigger (supports namespaced events like draggable:start)',
      required: true,
      expectedTypes: ['literal', 'expression'], // expression for custom/namespaced event names
      svoPosition: 1,
      sovPosition: 2,
    },
    {
      role: 'destination',
      description: 'The target element (defaults to me)',
      required: false,
      expectedTypes: ['selector', 'reference'],
      default: { type: 'reference', value: 'me' },
      svoPosition: 2,
      sovPosition: 1,
    },
  ],
};

/**
 * Wait command: pauses execution.
 */
export const waitSchema: CommandSchema = {
  action: 'wait',
  description: 'Wait for a duration or event',
  category: 'async',
  primaryRole: 'patient',
  roles: [
    {
      role: 'patient',
      description: 'Duration or event to wait for',
      required: true,
      expectedTypes: ['literal', 'expression'],
      svoPosition: 1,
      sovPosition: 1,
    },
  ],
};

/**
 * Fetch command: makes HTTP request.
 */
export const fetchSchema: CommandSchema = {
  action: 'fetch',
  description: 'Fetch data from a URL',
  category: 'async',
  primaryRole: 'source',
  roles: [
    {
      role: 'source',
      description: 'The URL to fetch from',
      required: true,
      expectedTypes: ['literal', 'expression'],
      svoPosition: 1,
      sovPosition: 1,
    },
    {
      role: 'responseType',
      description: 'Response format (json, text, html, blob, etc.)',
      required: false,
      expectedTypes: ['literal', 'expression'], // json/text/html are identifiers → expression type
      svoPosition: 2,
      sovPosition: 2,
    },
    {
      role: 'method',
      description: 'HTTP method (GET, POST, etc.)',
      required: false,
      expectedTypes: ['literal'],
      svoPosition: 3,
      sovPosition: 3,
    },
    {
      role: 'destination',
      description: 'Where to store the result',
      required: false,
      expectedTypes: ['selector', 'reference'],
      svoPosition: 4,
      sovPosition: 4,
    },
  ],
};

/**
 * Increment command: increases a numeric value.
 */
export const incrementSchema: CommandSchema = {
  action: 'increment',
  description: 'Increment a numeric value',
  category: 'variable',
  primaryRole: 'patient',
  roles: [
    {
      role: 'patient',
      description: 'The value to increment',
      required: true,
      expectedTypes: ['selector', 'reference', 'expression'],
      svoPosition: 1,
      sovPosition: 1,
    },
    {
      role: 'quantity',
      description: 'Amount to increment by (defaults to 1)',
      required: false,
      expectedTypes: ['literal'],
      default: { type: 'literal', value: 1, dataType: 'number' },
      svoPosition: 2,
      sovPosition: 2,
    },
  ],
};

/**
 * Decrement command: decreases a numeric value.
 */
export const decrementSchema: CommandSchema = {
  action: 'decrement',
  description: 'Decrement a numeric value',
  category: 'variable',
  primaryRole: 'patient',
  roles: [
    {
      role: 'patient',
      description: 'The value to decrement',
      required: true,
      expectedTypes: ['selector', 'reference', 'expression'],
      svoPosition: 1,
      sovPosition: 1,
    },
    {
      role: 'quantity',
      description: 'Amount to decrement by (defaults to 1)',
      required: false,
      expectedTypes: ['literal'],
      default: { type: 'literal', value: 1, dataType: 'number' },
      svoPosition: 2,
      sovPosition: 2,
    },
  ],
};

/**
 * Append command: appends content to an element.
 */
export const appendSchema: CommandSchema = {
  action: 'append',
  description: 'Append content to an element',
  category: 'dom-content',
  primaryRole: 'patient',
  roles: [
    {
      role: 'patient',
      description: 'The content to append',
      required: true,
      expectedTypes: ['literal', 'selector', 'expression'],
      svoPosition: 1,
      sovPosition: 2,
    },
    {
      role: 'destination',
      description: 'The element to append to',
      required: true,
      expectedTypes: ['selector', 'reference'],
      svoPosition: 2,
      sovPosition: 1,
    },
  ],
};

/**
 * Prepend command: prepends content to an element.
 */
export const prependSchema: CommandSchema = {
  action: 'prepend',
  description: 'Prepend content to an element',
  category: 'dom-content',
  primaryRole: 'patient',
  roles: [
    {
      role: 'patient',
      description: 'The content to prepend',
      required: true,
      expectedTypes: ['literal', 'selector', 'expression'],
      svoPosition: 1,
      sovPosition: 2,
    },
    {
      role: 'destination',
      description: 'The element to prepend to',
      required: true,
      expectedTypes: ['selector', 'reference'],
      svoPosition: 2,
      sovPosition: 1,
    },
  ],
};

// =============================================================================
// Batch 1 - Simple Commands
// =============================================================================

/**
 * Log command: logs a value to console.
 */
export const logSchema: CommandSchema = {
  action: 'log',
  description: 'Log a value to the console',
  category: 'variable',
  primaryRole: 'patient',
  roles: [
    {
      role: 'patient',
      description: 'The value to log',
      required: true,
      expectedTypes: ['literal', 'selector', 'reference', 'expression'],
      svoPosition: 1,
      sovPosition: 1,
    },
  ],
};

/**
 * Get command: retrieves a value.
 */
export const getCommandSchema: CommandSchema = {
  action: 'get',
  description: 'Get a value from a source',
  category: 'variable',
  primaryRole: 'source',
  roles: [
    {
      role: 'source',
      description: 'The source to get from',
      required: true,
      expectedTypes: ['selector', 'reference', 'expression'],
      svoPosition: 1,
      sovPosition: 2,
      // Marker overrides for GET pattern
      // SOV languages use object markers, SVO languages have no marker
      markerOverride: {
        en: '',
        es: '',
        pt: '',
        fr: '',
        de: '',
        ja: 'を', // Japanese object marker: #element を 取得
        zh: '',
        ko: '를', // Korean object marker: #element 를 가져오기
        ar: 'على', // Arabic preposition: احصل على #element
        tr: 'i', // Turkish accusative: #element i al
        id: '',
        sw: '', // Swahili SVO: pata #element (no marker)
        tl: '', // Tagalog VSO: kunin #element (no marker)
        bn: 'কে', // Bengali SOV: #element কে পান (patient marker)
        qu: 'ta', // Quechua SOV: #element ta taripay (patient marker)
      },
    },
    {
      role: 'destination',
      description: 'Where to store the result (optional)',
      required: false,
      expectedTypes: ['reference'],
      svoPosition: 2,
      sovPosition: 1,
    },
  ],
};

/**
 * Take command: takes/removes content from a source.
 */
export const takeSchema: CommandSchema = {
  action: 'take',
  description: 'Take content from a source element',
  category: 'dom-content',
  primaryRole: 'patient',
  roles: [
    {
      role: 'patient',
      description: 'The class or element to take',
      required: true,
      expectedTypes: ['selector'],
      svoPosition: 1,
      sovPosition: 2,
    },
    {
      role: 'source',
      description: 'The element to take from (defaults to me)',
      required: false,
      expectedTypes: ['selector', 'reference'],
      default: { type: 'reference', value: 'me' },
      svoPosition: 2,
      sovPosition: 1,
    },
  ],
};

/**
 * Make command: creates a new element.
 */
export const makeSchema: CommandSchema = {
  action: 'make',
  description: 'Create a new element',
  category: 'dom-content',
  primaryRole: 'patient',
  roles: [
    {
      role: 'patient',
      description: 'The element type or selector to create',
      required: true,
      expectedTypes: ['literal', 'selector'],
      svoPosition: 1,
      sovPosition: 1,
    },
  ],
};

/**
 * Halt command: stops execution or event propagation.
 * Supports: halt, halt the event, halt default, halt the bubbling
 */
export const haltSchema: CommandSchema = {
  action: 'halt',
  description: 'Halt/stop execution or event propagation',
  category: 'control-flow',
  primaryRole: 'patient',
  roles: [
    {
      role: 'patient',
      description: 'What to halt (event, default, bubbling, etc.)',
      required: false, // Plain "halt" is valid
      expectedTypes: ['literal', 'reference', 'expression'],
      svoPosition: 1,
      sovPosition: 1,
    },
  ],
};

/**
 * Settle command: waits for animations to complete.
 */
export const settleSchema: CommandSchema = {
  action: 'settle',
  description: 'Wait for animations/transitions to settle',
  category: 'async',
  primaryRole: 'patient',
  roles: [
    {
      role: 'patient',
      description: 'The element to settle (defaults to me)',
      required: false,
      expectedTypes: ['selector', 'reference'],
      default: { type: 'reference', value: 'me' },
      svoPosition: 1,
      sovPosition: 1,
    },
  ],
};

/**
 * Throw command: throws an error/exception.
 */
export const throwSchema: CommandSchema = {
  action: 'throw',
  description: 'Throw an error',
  category: 'control-flow',
  primaryRole: 'patient',
  roles: [
    {
      role: 'patient',
      description: 'The error message or object to throw',
      required: true,
      expectedTypes: ['literal', 'expression'],
      svoPosition: 1,
      sovPosition: 1,
    },
  ],
};

/**
 * Send command: sends/dispatches an event.
 */
export const sendSchema: CommandSchema = {
  action: 'send',
  description: 'Send an event to an element',
  category: 'event',
  primaryRole: 'event',
  roles: [
    {
      role: 'event',
      description: 'The event to send',
      required: true,
      expectedTypes: ['literal', 'expression'], // identifiers tokenize as expression
      svoPosition: 1,
      sovPosition: 2,
    },
    {
      role: 'destination',
      description: 'The target element (defaults to me)',
      required: false,
      expectedTypes: ['selector', 'reference'],
      default: { type: 'reference', value: 'me' },
      svoPosition: 2,
      sovPosition: 1,
      // send uses "to" not "on" for destination: send foo to #target
      markerOverride: {
        en: 'to',
        ja: 'に',
        ar: 'إلى',
        es: 'a',
        ko: '에게',
        zh: '到',
        tr: '-e',
        pt: 'para',
        fr: 'à',
        de: 'an',
        id: 'ke',
        qu: '-man',
        sw: 'kwa',
      },
    },
  ],
};

// =============================================================================
// Batch 2 - Control Flow Commands
// =============================================================================

/**
 * If command: conditional execution.
 */
export const ifSchema: CommandSchema = {
  action: 'if',
  description: 'Conditional execution',
  category: 'control-flow',
  primaryRole: 'condition',
  hasBody: true,
  roles: [
    {
      role: 'condition',
      description: 'The condition to evaluate',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 1,
      sovPosition: 1,
    },
  ],
};

/**
 * Unless command: negated conditional execution.
 * Executes body when condition is false.
 */
export const unlessSchema: CommandSchema = {
  action: 'unless',
  description: 'Negated conditional execution (executes when condition is false)',
  category: 'control-flow',
  primaryRole: 'condition',
  hasBody: true,
  roles: [
    {
      role: 'condition',
      description: 'The condition to evaluate (body executes when false)',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 1,
      sovPosition: 1,
    },
  ],
};

/**
 * Else command: alternative branch.
 */
export const elseSchema: CommandSchema = {
  action: 'else',
  description: 'Else branch of conditional',
  category: 'control-flow',
  primaryRole: 'patient',
  hasBody: true,
  roles: [], // No roles - follows an if
};

/**
 * Repeat command: loop execution.
 */
export const repeatSchema: CommandSchema = {
  action: 'repeat',
  description: 'Repeat a block of commands',
  category: 'control-flow',
  primaryRole: 'loopType',
  hasBody: true,
  roles: [
    {
      role: 'loopType',
      description: 'Loop variant: forever, times, for, while, until, until-event',
      required: true,
      expectedTypes: ['literal'],
      svoPosition: 0,
      sovPosition: 0,
    },
    {
      role: 'quantity',
      description: 'Number of times to repeat',
      required: false,
      expectedTypes: ['literal', 'expression'],
      svoPosition: 1,
      sovPosition: 1,
    },
    {
      role: 'event',
      description: 'Event to wait for (terminates loop)',
      required: false,
      expectedTypes: ['literal', 'expression'],
      svoPosition: 2,
      sovPosition: 2,
    },
    {
      role: 'source',
      description: 'Element to listen for event on',
      required: false,
      expectedTypes: ['selector', 'reference'],
      svoPosition: 3,
      sovPosition: 3,
    },
  ],
  notes:
    'Can also use "repeat forever", "repeat until condition", or "repeat until event X from Y"',
};

/**
 * For command: iteration over collection.
 */
export const forSchema: CommandSchema = {
  action: 'for',
  description: 'Iterate over a collection',
  category: 'control-flow',
  primaryRole: 'patient',
  hasBody: true,
  roles: [
    {
      role: 'patient',
      description: 'The iteration variable',
      required: true,
      expectedTypes: ['reference'],
      svoPosition: 1,
      sovPosition: 2,
    },
    {
      role: 'source',
      description: 'The collection to iterate over',
      required: true,
      expectedTypes: ['selector', 'reference', 'expression'],
      svoPosition: 2,
      sovPosition: 1,
    },
  ],
};

/**
 * While command: conditional loop.
 */
export const whileSchema: CommandSchema = {
  action: 'while',
  description: 'Loop while condition is true',
  category: 'control-flow',
  primaryRole: 'condition',
  hasBody: true,
  roles: [
    {
      role: 'condition',
      description: 'The condition to check',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 1,
      sovPosition: 1,
    },
  ],
};

/**
 * Continue command: skip to next iteration.
 */
export const continueSchema: CommandSchema = {
  action: 'continue',
  description: 'Continue to next loop iteration',
  category: 'control-flow',
  primaryRole: 'patient',
  roles: [], // No roles
};

// =============================================================================
// Batch 3 - DOM & Navigation Commands
// =============================================================================

/**
 * Go command: navigates to a URL.
 */
export const goSchema: CommandSchema = {
  action: 'go',
  description: 'Navigate to a URL',
  category: 'navigation',
  primaryRole: 'destination',
  roles: [
    {
      role: 'destination',
      description: 'The URL to navigate to',
      required: true,
      expectedTypes: ['literal', 'expression'],
      svoPosition: 1,
      sovPosition: 1,
    },
  ],
};

/**
 * Transition command: animates element changes.
 */
export const transitionSchema: CommandSchema = {
  action: 'transition',
  description: 'Transition an element with animation',
  category: 'dom-visibility',
  primaryRole: 'patient',
  roles: [
    {
      role: 'patient',
      description: 'The property to transition (opacity, *background-color, etc.)',
      required: true,
      expectedTypes: ['literal'], // Only literal - CSS properties are strings, not selectors
      svoPosition: 1,
      sovPosition: 2,
      // No marker before the CSS property name (SVO/VSO languages)
      // SOV languages (bn, qu) use their default patient marker from profile
      markerOverride: { en: '', ar: '', tl: '', sw: '' },
    },
    {
      role: 'goal',
      description: 'The target value to transition to',
      required: true,
      expectedTypes: ['literal', 'expression'],
      svoPosition: 2,
      sovPosition: 3,
      // "to" preposition before goal value (same as set's patient marker)
      markerOverride: {
        en: 'to',
        ar: 'إلى',
        tl: 'sa',
        sw: 'kwenye',
        bn: 'তে',
        qu: 'man',
        es: 'a',
        pt: 'para',
        fr: 'à',
        de: 'auf',
        ja: 'に',
        ko: '으로',
        tr: 'e',
        id: 'ke',
      },
    },
    {
      role: 'destination',
      description: 'The target element (defaults to me)',
      required: false,
      expectedTypes: ['selector', 'reference'],
      default: { type: 'reference', value: 'me' },
      svoPosition: 3,
      sovPosition: 1,
    },
    {
      role: 'duration',
      description: 'Transition duration (over 500ms, for 2 seconds)',
      required: false,
      expectedTypes: ['literal'],
      svoPosition: 4,
      sovPosition: 4,
    },
    {
      role: 'style',
      description: 'Easing function (ease-in, linear, etc.)',
      required: false,
      expectedTypes: ['literal'],
      svoPosition: 5,
      sovPosition: 5,
    },
  ],
};

/**
 * Clone command: clones an element.
 */
export const cloneSchema: CommandSchema = {
  action: 'clone',
  description: 'Clone an element',
  category: 'dom-content',
  primaryRole: 'patient',
  roles: [
    {
      role: 'patient',
      description: 'The element to clone',
      required: true,
      expectedTypes: ['selector', 'reference'],
      svoPosition: 1,
      sovPosition: 2,
    },
    {
      role: 'destination',
      description: 'Where to put the clone',
      required: false,
      expectedTypes: ['selector', 'reference'],
      svoPosition: 2,
      sovPosition: 1,
    },
  ],
};

/**
 * Focus command: focuses an element.
 */
export const focusSchema: CommandSchema = {
  action: 'focus',
  description: 'Focus an element',
  category: 'dom-content',
  primaryRole: 'patient',
  roles: [
    {
      role: 'patient',
      description: 'The element to focus (defaults to me)',
      required: false,
      expectedTypes: ['selector', 'reference'],
      default: { type: 'reference', value: 'me' },
      svoPosition: 1,
      sovPosition: 1,
    },
  ],
};

/**
 * Blur command: removes focus from an element.
 */
export const blurSchema: CommandSchema = {
  action: 'blur',
  description: 'Remove focus from an element',
  category: 'dom-content',
  primaryRole: 'patient',
  roles: [
    {
      role: 'patient',
      description: 'The element to blur (defaults to me)',
      required: false,
      expectedTypes: ['selector', 'reference'],
      default: { type: 'reference', value: 'me' },
      svoPosition: 1,
      sovPosition: 1,
    },
  ],
};

// =============================================================================
// Batch 4 - Advanced Commands
// =============================================================================

/**
 * Call command: calls a function.
 */
export const callSchema: CommandSchema = {
  action: 'call',
  description: 'Call a function',
  category: 'control-flow',
  primaryRole: 'patient',
  roles: [
    {
      role: 'patient',
      description: 'The function to call',
      required: true,
      expectedTypes: ['expression', 'reference'],
      svoPosition: 1,
      sovPosition: 1,
    },
  ],
};

/**
 * Return command: returns a value.
 */
export const returnSchema: CommandSchema = {
  action: 'return',
  description: 'Return a value from a function',
  category: 'control-flow',
  primaryRole: 'patient',
  roles: [
    {
      role: 'patient',
      description: 'The value to return',
      required: false,
      expectedTypes: ['literal', 'expression', 'reference'],
      svoPosition: 1,
      sovPosition: 1,
    },
  ],
};

/**
 * JS command: executes raw JavaScript.
 */
export const jsSchema: CommandSchema = {
  action: 'js',
  description: 'Execute raw JavaScript code',
  category: 'control-flow',
  primaryRole: 'patient',
  hasBody: true,
  roles: [
    {
      role: 'patient',
      description: 'The JavaScript code to execute',
      required: false,
      expectedTypes: ['expression'],
      svoPosition: 1,
      sovPosition: 1,
    },
  ],
};

/**
 * Async command: runs commands asynchronously.
 */
export const asyncSchema: CommandSchema = {
  action: 'async',
  description: 'Execute commands asynchronously',
  category: 'async',
  primaryRole: 'patient',
  hasBody: true,
  roles: [],
};

/**
 * Tell command: sends commands to another element.
 */
export const tellSchema: CommandSchema = {
  action: 'tell',
  description: 'Execute commands in context of another element',
  category: 'control-flow',
  primaryRole: 'destination',
  hasBody: true,
  roles: [
    {
      role: 'destination',
      description: 'The element to tell',
      required: true,
      expectedTypes: ['selector', 'reference'],
      svoPosition: 1,
      sovPosition: 1,
    },
  ],
};

/**
 * Default command: sets default values.
 */
export const defaultSchema: CommandSchema = {
  action: 'default',
  description: 'Set a default value for a variable',
  category: 'variable',
  primaryRole: 'destination',
  roles: [
    {
      role: 'destination',
      description: 'The variable to set default for',
      required: true,
      expectedTypes: ['reference'],
      svoPosition: 1,
      sovPosition: 1,
      // Same overrides as SET: no marker before variable in VSO/SVO
      markerOverride: {
        en: '',
        ar: '',
        tl: '',
        sw: '',
        bn: 'কে',
        qu: 'ta',
      },
    },
    {
      role: 'patient',
      description: 'The default value',
      required: true,
      expectedTypes: ['literal', 'expression'],
      svoPosition: 2,
      sovPosition: 2,
      // Same overrides as SET: value gets destination preposition
      markerOverride: {
        en: 'to',
        ar: 'إلى',
        tl: 'sa',
        sw: 'kwenye',
        bn: 'তে',
        qu: 'man',
      },
    },
  ],
};

/**
 * Init command: initialization block.
 */
export const initSchema: CommandSchema = {
  action: 'init',
  description: 'Initialization block that runs once',
  category: 'control-flow',
  primaryRole: 'patient',
  hasBody: true,
  roles: [],
};

/**
 * Behavior command: defines reusable behavior.
 * Patterns:
 * - EN: behavior Draggable
 * - EN: behavior Draggable(dragHandle)
 */
export const behaviorSchema: CommandSchema = {
  action: 'behavior',
  description: 'Define a reusable behavior',
  category: 'control-flow',
  primaryRole: 'patient',
  hasBody: true,
  roles: [
    {
      role: 'patient',
      description: 'The behavior name (PascalCase identifier)',
      required: true,
      expectedTypes: ['literal', 'reference', 'expression'], // expression for PascalCase identifiers
      svoPosition: 1,
      sovPosition: 1,
    },
  ],
};

/**
 * Install command: installs a behavior on an element.
 * Patterns:
 * - EN: install Draggable
 * - EN: install Draggable(dragHandle: .titlebar)
 * - EN: install Draggable on #element
 */
export const installSchema: CommandSchema = {
  action: 'install',
  description: 'Install a behavior on an element',
  category: 'control-flow',
  primaryRole: 'patient',
  roles: [
    {
      role: 'patient',
      description: 'The behavior name to install',
      required: true,
      expectedTypes: ['literal', 'reference', 'expression'],
      svoPosition: 1,
      sovPosition: 2,
    },
    {
      role: 'destination',
      description: 'Element to install on (defaults to me)',
      required: false,
      expectedTypes: ['selector', 'reference'],
      default: { type: 'reference', value: 'me' },
      svoPosition: 2,
      sovPosition: 1,
    },
  ],
};

/**
 * Measure command: measures element dimensions or position.
 * Patterns:
 * - EN: measure x
 * - EN: measure width
 * - EN: measure width of #element
 */
export const measureSchema: CommandSchema = {
  action: 'measure',
  description: 'Measure element dimensions (x, y, width, height, etc.)',
  category: 'dom-content',
  primaryRole: 'patient',
  roles: [
    {
      role: 'patient',
      description: 'Property to measure (x, y, width, height, top, left, etc.)',
      required: false, // Plain "measure" is valid, defaults to bounds
      expectedTypes: ['literal', 'expression'],
      svoPosition: 1,
      sovPosition: 1,
    },
    {
      role: 'source',
      description: 'Element to measure (defaults to me)',
      required: false,
      expectedTypes: ['selector', 'reference'],
      default: { type: 'reference', value: 'me' },
      svoPosition: 2,
      sovPosition: 2,
    },
  ],
};

// =============================================================================
// Batch 5 - DOM Content Manipulation
// =============================================================================

/**
 * Swap command: swaps DOM content using various strategies.
 *
 * Patterns:
 * - EN: swap innerHTML of #target
 * - EN: swap delete #target
 * - EN: swap beforebegin #target with <html>
 */
export const swapSchema: CommandSchema = {
  action: 'swap',
  description: 'Swap DOM content using various strategies (innerHTML, outerHTML, delete, etc.)',
  category: 'dom-content',
  primaryRole: 'destination',
  roles: [
    {
      role: 'method',
      description: 'The swap strategy (innerHTML, outerHTML, beforebegin, afterend, delete)',
      required: false,
      expectedTypes: ['literal'],
      svoPosition: 1,
      sovPosition: 3,
    },
    {
      role: 'destination',
      description: 'The element to swap content in/for',
      required: true,
      expectedTypes: ['selector', 'reference'],
      svoPosition: 2,
      sovPosition: 1,
    },
    {
      role: 'patient',
      description: 'The content to swap in (optional for delete)',
      required: false,
      expectedTypes: ['literal', 'expression', 'selector'],
      svoPosition: 3,
      sovPosition: 2,
    },
  ],
};

/**
 * Morph command: morphs one element into another using DOM diffing.
 *
 * Patterns:
 * - EN: morph #target to <html>
 * - EN: morph me into #template
 */
export const morphSchema: CommandSchema = {
  action: 'morph',
  description: 'Morph an element into another using DOM diffing',
  category: 'dom-content',
  primaryRole: 'destination',
  roles: [
    {
      role: 'destination',
      description: 'The element to morph',
      required: true,
      expectedTypes: ['selector', 'reference'],
      svoPosition: 1,
      sovPosition: 1,
    },
    {
      role: 'patient',
      description: 'The target content/element to morph into',
      required: true,
      expectedTypes: ['literal', 'expression', 'selector'],
      svoPosition: 2,
      sovPosition: 2,
    },
  ],
};

// =============================================================================
// Schema Registry
// =============================================================================

/**
 * All available command schemas.
 */
export const commandSchemas: Record<ActionType, CommandSchema> = {
  // Original schemas
  toggle: toggleSchema,
  add: addSchema,
  remove: removeSchema,
  put: putSchema,
  set: setSchema,
  show: showSchema,
  hide: hideSchema,
  on: onSchema,
  trigger: triggerSchema,
  wait: waitSchema,
  fetch: fetchSchema,
  increment: incrementSchema,
  decrement: decrementSchema,
  append: appendSchema,
  prepend: prependSchema,
  // Batch 1 - Simple Commands
  log: logSchema,
  get: getCommandSchema,
  take: takeSchema,
  make: makeSchema,
  halt: haltSchema,
  settle: settleSchema,
  throw: throwSchema,
  send: sendSchema,
  // Batch 2 - Control Flow
  if: ifSchema,
  unless: unlessSchema,
  else: elseSchema,
  repeat: repeatSchema,
  for: forSchema,
  while: whileSchema,
  continue: continueSchema,
  // Batch 3 - DOM & Navigation
  go: goSchema,
  transition: transitionSchema,
  clone: cloneSchema,
  focus: focusSchema,
  blur: blurSchema,
  // Batch 4 - Advanced
  call: callSchema,
  return: returnSchema,
  js: jsSchema,
  async: asyncSchema,
  tell: tellSchema,
  default: defaultSchema,
  init: initSchema,
  behavior: behaviorSchema,
  install: installSchema,
  measure: measureSchema,
  // Batch 5 - DOM Content Manipulation
  swap: swapSchema,
  morph: morphSchema,
  // Meta commands (for compound structures)
  compound: {
    action: 'compound',
    description: 'A compound node representing chained statements',
    primaryRole: 'patient', // Compound nodes don't have a traditional primary role
    category: 'control-flow',
    hasBody: true,
    roles: [],
  },
};

/**
 * Get a command schema by action type.
 */
export function getSchema(action: ActionType): CommandSchema | undefined {
  return commandSchemas[action];
}

/**
 * Get all schemas for a category.
 */
export function getSchemasByCategory(category: CommandCategory): CommandSchema[] {
  return Object.values(commandSchemas).filter(s => s.category === category);
}

/**
 * Get all fully-defined schemas (with roles).
 */
export function getDefinedSchemas(): CommandSchema[] {
  return Object.values(commandSchemas).filter(s => s.roles.length > 0);
}

// =============================================================================
// Schema Validation (Development Only)
// =============================================================================

// Run schema validation at module load time in development builds
// This is tree-shaken out in production builds
if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
  // Dynamic import to avoid bundling in production
  import('./schema-validator')
    .then(({ validateAllSchemas, formatValidationResults }) => {
      const validations = validateAllSchemas(commandSchemas);

      if (validations.size > 0) {
        console.warn('[SCHEMA VALIDATION] Found issues in command schemas:');
        console.warn(formatValidationResults(validations));
        console.warn('\nThese warnings help identify potential schema design issues.');
        console.warn('Fix them to improve type inference and avoid runtime bugs.');
      }
    })
    .catch(err => {
      // Silently ignore if schema validator is not available
      console.debug('Schema validation skipped:', err);
    });
}
