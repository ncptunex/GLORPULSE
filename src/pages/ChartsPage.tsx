import { IndicatorChart } from '../components/IndicatorChart';
import { Panel } from '../components/Panel';
import type { CrewData } from '../state/useCrewData';

export function ChartsPage({ data }: { data: CrewData }) {
  const { snapshot, indicators } = data;
  return (
    <>
      {snapshot.statuses.map((status) => {
        const indicator = indicators.find((i) => i.id === status.indicatorId);
        if (!indicator) return null;
        return (
          <Panel key={status.indicatorId} id={`chart-${status.indicatorId}`}>
            <IndicatorChart snapshot={snapshot} indicator={indicator} status={status} />
          </Panel>
        );
      })}
    </>
  );
}
