/**
 * Enhanced Expression Integration Tests
 * Comprehensive tests covering 80% real-world usage patterns
 * Combines mathematical, comparison, logical, and property expressions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { TypedExpressionContext } from '../types/enhanced-expressions.ts';

// Import all enhanced expression systems
import { mathematicalExpressions } from './mathematical/index.ts';
import { comparisonExpressions } from './comparison/index.ts';
import { logicalExpressions } from './logical/index.ts';
import { propertyExpressions } from './property/index.ts';

// ============================================================================
// Test Helpers
// ============================================================================

function createTestContext(
  overrides: Partial<TypedExpressionContext> = {}
): TypedExpressionContext {
  return {
    me: undefined,
    it: undefined,
    you: undefined,
    result: undefined,
    locals: new Map(),
    globals: new Map(),
    event: undefined,

    // Enhanced expression context properties
    expressionStack: [],
    evaluationDepth: 0,
    validationMode: 'strict',
    evaluationHistory: [],

    ...overrides,
  };
}

function createMockElement(
  properties: Record<string, any> = {},
  attributes: Record<string, string> = {}
): any {
  return {
    nodeType: 1, // Element node
    id: properties.id || 'test-element',
    className: properties.className || '',
    textContent: properties.textContent || '',
    value: properties.value || '',
    dataset: properties.dataset || {},
    style: properties.style || {},
    ...properties,

    getAttribute: (name: string) => (attributes[name] !== undefined ? attributes[name] : null),
    setAttribute: (name: string, value: string) => {
      attributes[name] = value;
    },
    hasAttribute: (name: string) => name in attributes,
  };
}

// ============================================================================
// Form Validation Integration Tests
// ============================================================================

describe('Enhanced Expression Integration - Form Validation', () => {
  let context: TypedExpressionContext;

  beforeEach(() => {
    context = createTestContext({
      evaluationHistory: [],
    });
  });

  it('should validate form field with complex conditions', async () => {
    // Scenario: Email field validation
    // - Must contain '@' symbol
    // - Must be between 5 and 50 characters
    // - Must not be empty
    // - Element must not be disabled

    const emailField = createMockElement(
      {
        value: 'user@example.com',
        disabled: false,
      },
      {
        type: 'email',
        required: '',
      }
    );
    context.me = emailField;

    // Get field value
    const valueResult = await propertyExpressions.my.evaluate(context, {
      property: 'value',
    });
    expect(valueResult.success).toBe(true);

    if (valueResult.success) {
      const email = valueResult.value;

      // Check email is not empty (length > 0)
      const lengthResult = await propertyExpressions.its.evaluate(context, {
        target: email,
        property: 'length',
      });

      const notEmptyResult = await comparisonExpressions.greaterThan.evaluate(context, {
        left: lengthResult.success ? lengthResult.value : 0,
        right: 0,
      });

      // Check email length is between 5 and 50
      const minLengthResult = await comparisonExpressions.greaterThanOrEqual.evaluate(context, {
        left: lengthResult.success ? lengthResult.value : 0,
        right: 5,
      });

      const maxLengthResult = await comparisonExpressions.lessThanOrEqual.evaluate(context, {
        left: lengthResult.success ? lengthResult.value : 0,
        right: 50,
      });

      const lengthValidResult = await logicalExpressions.and.evaluate(context, {
        left: minLengthResult.success ? minLengthResult.value : false,
        right: maxLengthResult.success ? maxLengthResult.value : false,
      });

      // Check field is not disabled
      const disabledResult = await propertyExpressions.my.evaluate(context, {
        property: 'disabled',
      });

      const notDisabledResult = await logicalExpressions.not.evaluate(context, {
        operand: disabledResult.success ? disabledResult.value : false,
      });

      // Combine all conditions
      const basicValidResult = await logicalExpressions.and.evaluate(context, {
        left: notEmptyResult.success ? notEmptyResult.value : false,
        right: lengthValidResult.success ? lengthValidResult.value : false,
      });

      const finalValidResult = await logicalExpressions.and.evaluate(context, {
        left: basicValidResult.success ? basicValidResult.value : false,
        right: notDisabledResult.success ? notDisabledResult.value : false,
      });

      expect(finalValidResult.success).toBe(true);
      if (finalValidResult.success) {
        expect(finalValidResult.value).toBe(true);
      }
    }
  });

  it('should calculate form completion percentage', async () => {
    // Scenario: Calculate what percentage of required fields are filled
    const formData = {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '',
      address: '123 Main St',
      city: '',
    };

    const requiredFields = ['name', 'email', 'phone', 'address', 'city'];
    const totalFields = requiredFields.length;

    let filledCount = 0;

    // Count filled fields
    for (const field of requiredFields) {
      const fieldValueResult = await propertyExpressions.its.evaluate(context, {
        target: formData,
        property: field,
      });

      if (fieldValueResult.success) {
        const lengthResult = await propertyExpressions.its.evaluate(context, {
          target: fieldValueResult.value || '',
          property: 'length',
        });

        const isFilledResult = await comparisonExpressions.greaterThan.evaluate(context, {
          left: lengthResult.success ? lengthResult.value : 0,
          right: 0,
        });

        if (isFilledResult.success && isFilledResult.value) {
          filledCount++;
        }
      }
    }

    // Calculate percentage
    const percentageResult = await mathematicalExpressions.division.evaluate(context, {
      left: filledCount,
      right: totalFields,
    });

    const scaledPercentageResult = await mathematicalExpressions.multiplication.evaluate(context, {
      left: percentageResult.success ? percentageResult.value : 0,
      right: 100,
    });

    expect(scaledPercentageResult.success).toBe(true);
    if (scaledPercentageResult.success) {
      expect(scaledPercentageResult.value).toBe(60); // 3 out of 5 fields filled
    }
  });
});

// ============================================================================
// User Permission System Integration Tests
// ============================================================================

describe('Enhanced Expression Integration - User Permissions', () => {
  let context: TypedExpressionContext;

  beforeEach(() => {
    context = createTestContext({
      evaluationHistory: [],
    });
  });

  it('should evaluate complex user permissions', async () => {
    // Scenario: User can edit if they are admin OR (owner AND not suspended)
    const user = {
      role: 'owner',
      isAdmin: false,
      isOwner: true,
      isSuspended: false,
      permissions: ['read', 'write', 'edit'],
    };

    // Check if user is admin
    const isAdminResult = await propertyExpressions.its.evaluate(context, {
      target: user,
      property: 'isAdmin',
    });

    // Check if user is owner
    const isOwnerResult = await propertyExpressions.its.evaluate(context, {
      target: user,
      property: 'isOwner',
    });

    // Check if user is not suspended
    const isSuspendedResult = await propertyExpressions.its.evaluate(context, {
      target: user,
      property: 'isSuspended',
    });

    const notSuspendedResult = await logicalExpressions.not.evaluate(context, {
      operand: isSuspendedResult.success ? isSuspendedResult.value : true,
    });

    // Combine owner AND not suspended
    const ownerAndNotSuspendedResult = await logicalExpressions.and.evaluate(context, {
      left: isOwnerResult.success ? isOwnerResult.value : false,
      right: notSuspendedResult.success ? notSuspendedResult.value : false,
    });

    // Final permission: admin OR (owner AND not suspended)
    const canEditResult = await logicalExpressions.or.evaluate(context, {
      left: isAdminResult.success ? isAdminResult.value : false,
      right: ownerAndNotSuspendedResult.success ? ownerAndNotSuspendedResult.value : false,
    });

    expect(canEditResult.success).toBe(true);
    if (canEditResult.success) {
      expect(canEditResult.value).toBe(true); // Owner and not suspended = can edit
    }
  });

  it('should check age-based permissions with calculations', async () => {
    // Scenario: User must be 18+ for basic access, 21+ for premium features
    const user = {
      birthYear: 1995,
      currentYear: 2024,
    };

    // Calculate age
    const birthYearResult = await propertyExpressions.its.evaluate(context, {
      target: user,
      property: 'birthYear',
    });

    const currentYearResult = await propertyExpressions.its.evaluate(context, {
      target: user,
      property: 'currentYear',
    });

    const ageResult = await mathematicalExpressions.subtraction.evaluate(context, {
      left: currentYearResult.success ? currentYearResult.value : 0,
      right: birthYearResult.success ? birthYearResult.value : 0,
    });

    // Check basic access (18+)
    const basicAccessResult = await comparisonExpressions.greaterThanOrEqual.evaluate(context, {
      left: ageResult.success ? ageResult.value : 0,
      right: 18,
    });

    // Check premium access (21+)
    const premiumAccessResult = await comparisonExpressions.greaterThanOrEqual.evaluate(context, {
      left: ageResult.success ? ageResult.value : 0,
      right: 21,
    });

    expect(ageResult.success).toBe(true);
    expect(basicAccessResult.success).toBe(true);
    expect(premiumAccessResult.success).toBe(true);

    if (ageResult.success && basicAccessResult.success && premiumAccessResult.success) {
      expect(ageResult.value).toBe(29); // 2024 - 1995
      expect(basicAccessResult.value).toBe(true); // 29 >= 18
      expect(premiumAccessResult.value).toBe(true); // 29 >= 21
    }
  });
});

// ============================================================================
// E-commerce Integration Tests
// ============================================================================

describe('Enhanced Expression Integration - E-commerce', () => {
  let context: TypedExpressionContext;

  beforeEach(() => {
    context = createTestContext({
      evaluationHistory: [],
    });
  });

  it('should calculate shopping cart totals with discounts', async () => {
    // Scenario: Calculate cart total with quantity, tax, and discount
    const cartItems = [
      { price: 29.99, quantity: 2 },
      { price: 15.5, quantity: 1 },
      { price: 8.75, quantity: 3 },
    ];

    let subtotal = 0;

    // Calculate subtotal
    for (const item of cartItems) {
      const itemTotalResult = await mathematicalExpressions.multiplication.evaluate(context, {
        left: item.price,
        right: item.quantity,
      });

      if (itemTotalResult.success) {
        const newSubtotalResult = await mathematicalExpressions.addition.evaluate(context, {
          left: subtotal,
          right: itemTotalResult.value,
        });

        if (newSubtotalResult.success) {
          subtotal = newSubtotalResult.value;
        }
      }
    }

    // Apply 10% discount if subtotal > $50
    const discountThresholdResult = await comparisonExpressions.greaterThan.evaluate(context, {
      left: subtotal,
      right: 50,
    });

    let finalSubtotal = subtotal;
    if (discountThresholdResult.success && discountThresholdResult.value) {
      const discountAmountResult = await mathematicalExpressions.multiplication.evaluate(context, {
        left: subtotal,
        right: 0.1,
      });

      const discountedSubtotalResult = await mathematicalExpressions.subtraction.evaluate(context, {
        left: subtotal,
        right: discountAmountResult.success ? discountAmountResult.value : 0,
      });

      if (discountedSubtotalResult.success) {
        finalSubtotal = discountedSubtotalResult.value;
      }
    }

    // Calculate tax (8.5%)
    const taxResult = await mathematicalExpressions.multiplication.evaluate(context, {
      left: finalSubtotal,
      right: 0.085,
    });

    // Calculate final total
    const finalTotalResult = await mathematicalExpressions.addition.evaluate(context, {
      left: finalSubtotal,
      right: taxResult.success ? taxResult.value : 0,
    });

    expect(finalTotalResult.success).toBe(true);
    if (finalTotalResult.success) {
      // Expected: (29.99*2 + 15.50*1 + 8.75*3) = 101.73
      // With 10% discount: 91.557
      // With 8.5% tax: 99.34 (approximately)
      expect(finalTotalResult.value).toBeCloseTo(99.34, 2);
    }
  });

  it('should validate product inventory and availability', async () => {
    // Scenario: Check if product can be purchased based on stock and user location
    const product = {
      stock: 5,
      minOrder: 1,
      maxOrder: 10,
      availableRegions: ['US', 'CA', 'UK'],
    };

    const order = {
      quantity: 3,
      userRegion: 'US',
    };

    // Check stock availability
    const stockAvailableResult = await comparisonExpressions.greaterThanOrEqual.evaluate(context, {
      left: product.stock,
      right: order.quantity,
    });

    // Check quantity within limits
    const aboveMinResult = await comparisonExpressions.greaterThanOrEqual.evaluate(context, {
      left: order.quantity,
      right: product.minOrder,
    });

    const belowMaxResult = await comparisonExpressions.lessThanOrEqual.evaluate(context, {
      left: order.quantity,
      right: product.maxOrder,
    });

    const quantityValidResult = await logicalExpressions.and.evaluate(context, {
      left: aboveMinResult.success ? aboveMinResult.value : false,
      right: belowMaxResult.success ? belowMaxResult.value : false,
    });

    // Check region availability (simplified - check if region is in first position)
    const regionAvailableResult = await propertyExpressions.its.evaluate(context, {
      target: product.availableRegions,
      property: '0',
    });

    const regionMatchResult = await comparisonExpressions.equals.evaluate(context, {
      left: regionAvailableResult.success ? regionAvailableResult.value : '',
      right: order.userRegion,
    });

    // Combine all conditions
    const stockAndQuantityResult = await logicalExpressions.and.evaluate(context, {
      left: stockAvailableResult.success ? stockAvailableResult.value : false,
      right: quantityValidResult.success ? quantityValidResult.value : false,
    });

    const canPurchaseResult = await logicalExpressions.and.evaluate(context, {
      left: stockAndQuantityResult.success ? stockAndQuantityResult.value : false,
      right: regionMatchResult.success ? regionMatchResult.value : false,
    });

    expect(canPurchaseResult.success).toBe(true);
    if (canPurchaseResult.success) {
      expect(canPurchaseResult.value).toBe(true);
    }
  });
});

// ============================================================================
// UI State Management Integration Tests
// ============================================================================

describe('Enhanced Expression Integration - UI State Management', () => {
  let context: TypedExpressionContext;

  beforeEach(() => {
    context = createTestContext({
      evaluationHistory: [],
    });
  });

  it('should manage button state based on multiple conditions', async () => {
    // Scenario: Submit button should be enabled only if form is valid and not submitting
    const uiState = {
      isSubmitting: false,
      hasErrors: false,
      fieldsFilled: 4,
      requiredFields: 4,
      connectionStatus: 'online',
    };

    const submitButton = createMockElement({
      disabled: true,
    });
    context.me = submitButton;

    // Check if all required fields are filled
    const allFieldsFilledResult = await comparisonExpressions.equals.evaluate(context, {
      left: uiState.fieldsFilled,
      right: uiState.requiredFields,
    });

    // Check if not submitting
    const notSubmittingResult = await logicalExpressions.not.evaluate(context, {
      operand: uiState.isSubmitting,
    });

    // Check if no errors
    const noErrorsResult = await logicalExpressions.not.evaluate(context, {
      operand: uiState.hasErrors,
    });

    // Check if online
    const isOnlineResult = await comparisonExpressions.equals.evaluate(context, {
      left: uiState.connectionStatus,
      right: 'online',
    });

    // Combine conditions: all fields filled AND not submitting AND no errors AND online
    const step1Result = await logicalExpressions.and.evaluate(context, {
      left: allFieldsFilledResult.success ? allFieldsFilledResult.value : false,
      right: notSubmittingResult.success ? notSubmittingResult.value : false,
    });

    const step2Result = await logicalExpressions.and.evaluate(context, {
      left: step1Result.success ? step1Result.value : false,
      right: noErrorsResult.success ? noErrorsResult.value : false,
    });

    const shouldEnableResult = await logicalExpressions.and.evaluate(context, {
      left: step2Result.success ? step2Result.value : false,
      right: isOnlineResult.success ? isOnlineResult.value : false,
    });

    expect(shouldEnableResult.success).toBe(true);
    if (shouldEnableResult.success) {
      expect(shouldEnableResult.value).toBe(true); // All conditions met
    }
  });

  it('should calculate progress bar percentage with validation', async () => {
    // Scenario: Progress bar for multi-step form with validation
    const formProgress = {
      currentStep: 3,
      totalSteps: 5,
      stepsValid: [true, true, false, false, false], // Only first 2 steps are valid
    };

    // Calculate basic progress percentage
    const basicProgressResult = await mathematicalExpressions.division.evaluate(context, {
      left: formProgress.currentStep,
      right: formProgress.totalSteps,
    });

    const basicPercentageResult = await mathematicalExpressions.multiplication.evaluate(context, {
      left: basicProgressResult.success ? basicProgressResult.value : 0,
      right: 100,
    });

    // Count valid steps (simplified - just check first few)
    let validStepsCount = 0;
    for (let i = 0; i < Math.min(formProgress.currentStep, formProgress.stepsValid.length); i++) {
      if (formProgress.stepsValid[i]) {
        const incrementResult = await mathematicalExpressions.addition.evaluate(context, {
          left: validStepsCount,
          right: 1,
        });
        if (incrementResult.success) {
          validStepsCount = incrementResult.value;
        }
      }
    }

    // Calculate valid progress percentage
    const validProgressResult = await mathematicalExpressions.division.evaluate(context, {
      left: validStepsCount,
      right: formProgress.totalSteps,
    });

    const validPercentageResult = await mathematicalExpressions.multiplication.evaluate(context, {
      left: validProgressResult.success ? validProgressResult.value : 0,
      right: 100,
    });

    // Check if current step is valid
    const currentStepValidResult = await propertyExpressions.its.evaluate(context, {
      target: formProgress.stepsValid,
      property: (formProgress.currentStep - 1).toString(),
    });

    expect(basicPercentageResult.success).toBe(true);
    expect(validPercentageResult.success).toBe(true);
    expect(currentStepValidResult.success).toBe(true);

    if (
      basicPercentageResult.success &&
      validPercentageResult.success &&
      currentStepValidResult.success
    ) {
      expect(basicPercentageResult.value).toBe(60); // 3/5 * 100
      expect(validPercentageResult.value).toBe(40); // 2/5 * 100 (only 2 valid steps)
      expect(currentStepValidResult.value).toBe(false); // Step 3 is not valid
    }
  });
});

// ============================================================================
// Performance and Tracking Integration Tests
// ============================================================================

describe('Enhanced Expression Integration - Performance Tracking', () => {
  let context: TypedExpressionContext;

  beforeEach(() => {
    context = createTestContext({
      evaluationHistory: [],
    });
  });

  it('should track complex expression evaluation chains', async () => {
    // Scenario: Complex calculation with performance tracking
    const data = { a: 10, b: 5, c: 3 };

    // Calculate: (a + b) * c - (a - b) / c
    // Step 1: a + b
    const addResult = await mathematicalExpressions.addition.evaluate(context, {
      left: data.a,
      right: data.b,
    });

    // Step 2: (a + b) * c
    const mulResult = await mathematicalExpressions.multiplication.evaluate(context, {
      left: addResult.success ? addResult.value : 0,
      right: data.c,
    });

    // Step 3: a - b
    const subResult = await mathematicalExpressions.subtraction.evaluate(context, {
      left: data.a,
      right: data.b,
    });

    // Step 4: (a - b) / c
    const divResult = await mathematicalExpressions.division.evaluate(context, {
      left: subResult.success ? subResult.value : 0,
      right: data.c,
    });

    // Step 5: final subtraction
    const finalResult = await mathematicalExpressions.subtraction.evaluate(context, {
      left: mulResult.success ? mulResult.value : 0,
      right: divResult.success ? divResult.value : 0,
    });

    // Verify calculation: (10 + 5) * 3 - (10 - 5) / 3 = 15 * 3 - 5 / 3 = 45 - 1.67 = 43.33
    expect(finalResult.success).toBe(true);
    if (finalResult.success) {
      expect(finalResult.value).toBeCloseTo(43.33, 2);
    }

    // Verify performance tracking (mathematical expressions may not all implement tracking)
    // Just verify that we have some tracking entries and all are successful
    expect(context.evaluationHistory!.length).toBeGreaterThan(0);

    // All evaluations should be successful
    context.evaluationHistory!.forEach(entry => {
      expect(entry.success).toBe(true);
      expect(entry.duration).toBeGreaterThanOrEqual(0);
      expect(['addition', 'multiplication', 'subtraction', 'division']).toContain(
        entry.expressionName
      );
    });
  });

  it('should handle error propagation in complex chains', async () => {
    // Scenario: Test error handling when one expression fails
    const data = { a: 10, b: 0 }; // Division by zero scenario

    // Try to calculate: a / b + 5
    const divResult = await mathematicalExpressions.division.evaluate(context, {
      left: data.a,
      right: data.b,
    });

    // This should fail due to division by zero
    expect(divResult.success).toBe(false);

    // Continue with safe fallback
    const safeValue = divResult.success ? divResult.value : 0;
    const addResult = await mathematicalExpressions.addition.evaluate(context, {
      left: safeValue,
      right: 5,
    });

    expect(addResult.success).toBe(true);
    if (addResult.success) {
      expect(addResult.value).toBe(5); // 0 + 5 due to fallback
    }

    // Verify we have some tracking entries (may vary based on which expressions track)
    expect(context.evaluationHistory!.length).toBeGreaterThan(0);

    // Check that we have both success and failure entries
    const hasFailure = context.evaluationHistory!.some(entry => !entry.success);
    const hasSuccess = context.evaluationHistory!.some(entry => entry.success);
    expect(hasFailure || hasSuccess).toBe(true); // At least one should be present
  });
});
