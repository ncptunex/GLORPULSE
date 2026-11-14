import { describe, expect, it } from 'vitest';
import { indicators } from '../data/indicators';
import { prototypeRules } from '../data/prototypeRules';
import { seedCrew } from '../data/seedCrew';
import { symptomDefinitions } from '../data/symptoms';
import type { CrewProfile, HealthReading, IndicatorId, SymptomReport } from '../shared/types';
import { computeAlerts } from './alerts';

const ID = 'astro-test';
const DAY = 30;

function profile(tracked: IndicatorId[], day = DAY): CrewProfile {
  return {
    astronautId: ID,
    displayName: 'Test',
    currentMissionDay: day,
    trackedIndicators: tracked as CrewProfile['trackedIndicators'],
  };
}

/** Sleep: days 1-7 near 7 h, normal until `from`, then 3 h (far below) for `from` to `to`. */
function sleep(from: number, to: number, last = DAY): HealthReading[] {
  const out: HealthReading[] = [];
  for (let d = 1; d <= last; d++) {
    const low = d >= from && d <= to;
    const base = [7, 7.1, 6.9, 7, 7.1, 6.9, 7][(d - 1) % 7];
    out.push({ astronautId: ID, indicatorId: 'sleep', missionDay: d, value: low ? 3 : base, origin: 'seeded' });
  }
  return out;
}

/** Heart rate: near 60, then 120 (far above) for `from` to `to`. */
function heart(from: number, to: number, last = DAY): HealthReading[] {
  const out: HealthReading[] = [];
  for (let d = 1; d <= last; d++) {
    const high = d >= from && d <= to;
    const base = [60, 61, 59, 60, 61, 59, 60][(d - 1) % 7];
    out.push({ astronautId: ID, indicatorId: 'heart-rate', missionDay: d, value: high ? 120 : base, origin: 'seeded' });
  }
  return out;
}

/** Blood pressure: baseline 120/80. Systolic is 190 on days sysFrom..to, diastolic is 130 on days diaFrom..to. */
function pressure(sysFrom: number, diaFrom: number, to = DAY, last = DAY): HealthReading[] {
  const out: HealthReading[] = [];
  const sBase = [120, 121, 119, 120, 121, 119, 120];
  const dBase = [80, 81, 79, 80, 81, 79, 80];
  for (let d = 1; d <= last; d++) {
    out.push({
      astronautId: ID,
      indicatorId: 'blood-pressure',
      missionDay: d,
      systolic: d >= sysFrom && d <= to ? 190 : sBase[(d - 1) % 7],
      diastolic: d >= diaFrom && d <= to ? 130 : dBase[(d - 1) % 7],
      origin: 'seeded',
    });
  }
  return out;
}

function symptom(missionDay: number, symptomId = 'tiredness'): SymptomReport {
  return { astronautId: ID, symptomId, missionDay, origin: 'seeded' };
}

function run(tracked: IndicatorId[], readings: HealthReading[], symptoms: SymptomReport[] = [], day = DAY) {
  return computeAlerts({
    profile: profile(tracked, day),
    indicators,
    readings,
    symptoms,
    symptomDefinitions,
    rules: prototypeRules,
  });
}

describe('computeAlerts: levels', () => {
  it('returns no alerts when nothing deviates', () => {
    expect(run(['sleep'], sleep(99, 99))).toEqual([]);
  });

  it('Info: a deviation shorter than the sustained limit', () => {
    const [alert, ...rest] = run(['sleep'], sleep(29, 30));
    expect(rest).toEqual([]);
    expect(alert).toMatchObject({
      level: 'info',
      ruleId: 'deviation-not-yet-sustained',
      indicatorId: 'sleep',
      runStartDay: 29,
      id: `${ID}:sleep:deviation-not-yet-sustained`,
    });
  });

  it('Watch: a sustained deviation alone', () => {
    const alerts = run(['sleep'], sleep(28, 30));
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({ level: 'watch', ruleId: 'sustained-deviation', runStartDay: 28, symptomIds: [] });
  });

  it('Action: sustained deviation with a symptom inside the run (inclusive start day)', () => {
    const alerts = run(['sleep'], sleep(28, 30), [symptom(28)]);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({ level: 'action', ruleId: 'sustained-with-symptom', symptomIds: ['tiredness'] });
  });

  it('a symptom the day before the run starts does not contribute', () => {
    const alerts = run(['sleep'], sleep(28, 30), [symptom(27)]);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].level).toBe('watch');
  });

  it('Action: two sustained indicators, ruleId is sustained-with-second-indicator, symptom is context only (A-06)', () => {
    const alerts = run(['sleep', 'heart-rate'], [...sleep(27, 30), ...heart(28, 30)], [symptom(29)]);
    expect(alerts).toHaveLength(2);
    expect(alerts.map((a) => a.indicatorId)).toEqual(['sleep', 'heart-rate']);
    for (const a of alerts) {
      expect(a.level).toBe('action');
      expect(a.ruleId).toBe('sustained-with-second-indicator');
      expect(a.symptomIds).toEqual(['tiredness']);
    }
    expect(alerts[0].relatedIndicatorIds).toEqual(['heart-rate']);
    expect(alerts[1].relatedIndicatorIds).toEqual(['sleep']);
  });

  it('a non-sustained second indicator does not make an Action', () => {
    const alerts = run(['sleep', 'heart-rate'], [...sleep(27, 30), ...heart(29, 30)]);
    expect(alerts.map((a) => [a.indicatorId, a.level])).toEqual([
      ['sleep', 'watch'],
      ['heart-rate', 'info'],
    ]);
  });

  it('never produces a Contact Flight Surgeon level', () => {
    const alerts = run(['sleep', 'heart-rate'], [...sleep(20, 30), ...heart(20, 30)], [symptom(30)]);
    for (const a of alerts) expect(['info', 'watch', 'action']).toContain(a.level);
  });
});

describe('computeAlerts: one alert per indicator and symptom-only Info', () => {
  it('has at most one alert per indicator', () => {
    const alerts = run(['sleep', 'heart-rate'], [...sleep(20, 30), ...heart(25, 30)], [symptom(28)]);
    const ids = alerts.map((a) => a.indicatorId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('a symptom today with no deviation gives a symptom-only Info alert', () => {
    const alerts = run(['sleep'], sleep(99, 99), [symptom(30)]);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({
      level: 'info',
      ruleId: 'symptom-logged',
      indicatorId: null,
      runStartDay: null,
      measures: [],
      symptomIds: ['tiredness'],
    });
  });

  it('a symptom from yesterday still counts, two days ago does not', () => {
    expect(run(['sleep'], sleep(99, 99), [symptom(29)])).toHaveLength(1);
    expect(run(['sleep'], sleep(99, 99), [symptom(28)])).toEqual([]);
  });

  it('a symptom that contributes to an Action alert creates no separate Info alert (A-07)', () => {
    const alerts = run(['sleep'], sleep(28, 30), [symptom(30)]);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].level).toBe('action');
  });

  it('a symptom outside the run still gives its own Info alert, listed after the Watch alert', () => {
    // Today's sleep reading is pending, so the run is counted through day 29 and a day-30 symptom is outside it.
    const readings = sleep(27, 29, 29);
    const alerts = run(['sleep'], readings, [symptom(30)]);
    expect(alerts.map((a) => [a.indicatorId, a.level])).toEqual([
      ['sleep', 'watch'],
      [null, 'info'],
    ]);
    expect(alerts[0].reasons.join(' ')).toContain('not recorded yet');
  });

  it('several contributing symptoms are all listed on the Action alert', () => {
    const alerts = run(['sleep'], sleep(28, 30), [symptom(29, 'headache'), symptom(30, 'nausea')]);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].symptomIds.sort()).toEqual(['headache', 'nausea']);
  });

  it('a repeated symptom on the same day counts once', () => {
    const alerts = run(['sleep'], sleep(99, 99), [symptom(30), symptom(30)]);
    expect(alerts[0].reasons).toHaveLength(1);
  });

  it('orders Action, then Watch, then Info', () => {
    const alerts = run(['sleep', 'heart-rate'], [...sleep(27, 30), ...heart(29, 30)], [symptom(30, 'headache')]);
    // sleep is sustained with a symptom in range, so it is Action. Heart rate is Info.
    expect(alerts.map((a) => a.level)).toEqual(['action', 'info']);
  });
});

describe('computeAlerts: blood pressure', () => {
  it('produces one alert with only the sustained measure', () => {
    const alerts = run(['blood-pressure'], pressure(27, 99));
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({ indicatorId: 'blood-pressure', level: 'watch', measures: ['systolic'], runStartDay: 27 });
  });

  it('excludes a non-sustained measure from `measures`', () => {
    const alerts = run(['blood-pressure'], pressure(27, 29));
    expect(alerts).toHaveLength(1);
    expect(alerts[0].measures).toEqual(['systolic']);
  });

  it('with both sustained, lists both and shows the earliest startDay', () => {
    const alerts = run(['blood-pressure'], pressure(26, 28));
    expect(alerts).toHaveLength(1);
    expect(alerts[0].measures).toEqual(['systolic', 'diastolic']);
    expect(alerts[0].runStartDay).toBe(26);
  });

  it('a symptom contributes if it is inside at least one measure run range', () => {
    // Systolic run is 26..30, diastolic run is 28..30. Day 26 is only in the systolic range.
    const alerts = run(['blood-pressure'], pressure(26, 28), [symptom(26)]);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({ level: 'action', ruleId: 'sustained-with-symptom', symptomIds: ['tiredness'] });
  });

  it('a symptom before every sustained run does not contribute', () => {
    const alerts = run(['blood-pressure'], pressure(26, 28), [symptom(25)]);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].level).toBe('watch');
  });

  it('a symptom before the sustained run does not contribute, even with a shorter diastolic run', () => {
    // Systolic is sustained 27..30. Diastolic deviates 29..30 only and is not sustained.
    const alerts = run(['blood-pressure'], pressure(27, 29), [symptom(26)]);
    expect(alerts[0].level).toBe('watch');
  });

  it('with a non-sustained measure only, gives one Info alert listing the deviating measure', () => {
    const alerts = run(['blood-pressure'], pressure(99, 29));
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({ level: 'info', measures: ['diastolic'] });
  });
});

describe('computeAlerts: safety and separation', () => {
  it('builds no deviation alert while the baseline is building', () => {
    const readings = sleep(4, 6, 6).filter((r) => r.missionDay <= 6);
    expect(run(['sleep'], readings, [], 6)).toEqual([]);
  });

  it('ignores readings and symptoms after the current day', () => {
    const future = sleep(28, 40, 40);
    expect(run(['sleep'], future, [symptom(35)], 29)).toEqual(run(['sleep'], sleep(28, 29, 29), [], 29));
  });

  it('rejects a reading of another astronaut, even on a future day', () => {
    const foreign: HealthReading = { astronautId: 'other', indicatorId: 'sleep', missionDay: 99, value: 7, origin: 'seeded' };
    expect(() => run(['sleep'], [...sleep(99, 99), foreign])).toThrow(/must not be mixed/);
  });

  it('rejects a symptom of another astronaut', () => {
    const foreign: SymptomReport = { astronautId: 'other', symptomId: 'tiredness', missionDay: 30, origin: 'seeded' };
    expect(() => run(['sleep'], sleep(99, 99), [foreign])).toThrow(/must not be mixed/);
  });

  it('rejects an unknown symptom ID', () => {
    expect(() => run(['sleep'], sleep(99, 99), [symptom(30, 'not-a-symptom')])).toThrow(/Unknown symptom/);
  });

  it('every alert belongs to the astronaut and has a visible rule label', () => {
    const alerts = run(['sleep'], sleep(28, 30), [symptom(30)]);
    for (const a of alerts) {
      expect(a.astronautId).toBe(ID);
      expect(a.ruleLabel).toContain('prototype simulated protocol');
    }
  });

  it('does not mutate its input', () => {
    const readings = sleep(28, 30);
    const symptoms = [symptom(30)];
    const before = JSON.stringify([readings, symptoms]);
    run(['sleep'], readings, symptoms);
    expect(JSON.stringify([readings, symptoms])).toBe(before);
  });
});

describe('computeAlerts: seeded astronauts on their current day', () => {
  function seeded(id: string) {
    const seed = seedCrew.find((s) => s.profile.astronautId === id)!;
    return computeAlerts({
      profile: seed.profile,
      indicators,
      readings: seed.readings,
      symptoms: seed.symptoms,
      symptomDefinitions,
      rules: prototypeRules,
    });
  }

  it('astro-1: Action alerts on sleep and heart rate, each naming the other, with the tiredness symptom', () => {
    const alerts = seeded('astro-1');
    expect(alerts.map((a) => [a.indicatorId, a.level, a.ruleId, a.runStartDay])).toEqual([
      ['heart-rate', 'action', 'sustained-with-second-indicator', 27],
      ['sleep', 'action', 'sustained-with-second-indicator', 26],
    ]);
    expect(alerts.find((a) => a.indicatorId === 'sleep')!.relatedIndicatorIds).toEqual(['heart-rate']);
    for (const a of alerts) expect(a.symptomIds).toEqual(['tiredness']);
    expect(alerts.some((a) => a.indicatorId === null)).toBe(false);
  });

  it('astro-2: no alerts', () => {
    expect(seeded('astro-2')).toEqual([]);
  });

  it('astro-3: one Info alert for a short heart rate deviation', () => {
    const alerts = seeded('astro-3');
    expect(alerts.map((a) => [a.indicatorId, a.level, a.ruleId])).toEqual([
      ['heart-rate', 'info', 'deviation-not-yet-sustained'],
    ]);
  });

  it('astro-4: no alerts, and no glucose alert while its baseline is building', () => {
    expect(seeded('astro-4')).toEqual([]);
  });

  it('only produces alerts for tracked indicators', () => {
    for (const seed of seedCrew) {
      for (const a of seeded(seed.profile.astronautId)) {
        if (a.indicatorId !== null) expect(seed.profile.trackedIndicators).toContain(a.indicatorId);
      }
    }
  });
});
