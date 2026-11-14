import { describe, expect, it } from 'vitest';
import { indicators } from '../data/indicators';
import { mockSnapshot } from '../data/mockSnapshot';
import { prototypeRules } from '../data/prototypeRules';
import { getSeed } from '../data/seedCrew';
import type { BaselinePosition, HealthIndicator, HealthReading, ReadyBaseline } from '../shared/types';
import { computeBaseline } from './baseline';
import {
  computeIndicatorPositions,
  computeMeasurePosition,
  deviationScore,
  evaluateMeasureReadings,
  evaluateReading,
} from './deviation';

/* Neutral fixture, same as in baseline.test.ts (requirements section 12: "not medical data"). */

const ID = 'astro-test';

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

// AT-BASE-02 fixture: first 7 readings. Centre 7.0, spread 0.1, band 6.7 to 7.3.
const FIXTURE_VALUES = [6.8, 7.0, 7.1, 7.0, 6.9, 7.2, 7.0];
const fixtureReadings = FIXTURE_VALUES.map((v, i) => reading(i + 1, v));

const fixtureBaseline = computeBaseline(ID, fixtureIndicator, 'value', fixtureReadings, prototypeRules) as ReadyBaseline;

/** Position of the fixture after adding one more reading on day 8. */
function positionAfter(value: number): BaselinePosition {
  const readings = [...fixtureReadings, reading(8, value)];
  return computeMeasurePosition(ID, fixtureIndicator, 'value', readings, prototypeRules, 8).position;
}

const indicator = (id: string) => indicators.find((i) => i.id === id) as HealthIndicator;

/* -------------------------------------------------------------------------- */

describe('deviation score (section 8.2 rule 2)', () => {
  it('is the distance from the centre divided by the spread', () => {
    expect(fixtureBaseline.centre).toBe(7.0);
    expect(fixtureBaseline.spread).toBe(0.1);
    expect(deviationScore(5.9, fixtureBaseline)).toBe(11);
    expect(deviationScore(7.2, fixtureBaseline)).toBe(2);
    expect(deviationScore(7.0, fixtureBaseline)).toBe(0);
  });

  it('is never negative, whichever side the value is on', () => {
    expect(deviationScore(8.1, fixtureBaseline)).toBe(11);
    expect(deviationScore(5.9, fixtureBaseline)).toBe(11);
  });

  it('is not thrown off by decimal noise at the band edge', () => {
    // In a computer, (7.0 - 6.7) / 0.1 is 2.999999999999998. The score must still be exactly 3.
    expect(deviationScore(6.7, fixtureBaseline)).toBe(3);
    expect(deviationScore(7.3, fixtureBaseline)).toBe(3);
  });
});

describe('AT-BASE-02: deviation of a reading (the second half)', () => {
  it('a reading of 5.9 on day 8 deviates below', () => {
    const r = evaluateReading(8, 5.9, fixtureBaseline, prototypeRules);
    expect(r).toMatchObject({ checked: true, deviates: true, direction: 'below', score: 11 });
  });

  it('a reading of 7.2 on day 8 does not deviate', () => {
    const r = evaluateReading(8, 7.2, fixtureBaseline, prototypeRules);
    expect(r).toMatchObject({ checked: true, deviates: false, direction: null, score: 2 });
  });

  it('deviates when the score is exactly K (3) and not when it is just under', () => {
    expect(evaluateReading(8, 6.7, fixtureBaseline, prototypeRules).deviates).toBe(true);
    expect(evaluateReading(8, 7.3, fixtureBaseline, prototypeRules).deviates).toBe(true);
    expect(evaluateReading(8, 6.71, fixtureBaseline, prototypeRules).deviates).toBe(false);
    expect(evaluateReading(8, 7.29, fixtureBaseline, prototypeRules).deviates).toBe(false);
  });

  it('a high reading deviates above', () => {
    expect(evaluateReading(8, 8.1, fixtureBaseline, prototypeRules)).toMatchObject({ deviates: true, direction: 'above' });
  });
});

describe('readings that are never flagged (section 8.2 rule 1)', () => {
  it('readings inside the baseline window are not checked, even an extreme one', () => {
    const withOutlier = fixtureReadings.map((r) => (r.missionDay === 3 ? reading(3, 9.5) : r));
    const { baseline, days } = evaluateMeasureReadings(ID, fixtureIndicator, 'value', withOutlier, prototypeRules);
    expect(baseline.state).toBe('ready');
    expect(days.slice(0, 7).every((d) => !d.checked && !d.deviates && d.score === null && d.direction === null)).toBe(true);
  });

  it('while the baseline is building nothing is checked and nothing deviates', () => {
    const three = [reading(1, 7.0), reading(2, 7.1), reading(3, 1.0)]; // day 3 is extreme on purpose
    const { baseline, days } = evaluateMeasureReadings(ID, fixtureIndicator, 'value', three, prototypeRules);
    expect(baseline.state).toBe('building');
    for (const d of days) expect(d).toMatchObject({ checked: false, score: null, deviates: false, direction: null });
  });

  it('a building baseline gives a direct "not checked" result for any value', () => {
    const building = computeBaseline(ID, fixtureIndicator, 'value', [reading(1, 7)], prototypeRules);
    expect(evaluateReading(2, 100, building, prototypeRules)).toMatchObject({ checked: false, deviates: false });
  });

  it('the first day after the window is checked', () => {
    const { days } = evaluateMeasureReadings(ID, fixtureIndicator, 'value', [...fixtureReadings, reading(8, 5.9)], prototypeRules);
    expect(days[7]).toMatchObject({ missionDay: 8, checked: true, deviates: true });
  });

  it('with a missing day, the window still ends on the 7th day that has a reading', () => {
    // Day 3 is missing, so the window is days 1, 2, 4, 5, 6, 7, 8. Day 8 is inside it, day 9 is the first checked.
    const readings = [1, 2, 4, 5, 6, 7, 8].map((d, i) => reading(d, FIXTURE_VALUES[i]));
    readings.push(reading(9, 5.9));
    const { days } = evaluateMeasureReadings(ID, fixtureIndicator, 'value', readings, prototypeRules);
    expect(days.map((d) => d.checked)).toEqual([false, false, false, false, false, false, false, true]);
    expect(days[7]).toMatchObject({ missionDay: 9, deviates: true, direction: 'below' });
  });
});

describe('AT-TREND-01: baseline position', () => {
  it('5.9 is below baseline, 7.2 is within baseline, 8.1 is above baseline', () => {
    expect(positionAfter(5.9)).toBe('below-baseline');
    expect(positionAfter(7.2)).toBe('within-baseline');
    expect(positionAfter(8.1)).toBe('above-baseline');
  });

  it('an indicator whose baseline is building shows not-enough-data', () => {
    const building = [reading(1, 7.0), reading(2, 7.1), reading(3, 1.0)];
    const p = computeMeasurePosition(ID, fixtureIndicator, 'value', building, prototypeRules, 3);
    expect(p.position).toBe('not-enough-data');
    expect(p.baseline.state).toBe('building');
  });

  it('only ever uses the four position names, with no rising or falling label', () => {
    const allowed: BaselinePosition[] = ['above-baseline', 'within-baseline', 'below-baseline', 'not-enough-data'];
    for (const v of [5.9, 7.0, 7.2, 8.1]) expect(allowed).toContain(positionAfter(v));
  });

  it('a latest reading inside the baseline window counts as within baseline', () => {
    const p = computeMeasurePosition(ID, fixtureIndicator, 'value', fixtureReadings, prototypeRules, 7);
    expect(p.position).toBe('within-baseline');
    expect(p.latest).toMatchObject({ missionDay: 7, checked: false });
  });
});

describe('missing readings (section 8.3 rule 2)', () => {
  it('no readings at all gives not-enough-data and no latest reading', () => {
    const p = computeMeasurePosition(ID, fixtureIndicator, 'value', [], prototypeRules, 30);
    expect(p).toMatchObject({ position: 'not-enough-data', latest: null });
  });

  it('uses the most recent reading even when it is older than the evaluation day', () => {
    const readings = [...fixtureReadings, reading(8, 5.9)];
    const p = computeMeasurePosition(ID, fixtureIndicator, 'value', readings, prototypeRules, 10);
    expect(p.latest).toMatchObject({ missionDay: 8, value: 5.9 });
    expect(p.position).toBe('below-baseline');
  });

  it('ignores readings after the evaluation day', () => {
    const readings = [...fixtureReadings, reading(8, 7.1), reading(9, 5.9)];
    const p = computeMeasurePosition(ID, fixtureIndicator, 'value', readings, prototypeRules, 8);
    expect(p.latest).toMatchObject({ missionDay: 8 });
    expect(p.position).toBe('within-baseline');
  });

  it('does not fill gaps: a missing day is simply absent from the list', () => {
    const readings = [...fixtureReadings, reading(8, 7.1), reading(10, 5.9)];
    const { days } = evaluateMeasureReadings(ID, fixtureIndicator, 'value', readings, prototypeRules);
    expect(days.map((d) => d.missionDay)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 10]);
  });
});

describe('blood pressure: systolic and diastolic are separate', () => {
  const bp = indicator('blood-pressure');
  const ASTRO = 'bp-test';

  function bpReading(day: number, systolic: number, diastolic: number): HealthReading {
    return { astronautId: ASTRO, indicatorId: 'blood-pressure', missionDay: day, origin: 'seeded', systolic, diastolic };
  }

  // Baseline days 1 to 7: systolic around 120 (spread floor 3), diastolic around 80 (spread floor 2).
  const base = [
    bpReading(1, 120, 80), bpReading(2, 121, 79), bpReading(3, 119, 81), bpReading(4, 120, 80),
    bpReading(5, 121, 80), bpReading(6, 119, 79), bpReading(7, 120, 81),
  ];

  it('returns two positions, one for each number', () => {
    const result = computeIndicatorPositions(ASTRO, bp, base, prototypeRules, 7);
    expect(result.map((p) => p.measure)).toEqual(['systolic', 'diastolic']);
    expect(result.every((p) => p.baseline.state === 'ready')).toBe(true);
  });

  it('systolic can be above baseline while diastolic stays within', () => {
    const readings = [...base, bpReading(8, 135, 80)]; // systolic: 15 / 3 = 5. diastolic unchanged.
    const [sys, dia] = computeIndicatorPositions(ASTRO, bp, readings, prototypeRules, 8);
    expect(sys.position).toBe('above-baseline');
    expect(sys.latest).toMatchObject({ value: 135, direction: 'above', deviates: true });
    expect(dia.position).toBe('within-baseline');
    expect(dia.latest).toMatchObject({ value: 80, deviates: false });
  });

  it('diastolic can be below baseline while systolic stays within', () => {
    const readings = [...base, bpReading(8, 120, 70)]; // diastolic: 10 / 2 = 5.
    const [sys, dia] = computeIndicatorPositions(ASTRO, bp, readings, prototypeRules, 8);
    expect(sys.position).toBe('within-baseline');
    expect(dia.position).toBe('below-baseline');
  });

  it('a single-number indicator returns one position', () => {
    const result = computeIndicatorPositions(ID, fixtureIndicator, fixtureReadings, prototypeRules, 7);
    expect(result).toHaveLength(1);
    expect(result[0].measure).toBe('value');
  });

  it('asking a blood pressure indicator for the measure "value" throws', () => {
    expect(() => computeMeasurePosition(ASTRO, bp, 'value', base, prototypeRules, 7)).toThrow();
  });
});

describe('separation between astronauts', () => {
  it('throws if the readings belong to another astronaut', () => {
    expect(() =>
      computeMeasurePosition('astro-2', indicator('heart-rate'), 'value', getSeed('astro-1').readings, prototypeRules, 30),
    ).toThrow(/mixed/);
  });
});

describe('with the seeded crew at day 30', () => {
  /** Returns "indicator:measure" -> position for one astronaut. */
  function positionsFor(astronautId: string): Record<string, BaselinePosition> {
    const seed = getSeed(astronautId);
    const out: Record<string, BaselinePosition> = {};
    for (const id of seed.profile.trackedIndicators) {
      const def = indicator(id);
      for (const p of computeIndicatorPositions(astronautId, def, seed.readings, prototypeRules, seed.profile.currentMissionDay)) {
        out[`${id}:${p.measure}`] = p.position;
      }
    }
    return out;
  }

  it('astro-1: sleep is below baseline, heart rate is above, everything else is within', () => {
    expect(positionsFor('astro-1')).toEqual({
      'heart-rate:value': 'above-baseline',
      'blood-pressure:systolic': 'within-baseline',
      'blood-pressure:diastolic': 'within-baseline',
      'body-temperature:value': 'within-baseline',
      'sleep:value': 'below-baseline',
      'mood:value': 'within-baseline',
    });
  });

  it('astro-1 matches the positions in the hand-written mock snapshot', () => {
    const computed = positionsFor('astro-1');
    for (const st of mockSnapshot.statuses) {
      for (const m of st.measures) expect(computed[`${st.indicatorId}:${m.measure}`]).toBe(m.position);
    }
  });

  it('astro-2 (steady): every position is within baseline', () => {
    const all = Object.values(positionsFor('astro-2'));
    expect(all.length).toBeGreaterThan(0);
    expect(all.every((p) => p === 'within-baseline')).toBe(true);
  });

  it('astro-3: heart rate is above baseline on day 30, the rest within', () => {
    const p = positionsFor('astro-3');
    expect(p['heart-rate:value']).toBe('above-baseline');
    expect(Object.entries(p).filter(([k]) => k !== 'heart-rate:value').every(([, v]) => v === 'within-baseline')).toBe(true);
  });

  it('astro-4: glucose has not-enough-data, the rest within baseline', () => {
    const p = positionsFor('astro-4');
    expect(p['blood-glucose:value']).toBe('not-enough-data');
    expect(Object.entries(p).filter(([k]) => k !== 'blood-glucose:value').every(([, v]) => v === 'within-baseline')).toBe(true);
  });

  it('astro-1 deviating days match the seed design (sleep days 26 to 30, heart rate days 27 to 30)', () => {
    const seed = getSeed('astro-1');
    const deviatingDays = (id: string) =>
      evaluateMeasureReadings('astro-1', indicator(id), 'value', seed.readings, prototypeRules)
        .days.filter((d) => d.deviates)
        .map((d) => d.missionDay);
    expect(deviatingDays('sleep')).toEqual([26, 27, 28, 29, 30]);
    expect(deviatingDays('heart-rate')).toEqual([27, 28, 29, 30]);
  });
});
