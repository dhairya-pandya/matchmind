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

match.events.forEach((ev, i) => {
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
  for (const id2 of match.squad[ev.team]) frame.push({ location: toSb(snap[id2], isAway), teammate: true });
  for (const id2 of match.squad[1 - ev.team]) frame.push({ location: toSb(snap[id2], isAway), teammate: false });
  frames[id] = frame;
});

// Keep the expected absolute positions alongside, so the test can check the round trip.
const expected = match.snaps.map((s, i) => ({ pos: s.pos, ball: match.events[i].from }));

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
