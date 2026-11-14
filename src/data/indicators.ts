import type { GuidanceText, HazardTag, HealthIndicator, Sourced } from '../shared/types';

/**
 * Definitions of the six indicators.
 *
 * PLACEHOLDERS (decision D-07, pending): entryMin, entryMax and spreadFloor are
 * prototype technical choices.
 *  - entryMin / entryMax only reject typing mistakes in the check-in form.
 *  - spreadFloor stops the baseline spread from being zero when readings are very similar.
 * They are NOT clinical thresholds and NOT medical reference ranges.
 *
 * No sourced guidance exists yet, so every sourced field says 'no-sourced-guidance'.
 * referenceRanges and missionLimits are empty on purpose (nothing is verified).
 */

const NO_GUIDANCE: GuidanceText = { status: 'no-sourced-guidance' };
const NO_HAZARDS: Sourced<HazardTag[]> = { status: 'no-sourced-guidance' };

export const indicators: HealthIndicator[] = [
  {
    id: 'heart-rate',
    displayName: 'Heart rate',
    measures: [{ key: 'value', label: 'Heart rate', unit: 'bpm', entryMin: 20, entryMax: 250, spreadFloor: 2 }],
    referenceRanges: [],
    missionLimits: [],
    hazards: NO_HAZARDS,
    howToMeasure: NO_GUIDANCE,
    whyItMatters: NO_GUIDANCE,
    contextNote: null,
  },
  {
    id: 'blood-pressure',
    displayName: 'Blood pressure',
    measures: [
      { key: 'systolic', label: 'Systolic', unit: 'mmHg', entryMin: 50, entryMax: 260, spreadFloor: 3 },
      { key: 'diastolic', label: 'Diastolic', unit: 'mmHg', entryMin: 30, entryMax: 160, spreadFloor: 2 },
    ],
    referenceRanges: [],
    missionLimits: [],
    hazards: NO_HAZARDS,
    howToMeasure: NO_GUIDANCE,
    whyItMatters: NO_GUIDANCE,
    contextNote: null,
  },
  {
    id: 'body-temperature',
    displayName: 'Body temperature',
    measures: [{ key: 'value', label: 'Body temperature', unit: '°C', entryMin: 30, entryMax: 43, spreadFloor: 0.2 }],
    referenceRanges: [],
    missionLimits: [],
    hazards: NO_HAZARDS,
    howToMeasure: NO_GUIDANCE,
    whyItMatters: NO_GUIDANCE,
    contextNote: null,
  },
  {
    id: 'blood-glucose',
    displayName: 'Blood glucose',
    measures: [{ key: 'value', label: 'Blood glucose', unit: 'mmol/L', entryMin: 1, entryMax: 40, spreadFloor: 0.3 }],
    referenceRanges: [],
    missionLimits: [],
    hazards: NO_HAZARDS,
    howToMeasure: NO_GUIDANCE,
    whyItMatters: NO_GUIDANCE,
    // FR-INFO-02: a context note is required. Pending research, so no sourced text yet.
    contextNote: NO_GUIDANCE,
  },
  {
    id: 'sleep',
    displayName: 'Sleep',
    measures: [{ key: 'value', label: 'Sleep per night', unit: 'hours', entryMin: 0, entryMax: 24, spreadFloor: 0.3 }],
    referenceRanges: [],
    missionLimits: [],
    hazards: NO_HAZARDS,
    howToMeasure: NO_GUIDANCE,
    whyItMatters: NO_GUIDANCE,
    contextNote: null,
  },
  {
    id: 'mood',
    displayName: 'Mood',
    // Non-diagnostic self-rating from 1 to 5 (prototype scale, not a validated questionnaire).
    measures: [{ key: 'value', label: 'Mood self-rating (1 to 5)', unit: 'score', entryMin: 1, entryMax: 5, spreadFloor: 0.5 }],
    referenceRanges: [],
    missionLimits: [],
    hazards: NO_HAZARDS,
    howToMeasure: NO_GUIDANCE,
    whyItMatters: NO_GUIDANCE,
    contextNote: null,
  },
];
