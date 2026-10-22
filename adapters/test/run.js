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
require('../identity.js');
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
  linkIdentity: false, // round-trip checks coordinates in frame order; identity is tested in section 6
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

// 6. Identity: shuffle each frame, then check whether each slot keeps the same real player.
// Truth comes from the fixture's expected positions in the original frame order.
let seedState = 12345;
const rnd = () => ((seedState = (seedState * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const shuffled = {};
const perms = {};
for (const [id, frame] of Object.entries(fixture.frames)) {
  const order = frame.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  shuffled[id] = order.map((i) => frame[i]);
  perms[id] = order;
}
const common = { homeTeamId: fixture.homeTeamId, awayTeamId: fixture.awayTeamId, seed: fixture.seed };

// For each event and adapter slot, which true player (fixture index) is in that slot?
const truthKey = (m) => m.snaps.map((snap, i) => {
  const want = fixture.expected[i].pos;
  return snap.pos.map((p) => {
    const j = want.findIndex((q) => q && Math.abs(q[0] - p[0]) < 1e-6 && Math.abs(q[1] - p[1]) < 1e-6);
    return j;
  });
});
const switchRate = (m) => {
  const keys = truthKey(m);
  let switches = 0;
  let total = 0;
  for (let id = 0; id < 22; id++) {
    for (let i = 1; i < keys.length; i++) {
      if (keys[i][id] < 0 || keys[i - 1][id] < 0) continue;
      total++;
      if (keys[i][id] !== keys[i - 1][id]) switches++;
    }
  }
  return switches / total;
};
const linked = fromStatsBomb(fixture.events, shuffled, { ...common, linkIdentity: true });
const unlinked = fromStatsBomb(fixture.events, shuffled, { ...common, linkIdentity: false });
const rLinked = switchRate(linked);
const rUnlinked = switchRate(unlinked);
// Limit: nearest-position matching still swaps close players about 7% of the time on synthetic frames.
// The threshold guards against regression; it is not a claim that identity is solved.
assert.ok(rLinked < 0.10, `linked identity switch rate ${rLinked.toFixed(4)} too high`);
assert.ok(rUnlinked > 5 * rLinked, `linking should cut switches (${rLinked.toFixed(4)} vs ${rUnlinked.toFixed(4)})`);

console.log(`Identity: slot switch rate ${rLinked.toFixed(4)} linked vs ${rUnlinked.toFixed(4)} unlinked on shuffled frames.`);
console.log(`OK: ${match.events.length} events, 22 players per snapshot, round trip within ${TOL}.`);
console.log(`Pipeline: ${out.keyMoments.length} key moments, ${Object.keys(out.cfs).length} what-if shots.`);
