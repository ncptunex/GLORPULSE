import type { SymptomDefinition } from '../shared/types';

/**
 * Predefined symptom list (decision D-05, pending research).
 * PLACEHOLDER demo list. Plain labels only: no medical meaning, advice or diagnosis is attached.
 * Every note says 'no-sourced-guidance' until a verified source is added.
 */
export const symptomDefinitions: SymptomDefinition[] = [
  { id: 'headache', label: 'Headache', note: { status: 'no-sourced-guidance' } },
  { id: 'tiredness', label: 'Tiredness', note: { status: 'no-sourced-guidance' } },
  { id: 'nausea', label: 'Nausea', note: { status: 'no-sourced-guidance' } },
  { id: 'dizziness', label: 'Dizziness', note: { status: 'no-sourced-guidance' } },
  { id: 'trouble-concentrating', label: 'Trouble concentrating', note: { status: 'no-sourced-guidance' } },
  { id: 'muscle-soreness', label: 'Muscle soreness', note: { status: 'no-sourced-guidance' } },
];
