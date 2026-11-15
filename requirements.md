# GLORPULSE: Requirements

> Your health, monitored beyond Earth.

Status: DRAFT v3 for team review
Source of truth for vision, scope and principles: `.kiro/steering/product.md`
Related: `references.md`, `docs/competitor-research-and-differentiation.md`

Labels:
- **[Confirmed]**: decided by the team.
- **[Proposed default]**: our suggestion, not yet confirmed.
- **[Pending]**: unresolved or unverified. Not to be assumed or invented.

Priority:
- **MVP**: the implementation priority. Must work for the demo. Includes the personal baseline, baseline position, persistence detection and basic alert generation that the main demo story depends on.
- **DIFF**: differentiating features (Why Now explanation, Flight Surgeon Briefing, simulated outbox). Work on DIFF begins only after the implementation gate in section 1.1 is met.
- **OPT**: optional, only if time allows.

Owner: **A** (Health Intelligence & Data) | **B** (UI/UX & Frontend) | **S** (shared)

---

## 1. Purpose and scope

This document defines what GLORPULSE must do and how each requirement is checked. GLORPULSE is a browser-based prototype for astronauts on a simulated Mars transit. It uses simulated data only. It is decision support, not a medical device.

Scope and principles are defined in `product.md`. This document does not change them. If the two documents disagree, `product.md` wins and this document must be corrected.

Out of scope (from `product.md` 7.4): machine learning, AI-written medical advice, backend or database, login system, wearable or real-time sensor input, camera or image analysis, real NASA data feeds, 3D body, simulator game, any real transmission of health data.

### 1.1 Implementation gate
1. All MVP requirements are implemented first.
2. **DIFF work (Why Now, Flight Surgeon Briefing, simulated outbox) starts only after the core MVP works and these main acceptance tests pass:** AT-CREW-01 to AT-CREW-05 and AT-CREW-08 to AT-CREW-11, AT-STORY-01 to AT-STORY-03, AT-BASE, AT-TREND, AT-ALERT, AT-CHK, AT-DATA-01, AT-SRC-01, AT-SRC-02, AT-SRC-04 to AT-SRC-06, and AT-A11Y.
3. OPT features remain optional and are considered only if everything above is done.

## 2. Glossary

| Term | Meaning |
|---|---|
| Astronaut | A simulated person with an ID, their own readings and their own results |
| Indicator | Something we measure: heart rate, blood pressure, body temperature, blood glucose (optional), sleep, mood |
| Reading | One recorded value of an indicator on one mission day |
| Mission day | Day number in the simulated mission (1, 2, 3, ...). Each astronaut has a "current mission day" |
| Personal baseline | The astronaut's own starting normal for an indicator, calculated from their own first 7 days of readings |
| Baseline deviation | How far a reading is from that astronaut's baseline. A statistical comparison, not a clinical finding |
| Baseline position | Whether the astronaut's latest reading is above, within or below their personal baseline. A position at one moment, not a trend over time |
| General clinical reference range | A published range for a general population, with a verified source. Not personalised |
| Mission-approved limit | A limit set by a space-medicine authority for a mission. [Pending] Not available unless sourced, or explicitly labelled "simulated protocol" |
| Deviation run | A series of consecutive mission days on which an indicator deviated from baseline in the same direction |
| Sustained deviation | A deviation run of at least 3 days |
| Alert | A flag that something deserves attention. Four levels exist in the legend: Info, Watch, Action, Contact Flight Surgeon. Only Info, Watch and Action have automatic trigger rules (section 8.5) |
| Why Now explanation | The six-part explanation attached to an alert (DIFF) |
| Briefing | A report intended for a flight surgeon, displayed locally (DIFF) |
| Outbox | A list of briefings with simulated states (DIFF) |
| Source ID | Identifier of an entry in `references.md`. "Verified" means the full document was read, not a search snippet |

## 3. Users

| User | Needs |
|---|---|
| Astronaut (primary) | Enter readings, understand status, know what to do next. No medical training assumed |
| Flight surgeon (intended recipient) | Does not use the app. The briefing is written for them, but in the prototype it is only displayed locally |
| Judge / reviewer | A demo that works from start to finish and is honest about its limits |

## 4. Assumptions and constraints

1. Two-person team, about 48 hours, beginners using Kiro. [Confirmed]
2. Submission deadline and presentation duration: [Pending] confirmation.
3. React, Vite, TypeScript, Recharts, plain CSS, localStorage. No backend or database. No new dependencies without agreement of both team members. [Confirmed]
4. All data is simulated. No real personal health information is collected. English only. [Confirmed]
5. Readings are tied to mission days, not calendar dates. [Proposed default]
6. In the demo, every astronaut's current mission day is day 30, and seeded data covers days 1 to 30 (see FR-DATA). [Proposed default]
7. Derived results (baselines, baseline positions, runs, alerts, reference status) are always recalculated from stored readings and never saved themselves. This prevents stale results and mixed-up data. [Proposed default]
8. **The MVP check-in always uses the active astronaut's current mission day.** There is no control to choose another day. Entering a value for an indicator that already has a reading on the current mission day replaces the earlier entry. A control to advance the mission day is optional (FR-OPT-06). [Proposed default]
9. GLORPULSE does not calculate a statistical trend, rate of change or forecast. Change over time is shown by the charts and by the length of the deviation run.

## 5. User workflows

| ID | Workflow | Steps |
|---|---|---|
| WF-01 | First open | 1. App opens on the default astronaut. 2. A banner says data is simulated. 3. Dashboard shows a card for each tracked indicator with reference status, baseline state and baseline position. 4. Any alerts are listed |
| WF-02 | Switch astronaut | 1. Choose another astronaut in the selector. 2. All screens update to that astronaut. 3. The astronaut's name and ID stay visible |
| WF-03 | Daily check-in | 1. Open the check-in form. It is for the astronaut's current mission day, which is shown. 2. Enter values for tracked indicators and choose symptoms. 3. Invalid values are rejected with a message. 4. Submit. 5. Readings are saved for that astronaut and that day. A value for an indicator already recorded today replaces the earlier one. 6. Dashboard, charts and alerts update |
| WF-04 | Read an alert | 1. See an alert on the dashboard. 2. Open it to see level, indicator, reasons and the rule that triggered it. 3. (DIFF) Open the six-part Why Now explanation |
| WF-05 | Read a chart | 1. Open an indicator's chart. 2. See readings over time with the baseline band and, only if a verified range exists, the reference range |
| WF-06 | Baseline building | 1. View an indicator with fewer than 7 days of readings. 2. It says "building baseline, N of 7 days". 3. No deviation, baseline position or alert is claimed for it |
| WF-07 | Prepare a briefing (DIFF) | 1. Choose "Prepare briefing". 2. The briefing for the active astronaut is shown. 3. It is saved to the outbox |
| WF-08 | Simulated link (DIFF) | 1. Set the link Down. 2. Prepare a briefing: it shows "queued (simulated)". 3. Set the link Up. 4. Queued briefings show "sent (simulated)". Nothing is transmitted |
| WF-09 | Reset demo | 1. Choose "Reset demo". 2. Confirm. 3. All astronauts return to the original seeded data |

## 6. Functional requirements

### 6.1 Crew and profiles (FR-CREW)
| ID | Requirement | Pri | Owner | Verify |
|---|---|---|---|---|
| FR-CREW-01 | The system shall provide 3 to 4 simulated astronaut profiles, each with a unique ID and display name | MVP | A (data), B (display) | AT-CREW-01 |
| FR-CREW-02 | The system shall provide a selector to switch the active astronaut, usable by mouse and keyboard | MVP | B | AT-A11Y-01 |
| FR-CREW-03 | The active astronaut's name and ID shall be visible on every main screen | MVP | B | Visual check |
| FR-CREW-04 | Each astronaut shall have separate readings, symptoms, baselines, baseline positions, alerts, explanations and briefings | MVP | S | AT-CREW tests |
| FR-CREW-05 | Switching astronaut shall update all displayed information | MVP | B | AT-CREW-02 |
| FR-CREW-06 | Data from different astronauts shall never be mixed in any screen, calculation, stored record or briefing | MVP | S | AT-CREW tests |
| FR-CREW-07 | Each profile shall state which indicators are tracked. Blood glucose is tracked only for astronauts where it applies. An astronaut without glucose has no glucose card, input, chart or missing-data alert | MVP | A | AT-CREW-11 |
| FR-CREW-08 | There shall be no login, password or account system | MVP | S | No such screen exists |

### 6.2 Simulated data (FR-DATA)
| ID | Requirement | Pri | Owner | Verify |
|---|---|---|---|---|
| FR-DATA-01 | The system shall include seeded readings for each astronaut covering mission days 1 to 30. Designated supporting profiles (FR-DATA-03) contain missing days on purpose | MVP | A | Data present |
| FR-DATA-02 | **Primary demonstration story** (one astronaut): baseline days are steady; later, sleep declines and heart rate rises so that both reach a sustained deviation by day 30; a symptom is logged during the run. At day 30 this produces an Action alert on sleep and heart rate. Exact days and values are [Pending] design by Person A, chosen so the rules in section 8 produce this result. The story shall work using seeded data alone | MVP | A | AT-STORY-01 |
| FR-DATA-03 | **Supporting profiles**: (a) one astronaut with steady readings and no alerts, (b) one astronaut with missing days that demonstrate the missing-day rule, (c) if a fourth profile exists, one indicator with fewer than 7 days of readings to show "building baseline". At least one astronaut tracks glucose and at least one does not | MVP | A | AT-STORY-02, AT-CREW-11 |
| FR-DATA-04 | Every seeded reading shall be labelled simulated, and a visible notice shall state that all data is simulated | MVP | A (flag), B (notice) | Notice visible; flag present |
| FR-DATA-05 | Seeded data is authored to show how the rules behave. The interface and pitch shall not claim that the story shows real physiology or that the rules are medically validated | MVP | S | Text review |
| FR-DATA-06 | "Reset demo" shall delete all entered data and restore the seeded data for every astronaut | MVP | B (control), A (seed) | AT-DATA-01 |

### 6.3 Check-in (FR-CHK)
| ID | Requirement | Pri | Owner | Verify |
|---|---|---|---|---|
| FR-CHK-01 | The check-in shall accept the active astronaut's tracked indicators: heart rate, blood pressure (two values), body temperature, sleep, mood, and blood glucose where tracked | MVP | B (form), A (fields) | Form shows only tracked fields |
| FR-CHK-02 | The check-in shall offer a short predefined symptom list, which may be left empty. The list is [Pending] source research. A symptom selected again for the same mission day is recorded once | MVP | A (list), B (form) | List matches `references.md` |
| FR-CHK-03 | Each indicator shall have entry limits that reject typing errors. They are labelled "entry limits" and are not clinical thresholds. Values are [Pending] set by Person A | MVP | A | AT-CHK-01 |
| FR-CHK-04 | Invalid input shall be rejected with a clear message and shall not be saved | MVP | B (message), A (rule) | AT-CHK-01 |
| FR-CHK-05 | The check-in shall record readings and symptoms for the active astronaut's **current mission day only**, and shall display that day. The MVP has no control to choose a different day | MVP | S | AT-CHK-02, AT-CHK-04, AT-CREW-04 |
| FR-CHK-06 | An astronaut may skip any indicator. Only one reading per indicator per mission day is kept: a later entry for the same indicator on the same day **replaces** the earlier one | MVP | S | AT-CHK-03 |
| FR-CHK-07 | Mood shall be a non-diagnostic self-rating, labelled as such. The scale is [Pending] research | MVP | A | Label visible |
| FR-CHK-08 | Each field shall show a short "how to measure" hint (FR-INFO-01) | MVP | A (text), B (display) | Hint present |

### 6.4 Dashboard (FR-DASH)
| ID | Requirement | Pri | Owner | Verify |
|---|---|---|---|---|
| FR-DASH-01 | The dashboard shall show one card per tracked indicator for the active astronaut | MVP | B | Card count matches |
| FR-DASH-02 | Each card shall show on separate, labelled lines: latest value and unit; the mission day it was measured (and "last reading N days ago" when older than the current day); **Reference** status; **Your baseline** state; **Baseline position** (above, within, below, or not enough data); and the alert level, if any | MVP | B (display), A (values) | Visual check |
| FR-DASH-03 | Reference status, baseline position and alert level shall each use text and an icon, never color alone | MVP | B | AT-A11Y-02 |
| FR-DASH-04 | Reference status values shall be: **Within reference**, **Outside reference**, **Not assessed**. "Not assessed" applies where no verified reference range exists. [Proposed default] names | MVP | A (logic), B (display) | AT-SRC-01 |
| FR-DASH-05 | Active alerts for the active astronaut shall be listed on the dashboard. When there are none it shall say "No active alerts" | MVP | B | AT-ALERT tests |
| FR-DASH-06 | The dashboard shall show the simulated-data notice and the disclaimer | MVP | B | Visible |

### 6.5 Charts (FR-CHART)
| ID | Requirement | Pri | Owner | Verify |
|---|---|---|---|---|
| FR-CHART-01 | The system shall show a time-series chart per tracked indicator for the active astronaut. Blood pressure shows both values. The chart is how change over time is shown | MVP | B | One chart per indicator |
| FR-CHART-02 | Once the baseline is ready, the chart shall show the astronaut's baseline band (section 8.1) labelled "Your baseline (prototype)". While building, no band is shown | MVP | S | AT-BASE-01 |
| FR-CHART-03 | The chart shall show a general reference range only where a verified range exists, labelled with its source ID | MVP | S | AT-SRC-01 |
| FR-CHART-04 | Baseline band, reference range and mission limit shall use different labels and styles and shall never be merged or drawn as one band | MVP | B | AT-SRC-04 |
| FR-CHART-05 | Days with no reading shall appear as gaps, not zeros | MVP | B | AT-CHART-01 |
| FR-CHART-06 | Each chart shall have a text or table alternative for screen readers | MVP | B | Present |

### 6.6 Personal baseline (FR-BASE)
All rules are defined in section 8.1 and are prototype design choices.

| ID | Requirement | Pri | Owner | Verify |
|---|---|---|---|---|
| FR-BASE-01 | The system shall calculate a personal baseline per astronaut and per indicator from that astronaut's own readings only. Blood pressure has one baseline for each of its two values | MVP | A | AT-CREW-03 |
| FR-BASE-02 | The baseline shall follow the calculation in section 8.1 | MVP | A | AT-BASE-02 |
| FR-BASE-03 | While fewer than 7 days of readings exist, the baseline shall be "building, N of 7 days" and no deviation, baseline position or alert shall be claimed for that indicator | MVP | A (state), B (display) | AT-BASE-01 |
| FR-BASE-04 | The interface shall state that the baseline is a statistical comparison with the astronaut's own readings and not a medical finding | MVP | B | Label visible |

### 6.7 Baseline position and persistence (FR-TREND)
The ID prefix FR-TREND is kept for stability. These requirements do not calculate a statistical trend (assumption 9).

| ID | Requirement | Pri | Owner | Verify |
|---|---|---|---|---|
| FR-TREND-01 | The system shall classify each indicator's **baseline position** as above baseline, within baseline, below baseline, or not enough data, using section 8.3 | MVP | A | AT-TREND-01 |
| FR-TREND-02 | The system shall mark a reading as deviating from baseline using section 8.2 | MVP | A | AT-BASE-02 |
| FR-TREND-03 | The system shall measure deviation runs and sustained deviation using section 8.4, including its missing-day rules | MVP | A | AT-TREND tests |
| FR-TREND-04 | All baseline position and persistence results shall be labelled as prototype design choices, not medical thresholds | MVP | S | Label visible |

### 6.8 Alerts (FR-ALERT)
| ID | Requirement | Pri | Owner | Verify |
|---|---|---|---|---|
| FR-ALERT-01 | The alert legend shall define four levels: Info, Watch, Action, Contact Flight Surgeon. The system shall generate **Info, Watch and Action** automatically using section 8.5. **Contact Flight Surgeon has no automatic trigger until decision D-10 is made** | MVP | A | AT-ALERT tests, AT-ALERT-09 |
| FR-ALERT-02 | Each alert shall show the astronaut, indicator, level, reasons in plain language built from the astronaut's own numbers (for example "3 days in a row below your baseline"), the day the run began, and the rule that triggered it | MVP | A (data), B (display) | AT-ALERT-01 |
| FR-ALERT-03 | Alerts shall be recalculated from readings each time and not stored. When the conditions stop holding the alert disappears | MVP | A | AT-ALERT-06 |
| FR-ALERT-04 | The rule list shall be visible to the user and labelled "prototype simulated protocol, not a clinical threshold" | MVP | B | AT-ALERT-08 |
| FR-ALERT-05 | Reference status and mission limits shall not change an alert level. Alert levels depend only on baseline deviation and logged symptoms. [Proposed default] | MVP | A | AT-ALERT-07 |
| FR-ALERT-06 | The legend entry for Contact Flight Surgeon shall read "No automatic trigger in this prototype yet" until D-10 is decided. If a rule is later added, it shall be cited to a verified source or explicitly labelled "simulated protocol", and this requirement, section 8.5 and AT-ALERT-09 shall be updated | MVP | A (rule), B (legend) | AT-SRC-03, AT-ALERT-09 |
| FR-ALERT-07 | An alert belongs to one astronaut and shall not appear for another | MVP | S | AT-CREW-05 |

### 6.9 Why Now explanation (FR-WHY)
| ID | Requirement | Pri | Owner | Verify |
|---|---|---|---|---|
| FR-WHY-01 | Each alert shall open a Why Now explanation with six parts: (1) what changed, (2) how it compares with this astronaut's baseline, (3) why it may matter in spaceflight, (4) which NASA hazards may be relevant, (5) next steps to consider, (6) when to contact the flight surgeon | DIFF | A (content), B (layout) | AT-WHY-01 |
| FR-WHY-02 | Parts 1 and 2 shall be generated from the astronaut's own data | DIFF | A | Numbers match data |
| FR-WHY-03 | Parts 3, 4 and 5 shall come only from a sourced guidance table. Each statement carries a verified source ID. Where none exists the part reads "No sourced guidance available" | DIFF | A | AT-SRC-02 |
| FR-WHY-04 | Part 6 shall state the alert rule that applies. While D-10 is undecided it shall also state that no automatic Contact Flight Surgeon rule is defined in this prototype and shall otherwise read "No sourced guidance available". Once D-10 defines a rule, part 6 shall show it with its source or "simulated protocol" label | DIFF | A | AT-WHY-01 |
| FR-WHY-05 | Hazard tags shall use only the five NASA hazards in `product.md` and only where a verified source supports the link | DIFF | A | Each tag has a source ID |
| FR-WHY-06 | The explanation shall show baseline deviation, general reference range and mission limit as separate labelled items. A missing item reads "not available" | DIFF | S | AT-SRC-04 |
| FR-WHY-07 | The explanation shall include the disclaimer, the source list, and plain-language text within lengths agreed by A and B | DIFF | S | AT-WHY-01 |
| FR-WHY-08 | The Why Now feature shall work with an empty guidance table (every sourced part reads "No sourced guidance available") so that missing research never breaks the demo | DIFF | A | AT-WHY-02 |

### 6.10 Flight Surgeon Briefing and simulated outbox (FR-BRIEF)
| ID | Requirement | Pri | Owner | Verify |
|---|---|---|---|---|
| FR-BRIEF-01 | The system shall generate a briefing for the active astronaut and display it on screen | DIFF | A (data), B (display) | AT-BRIEF-03 |
| FR-BRIEF-02 | The briefing shall show the astronaut's name and ID, the period covered and the time created | DIFF | A | AT-CREW-06 |
| FR-BRIEF-03 | The briefing shall include latest readings with reference status, baseline state, baseline position and deviation run length, logged symptoms, active alerts, their Why Now explanations (where built), and the sources used | DIFF | A | AT-BRIEF-03 |
| FR-BRIEF-04 | The briefing shall state that it is generated from simulated data and is not transmitted | DIFF | B | Text visible |
| FR-BRIEF-05 | The flight surgeon is the intended recipient. The prototype shall only display and store the briefing locally and shall make no network request containing health data | DIFF | S | AT-BRIEF-02 |
| FR-BRIEF-06 | The system shall provide a simulated link toggle (Up/Down) | DIFF | B | Toggle works |
| FR-BRIEF-07 | The outbox shall show the states draft, queued (simulated) and sent (simulated). Wording shall make clear that no actual communication occurred | DIFF | S | Text review |
| FR-BRIEF-08 | While the link is Down a prepared briefing shall be queued. When the link goes Up, queued briefings shall change to sent (simulated) | DIFF | A (rules), B (display) | AT-BRIEF-01, 02 |
| FR-BRIEF-09 | The outbox shall list briefings per astronaut and shall not show another astronaut's briefings | DIFF | S | AT-CREW-06 |
| FR-BRIEF-10 | The interface may explain that the one-way Earth-Mars delay is approximately 4 to 24 minutes [REF-02]. It shall not simulate exact delay timing or claim to reproduce NASA communication systems | DIFF | B | Text matches REF-02 |

### 6.11 Information and sources (FR-INFO, FR-SRC)
| ID | Requirement | Pri | Owner | Verify |
|---|---|---|---|---|
| FR-INFO-01 | Each indicator shall have a plain-language "how to measure" and "why it matters" note. Content comes from verified sources only; otherwise it reads "No sourced guidance available" | MVP | A (content), B (display) | AT-SRC-02 |
| FR-INFO-02 | Blood glucose shall include a note explaining its context and limitations, from a verified source. [Pending] research | MVP | A | Note or "No sourced guidance available" |
| FR-SRC-01 | `references.md` shall list each source with ID, title, organisation, link, what it supports and verification status | MVP | A | AT-SRC-05 |
| FR-SRC-02 | Every medical statement, reference range, recommendation, hazard link and symptom note shall carry a verified source ID, or the interface shall display "No sourced guidance available" | MVP | S | AT-SRC-02 |
| FR-SRC-03 | A reference range shall not be displayed without a verified source ID. Without one, the status reads "Not assessed" | MVP | S | AT-SRC-01 |
| FR-SRC-04 | A source is "verified" only after the full document has been read. A search snippet is not enough | MVP | A | AT-SRC-05 |

### 6.12 Safety display (FR-SAFE)
| ID | Requirement | Pri | Owner | Verify |
|---|---|---|---|---|
| FR-SAFE-01 | The disclaimer (decision support, not diagnosis, not a medical device, does not replace medical professionals or mission protocols) shall appear on the dashboard footer, every Why Now explanation and every briefing | MVP | B (display), A (wording) | Present in all three |
| FR-SAFE-02 | The interface shall not name diseases or make diagnostic statements | MVP | A | AT-SRC-06 |
| FR-SAFE-03 | Prototype design choices (7-day baseline, spread rule, deviation limit, 3-day persistence, alert rules) shall be labelled as such wherever they appear | MVP | S | Labels visible |

### 6.13 Optional (OPT)
| ID | Requirement | Owner |
|---|---|---|
| FR-OPT-01 | Interactive body figure with clickable regions, using sourced content only | B (SVG), A (content) |
| FR-OPT-02 | Streaks and mission-routine prompts | A, B |
| FR-OPT-03 | Environment modes | A, B |
| FR-OPT-04 | Data confidence tips | A, B |
| FR-OPT-05 | Briefing download or PDF | B |
| FR-OPT-06 | "Advance mission day" control, so a live demo can move an astronaut to the next mission day and watch a deviation run grow. Not part of the MVP | S |

## 7. Data requirements

### 7.1 Information structures
Defined jointly by A and B before coding. A proposes, B reviews, both approve. Exact fields are decided in the TypeScript interface session.

| Structure | Represents | Key information |
|---|---|---|
| CrewProfile | One simulated astronaut | Unique ID, name, tracked indicators (glucose optional), current mission day |
| HealthIndicator | Definition of one measurement | ID, name, unit, entry limits, hazard tags, optional reference information with source IDs, optional mission-limit slot (empty unless sourced), how to measure, why it matters |
| HealthReading | One recorded value | Astronaut ID, indicator ID, mission day, value (two values for blood pressure), origin (seeded or entered) |
| SymptomReport | One logged symptom | Astronaut ID, mission day, symptom ID |
| PersonalBaseline | Astronaut's own starting normal for one indicator | Astronaut ID, indicator ID, state (building or ready), days counted, centre, spread, band edges |
| HealthStatus | Current judgement for one indicator | Astronaut ID, indicator ID, latest reading, reference status, baseline position, deviation run length and direction |
| HealthAlert | Something to notice | Astronaut ID, indicator ID, level (Info, Watch or Action; Contact Flight Surgeon is in the legend only), reasons, run start day, rule name |
| HealthExplanation (DIFF) | Why Now content | Six parts, hazard tags, source IDs, "no sourced guidance" flags, disclaimer |
| HealthSnapshot | Everything one screen needs for one astronaut at one moment | Astronaut ID, statuses, baselines, alerts, explanations |
| FlightSurgeonBriefing (DIFF) | The report | ID, astronaut ID and name, period, created time, contents, sources, simulated-data statement |
| OutboxItem (DIFF) | A briefing in the simulated outbox | Briefing ID, astronaut ID, state, queued and sent times, simulated flag |
| SourceReference | A citable source | Source ID, title, organisation, link, what it supports, verification status |

Rule: every structure that belongs to an astronaut carries the astronaut ID.

### 7.2 Data rules
| ID | Requirement | Pri | Owner |
|---|---|---|---|
| DR-01 | Reference information, baseline information and mission-limit information shall be separate fields and never combined | MVP | A |
| DR-02 | A reference range shall have a verified source ID or shall not exist | MVP | A |
| DR-03 | Seeded data is part of the program. Entered readings and symptoms (and, for DIFF, briefings and outbox items) are saved in localStorage under keys that include the astronaut ID | MVP | B |
| DR-04 | Derived results (baseline, baseline position, run, alert, status) shall never be saved to localStorage | MVP | S |
| DR-05 | Stored data shall carry a version number so that a format change can be detected and handled by resetting | MVP | S |
| DR-06 | The health logic shall receive one astronaut's records at a time, so it cannot mix astronauts. It shall not read or write localStorage or touch the screen | MVP | A |
| DR-07 | A mock snapshot shall be provided early so B can build screens before the real logic exists | MVP | A |
| DR-08 | Reset shall delete all entered data and restore the seeded data | MVP | B |

## 8. Health logic rules (prototype design choices)

These are statistical and rule-based choices made for the prototype. They are not medical thresholds, are not clinically validated, and shall be labelled that way in the interface. Values marked [Pending] are chosen by Person A and approved by Person B.

### 8.1 Baseline
1. A baseline is calculated separately for each astronaut and each indicator. Blood pressure is treated as two indicators (systolic and diastolic).
2. **Window:** the first 7 mission days on which that indicator has a reading. Days with no reading are skipped and do not count. [Proposed default]
3. **State:** with fewer than 7 such days the baseline is *building* ("N of 7 days"). With 7 it is *ready*.
4. **Centre:** the median of the 7 values.
5. **Spread:** the median absolute deviation (MAD): take each value's distance from the centre, then the median of those distances. [Proposed default]
6. **Spread floor:** a minimum spread per indicator, so identical baseline values do not create a zero spread. Values are [Pending] set by Person A and labelled as design choices.
7. **Frozen:** once ready, the baseline is not updated by later readings. This keeps a slow decline from becoming the new normal. Its limitation (it does not follow long-term adaptation) is stated in the interface. [Proposed default]
8. **Baseline band** (for charts): centre minus K times spread up to centre plus K times spread, using the larger of spread and floor, with K from section 8.2.
9. If a baseline-window reading is replaced or a missing day is later filled in, the baseline is recalculated from stored readings (DR-04).

### 8.2 Deviation of a reading
1. A reading is checked only after the baseline is ready and only if its mission day is after the baseline window. Readings inside the baseline window are never flagged.
2. **Deviation score** = distance of the reading from the centre, divided by the larger of the spread and the floor.
3. A reading *deviates* when its score is at least **K**. K = 3 [Proposed default, prototype design choice, to be tested against the seeded story].
4. The deviation has a direction: *above* or *below* the centre.
5. Blood pressure: the systolic and diastolic values are checked separately. A day deviates if either deviates.

### 8.3 Baseline position
1. Baseline position applies only when the indicator's baseline is ready. Otherwise it is *not enough data*.
2. It uses the astronaut's most recent reading on or before the evaluation day (section 8.4). The card shows the mission day of that reading.
3. The position is *above baseline* if that reading deviates above the centre (section 8.2), *below baseline* if it deviates below, and *within baseline* otherwise.
4. Baseline position describes where the latest reading sits at one moment. **It is not a trend over time.** GLORPULSE does not calculate rates of change, slopes or forecasts. Change over time is shown by the chart (FR-CHART-01) and by the length of the deviation run (section 8.4).
5. Baseline position is always described as "compared with your baseline".
6. Blood pressure: systolic and diastolic each have a position. The card shows both.

### 8.4 Deviation runs, persistence and missing days
1. A *deviation run* is the longest series of consecutive mission days, ending at the evaluation day, where each day has a reading that deviates in the **same direction**.
2. The **evaluation day** is the astronaut's current mission day. If the current day has no reading yet, it is treated as *pending* and does not break a run: the run is evaluated through the previous day, and the dashboard says "today's check-in not recorded yet".
3. **Missing day:** a past mission day with no reading ends the run. Counting restarts after the gap. A gap is never filled in or guessed. The dashboard shows the gap. [Proposed default, prototype design choice. Decision D-09]
4. A day with a non-deviating reading ends the run. A deviation in the opposite direction starts a new run.
5. A run is *sustained* when it is at least **3** days long. [Proposed default, prototype design choice]
6. Blood pressure: systolic and diastolic have their own runs. The indicator is sustained if either is sustained.

### 8.5 Alert rules (prototype simulated protocol)
Alerts are derived (FR-ALERT-03). The highest applicable level is shown per indicator. No rule uses a clinical threshold.

| Level | Condition | Automatic trigger in the MVP? |
|---|---|---|
| Info | (a) the latest evaluated day deviates but the run is shorter than 3 days; or (b) a symptom is logged on the current day or the previous day. The Info text names the symptom and gives no interpretation | Yes |
| Watch | Sustained deviation in one indicator | Yes |
| Action | Sustained deviation in one indicator, and either (a) sustained deviation in a different indicator, or (b) a symptom logged on any day from the run's start day to the evaluation day | Yes |
| Contact Flight Surgeon | [Pending] No rule is defined. The level exists in the alert legend and the data model only. See D-10 | **No. No automatic trigger until D-10 is decided** |

Indicators whose baseline is still building produce no deviation-based alert. Reference status does not change the level (FR-ALERT-05).

### 8.6 Three kinds of comparison (always separate)

| Kind | Where it comes from | Displayed as | Used for alert level? |
|---|---|---|---|
| Personal baseline deviation | The astronaut's own first 7 days (section 8.1) | "Your baseline (prototype)" band and text | Yes |
| General clinical reference range | A verified source only | "Reference (source ID)" band and the Reference status line. Otherwise "No sourced reference range available" / Not assessed | No |
| Mission-approved limit | A verified space-medicine source, or labelled simulated protocol | "Mission limit (source ID or simulated)". [Pending] Otherwise "not available" | No (unless D-10 defines a labelled rule) |

### 8.7 Other pending medical content
| Topic | Status |
|---|---|
| Reference ranges for the six indicators | [Pending] research. Not shown until verified |
| Mood scale | [Pending] research |
| Symptom list | [Pending] research |
| Glucose context note | [Pending] research |
| Spaceflight sleep statistic, if used | [Pending] research; not used until a source is read in full |
| Hazard links and next-step text | [Pending] research; "No sourced guidance available" until verified |

## 9. Non-functional requirements

| ID | Requirement | Pri | Owner | Verify |
|---|---|---|---|---|
| NFR-A11Y-01 | Aim for WCAG 2.2 AA. No claim of formal compliance without testing | MVP | B | Checklist and tools |
| NFR-A11Y-02 | Reference status, baseline position, alert level and chart meaning are never shown by color alone | MVP | B | AT-A11Y-02 |
| NFR-A11Y-03 | All controls (selector, form, alerts, reset, and for DIFF the link toggle and briefing) work by keyboard with visible focus | MVP | B | AT-A11Y-01 |
| NFR-A11Y-04 | Form fields have labels and error messages that assistive technology can read | MVP | B | Check |
| NFR-A11Y-05 | Text contrast aims to meet AA | MVP | B | Contrast tool |
| NFR-USE-01 | A first-time user can complete a check-in without instructions | MVP | B | Test with a person outside the team |
| NFR-USE-02 | Plain language, with terms explained | MVP | S | Read-aloud review |
| NFR-PERF-01 | Screens update quickly after submit and after switching astronaut. Target under 1 second on a normal laptop. [Proposed default] | MVP | S | Manual timing |
| NFR-OFF-01 | After load, the app works without network access and sends no health data over a network | MVP | S | Browser network tab |
| NFR-PRIV-01 | No real personal data, analytics or tracking | MVP | S | Review |
| NFR-BRW-01 | Works in current Chrome and Edge. Others [Pending] | MVP | B | Manual test |
| NFR-RESP-01 | Usable on a laptop and a projector. Mobile optional [Proposed default] | MVP | B | Manual test |
| NFR-MAINT-01 | Folder ownership: A owns data and logic; B owns components, pages, styles and storage; shared types change only when both agree | MVP | S | Review |
| NFR-TEST-01 | The health logic has a written list of known test cases that both people can read (the AT-BASE, AT-TREND and AT-ALERT cases) | MVP | A | List exists |
| NFR-LANG-01 | English only | MVP | S | |

## 10. Technical constraints

- React, Vite, TypeScript, Recharts, plain CSS, localStorage. [Confirmed]
- No backend, database, accounts or real-time connection. [Confirmed]
- No additional dependencies without both team members agreeing. [Confirmed]
- Shared TypeScript types are agreed before either person implements their part.
- The interface never calculates status, baseline, baseline position, alert or explanation. It only displays what the health logic returns. [Proposed default]
- The health logic never touches the screen or localStorage and receives one astronaut's records at a time. [Proposed default]

## 11. Safety and medical limitations

1. GLORPULSE is a hackathon prototype. It is not a medical device and is not clinically validated.
2. It does not diagnose or treat. It does not replace medical professionals or mission protocols.
3. Reference ranges are general references unless a cited source says otherwise.
4. Baseline deviation and baseline position are statistical comparisons, not clinical findings.
5. Personal baseline, general clinical reference ranges and mission-approved limits stay separate in data, calculations, charts, alerts, explanations and briefings.
6. No unsourced reference range, recommendation or hazard link is displayed. Missing guidance reads "No sourced guidance available".
7. Any escalation rule not backed by a verified source is labelled "simulated protocol". No clinical escalation threshold is invented. The Contact Flight Surgeon level has no automatic trigger until D-10 is decided.
8. All unresolved medical thresholds and guidance remain [Pending] research until Person A verifies a source.
9. All data is simulated and labelled as such.

## 12. Acceptance criteria

Test fixtures below use neutral numbers to check the rules. They are not medical data. K = 3 and the 3-day persistence rule are assumed, and the spread floor is assumed to be no larger than the spread in the fixture.

### 12.1 Astronaut separation (AT-CREW)

Use at least two astronauts: Astronaut 1 (primary story) and Astronaut 2.

| ID | Test | Expected result |
|---|---|---|
| AT-CREW-01 | Open the list of astronauts | 3 to 4 profiles, each with a unique ID |
| AT-CREW-02 | Switch from Astronaut 1 to Astronaut 2 and back | Name, ID, dashboard cards, charts, alerts, explanations, symptoms and briefing list all change with each switch. Nothing from the previous astronaut remains |
| AT-CREW-03 | Compare baselines for the same indicator across astronauts, then change a reading for Astronaut 1 | Baselines reflect each astronaut's own data. Astronaut 2's baseline is unchanged |
| AT-CREW-04 | Submit a check-in as Astronaut 1, then view Astronaut 2 | Astronaut 2's readings, charts, baselines, baseline positions and alerts are unchanged. Astronaut 1 shows the new reading |
| AT-CREW-05 | Show the demonstration alert on Astronaut 1, then switch to Astronaut 2 | The alert does not appear for Astronaut 2 (and, if built, neither does its explanation) |
| AT-CREW-06 | (DIFF) Create a briefing for Astronaut 1, switch to Astronaut 2 and create another | Each briefing shows only its own astronaut's name, ID, readings, alerts, symptoms and explanations. Each outbox shows only its own items |
| AT-CREW-07 | Switch astronauts while the check-in form is half filled | Unsaved entries are not submitted to the new astronaut. Whether they are discarded or the user is warned is [Pending] decision D-11 |
| AT-CREW-08 | Reload the page after entering data for two astronauts | Each astronaut's saved data returns to the correct astronaut |
| AT-CREW-09 | Inspect stored data | Every stored record carries an astronaut ID |
| AT-CREW-10 | Switch astronauts rapidly several times | The displayed name and ID always match the displayed data |
| AT-CREW-11 | Open an astronaut without glucose | No glucose card, input, chart or missing-data alert. Other astronauts are unaffected, and an astronaut with glucose still shows it |

### 12.2 Primary story (AT-STORY)

| ID | Test | Expected result |
|---|---|---|
| AT-STORY-01 | With freshly reset seeded data, open the primary astronaut at mission day 30 | Baselines for sleep and heart rate are ready. Sleep is below baseline and heart rate is above baseline. Both show a sustained deviation. A symptom is logged within the run. An Action alert is shown for sleep and for heart rate. No Contact Flight Surgeon alert appears. No network connection is needed |
| AT-STORY-02 | Open each supporting profile | Steady profile: "No active alerts". Missing-day profile: gap visible and the run restarts after it. Building profile (if present): "building baseline" with no alert |
| AT-STORY-03 | Press Reset demo after entering data | All data returns to the seeded state and AT-STORY-01 passes again |

### 12.3 Baseline, baseline position and alerts

| ID | Test | Expected result |
|---|---|---|
| AT-BASE-01 | An indicator with 3 days of readings | "Building baseline, 3 of 7 days". No band on the chart, no baseline position, no deviation, no alert |
| AT-BASE-02 | Fixture: first 7 readings 6.8, 7.0, 7.1, 7.0, 6.9, 7.2, 7.0 | Centre 7.0, spread 0.1. Baseline band 6.7 to 7.3. A reading of 5.9 on day 8 deviates below. A reading of 7.2 does not deviate |
| AT-BASE-03 | Same fixture, but day 3 has no reading and the seventh reading is on day 8 | The window is the first 7 days that have readings, so the baseline completes on day 8. It does not change after later readings (frozen) |
| AT-BASE-04 | Add or replace a reading inside the baseline window after it was ready | Baseline is recalculated from stored readings |
| AT-TREND-01 | Fixture baseline above. Latest reading 5.9, then 7.2, then 8.1. Also an indicator whose baseline is building | 5.9 is *below baseline*. 7.2 is *within baseline*. 8.1 is *above baseline*. A building baseline shows *not enough data*. Position is described "compared with your baseline" and no "rising" or "falling" label appears anywhere |
| AT-TREND-02 | Two deviating days, then a normal day | While the run is 1 or 2 days long the level is Info. After the normal day the run ends and no deviation alert remains. A Watch alert never appears |
| AT-TREND-03 | Three consecutive deviating days in the same direction | Sustained. Watch alert |
| AT-TREND-04 | Deviations on days 20, 21, no reading on day 22, deviations on days 23, 24, 25 | Run restarts after day 22. At day 24 the run is 2. At day 25 it is 3 and sustained |
| AT-TREND-05 | Deviating days 28 and 29, no reading yet on day 30 (current day) | Current day is pending. Run is evaluated through day 29 (length 2). The dashboard says today's check-in is not recorded |
| AT-TREND-06 | Deviation below on day 27, deviation above on days 28 and 29 | The earlier run ends. The new run has length 2 |
| AT-TREND-07 | Blood pressure: systolic deviates for 3 days, diastolic does not | Sustained for blood pressure. The alert names systolic |
| AT-ALERT-01 | Sustained deviation in sleep only, no symptom | Watch for sleep. The alert shows astronaut, reasons from own numbers, run start day and rule name |
| AT-ALERT-02 | Sustained deviation in sleep and in heart rate | Action for both |
| AT-ALERT-03 | Sustained deviation in sleep and a symptom logged within the run | Action for sleep |
| AT-ALERT-04 | Same as AT-ALERT-03 but the symptom was logged before the run began | Watch, not Action |
| AT-ALERT-05 | Symptom logged on the current day with no deviation | Info naming the symptom, with no interpretation |
| AT-ALERT-06 | Replace a deviating reading so the run is no longer 3 days | The alert disappears or lowers on the next update |
| AT-ALERT-07 | Change or add a reference range for an indicator | Alert level does not change |
| AT-ALERT-08 | Check the rule list on screen | Rules are visible and labelled prototype simulated protocol |
| AT-ALERT-09 | Run every seeded profile and the fixtures above, including long sustained runs with a symptom | No scenario produces a Contact Flight Surgeon alert. The legend shows the level with "No automatic trigger in this prototype yet" |

### 12.4 Check-in and data

| ID | Test | Expected result |
|---|---|---|
| AT-CHK-01 | Enter an out-of-limit value | Rejected, message shown, nothing saved |
| AT-CHK-02 | Enter a valid check-in | Saved for the active astronaut's current mission day. Dashboard, charts and alerts update |
| AT-CHK-03 | Submit a second value for the same indicator on the same mission day | The later value replaces the earlier one. Only one reading remains |
| AT-CHK-04 | Open the check-in form | The current mission day is displayed and there is no control to choose another day |
| AT-CHART-01 | A day with no reading | A gap in the line, not zero |
| AT-DATA-01 | Enter data, then press Reset demo | All astronauts return to seeded data |

### 12.5 Sources and safety (AT-SRC)

| ID | Test | Expected result |
|---|---|---|
| AT-SRC-01 | For each indicator without a verified reference range, view the card, chart and explanation | Reference status reads Not assessed. No range is drawn. Text reads "No sourced reference range available" |
| AT-SRC-02 | Check every explanation, how-to-measure note and recommendation for a verified source ID | Each has one, or reads "No sourced guidance available" |
| AT-SRC-03 | View the Contact Flight Surgeon level in the legend | It states that no automatic trigger exists yet. If D-10 later adds a rule, the rule is visible and cited or labelled "simulated protocol" |
| AT-SRC-04 | View baseline band, reference range and mission limit on one chart and one explanation | Three different labels and styles. None is merged |
| AT-SRC-05 | Open `references.md` | Each source has a verification status. None is marked verified from a snippet only |
| AT-SRC-06 | Search interface text for disease names or diagnostic wording | None found |

### 12.6 DIFF features (start only after the gate in section 1.1)

| ID | Test | Expected result |
|---|---|---|
| AT-WHY-01 | Open the primary story's alert explanation | Six parts present, numbers match the data, sources and disclaimer shown. Part 6 states the alert rule and that no automatic Contact Flight Surgeon rule is defined |
| AT-WHY-02 | Open it with an empty guidance table | Parts 3 to 5 read "No sourced guidance available". Parts 1, 2 and 6 still work |
| AT-BRIEF-01 | Prepare a briefing with the link Down | Shows queued (simulated) |
| AT-BRIEF-02 | Set the link Up and watch the network tab | Queued briefings show sent (simulated). No network request with health data |
| AT-BRIEF-03 | Read the briefing | Shows astronaut name and ID, period, readings, baseline state, baseline position and run length, symptoms, alerts, explanations, sources and the simulated-data statement |

### 12.7 Accessibility

| ID | Test | Expected result |
|---|---|---|
| AT-A11Y-01 | Complete the MVP flow with keyboard only | Every step possible with visible focus |
| AT-A11Y-02 | View the app in greyscale | Reference status, baseline position and alert level are still clear from text and icons |

### 12.8 Final demo checklist
- [ ] The primary story (AT-STORY-01) runs without errors using seeded data.
- [ ] All MVP acceptance tests in the gate (section 1.1) pass.
- [ ] All AT-SRC tests pass.
- [ ] Simulated-data notice, disclaimer and "building baseline" state are visible where they apply.
- [ ] No unsourced reference range appears anywhere.
- [ ] The Contact Flight Surgeon level is shown only in the legend, as having no automatic trigger, unless D-10 has been decided.
- [ ] If DIFF features are built: AT-WHY and AT-BRIEF pass.
- [ ] The app runs from a public link and after a reset.
- [ ] Deadline and presentation duration confirmed. [Pending]

## 13. Traceability to the NASA challenge

| Challenge expectation | Requirements |
|---|---|
| Gather health indicators | FR-CHK, FR-DATA |
| Evaluate and act on health status | FR-DASH, FR-BASE, FR-TREND, FR-ALERT, FR-WHY |
| Visual tool, charts, color coding | FR-DASH, FR-CHART, NFR-A11Y |
| Do not assume astronauts know everything | FR-INFO, FR-WHY, NFR-USE |
| Hazards and health indicators | FR-WHY-05, FR-INFO |
| When to contact flight surgeons | FR-ALERT, FR-WHY-04, FR-BRIEF |
| Multiple crew | FR-CREW, AT-CREW |
| Optional body figure | FR-OPT-01 |

## 14. Responsibility matrix

| Area | Person A | Person B | Shared |
|---|---|---|---|
| Source research and `references.md` | Owns | Spot-checks | |
| Indicator definitions and entry limits | Owns | Reviews | |
| Simulated data, primary story and reset seed | Owns | | |
| Baseline, deviation, baseline position, persistence (section 8) | Owns | Reviews | |
| Alert rules and alert data | Owns | Reviews | |
| Why Now content (DIFF) and briefing data (DIFF) | Owns | | |
| TypeScript interfaces | Proposes | Reviews | Both approve |
| Layout, design, CSS | | Owns | |
| Crew selector, dashboard, check-in form | | Owns | |
| Charts | | Owns | Both agree data needs |
| Alert, Why Now and briefing screens | | Owns | |
| localStorage and reset control | | Owns | |
| Accessibility | | Owns | Both test |
| Integration, testing, demo, pitch | | | Both |
| Optional features | Content | Interface | |

## 15. Decisions still needing approval

| # | Decision | Owner | Status |
|---|---|---|---|
| D-01 | Submission deadline | Both | [Pending] |
| D-02 | Presentation duration | Both | [Pending] |
| D-03 | Reference ranges, sources and status mapping for the six indicators | A | [Pending] research |
| D-04 | Mood scale | A | [Pending] research |
| D-05 | Symptom list | A | [Pending] research |
| D-06 | Which astronauts track glucose, and the glucose context note | A | [Pending] |
| D-07 | Spread floor per indicator, and entry limits | A, reviewed by B | [Pending] |
| D-08 | K (deviation limit) and persistence length | A, reviewed by B | [Proposed default] K = 3, 3 days |
| D-09 | Missing-day rule: a gap ends the run | A, reviewed by B | [Proposed default] |
| D-10 | Contact Flight Surgeon trigger rule. **Until decided, the level has no automatic trigger** (legend only) | A, reviewed by B | [Pending] (see options below) |
| D-11 | Switching astronaut with an unsaved form | B | [Pending] |
| D-12 | Frozen baseline versus rolling baseline | A, reviewed by B | [Proposed default] frozen |
| D-13 | Reference status does not affect alert level (FR-ALERT-05) | Both | [Proposed default] |
| D-14 | MVP check-in uses the current mission day (day 30 in the demo); "Advance mission day" is optional (FR-OPT-06) | Both | [Proposed default] |
| D-15 | Status names (Within reference / Outside reference / Not assessed) | Both | [Proposed default] |
| D-16 | Browser support beyond Chrome and Edge | B | [Pending] |
| D-17 | Briefing download or PDF | B | Optional |

D-10 options: (1) keep no automatic rule (the current state); (2) a simulated-protocol rule such as "Action level continues for N further days", clearly labelled, with N chosen by the team; (3) a rule from a verified source, if research finds one. Choosing option 2 or 3 requires updating FR-ALERT-01, FR-ALERT-06, FR-WHY-04, section 8.5 and AT-ALERT-09.

## 16. References

| ID | Source | Used for | Status |
|---|---|---|---|
| REF-01 | NASA Human Research Program, "5 Hazards of Human Spaceflight", https://www.nasa.gov/hrp/hazards/ | The five hazards | Verified for this claim only. See `references.md` |
| REF-02 | NASA, "Space Communications: 7 Things You Need to Know", https://www.nasa.gov/missions/tech-demonstration/space-communications-7-things-you-need-to-know/ | One-way Earth-Mars delay of approximately 4 to 24 minutes | Page read in full |
| REF-03 | NASA Exploration Medical Capability, EIMO Concept of Operations, https://ntrs.nasa.gov/api/citations/20240001402/downloads/2024_IWS_EIMO_ConOps_FINAL.pdf | Earth-Independent Medical Operations context | Verified for this context claim only. See `references.md` |

## 17. Suggested build order and cut list

For a two-person beginner team in about 48 hours. This is guidance, not a requirement. The order follows the implementation gate in section 1.1.

1. Agree TypeScript types and a mock snapshot (A and B together).
2. Seed data, crew selector, dashboard cards on the mock (A seeds, B builds).
3. Check-in form (current mission day only) and localStorage storage; Reset demo.
4. Real baseline, deviation, baseline position, persistence and alert logic (Info, Watch, Action), checked with the AT-BASE, AT-TREND and AT-ALERT cases.
5. Charts with baseline band; information notes; safety display.
6. Verify the primary story and the MVP acceptance tests listed in section 1.1.
7. **Only then** start DIFF: Why Now explanation, then briefing and simulated outbox.
8. Accessibility pass, deploy, rehearse.

If time runs short, cut in this order: all OPT items; briefing download; Why Now layout polish; the briefing and outbox (keep a plain on-screen briefing); the supporting profiles' extra scenarios. Never cut: data separation between astronauts, the sourced-or-"No sourced guidance available" rule, the simulated-data labels, or the primary story.
