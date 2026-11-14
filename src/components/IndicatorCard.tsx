import type {
  HealthAlert,
  HealthIndicator,
  HealthStatus,
} from "../shared/types";
import {
  formatLastMeasured,
  formatMeasure,
  formatNumber,
  formatReading,
  positionMeta,
  referenceMeta,
} from "../ui/labels";
import { AlertLevelBadge, StatusBadge } from "./Badges";

export function IndicatorCard(props: {
  indicator: HealthIndicator;
  status: HealthStatus;
  alert: HealthAlert | undefined;
  onOpenAlerts: () => void;
}) {
  const { indicator, status, alert } = props;
  return (
    <article className="card" aria-label={indicator.displayName}>
      <header className="card-head">
        <h3>{indicator.displayName}</h3>
        {alert && <AlertLevelBadge level={alert.level} />}
      </header>

      <p className="card-value">
        {formatReading(status.latestReading, indicator)}
      </p>
      <p className="card-meta">
        Last:{" "}
        {formatLastMeasured(
          status.latestReading,
          status.daysSinceLatestReading,
        )}
      </p>
      {status.todayPending && (
        <p className="card-pending">Not yet recorded today.</p>
      )}

      <ul className="measure-list">
        {status.measures.map((m, i) => {
          const def = indicator.measures[i];
          const showName = status.measures.length > 1;
          return (
            <li key={m.measure}>
              {showName && (
                <strong>
                  {def.label}: {formatMeasure(m.latestValue, def)}
                </strong>
              )}
              <div className="badge-row">
                <StatusBadge {...positionMeta[m.position]} />
                <StatusBadge {...referenceMeta[m.referenceStatus]} />
              </div>
              {m.baseline.state === "building" ? (
                <p className="card-meta">
                  Baseline: {m.baseline.daysCounted} of{" "}
                  {m.baseline.daysRequired} days
                </p>
              ) : (
                <p className="card-meta">
                  Baseline {formatNumber(m.baseline.centre)} {def.unit}, band{" "}
                  {formatNumber(m.baseline.bandLow)} to{" "}
                  {formatNumber(m.baseline.bandHigh)}
                </p>
              )}
              {m.run.length > 0 && m.run.direction && (
                <p className="card-meta">
                  {m.run.direction === "above" ? "Above" : "Below"} baseline for{" "}
                  {m.run.length} day
                  {m.run.length === 1 ? "" : "s"}
                  {m.run.isSustained ? ", sustained" : ""}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {alert && (
        <button
          type="button"
          className="link-button"
          onClick={props.onOpenAlerts}
        >
          DETAILS
        </button>
      )}
    </article>
  );
}
