import { describe, expect, it } from 'vitest';
import { indicators } from '../data/indicators';
import { prototypeRules } from '../data/prototypeRules';
import { seedCrew } from '../data/seedCrew';
import { sources } from '../data/sources';
import { symptomDefinitions } from '../data/symptoms';
import type { GuidanceEntry, HealthAlert, HealthLogicInput, HealthReading, SymptomReport } from '../shared/types';
import { DISCLAIMER } from '../ui/labels';
import { buildExplanation, EXPLANATION_DISCLAIMER } from './explanations';
import { computeSnapshot } from './snapshot';

const BASE = [7, 7.1, 6.9, 7, 7.1, 6.9, 7];

/** Sleep readings for one synthetic astronaut: a steady baseline, then `lowValue` on `lowFrom` to `lowTo`. */
function sleep(id: string, opts: { last?: number; lowFrom?: number; lowTo?: number; skip?: number[]; lowValue?: number } = {}): HealthReading[] {
  const { last = 30, lowFrom = 28, lowTo = 30, skip = [], lowValue = 3 } = opts;
  const out: HealthReading[] = [];
  for (let d = 1; d <= last; d++) {
    if (skip.includes(d)) continue;
    out.push({
      astronautId: id,
      indicatorId: 'sleep',
      missionDay: d,
      value: d >= lowFrom && d <= lowTo ? lowValue : BASE[(d - 1) % 7],
      origin: 'seeded',
    });
  }
  return out;
}

function inputFor(
  id: string,
  readings: HealthReading[],
  extra: Partial<HealthLogicInput> = {},
  day = 30,
): HealthLogicInput {
  return {
    profile: { astronautId: id, displayName: id, currentMissionDay: day, trackedIndicators: ['sleep'] },
    indicators,
    readings,
    symptoms: [],
    symptomDefinitions,
    sources,
    rules: prototypeRules,
    guidance: [],
    ...extra,
  };
}

function explanationOf(input: HealthLogicInput) {
  const snap = computeSnapshot(input);
  const alert = snap.alerts.find((a) => a.indicatorId === 'sleep')!;
  const explanation = snap.explanations.find((e) => e.alertId === alert.id)!;
  return { snap, alert, explanation };
}

describe('buildExplanation: persistent deviation', () => {
  const { snap, alert, explanation } = explanationOf(inputFor('astro-t', sleep('astro-t')));

  it('creates one explanation per alert, linked by alert ID', () => {
    expect(alert.ruleId).toBe('sustained-deviation');
    expect(snap.explanations.map((e) => e.alertId)).toEqual(snap.alerts.map((a) => a.id));
  });

  it('part 1 states the run length, start day and latest value from the astronaut data', () => {
    expect(explanation.whatChanged).toContain('below your baseline for 3 days in a row, since day 28');
    expect(explanation.whatChanged).toContain('Latest recorded sleep: 3');
    expect(explanation.whatChanged).toContain('day 30');
  });

  it('part 2 gives the personal baseline centre and band and the position', () => {
    expect(explanation.baselineComparison).toContain('baseline centre is 7');
    expect(explanation.baselineComparison).toContain('baseline band');
    expect(explanation.baselineComparison).toContain('The latest value is below your baseline');
  });
});

describe('buildExplanation: missing readings', () => {
  it('does not repeat today as a missing day when it is already reported as pending', () => {
    const { explanation } = explanationOf(inputFor('astro-t', sleep('astro-t', { last: 29, lowTo: 29, lowFrom: 27 })));
    expect(explanation.whatChanged).toContain("Today's sleep check-in (day 30) is not recorded yet");
    expect(explanation.whatChanged).not.toContain('No sleep reading was recorded');
  });

  it('does not mention gaps from before the alert period', () => {
    const { explanation } = explanationOf(inputFor('astro-t', sleep('astro-t', { skip: [12] })));
    expect(explanation.whatChanged).not.toContain('No sleep reading was recorded');
  });

  it('says so when today is not recorded yet and the run is counted through the earlier day', () => {
    const { explanation } = explanationOf(inputFor('astro-t', sleep('astro-t', { last: 29, lowTo: 29, lowFrom: 27 })));
    expect(explanation.whatChanged).toContain("Today's sleep check-in (day 30) is not recorded yet");
    expect(explanation.whatChanged).toContain('latest reading is from day 29');
  });
});

describe('buildExplanation: not enough baseline data', () => {
  it('says the baseline is still being built and gives no comparison', () => {
    const readings = sleep('astro-t', { last: 4, lowFrom: 99, lowTo: 99 });
    const input = inputFor('astro-t', readings, {}, 4);
    const snap = computeSnapshot(input);
    expect(snap.alerts).toEqual([]);

    // No alert exists while the baseline builds, so give the builder a hand-made alert for sleep.
    const alert: HealthAlert = {
      id: 'astro-t:sleep:test',
      astronautId: 'astro-t',
      indicatorId: 'sleep',
      measures: ['value'],
      level: 'info',
      ruleId: 'deviation-not-yet-sustained',
      ruleLabel: 'test',
      reasons: [],
      runStartDay: 4,
      relatedIndicatorIds: [],
      symptomIds: [],
    };
    const e = buildExplanation(alert, {
      indicators,
      statuses: snap.statuses,
      guidance: [],
      symptomDefinitions,
      evaluatedOnDay: 4,
    });
    expect(e.baselineComparison).toContain('still being built (4 of 7 days with readings)');
    expect(e.baselineComparison).toContain('not enough data');
    expect(e.baselineComparison).not.toContain('baseline centre');
  });
});

describe('buildExplanation: guidance', () => {
  it('uses "no sourced guidance" for parts 3 to 5 when the guidance table is empty', () => {
    const { explanation } = explanationOf(inputFor('astro-t', sleep('astro-t')));
    expect(explanation.whyItMatters).toEqual({ status: 'no-sourced-guidance' });
    expect(explanation.hazards).toEqual({ status: 'no-sourced-guidance' });
    expect(explanation.nextSteps).toEqual({ status: 'no-sourced-guidance' });
    expect(explanation.sourceIds).toEqual([]);
  });

  it('reference range and mission limit notes are separate and say nothing is available', () => {
    const { explanation } = explanationOf(inputFor('astro-t', sleep('astro-t')));
    expect(explanation.referenceRangeNote).toContain('No sourced reference range available');
    expect(explanation.missionLimitNote).toContain('No mission-approved limit');
  });

  it('uses a sourced entry only for the matching situation and lists its sources', () => {
    const entry = (situation: GuidanceEntry['situation']): GuidanceEntry => ({
      indicatorId: 'sleep',
      situation,
      whyItMatters: { status: 'sourced', content: 'test why', sourceIds: ['REF-02'] },
      hazards: { status: 'sourced', content: ['isolation-and-confinement'], sourceIds: ['REF-01'] },
      nextSteps: { status: 'no-sourced-guidance' },
    });
    const below = explanationOf(inputFor('astro-t', sleep('astro-t'), { guidance: [entry('sustained-below')] })).explanation;
    expect(below.whyItMatters).toMatchObject({ status: 'sourced', content: 'test why' });
    expect(below.nextSteps).toEqual({ status: 'no-sourced-guidance' });
    expect(below.sourceIds.sort()).toEqual(['REF-01', 'REF-02']);

    const above = explanationOf(inputFor('astro-t', sleep('astro-t'), { guidance: [entry('sustained-above')] })).explanation;
    expect(above.whyItMatters).toEqual({ status: 'no-sourced-guidance' });
  });

  it('a run that is not sustained never uses guidance', () => {
    const guidance: GuidanceEntry[] = [
      {
        indicatorId: 'sleep',
        situation: 'sustained-below',
        whyItMatters: { status: 'sourced', content: 'test why', sourceIds: ['REF-02'] },
        hazards: { status: 'no-sourced-guidance' },
        nextSteps: { status: 'no-sourced-guidance' },
      },
    ];
    const { alert, explanation } = explanationOf(inputFor('astro-t', sleep('astro-t', { lowFrom: 29 }), { guidance }));
    expect(alert.level).toBe('info');
    expect(explanation.whyItMatters).toEqual({ status: 'no-sourced-guidance' });
  });
});

describe('buildExplanation: Contact Flight Surgeon', () => {
  it('states that no automatic trigger is defined, for every alert of every seeded astronaut', () => {
    let count = 0;
    for (const seed of seedCrew) {
      const snap = computeSnapshot({
        profile: seed.profile,
        indicators,
        readings: seed.readings,
        symptoms: seed.symptoms,
        symptomDefinitions,
        sources,
        rules: prototypeRules,
        guidance: [],
      });
      for (const e of snap.explanations) {
        count++;
        expect(e.whenToContactFlightSurgeon.automaticContactRuleDefined).toBe(false);
        expect(e.whenToContactFlightSurgeon.appliedRule).toContain('No automatic Contact Flight Surgeon trigger is defined');
        expect(e.whenToContactFlightSurgeon.guidance).toEqual({ status: 'no-sourced-guidance' });
      }
    }
    expect(count).toBeGreaterThan(0);
  });

  it('uses the same disclaimer as the UI', () => {
    expect(EXPLANATION_DISCLAIMER).toBe(DISCLAIMER);
  });

  it('covers the elements required by FR-SAFE-01', () => {
    expect(DISCLAIMER).toMatch(/decision support/i);
    expect(DISCLAIMER).toMatch(/not a diagnosis/i);
    expect(DISCLAIMER).toMatch(/medical device/i);
    expect(DISCLAIMER).toMatch(/does not replace medical professionals or mission protocols/i);
  });
});

describe('buildExplanation: astronaut-specific data', () => {
  it('each seeded explanation belongs to its own astronaut and indicator', () => {
    for (const seed of seedCrew) {
      const id = seed.profile.astronautId;
      const snap = computeSnapshot({
        profile: seed.profile,
        indicators,
        readings: seed.readings,
        symptoms: seed.symptoms,
        symptomDefinitions,
        sources,
        rules: prototypeRules,
        guidance: [],
      });
      for (const e of snap.explanations) {
        expect(e.astronautId).toBe(id);
        expect(e.alertId.startsWith(`${id}:`)).toBe(true);
        expect(e.indicatorId).toBe(snap.alerts.find((a) => a.id === e.alertId)!.indicatorId);
      }
    }
  });

  it('two astronauts with different readings get different values in their text', () => {
    const a = explanationOf(inputFor('astro-a', sleep('astro-a', { lowValue: 3 }))).explanation;
    const b = explanationOf(inputFor('astro-b', sleep('astro-b', { lowValue: 4.5 }))).explanation;
    expect(a.astronautId).toBe('astro-a');
    expect(b.astronautId).toBe('astro-b');
    expect(a.whatChanged).toContain('Latest recorded sleep: 3 ');
    expect(b.whatChanged).toContain('Latest recorded sleep: 4.5 ');
    expect(a.whatChanged).not.toContain('4.5');
  });

  it('throws when the statuses belong to another astronaut', () => {
    const { snap, alert } = explanationOf(inputFor('astro-a', sleep('astro-a')));
    const other = computeSnapshot(inputFor('astro-b', sleep('astro-b')));
    expect(() =>
      buildExplanation(alert, {
        indicators,
        statuses: other.statuses,
        guidance: [],
        symptomDefinitions,
        evaluatedOnDay: snap.evaluatedOnDay,
      }),
    ).toThrow();
  });

  it('a symptom-only alert has an explanation with no baseline comparison', () => {
    const symptoms: SymptomReport[] = [{ astronautId: 'astro-t', symptomId: 'tiredness', missionDay: 30, origin: 'seeded' }];
    const snap = computeSnapshot(inputFor('astro-t', sleep('astro-t', { lowFrom: 99 }), { symptoms }));
    const alert = snap.alerts.find((a) => a.indicatorId === null)!;
    const e = snap.explanations.find((x) => x.alertId === alert.id)!;
    expect(e.indicatorId).toBeNull();
    expect(e.whatChanged).toContain('Tiredness');
    expect(e.baselineComparison).toContain('not a reading');
  });
});
