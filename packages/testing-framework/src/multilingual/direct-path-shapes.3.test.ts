/**
 * Direct-path shapes gate, shard 3 of 3. See direct-path-shapes.ts for what it
 * runs and direct-path-shapes-gate.ts for the assertions.
 *
 * @vitest-environment node
 * Required, not a preference: under happy-dom the engines bind happy-dom's
 * DOM constructors, not the jsdom window's (see
 * shipped-examples-execution.test.ts).
 */
import { describeDirectPathShard } from './direct-path-shapes-gate';

describeDirectPathShard(2);
