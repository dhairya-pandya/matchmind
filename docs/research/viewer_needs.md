# Football Viewing Experience: Viewer Needs and Presentation Formats (for MatchMind)

Scope: football (soccer), evidence current to October 2026. Search depth was limited (about 16 tool calls), so this is a first pass. Most evidence is vendor, trade press, or preprint material. Peer-reviewed audience-comprehension studies were not found. Where a figure comes from a secondary source or has no stated methodology, it is flagged.

## What do different viewer segments want to know during and after a match, and what do they skip?

### Takeaway
Second-screen and stats use is common among football fans, and the information wanted differs by segment. Casual fans want the story of the match (turning points, who was dangerous). Analysts and fantasy/betting players want player-level and event-level detail. There is little audience research on what viewers skip, so that part is largely inference.

### Cited Findings
- YouGov (2025, cited second-hand): 68% of soccer fans regularly look up statistics during games. Sample size and date not stated in the secondary article; verify against the original YouGov release before use. — [CaughtOffside, Jul 2026](https://www.caughtoffside.com/2026/07/08/how-football-fans-fill-the-time-between-matches/)
- Secondary article also cites IBM research that 90% of sports fans check content beyond live broadcasts (highlights, social, analysis), and that about 61% watch highlights and short clips. No sample or date given; treat as unverified. — [CaughtOffside, Jul 2026](https://www.caughtoffside.com/2026/07/08/how-football-fans-fill-the-time-between-matches/)
- Gulf region survey (Snapchat/OnePoll, ages 18–34, reported in trade press): UAE fans check their phones about 9.5 times per match, Saudi fans about 8.5 times; messaging apps help fans feel connected during matches. — [OfficePoolStop summary](https://officepoolstop.com/blog/how-premier-league-fans-are-changing-their-second-screen) (secondary; original survey not located)
- Ireland (Amarach/Sport for Business, 1,000 respondents, older, not 2025): 25% of 15–24 year olds would use a second device while watching, versus 8% of those 55+. — [Sport for Business](https://sportforbusiness.com/irelands-second-screen-sports-fans-revealed/)
- US 2025 (ThinkNow, 1,500 adults, generation split): a survey exists on second-screen intent for 2026 World Cup matches, but the chart was paywalled and no figures were retrieved. — [EMARKETER](https://www.emarketer.com/chart/c/361443)
- Statista (US, June 2025) tracks stat look-ups by sport including soccer, but the soccer sample is small (n>125) and details are paywalled. — [Statista](https://www.statista.com/statistics/1618474/second-screen-usage-sports-broadcast)
- Second-screen activities during live games reported as: checking stats, social media, watching another match, fantasy, and betting. No ranking or source given. — [CaughtOffside, Jul 2026](https://www.caughtoffside.com/2026/07/08/how-football-fans-fill-the-time-between-matches/)
- The Premier League's 2025 Microsoft partnership (five years, announced 1 July 2025) explicitly targets fan engagement and match insights, including a fan-facing assistant (the "Premier League Companion") built on Microsoft Copilot/Azure OpenAI, covering 30+ seasons of stats, and planned Fantasy Premier League integration. — [Premier League](https://www.premierleague.com/en/news/4338015/premier-league-announces-partnership-with-microsoft), [TVBEurope](https://www.tvbeurope.com/live-production/microsoft-scores-deal-to-provide-premier-league-with-cloud-and-ai-capabilities)
- Sofascore's "Attack Momentum" graph is presented by its publisher as a way for fans to follow match swings and turning points, with examples from the 2022 World Cup final and Euro 2024 final. This is vendor self-description, not independent evaluation. — [Sofascore](https://www.sofascore.com/de/news/how-sofascores-attack-momentum-changed-sport-analysis)

### Inferences
- Casual fans most likely want: score-state, a small number of plain-language turning points, and "why did that happen" for key moments. They probably skip dense tables and raw coordinates.
- Die-hard fans and analysts want per-player and per-event explanation, and they tolerate more jargon, but they check the explanation against their own viewing.
- Fantasy/betting players want player-level stats and near-live updates. This is a data-licensing question (see below), not just a UI question.
- Younger/second-screen viewers are a higher share of phone use and social/clip consumption. A companion-style recap or clip-first format fits them better than a long dashboard.
- Broadcaster-level skip patterns (what viewers ignore during a broadcast) were not found in any source.

### Gaps
- No peer-reviewed or industry study directly measures which stats segments find useful, or which they skip.
- The 68%, 90% and 61% figures need the original YouGov/IBM releases before they are cited in a judged deliverable.
- Current (2026) football-specific surveys beyond the Gulf study and the WC 2026 intent study were not found.

## Which visual formats (animated pitch, heatmap, shot maps, pass networks, timelines, video clips, voice/text commentary) do viewers find clearest, and what causes confusion?

### Takeaway
Fan-facing guidance favours simple heatmaps and timelines over coordinate lists, and treats pass networks and heatmaps as "where and how often" rather than "how good." No study was found that tests viewer comprehension of these formats, so the ranking below is based on guides and vendor material.

### Cited Findings
- Grandprix247 (Aug 2025, general sports broadcast data-visualisation piece): heatmaps are easier to follow than lists of coordinates for casual viewers; stats should look simple; xG graphics give context; fans want numbers on screen during the broadcast. No studies or audience data cited. — [Grand Prix 247](https://www.grandprix247.com/2025/08/25/the-importance-of-data-visualization-in-sports-broadcasting/)
- xG is described as "well known if not so well understood," so graphics should define it briefly rather than assume it. — [Search summary of sports xG explainers](https://footballkit.lazada.com.ph/viewing-guide/how-to-read-broadcast-football-data/) (vendor/educational pages; low-quality sources mixed in)
- A plain-language xG comparison (for example "2.4 xG and one goal: created quality chances but missed finishes") is recommended as a way to help non-analysts. — [Fiveable xG explainer](https://fiveable.me/sports-reporting-and-production/key-terms/expected-goals-xg) (educational; not tested)
- Confusion sources documented in fan guides: a bright heatmap spot shows presence, not impact; heatmaps show where a player was involved, not how effective they were; pass networks show each player as a dot at average position while the team has the ball. — [Lazada viewing guide on heatmaps](https://footballkit.lazada.sg/viewing-guide/how-to-read-heat-maps-pass/)
- Pass-network links in a Soccermatics lesson use a threshold (13 or more successful passes between a pair) that viewers would not see without explanation. — [Soccermatics](https://soccermatics.readthedocs.io/en/main/lesson1/VisualisingFootball.html)
- Research on shooting-opportunity heatmaps (from tracking data at 25 fps) found most shooting opportunities last 1–2 seconds and are unevenly distributed across the pitch. Technical, not a viewer study. — [PMC10181708](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10181708/)
- Sofascore momentum-style timelines are presented as a clear way to see swings in a match. — [Sofascore](https://www.sofascore.com/de/news/how-sofascores-attack-momentum-changed-sport-analysis) (vendor claim)
- Clip-level automation in 2026: Spiideo AI Highlights (launched May 2026) combines video, event data and commentary audio to produce clips; soccer is among the first sports covered. Vendor claim; no independent accuracy data. — [SportsVideo.org](https://www.sportsvideo.org/2026/05/07/spiideo-launches-ai-highlights-for-automated-highlight-and-clip-creation/)

### Inferences
- Pitch animation and timelines with labelled moments are the lowest-friction formats for casual viewers. Heatmaps work when labelled with a plain "where the player was active" caption.
- Pass networks should not be shown to casual viewers without a one-line definition. For analysts they are fine.
- Shot maps with xG labels, shown with a one-line definition of xG, carry most of the value per second of screen time.
- Clips and voice/text commentary are complementary. Commentary should explain the "why" behind a clip, not repeat what is visible.

### Gaps
- No comprehension experiment was found for football pass networks, heatmaps, shot maps, or pressure timelines. A search on "fan understanding of xG graphics" or "data visualisation comprehension experiment" is the suggested next step.
- Sports-specific colour and team-colour clashes were not covered by any source found.

## How important are accessibility, language level, and jargon control to comprehension?

### Takeaway
General data-visualisation accessibility guidance is clear and applies to sports charts: do not rely on colour alone, label data directly, check contrast, write short alt text. Language-level and jargon guidance is mostly general; no football-specific comprehension study was found.

### Cited Findings
- UK government guidance: label data directly instead of relying on a legend; if a legend is needed, add patterns or shapes as well as colour. — [UK Government Analysis Function](https://analysisfunction.civilservice.gov.uk/policy-store/data-visualisation-colours-in-charts)
- Avoid red-green-orange-brown palettes and test with a colour-blindness simulator; there is no one-size-fits-all solution for colour-vision deficiency. — [Search summary of data.europa.eu and Nightingale guidance](https://data.europa.eu/apps/data-visualisation-guide/accessibility-of-data-visualisation)
- WCAG non-text contrast: parts of graphics needed to understand the content should have a contrast ratio of at least 3:1 against adjacent colours. — [UK Government Analysis Function](https://analysisfunction.civilservice.gov.uk/support/communicating-analysis/introduction-to-data-visualisation-e-learning/data-visualisation-e-learning-module-3-accessibility-and-colour-palettes)
- Alt text should communicate the chart's message, kept short because screen readers read linearly. — [Universities UK accessibility guide](https://www.universitiesuk.ac.uk/brand-site/accessibility-guides/data-visualisation-accessibility-guide)
- Datawrapper has built-in colour-blindness testing and screen-reader descriptions. — [search summary of UK guidance](https://nightingaledvs.com/data-journalism-colour-accessibility/)

### Inferences
- For MatchMind, the cheapest wins are: direct labels on the pitch, shape/pattern in addition to team colour, 3:1 contrast on pitch markings, and a generated text alternative for each chart. All are feasible in a hackathon.
- Jargon control matters most for the casual and younger segments. Glossing "xG", "pressure" and "PPDA" on first use is a simple, low-cost measure, but its effect on comprehension has not been measured.

### Gaps
- No football-specific accessibility or comprehension study found.
- No evidence was found on how language level affects comprehension of match explanations for second-language or younger viewers.

## What do broadcasters and producers need from automated analysis (speed, live vs post-match, editorial control, clip selection)?

### Takeaway
Broadcasters are adopting automated clip selection and highlights in 2026, with human review kept in the loop. The main requirements visible in sources are speed, explainability of why a clip was chosen, and editorial control. Independent accuracy evaluations were not found.

### Cited Findings
- OBS's AI highlights service was used at Paris 2024 by 14 broadcast organisations, which produced more than 100,000 clips. For Milano Cortina 2026, broadcasters can build custom compilations. — [SVG Europe](https://www.svgeurope.org/blog/headlines/milano-cortina-2026-obs-expands-ai-powered-content-workflows/)
- Grabyo/Magnifi: AI clipping logs highlights during live streams, with a moderation step so editors keep final control before distribution. — [Grabyo](https://about.grabyo.com/?p=61471)
- Eluvio (Sept 2025) argues that knowing why a clip was chosen helps editors before production, and that training these models needs costly labelled event data. — [Eluvio on Medium](https://medium.com/@eluvio_ai/063aed597c93) (vendor opinion)
- A 2026 buyer's guide lists Magnifi, WSC Sports, Pixellot, Veo, Trace, Hudl and Spiideo as key-moment detection tools, and frames picks as editorial decisions where accuracy is central. — [imagen-ai.com buyer's guide](https://imagen-ai.com/post/best-ai-video-highlights-generator-sports-2026/) (vendor-adjacent)
- Zentag AI (launched Jan 2026) claims automated detection across 20+ sports; vendor claim, not verified. — [Product Hunt](https://www.producthunt.com/products/zentag-ai/launches/zentag-ai)
- Grandprix247: broadcasters want live stats and real-time updates, and on-screen graphics help commentators explain strategy. — [Grand Prix 247](https://www.grandprix247.com/2025/08/25/the-importance-of-data-visualization-in-sports-broadcasting/)

### Inferences
- Producers want: a ranked list of candidate moments with a stated reason for each (this maps directly onto MatchMind's per-event tactical reasons), a fast turnaround, and an approve/edit step.
- Live versus post-match: live use requires latency low enough to be useful during play; post-match recap and clip packages are the realistic hackathon scope.
- A "why this clip" field with the event, the xG/pressure values, and the counterfactual (if relevant) directly serves editorial control.

### Gaps
- No independent evaluation of clip-selection accuracy or producer time saved was found.
- Latency requirements for live football graphics were not found in sources.

## What improvements would make a counterfactual or "what if" feature credible rather than gimmicky?

### Takeaway
Counterfactual xG work exists (2025 preprint with a hierarchical Bayesian model) but cannot be checked against what would have happened. Credibility therefore depends on showing calibration, stating uncertainty, and keeping the claim narrow. No viewer-facing study of "what if" features was found.

### Cited Findings
- A 2025 preprint proposes counterfactual xG by reallocating shots between players while holding match context fixed. It validates on 9,970 StatsBomb shots (2015–16) plus Football Manager-based priors, and reports agreement with a baseline and with StatsBomb xG. The case studies are illustrative and not tested against outcomes. — [arXiv 2511.23072](https://arxiv.org/html/2511.23072v1)
- KU Leuven (2024) argues that comparing cumulative xG with goals is contentious because shot outcomes are high-variance and samples are small, and that data interdependencies can confound measured finishing ability. — [arXiv 2401.09940](https://arxiv.org/pdf/2401.09940)
- A February 2026 preprint concludes xG models work best as probabilistic baselines and early-warning diagnostics, not reliable predictors of rare season outcomes. — [arXiv 2602.15673](https://arxiv.org/pdf/2602.15673)
- Vendor validation is often calibration-style on large shot samples (Driblab, about 44,000 shots), arguing that aggregate calibration is the right test rather than any single shot. — [Driblab](https://www.driblab.com/blog/how-good-is-driblabs-expected-goals-xg-model) (vendor)
- A 2021 master's thesis found XGBoost best for xG (AUC-ROC 0.79) and says more data is needed for predicting future results. — [CBS thesis record](https://research.cbs.dk/en/studentProjects/underlying-performance-indicators-in-football-quantifying-the-qua/)

### Inferences
For MatchMind's "what if" feature to feel credible:
- Name the model and its assumptions on screen (for example "xG model v1, shot-level, context held fixed"). This avoids the impression of a precise oracle.
- Show a range or confidence band, not a single number, and say what the range means in plain language.
- Keep counterfactuals local and falsifiable: compare against the observed outcome on similar historical situations, or against a calibration plot of the model's own predictions, so the feature can be checked.
- Restrict claims to what the model can support. Avoid "this would have won the match"; use "expected goals would have shifted by X".
- Validate calibration on a holdout of synthetic and, later, real data, and publish the calibration result alongside the feature.
- For a hackathon on synthetic data, state explicitly that the counterfactual is illustrative of the model, not a claim about real football.

### Gaps
- No study of viewer trust in counterfactual or "what if" sports graphics was found.
- Real-world counterfactual validation is not possible without a ground-truth alternate outcome, so calibration is the only practical check.

## Segment-by-segment improvements for MatchMind (feasibility and data notes)

These are inferences built on the findings above. Feasibility is for a hackathon prototype on synthetic data.

| Segment | Likely needs | Formats that fit | Specific MatchMind improvement | Feasible on synthetic data? | Needs real data or licence |
|---|---|---|---|---|---|
| Casual fan | Story of the match; key turning points | Timeline with labelled moments, short recap | Auto-recap with three to five plain-language turning points, each with a one-line reason | Yes | None |
| Die-hard fan | Why a moment mattered; player involvement | Animated pitch, shot map with xG | Per-event tactical reason card with a glossary tooltip for jargon | Yes | None |
| Coach/analyst | Structure, pressing, pass networks | Pass network with stated threshold, pressure timeline | Pressure timeline with exported event reasons and a method note | Yes (on synthetic tracking) | Real tracking data for realism |
| Fantasy/betting | Player-level stats, near-live updates | Player table, short alerts | Player-level summary and "what changed" feed; treat as out of scope for betting advice | Partly | Licensed live feed; check terms before any betting-adjacent use |
| Broadcaster/producer | Ranked candidate moments, reason per clip, approval step | Clip list with reasons, export | "Why this clip" panel with event, values and confidence; approve/reject controls | Yes | None for prototype; real footage licensing for distribution |
| Younger/second-screen | Short, shareable, low-jargon content | Clips, captions, mobile-first recap | Mobile recap with auto-generated captions and alt text | Yes | None for prototype; platform rules for publishing |

Cross-cutting recommendations (all segments):
- Direct labels, shape or pattern plus colour, 3:1 contrast, generated alt text.
- One-line glossary for xG, pressure and other model terms.
- Show the model's uncertainty and method note on every derived number.
- Keep the counterfactual feature narrow and calibrated (see above).

## Caveats and data-licensing notes
- Official football data (event and tracking) is licensed by providers; synthetic data cannot stand in for real-world claims. Any claims about real matches need a licence check.
- Clip and footage use for publication needs rights from rightsholders; the synthetic prototype avoids this.
- Betting-related features carry regulatory and advice risk. Keep these as information, not recommendations.
- Vendor claims (Spiideo, Zentag, Sofascore, Driblab, Grabyo, Eluvio) are self-reported and unverified here.
- Older evidence flagged: the Ireland survey (older, not 2025), and the 2021 CBS thesis.

## Unresolved gaps for a follow-up pass
- Comprehension studies for pass networks, heatmaps, shot maps and pressure timelines with football audiences.
- Original YouGov and IBM releases for the 68%, 90% and 61% figures.
- AWS's role in Premier League or broadcast workflows: the search returned only Microsoft coverage, so no AWS claim is made here.
- Live-latency requirements for broadcaster graphics.
- Independent accuracy evaluation of AI highlight and clip selection.
