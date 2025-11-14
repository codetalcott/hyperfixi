/**
 * Comprehensive Pattern Registry for _hyperscript Compatibility Testing
 *
 * This registry catalogs all documented _hyperscript patterns to enable
 * systematic testing and gap analysis for HyperFixi.
 */

export interface Pattern {
  syntax: string;
  description: string;
  status: 'implemented' | 'architecture-ready' | 'unknown' | 'not-implemented';
  tested: boolean;
  example?: string;
  notes?: string;
  cookbookExample?: number; // Reference to cookbook example #
}

export interface PatternCategory {
  name: string;
  description: string;
  patterns: Pattern[];
}

export const PATTERN_REGISTRY: Record<string, PatternCategory> = {
  // =============================================================================
  // COMMANDS - Basic DOM Manipulation
  // =============================================================================
  commands: {
    name: 'Commands',
    description: 'Basic commands for DOM manipulation and state changes',
    patterns: [
      {
        syntax: 'set <target> to <value>',
        description: 'Set a property or value on a target',
        status: 'implemented',
        tested: true,
        example: 'set my.innerText to "Hello"',
        cookbookExample: 1
      },
      {
        syntax: 'add <class> to <target>',
        description: 'Add a CSS class to target element(s)',
        status: 'implemented',
        tested: true,
        example: 'add .highlight to me'
      },
      {
        syntax: 'remove <class> from <target>',
        description: 'Remove a CSS class from target element(s)',
        status: 'implemented',
        tested: true,
        example: 'remove .primary from <button/>'
      },
      {
        syntax: 'toggle <class> on <target>',
        description: 'Toggle a CSS class on target element(s)',
        status: 'implemented',
        tested: true,
        example: 'toggle .active on me'
      },
      {
        syntax: 'toggle @<attribute>',
        description: 'Toggle a boolean attribute',
        status: 'implemented',
        tested: true,
        example: 'toggle @disabled',
        cookbookExample: 4
      },
      {
        syntax: 'toggle [@<attribute>="<value>"]',
        description: 'Toggle an attribute with an explicit value',
        status: 'implemented',
        tested: true,
        example: 'toggle [@disabled="true"]',
        cookbookExample: 5
      },
      {
        syntax: 'put <value> into <target>',
        description: 'Put a value into a target element',
        status: 'implemented',
        tested: true,
        example: 'put "Done" into me',
        cookbookExample: 7
      },
      {
        syntax: 'put <value> before <target>',
        description: 'Insert value before target',
        status: 'unknown',
        tested: false,
        example: 'put "<li>New</li>" before first <li/>'
      },
      {
        syntax: 'put <value> after <target>',
        description: 'Insert value after target',
        status: 'unknown',
        tested: false,
        example: 'put "<li>New</li>" after last <li/>'
      },
      {
        syntax: 'transition <property> to <value>',
        description: 'Animate a CSS property transition',
        status: 'implemented',
        tested: true,
        example: 'transition opacity to 0',
        cookbookExample: 3
      },
      {
        syntax: 'remove <target>',
        description: 'Remove element(s) from DOM',
        status: 'implemented',
        tested: true,
        example: 'remove me',
        cookbookExample: 3
      },
      {
        syntax: 'hide <target>',
        description: 'Hide element(s) by setting display:none',
        status: 'unknown',
        tested: false,
        example: 'hide <.modal/>'
      },
      {
        syntax: 'show <target>',
        description: 'Show element(s) by removing display:none',
        status: 'unknown',
        tested: false,
        example: 'show <.modal/>'
      },
      {
        syntax: 'show <target> when <condition>',
        description: 'Conditionally show elements matching condition',
        status: 'implemented',
        tested: true,
        example: 'show <li/> when its textContent contains "test"',
        cookbookExample: 6
      },
      {
        syntax: 'settle',
        description: 'Wait for CSS transitions/animations to complete',
        status: 'implemented',
        tested: true,
        example: 'remove .primary then settle then add .primary',
        cookbookExample: 8
      },
      {
        syntax: 'wait <duration>',
        description: 'Wait for specified duration',
        status: 'unknown',
        tested: false,
        example: 'wait 2s then remove me'
      },
      {
        syntax: 'log <value>',
        description: 'Log value to console',
        status: 'implemented',
        tested: true,
        example: 'log "Debug: " + myVar'
      },
      {
        syntax: 'call <method>',
        description: 'Call a JavaScript method',
        status: 'implemented',
        tested: true,
        example: 'call event.preventDefault()',
        cookbookExample: 7
      },
      {
        syntax: 'halt the event',
        description: 'Prevent default event behavior',
        status: 'implemented',
        tested: true,
        example: 'halt the event',
        cookbookExample: 7
      },
      {
        syntax: 'trigger <event> on <target>',
        description: 'Trigger a custom event on target',
        status: 'implemented',
        tested: true,
        example: 'trigger refresh on <.widgets/>'
      },
      {
        syntax: 'get <value>',
        description: 'Get a value and store in "it"',
        status: 'implemented',
        tested: true,
        example: 'get event.dataTransfer.getData("text/plain")',
        cookbookExample: 7
      },
      {
        syntax: 'take <class> from <target>',
        description: 'Remove class from target and add to me',
        status: 'unknown',
        tested: false,
        example: 'take .active from <button/> for me'
      },
      {
        syntax: 'increment <target>',
        description: 'Increment a numeric value',
        status: 'unknown',
        tested: false,
        example: 'increment #counter'
      },
      {
        syntax: 'decrement <target>',
        description: 'Decrement a numeric value',
        status: 'unknown',
        tested: false,
        example: 'decrement #counter'
      },
      {
        syntax: 'append <value> to <target>',
        description: 'Append content to a target (string or array)',
        status: 'architecture-ready',
        tested: false,
        example: 'append "world" to value',
        notes: '⚠️ PARSER INTEGRATION GAP: Fully implemented (310 lines, excellent quality) as CommandImplementation class and registered. CANNOT be used in _="" attributes - parser does not recognize multi-word syntax. Test shows "Unknown command: to". Requires parser pattern definition. Est: 4-6 hours.'
      },
      {
        syntax: 'break',
        description: 'Break out of a loop early',
        status: 'architecture-ready',
        tested: true,
        example: 'repeat until found if item matches break end',
        notes: '⚠️ RUNTIME ERROR HANDLING: Fully implemented and parser-integrated. COMPILES successfully but has runtime error propagation issue - BREAK_LOOP error escapes repeat command. See LOOP_COMMANDS_FIX_PLAN.md. Fix est: 2-4 hours.'
      },
      {
        syntax: 'continue',
        description: 'Skip to next iteration of a loop',
        status: 'architecture-ready',
        tested: true,
        example: 'repeat for item in list if item is null continue end',
        notes: '⚠️ RUNTIME ERROR HANDLING: Fully implemented and parser-integrated. COMPILES successfully but throws CONTINUE_LOOP error not caught properly by repeat command. See LOOP_COMMANDS_FIX_PLAN.md. Fix est: 2-4 hours.'
      },
      {
        syntax: 'fetch <url>',
        description: 'Make HTTP request and return response',
        status: 'architecture-ready',
        tested: false,
        example: 'fetch "/api/data" then put it into #result',
        notes: '⚠️ DISABLED IN REGISTRY: Fully implemented in async/fetch.ts but COMMENTED OUT in command-registry.ts line 263. Reason unknown - requires git history investigation. May have security/CORS concerns. Est: 30 min investigation + testing.'
      },
      {
        syntax: 'make a <type>',
        description: 'Create a new element or object instance',
        status: 'architecture-ready',
        tested: false,
        example: 'make an <a.navlink/> then put it after me',
        notes: '⚠️ PARSER INTEGRATION GAP: Fully implemented as CommandImplementation class and registered. CANNOT be used in _="" attributes - test shows "Cannot destructure property expression". Requires parser pattern definition. Est: 4-6 hours.'
      },
      {
        syntax: 'send <event> to <target>',
        description: 'Send/dispatch an event to a target',
        status: 'architecture-ready',
        tested: false,
        example: 'send htmx:load to #content',
        notes: '⚠️ PARSER INTEGRATION GAP: Fully implemented in events/send.ts and registered. Similar to trigger command. CANNOT be used in _="" attributes - parser integration missing. Est: 4-6 hours.'
      },
      {
        syntax: 'throw <error>',
        description: 'Throw an exception/error',
        status: 'architecture-ready',
        tested: false,
        example: 'if error throw "Invalid input"',
        notes: '⚠️ PARSER INTEGRATION GAP: Fully implemented in control-flow/throw.ts and registered. CANNOT be used in _="" attributes (untested but likely same issue as other commands). Est: 4-6 hours.'
      },
    ]
  },

  // =============================================================================
  // EVENT HANDLERS - Event Handling Patterns
  // =============================================================================
  eventHandlers: {
    name: 'Event Handlers',
    description: 'Event binding and filtering patterns',
    patterns: [
      {
        syntax: 'on <event>',
        description: 'Basic event handler',
        status: 'implemented',
        tested: true,
        example: 'on click log "clicked"',
        cookbookExample: 1
      },
      {
        syntax: 'on <event> or <event2>',
        description: 'Multiple event handler (OR logic)',
        status: 'implemented',
        tested: true,
        example: 'on dragover or dragenter halt the event',
        cookbookExample: 7
      },
      {
        syntax: 'on <event>[<condition>]',
        description: 'Event handler with condition filter',
        status: 'implemented',
        tested: true,
        example: 'on click[event.altKey] remove .primary',
        cookbookExample: 8
      },
      {
        syntax: 'on <event> in <selector>',
        description: 'Event handler filtered by target selector',
        status: 'implemented',
        tested: true,
        example: 'on click in <button:not(.disabled)/>',
        cookbookExample: 5
      },
      {
        syntax: 'on every <event>',
        description: 'Process every event without queuing',
        status: 'architecture-ready',
        tested: false,
        example: 'on every htmx:beforeSend',
        cookbookExample: 5,
        notes: 'Architecture ready, needs parser integration'
      },
      {
        syntax: 'on <event> from <selector>',
        description: 'Event handler from specific source',
        status: 'unknown',
        tested: false,
        example: 'on click from <button.submit/>'
      },
      {
        syntax: 'on <event> from elsewhere',
        description: 'Event handler from anywhere except me',
        status: 'unknown',
        tested: false,
        example: 'on click from elsewhere log "other element"'
      },
      {
        syntax: 'on load',
        description: 'Execute when element loads',
        status: 'implemented',
        tested: true,
        example: 'on load set my.indeterminate to true',
        cookbookExample: 2
      },
      {
        syntax: 'on mutation of <attribute>',
        description: 'Trigger on attribute mutation',
        status: 'unknown',
        tested: false,
        example: 'on mutation of @disabled log "disabled changed"'
      },
      {
        syntax: 'on intersection',
        description: 'Trigger when element enters viewport',
        status: 'unknown',
        tested: false,
        example: 'on intersection log "visible"'
      },
    ]
  },

  // =============================================================================
  // TEMPORAL MODIFIERS - Time-based State Management
  // =============================================================================
  temporalModifiers: {
    name: 'Temporal Modifiers',
    description: 'Patterns for time-based state management',
    patterns: [
      {
        syntax: '<command> until <event>',
        description: 'Maintain state until event fires',
        status: 'architecture-ready',
        tested: false,
        example: 'toggle @disabled until htmx:afterOnLoad',
        cookbookExample: 4,
        notes: 'Architecture ready, needs parser integration'
      },
      {
        syntax: '<command> while <condition>',
        description: 'Maintain state while condition is true',
        status: 'unknown',
        tested: false,
        example: 'add .loading while @data-processing'
      },
      {
        syntax: '<command> unless <condition>',
        description: 'Execute command unless condition is true',
        status: 'unknown',
        tested: false,
        example: 'submit form unless @data-invalid'
      },
      {
        syntax: '<command> then <command>',
        description: 'Sequential command execution',
        status: 'implemented',
        tested: true,
        example: 'remove .primary then settle then add .primary',
        cookbookExample: 8
      },
      {
        syntax: 'wait <duration> then <command>',
        description: 'Delay before executing command',
        status: 'unknown',
        tested: false,
        example: 'wait 2s then remove me'
      },
    ]
  },

  // =============================================================================
  // CONTEXT SWITCHING - Target Context Management
  // =============================================================================
  contextSwitching: {
    name: 'Context Switching',
    description: 'Commands for changing execution context',
    patterns: [
      {
        syntax: 'tell <target> <command>',
        description: 'Execute command with different target as "me"',
        status: 'implemented',
        tested: true,
        example: 'tell <#output/> put "Result" into me',
        cookbookExample: 5
      },
      {
        syntax: 'for <item> in <collection> <command>',
        description: 'Iterate over collection',
        status: 'unknown',
        tested: false,
        example: 'for item in <.widgets/> tell it add .processed'
      },
      {
        syntax: 'repeat <count> times <command>',
        description: 'Repeat command N times',
        status: 'architecture-ready',
        tested: true,
        example: 'repeat 3 times log "iteration"',
        notes: '⚠️ RUNTIME ERROR HANDLING: Fully implemented (618 lines) and parser-integrated. Supports 6 loop types (for, times, while, until, until-event, forever). COMPILES and EXECUTES successfully for simple loops, but break/continue have runtime error propagation issues. See LOOP_COMMANDS_FIX_PLAN.md. Fix est: 2-4 hours.'
      },
      {
        syntax: 'repeat until <condition> <command>',
        description: 'Repeat until condition is true',
        status: 'architecture-ready',
        tested: false,
        example: 'repeat until #counter.value > 10 increment #counter',
        notes: '⚠️ RUNTIME ERROR HANDLING: Part of RepeatCommand (618 lines) supporting 6 loop variants. Parser-integrated. Same runtime error propagation issues with break/continue as main repeat command. See LOOP_COMMANDS_FIX_PLAN.md. Fix est: 2-4 hours.'
      },
    ]
  },

  // =============================================================================
  // REFERENCES - Element and Value References
  // =============================================================================
  references: {
    name: 'References',
    description: 'Ways to reference elements and values',
    patterns: [
      {
        syntax: 'me',
        description: 'Reference to current element',
        status: 'implemented',
        tested: true,
        example: 'on click remove me'
      },
      {
        syntax: 'it',
        description: 'Reference to last result',
        status: 'implemented',
        tested: true,
        example: 'get #value then put it into #output'
      },
      {
        syntax: 'you',
        description: 'Reference to target in tell command',
        status: 'implemented',
        tested: true,
        example: 'tell #target put "Hi" into you'
      },
      {
        syntax: 'the event',
        description: 'Reference to current event object',
        status: 'implemented',
        tested: true,
        example: 'halt the event'
      },
      {
        syntax: 'the target',
        description: 'Reference to event.target',
        status: 'implemented',
        tested: true,
        example: 'set the target\'s style.background to "red"'
      },
      {
        syntax: '#<id>',
        description: 'Element by ID',
        status: 'implemented',
        tested: true,
        example: 'set #output.innerText to "Done"',
        cookbookExample: 1
      },
      {
        syntax: '.<class>',
        description: 'Elements by class',
        status: 'implemented',
        tested: true,
        example: 'add .highlight to .items'
      },
      {
        syntax: '<selector/>',
        description: 'Elements by CSS selector',
        status: 'implemented',
        tested: true,
        example: 'show <button:not(.disabled)/>'
      },
      {
        syntax: 'closest <selector>',
        description: 'Closest ancestor matching selector',
        status: 'implemented',
        tested: true,
        example: 'closest <table/>',
        cookbookExample: 9
      },
      {
        syntax: 'next <selector>',
        description: 'Next sibling matching selector',
        status: 'implemented',
        tested: true,
        example: 'next <output/>'
      },
      {
        syntax: 'previous <selector>',
        description: 'Previous sibling matching selector',
        status: 'unknown',
        tested: false,
        example: 'previous <li/>'
      },
      {
        syntax: 'first <selector>',
        description: 'First element matching selector',
        status: 'unknown',
        tested: false,
        example: 'first <li/> in #list'
      },
      {
        syntax: 'last <selector>',
        description: 'Last element matching selector',
        status: 'unknown',
        tested: false,
        example: 'last <li/> in #list'
      },
      {
        syntax: '@<attribute>',
        description: 'Attribute reference',
        status: 'implemented',
        tested: true,
        example: 'toggle @disabled'
      },
    ]
  },

  // =============================================================================
  // OPERATORS - Expression Operators
  // =============================================================================
  operators: {
    name: 'Operators',
    description: 'Operators for expressions and conditions',
    patterns: [
      {
        syntax: '<value> + <value>',
        description: 'Addition or string concatenation',
        status: 'implemented',
        tested: true,
        example: '"Hello" + " " + "World"',
        cookbookExample: 1
      },
      {
        syntax: '<value> - <value>',
        description: 'Subtraction',
        status: 'implemented',
        tested: true,
        example: 'count - 1'
      },
      {
        syntax: '<value> * <value>',
        description: 'Multiplication',
        status: 'implemented',
        tested: true,
        example: 'width * height'
      },
      {
        syntax: '<value> / <value>',
        description: 'Division',
        status: 'implemented',
        tested: true,
        example: 'total / count'
      },
      {
        syntax: '<value> mod <value>',
        description: 'Modulo operation',
        status: 'implemented',
        tested: true,
        example: 'index mod 2'
      },
      {
        syntax: '<value> == <value>',
        description: 'Equality comparison',
        status: 'implemented',
        tested: true,
        example: 'my.value == "test"'
      },
      {
        syntax: '<value> != <value>',
        description: 'Inequality comparison',
        status: 'implemented',
        tested: true,
        example: 'status != "loading"'
      },
      {
        syntax: '<value> > <value>',
        description: 'Greater than',
        status: 'implemented',
        tested: true,
        example: 'count > 10'
      },
      {
        syntax: '<value> < <value>',
        description: 'Less than',
        status: 'implemented',
        tested: true,
        example: 'price < 100'
      },
      {
        syntax: '<value> >= <value>',
        description: 'Greater than or equal',
        status: 'implemented',
        tested: true,
        example: 'age >= 18'
      },
      {
        syntax: '<value> <= <value>',
        description: 'Less than or equal',
        status: 'implemented',
        tested: true,
        example: 'score <= 100'
      },
      {
        syntax: '<value> contains <value>',
        description: 'Contains check (string or array)',
        status: 'implemented',
        tested: true,
        example: 'textContent contains "error"',
        cookbookExample: 6
      },
      {
        syntax: '<element> matches <selector>',
        description: 'CSS selector matching',
        status: 'implemented',
        tested: true,
        example: 'I match .active'
      },
      {
        syntax: '<value> and <value>',
        description: 'Logical AND',
        status: 'implemented',
        tested: true,
        example: 'count > 0 and status == "ready"'
      },
      {
        syntax: '<value> or <value>',
        description: 'Logical OR',
        status: 'implemented',
        tested: true,
        example: 'status == "done" or status == "cancelled"'
      },
      {
        syntax: 'not <value>',
        description: 'Logical NOT',
        status: 'implemented',
        tested: true,
        example: 'not @disabled'
      },
    ]
  },

  // =============================================================================
  // CONTROL FLOW - Conditionals and Branching
  // =============================================================================
  controlFlow: {
    name: 'Control Flow',
    description: 'Conditional execution and branching',
    patterns: [
      {
        syntax: 'if <condition> <command>',
        description: 'Conditional execution',
        status: 'implemented',
        tested: true,
        example: 'if I match .active remove .active from me',
        cookbookExample: 6
      },
      {
        syntax: 'if <condition> <command> else <command>',
        description: 'If-else branching',
        status: 'implemented',
        tested: true,
        example: 'if count > 0 show #results else hide #results'
      },
      {
        syntax: 'if <condition> ... else if <condition> ... else ... end',
        description: 'Multi-branch conditional',
        status: 'unknown',
        tested: false,
        example: 'if status == "loading" ... else if status == "error" ... else ... end'
      },
    ]
  },

  // =============================================================================
  // PROPERTY ACCESS - Accessing Element Properties
  // =============================================================================
  propertyAccess: {
    name: 'Property Access',
    description: 'Accessing properties and attributes',
    patterns: [
      {
        syntax: '<target>.<property>',
        description: 'Property access',
        status: 'implemented',
        tested: true,
        example: '#output.innerText',
        cookbookExample: 1
      },
      {
        syntax: '<target>\'s <property>',
        description: 'Possessive property access',
        status: 'implemented',
        tested: true,
        example: 'the target\'s style.background'
      },
      {
        syntax: 'my <property>',
        description: 'Property on current element',
        status: 'implemented',
        tested: true,
        example: 'set my value to ""',
        cookbookExample: 2
      },
      {
        syntax: 'its <property>',
        description: 'Property on referenced element',
        status: 'implemented',
        tested: true,
        example: 'show <li/> when its textContent contains "test"',
        cookbookExample: 6
      },
      {
        syntax: '<target>@<attribute>',
        description: 'Attribute access',
        status: 'implemented',
        tested: true,
        example: 'my@data-value'
      },
      {
        syntax: '<property>.<nested>',
        description: 'Nested property access',
        status: 'implemented',
        tested: true,
        example: 'event.dataTransfer.getData("text/plain")',
        cookbookExample: 7
      },
      {
        syntax: '<property>.<method>()',
        description: 'Method call on property',
        status: 'implemented',
        tested: true,
        example: 'textContent.toLowerCase()',
        cookbookExample: 9
      },
    ]
  },

  // =============================================================================
  // TYPE CONVERSION - Converting Values
  // =============================================================================
  typeConversion: {
    name: 'Type Conversion',
    description: 'Converting values between types',
    patterns: [
      {
        syntax: '<value> as Int',
        description: 'Convert to integer',
        status: 'implemented',
        tested: true,
        example: '"123" as Int'
      },
      {
        syntax: '<value> as Float',
        description: 'Convert to float',
        status: 'implemented',
        tested: true,
        example: '"3.14" as Float'
      },
      {
        syntax: '<value> as String',
        description: 'Convert to string',
        status: 'implemented',
        tested: true,
        example: '123 as String'
      },
      {
        syntax: '<value> as JSON',
        description: 'Parse JSON',
        status: 'implemented',
        tested: true,
        example: 'response as JSON'
      },
      {
        syntax: '<form> as Values',
        description: 'Extract form values',
        status: 'implemented',
        tested: true,
        example: 'closest <form/> as Values'
      },
    ]
  },
};

/**
 * Get all patterns flattened into a single array
 */
export function getAllPatterns(): Pattern[] {
  const allPatterns: Pattern[] = [];
  for (const category of Object.values(PATTERN_REGISTRY)) {
    allPatterns.push(...category.patterns);
  }
  return allPatterns;
}

/**
 * Get patterns by status
 */
export function getPatternsByStatus(status: Pattern['status']): Pattern[] {
  return getAllPatterns().filter(p => p.status === status);
}

/**
 * Get patterns by tested status
 */
export function getUntestedPatterns(): Pattern[] {
  return getAllPatterns().filter(p => !p.tested);
}

/**
 * Get statistics about pattern coverage
 */
export function getPatternStats() {
  const all = getAllPatterns();
  const total = all.length;
  const implemented = all.filter(p => p.status === 'implemented').length;
  const architectureReady = all.filter(p => p.status === 'architecture-ready').length;
  const unknown = all.filter(p => p.status === 'unknown').length;
  const tested = all.filter(p => p.tested).length;

  return {
    total,
    implemented,
    architectureReady,
    unknown,
    notImplemented: all.filter(p => p.status === 'not-implemented').length,
    tested,
    untested: total - tested,
    implementedPercent: Math.round((implemented / total) * 100),
    testedPercent: Math.round((tested / total) * 100),
  };
}
