import type { AlertRuleId } from '../shared/types';

/**
 * Short plain-language names of the alert rules, shown to the user as HealthAlert.ruleLabel.
 * All of them are prototype design rules, not clinical thresholds, and say so.
 * The longer descriptions are in prototypeRules.ts.
 */
export const alertRuleLabels: Record<AlertRuleId, string> = {
  'deviation-not-yet-sustained': 'Away from your baseline, not yet sustained (prototype simulated protocol)',
  'symptom-logged': 'Symptom logged (prototype simulated protocol)',
  'sustained-deviation': 'Sustained change from your baseline (prototype simulated protocol)',
  'sustained-with-second-indicator': 'Sustained change together with a second indicator (prototype simulated protocol)',
  'sustained-with-symptom': 'Sustained change together with a logged symptom (prototype simulated protocol)',
};
