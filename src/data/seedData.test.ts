import { describe, expect, it } from 'vitest';
import type { AstronautSeed, HealthReading, IndicatorId, MeasureKey } from '../shared/types';
import { alertLegend } from './alertLegend';
import { indicators } from './indicators';
import { mockSnapshot } from './mockSnapshot';
import { prototypeRules } from './prototypeRules';
import { seedCrew } from './seedCrew';
import { buildBloodPressure, buildReadings } from './seedHelpers';
import { sources } from './sources';
import { symptomDefinitions } from './symptoms';

/* -------------------------------------------------------------------------- */
/* A tiny calculation used ONLY to check the seed data.                       */
/* It is separate from src/logic on purpose, so the data and the real logic   */
/* are checked against each other later.                                      */
/* -------------------------------------------------------------------------- */

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function valueOf(reading: HealthReading, measure: MeasureKey): number {
  if (reading.indicatorId === 'blood-pressure') {
    return measure === 'systolic' ? reading.systolic : reading.diastolic;
  }
  return reading.value;
}

/** Map of mission day to value for one measure of one indicator. */
function series(seed: AstronautSeed, indicatorId: IndicatorId, measure: MeasureKey): Map<number, number> {
  const map = new Map<number, number>();
  for (const r of seed.readings) {
    if (r.indicatorId === indicatorId) map.set(r.missionDay, valueOf(r, measure));
  }
  return map;
}

function floorFor(indicatorId: IndicatorId, measure: MeasureKey): number {
  const indicator = indicators.find((i) => i.id === indicatorId);
  const def = indicator?.measures.find((m) => m.key === measure);
  if (!def) throw new Error(`No definition for ${indicatorId} ${measure}`);
  return def.spreadFloor;
}

/** Returns the deviating days (day and direction) after the baseline window, or null if the baseline is still building. */
function deviatingDays(seed: AstronautSeed, indicatorId: IndicatorId, measure: MeasureKey) {
  const map = series(seed, indicatorId, measure);
  const days = [...map.keys()].sort((a, b) => a - b);
  if (days.length < prototypeRules.baselineDays) return null;
  const windowDays = days.slice(0, prototypeRules.baselineDays);
  const windowValues = windowDays.map((d) => map.get(d) as number);
  const centre = median(windowValues);
  const mad = median(windowValues.map((v) => Math.abs(v - centre)));
  const spread = Math.max(mad, floorFor(indicatorId, measure));
  const result = new Map<number, 'above' | 'below'>();
  for (const d of days.slice(prototypeRules.baselineDays)) {
    const v = map.get(d) as number;
    if (Math.abs(v - centre) / spread >= prototypeRules.deviationK) result.set(d, v > centre ? 'above' : 'below');
  }
  return result;
}

/** Run length ending at `endDay` (a gap or a non-deviating day ends the run). */
function runAt(deviations: Map<number, 'above' | 'below'>, endDay: number) {
  const direction = deviations.get(endDay);
  if (!direction) return { length: 0, startDay: null as number | null };
  let day = endDay;
  while (deviations.get(day - 1) === direction) day -= 1;
  return { length: endDay - day + 1, startDay: day };
}

const measuresOf = (id: IndicatorId): MeasureKey[] => (id === 'blood-pressure' ? ['systolic', 'diastolic'] : ['value']);

const byId = (id: string) => seedCrew.find((s) => s.profile.astronautId === id) as AstronautSeed;

/* -------------------------------------------------------------------------- */

describe('crew profiles', () => {
  it('has four profiles with unique IDs and names', () => {
    expect(seedCrew).toHaveLength(4);
    const ids = seedCrew.map((s) => s.profile.astronautId);
    expect(new Set(ids).size).toBe(4);
    expect(new Set(seedCrew.map((s) => s.profile.displayName)).size).toBe(4);
  });

  it('puts every astronaut on mission day 30', () => {
    for (const s of seedCrew) expect(s.profile.currentMissionDay).toBe(30);
  });

  it('tracks glucose only for astro-2 and astro-4', () => {
    const tracksGlucose = (s: AstronautSeed) => s.profile.trackedIndicators.includes('blood-glucose');
    expect(tracksGlucose(byId('astro-1'))).toBe(false);
    expect(tracksGlucose(byId('astro-2'))).toBe(true);
    expect(tracksGlucose(byId('astro-3'))).toBe(false);
    expect(tracksGlucose(byId('astro-4'))).toBe(true);
  });
});

describe('seeded records', () => {
  it('belong to their own astronaut and are marked seeded', () => {
    for (const s of seedCrew) {
      for (const r of [...s.readings, ...s.symptoms]) {
        expect(r.astronautId).toBe(s.profile.astronautId);
        expect(r.origin).toBe('seeded');
      }
    }
  });

  it('have at most one reading per indicator per day, within days 1 to 30', () => {
    for (const s of seedCrew) {
      const keys = s.readings.map((r) => `${r.indicatorId}:${r.missionDay}`);
      expect(new Set(keys).size).toBe(keys.length);
      for (const r of s.readings) {
        expect(r.missionDay).toBeGreaterThanOrEqual(1);
        expect(r.missionDay).toBeLessThanOrEqual(30);
      }
    }
  });

  it('only contain tracked indicators, and every tracked indicator has readings', () => {
    for (const s of seedCrew) {
      const tracked = new Set<IndicatorId>(s.profile.trackedIndicators);
      for (const r of s.readings) expect(tracked.has(r.indicatorId)).toBe(true);
      for (const id of tracked) expect(s.readings.some((r) => r.indicatorId === id)).toBe(true);
    }
  });

  it('stay inside the entry limits', () => {
    for (const s of seedCrew) {
      for (const r of s.readings) {
        const indicator = indicators.find((i) => i.id === r.indicatorId);
        for (const def of indicator?.measures ?? []) {
          const v = valueOf(r, def.key);
          expect(v).toBeGreaterThanOrEqual(def.entryMin);
          expect(v).toBeLessThanOrEqual(def.entryMax);
        }
      }
    }
  });

  it('use only symptom IDs from the symptom list', () => {
    const ids = new Set(symptomDefinitions.map((d) => d.id));
    for (const s of seedCrew) for (const sym of s.symptoms) expect(ids.has(sym.symptomId)).toBe(true);
  });

  it('have no gaps except astro-3 (days 3 and 28) and astro-4 glucose (days 1 to 27)', () => {
    for (const s of seedCrew) {
      for (const id of s.profile.trackedIndicators) {
        const have = new Set(s.readings.filter((r) => r.indicatorId === id).map((r) => r.missionDay));
        const missing: number[] = [];
        for (let d = 1; d <= 30; d++) if (!have.has(d)) missing.push(d);
        if (s.profile.astronautId === 'astro-3') expect(missing).toEqual([3, 28]);
        else if (s.profile.astronautId === 'astro-4' && id === 'blood-glucose') {
          expect(missing).toEqual(Array.from({ length: 27 }, (_, i) => i + 1));
        } else expect(missing).toEqual([]);
      }
    }
  });
});

describe('seed helpers', () => {
  it('reject a list that is not 30 values long', () => {
    expect(() => buildReadings('x', 'sleep', [7, 7])).toThrow();
  });

  it('reject blood pressure with only one of the two numbers on a day', () => {
    const full = Array<number | null>(30).fill(120);
    const half = Array<number | null>(30).fill(80);
    half[4] = null;
    expect(() => buildBloodPressure('x', full, half)).toThrow();
  });
});

describe('definitions', () => {
  it('define six indicators with sensible entry limits and spread floors', () => {
    expect(indicators.map((i) => i.id).sort()).toEqual(
      ['blood-glucose', 'blood-pressure', 'body-temperature', 'heart-rate', 'mood', 'sleep'],
    );
    for (const i of indicators) {
      for (const m of i.measures) {
        expect(m.entryMin).toBeLessThan(m.entryMax);
        expect(m.spreadFloor).toBeGreaterThan(0);
      }
    }
    expect(indicators.find((i) => i.id === 'blood-pressure')?.measures).toHaveLength(2);
  });

  it('contain no reference ranges, no mission limits and no unsourced guidance', () => {
    for (const i of indicators) {
      expect(i.referenceRanges).toEqual([]);
      expect(i.missionLimits).toEqual([]);
      expect(i.hazards.status).toBe('no-sourced-guidance');
      expect(i.howToMeasure.status).toBe('no-sourced-guidance');
      expect(i.whyItMatters.status).toBe('no-sourced-guidance');
    }
    for (const d of symptomDefinitions) expect(d.note.status).toBe('no-sourced-guidance');
  });

  it('give glucose a context note and no other indicator one', () => {
    for (const i of indicators) expect(i.contextNote !== null).toBe(i.id === 'blood-glucose');
  });

  it('keep REF-01 and REF-03 unverified', () => {
    expect(sources.find((s) => s.id === 'REF-01')?.verification).toBe('not-yet-verified');
    expect(sources.find((s) => s.id === 'REF-03')?.verification).toBe('not-yet-verified');
  });

  it('use the agreed prototype numbers and an alert legend with no automatic Contact Flight Surgeon trigger', () => {
    expect(prototypeRules.baselineDays).toBe(7);
    expect(prototypeRules.deviationK).toBe(3);
    expect(prototypeRules.sustainedDays).toBe(3);
    expect(alertLegend.map((e) => e.level)).toEqual(['info', 'watch', 'action', 'contact-flight-surgeon']);
    const contact = alertLegend.find((e) => e.level === 'contact-flight-surgeon');
    expect(contact?.hasAutomaticTrigger).toBe(false);
    expect(contact?.description).toContain('No automatic trigger in this prototype yet');
  });
});

describe('mock snapshot', () => {
  it('matches the astro-1 seed data (baselines, latest values, run lengths)', () => {
    const seed = byId('astro-1');
    expect(mockSnapshot.astronautId).toBe('astro-1');
    expect(mockSnapshot.isSimulatedData).toBe(true);
    expect(mockSnapshot.statuses).toHaveLength(seed.profile.trackedIndicators.length);
    for (const st of mockSnapshot.statuses) {
      for (const m of st.measures) {
        const map = series(seed, st.indicatorId, m.measure);
        const windowValues = [1, 2, 3, 4, 5, 6, 7].map((d) => map.get(d) as number);
        const centre = median(windowValues);
        const spread = Math.max(median(windowValues.map((v) => Math.abs(v - centre))), floorFor(st.indicatorId, m.measure));
        expect(m.baseline.state).toBe('ready');
        if (m.baseline.state === 'ready') {
          expect(m.baseline.centre).toBeCloseTo(centre, 6);
          expect(m.baseline.spread).toBeCloseTo(spread, 6);
        }
        expect(m.latestValue).toBe(map.get(30));
        const run = runAt(deviatingDays(seed, st.indicatorId, m.measure) as Map<number, 'above' | 'below'>, 30);
        expect(m.run.length).toBe(run.length);
        expect(m.run.startDay).toBe(run.startDay);
      }
    }
    expect(mockSnapshot.alerts.map((a) => [a.indicatorId, a.level])).toEqual([
      ['sleep', 'action'],
      ['heart-rate', 'action'],
    ]);
  });
});

describe('story check (independent of src/logic)', () => {
  it('astro-1: sleep is below baseline for days 26 to 30, heart rate above for days 27 to 30, nothing else deviates', () => {
    const seed = byId('astro-1');
    for (const id of seed.profile.trackedIndicators) {
      for (const m of measuresOf(id)) {
        const dev = deviatingDays(seed, id, m);
        expect(dev).not.toBeNull();
        const days = [...(dev as Map<number, string>).keys()];
        if (id === 'sleep') expect(days).toEqual([26, 27, 28, 29, 30]);
        else if (id === 'heart-rate') expect(days).toEqual([27, 28, 29, 30]);
        else expect(days).toEqual([]);
      }
    }
    const sleepRun = runAt(deviatingDays(seed, 'sleep', 'value') as Map<number, 'above' | 'below'>, 30);
    const hrRun = runAt(deviatingDays(seed, 'heart-rate', 'value') as Map<number, 'above' | 'below'>, 30);
    expect(sleepRun).toEqual({ length: 5, startDay: 26 });
    expect(hrRun).toEqual({ length: 4, startDay: 27 });
    expect(deviatingDays(seed, 'sleep', 'value')?.get(30)).toBe('below');
    expect(deviatingDays(seed, 'heart-rate', 'value')?.get(30)).toBe('above');
  });

  it('astro-1: the symptom falls inside both runs and not on day 29 or 30', () => {
    const symptoms = byId('astro-1').symptoms;
    expect(symptoms).toHaveLength(1);
    expect(symptoms[0].missionDay).toBeGreaterThanOrEqual(27);
    expect(symptoms[0].missionDay).toBeLessThan(29);
  });

  it('astro-2 and astro-4: no reading ever deviates', () => {
    for (const name of ['astro-2', 'astro-4']) {
      const seed = byId(name);
      for (const id of seed.profile.trackedIndicators) {
        for (const m of measuresOf(id)) {
          const dev = deviatingDays(seed, id, m);
          if (dev) expect([...dev.keys()]).toEqual([]);
        }
      }
    }
  });

  it('astro-3: the missing day 3 moves the baseline window, and the day 28 gap restarts the heart rate run', () => {
    const seed = byId('astro-3');
    const days = [...series(seed, 'heart-rate', 'value').keys()].sort((a, b) => a - b);
    expect(days.slice(0, 7)).toEqual([1, 2, 4, 5, 6, 7, 8]);
    const dev = deviatingDays(seed, 'heart-rate', 'value') as Map<number, 'above' | 'below'>;
    expect([...dev.keys()]).toEqual([24, 25, 26, 27, 29, 30]);
    expect(runAt(dev, 30)).toEqual({ length: 2, startDay: 29 });
    for (const id of seed.profile.trackedIndicators.filter((i) => i !== 'heart-rate')) {
      for (const m of measuresOf(id)) expect([...(deviatingDays(seed, id, m) as Map<number, string>).keys()]).toEqual([]);
    }
  });

  it('astro-4: glucose has 3 readings so its baseline is still building', () => {
    const seed = byId('astro-4');
    expect(series(seed, 'blood-glucose', 'value').size).toBe(3);
    expect(deviatingDays(seed, 'blood-glucose', 'value')).toBeNull();
  });
});
