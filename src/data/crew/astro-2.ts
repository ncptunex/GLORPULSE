import type { AstronautSeed } from '../../shared/types';
import { buildBloodPressure, buildReadings, buildSymptoms } from '../seedHelpers';

/**
 * astro-2: STEADY (simulated). Tracks blood glucose.
 * Every reading stays inside the astronaut's own baseline band. Expected: "No active alerts".
 * Each list has 30 numbers, one per mission day (rows are days 1-10, 11-20, 21-30).
 */
const ID = 'astro-2';

const heartRate = [
  70, 72, 69, 71, 70, 73, 71, 70, 71, 72,
  70, 69, 71, 72, 73, 71, 70, 69, 71, 72,
  70, 71, 73, 72, 71, 70, 71, 72, 70, 71,
];

const systolic = [
  112, 114, 113, 115, 114, 112, 113, 113, 114, 112,
  115, 113, 114, 113, 112, 114, 115, 113, 114, 112,
  113, 114, 113, 115, 114, 113, 112, 114, 113, 114,
];

const diastolic = [
  72, 74, 73, 75, 74, 72, 73, 73, 74, 72,
  75, 73, 74, 73, 72, 74, 75, 73, 74, 72,
  73, 74, 73, 75, 74, 73, 72, 74, 73, 74,
];

const temperature = [
  36.5, 36.6, 36.4, 36.5, 36.6, 36.5, 36.7, 36.5, 36.6, 36.5,
  36.4, 36.6, 36.5, 36.6, 36.5, 36.7, 36.5, 36.6, 36.5, 36.4,
  36.6, 36.5, 36.6, 36.5, 36.4, 36.6, 36.5, 36.6, 36.5, 36.5,
];

const glucose = [
  5.0, 5.2, 4.9, 5.1, 5.0, 5.3, 5.1, 5.0, 5.1, 5.2,
  4.9, 5.0, 5.1, 5.2, 5.0, 5.1, 4.9, 5.0, 5.2, 5.1,
  5.0, 5.1, 5.3, 5.0, 5.1, 4.9, 5.0, 5.2, 5.1, 5.0,
];

const sleep = [
  7.0, 7.2, 6.9, 7.1, 7.0, 7.3, 7.1, 7.1, 7.0, 7.3,
  6.9, 7.2, 7.1, 7.0, 7.4, 7.1, 6.8, 7.2, 7.0, 7.1,
  7.3, 7.0, 7.2, 6.9, 7.1, 7.0, 7.2, 7.1, 7.0, 7.2,
];

const mood = [
  4, 4, 4, 5, 4, 4, 3, 4, 4, 5,
  4, 3, 4, 4, 4, 5, 4, 4, 3, 4,
  4, 4, 5, 4, 4, 4, 3, 4, 4, 4,
];

export const astro2: AstronautSeed = {
  profile: {
    astronautId: ID,
    displayName: 'Jordan Mehta',
    currentMissionDay: 30,
    trackedIndicators: ['heart-rate', 'blood-pressure', 'body-temperature', 'blood-glucose', 'sleep', 'mood'],
  },
  readings: [
    ...buildReadings(ID, 'heart-rate', heartRate),
    ...buildBloodPressure(ID, systolic, diastolic),
    ...buildReadings(ID, 'body-temperature', temperature),
    ...buildReadings(ID, 'blood-glucose', glucose),
    ...buildReadings(ID, 'sleep', sleep),
    ...buildReadings(ID, 'mood', mood),
  ],
  symptoms: buildSymptoms(ID, []),
};
