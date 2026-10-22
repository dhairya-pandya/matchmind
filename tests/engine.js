#!/usr/bin/env node
/* Checks the synthetic engine's squad and substitution rules on full-length matches.
 * Run: node tests/engine.js
 */
'use strict';

const assert = require('assert');

require('../js/engine.js');
require('../js/agents.js');

const MM = globalThis.MatchMind;
const { generateMatch, isOn } = MM.engine;
const { runPipeline } = MM.agents;

for (const seed of [7, 21, 42]) {
  const match = generateMatch(seed);
  assert.strictEqual(match.events.length, 900, `seed ${seed}: event count`);

  // 1. Exactly 11 players on the pitch per side, at every snapshot.
  match.snaps.forEach((snap, i) => {
    for (let t = 0; t < 2; t++) {
      const on = match.squad[t].filter((id) => isOn(snap.pos[id])).length;
      assert.strictEqual(on, 11, `seed ${seed} snap ${i} team ${t}: ${on} on pitch`);
    }
  });

  // 2. Three substitutions per side, each swapping one on-pitch player for one bench player.
  const subs = match.events.filter((e) => e.type === 'sub');
  assert.strictEqual(subs.length, 6, `seed ${seed}: sub count`);
  for (const t of [0, 1]) assert.strictEqual(subs.filter((e) => e.team === t).length, 3, `seed ${seed}: team ${t} subs`);

  for (const ev of subs) {
    const before = ev.snap > 0 ? match.snaps[ev.snap - 1].pos : null;
    const after = match.snaps[ev.snap].pos;
    assert.ok(before && !isOn(before[ev.player]), `seed ${seed}: ${ev.player} should be off before`);
    assert.ok(isOn(after[ev.player]), `seed ${seed}: ${ev.player} should be on after`);
    assert.ok(!isOn(after[ev.lost]), `seed ${seed}: ${ev.lost} should be off after`);
    assert.ok(isOn(before[ev.lost]), `seed ${seed}: ${ev.lost} should be on before`);
  }

  // 3. Real actions only involve players on the pitch at that moment.
  for (const ev of match.events) {
    if (ev.type === 'sub') continue;
    assert.ok(isOn(match.snaps[ev.snap].pos[ev.player]), `seed ${seed} event ${ev.n}: actor off pitch`);
  }

  // 4. Score state is recorded on each non-substitution event.
  assert.ok(match.events.every((e) => Array.isArray(e.score)), `seed ${seed}: score recorded`);

  // 5. The pipeline runs, and substitutions show up as key moments with impact figures.
  const out = runPipeline(match, '');
  const subMoments = out.keyMoments.filter((e) => e.type === 'sub');
  assert.ok(subMoments.length > 0, `seed ${seed}: sub key moments`);
  assert.ok(subMoments.every((e) => e.impact && e.line.includes('replaces')), `seed ${seed}: sub text`);

  // 6. Recap claims that contain numbers must cite events, and every cited event must exist.
  for (const claim of out.recap) {
    const hasNumber = /\d/.test(claim.text) && !/synthetic/.test(claim.text);
    if (hasNumber) assert.ok(claim.refs.length > 0, `seed ${seed}: uncited claim "${claim.text.slice(0, 40)}"`);
    for (const n of claim.refs) {
      assert.ok(Number.isInteger(n) && match.events[n] && match.events[n].n === n, `seed ${seed}: bad ref ${n}`);
    }
  }
}

console.log('OK: engine squad rules and substitutions hold for seeds 7, 21, 42.');
