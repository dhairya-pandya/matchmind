#!/usr/bin/env node
/* Writes the overlay feed and a flat event CSV for each demo match.
 * Output: feed/match-<seed>.json and data/events-<seed>.csv. Synthetic data only.
 * Run: node scripts/export.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

require('../js/engine.js');
require('../js/agents.js');
require('../js/feed.js');

const MM = globalThis.MatchMind;
const root = path.join(__dirname, '..');
const SEEDS = [7, 21, 42];

for (const seed of SEEDS) {
  const match = MM.engine.generateMatch(seed);
  const state = MM.agents.runPipeline(match, '');
  const feed = MM.feed.buildFeed(match, state);
  fs.writeFileSync(path.join(root, 'feed', `match-${seed}.json`), JSON.stringify(feed, null, 2) + '\n');

  const header = ['event', 'minute', 'team', 'type', 'player', 'from_x', 'from_y', 'to_x', 'to_y', 'xg', 'goal', 'pressure', 'pass_distance', 'difficulty', 'speed_mps', 'tags'];
  const rows = match.events.map((ev) => {
    const teamName = match.teams[ev.team].name;
    const f = ev.from;
    const to = ev.to || ['', ''];
    const tags = (ev.tags || []).join('; ');
    return [
      ev.n, ev.minute, teamName, ev.type, match.players[ev.player].name,
      f[0].toFixed(1), f[1].toFixed(1), to[0] === '' ? '' : Number(to[0]).toFixed(1), to[1] === '' ? '' : Number(to[1]).toFixed(1),
      ev.xg ?? '', ev.goal ? 1 : 0, ev.pressure,
      ev.feat && ev.feat.passDistance !== undefined ? ev.feat.passDistance : '',
      ev.feat && ev.feat.difficulty !== undefined ? ev.feat.difficulty : '',
      ev.feat && ev.feat.speed !== undefined ? ev.feat.speed : '',
      `"${tags.replace(/"/g, '""')}"`,
    ].join(',');
  });
  fs.writeFileSync(path.join(root, 'data', `events-${seed}.csv`), [header.join(','), ...rows].join('\n') + '\n');
  console.log(`seed ${seed}: ${feed.overlays.length} overlays, ${match.events.length} events`);
}
