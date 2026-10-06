/**
 * Command-shape gate, shard 1 of 3. See command-shapes.ts for what it runs
 * and command-shapes-gate.ts for the assertions.
 *
 * @vitest-environment node
 */
import { describeCommandShapesShard } from './command-shapes-gate';

describeCommandShapesShard(0);
