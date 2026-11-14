import { alertRuleLabels } from '../data/alertRuleLabels';
import type {
  AlertLevel,
  AlertRuleId,
  HealthAlert,
  HealthIndicator,
  HealthLogicInput,
  IndicatorId,
  MeasureKey,
  MissionDay,
  SymptomId,
} from '../shared/types';
import { computeIndicatorRuns, type MeasureRunResult } from './persistence';
import { assertSameAstronaut, seriesForMeasure } from './readingSeries';

/**
 * Alert generation (requirements section 8.5, decisions A-06 to A-08 in docs/person-a-logic-decisions.md).
 *
 * All rules are a "prototype simulated protocol": design choices, not clinical thresholds.
 * Alerts are recalculated every time and never stored (FR-ALERT-03).
 *
 * Levels and what triggers them:
 *   Info   : (a) an indicator deviates but its run is shorter than the sustained limit (3 days), or
 *            (b) a symptom was logged on the evaluation day or the day before (symptom-only alert).
 *   Watch  : an indicator has a sustained deviation.
 *   Action : a sustained deviation, plus either a second indicator that is sustained, or a symptom
 *            logged inside the run's range.
 * "Contact Flight Surgeon" is never generated: the AlertLevel type does not even contain it.
 *
 * Reference ranges and mission limits are deliberately never read here (FR-ALERT-05).
 */

type AlertInput = Pick<
  HealthLogicInput,
  'profile' | 'indicators' | 'readings' | 'symptoms' | 'symptomDefinitions' | 'rules'
>;

/** One logged symptom on one day (a symptom repeated on the same day counts once). */
interface SymptomEvent {
  symptomId: SymptomId;
  missionDay: MissionDay;
}

/** The run results of one tracked indicator. */
interface IndicatorState {
  indicator: HealthIndicator;
  results: MeasureRunResult[];
  /** Measures whose run is sustained. */
  sustained: MeasureRunResult[];
  /** Measures that deviate on their last evaluated day (run length 1 or more). */
  deviating: MeasureRunResult[];
}

const LEVEL_ORDER: Record<AlertLevel, number> = { action: 0, watch: 1, info: 2 };

const eventKey = (e: SymptomEvent) => `${e.missionDay}:${e.symptomId}`;

/** Is this symptom day inside the actual run range of this measure? Inclusive, startDay to evaluatedThroughDay. */
function inRunRange(day: MissionDay, result: MeasureRunResult): boolean {
  const start = result.run.startDay;
  return start !== null && day >= start && day <= result.evaluatedThroughDay;
}

function pluralDays(n: number): string {
  return n === 1 ? '1 day' : `${n} days`;
}

/** "Sleep", or "Blood pressure (systolic)" for a two-number indicator. */
function measureName(indicator: HealthIndicator, measure: MeasureKey): string {
  if (indicator.measures.length === 1) return indicator.displayName;
  const definition = indicator.measures.find((m) => m.key === measure);
  return `${indicator.displayName} (${(definition?.label ?? measure).toLowerCase()})`;
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function withUnit(value: number, unit: string): string {
  return unit === 'score' ? String(value) : `${value} ${unit}`;
}

/** Plain sentences about one measure's run, built only from the astronaut's own numbers. */
function runReasons(
  astronautId: string,
  indicator: HealthIndicator,
  result: MeasureRunResult,
  readings: AlertInput['readings'],
  also: boolean,
): string[] {
  const name = measureName(indicator, result.measure);
  const direction = result.run.direction ?? 'above';
  const length = result.run.length;
  const start = result.run.startDay;
  const reasons: string[] = [];

  if (length === 1) {
    reasons.push(`${name} was ${direction} your baseline on day ${start}.`);
  } else {
    reasons.push(
      `${name} has ${also ? 'also ' : ''}been ${direction} your baseline for ${pluralDays(length)} in a row, since day ${start}.`,
    );
  }

  if (!also && result.baseline.state === 'ready') {
    const unit = indicator.measures.find((m) => m.key === result.measure)?.unit ?? '';
    const latest = seriesForMeasure(readings, astronautId, indicator.id, result.measure).find(
      (d) => d.missionDay === result.evaluatedThroughDay,
    );
    if (latest) {
      reasons.push(
        `Your latest ${lowerFirst(name)} value is ${withUnit(latest.value, unit)}. ` +
          `Your baseline centre is ${withUnit(result.baseline.centre, unit)}.`,
      );
    }
  }
  return reasons;
}

/** "Tiredness (day 27)". Throws for a symptom ID that is not in the symptom list. */
function symptomText(event: SymptomEvent, labels: Map<SymptomId, string>): string {
  return `${labels.get(event.symptomId)} (day ${event.missionDay})`;
}

function uniqueIds(events: SymptomEvent[]): SymptomId[] {
  return [...new Set(events.map((e) => e.symptomId))];
}

/**
 * Generates the alerts of ONE astronaut on their current mission day.
 *
 *  - At most ONE alert per indicator, at the highest applicable level (Action, then Watch, then Info).
 *  - Plus at most ONE symptom-only Info alert (indicatorId null) for symptoms from today or yesterday
 *    that contribute to no Action alert (A-07, A-08 items 3 and 6).
 *  - A symptom contributes to an Action alert when its day is inside the inclusive range from a sustained
 *    run's startDay to that run's evaluatedThroughDay (A-08 item 6). For blood pressure each sustained
 *    measure is checked against its OWN range, and the symptom contributes if it fits at least one.
 *  - If both Action rules apply, the ruleId is 'sustained-with-second-indicator' and the symptom is only
 *    supporting context in `symptomIds` (A-06).
 *  - Readings and symptoms after the current day are ignored. An indicator whose baseline is still
 *    building has no run, so it produces no deviation alert.
 *  - Alerts are ordered Action, Watch, Info. Within a level they follow the profile's indicator order,
 *    and the symptom-only alert comes last.
 *
 * Throws if any record belongs to another astronaut, if a tracked indicator has no definition,
 * or if a symptom ID is not in the symptom list.
 */
export function computeAlerts(input: AlertInput): HealthAlert[] {
  const { profile, indicators, readings, symptoms, symptomDefinitions, rules } = input;
  const astronautId = profile.astronautId;
  const evaluationDay = profile.currentMissionDay;

  assertSameAstronaut(readings, astronautId);
  assertSameAstronaut(symptoms, astronautId);

  const labels = new Map<SymptomId, string>(symptomDefinitions.map((d) => [d.id, d.label]));
  for (const s of symptoms) {
    if (!labels.has(s.symptomId)) throw new Error(`Unknown symptom ID: ${s.symptomId}`);
  }

  // Symptoms up to the current day, one per symptom and day, oldest first.
  const events: SymptomEvent[] = [];
  const seen = new Set<string>();
  for (const s of symptoms) {
    if (s.missionDay > evaluationDay) continue;
    const event = { symptomId: s.symptomId, missionDay: s.missionDay };
    if (seen.has(eventKey(event))) continue;
    seen.add(eventKey(event));
    events.push(event);
  }
  events.sort((a, b) => a.missionDay - b.missionDay || a.symptomId.localeCompare(b.symptomId));

  // Runs of every tracked indicator.
  const states: IndicatorState[] = profile.trackedIndicators.map((id: IndicatorId) => {
    const indicator = indicators.find((i) => i.id === id);
    if (!indicator) throw new Error(`No definition for tracked indicator "${id}".`);
    const results = computeIndicatorRuns(astronautId, indicator, readings, rules, evaluationDay);
    return {
      indicator,
      results,
      sustained: results.filter((r) => r.run.isSustained),
      deviating: results.filter((r) => r.run.length > 0),
    };
  });
  const sustainedStates = states.filter((s) => s.sustained.length > 0);

  const alerts: HealthAlert[] = [];
  const contributingSymptoms = new Set<string>();

  const make = (
    state: IndicatorState,
    level: AlertLevel,
    ruleId: AlertRuleId,
    measuring: MeasureRunResult[],
    reasons: string[],
    relatedIndicatorIds: IndicatorId[],
    symptomEvents: SymptomEvent[],
  ): HealthAlert => ({
    id: `${astronautId}:${state.indicator.id}:${ruleId}`,
    astronautId,
    indicatorId: state.indicator.id,
    measures: measuring.map((r) => r.measure),
    level,
    ruleId,
    ruleLabel: alertRuleLabels[ruleId],
    reasons,
    runStartDay: Math.min(...measuring.map((r) => r.run.startDay as number)),
    relatedIndicatorIds,
    symptomIds: uniqueIds(symptomEvents),
  });

  for (const state of states) {
    if (state.sustained.length > 0) {
      const others = sustainedStates.filter((o) => o !== state);
      const contributors = events.filter((e) => state.sustained.some((r) => inRunRange(e.missionDay, r)));
      for (const e of contributors) contributingSymptoms.add(eventKey(e));

      const reasons = state.sustained.flatMap((r) => runReasons(astronautId, state.indicator, r, readings, false));
      if (state.sustained.some((r) => r.todayPending)) {
        reasons.push(
          `Today's ${lowerFirst(state.indicator.displayName)} check-in is not recorded yet, ` +
            `so this is counted through day ${state.sustained[0].evaluatedThroughDay}.`,
        );
      }

      if (others.length > 0 || contributors.length > 0) {
        for (const other of others) {
          for (const r of other.sustained) reasons.push(...runReasons(astronautId, other.indicator, r, readings, true).slice(0, 1));
        }
        for (const e of contributors) reasons.push(`Symptom logged during this run: ${symptomText(e, labels)}.`);
        const ruleId: AlertRuleId = others.length > 0 ? 'sustained-with-second-indicator' : 'sustained-with-symptom';
        alerts.push(make(state, 'action', ruleId, state.sustained, reasons, others.map((o) => o.indicator.id), contributors));
      } else {
        alerts.push(make(state, 'watch', 'sustained-deviation', state.sustained, reasons, [], []));
      }
    } else if (state.deviating.length > 0) {
      const reasons = state.deviating.flatMap((r) => runReasons(astronautId, state.indicator, r, readings, false));
      if (state.deviating.some((r) => r.todayPending)) {
        reasons.push(
          `Today's ${lowerFirst(state.indicator.displayName)} check-in is not recorded yet, ` +
            `so this is counted through day ${state.deviating[0].evaluatedThroughDay}.`,
        );
      }
      alerts.push(make(state, 'info', 'deviation-not-yet-sustained', state.deviating, reasons, [], []));
    }
  }

  // Symptom-only Info alert: today or yesterday, and not already part of an Action alert.
  const recent = events.filter((e) => e.missionDay >= evaluationDay - 1 && !contributingSymptoms.has(eventKey(e)));
  if (recent.length > 0) {
    alerts.push({
      id: `${astronautId}:symptoms:symptom-logged`,
      astronautId,
      indicatorId: null,
      measures: [],
      level: 'info',
      ruleId: 'symptom-logged',
      ruleLabel: alertRuleLabels['symptom-logged'],
      reasons: recent.map((e) => `Symptom logged: ${symptomText(e, labels)}.`),
      runStartDay: null,
      relatedIndicatorIds: [],
      symptomIds: uniqueIds(recent),
    });
  }

  // Array.prototype.sort is stable, so the order inside each level is kept.
  return alerts.sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);
}
