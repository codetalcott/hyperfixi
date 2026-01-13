/**
 * Turkish Event Handler Patterns
 *
 * Tree-shakeable: Only included when Turkish is imported.
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Turkish event handler patterns.
 */
export function getEventHandlerPatternsTr(): LanguagePattern[] {
  return [
    {
      id: 'event-tr-conditional-source',
      language: 'tr',
      command: 'on',
      priority: 115,
      template: {
        format: '{source} den {event}dığında {body}',
        tokens: [
          { type: 'role', role: 'source' },
          { type: 'literal', value: 'den', alternatives: ['dan', 'ten', 'tan'] },
          { type: 'role', role: 'event' },
          {
            type: 'literal',
            value: 'dığında',
            alternatives: [
              'diğinde',
              'duğunda',
              'düğünde',
              'tığında',
              'tiğinde',
              'tuğunda',
              'tüğünde',
              'dıgında',
              'diginde',
              'dugunda',
              'dügünde',
            ],
          },
        ],
      },
      extraction: {
        source: { position: 0 },
        event: { marker: 'den', markerAlternatives: ['dan', 'ten', 'tan'] },
      },
    },
    {
      id: 'event-tr-conditional-diginda',
      language: 'tr',
      command: 'on',
      priority: 105,
      template: {
        format: '{event}dığında {body}',
        tokens: [
          { type: 'role', role: 'event' },
          {
            type: 'literal',
            value: 'dığında',
            alternatives: [
              'diğinde',
              'duğunda',
              'düğünde',
              'tığında',
              'tiğinde',
              'tuğunda',
              'tüğünde',
              'dıgında',
              'diginde',
              'dugunda',
              'dügünde',
            ],
          },
        ],
      },
      extraction: {
        event: { position: 0 },
      },
    },
    {
      id: 'event-tr-temporal-inca',
      language: 'tr',
      command: 'on',
      priority: 103,
      template: {
        format: '{event}ınca {body}',
        tokens: [
          { type: 'role', role: 'event' },
          {
            type: 'literal',
            value: 'ınca',
            alternatives: ['ince', 'unca', 'ünce', 'yınca', 'yince', 'yunca', 'yünce'],
          },
        ],
      },
      extraction: {
        event: { position: 0 },
      },
    },
    {
      id: 'event-tr-conditional-sa',
      language: 'tr',
      command: 'on',
      priority: 102,
      template: {
        format: '{event}rsa {body}',
        tokens: [
          { type: 'role', role: 'event' },
          { type: 'literal', value: 'rsa', alternatives: ['rse', 'sa', 'se'] },
        ],
      },
      extraction: {
        event: { position: 0 },
      },
    },
    {
      id: 'event-tr-simultaneity-ken',
      language: 'tr',
      command: 'on',
      priority: 95,
      template: {
        format: '{event}ken {body}',
        tokens: [
          { type: 'role', role: 'event' },
          { type: 'literal', value: 'ken' },
        ],
      },
      extraction: {
        event: { position: 0 },
      },
    },
    {
      id: 'event-tr-repetitive-dikce',
      language: 'tr',
      command: 'on',
      priority: 93,
      template: {
        format: '{event}dikçe {body}',
        tokens: [
          { type: 'role', role: 'event' },
          {
            type: 'literal',
            value: 'dikçe',
            alternatives: ['dıkça', 'dukça', 'dükçe', 'tikçe', 'tıkça', 'tukça', 'tükçe'],
          },
        ],
      },
      extraction: {
        event: { position: 0 },
      },
    },
    {
      id: 'event-tr-standard',
      language: 'tr',
      command: 'on',
      priority: 100,
      template: {
        format: '{event} olduğunda {body}',
        tokens: [
          { type: 'role', role: 'event' },
          { type: 'literal', value: 'olduğunda', alternatives: ['oldugunda', 'de', 'da'] },
        ],
      },
      extraction: {
        event: { position: 0 },
      },
    },
  ];
}
