#!/usr/bin/env node
/* SkillOpt-style optimizer for MatchMind's tactics skill.
 *
 * This follows the SkillOpt loop from Microsoft Research (arXiv 2605.23904):
 *   rollout  -> run the agent on training matches and score it against ground truth
 *   reflect  -> find the weakest intent on the training matches
 *   edit     -> propose a bounded change to the skill (one parameter, one step)
 *   gate     -> accept only if the held-out validation score strictly improves
 *   budget   -> at most EDITS_PER_EPOCH proposals per epoch
 *   buffer   -> rejected edits are remembered and never retried
 *
 * Differences from the LLM version, stated plainly:
 *   - The "reflect" and "edit" steps are rules, not an LLM. No model backend is configured.
 *   - Edits change numeric parameters only. The LLM version can also add and delete rules.
 *   - Ground truth comes from the generator's planted intents, not from human labels.
 *
 * Data split: train seeds tune proposals, validation seeds gate acceptance,
 * test seeds are scored once, at the end, and never used in tuning.
 *
 * Run: node optimizer/skillopt.js
 * Writes: skills/tactics.md (only if validation improved) and optimizer/report.json
 */
'use strict';

const fs = require('fs');
const path = require('path');

require('../js/engine.js');
require('../js/agents.js');

const MM = globalThis.MatchMind;
const { generateMatch } = MM.engine;
const { runPipeline, parseSkill, DEFAULT_SKILL, SKILL_SPACE } = MM.agents;

const ROOT = path.join(__dirname, '..');
const SKILL_PATH = path.join(ROOT, 'skills', 'tactics.md');
const REPORT_PATH = path.join(__dirname, 'report.json');

const LABELS = ['halfspace', 'overload', 'press'];
// Which parameters can change the score for each intent.
const PARAMS_FOR = {
  halfspace: ['halfspace.yLow', 'halfspace.yHigh', 'halfspace.minProgress'],
  overload: ['overload.radius', 'overload.minDiff'],
  press: ['press.minProgress', 'press.minPressure'],
};

const TRAIN_SEEDS = [1, 2, 3, 4, 5, 6, 7, 8];
const VAL_SEEDS = [101, 102, 103, 104, 105, 106, 107, 108];
const TEST_SEEDS = [201, 202, 203, 204, 205, 206, 207, 208];

const EPOCHS = 5;
const EDITS_PER_EPOCH = 2;

// Run the agent on each seed and collect predicted vs true labels per event.
function rollout(skill, seeds) {
  const rows = [];
  const shotRows = [];
  for (const seed of seeds) {
    const match = generateMatch(seed);
    const out = runPipeline(match, serialise(skill));
    for (const ev of match.events) {
      const truth = new Set(ev.truth);
      rows.push({
        truth,
        pred: LABELS.filter((l) => ev.predicted[l]),
      });
      if (ev.type === 'shot' && out.cfs[ev.n]) {
        shotRows.push({ xg: out.cfs[ev.n].baseline.xg, goal: ev.goal ? 1 : 0 });
      }
    }
  }
  return { rows, shotRows };
}

function serialise(skill) {
  return Object.entries(skill).map(([k, v]) => `- ${k}: ${v}`).join('\n');
}

// Precision, recall and F1 per label; macro F1 is the mean over labels.
function score(rows) {
  const per = {};
  for (const label of LABELS) {
    let tp = 0;
    let fp = 0;
    let fn = 0;
    for (const r of rows) {
      const p = r.pred.includes(label);
      const t = r.truth.has(label);
      if (p && t) tp++;
      else if (p && !t) fp++;
      else if (!p && t) fn++;
    }
    const precision = tp + fp ? tp / (tp + fp) : 0;
    const recall = tp + fn ? tp / (tp + fn) : 0;
    const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
    per[label] = { tp, fp, fn, precision: round3(precision), recall: round3(recall), f1: round3(f1) };
  }
  const macroF1 = round3(LABELS.reduce((s, l) => s + per[l].f1, 0) / LABELS.length);
  return { macroF1, per };
}

function round3(v) { return Math.round(v * 1000) / 1000; }

// Calibration of the counterfactual's shot model: mean predicted xG vs goal rate, by bin.
function calibration(shotRows) {
  const edges = [0, 0.05, 0.1, 0.2, 0.35, 1.01];
  const bins = [];
  for (let i = 0; i < edges.length - 1; i++) {
    const inBin = shotRows.filter((s) => s.xg >= edges[i] && s.xg < edges[i + 1]);
    if (!inBin.length) continue;
    const meanXg = inBin.reduce((s, r) => s + r.xg, 0) / inBin.length;
    const goalRate = inBin.reduce((s, r) => s + r.goal, 0) / inBin.length;
    bins.push({
      range: `${edges[i]}–${Math.min(edges[i + 1], 1).toFixed(2)}`,
      shots: inBin.length,
      meanPredictedXg: round3(meanXg),
      observedGoalRate: round3(goalRate),
      gap: round3(goalRate - meanXg),
    });
  }
  return bins;
}

// Weakest intent on the training rows, used to target the edit.
function weakestLabel(perTrain) {
  return LABELS.slice().sort((a, b) => perTrain[a].f1 - perTrain[b].f1)[0];
}

function proposeEdits(skill, label, rejected) {
  const edits = [];
  for (const key of PARAMS_FOR[label]) {
    const space = SKILL_SPACE[key];
    for (const dir of [1, -1]) {
      const next = clampTo(skill[key] + dir * space.step, space);
      if (next === skill[key]) continue;
      const id = `${key}=${next}`;
      if (rejected.has(id)) continue;
      edits.push({ key, value: next, id });
    }
  }
  return edits;
}

function clampTo(v, space) {
  return Math.min(space.max, Math.max(space.min, v));
}

function optimise() {
  let skill = { ...DEFAULT_SKILL };
  const rejected = new Set();
  const log = [];

  const baselineVal = score(rollout(skill, VAL_SEEDS).rows);
  let bestVal = baselineVal.macroF1;
  log.push({ epoch: 0, event: 'baseline', validationMacroF1: bestVal });

  for (let epoch = 1; epoch <= EPOCHS; epoch++) {
    const train = score(rollout(skill, TRAIN_SEEDS).rows);
    const target = weakestLabel(train.per);
    const candidates = proposeEdits(skill, target, rejected);
    let used = 0;
    let accepted = 0;

    for (const edit of candidates) {
      if (used >= EDITS_PER_EPOCH) break;
      used++;
      const trial = { ...skill, [edit.key]: edit.value };
      const val = score(rollout(trial, VAL_SEEDS).rows).macroF1;
      if (val > bestVal) {
        log.push({
          epoch, event: 'accepted', target, edit: `${edit.key}: ${skill[edit.key]} -> ${edit.value}`,
          validationMacroF1: val,
        });
        skill = trial;
        bestVal = val;
        accepted++;
        break; // one accepted edit per epoch keeps the change set easy to read
      }
      rejected.add(edit.id);
      log.push({
        epoch, event: 'rejected', target, edit: `${edit.key}: ${skill[edit.key]} -> ${edit.value}`,
        validationMacroF1: val,
      });
    }
    if (!used) {
      log.push({ epoch, event: 'no candidates', target });
      break;
    }
    if (!accepted) log.push({ epoch, event: 'no change this epoch', target });
  }

  return { skill, log, baselineVal };
}

function writeSkill(skill, before) {
  const lines = [
    '# Tactics skill',
    '',
    'This is the deployable skill for MatchMind\'s tactics agent. It is plain Markdown.',
    'The agent reads the `- key: value` lines below. Everything else is documentation.',
    '',
    'Written by `optimizer/skillopt.js`. Validation gate: held-out macro F1 must strictly improve.',
    `Validation macro F1: ${round3(before)} (default) -> see optimizer/report.json for the final value.`,
    '',
    '## Intents',
    '',
    '- **halfspace**: the ball sits in a half-space band in the final third.',
    '- **overload**: teammates near the ball outnumber opponents near the ball by at least `overload.minDiff`.',
    '- **press**: the side that wins the ball, high up the pitch, with enough players close by.',
    '',
    '## Parameters',
    '',
    ...Object.entries(skill).map(([k, v]) => `- ${k}: ${v}`),
    '',
  ];
  fs.writeFileSync(SKILL_PATH, lines.join('\n'));
}

function main() {
  const started = Date.now();
  const { skill, log, baselineVal } = optimise();

  const defaultTest = score(rollout(DEFAULT_SKILL, TEST_SEEDS).rows);
  const tunedRoll = rollout(skill, TEST_SEEDS);
  const tunedTest = score(tunedRoll.rows);

  const improved = skill !== DEFAULT_SKILL && JSON.stringify(skill) !== JSON.stringify(DEFAULT_SKILL);
  if (improved) writeSkill(skill, baselineVal.macroF1);

  const report = {
    generatedAt: new Date().toISOString(),
    method: 'SkillOpt-style loop, heuristic reflect and edit, numeric parameters only',
    seeds: { train: TRAIN_SEEDS, validation: VAL_SEEDS, test: TEST_SEEDS },
    epochs: EPOCHS,
    editsPerEpoch: EDITS_PER_EPOCH,
    defaultSkill: DEFAULT_SKILL,
    tunedSkill: skill,
    changed: improved,
    validation: { default: baselineVal.macroF1, tuned: score(rollout(skill, VAL_SEEDS).rows).macroF1 },
    test: {
      default: { macroF1: defaultTest.macroF1, per: defaultTest.per },
      tuned: { macroF1: tunedTest.macroF1, per: tunedTest.per },
    },
    calibration: calibration(tunedRoll.shotRows),
    log,
    runtimeSeconds: round3((Date.now() - started) / 1000),
  };
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + '\n');

  console.log(`Default test macro F1: ${defaultTest.macroF1}`);
  console.log(`Tuned test macro F1:   ${tunedTest.macroF1}`);
  console.log(`Changed skill: ${improved}`);
  console.log(`Edits: ${log.filter((l) => l.event === 'accepted').map((l) => l.edit).join('; ') || 'none'}`);
  console.log(`Report: ${path.relative(ROOT, REPORT_PATH)}`);
}

main();
