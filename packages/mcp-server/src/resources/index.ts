/**
 * MCP Resources
 *
 * Static documentation and example resources available to MCP clients.
 */

import type { Resource } from '@modelcontextprotocol/sdk/types.js';
import {
  getCommandsReference,
  getExpressionsGuide,
  getEventsReference,
  getCommonPatterns,
  getLanguages,
  getAdapterGuide,
  getAdapterCompatibility,
  getSetupGuide,
  getLSEProtocolSpec,
} from './content.js';

// =============================================================================
// Resource Listing
// =============================================================================

export function listResources(): Resource[] {
  return [
    {
      uri: 'hyperscript://docs/commands',
      name: 'Hyperscript Commands Reference',
      description: 'Complete reference for all hyperscript commands',
      mimeType: 'text/markdown',
    },
    {
      uri: 'hyperscript://docs/expressions',
      name: 'Hyperscript Expressions Guide',
      description: 'Guide to hyperscript expression syntax',
      mimeType: 'text/markdown',
    },
    {
      uri: 'hyperscript://docs/events',
      name: 'Hyperscript Events Reference',
      description: 'Event handling and modifiers',
      mimeType: 'text/markdown',
    },
    {
      uri: 'hyperscript://examples/common',
      name: 'Common Patterns',
      description: 'Frequently used hyperscript patterns',
      mimeType: 'text/markdown',
    },
    {
      uri: 'hyperscript://languages',
      name: 'Supported Languages',
      description:
        'List of supported languages with examples, LokaScript semantic bundles, and adapter bundles for original _hyperscript',
      mimeType: 'application/json',
    },
    {
      uri: 'hyperscript://adapter',
      name: 'Hyperscript Adapter Guide',
      description:
        'Guide for @lokascript/hyperscript-adapter — multilingual plugin for original _hyperscript. Includes setup, bundle selection, and limitations.',
      mimeType: 'text/markdown',
    },
    {
      uri: 'hyperscript://adapter/compatibility',
      name: 'Adapter Language Compatibility Matrix',
      description:
        'Structured JSON showing per-language confidence levels, command coverage, bundle availability, and known limitations for the adapter.',
      mimeType: 'application/json',
    },
    {
      uri: 'hyperscript://setup/guide',
      name: 'Setup Decision Guide',
      description:
        'Structured decision tree for choosing between LokaScript and original _hyperscript adapter, and selecting the right bundle.',
      mimeType: 'application/json',
    },
    {
      uri: 'lse://protocol/spec',
      name: 'LSE Protocol Specification',
      description:
        'Quick reference for LokaScript Explicit Syntax (LSE) — bracket syntax, value types, JSON wire format.',
      mimeType: 'text/markdown',
    },
  ];
}

// =============================================================================
// Resource Reading
// =============================================================================

export function readResource(uri: string): {
  contents: Array<{ uri: string; mimeType: string; text: string }>;
} {
  switch (uri) {
    case 'hyperscript://docs/commands':
      return { contents: [{ uri, mimeType: 'text/markdown', text: getCommandsReference() }] };

    case 'hyperscript://docs/expressions':
      return { contents: [{ uri, mimeType: 'text/markdown', text: getExpressionsGuide() }] };

    case 'hyperscript://docs/events':
      return { contents: [{ uri, mimeType: 'text/markdown', text: getEventsReference() }] };

    case 'hyperscript://examples/common':
      return { contents: [{ uri, mimeType: 'text/markdown', text: getCommonPatterns() }] };

    case 'hyperscript://languages':
      return {
        contents: [
          { uri, mimeType: 'application/json', text: JSON.stringify(getLanguages(), null, 2) },
        ],
      };

    case 'hyperscript://adapter':
      return { contents: [{ uri, mimeType: 'text/markdown', text: getAdapterGuide() }] };

    case 'hyperscript://adapter/compatibility':
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(getAdapterCompatibility(), null, 2),
          },
        ],
      };

    case 'hyperscript://setup/guide':
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(getSetupGuide(), null, 2),
          },
        ],
      };

    case 'lse://protocol/spec':
      return { contents: [{ uri, mimeType: 'text/markdown', text: getLSEProtocolSpec() }] };

    default:
      throw new Error(`Unknown resource: ${uri}`);
  }
}
