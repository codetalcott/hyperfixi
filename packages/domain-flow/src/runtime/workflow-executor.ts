/**
 * Workflow Executor — siren-grail adapter
 *
 * Thin adapter that takes a WorkflowSpec (from FlowScript parsing)
 * and executes it against a Siren API using siren-grail's OODAAgent
 * and compileWorkflow().
 *
 * This bridges FlowScript's natural-language parsing to siren-grail's
 * HATEOAS agent runtime.
 *
 * @example
 * ```typescript
 * import { executeWorkflow } from '@lokascript/domain-flow/runtime';
 * import { createFlowDSL, toFlowSpec } from '@lokascript/domain-flow';
 * import { toWorkflowSpec } from '@lokascript/domain-flow/generators/workflow-generator';
 *
 * const flow = createFlowDSL();
 * const specs = [
 *   toFlowSpec(flow.parse('enter /api', 'en'), 'en'),
 *   toFlowSpec(flow.parse('follow orders', 'en'), 'en'),
 *   toFlowSpec(flow.parse('perform createOrder with #checkout', 'en'), 'en'),
 *   toFlowSpec(flow.parse('capture as orderId', 'en'), 'en'),
 * ];
 *
 * const workflow = toWorkflowSpec(specs);
 * const result = await executeWorkflow(workflow, { verbose: true });
 * ```
 */

import type { WorkflowSpec, WorkflowStep } from '../types.js';

/**
 * Result from a workflow execution.
 * Maps to siren-grail's OODAResult.
 */
export interface WorkflowResult {
  status: 'stopped' | 'error' | 'maxSteps';
  reason: string;
  result?: unknown;
  steps: number;
  history: Array<Record<string, unknown>>;
}

/**
 * Options for workflow execution.
 */
export interface ExecuteWorkflowOptions {
  /** Maximum OODA steps before stopping (default: 50) */
  maxSteps?: number;
  /** HTTP headers to send with all requests */
  headers?: Record<string, string>;
  /** Enable verbose logging (default: false) */
  verbose?: boolean;
  /** Timeout per request in ms (default: 30000) */
  timeout?: number;
  /** Enable auto-pursuit on 409 Conflict responses */
  autoPursue?: boolean;
  /** Callback on each entity navigation */
  onEntity?: (entity: unknown, url: string) => void;
  /** Callback on each decision */
  onDecision?: (decision: unknown) => void;
}

/**
 * Convert a WorkflowSpec to siren-grail's step format.
 *
 * This is a pure-data transformation — no siren-grail dependency required.
 * The step types map 1:1:
 *   WorkflowStep.navigate → { type: 'navigate', rel }
 *   WorkflowStep.action   → { type: 'action', action, data?, dataSource? }
 *   WorkflowStep.stop     → { type: 'stop', result?, reason? }
 */
function toSirenSteps(steps: WorkflowStep[]): Array<Record<string, unknown>> {
  return steps.map(step => {
    switch (step.type) {
      case 'navigate':
        return {
          type: 'navigate',
          rel: step.rel,
          ...(step.capture ? { capture: step.capture } : {}),
        };

      case 'action':
        return {
          type: 'action',
          action: step.action,
          ...(step.data ? { data: step.data } : {}),
          ...(step.dataSource ? { dataSource: step.dataSource } : {}),
          ...(step.capture ? { capture: step.capture } : {}),
        };

      case 'stop':
        return {
          type: 'stop',
          ...(step.result ? { result: step.result } : {}),
          ...(step.reason ? { reason: step.reason } : {}),
        };

      default:
        return step as Record<string, unknown>;
    }
  });
}

/**
 * Execute a WorkflowSpec against a Siren API using siren-grail.
 *
 * Requires `siren-agent` to be installed as a peer dependency.
 * Dynamically imports it to avoid hard dependency.
 *
 * @param spec - The compiled WorkflowSpec from toWorkflowSpec()
 * @param options - Execution options (headers, timeout, etc.)
 * @returns The execution result with status, history, and captured values
 *
 * @throws Error if siren-agent is not installed
 */
export async function executeWorkflow(
  spec: WorkflowSpec,
  options: ExecuteWorkflowOptions = {}
): Promise<WorkflowResult> {
  // Dynamic import to keep siren-agent as optional peer dep
  let sirenAgent: {
    OODAAgent: new (
      url: string,
      opts: Record<string, unknown>
    ) => { run(): Promise<WorkflowResult> };
    compileWorkflow: (steps: Array<Record<string, unknown>>) => unknown;
  };

  try {
    sirenAgent = await import('siren-agent');
  } catch {
    throw new Error(
      'siren-agent is required for workflow execution. Install it with: npm install siren-agent'
    );
  }

  const { OODAAgent, compileWorkflow } = sirenAgent;
  const steps = toSirenSteps(spec.steps);
  const decide = compileWorkflow(steps);

  const agent = new OODAAgent(spec.entryPoint, {
    maxSteps: options.maxSteps ?? 50,
    headers: options.headers,
    verbose: options.verbose ?? false,
    timeout: options.timeout ?? 30000,
    decide,
    ...(options.autoPursue ? { autoPursue: { maxDepth: 5 } } : {}),
    ...(options.onEntity ? { onEntity: options.onEntity } : {}),
    ...(options.onDecision ? { onDecision: options.onDecision } : {}),
  });

  return agent.run();
}

/**
 * Create a reusable workflow executor bound to specific options.
 *
 * Useful when executing multiple workflows against the same API
 * with shared headers/auth.
 */
export function createWorkflowExecutor(defaultOptions: ExecuteWorkflowOptions = {}) {
  return {
    execute(spec: WorkflowSpec, overrides?: ExecuteWorkflowOptions): Promise<WorkflowResult> {
      return executeWorkflow(spec, { ...defaultOptions, ...overrides });
    },
  };
}

// Re-export for convenience
export { toSirenSteps };
