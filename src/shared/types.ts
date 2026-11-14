/**
 * GLORPULSE shared types
 * ----------------------
 * The contract between Person A (health logic and data) and Person B (screens and storage).
 *
 * Rules for this file:
 *  - Types only: no functions, no React, no localStorage.
 *  - Person A proposes changes, Person B reviews. After the freeze, both must agree to change it.
 *  - All data is simulated. Nothing here is a medical threshold.
 *
 * Layout of the file:
 *  0. Building blocks
 *  1. Fixed definitions            (written by Person A, never edited by the user)
 *  2. Stored records and check-in  (seeded in code, or entered by the user)
 *  3. Derived results (MVP)        (calculated by Person A. NEVER saved)
 *  4. Contract for Person A's logic (MVP)
 *  5. DIFF features                (build only after the MVP gate in requirements 1.1)
 *  6. What is saved in localStorage (Person B)
 */

/* ========================================================================== */
/* 0. Building blocks                                                         */
/* ========================================================================== */

/** Unique ID of one simulated astronaut, for example "astro-1". */
export type AstronautId = string;

/** Day number in the simulated mission: 1, 2, 3 ... (not a calendar date). */
export type MissionDay = number;

/** ID of an entry in references.md, for example "REF-02". */
export type SourceId = string;

/** ID of a predefined symptom, for example "headache". The list itself is pending research. */
export type SymptomId = string;

/** Real-world time as text, for example "2026-11-14T09:30:00Z". Used only by briefings and the outbox. */
export type IsoTimestamp = string;

/** Indicators that have ONE number. */
export type SingleValueIndicatorId =
  | "heart-rate"
  | "body-temperature"
  | "blood-glucose" // optional per astronaut, see CrewProfile.trackedIndicators
  | "sleep"
  | "mood";

/** All six indicators. Blood pressure is the only one with TWO numbers. */
export type IndicatorId = SingleValueIndicatorId | "blood-pressure";

/**
 * One measured number inside an indicator.
 * Single-value indicators use 'value'. Blood pressure uses 'systolic' and 'diastolic'.
 * Baselines, positions, runs and reference status are worked out separately for each measure.
 */
export type MeasureKey = "value" | "systolic" | "diastolic";

/** The five NASA hazards of human spaceflight (REF-01). */
export type HazardTag =
  | "space-radiation"
  | "isolation-and-confinement"
  | "distance-from-earth"
  | "altered-gravity"
  | "hostile-closed-environment";

/** An array that always has at least one item. */
export type NonEmptyArray<T> = [T, ...T[]];

/**
 * Content that must be sourced.
 * Either it carries at least one source ID, or it says there is no sourced guidance.
 * The screen shows "No sourced guidance available" for the second case.
 */
export type Sourced<T> =
  | { status: "sourced"; content: T; sourceIds: NonEmptyArray<SourceId> }
  | { status: "no-sourced-guidance" };

/** Sourced plain-language text. */
export type GuidanceText = Sourced<string>;

/** Where a record came from. */
export type RecordOrigin = "seeded" | "entered";

/* ========================================================================== */
/* 1. Fixed definitions (written by Person A)                                 */
/* ========================================================================== */

/** A source listed in references.md. */
export interface SourceReference {
  id: SourceId;
  title: string;
  organisation: string;
  url: string;
  /** What this source is used to support. */
  supports: string;
  /** 'verified' only after the FULL document was read. A search snippet is not enough. */
  verification: "verified" | "not-yet-verified";
}

/** Definition of one measure inside an indicator. */
export interface MeasureDefinition {
  key: MeasureKey;
  /** For example "Systolic". */
  label: string;
  /** For example "mmHg". */
  unit: string;
  /** Entry limits only reject typing errors. They are NOT clinical thresholds. */
  entryMin: number;
  entryMax: number;
  /** Smallest spread allowed when comparing with a baseline (prototype design choice, pending). */
  spreadFloor: number;
}

/**
 * KIND 2 of 3: a general clinical reference range. Needs a source.
 * It is passed on to the screens only if its sources are verified.
 */
export interface ReferenceRange {
  measure: MeasureKey;
  low: number | null;
  high: number | null;
  sourceIds: NonEmptyArray<SourceId>;
}

/**
 * KIND 3 of 3: a mission-approved limit.
 * Pending. Empty unless it is sourced or explicitly labelled a simulated protocol.
 */
export type MissionLimit =
  | {
      basis: "sourced";
      measure: MeasureKey;
      low: number | null;
      high: number | null;
      sourceIds: NonEmptyArray<SourceId>;
    }
  | {
      basis: "simulated-protocol";
      measure: MeasureKey;
      low: number | null;
      high: number | null;
      label: string;
    };

/**
 * Definition of one measurement.
 * Kind 1 (the personal baseline) is NOT here, because a baseline belongs to one astronaut.
 * Blood pressure has two items in `measures` (systolic, diastolic). The others have one ('value').
 */
export interface HealthIndicator {
  id: IndicatorId;
  displayName: string;
  measures: NonEmptyArray<MeasureDefinition>;
  /** Empty array means: no sourced reference range exists. */
  referenceRanges: ReferenceRange[];
  /** Empty array in the MVP. */
  missionLimits: MissionLimit[];
  /** Which hazards may be relevant. Only where a source supports the link. */
  hazards: Sourced<HazardTag[]>;
  howToMeasure: GuidanceText;
  whyItMatters: GuidanceText;
  /** Context and limitations note (needed for blood glucose). null when not needed. */
  contextNote: GuidanceText | null;
}

/** One symptom in the predefined list (the list is pending research). */
export interface SymptomDefinition {
  id: SymptomId;
  label: string;
  note: GuidanceText;
}

/** One simulated astronaut. */
export interface CrewProfile {
  astronautId: AstronautId;
  displayName: string;
  /** The day the check-in applies to. The MVP has no control to change it (demo: day 30). */
  currentMissionDay: MissionDay;
  /**
   * Which indicators this astronaut tracks.
   * Blood glucose is listed only for astronauts where it applies.
   * An indicator not listed has no card, no input, no chart and no missing-data alert.
   */
  trackedIndicators: NonEmptyArray<IndicatorId>;
}

/* ========================================================================== */
/* 2. Stored records and check-in                                             */
/* ========================================================================== */

/** Fields every reading has. */
interface ReadingBase {
  astronautId: AstronautId;
  missionDay: MissionDay;
  origin: RecordOrigin;
}

/** A reading of an ordinary indicator: ONE number. */
export interface SingleValueReading extends ReadingBase {
  indicatorId: SingleValueIndicatorId;
  value: number;
}

/** A blood pressure reading: BOTH numbers are required. */
export interface BloodPressureReading extends ReadingBase {
  indicatorId: "blood-pressure";
  systolic: number;
  diastolic: number;
}

/**
 * One recorded measurement. TypeScript checks `indicatorId` to know which fields exist.
 * Only one reading may exist per astronaut + indicator + mission day.
 * If a seeded and an entered reading share that key, the ENTERED one wins.
 */
export type HealthReading = SingleValueReading | BloodPressureReading;

/** One logged symptom. The same symptom on the same day is kept once. */
export interface SymptomReport {
  astronautId: AstronautId;
  symptomId: SymptomId;
  missionDay: MissionDay;
  origin: RecordOrigin;
}

/** Records written by Person A in the seed files. */
export type SeededReading = HealthReading & { origin: "seeded" };
export type SeededSymptom = SymptomReport & { origin: "seeded" };

/** Records typed in by the user (the only kind saved in localStorage). */
export type EnteredReading = HealthReading & { origin: "entered" };
export type EnteredSymptom = SymptomReport & { origin: "entered" };

/** Seed file for one astronaut. Only seeded records are accepted. */
export interface AstronautSeed {
  profile: CrewProfile;
  readings: SeededReading[];
  symptoms: SeededSymptom[];
}

/** One value typed into the check-in form. Same shape rule as a reading. */
export type CheckInValue =
  | { indicatorId: SingleValueIndicatorId; value: number }
  | { indicatorId: "blood-pressure"; systolic: number; diastolic: number };

/**
 * What the check-in form submits.
 * missionDay must equal the astronaut's current mission day. There is no day picker.
 * An indicator the user skipped is simply missing from `values`.
 */
export interface CheckInSubmission {
  astronautId: AstronautId;
  missionDay: MissionDay;
  values: CheckInValue[];
  symptomIds: SymptomId[];
}

export interface CheckInError {
  /** Which part of the form the message belongs to. */
  field: IndicatorId | "symptoms" | "form";
  /** For blood pressure: which of the two numbers. */
  measure?: MeasureKey;
  message: string;
}

export type CheckInValidationResult =
  | { ok: true }
  | { ok: false; errors: CheckInError[] };

/* ========================================================================== */
/* 3. Derived results (MVP). Calculated by Person A. NEVER saved.             */
/* ========================================================================== */

/** KIND 1 of 3: the astronaut's own baseline for one measure. */
interface BaselineBase {
  astronautId: AstronautId;
  indicatorId: IndicatorId;
  measure: MeasureKey;
  daysCounted: number;
  /** 7 in the prototype. */
  daysRequired: number;
}

/** Fewer than 7 days of readings. No centre, band or comparison exists yet. */
export interface BuildingBaseline extends BaselineBase {
  state: "building";
}

export interface ReadyBaseline extends BaselineBase {
  state: "ready";
  /** The median of the baseline readings. */
  centre: number;
  /** Median absolute deviation, already raised to the spread floor if it was smaller. */
  spread: number;
  /** Edges of the baseline band drawn on charts (centre minus/plus K times spread). */
  bandLow: number;
  bandHigh: number;
  /** The mission days that formed the baseline (the first 7 days with readings). */
  windowDays: MissionDay[];
}

export type PersonalBaseline = BuildingBaseline | ReadyBaseline;

/** Where the latest reading sits compared with the astronaut's own baseline. Not a trend. */
export type BaselinePosition =
  | "above-baseline"
  | "within-baseline"
  | "below-baseline"
  | "not-enough-data";

/** Compared with a general reference range. 'not-assessed' when no verified range exists. */
export type ReferenceStatus =
  | "within-reference"
  | "outside-reference"
  | "not-assessed";

export type DeviationDirection = "above" | "below";

/** A series of consecutive days deviating in the same direction. */
export interface DeviationRun {
  /** 0 when there is no run. */
  length: number;
  /** null when length is 0. */
  direction: DeviationDirection | null;
  /** First day of the run. null when length is 0. */
  startDay: MissionDay | null;
  /** true when length is at least the "sustained" limit (3 in the prototype). */
  isSustained: boolean;
}

/**
 * The judgement for ONE measure (blood pressure has two of these).
 * The three kinds of comparison are separate fields: `baseline`, `referenceRange`, `missionLimit`.
 */
export interface MeasureStatus {
  measure: MeasureKey;
  /** The latest value of this measure. For the day, see HealthStatus.latestReading. */
  latestValue: number | null;

  /** Kind 1: the astronaut's own baseline. */
  baseline: PersonalBaseline;
  position: BaselinePosition;
  run: DeviationRun;

  /** Kind 2: reference status for this measure. */
  referenceStatus: ReferenceStatus;
  /** Set only if a verified reference range exists for this measure, otherwise null. */
  referenceRange: ReferenceRange | null;

  /** Kind 3: null in the MVP. */
  missionLimit: MissionLimit | null;
}

/** The judgement for one indicator. This is what one dashboard card shows. */
export interface HealthStatus {
  astronautId: AstronautId;
  indicatorId: IndicatorId;
  latestReading: HealthReading | null;
  /** How many mission days ago the latest reading was. null if there is none. */
  daysSinceLatestReading: number | null;
  /** true when no reading has been recorded yet for the current mission day. */
  todayPending: boolean;
  /** Past mission days with no reading (the current day is not listed while pending). Charts show gaps. */
  missingDays: MissionDay[];
  /** One item, or two for blood pressure (systolic, diastolic). */
  measures: NonEmptyArray<MeasureStatus>;
}

/**
 * Levels that the app can generate automatically.
 * 'contact-flight-surgeon' is deliberately NOT here: it has no automatic trigger until D-10 is decided.
 * A HealthAlert can therefore never carry that level.
 */
export type AlertLevel = "info" | "watch" | "action";

/** Levels shown in the legend. */
export type LegendAlertLevel = AlertLevel | "contact-flight-surgeon";

/** Which prototype rule produced an alert. */
export type AlertRuleId =
  | "deviation-not-yet-sustained"
  | "symptom-logged"
  | "sustained-deviation"
  | "sustained-with-second-indicator"
  | "sustained-with-symptom";

/**
 * An alert. Recalculated every time. Never saved.
 * There is at most one alert per indicator (its highest applicable level),
 * plus possibly one Info alert about a symptom with no indicator.
 */
export interface HealthAlert {
  /** Built from astronaut, indicator and rule, for example "astro-1:sleep:sustained-deviation". */
  id: string;
  astronautId: AstronautId;
  /** null only for an Info alert about a symptom. */
  indicatorId: IndicatorId | null;
  /** Which measures triggered it. For blood pressure: 'systolic', 'diastolic' or both. */
  measures: MeasureKey[];
  level: AlertLevel;
  ruleId: AlertRuleId;
  /** Plain-language name of the rule, shown to the user. */
  ruleLabel: string;
  /** Plain sentences built from the astronaut's own numbers. No medical interpretation. */
  reasons: string[];
  /** First day of the run behind this alert. null for a symptom-only Info alert. */
  runStartDay: MissionDay | null;
  /** Other indicators involved (for the "second indicator" Action rule). */
  relatedIndicatorIds: IndicatorId[];
  /** Symptoms involved. */
  symptomIds: SymptomId[];
}

/** One line of the alert legend. The Contact Flight Surgeon line can never claim an automatic trigger. */
export type AlertLegendEntry =
  | {
      level: AlertLevel;
      label: string;
      description: string;
      hasAutomaticTrigger: true;
    }
  | {
      level: "contact-flight-surgeon";
      label: string;
      description: string;
      hasAutomaticTrigger: false;
    };

/** One visible rule, so screens never hard-code rule wording. */
export interface AlertRuleDescription {
  ruleId: AlertRuleId;
  level: AlertLevel;
  description: string;
}

/** The numbers and wording of the prototype rules. */
export interface PrototypeRules {
  /** 7 in the prototype. */
  baselineDays: number;
  /** K = 3 in the prototype. */
  deviationK: number;
  /** 3 in the prototype. */
  sustainedDays: number;
  alertRules: AlertRuleDescription[];
}

/** Everything a screen needs for ONE astronaut at one moment. Derived. Never saved. */
export interface HealthSnapshot {
  astronautId: AstronautId;
  /** The astronaut's current mission day. */
  evaluatedOnDay: MissionDay;
  /** One item per tracked indicator. */
  statuses: HealthStatus[];
  /** Info, Watch and Action alerts only. An empty array means "No active alerts". */
  alerts: HealthAlert[];
  /** DIFF. Empty array until the Why Now feature is built. */
  explanations: HealthExplanation[];
  alertLegend: AlertLegendEntry[];
  rules: PrototypeRules;
  /** Copies of the records used (seeded and entered, combined), so charts match the calculations. */
  readings: HealthReading[];
  symptoms: SymptomReport[];
  /** Always true. Used for the "all data is simulated" notice. */
  isSimulatedData: true;
}

/* ========================================================================== */
/* 4. Contract for Person A's logic (MVP)                                     */
/* ========================================================================== */

/**
 * Everything Person A's logic needs.
 * ONE astronaut only. Records with a different astronautId must be rejected (throw an error), not ignored.
 * `readings` and `symptoms` contain seeded and entered records together.
 */
export interface HealthLogicInput {
  profile: CrewProfile;
  indicators: HealthIndicator[];
  readings: HealthReading[];
  symptoms: SymptomReport[];
  symptomDefinitions: SymptomDefinition[];
  sources: SourceReference[];
  rules: PrototypeRules;
  /** DIFF. May be empty. */
  guidance: GuidanceEntry[];
}

/** The main connection: records in, snapshot out. Pure: no React, no localStorage. */
export type ComputeSnapshot = (input: HealthLogicInput) => HealthSnapshot;

/** Checks a check-in before it is saved. Applies the entry limits and the current-day rule. */
export type ValidateCheckIn = (
  submission: CheckInSubmission,
  profile: CrewProfile,
  indicators: HealthIndicator[],
) => CheckInValidationResult;

/**
 * Applies the replacement rule: a later value for the same indicator on the same mission day
 * replaces the earlier entered one, and a repeated symptom on the same day is kept once.
 * Returns the new lists of ENTERED records. Person B saves them.
 */
export type ApplyCheckIn = (
  enteredReadings: EnteredReading[],
  enteredSymptoms: EnteredSymptom[],
  submission: CheckInSubmission,
) => { enteredReadings: EnteredReading[]; enteredSymptoms: EnteredSymptom[] };

/* ========================================================================== */
/* 5. DIFF features (start only after the MVP gate in requirements 1.1)       */
/* ========================================================================== */

/** The sourced guidance table that feeds parts 3 to 5 of Why Now. May be empty. */
export interface GuidanceEntry {
  indicatorId: IndicatorId;
  situation: "sustained-above" | "sustained-below";
  whyItMatters: GuidanceText;
  hazards: Sourced<HazardTag[]>;
  nextSteps: GuidanceText;
}

/** The six-part Why Now explanation for one alert. */
export interface HealthExplanation {
  alertId: string;
  astronautId: AstronautId;
  indicatorId: IndicatorId | null;
  /** Part 1. Built from the astronaut's own data. */
  whatChanged: string;
  /** Part 2: kind 1, the personal baseline. Built from the astronaut's own data. */
  baselineComparison: string;
  /** Kind 2, shown separately. Text such as "No sourced reference range available" is allowed. */
  referenceRangeNote: string;
  /** Kind 3, shown separately. Text such as "not available" is allowed. */
  missionLimitNote: string;
  /** Part 3. */
  whyItMatters: GuidanceText;
  /** Part 4. */
  hazards: Sourced<HazardTag[]>;
  /** Part 5. */
  nextSteps: GuidanceText;
  /** Part 6. */
  whenToContactFlightSurgeon: {
    /** The rule that applies to this alert, in plain words. */
    appliedRule: string;
    /** false until D-10 is decided. */
    automaticContactRuleDefined: boolean;
    guidance: GuidanceText;
  };
  /** All source IDs used above. */
  sourceIds: SourceId[];
  disclaimer: string;
}

/** The report intended for a flight surgeon. A saved document: a frozen copy made at creation time. */
export interface FlightSurgeonBriefing {
  id: string;
  astronautId: AstronautId;
  astronautName: string;
  createdAt: IsoTimestamp;
  createdOnMissionDay: MissionDay;
  periodFromDay: MissionDay;
  periodToDay: MissionDay;
  /** Copy of the snapshot at creation time (statuses, alerts, explanations, readings, symptoms). */
  snapshot: HealthSnapshot;
  /** Sources used. */
  sources: SourceReference[];
  /** States that the data is simulated and that nothing is transmitted. */
  simulationNotice: string;
  disclaimer: string;
}

/** Simulated link: a screen setting, not an astronaut record. */
export type LinkState = "up" | "down";

/** States of a briefing in the simulated outbox. None of them means real transmission. */
export type OutboxState = "draft" | "queued-simulated" | "sent-simulated";

export interface OutboxItem {
  id: string;
  astronautId: AstronautId;
  briefingId: string;
  state: OutboxState;
  createdAt: IsoTimestamp;
  queuedAt: IsoTimestamp | null;
  sentAt: IsoTimestamp | null;
  /** Always true. Reminds everyone that nothing is really sent. */
  isSimulated: true;
}

/** Builds the briefing from a snapshot. Person A decides the period covered. */
export type CreateBriefing = (
  snapshot: HealthSnapshot,
  profile: CrewProfile,
  sources: SourceReference[],
  createdAt: IsoTimestamp,
) => FlightSurgeonBriefing;

/** Adds a briefing to the outbox. Link down gives 'queued-simulated'. Link up gives 'sent-simulated'. */
export type AddToOutbox = (
  briefing: FlightSurgeonBriefing,
  link: LinkState,
  now: IsoTimestamp,
) => OutboxItem;

/** When the link goes up, queued items become 'sent-simulated'. */
export type UpdateOutbox = (
  items: OutboxItem[],
  link: LinkState,
  now: IsoTimestamp,
) => OutboxItem[];

/* ========================================================================== */
/* 6. What is saved in localStorage (Person B)                                */
/* ========================================================================== */

/**
 * MVP storage: one object per astronaut, under a key that contains the astronautId.
 * It holds ONLY records the user typed in. Seeded data lives in the code.
 * Derived results (baselines, positions, runs, alerts, statuses, snapshots) are never saved.
 * Reset deletes these objects.
 */
export interface StoredAstronautData {
  /** Increase when the shape changes, so old data can be detected and reset. */
  storageVersion: number;
  astronautId: AstronautId;
  enteredReadings: EnteredReading[];
  enteredSymptoms: EnteredSymptom[];
}

/**
 * DIFF storage: kept apart from the MVP data on purpose.
 * A briefing is a document saved as it was when created, so it contains a frozen copy of a snapshot.
 * That is the one deliberate exception to "derived results are not saved".
 * It is never used as input to any calculation. Reset deletes it too.
 */
export interface StoredBriefingData {
  storageVersion: number;
  astronautId: AstronautId;
  briefings: FlightSurgeonBriefing[];
  outbox: OutboxItem[];
}
