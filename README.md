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
npm run serve      # open http://localhost:8080
npm test           # engine rules and adapter round trip
npm run optimize   # re-tune the tactics skill, about 2 seconds
```

The page needs internet access for Three.js and Google Fonts.

## Where things are

| | |
| --- | --- |
| `js/` | Engine, agents, 3D pitch, charts, app |
| `skills/tactics.md` | The thresholds the tactics agent reads |
| `optimizer/` | Tunes the skill; writes the calibration report |
| `adapters/` | StatsBomb-format adapter and its synthetic test |
| `tests/` | Engine rules for squads and substitutions |
| `docs/REAL-DATA.md` | Real-feed integration, limits and licences |
| `docs/research/` | Research on viewing gaps and existing products |

## Status and next

Done: 3D pitch, key moments, what-if with calibration, substitutions, producer keep/drop and export, accessibility pass (text descriptions for every chart, lettered slots, dashed away line, keyboard orbit), recap claims that cite their events, and a copy check that blocks betting and win-probability language.

Next, roughly in order:

- A writer agent backed by a language model, with the heuristic as fallback. Needs a model key.
- A tracking-data adapter, once a licence is in place.
- Player identity across events, so trails and heatmaps stay correct on real feeds.
