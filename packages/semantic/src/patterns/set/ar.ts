/**
 * Arabic Set Patterns
 *
 * Hand-crafted patterns for "set" command.
 * Arabic: اضبط {destination} إلى {patient}
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Arabic set patterns.
 */
export function getSetPatternsAr(): LanguagePattern[] {
  return [
    {
      id: 'set-ar-full',
      language: 'ar',
      command: 'set',
      priority: 100,
      template: {
        format: 'اضبط {destination} إلى {patient}',
        tokens: [
          { type: 'literal', value: 'اضبط', alternatives: ['أضبط', 'عيّن', 'عين', 'حدد'] },
          {
            type: 'role',
            role: 'destination',
            expectedTypes: ['property-path', 'selector', 'reference', 'expression'],
          },
          { type: 'literal', value: 'إلى', alternatives: ['الى', 'ل', 'لـ'] },
          { type: 'role', role: 'patient', expectedTypes: ['literal', 'expression', 'reference'] },
        ],
      },
      extraction: {
        destination: { position: 1 },
        patient: { marker: 'إلى', markerAlternatives: ['الى', 'ل', 'لـ'] },
      },
    },
    {
      id: 'set-ar-simple',
      language: 'ar',
      command: 'set',
      priority: 90,
      template: {
        format: 'اضبط {destination} {patient}',
        tokens: [
          { type: 'literal', value: 'اضبط', alternatives: ['أضبط', 'عيّن'] },
          {
            type: 'role',
            role: 'destination',
            expectedTypes: ['property-path', 'selector', 'reference', 'expression'],
          },
          { type: 'role', role: 'patient', expectedTypes: ['literal', 'expression', 'reference'] },
        ],
      },
      extraction: {
        destination: { position: 1 },
        patient: { position: 2 },
      },
    },
    {
      id: 'set-ar-على',
      language: 'ar',
      command: 'set',
      priority: 95,
      template: {
        format: 'اضبط {destination} على {patient}',
        tokens: [
          { type: 'literal', value: 'اضبط', alternatives: ['أضبط'] },
          {
            type: 'role',
            role: 'destination',
            expectedTypes: ['property-path', 'selector', 'reference', 'expression'],
          },
          { type: 'literal', value: 'على' },
          { type: 'role', role: 'patient', expectedTypes: ['literal', 'expression', 'reference'] },
        ],
      },
      extraction: {
        destination: { position: 1 },
        patient: { marker: 'على' },
      },
    },
  ];
}
