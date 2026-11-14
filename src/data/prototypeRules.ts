import type { PrototypeRules } from '../shared/types';

/**
 * The numbers and wording of the prototype rules (requirements section 8).
 * These are design choices for the prototype, not medical thresholds.
 */
export const prototypeRules: PrototypeRules = {
  baselineDays: 7,
  deviationK: 3,
  sustainedDays: 3,
  disclaimerLabel: 'Prototype simulated protocol. These are design choices, not clinical thresholds.',
  alertRules: [
    {
      ruleId: 'deviation-not-yet-sustained',
      level: 'info',
      description: 'The latest reading is away from your baseline in the same direction for fewer than 3 days in a row.',
    },
    {
      ruleId: 'symptom-logged',
      level: 'info',
      description: 'A symptom was logged today or yesterday. It is named here without any interpretation.',
    },
    {
      ruleId: 'sustained-deviation',
      level: 'watch',
      description: 'One indicator has been away from your baseline in the same direction for 3 or more days in a row.',
    },
    {
      ruleId: 'sustained-with-second-indicator',
      level: 'action',
      description: 'One indicator is sustained away from your baseline, and a different indicator is sustained too.',
    },
    {
      ruleId: 'sustained-with-symptom',
      level: 'action',
      description: 'One indicator is sustained away from your baseline, and a symptom was logged since that run began.',
    },
  ],
};
