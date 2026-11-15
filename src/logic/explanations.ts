import type {
  AstronautId,
  GuidanceEntry,
  GuidanceText,
  HazardTag,
  HealthAlert,
  HealthExplanation,
  HealthIndicator,
  HealthStatus,
  MeasureStatus,
  MissionDay,
  Sourced,
  SourceId,
  SymptomDefinition,
} from '../shared/types';

/**
 * Why Now explanations (Phase 1 of the differentiating features).
 *
 * Only the astronaut's own data and the already calculated baseline, position and run results are used.
 * Nothing here is a medical threshold or advice. Parts 3 to 5 come from the sourced guidance table
 * only. With no matching entry they say "no sourced guidance" (the screen shows
 * "No sourced guidance available"). Pure: no clock, no storage, no randomness.
 */

/** Same wording as DISCLAIMER in ui/labels.ts (a test keeps them equal). The logic does not import the UI. */
export const EXPLANATION_DISCLAIMER =
  'Decision support only. Not a diagnosis or a medical device. It does not replace medical professionals or mission protocols.';

const NO_GUIDANCE: GuidanceText = { status: 'no-sourced-guidance' };
const NO_HAZARDS: Sourced<HazardTag[]> = { status: 'no-sourced-guidance' };

export interface ExplanationContext {
  indicators: HealthIndicator[];
  /** The statuses of the same astronaut, as calculated by the snapshot. */
  statuses: HealthStatus[];
  /** The sourced guidance table. May be empty. */
  guidance: GuidanceEntry[];
  symptomDefinitions: SymptomDefinition[];
  evaluatedOnDay: MissionDay;
}

function days(n: number): string {
  return n === 1 ? '1 day' : `${n} days`;
}

function dayList(list: MissionDay[]): string {
  if (list.length === 1) return `day ${list[0]}`;
  const sorted = [...list].sort((a, b) => a - b);
  const consecutive = sorted.every((d, i) => i === 0 || d === sorted[i - 1] + 1);
  // Consecutive days read as a range ("days 1–7"). Anything else stays a list.
  return consecutive && sorted.length > 2
    ? `days ${sorted[0]}–${sorted[sorted.length - 1]}`
    : `days ${sorted.join(', ')}`;
}

function withUnit(value: number, unit: string): string {
  return unit === 'score' ? String(value) : `${value} ${unit}`;
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function measureName(indicator: HealthIndicator, measure: MeasureStatus): string {
  if (indicator.measures.length === 1) return indicator.displayName;
  const label = indicator.measures.find((m) => m.key === measure.measure)?.label ?? measure.measure;
  return `${indicator.displayName} (${label.toLowerCase()})`;
}

function unitOf(indicator: HealthIndicator, measure: MeasureStatus): string {
  return indicator.measures.find((m) => m.key === measure.measure)?.unit ?? '';
}

function symptomNames(alert: HealthAlert, definitions: SymptomDefinition[]): string {
  return alert.symptomIds.map((id) => definitions.find((d) => d.id === id)?.label ?? id).join(', ');
}

const POSITION_TEXT = {
  'above-baseline': 'above',
  'within-baseline': 'within',
  'below-baseline': 'below',
} as const;

/** Sources used by one guidance part, if it is sourced. */
function idsOf(part: Sourced<unknown>): SourceId[] {
  return part.status === 'sourced' ? [...part.sourceIds] : [];
}

/**
 * Builds the six-part explanation of ONE alert.
 * Throws if the alert and the statuses belong to different astronauts.
 */
export function buildExplanation(alert: HealthAlert, context: ExplanationContext): HealthExplanation {
  const { indicators, statuses, guidance, symptomDefinitions, evaluatedOnDay } = context;
  const astronautId: AstronautId = alert.astronautId;
  for (const s of statuses) {
    if (s.astronautId !== astronautId) {
      throw new Error(`Status of "${s.astronautId}" cannot explain an alert of "${astronautId}".`);
    }
  }

  const indicator = indicators.find((i) => i.id === alert.indicatorId) ?? null;
  const status = statuses.find((s) => s.indicatorId === alert.indicatorId) ?? null;
  const measures: MeasureStatus[] =
    status === null ? [] : status.measures.filter((m) => alert.measures.includes(m.measure));

  let whatChanged: string;
  let baselineComparison: string;
  let referenceRangeNote: string;
  let missionLimitNote: string;

  if (indicator === null || status === null || measures.length === 0) {
    // Symptom-only alert: it names symptoms and has no reading to compare.
    whatChanged = alert.reasons.join(' ');
    baselineComparison = 'This alert is about a logged symptom, not a reading, so there is no comparison with your baseline.';
    referenceRangeNote = 'No sourced reference range available.';
    missionLimitNote = 'No mission-approved limit is available.';
  } else {
    // Part 1: what changed, from the astronaut's own run and latest reading.
    const changed: string[] = [];
    const comparison: string[] = [];
    for (const m of measures) {
      const name = measureName(indicator, m);
      const unit = unitOf(indicator, m);
      if (m.run.length === 1) {
        changed.push(`${name} was ${m.run.direction} your baseline on day ${m.run.startDay}.`);
      } else if (m.run.length > 1) {
        changed.push(
          `${name} has been ${m.run.direction} your baseline for ${days(m.run.length)} in a row, since day ${m.run.startDay}.`,
        );
      }
      if (m.latestValue !== null && status.latestReading) {
        changed.push(
          `Latest recorded ${lowerFirst(name)}: ${withUnit(m.latestValue, unit)} (day ${status.latestReading.missionDay}).`,
        );
      }

      // Part 2: kind 1, the personal baseline.
      if (m.baseline.state === 'ready') {
        const position = m.position === 'not-enough-data' ? null : POSITION_TEXT[m.position];
        comparison.push(
          `${name}: your baseline centre is ${withUnit(m.baseline.centre, unit)}, with a baseline band from ` +
            `${withUnit(m.baseline.bandLow, unit)} to ${withUnit(m.baseline.bandHigh, unit)} ` +
            `(from ${dayList(m.baseline.windowDays)}).` +
            (position && m.latestValue !== null
              ? ` The latest value is ${position} your baseline.`
              : ' There is no latest value to compare.'),
        );
      } else {
        comparison.push(
          `${name}: your baseline is still being built (${m.baseline.daysCounted} of ${m.baseline.daysRequired} days with readings). ` +
            'There is not enough data yet to compare the latest value with your own baseline.',
        );
      }
    }

    if (status.todayPending) {
      changed.push(
        `Today's ${lowerFirst(indicator.displayName)} check-in (day ${evaluatedOnDay}) is not recorded yet` +
          (status.latestReading ? `, so the latest reading is from day ${status.latestReading.missionDay}.` : '.'),
      );
    }
    // Only gaps inside the current alert period matter here. Older gaps (for example in the baseline window) are not related to this alert.
    const runStarts = measures.map((m) => m.run.startDay).filter((d): d is MissionDay => d !== null);
    const periodStart = runStarts.length > 0 ? Math.min(...runStarts) : alert.runStartDay;
    const missingInPeriod =
      periodStart === null
        ? []
        : status.missingDays.filter((d) => d >= periodStart && !(status.todayPending && d === evaluatedOnDay));
    if (missingInPeriod.length > 0) {
      changed.push(
        `No ${lowerFirst(indicator.displayName)} reading was recorded on ${dayList(missingInPeriod)}, during this alert period.`,
      );
    }
    if (alert.symptomIds.length > 0) {
      changed.push(`Symptoms logged: ${symptomNames(alert, symptomDefinitions)}.`);
    }
    if (alert.relatedIndicatorIds.length > 0) {
      const related = alert.relatedIndicatorIds
        .map((id) => indicators.find((i) => i.id === id)?.displayName ?? id)
        .join(', ');
      changed.push(`A sustained change was also found in: ${related}.`);
    }
    whatChanged = changed.join(' ');
    baselineComparison = comparison.join(' ');

    // Kind 2: general reference range, shown separately and only if verified.
    const ranged = measures.filter((m) => m.referenceRange !== null && m.referenceStatus !== 'not-assessed');
    referenceRangeNote =
      ranged.length === 0
        ? 'No sourced reference range available. Reference status: not assessed.'
        : ranged
            .map(
              (m) =>
                `${measureName(indicator, m)}: ${m.referenceStatus === 'within-reference' ? 'within' : 'outside'} the general reference range ` +
                `[${m.referenceRange!.sourceIds.join(', ')}]. This is not personalised.`,
            )
            .join(' ');

    // Kind 3: mission limit, shown separately.
    const limited = measures.filter((m) => m.missionLimit !== null);
    missionLimitNote =
      limited.length === 0
        ? 'No mission-approved limit is available.'
        : limited
            .map((m) =>
              m.missionLimit!.basis === 'simulated-protocol'
                ? `${measureName(indicator, m)}: simulated protocol limit (${m.missionLimit!.label}).`
                : `${measureName(indicator, m)}: sourced mission limit [${m.missionLimit!.sourceIds.join(', ')}].`,
            )
            .join(' ');
  }

  // Parts 3 to 5: sourced guidance only, matched to a sustained run in one direction.
  const sustained = measures.find((m) => m.run.isSustained && m.run.direction !== null);
  const entry =
    alert.indicatorId !== null && sustained?.run.direction
      ? guidance.find(
          (g) => g.indicatorId === alert.indicatorId && g.situation === `sustained-${sustained.run.direction}`,
        )
      : undefined;
  const whyItMatters = entry?.whyItMatters ?? NO_GUIDANCE;
  const hazards = entry?.hazards ?? NO_HAZARDS;
  const nextSteps = entry?.nextSteps ?? NO_GUIDANCE;

  // Part 6: there is no automatic Contact Flight Surgeon rule.
  const whenToContactFlightSurgeon: HealthExplanation['whenToContactFlightSurgeon'] = {
    appliedRule:
      'No automatic Contact Flight Surgeon trigger is defined in this prototype. That level is shown in the legend only and is never generated.',
    automaticContactRuleDefined: false,
    guidance: NO_GUIDANCE,
  };

  const sourceIds = [
    ...new Set([
      ...idsOf(whyItMatters),
      ...idsOf(hazards),
      ...idsOf(nextSteps),
      ...idsOf(whenToContactFlightSurgeon.guidance),
      ...measures.flatMap((m) => (m.referenceRange ? [...m.referenceRange.sourceIds] : [])),
    ]),
  ];

  return {
    alertId: alert.id,
    astronautId,
    indicatorId: alert.indicatorId,
    whatChanged,
    baselineComparison,
    referenceRangeNote,
    missionLimitNote,
    whyItMatters,
    hazards,
    nextSteps,
    whenToContactFlightSurgeon,
    sourceIds,
    disclaimer: EXPLANATION_DISCLAIMER,
  };
}

/** One explanation per alert, in the same order as the alerts. */
export function buildExplanations(alerts: HealthAlert[], context: ExplanationContext): HealthExplanation[] {
  return alerts.map((alert) => buildExplanation(alert, context));
}
