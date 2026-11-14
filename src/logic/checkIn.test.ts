import { describe, expect, it } from 'vitest';
import { indicators } from '../data/indicators';
import { prototypeRules } from '../data/prototypeRules';
import { seedCrew } from '../data/seedCrew';
import { sources } from '../data/sources';
import { symptomDefinitions } from '../data/symptoms';
import type {
  AstronautSeed,
  CheckInError,
  CheckInSubmission,
  CheckInValue,
  EnteredReading,
  EnteredSymptom,
  HealthLogicInput,
} from '../shared/types';
import { computeSnapshot } from './snapshot';
import { applyCheckIn, validateCheckIn } from './checkIn';

const seedOf = (id: string): AstronautSeed => seedCrew.find((s) => s.profile.astronautId === id)!;
const astro1 = seedOf('astro-1');
const astro3 = seedOf('astro-3'); // no glucose
const astro2 = seedOf('astro-2'); // glucose
const DAY = 30;

function submission(values: CheckInValue[], symptomIds: string[] = [], overrides: Partial<CheckInSubmission> = {}): CheckInSubmission {
  return { astronautId: 'astro-1', missionDay: DAY, values, symptomIds, ...overrides };
}

function validate(sub: CheckInSubmission, seed: AstronautSeed = astro1) {
  return validateCheckIn(sub, seed.profile, indicators);
}

function errorsOf(sub: CheckInSubmission, seed: AstronautSeed = astro1): CheckInError[] {
  const result = validate(sub, seed);
  if (result.ok) throw new Error('Expected the check-in to be rejected.');
  return result.errors;
}

const hr = (value: number): CheckInValue => ({ indicatorId: 'heart-rate', value });
const sleep = (value: number): CheckInValue => ({ indicatorId: 'sleep', value });
const mood = (value: number): CheckInValue => ({ indicatorId: 'mood', value });
const bp = (systolic: number, diastolic: number): CheckInValue => ({ indicatorId: 'blood-pressure', systolic, diastolic });

describe('validateCheckIn: valid check-ins (AT-CHK-02)', () => {
  it('accepts a full check-in for the tracked indicators', () => {
    const sub = submission(
      [hr(64), bp(118, 78), { indicatorId: 'body-temperature', value: 36.6 }, sleep(7.2), mood(4)],
      ['tiredness'],
    );
    expect(validate(sub)).toEqual({ ok: true });
  });

  it('accepts a symptom-only check-in', () => {
    expect(validate(submission([], ['headache']))).toEqual({ ok: true });
  });

  it('accepts skipping indicators', () => {
    expect(validate(submission([sleep(7)]))).toEqual({ ok: true });
  });

  it('accepts decimals for indicators other than mood', () => {
    expect(validate(submission([hr(64.5), sleep(6.25)]))).toEqual({ ok: true });
  });

  it('accepts glucose for an astronaut who tracks it', () => {
    const sub = submission([{ indicatorId: 'blood-glucose', value: 5.1 }], [], { astronautId: 'astro-2' });
    expect(validate(sub, astro2)).toEqual({ ok: true });
  });

  it('accepts a repeated symptom', () => {
    expect(validate(submission([], ['headache', 'headache']))).toEqual({ ok: true });
  });
});

describe('validateCheckIn: entry limits (AT-CHK-01, FR-CHK-03)', () => {
  it('accepts values exactly on the entry limits and rejects values just outside', () => {
    for (const indicator of indicators.filter((i) => i.id !== 'blood-pressure' && i.id !== 'blood-glucose')) {
      const m = indicator.measures[0];
      const make = (value: number) => submission([{ indicatorId: indicator.id, value } as CheckInValue]);
      expect(validate(make(m.entryMin))).toEqual({ ok: true });
      expect(validate(make(m.entryMax))).toEqual({ ok: true });
      expect(validate(make(m.entryMin - 0.5)).ok).toBe(false);
      expect(validate(make(m.entryMax + 0.5)).ok).toBe(false);
    }
  });

  it('names the indicator and says the limit is not a clinical threshold', () => {
    const [error] = errorsOf(submission([hr(300)]));
    expect(error).toMatchObject({ field: 'heart-rate' });
    expect(error.message).toContain('Heart rate');
    expect(error.message).toContain('20');
    expect(error.message).toContain('250');
    expect(error.message).toContain('not a clinical threshold');
  });

  it('rejects values that are not finite numbers', () => {
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(errorsOf(submission([hr(bad)]))[0]).toMatchObject({ field: 'heart-rate', message: 'Heart rate: enter a number.' });
    }
  });

  it('rejects a value that is missing or not a number at runtime', () => {
    const missing = { indicatorId: 'heart-rate' } as unknown as CheckInValue;
    const text = { indicatorId: 'heart-rate', value: '64' } as unknown as CheckInValue;
    expect(validate(submission([missing])).ok).toBe(false);
    expect(validate(submission([text])).ok).toBe(false);
  });

  it('reports every error, not only the first', () => {
    const errors = errorsOf(submission([hr(300), sleep(-1)]));
    expect(errors.map((e) => e.field)).toEqual(['heart-rate', 'sleep']);
  });
});

describe('validateCheckIn: mood', () => {
  it('accepts whole numbers 1 to 5', () => {
    for (const v of [1, 2, 3, 4, 5]) expect(validate(submission([mood(v)]))).toEqual({ ok: true });
  });

  it('rejects decimals, 0 and 6', () => {
    for (const v of [3.5, 4.0001, 0, 6, -1]) {
      expect(errorsOf(submission([mood(v)]))[0]).toMatchObject({ field: 'mood' });
    }
  });
});

describe('validateCheckIn: blood pressure', () => {
  it('rejects diastolic equal to or higher than systolic, naming the diastolic number', () => {
    for (const [s, d] of [[120, 120], [100, 110]] as const) {
      const [error] = errorsOf(submission([bp(s, d)]));
      expect(error).toMatchObject({ field: 'blood-pressure', measure: 'diastolic' });
      expect(error.message).toContain('not a clinical threshold');
    }
  });

  it('accepts diastolic just below systolic', () => {
    expect(validate(submission([bp(120, 119)]))).toEqual({ ok: true });
  });

  it('applies the entry limits to each number separately and names the number', () => {
    expect(errorsOf(submission([bp(300, 80)]))).toEqual([expect.objectContaining({ field: 'blood-pressure', measure: 'systolic' })]);
    expect(errorsOf(submission([bp(120, 20)]))).toEqual([expect.objectContaining({ field: 'blood-pressure', measure: 'diastolic' })]);
  });

  it('rejects a blood pressure with only one number', () => {
    const onlySystolic = { indicatorId: 'blood-pressure', systolic: 120 } as unknown as CheckInValue;
    const errors = errorsOf(submission([onlySystolic]));
    expect(errors).toEqual([expect.objectContaining({ field: 'blood-pressure', measure: 'diastolic', message: expect.stringContaining('enter a number') })]);
  });

  it('does not report the consistency error when a number is already invalid', () => {
    const errors = errorsOf(submission([bp(120, Number.NaN)]));
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('enter a number');
  });
});

describe('validateCheckIn: astronaut, day and content (FR-CHK-05)', () => {
  it('returns an error, and does not throw, for another astronaut', () => {
    const errors = errorsOf(submission([sleep(7)], [], { astronautId: 'astro-2' }));
    expect(errors).toEqual([expect.objectContaining({ field: 'form', message: expect.stringContaining('astro-2') })]);
  });

  it('rejects any mission day other than the current day (past and future)', () => {
    for (const missionDay of [DAY - 1, DAY + 1, 1]) {
      const errors = errorsOf(submission([sleep(7)], [], { missionDay }));
      expect(errors).toEqual([expect.objectContaining({ field: 'form', message: expect.stringContaining('day 30') })]);
    }
  });

  it('rejects an empty submission', () => {
    expect(errorsOf(submission([], []))).toEqual([expect.objectContaining({ field: 'form' })]);
  });

  it('can report form errors together with field errors', () => {
    const errors = errorsOf(submission([hr(300)], [], { missionDay: 5 }));
    expect(errors.map((e) => e.field)).toEqual(['form', 'heart-rate']);
  });

  it('rejects an unknown symptom, once, even when repeated', () => {
    const errors = errorsOf(submission([], ['nope', 'nope', 'headache']));
    expect(errors).toEqual([expect.objectContaining({ field: 'symptoms', message: expect.stringContaining('nope') })]);
  });

  it('accepts every symptom in the symptom list', () => {
    expect(validate(submission([], symptomDefinitions.map((s) => s.id)))).toEqual({ ok: true });
  });
});

describe('validateCheckIn: tracked indicators (FR-CREW-07, AT-CREW-11)', () => {
  it('rejects glucose for an astronaut who does not track it', () => {
    const sub = submission([{ indicatorId: 'blood-glucose', value: 5 }], [], { astronautId: 'astro-3' });
    expect(errorsOf(sub, astro3)).toEqual([expect.objectContaining({ field: 'blood-glucose' })]);
  });

  it('rejects an indicator with no definition', () => {
    const result = validateCheckIn(submission([sleep(7)]), astro1.profile, indicators.filter((i) => i.id !== 'sleep'));
    expect(result.ok).toBe(false);
  });

  it('rejects the same indicator twice in one check-in', () => {
    expect(errorsOf(submission([sleep(7), sleep(6)]))).toEqual([expect.objectContaining({ field: 'sleep' })]);
  });

  it('does not change its input', () => {
    const sub = submission([hr(300), bp(100, 110)], ['nope']);
    const before = JSON.stringify([sub, astro1.profile]);
    validate(sub);
    expect(JSON.stringify([sub, astro1.profile])).toBe(before);
  });
});

/* -------------------------------------------------------------------------- */

describe('applyCheckIn: readings', () => {
  it('turns values into entered readings for the submission day, exactly as typed', () => {
    const { enteredReadings } = applyCheckIn([], [], submission([hr(64.123456789), bp(118.5, 78.25), mood(4)]));
    expect(enteredReadings).toEqual([
      { astronautId: 'astro-1', indicatorId: 'heart-rate', missionDay: DAY, value: 64.123456789, origin: 'entered' },
      { astronautId: 'astro-1', indicatorId: 'blood-pressure', missionDay: DAY, systolic: 118.5, diastolic: 78.25, origin: 'entered' },
      { astronautId: 'astro-1', indicatorId: 'mood', missionDay: DAY, value: 4, origin: 'entered' },
    ]);
  });

  it('replaces an earlier entered reading of the same indicator and day, keeping one (AT-CHK-03)', () => {
    const first = applyCheckIn([], [], submission([sleep(7), hr(60)]));
    const second = applyCheckIn(first.enteredReadings, first.enteredSymptoms, submission([sleep(5.5)]));
    const sleeps = second.enteredReadings.filter((r) => r.indicatorId === 'sleep');
    expect(sleeps).toEqual([expect.objectContaining({ value: 5.5, missionDay: DAY })]);
    expect(second.enteredReadings).toHaveLength(2);
    expect(second.enteredReadings.find((r) => r.indicatorId === 'heart-rate')).toMatchObject({ value: 60 });
  });

  it('replaces a blood pressure reading as a whole pair', () => {
    const first = applyCheckIn([], [], submission([bp(120, 80)]));
    const second = applyCheckIn(first.enteredReadings, [], submission([bp(130, 85)]));
    expect(second.enteredReadings).toEqual([expect.objectContaining({ systolic: 130, diastolic: 85 })]);
  });

  it('keeps entered readings of other days and other indicators', () => {
    const earlier: EnteredReading = { astronautId: 'astro-1', indicatorId: 'sleep', missionDay: 29, value: 6, origin: 'entered' };
    const other: EnteredReading = { astronautId: 'astro-1', indicatorId: 'mood', missionDay: DAY, value: 3, origin: 'entered' };
    const { enteredReadings } = applyCheckIn([earlier, other], [], submission([sleep(7)]));
    expect(enteredReadings).toHaveLength(3);
    expect(enteredReadings).toContainEqual(earlier);
    expect(enteredReadings).toContainEqual(other);
  });

  it('a skipped indicator leaves an earlier entered value in place', () => {
    const first = applyCheckIn([], [], submission([sleep(7)]));
    const second = applyCheckIn(first.enteredReadings, [], submission([hr(60)]));
    expect(second.enteredReadings.find((r) => r.indicatorId === 'sleep')).toMatchObject({ value: 7 });
  });

  it('is deterministic and ordered: kept records first, replacements and new ones last', () => {
    const a = applyCheckIn([], [], submission([sleep(7), hr(60)]));
    const b = applyCheckIn(a.enteredReadings, [], submission([sleep(6)]));
    expect(b.enteredReadings.map((r) => r.indicatorId)).toEqual(['heart-rate', 'sleep']);
    expect(applyCheckIn(a.enteredReadings, [], submission([sleep(6)]))).toEqual(b);
  });
});

describe('applyCheckIn: symptoms', () => {
  it('turns symptom IDs into entered symptom reports for the submission day', () => {
    const { enteredSymptoms } = applyCheckIn([], [], submission([], ['headache', 'nausea']));
    expect(enteredSymptoms).toEqual([
      { astronautId: 'astro-1', symptomId: 'headache', missionDay: DAY, origin: 'entered' },
      { astronautId: 'astro-1', symptomId: 'nausea', missionDay: DAY, origin: 'entered' },
    ]);
  });

  it('keeps a symptom once when repeated in one submission or across submissions', () => {
    const first = applyCheckIn([], [], submission([], ['headache', 'headache']));
    expect(first.enteredSymptoms).toHaveLength(1);
    const second = applyCheckIn([], first.enteredSymptoms, submission([], ['headache', 'nausea']));
    expect(second.enteredSymptoms.map((s) => s.symptomId)).toEqual(['headache', 'nausea']);
  });

  it('keeps the same symptom on different days', () => {
    const earlier: EnteredSymptom = { astronautId: 'astro-1', symptomId: 'headache', missionDay: 29, origin: 'entered' };
    const { enteredSymptoms } = applyCheckIn([], [earlier], submission([], ['headache']));
    expect(enteredSymptoms).toHaveLength(2);
  });

  it('a symptom-only submission leaves readings unchanged', () => {
    const existing: EnteredReading = { astronautId: 'astro-1', indicatorId: 'sleep', missionDay: DAY, value: 7, origin: 'entered' };
    const { enteredReadings } = applyCheckIn([existing], [], submission([], ['headache']));
    expect(enteredReadings).toEqual([existing]);
  });
});

describe('applyCheckIn: separation and purity (A-15)', () => {
  const foreignReading: EnteredReading = { astronautId: 'astro-2', indicatorId: 'sleep', missionDay: DAY, value: 7, origin: 'entered' };
  const foreignSymptom: EnteredSymptom = { astronautId: 'astro-2', symptomId: 'headache', missionDay: DAY, origin: 'entered' };

  it('throws when stored readings belong to another astronaut', () => {
    expect(() => applyCheckIn([foreignReading], [], submission([sleep(7)]))).toThrow(/must not be mixed/);
  });

  it('throws when stored symptoms belong to another astronaut', () => {
    expect(() => applyCheckIn([], [foreignSymptom], submission([], ['headache']))).toThrow(/must not be mixed/);
  });

  it('throws even when the foreign record would have been replaced or is for another day', () => {
    expect(() => applyCheckIn([{ ...foreignReading, missionDay: 1 }], [], submission([hr(60)]))).toThrow(/must not be mixed/);
  });

  it('every produced record belongs to the submission astronaut and is entered', () => {
    const { enteredReadings, enteredSymptoms } = applyCheckIn([], [], submission([hr(60), bp(120, 80)], ['headache']));
    for (const r of enteredReadings) expect(r).toMatchObject({ astronautId: 'astro-1', origin: 'entered' });
    for (const s of enteredSymptoms) expect(s).toMatchObject({ astronautId: 'astro-1', origin: 'entered' });
  });

  it('does not change its inputs and returns new records', () => {
    const readings: EnteredReading[] = [{ astronautId: 'astro-1', indicatorId: 'sleep', missionDay: DAY, value: 7, origin: 'entered' }];
    const symptoms: EnteredSymptom[] = [{ astronautId: 'astro-1', symptomId: 'headache', missionDay: DAY, origin: 'entered' }];
    const sub = submission([sleep(5)], ['nausea']);
    const before = JSON.stringify([readings, symptoms, sub]);
    const result = applyCheckIn(readings, symptoms, sub);
    expect(JSON.stringify([readings, symptoms, sub])).toBe(before);
    expect(result.enteredReadings[0]).not.toBe(readings[0]);
    expect(result.enteredSymptoms[0]).not.toBe(symptoms[0]);
  });

  it('applies to one astronaut without touching another astronaut\'s stored data (AT-CREW-04)', () => {
    const astro2Stored: EnteredReading[] = [{ ...foreignReading }];
    const astro1Result = applyCheckIn([], [], submission([sleep(7)]));
    expect(astro2Stored).toEqual([foreignReading]);
    expect(astro1Result.enteredReadings.every((r) => r.astronautId === 'astro-1')).toBe(true);
  });
});

/* -------------------------------------------------------------------------- */

describe('check-in flows into computeSnapshot (AT-CHK-02, AT-CHK-03, AT-ALERT-06)', () => {
  function snapshotWith(seed: AstronautSeed, entered: EnteredReading[], enteredSymptoms: EnteredSymptom[] = []) {
    const input: HealthLogicInput = {
      profile: seed.profile,
      indicators,
      readings: [...seed.readings, ...entered],
      symptoms: [...seed.symptoms, ...enteredSymptoms],
      symptomDefinitions,
      sources,
      rules: prototypeRules,
      guidance: [],
    };
    return computeSnapshot(input);
  }

  const alertSummary = (snap: ReturnType<typeof snapshotWith>) => snap.alerts.map((a) => [a.indicatorId, a.level, a.ruleId]);

  it('baseline astro-1 has Action alerts on sleep and heart rate', () => {
    expect(alertSummary(snapshotWith(astro1, []))).toEqual([
      ['heart-rate', 'action', 'sustained-with-second-indicator'],
      ['sleep', 'action', 'sustained-with-second-indicator'],
    ]);
  });

  it('a valid replacement reading for today updates the snapshot and the alerts', () => {
    const sub = submission([sleep(7.3)]);
    expect(validate(sub)).toEqual({ ok: true });
    const { enteredReadings } = applyCheckIn([], [], sub);

    const before = snapshotWith(astro1, []);
    const after = snapshotWith(astro1, enteredReadings);

    const sleepBefore = before.statuses.find((s) => s.indicatorId === 'sleep')!;
    const sleepAfter = after.statuses.find((s) => s.indicatorId === 'sleep')!;
    expect(sleepBefore.measures[0].run).toMatchObject({ length: 5, isSustained: true });
    expect(sleepAfter.latestReading).toMatchObject({ value: 7.3, origin: 'entered' });
    expect(sleepAfter.measures[0].latestValue).toBe(7.3);
    expect(sleepAfter.measures[0].position).toBe('within-baseline');
    expect(sleepAfter.measures[0].run.length).toBe(0);

    // Sleep alert disappears. Heart rate stays sustained, now Action because of the symptom, not a second indicator.
    expect(alertSummary(after)).toEqual([['heart-rate', 'action', 'sustained-with-symptom']]);
    // Both the seeded and the entered record are kept in the raw array.
    expect(after.readings.filter((r) => r.indicatorId === 'sleep' && r.missionDay === DAY)).toHaveLength(2);
  });

  it('a second submission for the same day replaces the first in the result', () => {
    const first = applyCheckIn([], [], submission([sleep(7.3)]));
    const second = applyCheckIn(first.enteredReadings, [], submission([sleep(3)]));
    const snap = snapshotWith(astro1, second.enteredReadings);
    expect(snap.statuses.find((s) => s.indicatorId === 'sleep')!.latestReading).toMatchObject({ value: 3 });
    expect(snap.alerts.map((a) => a.indicatorId)).toContain('sleep');
  });

  it('an entered symptom is used by the logic and a repeated one counts once', () => {
    const { enteredSymptoms } = applyCheckIn([], [], submission([], ['headache', 'headache']));
    const snap = snapshotWith(astro2, [], enteredSymptoms.map((s) => ({ ...s, astronautId: 'astro-2' })));
    expect(snap.alerts).toEqual([expect.objectContaining({ ruleId: 'symptom-logged', indicatorId: null, symptomIds: ['headache'] })]);
    expect(snap.alerts[0].reasons).toHaveLength(1);
  });

  it('a check-in for astro-1 leaves astro-2 unchanged (AT-CREW-04)', () => {
    const { enteredReadings } = applyCheckIn([], [], submission([sleep(7.3)]));
    const astro2Before = snapshotWith(astro2, []);
    snapshotWith(astro1, enteredReadings);
    expect(snapshotWith(astro2, [])).toEqual(astro2Before);
  });

  it('feeding astro-1 entered records to astro-2 is rejected by the logic', () => {
    const { enteredReadings } = applyCheckIn([], [], submission([sleep(7.3)]));
    expect(() => snapshotWith(astro2, enteredReadings)).toThrow(/must not be mixed/);
  });

  it('never produces a Contact Flight Surgeon alert after a check-in', () => {
    const { enteredReadings, enteredSymptoms } = applyCheckIn([], [], submission([sleep(3), hr(150)], ['headache', 'tiredness']));
    const snap = snapshotWith(astro1, enteredReadings, enteredSymptoms);
    for (const a of snap.alerts) expect(['info', 'watch', 'action']).toContain(a.level);
  });
});
