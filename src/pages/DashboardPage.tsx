import { AlertBanner } from "../components/AlertBanner";
import { IndicatorCard } from "../components/IndicatorCard";
import { Panel } from "../components/Panel";
import type { CrewData } from "../state/useCrewData";

export function DashboardPage({
  data,
  onOpenAlerts,
}: {
  data: CrewData;
  onOpenAlerts: () => void;
}) {
  const { snapshot, indicators } = data;
  return (
    <>
      <AlertBanner
        alerts={snapshot.alerts}
        indicators={indicators}
        onOpenAlerts={onOpenAlerts}
      />
      <Panel id="dashboard">
        <p className="card-meta">Day {snapshot.evaluatedOnDay}</p>
        <div className="card-grid">
          {snapshot.statuses.map((status) => {
            const indicator = indicators.find(
              (i) => i.id === status.indicatorId,
            );
            if (!indicator) return null;
            return (
              <IndicatorCard
                key={status.indicatorId}
                indicator={indicator}
                status={status}
                alert={snapshot.alerts.find(
                  (a) => a.indicatorId === status.indicatorId,
                )}
                onOpenAlerts={onOpenAlerts}
              />
            );
          })}
        </div>
      </Panel>
    </>
  );
}
