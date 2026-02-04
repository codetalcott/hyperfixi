/**
 * Tagalog Event-handler Patterns
 *
 * VSO word order: kapag [event] [verb] [patient] sa [destination]
 * Tree-shakeable: Only included when Tagalog is imported.
 */

import type { LanguagePattern } from '../../types';

export function getEventHandlerPatternsTl(): LanguagePattern[] {
  return [
    // VSO with source: kapag [event] mula_sa [source] [body]
    {
      id: 'event-tl-kapag-source',
      language: 'tl',
      command: 'on',
      priority: 115,
      template: {
        format: 'kapag {event} mula_sa {source} {body}',
        tokens: [
          { type: 'literal', value: 'kapag', alternatives: ['kung', 'sa'] },
          { type: 'role', role: 'event' },
          { type: 'literal', value: 'mula_sa', alternatives: ['galing_sa'] },
          { type: 'role', role: 'source' },
        ],
      },
      extraction: {
        event: { position: 1 },
        source: { marker: 'mula_sa' },
      },
    },
    // VSO simple: kapag [event] [body]
    {
      id: 'event-tl-kapag',
      language: 'tl',
      command: 'on',
      priority: 105,
      template: {
        format: 'kapag {event} {body}',
        tokens: [
          { type: 'literal', value: 'kapag', alternatives: ['kung', 'sa'] },
          { type: 'role', role: 'event' },
        ],
      },
      extraction: {
        event: { position: 1 },
      },
    },
  ];
}
