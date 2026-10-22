/* MatchMind · 2D charts: heatmap, pressure timeline, counterfactual pitch. */
(function (global) {
  'use strict';

  const MM = global.MatchMind;
  const { clamp } = MM.util;
  const TEAM_CSS = ['#5fe3c0', '#ff8a4c'];
  const SIGNAL = '#d7ff5a';
  const ALERT = '#ff5c6c';
  const CHALK = '#e9efe6';
  const CHALK_2 = '#a9b9ad';
  const TURF = '#0f1f18';

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

  function drawHeat(canvas, match, team, playerId) {
    const { ctx, w, h } = fit(canvas);
    ctx.fillStyle = TURF;
    ctx.fillRect(0, 0, w, h);

    const cols = 21;
    const rows = 14;
    const grid = new Float32Array(cols * rows);
    const ids = playerId != null
      ? [playerId]
      : team != null
        ? match.squad[team]
        : [...match.squad[0], ...match.squad[1]];

    for (const s of match.snaps) {
      for (const id of ids) {
        const p = s.pos[id];
        if (!MM.engine.isOn(p)) continue;
        const c = clamp(Math.floor((p[0] / 105) * cols), 0, cols - 1);
        const r = clamp(Math.floor((p[1] / 68) * rows), 0, rows - 1);
        grid[r * cols + c]++;
      }
    }
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
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(off, 0, 0, w, h);
    ctx.restore();

    MM.pitch.drawPitch(ctx, w, h, { line: 'rgba(233, 239, 230, 0.28)', lw: 1.5 });
  }

  function drawPressure(canvas, match, minute) {
    const { ctx, w, h } = fit(canvas);
    const pad = { l: 30, r: 10, t: 12, b: 22 };
    const iw = w - pad.l - pad.r;
    const ih = h - pad.t - pad.b;

    // Pressure each team faces, averaged per minute and smoothed over 5 minutes.
    const series = [0, 1].map(() => new Array(91).fill(0));
    const counts = [0, 1].map(() => new Array(91).fill(0));
    for (const ev of match.events) {
      if (ev.type === 'tackle' || ev.type === 'sub') continue;
      series[ev.team][ev.minute] += ev.pressure;
      counts[ev.team][ev.minute] += 1;
    }
    const smooth = (t) => series[t].map((v, m) => {
      let s = 0;
      let c = 0;
      for (let k = Math.max(1, m - 2); k <= Math.min(90, m + 2); k++) {
        s += counts[t][k] ? series[t][k] / counts[t][k] : 0;
        c += counts[t][k] ? 1 : 0;
      }
      return c ? s / c : 0;
    });
    const lines = [0, 1].map(smooth);
    const maxV = Math.max(3, ...lines.flat()) * 1.1;
    const x = (m) => pad.l + ((m - 1) / 89) * iw;
    const y = (v) => pad.t + ih - (v / maxV) * ih;

    ctx.font = '12px Figtree, system-ui, sans-serif';
    ctx.fillStyle = CHALK_2;
    ctx.strokeStyle = 'rgba(233, 239, 230, 0.12)';
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
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    const cx = x(clamp(minute, 1, 90));
    ctx.beginPath();
    ctx.moveTo(cx, pad.t);
    ctx.lineTo(cx, pad.t + ih);
    ctx.strokeStyle = SIGNAL;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  function drawCounterfactual(canvas, match, cf, focusKey) {
    const { ctx, w, h } = fit(canvas);
    ctx.fillStyle = TURF;
    ctx.fillRect(0, 0, w, h);

    if (!cf) return;
    const dir = match.teams[cf.shooter ? match.players[cf.shooter].team : 0].dir;
    // Show the attacking 65 units only. Scale so 65 units fill the width.
    const x0 = dir > 0 ? 40 : 0;
    const s = w / 65;
    const toPx = (p) => [(p[0] - x0) * s, p[1] * s];

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    ctx.clip();
    ctx.translate(-x0 * s, 0);
    MM.pitch.drawPitch(ctx, 105 * s, 68 * s, { line: 'rgba(233, 239, 230, 0.26)', lw: 1.5 });
    ctx.restore();

    const pos = match.snaps[cf.n].pos;
    const teamOf = match.players[cf.shooter].team;
    match.squad[teamOf].forEach((id) => {
      if (id === cf.shooter || id === cf.mover || !MM.engine.isOn(pos[id])) return;
      const [px, py] = toPx(pos[id]);
      ctx.fillStyle = 'rgba(233, 239, 230, 0.35)';
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fill();
    });
    match.squad[1 - teamOf].forEach((id) => {
      if (!MM.engine.isOn(pos[id])) return;
      const [px, py] = toPx(pos[id]);
      ctx.fillStyle = 'rgba(255, 92, 108, 0.35)';
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // Shot origin
    const [sx0, sy0] = toPx(cf.from);
    ctx.strokeStyle = CHALK;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(sx0 - 6, sy0 - 6); ctx.lineTo(sx0 + 6, sy0 + 6);
    ctx.moveTo(sx0 + 6, sy0 - 6); ctx.lineTo(sx0 - 6, sy0 + 6);
    ctx.stroke();

    // Mover at original spot, hollow
    const [mx, my] = toPx(cf.moverFrom);
    ctx.strokeStyle = CHALK;
    ctx.beginPath();
    ctx.arc(mx, my, 6, 0, Math.PI * 2);
    ctx.stroke();

    // Each slot: faint dot. Focus option: filled plus arrow.
    cf.options.forEach((o) => {
      const [ox, oy] = toPx(o.to);
      const on = o.key === focusKey;
      const col = o.verdict === 'worse' ? ALERT : o.verdict === 'better' ? SIGNAL : CHALK_2;
      ctx.globalAlpha = on ? 1 : 0.4;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(ox, oy, on ? 6 : 4, 0, Math.PI * 2);
      ctx.fill();
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
      ctx.globalAlpha = 1;
    });
  }

  MM.charts = { drawHeat, drawPressure, drawCounterfactual };
})(window);
