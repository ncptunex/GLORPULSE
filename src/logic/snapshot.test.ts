import { describe, expect, it } from 'vitest';
import { alertLegend } from '../data/alertLegend';
import { indicators } from '../data/indicators';
import { mockSnapshot } from '../data/mockSnapshot';
import { prototypeRules } from '../data/prototypeRules';
import { seedCrew } from '../data/seedCrew';
import { sources } from '../data/sources';
import { symptomDefinitions } from '../data/symptoms';
import type {
  AstronautSeed,
  HealthIndicator,
  HealthLogicInput,
  HealthReading,
  HealthSnapshot,
  IndicatorId,
  SourceReference,
  SymptomReport,
} from '../shared/types';
import { computeAlerts } from './alerts';
import { computeIndicatorPositions } from './deviation';
import { computeIndicatorRuns, computeMissingDays } from './persistence';
import { computeSnapshot, selectLatestReading } from './snapshot';

function inputFor(seed: AstronautSeed): HealthLogicInput {
  return {
    profile: seed.profile,
    indicators,
    readings: seed.readings,
    symptoms: seed.symptoms,
    symptomDefinitions,
    sources,
    rules: prototypeRules,
    guidance: [],
  };
}

function seededSnapshot(id: string): HealthSnapshot {
  return computeSnapshot(inputFor(seedCrew.find((s) => s.profile.astronautId === id)!));
}

/* -------------------------------------------------------------------------- */
/* Small synthetic astronaut for edge cases.                                  */
/* -------------------------------------------------------------------------- */

const ID = 'astro-test';
const BASE = [7, 7.1, 6.9, 7, 7.1, 6.9, 7];

function sleepReadings(from: number, to: number, last = 30): HealthReading[] {
  const out: HealthReading[] = [];
  for (let d = 1; d <= last; d++) {
    out.push({
      astronautId: ID,
      indicatorId: 'sleep',
      missionDay: d,
      value: d >= from && d <= to ? 3 : BASE[(d - 1) % 7],
      origin: 'seeded',
    });
  }
  return out;
}

function small(overrides: Partial<HealthLogicInput> = {}): HealthLogicInput {
  return {
    profile: { astronautId: ID, displayName: 'Test', currentMissionDay: 30, trackedIndicators: ['sleep'] },
    indicators,
    readings: sleepReadings(99, 99),
    symptoms: [],
    symptomDefinitions,
    sources,
    rules: prototypeRules,
    guidance: [],
    ...overrides,
  };
}

function symptom(missionDay: number, origin: 'seeded' | 'entered' = 'seeded'): SymptomReport {
  return { astronautId: ID, symptomId: 'tiredness', missionDay, origin };
}

/* -------------------------------------------------------------------------- */

describe('computeSnapshot: seeded astronauts', () => {
  for (const seed of seedCrew) {
    const id = seed.profile.astronautId;

    describe(id, () => {
      const snap = seededSnapshot(id);

      it('has the basic fields', () => {
        expect(snap.astronautId).toBe(id);
        expect(snap.evaluatedOnDay).toBe(seed.profile.currentMissionDay);
        expect(snap.isSimulatedData).toBe(true);
        expect(snap.explanations.map((e) => e.alertId)).toEqual(snap.alerts.map((a) => a.id));
        expect(snap.alertLegend).toEqual(alertLegend);
        expect(snap.rules).toBe(prototypeRules);
      });

      it('has one status per tracked indicator, in profile order, and none for untracked ones', () => {
        expect(snap.statuses.map((s) => s.indicatorId)).toEqual(seed.profile.trackedIndicators);
        for (const s of snap.statuses) expect(s.astronautId).toBe(id);
      });

      it('has one measure per definition (two for blood pressure)', () => {
        for (const s of snap.statuses) {
          const definition = indicators.find((i) => i.id === s.indicatorId)!;
          expect(s.measures.map((m) => m.measure)).toEqual(definition.measures.map((m) => m.key));
        }
      });

      it('agrees with the underlying logic', () => {
        for (const s of snap.statuses) {
          const indicator = indicators.find((i) => i.id === s.indicatorId)!;
          const positions = computeIndicatorPositions(id, indicator, seed.readings, prototypeRules, 30);
          const runs = computeIndicatorRuns(id, indicator, seed.readings, prototypeRules, 30);
          s.measures.forEach((m, i) => {
            expect(m.baseline).toEqual(positions[i].baseline);
            expect(m.position).toBe(positions[i].position);
            expect(m.run).toEqual(runs[i].run);
            expect(m.latestValue).toBe(positions[i].latest?.value ?? null);
          });
          expect(s.missingDays).toEqual(computeMissingDays(id, indicator, seed.readings, 30));
        }
      });

      it('has the same alerts as computeAlerts', () => {
        expect(snap.alerts).toEqual(
          computeAlerts({
            profile: seed.profile,
            indicators,
            readings: seed.readings,
            symptoms: seed.symptoms,
            symptomDefinitions,
            rules: prototypeRules,
          }),
        );
      });

      it('copies all raw records and keeps only this astronaut', () => {
        expect(snap.readings).toEqual(seed.readings);
        expect(snap.symptoms).toEqual(seed.symptoms);
        expect(snap.readings).not.toBe(seed.readings);
        for (const r of snap.readings) expect(r.astronautId).toBe(id);
        for (const s of snap.symptoms) expect(s.astronautId).toBe(id);
        for (const a of snap.alerts) expect(a.astronautId).toBe(id);
      });

      it('shows every reference status as not-assessed with no range or limit', () => {
        for (const s of snap.statuses) {
          for (const m of s.measures) {
            expect(m.referenceStatus).toBe('not-assessed');
            expect(m.referenceRange).toBeNull();
            expect(m.missionLimit).toBeNull();
          }
        }
      });

      it('has the same keys as the mock snapshot', () => {
        expect(Object.keys(snap).sort()).toEqual(Object.keys(mockSnapshot).sort());
        expect(Object.keys(snap.statuses[0]).sort()).toEqual(Object.keys(mockSnapshot.statuses[0]).sort());
        expect(Object.keys(snap.statuses[0].measures[0]).sort()).toEqual(
          Object.keys(mockSnapshot.statuses[0].measures[0]).sort(),
        );
      });
    });
  }

  it('astro-1: Action alerts on sleep and heart rate, sustained runs, symptom as context', () => {
    const snap = seededSnapshot('astro-1');
    const sleep = snap.statuses.find((s) => s.indicatorId === 'sleep')!.measures[0];
    const heart = snap.statuses.find((s) => s.indicatorId === 'heart-rate')!.measures[0];
    expect(sleep).toMatchObject({ position: 'below-baseline', run: { startDay: 26, isSustained: true } });
    expect(heart).toMatchObject({ position: 'above-baseline', run: { startDay: 27, isSustained: true } });
    expect(snap.alerts.map((a) => [a.indicatorId, a.level])).toEqual([
      ['heart-rate', 'action'],
      ['sleep', 'action'],
    ]);
    for (const a of snap.alerts) {
      const status = snap.statuses.find((s) => s.indicatorId === a.indicatorId)!;
      expect(a.runStartDay).toBe(status.measures[0].run.startDay);
      expect(a.symptomIds).toEqual(['tiredness']);
    }
  });

  it('astro-2: tracks glucose, no alerts, nothing pending', () => {
    const snap = seededSnapshot('astro-2');
    expect(snap.alerts).toEqual([]);
    expect(snap.statuses.some((s) => s.indicatorId === 'blood-glucose')).toBe(true);
    for (const s of snap.statuses) expect(s.todayPending).toBe(false);
  });

  it('astro-3: missing days are reported, no glucose card, one Info alert', () => {
    const snap = seededSnapshot('astro-3');
    expect(snap.statuses.some((s) => s.indicatorId === 'blood-glucose')).toBe(false);
    const heart = snap.statuses.find((s) => s.indicatorId === 'heart-rate')!;
    expect(heart.missingDays).toEqual([3, 28]);
    expect(heart.measures[0].run).toMatchObject({ length: 2, startDay: 29, isSustained: false });
    expect(snap.alerts.map((a) => [a.indicatorId, a.level])).toEqual([['heart-rate', 'info']]);
  });

  it('astro-4: glucose baseline is still building, with no alert', () => {
    const snap = seededSnapshot('astro-4');
    const glucose = snap.statuses.find((s) => s.indicatorId === 'blood-glucose')!;
    expect(glucose.measures[0].baseline).toMatchObject({ state: 'building', daysCounted: 3, daysRequired: 7 });
    expect(glucose.measures[0].position).toBe('not-enough-data');
    expect(glucose.measures[0].run.length).toBe(0);
    expect(glucose.missingDays).toEqual([]);
    expect(snap.alerts).toEqual([]);
  });

  it('crew snapshots never share records, statuses or alerts', () => {
    const snaps = seedCrew.map((s) => seededSnapshot(s.profile.astronautId));
    for (const a of snaps) {
      for (const b of snaps) {
        if (a === b) continue;
        expect(a.readings.some((r) => b.readings.includes(r))).toBe(false);
        expect(a.alerts.some((x) => b.alerts.some((y) => x.id === y.id))).toBe(false);
      }
    }
  });
});

describe('computeSnapshot: astronaut separation', () => {
  const foreignReading: HealthReading = { astronautId: 'other', indicatorId: 'sleep', missionDay: 5, value: 7, origin: 'seeded' };

  it('rejects a reading of another astronaut', () => {
    expect(() => computeSnapshot(small({ readings: [...sleepReadings(99, 99), foreignReading] }))).toThrow(/must not be mixed/);
  });

  it('rejects a foreign reading on a future day', () => {
    expect(() => computeSnapshot(small({ readings: [...sleepReadings(99, 99), { ...foreignReading, missionDay: 99 }] }))).toThrow(
      /must not be mixed/,
    );
  });

  it('rejects a foreign reading of an untracked indicator', () => {
    expect(() =>
      computeSnapshot(small({ readings: [...sleepReadings(99, 99), { ...foreignReading, indicatorId: 'mood' }] })),
    ).toThrow(/must not be mixed/);
  });

  it('rejects a symptom of another astronaut', () => {
    expect(() => computeSnapshot(small({ symptoms: [{ ...symptom(30), astronautId: 'other' }] }))).toThrow(/must not be mixed/);
  });

  it('throws for a tracked indicator with no definition', () => {
    expect(() => computeSnapshot(small({ indicators: indicators.filter((i) => i.id !== 'sleep') }))).toThrow(/No definition/);
  });
});

describe('computeSnapshot: pending day', () => {
  // Sleep readings exist for days 1 to 29 only. Today (day 30) is pending.
  const pending = computeSnapshot(small({ readings: sleepReadings(27, 29, 29) }));
  const status = pending.statuses[0];

  it('reports the pending state', () => {
    expect(status.todayPending).toBe(true);
    expect(status.daysSinceLatestReading).toBe(1);
    expect(status.missingDays).toEqual([30]);
  });

  it('keeps the latest older reading and position (A-14)', () => {
    expect(status.latestReading?.missionDay).toBe(29);
    expect(status.measures[0].latestValue).toBe(3);
    expect(status.measures[0].position).toBe('below-baseline');
  });

  it('counts the run through the previous day and still alerts', () => {
    expect(status.measures[0].run).toMatchObject({ length: 3, startDay: 27, isSustained: true });
    expect(pending.alerts.map((a) => a.level)).toEqual(['watch']);
  });

  it('has no latest reading and an unknown age when the indicator has no readings', () => {
    const none = computeSnapshot(small({ readings: [] })).statuses[0];
    expect(none.latestReading).toBeNull();
    expect(none.daysSinceLatestReading).toBeNull();
    expect(none.measures[0].latestValue).toBeNull();
    expect(none.measures[0].position).toBe('not-enough-data');
    expect(none.missingDays).toEqual([]);
  });
});

describe('computeSnapshot: duplicate readings (entered over seeded)', () => {
  const seededDay30: HealthReading = { astronautId: ID, indicatorId: 'sleep', missionDay: 30, value: 7, origin: 'seeded' };
  const enteredDay30: HealthReading = { ...seededDay30, value: 3, origin: 'entered' };
  const base = sleepReadings(99, 99, 29);

  it('the entered reading wins whatever the list order', () => {
    for (const list of [[...base, seededDay30, enteredDay30], [...base, enteredDay30, seededDay30]]) {
      const status = computeSnapshot(small({ readings: list })).statuses[0];
      expect(status.latestReading).toMatchObject({ value: 3, origin: 'entered' });
      expect(status.measures[0].latestValue).toBe(3);
    }
  });

  it('between two seeded duplicates the later one in the list wins', () => {
    const a = { ...seededDay30, value: 6.9 };
    const b = { ...seededDay30, value: 7.1 };
    expect(computeSnapshot(small({ readings: [...base, a, b] })).statuses[0].measures[0].latestValue).toBe(7.1);
  });

  it('latestValue agrees with the position calculation', () => {
    const status = computeSnapshot(small({ readings: [...base, seededDay30, enteredDay30] })).statuses[0];
    const position = computeIndicatorPositions(ID, indicators.find((i) => i.id === 'sleep')!, [...base, seededDay30, enteredDay30], prototypeRules, 30);
    expect(status.measures[0].latestValue).toBe(position[0].latest?.value);
  });

  it('keeps every raw record in the snapshot, duplicates included', () => {
    const list = [...base, seededDay30, enteredDay30];
    const snap = computeSnapshot(small({ readings: list }));
    expect(snap.readings).toHaveLength(list.length);
    expect(snap.readings).toEqual(list);
  });

  it('selects blood pressure by the same rule', () => {
    const bp = (v: number, origin: 'seeded' | 'entered'): HealthReading => ({
      astronautId: ID, indicatorId: 'blood-pressure', missionDay: 4, systolic: v, diastolic: v - 40, origin,
    });
    const latest = selectLatestReading([bp(120, 'entered'), bp(130, 'seeded')], ID, 'blood-pressure', 30);
    expect(latest).toMatchObject({ systolic: 120, origin: 'entered' });
  });
});

describe('computeSnapshot: future records', () => {
  const withFuture = (): HealthLogicInput =>
    small({
      profile: { astronautId: ID, displayName: 'Test', currentMissionDay: 29, trackedIndicators: ['sleep'] },
      readings: sleepReadings(99, 99, 29),
      symptoms: [],
    });

  const futureReadings: HealthReading[] = [30, 31, 32, 33].map((d) => ({
    astronautId: ID, indicatorId: 'sleep', missionDay: d, value: 3, origin: 'seeded',
  }));

  it('keeps future records in the raw arrays', () => {
    const snap = computeSnapshot({ ...withFuture(), readings: [...withFuture().readings, ...futureReadings], symptoms: [symptom(31)] });
    expect(snap.readings.filter((r) => r.missionDay > 29)).toHaveLength(4);
    expect(snap.symptoms).toEqual([symptom(31)]);
  });

  it('never lets future records change statuses or alerts', () => {
    const plain = computeSnapshot(withFuture());
    const future = computeSnapshot({ ...withFuture(), readings: [...withFuture().readings, ...futureReadings], symptoms: [symptom(31)] });
    expect(future.statuses).toEqual(plain.statuses);
    expect(future.alerts).toEqual(plain.alerts);
    expect(future.alerts).toEqual([]);
  });

  it('a future symptom never creates an alert', () => {
    const snap = computeSnapshot({ ...withFuture(), symptoms: [symptom(30), symptom(35)] });
    expect(snap.alerts).toEqual([]);
  });

  it('latestReading ignores future readings', () => {
    const snap = computeSnapshot({ ...withFuture(), readings: [...withFuture().readings, ...futureReadings] });
    expect(snap.statuses[0].latestReading?.missionDay).toBe(29);
    expect(snap.statuses[0].todayPending).toBe(false);
  });
});

describe('computeSnapshot: reference status', () => {
  const sleepDef = indicators.find((i) => i.id === 'sleep')!;
  const withRange = (sourceIds: [string, ...string[]], low: number | null, high: number | null): HealthIndicator => ({
    ...sleepDef,
    referenceRanges: [{ measure: 'value', low, high, sourceIds }],
  });
  const testSources: SourceReference[] = [
    { ...sources[0], id: 'TEST-OK', verification: 'verified' },
    { ...sources[0], id: 'TEST-NO', verification: 'not-yet-verified' },
  ];
  const run = (indicator: HealthIndicator, ids: IndicatorId[] = ['sleep'], list = sleepReadings(99, 99)) =>
    computeSnapshot(
      small({
        indicators: [indicator],
        sources: testSources,
        readings: list,
        profile: { astronautId: ID, displayName: 'Test', currentMissionDay: 30, trackedIndicators: ids as [IndicatorId] },
      }),
    ).statuses[0].measures[0];

  it('is not-assessed when the indicator has no range', () => {
    expect(run(sleepDef)).toMatchObject({ referenceStatus: 'not-assessed', referenceRange: null });
  });

  it('is not-assessed, with no range attached, when a source is not verified', () => {
    expect(run(withRange(['TEST-NO'], 6, 9))).toMatchObject({ referenceStatus: 'not-assessed', referenceRange: null });
    expect(run(withRange(['TEST-OK', 'TEST-NO'], 6, 9))).toMatchObject({ referenceStatus: 'not-assessed', referenceRange: null });
  });

  it('is not-assessed when the source does not exist', () => {
    expect(run(withRange(['MISSING'], 6, 9)).referenceStatus).toBe('not-assessed');
  });

  it('uses a verified range, and attaches it', () => {
    const m = run(withRange(['TEST-OK'], 6, 9)); // day 30 value is 7.1
    expect(m.referenceStatus).toBe('within-reference');
    expect(m.referenceRange).toMatchObject({ low: 6, high: 9, sourceIds: ['TEST-OK'] });
    expect(run(withRange(['TEST-OK'], 8, 9)).referenceStatus).toBe('outside-reference');
    expect(run(withRange(['TEST-OK'], null, 6)).referenceStatus).toBe('outside-reference');
    expect(run(withRange(['TEST-OK'], 7.1, 7.1)).referenceStatus).toBe('within-reference');
  });

  it('is not-assessed with a verified range but no reading', () => {
    const m = run(withRange(['TEST-OK'], 6, 9), ['sleep'], []);
    expect(m.referenceStatus).toBe('not-assessed');
  });

  it('never changes alerts (FR-ALERT-05)', () => {
    const readings = sleepReadings(27, 30);
    const make = (indicator: HealthIndicator) =>
      computeSnapshot(small({ indicators: [indicator], sources: testSources, readings })).alerts;
    expect(make(withRange(['TEST-OK'], 6, 9))).toEqual(make(sleepDef));
    expect(make(sleepDef)).toHaveLength(1);
  });
});

describe('computeSnapshot: purity', () => {
  it('does not change its input', () => {
    const seed = seedCrew[0];
    const input = inputFor(seed);
    const before = JSON.stringify(input);
    computeSnapshot(input);
    expect(JSON.stringify(input)).toBe(before);
  });

  it('gives equal results on repeated calls', () => {
    const input = inputFor(seedCrew[0]);
    expect(computeSnapshot(input)).toEqual(computeSnapshot(input));
  });

  it('returns copies, so changing the snapshot does not change the input', () => {
    const seed = seedCrew[0];
    const snap = computeSnapshot(inputFor(seed));
    snap.readings[0].origin = 'entered';
    snap.symptoms.pop();
    snap.alertLegend[0].label = 'changed';
    expect(seed.readings[0].origin).toBe('seeded');
    expect(seed.symptoms).toHaveLength(1);
    expect(alertLegend[0].label).toBe('Info');
  });
});
