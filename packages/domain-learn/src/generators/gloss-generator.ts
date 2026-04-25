/**
 * Gloss Generator — Interlinear Gloss for Learning
 *
 * Produces interlinear glosses from a SemanticNode, showing:
 *   tokens:  target language tokens  ["#buttonに", ".activeを", "追加して"]
 *   roles:   grammatical labels      ["DEST", "PAT", "VERB"]
 *   english: English gloss           ["to #button", ".active", "add (imperative)"]
 *
 * Glosses help ESL students understand the grammatical function of each
 * word/particle in context, and help code students understand the mapping
 * between natural language and programming operations.
 */

import type { SemanticNode } from '@lokascript/framework';
import { extractRoleValue } from '@lokascript/framework';
import type { InterlinearGloss, CommunicativeFunction } from '../types';
import { resolveMarker, attachMarker, getProfile } from './sentence-generator';

/** Abbreviated role labels for gloss display */
const ROLE_LABELS: Record<string, string> = {
  patient: 'PAT',
  destination: 'DEST',
  source: 'SRC',
  instrument: 'INST',
  style: 'STYLE',
  manner: 'MANNER',
};

const FUNCTION_LABELS: Record<string, string> = {
  commanding: 'imperative',
  describing: 'present',
  narrating: 'past',
  questioning: 'question',
  negating: 'negative',
  planning: 'future',
  progressing: 'progressive',
};

/** SOV languages where particles attach to nouns */
const POSTPOSITIONAL = new Set(['ja', 'ko']);

/** Command profiles for gloss generation */
const PROFILES: Record<string, { hasPatient: boolean; targetRole: string | null }> = {
  add: { hasPatient: true, targetRole: 'destination' },
  remove: { hasPatient: true, targetRole: 'source' },
  toggle: { hasPatient: true, targetRole: 'destination' },
  put: { hasPatient: true, targetRole: 'destination' },
  set: { hasPatient: true, targetRole: 'destination' },
  show: { hasPatient: true, targetRole: null },
  hide: { hasPatient: true, targetRole: null },
  get: { hasPatient: false, targetRole: 'source' },
  wait: { hasPatient: true, targetRole: null },
  fetch: { hasPatient: false, targetRole: 'source' },
  send: { hasPatient: true, targetRole: 'destination' },
  go: { hasPatient: false, targetRole: 'destination' },
  increment: { hasPatient: true, targetRole: null },
  decrement: { hasPatient: true, targetRole: null },
  take: { hasPatient: true, targetRole: 'source' },
};

/**
 * Generate an interlinear gloss for a SemanticNode.
 */
export function generateGloss(
  node: SemanticNode,
  fn: CommunicativeFunction,
  language: string
): InterlinearGloss | null {
  const profile = getProfile(language);
  if (!profile) return null;

  const verb = node.action;
  const cmdProfile = PROFILES[verb];
  if (!cmdProfile) return null;

  const forms = profile.morphologyTable[verb];
  if (!forms) return null;

  const frame = profile.frames.frames.find(f => f.function === fn);
  if (!frame) return null;

  const tokens: string[] = [];
  const roles: string[] = [];
  const english: string[] = [];

  const patientValue = extractRoleValue(node, 'patient') || '';
  const targetRole = cmdProfile.targetRole;
  const targetValue = targetRole ? extractRoleValue(node, targetRole) || '' : '';

  const isSOV = profile.frames.wordOrder === 'SOV';

  if (isSOV) {
    // SOV order: target, patient, verb
    if (targetValue && targetRole) {
      const marker = resolveMarker(verb, targetRole, language);
      tokens.push(attachMarker(targetValue, marker));
      roles.push(ROLE_LABELS[targetRole] || targetRole.toUpperCase());
      english.push(attachMarker(targetValue, resolveMarker(verb, targetRole, 'en')));
    }
    if (patientValue && cmdProfile.hasPatient) {
      const marker = resolveMarker(verb, 'patient', language);
      tokens.push(attachMarker(patientValue, marker));
      roles.push(ROLE_LABELS.patient);
      english.push(patientValue);
    }
  } else {
    // SVO order: patient, target (verb is handled separately)
    if (patientValue && cmdProfile.hasPatient) {
      const marker = resolveMarker(verb, 'patient', language);
      tokens.push(attachMarker(patientValue, marker));
      roles.push(ROLE_LABELS.patient);
      english.push(patientValue);
    }
    if (targetValue && targetRole) {
      const marker = resolveMarker(verb, targetRole, language);
      tokens.push(attachMarker(targetValue, marker));
      roles.push(ROLE_LABELS[targetRole] || targetRole.toUpperCase());
      english.push(attachMarker(targetValue, resolveMarker(verb, targetRole, 'en')));
    }
  }

  // Resolve verb form
  const verbFormPath = frame.verbForm;
  const parts = verbFormPath.split('.');
  let verbValue: unknown = forms;
  for (const part of parts) {
    if (verbValue == null || typeof verbValue !== 'object') break;
    verbValue = (verbValue as Record<string, unknown>)[part];
  }
  const verbStr = typeof verbValue === 'string' ? verbValue : verb;

  if (isSOV) {
    // Verb last in SOV
    tokens.push(verbStr);
    roles.push('VERB');
    english.push(`${verb} (${FUNCTION_LABELS[fn] || fn})`);
  } else {
    // Verb first in SVO — prepend
    tokens.unshift(verbStr);
    roles.unshift('VERB');
    english.unshift(`${verb} (${FUNCTION_LABELS[fn] || fn})`);
  }

  return { tokens, roles, english };
}
