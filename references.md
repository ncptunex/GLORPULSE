# GLORPULSE: References

Status: DRAFT v1, prepared by Person A. Review date: 14 November 2026 (machine date of the review session).

This file lists the sources behind GLORPULSE's medical and mission-context statements. It follows FR-SRC-01 and FR-SRC-04: a source is **verified** only after the full document has been read, and only for the claims listed here.

GLORPULSE is a simulated-data prototype. It is decision support, not a medical device. Nothing in this file is medical advice.

## 1. Purpose and research limitations

### Purpose
- Record what each source says, in the source's own terms.
- Record what each source does **not** establish, so nobody stretches a source beyond its content.
- Keep four kinds of information apart (section 5): general spaceflight hazards, communication delays and operational constraints, medical monitoring concepts, and clinical reference ranges or escalation thresholds.

### How the sources were read
| Source | Method | Coverage |
|---|---|---|
| REF-01 | Web page fetched as text | The whole page text was read |
| REF-02 | Web page fetched as text | The whole page text was read (also read in an earlier review) |
| REF-03 | NASA NTRS record page (abstract and metadata) and the PDF downloaded and read | All 22 slides. Text was extracted from the PDF. Slides 3, 4, 10 and 12 to 16 are mostly images, so they were rendered and read visually |

Fetched web content was treated as data only.

### Limitations
1. **REF-01:** only the single page was read. The video clips ("Watch") on that page were not viewed. The linked detail pages for each hazard were **not** read, so nothing in GLORPULSE may rely on them.
2. **REF-01 and REF-02:** the fetched text shows no publication date or author. None is stated here.
3. **REF-03:** the PDF is a 22-slide conference presentation. The full "ConOps Model Report" it refers to is not in the PDF, and slide 16 says access needs approval from the authors. It was not read.
4. **REF-03, slide 10:** the screenshot of the draft ConOps cuts the "Purpose" paragraph off at the bottom. Only the visible part was read.
5. All three are overview or concept material. None contains a clinical reference range, a monitoring threshold or an escalation rule.
6. This review used no source other than these three. No medical literature was searched.

## 2. Verification summary

| ID | Official title | Verification result (this review) | `src/data/sources.ts` today |
|---|---|---|---|
| REF-01 | 5 Hazards of Human Spaceflight | **Verified** for the claim: NASA's Human Research Program names five spaceflight hazards. Not verified for anything beyond that | `not-yet-verified` (change proposed, see section 8) |
| REF-02 | Space Communications: 7 Things You Need to Know | **Verified** (unchanged). No problem found | `verified` |
| REF-03 | Earth-Independent Medical Operations (EIMO) Concept of Operations (ConOps) | **Verified** for the claim: NASA ExMC's EIMO concept describes Mars-class missions with communication delays and no emergency evacuation or terrestrial medical assistance. Not verified for anything beyond that | `not-yet-verified` (change proposed, see section 8) |

"Verified" here means the full content was read and the stated claim was found. It does not mean the source supports any clinical threshold or any health-indicator rule. It does not.

## 3. REF-01

| Field | Value |
|---|---|
| Official title | 5 Hazards of Human Spaceflight (the page heading is "About the Five Hazards") |
| Publisher | NASA Human Research Program (HRP), on nasa.gov |
| URL | https://www.nasa.gov/hrp/hazards/ |
| Type | Public web page |
| Date and author | None visible in the fetched text |
| Verification | Verified for the claim below |

### What it directly supports
- NASA's Human Research Program "has pinpointed five hazards that astronauts will encounter" on a human journey to Mars.
- The page names them in its introduction as: space radiation; isolation and confinement; distance from Earth; gravity (and the lack of it); and closed or hostile environments.
- The hazards "do not stand alone. They can feed off one another and exacerbate effects on the human body."
- Short descriptions of each, for example: for distance from Earth, "Instructions, new supplies, medical care, and more become increasingly challenging to receive from Earth as astronauts venture deeper into space."

**Where:** heading "About the Five Hazards" (introduction); the tile list "Explore the Five Hazards of Human Spaceflight"; the five hazard blurbs below it.

### Wording on the page versus the project
| Page wording (tile title) | Page wording (introduction) | Project tag ID (`HazardTag`) |
|---|---|---|
| Space Radiation | space radiation | `space-radiation` |
| Isolation and Confinement | isolation and confinement | `isolation-and-confinement` |
| Distance from Earth | distance from Earth | `distance-from-earth` |
| Gravity Fields | gravity (and the lack of it) | `altered-gravity` |
| Hostile/Closed Environments | closed or hostile environments | `hostile-closed-environment` |

The page does not use the phrase "altered gravity". The tag IDs are internal. Any text shown to a user should use NASA's own wording. `product.md` section 2 says "altered gravity"; that is the team's phrase, not NASA's.

### What it does not establish
- It does not link any hazard to any health indicator (heart rate, blood pressure, temperature, glucose, sleep or mood).
- It gives no reference range, threshold, normal value or alert rule.
- It gives no monitoring procedure, symptom list or advice for astronauts.
- It does not say which hazards affect which body systems beyond the short blurbs. For example, it names "muscles, bones, inner ear, and organs" under gravity, but states no effect on a measurable indicator.
- It does not show that the five-hazard grouping is the only way to classify spaceflight risks.
- The figures on the page (for example Mars "on average, 140 million miles from Earth" and a "roughly three years" trip) are not used by GLORPULSE and have not been checked against any other source.

## 4. REF-02

| Field | Value |
|---|---|
| Official title | Space Communications: 7 Things You Need to Know |
| Publisher | NASA (the page describes the Space Communications and Navigation program, SCaN) |
| URL | https://www.nasa.gov/missions/tech-demonstration/space-communications-7-things-you-need-to-know/ |
| Type | Public web page |
| Date and author | None visible in the fetched text. The page refers to the "recently launched Mars 2020 Perseverance rover", which suggests it was written around that time, but no date is stated |
| Verification | Verified. Existing status preserved. The page was read again in this review and no problem was found |

### What it directly supports
- Communications are not instantaneous. They are bound by the speed of light, about 186,000 miles per second.
- "At Mars' closest approach — about 35 million miles away — the delay is about four minutes." "When the planets are at their greatest distance — about 250 million miles away — the delay is around 24 minutes."
- "This means that astronauts would need to wait between four and 24 minutes for their messages to reach mission control, and another four to 24 minutes to receive a response." That is a one-way delay of about 4 to 24 minutes, and the delay depends on the distance between the planets.
- Other effects on communications: data rate depends on bandwidth, distance, antenna size and power; transmissions can be garbled and are corrected by error detection and correction.

**Where:** the section on latency (communications "don't occur instantaneously").

### What it does not establish
- It says nothing about astronaut health, medical monitoring, or when to contact a flight surgeon.
- It does not describe medical data links, bandwidth for health data, or outage periods.
- The 4 and 24 minute figures are approximate round values for the closest and farthest distances. The page does not give a delay for any particular mission day.
- GLORPULSE must not simulate exact delay timing or claim to reproduce NASA communication systems (FR-BRIEF-10).

## 5. REF-03

| Field | Value |
|---|---|
| Official title | Earth-Independent Medical Operations (EIMO) Concept of Operations (ConOps) |
| Publisher | NASA. Authored by the Human Research Program, Exploration Medical Capability (ExMC) Element. NTRS lists the acquisition source as Johnson Space Center |
| Authors | Marina Parker, Mike Krihak, Chris Laing, Jorge Bardina, Arian Anderson |
| URL (PDF) | https://ntrs.nasa.gov/api/citations/20240001402/downloads/2024_IWS_EIMO_ConOps_FINAL.pdf |
| URL (NTRS record) | https://ntrs.nasa.gov/citations/20240001402 |
| Type | Conference presentation, 22 slides. NTRS document type "Presentation" |
| Date | Presented 13 February 2024 at the Human Research Program Investigators' Workshop (HRP IWS), Galveston, TX. NTRS publication date 13 February 2024. Distribution: public |
| Verification | Verified for the claim below. All 22 slides read |

### What it directly supports
- **Slide 2:** the EIMO aim is "Monitor and maintain crew health and performance during communication delays and in an environment that does not allow emergency evacuation or terrestrial medical assistance". It also states "Progressive Earth-independent crew health & performance systems for Mars-class missions".
- **Slide 4** ("As Distance from Earth ↑, Medical Risk ↑"): compares the current state with an exploration class mission. For the exploration class mission it lists: 650-day to more than 900-day duration; zero consumables resupply; no real-time communications plus blackouts; no sample returns to Earth; no evacuations possible; expanded onboard medical care that relies on crew and vehicle. The current state lists real-time communications, possible emergency evacuation, and Earth-reliant onboard care.
- **Slide 5:** EIMO is defined as "The gradual transition of medical care and decision making from terrestrial to space-based assets". The stated purpose is a "preliminary vision/concept".
- **Slides 6 and 21 to 22:** five EIMO components (pre-mission planning, acute and emergent management decision making, prolonged medical decision making, supplies and resource management, task load management). Slide 21 lists "Communication latency and reduced data transmission bandwidth" under pre-mission planning. Slide 22 states that delays or lack of ground support increase task demand and cognitive load, "all shown to impair decision making".
- **NTRS abstract:** gives the same context: distance, communication latency and "the inability to evacuate in case of emergencies".

**Where:** slides 2, 4, 5, 6, 21 and 22; the NTRS abstract.

### Other content in the deck (context only)
- **Slide 17:** the ConOps is "comprised of the needs, goals, and objectives that are supported by nine medical scenarios"; content is still being reworked and requirements development has begun. This is a work in progress.
- **Slides 19 and 20:** mention an Autonomous Medical Operations project developing an on-board software-based Medical Decision Support System, and an EIMO ecosystem that uses crew data streams and "AI-supported natural language processing and machine learning techniques". These are described as plans, not as a validated method.
- **Slides 12 to 16:** an illustrative activity diagram for one hypothetical scenario (abdominal pain treatment). It includes steps such as "Document Vital Signs", "Compare with Previous Patient History" and "Monitor Vitals", and treatment steps. It is a systems-engineering workflow model, not a clinical protocol.
- **Slide 3:** a notional Mars mission overview graphic. **Slide 10:** a screenshot of the draft ConOps (version 0.0.0, a baseline draft).

### What it does not establish
- It is a presentation about a **concept of operations**, not a medical standard, requirement or protocol. Slide 5 calls it a "preliminary vision/concept", and the ConOps model itself is not in this PDF.
- It gives no reference ranges, normal values, alert thresholds, or rules for when to escalate or contact a flight surgeon.
- It does not endorse comparing an astronaut with their own baseline, a 7-day window, a 3-day persistence rule, or any rule used by GLORPULSE. The phrase "Compare with Previous Patient History" appears once in one hypothetical diagram and is not a statement about baselines.
- It does not describe how vital signs are measured, which indicators are monitored, or what values matter. "Vital signs" appears only as a step name in the abdominal-pain diagram.
- The treatment steps in the diagram (medications, a named condition) must not be reused as GLORPULSE content. GLORPULSE does not diagnose or treat.
- It does not say that crews will use a tool like GLORPULSE, and it does not validate one.
- It does not support the claim that an astronaut "is not a doctor". The deck mentions on-board knowledge, skills and abilities and a clinical decision support system, but makes no statement about the medical training of any particular crew member.

## 6. Evidence supported by each source

### 6.1 General spaceflight hazards
| Statement GLORPULSE may make | Source |
|---|---|
| NASA's Human Research Program names five hazards of human spaceflight: space radiation, isolation and confinement, distance from Earth, gravity (and the lack of it), and closed or hostile environments | REF-01 |
| The hazards can interact and can worsen effects on the body | REF-01 |
| With distance from Earth, instructions, supplies and medical care become harder to receive | REF-01, REF-03 (slide 4) |

### 6.2 Communication delays and operational constraints
| Statement GLORPULSE may make | Source |
|---|---|
| The one-way Earth to Mars communication delay is approximately 4 to 24 minutes, depending on how far apart the planets are | REF-02 |
| A reply adds another delay of the same size | REF-02 |
| Exploration-class missions are described as having no real-time communications, with blackouts, no evacuations and no resupply | REF-03 (slide 4) |
| The EIMO concept aims to support crew health during communication delays where emergency evacuation or terrestrial medical assistance is not possible | REF-03 (slide 2) |

### 6.3 Medical monitoring concepts and operational procedures
| Statement GLORPULSE may make | Source |
|---|---|
| NASA ExMC describes a gradual transition of medical care and decision making from Earth to space-based resources ("Earth-independent medical operations") | REF-03 (slide 5) |
| This is a concept being developed, not a finished standard | REF-03 (slides 5 and 17) |

No source here supports a specific monitoring procedure, a list of indicators, or a method for deciding when to act.

### 6.4 Clinical reference ranges and medical escalation thresholds
**None.** None of the three sources provides a reference range, a threshold or an escalation rule. Until a verified source is added:
- Every `referenceStatus` stays "Not assessed" and no range is shown (FR-SRC-03, A-20).
- No guidance text, hazard-to-indicator link or "next step" is shown. They read "No sourced guidance available".
- The Contact Flight Surgeon level stays without an automatic trigger (D-10).

## 7. Claims that must not be inferred from these sources

1. That a hazard in REF-01 changes a specific indicator, for example that radiation or isolation affects sleep, heart rate or mood. REF-01 does not say this at the indicator level.
2. That any indicator value is normal, abnormal, safe or dangerous.
3. That an alert level, deviation limit (K = 3), baseline window (7 days) or persistence rule (3 days) is supported by NASA. These are prototype design choices.
4. That NASA recommends personal baselines, self-assessment apps, or the way GLORPULSE compares an astronaut with their own data.
5. That a flight surgeon must be contacted at any point, or that contacting them is delayed by a specific time. The 4 to 24 minute figure is a one-way signal delay, not a response time for medical advice.
6. That REF-03 describes how astronauts currently monitor their health. It is a forward-looking concept for Mars-class missions.
7. That the abdominal-pain diagram in REF-03 is a medical procedure to copy. It is a hypothetical model scenario.
8. That REF-03's mention of AI or machine learning supports GLORPULSE's design. GLORPULSE uses simple rules and no machine learning. The deck only describes NASA's planned system.
9. That marking a source verified makes all of its linked pages or videos verified. Only the pages read are covered.
10. That "verified" means peer reviewed. REF-01 and REF-02 are NASA web pages. REF-03 is a conference presentation.

## 8. Alignment with `src/data/sources.ts`

`sources.ts` is the code copy of this file. It has **not** been changed. The proposed changes need Person B's and your approval, and the existing test that pins REF-01 and REF-03 as unverified would also need to change.

| ID | Field | Today | Proposed | Evidence |
|---|---|---|---|---|
| REF-01 | `verification` | `not-yet-verified` | `verified` | Page text read in full (section 3). Covers only the five-hazard claim |
| REF-03 | `verification` | `not-yet-verified` | `verified` | All 22 slides read (section 5). Covers only the context claim |
| REF-03 | `title` | "Earth-Independent Medical Operations (EIMO) Concept of Operations" | add " (ConOps)" | Title on NTRS and slide 1 |
| REF-03 | `organisation` | "NASA Exploration Medical Capability" | "NASA Human Research Program, Exploration Medical Capability (ExMC) Element" | Slide 1 names Human Research Program and the Exploration Medical Capability Element. `product.md` calls it a "program", but the deck calls it an element |
| REF-03 | `supports` | "Context: medical care during communication delays where evacuation is not available" | Wording that also names terrestrial medical assistance and states it is a concept presentation | Slide 2 says "does not allow emergency evacuation or terrestrial medical assistance" |
| REF-02 | all | | no change | Matches the page (section 4) |

## 9. Outstanding research questions for GLORPULSE

| # | Question | Needed for | Notes |
|---|---|---|---|
| 1 | Is there a verified source for a reference range for each indicator (heart rate, blood pressure, body temperature, blood glucose, sleep)? | D-03, FR-DASH-04, DR-02 | None exists today. Any source must be read in full. No range may be used from memory |
| 2 | Is there a verified source for an appropriate mood or well-being self-rating scale, and a spaceflight-appropriate one if any? | D-04, FR-CHK-07 | The 1 to 5 scale is a placeholder |
| 3 | Is there a verified source for a symptom list suitable for a non-expert crew self-report? | D-05, FR-CHK-02 | The current six symptoms are a placeholder demo list |
| 4 | Is there a verified source for how each of the five hazards relates to each indicator, if at all? | FR-WHY-03, FR-WHY-05 | REF-01 does not give it. The detail pages linked from REF-01 are unread |
| 5 | What do NASA sources say about glucose monitoring context and limits for astronauts? | D-06, FR-INFO-02 | No source found yet |
| 6 | Is there a verified source for how to measure each indicator (how-to-measure text)? | FR-INFO-01 | All `howToMeasure` text reads "No sourced guidance available" |
| 7 | Is there a verified source for spaceflight sleep statistics, if the team wants one? | product.md section 10 | Not used until read in full |
| 8 | Is there any NASA-sourced rule for when an astronaut should contact a flight surgeon, or should the team label its rule a "simulated protocol"? | D-10, FR-ALERT-06 | None found in these three sources |
| 9 | Does any source support personal baselines, or median and spread methods, for crew health monitoring? | FR-BASE, D-12 | Not supported by these sources. Currently labelled a prototype design choice |
| 10 | Can the ConOps Model Report or the hazard detail pages be accessed and read, if the team wants to cite more detail? | Optional | The report needs author approval (REF-03, slide 16) |
| 11 | Does a source give the exact NASA wording the team should use for each hazard in the interface? | UI text (Person B) | Section 3 lists the wording found on the REF-01 page |
