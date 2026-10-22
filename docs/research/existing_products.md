# Existing Football Viewing and Analysis Products: Gap Analysis

Research date: 2026-10-22. Coverage is based on ~17 web searches and no direct product trials. Search snippets were used where pages could not be fetched, so feature claims are directional. Items marked UNVERIFIED need checking in the app or on the vendor's site before they go into a pitch.

## Key question 1: Which products offer tactical visualisation, heatmaps, pass networks, xG, pressing metrics, or 3D/animated pitches, and how deep?

### Takeaway
Heatmaps, shot maps, xG and basic pass networks are now standard in mass-market live apps (Sofascore, FotMob). Deep tactical visualisation (event-linked pitch views, 360 freeze frames, zonal pass plots) sits in paid analyst platforms (StatsBomb IQ, Wyscout, Hudl Sportscode). Pressing and team-shape analytics are mainly in enterprise computer-vision products (Opta Vision). No consumer product found offers 3D or animated pitches in the sources reviewed.

### Cited Findings
- Sofascore's own material and app listings describe heatmaps and shot maps as part of its advanced stats, and its corporate page calls the Heatmap and Shotmap "unique visual displays" — [Sofascore About](https://corporate.sofascore.com/about); [Sofascore App Store](https://apps.apple.com/us/app/sofascore-live-sports-scores/id1176147574)
- Sofascore's App Store listing says a football passing network now shows richer goal details — [Sofascore App Store](https://apps.apple.com/us/app/sofascore-live-sports-scores/id1176147574)
- FotMob's App Store listing names xG and shot maps as detailed stats features, and says these sit behind its paid tier — [FotMob App Store](https://apple.co/3mWC5mI) (paywall placement per listing; verify in-app)
- StatsBomb IQ (now branded Hudl StatsBomb) Pitch Vis, Hudl release of 2026-09-01: watch all clips from a visualisation at once; the event currently playing is highlighted on the pitch; event filters with sub-filters for outcome, body part, OBV range and xG range; redesigned filter panel — [Hudl Statsbomb release 2026-09-01](https://www.hudl.com/releases/statsbomb/2026-09-01)
- StatsBomb 360 data on the pitch (Hudl, Nov 2025): 360 metrics shown for on-ball events; clicking through jumps to linked video clips shareable on Hudl.com — [Hudl Statsbomb release 2025-11-17](https://www.hudl.com/releases/statsbomb/2025-11-17)
- StatsBomb Freeze Frame Viewer (2021 release): plots player positions visible at each event from 360 data, filterable by event type, pitch location, team/player, play scenario, pass type and game state — [StatsBomb blog archive](https://blogarchive.statsbomb.com/news/statsbomb-360-freeze-frame-viewer-a-new-release-in-statsbomb-iq/) (older, 2021)
- StatsBomb zonal "sonar" pass plots: shading shows completion, sizing shows pass length relative to league average; more options described as planned — [StatsBomb IQ overview](https://statsbomb.com/?p=11175) (vendor page; date unclear)
- Opta Vision (launched June 2022) pairs computer-vision tracking of all 22 players with Opta event data. Listed outputs: third-man runs, shape changes with and without the ball, pass intensity, pass predictions, and how pressure affects event outcomes — [SBC News on Opta Vision launch, 2022](https://sbcnews.co.uk/technology/2022/06/13/stats-perform-launches-opta-vision-for-new-generation-of-sports-data/); [SportBusiness, 2022](https://sportbusiness.com/2022/06/opta-vision-set-to-drive-in-game-engagement). Figures come from vendor and press material, with no independent accuracy evaluation found.
- Palmeiras signed for Opta Vision in January 2024 for high-performance analysis and recruitment, with its tactical outputs feeding a ProVision tool — [Stats Perform, via search snippet](https://www.statsperform.com/?p=30820) (vendor claim, unverified)
- Wyscout is video- and scouting-led; one source calls it the industry standard for match footage but limited on predictive analytics. Hudl Sportscode remains the common choice for in-house tactical coding by club analysts — [Wyscout pricing, Hudl](https://www.hudl.com/en_gb/products/wyscout/pricing); [pricing comparison via search](https://footballanalytics.ai/european-football-technology/top-european-football-scouting-technologies) (vendor marketing, treat as opinion)
- Premier League official app (2025/26, built with Microsoft as a five-year cloud/AI partner): live scores, stats, table updates, goal and red-card alerts, live text commentary, vertical matchday stories — [Premier League beginners guide](https://www.premierleague.com/en/news/4365156/premier-leagues-beginners-guide-all-you-need-to-know); [BroadcastNow](https://www.broadcastnow.co.uk/tech-innovation/fan-engagement-premier-league-overhauls-app-and-website/5206642.article). No tactical visualisation was listed for the official app.

### Inferences
- The consumer tier has commoditised xG, heatmaps and basic pass networks. A new product competes on explanation and interactivity, not on having these charts.
- The best-documented interactive pitch tools are StatsBomb (event plus 360 freeze frames) and Opta Vision (tracking). Both are enterprise-priced and tied to data licences.
- No evidence of 3D or animated pitch views in mainstream consumer apps. This is a possible differentiator, but it has not been checked in depth.

### Gaps
- Pressing metrics (PPDA and similar) were not checked in any consumer app. The sources did not cover them.
- Sofascore and FotMob feature depth for the paid tiers was not verified in-app.
- Nothing was found on 3D pitch products (e.g. broadcast-style 3D replays used by TV). This needs a targeted search.

## Key question 2: Does any product offer what-if or counterfactual analysis of a player position or decision? How is it presented?

### Takeaway
No commercial consumer or analyst product found in this research offers interactive what-if analysis of a player position. The closest evidence is academic: a 2025 hierarchical Bayesian counterfactual xG framework that reallocates shots between players. This is a real gap, but it is not yet a shipped product.

### Cited Findings
- "What If They Took the Shot? A Hierarchical Bayesian Framework for Counterfactual Expected Goals" (arXiv, Nov 2025) reallocates shots between players under identical contexts. Example outputs: a Sansone-for-Berardi swap adds about 2.2 xG; a Vardy-for-Giroud swap drops about 7 xG. Uses 9,970 StatsBomb 2015/16 shots and Football Manager 2017 ratings as priors — [arXiv 2511.23072](https://arxiv.org/html/2511.23072v1)
- Bayes-xG (arXiv 2023, later in Frontiers in Sports and Active Living 2024) finds player-level effects persist in xG, which standard xG models ignore — [arXiv 2311.13707](https://arxiv.org/html/2311.13707v1); [Frontiers 2024](https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2024.1348983/epub)
- Expected threat (xT) values each pitch zone by goal likelihood and credits moves by delta xT(end) minus xT(start). It only values ball-moving actions and assumes location alone captures scoring chance — [StatsBomb xT explainer](https://statsbomb.com/?p=101117); [Hudl possession value models](https://www.hudl.com/blog/possession-value-models-explained). xT is retrospective valuation, not a counterfactual.
- I found no source on pitch control or counterfactual decision analysis in the sources reviewed. The search for those returned nothing usable.

### Inferences
- The counterfactual idea has a credible academic basis (per-player xG adjustments and shot reallocation). A product could expose this as an interactive swap or reposition tool.
- Existing tools answer "what happened" and "how valuable". The sources reviewed show no tool answering "what would have happened if this player had been in a different position".

### Gaps
- No commercial product verified for position-swap counterfactuals. Vendor sites were not searched directly for "what-if" wording, so a small hidden feature cannot be ruled out.
- Pitch control (Spearman-style) and its public implementations were not covered by the search. Needs a follow-up.
- The arXiv paper's code and data licence were not checked.

## Key question 3: Which products generate narratives or recaps automatically, and how good are they?

### Takeaway
Vendors claim automated previews, milestones and post-match recaps, and Opta has launched AI insight products for FDC competitions. No independent quality evaluation of any auto-generated recap was found. Sky Sports is documented as using Opta insights, but not as using AI-written recaps.

### Cited Findings
- From 2025/26, Opta and OptaAI tools were set to generate AI-powered, data-led insights for Football DataCo competitions (including the Premier League) for broadcasters and media — [Inside World Football](https://insideworldfootball.com/?p=157686); [SVG Europe](https://www.svgeurope.org/blog/news-roundup/stats-perform-expands-official-media-data-partnership-with-football-dataco/)
- Opta's exclusive data supply covers on-screen graphics, studio analysis and commentary teams — [SVG Europe](https://www.svgeurope.org/blog/news-roundup/stats-perform-expands-official-media-data-partnership-with-football-dataco/)
- A Stats Perform workshop featured Karl Sturgeon of Sky Sports describing Opta Vision insights aired in pre-match and Monday Night Football packages — [Stats Perform insights](https://www.statsperform.com/insights/the-premier-league-is-back-the-opta-insights-powering-the-new-season/)
- Stats Perform's product pages list automated previews, in-game milestones and post-match recaps in multiple languages — [Stats Perform APIs and AI tools](https://www.statsperform.com/resource/apis-and-ai-tools-for-media-broadcasters-and-sports-apps/) (generic marketing, not evidence of quality)

### Inferences
- Auto-recaps are a vendor-driven, broadcaster-facing feature. Consumer-facing explanatory recaps appear to be rare.
- Quality is the main open question. Without evaluation, a team could credibly position on "explained recaps that cite evidence" but would need to show this.

### Gaps
- No review or benchmark of any auto-recap quality found.
- Whether Sky, TNT or Amazon use AI-written recaps was not confirmed. The Sky evidence concerns data-driven graphics and analysis.
- The Premier League app's "matchday stories" were not checked for whether they are generated or hand-written.

## Key question 4: What do users complain about?

### Takeaway
Aggregator review analyses point to ads and paywall creep as the main complaints for Sofascore and FotMob. The search found no Reddit threads, so this is weak evidence. Direct store review reading and Reddit searches are still needed.

### Cited Findings
- Sofascore complaints centre on aggressive full-screen ads and forced redirects during score checks; users also mention changed notification sounds — [Unstar 2026 comparison](https://unstar.app/blog/fotmob-onefootball-espn-365scores-sofascore-football-score-apps-ranked-2026); [Marlvel review analysis](https://marlvel.ai/apps/sofascore-live-sports-scores/reviews); [Kimola report](https://kimola.com/reports/unlock-insightful-user-feedback-on-sofascore-with-our-report-google-play-155954)
- Sofascore praise centres on stats depth and fast notifications — [Unstar 2026 comparison](https://unstar.app/blog/fotmob-onefootball-espn-365scores-sofascore-football-score-apps-ranked-2026)
- FotMob is praised for avoiding heavy ads; reported issues include battery drain and occasional crashes — [Perfection Geeks FotMob review](https://www.perfectiongeeks.com/blogs/fotmob-app-review)
- A 2026 comparison says FotMob's paid tier is a complaint source, with stats and a second followed team locked behind a subscription that appeared after an update — [Unstar 2026 comparison](https://unstar.app/blog/fotmob-onefootball-espn-365scores-sofascore-football-score-apps-ranked-2026) (single blog claim, verify)

### Inferences
- Ads (Sofascore) and paywalling (FotMob) are the two consumer pain points. An ad-light, explanation-first product has a clear angle.

### Gaps
- No Reddit threads found. Reddit r/soccer and r/footballapp were not reached through search. This must be done directly.
- Aggregator "complaint rate" methodology is undisclosed. Treat as directional.
- Complaints about analyst tools (Wyscout, StatsBomb, Hudl) were not found. Their users are professionals and may not post publicly.

## Key question 5: Pricing and licensing reality

### Takeaway
Consumer apps are cheap subscriptions with regional variation and conflicting figures. Analyst tools and data feeds are negotiated, with no public pricing. Data licensing (Opta/Stats Perform, Football DataCo) is the main barrier for any product that wants to show match-level tactical data.

### Cited Findings
- FotMob is free to download. Paid tiers are subscriptions or one-off purchases that vary by country. A third-party tracker (April 2026 snapshot, may be stale) lists US $1.99/month, $15.99/year, $4.99 for 3 months, and $2.99 Gold. German App Store: €17.99/year, €1.99/month, €5.99 for 3 months, €2.99 Gold — [FotMob App Store](https://apple.co/3mWC5mI); [AppPricingLab](https://apppricinglab.com/iap/apple/488575683). A 2024-era Adapty paywall page is older and gives different figures — [Adapty](https://adapty.io/paywall-library/fotmob-soccer-live-scores/)
- Conflicting FotMob Pro figures exist. A business-analysis page gives $9.99/year, which is not an official list — [Vizologi](https://vizologi.com/business-strategy-canvas/fotmob-business-model-canvas/). Many "Pro Unlocked" APK sites were found; these are unofficial and were not used.
- Sofascore: Plus/Pro subscription exists per third-party sources, but no official list of paid features was found. Its feature split is UNVERIFIED — [Sofascore App Store](https://apps.apple.com/us/app/sofascore-live-sports-scores/id1176147574)
- Stats Perform (Opta) has no public pricing and no self-serve tier; costs are set by licence scoped to competition, market and use case. Aggregators quote $500–$1,000+/month and $150/month, both unverified — [Stats Perform MLA](https://www.statsperform.com/legal/mla/); [SportsAPI.com](https://sportsapi.com/api-directory/statsperform/); [Slashdot](https://slashdot.org/software/comparison/Goalserve-vs-Stats-Perform-Opta/)
- A 2020 Stats Perform Master Licence Agreement (may be outdated) describes a 15% renewal increase and a $500 overage fee per additional 1,000,000 API calls per month — [Stats Perform MLA 2020](https://www.statsperform.com/mla2020/)
- Opta data requires a commercial licence for commercial use — [SportsFirst](https://www.sportsfirst.net/sportsapi/opta-sports-api)
- Premier League data rights: Opta is the official insights provider for Football DataCo competitions from the 2024 deal, which covers broadcasters, media and data supply — [Broadcast Now](https://www.broadcastnow.co.uk/tech-innovation/stats-perform-renews-football-dataco-partnership/5200091.article); [Stats Perform insights](https://www.statsperform.com/insights/the-premier-league-is-back-the-opta-insights-powering-the-new-season/). Whether the Premier League's own data rights restrict third-party use was not confirmed.
- Wyscout: official pricing is "contact us", with tiers named Copper, Mercury, Gold and Diamond — [Hudl Wyscout pricing](https://www.hudl.com/en_gb/products/wyscout/pricing). A competitor estimates a €15,000–25,000/year club licence; an older report says $290–$700/year for individuals — [footballanalytics.ai comparison](https://footballanalytics.ai/european-football-technology/top-european-football-scouting-technologies); [Kyiv Post](https://www.kyivpost.com/post/8268) (date unclear)

### Inferences
- A new product that shows match-level event or tracking data needs either a licence (expensive, scoped) or a free or open data source. StatsBomb open data and academic datasets (e.g. the 2015/16 StatsBomb set used in the arXiv paper) are likely routes for a prototype. Licence terms for these were not checked.
- Broadcaster lock-in: Opta's exclusive broadcast supply means broadcasters cannot easily export their graphics. Consumers see Opta-derived content only inside broadcaster products.

### Gaps
- Official FotMob, Sofascore and Wyscout pricing could not be verified. Figures above are third-party and dated.
- Current Stats Perform terms are not public. The 2020 MLA may not reflect current rates.
- Sky, TNT and Amazon Prime Video apps: no feature or licence evidence found in this round. Not covered beyond the Sky/Opta workshop reference.

## Unmet needs (synthesis across the above)

Based only on the evidence above. Each item is an inference, not a verified market gap.

1. **Explained tactical reasons.** Products show charts and metrics. No product found explains why a pattern or result happened, in plain language tied to visualised evidence.
2. **Interactive what-if.** Counterfactual position analysis exists in academic work (arXiv 2511.23072) but not in any product found.
3. **Ad-light, explanation-first consumer experience.** Sofascore is criticised for ads and FotMob for paywalled stats. A product that gives the full explanation free or cheap is an open position, subject to cost.
4. **Affordable 360/tracking-level visuals for fans.** StatsBomb 360 and Opta Vision are enterprise products. The consumer tier is event-based only.
5. **Verified auto-recaps.** Vendors claim automated recaps, but no quality evidence was found. A recap that cites its evidence would stand out.
6. **3D or animated pitch visuals for fans.** Not found in consumer apps in this research.

## Suggested next steps before writing a positioning doc
- Read App Store and Google Play reviews for Sofascore, FotMob and the Premier League app directly.
- Search Reddit (r/soccer, r/footballtactics, r/footballapp) for complaints and feature requests.
- Check FotMob, Sofascore and Wyscout pricing pages directly in a browser, by region.
- Search for pitch control and public implementations (e.g. Spearman 2018 and open-source packages).
- Search for 3D pitch products and TV 3D replay tools.
- Check licence terms for StatsBomb open data before using it in a prototype.

## Sources used
All links are inline above. Several pages reached only through search snippets, not full fetches. Dates and third-party pricing claims should be re-checked before publication.
