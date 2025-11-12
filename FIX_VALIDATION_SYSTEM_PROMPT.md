# Fix Lightweight Validation System - Method Chaining Issues

## Context

You are working on the HyperFixi project's lightweight runtime validation system located at:
- **File**: `packages/core/src/validation/lightweight-validators.ts` (824 lines)
- **Purpose**: Provide runtime validation without Zod dependency, mimicking Zod's API for compatibility
- **Architecture**: Uses factory functions that create validator objects with chainable methods

## Problem Statement

The validation system has critical issues with method chaining, specifically:

1. **`.optional()` doesn't work correctly** when chained with other methods
2. **`.default()` doesn't apply default values** when fields are undefined
3. **Method wrappers get overridden** when validators pass through `addDescribeToValidator()`

### Real-World Impact

Commands that use schemas like this are failing validation tests:

```typescript
// This schema causes validation failures
export const CopyCommandInputSchema = v.object({
  source: v.any().describe('Text string or HTML element to copy'),
  format: v.enum(['text', 'html']).optional().default('text'), // ❌ Default not applied
});

// Test that fails:
copyCommand.validate({ source: 'test' });
// Returns: { isValid: false, errors: [{ message: "Expected string, received undefined" }] }
// Expected: { isValid: true, data: { source: 'test', format: 'text' } }
```

## Current Architecture

### Key Functions

1. **`addDescribeMethod()`** (lines 73-166): Initial validator wrapper, has working implementations
2. **`addDescribeToValidator()`** (lines 603-700): Secondary wrapper that **overrides methods with stubs**
3. **`createEnumValidator()`** (lines 762-794): Creates enum validators
4. **`createObjectValidator()`** (lines 268-350): Validates object shapes

### The Problem Flow

```typescript
// Step 1: Create enum validator
const enumValidator = v.enum(['text', 'html']);
// ✅ Has working validate() method

// Step 2: Chain .optional()
const optionalValidator = enumValidator.optional();
// ✅ Creates wrapper with custom validate() that allows undefined

// Step 3: Chain .default()
const withDefault = optionalValidator.default('text');
// ❌ Calls addDescribeToValidator() which overwrites the custom validate()
// ❌ The wrapped validate() method gets replaced with a stub that doesn't handle defaults

// Step 4: Object validation
v.object({ format: withDefault }).validate({ format: undefined })
// ❌ Returns error because the default was never applied
```

## Specific Issues in Code

### Issue 1: `addDescribeToValidator` Overwrites Custom Validators (lines 603-705)

**Current code** (lines 654-705):
```typescript
if (!validator.default || (validator.default as any)?._isStubDefault) {
  validator.default = function(defaultValue: any) {
    const originalValidate = this.validate.bind(this);
    const defaultValidator = {
      ...this,
      _defaultValue: defaultValue,
      _baseValidator: this,
      validate(value: unknown): ValidationResult<any> {
        if (value === undefined) {
          return { success: true, data: defaultValue };
        }
        return originalValidate(value);
      }
    };
    // ❌ When this new validator is used, it gets passed through addDescribeToValidator again
    // which can override the custom validate() method
    return defaultValidator as RuntimeValidator<any>;
  };
  (validator.default as any)._isStubDefault = true;
}
```

**Problem**: The returned validator still goes through validation but the chain of wrappers loses track of custom behavior.

### Issue 2: Optional Chaining Lost (lines 623-639)

**Current code**:
```typescript
if (!validator.optional) {
  validator.optional = function() {
    const originalValidate = this.validate.bind(this);
    const optionalValidator = {
      ...this,
      validate: (value: unknown): ValidationResult<T | undefined> => {
        if (value === undefined || value === null) {
          return { success: true, data: undefined };
        }
        return originalValidate(value);
      }
    };
    return addDescribeToValidator(optionalValidator); // ❌ This call can break the chain
  };
}
```

**Problem**: When `addDescribeToValidator` is called, it may add a NEW `.optional()` method that doesn't respect the existing wrapper.

### Issue 3: Object Validator Doesn't Handle Optional Fields (lines 308-340)

**Current code** (lines 308-340):
```typescript
for (const [fieldName, validator] of Object.entries(fields)) {
  const fieldValue = obj[fieldName];
  const fieldResult = validator.validate(fieldValue);

  if (!fieldResult.success) {
    // ❌ Fails before checking if field is optional
    return { success: false, error: ... };
  }

  // Check for required fields
  if (fieldResult.data === undefined && !(fieldValue === undefined)) {
    return { success: false, error: ... };
  }
}
```

**Problem**: Optional fields with undefined values fail validation before the optional wrapper can handle them.

## Test Cases That Must Pass

### Test 1: Optional Enum Field
```typescript
const schema = v.object({
  format: v.enum(['text', 'html']).optional()
});

// Should pass - field is optional
const result = schema.validate({});
assert(result.success === true);
assert(result.data.format === undefined);
```

### Test 2: Default Value Application
```typescript
const schema = v.object({
  format: v.enum(['text', 'html']).optional().default('text')
});

// Should apply default when undefined
const result = schema.validate({});
assert(result.success === true);
assert(result.data.format === 'text'); // ❌ Currently fails
```

### Test 3: Explicit Value Overrides Default
```typescript
const schema = v.object({
  format: v.enum(['text', 'html']).optional().default('text')
});

// Should use explicit value
const result = schema.validate({ format: 'html' });
assert(result.success === true);
assert(result.data.format === 'html');
```

### Test 4: Chained Optional + Default in Object
```typescript
const schema = v.object({
  source: v.any(),
  format: v.enum(['text', 'html']).optional().default('text'),
  ttl: v.number().optional()
});

// All three cases should work:
// 1. No optional fields provided
const result1 = schema.validate({ source: 'test' });
assert(result1.success === true);
assert(result1.data.format === 'text'); // default applied
assert(result1.data.ttl === undefined);

// 2. Some optional fields provided
const result2 = schema.validate({ source: 'test', format: 'html' });
assert(result2.success === true);
assert(result2.data.format === 'html');
assert(result2.data.ttl === undefined);

// 3. All fields provided
const result3 = schema.validate({ source: 'test', format: 'html', ttl: 3600 });
assert(result3.success === true);
assert(result3.data.format === 'html');
assert(result3.data.ttl === 3600);
```

## Files to Modify

1. **Primary**: `packages/core/src/validation/lightweight-validators.ts`
2. **Test file**: Create `packages/core/src/validation/lightweight-validators.test.ts` with the test cases above

## Constraints and Requirements

1. **No Breaking Changes**: The API must remain compatible with existing code
2. **No Dependencies**: Cannot add external libraries (this is the whole point!)
3. **Performance**: Keep validation fast - avoid unnecessary iterations
4. **Type Safety**: Maintain TypeScript types
5. **Existing Tests Must Pass**: Don't break other commands that use the validation system

## Current Workaround (Not Ideal)

The current workaround is to:
1. Remove `.default()` from schemas
2. Handle defaults in `execute()` methods instead
3. Update tests to provide explicit values

This works but defeats the purpose of having a declarative schema.

## Suggested Approach (Not Prescriptive)

Possible solutions to consider:

### Option A: Track Wrapper Chain
Add metadata to track which wrappers have been applied:
```typescript
{
  _isOptional: true,
  _hasDefault: true,
  _defaultValue: 'text',
  _wrappedValidators: [originalValidator, optionalWrapper, defaultWrapper]
}
```

### Option B: Single Unified Wrapper
Instead of chaining wrappers, create a single wrapper that handles all cases:
```typescript
function createChainableValidator(baseValidator, options = {}) {
  return {
    validate(value) {
      // Handle optional
      if (options.isOptional && value === undefined) {
        return { success: true, data: options.defaultValue };
      }
      // Handle default
      if (value === undefined && options.hasDefault) {
        return { success: true, data: options.defaultValue };
      }
      // Validate normally
      return baseValidator.validate(value);
    },
    optional() {
      return createChainableValidator(baseValidator, { ...options, isOptional: true });
    },
    default(val) {
      return createChainableValidator(baseValidator, { ...options, hasDefault: true, defaultValue: val });
    }
  };
}
```

### Option C: Fix Object Validator to Respect Metadata
Check for `_isOptional` and `_defaultValue` flags in the object validator before failing.

## Success Criteria

1. ✅ All 4 test cases above pass
2. ✅ Existing copy command tests pass (24/24)
3. ✅ Existing persist command tests pass (35/35)
4. ✅ No breaking changes to other commands
5. ✅ TypeScript compilation with no errors

## Additional Context

- **Related Files**:
  - `packages/core/src/commands/utility/copy.ts` (uses the validation system)
  - `packages/core/src/commands/data/persist.ts` (uses the validation system)
  - `packages/core/src/commands/data/bind.ts` (working example without optional/default)

- **Testing**: Run `npm test --workspace=@hyperfixi/core` to validate changes

- **Documentation**: The validation system is meant to be a lightweight alternative to Zod, so maintaining API compatibility is important for future migration if needed.

## Your Task

Fix the lightweight validation system so that `.optional()` and `.default()` method chaining works correctly, allowing the test cases above to pass while maintaining backward compatibility with existing code.

Please explain your approach before implementing, and provide test cases to validate the fix.
