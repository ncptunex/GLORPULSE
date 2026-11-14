import { describe, expect, it } from 'vitest';
import { indicators } from '../data/indicators';
import { prototypeRules } from '../data/prototypeRules';
import { getSeed } from '../data/seedCrew';
import type { DeviationRun, HealthIndicator, HealthReading, PrototypeRules } from '../shared/types';
import { computeBaseline } from './baseline';
import { computeIndicatorPositions, computeMeasurePosition, evaluateMeasureReadings } from './deviation';
import {
  computeDeviationRun,
  computeIndicatorRuns,
  computeMissingDays,
  computeReadingTiming,
  isIndicatorSustained,
} from './persistence';

/* -------------------------------------------------------------------------- */
/* Neutral fixture (requirements section 12: "not medical data").             */
/* Baseline = days 1 to 7: centre 7.0, spread 0.1, band 6.7 to 7.3.           */
/*   LOW  = 5.9  deviates below.   HIGH = 8.1  deviates above.                */
/*   NORM = 7.0  does not deviate.                                            */
/* -------------------------------------------------------------------------- */

const ID = 'astro-test';
const LOW = 5.9;
const HIGH = 8.1;
const NORM = 7.0;

const fixtureIndicator: HealthIndicator = {
  id: 'sleep',
  displayName: 'Fixture indicator',
  measures: [{ key: 'value', label: 'Fixture', unit: 'units', entryMin: 0, entryMax: 100, spreadFloor: 0.05 }],
  referenceRanges: [],
  missionLimits: [],
  hazards: { status: 'no-sourced-guidance' },
  howToMeasure: { status: 'no-sourced-guidance' },
  whyItMatters: { status: 'no-sourced-guidance' },
  contextNote: null,
};

function reading(missionDay: number, value: number): HealthReading {
  return { astronautId: ID, indicatorId: 'sleep', missionDay, value, origin: 'seeded' };
}

const BASELINE_VALUES = [6.8, 7.0, 7.1, 7.0, 6.9, 7.2, 7.0];
const baselineReadings = BASELINE_VALUES.map((v, i) => reading(i + 1, v));

/** Days `from` to `to` (inclusive) with a normal reading. */
function normals(from: number, to: number): HealthReading[] {
  const out: HealthReading[] = [];
  for (let d = from; d <= to; d++) out.push(reading(d, NORM));
  return out;
}

/** Baseline (days 1 to 7) plus the given [day, value] pairs. Days not listed have NO reading. */
function withDays(pairs: Array<[number, number]>): HealthReading[] {
  return [...baselineReadings, ...pairs.map(([d, v]) => reading(d, v))];
}

function runOn(readings: HealthReading[], evaluationDay: number, rules: PrototypeRules = prototypeRules) {
  return computeDeviationRun(ID, fixtureIndicator, 'value', readings, rules, evaluationDay);
}

const NO_RUN: DeviationRun = { length: 0, direction: null, startDay: null, isSustained: false };

const indicator = (id: string) => indicators.find((i) => i.id === id) as HealthIndicator;

/* -------------------------------------------------------------------------- */

describe('AT-TREND-03: consecutive deviations', () => {
  it('three days in a row in the same direction is a sustained run', () => {
    const readings = withDays([[8, LOW], [9, LOW], [10, LOW]]);
    expect(runOn(readings, 10).run).toEqual({ length: 3, direction: 'below', startDay: 8, isSustained: true });
  });

  it('the run grows day by day: 1, then 2, then 3', () => {
    const readings = withDays([[8, HIGH], [9, HIGH], [10, HIGH]]);
    expect(runOn(readings, 8).run).toEqual({ length: 1, direction: 'above', startDay: 8, isSustained: false });
    expect(runOn(readings, 9).run).toEqual({ length: 2, direction: 'above', startDay: 8, isSustained: false });
    expect(runOn(readings, 10).run).toEqual({ length: 3, direction: 'above', startDay: 8, isSustained: true });
  });

  it('counts the whole run, for example 5 days', () => {
    const readings = withDays([[8, NORM], [9, LOW], [10, LOW], [11, LOW], [12, LOW], [13, LOW]]);
    expect(runOn(readings, 13).run).toMatchObject({ length: 5, startDay: 9, isSustained: true });
  });

  it('uses the sustained limit from the rules, not a hard-coded 3', () => {
    const readings = withDays([[8, LOW], [9, LOW]]);
    expect(runOn(readings, 9).run.isSustained).toBe(false);
    const twoDayRules: PrototypeRules = { ...prototypeRules, sustainedDays: 2 };
    expect(runOn(readings, 9, twoDayRules).run.isSustained).toBe(true);
  });
});

describe('AT-TREND-02: a run interrupted by a normal reading', () => {
  it('two deviating days are a run of 2 and not sustained', () => {
    const readings = withDays([[8, LOW], [9, LOW]]);
    expect(runOn(readings, 9).run).toEqual({ length: 2, direction: 'below', startDay: 8, isSustained: false });
  });

  it('a normal day on the evaluation day ends the run', () => {
    const readings = withDays([[8, LOW], [9, LOW], [10, NORM]]);
    expect(runOn(readings, 10).run).toEqual(NO_RUN);
  });

  it('a new run after a normal day starts again from 1', () => {
    const readings = withDays([[8, LOW], [9, LOW], [10, LOW], [11, NORM], [12, LOW]]);
    expect(runOn(readings, 11).run).toEqual(NO_RUN);
    expect(runOn(readings, 12).run).toEqual({ length: 1, direction: 'below', startDay: 12, isSustained: false });
  });

  it('a reading just inside the band (score under 3) is normal and ends the run', () => {
    const readings = withDays([[8, LOW], [9, LOW], [10, 6.71]]);
    expect(runOn(readings, 10).run).toEqual(NO_RUN);
  });
});

describe('AT-TREND-06: opposite directions', () => {
  it('below on day 27, above on days 28 and 29: the earlier run ends and a new run of 2 starts', () => {
    const readings = [...normals(8, 26), reading(27, LOW), reading(28, HIGH), reading(29, HIGH)];
    expect(runOn(readings, 27).run).toEqual({ length: 1, direction: 'below', startDay: 27, isSustained: false });
    expect(runOn(readings, 28).run).toEqual({ length: 1, direction: 'above', startDay: 28, isSustained: false });
    expect(runOn(readings, 29).run).toEqual({ length: 2, direction: 'above', startDay: 28, isSustained: false });
  });
});

describe('AT-TREND-04: a missing day ends the run', () => {
  // Deviations on days 20 and 21, no reading on day 22, deviations on days 23, 24 and 25.
  const readings = [
    ...normals(8, 19),
    reading(20, LOW), reading(21, LOW),
    reading(23, LOW), reading(24, LOW), reading(25, LOW),
  ];

  it('before the gap the run is 2', () => {
    expect(runOn(readings, 21).run).toMatchObject({ length: 2, startDay: 20 });
  });

  it('the run restarts after the gap: 1 on day 23, 2 on day 24, 3 and sustained on day 25', () => {
    expect(runOn(readings, 23).run).toEqual({ length: 1, direction: 'below', startDay: 23, isSustained: false });
    expect(runOn(readings, 24).run).toEqual({ length: 2, direction: 'below', startDay: 23, isSustained: false });
    expect(runOn(readings, 25).run).toEqual({ length: 3, direction: 'below', startDay: 23, isSustained: true });
  });

  it('days 20 to 25 are NOT counted as one run of 5 (the gap is never filled in)', () => {
    expect(runOn(readings, 25).run.length).toBe(3);
  });
});

describe('AT-TREND-05: a pending evaluation day', () => {
  it('deviations on days 28 and 29 with no reading on day 30: run of 2, today pending', () => {
    const readings = [...normals(8, 27), reading(28, LOW), reading(29, LOW)];
    const r = runOn(readings, 30);
    expect(r.todayPending).toBe(true);
    expect(r.evaluatedThroughDay).toBe(29);
    expect(r.run).toEqual({ length: 2, direction: 'below', startDay: 28, isSustained: false });
  });

  it('a pending day does not break a sustained run', () => {
    const readings = [...normals(8, 26), reading(27, LOW), reading(28, LOW), reading(29, LOW)];
    const r = runOn(readings, 30);
    expect(r.todayPending).toBe(true);
    expect(r.run).toEqual({ length: 3, direction: 'below', startDay: 27, isSustained: true });
  });

  it('when the day is no longer pending, the new reading is counted', () => {
    const readings = [...normals(8, 27), reading(28, LOW), reading(29, LOW), reading(30, LOW)];
    const r = runOn(readings, 30);
    expect(r.todayPending).toBe(false);
    expect(r.evaluatedThroughDay).toBe(30);
    expect(r.run).toMatchObject({ length: 3, startDay: 28, isSustained: true });
  });

  it('a normal reading on the evaluation day ends the run (it is not pending)', () => {
    const readings = [...normals(8, 27), reading(28, LOW), reading(29, LOW), reading(30, NORM)];
    expect(runOn(readings, 30).run).toEqual(NO_RUN);
  });

  it('a past missing day is a gap, not a pending day: only the evaluation day is pending', () => {
    // Deviations on days 27 and 28, then NO reading on day 29 and none on day 30.
    const readings = [...normals(8, 26), reading(27, LOW), reading(28, LOW)];
    const r = runOn(readings, 30);
    expect(r.todayPending).toBe(true);
    expect(r.evaluatedThroughDay).toBe(29);
    expect(r.run).toEqual(NO_RUN); // day 29 is a missing past day, so the run is over
  });
});

describe('days without an eligible reading', () => {
  it('while the baseline is building there is no run, even for extreme readings', () => {
    const readings = [reading(1, 7.0), reading(2, 7.1), reading(3, 1.0), reading(4, 1.0), reading(5, 1.0)];
    const r = runOn(readings, 5);
    expect(r.baseline.state).toBe('building');
    expect(r.run).toEqual(NO_RUN);
  });

  it('readings inside the baseline window never form a run, even an extreme one', () => {
    const odd = baselineReadings.map((r) => (r.missionDay >= 5 && r.indicatorId === 'sleep' ? { ...r, value: 9.0 } : r));
    // Days 5, 6, 7 are all 9.0, but they ARE the baseline, so they are not flagged.
    expect(runOn(odd, 7).run).toEqual(NO_RUN);
  });

  it('no readings at all: no run, and today is pending', () => {
    const r = runOn([], 30);
    expect(r.run).toEqual(NO_RUN);
    expect(r.todayPending).toBe(true);
  });

  it('a run that would have started before the baseline window is ignored there', () => {
    // The baseline completes on day 8 (day 3 missing). The deviating days 9, 10, 11 form the first run.
    const days = [1, 2, 4, 5, 6, 7, 8];
    const readings = days.map((d, i) => reading(d, BASELINE_VALUES[i]));
    readings.push(reading(9, LOW), reading(10, LOW), reading(11, LOW));
    expect(runOn(readings, 11).run).toMatchObject({ length: 3, startDay: 9, isSustained: true });
  });
});

describe('future readings do not affect an earlier evaluation day', () => {
  const all = [...normals(8, 27), reading(28, LOW), reading(29, LOW), reading(30, LOW), reading(31, LOW), reading(32, HIGH)];

  it('evaluating day 29 gives the same result with or without readings from days 30 to 32', () => {
    const upTo29 = all.filter((r) => r.missionDay <= 29);
    expect(runOn(all, 29)).toEqual(runOn(upTo29, 29));
    expect(runOn(all, 29).run).toMatchObject({ length: 2, startDay: 28, isSustained: false });
  });

  it('a later deviation does not make an earlier day look sustained', () => {
    expect(runOn(all, 29).run.isSustained).toBe(false);
    expect(runOn(all, 30).run.isSustained).toBe(true);
  });

  it('a reading on a later day does not stop an earlier day from being pending', () => {
    // No reading on day 28, but there is one on day 29. Evaluated on day 28, today is pending.
    const readings = [...normals(8, 26), reading(27, LOW), reading(29, LOW)];
    const r = runOn(readings, 28);
    expect(r.todayPending).toBe(true);
    expect(r.run).toMatchObject({ length: 1, startDay: 27 });
  });

  it('future readings cannot complete or change the baseline of an earlier day', () => {
    // On day 5 only 5 readings exist, so the baseline is building whatever comes later.
    const readings = [...baselineReadings, ...normals(8, 20)];
    const r = runOn(readings, 5);
    expect(r.baseline).toMatchObject({ state: 'building', daysCounted: 5 });
    expect(r.run).toEqual(NO_RUN);
  });
});

describe('AT-TREND-07: blood pressure runs are separate', () => {
  const bp = indicator('blood-pressure');
  const ASTRO = 'bp-test';

  function bpReading(day: number, systolic: number, diastolic: number): HealthReading {
    return { astronautId: ASTRO, indicatorId: 'blood-pressure', missionDay: day, origin: 'seeded', systolic, diastolic };
  }

  // Baseline days 1 to 7: systolic around 120 (floor 3, band 111 to 129), diastolic around 80 (floor 2, band 74 to 86).
  const base = [
    bpReading(1, 120, 80), bpReading(2, 121, 79), bpReading(3, 119, 81), bpReading(4, 120, 80),
    bpReading(5, 121, 80), bpReading(6, 119, 79), bpReading(7, 120, 81),
  ];

  it('systolic deviates for 3 days, diastolic does not: sustained for blood pressure, systolic only', () => {
    const readings = [...base, bpReading(8, 135, 80), bpReading(9, 136, 80), bpReading(10, 134, 80)];
    const results = computeIndicatorRuns(ASTRO, bp, readings, prototypeRules, 10);
    expect(results.map((r) => r.measure)).toEqual(['systolic', 'diastolic']);
    expect(results[0].run).toEqual({ length: 3, direction: 'above', startDay: 8, isSustained: true });
    expect(results[1].run).toEqual(NO_RUN);
    expect(isIndicatorSustained(results)).toBe(true);
  });

  it('the two numbers keep their own run lengths, start days and directions', () => {
    const readings = [
      ...base,
      bpReading(8, 135, 80), // systolic above, diastolic normal
      bpReading(9, 136, 70), // systolic above, diastolic below
      bpReading(10, 134, 69), // systolic above, diastolic below
    ];
    const [sys, dia] = computeIndicatorRuns(ASTRO, bp, readings, prototypeRules, 10);
    expect(sys.run).toEqual({ length: 3, direction: 'above', startDay: 8, isSustained: true });
    expect(dia.run).toEqual({ length: 2, direction: 'below', startDay: 9, isSustained: false });
  });

  it('a normal systolic day ends only the systolic run', () => {
    const readings = [...base, bpReading(8, 135, 70), bpReading(9, 120, 70), bpReading(10, 120, 70)];
    const [sys, dia] = computeIndicatorRuns(ASTRO, bp, readings, prototypeRules, 10);
    expect(sys.run).toEqual(NO_RUN);
    expect(dia.run).toMatchObject({ length: 3, direction: 'below', isSustained: true });
  });

  it('neither number sustained: the indicator is not sustained', () => {
    const readings = [...base, bpReading(8, 135, 80), bpReading(9, 136, 70)];
    const results = computeIndicatorRuns(ASTRO, bp, readings, prototypeRules, 9);
    expect(isIndicatorSustained(results)).toBe(false);
  });

  it('a missing blood pressure day is a gap for both numbers', () => {
    const readings = [...base, bpReading(8, 135, 70), bpReading(9, 135, 70), bpReading(11, 135, 70)];
    const [sys, dia] = computeIndicatorRuns(ASTRO, bp, readings, prototypeRules, 11);
    expect(sys.run).toMatchObject({ length: 1, startDay: 11 });
    expect(dia.run).toMatchObject({ length: 1, startDay: 11 });
  });

  it('a single-number indicator returns one run', () => {
    const results = computeIndicatorRuns(ID, fixtureIndicator, withDays([[8, LOW]]), prototypeRules, 8);
    expect(results).toHaveLength(1);
  });
});

describe('reading timing (maps to HealthStatus fields)', () => {
  it('today pending and days since the latest reading', () => {
    const readings = withDays([[8, NORM], [9, NORM]]);
    expect(computeReadingTiming(ID, fixtureIndicator, readings, 9)).toEqual({ todayPending: false, daysSinceLatestReading: 0 });
    expect(computeReadingTiming(ID, fixtureIndicator, readings, 12)).toEqual({ todayPending: true, daysSinceLatestReading: 3 });
  });

  it('no readings at all', () => {
    expect(computeReadingTiming(ID, fixtureIndicator, [], 30)).toEqual({ todayPending: true, daysSinceLatestReading: null });
  });

  it('ignores readings after the evaluation day', () => {
    const readings = withDays([[8, NORM], [20, NORM]]);
    expect(computeReadingTiming(ID, fixtureIndicator, readings, 10)).toEqual({ todayPending: true, daysSinceLatestReading: 2 });
  });
});

describe('astronaut separation', () => {
  it('throws if readings of another astronaut are given', () => {
    const foreign = getSeed('astro-1').readings;
    expect(() => computeDeviationRun('astro-2', indicator('sleep'), 'value', foreign, prototypeRules, 30)).toThrow(/mixed/);
    expect(() => computeIndicatorRuns('astro-2', indicator('sleep'), foreign, prototypeRules, 30)).toThrow(/mixed/);
    expect(() => computeReadingTiming('astro-2', indicator('sleep'), foreign, 30)).toThrow(/mixed/);
  });

  it('throws even if the foreign reading is on a future day', () => {
    const mixed: HealthReading[] = [...withDays([[8, NORM]]), { ...reading(25, LOW), astronautId: 'someone-else' }];
    expect(() => runOn(mixed, 10)).toThrow(/mixed/);
  });

  it('two astronauts get independent runs', () => {
    const run = (id: string, indicatorId: string) =>
      computeDeviationRun(id, indicator(indicatorId), 'value', getSeed(id).readings, prototypeRules, 30).run;
    expect(run('astro-1', 'sleep').isSustained).toBe(true);
    expect(run('astro-2', 'sleep')).toEqual(NO_RUN);
  });
});

describe('with the seeded crew', () => {
  const runsFor = (astronautId: string, evaluationDay = 30) => {
    const seed = getSeed(astronautId);
    const out: Record<string, DeviationRun> = {};
    for (const id of seed.profile.trackedIndicators) {
      for (const r of computeIndicatorRuns(astronautId, indicator(id), seed.readings, prototypeRules, evaluationDay)) {
        out[`${id}:${r.measure}`] = r.run;
      }
    }
    return out;
  };

  it('astro-1 at day 30: sleep run of 5 (below, since day 26) and heart rate run of 4 (above, since day 27), both sustained', () => {
    const runs = runsFor('astro-1');
    expect(runs['sleep:value']).toEqual({ length: 5, direction: 'below', startDay: 26, isSustained: true });
    expect(runs['heart-rate:value']).toEqual({ length: 4, direction: 'above', startDay: 27, isSustained: true });
    for (const [key, run] of Object.entries(runs)) {
      if (key !== 'sleep:value' && key !== 'heart-rate:value') expect(run).toEqual(NO_RUN);
    }
  });

  it('astro-1 earlier in the story: sleep is 3 and sustained on day 28, 1 on day 26', () => {
    expect(runsFor('astro-1', 26)['sleep:value']).toMatchObject({ length: 1, isSustained: false });
    expect(runsFor('astro-1', 28)['sleep:value']).toMatchObject({ length: 3, startDay: 26, isSustained: true });
    expect(runsFor('astro-1', 28)['heart-rate:value']).toMatchObject({ length: 2, startDay: 27, isSustained: false });
  });

  it('astro-2 (steady) has no runs', () => {
    for (const run of Object.values(runsFor('astro-2'))) expect(run).toEqual(NO_RUN);
  });

  it('astro-3 heart rate: the gap on day 28 ends the run', () => {
    expect(runsFor('astro-3', 27)['heart-rate:value']).toEqual({ length: 4, direction: 'above', startDay: 24, isSustained: true });
    // Day 28 has no reading and is the evaluation day: pending, so the run is counted through day 27.
    expect(runsFor('astro-3', 28)['heart-rate:value']).toEqual({ length: 4, direction: 'above', startDay: 24, isSustained: true });
    // On day 29 the missing day 28 is a past gap, so counting restarts.
    expect(runsFor('astro-3', 29)['heart-rate:value']).toEqual({ length: 1, direction: 'above', startDay: 29, isSustained: false });
    expect(runsFor('astro-3', 30)['heart-rate:value']).toEqual({ length: 2, direction: 'above', startDay: 29, isSustained: false });
  });

  it('astro-3: only heart rate has a run on day 30', () => {
    const runs = runsFor('astro-3');
    for (const [key, run] of Object.entries(runs)) if (key !== 'heart-rate:value') expect(run).toEqual(NO_RUN);
  });

  it('astro-4: glucose is still building, so it has no run', () => {
    expect(runsFor('astro-4')['blood-glucose:value']).toEqual(NO_RUN);
  });

  it('timing: astro-3 on day 28 has today pending, and astro-4 glucose has a reading today', () => {
    const a3 = getSeed('astro-3');
    expect(computeReadingTiming('astro-3', indicator('heart-rate'), a3.readings, 28)).toEqual({ todayPending: true, daysSinceLatestReading: 1 });
    const a4 = getSeed('astro-4');
    expect(computeReadingTiming('astro-4', indicator('blood-glucose'), a4.readings, 30)).toEqual({ todayPending: false, daysSinceLatestReading: 0 });
  });
});

/* -------------------------------------------------------------------------- */
/* Decision 1: missingDays                                                    */
/* -------------------------------------------------------------------------- */

describe('Decision 1: missing days', () => {
  const missingOf = (readings: HealthReading[], day: number) => computeMissingDays(ID, fixtureIndicator, readings, day);

  it('counts days with no reading after the first reading, up to the evaluation day', () => {
    // Readings on days 1 to 5 and 7 to 10: only day 6 is missing.
    const readings = [...baselineReadings.slice(0, 5), ...normals(7, 10)];
    expect(missingOf(readings, 10)).toEqual([6]);
  });

  it('does not count days before the indicator has its first reading', () => {
    const readings = [...normals(20, 24), ...normals(26, 30)];
    expect(missingOf(readings, 30)).toEqual([25]); // days 1 to 19 are not missing
  });

  it('is empty when the indicator has no readings at all', () => {
    expect(missingOf([], 30)).toEqual([]);
  });

  it('is empty when the first reading is after the evaluation day', () => {
    expect(missingOf(normals(20, 25), 10)).toEqual([]);
  });

  it("includes today's pending day", () => {
    expect(missingOf(normals(1, 9), 10)).toEqual([10]);
    // A past gap and a pending today are both listed, oldest first.
    expect(missingOf([reading(1, NORM), reading(2, NORM), reading(4, NORM)], 5)).toEqual([3, 5]);
  });

  it('is empty when today has a reading and nothing was skipped', () => {
    expect(missingOf(normals(1, 10), 10)).toEqual([]);
  });

  it('a first reading made today has no missing days', () => {
    expect(missingOf([reading(10, NORM)], 10)).toEqual([]);
  });

  it('ignores readings after the evaluation day', () => {
    const readings = [...normals(1, 5), reading(8, NORM)];
    expect(missingOf(readings, 6)).toEqual([6]); // day 8 is in the future, so it fills nothing
  });

  it('is a separate field from daysSinceLatestReading', () => {
    const readings = [...normals(1, 5)];
    expect(missingOf(readings, 8)).toEqual([6, 7, 8]);
    expect(computeReadingTiming(ID, fixtureIndicator, readings, 8)).toEqual({ todayPending: true, daysSinceLatestReading: 3 });
  });

  it('blood pressure: a day with no blood pressure reading is one missing day', () => {
    const bp = indicator('blood-pressure');
    const bpDay = (d: number): HealthReading => ({
      astronautId: 'bp-test', indicatorId: 'blood-pressure', missionDay: d, origin: 'seeded', systolic: 120, diastolic: 80,
    });
    const readings = [1, 2, 3, 4, 6].map(bpDay);
    expect(computeMissingDays('bp-test', bp, readings, 6)).toEqual([5]);
  });

  it('seeded crew: astro-3 is missing days 3 and 28, astro-4 glucose has none, others have none', () => {
    const a3 = getSeed('astro-3');
    const a4 = getSeed('astro-4');
    expect(computeMissingDays('astro-3', indicator('heart-rate'), a3.readings, 30)).toEqual([3, 28]);
    expect(computeMissingDays('astro-3', indicator('heart-rate'), a3.readings, 27)).toEqual([3]);
    // Day 28 is the evaluation day with no reading: it is pending and still listed.
    expect(computeMissingDays('astro-3', indicator('heart-rate'), a3.readings, 28)).toEqual([3, 28]);
    expect(computeMissingDays('astro-4', indicator('blood-glucose'), a4.readings, 30)).toEqual([]);
    expect(computeMissingDays('astro-4', indicator('blood-glucose'), a4.readings, 29)).toEqual([]);
    for (const id of ['astro-1', 'astro-2']) {
      const seed = getSeed(id);
      for (const ind of seed.profile.trackedIndicators) {
        expect(computeMissingDays(id, indicator(ind), seed.readings, 30)).toEqual([]);
      }
    }
  });
});

/* -------------------------------------------------------------------------- */
/* Decision 2: baseline position and persistence are independent              */
/* -------------------------------------------------------------------------- */

describe('Decision 2: position and run are independent', () => {
  const positionOn = (readings: HealthReading[], day: number) =>
    computeMeasurePosition(ID, fixtureIndicator, 'value', readings, prototypeRules, day);

  it('position uses an old latest reading while the run stops at the past gap', () => {
    // Deviating on days 27 and 28, then no reading on day 29 (past gap) and none on day 30 (pending).
    const readings = [...normals(8, 26), reading(27, LOW), reading(28, LOW)];
    expect(positionOn(readings, 30).position).toBe('below-baseline'); // latest reading is day 28
    expect(positionOn(readings, 30).latest).toMatchObject({ missionDay: 28 });
    expect(runOn(readings, 30).run).toEqual(NO_RUN); // day 29 is a past missing day
  });

  it('position uses only the latest reading while the run restarts after a gap', () => {
    // A long deviation, a gap on day 29, then a deviating reading on day 30.
    const readings = [...normals(8, 24), reading(25, LOW), reading(26, LOW), reading(27, LOW), reading(28, LOW), reading(30, LOW)];
    expect(positionOn(readings, 30).position).toBe('below-baseline');
    expect(runOn(readings, 30).run).toEqual({ length: 1, direction: 'below', startDay: 30, isSustained: false });
  });

  it('the two can disagree in the other direction too: a normal old reading and no run', () => {
    const readings = [...normals(8, 20)];
    expect(positionOn(readings, 30).position).toBe('within-baseline');
    expect(runOn(readings, 30).run).toEqual(NO_RUN);
  });

  it('seeded astro-3 on day 29: position is above baseline and the run is only 1 day', () => {
    const a3 = getSeed('astro-3');
    const ind = indicator('heart-rate');
    expect(computeMeasurePosition('astro-3', ind, 'value', a3.readings, prototypeRules, 29).position).toBe('above-baseline');
    expect(computeDeviationRun('astro-3', ind, 'value', a3.readings, prototypeRules, 29).run.length).toBe(1);
  });
});

/* -------------------------------------------------------------------------- */
/* Decision 3: strict astronaut separation everywhere                         */
/* -------------------------------------------------------------------------- */

describe('Decision 3: every logic function rejects foreign readings, even on future days', () => {
  // The foreign reading is on day 25, after the evaluation day (10), so it would be filtered out
  // by day if the check ran too late.
  const foreignFuture: HealthReading = { ...reading(25, LOW), astronautId: 'someone-else' };
  const mixed = [...withDays([[8, NORM]]), foreignFuture];
  const sleep = fixtureIndicator;

  const cases: Array<[string, () => unknown]> = [
    ['computeBaseline', () => computeBaseline(ID, sleep, 'value', mixed, prototypeRules)],
    ['evaluateMeasureReadings', () => evaluateMeasureReadings(ID, sleep, 'value', mixed, prototypeRules)],
    ['computeMeasurePosition', () => computeMeasurePosition(ID, sleep, 'value', mixed, prototypeRules, 10)],
    ['computeIndicatorPositions', () => computeIndicatorPositions(ID, sleep, mixed, prototypeRules, 10)],
    ['computeDeviationRun', () => computeDeviationRun(ID, sleep, 'value', mixed, prototypeRules, 10)],
    ['computeIndicatorRuns', () => computeIndicatorRuns(ID, sleep, mixed, prototypeRules, 10)],
    ['computeReadingTiming', () => computeReadingTiming(ID, sleep, mixed, 10)],
    ['computeMissingDays', () => computeMissingDays(ID, sleep, mixed, 10)],
  ];

  for (const [name, call] of cases) {
    it(name + ' throws', () => {
      expect(call).toThrow(/mixed/);
    });
  }

  it('also rejects a foreign reading of a different indicator', () => {
    const foreignOther: HealthReading = { astronautId: 'someone-else', indicatorId: 'mood', missionDay: 3, origin: 'seeded', value: 3 };
    expect(() => computeMeasurePosition(ID, sleep, 'value', [...baselineReadings, foreignOther], prototypeRules, 10)).toThrow(/mixed/);
  });

  it('accepts a clean list, so the check does not reject valid data', () => {
    expect(() => computeMeasurePosition(ID, sleep, 'value', withDays([[8, NORM]]), prototypeRules, 10)).not.toThrow();
  });

  it("the old gap is closed: astro-1's readings are rejected for astro-2 even on a future day", () => {
    const foreign = getSeed('astro-1').readings;
    expect(() =>
      computeMeasurePosition('astro-2', indicator('heart-rate'), 'value', foreign, prototypeRules, 1),
    ).toThrow(/mixed/);
  });
});