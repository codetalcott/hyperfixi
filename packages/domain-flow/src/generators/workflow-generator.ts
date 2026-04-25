/**
 * Workflow Generator — HATEOAS compilation target
 *
 * Converts a sequence of parsed FlowSpec objects into a WorkflowSpec
 * compatible with siren-grail's compileWorkflow() step format.
 *
 * This is the bridge between FlowScript's natural-language parsing
 * and siren-grail's workflow execution engine.
 */

import type { FlowSpec, WorkflowSpec, WorkflowStep } from '../types.js';

/**
 * Convert an ordered array of FlowSpecs (from parsed HATEOAS commands)
 * into a WorkflowSpec ready for siren-grail execution.
 *
 * The first 'enter' command provides the entry point URL.
 * Subsequent follow/perform/capture commands become workflow steps.
 *
 * @throws Error if no 'enter' command is found in the specs
 */
export function toWorkflowSpec(specs: FlowSpec[]): WorkflowSpec {
  let entryPoint: string | undefined;
  const steps: WorkflowStep[] = [];

  // Track the last step so capture can attach to it
  let lastStep: WorkflowStep | undefined;

  for (const spec of specs) {
    switch (spec.action) {
      case 'enter': {
        if (!spec.url) throw new Error('enter command requires a URL');
        entryPoint = spec.url;
        break;
      }

      case 'follow': {
        if (!spec.linkRel) throw new Error('follow command requires a link relation');
        const step: WorkflowStep = { type: 'navigate', rel: spec.linkRel };
        steps.push(step);
        lastStep = step;
        break;
      }

      case 'perform': {
        if (!spec.actionName) throw new Error('perform command requires an action name');
        const step: WorkflowStep = {
          type: 'action',
          action: spec.actionName,
        };
        if (spec.dataSource) {
          step.dataSource = spec.dataSource;
        }
        steps.push(step);
        lastStep = step;
        break;
      }

      case 'capture': {
        if (!spec.captureAs) throw new Error('capture command requires a variable name');

        // Capture attaches to the previous step as a capture modifier
        if (lastStep && (lastStep.type === 'navigate' || lastStep.type === 'action')) {
          if (!lastStep.capture) lastStep.capture = {};
          lastStep.capture[spec.captureAs] = spec.capturePath || 'properties';
        } else {
          // Standalone capture — attach to an implicit navigate to 'self'
          const step: WorkflowStep = {
            type: 'navigate',
            rel: 'self',
            capture: { [spec.captureAs]: spec.capturePath || 'properties' },
          };
          steps.push(step);
          lastStep = step;
        }
        break;
      }

      default:
        // Non-HATEOAS commands (fetch, poll, etc.) are not part of workflows
        break;
    }
  }

  if (!entryPoint) {
    throw new Error('Workflow requires an "enter" command to specify the API entry point');
  }

  return { entryPoint, steps };
}

/**
 * Convert a WorkflowSpec to siren-grail's compileWorkflow() step format.
 *
 * This produces a plain JSON array compatible with:
 *   import { compileWorkflow } from 'siren-agent/workflow';
 *   const decide = compileWorkflow(steps);
 */
export function toSirenGrailSteps(spec: WorkflowSpec): Array<Record<string, unknown>> {
  return spec.steps.map(step => {
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
