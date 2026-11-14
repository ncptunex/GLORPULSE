import type {
  AstronautId,
  BaselinePosition,
  DeviationDirection,
  HealthIndicator,
  HealthReading,
  MeasureKey,
  MissionDay,
  PersonalBaseline,
  PrototypeRules,
  ReadyBaseline,
} from '../shared/types';
import { computeBaseline } from './baseline';
import { clean } from './numbers';
import { assertSameAstronaut, seriesForMeasure } from './readingSeries';

/**
 * Deviation of a reading and baseline position (requirements sections 8.2 and 8.3).
 *
 * These are statistical comparisons of an astronaut with their OWN recent readings.
 * They are prototype design choices, not clinical findings or medical thresholds.
 *
 * The result types below live here, not in shared/types.ts, because they are internal to
 * Person A's logic. Later steps (persistence, status) will turn them into the shared types.
 */

/** The result of checking ONE reading against the astronaut's own baseline. */
export interface ReadingDeviation {
  missionDay: MissionDay;
  value: number;
  /**
   * false when the reading was NOT compared: the baseline is still building,
   * or the reading is inside the baseline window (section 8.2 rule 1).
   * An unchecked reading never counts as a deviation.
   */
  checked: boolean;
  /** Distance from the centre divided by the spread. null when `checked` is false. */
  score: number | null;
  /** true when the score is at least K (3 in the prototype). Always false when `checked` is false. */
  deviates: boolean;
  /** 'above' or 'below' the centre. null unless the reading deviates. */
  direction: DeviationDirection | null;
}

/** Baseline position of ONE measure, with the reading it is based on. */
export interface MeasurePosition {
  measure: MeasureKey;
  baseline: PersonalBaseline;
  /** The most recent reading on or before the evaluation day. null when there is none. */
  latest: ReadingDeviation | null;
  position: BaselinePosition;
}

/**
 * Deviation score = distance of the value from the centre, divided by the spread (section 8.2 rule 2).
 * The spread of a ready baseline has already been raised to the spread floor, so it is never zero.
 * The score is always zero or positive. The direction is worked out separately.
 */
export function deviationScore(value: number, baseline: ReadyBaseline): number {
  return clean(Math.abs(value - baseline.centre) / baseline.spread);
}

/**
 * Checks one reading against a baseline (section 8.2).
 *  - Not checked while the baseline is building.
 *  - Not checked if the reading is inside the baseline window (the days that formed the baseline).
 *  - Otherwise it deviates when its score is at least K (rules.deviationK).
 */
export function evaluateReading(
  missionDay: MissionDay,
  value: number,
  baseline: PersonalBaseline,
  rules: PrototypeRules,
): ReadingDeviation {
  const unchecked: ReadingDeviation = { missionDay, value, checked: false, score: null, deviates: false, direction: null };
  if (baseline.state !== 'ready') return unchecked;

  const lastWindowDay = Math.max(...baseline.windowDays);
  if (missionDay <= lastWindowDay) return unchecked;

  const score = deviationScore(value, baseline);
  const deviates = score >= rules.deviationK;
  return {
    missionDay,
    value,
    checked: true,
    score,
    deviates,
    direction: deviates ? (value > baseline.centre ? 'above' : 'below') : null,
  };
}

/**
 * Checks every reading of one measure, day by day (oldest first).
 * Days without a reading are simply not in the list: a gap is never filled in or guessed.
 * Persistence (runs of days) will build on this list in a later step.
 */
export function evaluateMeasureReadings(
  astronautId: AstronautId,
  indicator: HealthIndicator,
  measure: MeasureKey,
  readings: HealthReading[],
  rules: PrototypeRules,
): { baseline: PersonalBaseline; days: ReadingDeviation[] } {
  const baseline = computeBaseline(astronautId, indicator, measure, readings, rules);
  const series = seriesForMeasure(readings, astronautId, indicator.id, measure);
  return {
    baseline,
    days: series.map((d) => evaluateReading(d.missionDay, d.value, baseline, rules)),
  };
}

/**
 * Baseline position of one measure on the evaluation day (section 8.3).
 *
 *  - Uses the most recent reading on or before `evaluationDay`, however old it is.
 *    Readings after the evaluation day are ignored.
 *  - 'not-enough-data' when the baseline is still building, or there is no reading at all.
 *  - 'above-baseline' / 'below-baseline' when that reading deviates, otherwise 'within-baseline'.
 *  - This is a position at one moment. It is NOT a trend: no slope, rate of change or forecast.
 */
export function computeMeasurePosition(
  astronautId: AstronautId,
  indicator: HealthIndicator,
  measure: MeasureKey,
  readings: HealthReading[],
  rules: PrototypeRules,
  evaluationDay: MissionDay,
): MeasurePosition {
  // Reject another astronaut's readings first, on the WHOLE list, so a foreign reading
  // on a future day cannot slip through when future days are filtered out below.
  assertSameAstronaut(readings, astronautId);
  // Only readings up to the evaluation day are used, for the baseline too.
  const known = readings.filter((r) => r.missionDay <= evaluationDay);
  const { baseline, days } = evaluateMeasureReadings(astronautId, indicator, measure, known, rules);
  const latest = days.length > 0 ? days[days.length - 1] : null;

  let position: BaselinePosition = 'not-enough-data';
  if (baseline.state === 'ready' && latest !== null) {
    position =
      latest.direction === 'above' ? 'above-baseline' : latest.direction === 'below' ? 'below-baseline' : 'within-baseline';
  }
  return { measure, baseline, latest, position };
}

/**
 * Baseline position for every measure of an indicator.
 * Blood pressure returns two items (systolic and diastolic), each judged separately (section 8.2 rule 5).
 * Other indicators return one item.
 */
export function computeIndicatorPositions(
  astronautId: AstronautId,
  indicator: HealthIndicator,
  readings: HealthReading[],
  rules: PrototypeRules,
  evaluationDay: MissionDay,
): MeasurePosition[] {
  return indicator.measures.map((m) =>
    computeMeasurePosition(astronautId, indicator, m.key, readings, rules, evaluationDay),
  );
}
