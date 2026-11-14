import { CheckInForm } from '../components/CheckInForm';
import { Panel } from '../components/Panel';
import type { CrewData } from '../state/useCrewData';

export function CheckInPage({ data }: { data: CrewData }) {
  return (
    <Panel id="checkin">
      <CheckInForm
        key={data.selectedId}
        profile={data.profile}
        indicators={data.indicators}
        symptoms={data.symptomDefinitions}
        onSubmit={data.submitCheckIn}
      />
    </Panel>
  );
}
