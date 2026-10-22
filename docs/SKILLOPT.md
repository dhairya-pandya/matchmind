# SkillOpt in MatchMind

MatchMind uses the SkillOpt loop from Microsoft Research ([arXiv 2605.23904](https://arxiv.org/abs/2605.23904), [code](https://github.com/microsoft/SkillOpt)) to tune its tactics skill. The loop is wired in. The reflect and edit steps are rules, not an LLM, because no model backend is configured here.

## What is wired

| SkillOpt idea | MatchMind implementation |
| --- | --- |
| Skill as trainable state | `skills/tactics.md`: a Markdown file of `- key: value` parameters, read by `js/agents.js` at run time |
| Rollout and score | `optimizer/skillopt.js` runs the agent on training matches and scores predicted intents against planted truth (macro F1) |
| Reflect | Find the weakest intent on the training matches |
| Bounded edit | One parameter, one step, within a range (`SKILL_SPACE` in `js/agents.js`) |
| Held-out gate | Accept only if validation macro F1 strictly improves |
| Edit budget | At most 2 proposals per epoch; one accepted edit per epoch |
| Rejected-edit buffer | Rejected edits are remembered and never retried |
| Held-out test | Test seeds are scored once, at the end, and never used for tuning |

## What differs from the LLM version

- **No LLM.** The reflect and edit steps are rules. The LLM version lets an optimizer model read rollouts and write the edit.
- **Numeric edits only.** The LLM version can also add and delete rules in the Markdown. MatchMind's skill is a parameter table.
- **Synthetic truth.** The generator plants the intents (half-space entry, overload, press) and records them in `event.truth`. Real matches have no such labels. See [REAL-DATA.md](REAL-DATA.md) for what replaces them.

## Results

From `optimizer/report.json` on unseen synthetic test seeds (201–208):

| | Default | Tuned |
| --- | --- | --- |
| Macro F1 | 0.730 | 0.805 |
| Half-space F1 | 0.715 | 0.804 |
| Overload F1 | 0.748 | 0.831 |
| Press F1 | 0.727 | 0.780 |

Five edits were accepted: half-space band lower edge 14 to 18, overload radius 10 to 8, press progression threshold 55 to 52. The optimizer changed nothing it could not justify on validation.

These numbers say the tactics rules recover the generator's planted intents better after tuning. They do not say the rules match football. The generator defines what counts as an intent, so the score measures agreement with the generator.

## Calibration

The optimizer also writes a calibration table: for shots on the test seeds, mean predicted xG against observed goal rate, by bin. The app shows it in the what-if panel.

This is a self-consistency check. The generator samples goals from the same xG formula, so a gap appears only where the counterfactual's model differs from the generator (for example the overload term). It cannot show that the model is right about football. Most bins have few shots, so treat them as noisy.

## Running it

```bash
npm run optimize
```

This rewrites `skills/tactics.md` only if validation improved, and writes `optimizer/report.json`. It runs in about two seconds.

## Using the real SkillOpt package with an LLM

The Python package `skillopt` (install with `pip install skillopt`) runs the LLM version. To use it here you would need:

1. A rollout task: a MatchMind wrapper that presents one match's events to a model and asks for the tactical intents. Its score is the same macro F1 on planted truth.
2. A backend. The README suggests `openai_compatible` first. Microsoft Foundry is the natural fit for the hackathon's Microsoft-stack criteria.
3. The `best_skill.md` it produces, copied into `skills/tactics.md`, with the parser in `js/agents.js` extended to read the richer format.

None of this is tested in this repo. It needs model access and API keys that were not configured here.
