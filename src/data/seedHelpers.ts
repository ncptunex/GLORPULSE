import type {
  AstronautId,
  MissionDay,
  SeededReading,
  SeededSymptom,
  SingleValueIndicatorId,
  SymptomId,
} from '../shared/types';

/** Number of mission days covered by the seed data (days 1 to 30). */
export const SEED_DAYS = 30;

/**
 * One list entry per mission day. The first item is day 1, the last is day 30.
 * `null` means "no reading on that day" (a deliberate gap).
 */
export type DailyValues = Array<number | null>;

function assertFullMonth(label: string, values: DailyValues): void {
  if (values.length !== SEED_DAYS) {
    throw new Error(`Seed data "${label}" has ${values.length} values, expected ${SEED_DAYS}.`);
  }
}

/** Turns 30 daily numbers into seeded readings for one single-number indicator. */
export function buildReadings(
  astronautId: AstronautId,
  indicatorId: SingleValueIndicatorId,
  values: DailyValues,
): SeededReading[] {
  assertFullMonth(`${astronautId} ${indicatorId}`, values);
  const readings: SeededReading[] = [];
  values.forEach((value, index) => {
    if (value === null) return;
    readings.push({ astronautId, indicatorId, missionDay: index + 1, origin: 'seeded', value });
  });
  return readings;
}

/** Turns two lists of 30 numbers into seeded blood pressure readings. Both numbers must exist on the same days. */
export function buildBloodPressure(
  astronautId: AstronautId,
  systolic: DailyValues,
  diastolic: DailyValues,
): SeededReading[] {
  assertFullMonth(`${astronautId} systolic`, systolic);
  assertFullMonth(`${astronautId} diastolic`, diastolic);
  const readings: SeededReading[] = [];
  systolic.forEach((sys, index) => {
    const dia = diastolic[index];
    if (sys === null && dia === null) return;
    if (sys === null || dia === null) {
      throw new Error(`Seed data ${astronautId}: blood pressure needs both numbers on day ${index + 1}.`);
    }
    readings.push({
      astronautId,
      indicatorId: 'blood-pressure',
      missionDay: index + 1,
      origin: 'seeded',
      systolic: sys,
      diastolic: dia,
    });
  });
  return readings;
}

/** Builds seeded symptom records for one astronaut. */
export function buildSymptoms(
  astronautId: AstronautId,
  entries: Array<{ missionDay: MissionDay; symptomId: SymptomId }>,
): SeededSymptom[] {
  return entries.map((entry) => ({
    astronautId,
    symptomId: entry.symptomId,
    missionDay: entry.missionDay,
    origin: 'seeded' as const,
  }));
}
