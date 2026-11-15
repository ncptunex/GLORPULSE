# Person A: health logic decisions

Decisions made by Person A while implementing `src/data/` and `src/logic/`.
They interpret `requirements.md` where it was silent or ambiguous. They are prototype design choices, not medical thresholds.
`requirements.md` and `product.md` stay the source of truth. If one of these decisions should become a requirement, Person B must review it.

## Data layer

| # | Decision |
|---|---|
| A-01 | Four fictional astronauts: astro-1 (primary story), astro-2 (steady, glucose), astro-3 (missing days 3 and 28), astro-4 (glucose started on day 28, so it is still building). All are on mission day 30 |
| A-02 | A seeded reading is flagged simulated by `origin: 'seeded'`. The snapshot carries `isSimulatedData: true` |
| A-03 | `entryMin`, `entryMax` and `spreadFloor` are placeholders. They are technical choices, not clinical thresholds or reference ranges. Mood is a 1 to 5 non-diagnostic self-rating |
| A-04 | The symptom list is a placeholder demo list. All notes, hazards and guidance are `no-sourced-guidance`. REF-01 and REF-03 are `verified` for their narrow claims only (`references.md`, section 2) |
| A-05 | `alertLegend.ts` is imported directly by the logic. `types.ts` is not changed |

## Alert rules (implemented in `src/logic/alerts.ts`)

| # | Decision |
|---|---|
| A-06 | When both "second indicator" and "symptom in the run" apply to an Action alert, the `ruleId` is `sustained-with-second-indicator`. The symptom stays in the explanation as supporting context. No duplicate alert is created |
| A-07 | A symptom on the current or previous day can create an Info alert. If that same symptom already contributes to an Action alert, no separate Info alert is created for the same event |
| A-08 | **Completed alert decisions** (below). They finish the unfinished instruction and replace the open note that was here |

### A-08: completed alert decisions

1. **One alert per indicator.** There is at most ONE alert per indicator, and it has the highest applicable level (Action over Watch over Info).
2. **Symptom Info alert.** A symptom reported today or yesterday may generate an Info alert.
3. **No duplicate for a contributing symptom.** If that same symptom is already contributing context to a higher-level Action alert for the same indicator, no separate Info alert is created for it.
4. **Overlapping Action rules.** If both `sustained-with-second-indicator` and `sustained-with-symptom` qualify for the same Action alert, the primary `ruleId` is `sustained-with-second-indicator`. The symptom stays as supporting context. It does not create another alert (same as A-06).
5. **Contact Flight Surgeon stays legend-only.** It is shown in the legend with "No automatic trigger in this prototype yet". It is never generated automatically (D-10 is still undecided).

Fit with the shared types (no change needed): `HealthAlert.indicatorId` is `null` only for a symptom-only Info alert, and the comment on `HealthSnapshot.alerts` already allows "at most one alert per indicator, plus possibly one Info alert about a symptom with no indicator". `AlertLevel` does not include `'contact-flight-surgeon'`, so the type already prevents rule 5 from being broken.

6. **When a symptom contributes to an Action alert (confirmed).** A symptom contributes to an Action alert when its reported mission day falls within the inclusive range from that indicator's sustained deviation run `startDay` through its `evaluatedThroughDay` (both days included). `evaluatedThroughDay` is the evaluation day, or the day before while today's reading is pending (see `MeasureRunResult` in `persistence.ts`).
   - If the symptom contributes to at least one Action alert, no separate symptom-only Info alert is generated for it.
   - If it contributes to no Action alert, it may still generate an Info alert when it was reported today or yesterday.
   - A symptom that contributes is listed as supporting context on the Action alert (`symptomIds`), as in rule 4.
   - Consequence of using `evaluatedThroughDay`: when an indicator's reading for today is still pending, a symptom logged today is just outside that indicator's range. It can then still produce its own Info alert, as long as it contributes to no Action alert.

## Logic

| # | Decision |
|---|---|
| A-09 | Deviation score = distance from centre / spread. A reading deviates when the score is at least K (3). A reading exactly on the band edge deviates. Scores are rounded to 10 decimals to avoid floating-point noise |
| A-10 | Readings inside the baseline window, and all readings while the baseline is building, are never checked and never deviate |
| A-11 | Only readings on or before the evaluation day are used. Later readings change nothing |
| A-12 | Only the evaluation day itself can be "pending". A past day with no reading is a gap and ends a run |
| A-13 | **missingDays:** counted from the indicator's first recorded reading through the evaluation day. Days before the first reading are not missing. No readings at all gives an empty list. A missing day after tracking started counts, **including today's pending day**. `daysSinceLatestReading` is a separate field |
| A-14 | **Position versus persistence:** the two are independent and are not forced to agree. Baseline position uses the latest available reading on or before the evaluation day, even if it is old. A run uses consecutive eligible days and stops at a past missing day |
| A-15 | **Astronaut separation:** every logic function rejects a reading of another astronaut with an error, checked on the whole list before any filtering by day or indicator. A foreign reading on a future day is also rejected |

## Snapshot assembly

Implemented in `src/logic/snapshot.ts` (`computeSnapshot`, typed as the shared `ComputeSnapshot`). It only combines the existing logic and adds no new health rule.

| # | Decision |
|---|---|
| A-16 | **Statuses:** one `HealthStatus` per tracked indicator, in the profile's order. An untracked indicator has no status. Each `MeasureStatus` combines `computeIndicatorPositions` (baseline, position) and `computeIndicatorRuns` (run). `todayPending`, `daysSinceLatestReading` and `missingDays` come from `persistence.ts` (A-13) |
| A-17 | **Raw arrays keep everything.** `readings` and `symptoms` are copies of ALL input records of this astronaut: future days and duplicates included. Nothing is silently removed. No calculation uses a record after `evaluatedOnDay`, so future records never affect baselines, deviation, runs, alerts or `latestReading` |
| A-18 | **Future symptoms never create an alert.** A symptom after the current day is ignored by alert generation |
| A-19 | **Latest reading:** the latest reading on or before the evaluation day, however old (A-14). Per mission day, an ENTERED reading beats a seeded one, otherwise the later one in the list wins. This is exactly the precedence of `seriesForMeasure`. `latestValue` is read from that reading and always equals the value used for the baseline position. **Person B must apply this same precedence when choosing displayed values (cards, charts, tables) from the raw `readings` array**, because the array keeps duplicates. `selectLatestReading` is exported for this purpose |
| A-20 | **Reference status:** `not-assessed` with `referenceRange: null` unless the measure has a range whose sources ALL exist in `sources` with `verification: 'verified'`. Then the status is `within-reference` or `outside-reference` (limits inclusive), and the range is attached. With no reading the status is `not-assessed`. It never changes an alert (D-13, FR-ALERT-05). No indicator has a range today, so every status is `not-assessed`. `missionLimit` is always `null` |
| A-21 | **Other fields:** `explanations` is `[]`. `alertLegend` is a copy of the constant (A-05). `rules` is `input.rules`. `isSimulatedData` is `true`. `guidance` is accepted and ignored. `sources` is only used for A-20. The input is never changed, and the snapshot holds copies of the records, not the input objects |
## Check-in validation and conversion

Implemented in `src/logic/checkIn.ts` (`validateCheckIn` and `applyCheckIn`, typed as the shared `ValidateCheckIn` and `ApplyCheckIn`). Entry limits and the checks below only catch typing errors. They are entry rules, not clinical thresholds, and the messages say so.

| # | Decision |
|---|---|
| A-22 | **Mood** accepts only whole numbers from 1 to 5. Every other indicator accepts decimals within its entry limits (limits include both ends). The mood scale itself is still pending research (D-04) |
| A-23 | **Blood pressure consistency:** diastolic must be strictly lower than systolic. The error is reported on the diastolic number and is labelled "an entry check, not a clinical threshold". Each of the two numbers is also checked against its own entry limits. The consistency check is skipped when either number is already invalid |
| A-24 | **Empty submission:** a check-in with neither readings nor symptoms is rejected (error on field `form`). A symptom-only check-in is valid. Skipping any indicator is valid |
| A-25 | **Wrong astronaut or mission day** is returned as a `CheckInError` on field `form`. `validateCheckIn` does not throw for user mistakes. The mission day must equal the profile's current mission day (FR-CHK-05). All errors are reported together, form errors first |
| A-26 | **`applyCheckIn` assumes the submission already passed `validateCheckIn`** and does not check it again. It still throws if any stored entered reading or symptom belongs to a different astronaut than the submission (A-15), whatever its day or indicator. It has no profile argument, so it cannot check the submission against a profile |
| A-27 | **Entered values are kept exactly as typed.** No rounding or unit conversion. A later entered value for the same astronaut, indicator and mission day replaces the earlier entered one (blood pressure as a pair), and the replacement is placed at the end of the list. A symptom repeated on the same day is kept once. Skipped indicators change nothing. Seeded data is never touched. The input lists are not changed |
| A-28 | **Symptom list source:** the shared `ValidateCheckIn` signature has no symptom-list argument, so `validateCheckIn` imports `symptomDefinitions` directly from `src/data/symptoms.ts` to reject unknown symptom IDs (same pattern as A-05). An unknown ID must be rejected here because `computeAlerts` throws on one. If the symptom list ever needs to come from the caller, `types.ts` would have to change, which needs both team members' agreement |
| A-29 | **Person B must call `validateCheckIn` and get `{ ok: true }` before calling `applyCheckIn`.** Never apply a submission that failed or was not validated. After applying, Person B saves the returned entered lists and passes them (together with the seeded records) into `computeSnapshot`. Person B must also use the same entered-over-seeded precedence as A-19 when displaying values |
| A-30 | **Other rules implemented in `validateCheckIn`** (behaviour added while implementing, not separately discussed): an indicator the astronaut does not track is rejected (so no glucose for astronauts without it, FR-CREW-07); the same indicator twice in one check-in is rejected; a missing, non-numeric or non-finite number is rejected; an unknown symptom ID is rejected once, even if repeated; a repeated valid symptom is not an error |

Not yet decided: the short disease-name word list for the planned source-integrity test (AT-SRC-06) is still waiting for approval, and nothing has been implemented for it.
## Known follow-up for the team

- The comment on `HealthStatus.missingDays` in `src/shared/types.ts` says "the current day is not listed while pending". A-13 lists it. The type is unchanged (it is still `MissionDay[]`), but the comment no longer matches. Person A and Person B should agree to update the comment.
