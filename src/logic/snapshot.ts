import { alertLegend } from '../data/alertLegend';
import type {
  AstronautId,
  ComputeSnapshot,
  HealthIndicator,
  HealthLogicInput,
  HealthReading,
  HealthSnapshot,
  HealthStatus,
  IndicatorId,
  MeasureKey,
  MeasureStatus,
  MissionDay,
  NonEmptyArray,
  ReferenceRange,
  ReferenceStatus,
  SourceReference,
} from '../shared/types';
import { computeAlerts } from './alerts';
import { computeIndicatorPositions } from './deviation';
import { buildExplanations } from './explanations';
import { computeIndicatorRuns, computeMissingDays, computeReadingTiming } from './persistence';
import { assertSameAstronaut, getMeasureValue } from './readingSeries';

/**
 * Assembly of the HealthSnapshot (requirements section 7, decisions A-16 to A-21 in
 * docs/person-a-logic-decisions.md).
 *
 * This file only combines results of the existing logic. It adds no new health rule.
 * It is pure: no clock, no storage, no randomness, and the input is never changed.
 */

/**
 * The reading that counts as "the" reading of an indicator on one day, and the latest such reading.
 *
 * This applies EXACTLY the precedence of seriesForMeasure (readingSeries.ts), which Person B must also
 * use when choosing displayed values from the raw `readings` array of the snapshot:
 *  - Only readings of this astronaut and indicator, on or before `evaluationDay`.
 *  - Per mission day one reading counts. An ENTERED reading beats a seeded one. Otherwise the later
 *    one in the list wins.
 *  - The latest mission day with a counted reading is the result. Its age does not matter (A-14).
 * Returns null when there is no such reading. Future readings are never used.
 */
export function selectLatestReading(
  readings: HealthReading[],
  astronautId: AstronautId,
  indicatorId: IndicatorId,
  evaluationDay: MissionDay,
): HealthReading | null {
  assertSameAstronaut(readings, astronautId);
  const byDay = new Map<MissionDay, HealthReading>();
  for (const reading of readings) {
    if (reading.indicatorId !== indicatorId || reading.missionDay > evaluationDay) continue;
    const existing = byDay.get(reading.missionDay);
    if (existing && existing.origin === 'entered' && reading.origin === 'seeded') continue;
    byDay.set(reading.missionDay, reading);
  }
  if (byDay.size === 0) return null;
  return byDay.get(Math.max(...byDay.keys())) ?? null;
}

/** true only when every source of the range exists in `sources` and is 'verified'. */
function isVerifiedRange(range: ReferenceRange, sources: SourceReference[]): boolean {
  return range.sourceIds.every((id) => sources.find((s) => s.id === id)?.verification === 'verified');
}

/**
 * Kind 2 of 3: the general reference status of one measure (FR-DASH-04).
 * Only a range whose sources are ALL verified is used. Otherwise the status is 'not-assessed' and no
 * range is attached. The result never influences alerts (FR-ALERT-05).
 */
function referenceFor(
  indicator: HealthIndicator,
  measure: MeasureKey,
  latestValue: number | null,
  sources: SourceReference[],
): { referenceStatus: ReferenceStatus; referenceRange: ReferenceRange | null } {
  const range = indicator.referenceRanges.find((r) => r.measure === measure && isVerifiedRange(r, sources));
  if (!range || latestValue === null) return { referenceStatus: 'not-assessed', referenceRange: range ?? null };
  const below = range.low !== null && latestValue < range.low;
  const above = range.high !== null && latestValue > range.high;
  return { referenceStatus: below || above ? 'outside-reference' : 'within-reference', referenceRange: range };
}

/**
 * Builds the snapshot of ONE astronaut on their current mission day.
 *
 *  - Any record of another astronaut makes it throw, before any filtering (A-15).
 *  - `statuses` has one item per tracked indicator, in the profile's order. Untracked indicators have none.
 *  - `readings` and `symptoms` are copies of ALL given records, including future ones and duplicates.
 *    Future records are never used by any calculation, and they never create an alert (A-17, A-18).
 *  - `explanations` has one Why Now explanation per alert (explanations.ts). `guidance` feeds its parts
 *    3 to 5 and may be empty. `sources` is used for reference-range verification.
 */
export const computeSnapshot: ComputeSnapshot = (input: HealthLogicInput): HealthSnapshot => {
  const { profile, indicators, readings, symptoms, symptomDefinitions, sources, rules } = input;
  const astronautId = profile.astronautId;
  const evaluationDay = profile.currentMissionDay;

  assertSameAstronaut(readings, astronautId);
  assertSameAstronaut(symptoms, astronautId);

  const statuses: HealthStatus[] = profile.trackedIndicators.map((indicatorId) => {
    const indicator = indicators.find((i) => i.id === indicatorId);
    if (!indicator) throw new Error(`No definition for tracked indicator "${indicatorId}".`);

    const positions = computeIndicatorPositions(astronautId, indicator, readings, rules, evaluationDay);
    const runs = computeIndicatorRuns(astronautId, indicator, readings, rules, evaluationDay);
    const timing = computeReadingTiming(astronautId, indicator, readings, evaluationDay);
    const latestReading = selectLatestReading(readings, astronautId, indicator.id, evaluationDay);

    const measures = indicator.measures.map((definition, index): MeasureStatus => {
      const position = positions[index];
      const run = runs[index];
      const latestValue = latestReading ? getMeasureValue(latestReading, definition.key) : null;
      return {
        measure: definition.key,
        latestValue,
        baseline: position.baseline,
        position: position.position,
        run: run.run,
        ...referenceFor(indicator, definition.key, latestValue, sources),
        missionLimit: null,
      };
    }) as NonEmptyArray<MeasureStatus>;

    return {
      astronautId,
      indicatorId: indicator.id,
      latestReading: latestReading ? { ...latestReading } : null,
      daysSinceLatestReading: timing.daysSinceLatestReading,
      todayPending: timing.todayPending,
      missingDays: computeMissingDays(astronautId, indicator, readings, evaluationDay),
      measures,
    };
  });

  const alerts = computeAlerts({ profile, indicators, readings, symptoms, symptomDefinitions, rules });

  const explanations = buildExplanations(alerts, {
    indicators,
    statuses,
    guidance: input.guidance,
    symptomDefinitions,
    evaluatedOnDay: evaluationDay,
  });

  return {
    astronautId,
    evaluatedOnDay: evaluationDay,
    statuses,
    alerts,
    explanations,
    alertLegend: alertLegend.map((entry) => ({ ...entry })),
    rules,
    readings: readings.map((r) => ({ ...r })),
    symptoms: symptoms.map((s) => ({ ...s })),
    isSimulatedData: true,
  };
};
