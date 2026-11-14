import { symptomDefinitions } from "../data/symptoms";
import type {
  ApplyCheckIn,
  CheckInError,
  CheckInSubmission,
  CheckInValue,
  EnteredReading,
  EnteredSymptom,
  HealthIndicator,
  IndicatorId,
  MeasureDefinition,
  ValidateCheckIn,
} from "../shared/types";
import { assertSameAstronaut } from "./readingSeries";

/**
 * Check-in validation and conversion (requirements section 6.3 and the check-in decisions approved with it,
 * docs/person-a-logic-decisions.md once recorded).
 *
 * Pure: no storage, no clock, no screen. The caller (Person B) validates first, saves the result of
 * applyCheckIn, and passes the saved records back into the health logic.
 *
 * Entry limits and the blood pressure and mood checks only catch typing errors.
 * They are NOT clinical thresholds, and every message says so.
 */

/** The symptom IDs that may be submitted. The symptom list is data (see A-05 for the same pattern). */
const knownSymptomIds = new Set(symptomDefinitions.map((s) => s.id));

/** "Sleep", or "Blood pressure (systolic)" for a two-number indicator. */
function measureName(
  indicator: HealthIndicator,
  measure: MeasureDefinition,
): string {
  if (indicator.measures.length === 1) return indicator.displayName;
  return `${indicator.displayName} (${measure.label.toLowerCase()})`;
}

/** Reads one number out of a submitted value. Anything that is not there comes back as undefined. */
function submittedNumber(
  value: CheckInValue,
  measure: MeasureDefinition,
): unknown {
  return (value as unknown as Record<string, unknown>)[measure.key];
}

/**
 * Checks a check-in before it is saved (FR-CHK-03 to FR-CHK-06, FR-CREW-07).
 *
 * Returns { ok: true } or ALL the errors found, never throws for a user mistake:
 *  - field 'form': wrong astronaut, wrong mission day (must be the current day, FR-CHK-05),
 *    or nothing submitted at all (no values and no symptoms).
 *  - field = an indicator ID: an indicator the astronaut does not track (no glucose for astronauts
 *    without glucose), listed twice, missing a number, not a finite number, outside the entry limits,
 *    mood that is not a whole number from 1 to 5, or diastolic not lower than systolic.
 *    For blood pressure the error says which of the two numbers (`measure`).
 *  - field 'symptoms': a symptom ID that is not in the symptom list. Repeating a symptom is not an error.
 * Entry limits include both ends. A symptom-only check-in is valid. Skipping an indicator is valid.
 */
export const validateCheckIn: ValidateCheckIn = (
  submission,
  profile,
  indicators,
) => {
  const errors: CheckInError[] = [];

  if (submission.astronautId !== profile.astronautId) {
    errors.push({
      field: "form",
      message: `This check-in belongs to "${submission.astronautId}", but the active astronaut is "${profile.astronautId}".`,
    });
  }
  if (submission.missionDay !== profile.currentMissionDay) {
    errors.push({
      field: "form",
      message: `A check-in can only be recorded for the current mission day (day ${profile.currentMissionDay}).`,
    });
  }
  if (submission.values.length === 0 && submission.symptomIds.length === 0) {
    errors.push({
      field: "form",
      message: "Enter at least one reading or select at least one symptom.",
    });
  }

  const seen = new Set<IndicatorId>();
  for (const value of submission.values) {
    const indicatorId = value.indicatorId;

    if (!profile.trackedIndicators.includes(indicatorId)) {
      errors.push({
        field: indicatorId,
        message: `${indicatorId} is not tracked for this astronaut.`,
      });
      continue;
    }
    const indicator = indicators.find((i) => i.id === indicatorId);
    if (!indicator) {
      errors.push({
        field: indicatorId,
        message: `${indicatorId} has no definition.`,
      });
      continue;
    }
    if (seen.has(indicatorId)) {
      errors.push({
        field: indicatorId,
        message: `${indicator.displayName} was entered more than once in this check-in.`,
      });
      continue;
    }
    seen.add(indicatorId);

    const numbers = new Map<string, number>();
    for (const measure of indicator.measures) {
      const name = measureName(indicator, measure);
      const raw = submittedNumber(value, measure);
      const where =
        indicator.measures.length > 1 ? { measure: measure.key } : {};

      if (typeof raw !== "number" || !Number.isFinite(raw)) {
        errors.push({
          field: indicatorId,
          ...where,
          message: `${name}: enter a number.`,
        });
        continue;
      }
      numbers.set(measure.key, raw);

      const unit = measure.unit === "score" ? "" : ` ${measure.unit}`;
      if (
        indicatorId === "mood" &&
        (!Number.isInteger(raw) ||
          raw < measure.entryMin ||
          raw > measure.entryMax)
      ) {
        errors.push({
          field: indicatorId,
          message: `${name}: enter a whole number from ${measure.entryMin} to ${measure.entryMax}.`,
        });
      } else if (raw < measure.entryMin || raw > measure.entryMax) {
        errors.push({
          field: indicatorId,
          ...where,
          message: `${name}: enter a value from ${measure.entryMin} to ${measure.entryMax}${unit}.`,
        });
      }
    }

    const systolic = numbers.get("systolic");
    const diastolic = numbers.get("diastolic");
    if (
      indicatorId === "blood-pressure" &&
      systolic !== undefined &&
      diastolic !== undefined &&
      diastolic >= systolic
    ) {
      errors.push({
        field: indicatorId,
        measure: "diastolic",
        message:
          "Blood pressure (diastolic): the diastolic value must be lower than the systolic value. This is an entry check, not a clinical threshold.",
      });
    }
  }

  for (const symptomId of new Set(submission.symptomIds)) {
    if (!knownSymptomIds.has(symptomId)) {
      errors.push({
        field: "symptoms",
        message: `"${symptomId}" is not in the symptom list.`,
      });
    }
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
};

/** Turns one submitted value into an entered reading, exactly as typed. */
function toEnteredReading(
  submission: CheckInSubmission,
  value: CheckInValue,
): EnteredReading {
  const base = {
    astronautId: submission.astronautId,
    missionDay: submission.missionDay,
    origin: "entered" as const,
  };
  return value.indicatorId === "blood-pressure"
    ? {
        ...base,
        indicatorId: "blood-pressure",
        systolic: value.systolic,
        diastolic: value.diastolic,
      }
    : { ...base, indicatorId: value.indicatorId, value: value.value };
}

/**
 * Applies a VALID check-in to the astronaut's entered records (FR-CHK-05, FR-CHK-06, FR-CHK-02).
 *
 *  - The submission must already have passed validateCheckIn. It is not checked again.
 *  - Every stored record must belong to the submission's astronaut, otherwise it throws (A-15).
 *  - Each submitted value becomes an ENTERED reading for the submission's mission day, kept exactly
 *    as typed. It replaces any earlier entered reading of the same indicator on the same day.
 *    The replacement goes to the end of the list.
 *  - Each submitted symptom becomes an entered symptom report. The same symptom on the same day is
 *    kept once.
 *  - Skipped indicators change nothing. Seeded data is never touched: only entered records are handled.
 *  - Returns new lists. The inputs are not changed. Person B saves the result.
 */
export const applyCheckIn: ApplyCheckIn = (
  enteredReadings,
  enteredSymptoms,
  submission,
) => {
  assertSameAstronaut(enteredReadings, submission.astronautId);
  assertSameAstronaut(enteredSymptoms, submission.astronautId);

  let readings: EnteredReading[] = enteredReadings.map((r) => ({ ...r }));
  for (const value of submission.values) {
    readings = readings.filter(
      (r) =>
        !(
          r.indicatorId === value.indicatorId &&
          r.missionDay === submission.missionDay
        ),
    );
    readings.push(toEnteredReading(submission, value));
  }

  const symptoms: EnteredSymptom[] = [];
  const seen = new Set<string>();
  const candidates: EnteredSymptom[] = [
    ...enteredSymptoms,
    ...submission.symptomIds.map(
      (symptomId): EnteredSymptom => ({
        astronautId: submission.astronautId,
        symptomId,
        missionDay: submission.missionDay,
        origin: "entered",
      }),
    ),
  ];
  for (const s of candidates) {
    const key = `${s.missionDay}:${s.symptomId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    symptoms.push({ ...s });
  }

  return { enteredReadings: readings, enteredSymptoms: symptoms };
};
