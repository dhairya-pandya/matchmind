/* Player identity across freeze frames.
 * Freeze frames carry no player ids, and their order is not reliable. To keep each slot's
 * trail continuous, every new frame is matched to the previous frame's positions by minimum
 * total distance (Hungarian assignment). Small sides only, so O(n^3) is fine.
 */
(function (global) {
  'use strict';

  // Hungarian algorithm (minimum cost), rows to columns. Returns assign[row] = column.
  function hungarian(cost) {
    const n = cost.length;
    const INF = Infinity;
    const u = new Array(n + 1).fill(0);
    const v = new Array(n + 1).fill(0);
    const p = new Array(n + 1).fill(0);
    const way = new Array(n + 1).fill(0);
    for (let i = 1; i <= n; i++) {
      p[0] = i;
      let j0 = 0;
      const minv = new Array(n + 1).fill(INF);
      const used = new Array(n + 1).fill(false);
      do {
        used[j0] = true;
        const i0 = p[j0];
        let delta = INF;
        let j1 = 0;
        for (let j = 1; j <= n; j++) {
          if (!used[j]) {
            const cur = cost[i0 - 1][j - 1] - u[i0] - v[j];
            if (cur < minv[j]) { minv[j] = cur; way[j] = j0; }
            if (minv[j] < delta) { delta = minv[j]; j1 = j; }
          }
        }
        for (let j = 0; j <= n; j++) {
          if (used[j]) { u[p[j]] += delta; v[j] -= delta; } else { minv[j] -= delta; }
        }
        j0 = j1;
      } while (p[j0] !== 0);
      do {
        const j1 = way[j0];
        p[j0] = p[j1];
        j0 = j1;
      } while (j0);
    }
    const assign = new Array(n);
    for (let j = 1; j <= n; j++) assign[p[j] - 1] = j - 1;
    return assign;
  }

  // Given last known slot positions and a new frame's positions, return the frame re-ordered
  // so that frame[k] is the position that continues slot k.
  // Match each new position to the nearest free slot position (globally, by Hungarian assignment).
  // A centroid-shift correction was tried and made switches worse on the synthetic test, so it is not used.
  function linkFrame(slots, frame) {
    const cost = slots.map((s) => frame.map((f) => Math.hypot(s[0] - f[0], s[1] - f[1])));
    const assign = hungarian(cost);
    return assign.map((col) => frame[col]);
  }

  const api = { hungarian, linkFrame };
  global.MatchMind = global.MatchMind || {};
  global.MatchMind.identity = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
