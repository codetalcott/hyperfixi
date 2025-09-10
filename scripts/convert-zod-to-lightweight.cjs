#!/usr/bin/env node

/**
 * Automated Zod to Lightweight Validator Converter
 * 
 * This script automatically converts zod imports and schemas to our lightweight
 * validator system across the entire codebase.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  sourceDir: path.join(__dirname, '../packages/core/src'),
  backupDir: path.join(__dirname, '../packages/core/src-backup'),
  dryRun: false, // Set to true for testing
  verbose: true
};

// Conversion mappings
const conversions = {
  // Import conversions
  imports: {
    "import { z } from 'zod';": "import { v, type RuntimeValidator } from '../../validation/lightweight-validators';",
    'import { z } from "zod";': 'import { v, type RuntimeValidator } from "../../validation/lightweight-validators";'
  },
  
  // Schema conversions
  schemas: [
    // Basic types
    { pattern: /z\.string\(\)/g, replacement: 'v.string()' },
    { pattern: /z\.string\(\{([^}]*)\}\)/g, replacement: 'v.string({$1})' },
    { pattern: /z\.number\(\)/g, replacement: 'v.number()' },
    { pattern: /z\.boolean\(\)/g, replacement: 'v.boolean()' },
    
    // Literals
    { pattern: /z\.literal\(([^)]+)\)/g, replacement: 'v.literal($1)' },
    
    // Arrays and tuples
    { pattern: /z\.array\(([^)]+)\)/g, replacement: 'v.array($1)' },
    { pattern: /z\.tuple\(\[([^\]]*)\]\)/g, replacement: 'v.tuple([$1])' },
    
    // Objects
    { pattern: /z\.object\(\{([^}]*)\}\)/g, replacement: 'v.object({$1})' },
    
    // Unions
    { pattern: /z\.union\(\[([^\]]*)\]\)/g, replacement: 'v.union([$1])' },
    
    // Modifiers
    { pattern: /\.optional\(\)/g, replacement: '.optional()' },
    { pattern: /\.describe\(([^)]+)\)/g, replacement: '.describe($1)' },
    { pattern: /\.min\((\d+)\)/g, replacement: '.min($1)' },
    { pattern: /\.max\((\d+)\)/g, replacement: '.max($1)' },
    
    // Special zod methods that need custom handling
    { pattern: /z\.instanceof\(HTMLElement\)/g, replacement: 'v.instanceOf(HTMLElement)' },
    { pattern: /z\.unknown\(\)/g, replacement: 'v.unknown()' },
    { pattern: /z\.any\(\)/g, replacement: 'v.any()' },
    { pattern: /z\.null\(\)/g, replacement: 'v.null()' },
    { pattern: /z\.undefined\(\)/g, replacement: 'v.undefined()' }
  ]
};

/**
 * Get all TypeScript files in directory recursively
 */
function getTypeScriptFiles(dir) {
  const files = [];
  
  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        traverse(fullPath);
      } else if (item.endsWith('.ts') && !item.endsWith('.d.ts')) {
        files.push(fullPath);
      }
    }
  }
  
  traverse(dir);
  return files;
}

/**
 * Check if file contains zod imports
 */
function containsZodImports(content) {
  return content.includes('from "zod"') || content.includes("from 'zod'");
}

/**
 * Convert zod imports to lightweight validators
 */
function convertImports(content) {
  let converted = content;
  
  for (const [pattern, replacement] of Object.entries(conversions.imports)) {
    converted = converted.replace(new RegExp(pattern, 'g'), replacement);
  }
  
  return converted;
}

/**
 * Convert zod schemas to lightweight validators
 */
function convertSchemas(content) {
  let converted = content;
  
  for (const conversion of conversions.schemas) {
    converted = converted.replace(conversion.pattern, conversion.replacement);
  }
  
  return converted;
}

/**
 * Fix import paths relative to file location
 */
function fixImportPaths(content, filePath) {
  const relativePath = path.relative(path.dirname(filePath), path.join(config.sourceDir, 'validation'));
  const correctedPath = relativePath.replace(/\\/g, '/'); // Normalize path separators
  
  // Replace the generic import path with the correct relative path
  const importPattern = /import\s*\{\s*v,\s*type\s*RuntimeValidator\s*\}\s*from\s*['"][^'"]*validation\/lightweight-validators['"];?/g;
  const correctImport = `import { v, type RuntimeValidator } from '${correctedPath}/lightweight-validators';`;
  
  return content.replace(importPattern, correctImport);
}

/**
 * Add missing validator types
 */
function addMissingValidators(content) {
  // Add missing validator methods that don't exist in our lightweight system
  const additions = [];
  
  if (content.includes('v.number()') && !content.includes('createNumberValidator')) {
    additions.push(`
// Missing number validator - add to lightweight-validators.ts if needed
const createNumberValidator = () => v.string({ pattern: /^\\d+$/ });
`);
  }
  
  if (content.includes('v.instanceOf(HTMLElement)')) {
    // Replace instanceof with custom validation
    content = content.replace(/v\.instanceOf\(HTMLElement\)/g, 'v.custom((value) => value instanceof HTMLElement)');
  }
  
  if (additions.length > 0) {
    content = additions.join('\n') + '\n' + content;
  }
  
  return content;
}

/**
 * Convert a single file
 */
function convertFile(filePath) {
  if (config.verbose) {
    console.log(`Processing: ${path.relative(config.sourceDir, filePath)}`);
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  
  if (!containsZodImports(content)) {
    if (config.verbose) {
      console.log(`  Skipped: No zod imports found`);
    }
    return false;
  }
  
  let converted = content;
  
  // Step 1: Convert imports
  converted = convertImports(converted);
  
  // Step 2: Convert schemas
  converted = convertSchemas(converted);
  
  // Step 3: Fix import paths
  converted = fixImportPaths(converted, filePath);
  
  // Step 4: Add missing validators
  converted = addMissingValidators(converted);
  
  if (config.dryRun) {
    console.log(`\n=== ${filePath} ===`);
    console.log('Original import:');
    const importMatch = content.match(/import.*from.*zod.*/);
    if (importMatch) console.log(importMatch[0]);
    
    console.log('Converted import:');
    const convertedImportMatch = converted.match(/import.*RuntimeValidator.*from.*/);
    if (convertedImportMatch) console.log(convertedImportMatch[0]);
    
    return true;
  }
  
  // Write the converted file
  fs.writeFileSync(filePath, converted, 'utf8');
  
  if (config.verbose) {
    console.log(`  ✅ Converted successfully`);
  }
  
  return true;
}

/**
 * Create backup of source directory
 */
function createBackup() {
  if (fs.existsSync(config.backupDir)) {
    console.log('⚠️  Backup directory already exists, skipping backup');
    return;
  }
  
  console.log('📦 Creating backup...');
  
  function copyDir(src, dest) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    
    const items = fs.readdirSync(src);
    
    for (const item of items) {
      const srcPath = path.join(src, item);
      const destPath = path.join(dest, item);
      const stat = fs.statSync(srcPath);
      
      if (stat.isDirectory()) {
        copyDir(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
  
  copyDir(config.sourceDir, config.backupDir);
  console.log(`✅ Backup created at: ${config.backupDir}`);
}

/**
 * Update lightweight validators with missing methods
 */
function updateLightweightValidators() {
  const validatorPath = path.join(config.sourceDir, 'validation/lightweight-validators.ts');
  const content = fs.readFileSync(validatorPath, 'utf8');
  
  // Add missing validator methods
  const additions = `
/**
 * Creates a number validator
 */
export function createNumberValidator(options: { min?: number; max?: number } = {}): RuntimeValidator<number> {
  if (skipValidation) {
    return createPassthroughValidator<number>();
  }

  return {
    validate: (value: unknown): ValidationResult<number> => {
      const num = Number(value);
      if (isNaN(num)) {
        return {
          success: false,
          error: {
            message: \`Expected number, received \${typeof value}\`,
            path: []
          }
        };
      }

      if (options.min !== undefined && num < options.min) {
        return {
          success: false,
          error: {
            message: \`Number must be at least \${options.min}\`,
            path: []
          }
        };
      }

      if (options.max !== undefined && num > options.max) {
        return {
          success: false,
          error: {
            message: \`Number must be at most \${options.max}\`,
            path: []
          }
        };
      }

      return { success: true, data: num };
    }
  };
}

/**
 * Creates a custom validator
 */
export function createCustomValidator<T>(
  validator: (value: unknown) => boolean,
  errorMessage = 'Custom validation failed'
): RuntimeValidator<T> {
  if (skipValidation) {
    return createPassthroughValidator<T>();
  }

  return {
    validate: (value: unknown): ValidationResult<T> => {
      if (validator(value)) {
        return { success: true, data: value as T };
      }

      return {
        success: false,
        error: {
          message: errorMessage,
          path: []
        }
      };
    }
  };
}
`;

  // Add to v object
  const updatedV = `
export const v = {
  string: (options?: StringValidatorOptions) => createStringValidator(options || {}),
  number: (options?: { min?: number; max?: number }) => createNumberValidator(options || {}),
  object: createObjectValidator,
  array: createArrayValidator,
  tuple: createTupleValidator,
  union: createUnionValidator,
  literal: createLiteralValidator,
  custom: createCustomValidator,
  unknown: () => createPassthroughValidator<unknown>(),
  any: () => createPassthroughValidator<any>(),
  null: () => createLiteralValidator(null),
  undefined: () => createLiteralValidator(undefined),
  instanceOf: (constructor: any) => createCustomValidator(
    (value) => value instanceof constructor,
    \`Expected instance of \${constructor.name}\`
  )
};`;

  // Insert additions before the existing v object
  const vObjectIndex = content.lastIndexOf('export const v = {');
  if (vObjectIndex !== -1) {
    const beforeV = content.substring(0, vObjectIndex);
    const afterV = content.substring(content.indexOf('};', vObjectIndex) + 2);
    
    const updatedContent = beforeV + additions + '\n' + updatedV + afterV;
    
    if (!config.dryRun) {
      fs.writeFileSync(validatorPath, updatedContent, 'utf8');
    }
    
    console.log('✅ Updated lightweight validators with missing methods');
  }
}

/**
 * Main conversion function
 */
function main() {
  console.log('🔧 Zod to Lightweight Validator Converter');
  console.log('==========================================\n');
  
  if (config.dryRun) {
    console.log('🧪 DRY RUN MODE - No files will be modified\n');
  } else {
    // Create backup before making changes
    createBackup();
  }
  
  // Update lightweight validators first
  updateLightweightValidators();
  
  // Find all TypeScript files
  const files = getTypeScriptFiles(config.sourceDir);
  console.log(`📁 Found ${files.length} TypeScript files\n`);
  
  // Convert files
  let convertedCount = 0;
  
  for (const file of files) {
    if (convertFile(file)) {
      convertedCount++;
    }
  }
  
  console.log(`\n✅ Conversion complete!`);
  console.log(`📊 Converted ${convertedCount} files out of ${files.length} total files`);
  
  if (!config.dryRun) {
    console.log(`💾 Original files backed up to: ${config.backupDir}`);
    console.log(`\n🎯 Next steps:`);
    console.log(`   1. Test the demo: http://localhost:5501/complete-demo.html`);
    console.log(`   2. Run tests to verify conversion`);
    console.log(`   3. If issues occur, restore from backup`);
  }
}

// Run the converter
if (require.main === module) {
  main();
}

module.exports = { convertFile, main };