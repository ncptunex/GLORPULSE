import type { AstronautSeed } from "../../shared/types";
import {
  buildBloodPressure,
  buildReadings,
  buildSymptoms,
  type DailyValues,
} from "../seedHelpers";

/**
 * astro-4: BUILDING BASELINE (simulated). Tracks blood glucose.
 *
 * Blood glucose was only started on day 28, so it has just 3 readings (days 28, 29, 30).
 * Expected at day 30: glucose shows "building baseline, 3 of 7 days" and no alert.
 * All other indicators are steady for the full 30 days, so no alerts appear.
 *
 * Each list has 30 numbers, one per mission day (rows are days 1-10, 11-20, 21-30).
 */
const ID = "astro-4";

const heartRate = [
  68, 67, 69, 68, 70, 67, 68, 69, 68, 67, 69, 68, 70, 67, 68, 69, 68, 67, 69,
  68, 68, 70, 67, 68, 69, 68, 67, 69, 68, 68,
];

const systolic = [
  120, 122, 121, 119, 121, 120, 122, 121, 120, 119, 121, 122, 120, 121, 119,
  120, 122, 121, 120, 121, 120, 119, 121, 122, 120, 121, 120, 119, 121, 120,
];

const diastolic = [
  80, 82, 81, 79, 81, 80, 82, 81, 80, 79, 81, 82, 80, 81, 79, 80, 82, 81, 80,
  81, 80, 79, 81, 82, 80, 81, 80, 79, 81, 80,
];

const temperature = [
  36.7, 36.6, 36.8, 36.7, 36.6, 36.7, 36.8, 36.7, 36.6, 36.7, 36.8, 36.7, 36.6,
  36.7, 36.8, 36.7, 36.6, 36.7, 36.7, 36.8, 36.7, 36.6, 36.7, 36.8, 36.7, 36.6,
  36.7, 36.8, 36.7, 36.6,
];

const sleep = [
  7.5, 7.3, 7.6, 7.4, 7.5, 7.2, 7.4, 7.5, 7.3, 7.4, 7.6, 7.4, 7.3, 7.5, 7.4,
  7.2, 7.5, 7.4, 7.6, 7.3, 7.4, 7.5, 7.3, 7.4, 7.6, 7.5, 7.2, 7.4, 7.5, 7.4,
];

const mood = [
  5, 4, 4, 5, 4, 4, 5, 4, 4, 5, 4, 4, 5, 4, 4, 5, 4, 4, 4, 5, 4, 5, 4, 4, 4, 5,
  4, 4, 5, 4,
];

// Days 1 to 27 have no glucose reading. Readings start on day 28.
const glucose: DailyValues = [
  ...Array<number | null>(27).fill(null),
  5.2,
  5.4,
  5.3,
];

export const astro4: AstronautSeed = {
  profile: {
    astronautId: ID,
    displayName: "Phuwin",
    currentMissionDay: 30,
    trackedIndicators: [
      "heart-rate",
      "blood-pressure",
      "body-temperature",
      "blood-glucose",
      "sleep",
      "mood",
    ],
  },
  readings: [
    ...buildReadings(ID, "heart-rate", heartRate),
    ...buildBloodPressure(ID, systolic, diastolic),
    ...buildReadings(ID, "body-temperature", temperature),
    ...buildReadings(ID, "blood-glucose", glucose),
    ...buildReadings(ID, "sleep", sleep),
    ...buildReadings(ID, "mood", mood),
  ],
  symptoms: buildSymptoms(ID, []),
};
