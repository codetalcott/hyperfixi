/**
 * Hindi Event Handler Patterns
 *
 * Patterns for parsing "on event" handlers in Hindi.
 * Hindi is SOV, so event patterns follow: event पर/में action
 */

import type { LanguagePattern } from '../../types';

export function getEventHandlerPatternsHi(): LanguagePattern[] {
  return [
    // Standard event: क्लिक पर ...
    {
      id: 'event-hi-standard',
      language: 'hi',
      command: 'on',
      priority: 100,
      template: {
        format: '{event} पर',
        tokens: [
          { type: 'role', role: 'event' },
          { type: 'literal', value: 'पर', alternatives: ['में', 'जब'] },
        ],
      },
      extraction: {
        event: { position: 0 },
      },
    },
    // With source: #button से क्लिक पर ...
    {
      id: 'event-hi-with-source',
      language: 'hi',
      command: 'on',
      priority: 95,
      template: {
        format: '{source} से {event} पर',
        tokens: [
          { type: 'role', role: 'source' },
          { type: 'literal', value: 'से' },
          { type: 'role', role: 'event' },
          { type: 'literal', value: 'पर', alternatives: ['में', 'जब'] },
        ],
      },
      extraction: {
        source: { position: 0 },
        event: { marker: 'से', position: 2 },
      },
    },
    // Bare event name: क्लिक
    {
      id: 'event-hi-bare',
      language: 'hi',
      command: 'on',
      priority: 80,
      template: {
        format: '{event}',
        tokens: [{ type: 'role', role: 'event' }],
      },
      extraction: {
        event: { position: 0 },
      },
    },
  ];
}
