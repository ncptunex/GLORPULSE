import type {
  AstronautId,
  HealthIndicator,
  HealthReading,
  MeasureKey,
  PersonalBaseline,
  PrototypeRules,
} from '../shared/types';
import { clean } from './numbers';
import { seriesForMeasure } from './readingSeries';

/**
 * Personal baseline (requirements section 8.1). All rules are prototype design choices,
 * not medical thresholds.
 */

/** The middle value of a list. For an even count, the average of the two middle values. */
export function median(values: number[]): number {
  if (values.length === 0) throw new Error('Cannot take the median of an empty list.');
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Median absolute deviation (MAD): how far each value is from the median,
 * then the median of those distances. A "typical wobble" that a single odd value hardly changes.
 */
export function medianAbsoluteDeviation(values: number[]): number {
  const centre = median(values);
  return median(values.map((v) => Math.abs(v - centre)));
}

/**
 * Calculates the personal baseline of ONE measure for ONE astronaut, from stored readings only.
 *
 *  - Window: the first `rules.baselineDays` (7) mission days that have a reading. Days without a reading are skipped.
 *  - Fewer days than that: state 'building', with the number of days counted. No centre, spread or band.
 *  - Otherwise state 'ready':
 *      centre = median of the window values
 *      spread = MAD, but never smaller than the measure's spread floor
 *      band   = centre -/+ K * spread (K = rules.deviationK)
 *  - Frozen: only the first 7 days are used, so later readings never change the baseline.
 *  - Nothing is stored. Call it again whenever the readings change (DR-04), so a replaced or
 *    newly filled-in reading inside the window is picked up automatically.
 *
 * Throws if any reading belongs to another astronaut, or if the measure does not exist on the indicator.
 */
export function computeBaseline(
  astronautId: AstronautId,
  indicator: HealthIndicator,
  measure: MeasureKey,
  readings: HealthReading[],
  rules: PrototypeRules,
): PersonalBaseline {
  const definition = indicator.measures.find((m) => m.key === measure);
  if (!definition) {
    throw new Error(`Indicator "${indicator.id}" has no measure "${measure}".`);
  }

  const days = seriesForMeasure(readings, astronautId, indicator.id, measure);
  const common = {
    astronautId,
    indicatorId: indicator.id,
    measure,
    daysRequired: rules.baselineDays,
  };

  if (days.length < rules.baselineDays) {
    return { ...common, state: 'building', daysCounted: days.length };
  }

  const window = days.slice(0, rules.baselineDays);
  const values = window.map((d) => d.value);
  const centre = clean(median(values));
  const spread = clean(Math.max(medianAbsoluteDeviation(values), definition.spreadFloor));

  return {
    ...common,
    state: 'ready',
    daysCounted: window.length,
    centre,
    spread,
    bandLow: clean(centre - rules.deviationK * spread),
    bandHigh: clean(centre + rules.deviationK * spread),
    windowDays: window.map((d) => d.missionDay),
  };
}
