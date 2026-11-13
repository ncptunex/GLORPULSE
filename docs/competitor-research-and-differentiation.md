# AstroHealth: Competitor Research and Differentiation

Status: DRAFT for team review. Written 13 Nov 2026, the day before the hackathon (14-15 Nov).
Scope: public information only. We cannot see other teams' unpublished work.
Rule for this document: every claim about a competitor comes from a page or repo we actually read. Where we only saw a snippet, it is marked (snippet).

---

## 1. What we reviewed

### 1.1 NASA research programs (the "official" version of this problem)

| Program | What it is | Why it matters to us |
|---|---|---|
| Exploration Medical Capability (ExMC), NASA HRP | Develops medical systems for deep space. Goal: monitor crew health during communication delays where evacuation and ground help are not available ([EIMO ConOps](https://ntrs.nasa.gov/api/citations/20240001402/downloads/2024_IWS_EIMO_ConOps_FINAL.pdf)). | Confirms the real problem: Earth-independent care. |
| Earth Independent Medical Operations (EIMO) | Gradual transition of medical decisions from ground to space-based assets ([abstract](https://ntrs.nasa.gov/api/citations/20230014228/downloads/EIMO%20DATASCOPE%20IWS24%2027Sep2023%20ABSTRACT.pdf)). | Our framing: decision support for the crew, with ground in the loop when possible. |
| Clinical Decision Support System (CDSS) | Meant to assist the crew in prevention, detection, diagnosis and treatment, with problems made worse by decrements in sleep, cognition, nutrition and exercise ([abstract](https://ntrs.nasa.gov/api/citations/20205008927/downloads/Abstract%20-%20CDSS%20for%20Ex%20Missions_DAA.docx.pdf)). A later NASA report says an AI-based CDSS was demonstrated in a simulated mission ([NTRS 20260001797](https://ntrs.nasa.gov/citations/20260001797)) (snippet). | Our "explain and advise" feature is a student-scale version of the same idea. |
| Autonomous Medical Operations (NASA Ames) | A medical decision support system so astronauts can operate autonomously on long missions ([abstract](https://ntrs.nasa.gov/api/citations/20200000615/downloads/20200000615.pdf)) (snippet). | Same direction. |
| Communication delay | About 20-22 minutes each way for Mars ([CDS overview](https://ntrs.nasa.gov/api/citations/20205011448/downloads/IWS2021_CDS_Overview&Updates_FINAL.pdf)) (snippet). | This is the reason a stored briefing is useful. |
| Astroskin wearable (CSA, used in the HERA analog) | Upper-body garment plus headband measuring vital signs, sleep quality and activity ([NASA slides](https://ntrs.nasa.gov/api/citations/20190000238/downloads/20190000238.pdf)) (snippet). | Real hardware exists. We use manual input and simulated data only. |

Takeaway: NASA's own direction is Earth-independent decision support that explains itself. Our concept is on-topic. It is also not new.

### 1.2 Public projects

Newest first. Space Apps 2026 entries are the ones we will be judged against.

| Project | Year | Stack | Main features | Strengths | Limitations |
|---|---|---|---|---|---|
| [AstroVital](https://github.com/iftekharhasan2/nasa-health) | 2026 | FastAPI, React, Vite, three.js, Framer Motion, SQLite, scikit-learn, PyTorch/ONNX | 900-day Mars mission clock, 11 ML risk domains, 3D body map, personal baselines (Isolation Forest), space-weather data (NASA DONKI, NOAA), what-if lab, mission simulator game, ECG lab, spacecraft damage simulator, triage, cognitive test, nutrition, daily briefing, offline sync queue | Very large scope, polished storyline, uses real NASA data, strong demo script | Complex setup (Python, backend, model training). Telemetry is simulated. Many models are trained on Earth datasets, so spaceflight validity is limited. Broad rather than deep on explanation. |
| [The Mitochondria](https://mitochondria.edocinfo.com/) | 2026 | Not stated on the page we read. Mentions encrypted local storage, adapters, FHIR, row-level security | Positioning: personal baselines, trends, explainable alerts, action guidance, offline mission mode, device adapters | Best articulated safety boundaries (research vs operational, no diagnosis). Same positioning as our idea | The page says the capabilities are an architecture direction and not presented as completed. We did not verify a working demo. |
| [AnomalyDetection](https://github.com/TanvirSdq/AnomalyDetection) | 2026 | Python-style stack (rolling stats, MAD, z-scores, Isolation Forest) | Personal baseline, multivariate anomaly detection, persistence checks, alerts that state which signals deviated, by how much, and since when | Closest to our "explain what changed vs baseline" idea | README only. No evidence of a user-facing interface. |
| [SecureSpace](https://github.com/michaelsammueller/secure-software-development) | University project | Python CLI | Records physical and mental health indicators, role-based access, encryption, logging | Security design | Command line only, no visuals, no trend explanation |
| [MarsMobilityApp](https://github.com/jerrychong25/MarsMobilityApp) | 2018 | Android, Bluetooth LE | Suit temperature, humidity, heart rate, hazard alerts | Real sensor path | Narrow, no guidance |
| [Sleepronize](https://github.com/Sleelpronize/Team-project) | 2017 | Not checked | Fatigue and sleep schedule planning | Focused | Sleep only |
| [Zenspace](https://github.com/mekmarriott/zenspace) | 2015 | ML for sentiment, VR | Mood tracking from video logs and journals, VR relaxation | Behavioral health focus | Needs video and VR, not practical for us |

### 1.3 Research prototypes and papers (snippets only)
- Digital-twin and wearable fusion frameworks appear in IAC 2026 abstracts ([example](https://iafastro.directory/iac/paper/id/105789/abstract-pdf/IAC-26,B3,7,10,x105789.brief.pdf?2026-03-25.22:09:09)). These are research concepts, not tools we can reuse.
- Review of unobtrusive cardiorespiratory wearables for space ([Frontiers in Physiology](https://www.frontiersin.org/articles/10.3389/fphys.2026.1956853)).

---

## 2. Feature comparison

Key: Yes = seen working in the repo/README we read. Claimed = stated but not verified. No = not seen.

| Feature | Typical simple dashboards | AstroVital | Mitochondria | AnomalyDetection | AstroHealth (current plan) |
|---|---|---|---|---|---|
| Indicator cards, color status | Yes | Yes | Claimed | No | Yes |
| Trend charts | Yes | Yes | Claimed | No | Yes |
| Clickable body figure | Rare | Yes (3D) | No | No | Yes (2D SVG) |
| Personal baseline | No | Yes (ML) | Claimed | Yes (statistical + ML) | Planned |
| "Why did this change" explanation | No | Partial (scores and actions) | Claimed | Yes (text in README) | Planned, core |
| Link to spaceflight hazard | Rare | Yes | Claimed | No | Planned |
| Cited sources next to guidance | No | Not seen | Claimed | No | Planned |
| "When to contact flight surgeon" | Rare | Partial (triage, protocols) | Claimed | No | Planned |
| Offline storage and send-later queue | No | Yes (SQLite sync queue) | Claimed | No | Planned |
| One-page surgeon briefing | No | Partial ("daily briefing") | No | No | Planned |
| Simulator / game | No | Yes (extensive) | No | No | No (stretch: simple streak) |
| Real NASA data feeds | No | Yes | No | No | No |
| Works with no backend, no install | Sometimes | No | Unknown | Unknown | Yes (plan) |

### What is common (do not count on these to stand out)
Indicator cards, color coding, trend charts, body map, personal baseline, offline-first, "explainable" as a word.

### What is missing everywhere we looked
1. A tool a non-expert crew member can understand in seconds, with the reasoning written in plain language and each statement tied to a cited source. The big projects are broad but dense, and the 2026 competitors with the same positioning are mostly concept documents.
2. A briefing that is prepared for a bad link: short, prioritized, readable by both an astronaut and a flight surgeon, and sendable later. AstroVital has a briefing and a queue, but we did not see them combined into one structured surgeon-facing document.
3. Honesty about data quality. Few tools say "I do not have enough data yet to judge this."
4. A project that runs from a single web page with no server, so judges can open it immediately.

---

## 3. Honest evaluation of the proposed differentiator

Idea: "Explainable Crew Health Intelligence" plus "Flight Surgeon Briefing".

Verdict: good fit for the challenge, but NOT novel as a concept.

- At least three 2026 projects already use the words explainable, personal baseline, and offline. A judge who has seen them will not treat these as new.
- AstroVital already ships an offline queue and a daily briefing, with far more breadth than we can build.
- We will lose any contest on breadth, 3D, machine learning or data feeds. We should not enter that contest.

Where we can still win is execution and focus:
- Depth of explanation: a fixed six-part answer for every alert.
- Verifiable sourcing: every sentence of guidance links to a reference.
- Beginner-friendly clarity and zero setup.
- A clean, complete "link is down, link is back" briefing flow in the demo.

Risk if we do this badly: it looks like a dashboard with long text. Mitigation: build the explanation as a visual card with a small "what changed" mini-chart, not a paragraph.

---

## 4. Recommended standout features (2-3, realistic for 48 hours)

### Feature 1: "Why Now" explanation card (CORE, strongest differentiator)
For any indicator that changes meaningfully, show a card that answers six questions:

1. What changed?
2. How does it compare with this astronaut's own baseline?
3. Why might it matter in spaceflight? (hazard tags)
4. Which of the five NASA hazards could be relevant?
5. What next steps should be considered?
6. When should the flight surgeon be contacted?

Design rules:
- Rule-based and deterministic. No machine learning, no AI-generated medical text. This is easier to build, test, and defend.
- Baseline = the astronaut's first N days (or a pre-mission entry), using median and spread. Show the baseline status honestly ("building baseline, day 3 of 7").
- "Deviation from your baseline" is a statistical statement, labelled as such. It is separate from the clinical reference range (e.g. AHA) and from any mission limit. Three different labels, never mixed.
- Hazard links and "why it matters" text come only from a curated table, each row carrying a source ID from `references.md`. If no source exists, the card says "No sourced guidance available. Consider contacting the flight surgeon."
- Next steps are limited to sourced or generic safe actions (repeat the measurement, rest, log symptoms, follow mission protocol).
- The flight surgeon prompt is triggered by transparent rules (red reference status, persistent deviation for several days, listed symptoms) and marked as "app guidance, confirm against your mission protocol".

Why it is the strongest: it directly answers the challenge ("evaluate and act on the status of their health", "do not assume astronauts know everything") and it is the demo moment judges will remember.

Estimate: 10-12 hours across both people.

### Feature 2: Flight Surgeon Briefing with a communication-link simulator
- Generates a one-page, structured report: crew member, period, latest readings, trends, symptoms, alerts, and the explanation text behind each alert, plus the source list.
- Saved locally (browser storage) and shown in an "outbox" with states: Draft, Queued, Sent.
- A demo toggle "Link: Down / Up" shows the outbox sending when the link returns. The UI can also show a communication-delay note (about 20 minutes each way for Mars, from the NASA material above) so the crew knows not to expect an instant reply.
- Output: printable page and downloadable text/JSON. No real transmission, and we say so.

Why it matters: it is where our "what to do while waiting" story lives, and it ties directly to NASA's Earth-independent operations goal.

Estimate: 8-10 hours.

### Feature 3 (small add-on): Data confidence and "how to measure" tips
- Each reading shows "baseline ready / not enough data" and "last measured X days ago".
- One short, sourced "how to measure and why" panel per indicator.
- This keeps us honest and answers the "do not assume astronauts know everything" line in the brief.

Estimate: 3-4 hours.

### Explicitly rejected (to avoid complexity for its own sake)
Machine learning models, LLM-written advice, 3D body, wearable/Bluetooth, camera input, a backend or database, real NASA API feeds, a mission simulator game.

---

## 5. Recommendation

Build Feature 1 as the headline, Feature 2 as its companion, and Feature 3 only if time remains. Position the project as:

> AstroHealth: a health companion that explains every warning in plain language, with sources, and prepares a briefing for the flight surgeon that is ready when the link is.

Tagline to avoid: "AI health intelligence". It invites comparison with AstroVital and invites medical-claim scrutiny.

---

## 6. Impact on the earlier plan

- The MVP (dashboard, check-in, charts, body figure) is still needed, but Feature 1 depends on it. The body figure panel should show the same "Why Now" card.
- Gamification and environment modes remain optional and are first to be cut.
- The first spec should be `health-indicators-and-status`, then `baseline-and-explanations`, then `surgeon-briefing`.
- Add one more task: a `references.md` with source IDs. No explanation text ships without one.

## 7. Open items before we start building
1. Collect and verify sources for: body temperature, blood glucose, bone loss and exercise countermeasures, mood scale. Not yet researched.
2. Decide the baseline length (proposal: 7 days, with a visible "building baseline" state).
3. Decide the persistence rule for escalation (proposal: 3 consecutive days). This is a statistical design choice, not a medical threshold, and must be labelled that way.
4. Confirm with the Space Apps rules whether pre-built projects are allowed. Several 2026 repos above already exist. We have not verified how they were produced and make no assumption.

## 8. Limitations of this research
- We read README files and landing pages, not the running apps. Feature claims for The Mitochondria are unverified.
- Search results are partial. There may be stronger entries we did not find.
- Medical content here is a design plan only. No thresholds have been decided.
