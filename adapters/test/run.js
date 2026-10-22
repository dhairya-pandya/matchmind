#!/usr/bin/env node
/* Round-trip test for the StatsBomb-format adapter, on synthetic data only.
 * Checks that positions survive the frame conversion, and that the agent pipeline runs on the result.
 *
 * Run: node adapters/test/run.js
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

require('../../js/engine.js');
require('../../js/agents.js');
require('../statsbomb.js');

const MM = globalThis.MatchMind;
const { fromStatsBomb } = MM.adapters;
const { runPipeline } = MM.agents;

const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixture.json'), 'utf8'));
const match = fromStatsBomb(fixture.events, fixture.frames, {
  homeTeamId: fixture.homeTeamId,
  awayTeamId: fixture.awayTeamId,
  homeName: 'Home (synthetic)',
  awayName: 'Away (synthetic)',
  seed: fixture.seed,
});

const TOL = 1e-6;
const close = (a, b) => Math.abs(a - b) < TOL;

// 1. Every synthetic event carries a frame, so none should be dropped.
assert.strictEqual(match.events.length, fixture.events.length, 'event count');
assert.strictEqual(match.dropped, 0, 'no events dropped');

// 2. Ball positions round-trip through the StatsBomb frame.
match.events.forEach((ev, i) => {
  const want = fixture.expected[i].ball;
  assert.ok(close(ev.from[0], want[0]) && close(ev.from[1], want[1]),
    `event ${i} ball ${ev.from} != ${want}`);
});

// 3. All 22 player positions round-trip, for every snapshot.
match.snaps.forEach((snap, i) => {
  const want = fixture.expected[i].pos;
  for (let id = 0; id < 22; id++) {
    assert.ok(close(snap.pos[id][0], want[id][0]) && close(snap.pos[id][1], want[id][1]),
      `snap ${i} player ${id} ${snap.pos[id]} != ${want[id]}`);
  }
});

// 4. Pitch bounds: every position lies on the 105 x 68 pitch.
match.snaps.forEach((snap) => snap.pos.forEach(([x, y]) => {
  assert.ok(x >= -TOL && x <= 105 + TOL && y >= -TOL && y <= 68 + TOL, `off pitch: ${x}, ${y}`);
}));

// 5. The agent pipeline runs on adapted data, and produces key moments and a recap.
const out = runPipeline(match, '');
assert.ok(out.keyMoments.length > 0, 'key moments produced');
assert.ok(out.recap.length >= 2, 'recap produced');

console.log(`OK: ${match.events.length} events, 22 players per snapshot, round trip within ${TOL}.`);
console.log(`Pipeline: ${out.keyMoments.length} key moments, ${Object.keys(out.cfs).length} what-if shots.`);
