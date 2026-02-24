/**
 * MCP Tools — Training Data Generation
 *
 * Thin wrappers around the framework's training data synthesizer.
 * Generates (natural_language, LSE) pairs from domain schemas.
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export const trainingDataTools: Tool[] = [
  {
    name: 'generate_training_data',
    description:
      'Synthesize (natural_language, LSE) training pairs from domain command schemas. Returns JSONL-formatted data for LLM fine-tuning.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        domain: {
          type: 'string',
          description:
            'Domain to generate training data for (flow, sql, bdd, llm, jsx, todo, behaviorspec, voice)',
        },
        max_per_command: {
          type: 'number',
          description: 'Maximum pairs per command. Default: 5',
        },
        languages: {
          type: 'string',
          description: 'Comma-separated language codes. Default: en',
        },
        min_quality: {
          type: 'number',
          description: 'Minimum quality threshold (0-1). Default: 0.5',
        },
        format: {
          type: 'string',
          description: 'Output format: jsonl (default) or json',
        },
      },
      required: ['domain'],
    },
  },
];

export async function handleTrainingDataTool(
  name: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  if (name !== 'generate_training_data') {
    return {
      content: [{ type: 'text', text: `Unknown training data tool: ${name}` }],
      isError: true,
    };
  }

  try {
    const { synthesizeFromSchemas, toJSONL } = await import('@lokascript/framework');

    const domain = args.domain as string;
    if (!domain) {
      return {
        content: [{ type: 'text', text: 'Missing required parameter: domain' }],
        isError: true,
      };
    }

    // Dynamically import the domain's schemas
    const schemas = await loadDomainSchemas(domain);
    if (!schemas || schemas.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `No schemas found for domain: ${domain}. Available: flow, sql, bdd, llm, jsx, todo, behaviorspec, voice`,
          },
        ],
        isError: true,
      };
    }

    const languages =
      typeof args.languages === 'string' ? args.languages.split(',').map(l => l.trim()) : ['en'];

    const result = synthesizeFromSchemas(schemas, {
      domain,
      maxPairsPerCommand: typeof args.max_per_command === 'number' ? args.max_per_command : 5,
      minQuality: typeof args.min_quality === 'number' ? args.min_quality : 0.5,
      languages,
    });

    const format = args.format === 'json' ? 'json' : 'jsonl';
    const output = format === 'json' ? JSON.stringify(result, null, 2) : toJSONL(result.pairs);

    return {
      content: [
        {
          type: 'text',
          text: `Generated ${result.metadata.pairCount} training pairs for domain "${domain}" (${result.metadata.commandCount} commands, languages: ${languages.join(', ')})\n\n${output}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Training data generation error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Dynamically load schemas for a domain.
 */
async function loadDomainSchemas(
  domain: string
): Promise<readonly import('@lokascript/framework').CommandSchema[] | null> {
  try {
    switch (domain) {
      case 'flow':
        return (await import('@lokascript/domain-flow')).allSchemas;
      case 'sql':
        return (await import('@lokascript/domain-sql')).allSchemas;
      case 'bdd':
        return (await import('@lokascript/domain-bdd')).allSchemas;
      case 'llm':
        return (await import('@lokascript/domain-llm')).allSchemas;
      case 'jsx':
        return (await import('@lokascript/domain-jsx')).allSchemas;
      case 'todo':
        return (await import('@lokascript/domain-todo')).allSchemas;
      case 'behaviorspec':
        return (await import('@lokascript/domain-behaviorspec')).allSchemas;
      case 'voice':
        return (await import('@lokascript/domain-voice')).allSchemas;
      default:
        return null;
    }
  } catch {
    return null;
  }
}
