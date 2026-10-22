# MatchMind

Explainable football match intelligence built for the **Inside the Game: Developer Hackathon** (Microsoft and the Premier League).

MatchMind turns a stream of **synthetic, football-realistic** match events into:

- **Why it mattered**: each event gets tactical labels (half-space entry, numerical overload, high press, shot lane blocked, lost with little cover) and a shape phase.
- **What if**: pick a shot, move the nearest teammate to a new slot, and see whether the chance would be better or worse, with the reasons.
- **Calibration**: the what-if's shot model is checked against observed goal rates on held-out synthetic matches.
- **Visuals**: a Three.js 3D pitch with player and ball trails, a position heatmap, a pressure-faced timeline, and a what-if pitch.
- **Recap**: a generated match summary built from the same analysis.
- **Agent trace**: each agent's steps, shown in the UI.
- **Tuned tactics**: the tactical thresholds are a Markdown skill, tuned by a SkillOpt-style optimizer against planted truth.

No real Premier League data is used. Every match comes from a seed in `js/engine.js`.

## Quick start

```bash
npm run serve        # then open http://localhost:8080
npm run optimize     # re-tune the tactics skill (about 2 seconds)
npm test             # StatsBomb-format adapter round-trip test
```

The page needs internet access for Three.js (jsDelivr) and Google Fonts. Opening `index.html` from `file://` blocks the skill and report files, so the app falls back to its built-in defaults. Use the server.

## Repository layout

| Path | Role |
| --- | --- |
| `index.html`, `styles.css` | The app page and the design system (tokens on `:root`) |
| `js/engine.js` | Seeded synthetic match generator. Plants tactical intents and records them as ground truth |
| `js/agents.js` | Four agents and an orchestrator: event detector, tactics, counterfactual, narrator. Reads thresholds from the skill |
| `js/pitch.js` | Shared pitch markings for the 3D texture and 2D charts |
| `js/pitch3d.js` | Three.js scene: turf, players, ball, trails, shot markers, drag to orbit |
| `js/charts.js` | Heatmap, pressure timeline, what-if pitch (Canvas 2D) |
| `js/app.js` | UI wiring, playback, key moments, what-if panel, calibration, recap, trace |
| `skills/tactics.md` | The tactics skill: thresholds the agents read, rewritten by the optimizer |
| `optimizer/skillopt.js` | SkillOpt-style loop: rollout, reflect, bounded edit, held-out gate, budget, buffer |
| `optimizer/report.json` | Optimizer output: validation and test scores, edit log, calibration table |
| `adapters/statsbomb.js` | Converts StatsBomb-format events and 360 freeze frames into MatchMind's match object |
| `adapters/test/` | Synthetic fixture generator and round-trip test |
| `docs/SKILLOPT.md` | How SkillOpt is wired in, what differs from the LLM version, results |
| `docs/REAL-DATA.md` | How real matches would plug in, what has to be true first, licensing |
| `docs/research/` | Research on viewing gaps and existing products, from a pundit perspective |

## Agents

1. **Event detector** adds zone, progression, half-space position and cover to each event.
2. **Tactics** labels each event with intents, using thresholds from `skills/tactics.md`.
3. **Counterfactual** takes each shot, moves the nearest teammate to four slots (half-space, central, wide, deeper), and scores each alternative with a transparent heuristic: distance, lane blockers, local overload, and pass reception risk.
4. **Narrator** writes a line per event, the key-moment list, and the recap.

The orchestrator runs them in order and records each step in the trace.

## Tuning the tactics skill

`optimizer/skillopt.js` follows the SkillOpt loop from Microsoft Research ([arXiv 2605.23904](https://arxiv.org/abs/2605.23904)). It accepts an edit only when held-out macro F1 improves, and test seeds are never used in tuning.

On unseen test seeds, macro F1 goes from 0.730 (defaults) to 0.805 (tuned). The reflect and edit steps are rules, not an LLM. [docs/SKILLOPT.md](docs/SKILLOPT.md) covers what differs from the LLM version and how to connect a model backend.

## Design system

- **Palette**: ink and turf base, chalk text, mint for the home side and ember for the away side, lime as the single accent for focus and live state, alert red for worse outcomes.
- **Type**: Barlow Condensed for the scoreboard and headings, Figtree for reading text. Tabular numerals on live numbers.
- **Shape**: panels are split by hairlines, not boxes. Square corners, with a 4px radius on controls only.
- **Motion**: one camera dolly on load, eased player movement, fading trails. Reduced-motion users get no dolly and no transitions.

## Honest limits

- **Synthetic data.** Positions and events come from a generator, not from tracking data. Planted intents are the ground truth, so the tuned scores measure agreement with the generator, not with football.
- **What-if numbers are model estimates.** The shot model is a heuristic, not a trained xG model. The calibration panel is a self-consistency check on synthetic data, not validation against football.
- **Real matches are not included.** [docs/REAL-DATA.md](docs/REAL-DATA.md) covers how a licensed feed would plug in, the identity and orientation limits, and the licensing terms.
- **Microsoft stack not called yet.** The agents are separate modules, so they could be backed by Microsoft Foundry. This build does not call Foundry or Agent Framework.
