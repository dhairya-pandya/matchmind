# MatchMind

Football matches explained, not just charted.

Most match apps show what happened: heatmaps, shot maps, xG. Pundits explain why it happened and what would have changed it. MatchMind tries to put that explanation next to the picture, for each key moment, and to test the "what if" honestly.

Built for the Inside the Game: Developer Hackathon. All data is synthetic.

## The idea

- **Every moment gets a reason.** A shot, a press or a substitution comes with the tactical label behind it, and the shape phase it happened in.
- **"What if" is a range, not a verdict.** Move a teammate to another slot and see whether the chance improves. Each slot is ranked and lettered, and the reasons are listed. The model is a heuristic, and the app says so.
- **Show how sure we are.** The shot model is checked against observed goal rates, and the result is on screen.
- **Producers keep control.** Keep or drop each moment, then export the kept list as JSON for a highlight package.
- **Synthetic first.** Matches come from a seeded generator with planted tactics, so the labels can be checked. Real feeds are a later step (see below).

## What it looks like

A 3D pitch shows the moment: players, ball and trails. Key moments are listed with team, reason and shape phase. The what-if panel shows the original position, the lettered alternatives and a calibration table. The recap and an agent trace sit underneath.

## How it thinks

Four small agents, each with one job:

1. **Detector:** adds the geometry (zones, progression, cover) to each event.
2. **Tactics:** labels each event with intents: half-space entry, overload, press. The thresholds come from a plain Markdown skill file.
3. **What-if:** moves the nearest teammate to four slots and scores each with a transparent model.
4. **Narrator:** writes the event lines, the moment list and the recap.

The thresholds are tuned by a small optimizer that accepts a change only if it improves held-out matches. It checks against the planted tactics, so it measures agreement with the generator, not with football.

## Honest limits

- The data is generated. Tactical labels agree with the generator, not with real football.
- What-if values are model estimates, not predictions.
- The calibration check is a sanity check on synthetic data.
- Substitution impact is descriptive (shots and xG before and after), not causal.
- Nothing here uses real Premier League data, and the hackathon rules forbid redistributing it.

## Real matches, later

The path is an adapter, not a rewrite. The StatsBomb-format adapter already maps events and 360 freeze frames into the same match shape, and it passes a round-trip test. The blockers are player identity (freeze frames have no ids), half orientation, and licences. See `docs/REAL-DATA.md`.

## Try it

```bash
npm run serve      # overview at http://localhost:8080, analysis at /analysis.html
npm test           # engine rules and adapter round trip
npm run optimize   # re-tune the tactics skill, about 2 seconds
```

The page needs internet access for Three.js and Google Fonts.

## For judges

- **Real:** the analysis runs in the browser. Tactical labels, what-if ranking, control windows, pass quality and ball speed are computed from the events and positions in the page.
- **Synthetic:** every match comes from a seed. No real Premier League data is used or shipped. Outputs in `feed/` and `data/` are generated from the same seeds.
- **Planned, not built:** a language-model writer, Azure and Microsoft Foundry hosting, auto-eventing from video, and tracking-data feeds. These need keys, a subscription or a licence.

## Outputs

- `feed/match-<seed>.json`: timed overlays (key moments, substitutions, control windows) for a broadcast renderer. Times are seconds from kickoff.
- `data/events-<seed>.csv`: every event with position, xG, pressure, pass distance, difficulty and speed.
- Regenerate with `node scripts/export.js`.

## Viewer modes

Analyst shows every key moment. Casual shows goals, big chances and substitutions. Player focus shows the moments one player is involved in.

