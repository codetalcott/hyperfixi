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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_translations_language ON pattern_translations(language);
CREATE INDEX IF NOT EXISTS idx_translations_example ON pattern_translations(code_example_id);
CREATE INDEX IF NOT EXISTS idx_llm_language ON llm_examples(language);
CREATE INDEX IF NOT EXISTS idx_examples_feature ON code_examples(feature);
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
    raw_code: 'on click if I match .active then remove .active else add .active',
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
    description: 'Install a reusable behavior',
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
      INSERT INTO code_examples (id, title, raw_code, description, feature)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const ex of SEED_EXAMPLES) {
      insertExample.run(ex.id, ex.title, ex.raw_code, ex.description, ex.feature);
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
