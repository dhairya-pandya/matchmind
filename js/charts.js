/* MatchMind · 2D charts: heatmap, pressure timeline, what-if pitch.
 * Accessibility rules used here:
 *   - Every chart has a text description (describe*), shown under it and used as its label.
 *   - Team is never shown by colour alone: away lines are dashed, and lines are labelled at the end.
 *   - What-if slots are lettered (A to D) and the letter is drawn on the pitch.
 *   - Chart marks meet 3:1 against the background; pitch markings are drawn at full strength.
 */
(function (global) {
  'use strict';

  const MM = global.MatchMind;
  const { clamp } = MM.util;
  const TEAM_CSS = ['#5fe3c0', '#ff8a4c'];
  const TEAM_SHORT = ['Northbank', 'Riverside'];
  const SIGNAL = '#d7ff5a';
  const ALERT = '#ff5c6c';
  const CHALK = '#e9efe6';
  const CHALK_2 = '#a9b9ad';
  const TURF = '#0f1f18';
  const FONT = '13px Figtree, system-ui, sans-serif';
  const LETTERS = ['A', 'B', 'C', 'D'];

  // Size the canvas to its CSS box, with HiDPI scaling. Returns a 2D context.
  function fit(canvas) {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(global.devicePixelRatio || 1, 2);
    const w = Math.max(160, Math.round(r.width));
    const h = Math.max(120, Math.round(r.height));
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  }

  // ---------- Heatmap ----------
  function heatCells(match, team, playerId) {
    const cols = 21;
    const rows = 14;
    const grid = new Float32Array(cols * rows);
    const ids = playerId != null
      ? [playerId]
      : team != null ? match.squad[team] : [...match.squad[0], ...match.squad[1]];
    let samples = 0;
    for (const s of match.snaps) {
      for (const id of ids) {
        const p = s.pos[id];
        if (!MM.engine.isOn(p)) continue;
        const c = clamp(Math.floor((p[0] / 105) * cols), 0, cols - 1);
        const r = clamp(Math.floor((p[1] / 68) * rows), 0, rows - 1);
        grid[r * cols + c]++;
        samples++;
      }
    }
    return { grid, cols, rows, samples };
  }

  function drawHeat(canvas, match, team, playerId) {
    const { ctx, w, h } = fit(canvas);
    ctx.fillStyle = TURF;
    ctx.fillRect(0, 0, w, h);

    const { grid, cols, rows } = heatCells(match, team, playerId);
    const max = Math.max(...grid) || 1;
    const hex = playerId != null
      ? TEAM_CSS[match.players[playerId].team]
      : team != null ? TEAM_CSS[team] : SIGNAL;
    const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

    const off = document.createElement('canvas');
    off.width = cols;
    off.height = rows;
    const og = off.getContext('2d');
    const img = og.createImageData(cols, rows);
    for (let i = 0; i < grid.length; i++) {
      const v = grid[i] / max;
      img.data[i * 4] = rgb[0];
      img.data[i * 4 + 1] = rgb[1];
      img.data[i * 4 + 2] = rgb[2];
      img.data[i * 4 + 3] = Math.round(255 * Math.pow(v, 0.75));
    }
    og.putImageData(img, 0, 0);

    ctx.save();
    ctx.filter = 'blur(9px)';
    ctx.drawImage(off, 0, 0, w, h);
    ctx.restore();

    MM.pitch.drawPitch(ctx, w, h, { line: 'rgba(233, 239, 230, 0.55)', lw: 1.5 });
  }

  function describeHeat(match, team, playerId) {
    const { grid, cols, rows, samples } = heatCells(match, team, playerId);
    if (!samples) return 'No position samples for this selection.';
    let best = 0;
    grid.forEach((v, i) => { if (v > grid[best]) best = i; });
    const col = best % cols;
    const row = Math.floor(best / cols);
    const xZone = col < cols / 3 ? 'left' : col < (2 * cols) / 3 ? 'middle' : 'right';
    const yZone = row < rows / 3 ? 'top' : row < (2 * rows) / 3 ? 'centre' : 'bottom';
    const scope = playerId != null
      ? match.players[playerId].name
      : team != null ? match.teams[team].name : 'both teams';
    return `Heatmap for ${scope}: most positions are in the ${yZone} ${xZone} of the pitch. ` +
      `Brighter means more time spent there. Based on ${samples} position samples.`;
  }

  // ---------- Pressure timeline ----------
  function pressureSeries(match) {
    const series = [0, 1].map(() => new Array(91).fill(0));
    const counts = [0, 1].map(() => new Array(91).fill(0));
    for (const ev of match.events) {
      if (ev.type === 'tackle' || ev.type === 'sub') continue;
      series[ev.team][ev.minute] += ev.pressure;
      counts[ev.team][ev.minute] += 1;
    }
    return [0, 1].map((t) => series[t].map((_, m) => {
      let s = 0;
      let c = 0;
      for (let k = Math.max(1, m - 2); k <= Math.min(90, m + 2); k++) {
        s += counts[t][k] ? series[t][k] / counts[t][k] : 0;
        c += counts[t][k] ? 1 : 0;
      }
      return c ? s / c : 0;
    }));
  }

  function drawPressure(canvas, match, minute) {
    const { ctx, w, h } = fit(canvas);
    const pad = { l: 34, r: 84, t: 12, b: 24 };
    const iw = w - pad.l - pad.r;
    const ih = h - pad.t - pad.b;
    const lines = pressureSeries(match);
    const maxV = Math.max(3, ...lines.flat()) * 1.1;
    const x = (m) => pad.l + ((m - 1) / 89) * iw;
    const y = (v) => pad.t + ih - (v / maxV) * ih;

    ctx.font = FONT;
    ctx.strokeStyle = 'rgba(233, 239, 230, 0.16)';
    ctx.fillStyle = CHALK_2;
    ctx.lineWidth = 1;
    for (let v = 0; v <= maxV; v += 1) {
      ctx.beginPath();
      ctx.moveTo(pad.l, y(v));
      ctx.lineTo(w - pad.r, y(v));
      ctx.stroke();
      ctx.fillText(String(v), 6, y(v) + 4);
    }
    for (const m of [1, 15, 30, 45, 60, 75, 90]) {
      ctx.fillText(`${m}'`, x(m) - 6, h - 6);
    }

    lines.forEach((line, t) => {
      ctx.beginPath();
      line.forEach((v, m) => {
        if (m < 1) return;
        if (m === 1) ctx.moveTo(x(m), y(v));
        else ctx.lineTo(x(m), y(v));
      });
      ctx.strokeStyle = TEAM_CSS[t];
      ctx.lineWidth = 2.5;
      ctx.setLineDash(t === 1 ? [7, 4] : []);
      ctx.stroke();
      ctx.setLineDash([]);
      // Direct label at the line's end, so the key is not needed.
      const endV = line[90] || line[89] || 0;
      ctx.fillStyle = TEAM_CSS[t];
      ctx.fillText(TEAM_SHORT[t], x(90) + 8, y(endV) + 4);
    });

    const cx = x(clamp(minute, 1, 90));
    ctx.beginPath();
    ctx.moveTo(cx, pad.t);
    ctx.lineTo(cx, pad.t + ih);
    ctx.strokeStyle = SIGNAL;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  function describePressure(match) {
    const lines = pressureSeries(match);
    const peak = [0, 1].map((t) => {
      let m = 1;
      lines[t].forEach((v, i) => { if (i >= 1 && v > lines[t][m]) m = i; });
      return { m, v: lines[t][m] };
    });
    const avg = (t) => (lines[t].slice(1).reduce((a, b) => a + b, 0) / 90).toFixed(1);
    const top = peak[0].v >= peak[1].v ? 0 : 1;
    return `Pressure faced by each side, per minute: ${TEAM_SHORT[0]} averaged ${avg(0)} defenders close to the ball, ` +
      `${TEAM_SHORT[1]} ${avg(1)}. Highest peak: ${TEAM_SHORT[top]} around minute ${peak[top].m}.`;
  }

  // ---------- What-if pitch ----------
  function drawCounterfactual(canvas, match, cf, focusKey) {
    const { ctx, w, h } = fit(canvas);
    ctx.fillStyle = TURF;
    ctx.fillRect(0, 0, w, h);
    if (!cf) return;

    const team = match.players[cf.shooter].team;
    const dir = match.teams[team].dir;
    // Show the attacking 65 units only. Scale so 65 units fill the width.
    const x0 = dir > 0 ? 40 : 0;
    const s = w / 65;
    const toPx = (p) => [(p[0] - x0) * s, p[1] * s];

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    ctx.clip();
    ctx.translate(-x0 * s, 0);
    MM.pitch.drawPitch(ctx, 105 * s, 68 * s, { line: 'rgba(233, 239, 230, 0.5)', lw: 1.5 });
    ctx.restore();

    const pos = match.snaps[cf.n].pos;
    const dot = (p, fill, r = 4) => {
      const [px, py] = toPx(p);
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    };
    match.squad[team].forEach((id) => {
      if (id === cf.shooter || id === cf.mover || !MM.engine.isOn(pos[id])) return;
      dot(pos[id], 'rgba(233, 239, 230, 0.7)');
    });
    match.squad[1 - team].forEach((id) => {
      if (!MM.engine.isOn(pos[id])) return;
      dot(pos[id], 'rgba(255, 92, 108, 0.7)');
    });

    // Shot origin: a cross
    const [sx0, sy0] = toPx(cf.from);
    ctx.strokeStyle = CHALK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx0 - 6, sy0 - 6); ctx.lineTo(sx0 + 6, sy0 + 6);
    ctx.moveTo(sx0 + 6, sy0 - 6); ctx.lineTo(sx0 - 6, sy0 + 6);
    ctx.stroke();

    // The mover's real position: hollow circle
    const [mx, my] = toPx(cf.moverFrom);
    ctx.strokeStyle = CHALK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(mx, my, 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.font = 'bold 12px Figtree, system-ui, sans-serif';
    ctx.fillStyle = CHALK;
    ctx.fillText('now', mx + 9, my + 4);

    // Each slot: lettered (A is the best alternative). The focused one has a dashed line from the mover.
    cf.options.forEach((o, i) => {
      const [ox, oy] = toPx(o.to);
      const on = o.key === focusKey;
      const col = o.verdict === 'worse' ? ALERT : o.verdict === 'better' ? SIGNAL : CHALK;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(ox, oy, on ? 9 : 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = TURF;
      ctx.font = 'bold 11px Figtree, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(LETTERS[i], ox, oy + 0.5);
      ctx.textAlign = 'start';
      ctx.textBaseline = 'alphabetic';
      if (on) {
        ctx.strokeStyle = col;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(mx, my);
        ctx.lineTo(ox, oy);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });
  }

  function describeCounterfactual(match, cf) {
    if (!cf) return 'Pick a shot in the key moments to see alternatives.';
    const best = cf.options[0];
    const worst = cf.options[cf.options.length - 1];
    const who = match.players[cf.shooter].name;
    const mover = match.players[cf.mover].name;
    return `Shot at ${cf.minute} minutes by ${who}, xG ${cf.baseline.xg}. ` +
      `If ${mover} had taken it from slot A (${best.label.toLowerCase()}), xG would be ${best.xg}. ` +
      `From slot D (${worst.label.toLowerCase()}), ${worst.xg}. Slots are ranked by change in xG.`;
  }

  MM.charts = {
    drawHeat, describeHeat,
    drawPressure, describePressure,
    drawCounterfactual, describeCounterfactual,
    LETTERS,
  };
})(window);
