import { useCallback, useMemo, useState } from 'react';
import { indicators } from '../data/indicators';
import { prototypeRules } from '../data/prototypeRules';
import { seedCrew, getSeed } from '../data/seedCrew';
import { sources } from '../data/sources';
import { symptomDefinitions } from '../data/symptoms';
import { applyCheckIn, validateCheckIn } from '../logic/checkIn';
import { computeSnapshot } from '../logic/snapshot';
import type {
  AstronautId,
  CheckInSubmission,
  CheckInValidationResult,
  HealthSnapshot,
  StoredAstronautData,
} from '../shared/types';
import { emptyStoredData, loadAstronautData, resetAllStoredData, saveAstronautData } from '../storage/localStore';


interface Loaded {
  byAstronaut: Record<AstronautId, StoredAstronautData>;
  discarded: boolean;
}

function loadAll(): Loaded {
  const byAstronaut: Record<AstronautId, StoredAstronautData> = {};
  let discarded = false;
  for (const seed of seedCrew) {
    const result = loadAstronautData(seed.profile.astronautId);
    byAstronaut[seed.profile.astronautId] = result.data;
    discarded = discarded || result.discarded;
  }
  return { byAstronaut, discarded };
}

export interface SubmitOutcome {
  validation: CheckInValidationResult;
  persisted: boolean;
}

export function useCrewData() {
  const [loaded] = useState<Loaded>(loadAll);
  const [stored, setStored] = useState<Record<AstronautId, StoredAstronautData>>(loaded.byAstronaut);
  const [selectedId, setSelectedId] = useState<AstronautId>(seedCrew[0].profile.astronautId);
  const [storageNotice, setStorageNotice] = useState<string | null>(
    loaded.discarded ? 'Some saved data was unreadable or from an older version and was ignored.' : null,
  );

  const seed = getSeed(selectedId);
  const entered = stored[selectedId] ?? emptyStoredData(selectedId);

  const snapshot: HealthSnapshot = useMemo(
    () =>
      computeSnapshot({
        profile: seed.profile,
        indicators,
        readings: [...seed.readings, ...entered.enteredReadings],
        symptoms: [...seed.symptoms, ...entered.enteredSymptoms],
        symptomDefinitions,
        sources,
        rules: prototypeRules,
        guidance: [],
      }),
    [seed, entered],
  );

  const submitCheckIn = useCallback(
    (submission: CheckInSubmission): SubmitOutcome => {
      const validation = validateCheckIn(submission, seed.profile, indicators);
      if (!validation.ok) return { validation, persisted: false };
      const next = applyCheckIn(entered.enteredReadings, entered.enteredSymptoms, submission);
      const data: StoredAstronautData = { ...entered, ...next };
      const persisted = saveAstronautData(data);
      setStored((prev) => ({ ...prev, [data.astronautId]: data }));
      setStorageNotice(persisted ? null : 'Your browser blocked saving. Data is kept only until you close this page.');
      return { validation, persisted };
    },
    [seed, entered],
  );

  const resetAll = useCallback(() => {
    resetAllStoredData();
    const fresh: Record<AstronautId, StoredAstronautData> = {};
    for (const s of seedCrew) fresh[s.profile.astronautId] = emptyStoredData(s.profile.astronautId);
    setStored(fresh);
    setStorageNotice(null);
  }, []);

  return {
    crew: seedCrew.map((s) => s.profile),
    selectedId,
    selectAstronaut: setSelectedId,
    profile: seed.profile,
    snapshot,
    indicators,
    symptomDefinitions,
    sources,
    enteredCount: entered.enteredReadings.length + entered.enteredSymptoms.length,
    storageNotice,
    submitCheckIn,
    resetAll,
  };
}

export type CrewData = ReturnType<typeof useCrewData>;
