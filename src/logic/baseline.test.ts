import { describe, expect, it } from 'vitest';
import { indicators } from '../data/indicators';
import { prototypeRules } from '../data/prototypeRules';
import { getSeed } from '../data/seedCrew';
import type { HealthIndicator, HealthReading, PersonalBaseline, ReadyBaseline } from '../shared/types';
import { computeBaseline, median, medianAbsoluteDeviation } from './baseline';

/* -------------------------------------------------------------------------- */
/* Neutral test fixture (requirements section 12: "not medical data").        */
/* The indicator below is only a test dummy. Its spread floor (0.05) is small */
/* enough that the spread in the fixture decides the result, as the           */
/* acceptance tests assume.                                                   */
/* -------------------------------------------------------------------------- */

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

function reading(missionDay: number, value: number, origin: 'seeded' | 'entered' = 'seeded'): HealthReading {
  return { astronautId: ID, indicatorId: 'sleep', missionDay, value, origin };
}

/** Builds readings from [day, value] pairs. */
function readingsFrom(pairs: Array<[number, number]>): HealthReading[] {
  return pairs.map(([day, value]) => reading(day, value));
}

function baselineOf(readings: HealthReading[]): PersonalBaseline {
  return computeBaseline(ID, fixtureIndicator, 'value', readings, prototypeRules);
}

function expectReady(b: PersonalBaseline): ReadyBaseline {
  expect(b.state).toBe('ready');
  if (b.state !== 'ready') throw new Error('Baseline is not ready');
  return b;
}

// Requirements AT-BASE-02 fixture: first 7 readings.
const FIXTURE_VALUES = [6.8, 7.0, 7.1, 7.0, 6.9, 7.2, 7.0];
const fixtureReadings = readingsFrom(FIXTURE_VALUES.map((v, i) => [i + 1, v]));

/* -------------------------------------------------------------------------- */

describe('median and MAD', () => {
  it('finds the middle value, for odd and even counts', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([5])).toBe(5);
  });

  it('does not change the list it is given', () => {
    const list = [3, 1, 2];
    median(list);
    expect(list).toEqual([3, 1, 2]);
  });

  it('throws on an empty list', () => {
    expect(() => median([])).toThrow();
  });

  it('calculates the median absolute deviation', () => {
    // Distances from the median (7.0) are 0.2, 0, 0.1, 0, 0.1, 0.2, 0. Their median is 0.1.
    expect(medianAbsoluteDeviation(FIXTURE_VALUES)).toBeCloseTo(0.1, 10);
    // One extreme value barely changes the MAD.
    expect(medianAbsoluteDeviation([1, 2, 3, 4, 100])).toBe(1);
  });
});

describe('AT-BASE-01: building baseline', () => {
  it('shows "3 of 7 days" with no centre, spread or band', () => {
    const b = baselineOf(readingsFrom([[1, 7.0], [2, 7.1], [3, 6.9]]));
    expect(b).toMatchObject({ state: 'building', daysCounted: 3, daysRequired: 7 });
    expect(b).not.toHaveProperty('centre');
    expect(b).not.toHaveProperty('bandLow');
    expect(b).not.toHaveProperty('bandHigh');
  });

  it('is building with no readings at all, and with 6 of 7 days', () => {
    expect(baselineOf([])).toMatchObject({ state: 'building', daysCounted: 0 });
    const six = readingsFrom(FIXTURE_VALUES.slice(0, 6).map((v, i) => [i + 1, v]));
    expect(baselineOf(six)).toMatchObject({ state: 'building', daysCounted: 6 });
  });

  it('becomes ready on the 7th day with a reading', () => {
    expect(baselineOf(fixtureReadings).state).toBe('ready');
  });
});

describe('AT-BASE-02: centre, spread and band', () => {
  it('gives centre 7.0, spread 0.1 and band 6.7 to 7.3', () => {
    const b = expectReady(baselineOf(fixtureReadings));
    expect(b.centre).toBe(7.0);
    expect(b.spread).toBe(0.1);
    expect(b.bandLow).toBe(6.7);
    expect(b.bandHigh).toBe(7.3);
    expect(b.daysCounted).toBe(7);
    expect(b.daysRequired).toBe(7);
    expect(b.windowDays).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('puts 5.9 outside the band (below) and 7.2 inside it', () => {
    // Deviation detection is a later task. Here we only check where the values sit against the band edges.
    const b = expectReady(baselineOf(fixtureReadings));
    expect(5.9).toBeLessThan(b.bandLow);
    expect(7.2).toBeGreaterThan(b.bandLow);
    expect(7.2).toBeLessThan(b.bandHigh);
  });

  it('raises the spread to the spread floor when the readings are very similar', () => {
    const same = readingsFrom([1, 2, 3, 4, 5, 6, 7].map((d) => [d, 7.0]));
    const b = expectReady(baselineOf(same));
    expect(medianAbsoluteDeviation([7, 7, 7, 7, 7, 7, 7])).toBe(0);
    expect(b.spread).toBe(0.05); // the floor, not 0
    expect(b.bandLow).toBe(6.85);
    expect(b.bandHigh).toBe(7.15);
  });

  it('uses the spread when it is larger than the floor', () => {
    const b = expectReady(baselineOf(fixtureReadings));
    expect(b.spread).toBeGreaterThan(0.05);
  });
});

describe('AT-BASE-03: missing day and frozen baseline', () => {
  // Same fixture, but day 3 has no reading and the 7th reading is on day 8.
  const withGap = readingsFrom([[1, 6.8], [2, 7.0], [4, 7.1], [5, 7.0], [6, 6.9], [7, 7.2], [8, 7.0]]);

  it('still counts 6 days on day 7, so the baseline is building', () => {
    const upToDay7 = withGap.filter((r) => r.missionDay <= 7);
    expect(baselineOf(upToDay7)).toMatchObject({ state: 'building', daysCounted: 6 });
  });

  it('completes on day 8, using the first 7 days that have readings', () => {
    const b = expectReady(baselineOf(withGap));
    expect(b.windowDays).toEqual([1, 2, 4, 5, 6, 7, 8]);
    expect(b.centre).toBe(7.0);
  });

  it('does not change when later readings arrive (frozen)', () => {
    const before = expectReady(baselineOf(withGap));
    const later = [...withGap, ...readingsFrom([[9, 3.0], [10, 2.5], [11, 2.0], [12, 9.9]])];
    const after = expectReady(baselineOf(later));
    expect(after).toEqual(before);
  });
});

describe('AT-BASE-04: recalculated from stored readings', () => {
  it('changes when a reading inside the window is replaced', () => {
    const before = expectReady(baselineOf(fixtureReadings));
    // The user replaces day 6 (7.2) with an entered value of 7.0.
    // The values become 6.8 7.0 7.1 7.0 6.9 7.0 7.0, so the typical wobble (MAD) drops to 0
    // and the spread falls back to the floor (0.05).
    const replaced = [...fixtureReadings, reading(6, 7.0, 'entered')];
    const after = expectReady(baselineOf(replaced));
    expect(after.windowDays).toEqual(before.windowDays);
    expect(before.spread).toBe(0.1);
    expect(after.spread).toBe(0.05);
    expect(after.bandLow).toBe(6.85);
    expect(after.bandHigh).toBe(7.15);
  });

  it('changes when a missing day inside the window is filled in', () => {
    const withGap = readingsFrom([[1, 6.8], [2, 7.0], [4, 7.1], [5, 7.0], [6, 6.9], [7, 7.2], [8, 7.0]]);
    const filled = [...withGap, reading(3, 7.4)];
    const after = expectReady(baselineOf(filled));
    expect(after.windowDays).toEqual([1, 2, 3, 4, 5, 6, 7]); // day 8 drops out of the window
  });

  it('is not stored: the same readings always give the same result', () => {
    expect(baselineOf(fixtureReadings)).toEqual(baselineOf([...fixtureReadings]));
  });

  it('lets an entered reading win over a seeded one on the same day', () => {
    const withEntered = [...fixtureReadings, reading(6, 7.0, 'entered')];
    const reversed = [reading(6, 7.0, 'entered'), ...fixtureReadings];
    expect(baselineOf(withEntered)).toEqual(baselineOf(reversed));
    // The entered 7.0 is used, not the seeded 7.2 (which would give spread 0.1).
    expect(expectReady(baselineOf(withEntered)).spread).toBe(0.05);
  });
});

describe('safety checks', () => {
  it('throws if a reading belongs to another astronaut', () => {
    const mixed = [...fixtureReadings, { ...reading(8, 7.0), astronautId: 'someone-else' }];
    expect(() => baselineOf(mixed)).toThrow(/mixed/);
  });

  it('ignores readings of other indicators', () => {
    const other: HealthReading = { astronautId: ID, indicatorId: 'mood', missionDay: 1, origin: 'seeded', value: 3 };
    expect(baselineOf([...fixtureReadings, other])).toEqual(baselineOf(fixtureReadings));
  });

  it('throws if the indicator does not have the requested measure', () => {
    expect(() => computeBaseline(ID, fixtureIndicator, 'systolic', [], prototypeRules)).toThrow();
  });
});

describe('with the seeded crew', () => {
  const indicator = (id: string) => indicators.find((i) => i.id === id) as HealthIndicator;

  it('astro-1 baselines match the hand-written mock numbers', () => {
    const seed = getSeed('astro-1');
    const expected: Array<[string, 'value' | 'systolic' | 'diastolic', number, number, number, number]> = [
      // indicator, measure, centre, spread, bandLow, bandHigh
      ['heart-rate', 'value', 65, 2, 59, 71],
      ['sleep', 'value', 7.3, 0.3, 6.4, 8.2],
      ['body-temperature', 'value', 36.6, 0.2, 36, 37.2],
      ['mood', 'value', 4, 0.5, 2.5, 5.5],
      ['blood-pressure', 'systolic', 120, 3, 111, 129],
      ['blood-pressure', 'diastolic', 79, 2, 73, 85],
    ];
    for (const [id, measure, centre, spread, low, high] of expected) {
      const b = expectReady(computeBaseline('astro-1', indicator(id), measure, seed.readings, prototypeRules));
      expect([b.centre, b.spread, b.bandLow, b.bandHigh]).toEqual([centre, spread, low, high]);
    }
  });

  it('blood pressure has a separate baseline for each of its two numbers', () => {
    const seed = getSeed('astro-1');
    const sys = computeBaseline('astro-1', indicator('blood-pressure'), 'systolic', seed.readings, prototypeRules);
    const dia = computeBaseline('astro-1', indicator('blood-pressure'), 'diastolic', seed.readings, prototypeRules);
    expect(sys.measure).toBe('systolic');
    expect(dia.measure).toBe('diastolic');
    expect(expectReady(sys).centre).not.toBe(expectReady(dia).centre);
  });

  it('astro-3 skips the missing day 3 when building its window', () => {
    const seed = getSeed('astro-3');
    const b = expectReady(computeBaseline('astro-3', indicator('heart-rate'), 'value', seed.readings, prototypeRules));
    expect(b.windowDays).toEqual([1, 2, 4, 5, 6, 7, 8]);
  });

  it('astro-4 glucose is still building with 3 of 7 days', () => {
    const seed = getSeed('astro-4');
    const b = computeBaseline('astro-4', indicator('blood-glucose'), 'value', seed.readings, prototypeRules);
    expect(b).toMatchObject({ state: 'building', daysCounted: 3, daysRequired: 7 });
  });

  it('the baselines of two astronauts are independent', () => {
    const a1 = expectReady(computeBaseline('astro-1', indicator('heart-rate'), 'value', getSeed('astro-1').readings, prototypeRules));
    const a2 = expectReady(computeBaseline('astro-2', indicator('heart-rate'), 'value', getSeed('astro-2').readings, prototypeRules));
    expect(a1.centre).not.toBe(a2.centre);
    // Giving astro-2's logic the readings of astro-1 is rejected, not silently accepted.
    expect(() => computeBaseline('astro-2', indicator('heart-rate'), 'value', getSeed('astro-1').readings, prototypeRules)).toThrow();
  });
});
