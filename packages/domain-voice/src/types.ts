/**
 * Voice/Accessibility Domain Types
 */

import type { SemanticNode } from '@lokascript/framework';
import { extractRoleValue } from '@lokascript/framework';

/**
 * Structured action spec extracted from a parsed voice command.
 * Useful for dispatchers that want typed access to command details
 * without re-parsing the SemanticNode.
 */
export interface VoiceActionSpec {
  action: string;
  target?: string;
  value?: string;
  direction?: string;
  amount?: string;
  metadata: {
    sourceLanguage: string;
  };
}

/**
 * Convert a parsed SemanticNode into a typed VoiceActionSpec.
 */
export function toVoiceActionSpec(node: SemanticNode, language: string): VoiceActionSpec {
  return {
    action: node.action,
    target: extractRoleValue(node, 'patient') || extractRoleValue(node, 'destination') || undefined,
    value: extractRoleValue(node, 'patient') || undefined,
    direction: extractRoleValue(node, 'manner') || undefined,
    amount: extractRoleValue(node, 'quantity') || undefined,
    metadata: { sourceLanguage: language },
  };
}
