/**
 * The engine's public object must satisfy the type this package publishes for
 * `window.hyperfixi` / `window._hyperscript`. Type-level only: `npm run typecheck` fails when
 * `@hyperfixi/engine`'s `api` changes in a way `HyperfixiAPI` does not describe. Not built
 * and not shipped (tsconfig.json includes `src/` only).
 */
import type { api } from '@hyperfixi/engine';
import type { HyperfixiAPI } from '../src/core-api';

type Satisfies<T extends HyperfixiAPI> = T;
export type EngineAPI = Satisfies<typeof api>;
