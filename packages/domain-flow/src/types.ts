/**
 * FlowScript Domain Types
 *
 * Output types for the FlowScript code generator. FlowSpec captures the
 * semantic intent of a data flow command — URL, method, response format,
 * target element, polling interval — ready for compilation to vanilla JS,
 * HTMX attributes, or route descriptors.
 */

export type FlowAction =
  | 'fetch'
  | 'poll'
  | 'stream'
  | 'submit'
  | 'transform'
  | 'enter'
  | 'follow'
  | 'perform'
  | 'capture';

/**
 * Structured data flow specification.
 *
 * Output of domain-flow's code generator. Can be used to:
 * - Generate vanilla JS (fetch, EventSource, setInterval)
 * - Generate HTMX attributes (hx-get, hx-trigger, hx-target)
 * - Extract route descriptors for server-bridge
 */
export interface FlowSpec {
  /** The command that produced this spec */
  action: FlowAction;

  /** URL for source commands (fetch, poll, stream, submit destination) */
  url?: string;

  /** HTTP method inferred from command type */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';

  /** Response format */
  responseFormat?: 'json' | 'html' | 'text' | 'sse';

  /** Target CSS selector for DOM insertion */
  target?: string;

  /** Polling interval in milliseconds (poll command) */
  intervalMs?: number;

  /** Form selector (submit command) */
  formSelector?: string;

  /** Transform function or format string (transform command) */
  transformFn?: string;

  // ----- HATEOAS-specific fields -----

  /** Link relation name (follow command) */
  linkRel?: string;

  /** Action name (perform command) */
  actionName?: string;

  /** Data source selector or inline data (perform command) */
  dataSource?: string;

  /** Variable name for captured data (capture command) */
  captureAs?: string;

  /** Property path to capture (capture command) */
  capturePath?: string;

  /** Metadata for debugging */
  metadata: {
    /** Language the command was written in */
    sourceLanguage: string;
    /** Raw role values extracted from the parsed command */
    roles: Record<string, string | undefined>;
  };
}

// =============================================================================
// Workflow Spec — siren-grail compilation target
// =============================================================================

/** A single step in a HATEOAS workflow */
export type WorkflowStep =
  | { type: 'navigate'; rel: string; capture?: Record<string, string> }
  | {
      type: 'action';
      action: string;
      data?: Record<string, unknown>;
      dataSource?: string;
      capture?: Record<string, string>;
    }
  | { type: 'stop'; result?: string; reason?: string };

/**
 * A complete HATEOAS workflow specification.
 *
 * Compiles to siren-grail's compileWorkflow() step format.
 * Can also drive an MCP server with dynamic tools.
 */
export interface WorkflowSpec {
  /** API entry point URL */
  entryPoint: string;

  /** Ordered workflow steps */
  steps: WorkflowStep[];
}
