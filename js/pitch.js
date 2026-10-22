/* MatchMind · shared pitch markings for the 3D texture and the 2D charts.
 * drawPitch draws a full 105 x 68 pitch into a canvas of size (w, h).
 */
(function (global) {
  'use strict';

  function drawPitch(ctx, w, h, opts = {}) {
    const line = opts.line || 'rgba(233, 239, 230, 0.5)';
    const lw = opts.lw || 2;
    const sx = w / 105;
    const sy = h / 68;
    const m = lw / 2;

    ctx.save();
    ctx.strokeStyle = line;
    ctx.fillStyle = line;
    ctx.lineWidth = lw;
    ctx.lineJoin = 'round';

    ctx.strokeRect(m, m, w - lw, h - lw);
    ctx.beginPath();
    ctx.moveTo(w / 2, m);
    ctx.lineTo(w / 2, h - m);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 9.15 * sx, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 0.5 * sx, 0, Math.PI * 2);
    ctx.fill();

    // Penalty arc sits outside the box: half-angle where it meets the box edge.
    const arcA = Math.acos((16.5 - 11) / 9.15);
    for (const side of [0, 1]) {
      const boxD = 16.5 * sx;
      const boxY = 13.84 * sy;
      const boxH = 40.32 * sy;
      const sixD = 5.5 * sx;
      const sixY = 24.84 * sy;
      const sixH = 18.32 * sy;
      const spotX = side ? w - 11 * sx : 11 * sx;

      ctx.strokeRect(side ? w - boxD : 0, boxY, boxD, boxH);
      ctx.strokeRect(side ? w - sixD : 0, sixY, sixD, sixH);

      ctx.beginPath();
      ctx.arc(spotX, h / 2, 1.2 * sx, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      if (side) ctx.arc(spotX, h / 2, 9.15 * sx, Math.PI - arcA, Math.PI + arcA);
      else ctx.arc(spotX, h / 2, 9.15 * sx, -arcA, arcA);
      ctx.stroke();
    }
    ctx.restore();
  }

  global.MatchMind = global.MatchMind || {};
  global.MatchMind.pitch = { drawPitch };
})(window);
