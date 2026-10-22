/* MatchMind · synthetic match engine
 * Generates a seeded, football-shaped event stream on a 105 x 68 pitch.
 * x runs goal to goal (0 to 105), y runs touchline to touchline (0 to 68).
 * Team 0 (home) attacks towards x = 105. Team 1 (away) attacks towards x = 0.
 * All data is synthetic. No real Premier League match data is used.
 *
 * Squads: 14 players per side, 11 on the pitch and 3 on the bench. Off-pitch players
 * sit at OFF_PITCH. Use isOn(pos) before counting or drawing a player.
 *
 * Ground truth: the generator plants tactical intents (half-space entry, overload, press)
 * by moving players, and records them in event.truth. Substitutions are events of type
 * 'sub'. The tactics agent never reads truth.
 */
(function (global) {
  'use strict';

  const PITCH = { length: 105, width: 68 };
  const CENTER = [52.5, 34];
  const OFF_PITCH = [-50, -50];
  const SQUAD_SIZE = 14;
  const STARTERS = 11;
  // Substitution slots: [event index, team]. Three per side, staggered around minutes 60 to 75.
  const SUB_SLOTS = [[580, 0], [590, 1], [600, 0], [610, 1], [620, 0], [630, 1]];

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const round = (v, d = 2) => Math.round(v * 10 ** d) / 10 ** d;
  const isOn = (p) => p[0] > -20;

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function pointSegDist(p, a, b) {
    const abx = b[0] - a[0];
    const aby = b[1] - a[1];
    const len = abx * abx + aby * aby || 1;
    const t = clamp(((p[0] - a[0]) * abx + (p[1] - a[1]) * aby) / len, 0, 1);
    return Math.hypot(a[0] + abx * t - p[0], a[1] + aby * t - p[1]);
  }

  // Base shapes are written in each team's own frame: they defend towards x = 0.
  // Entries 11 to 13 are bench players, placed off the pitch until they come on.
  const TEAMS = [
    {
      id: 0, name: 'Northbank FC', short: 'NBK', formation: '4-3-3', dir: 1,
      roles: ['GK', 'LB', 'CB', 'CB', 'RB', 'CM', 'CDM', 'CM', 'LW', 'ST', 'RW', 'SUB', 'SUB', 'SUB'],
      names: ['Okafor', 'Brennan', 'Haddad', 'Lindqvist', 'Moreau', 'Quill', 'Varga', 'Ashdown', 'Ruiz', 'Nakamura', 'Delgado', 'Pryce', 'Osei', 'Lane'],
      base: [[4, 34], [18, 11], [15, 26], [15, 42], [18, 57], [34, 24], [30, 34], [34, 44], [58, 12], [66, 34], [58, 56]],
    },
    {
      id: 1, name: 'Riverside City', short: 'RVC', formation: '4-4-2', dir: -1,
      roles: ['GK', 'RB', 'CB', 'CB', 'LB', 'RM', 'CM', 'CM', 'LM', 'ST', 'ST', 'SUB', 'SUB', 'SUB'],
      names: ['Dunmore', 'Achebe', 'Kessler', 'Rowe', 'Aziz', 'Pennock', 'Sorensen', 'Lamb', 'Ferraro', 'Quade', 'Holt', 'Marsh', 'Ibe', 'Tate'],
      base: [[101, 34], [87, 57], [90, 42], [90, 26], [87, 11], [71, 56], [70, 42], [70, 26], [71, 12], [56, 42], [56, 26]],
    },
  ];

  function generateMatch(seed = 7, total = 900) {
    const rand = mulberry32(seed);
    const pick = (arr) => arr[Math.floor(rand() * arr.length)];

    const players = [];
    for (const team of TEAMS) {
      for (let k = 0; k < SQUAD_SIZE; k++) {
        const onField = k < STARTERS;
        players.push({
          id: team.id * SQUAD_SIZE + k,
          team: team.id,
          shirt: k + 1,
          name: team.names[k],
          role: team.roles[k],
          base: onField ? team.base[k] : OFF_PITCH.slice(),
        });
      }
    }
    const squad = [0, 1].map((t) => players.filter((p) => p.team === t).map((p) => p.id));
    // On-pitch ids per side. These change with substitutions.
    const onPitch = [0, 1].map((t) => squad[t].slice(0, STARTERS));
    const bench = [0, 1].map((t) => squad[t].slice(STARTERS));
    const pos = players.map((p) => (isOn(p.base) ? p.base.slice() : OFF_PITCH.slice()));

    let ball = CENTER.slice();
    let poss = 0;
    const score = [0, 0];
    const events = [];
    const snaps = [];

    const nearest = (ids, point, k) =>
      ids.slice().sort((a, b) => dist(pos[a], point) - dist(pos[b], point)).slice(0, k);
    const nearCount = (ids, point, r) => ids.filter((id) => dist(pos[id], point) < r).length;
    const countCone = (from, to, ids) =>
      ids.filter((id) => pointSegDist(pos[id], from, to) < 5 && dist(pos[id], from) > 2).length;

    const subAt = new Map(SUB_SLOTS);
    const cameOn = new Set();

    for (let n = 0; n < total; n++) {
      const minute = Math.min(90, Math.floor((n / total) * 90) + 1);

      // Shape: every on-pitch player drifts towards its base, shifted with the ball.
      for (const t of [0, 1]) {
        for (const id of onPitch[t]) {
          const p = players[id];
          const tx = clamp(p.base[0] + (ball[0] - 52.5) * 0.35 + (rand() - 0.5) * 3, 1, 104);
          const ty = clamp(p.base[1] + (ball[1] - 34) * 0.25 + (rand() - 0.5) * 3, 1, 67);
          pos[id][0] += (tx - pos[id][0]) * 0.45;
          pos[id][1] += (ty - pos[id][1]) * 0.45;
        }
      }

      // Substitution: the ball does not move and possession does not change.
      if (subAt.has(n)) {
        const t = subAt.get(n);
        // A player who has just come on is not taken off again.
        const offCands = onPitch[t].filter((id) => players[id].role !== 'GK' && !cameOn.has(id));
        const off = pick(offCands);
        const onId = bench[t].shift();
        pos[onId] = pos[off].slice();
        players[onId].base = players[off].base.slice();
        players[onId].role = players[off].role;
        pos[off] = OFF_PITCH.slice();
        players[off].base = OFF_PITCH.slice();
        onPitch[t] = onPitch[t].map((id) => (id === off ? onId : id));
        cameOn.add(onId);
        const ev = {
          n, minute, team: t, player: onId, type: 'sub', from: ball.slice(), to: null,
          pressure: 0, receiver: null, xg: null, goal: false, dist: null, cone: 0,
          tackler: null, lost: off, snap: n, truth: [], score: score.slice(),
        };
        snaps.push({ pos: pos.map((p) => p.slice()), ball: ball.slice() });
        events.push(ev);
        continue;
      }

      const team = poss;
      const own = onPitch[team];
      const opp = onPitch[1 - team];
      const dir = TEAMS[team].dir;
      const holder = pick(nearest(own, ball, 4));
      const inAttThird = dir > 0 ? ball[0] > 70 : ball[0] < 35;
      const r = rand();

      let type = 'pass';
      if (inAttThird && r < 0.1) type = 'shot';
      else if (r < 0.17) type = 'tackle';
      else if (r < 0.4) type = 'carry';

      const truth = [];

      // Planted half-space entry: the ball sits in a half-space in the final third.
      if (type !== 'tackle' && inAttThird && rand() < 0.3) {
        ball[1] = rand() < 0.5 ? 19 : 49;
        pos[holder] = ball.slice();
        truth.push('halfspace');
      }
      // Planted overload: two teammates are pushed into the ball's zone.
      if (type !== 'tackle' && rand() < 0.25) {
        const helpers = own.filter((id) => id !== holder).sort(() => rand() - 0.5).slice(0, 2);
        for (const id of helpers) {
          pos[id] = [clamp(ball[0] + (rand() - 0.5) * 6, 1, 104), clamp(ball[1] + (rand() - 0.5) * 8, 1, 67)];
        }
        truth.push('overload');
      }
      // Planted press: the side that wins the ball has two players close to it.
      if (type === 'tackle' && rand() < 0.35) {
        const pressers = opp.slice().sort(() => rand() - 0.5).slice(0, 2);
        for (const id of pressers) {
          pos[id] = [clamp(ball[0] + (rand() - 0.5) * 4, 1, 104), clamp(ball[1] + (rand() - 0.5) * 4, 1, 67)];
        }
        truth.push('press');
      }

      const from = ball.slice();
      const pressure = nearCount(opp, ball, 7);

      const ev = {
        n, minute, team, player: holder, type, from, to: null, pressure,
        receiver: null, xg: null, goal: false, dist: null, cone: 0,
        tackler: null, lost: null, snap: n, truth, score: null,
      };

      if (ev.type === 'pass') {
        const cands = own.filter((id) => id !== holder);
        let best = cands[0];
        let bestProg = -Infinity;
        for (let k = 0; k < 3; k++) {
          const id = pick(cands);
          const prog = (pos[id][0] - ball[0]) * dir + (rand() - 0.5) * 6;
          if (prog > bestProg) { bestProg = prog; best = id; }
        }
        ball = [clamp(pos[best][0] + (rand() - 0.5) * 2, 3, 102), clamp(pos[best][1] + (rand() - 0.5) * 2, 0, 68)];
        ev.receiver = best;
        ev.to = ball.slice();
      } else if (ev.type === 'carry') {
        ball = [clamp(ball[0] + dir * (3 + rand() * 7), 3, 102), clamp(ball[1] + (rand() - 0.5) * 5, 0, 68)];
        ev.to = ball.slice();
      } else if (ev.type === 'shot') {
        const gx = dir > 0 ? 105 : 0;
        const goalC = [gx, 34];
        const d = dist(ball, goalC);
        const cone = countCone(ball, goalC, opp);
        const xg = clamp(0.55 * Math.exp(-0.12 * d) * (1 - 0.08 * cone), 0.01, 0.9);
        ev.goal = rand() < xg;
        ev.xg = round(xg, 3);
        ev.dist = round(d, 1);
        ev.cone = cone;
        ev.to = goalC.slice();
        if (ev.goal) {
          score[team]++;
          ball = CENTER.slice();
        } else {
          ball = [clamp(gx - dir * 5, 0, 105), 34 + (rand() - 0.5) * 8];
        }
        poss = 1 - team;
      } else {
        // Tackle: the defending side wins the ball.
        const tackler = nearest(opp, ball, 1)[0];
        ev.team = 1 - team;
        ev.player = tackler;
        ev.tackler = tackler;
        ev.lost = holder;
        ev.to = ball.slice();
        poss = 1 - team;
      }

      ev.score = score.slice();
      snaps.push({ pos: pos.map((p) => p.slice()), ball: ball.slice() });
      events.push(ev);
    }

    const stats = [0, 1].map((t) => ({
      team: t, possessionEvents: 0, shots: 0, goals: 0, xg: 0, passes: 0, tackles: 0,
    }));
    for (const ev of events) {
      if (ev.type === 'sub') continue;
      const s = stats[ev.team];
      s.possessionEvents++;
      if (ev.type === 'shot') { s.shots++; s.xg += ev.xg; if (ev.goal) s.goals++; }
      if (ev.type === 'pass') s.passes++;
      if (ev.type === 'tackle') s.tackles++;
    }
    const totalPoss = stats[0].possessionEvents + stats[1].possessionEvents || 1;
    stats.forEach((s) => {
      s.possession = round((s.possessionEvents / totalPoss) * 100, 0);
      s.xg = round(s.xg, 2);
    });

    return {
      seed, total, teams: TEAMS, players, squad, events, snaps, score, stats,
    };
  }

  global.MatchMind = global.MatchMind || {};
  global.MatchMind.util = { clamp, dist, round, pointSegDist, mulberry32, PITCH, CENTER, isOn, OFF_PITCH };
  global.MatchMind.engine = { generateMatch, TEAMS, PITCH, isOn, OFF_PITCH };
})(typeof window !== 'undefined' ? window : globalThis);
