/* MatchMind · overlay feed.
 * One machine-readable list of timed overlays for a match: key moments, substitutions and
 * ten-minute control windows. A broadcaster or overlay renderer can read it and place each item
 * at its time. Times are seconds from kickoff, derived from the synthetic clock (90 minutes).
 */
(function (global) {
  'use strict';

  const MM = global.MatchMind;
  const FEED_VERSION = '1.0';

  function buildFeed(match, state) {
    const secPerEvent = (90 * 60) / match.total;
    const overlays = [];

    for (const ev of state.keyMoments) {
      const team = match.teams[ev.team];
      const item = {
        t: Math.round(ev.n * secPerEvent),
        minute: ev.minute,
        kind: ev.type === 'sub' ? 'substitution' : ev.type === 'shot' ? 'shot' : 'press',
        team: team.name,
        player: match.players[ev.player].name,
        text: ev.line,
        why: ev.why,
        event: ev.n,
      };
      if (ev.type === 'shot') item.xg = ev.xg;
      if (ev.feat && ev.feat.passDistance !== undefined) {
        item.passDistance = ev.feat.passDistance;
        item.difficulty = ev.feat.difficulty;
        item.speed = ev.feat.speed;
      }
      overlays.push(item);
    }

    for (const w of state.windows) {
      overlays.push({
        t: Math.round(w.from * 60),
        minute: w.from,
        kind: 'window',
        text: `Minutes ${w.from} to ${w.to}: ${w.label} phase, ${Math.round(w.turnoverShare * 100)}% of possession changes hands.`,
        why: 'Control share is passes and carries; chaos is tackles that change hands.',
        event: null,
      });
    }

    overlays.sort((a, b) => a.t - b.t || (a.event ?? 0) - (b.event ?? 0));

    return {
      version: FEED_VERSION,
      synthetic: true,
      note: 'Synthetic, football-realistic data. xG is a model estimate.',
      match: {
        seed: match.seed,
        home: match.teams[0].name,
        away: match.teams[1].name,
        score: match.score,
      },
      overlays,
    };
  }

  MM.feed = { buildFeed, FEED_VERSION };
  if (typeof module !== 'undefined' && module.exports) module.exports = MM.feed;
})(typeof window !== 'undefined' ? window : globalThis);
