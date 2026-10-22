# Integrating real matches

MatchMind runs on synthetic data, which is the hackathon rule. This page covers how the same pipeline would take real matches, and what has to be true first.

## What the pipeline needs from a match

| Field | Used by | Source needed |
| --- | --- | --- |
| Event stream: type, team, player, minute, start and end location | Event detector, narrator | Event feed (Opta, StatsBomb, Sportec, others) |
| Player positions at each event | Tactics (overload, half-space), what-if | Tracking feed, or 360 freeze frames |
| Player identity, stable across events | Player trails, heatmaps, what-if mover | Tracking feed with ids |
| Score and possession | Recap | Event feed |

Events alone are not enough. Without positions the tactics agent cannot count the players around the ball, and the what-if cannot place anyone. The StatsBomb adapter in `adapters/statsbomb.js` takes events and 360 freeze frames for that reason.

## What is in the repo

`adapters/statsbomb.js` converts StatsBomb-format events and freeze frames into MatchMind's match object:

- Coordinates: StatsBomb is 120 × 80 and attack-relative. The adapter maps it to 105 × 68 absolute, with home attacking right and the away side rotated 180°.
- Events without a freeze frame are dropped and counted in `match.dropped`.
- Players are numbered by order within each side.

`adapters/test/run.js` checks the conversion on a synthetic fixture. It round-trips 120 events and 22 players per snapshot within 1e-6, and the pipeline runs on the output. The fixture is generated from MatchMind's own engine. It is not real data.

## Limits to fix before real matches

1. **Player identity.** Freeze frames have no player ids. Numbering by order means a number can refer to different players across events, which breaks player trails and heatmaps. The fix is a tracking feed with ids, or joining the event feed's player ids through lineups.
2. **Half orientation.** Some feeds report attack direction per half, and some report it per event. The adapter does not flip sides at half time, so per-half views need a check against the lineup.
3. **Tactical truth.** The optimizer scores against planted intents, which real matches don't have. For real data, the labels would have to come from expert annotation, or the thresholds would have to be checked against outcomes rather than labels. Expert annotation is the stronger option, and it would be a research project in its own right.
4. **Model calibration.** The what-if's shot model is a heuristic. On real data, recalibrate it against observed goal rates from the feed, and show the result on screen the way the calibration panel does now.
5. **Latency.** Live use needs the feed to arrive in time for a sub-second caption. Post-match analysis has no such limit.

## Licensing

- **Premier League data.** The hackathon rules forbid redistributing real Premier League match data, so nothing from a real match goes into this repo. A user who holds a licence can point the adapter at their own files on their own machine.
- **Opta / Stats Perform.** Event and tracking data are commercially licensed. There is no public price list. Commercial use needs a licence, and display rights may be narrower than analysis rights.
- **StatsBomb open data.** Free to use for non-commercial work with attribution, under StatsBomb's terms. Check the current terms before use. Open data covers selected competitions, not the Premier League.
- **Metrica sample tracking data.** An open sample dataset for research. Check its licence before use.

Ask the rights holder before showing any real match in a public demo, and before publishing a video of one.

## Suggested path

1. Keep the synthetic demo as the submission. It meets the rule.
2. For a research version, use StatsBomb open data for a few non-Premier League matches with 360 frames, and run the adapter and optimizer on them. Report the results as research, not as football fact.
3. For any Premier League version, get a licence first, then add a tracking feed adapter alongside the StatsBomb one.
