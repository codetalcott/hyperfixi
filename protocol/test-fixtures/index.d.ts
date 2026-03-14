/**
 * A single conformance test fixture.
 */
export interface ConformanceFixture {
  id: string;
  description: string;
  input: string;
  expected: {
    kind: string;
    action?: string;
    roles?: Record<string, { type: string; value: unknown }>;
    flags?: Record<string, boolean>;
    annotations?: Record<string, string>;
    body?: unknown[];
    condition?: unknown;
    branches?: unknown[];
    [key: string]: unknown;
  };
  expectedRendered?: string;
  expectedError?: string;
}

/**
 * List all available fixture categories.
 */
export function listFixtures(): string[];

/**
 * Load a single fixture category by name.
 */
export function loadFixture(name: string): ConformanceFixture[];

/**
 * Load all fixtures as a map of category to test case arrays.
 */
export function loadAllFixtures(): Record<string, ConformanceFixture[]>;
