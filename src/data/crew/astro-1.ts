import type { AstronautSeed } from "../../shared/types";
import {
  buildBloodPressure,
  buildReadings,
  buildSymptoms,
} from "../seedHelpers";

/**
 * astro-1: PRIMARY STORY (simulated). Does not track blood glucose.
 *
 * Authored to show how the prototype rules behave. It is not real physiology.
 *  - Days 1 to 25: steady readings (the baseline is the first 7 days).
 *  - Sleep: drifts down, then stays below the baseline band from day 26 (run of 5 days).
 *  - Heart rate: drifts up, then stays above the baseline band from day 27 (run of 4 days).
 *  - Symptom "tiredness" logged on day 27, inside both runs.
 *  - Blood pressure, temperature and mood stay inside their baseline bands.
 * Expected at day 30: Action alert on sleep and on heart rate.
 *
 * Each list below has 30 numbers, one per mission day (rows are days 1-10, 11-20, 21-30).
 */
const ID = "astro-1";

const heartRate = [
  64, 66, 65, 63, 65, 66, 64, 65, 64, 66, 67, 65, 64, 66, 65, 67, 66, 64, 65,
  66, 65, 66, 67, 68, 68, 70, 73, 75, 77, 79,
];

const sleep = [
  7.4, 7.2, 7.5, 7.3, 7.4, 7.1, 7.3, 7.3, 7.5, 7.2, 7.4, 7.3, 7.6, 7.2, 7.4,
  7.3, 7.5, 7.1, 7.4, 7.3, 7.2, 7.2, 7.0, 6.8, 6.6, 6.2, 5.9, 5.7, 5.4, 5.3,
];

const systolic = [
  118, 120, 119, 121, 120, 118, 122, 119, 121, 120, 122, 118, 120, 121, 119,
  120, 122, 121, 119, 120, 118, 120, 121, 119, 122, 120, 121, 123, 122, 121,
];

const diastolic = [
  78, 80, 79, 81, 80, 78, 79, 79, 80, 81, 79, 78, 80, 80, 79, 81, 80, 79, 80,
  78, 81, 80, 79, 81, 80, 82, 81, 80, 81, 80,
];

const temperature = [
  36.6, 36.7, 36.5, 36.6, 36.8, 36.6, 36.7, 36.6, 36.7, 36.6, 36.5, 36.7, 36.6,
  36.8, 36.7, 36.6, 36.6, 36.7, 36.5, 36.6, 36.7, 36.6, 36.7, 36.6, 36.8, 36.7,
  36.6, 36.7, 36.6, 36.7,
];

const mood = [
  4, 4, 5, 4, 4, 3, 4, 4, 5, 4, 4, 3, 4, 4, 4, 4, 5, 4, 4, 4, 3, 4, 4, 4, 4, 3,
  4, 3, 3, 3,
];

export const astro1: AstronautSeed = {
  profile: {
    astronautId: ID,
    displayName: "Charl",
    currentMissionDay: 30,
    trackedIndicators: [
      "heart-rate",
      "blood-pressure",
      "body-temperature",
      "sleep",
      "mood",
    ],
  },
  readings: [
    ...buildReadings(ID, "heart-rate", heartRate),
    ...buildBloodPressure(ID, systolic, diastolic),
    ...buildReadings(ID, "body-temperature", temperature),
    ...buildReadings(ID, "sleep", sleep),
    ...buildReadings(ID, "mood", mood),
  ],
  symptoms: buildSymptoms(ID, [{ missionDay: 27, symptomId: "tiredness" }]),
};
