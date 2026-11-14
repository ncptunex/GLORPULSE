import type {
  AstronautId,
  DeviationRun,
  HealthIndicator,
  HealthReading,
  MeasureKey,
  MissionDay,
  PersonalBaseline,
  PrototypeRules,
} from '../shared/types';
import { evaluateMeasureReadings, type ReadingDeviation } from './deviation';
import { assertSameAstronaut, seriesForMeasure } from './readingSeries';

/**
 * Deviation runs and persistence (requirements section 8.4).
 *
 * A "run" counts how many mission days IN A ROW an indicator has stayed away from the astronaut's
 * own baseline in the same direction. The "3 days is sustained" limit and the missing-day rule
 * are prototype design choices (decision D-09), not medical thresholds.
 *
 * This file does NOT create alerts. It only measures runs.
 *
 * Decision 2: a run is independent of baseline position (deviation.ts). The position uses the latest
 * reading however old it is. A run counts consecutive eligible days and stops at a past missing day.
 * The two results are NOT forced to agree.
 */

/** The run of ONE measure on the evaluation day. Blood pressure has two of these, never one combined. */
export interface MeasureRunResult {
  measure: MeasureKey;
  baseline: PersonalBaseline;
  /** Shared type from types.ts: length, direction, startDay and isSustained. */
  run: DeviationRun;
  /** true when this measure has no reading on the evaluation day yet (section 8.4 rule 2). */
  todayPending: boolean;
  /** The last day the run was counted through: the evaluation day, or the day before while pending. */
  evaluatedThroughDay: MissionDay;
}

/** Timing facts about an indicator's readings. They map to HealthStatus fields of the same name. */
export interface ReadingTiming {
  /** true when there is no reading on the evaluation day. */
  todayPending: boolean;
  /** Evaluation day minus the day of the latest reading. null when there is no reading. */
  daysSinceLatestReading: number | null;
}

function noRun(): DeviationRun {
  return { length: 0, direction: null, startDay: null, isSustained: false };
}

/**
 * Measures the deviation run of ONE measure on the evaluation day.
 *
 *  1. Only readings on or before the evaluation day are used. Later readings change nothing.
 *  2. If the evaluation day has no reading, it is "pending". It does not break a run:
 *     the run is counted through the previous day instead.
 *  3. Starting from that last day, count backwards while each day has a reading that deviates
 *     in the SAME direction as the last day.
 *  4. The count stops at the first day that is: a past day with no reading (a gap),
 *     a reading that does not deviate, or a deviation in the opposite direction.
 *  5. While the baseline is building, there is no run (nothing is ever flagged).
 *  6. The run is sustained when its length is at least rules.sustainedDays (3).
 */
export function computeDeviationRun(
  astronautId: AstronautId,
  indicator: HealthIndicator,
  measure: MeasureKey,
  readings: HealthReading[],
  rules: PrototypeRules,
  evaluationDay: MissionDay,
): MeasureRunResult {
  assertSameAstronaut(readings, astronautId);

  const known = readings.filter((r) => r.missionDay <= evaluationDay);
  const { baseline, days } = evaluateMeasureReadings(astronautId, indicator, measure, known, rules);
  const byDay = new Map<MissionDay, ReadingDeviation>(days.map((d) => [d.missionDay, d]));

  const todayPending = !byDay.has(evaluationDay);
  const evaluatedThroughDay = todayPending ? evaluationDay - 1 : evaluationDay;
  const result = (run: DeviationRun): MeasureRunResult => ({ measure, baseline, run, todayPending, evaluatedThroughDay });

  if (baseline.state !== 'ready') return result(noRun());

  const last = byDay.get(evaluatedThroughDay);
  if (!last || !last.deviates || last.direction === null) return result(noRun());

  const direction = last.direction;
  let startDay = evaluatedThroughDay;
  for (;;) {
    const previous = byDay.get(startDay - 1);
    if (!previous || !previous.deviates || previous.direction !== direction) break;
    startDay -= 1;
  }

  const length = evaluatedThroughDay - startDay + 1;
  return result({ length, direction, startDay, isSustained: length >= rules.sustainedDays });
}

/**
 * The run of every measure of an indicator.
 * Blood pressure returns TWO results (systolic and diastolic), each with its own run. They are never combined.
 */
export function computeIndicatorRuns(
  astronautId: AstronautId,
  indicator: HealthIndicator,
  readings: HealthReading[],
  rules: PrototypeRules,
  evaluationDay: MissionDay,
): MeasureRunResult[] {
  return indicator.measures.map((m) =>
    computeDeviationRun(astronautId, indicator, m.key, readings, rules, evaluationDay),
  );
}

/** An indicator is sustained if ANY of its measures is sustained (section 8.4 rule 6). */
export function isIndicatorSustained(results: MeasureRunResult[]): boolean {
  return results.some((r) => r.run.isSustained);
}

/** Whether today's reading is still missing, and how old the latest reading is. */
export function computeReadingTiming(
  astronautId: AstronautId,
  indicator: HealthIndicator,
  readings: HealthReading[],
  evaluationDay: MissionDay,
): ReadingTiming {
  assertSameAstronaut(readings, astronautId);
  // Blood pressure always has both numbers together, so the first measure represents the indicator.
  const measure = indicator.measures[0].key;
  const days = seriesForMeasure(readings, astronautId, indicator.id, measure)
    .map((d) => d.missionDay)
    .filter((d) => d <= evaluationDay);
  if (days.length === 0) return { todayPending: true, daysSinceLatestReading: null };
  const latest = days[days.length - 1];
  return { todayPending: latest !== evaluationDay, daysSinceLatestReading: evaluationDay - latest };
}

/**
 * Mission days with no reading, for the HealthStatus.missingDays field (Decision 1).
 *
 *  - Counting starts at the indicator's FIRST recorded reading. Days before it are not missing,
 *    because the astronaut had not started tracking yet (for example astro-4's glucose).
 *  - Counting ends at the evaluation day. If the evaluation day has no reading yet, it IS listed
 *    (today's pending day counts as missing).
 *  - Readings after the evaluation day are ignored.
 *  - No readings on or before the evaluation day: an empty list (zero missing days).
 *  - Days are returned oldest first. A gap is only reported, never filled in.
 *  - This is separate from daysSinceLatestReading (computeReadingTiming).
 */
export function computeMissingDays(
  astronautId: AstronautId,
  indicator: HealthIndicator,
  readings: HealthReading[],
  evaluationDay: MissionDay,
): MissionDay[] {
  assertSameAstronaut(readings, astronautId);
  // Blood pressure always has both numbers together, so the first measure represents the indicator.
  const measure = indicator.measures[0].key;
  const have = new Set(
    seriesForMeasure(readings, astronautId, indicator.id, measure)
      .map((d) => d.missionDay)
      .filter((d) => d <= evaluationDay),
  );
  if (have.size === 0) return [];

  const firstDay = Math.min(...have);
  const missing: MissionDay[] = [];
  for (let day = firstDay + 1; day <= evaluationDay; day++) {
    if (!have.has(day)) missing.push(day);
  }
  return missing;
}
