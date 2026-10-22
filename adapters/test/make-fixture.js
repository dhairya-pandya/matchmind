#!/usr/bin/env node
/* Builds a StatsBomb-format fixture from a generated MatchMind match.
 * The output is SYNTHETIC. It is used only to test the adapter's coordinate round trip.
 * It contains no real match data.
 *
 * Run: node adapters/test/make-fixture.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

require('../../js/engine.js');
const { generateMatch } = globalThis.MatchMind.engine;

const SB = { W: 120, H: 80 };
const PX = { W: 105, H: 68 };

// Inverse of the adapter: absolute pitch coords into the event team's StatsBomb frame.
function toSb(p, isAway) {
  const x = isAway ? PX.W - p[0] : p[0];
  const y = isAway ? PX.H - p[1] : p[1];
  return [(x * SB.W) / PX.W, (y * SB.H) / PX.H];
}

const SEED = 7;
const TOTAL = 120;
const HOME_ID = 101;
const AWAY_ID = 202;

const match = generateMatch(SEED, TOTAL);
const events = [];
const frames = {};
const TYPE_NAME = { pass: 'Pass', carry: 'Carry', shot: 'Shot', tackle: 'Ball Recovery' };
const { isOn } = globalThis.MatchMind.engine;
const expected = [];

match.events.forEach((ev, i) => {
  // Substitutions have no StatsBomb pass/carry/shot equivalent in this fixture, so they are skipped.
  if (ev.type === 'sub') return;
  const isAway = ev.team === 1;
  const teamSbId = ev.team === 0 ? HOME_ID : AWAY_ID;
  const id = `synthetic-${i}`;
  const sbEvent = {
    id,
    index: i + 1,
    period: ev.minute <= 45 ? 1 : 2,
    minute: ev.minute,
    type: { name: TYPE_NAME[ev.type] },
    team: { id: teamSbId },
    player: { id: 1000 + ev.player },
    location: toSb(ev.from, isAway),
  };
  if (ev.type === 'pass' && ev.to) sbEvent.pass = { end_location: toSb(ev.to, isAway) };
  if (ev.type === 'carry' && ev.to) sbEvent.carry = { end_location: toSb(ev.to, isAway) };
  if (ev.type === 'shot') {
    sbEvent.shot = { statsbomb_xg: ev.xg, outcome: { name: ev.goal ? 'Goal' : 'Saved' } };
  }
  events.push(sbEvent);

  // Freeze frame: the event team's players first, then the opponents, all in that team's frame.
  const snap = match.snaps[ev.snap].pos;
  const frame = [];
  const mates = match.squad[ev.team].filter((id2) => isOn(snap[id2]));
  const opps = match.squad[1 - ev.team].filter((id2) => isOn(snap[id2]));
  for (const id2 of mates) frame.push({ location: toSb(snap[id2], isAway), teammate: true });
  for (const id2 of opps) frame.push({ location: toSb(snap[id2], isAway), teammate: false });

  // Expected positions in the adapter's numbering: side t * 11 + frame order.
  const pos22 = new Array(22);
  mates.forEach((id2, k) => { pos22[ev.team * 11 + k] = snap[id2]; });
  opps.forEach((id2, k) => { pos22[(1 - ev.team) * 11 + k] = snap[id2]; });
  expected.push({ pos: pos22, ball: ev.from });
  frames[id] = frame;
});


const out = {
  note: 'SYNTHETIC fixture generated from MatchMind. Not real match data.',
  seed: SEED,
  homeTeamId: HOME_ID,
  awayTeamId: AWAY_ID,
  events,
  frames,
  expected,
};

const file = path.join(__dirname, 'fixture.json');
fs.writeFileSync(file, JSON.stringify(out));
console.log(`Wrote ${path.relative(process.cwd(), file)} with ${events.length} events.`);
