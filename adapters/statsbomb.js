/* MatchMind · adapter for StatsBomb-format event data with 360 freeze frames.
 *
 * Input shape (StatsBomb open-data style):
 *   events: [{ id, index, period, minute, type: {name}, team: {id}, player: {id},
 *              location: [x, y], pass|carry|shot: {end_location|outcome|statsbomb_xg ...} }]
 *   frames: { [event.id]: [{ location: [x, y], teammate: boolean }, ...] }   (22 entries)
 *
 * Coordinates: StatsBomb locations are 120 x 80, from the attacking team's own frame
 * (attacks towards x = 120). This adapter maps them into MatchMind's absolute frame
 * (105 x 68, home attacks towards x = 105) with a 180 degree rotation for the away side.
 *
 * What this adapter does NOT do, so the limits are explicit:
 *   - Player identity: freeze frames carry no player ids. Players are numbered by order within
 *     each side, so the same number may refer to different people across events. Identity needs
 *     a tracking feed with ids.
 *   - Half orientation: events are mapped in the frame StatsBomb supplies. Sides are not
 *     re-flipped at half time, so check this against the lineup before trusting per-half views.
 *   - Events without a freeze frame are dropped, because the tactics and what-if agents need positions.
 *
 * No real match data is bundled. Users supply their own licensed feed (see docs/REAL-DATA.md).
 */
(function (global) {
  'use strict';

  const SB = { W: 120, H: 80 };
  const PX = { W: 105, H: 68 };
  const PLAYERS_PER_SIDE = 11;

  const toAbs = (loc, isAway) => {
    const x = (loc[0] * PX.W) / SB.W;
    const y = (loc[1] * PX.H) / SB.H;
    return isAway ? [PX.W - x, PX.H - y] : [x, y];
  };
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const round = (v, d = 2) => Math.round(v * 10 ** d) / 10 ** d;

  // Pair each side's events and frames with stable numbering: teammate k is player team*11+k.
  function splitFrame(frame, isAway) {
    const mates = frame.filter((p) => p.teammate);
    const opps = frame.filter((p) => !p.teammate);
    if (mates.length !== PLAYERS_PER_SIDE || opps.length !== PLAYERS_PER_SIDE) return null;
    const teamSide = (list) => list.map((p) => toAbs(p.location, isAway));
    return { mates: teamSide(mates), opps: teamSide(opps) };
  }

  function fromStatsBomb(events, frames, opts) {
    const homeId = opts.homeTeamId;
    const awayId = opts.awayTeamId;
    const teams = [
      { id: 0, name: opts.homeName || 'Home', short: 'HOM', formation: '', dir: 1, names: [], roles: [], base: [] },
      { id: 1, name: opts.awayName || 'Away', short: 'AWY', formation: '', dir: -1, names: [], roles: [], base: [] },
    ];
    const players = [];
    for (let t = 0; t < 2; t++) {
      for (let k = 0; k < PLAYERS_PER_SIDE; k++) {
        players.push({ id: t * 11 + k, team: t, shirt: k + 1, name: `P${k + 1}`, role: '', base: [0, 0] });
      }
    }
    const squad = [0, 1].map((t) => players.filter((p) => p.team === t).map((p) => p.id));

    const out = [];
    const snaps = [];
    const score = [0, 0];
    let dropped = 0;

    for (const e of events) {
      const type = e.type && e.type.name;
      if (!['Pass', 'Carry', 'Shot', 'Ball Recovery', 'Duel', 'Interception'].includes(type)) continue;
      const frame = frames[e.id];
      if (!frame) { dropped++; continue; }

      const teamSb = e.team && e.team.id;
      const t = teamSb === homeId ? 0 : teamSb === awayId ? 1 : null;
      if (t === null) { dropped++; continue; }
      const isAway = t === 1;
      const split = splitFrame(frame, isAway);
      if (!split) { dropped++; continue; }

      // Opponent-side frame: freeze frames use the same frame as the event's team.
      const mates = split.mates;
      const oppPos = split.opps;
      // Snapshot positions indexed by player id: own side first for team t.
      const byId = new Array(22);
      for (let k = 0; k < PLAYERS_PER_SIDE; k++) {
        byId[t * 11 + k] = mates[k];
        byId[(1 - t) * 11 + k] = oppPos[k];
      }

      const from = toAbs(e.location, isAway);
      const actorIdx = nearestIndex(mates, from);
      const ev = {
        n: out.length,
        minute: e.minute,
        team: t,
        player: t * 11 + actorIdx,
        type: type === 'Pass' ? 'pass' : type === 'Carry' ? 'carry' : type === 'Shot' ? 'shot' : 'tackle',
        from,
        to: null,
        pressure: oppPos.filter((p) => dist(p, from) < 7).length,
        receiver: null,
        xg: null,
        goal: false,
        dist: null,
        cone: 0,
        tackler: null,
        lost: null,
        snap: out.length,
        truth: [],
      };

      if (ev.type === 'pass' || ev.type === 'carry') {
        const end = (e.pass || e.carry || {}).end_location;
        if (end) {
          ev.to = toAbs(end, isAway);
          // Receiver is the nearest teammate to the end point; the freeze frame has no ids.
          ev.receiver = t * 11 + nearestIndex(mates, ev.to);
        }
      }
      if (ev.receiver === null) ev.receiver = ev.player;
      if (ev.type === 'shot') {
        const goalC = [isAway ? 0 : 105, 34];
        ev.dist = round(dist(from, goalC), 1);
        ev.xg = round((e.shot && e.shot.statsbomb_xg) || 0, 3);
        ev.goal = !!(e.shot && e.shot.outcome && e.shot.outcome.name === 'Goal');
        ev.to = goalC;
        if (ev.goal) score[t]++;
      }
      if (ev.type === 'tackle') {
        ev.tackler = ev.player;
        ev.lost = (1 - t) * 11 + nearestIndex(oppPos, from);
        ev.team = t;
      }

      out.push(ev);
      snaps.push({ pos: byId, ball: from.slice() });
    }

    const stats = [0, 1].map((t) => ({ team: t, possessionEvents: 0, shots: 0, goals: 0, xg: 0, passes: 0, tackles: 0 }));
    for (const ev of out) {
      const s = stats[ev.team];
      s.possessionEvents++;
      if (ev.type === 'shot') { s.shots++; s.xg += ev.xg; if (ev.goal) s.goals++; }
      if (ev.type === 'pass') s.passes++;
      if (ev.type === 'tackle') s.tackles++;
    }
    const totalPoss = stats[0].possessionEvents + stats[1].possessionEvents || 1;
    stats.forEach((s) => {
      s.possession = Math.round((s.possessionEvents / totalPoss) * 100);
      s.xg = round(s.xg, 2);
    });

    return {
      seed: opts.seed || null,
      source: 'statsbomb-adapter',
      total: out.length,
      teams,
      players,
      squad,
      events: out,
      snaps,
      score,
      stats,
      dropped,
    };
  }

  function nearestIndex(list, point) {
    let best = 0;
    let bestD = Infinity;
    list.forEach((p, i) => {
      const d = dist(p, point);
      if (d < bestD) { bestD = d; best = i; }
    });
    return best;
  }

  global.MatchMind = global.MatchMind || {};
  global.MatchMind.adapters = Object.assign(global.MatchMind.adapters || {}, {
    fromStatsBomb,
    toAbs,
    SB,
    PX,
  });
  if (typeof module !== 'undefined' && module.exports) module.exports = { fromStatsBomb, toAbs, SB, PX };
})(typeof window !== 'undefined' ? window : globalThis);
