/**
 * Value matrix gate — the `branch` position's operator-phrase cells (`is equal
 * to`, `includes`, `is an Element`, …). See value-matrix.ts for the matrix
 * and value-matrix-gate.ts for the assertions.
 *
 * @vitest-environment node
 * Required, not a preference: under happy-dom the engines bind happy-dom's
 * DOM constructors, not the jsdom window's (see
 * shipped-examples-execution.test.ts).
 */
import { describeValueMatrixShard } from './value-matrix-gate';

describeValueMatrixShard('branch', 'phrases');
