import { describe, expect, it } from 'vitest';
import { validateCheckIn } from '../logic/checkIn';
import { computeSnapshot } from '../logic/snapshot';
import type {
  AlertRuleId,
  CheckInSubmission,
  CheckInValue,
  CrewProfile,
  HazardTag,
  HealthIndicator,
  HealthLogicInput,
  HealthReading,
  HealthSnapshot,
  IndicatorId,
  SourceReference,
  SymptomReport,
} from '../shared/types';
import { alertLegend } from './alertLegend';
import { alertRuleLabels } from './alertRuleLabels';
import { indicators } from './indicators';
import { prototypeRules } from './prototypeRules';
import { seedCrew } from './seedCrew';
import { sources } from './sources';
import { symptomDefinitions } from './symptoms';
import { DISCLAIMER } from '../ui/labels';

/**
 * Source integrity (FR-SRC-02, FR-SRC-03, DR-02, AT-SRC-02, AT-SRC-05, AT-SRC-06).
 *
 * Part 1 checks the structure of sources and of every sourced field.
 * Part 2 checks that a reference range is only attached when its sources are verified (A-20).
 * Part 3 scans user-facing text for disease names and diagnostic wording.
 *
 * The word scan is a guard against obvious mistakes. It is not proof that no diagnostic wording exists
 * (see the limitations in the scanner section). It does not replace a human read of the interface text.
 *
 * Nothing here adds medical content. The fixtures use made-up ranges only to prove that the checks work.
 */

/* ========================================================================== */
/* Part 1: sources and sourced fields                                         */
/* ========================================================================== */

/** The five NASA hazards. Record<> makes TypeScript fail here if the HazardTag type ever changes. */
const HAZARD_TAGS: Record<HazardTag, true> = {
  'space-radiation': true,
  'isolation-and-confinement': true,
  'distance-from-earth': true,
  'altered-gravity': true,
  'hostile-closed-environment': true,
};
const ALLOWED_HAZARDS = Object.keys(HAZARD_TAGS);

const isBlank = (value: unknown): boolean => typeof value !== 'string' || value.trim() === '';

/** Problems with the list of sources itself. */
function sourceListProblems(list: SourceReference[]): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const s of list) {
    if (seen.has(s.id)) problems.push(`Duplicate source ID ${s.id}.`);
    seen.add(s.id);
    for (const field of ['id', 'title', 'organisation', 'url', 'supports'] as const) {
      if (isBlank(s[field])) problems.push(`Source ${s.id}: "${field}" is empty.`);
    }
    if (s.verification !== 'verified' && s.verification !== 'not-yet-verified') {
      problems.push(`Source ${s.id}: invalid verification "${String(s.verification)}".`);
    }
  }
  return problems;
}

type SourcedKind = 'text' | 'hazards';

/** Problems with the SHAPE of one Sourced value (checked at run time, because data could be wrong). */
function sourcedShapeProblems(value: unknown, kind: SourcedKind): string[] {
  if (typeof value !== 'object' || value === null) return ['is not an object.'];
  const record = value as Record<string, unknown>;

  if (record.status === 'no-sourced-guidance') {
    const extra = Object.keys(record).filter((k) => k !== 'status');
    return extra.length > 0 ? [`"no-sourced-guidance" must not have other keys (${extra.join(', ')}).`] : [];
  }
  if (record.status !== 'sourced') return [`has an invalid status "${String(record.status)}".`];

  const problems: string[] = [];
  if (kind === 'text') {
    if (isBlank(record.content)) problems.push('sourced text content is empty.');
  } else if (!Array.isArray(record.content) || record.content.length === 0) {
    problems.push('sourced hazard content is empty.');
  } else if (record.content.some((tag) => typeof tag !== 'string')) {
    problems.push('sourced hazard content has a non-text item.');
  }
  const ids = record.sourceIds;
  if (!Array.isArray(ids) || ids.length === 0) problems.push('sourced content has no source ID.');
  else if (ids.some((id) => isBlank(id))) problems.push('sourced content has an empty source ID.');
  return problems;
}

/** Cited IDs that do not exist, or exist but are not verified. */
function citationProblems(ids: readonly string[], list: SourceReference[]): string[] {
  const problems: string[] = [];
  for (const id of ids) {
    const source = list.find((s) => s.id === id);
    if (!source) problems.push(`cites unknown source ${id}.`);
    else if (source.verification !== 'verified') problems.push(`cites ${id}, which is not verified.`);
  }
  return problems;
}

/** Hazard tags that are not one of the five NASA hazards. */
function hazardProblems(value: unknown): string[] {
  const record = value as { status?: string; content?: unknown };
  if (record?.status !== 'sourced' || !Array.isArray(record.content)) return [];
  return record.content.filter((tag) => !ALLOWED_HAZARDS.includes(String(tag))).map((tag) => `uses "${String(tag)}", which is not one of the five hazards.`);
}

/** Every Sourced field of the indicator and symptom definitions, with a readable location. */
interface SourcedField {
  where: string;
  kind: SourcedKind;
  value: unknown;
}

function sourcedFieldsOf(list: HealthIndicator[], symptoms = symptomDefinitions): SourcedField[] {
  const fields: SourcedField[] = [];
  for (const i of list) {
    fields.push({ where: `${i.id}.hazards`, kind: 'hazards', value: i.hazards });
    fields.push({ where: `${i.id}.howToMeasure`, kind: 'text', value: i.howToMeasure });
    fields.push({ where: `${i.id}.whyItMatters`, kind: 'text', value: i.whyItMatters });
    if (i.contextNote !== null) fields.push({ where: `${i.id}.contextNote`, kind: 'text', value: i.contextNote });
  }
  for (const s of symptoms) fields.push({ where: `symptom ${s.id}.note`, kind: 'text', value: s.note });
  return fields;
}

/** Source IDs cited by a Sourced value (empty for no-sourced-guidance or a malformed value). */
function citedIds(value: unknown): string[] {
  const ids = (value as { sourceIds?: unknown })?.sourceIds;
  return Array.isArray(ids) ? ids.map(String) : [];
}

/** Problems with the reference ranges and mission limits of one indicator. */
function limitProblems(indicator: HealthIndicator, list: SourceReference[]): string[] {
  const problems: string[] = [];
  const measureKeys = indicator.measures.map((m) => m.key);

  const checkLimits = (where: string, measure: string, low: number | null, high: number | null) => {
    if (!measureKeys.includes(measure as never)) problems.push(`${where}: measure "${measure}" does not exist on ${indicator.id}.`);
    for (const [name, v] of [['low', low], ['high', high]] as const) {
      if (v !== null && (typeof v !== 'number' || !Number.isFinite(v))) problems.push(`${where}: ${name} is not a finite number or null.`);
    }
    if (low === null && high === null) problems.push(`${where}: low and high are both null.`);
    if (typeof low === 'number' && typeof high === 'number' && low > high) problems.push(`${where}: low is higher than high.`);
  };
  const checkIds = (where: string, ids: unknown) => {
    if (!Array.isArray(ids) || ids.length === 0) problems.push(`${where}: no source ID.`);
    else for (const p of citationProblems(ids.map(String), list)) problems.push(`${where}: ${p}`);
  };

  indicator.referenceRanges.forEach((r, n) => {
    const where = `${indicator.id}.referenceRanges[${n}]`;
    checkLimits(where, r.measure, r.low, r.high);
    checkIds(where, r.sourceIds);
  });
  indicator.missionLimits.forEach((m, n) => {
    const where = `${indicator.id}.missionLimits[${n}]`;
    checkLimits(where, m.measure, m.low, m.high);
    if (m.basis === 'sourced') checkIds(where, m.sourceIds);
    else if (m.basis === 'simulated-protocol') {
      if (isBlank(m.label)) problems.push(`${where}: a simulated protocol needs a non-empty label.`);
    } else problems.push(`${where}: invalid basis.`);
  });
  return problems;
}

describe('sources: structure', () => {
  it('has unique IDs and non-empty required fields', () => {
    expect(sources.length).toBeGreaterThan(0);
    expect(sourceListProblems(sources)).toEqual([]);
  });

  it('uses only valid verification values', () => {
    for (const s of sources) expect(['verified', 'not-yet-verified']).toContain(s.verification);
  });

  it('the checker finds duplicate IDs, empty fields and invalid verification', () => {
    const base = sources[0];
    const bad = [
      base,
      { ...base },
      { ...base, id: 'X', title: '  ' },
      { ...base, id: 'Y', verification: 'maybe' as never },
    ];
    const problems = sourceListProblems(bad);
    expect(problems).toContain(`Duplicate source ID ${base.id}.`);
    expect(problems).toContain('Source X: "title" is empty.');
    expect(problems.some((p) => p.includes('invalid verification'))).toBe(true);
  });
});

describe('sourced fields: shape, citations and hazards', () => {
  const fields = sourcedFieldsOf(indicators);

  it('finds every sourced field (six indicators and six symptoms)', () => {
    // hazards, howToMeasure and whyItMatters for six indicators, plus one context note, plus six symptom notes.
    expect(fields).toHaveLength(6 * 3 + 1 + 6);
  });

  it('every Sourced field is a valid no-sourced-guidance object or a valid sourced object', () => {
    for (const f of fields) expect(sourcedShapeProblems(f.value, f.kind), f.where).toEqual([]);
  });

  it('every cited source ID exists', () => {
    for (const f of fields) {
      const missing = citationProblems(citedIds(f.value), sources).filter((p) => p.includes('unknown'));
      expect(missing, f.where).toEqual([]);
    }
  });

  it('every cited source ID is verified', () => {
    for (const f of fields) expect(citationProblems(citedIds(f.value), sources), f.where).toEqual([]);
  });

  it('sourced hazard content uses only the five NASA hazard tags', () => {
    for (const f of fields.filter((x) => x.kind === 'hazards')) expect(hazardProblems(f.value), f.where).toEqual([]);
  });

  describe('the checkers catch bad data (so the checks above are not vacuous)', () => {
    it('shape', () => {
      expect(sourcedShapeProblems({ status: 'no-sourced-guidance' }, 'text')).toEqual([]);
      expect(sourcedShapeProblems({ status: 'sourced', content: 'Text', sourceIds: ['REF-02'] }, 'text')).toEqual([]);
      expect(sourcedShapeProblems({ status: 'sourced', content: ['space-radiation'], sourceIds: ['REF-02'] }, 'hazards')).toEqual([]);
      expect(sourcedShapeProblems({ status: 'no-sourced-guidance', content: 'x' }, 'text')).toHaveLength(1);
      expect(sourcedShapeProblems({ status: 'sourced', content: '  ', sourceIds: ['REF-02'] }, 'text')).toHaveLength(1);
      expect(sourcedShapeProblems({ status: 'sourced', content: 'Text', sourceIds: [] }, 'text')).toHaveLength(1);
      expect(sourcedShapeProblems({ status: 'sourced', content: 'Text' }, 'text')).toHaveLength(1);
      expect(sourcedShapeProblems({ status: 'sourced', content: 'Text', sourceIds: [''] }, 'text')).toHaveLength(1);
      expect(sourcedShapeProblems({ status: 'sourced', content: [], sourceIds: ['REF-02'] }, 'hazards')).toHaveLength(1);
      expect(sourcedShapeProblems({ status: 'unknown' }, 'text')).toHaveLength(1);
      expect(sourcedShapeProblems(null, 'text')).toHaveLength(1);
    });

    it('citations', () => {
      const unverifiedRef01: SourceReference[] = [{ ...sources[0], id: 'REF-01', verification: 'not-yet-verified' }];
      expect(citationProblems(['REF-02'], sources)).toEqual([]);
      expect(citationProblems(['REF-01'], unverifiedRef01)).toEqual(['cites REF-01, which is not verified.']);
      expect(citationProblems(['REF-99'], sources)).toEqual(['cites unknown source REF-99.']);
    });

    it('hazard tags', () => {
      expect(hazardProblems({ status: 'sourced', content: ['space-radiation', 'made-up'], sourceIds: ['REF-02'] })).toHaveLength(1);
      expect(hazardProblems({ status: 'no-sourced-guidance' })).toEqual([]);
    });

    it('a sourced field in a copy of the data is found and checked', () => {
      const withGuidance = indicators.map((i) =>
        i.id === 'sleep' ? { ...i, whyItMatters: { status: 'sourced' as const, content: 'Fixture text.', sourceIds: ['REF-01'] as [string] } } : i,
      );
      const field = sourcedFieldsOf(withGuidance).find((f) => f.where === 'sleep.whyItMatters')!;
      expect(sourcedShapeProblems(field.value, field.kind)).toEqual([]);
      const unverifiedRef01: SourceReference[] = [{ ...sources[0], id: 'REF-01', verification: 'not-yet-verified' }];
      expect(citationProblems(citedIds(field.value), unverifiedRef01)).toEqual(['cites REF-01, which is not verified.']);
    });
  });
});

/* ========================================================================== */
/* Reference ranges and mission limits                                         */
/* ========================================================================== */

const fixtureSources: SourceReference[] = [
  { ...sources[0], id: 'FIX-OK', verification: 'verified' },
  { ...sources[0], id: 'FIX-NO', verification: 'not-yet-verified' },
];
const sleepDefinition = indicators.find((i) => i.id === 'sleep')!;

describe('reference ranges and mission limits', () => {
  it('the real indicators have valid limits (today: none exist)', () => {
    for (const i of indicators) expect(limitProblems(i, sources), i.id).toEqual([]);
  });

  it('accepts a valid verified reference range and valid limits', () => {
    const ok: HealthIndicator = {
      ...sleepDefinition,
      referenceRanges: [{ measure: 'value', low: 1, high: 2, sourceIds: ['FIX-OK'] }],
      missionLimits: [
        { basis: 'sourced', measure: 'value', low: null, high: 2, sourceIds: ['FIX-OK'] },
        { basis: 'simulated-protocol', measure: 'value', low: 1, high: null, label: 'Fixture simulated protocol' },
      ],
    };
    expect(limitProblems(ok, fixtureSources)).toEqual([]);
  });

  it('rejects a range with an unknown measure', () => {
    const bad = { ...sleepDefinition, referenceRanges: [{ measure: 'systolic' as const, low: 1, high: 2, sourceIds: ['FIX-OK'] as [string] }] };
    expect(limitProblems(bad, fixtureSources)).toEqual([expect.stringContaining('does not exist on sleep')]);
  });

  it('rejects non-finite or reversed limits, and a range with both limits null', () => {
    const make = (low: number | null, high: number | null): HealthIndicator => ({
      ...sleepDefinition,
      referenceRanges: [{ measure: 'value', low, high, sourceIds: ['FIX-OK'] }],
    });
    expect(limitProblems(make(Number.NaN, 2), fixtureSources).join()).toContain('low is not a finite number');
    expect(limitProblems(make(1, Number.POSITIVE_INFINITY), fixtureSources).join()).toContain('high is not a finite number');
    expect(limitProblems(make(5, 2), fixtureSources).join()).toContain('low is higher than high');
    expect(limitProblems(make(null, null), fixtureSources).join()).toContain('both null');
    expect(limitProblems(make(2, 2), fixtureSources)).toEqual([]);
  });

  it('rejects a range that cites an unverified, unknown or missing source', () => {
    const make = (sourceIds: unknown): HealthIndicator => ({
      ...sleepDefinition,
      referenceRanges: [{ measure: 'value', low: 1, high: 2, sourceIds: sourceIds as [string] }],
    });
    expect(limitProblems(make(['FIX-NO']), fixtureSources).join()).toContain('not verified');
    expect(limitProblems(make(['NOPE']), fixtureSources).join()).toContain('unknown source');
    expect(limitProblems(make([]), fixtureSources).join()).toContain('no source ID');
  });

  it('rejects a sourced mission limit with an unverified source, and a simulated one with an empty label', () => {
    const limit = (m: HealthIndicator['missionLimits'][number]): HealthIndicator => ({ ...sleepDefinition, missionLimits: [m] });
    expect(limitProblems(limit({ basis: 'sourced', measure: 'value', low: 1, high: 2, sourceIds: ['FIX-NO'] }), fixtureSources).join()).toContain(
      'not verified',
    );
    expect(limitProblems(limit({ basis: 'simulated-protocol', measure: 'value', low: 1, high: 2, label: '  ' }), fixtureSources).join()).toContain(
      'non-empty label',
    );
    expect(limitProblems(limit({ basis: 'made-up' as never, measure: 'value', low: 1, high: 2 } as never), fixtureSources).join()).toContain('invalid basis');
  });
});

/* ========================================================================== */
/* Part 2: displayed reference ranges follow A-20                              */
/* ========================================================================== */

const ID = 'astro-int';
const BASE = [7, 7.1, 6.9, 7, 7.1, 6.9, 7];

function sleepSeries(from: number, to: number, last = 30): HealthReading[] {
  const out: HealthReading[] = [];
  for (let d = 1; d <= last; d++) {
    out.push({ astronautId: ID, indicatorId: 'sleep', missionDay: d, value: d >= from && d <= to ? 3 : BASE[(d - 1) % 7], origin: 'seeded' });
  }
  return out;
}

function inputWith(overrides: Partial<HealthLogicInput> = {}): HealthLogicInput {
  const profile: CrewProfile = { astronautId: ID, displayName: 'Fixture', currentMissionDay: 30, trackedIndicators: ['sleep'] };
  return {
    profile,
    indicators,
    readings: sleepSeries(99, 99),
    symptoms: [],
    symptomDefinitions,
    sources,
    rules: prototypeRules,
    guidance: [],
    ...overrides,
  };
}

/** The invariant of A-20 and FR-SRC-03: a range is shown only when ALL its sources exist and are verified. */
function displayedRangeProblems(snapshot: HealthSnapshot, list: SourceReference[]): string[] {
  const problems: string[] = [];
  for (const status of snapshot.statuses) {
    for (const m of status.measures) {
      const where = `${status.indicatorId}.${m.measure}`;
      if (m.referenceRange === null) {
        if (m.referenceStatus !== 'not-assessed') problems.push(`${where}: has a status but no range.`);
      } else {
        for (const p of citationProblems(m.referenceRange.sourceIds, list)) problems.push(`${where}: displayed range ${p}`);
        if (m.referenceStatus === 'not-assessed' && m.latestValue !== null) problems.push(`${where}: range shown but not assessed.`);
      }
      if (m.missionLimit !== null) problems.push(`${where}: a mission limit is attached (none is allowed in the MVP).`);
    }
  }
  return problems;
}

describe('displayed reference ranges (A-20, FR-SRC-03)', () => {
  const withRange = (sourceIds: [string, ...string[]]): HealthIndicator[] => [
    { ...sleepDefinition, referenceRanges: [{ measure: 'value', low: 6, high: 9, sourceIds }] },
  ];
  const snapshotFor = (list: HealthIndicator[]) => computeSnapshot(inputWith({ indicators: list, sources: fixtureSources }));

  it('every seeded astronaut shows no range, no limit and "not-assessed"', () => {
    for (const seed of seedCrew) {
      const snap = computeSnapshot({ ...inputWith(), profile: seed.profile, readings: seed.readings, symptoms: seed.symptoms });
      expect(displayedRangeProblems(snap, sources), seed.profile.astronautId).toEqual([]);
      for (const s of snap.statuses) {
        for (const m of s.measures) expect([m.referenceStatus, m.referenceRange, m.missionLimit]).toEqual(['not-assessed', null, null]);
      }
    }
  });

  it('attaches a range only when all of its sources are verified', () => {
    const verified = snapshotFor(withRange(['FIX-OK'])).statuses[0].measures[0];
    expect(verified.referenceRange).toMatchObject({ sourceIds: ['FIX-OK'] });
    expect(verified.referenceStatus).toBe('within-reference');
    expect(displayedRangeProblems(snapshotFor(withRange(['FIX-OK'])), fixtureSources)).toEqual([]);
  });

  it('attaches nothing for an unverified, mixed or unknown source', () => {
    for (const ids of [['FIX-NO'], ['FIX-OK', 'FIX-NO'], ['MISSING']] as [string, ...string[]][]) {
      const m = snapshotFor(withRange(ids)).statuses[0].measures[0];
      expect([m.referenceStatus, m.referenceRange]).toEqual(['not-assessed', null]);
    }
  });

  it('the invariant checker catches a displayed range with an unverified source', () => {
    const snap = snapshotFor(withRange(['FIX-OK']));
    const tampered: HealthSnapshot = JSON.parse(JSON.stringify(snap));
    tampered.statuses[0].measures[0].referenceRange = { measure: 'value', low: 1, high: 2, sourceIds: ['FIX-NO'] };
    expect(displayedRangeProblems(tampered, fixtureSources).join()).toContain('not verified');
    tampered.statuses[0].measures[0].referenceRange = null;
    expect(displayedRangeProblems(tampered, fixtureSources).join()).toContain('has a status but no range');
  });
});

/* ========================================================================== */
/* Part 3: disease-name and diagnostic-wording scan (AT-SRC-06)                */
/* ========================================================================== */

/**
 * List A: disease and condition names. "fever" is deliberately not here (it is a symptom).
 * Spelling variants and inflections are listed explicitly. Plurals and other forms are NOT matched.
 */
const DISEASE_TERMS = [
  'hypertension', 'hypertensive', 'hypotension', 'hypotensive',
  'tachycardia', 'bradycardia', 'arrhythmia',
  'hyperthermia', 'hypothermia',
  'diabetes', 'diabetic',
  'hyperglycemia', 'hyperglycaemia', 'hypoglycemia', 'hypoglycaemia',
  'insomnia', 'sleep apnea', 'sleep apnoea', 'apnea', 'apnoea',
  'depression', 'anxiety',
  'infection', 'sepsis',
  'heart attack', 'myocardial infarction', 'stroke', 'cancer',
  'anemia', 'anaemia', 'hypoxia', 'dehydration',
  'decompression sickness', 'motion sickness', 'space adaptation syndrome', 'radiation sickness', 'osteoporosis',
];

/** List B: phrases that tell a person they have a condition. Broad words such as "indicates" are NOT included. */
const DIAGNOSTIC_PHRASES = [
  'you have a',
  'you may have',
  'you are suffering',
  'suffering from',
  'diagnosed with',
  'diagnosis of',
  'diagnose you',
];

/**
 * Text is lower-cased and spaces are collapsed. Two versions are checked so that hyphens do not hide a word:
 * hyphens as spaces ("sleep-apnea") and hyphens removed ("hyper-tension"). A term matches only as a whole word.
 *
 * Limitations: no misspellings, abbreviations (HTN), plurals ("strokes"), other languages or paraphrases.
 * "you have a" does not match "you have an".
 */
function normalise(text: string): string {
  return text.toLowerCase().replace(/[_\s]+/g, ' ').trim();
}

function matchesTerm(text: string, term: string): boolean {
  const variants = [normalise(text.replace(/-/g, ' ')), normalise(text.replace(/-/g, ''))];
  const pattern = new RegExp(`(?<![a-z])${normalise(term)}(?![a-z])`);
  return variants.some((v) => pattern.test(v));
}

/** Every list entry found in the text. */
function findDiseaseWording(text: string): string[] {
  return [...DISEASE_TERMS, ...DIAGNOSTIC_PHRASES].filter((term) => matchesTerm(text, term));
}

/** Text of a sourced field: only 'sourced' content has text. */
function sourcedText(value: { status: string; content?: unknown } | null): string[] {
  if (!value || value.status !== 'sourced') return [];
  return Array.isArray(value.content) ? value.content.map(String) : [String(value.content)];
}

/**
 * User-facing text from the data files. Source titles, organisation names, `supports` text and URLs are NOT
 * included: they are bibliographic metadata and must keep the original source wording.
 */
function staticText(): { where: string; text: string }[] {
  const out: { where: string; text: string }[] = [];
  const add = (where: string, text: string) => out.push({ where, text });

  for (const i of indicators) {
    add(`${i.id}.displayName`, i.displayName);
    for (const m of i.measures) {
      add(`${i.id}.${m.key}.label`, m.label);
      add(`${i.id}.${m.key}.unit`, m.unit);
    }
    for (const t of sourcedText(i.hazards)) add(`${i.id}.hazards`, t);
    for (const t of sourcedText(i.howToMeasure)) add(`${i.id}.howToMeasure`, t);
    for (const t of sourcedText(i.whyItMatters)) add(`${i.id}.whyItMatters`, t);
    for (const t of sourcedText(i.contextNote)) add(`${i.id}.contextNote`, t);
    for (const l of i.missionLimits) if (l.basis === 'simulated-protocol') add(`${i.id}.missionLimit.label`, l.label);
  }
  for (const s of symptomDefinitions) {
    add(`symptom ${s.id}.label`, s.label);
    for (const t of sourcedText(s.note)) add(`symptom ${s.id}.note`, t);
  }
  for (const e of alertLegend) {
    add(`legend ${e.level}.label`, e.label);
    add(`legend ${e.level}.description`, e.description);
  }
  for (const r of prototypeRules.alertRules) add(`rule ${r.ruleId}.description`, r.description);
  add('ui.labels.DISCLAIMER', DISCLAIMER);
  for (const [id, label] of Object.entries(alertRuleLabels)) add(`alertRuleLabels.${id}`, label);
  return out;
}

/* ----- Logic-generated text: alert reasons and labels, and check-in error messages ----- */

/** Readings: normal values, then 3 (far below) for sleep or 120 (far above) for heart rate, from `from` to `to`. */
function makeReadings(indicatorId: 'sleep' | 'heart-rate', from: number, to: number, last = 30): HealthReading[] {
  const sleepBase = BASE;
  const heartBase = [60, 61, 59, 60, 61, 59, 60];
  const out: HealthReading[] = [];
  for (let d = 1; d <= last; d++) {
    const deviates = d >= from && d <= to;
    out.push(
      indicatorId === 'sleep'
        ? { astronautId: ID, indicatorId, missionDay: d, value: deviates ? 3 : sleepBase[(d - 1) % 7], origin: 'seeded' }
        : { astronautId: ID, indicatorId, missionDay: d, value: deviates ? 120 : heartBase[(d - 1) % 7], origin: 'seeded' },
    );
  }
  return out;
}

function makePressure(sysFrom: number, diaFrom: number, to = 30, last = 30): HealthReading[] {
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

const symptomOn = (missionDay: number, symptomId = 'tiredness'): SymptomReport => ({ astronautId: ID, symptomId, missionDay, origin: 'seeded' });

interface Scenario {
  name: string;
  tracked: IndicatorId[];
  readings: HealthReading[];
  symptoms: SymptomReport[];
}

/** Synthetic scenarios that together produce every alert rule. */
const scenarios: Scenario[] = [
  { name: 'two indicators sustained, with a symptom', tracked: ['sleep', 'heart-rate'], readings: [...makeReadings('sleep', 26, 30), ...makeReadings('heart-rate', 27, 30)], symptoms: [symptomOn(28)] },
  { name: 'one indicator sustained', tracked: ['sleep'], readings: makeReadings('sleep', 27, 30), symptoms: [] },
  { name: 'one indicator sustained with a symptom', tracked: ['sleep'], readings: makeReadings('sleep', 27, 30), symptoms: [symptomOn(28, 'headache')] },
  { name: 'deviation not yet sustained', tracked: ['sleep'], readings: makeReadings('sleep', 29, 30), symptoms: [] },
  { name: 'symptom only', tracked: ['sleep'], readings: makeReadings('sleep', 99, 99), symptoms: [symptomOn(30, 'nausea')] },
  { name: 'pending day', tracked: ['sleep'], readings: makeReadings('sleep', 27, 29, 29), symptoms: [symptomOn(30, 'dizziness')] },
  { name: 'sustained blood pressure (systolic only)', tracked: ['blood-pressure'], readings: makePressure(27, 99), symptoms: [symptomOn(29)] },
  { name: 'sustained blood pressure (both numbers)', tracked: ['blood-pressure'], readings: makePressure(26, 28), symptoms: [] },
  { name: 'building baseline', tracked: ['sleep'], readings: makeReadings('sleep', 4, 5, 6).filter((r) => r.missionDay <= 5), symptoms: [] },
];

function snapshotOfScenario(s: Scenario): HealthSnapshot {
  const profile: CrewProfile = { astronautId: ID, displayName: 'Fixture', currentMissionDay: s.name === 'building baseline' ? 5 : 30, trackedIndicators: s.tracked as CrewProfile['trackedIndicators'] };
  return computeSnapshot(inputWith({ profile, readings: s.readings, symptoms: s.symptoms }));
}

function alertText(snapshot: HealthSnapshot): { where: string; text: string }[] {
  return snapshot.alerts.flatMap((a) => [
    { where: `${a.id}.ruleLabel`, text: a.ruleLabel },
    ...a.reasons.map((reason, n) => ({ where: `${a.id}.reasons[${n}]`, text: reason })),
  ]);
}

/** Error messages of many invalid check-ins, so every message template is produced at least once. */
function checkInMessages(): { where: string; text: string }[] {
  const profile = seedCrew[0].profile; // astro-1: no glucose
  const sub = (values: CheckInValue[], symptomIds: string[] = [], over: Partial<CheckInSubmission> = {}): CheckInSubmission => ({
    astronautId: profile.astronautId,
    missionDay: profile.currentMissionDay,
    values,
    symptomIds,
    ...over,
  });
  const bad = (n: number): CheckInValue[] =>
    indicators
      .filter((i) => i.id !== 'blood-pressure' && i.id !== 'blood-glucose')
      .map((i) => ({ indicatorId: i.id, value: n }) as CheckInValue);

  const submissions: [string, CheckInSubmission, HealthIndicator[]?][] = [
    ['too high', sub(bad(1e6)), undefined],
    ['too low', sub(bad(-1e6)), undefined],
    ['not a number', sub(bad(Number.NaN)), undefined],
    ['mood decimal', sub([{ indicatorId: 'mood', value: 3.5 }]), undefined],
    ['pressure order', sub([{ indicatorId: 'blood-pressure', systolic: 100, diastolic: 110 }]), undefined],
    ['pressure limits', sub([{ indicatorId: 'blood-pressure', systolic: 900, diastolic: 5 }]), undefined],
    ['pressure missing number', sub([{ indicatorId: 'blood-pressure', systolic: 120 } as unknown as CheckInValue]), undefined],
    ['empty', sub([]), undefined],
    ['wrong astronaut', sub([{ indicatorId: 'sleep', value: 7 }], [], { astronautId: 'astro-2' }), undefined],
    ['wrong day', sub([{ indicatorId: 'sleep', value: 7 }], [], { missionDay: 1 }), undefined],
    ['unknown symptom', sub([], ['not-a-symptom']), undefined],
    ['untracked glucose', sub([{ indicatorId: 'blood-glucose', value: 5 }]), undefined],
    ['duplicate indicator', sub([{ indicatorId: 'sleep', value: 7 }, { indicatorId: 'sleep', value: 6 }]), undefined],
    ['no definition', sub([{ indicatorId: 'sleep', value: 7 }]), indicators.filter((i) => i.id !== 'sleep')],
  ];

  const out: { where: string; text: string }[] = [];
  for (const [name, submission, defs] of submissions) {
    const result = validateCheckIn(submission, profile, defs ?? indicators);
    if (result.ok) throw new Error(`The "${name}" submission was expected to be rejected.`);
    result.errors.forEach((e, n) => out.push({ where: `check-in "${name}"[${n}]`, text: e.message }));
  }
  return out;
}

describe('disease-name scan: scanner self-tests', () => {
  const allEntries = [...DISEASE_TERMS, ...DIAGNOSTIC_PHRASES];

  it('detects every List A term and List B phrase', () => {
    for (const entry of allEntries) {
      expect(findDiseaseWording(`The note mentions ${entry} here.`), entry).toContain(entry);
    }
  });

  it('detects upper case and hyphen variations of every entry', () => {
    for (const entry of allEntries) {
      const hyphenated = entry.includes(' ')
        ? entry.replace(/ /g, '-')
        : `${entry.slice(0, Math.floor(entry.length / 2))}-${entry.slice(Math.floor(entry.length / 2))}`;
      expect(findDiseaseWording(entry.toUpperCase()), `upper ${entry}`).toContain(entry);
      expect(findDiseaseWording(`Note: ${hyphenated}.`), `hyphen ${entry}`).toContain(entry);
    }
  });

  it('does not flag the approved symptom labels', () => {
    for (const s of symptomDefinitions) expect(findDiseaseWording(s.label), s.label).toEqual([]);
  });

  it('does not flag "not a diagnosis", "does not diagnose" or the disclaimer text', () => {
    for (const text of ['This is not a diagnosis.', 'It does not diagnose.', 'Decision support, not diagnosis.', DISCLAIMER]) {
      expect(findDiseaseWording(text), text).toEqual([]);
    }
  });

  it('does not flag partial words', () => {
    for (const text of ['keystroke', 'Keystrokes', 'cancellation', 'depressions are not listed', 'you have another']) {
      expect(findDiseaseWording(text), text).toEqual([]);
    }
  });

  it('does not flag broad words that were deliberately left out', () => {
    for (const text of ['fever', 'This indicates a change.', 'It suggests nothing.', 'due to a gap', 'caused by a gap', 'an abnormal day', 'unhealthy', 'dangerous']) {
      expect(findDiseaseWording(text), text).toEqual([]);
    }
  });

  it('has no duplicate entries, and none matches an approved symptom label or ID', () => {
    const normalised = allEntries.map((e) => normalise(e));
    expect(new Set(normalised).size).toBe(normalised.length);
    const symptomNames = symptomDefinitions.flatMap((s) => [normalise(s.label), normalise(s.id.replace(/-/g, ' '))]);
    for (const entry of normalised) expect(symptomNames).not.toContain(entry);
  });

  it('List A does not contain "fever" and List B has only the approved phrases', () => {
    expect(DISEASE_TERMS).not.toContain('fever');
    expect(DIAGNOSTIC_PHRASES).toEqual([
      'you have a', 'you may have', 'you are suffering', 'suffering from', 'diagnosed with', 'diagnosis of', 'diagnose you',
    ]);
  });
});

describe('disease-name scan: user-facing text', () => {
  const flagged = (items: { where: string; text: string }[]) =>
    items.map((i) => ({ where: i.where, found: findDiseaseWording(i.text) })).filter((i) => i.found.length > 0);

  it('collects a meaningful amount of static text (the scan is not empty)', () => {
    const texts = staticText();
    expect(texts.length).toBeGreaterThan(40);
    expect(texts.every((t) => t.text.trim() !== '')).toBe(true);
    // Source metadata is excluded on purpose.
    expect(texts.some((t) => sources.some((s) => t.text === s.title || t.text === s.supports))).toBe(false);
  });

  it('indicator, symptom, legend, rule and disclaimer text has no disease name or diagnostic phrase', () => {
    expect(flagged(staticText())).toEqual([]);
  });

  it('would catch wording added to a sourced field', () => {
    const edited: HealthIndicator = { ...sleepDefinition, whyItMatters: { status: 'sourced', content: 'This can point to insomnia.', sourceIds: ['REF-02'] } };
    const found = sourcedText(edited.whyItMatters).flatMap((t) => findDiseaseWording(t));
    expect(found).toEqual(['insomnia']);
  });

  it('alert reasons and labels of the four seeded astronauts have none', () => {
    const items = seedCrew.flatMap((seed) =>
      alertText(computeSnapshot({ ...inputWith(), profile: seed.profile, readings: seed.readings, symptoms: seed.symptoms })).map((i) => ({
        where: `${seed.profile.astronautId} ${i.where}`,
        text: i.text,
      })),
    );
    expect(items.length).toBeGreaterThan(5);
    expect(flagged(items)).toEqual([]);
  });

  it('alert reasons and labels of the synthetic scenarios have none, and every alert rule is produced', () => {
    const snapshots = scenarios.map(snapshotOfScenario);
    const items = snapshots.flatMap(alertText);
    expect(items.length).toBeGreaterThan(15);
    expect(flagged(items)).toEqual([]);

    const produced = new Set<AlertRuleId>(snapshots.flatMap((s) => s.alerts.map((a) => a.ruleId)));
    expect([...produced].sort()).toEqual(Object.keys(alertRuleLabels).sort());
  });

  it('check-in error messages have none', () => {
    const messages = checkInMessages();
    expect(messages.length).toBeGreaterThan(15);
    expect(flagged(messages)).toEqual([]);
  });
});
