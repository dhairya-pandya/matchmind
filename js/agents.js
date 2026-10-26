/* MatchMind · agent pipeline
 * Four agents share one match state and leave a trace:
 *   1. EventDetector   adds geometry and zone features to every event
 *   2. Tactics         labels each event with tactical intents, using the skill file
 *   3. Counterfactual  asks "what if a teammate had been somewhere else?"
 *   4. Narrator        writes the line for each event and the match recap
 * The Orchestrator runs them in order and returns one result object.
 *
 * The tactics thresholds live in skills/tactics.md (a Markdown skill). The
 * SkillOpt optimizer (optimizer/skillopt.js) tunes them against planted truth.
 * The counterfactual uses a transparent heuristic model on synthetic data.
 * Its numbers are model estimates, not football facts.
 */
(function (global) {
  'use strict';

  const MM = global.MatchMind;
  const { clamp, dist, round, pointSegDist, isOn } = MM.util;

  // Defaults mirror skills/tactics.md. The skill file wins when it loads.
  const DEFAULT_SKILL = {
    'halfspace.yLow': 14,
    'halfspace.yHigh': 24,
    'halfspace.minProgress': 70,
    'overload.radius': 10,
    'overload.minDiff': 2,
    'press.minProgress': 55,
    'press.minPressure': 2,
  };

  // Each parameter: allowed range and the step SkillOpt uses for one edit.
  const SKILL_SPACE = {
    'halfspace.yLow': { min: 8, max: 22, step: 2 },
    'halfspace.yHigh': { min: 18, max: 30, step: 2 },
    'halfspace.minProgress': { min: 55, max: 85, step: 3 },
    'overload.radius': { min: 6, max: 16, step: 1 },
    'overload.minDiff': { min: 1, max: 4, step: 1 },
    'press.minProgress': { min: 40, max: 75, step: 3 },
    'press.minPressure': { min: 1, max: 4, step: 1 },
  };

  // Reads "- key: value" lines from a skill Markdown file. Unknown keys are ignored.
  function parseSkill(text) {
    const skill = { ...DEFAULT_SKILL };
    for (const line of String(text || '').split('\n')) {
      const m = line.match(/^\s*-\s*([\w.]+)\s*:\s*(-?\d+(?:\.\d+)?)\s*$/);
      if (m && Object.prototype.hasOwnProperty.call(DEFAULT_SKILL, m[1])) {
        skill[m[1]] = Number(m[2]);
      }
    }
    return skill;
  }

  const squadOf = (match, t) => match.squad[t];
  // 0 = own goal line, 105 = opponent goal line, from the team's point of view.
  const progress = (x, dir) => (dir > 0 ? x : 105 - x);
  const thirdOf = (p) => (p < 35 ? 'own third' : p < 70 ? 'middle third' : 'final third');
  const nameOf = (match, id) => match.players[id].name;

  // Half-space bands are symmetric about the centre line (y = 34).
  const inHalfSpace = (y, skill) =>
    (y >= skill['halfspace.yLow'] && y <= skill['halfspace.yHigh']) ||
    (y >= 68 - skill['halfspace.yHigh'] && y <= 68 - skill['halfspace.yLow']);

  // ---------- Agent 1: event detector ----------
  function eventDetector(match, state) {
    let shots = 0;
    for (const ev of match.events) {
      const t = ev.team;
      const dir = match.teams[t].dir;
      const pos = match.snaps[ev.snap].pos;
      const ball = ev.from;
      const own = squadOf(match, t);
      const opp = squadOf(match, 1 - t);
      const prog = progress(ball[0], dir);
      const gain = ev.to ? (ev.to[0] - ev.from[0]) * dir : 0;
      const cover = own.filter((id) => isOn(pos[id]) && progress(pos[id][0], dir) < prog - 2).length;

      ev.feat = {
        zone: thirdOf(prog),
        progress: round(prog, 1),
        gain: round(gain, 1),
        progressive: (ev.type === 'pass' || ev.type === 'carry') && gain >= 10,
        finalThird: prog >= 70,
        ballY: round(ball[1], 1),
        cover,
      };
      // Pass quality and speed. Clock: the synthetic match runs 90 minutes over all events.
      if (ev.type === 'pass' || ev.type === 'carry') {
        const d = ev.to ? dist(ev.from, ev.to) : 0;
        const secPerEvent = (90 * 60) / match.total;
        ev.feat.passDistance = round(d, 1);
        ev.feat.difficulty = Math.round(clamp(1 + d / 12 + ev.pressure * 0.5, 1, 5));
        ev.feat.speed = round(d / secPerEvent, 1); // metres per second, pitch units are metres
      }
      if (ev.type === 'shot') shots++;
    }
    state.log('Event detector', `Scanned ${match.events.length} events, ${shots} shots, geometry added to each.`);
  }

  // ---------- Agent 2: tactics ----------
  function tactics(match, state, skill) {
    let tagged = 0;
    for (const ev of match.events) {
      const f = ev.feat;
      const t = ev.team;
      const dir = match.teams[t].dir;
      const pos = match.snaps[ev.snap].pos;
      const radius = skill['overload.radius'];
      const ownNear = squadOf(match, t).filter((id) => dist(pos[id], ev.from) < radius && id !== ev.player).length;
      const oppNear = squadOf(match, 1 - t).filter((id) => dist(pos[id], ev.from) < radius).length;
      const overload = ownNear - oppNear;

      const halfspace = inHalfSpace(f.ballY, skill) && f.progress >= skill['halfspace.minProgress'];
      const overloadOn = overload >= skill['overload.minDiff'];
      const press = ev.type === 'tackle'
        && progress(ev.from[0], dir) >= skill['press.minProgress']
        && ev.pressure >= skill['press.minPressure'];

      ev.predicted = { halfspace, overload: overloadOn, press };

      const tags = [];
      if (ev.type === 'shot') {
        if (halfspace) tags.push('shot from a half-space');
        if (ev.cone >= 2) tags.push(`${ev.cone} defenders in the shooting lane`);
        else if (ev.cone === 1) tags.push('1 defender in the shooting lane');
        else tags.push('clear shooting lane');
      }
      if (halfspace && ev.type !== 'shot' && f.finalThird) tags.push('half-space entry');
      if (overloadOn) tags.push(`numerical overload +${overload}`);
      if (overload <= -2) tags.push(`outnumbered by ${-overload}`);
      if (press) tags.push('high press won the ball');
      if (press && ev.pressure >= 3) tags.push('pressing trap sprung');
      if (ev.type === 'tackle') {
        const lostDir = match.teams[1 - ev.team].dir;
        const lostProg = progress(ev.from[0], lostDir);
        const lostPos = match.snaps[ev.snap].pos;
        const lostCover = squadOf(match, 1 - ev.team)
          .filter((id) => isOn(lostPos[id]) && progress(lostPos[id][0], lostDir) < lostProg - 2).length;
        if (lostProg >= 70 && lostCover <= 1) tags.push('lost in the final third with little cover');
      }
      if (f.progressive) tags.push('progressive');
      ev.tags = tags;
      if (tags.length) tagged++;
    }
    state.log('Tactics', `Labelled ${tagged} events with a tactical reason, using thresholds from the skill file.`);
  }

  // ---------- Agent 3: counterfactual ----------
  // Value of a shot from a point: distance, lane blockers, and local overload.
  function shotValue(match, point, shooterId, P, team) {
    const dir = match.teams[team].dir;
    const goal = [dir > 0 ? 105 : 0, 34];
    const d = dist(point, goal);
    const oppIds = squadOf(match, 1 - team);
    const ownIds = squadOf(match, team).filter((id) => id !== shooterId);
    const cone = oppIds.filter((id) => pointSegDist(P[id], point, goal) < 5 && dist(P[id], point) > 2).length;
    const own = ownIds.filter((id) => dist(P[id], point) < 10).length;
    const opp = oppIds.filter((id) => dist(P[id], point) < 10).length;
    const overload = own - opp;
    const xg = clamp(
      0.55 * Math.exp(-0.12 * d) * (1 - 0.08 * cone) * (1 + 0.05 * clamp(overload, -2, 3)),
      0.01,
      0.9,
    );
    return { xg: round(xg, 3), d: round(d, 1), cone, overload };
  }

  function counterfactual(match, ev) {
    const t = ev.team;
    const dir = match.teams[t].dir;
    const goal = [dir > 0 ? 105 : 0, 34];
    const pos = match.snaps[ev.snap].pos;
    const shooter = ev.player;
    const from = ev.from;

    // The teammate closest to the chance moves to a new slot and takes the shot.
    const mover = squadOf(match, t)
      .filter((id) => id !== shooter)
      .sort((a, b) => dist(pos[a], from) - dist(pos[b], from))[0];

    const flankY = from[1] < 34 ? 46 : 22;
    const wideY = from[1] < 34 ? 6 : 62;
    const slots = [
      { key: 'halfspace', label: 'Half-space, inside the box', to: [goal[0] - dir * 11, flankY] },
      { key: 'central', label: 'Central, edge of the box', to: [goal[0] - dir * 16, 34] },
      { key: 'wide', label: 'Wide, byline run', to: [goal[0] - dir * 6, wideY] },
      { key: 'deeper', label: 'Deeper, second line', to: [goal[0] - dir * 32, 34] },
    ].map((s) => ({ ...s, to: [clamp(s.to[0], 1, 104), clamp(s.to[1], 1, 67)] }));

    const base = shotValue(match, from, shooter, pos, t);
    const options = slots.map((s) => {
      const P = pos.map((q) => q.slice());
      P[mover] = s.to.slice();
      const alt = shotValue(match, s.to, mover, P, t);
      // The ball must reach the new slot, so the chance is weighted by reception risk over distance.
      const reach = clamp(1 - 0.012 * dist(from, s.to), 0.35, 1);
      const altXg = round(alt.xg * reach, 3);
      const delta = round(altXg - base.xg, 3);
      const verdict = delta > 0.005 ? 'better' : delta < -0.005 ? 'worse' : 'similar';
      const reasons = [];
      const dd = alt.d - base.d;
      if (Math.abs(dd) >= 2) reasons.push(dd < 0 ? `${round(-dd, 1)} units closer to goal` : `${round(dd, 1)} units further out`);
      const dc = alt.cone - base.cone;
      if (dc < 0) reasons.push(`${-dc} fewer defender(s) in the lane`);
      if (dc > 0) reasons.push(`${dc} more defender(s) in the lane`);
      const dov = alt.overload - base.overload;
      if (dov > 0) reasons.push(`local overload improves by ${dov}`);
      if (dov < 0) reasons.push(`local overload drops by ${-dov}`);
      if (reach < 0.95) reasons.push(`reception risk ×${round(reach, 2)} from the pass`);
      return { key: s.key, label: s.label, to: s.to, xg: altXg, delta, verdict, reasons };
    }).sort((a, b) => b.delta - a.delta);

    return {
      n: ev.n,
      minute: ev.minute,
      shooter,
      mover,
      from,
      moverFrom: pos[mover].slice(),
      baseline: base,
      options,
    };
  }

  function counterfactualAgent(match, state) {
    const cfs = {};
    for (const ev of match.events) {
      if (ev.type === 'shot') cfs[ev.n] = counterfactual(match, ev);
    }
    state.log('Counterfactual', `Simulated ${Object.keys(cfs).length} shots with 4 alternative slots each.`);
    return cfs;
  }

  // ---------- Agent 4: narrator ----------
  // Narration languages. Only event lines and milestones are translated; the interface stays in English.
  const LANGS = ['en', 'es'];
  const TEXT = {
    en: {
      scores: (who, d, xg) => `${who} scores from ${d} units out (xG ${xg}).`,
      shoots: (who, d, xg, c) => `${who} shoots from ${d} units out (xG ${xg}), ${c} defender(s) in the lane.`,
      progressive: (who, to) => `${who} plays a progressive pass to ${to}.`,
      keeps: (who, to) => `${who} keeps it moving to ${to}.`,
      carry: (who, g) => `${who} carries the ball ${g} units forward.`,
      wins: (winner, lost, high) => `${winner} wins it from ${lost}${high ? ' high up the pitch' : ''}.`,
      sub: (who, off, team, state, a, b) => `${who} replaces ${off} (${team}, ${state} ${a}-${b}).`,
      level: 'level', leading: 'leading', trailing: 'trailing',
      firstGoal: (name) => `${name} scores the first goal of the match.`,
      nthGoal: (name, n) => `${name} scores their ${n} goal of the match.`,
      nthPass: (name, n) => `${name} completes their ${n} pass of the match.`,
    },
    es: {
      scores: (who, d, xg) => `${who} marca desde ${d} metros (xG ${xg}).`,
      shoots: (who, d, xg, c) => `${who} dispara desde ${d} metros (xG ${xg}), con ${c} defensor(es) en la trayectoria.`,
      progressive: (who, to) => `${who} hace un pase progresivo a ${to}.`,
      keeps: (who, to) => `${who} mantiene el balón con ${to}.`,
      carry: (who, g) => `${who} conduce el balón ${g} metros hacia adelante.`,
      wins: (winner, lost, high) => `${winner} le roba el balón a ${lost}${high ? ' en campo rival' : ''}.`,
      sub: (who, off, team, state, a, b) => `${who} entra por ${off} (${team}, ${state} ${a}-${b}).`,
      level: 'empate', leading: 'ganando', trailing: 'perdiendo',
      firstGoal: (name) => `${name} marca el primer gol del partido.`,
      nthGoal: (name, n) => `${name} marca su gol número ${n} del partido.`,
      nthPass: (name, n) => `${name} completa su pase número ${n} del partido.`,
    },
  };

  function eventLine(match, ev, lang = 'en') {
    const T = TEXT[lang] || TEXT.en;
    const who = nameOf(match, ev.player);
    if (ev.type === 'sub') {
      const [a, b] = ev.score;
      const state = a === b ? T.level : (ev.team === 0) === (a > b) ? T.leading : T.trailing;
      return T.sub(who, nameOf(match, ev.lost), match.teams[ev.team].name, state, a, b);
    }
    if (ev.type === 'shot') {
      if (ev.goal) return T.scores(who, ev.dist, ev.xg);
      return T.shoots(who, ev.dist, ev.xg, ev.cone);
    }
    if (ev.type === 'pass') {
      const to = nameOf(match, ev.receiver);
      return ev.feat.progressive ? T.progressive(who, to) : T.keeps(who, to);
    }
    if (ev.type === 'carry') return T.carry(who, round(ev.feat.gain, 0));
    return T.wins(nameOf(match, ev.tackler), nameOf(match, ev.lost), !!(ev.predicted && ev.predicted.press));
  }

  // Line for a given language. Used by the UI, so the caption can switch without rerunning the pipeline.
  function lineFor(match, ev, lang) {
    return eventLine(match, ev, lang);
  }

  // Shape phase from the reader's side: the team in possession is "in possession".
  function phaseOf(ev) {
    return ev.type === 'tackle' ? 'out of possession (pressing)' : 'in possession';
  }

  function whyLine(ev) {
    if (!ev.tags.length) return 'Routine possession, no tactical trigger.';
    return `Why it matters: ${ev.tags.join(', ')}. Phase: ${phaseOf(ev)}.`;
  }

  // Descriptive only: the team's shots and xG in the 15 minutes before and after a change.
  // It is not a causal estimate of the substitution's effect.
  function subImpact(match, ev) {
    const window = 15;
    const sum = (lo, hi) => match.events
      .filter((e) => e.team === ev.team && e.type === 'shot' && e.minute >= lo && e.minute < hi)
      .reduce((acc, e) => ({ shots: acc.shots + 1, xg: acc.xg + e.xg }), { shots: 0, xg: 0 });
    const before = sum(ev.minute - window, ev.minute);
    const after = sum(ev.minute + 1, ev.minute + 1 + window);
    return {
      before: { shots: before.shots, xg: round(before.xg, 2) },
      after: { shots: after.shots, xg: round(after.xg, 2) },
    };
  }

  function keyMomentScore(ev) {
    if (ev.type === 'sub') return 0.05;
    if (ev.type === 'shot') return (ev.goal ? 1 : 0) + ev.xg + 0.02;
    if (ev.type === 'tackle' && ev.predicted && ev.predicted.press) return 0.04 + ev.pressure * 0.01;
    return 0;
  }

  function narrator(match, state) {
    for (const ev of match.events) {
      ev.line = eventLine(match, ev, 'en');
      if (ev.type === 'sub') {
        ev.impact = subImpact(match, ev);
        const b = ev.impact.before;
        const a = ev.impact.after;
        ev.why = `Shots and xG for ${match.teams[ev.team].name}: 15 minutes before, ${b.shots} shots (${b.xg} xG); ` +
          `15 minutes after, ${a.shots} shots (${a.xg} xG). Descriptive, not a causal estimate.`;
      } else {
        ev.why = whyLine(ev);
      }
    }
    // Every shot and every substitution is a key moment. The strongest high presses fill the rest.
    // A low-xG shot scores below a press, so shots are not ranked against presses.
    const shots = match.events.filter((ev) => ev.type === 'shot');
    const subs = match.events.filter((ev) => ev.type === 'sub');
    const presses = match.events
      .filter((ev) => ev.type === 'tackle' && keyMomentScore(ev) > 0)
      .sort((a, b) => keyMomentScore(b) - keyMomentScore(a))
      .slice(0, 8);
    const moments = shots.concat(subs, presses)
      .sort((a, b) => a.minute - b.minute || a.n - b.n);

    const [home, away] = match.teams;
    const [s0, s1] = match.score;
    const [st0, st1] = match.stats;
    const best = match.events
      .filter((ev) => ev.type === 'shot')
      .sort((a, b) => b.xg - a.xg)[0];
    const press = match.events
      .filter((ev) => ev.type === 'tackle' && ev.predicted && ev.predicted.press)
      .sort((a, b) => b.pressure - a.pressure)[0];

    // Each claim carries the event numbers it depends on, so the reader can check it.
    const shotRefs = match.events.filter((ev) => ev.type === 'shot').map((ev) => ev.n);
    const subRefs = subs.map((ev) => ev.n);
    const claims = [
      {
        text: `${home.name} ${s0}-${s1} ${away.name}. ${home.name} had ${st0.possession}% of possession, ` +
          `with ${st0.shots} shots and ${st0.xg} xG. ${away.name} had ${st1.shots} shots and ${st1.xg} xG.`,
        refs: shotRefs,
      },
    ];
    if (best) {
      claims.push({
        text: `The clearest chance came in minute ${best.minute}: ${best.line} ` +
          `${best.tags.length ? best.why : ''}`.trim(),
        refs: [best.n],
      });
    }
    if (press) {
      claims.push({
        text: `The most aggressive press came in minute ${press.minute}, when ` +
          `${nameOf(match, press.tackler)} won the ball with ${press.pressure} players close by.`,
        refs: [press.n],
      });
    }
    // Player performance: the most-passing and most-distance players, with the events behind them.
    const perf = state.playerStats || [];
    if (perf.length) {
      const topPasser = perf.slice().sort((a, b) => b.passes - a.passes)[0];
      const topRunner = perf.slice().sort((a, b) => b.distance - a.distance)[0];
      const refsOf = (id, type) => match.events.filter((e) => e.player === id && e.type === type).map((e) => e.n);
      claims.push({
        text: `${topPasser.name} made the most passes, ${topPasser.passes}. ` +
          `${topRunner.name} covered the most ground, about ${topRunner.distance} metres.`,
        refs: refsOf(topPasser.id, 'pass').slice(0, 12).concat(refsOf(topRunner.id, 'carry').slice(0, 4)),
      });
    }
    if (subRefs.length) {
      claims.push({
        text: `${subRefs.length} substitutions were made, three per side, between minutes 60 and 75.`,
        refs: subRefs,
      });
    }
    claims.push({
      text: 'All numbers come from synthetic, football-realistic events. The tactical reasons are rule-based ' +
        'with thresholds tuned on planted truth, and the what-if values are model estimates.',
      refs: [],
    });

    state.log('Narrator', `Wrote ${match.events.length} event lines, ${moments.length} key moments and a recap.`);
    return { moments, recap: claims };
  }

  // ---------- Control and chaos ----------
  // Per 10-minute window: control share (passes and carries that keep the ball) against
  // chaos (tackles that change hands). A window is labelled by its dominant pattern.
  function windowsOf(match) {
    const out = [];
    for (let from = 0; from < 90; from += 10) {
      const to = Math.min(90, from + 10);
      const evs = match.events.filter((e) => e.minute > from && e.minute <= to && e.type !== 'sub');
      const keep = evs.filter((e) => e.type === 'pass' || e.type === 'carry').length;
      const turnovers = evs.filter((e) => e.type === 'tackle').length;
      const total = keep + turnovers || 1;
      const chaos = round(turnovers / total, 2);
      const label = chaos >= 0.3 ? 'chaotic' : chaos <= 0.15 ? 'controlled' : 'even';
      out.push({ from, to, events: evs.length, turnoverShare: chaos, label });
    }
    return out;
  }

  // ---------- Player performance and milestones ----------
  // Distance is the sum of movement between consecutive snapshots, on pitch only.
  // Speed is the average over one event window, not a peak: events are about six seconds apart.
  const MILESTONE_PASSES = [10, 25, 50];
  const ordinal = (n) => ({ 1: 'first', 2: 'second', 3: 'third' }[n] || `${n}th`);

  function playerPerformance(match, state) {
    const secPerEvent = (90 * 60) / match.total;
    const stats = match.players.map((p) => ({
      id: p.id, name: p.name, team: p.team, passes: 0, shots: 0, goals: 0, tackles: 0,
      distance: 0, maxWindowSpeed: 0,
    }));
    for (let i = 1; i < match.snaps.length; i++) {
      const a = match.snaps[i - 1].pos;
      const b = match.snaps[i].pos;
      for (const s of stats) {
        if (!isOn(a[s.id]) || !isOn(b[s.id])) continue;
        const d = dist(a[s.id], b[s.id]);
        s.distance += d;
        s.maxWindowSpeed = Math.max(s.maxWindowSpeed, d / secPerEvent);
      }
    }
    const milestones = [];
    for (const ev of match.events) {
      const actor = stats[ev.player];
      if (!actor || ev.type === 'sub') continue;
      if (ev.type === 'pass') {
        actor.passes++;
        if (MILESTONE_PASSES.includes(actor.passes)) {
          milestones.push({ n: ev.n, minute: ev.minute, player: actor.id,
            text: `${actor.name} completes their ${ordinal(actor.passes)} pass of the match.`,
            textEs: `${actor.name} completa su pase número ${actor.passes} del partido.` });
        }
      }
      if (ev.type === 'shot') {
        actor.shots++;
        if (actor.shots === 1) milestones.push({ n: ev.n, minute: ev.minute, player: actor.id,
          text: `${actor.name} takes the first shot of the match for ${match.teams[ev.team].name}.`,
          textEs: `${actor.name} lanza el primer tiro del partido para ${match.teams[ev.team].name}.` });
        if (ev.goal) {
          actor.goals++;
          milestones.push({ n: ev.n, minute: ev.minute, player: actor.id,
            text: actor.goals === 1
              ? `${actor.name} scores the first goal of the match.`
              : `${actor.name} scores their ${ordinal(actor.goals)} goal of the match.`,
            textEs: actor.goals === 1
              ? `${actor.name} marca el primer gol del partido.`
              : `${actor.name} marca su gol número ${actor.goals} del partido.` });
        }
      }
      if (ev.type === 'tackle') stats[ev.tackler].tackles++;
    }
    for (const s of stats) s.distance = round(s.distance, 0);
    for (const s of stats) s.maxWindowSpeed = round(s.maxWindowSpeed, 1);
    return { stats, milestones };
  }

  // ---------- Orchestrator ----------
  function runPipeline(match, skillText) {
    const trace = [];
    const skill = parseSkill(skillText);
    const state = {
      log: (agent, msg) => trace.push({ agent, msg }),
    };
    state.log('Orchestrator', `Loaded match seed ${match.seed}: ${match.teams[0].name} vs ${match.teams[1].name}.`);
    state.log('Orchestrator', `Skill parameters in use: ${Object.keys(skill).length}.`);

    eventDetector(match, state);
    tactics(match, state, skill);
    const cfs = counterfactualAgent(match, state);
    const windows = windowsOf(match);
    const perf = playerPerformance(match, state);
    state.playerStats = perf.stats;
    const { moments, recap } = narrator(match, state);
    state.log('Control', `Labelled ${windows.length} ten-minute windows as controlled, even or chaotic.`);

    state.log('Orchestrator', 'Pipeline complete. Shared state is ready for the UI.');
    return { match, keyMoments: moments, cfs, recap, trace, skill, windows, playerStats: perf.stats, milestones: perf.milestones };
  }

  MM.agents = { runPipeline, counterfactual, parseSkill, DEFAULT_SKILL, SKILL_SPACE, lineFor, LANGS, TEXT };
})(typeof window !== 'undefined' ? window : globalThis);
