/* MatchMind · Three.js pitch
 * World units: X = x - 52.5, Z = y - 34. Players stand on the turf at Y = 0.
 * The pitch texture is drawn with the same markings as the 2D charts.
 * Motion: one camera dolly on load, eased player interpolation between events,
 * ball and player trails that fade with age. Reduced motion skips the dolly.
 */
(function (global) {
  'use strict';

  const MM = global.MatchMind;
  const THREE = global.THREE;
  const TEAM_HEX = [0x5fe3c0, 0xff8a4c];
  const SIGNAL = 0xd7ff5a;
  const ALERT = 0xff5c6c;
  const INK = new THREE.Color(0x07100c);

  const toWorld = (p) => [p[0] - 52.5, p[1] - 34];

  function createPitch3D(container, initialMatch) {
    const reduceMotion = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let match = initialMatch;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 2));
    renderer.setClearColor(INK, 1);
    container.appendChild(renderer.domElement);
    renderer.domElement.setAttribute('role', 'img');
    renderer.domElement.setAttribute('aria-label', '3D pitch showing player positions and event trails for the selected moment');

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(INK, 140, 290);
    const camera = new THREE.PerspectiveCamera(36, 1, 0.5, 500);

    // Turf and markings
    const tex = (() => {
      const cv = document.createElement('canvas');
      cv.width = 1050;
      cv.height = 680;
      const g = cv.getContext('2d');
      const stripes = 14;
      const sw = 1050 / stripes;
      for (let i = 0; i < stripes; i++) {
        g.fillStyle = i % 2 ? '#132a21' : '#0f2019';
        g.fillRect(i * sw, 0, sw, 680);
      }
      MM.pitch.drawPitch(g, 1050, 680, { line: 'rgba(233, 239, 230, 0.7)', lw: 4 });
      const t = new THREE.CanvasTexture(cv);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      return t;
    })();
    const turf = new THREE.Mesh(
      new THREE.PlaneGeometry(105, 68),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, metalness: 0 }),
    );
    turf.rotation.x = -Math.PI / 2;
    scene.add(turf);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(500, 400),
      new THREE.MeshBasicMaterial({ color: 0x060d0a }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.08;
    scene.add(floor);

    scene.add(new THREE.AmbientLight(0x9fb8aa, 0.55));
    const key = new THREE.DirectionalLight(0xe9efe6, 1.1);
    key.position.set(-40, 90, 50);
    scene.add(key);
    const glow = new THREE.PointLight(SIGNAL, 0.5, 220, 1.6);
    glow.position.set(0, 46, 0);
    scene.add(glow);

    // Players
    const playerGeo = new THREE.SphereGeometry(0.9, 24, 16);
    const mats = TEAM_HEX.map((hex) => new THREE.MeshStandardMaterial({
      color: hex, emissive: hex, emissiveIntensity: 0.2, roughness: 0.4,
    }));
    const playerMeshes = [];
    const playerGroup = new THREE.Group();
    scene.add(playerGroup);
    const rebuildPlayers = () => {
      playerGroup.clear();
      playerMeshes.length = 0;
      for (const p of match.players) {
        const m = new THREE.Mesh(playerGeo, mats[p.team]);
        playerGroup.add(m);
        playerMeshes.push(m);
      }
    };
    rebuildPlayers();

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.4, 1.75, 48),
      new THREE.MeshBasicMaterial({ color: SIGNAL, side: THREE.DoubleSide, transparent: true, opacity: 0.95 }),
    );
    ring.rotation.x = -Math.PI / 2;
    scene.add(ring);

    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.6, 20, 14),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: SIGNAL, emissiveIntensity: 0.35, roughness: 0.3 }),
    );
    scene.add(ball);

    // Trails
    function makeTrail(maxPts) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(maxPts * 3), 3));
      geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(maxPts * 3), 3));
      geo.setDrawRange(0, 0);
      const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true }));
      scene.add(line);
      return { geo, line, maxPts };
    }
    const ballTrail = makeTrail(18);
    const playerTrail = makeTrail(26);

    function setTrail(trail, pts, color) {
      const pos = trail.geo.attributes.position;
      const col = trail.geo.attributes.color;
      const base = new THREE.Color(color);
      const n = pts.length;
      for (let i = 0; i < n; i++) {
        const [x, y, z] = pts[i];
        pos.setXYZ(i, x, y, z);
        const k = (i + 1) / n;
        const c = base.clone().lerp(INK, 1 - k);
        col.setXYZ(i, c.r, c.g, c.b);
      }
      pos.needsUpdate = true;
      col.needsUpdate = true;
      trail.geo.setDrawRange(0, n);
    }

    // Shot markers
    const shotGroup = new THREE.Group();
    scene.add(shotGroup);
    function rebuildShots() {
      shotGroup.clear();
      for (const ev of match.events) {
        if (ev.type !== 'shot') continue;
        const [X, Z] = toWorld(ev.from);
        const r = 0.5 + ev.xg * 3.2;
        const m = new THREE.Mesh(
          new THREE.SphereGeometry(r, 16, 12),
          new THREE.MeshBasicMaterial({ color: ev.goal ? ALERT : SIGNAL, transparent: true, opacity: 0.55 }),
        );
        m.position.set(X, 0.25, Z);
        m.userData.n = ev.n;
        shotGroup.add(m);
      }
    }
    rebuildShots();

    // Camera orbit state
    let theta = -0.55;
    let phi = 0.86;
    let radius = reduceMotion ? 92 : 150;
    const target = new THREE.Vector3(0, 0, 0);
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let introStart = performance.now();
    const introDur = 2600;

    const el = renderer.domElement;
    el.style.touchAction = 'none';
    el.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; el.setPointerCapture(e.pointerId); });
    el.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      theta -= (e.clientX - lastX) * 0.005;
      phi = clamp(phi - (e.clientY - lastY) * 0.004, 0.35, 1.3);
      lastX = e.clientX;
      lastY = e.clientY;
    });
    el.addEventListener('pointerup', () => { dragging = false; });
    // Keyboard: arrows rotate and tilt, plus and minus zoom. Works while the container has focus.
    container.addEventListener('keydown', (e) => {
      const step = 0.08;
      if (e.key === 'ArrowLeft') theta += step;
      else if (e.key === 'ArrowRight') theta -= step;
      else if (e.key === 'ArrowUp') phi = clamp(phi - step, 0.35, 1.3);
      else if (e.key === 'ArrowDown') phi = clamp(phi + step, 0.35, 1.3);
      else if (e.key === '+' || e.key === '=') radius = clamp(radius - 6, 60, 210);
      else if (e.key === '-') radius = clamp(radius + 6, 60, 210);
      else return;
      e.preventDefault();
    });

    function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

    let size = { w: 800, h: 500 };
    function resize() {
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 500;
      size = { w, h };
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }

    // Playback state set by the app each frame
    const view = { t: 0, selected: 0, shotN: null };

    function interp(a, b, f) { return a + (b - a) * f; }

    function frame(now) {
      const intro = reduceMotion ? 1 : clamp((now - introStart) / introDur, 0, 1);
      const ease = 1 - Math.pow(1 - intro, 3);
      const r = radius + (1 - ease) * 74;
      const sphereY = r * Math.cos(phi);
      const sphereXZ = r * Math.sin(phi);
      camera.position.set(
        target.x + sphereXZ * Math.sin(theta),
        sphereY + 4,
        target.z + sphereXZ * Math.cos(theta),
      );
      camera.lookAt(target);

      const snaps = match.snaps;
      const last = snaps.length - 1;
      const t = clamp(view.t, 0, last);
      const i0 = Math.floor(t);
      const i1 = Math.min(i0 + 1, last);
      const f = t - i0;
      const s0 = snaps[i0];
      const s1 = snaps[i1];

      for (let i = 0; i < playerMeshes.length; i++) {
        const a = s0.pos[i];
        const b = s1.pos[i];
        const [X, Z] = toWorld([interp(a[0], b[0], f), interp(a[1], b[1], f)]);
        playerMeshes[i].position.set(X, 0.9, Z);
        playerMeshes[i].visible = MM.engine.isOn(a) || MM.engine.isOn(b);
      }
      const bx = interp(s0.ball[0], s1.ball[0], f);
      const by = interp(s0.ball[1], s1.ball[1], f);
      const [BX, BZ] = toWorld([bx, by]);
      ball.position.set(BX, 0.6, BZ);

      const sel = playerMeshes[view.selected];
      if (sel) {
        ring.position.set(sel.position.x, 0.06, sel.position.z);
        ring.visible = true;
      }

      // Ball trail: the last positions of the ball before this moment
      const bt = [];
      for (let k = Math.max(0, i0 - ballTrail.maxPts + 1); k <= i0; k++) {
        const [X, Z] = toWorld(snaps[k].ball);
        bt.push([X, 0.3, Z]);
      }
      if (bt.length > 1) setTrail(ballTrail, bt, SIGNAL);
      else ballTrail.geo.setDrawRange(0, 0);

      // Player trail: where the selected player has been
      const pt = [];
      if (sel) {
        for (let k = Math.max(0, i0 - playerTrail.maxPts + 1); k <= i0; k++) {
          const [X, Z] = toWorld(snaps[k].pos[view.selected]);
          pt.push([X, 0.3, Z]);
        }
      }
      if (pt.length > 1) setTrail(playerTrail, pt, TEAM_HEX[match.players[view.selected].team]);
      else playerTrail.geo.setDrawRange(0, 0);

      // Highlight the shot in focus
      shotGroup.children.forEach((m) => {
        const on = m.userData.n === view.shotN;
        const s = on ? 1.35 : 1;
        m.scale.setScalar(s);
        m.material.opacity = on ? 0.95 : 0.5;
      });

      renderer.render(scene, camera);
      requestAnimationFrame(frame);
    }

    resize();
    global.addEventListener('resize', resize);
    requestAnimationFrame(frame);

    // Screen position of each player for name tags. Off-pitch or behind the camera counts as hidden.
    const tmp = new THREE.Vector3();
    function project(ids) {
      return ids.map((id) => {
        const mesh = playerMeshes[id];
        if (!mesh || !mesh.visible) return { id, x: 0, y: 0, visible: false };
        tmp.copy(mesh.position);
        tmp.y += 3.2;
        tmp.project(camera);
        const visible = tmp.z < 1 && Math.abs(tmp.x) < 1.1 && Math.abs(tmp.y) < 1.1;
        return {
          id,
          x: ((tmp.x + 1) / 2) * size.w,
          y: ((1 - tmp.y) / 2) * size.h,
          visible,
        };
      });
    }

    return {
      project,
      setMatch(m) {
        match = m;
        rebuildPlayers();
        rebuildShots();
      },
      setView(next) { Object.assign(view, next); },
    };
  }

  MM.createPitch3D = createPitch3D;
})(window);
