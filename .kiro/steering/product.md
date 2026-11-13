# GLORPULSE: Product Overview

> Your health, monitored beyond Earth.

Status: DRAFT v4 for team review (aligned with `requirements.md` v3 and `src/shared/types.ts`)
Team: Person A (Health Intelligence & Data), Person B (UI/UX & Frontend)
Event: NASA Space Apps Challenge 2026, "Health Monitoring Software for Astronauts"

Labels used in this document:
- **[Confirmed]**: decided by the team.
- **[Proposed default]**: our suggestion, not yet confirmed.
- **[Pending]**: unknown or unverified. Must be confirmed or researched. Not to be assumed.

Source IDs such as [REF-01] point to the table in section 16. A source counts as verified only after the full document has been read, not from a search snippet.

---

## 1. Summary

GLORPULSE is a web-based health-monitoring prototype for astronauts on a simulated long-duration Mars transit. It collects health readings, compares each astronaut with their own baseline, and explains in plain language what changed, why it may matter in spaceflight, and what to consider next. It also prepares a briefing intended for a flight surgeon on Earth.

GLORPULSE is a prototype that uses simulated data only. It is decision support, not a medical device. It does not diagnose or treat.

## 2. Problem

NASA's Human Research Program groups spaceflight health risks under five hazards: space radiation, isolation and confinement, distance from Earth, altered gravity, and hostile or closed environments [REF-01].

Distance means help is slower. NASA states that the one-way communication delay between Earth and Mars is approximately 4 to 24 minutes, depending on how far apart the planets are [REF-02]. The delay is not fixed. NASA's Exploration Medical Capability program also describes mission conditions in which emergency evacuation and terrestrial medical assistance are not available [REF-03]. Astronauts may therefore need to notice and assess changes in their own health, and most are not doctors.

A reading with a colored dot says that something is off. It does not say how it compares with that person's normal, why it matters in space, or what to do next. GLORPULSE aims to close that gap.

## 3. Vision and objectives

**Vision:** An astronaut who is not a medical expert can understand their own health status, see where the guidance comes from, and know when to ask for help.

| # | Objective | How we will know |
|---|---|---|
| O1 | Make the health indicators easy to record and read at a glance | A first-time user can log a daily check-in and read the dashboard without instructions |
| O2 | Compare each astronaut with their own baseline, not only with general ranges | The dashboard shows baseline state and baseline position for each tracked indicator |
| O3 | Explain every alert in plain language, with sources | Each alert opens a six-part Why Now explanation, and every medical statement has a source ID or reads "No sourced guidance available" |
| O4 | Prepare a briefing intended for a flight surgeon | A briefing can be created and shown locally, with simulated outbox states |
| O5 | Stay honest | The app labels simulated data, shows when a baseline is still being built, and never invents advice or ranges |

## 4. Target users

| User | Role | Interaction |
|---|---|---|
| **Astronaut** (primary) | Crew member on a simulated Mars transit. Not assumed to have medical training | Logs readings and symptoms, reads insights, prepares briefings |
| **Flight surgeon** (intended recipient) | Medical doctor on Earth | Does not use the app. The briefing is written for them, but in the prototype it is only displayed and stored locally |
| **Judges and reviewers** | Evaluate the prototype | Use the demo with simulated crew data |

## 5. Multiple astronauts [Confirmed]

GLORPULSE supports several simulated astronauts. There is no login and no real account system. A simple selector switches between profiles.

Product-level rules:
1. Each astronaut has a unique ID.
2. Each astronaut has separate readings, symptoms, baselines, baseline positions, alerts, explanations and briefings.
3. Switching astronauts updates all displayed information.
4. Data from different astronauts is never mixed on any screen, in any calculation, in storage, or in a briefing.
5. Every briefing identifies the astronaut it belongs to.
6. The prototype uses 3 to 4 simulated profiles, with one primary demonstration story. The other profiles are simpler and exist to demonstrate separation and switching.
7. Each profile states which indicators are tracked. Blood glucose is optional and is tracked only for astronauts where it applies. An astronaut who does not track glucose has no glucose card, input, chart or missing-data alert.

Acceptance tests for these rules are in `requirements.md` section 12.1 (AT-CREW).

## 6. How GLORPULSE addresses the NASA challenge

| Challenge expectation | GLORPULSE response |
|---|---|
| Gather health indicators | Manual check-in for heart rate, blood pressure, body temperature, sleep, mood and (where applicable) blood glucose, plus a short symptom list |
| Let astronauts evaluate and act on their status | Reference status, baseline position, alerts, and (after the MVP) a Why Now explanation with next steps |
| Visual tool, clear presentation | Dashboard, status shown by text and icon as well as color, charts |
| Do not assume astronauts know everything | Plain-language explanations and "how to measure / why it matters" notes |
| Understand how spaceflight hazards affect health | Hazard tags (the five NASA hazards) linked to each indicator only where a source supports it |
| Know when to involve flight surgeons | Alert levels (the "Contact Flight Surgeon" level is in the legend with no automatic trigger until decided), and the briefing |
| Dynamic charts, color coding | Time-series charts with baseline band and, only where sourced, a reference range |
| Optional: interactive body figure | Optional feature, see 7.3 |

## 7. Features

### 7.1 Core features (MVP)
1. **Crew selector:** switch between simulated astronaut profiles.
2. **Dashboard:** one card per tracked indicator showing latest value, reference status, baseline state, baseline position and alert level.
3. **Manual check-in:** form for the tracked indicators and a short predefined symptom list, with input checks.
4. **Historical charts:** readings over time for each tracked indicator, with the astronaut's baseline band and, only where a sourced range exists, a reference range.
5. **Plain-language information:** how to measure and why it matters, per indicator, from sourced material only.
6. **Simulated data and reset:** 30 mission days of labelled simulated data per astronaut, with a reset demo function.
7. **Personal baseline, baseline position and persistence detection:** a seven-day baseline [Proposed default], a visible "baseline building" state, whether the latest reading is above, within or below the astronaut's own baseline, and how many consecutive days a deviation has lasted. GLORPULSE does not calculate a statistical trend; change over time is shown by the charts and by the length of the deviation run.
8. **Basic alerts:** the legend has four levels: Info, Watch, Action and Contact Flight Surgeon. Info, Watch and Action are generated automatically by visible, labelled prototype rules. Contact Flight Surgeon has no automatic trigger until the team decides on a sourced or explicitly labelled simulated rule. No clinical escalation threshold is invented.

### 7.2 Differentiating features (built only after the MVP works and its main acceptance tests pass)
1. **Why Now explanation:** for each alert, six parts:
   1. What changed.
   2. How it compares with this astronaut's own baseline.
   3. Why it may matter in spaceflight.
   4. Which NASA hazards may be relevant.
   5. Next steps to consider.
   6. When to contact the flight surgeon.
2. **Flight Surgeon Briefing:** an on-screen report of readings, baseline positions, symptoms, alerts and their explanations, identifying the astronaut.
   - The flight surgeon is the intended recipient. In the prototype, the briefing is only displayed and stored locally.
   - A simulated communication link toggle and outbox show the states draft, queued and "sent". These states are simulated. They do not represent actual communication, and no health data is transmitted anywhere.

### 7.3 Optional features [Confirmed: outside the core MVP]
- Interactive body figure (clickable regions showing function, spaceflight effects and status, using sourced content only)
- Streaks and mission-routine prompts
- Environment modes
- Data confidence tips
- Briefing download or PDF export

### 7.4 Out of scope
Machine learning models; AI-written medical advice; backend, database or user accounts; login system; real-time or wearable sensor input; camera or image analysis; real NASA data feeds; 3D body model; mission simulator game; any real transmission of health data.

## 8. Key product principles

1. **Decision support, not diagnosis.** GLORPULSE never names a disease or replaces medical judgment.
2. **No unsourced medical content.** Every medical statement and recommendation carries a verified source ID. If none is available, the app displays "No sourced guidance available" and does not fill the gap.
3. **Three kinds of comparison, never mixed.** The app keeps these separate and labelled in data, calculations, charts, alerts, explanations and briefings:

   | Kind | Meaning | Status |
   |---|---|---|
   | Personal baseline deviation | How an astronaut differs from their own recent readings. A statistical comparison, not a clinical finding | Calculated by the app from simulated data |
   | General clinical reference range | A published range for a general population, with a source. Not personalised | Shown only where a verified source exists. Otherwise "No sourced reference range available" |
   | Mission-approved limit | A limit set by a space-medicine authority for a mission | [Pending] Not available unless supported by a reliable source, or explicitly labelled "simulated protocol" |

4. **No unsourced reference ranges.** Where no verified range exists, the indicator's reference status reads "Not assessed". The baseline band still works, because it comes from the astronaut's own data.
5. **Honest labels.** All seeded data is labelled simulated. Prototype statistical choices (7-day baseline, median and spread, 3-day persistence) are labelled as design choices, not validated medical thresholds.
6. **Plain language** for non-expert users.
7. **Accessible.** Aim for WCAG 2.2 AA without claiming formal compliance until tested. Status is never shown by color alone, and important controls work by keyboard.
8. **Simple and shippable.** No technology or feature without a clear need.

## 9. Mission setting and simulation

- **Scenario:** [Confirmed] simulated long-duration Mars transit.
- **Communication delay:** explained as mission context only, using the approximate range in section 2 [REF-02]. The prototype does not reproduce real NASA communication systems or timing.
- **Demo data:** [Confirmed] 30 mission days of simulated data for 3 to 4 astronauts, with a reset demo function. All readings are labelled simulated. The primary story: one astronaut's sleep declines and heart rate rises over several days, and a symptom is logged. Exact days, values and the symptom are [Pending] Person A's research and design.
- **Privacy:** [Confirmed] No real personal health information is collected. English only for the MVP.

## 10. Health indicators

[Confirmed] list of six. All reference ranges, status mappings and guidance are [Pending] until Person A completes and verifies source research.

| Indicator | Notes |
|---|---|
| Heart rate | Source research pending |
| Blood pressure | Two values (systolic and diastolic). Source research pending |
| Body temperature | Source research pending |
| Blood glucose | Optional, tracked only for astronauts where it applies. Will include a note on its context and limitations. Source research pending |
| Sleep | Hours per night. Spaceflight sleep statistics: [Pending] research. No figure is used until the source has been read in full and verified |
| Mood | Non-diagnostic self-rating. Scale to be chosen and cited [Pending] |

Symptoms: a short predefined list, [Pending] source research.

## 11. Safety and medical limitations

- GLORPULSE is a hackathon prototype. It is not a medical device and has not been clinically validated.
- It does not diagnose or treat. It does not replace medical professionals or mission protocols.
- Reference ranges are general references, not personalised or spaceflight-specific limits, unless a cited source says otherwise.
- Baseline deviation is a statistical comparison with the astronaut's own recent readings. It is not a clinical finding.
- Escalation to the flight surgeon follows transparent rules that are shown to the user. Any rule not backed by a reliable source is labelled "simulated protocol". No clinical escalation threshold is invented.
- No medical statement, range or recommendation is displayed without a verified source ID. Otherwise the app displays "No sourced guidance available".
- Every explanation and briefing carries a short disclaimer.
- All unresolved medical thresholds and guidance remain [Pending] research until Person A verifies a source.

## 12. Competitive position

Other 2026 Space Apps entries also address astronaut health. For example, AstroVital's public README describes a Python backend, machine-learning models and simulated telemetry, and The Mitochondria's website describes an intended design for personal baselines and offline operation. We read README files and landing pages, not running applications, and we make no claims about how well they work.

GLORPULSE focuses on three things: a structured, sourced explanation for each alert; a briefing prepared for a flight surgeon; and a prototype that runs in the browser without a backend. Details are in `docs/competitor-research-and-differentiation.md`.

## 13. Technology direction [Confirmed]

React, Vite, TypeScript, Recharts, plain CSS, browser localStorage. No backend or database for the MVP. No additional dependencies without both team members agreeing.

Health logic is kept separate from the user interface. The interface only displays what the health logic returns, so Person A and Person B can work in parallel against shared TypeScript types.

## 14. Team

| | Person A: Health Intelligence & Data | Person B: UI/UX & Frontend |
|---|---|---|
| Owns | Source research and `references.md`, indicator definitions, reference information, baseline, baseline position, persistence, alert logic, Why Now explanations, simulated data, briefing data | Layout and design, crew selector, dashboard, indicator cards, check-in form, charts, alert and Why Now presentation, briefing interface, localStorage and reset control, accessibility |
| Shared | Agreeing TypeScript interfaces, integration, testing, presentation and demo |

## 15. Success measures [Proposed default]

Detailed pass/fail acceptance criteria are in `requirements.md` section 12. For the demo, success means:
- The core story works from start to finish without errors, using seeded data: choose an astronaut, review the dashboard, see the baseline position and an Action alert, and submit a check-in that updates the results.
- If the differentiating features are built: open the alert, read the Why Now explanation, create a briefing, toggle the simulated link, and see the simulated state change.
- Every medical statement on screen has a verified source ID or reads "No sourced guidance available".
- No unsourced reference range is displayed.
- No status relies on color alone.
- The baseline-building state, the simulated-data notice and the disclaimer are visible where they apply.
- Switching astronauts never mixes readings, baselines, charts, alerts or briefings.
- The app runs from a public link and works after a reset.

## 16. References

Source IDs are provisional. Person A will move them into `references.md`.

| ID | Source | Used for | Verification status |
|---|---|---|---|
| REF-01 | NASA Human Research Program, "5 Hazards of Human Spaceflight", https://www.nasa.gov/hrp/hazards/ | The five spaceflight hazards | Seen in search result text only. Open and confirm before treating as verified |
| REF-02 | NASA, "Space Communications: 7 Things You Need to Know", https://www.nasa.gov/missions/tech-demonstration/space-communications-7-things-you-need-to-know/ | One-way Earth-Mars communication delay of approximately 4 to 24 minutes, depending on planetary distance | Page read in full |
| REF-03 | NASA Exploration Medical Capability, EIMO Concept of Operations, https://ntrs.nasa.gov/api/citations/20240001402/downloads/2024_IWS_EIMO_ConOps_FINAL.pdf | Earth-Independent Medical Operations context: medical care during communication delays where evacuation and terrestrial medical assistance are not available | Seen in search result text only. Open and confirm before treating as verified |
| REF-04 | `docs/competitor-research-and-differentiation.md` | Competitor summary in section 12 | Based on README files and landing pages, not running applications |

No health thresholds, sleep statistics or clinical guidance are cited in this document. They remain [Pending] research.

## 17. Open items

| Item | Status |
|---|---|
| Submission deadline | [Pending] confirmation |
| Presentation duration | [Pending] confirmation |
| Reference ranges and status mapping for all six indicators | [Pending] research (Person A) |
| Spaceflight sleep statistic, if used | [Pending] research |
| Mood scale | [Pending] research |
| Symptom list | [Pending] research |
| Glucose context note, and which simulated astronauts track glucose | [Pending] research and design (Person A) |
| Mission-approved limits and the Contact Flight Surgeon rule | [Pending] source, or an explicitly labelled simulated protocol |
| Number of simulated astronauts | [Proposed default] 3 to 4 |
| Baseline, deviation and persistence rules | [Proposed default] 7 days, median and spread, 3 consecutive days |
| Status names | [Proposed default] Within reference, Outside reference, Not assessed (see `requirements.md` FR-DASH-04) |
| Verify REF-01 and REF-03 against the full documents | [Pending] (Person A) |
| Briefing download or PDF | Optional, later |

## 18. Related documents

- `requirements.md`: functional and non-functional requirements, data, workflows, acceptance criteria
- `src/shared/types.ts`: the shared TypeScript contract between Person A and Person B (change only when both agree)
- `docs/competitor-research-and-differentiation.md`: research behind section 12
- `references.md`: full source list for all medical statements (to be created by Person A)
