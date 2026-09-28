/**
 * Value matrix gate — the `assign` cells. See value-matrix.ts for the matrix and
 * value-matrix-gate.ts for the assertions; one position per file so the
 * shards run in parallel.
 *
 * @vitest-environment node
 * Required, not a preference: under happy-dom the engines bind happy-dom's
 * DOM constructors, not the jsdom window's (see
 * shipped-examples-execution.test.ts).
 */
import { describeValueMatrixShard } from './value-matrix-gate';

describeValueMatrixShard('assign');
