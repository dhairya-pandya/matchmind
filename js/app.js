/* MatchMind · app shell: wires the engine, agents, 3D pitch and charts to the page. */
(function (global) {
  'use strict';

  const MM = global.MatchMind;
  const $ = (sel) => document.querySelector(sel);
  const EVENTS_PER_SECOND = 8;
  const MATCHES = [
    { seed: 7, label: 'Northbank vs Riverside · match A' },
    { seed: 21, label: 'Northbank vs Riverside · match B' },
    { seed: 42, label: 'Northbank vs Riverside · match C' },
  ];

  const app = {
    match: null,
    state: null,
    pitch: null,
    t: 0,
    playing: false,
    speed: 1,
    selected: 0,
    focusN: null,
    cfFocus: null,
    liveIndex: -1,
    goalsBy: null,
  };

  // ---------- Helpers ----------
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  const fmtMin = (m) => `${m}'`;
  const signed = (v) => (v >= 0 ? `+${v.toFixed(3)}` : v.toFixed(3));
  const teamName = (match, t) => match.teams[t].name;
  const playerLabel = (match, id) => `${match.players[id].name} (${match.players[id].shirt})`;

  // ---------- Loading ----------
  // The skill and optimizer report are plain files. If they fail to load (for example
  // from file://), the agents fall back to their built-in defaults.
  let skillText = '';
  let calibrationReport = null;
  async function loadAssets() {
    try { skillText = await (await fetch('skills/tactics.md')).text(); } catch (e) { skillText = ''; }
    try { calibrationReport = await (await fetch('optimizer/report.json')).json(); } catch (e) { calibrationReport = null; }
  }

  function load(seed) {
    app.match = MM.engine.generateMatch(seed);
    app.state = MM.agents.runPipeline(app.match, skillText);
    app.goalsBy = buildGoalIndex(app.match);
    if (!app.pitch) {
      app.pitch = MM.createPitch3D($('#pitch3d'), app.match);
    } else {
      app.pitch.setMatch(app.match);
    }
    buildScoreline();
    buildTicks();
    buildMoments();
    buildHeatPlayers();
    buildTrace();
    buildRecap();
    buildCalibration();
    $('#scrub').max = String(app.match.events.length - 1);

    const bestShot = app.state.keyMoments
      .filter((ev) => ev.type === 'shot')
      .sort((a, b) => b.xg - a.xg)[0] || app.state.keyMoments[0];
    selectMoment(bestShot, { scrollPanel: false });
    drawAllCharts();
  }

  function buildGoalIndex(match) {
    // goalsBy[n] = [home goals, away goals] after event n
    const goals = [0, 0];
    return match.events.map((ev) => {
      if (ev.type === 'shot' && ev.goal) goals[ev.team]++;
      return goals.slice();
    });
  }

  // ---------- Static UI ----------
  function buildMatchSelect() {
    const sel = $('#matchSelect');
    MATCHES.forEach((m) => {
      const o = el('option', null, m.label);
      o.value = String(m.seed);
      sel.appendChild(o);
    });
    sel.addEventListener('change', () => {
      pause();
      load(Number(sel.value));
    });
  }

  function buildScoreline() {
    const { match } = app;
    const box = $('#scoreline');
    box.textContent = '';
    box.append(
      el('span', 'team team-home', match.teams[0].name),
      el('span', 'goals', '0'),
      el('span', 'sep', '–'),
      el('span', 'goals', '0'),
      el('span', 'team team-away', match.teams[1].name),
      el('span', 'clock', '0\''),
    );
  }

  function updateScoreline(n, minute) {
    const box = $('#scoreline');
    const g = app.goalsBy[n] || [0, 0];
    const goals = box.querySelectorAll('.goals');
    goals[0].textContent = String(g[0]);
    goals[1].textContent = String(g[1]);
    box.querySelector('.clock').textContent = fmtMin(minute);
  }

  function buildTicks() {
    const ticks = $('#ticks');
    ticks.textContent = '';
    const max = app.match.events.length - 1;
    app.match.events.forEach((ev) => {
      if (ev.type !== 'shot') return;
      const t = el('span', 'tick' + (ev.goal ? ' is-goal' : ' is-shot'));
      t.style.left = `${(ev.n / max) * 100}%`;
      t.title = `${fmtMin(ev.minute)} · ${ev.goal ? 'goal' : 'shot'} · xG ${ev.xg}`;
      ticks.appendChild(t);
    });
  }

  function buildMoments() {
    const list = $('#momentList');
    list.textContent = '';
    const { match, keyMoments } = app.state;
    app.curation = {};
    keyMoments.forEach((ev) => {
      const li = el('li', 'moment-row');
      const btn = el('button', 'moment');
      btn.type = 'button';
      btn.dataset.n = String(ev.n);
      btn.setAttribute('aria-pressed', 'false');

      const bar = el('span', 'moment-bar ' + (ev.team === 0 ? 'home' : 'away'));
      const min = el('span', 'moment-min', fmtMin(ev.minute));
      const text = el('span', 'moment-text');
      const title = ev.type === 'shot'
        ? `${ev.goal ? 'Goal' : 'Shot'} · ${match.players[ev.player].name}, xG ${ev.xg}`
        : ev.type === 'sub'
          ? `Sub · ${match.players[ev.player].name} on for ${match.players[ev.lost].name}`
          : `High press · ${match.players[ev.tackler].name} wins it`;
      text.append(el('span', 'moment-title', title), el('span', 'moment-why', ev.why));
      btn.append(bar, min, text);
      btn.addEventListener('click', () => selectMoment(ev));
      li.appendChild(btn);
      li.appendChild(curationControl(ev));
      list.appendChild(li);
    });
    updateExportCount();
  }

  // Producer control: keep or drop a moment for the highlight package. Kept state is per session.
  function curationControl(ev) {
    const box = el('div', 'curate');
    const keep = el('button', 'curate-btn', 'Keep');
    const drop = el('button', 'curate-btn', 'Drop');
    keep.type = drop.type = 'button';
    const paint = () => {
      const s = app.curation[ev.n];
      keep.setAttribute('aria-pressed', String(s === 'keep'));
      drop.setAttribute('aria-pressed', String(s === 'drop'));
    };
    keep.addEventListener('click', () => { app.curation[ev.n] = app.curation[ev.n] === 'keep' ? null : 'keep'; paint(); updateExportCount(); });
    drop.addEventListener('click', () => { app.curation[ev.n] = app.curation[ev.n] === 'drop' ? null : 'drop'; paint(); updateExportCount(); });
    box.append(keep, drop);
    return box;
  }

  function updateExportCount() {
    const kept = Object.values(app.curation).filter((v) => v === 'keep').length;
    const btn = $('#exportBtn');
    if (btn) btn.textContent = `Export ${kept} kept moment${kept === 1 ? '' : 's'}`;
  }

  // Exports kept moments as JSON for a highlight package. Model values are labelled as estimates.
  function exportKept() {
    const { match, keyMoments } = app.state;
    const kept = keyMoments
      .filter((ev) => app.curation[ev.n] === 'keep')
      .map((ev) => ({
        event: ev.n,
        minute: ev.minute,
        team: match.teams[ev.team].name,
        type: ev.type,
        line: ev.line,
        why: ev.why,
        xgEstimate: ev.xg,
        note: 'Synthetic data. xG is a model estimate, not a betting or odds signal.',
      }));
    const blob = new Blob([JSON.stringify({ match: match.teams.map((t) => t.name), moments: kept }, null, 2)], { type: 'application/json' });
    const a = el('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'matchmind-kept-moments.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function buildHeatPlayers() {
    const sel = $('#heatPlayer');
    const team = $('#heatTeam').value;
    sel.textContent = '';
    sel.appendChild(new Option('Whole squad', ''));
    const ids = team === '' ? [] : app.match.squad[Number(team)];
    ids.forEach((id) => sel.appendChild(new Option(playerLabel(app.match, id), String(id))));
  }

  function buildTrace() {
    const list = $('#trace');
    list.textContent = '';
    app.state.trace.forEach((step) => {
      const li = el('li');
      li.append(el('strong', null, step.agent), document.createTextNode(` · ${step.msg}`));
      list.appendChild(li);
    });
  }

  function buildRecap() {
    const box = $('#recap');
    box.textContent = '';
    app.state.recap.forEach((p) => box.appendChild(el('p', null, p)));
  }

  // Calibration of the what-if shot model, from the optimizer's held-out test seeds.
  // It is a self-consistency check on synthetic data, not a football validation.
  function buildCalibration() {
    const box = $('#calib');
    box.textContent = '';
    if (!calibrationReport || !calibrationReport.calibration) {
      box.appendChild(el('p', 'note', 'Calibration report not loaded. Run optimizer/skillopt.js to create it.'));
      return;
    }
    const r = calibrationReport;
    box.appendChild(el('p', 'calib-title',
      `Model check on ${r.seeds.test.length} unseen synthetic matches: predicted xG against observed goals.`));
    const table = el('table', 'calib-table');
    const head = el('tr');
    ['xG bin', 'Shots', 'Predicted xG', 'Goal rate'].forEach((h) => head.appendChild(el('th', null, h)));
    table.appendChild(head);
    r.calibration.forEach((b) => {
      const row = el('tr');
      [b.range, String(b.shots), b.meanPredictedXg.toFixed(3), b.observedGoalRate.toFixed(3)]
        .forEach((v) => row.appendChild(el('td', null, v)));
      table.appendChild(row);
    });
    box.appendChild(table);
    box.appendChild(el('p', 'note',
      `Tactics thresholds tuned by the SkillOpt-style optimizer. Held-out macro F1 ${r.test.default.macroF1} → ${r.test.tuned.macroF1}. ` +
      'Bins with few shots are noisy.'));
  }

  // ---------- Live caption and clock ----------
  function updateCaption(n) {
    const ev = app.match.events[n];
    const { match } = app;
    $('#liveMeta').textContent =
      `${fmtMin(ev.minute)} · ${teamName(match, ev.team)} · ${ev.type} · ${match.players[ev.player].name}`;
    $('#liveLine').textContent = ev.line;
    $('#liveWhy').textContent = ev.why;
    updateScoreline(n, ev.minute);
  }

  // ---------- Moment and what-if ----------
  function selectMoment(ev, opts = {}) {
    if (!ev) return;
    pause();
    app.selected = ev.player;
    app.focusN = ev.type === 'shot' ? ev.n : null;
    const cf = app.state.cfs[ev.n] || null;
    app.cf = cf;
    app.cfFocus = cf && cf.options[0] ? cf.options[0].key : null;
    setT(ev.snap);

    document.querySelectorAll('.moment').forEach((b) => {
      b.setAttribute('aria-pressed', String(Number(b.dataset.n) === ev.n));
    });
    renderCounterfactual();
    drawAllCharts();
    if (opts.scrollPanel) $('.stage').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderCounterfactual() {
    const { match } = app;
    const cf = app.cf;
    const sub = $('#cfSub');
    const list = $('#cfOptions');
    list.textContent = '';

    if (!cf) {
      sub.textContent = 'Pick a shot in the key moments to test an alternative.';
      drawCounterfactual();
      return;
    }

    const moverName = match.players[cf.mover].name;
    const shooterName = match.players[cf.shooter].name;
    sub.textContent =
      `${fmtMin(cf.minute)} · ${shooterName} shoots at xG ${cf.baseline.xg}. ` +
      `What if ${moverName} had taken the chance from a different slot?`;

    cf.options.forEach((o) => {
      const li = el('li', `cf-option verdict-${o.verdict}`);
      li.tabIndex = 0;
      li.dataset.key = o.key;
      li.setAttribute('role', 'button');
      li.setAttribute('aria-pressed', String(o.key === app.cfFocus));
      if (o.key === app.cfFocus) li.classList.add('is-focus');

      const head = el('span', 'cf-option-head', `${o.label}`);
      const num = el('span', 'cf-option-num', o.delta === 0 ? '0' : signed(o.delta));
      num.appendChild(el('small', null, `${o.verdict} · xG ${o.xg}`));
      const reasons = el('span', 'cf-option-reasons',
        o.reasons.length ? o.reasons.join(' · ') : 'Little change in the model.');

      const bar = el('span', 'cf-bar');
      const base = el('span');
      base.style.cssText = `left:${(cf.baseline.xg / 0.9) * 100}%;width:2px;background:var(--chalk);`;
      const fill = el('span');
      fill.style.cssText = `left:0;width:${(o.xg / 0.9) * 100}%;background:${
        o.verdict === 'worse' ? 'var(--alert)' : o.verdict === 'better' ? 'var(--signal)' : 'var(--chalk-2)'};`;
      bar.append(fill, base);

      li.append(head, num, bar, reasons);
      const focus = () => {
        app.cfFocus = o.key;
        renderCounterfactual();
      };
      li.addEventListener('click', focus);
      li.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); focus(); }
      });
      list.appendChild(li);
    });

    drawCounterfactual();
  }

  // ---------- Playback ----------
  function setT(next) {
    const max = app.match.events.length - 1;
    app.t = Math.min(max, Math.max(0, next));
    const n = Math.floor(app.t);
    app.pitch.setView({
      t: app.t,
      selected: app.selected,
      shotN: app.focusN,
    });
    $('#scrub').value = String(app.t);
    $('#playBtn').textContent = app.playing ? 'Pause' : 'Play';
    if (n !== app.liveIndex) {
      app.liveIndex = n;
      updateCaption(n);
    }
  }

  function play() {
    if (app.t >= app.match.events.length - 1) setT(0);
    app.playing = true;
    $('#playBtn').textContent = 'Pause';
    $('#playBtn').setAttribute('aria-label', 'Pause match');
  }

  function pause() {
    app.playing = false;
    $('#playBtn').textContent = 'Play';
    $('#playBtn').setAttribute('aria-label', 'Play match');
  }

  function drawAllCharts() {
    const { match } = app;
    const ev = match.events[Math.floor(app.t)];
    MM.charts.drawHeat($('#heat'), match, heatTeamValue(), heatPlayerValue());
    MM.charts.drawPressure($('#pressure'), match, ev ? ev.minute : 1);
    drawCounterfactual();
  }

  function drawCounterfactual() {
    MM.charts.drawCounterfactual($('#cfPitch'), app.match, app.cf, app.cfFocus);
  }

  function heatTeamValue() {
    const v = $('#heatTeam').value;
    return v === '' ? null : Number(v);
  }
  function heatPlayerValue() {
    const v = $('#heatPlayer').value;
    return v === '' ? null : Number(v);
  }

  // ---------- Boot ----------
  function boot() {
    buildMatchSelect();

    $('#playBtn').addEventListener('click', () => (app.playing ? pause() : play()));
    $('#speed').addEventListener('change', (e) => { app.speed = Number(e.target.value); });
    $('#scrub').addEventListener('input', (e) => { pause(); setT(Number(e.target.value)); });

    $('#exportBtn').addEventListener('click', exportKept);

    $('#heatTeam').addEventListener('change', () => { buildHeatPlayers(); drawAllCharts(); });
    $('#heatPlayer').addEventListener('change', drawAllCharts);

    document.addEventListener('keydown', (e) => {
      if (e.target.closest && e.target.closest('select, input, .cf-option')) return;
      if (e.code === 'Space') { e.preventDefault(); app.playing ? pause() : play(); }
    });

    let resizeTimer = null;
    global.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(drawAllCharts, 120);
    });

    let last = performance.now();
    function loop(now) {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (app.playing) {
        const next = app.t + dt * app.speed * EVENTS_PER_SECOND;
        if (next >= app.match.events.length - 1) {
          setT(app.match.events.length - 1);
          pause();
        } else {
          setT(next);
        }
      }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    loadAssets().then(() => load(MATCHES[0].seed));
  }

  document.addEventListener('DOMContentLoaded', boot);
  global.MatchMindApp = app;
})(window);
