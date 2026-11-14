import { useState } from "react";
import type { FormEvent } from "react";
import type { SubmitOutcome } from "../state/useCrewData";
import type {
  CheckInError,
  CheckInSubmission,
  CheckInValue,
  CrewProfile,
  HealthIndicator,
  IndicatorId,
  SingleValueIndicatorId,
  SymptomDefinition,
} from "../shared/types";

const fieldKey = (id: IndicatorId, measure: string) => `${id}:${measure}`;

function parseField(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  return /^-?\d+([.,]\d+)?$/.test(trimmed)
    ? Number(trimmed.replace(",", "."))
    : Number.NaN;
}

export function CheckInForm(props: {
  profile: CrewProfile;
  indicators: HealthIndicator[];
  symptoms: SymptomDefinition[];
  onSubmit: (submission: CheckInSubmission) => SubmitOutcome;
}) {
  const { profile } = props;
  const tracked = props.indicators.filter((i) =>
    profile.trackedIndicators.includes(i.id),
  );
  const [fields, setFields] = useState<Record<string, string>>({});
  const [symptomIds, setSymptomIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<CheckInError[]>([]);
  const [saved, setSaved] = useState<string | null>(null);

  const errorFor = (field: CheckInError["field"], measure?: string) =>
    errors.filter(
      (e) =>
        e.field === field &&
        (measure === undefined ||
          e.measure === undefined ||
          e.measure === measure),
    );

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaved(null);
    const found: CheckInError[] = [];
    const values: CheckInValue[] = [];

    for (const indicator of tracked) {
      const parsed = indicator.measures.map((m) => ({
        key: m.key,
        label: m.label,
        n: parseField(fields[fieldKey(indicator.id, m.key)] ?? ""),
      }));
      const filled = parsed.filter((p) => p.n !== null);
      if (filled.length === 0) continue;

      let blocked = false;
      for (const p of parsed) {
        if (p.n !== null && Number.isNaN(p.n)) {
          found.push({
            field: indicator.id,
            measure: p.key,
            message: `${p.label}: enter a number.`,
          });
          blocked = true;
        }
      }
      if (indicator.id === "blood-pressure" && filled.length === 1) {
        const missing = parsed.find((p) => p.n === null);
        found.push({
          field: "blood-pressure",
          measure: missing?.key,
          message: "Enter both numbers or neither.",
        });
        blocked = true;
      }
      if (blocked) continue;

      if (indicator.id === "blood-pressure") {
        values.push({
          indicatorId: "blood-pressure",
          systolic: parsed.find((p) => p.key === "systolic")?.n as number,
          diastolic: parsed.find((p) => p.key === "diastolic")?.n as number,
        });
      } else {
        values.push({
          indicatorId: indicator.id as SingleValueIndicatorId,
          value: parsed[0].n as number,
        });
      }
    }

    if (found.length > 0) {
      setErrors(found);
      return;
    }

    const outcome = props.onSubmit({
      astronautId: profile.astronautId,
      missionDay: profile.currentMissionDay,
      values,
      symptomIds,
    });
    if (outcome.validation.ok) {
      setErrors([]);
      setFields({});
      setSymptomIds([]);
      setSaved(
        outcome.persisted
          ? `Saved for day ${profile.currentMissionDay}.`
          : "Applied, but the browser could not save it.",
      );
    } else {
      setErrors(outcome.validation.errors);
    }
  }

  function toggleSymptom(id: string) {
    setSymptomIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="checkin-form">
      <p className="card-meta">Blank fields are skipped.</p>

      {errors.length > 0 && (
        <div className="form-errors" role="alert">
          <strong>Check the following</strong>
          <ul>
            {errors.map((e, i) => (
              <li key={`${e.field}-${e.measure ?? ""}-${i}`}>{e.message}</li>
            ))}
          </ul>
        </div>
      )}
      {saved && (
        <p className="form-success" role="status">
          {saved}
        </p>
      )}

      {tracked.map((indicator) => (
        <fieldset key={indicator.id} className="field-group">
          <legend>{indicator.displayName}</legend>
          <div className="field-row">
            {indicator.measures.map((m) => {
              const id = `field-${indicator.id}-${m.key}`;
              const errId = `${id}-error`;
              const own = errorFor(indicator.id, m.key);
              return (
                <div key={m.key} className="field">
                  <label htmlFor={id}>
                    {m.label} ({m.unit})
                  </label>
                  <input
                    id={id}
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    value={fields[fieldKey(indicator.id, m.key)] ?? ""}
                    onChange={(e) =>
                      setFields((prev) => ({
                        ...prev,
                        [fieldKey(indicator.id, m.key)]: e.target.value,
                      }))
                    }
                    aria-invalid={own.length > 0}
                    aria-describedby={`${id}-hint${own.length > 0 ? ` ${errId}` : ""}`}
                  />
                  <span id={`${id}-hint`} className="hint">
                    {m.entryMin} to {m.entryMax}
                  </span>
                  {own.length > 0 && (
                    <span id={errId} className="field-error">
                      {own[0].message}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </fieldset>
      ))}

      <fieldset className="field-group">
        <legend>Symptoms (optional)</legend>
        <div className="checkbox-grid">
          {props.symptoms.map((s) => (
            <label key={s.id} className="checkbox">
              <input
                type="checkbox"
                checked={symptomIds.includes(s.id)}
                onChange={() => toggleSymptom(s.id)}
              />
              {s.label}
            </label>
          ))}
        </div>
        {errorFor("symptoms").map((e, i) => (
          <span key={i} className="field-error">
            {e.message}
          </span>
        ))}
      </fieldset>

      {errorFor("form").length > 0 && (
        <p className="field-error">
          {errorFor("form")
            .map((e) => e.message)
            .join(" ")}
        </p>
      )}

      <button type="submit" className="button-primary">
        Save check-in
      </button>
    </form>
  );
}
