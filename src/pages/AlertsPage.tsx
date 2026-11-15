import { AlertLegend } from "../components/AlertLegend";
import { AlertLevelBadge } from "../components/Badges";
import { ExplanationCard } from "../components/ExplanationCard";
import { Panel } from "../components/Panel";
import type { CrewData } from "../state/useCrewData";
import { alertOrder, indicatorName } from "../ui/labels";

export function AlertsPage({ data }: { data: CrewData }) {
  const { snapshot, indicators, sources, symptomDefinitions } = data;
  const alerts = [...snapshot.alerts].sort(
    (a, b) => alertOrder[a.level] - alertOrder[b.level],
  );
  const symptomLabel = (id: string) =>
    symptomDefinitions.find((s) => s.id === id)?.label ?? id;

  return (
    <>
      <Panel id="alerts">
        {alerts.length === 0 && <p>No active alerts.</p>}
        {alerts.map((alert) => {
          const explanation = snapshot.explanations.find(
            (e) => e.alertId === alert.id,
          );
          const rule = snapshot.rules.alertRules.find(
            (r) => r.ruleId === alert.ruleId,
          );
          return (
            <article key={alert.id} className="alert-item">
              <header className="card-head">
                <h3>{indicatorName(indicators, alert.indicatorId)}</h3>
                <AlertLevelBadge level={alert.level} />
              </header>
              <p>{alert.ruleLabel}</p>
              {rule && <p className="card-meta">{rule.description}</p>}
              {explanation ? (
                <ExplanationCard explanation={explanation} sources={sources} />
              ) : (
                <>
                  <ul>
                    {alert.reasons.map((reason, i) => (
                      <li key={i}>{reason}</li>
                    ))}
                  </ul>
                  {alert.relatedIndicatorIds.length > 0 && (
                    <p className="card-meta">
                      Also:{" "}
                      {alert.relatedIndicatorIds
                        .map((id) => indicatorName(indicators, id))
                        .join(", ")}
                    </p>
                  )}
                  {alert.symptomIds.length > 0 && (
                    <p className="card-meta">
                      Symptoms: {alert.symptomIds.map(symptomLabel).join(", ")}
                    </p>
                  )}
                </>
              )}
            </article>
          );
        })}
      </Panel>

      <Panel title="Levels" id="legend">
        <AlertLegend legend={snapshot.alertLegend} />
      </Panel>
    </>
  );
}
