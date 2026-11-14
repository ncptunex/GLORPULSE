import type { AstronautId, HealthReading, IndicatorId, MeasureKey, MissionDay } from '../shared/types';

/** One number on one mission day. */
export interface DayValue {
  missionDay: MissionDay;
  value: number;
}

/**
 * Reads one measure out of a reading.
 * Returns null when the reading does not have that measure
 * (for example asking a heart rate reading for 'systolic').
 */
export function getMeasureValue(reading: HealthReading, measure: MeasureKey): number | null {
  if (reading.indicatorId === 'blood-pressure') {
    if (measure === 'systolic') return reading.systolic;
    if (measure === 'diastolic') return reading.diastolic;
    return null;
  }
  return measure === 'value' ? reading.value : null;
}

/**
 * Data of different astronauts must never be mixed (DR-06), so a reading that belongs to
 * another astronaut is an ERROR, not something to skip.
 *
 * Every logic function that receives readings calls this on the WHOLE list first,
 * before it filters by day or by indicator. A foreign reading is therefore rejected
 * even when it is on a future day or belongs to a different indicator.
 */
export function assertSameAstronaut(records: Array<{ astronautId: AstronautId }>, astronautId: AstronautId): void {
  for (const record of records) {
    if (record.astronautId !== astronautId) {
      throw new Error(
        `Record belongs to "${record.astronautId}" but the logic was given "${astronautId}". Astronaut data must not be mixed.`,
      );
    }
  }
}

/**
 * Builds the day-by-day list of numbers for ONE measure of ONE indicator, sorted by mission day.
 *
 * Rules:
 *  - Every reading must belong to `astronautId`, otherwise an error is thrown (see assertSameAstronaut).
 *  - Readings of other indicators are ignored.
 *  - Only one value per day is kept. If a seeded and an entered reading share a day, the ENTERED one wins
 *    (see HealthReading in types.ts). Otherwise the later one in the list wins.
 *  - A value that is not a finite number is an error.
 */
export function seriesForMeasure(
  readings: HealthReading[],
  astronautId: AstronautId,
  indicatorId: IndicatorId,
  measure: MeasureKey,
): DayValue[] {
  assertSameAstronaut(readings, astronautId);
  const byDay = new Map<MissionDay, { value: number; origin: HealthReading['origin'] }>();

  for (const reading of readings) {
    if (reading.indicatorId !== indicatorId) continue;

    const value = getMeasureValue(reading, measure);
    if (value === null) continue;
    if (!Number.isFinite(value)) {
      throw new Error(`Reading for ${indicatorId} on day ${reading.missionDay} is not a finite number.`);
    }

    const existing = byDay.get(reading.missionDay);
    if (existing && existing.origin === 'entered' && reading.origin === 'seeded') continue;
    byDay.set(reading.missionDay, { value, origin: reading.origin });
  }

  return [...byDay.entries()]
    .map(([missionDay, { value }]) => ({ missionDay, value }))
    .sort((a, b) => a.missionDay - b.missionDay);
}
