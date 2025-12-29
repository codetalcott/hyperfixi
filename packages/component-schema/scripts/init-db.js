#!/usr/bin/env node
/**
 * Initialize SQLite database for component registry
 *
 * Usage:
 *   npm run db:init           - Create database (skip if exists)
 *   npm run db:init:force     - Force recreate database
 */
const fs = require('fs');
const path = require('path');

// Parse arguments
const args = process.argv.slice(2);
const force = args.includes('--force') || args.includes('-f');
const dbPath = args.find(a => !a.startsWith('-')) || './components.db';

console.log('Component Schema Database Initializer');
console.log('=====================================');
console.log(`Database path: ${dbPath}`);
console.log(`Force mode: ${force}`);
console.log('');

// Check if database exists
const dbExists = fs.existsSync(dbPath);

if (dbExists && !force) {
  console.log('Database already exists. Use --force to recreate.');
  process.exit(0);
}

// Load the module
try {
  const { getDatabase, closeDatabase, initializeSchema, dropSchema, isSchemaInitialized } = require('../dist/index.js');

  // Get database connection
  const db = getDatabase({ dbPath });

  // Drop existing schema if force mode
  if (force && isSchemaInitialized(db)) {
    console.log('Dropping existing schema...');
    dropSchema(db);
  }

  // Initialize schema
  console.log('Creating schema...');
  initializeSchema(db);

  // Verify
  if (isSchemaInitialized(db)) {
    console.log('Schema created successfully!');
  } else {
    console.error('Failed to create schema');
    process.exit(1);
  }

  // Close connection
  closeDatabase();
  console.log('Done!');
} catch (error) {
  console.error('Error initializing database:', error.message);
  console.log('');
  console.log('Make sure to build the package first: npm run build');
  process.exit(1);
}
