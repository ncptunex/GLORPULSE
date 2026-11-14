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
| A-04 | The symptom list is a placeholder demo list. All notes, hazards and guidance are `no-sourced-guidance`. REF-01 and REF-03 stay `not-yet-verified` |
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
## Known follow-up for the team

- The comment on `HealthStatus.missingDays` in `src/shared/types.ts` says "the current day is not listed while pending". A-13 lists it. The type is unchanged (it is still `MissionDay[]`), but the comment no longer matches. Person A and Person B should agree to update the comment.
