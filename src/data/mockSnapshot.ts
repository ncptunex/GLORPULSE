import type {
  BaselinePosition,
  DeviationRun,
  HealthAlert,
  HealthReading,
  HealthSnapshot,
  HealthStatus,
  IndicatorId,
  MeasureKey,
  MeasureStatus,
  NonEmptyArray,
  ReadyBaseline,
} from "../shared/types";
import { alertLegend } from "./alertLegend";
import { astro1 } from "./crew/astro-1";
import { prototypeRules } from "./prototypeRules";

/**
 * MOCK snapshot for Person B (DR-07), so screens can be built before the real logic exists.
 *
 * It is written by hand to match what the real logic should return for astro-1 on day 30
 * (the primary story): Action alerts on sleep and heart rate, all other indicators within baseline.
 * It is NOT calculated. Replace it with computeSnapshot() output once src/logic exists.
 * The shape is the same, so the screens should not need to change.
 */

const ASTRONAUT_ID = astro1.profile.astronautId;
const DAY = astro1.profile.currentMissionDay;
const NO_RUN: DeviationRun = {
  length: 0,
  direction: null,
  startDay: null,
  isSustained: false,
};

/** Rounds away tiny decimal noise such as 6.4000000000000004. */
const round = (n: number) => Number(n.toFixed(2));

function readyBaseline(
  indicatorId: IndicatorId,
  measure: MeasureKey,
  centre: number,
  spread: number,
): ReadyBaseline {
  const k = prototypeRules.deviationK;
  return {
    astronautId: ASTRONAUT_ID,
    indicatorId,
    measure,
    state: "ready",
    daysCounted: 7,
    daysRequired: 7,
    centre,
    spread,
    bandLow: round(centre - k * spread),
    bandHigh: round(centre + k * spread),
    windowDays: [1, 2, 3, 4, 5, 6, 7],
  };
}

function latestOn(indicatorId: IndicatorId): HealthReading | null {
  return (
    astro1.readings.find(
      (r) => r.indicatorId === indicatorId && r.missionDay === DAY,
    ) ?? null
  );
}

function latestValue(
  reading: HealthReading | null,
  measure: MeasureKey,
): number | null {
  if (!reading) return null;
  if (reading.indicatorId === "blood-pressure")
    return measure === "systolic" ? reading.systolic : reading.diastolic;
  return reading.value;
}

function measure(
  indicatorId: IndicatorId,
  key: MeasureKey,
  centre: number,
  spread: number,
  position: BaselinePosition,
  run: DeviationRun,
): MeasureStatus {
  return {
    measure: key,
    latestValue: latestValue(latestOn(indicatorId), key),
    baseline: readyBaseline(indicatorId, key, centre, spread),
    position,
    run,
    // No verified reference range exists, so the status is 'not-assessed' and no range is attached.
    referenceStatus: "not-assessed",
    referenceRange: null,
    missionLimit: null,
  };
}

function status(
  indicatorId: IndicatorId,
  measures: NonEmptyArray<MeasureStatus>,
): HealthStatus {
  return {
    astronautId: ASTRONAUT_ID,
    indicatorId,
    latestReading: latestOn(indicatorId),
    daysSinceLatestReading: 0,
    todayPending: false,
    missingDays: [],
    measures,
  };
}

const statuses: HealthStatus[] = [
  status("heart-rate", [
    measure("heart-rate", "value", 65, 2, "above-baseline", {
      length: 4,
      direction: "above",
      startDay: 27,
      isSustained: true,
    }),
  ]),
  status("blood-pressure", [
    measure("blood-pressure", "systolic", 120, 3, "within-baseline", NO_RUN),
    measure("blood-pressure", "diastolic", 79, 2, "within-baseline", NO_RUN),
  ]),
  status("body-temperature", [
    measure("body-temperature", "value", 36.6, 0.2, "within-baseline", NO_RUN),
  ]),
  status("sleep", [
    measure("sleep", "value", 7.3, 0.3, "below-baseline", {
      length: 5,
      direction: "below",
      startDay: 26,
      isSustained: true,
    }),
  ]),
  status("mood", [measure("mood", "value", 4, 0.5, "within-baseline", NO_RUN)]),
];

const alerts: HealthAlert[] = [
  {
    id: `${ASTRONAUT_ID}:sleep:sustained-with-second-indicator`,
    astronautId: ASTRONAUT_ID,
    indicatorId: "sleep",
    measures: ["value"],
    level: "action",
    ruleId: "sustained-with-second-indicator",
    ruleLabel: "Sustained change together with a second indicator",
    reasons: [
      "Sleep has been below your baseline for 5 days in a row, since day 26.",
      "Your latest value is 5.3 hours. Your baseline centre is 7.3 hours.",
      "Heart rate is also sustained above your baseline.",
    ],
    runStartDay: 26,
    relatedIndicatorIds: ["heart-rate"],
    symptomIds: [],
  },
  {
    id: `${ASTRONAUT_ID}:heart-rate:sustained-with-second-indicator`,
    astronautId: ASTRONAUT_ID,
    indicatorId: "heart-rate",
    measures: ["value"],
    level: "action",
    ruleId: "sustained-with-second-indicator",
    ruleLabel: "Sustained change together with a second indicator",
    reasons: [
      "Heart rate has been above your baseline for 4 days in a row, since day 27.",
      "Your latest value is 79 bpm. Your baseline centre is 65 bpm.",
      "Sleep is also sustained below your baseline.",
    ],
    runStartDay: 27,
    relatedIndicatorIds: ["sleep"],
    symptomIds: [],
  },
];

export const mockSnapshot: HealthSnapshot = {
  astronautId: ASTRONAUT_ID,
  evaluatedOnDay: DAY,
  statuses,
  alerts,
  explanations: [],
  alertLegend,
  rules: prototypeRules,
  readings: astro1.readings,
  symptoms: astro1.symptoms,
  isSimulatedData: true,
};
