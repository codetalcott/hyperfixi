/**
 * Database Initialization Script
 *
 * Creates and populates the SQLite database with seed data for the patterns-reference package.
 *
 * Usage: npx tsx scripts/init-db.ts [--db-path <path>] [--force]
 *
 * Options:
 *   --db-path <path>  Path to database file (default: ./data/patterns.db)
 *   --force           Overwrite existing database
 */

import Database from 'better-sqlite3';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { dirname, resolve } from 'path';

// =============================================================================
// Configuration
// =============================================================================

const DEFAULT_DB_PATH = resolve(__dirname, '../data/patterns.db');

// Parse command line arguments
const args = process.argv.slice(2);
const forceOverwrite = args.includes('--force');
const dbPathIndex = args.indexOf('--db-path');
const dbPath = dbPathIndex >= 0 && args[dbPathIndex + 1] ? args[dbPathIndex + 1] : DEFAULT_DB_PATH;

// =============================================================================
// Schema
// =============================================================================

const SCHEMA = `
-- Code examples from hyperscript.org cookbook
CREATE TABLE IF NOT EXISTS code_examples (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  raw_code TEXT NOT NULL,
  description TEXT,
  feature TEXT,
  engine TEXT DEFAULT NULL,
  source_url TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Translations to different languages
CREATE TABLE IF NOT EXISTS pattern_translations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code_example_id TEXT REFERENCES code_examples(id),
  language TEXT NOT NULL,
  hyperscript TEXT NOT NULL,
  word_order TEXT,
  translation_method TEXT DEFAULT 'auto-generated',
  confidence REAL DEFAULT 0.5,
  verified_parses INTEGER DEFAULT 0,
  verified_executes INTEGER DEFAULT 0,
  role_alignment_score REAL,  -- Semantic role alignment with English (0-1)
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(code_example_id, language)
);

-- LLM few-shot examples
CREATE TABLE IF NOT EXISTS llm_examples (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code_example_id TEXT REFERENCES code_examples(id),
  language TEXT NOT NULL,
  prompt TEXT NOT NULL,
  completion TEXT NOT NULL,
  quality_score REAL DEFAULT 0.8,
  usage_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Semantic roles extracted from patterns
CREATE TABLE IF NOT EXISTS pattern_roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code_example_id TEXT NOT NULL REFERENCES code_examples(id),
  command_index INTEGER DEFAULT 0,
  role TEXT NOT NULL,
  role_value TEXT,
  role_type TEXT,
  required INTEGER DEFAULT 0,
  UNIQUE(code_example_id, command_index, role)
);

-- Pattern test results (for verification tracking)
CREATE TABLE IF NOT EXISTS pattern_tests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code_example_id TEXT NOT NULL REFERENCES code_examples(id),
  language TEXT NOT NULL,
  test_type TEXT NOT NULL,  -- 'parse', 'execute', 'round-trip'
  success INTEGER NOT NULL,
  error_message TEXT,
  test_date TEXT DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- Language Documentation Tables (migrated from hyperscript-lsp)
-- =============================================================================

-- Commands documentation
CREATE TABLE IF NOT EXISTS commands (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  syntax TEXT,
  purpose TEXT,
  implicit_target TEXT,
  implicit_result_target TEXT,
  is_blocking INTEGER DEFAULT 0,
  has_body INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Expressions documentation
CREATE TABLE IF NOT EXISTS expressions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  evaluates_to_type TEXT,
  precedence INTEGER,
  associativity TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Expression operators
CREATE TABLE IF NOT EXISTS expression_operators (
  id TEXT PRIMARY KEY,
  expression_id TEXT NOT NULL REFERENCES expressions(id),
  operator TEXT NOT NULL
);

-- Keywords documentation
CREATE TABLE IF NOT EXISTS keywords (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  context_of_use TEXT,
  is_optional INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Features (top-level constructs like on, init, behavior)
CREATE TABLE IF NOT EXISTS features (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  syntax TEXT,
  trigger TEXT,
  structure_description TEXT,
  scope_impact TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Special symbols (me, it, my, you, your)
CREATE TABLE IF NOT EXISTS special_symbols (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  symbol_type TEXT NOT NULL,
  description TEXT,
  typical_value TEXT,
  scope_implications TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- Indexes for performance
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_translations_language ON pattern_translations(language);
CREATE INDEX IF NOT EXISTS idx_translations_example ON pattern_translations(code_example_id);
CREATE INDEX IF NOT EXISTS idx_llm_language ON llm_examples(language);
CREATE INDEX IF NOT EXISTS idx_examples_feature ON code_examples(feature);
CREATE INDEX IF NOT EXISTS idx_pattern_roles_role ON pattern_roles(role);
CREATE INDEX IF NOT EXISTS idx_pattern_roles_example ON pattern_roles(code_example_id);
CREATE INDEX IF NOT EXISTS idx_pattern_tests_example_lang ON pattern_tests(code_example_id, language);
CREATE INDEX IF NOT EXISTS idx_examples_engine ON code_examples(engine);

-- Language docs indexes
CREATE INDEX IF NOT EXISTS idx_commands_name ON commands(name);
CREATE INDEX IF NOT EXISTS idx_expressions_name ON expressions(name);
CREATE INDEX IF NOT EXISTS idx_expressions_category ON expressions(category);
CREATE INDEX IF NOT EXISTS idx_keywords_name ON keywords(name);
CREATE INDEX IF NOT EXISTS idx_features_name ON features(name);
CREATE INDEX IF NOT EXISTS idx_special_symbols_name ON special_symbols(name);
CREATE INDEX IF NOT EXISTS idx_expression_operators_expr ON expression_operators(expression_id);
`;

// =============================================================================
// Seed Data - Essential Hyperscript Patterns
// =============================================================================

interface SeedExample {
  id: string;
  title: string;
  raw_code: string;
  description: string;
  feature: string;
  engine?: string | null;
}

const SEED_EXAMPLES: SeedExample[] = [
  // ==========================================================================
  // Class Manipulation
  // ==========================================================================
  {
    id: 'toggle-class-basic',
    title: 'Toggle Class',
    raw_code: 'on click toggle .active',
    description: 'Toggle a CSS class on the current element when clicked',
    feature: 'class-manipulation',
  },
  {
    id: 'toggle-class-on-other',
    title: 'Toggle Class On Other Element',
    raw_code: 'on click toggle .open on #menu',
    description: 'Toggle a CSS class on another element',
    feature: 'class-manipulation',
  },
  {
    id: 'add-class-basic',
    title: 'Add Class',
    raw_code: 'on click add .highlight to me',
    description: 'Add a CSS class to the current element when clicked',
    feature: 'class-manipulation',
  },
  {
    id: 'add-class-to-other',
    title: 'Add Class To Other',
    raw_code: 'on click add .selected to #item',
    description: 'Add a CSS class to another element',
    feature: 'class-manipulation',
  },
  {
    id: 'remove-class-basic',
    title: 'Remove Class',
    raw_code: 'on click remove .highlight from me',
    description: 'Remove a CSS class from the current element when clicked',
    feature: 'class-manipulation',
  },
  {
    id: 'remove-class-from-all',
    title: 'Remove Class From All',
    raw_code: 'on click remove .active from .items',
    description: 'Remove a CSS class from all matching elements',
    feature: 'class-manipulation',
  },

  // ==========================================================================
  // DOM Manipulation
  // ==========================================================================
  {
    id: 'set-text-basic',
    title: 'Set Text Content',
    raw_code: 'on click set #output.innerText to "Hello World"',
    description: 'Set the text content of an element by ID',
    feature: 'dom-manipulation',
  },
  {
    id: 'set-attribute',
    title: 'Set Attribute',
    raw_code: 'on click set @disabled to true',
    description: 'Set an attribute on the current element',
    feature: 'dom-manipulation',
  },
  {
    id: 'set-style',
    title: 'Set Style',
    raw_code: 'on click set my *background to "red"',
    description: 'Set a CSS style property',
    feature: 'dom-manipulation',
  },
  {
    id: 'put-content-basic',
    title: 'Put Content',
    raw_code: 'on click put "Done!" into me',
    description: 'Replace the content of the current element',
    feature: 'dom-manipulation',
  },
  {
    id: 'put-before',
    title: 'Put Before',
    raw_code: 'on click put "<p>New</p>" before me',
    description: 'Insert content before the current element',
    feature: 'dom-manipulation',
  },
  {
    id: 'put-after',
    title: 'Put After',
    raw_code: 'on click put "<p>New</p>" after me',
    description: 'Insert content after the current element',
    feature: 'dom-manipulation',
  },
  {
    id: 'append-content',
    title: 'Append Content',
    raw_code: 'on click append "<li>Item</li>" to #list',
    description: 'Append content to an element',
    feature: 'dom-manipulation',
  },
  {
    id: 'remove-element',
    title: 'Remove Element',
    raw_code: 'on click remove me',
    description: 'Remove the current element from the DOM',
    feature: 'dom-manipulation',
  },
  {
    id: 'make-element',
    title: 'Make Element',
    raw_code: 'on click make a <div.card/> then put it into #container',
    description: 'Create a new element dynamically',
    feature: 'dom-manipulation',
  },
  {
    id: 'swap-content',
    title: 'Swap Content',
    raw_code: 'on click swap #a with #b',
    description: 'Swap two elements in the DOM',
    feature: 'dom-manipulation',
  },

  // ==========================================================================
  // Visibility
  // ==========================================================================
  {
    id: 'show-element',
    title: 'Show Element',
    raw_code: 'on click show #modal',
    description: 'Show a hidden element',
    feature: 'visibility',
  },
  {
    id: 'show-with-transition',
    title: 'Show With Transition',
    raw_code: 'on click show #modal with *opacity',
    description: 'Show element with opacity transition',
    feature: 'visibility',
  },
  {
    id: 'hide-element',
    title: 'Hide Element',
    raw_code: 'on click hide #modal',
    description: 'Hide an element',
    feature: 'visibility',
  },
  {
    id: 'hide-with-transition',
    title: 'Hide With Transition',
    raw_code: 'on click hide me with *opacity',
    description: 'Hide element with opacity transition',
    feature: 'visibility',
  },
  {
    id: 'toggle-visibility',
    title: 'Toggle Visibility',
    raw_code: 'on click toggle @hidden on #panel',
    description: 'Toggle the hidden attribute on an element',
    feature: 'visibility',
  },

  // ==========================================================================
  // Timing & Animation
  // ==========================================================================
  {
    id: 'wait-then',
    title: 'Wait Then Execute',
    raw_code: 'on click wait 2s then remove me',
    description: 'Wait for a duration before executing a command',
    feature: 'timing',
  },
  {
    id: 'wait-for-event',
    title: 'Wait For Event',
    raw_code: 'on click wait for transitionend',
    description: 'Wait for a DOM event to fire',
    feature: 'timing',
  },
  {
    id: 'transition-opacity',
    title: 'Transition Opacity',
    raw_code: 'on click transition opacity to 0 over 500ms then remove me',
    description: 'Animate opacity then remove the element',
    feature: 'animation',
  },
  {
    id: 'transition-transform',
    title: 'Transition Transform',
    raw_code: 'on click transition transform to "scale(1.2)" over 300ms',
    description: 'Animate transform property',
    feature: 'animation',
  },
  {
    id: 'settle-animations',
    title: 'Settle Animations',
    raw_code: 'on click add .animate then settle then remove .animate',
    description: 'Wait for CSS animations to complete',
    feature: 'animation',
  },

  // ==========================================================================
  // Events
  // ==========================================================================
  {
    id: 'send-event',
    title: 'Send Custom Event',
    raw_code: 'on click send refresh to #widget',
    description: 'Dispatch a custom event to another element',
    feature: 'events',
  },
  {
    id: 'send-with-detail',
    title: 'Send Event With Detail',
    raw_code: 'on click send update(value: 42) to #target',
    description: 'Send an event with data payload',
    feature: 'events',
  },
  {
    id: 'trigger-event',
    title: 'Trigger Event',
    raw_code: 'on load trigger init',
    description: 'Trigger a custom event when the element loads',
    feature: 'events',
  },
  {
    id: 'multiple-events',
    title: 'Multiple Event Handlers',
    raw_code: 'on click or keypress[key=="Enter"] toggle .active',
    description: 'Handle multiple events with one handler',
    feature: 'events',
  },

  // ==========================================================================
  // Async Operations
  // ==========================================================================
  {
    id: 'fetch-basic',
    title: 'Fetch Data',
    raw_code: 'on click fetch /api/data then put it into #result',
    description: 'Fetch data from an API and display it',
    feature: 'async',
  },
  {
    id: 'fetch-json',
    title: 'Fetch JSON',
    raw_code: 'on click fetch /api/user as json then set #name.innerText to it.name',
    description: 'Fetch JSON data and use a property',
    feature: 'async',
  },
  {
    id: 'fetch-with-method',
    title: 'Fetch With Method',
    raw_code: 'on submit fetch /api/form with method:"POST" body:form',
    description: 'Submit form data via POST',
    feature: 'async',
  },

  // ==========================================================================
  // Counters
  // ==========================================================================
  {
    id: 'increment-counter',
    title: 'Increment Counter',
    raw_code: 'on click increment #counter',
    description: 'Increment a numeric counter element',
    feature: 'counters',
  },
  {
    id: 'increment-by-amount',
    title: 'Increment By Amount',
    raw_code: 'on click increment #score by 10',
    description: 'Increment counter by specific amount',
    feature: 'counters',
  },
  {
    id: 'decrement-counter',
    title: 'Decrement Counter',
    raw_code: 'on click decrement #counter',
    description: 'Decrement a numeric counter element',
    feature: 'counters',
  },

  // ==========================================================================
  // Control Flow
  // ==========================================================================
  {
    id: 'if-condition',
    title: 'If Condition',
    raw_code: 'on click if I match .active then remove .active else add .active end',
    description: 'Conditional execution based on state',
    feature: 'control-flow',
  },
  {
    id: 'repeat-times',
    title: 'Repeat Times',
    raw_code: 'on click repeat 3 times add "<p>Line</p>" to me',
    description: 'Repeat an action multiple times',
    feature: 'loops',
  },
  {
    id: 'repeat-for-each',
    title: 'Repeat For Each',
    raw_code: 'on click repeat for item in .items add .processed to item',
    description: 'Iterate over a collection',
    feature: 'loops',
  },
  {
    id: 'halt-propagation',
    title: 'Halt Event',
    raw_code: 'on click halt the event then toggle .active',
    description: 'Stop event propagation',
    feature: 'control-flow',
  },

  // ==========================================================================
  // Navigation
  // ==========================================================================
  {
    id: 'go-url',
    title: 'Go To URL',
    raw_code: 'on click go to url "/page"',
    description: 'Navigate to a URL',
    feature: 'navigation',
  },
  {
    id: 'go-back',
    title: 'Go Back',
    raw_code: 'on click go back',
    description: 'Navigate back in history',
    feature: 'navigation',
  },

  // ==========================================================================
  // Focus
  // ==========================================================================
  {
    id: 'focus-element',
    title: 'Focus Element',
    raw_code: 'on click focus #input',
    description: 'Focus an input element',
    feature: 'focus',
  },
  {
    id: 'blur-element',
    title: 'Blur Element',
    raw_code: 'on keydown[key=="Escape"] blur me',
    description: 'Remove focus from element',
    feature: 'focus',
  },

  // ==========================================================================
  // Debugging
  // ==========================================================================
  {
    id: 'log-value',
    title: 'Log Value',
    raw_code: 'on click log "Button clicked!"',
    description: 'Log a message to the console',
    feature: 'debugging',
  },
  {
    id: 'log-element',
    title: 'Log Element',
    raw_code: 'on click log me',
    description: 'Log the current element to console',
    feature: 'debugging',
  },

  // ==========================================================================
  // Variables & Data
  // ==========================================================================
  {
    id: 'get-value',
    title: 'Get Value',
    raw_code: 'on click get #input.value then log it',
    description: 'Get a value and use it',
    feature: 'data',
  },
  {
    id: 'default-value',
    title: 'Default Value',
    raw_code: 'on load default my @data-count to "0"',
    description: 'Set default value if not present',
    feature: 'data',
  },

  // ==========================================================================
  // Behaviors
  // ==========================================================================
  {
    id: 'install-behavior',
    title: 'Install Behavior',
    raw_code: 'install Draggable',
    description: 'Install a reusable behavior on an element. Replace "Draggable" with any defined behavior name (e.g., Sortable, Closeable).',
    feature: 'behaviors',
  },
  {
    id: 'tell-command',
    title: 'Tell Command',
    raw_code: 'on click tell #modal to show',
    description: 'Tell another element to execute a command',
    feature: 'behaviors',
  },

  // ==========================================================================
  // Advanced
  // ==========================================================================
  {
    id: 'call-function',
    title: 'Call Function',
    raw_code: 'on click call myFunction()',
    description: 'Call a JavaScript function',
    feature: 'advanced',
  },
  {
    id: 'async-block',
    title: 'Async Block',
    raw_code: 'on click async fetch /api/data then put it into me',
    description: 'Execute commands asynchronously',
    feature: 'advanced',
  },
  {
    id: 'js-inline',
    title: 'Inline JavaScript',
    raw_code: 'on click js console.log("from js") end',
    description: 'Execute inline JavaScript',
    feature: 'advanced',
  },

  // ==========================================================================
  // UI Components - Tabs
  // ==========================================================================
  {
    id: 'tabs-basic',
    title: 'Tab Navigation',
    raw_code: 'on click remove .active from .tab add .active to me',
    description: 'Basic tab switching with active state',
    feature: 'ui-components',
  },
  {
    id: 'tabs-content',
    title: 'Tab With Content Panel',
    raw_code: 'on click remove .active from .tab add .active to me hide .tab-panel show the next <div.tab-panel/>',
    description: 'Tab that shows associated content panel',
    feature: 'ui-components',
  },
  {
    id: 'tabs-aria',
    title: 'Accessible Tabs',
    raw_code: 'on click set @aria-selected to "false" on .tab set @aria-selected to "true" on me',
    description: 'Tab navigation with ARIA attributes',
    feature: 'ui-components',
  },

  // ==========================================================================
  // UI Components - Modals
  // ==========================================================================
  {
    id: 'modal-open',
    title: 'Open Modal',
    raw_code: 'on click show #modal add .modal-open to body',
    description: 'Open modal and prevent body scroll',
    feature: 'ui-components',
  },
  {
    id: 'modal-close-button',
    title: 'Close Modal Button',
    raw_code: 'on click hide closest .modal remove .modal-open from body',
    description: 'Close modal from button inside',
    feature: 'ui-components',
  },
  {
    id: 'modal-close-escape',
    title: 'Close Modal On Escape',
    raw_code: 'on keydown[key=="Escape"] from window hide .modal remove .modal-open from body',
    description: 'Close modal when pressing Escape key',
    feature: 'ui-components',
  },
  {
    id: 'modal-close-backdrop',
    title: 'Close Modal On Backdrop Click',
    raw_code: 'on click if target matches .modal-backdrop hide .modal-backdrop end',
    description: 'Close modal by clicking outside',
    feature: 'ui-components',
  },

  // ==========================================================================
  // UI Components - Accordion
  // ==========================================================================
  {
    id: 'accordion-toggle',
    title: 'Accordion Toggle',
    raw_code: 'on click toggle .open on closest .accordion-item toggle @aria-expanded',
    description: 'Toggle accordion panel visibility',
    feature: 'ui-components',
  },
  {
    id: 'accordion-exclusive',
    title: 'Exclusive Accordion',
    raw_code: 'on click remove .open from .accordion-item add .open to closest .accordion-item',
    description: 'Accordion where only one panel is open',
    feature: 'ui-components',
  },

  // ==========================================================================
  // UI Components - Dropdown
  // ==========================================================================
  {
    id: 'dropdown-toggle',
    title: 'Dropdown Toggle',
    raw_code: 'on click toggle .open on next .dropdown-menu halt',
    description: 'Toggle dropdown menu visibility',
    feature: 'ui-components',
  },
  {
    id: 'dropdown-close-outside',
    title: 'Close Dropdown On Outside Click',
    raw_code: 'on click from elsewhere remove .open from .dropdown-menu',
    description: 'Close dropdown when clicking outside',
    feature: 'ui-components',
  },

  // ==========================================================================
  // Forms - Input Handling
  // ==========================================================================
  {
    id: 'input-mirror',
    title: 'Input Mirror',
    raw_code: 'on input put my value into #preview',
    description: 'Mirror input value to another element',
    feature: 'forms',
  },
  {
    id: 'input-char-count',
    title: 'Character Counter',
    raw_code: 'on input set #count.innerText to my value.length',
    description: 'Show character count as user types',
    feature: 'forms',
  },
  {
    id: 'input-validation',
    title: 'Input Validation',
    raw_code: 'on blur if my value is empty add .error to me else remove .error from me end',
    description: 'Validate input on blur',
    feature: 'forms',
  },
  {
    id: 'input-clear',
    title: 'Clear Input',
    raw_code: 'on click set previous <input/>.value to ""',
    description: 'Clear the previous input field',
    feature: 'forms',
  },
  {
    id: 'form-submit-prevent',
    title: 'Prevent Form Submit',
    raw_code: 'on submit halt the event call validateForm() if result is false log "Invalid form" end',
    description: 'Prevent form submission and validate',
    feature: 'forms',
  },
  {
    id: 'form-disable-on-submit',
    title: 'Disable Form On Submit',
    raw_code: 'on submit add @disabled to <button/> in me put "Submitting..." into <button/> in me',
    description: 'Disable submit button while processing',
    feature: 'forms',
  },

  // ==========================================================================
  // Window/Document Events
  // ==========================================================================
  {
    id: 'window-keydown',
    title: 'Window Keydown Handler',
    raw_code: 'on keydown[key=="s"] from window if event.ctrlKey halt call saveDocument() end',
    description: 'Handle Ctrl+S globally',
    feature: 'window-events',
  },
  {
    id: 'window-scroll',
    title: 'Scroll Handler',
    raw_code: 'on scroll from window if window.scrollY > 100 add .sticky to #header else remove .sticky from #header end',
    description: 'Add sticky class on scroll',
    feature: 'window-events',
  },
  {
    id: 'window-resize',
    title: 'Resize Handler',
    raw_code: 'on resize from window debounced at 200ms call adjustLayout()',
    description: 'Handle window resize with debounce',
    feature: 'window-events',
  },
  {
    id: 'document-ready',
    title: 'Document Ready',
    raw_code: 'on load call initializeApp()',
    description: 'Initialize app when element loads',
    feature: 'window-events',
  },

  // ==========================================================================
  // CSS Styles - Possessive Syntax
  // ==========================================================================
  {
    id: 'set-opacity',
    title: 'Set Opacity',
    raw_code: 'on click set my *opacity to 0.5',
    description: 'Set CSS opacity using possessive syntax',
    feature: 'css-styles',
  },
  {
    id: 'set-transform',
    title: 'Set Transform',
    raw_code: 'on click set my *transform to "rotate(45deg)"',
    description: 'Set CSS transform property',
    feature: 'css-styles',
  },
  {
    id: 'set-color-variable',
    title: 'Set CSS Variable',
    raw_code: 'on click set the *--primary-color of #theme to "#ff6600"',
    description: 'Set a CSS custom property',
    feature: 'css-styles',
  },
  {
    id: 'transition-color',
    title: 'Transition Background Color',
    raw_code: 'on click transition *background-color to "blue" over 500ms',
    description: 'Animate background color change',
    feature: 'css-styles',
  },

  // ==========================================================================
  // Navigation - Positional
  // ==========================================================================
  {
    id: 'next-element',
    title: 'Next Element',
    raw_code: 'on click add .highlight to next <li/>',
    description: 'Select and modify next sibling element',
    feature: 'navigation',
  },
  {
    id: 'previous-element',
    title: 'Previous Element',
    raw_code: 'on click remove .highlight from previous <li/>',
    description: 'Select and modify previous sibling element',
    feature: 'navigation',
  },
  {
    id: 'closest-ancestor',
    title: 'Closest Ancestor',
    raw_code: 'on click toggle .expanded on closest .card',
    description: 'Toggle class on closest matching ancestor',
    feature: 'navigation',
  },
  {
    id: 'first-in-parent',
    title: 'First In Collection',
    raw_code: 'on click focus first <input/> in closest <form/>',
    description: 'Focus first input in parent form',
    feature: 'navigation',
  },
  {
    id: 'last-in-collection',
    title: 'Last In Collection',
    raw_code: 'on click scroll to last <.message/> in #chat',
    description: 'Scroll to last message in chat',
    feature: 'navigation',
  },

  // ==========================================================================
  // Repeat Patterns
  // ==========================================================================
  {
    id: 'repeat-until-event',
    title: 'Repeat Until Event',
    raw_code: 'on mousedown repeat until event mouseup increment #counter wait 100ms end',
    description: 'Repeat action while button is held',
    feature: 'loops',
  },
  {
    id: 'repeat-forever',
    title: 'Repeat Forever',
    raw_code: 'on load repeat forever toggle .pulse wait 1s end',
    description: 'Infinite animation loop',
    feature: 'loops',
  },
  {
    id: 'repeat-while',
    title: 'Repeat While Condition',
    raw_code: 'on click repeat while #counter.innerText < 10 increment #counter wait 200ms end',
    description: 'Repeat while condition is true',
    feature: 'loops',
  },

  // ==========================================================================
  // Event Modifiers
  // ==========================================================================
  {
    id: 'event-once',
    title: 'Event Once',
    raw_code: 'on click once add .initialized to me call setup()',
    description: 'Handle event only once',
    feature: 'events',
  },
  {
    id: 'event-debounce',
    title: 'Event Debounce',
    raw_code: 'on input debounced at 300ms fetch /api/search?q=${my value} as json then put it into #results',
    description: 'Debounce input for search',
    feature: 'events',
  },
  {
    id: 'event-throttle',
    title: 'Event Throttle',
    raw_code: 'on scroll throttled at 100ms call updateScrollPosition()',
    description: 'Throttle scroll handler',
    feature: 'events',
  },
  {
    id: 'event-from-elsewhere',
    title: 'Click Elsewhere',
    raw_code: 'on click from elsewhere remove .open from me',
    description: 'Handle clicks outside element',
    feature: 'events',
  },
  {
    id: 'event-key-combo',
    title: 'Key Combination',
    raw_code: 'on keydown[key=="Enter"] if event.shiftKey call submitAndContinue() end',
    description: 'Handle Shift+Enter key combo',
    feature: 'events',
  },

  // ==========================================================================
  // Async - Loading States
  // ==========================================================================
  {
    id: 'fetch-loading-state',
    title: 'Fetch With Loading State',
    raw_code: 'on click add .loading to me fetch /api/data then remove .loading from me put it into #result',
    description: 'Show loading indicator during fetch',
    feature: 'async',
  },
  {
    id: 'fetch-error-handling',
    title: 'Fetch With Error Handling',
    raw_code: 'on click fetch /api/data as json then if it.error put it.error into #error else put it.data into #result end',
    description: 'Handle API errors by checking response body',
    feature: 'async',
  },

  // ==========================================================================
  // Control Flow - Advanced
  // ==========================================================================
  {
    id: 'if-matches',
    title: 'If Matches Selector',
    raw_code: 'on click if I match .disabled halt else toggle .active end',
    description: 'Check if element matches selector',
    feature: 'control-flow',
  },
  {
    id: 'if-exists',
    title: 'If Element Exists',
    raw_code: 'on click if #modal exists show #modal else make a <div#modal/> put it into body end',
    description: 'Check if element exists before action',
    feature: 'control-flow',
  },
  {
    id: 'if-empty',
    title: 'If Value Empty',
    raw_code: 'on blur if my value is empty add .error to me put "Required" into next .error-message end',
    description: 'Validate empty input',
    feature: 'control-flow',
  },
  {
    id: 'unless-condition',
    title: 'Unless Condition',
    raw_code: 'on click unless I match .disabled toggle .selected',
    description: 'Execute unless condition is true',
    feature: 'control-flow',
  },

  // ==========================================================================
  // Clipboard
  // ==========================================================================
  {
    id: 'copy-to-clipboard',
    title: 'Copy To Clipboard',
    raw_code: 'on click call navigator.clipboard.writeText(#code.innerText) put "Copied!" into me wait 2s put "Copy" into me',
    description: 'Copy text to clipboard with feedback',
    feature: 'clipboard',
  },

  // ==========================================================================
  // Animation - Complex
  // ==========================================================================
  {
    id: 'fade-out-remove',
    title: 'Fade Out And Remove',
    raw_code: 'on click transition opacity to 0 over 300ms then remove me',
    description: 'Fade element out then remove from DOM',
    feature: 'animation',
  },
  {
    id: 'slide-toggle',
    title: 'Slide Toggle',
    raw_code: 'on click toggle .collapsed on next .panel transition *max-height over 300ms',
    description: 'Slide panel open/closed',
    feature: 'animation',
  },
  {
    id: 'stagger-animation',
    title: 'Stagger Animation',
    raw_code: 'on load repeat for item in .item with index add .visible to item wait 100ms end',
    description: 'Staggered entrance animation',
    feature: 'animation',
  },

  // ==========================================================================
  // Data Binding
  // ==========================================================================
  {
    id: 'two-way-binding',
    title: 'Two-Way Binding',
    raw_code: 'on input from #firstName set #greeting.innerText to "Hello, " + my value',
    description: 'Update display as input changes',
    feature: 'data',
  },
  {
    id: 'computed-value',
    title: 'Computed Value',
    raw_code: 'on input from .quantity set #total.innerText to (the value of #price as Number) * (my value as Number)',
    description: 'Calculate and display computed value',
    feature: 'data',
  },

  // ==========================================================================
  // Accessibility
  // ==========================================================================
  {
    id: 'toggle-aria-expanded',
    title: 'Toggle ARIA Expanded',
    raw_code: 'on click toggle @aria-expanded on me toggle .open on next .panel',
    description: 'Toggle ARIA expanded state',
    feature: 'accessibility',
  },
  {
    id: 'announce-screen-reader',
    title: 'Screen Reader Announcement',
    raw_code: 'on success put event.detail.message into #sr-announce set @role to "alert" on #sr-announce',
    description: 'Announce message to screen readers',
    feature: 'accessibility',
  },
  {
    id: 'focus-trap',
    title: 'Focus Trap',
    raw_code: 'on keydown[key=="Tab"] from .modal if target matches last <button/> in .modal focus first <button/> in .modal halt end',
    description: 'Trap focus within modal',
    feature: 'accessibility',
  },

  // ==========================================================================
  // HyperFixi Extensions - Possessive Dot Notation
  // These patterns use HyperFixi-specific syntax that may not work in official _hyperscript
  // ==========================================================================
  {
    id: 'set-text-possessive-dot',
    title: 'Set Text (Possessive Dot)',
    raw_code: 'on click set my.textContent to "Done!"',
    description: 'Set text content using possessive dot notation (HyperFixi extension)',
    feature: 'hyperfixi-extensions',
    engine: 'lokascript',
  },
  {
    id: 'set-inner-html-possessive-dot',
    title: 'Set innerHTML (Possessive Dot)',
    raw_code: 'on click set my.innerHTML to "<strong>Updated!</strong>"',
    description: 'Set innerHTML using possessive dot notation (HyperFixi extension)',
    feature: 'hyperfixi-extensions',
    engine: 'lokascript',
  },
  {
    id: 'get-value-possessive-dot',
    title: 'Get Input Value (Possessive Dot)',
    raw_code: 'on input put my.value into #preview',
    description: 'Mirror input value using possessive dot notation (HyperFixi extension)',
    feature: 'hyperfixi-extensions',
    engine: 'lokascript',
  },
  {
    id: 'method-call-possessive-dot',
    title: 'Method Call (Possessive Dot)',
    raw_code: 'on input put my.value.toUpperCase() into #preview',
    description: 'Call method on property using possessive dot notation (HyperFixi extension)',
    feature: 'hyperfixi-extensions',
    engine: 'lokascript',
  },
  {
    id: 'chained-access-possessive-dot',
    title: 'Chained Property Access (Possessive Dot)',
    raw_code: 'on click set my.parentElement.style.display to "none"',
    description: 'Chained property access using possessive dot notation (HyperFixi extension)',
    feature: 'hyperfixi-extensions',
    engine: 'lokascript',
  },
  {
    id: 'optional-chaining-possessive',
    title: 'Optional Chaining (Possessive)',
    raw_code: 'on click log my?.dataset?.customValue',
    description: 'Safe property access using optional chaining (HyperFixi extension)',
    feature: 'hyperfixi-extensions',
    engine: 'lokascript',
  },
  {
    id: 'get-attribute-possessive-dot',
    title: 'Get Attribute (Possessive Dot)',
    raw_code: 'on click put my.getAttribute("data-id") into #output',
    description: 'Call getAttribute using possessive dot notation (HyperFixi extension)',
    feature: 'hyperfixi-extensions',
    engine: 'lokascript',
  },
  {
    id: 'its-value-possessive-dot',
    title: 'Its Value (Possessive Dot)',
    raw_code: 'on click fetch /api/data then put its.name into #result',
    description: 'Access result property using its.property syntax (HyperFixi extension)',
    feature: 'hyperfixi-extensions',
    engine: 'lokascript',
  },
];

// Language word orders
const WORD_ORDERS: Record<string, string> = {
  en: 'SVO',
  es: 'SVO',
  fr: 'SVO',
  pt: 'SVO',
  id: 'SVO',
  sw: 'SVO',
  zh: 'SVO',
  ja: 'SOV',
  ko: 'SOV',
  tr: 'SOV',
  qu: 'SOV',
  ar: 'VSO',
  de: 'V2',
};

// Simple translations for seed data (English only, others can be generated)
const SEED_TRANSLATIONS: Array<{
  code_example_id: string;
  language: string;
  hyperscript: string;
}> = SEED_EXAMPLES.map(ex => ({
  code_example_id: ex.id,
  language: 'en',
  hyperscript: ex.raw_code,
}));

// LLM examples
const SEED_LLM_EXAMPLES: Array<{
  code_example_id: string;
  language: string;
  prompt: string;
  completion: string;
}> = [
  {
    code_example_id: 'toggle-class-basic',
    language: 'en',
    prompt: 'Toggle a class when clicking a button',
    completion: 'on click toggle .active',
  },
  {
    code_example_id: 'add-class-basic',
    language: 'en',
    prompt: 'Add a highlight class to the current element on click',
    completion: 'on click add .highlight to me',
  },
  {
    code_example_id: 'remove-class-basic',
    language: 'en',
    prompt: 'Remove a class from the element when clicked',
    completion: 'on click remove .highlight from me',
  },
  {
    code_example_id: 'set-text-basic',
    language: 'en',
    prompt: 'Set the text of an element with ID output to Hello World',
    completion: 'on click set #output.innerText to "Hello World"',
  },
  {
    code_example_id: 'put-content-basic',
    language: 'en',
    prompt: 'Replace the content of the current element with Done',
    completion: 'on click put "Done!" into me',
  },
  {
    code_example_id: 'show-element',
    language: 'en',
    prompt: 'Show a modal when clicking',
    completion: 'on click show #modal',
  },
  {
    code_example_id: 'hide-element',
    language: 'en',
    prompt: 'Hide an element when clicked',
    completion: 'on click hide #modal',
  },
  {
    code_example_id: 'wait-then',
    language: 'en',
    prompt: 'Wait 2 seconds then remove the element',
    completion: 'on click wait 2s then remove me',
  },
  {
    code_example_id: 'fetch-basic',
    language: 'en',
    prompt: 'Fetch data from an API and show it in result element',
    completion: 'on click fetch /api/data then put it into #result',
  },
  {
    code_example_id: 'increment-counter',
    language: 'en',
    prompt: 'Increment a counter when clicking',
    completion: 'on click increment #counter',
  },
  {
    code_example_id: 'log-value',
    language: 'en',
    prompt: 'Log a message to console on click',
    completion: 'on click log "Button clicked!"',
  },
  // HyperFixi Extensions - Possessive Dot Notation
  {
    code_example_id: 'set-text-possessive-dot',
    language: 'en',
    prompt: 'Set the text content of the current element to Done',
    completion: 'on click set my.textContent to "Done!"',
  },
  {
    code_example_id: 'set-inner-html-possessive-dot',
    language: 'en',
    prompt: 'Set the innerHTML of the current element',
    completion: 'on click set my.innerHTML to "<strong>Updated!</strong>"',
  },
  {
    code_example_id: 'get-value-possessive-dot',
    language: 'en',
    prompt: 'Mirror input value to another element as user types',
    completion: 'on input put my.value into #preview',
  },
  {
    code_example_id: 'method-call-possessive-dot',
    language: 'en',
    prompt: 'Convert input to uppercase and display in preview',
    completion: 'on input put my.value.toUpperCase() into #preview',
  },
  {
    code_example_id: 'chained-access-possessive-dot',
    language: 'en',
    prompt: 'Hide the parent element of the clicked button',
    completion: 'on click set my.parentElement.style.display to "none"',
  },
  {
    code_example_id: 'optional-chaining-possessive',
    language: 'en',
    prompt: 'Safely access a data attribute that might not exist',
    completion: 'on click log my?.dataset?.customValue',
  },
  {
    code_example_id: 'get-attribute-possessive-dot',
    language: 'en',
    prompt: 'Get a data attribute and put it into another element',
    completion: 'on click put my.getAttribute("data-id") into #output',
  },
  {
    code_example_id: 'its-value-possessive-dot',
    language: 'en',
    prompt: 'Fetch data and display a property from the response',
    completion: 'on click fetch /api/data then put its.name into #result',
  },
];

// =============================================================================
// Main
// =============================================================================

function initDatabase() {
  console.log('Initializing patterns database...');
  console.log(`Database path: ${dbPath}`);

  // Check for existing database
  if (existsSync(dbPath)) {
    if (forceOverwrite) {
      console.log('Removing existing database...');
      unlinkSync(dbPath);
    } else {
      console.error('Database already exists. Use --force to overwrite.');
      process.exit(1);
    }
  }

  // Create directory if needed
  const dir = dirname(dbPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }

  // Create database
  const db = new Database(dbPath);

  try {
    // Create schema
    console.log('Creating schema...');
    db.exec(SCHEMA);

    // Insert code examples
    console.log(`Inserting ${SEED_EXAMPLES.length} code examples...`);
    const insertExample = db.prepare(`
      INSERT INTO code_examples (id, title, raw_code, description, feature, engine)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const ex of SEED_EXAMPLES) {
      insertExample.run(ex.id, ex.title, ex.raw_code, ex.description, ex.feature, ex.engine ?? null);
    }

    // Insert translations
    console.log(`Inserting ${SEED_TRANSLATIONS.length} translations...`);
    const insertTranslation = db.prepare(`
      INSERT INTO pattern_translations (code_example_id, language, hyperscript, word_order, confidence, verified_parses)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const tr of SEED_TRANSLATIONS) {
      insertTranslation.run(
        tr.code_example_id,
        tr.language,
        tr.hyperscript,
        WORD_ORDERS[tr.language] || 'SVO',
        0.95,
        1 // English verified
      );
    }

    // Insert LLM examples
    console.log(`Inserting ${SEED_LLM_EXAMPLES.length} LLM examples...`);
    const insertLLMExample = db.prepare(`
      INSERT INTO llm_examples (code_example_id, language, prompt, completion, quality_score)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const ex of SEED_LLM_EXAMPLES) {
      insertLLMExample.run(ex.code_example_id, ex.language, ex.prompt, ex.completion, 0.9);
    }

    // Print summary
    const exampleCount = db.prepare('SELECT COUNT(*) as count FROM code_examples').get() as {
      count: number;
    };
    const translationCount = db.prepare('SELECT COUNT(*) as count FROM pattern_translations').get() as {
      count: number;
    };
    const llmCount = db.prepare('SELECT COUNT(*) as count FROM llm_examples').get() as {
      count: number;
    };

    console.log('\nDatabase initialized successfully!');
    console.log(`  - Code examples: ${exampleCount.count}`);
    console.log(`  - Translations: ${translationCount.count}`);
    console.log(`  - LLM examples: ${llmCount.count}`);
    console.log(`\nDatabase saved to: ${dbPath}`);
    console.log('\nTo use this database, set the LSP_DB_PATH environment variable:');
    console.log(`  export LSP_DB_PATH="${dbPath}"`);
  } finally {
    db.close();
  }
}

// Run
initDatabase();
