/* Ground floor 3D mock-up, Ligurian classic style. Plan coords: x = east (m), z = south (m), y = up. */
const VIEW = (location.hash || '#bar').slice(1);
const W = 1600, H = 1000;
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H); renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#2b3a2f');
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

// ---------------------------------------------------------------- helpers
function cv(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
function rep(t, x, y) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(x, y); return t; }
function M(color, o = {}) { return new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.85, metalness: 0 }, o)); }
function T(map, o = {}) { return new THREE.MeshStandardMaterial(Object.assign({ map, roughness: 0.9 }, o)); }
function box(x0, x1, y0, y1, z0, z1, mat, cast = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat);
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); m.castShadow = cast; m.receiveShadow = true; scene.add(m); return m;
}
function cyl(x, z, r, y0, y1, mat, seg = 24, rTop) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop ?? r, r, y1 - y0, seg), mat);
  m.position.set(x, (y0 + y1) / 2, z); m.castShadow = true; m.receiveShadow = true; scene.add(m); return m;
}
function wallPlane(face, cx, cz, w, y0, y1, mat) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, y1 - y0), mat);
  m.position.set(cx, (y0 + y1) / 2, cz); m.rotation.y = { S: 0, N: Math.PI, E: Math.PI / 2, W: -Math.PI / 2 }[face];
  m.receiveShadow = true; scene.add(m); return m;
}
// arch path helper (in a shape's local XY): rectangle with semicircular top
function archPath(p, x0, x1, ySpring) {
  const r = (x1 - x0) / 2; p.moveTo(x0, 0); p.lineTo(x0, ySpring); p.absarc(x0 + r, ySpring, r, Math.PI, 0, true); p.lineTo(x1, 0); p.lineTo(x0, 0);
}

// ---------------------------------------------------------------- textures
const texStone = rep(cv(1024, 1024, (g, w, h) => {
  g.fillStyle = '#b3a892'; g.fillRect(0, 0, w, h);
  let y = -10;
  while (y < h) { const rh = 38 + rnd() * 40; let x = -rnd() * 60;
    while (x < w) { const rw = 55 + rnd() * 110, cx = x + rw / 2, cy = y + rh / 2, n = 7 + Math.floor(rnd() * 4);
      const hue = 22 + rnd() * 22, sat = 6 + rnd() * 14, lig = 24 + rnd() * 26;
      g.fillStyle = `hsl(${hue},${sat}%,${lig}%)`; g.beginPath();
      for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, rr = 0.82 + rnd() * 0.18; g.lineTo(cx + Math.cos(a) * rw / 2 * rr, cy + Math.sin(a) * rh / 2 * rr); }
      g.closePath(); g.fill();
      const gr = g.createLinearGradient(cx, cy - rh / 2, cx, cy + rh / 2); gr.addColorStop(0, 'rgba(255,240,220,0.18)'); gr.addColorStop(1, 'rgba(0,0,0,0.25)'); g.fillStyle = gr; g.fill();
      x += rw + 4 + rnd() * 6; }
    y += rh + 4 + rnd() * 5; }
  for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(0,0,0,${rnd() * 0.08})`; g.fillRect(rnd() * w, rnd() * h, 2, 2); }
}), 1, 1);
const texBrick = rep(cv(512, 512, (g, w, h) => {
  g.fillStyle = '#d9c7b0'; g.fillRect(0, 0, w, h);
  const bh = 32, bw = 96;
  for (let r = 0; r * bh < h; r++) for (let c = -1; c * bw < w; c++) {
    const x = c * bw + (r % 2) * bw / 2; g.fillStyle = `hsl(${12 + rnd() * 10},${45 + rnd() * 15}%,${36 + rnd() * 12}%)`;
    g.fillRect(x + 3, r * bh + 3, bw - 6, bh - 6);
  }
}), 1, 1);
const texPlaster = rep(cv(512, 512, (g, w, h) => {
  g.fillStyle = '#f3efe6'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 1800; i++) { g.fillStyle = `rgba(${150 + rnd() * 60},${140 + rnd() * 50},${120 + rnd() * 40},${rnd() * 0.06})`; g.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 18, 2 + rnd() * 18); }
}), 2, 2);
const texTiles = rep(cv(512, 512, (g, w, h) => {
  const n = 4, s = w / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    g.fillStyle = `hsl(${32 + rnd() * 8},${22 + rnd() * 10}%,${80 + rnd() * 6}%)`; g.fillRect(i * s, j * s, s, s);
    for (let k = 0; k < 40; k++) { g.fillStyle = `rgba(120,95,60,${rnd() * 0.07})`; g.beginPath(); g.arc(i * s + rnd() * s, j * s + rnd() * s, 2 + rnd() * 8, 0, 7); g.fill(); }
  }
  g.strokeStyle = '#cdbfa8'; g.lineWidth = 3;
  for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, h); g.stroke(); g.beginPath(); g.moveTo(0, i * s); g.lineTo(w, i * s); g.stroke(); }
}), 1, 1);
const texWalnut = rep(cv(512, 256, (g, w, h) => {
  g.fillStyle = '#5a3a22'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 160; i++) { g.strokeStyle = `rgba(${20 + rnd() * 30},${10 + rnd() * 15},5,${0.15 + rnd() * 0.25})`; g.lineWidth = 1 + rnd() * 2; const y = rnd() * h; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(w / 3, y + 8 * rnd(), w * 0.6, y - 8 * rnd(), w, y + 4); g.stroke(); }
}), 1, 1);
function panelTex(cols, rows) {
  return cv(256 * cols, 256 * rows, (g, w, h) => {
    g.drawImage(texWalnut.image, 0, 0, w, h);
    for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
      const x = c * 256 + 28, y = r * 256 + 28, s = 200;
      g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(x, y, s, s);
      g.strokeStyle = 'rgba(255,220,170,0.25)'; g.lineWidth = 6; g.strokeRect(x + 14, y + 14, s - 28, s - 28);
      g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = 4; g.strokeRect(x, y, s, s);
    }
  });
}
const texSlate = rep(cv(256, 256, (g, w, h) => {
  g.fillStyle = '#2f3336'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(255,255,255,${rnd() * 0.04})`; g.fillRect(rnd() * w, rnd() * h, 30 * rnd(), 2); }
}), 2, 1);
function kilim(c1, c2, c3) {
  return cv(512, 512, (g, w, h) => {
    g.fillStyle = c1; g.fillRect(0, 0, w, h);
    for (let b = 0; b < 8; b++) {
      g.fillStyle = b % 2 ? c2 : c3; g.fillRect(0, b * 64 + 22, w, 8);
      for (let i = 0; i < 8; i++) { g.fillStyle = b % 2 ? c3 : '#efe2c8'; g.beginPath(); const cx = i * 64 + 32, cy = b * 64 + 26;
        g.moveTo(cx, cy - 18); g.lineTo(cx + 18, cy); g.lineTo(cx, cy + 18); g.lineTo(cx - 18, cy); g.fill();
        g.fillStyle = c1; g.beginPath(); g.moveTo(cx, cy - 7); g.lineTo(cx + 7, cy); g.lineTo(cx, cy + 7); g.lineTo(cx - 7, cy); g.fill(); }
    }
    g.strokeStyle = c3; g.lineWidth = 24; g.strokeRect(12, 12, w - 24, h - 24);
  });
}
const texCord = rep(cv(64, 64, (g, w, h) => {
  for (let x = 0; x < w; x += 4) { g.fillStyle = x % 8 ? '#8a5527' : '#6e4019'; g.fillRect(x, 0, 4, h); }
}), 20, 6);
const texStraw = rep(cv(64, 64, (g, w, h) => {
  g.fillStyle = '#d8c08a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#b89a5a'; g.lineWidth = 3;
  for (let i = -64; i < 128; i += 8) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 64, h); g.stroke(); g.beginPath(); g.moveTo(i + 64, 0); g.lineTo(i, h); g.stroke(); }
}), 3, 3);
const texDoor = cv(256, 512, (g, w, h) => {
  g.fillStyle = '#6b4a2b'; g.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 42) { g.fillStyle = `hsl(28,${35 + rnd() * 10}%,${22 + rnd() * 8}%)`; g.fillRect(x + 2, 0, 38, h); }
  g.fillStyle = '#222'; [90, 420].forEach(y => g.fillRect(10, y, w - 20, 14));
  for (const y of [90, 420]) for (let x = 20; x < w; x += 40) { g.beginPath(); g.arc(x, y + 7, 4, 0, 7); g.fillStyle = '#555'; g.fill(); }
});
function sign(lines, w, h, size, bg = '#4a3220', fg = '#efe2c8') {
  return cv(w, h, (g) => {
    g.drawImage(texWalnut.image, 0, 0, w, h); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#c9a24a'; g.lineWidth = 8; g.strokeRect(14, 14, w - 28, h - 28);
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `italic ${size}px Georgia, serif`;
    lines.forEach((l, i) => g.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * size * 1.25));
  });
}
const texMenu = cv(600, 420, (g, w, h) => {
  g.drawImage(texSlate.image, 0, 0, w, h); g.strokeStyle = '#6b4a2b'; g.lineWidth = 26; g.strokeRect(0, 0, w, h);
  g.fillStyle = '#f2efe6'; g.textAlign = 'center'; g.font = 'italic 52px Georgia'; g.fillText('Menù del giorno', w / 2, 80);
  g.font = '30px Georgia'; g.textAlign = 'left';
  ['Farinata', 'Focaccia di Recco', 'Pizza dal forno a legna', 'Trofie al pesto', 'Pigato / Vermentino', 'Birra alla spina'].forEach((s, i) => g.fillText(s, 50, 140 + i * 44));
});
function photoBW(seedv) {
  return cv(300, 380, (g, w, h) => {
    g.fillStyle = '#1b1b1b'; g.fillRect(0, 0, w, h); g.fillStyle = '#f5f0e6'; g.fillRect(16, 16, w - 32, h - 32);
    const gr = g.createLinearGradient(0, 40, 0, h - 40); gr.addColorStop(0, '#cfcac0'); gr.addColorStop(1, '#6f6a62'); g.fillStyle = gr; g.fillRect(40, 40, w - 80, h - 80);
    g.fillStyle = '#3a3733'; g.beginPath(); g.moveTo(40, 230 + seedv * 10); for (let x = 40; x <= w - 40; x += 20) g.lineTo(x, 200 + 30 * Math.sin(x / 30 + seedv)); g.lineTo(w - 40, h - 40); g.lineTo(40, h - 40); g.fill();
    g.strokeStyle = '#222'; g.lineWidth = 4; g.beginPath(); g.arc(110, 290, 26, 0, 7); g.stroke(); g.beginPath(); g.arc(190, 290, 26, 0, 7); g.stroke();
    g.beginPath(); g.moveTo(110, 290); g.lineTo(140, 250); g.lineTo(190, 290); g.stroke(); g.fillStyle = '#222'; g.fillRect(138, 205, 10, 45); g.beginPath(); g.arc(143, 198, 9, 0, 7); g.fill();
  });
}
const texGarden = cv(1024, 320, (g, w, h) => {
  const sk = g.createLinearGradient(0, 0, 0, h); sk.addColorStop(0, '#9cc7e6'); sk.addColorStop(0.6, '#e8f1ea'); g.fillStyle = sk; g.fillRect(0, 0, w, h);
  g.fillStyle = '#c9c2b0'; g.beginPath(); g.moveTo(0, h * 0.55); for (let x = 0; x <= w; x += 40) g.lineTo(x, h * (0.33 + 0.14 * Math.sin(x / 90))); g.lineTo(w, h); g.lineTo(0, h); g.fill();
  for (let i = 0; i < 160; i++) { g.fillStyle = ['#7d8f6a', '#6b7f58', '#8fa07a', '#5f7350'][i % 4]; g.beginPath(); g.arc(rnd() * w, h * 0.6 + rnd() * h * 0.3, 18 + rnd() * 30, 0, 7); g.fill(); }
  g.fillStyle = '#8a9a6a'; g.fillRect(0, h * 0.86, w, h * 0.14);
});

// ---------------------------------------------------------------- materials
const plasterM = T(texPlaster, { roughness: 0.95 });
const ceilingM = T(rep(texPlaster.clone(), 6, 6), { roughness: 1 });
const stoneM = (wm, hm) => { const t = texStone.clone(); t.needsUpdate = true; rep(t, wm / 1.6, hm / 1.6); return T(t, { roughness: 0.97 }); };
const brickM = (wm, hm) => { const t = texBrick.clone(); t.needsUpdate = true; rep(t, wm / 1.2, hm / 1.2); return T(t, { roughness: 0.95 }); };
const walnutM = T(texWalnut, { roughness: 0.55 });
const darkWood = M('#3b2616', { roughness: 0.6 });
const slateM = T(texSlate, { roughness: 0.4 });
const ironM = M('#1e1e1e', { roughness: 0.5, metalness: 0.6 });
const brassM = M('#b8913f', { roughness: 0.3, metalness: 0.9 });
const beamM = M('#4a3220', { roughness: 0.8 });

// ---------------------------------------------------------------- shell
const HS = 3.2, HP = 3.5;
{ const f = new THREE.Mesh(new THREE.PlaneGeometry(14.6, 13.6), T(texTiles, { roughness: 0.6 }));
  texTiles.repeat.set(14.6 / 1.6, 13.6 / 1.6); f.rotation.x = -Math.PI / 2; f.position.set(11.6, 0, 6.6); f.receiveShadow = true; scene.add(f); }
const showCeiling = VIEW !== 'top';

// bar back wall: exposed stone with two arched old wooden doors framed in brick
{ const s = new THREE.Shape(); s.moveTo(12.4, 0); s.lineTo(18.7, 0); s.lineTo(18.7, HS); s.lineTo(12.4, HS); s.lineTo(12.4, 0);
  for (const [a, b] of [[14.85, 15.75], [17.45, 18.35]]) { const hp = new THREE.Path(); archPath(hp, a, b, 1.75); s.holes.push(hp); }
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.35, bevelEnabled: false });
  const t = texStone.clone(); t.needsUpdate = true; rep(t, 1 / 1.6, 1 / 1.6);
  const m = new THREE.Mesh(g, T(t, { roughness: 0.97 })); m.position.z = 2.03; m.receiveShadow = true; m.castShadow = true; scene.add(m);
  for (const [a, b] of [[14.85, 15.75], [17.45, 18.35]]) {
    const ring = new THREE.Shape(); const r = (b - a) / 2, cx = a + r;
    ring.moveTo(a - 0.14, 0); ring.lineTo(a - 0.14, 1.75); ring.absarc(cx, 1.75, r + 0.14, Math.PI, 0, true); ring.lineTo(b + 0.14, 0); ring.lineTo(b, 0); ring.lineTo(b, 1.75);
    ring.absarc(cx, 1.75, r, 0, Math.PI, false); ring.lineTo(a, 0); ring.lineTo(a - 0.14, 0);
    const rg = new THREE.ExtrudeGeometry(ring, { depth: 0.38, bevelEnabled: false });
    const bt = texBrick.clone(); bt.needsUpdate = true; rep(bt, 1 / 0.8, 1 / 0.8);
    const rm = new THREE.Mesh(rg, T(bt)); rm.position.z = 2.02; scene.add(rm);
    const ds = new THREE.Shape(); archPath(ds, a, b, 1.75);
    const dg = new THREE.ShapeGeometry(ds); const uv = dg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) - a) / (b - a), uv.getY(i) / (1.75 + r));
    const dm = new THREE.Mesh(dg, T(texDoor, { roughness: 0.8 })); dm.position.z = 2.2; scene.add(dm);
  }
}
box(12.2, 12.4, 0, HS, 0, 2.38, plasterM);
{ const d = new THREE.Mesh(new THREE.BoxGeometry(0.3, HS, 1.33), plasterM); d.position.set(12.1, HS / 2, 2.97); d.rotation.y = Math.atan2(0.6, 1.18); d.castShadow = d.receiveShadow = true; scene.add(d); }
// pizza alcove in brick + oven mouth
box(9.9, 12.4, 0, HS, -0.2, 0, brickM(2.5, HS));
box(9.7, 9.9, 0, HS, 0, 2.67, plasterM);
box(7.2, 9.9, 0, HS, 2.47, 2.67, plasterM); box(7.0, 7.2, 0, HS, 2.67, 3.3, plasterM);
box(4.45, 7.2, 0, HS, 3.1, 3.3, plasterM); box(4.25, 4.45, 0, HS, 3.3, 4.95, plasterM);
wallPlane('E', 4.46, 3.9, 0.85, 0, 2.1, T(texDoor));
// WC block
box(4.45, 7.6, 0, HS, 4.95, 5.15, plasterM); box(7.3, 7.6, 0, HS, 5.15, 9.8, plasterM); box(4.45, 7.3, 0, 2.6, 5.15, 9.8, M('#ddd6cb'));
// east wall: lower plaster, upper exposed stone (like your living room)
box(18.7, 18.9, 0, HP, 0, 5.6, plasterM); box(18.7, 18.9, 0, HP, 6.5, 13.4, plasterM); box(18.7, 18.9, 2.2, HP, 5.6, 6.5, plasterM);
box(18.9, 19.6, 0, 2.2, 5.6, 6.5, M('#3a3a3a'));
wallPlane('W', 18.69, 4.9, 9.8, 1.9, HS, stoneM(9.8, 1.3));
// porticato west wall with lobby opening
box(7.4, 7.6, 0, HP, 9.8, 10.9, plasterM); box(7.4, 7.6, 0, HP, 12.1, 13.4, plasterM); box(7.4, 7.6, 2.4, HP, 10.9, 12.1, plasterM);
// ceilings with wooden beams
if (showCeiling) {
  box(4.25, 18.9, HS, HS + 0.1, -0.2, 9.8, ceilingM, false);
  for (let x = 8.2; x < 18.7; x += 1.0) box(x - 0.08, x + 0.08, HS - 0.18, HS, 0, 9.8, beamM, false);
  box(7.6, 18.7, HP, HP + 0.1, 9.8, 13.4, ceilingM, false);
  for (let x = 8.1; x < 18.7; x += 0.7) box(x - 0.07, x + 0.07, HP - 0.16, HP, 9.8, 13.3, beamM, false);
}
// stone arcade between sala and lounge (three big arches)
{ const s = new THREE.Shape(); s.moveTo(7.6, 0); s.lineTo(18.7, 0); s.lineTo(18.7, HP); s.lineTo(7.6, HP); s.lineTo(7.6, 0);
  const arches = [[9.0, 10.8], [12.0, 13.8], [15.0, 16.8]];
  for (const [a, b] of arches) { const p = new THREE.Path(); archPath(p, a, b, 1.95); s.holes.push(p); }
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.45, bevelEnabled: false });
  const m = new THREE.Mesh(g, plasterM); m.position.z = 9.58; m.castShadow = true; m.receiveShadow = true; scene.add(m);
  for (const [a, b] of arches) {
    const r = (b - a) / 2, cx = a + r, ring = new THREE.Shape();
    ring.moveTo(a - 0.3, 0); ring.lineTo(a - 0.3, 1.95); ring.absarc(cx, 1.95, r + 0.3, Math.PI, 0, true); ring.lineTo(b + 0.3, 0); ring.lineTo(b, 0); ring.lineTo(b, 1.95);
    ring.absarc(cx, 1.95, r, 0, Math.PI, false); ring.lineTo(a, 0); ring.lineTo(a - 0.3, 0);
    const t = texStone.clone(); t.needsUpdate = true; rep(t, 1 / 1.0, 1 / 1.0);
    const rm = new THREE.Mesh(new THREE.ExtrudeGeometry(ring, { depth: 0.49, bevelEnabled: false }), [T(t), M('#7d7262', { roughness: 1 })]); rm.position.z = 9.56; rm.castShadow = true; scene.add(rm);
  }
}
// south wall: big arched windows with sheer linen curtains
{ const s = new THREE.Shape(); s.moveTo(7.6, 0); s.lineTo(18.7, 0); s.lineTo(18.7, HP); s.lineTo(7.6, HP); s.lineTo(7.6, 0);
  const win = [[8.3, 10.3], [10.9, 12.9], [13.6, 15.6], [16.2, 18.2]];
  for (const [a, b] of win) { const p = new THREE.Path(); archPath(p, a, b, 1.9); s.holes.push(p); }
  const m = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.4, bevelEnabled: false }), plasterM); m.position.z = 13.27; m.castShadow = true; m.receiveShadow = true; scene.add(m);
  const glass = new THREE.MeshPhysicalMaterial({ color: '#dfeff2', transparent: true, opacity: 0.12, roughness: 0.05 });
  const sheer = new THREE.MeshStandardMaterial({ color: '#fbf8f1', transparent: true, opacity: 0.55, roughness: 1, side: THREE.DoubleSide });
  for (const [a, b] of win) {
    const gs = new THREE.Shape(); archPath(gs, a, b, 1.9); const gm = new THREE.Mesh(new THREE.ShapeGeometry(gs), glass); gm.position.z = 13.47; scene.add(gm);
    for (const side of [0, 1]) { const x0 = side ? b - 0.55 : a, geo = new THREE.PlaneGeometry(0.55, 2.7, 24, 1), p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 30) * 0.03); geo.computeVertexNormals();
      const c = new THREE.Mesh(geo, sheer); c.position.set(x0 + 0.275, 1.38, 13.2); scene.add(c); }
    box(a - 0.1, b + 0.1, 2.75, 2.78, 13.17, 13.2, ironM, false);
  }
}
wallPlane('N', 13, 17.5, 34, -1, 10, new THREE.MeshBasicMaterial({ map: texGarden, toneMapped: false }));

// ---------------------------------------------------------------- BAR
// counter: antique walnut panelled front, slate top, brass foot rail
{ const pt = panelTex(8, 1); const front = new THREE.MeshStandardMaterial({ map: pt, roughness: 0.55 });
  const mats = [walnutM, walnutM, walnutM, walnutM, front, walnutM];
  const c = new THREE.Mesh(new THREE.BoxGeometry(5.7, 1.02, 0.6), mats); c.position.set(15.85, 0.51, 3.6); c.castShadow = c.receiveShadow = true; scene.add(c);
  box(12.95, 18.7, 0, 0.08, 3.28, 3.95, darkWood);
  box(12.92, 18.7, 1.02, 1.08, 3.24, 4.0, slateM);
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 5.6, 12), brassM); rail.rotation.z = Math.PI / 2; rail.position.set(15.85, 0.22, 4.05); scene.add(rail);
  for (let x = 13.3; x < 18.6; x += 1.1) box(x - 0.015, x + 0.015, 0, 0.22, 3.92, 4.06, brassM); }
// pick-up: marble pass with brass warming lamps
box(13.05, 14.55, 1.08, 1.1, 3.3, 3.8, M('#efeae0', { roughness: 0.3 }));
for (const x of [13.4, 13.8, 14.2]) { cyl(x, 3.55, 0.005, 1.6, HS - 0.15, brassM, 6); cyl(x, 3.55, 0.12, 1.5, 1.62, brassM, 20, 0.06);
  const l = new THREE.PointLight('#ffcf8a', 1.2, 0, 2); l.position.set(x, 1.45, 3.55); scene.add(l); }
for (const [x, c] of [[13.35, '#e3b26b'], [13.8, '#d9a65e'], [14.25, '#c9944f']]) cyl(x, 3.55, 0.17, 1.1, 1.12, M(c));
// focaccia / farinata display (glass dome) + till + taps
box(14.65, 15.55, 1.08, 1.4, 3.35, 3.85, new THREE.MeshPhysicalMaterial({ color: '#eef8ff', transparent: true, opacity: 0.2, roughness: 0.05 }), false);
for (const x of [14.85, 15.1, 15.35]) cyl(x, 3.6, 0.13, 1.09, 1.12, M('#e6b768'));
box(16.0, 16.35, 1.08, 1.25, 3.5, 3.75, darkWood); box(16.05, 16.3, 1.25, 1.42, 3.62, 3.65, M('#222'));
box(17.1, 18.2, 1.08, 1.4, 3.5, 3.6, brassM);
for (let i = 0; i < 5; i++) { const x = 17.2 + i * 0.22; cyl(x, 3.66, 0.012, 1.26, 1.38, brassM, 8); box(x - 0.022, x + 0.022, 1.4, 1.58, 3.52, 3.58, M('#efe6d2')); }
// antique walnut credenza between the doors with bottles + glasses
box(15.95, 17.25, 0, 0.95, 2.38, 2.88, walnutM); box(15.93, 17.27, 0.95, 0.99, 2.36, 2.9, M('#efeae0', { roughness: 0.3 }));
for (const y of [1.45, 1.95]) { box(15.95, 17.25, y, y + 0.04, 2.38, 2.62, walnutM);
  for (let i = 0; i < 10; i++) cyl(16.03 + i * 0.125, 2.5, 0.035, y + 0.04, y + 0.36, M(['#2f4a2a', '#5a2414', '#b9a35a', '#dfe8e0'][i % 4], { roughness: 0.15 }), 12); }
for (let i = 0; i < 8; i++) cyl(16.05 + i * 0.15, 2.7, 0.035, 0.99, 1.12, new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.35, roughness: 0.05 }), 12, 0.04);
// slate menu + carved sign
wallPlane('S', 13.65, 2.385, 1.7, 1.45, 2.65, T(texMenu));
wallPlane('S', 15.85, 2.39, 4.6, 2.62, 3.08, T(sign(['Good Food · Good Time · Good People · Good Life'], 2300, 230, 96)));
// wrought-iron chandeliers with candle bulbs
function chandelier(x, z, y, r = 0.38, n = 6, lightI = 2.2) {
  cyl(x, z, 0.008, y + 0.05, HS, ironM, 6);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.015, 8, 40), ironM); ring.rotation.x = Math.PI / 2; ring.position.set(x, y, z); scene.add(ring);
  for (let i = 0; i < n; i++) { const a = i * 2 * Math.PI / n, px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
    const arm = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.01, 6, 12, Math.PI), ironM); arm.position.set(px, y - 0.06, pz); arm.rotation.y = -a; scene.add(arm);
    cyl(px, pz, 0.025, y, y + 0.12, M('#f4efe2'), 10);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffe2a8', toneMapped: false })); b.scale.y = 1.6; b.position.set(px, y + 0.16, pz); scene.add(b); }
  const l = new THREE.PointLight('#ffcc88', lightI, 0, 2); l.position.set(x, y - 0.1, z); scene.add(l);
}
chandelier(15.0, 3.6, 2.25, 0.32, 5); chandelier(17.4, 3.6, 2.25, 0.32, 5);
// pillar in lime plaster with small slate
box(14.48, 14.83, 0, HS, 4.88, 5.23, plasterM);
wallPlane('S', 14.655, 5.235, 0.28, 1.15, 1.55, T(texMenu));

// pizza / farinata station + wood oven mouth in brick
box(10.0, 12.35, 0, 0.92, 0.06, 0.76, brickM(2.4, 0.9));
box(9.98, 12.37, 0.92, 0.98, 0.04, 0.8, M('#efeae0', { roughness: 0.3 }));
wallPlane('S', 11.15, 0.01, 2.0, 2.05, 2.55, T(sign(['Pizza · Farinata · Focaccia'], 1200, 300, 110)));
{ const sh = new THREE.Shape(); archPath(sh, -0.5, 0.5, 0.35); const g = new THREE.ShapeGeometry(sh);
  const mouth = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: '#ff8a2a', toneMapped: false })); mouth.rotation.y = Math.PI / 2; mouth.position.set(9.905, 0.95, 1.3); scene.add(mouth);
  const ring = new THREE.Shape(); ring.moveTo(-0.72, 0); ring.lineTo(-0.72, 0.35); ring.absarc(0, 0.35, 0.72, Math.PI, 0, true); ring.lineTo(0.72, 0); ring.lineTo(0.5, 0); ring.lineTo(0.5, 0.35); ring.absarc(0, 0.35, 0.5, 0, Math.PI, false); ring.lineTo(-0.72, 0);
  const rm = new THREE.Mesh(new THREE.ExtrudeGeometry(ring, { depth: 0.12, bevelEnabled: false }), brickM(1, 1)); rm.rotation.y = Math.PI / 2; rm.position.set(9.9, 0.95, 1.3); scene.add(rm);
  box(9.9, 10.1, 0.0, 0.95, 0.55, 2.05, brickM(1.5, 1));
  const ol = new THREE.PointLight('#ff7a2a', 5, 0, 2); ol.position.set(10.4, 1.2, 1.3); scene.add(ol); }

// ---------------------------------------------------------------- SALA
// WC wall: exposed stone band at top + gallery of old b&w cycling photos + antique credenza (self station)
wallPlane('E', 7.605, 7.47, 4.65, 2.1, HS, stoneM(4.65, 1.1));
[[6.4, 0], [7.2, 1], [8.0, 2], [8.8, 3]].forEach(([z, s]) => wallPlane('E', 7.61, z, 0.55, 1.25, 1.95, T(photoBW(s), { roughness: 0.6 })));
box(7.6, 8.1, 0, 0.9, 5.9, 7.5, walnutM); box(7.58, 8.13, 0.9, 0.94, 5.88, 7.52, M('#efeae0', { roughness: 0.3 }));
for (let i = 0; i < 5; i++) box(7.68, 8.0, 0.94 + i * 0.025, 0.96 + i * 0.025, 5.98, 6.42, walnutM);
cyl(7.85, 6.9, 0.1, 0.94, 1.28, new THREE.MeshPhysicalMaterial({ color: '#dff2ff', transparent: true, opacity: 0.35 }));
cyl(7.85, 7.3, 0.08, 0.94, 1.1, M('#d9cfc0'));
wallPlane('E', 7.605, 5.55, 0.85, 0, 2.1, T(texDoor));
// walnut tables + Chiavari chairs
function chiavari(x, z, rot) {
  const g = new THREE.Group(), wood = M('#6b4528', { roughness: 0.5 });
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.04, 0.38), T(texStraw)); seat.position.y = 0.45; g.add(seat);
  for (const [dx, dz, h] of [[-0.18, 0.17, 0.45], [0.18, 0.17, 0.45], [-0.17, -0.17, 0.95], [0.17, -0.17, 0.95]]) {
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.012, h, 8), wood); l.position.set(dx, h / 2, dz); g.add(l); }
  for (const y of [0.62, 0.74, 0.86]) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.03, 0.015), wood); s.position.set(0, y, -0.17); g.add(s); }
  for (const y of [0.18]) for (const dz of [-0.17, 0.17]) { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.36, 6), wood); s.rotation.z = Math.PI / 2; s.position.set(0, y, dz); g.add(s); }
  g.traverse(o => { o.castShadow = true; o.receiveShadow = true; }); g.position.set(x, 0, z); g.rotation.y = rot; scene.add(g);
}
function table(x, z, w = 0.8, d = 0.8, h = 0.76) {
  box(x - w / 2, x + w / 2, h - 0.05, h, z - d / 2, z + d / 2, walnutM);
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) cyl(x + dx * (w / 2 - 0.06), z + dz * (d / 2 - 0.06), 0.025, 0, h - 0.05, darkWood, 10, 0.035);
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.9, 0.3), M('#efe6d4')); cloth.rotation.x = -Math.PI / 2; cloth.position.set(x, h + 0.003, z); scene.add(cloth);
}
for (const z of [6.75, 8.75]) for (const x of [9.6, 10.95, 12.3, 13.65, 15.0]) {
  table(x, z);
  chiavari(x - 0.2, z - 0.58, 0); chiavari(x + 0.2, z - 0.58, 0); chiavari(x - 0.2, z + 0.58, Math.PI); chiavari(x + 0.2, z + 0.58, Math.PI);
  const b = cyl(x, z, 0.035, 0.76, 0.98, M('#2f4a2a', { roughness: 0.15 }), 12, 0.012);
  const cand = cyl(x + 0.18, z + 0.05, 0.02, 0.76, 0.9, M('#f4efe2'), 10);
}
for (const x of [10.3, 13.0]) for (const z of [6.75, 8.75]) chandelier(x, z, 2.45, 0.42, 6, 1.8);
// east wall: big antique walnut wardrobe (Props) + demilune console + mirror
{ const pt = panelTex(2, 3); box(18.05, 18.7, 0, 2.3, 6.8, 8.2, [walnutM, new THREE.MeshStandardMaterial({ map: pt, roughness: 0.55 }), walnutM, walnutM, walnutM, walnutM].reduce((a, m) => a, walnutM));
  wallPlane('W', 18.045, 7.5, 1.38, 0.1, 2.2, new THREE.MeshStandardMaterial({ map: pt, roughness: 0.55 }));
  box(18.0, 18.75, 2.3, 2.42, 6.75, 8.25, darkWood);
  box(18.3, 18.7, 0.78, 0.82, 8.6, 9.5, walnutM); for (const z of [8.7, 9.4]) cyl(18.45, z, 0.02, 0, 0.78, walnutM, 8);
  wallPlane('W', 18.69, 9.05, 0.7, 1.15, 2.0, M('#c9a24a', { metalness: 0.9, roughness: 0.3 }));
  wallPlane('W', 18.685, 9.05, 0.6, 1.22, 1.93, M('#b7c4c8', { metalness: 0.9, roughness: 0.05 })); }
// kitchen corridor plants / amphora
cyl(8.0, 4.4, 0.22, 0, 0.8, M('#b56a3c'), 20, 0.12);

// ---------------------------------------------------------------- LOUNGE
function rug(x0, x1, z0, z1, tex) { const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), T(tex, { roughness: 1 }));
  m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, 0.005, (z0 + z1) / 2); m.receiveShadow = true; scene.add(m); }
rug(10.6, 13.6, 10.9, 13.1, kilim('#8c2f1f', '#2a2522', '#d98b3a'));
rug(15.4, 17.9, 10.9, 12.9, kilim('#3c4a5e', '#8c2f1f', '#d9b36b'));
// grand piano
{ const s = new THREE.Shape(); s.moveTo(8.75, 11.55); s.lineTo(10.2, 11.55); s.lineTo(10.2, 12.1);
  s.bezierCurveTo(10.2, 12.65, 10.05, 13.0, 9.65, 13.05); s.bezierCurveTo(9.3, 13.1, 9.25, 12.75, 8.75, 12.75); s.lineTo(8.75, 11.55);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: false }); g.rotateX(Math.PI / 2);
  const p = new THREE.Mesh(g, M('#0d0d0d', { roughness: 0.12, metalness: 0.2 })); p.position.y = 1.0; p.castShadow = true; scene.add(p);
  box(8.75, 10.2, 0.7, 0.72, 11.5, 11.75, M('#f5f5f0'));
  for (const [x, z] of [[8.9, 11.7], [10.05, 11.7], [9.6, 12.85]]) cyl(x, z, 0.04, 0, 0.7, M('#0d0d0d', { roughness: 0.2 }), 10);
  box(9.15, 9.75, 0, 0.48, 11.12, 11.42, walnutM); }
// corduroy sofas (like yours) around a glass + bamboo table
function sofa(x0, x1, z0, z1, side) {
  const t = texCord.clone(); t.needsUpdate = true; rep(t, (x1 - x0) * 8, 4); const mat = T(t, { roughness: 1 });
  const g = new THREE.Group();
  const add = (bx0, bx1, by0, by1, bz0, bz1, r = 0.08) => { const m = new THREE.Mesh(new THREE.BoxGeometry(bx1 - bx0, by1 - by0, bz1 - bz0), mat); m.position.set((bx0 + bx1) / 2, (by0 + by1) / 2, (bz0 + bz1) / 2); m.castShadow = m.receiveShadow = true; g.add(m); };
  add(x0, x1, 0, 0.42, z0, z1);
  if (side === 'S') { add(x0, x1, 0.42, 0.8, z1 - 0.25, z1); add(x0, x0 + 0.22, 0.42, 0.62, z0, z1); add(x1 - 0.22, x1, 0.42, 0.62, z0, z1);
    const n = Math.round((x1 - x0) / 0.75); for (let i = 0; i < n; i++) add(x0 + 0.22 + i * (x1 - x0 - 0.44) / n + 0.02, x0 + 0.22 + (i + 1) * (x1 - x0 - 0.44) / n - 0.02, 0.42, 0.55, z0 + 0.05, z1 - 0.25); }
  if (side === 'E') { add(x1 - 0.25, x1, 0.42, 0.8, z0, z1); add(x0, x1, 0.42, 0.62, z0, z0 + 0.22); add(x0, x1, 0.42, 0.62, z1 - 0.22, z1); }
  scene.add(g);
}
sofa(10.8, 13.3, 12.45, 13.12, 'S');
sofa(13.25, 13.95, 10.95, 12.35, 'E');
for (const [x, z, c] of [[11.3, 12.88, '#c0392b'], [12.0, 12.9, '#2f4a6e'], [12.8, 12.88, '#d98b3a'], [13.65, 11.4, '#6b8f4e'], [13.65, 12.0, '#8c2f1f']]) {
  const k = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.35, 0.12), T(kilim(c, '#1e1e1e', '#efe2c8'))); k.position.set(x, 0.72, z); if (x > 13.5) k.rotation.y = Math.PI / 2; k.rotation.x = -0.2; k.castShadow = true; scene.add(k); }
{ // glass + bamboo coffee table
  const bam = M('#3e5a3a', { roughness: 0.5 });
  for (const [x, z] of [[11.2, 11.3], [12.8, 11.3], [11.2, 12.1], [12.8, 12.1]]) cyl(x, z, 0.03, 0, 0.38, bam, 10);
  for (const z of [11.3, 12.1]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.6, 8), bam); b.rotation.z = Math.PI / 2; b.position.set(12.0, 0.15, z); scene.add(b); }
  box(11.12, 12.88, 0.38, 0.4, 11.22, 12.18, new THREE.MeshPhysicalMaterial({ color: '#cfe8e0', transparent: true, opacity: 0.35, roughness: 0.05 }), false);
  cyl(11.8, 11.7, 0.16, 0.4, 0.42, M('#c0c0c0', { metalness: 0.9, roughness: 0.2 }));
  const balls = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), M('#222', { roughness: 0.3 })); balls.position.set(12.4, 0.49, 11.6); scene.add(balls); }
// kilim floor cushions + white globe lamp + wicker basket
for (const [x, z] of [[10.85, 11.1], [11.45, 10.95]]) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.18, 0.6), T(kilim('#8c3b1f', '#1e1e1e', '#d98b3a'))); c.position.set(x, 0.09, z); c.castShadow = true; scene.add(c); }
{ const gl = new THREE.Mesh(new THREE.SphereGeometry(0.28, 32, 24), new THREE.MeshStandardMaterial({ color: '#fffaf0', emissive: '#ffe9c4', emissiveIntensity: 0.9 })); gl.position.set(13.65, 0.9, 12.75); scene.add(gl);
  cyl(13.65, 12.75, 0.02, 0, 0.65, ironM, 8); const l = new THREE.PointLight('#ffe2b0', 1.6, 0, 2); l.position.set(13.65, 1.0, 12.6); scene.add(l); }
cyl(18.0, 10.45, 0.25, 0, 0.45, M('#b8915a', { roughness: 1 }), 20, 0.28);
for (let i = 0; i < 5; i++) { const lg = cyl(17.92 + (i % 3) * 0.08, 10.45, 0.05, 0.4, 0.85, M('#6b4a2b'), 8); lg.rotation.z = 0.15 * (i - 2); }
// stone fireplace (Pietra di Finale) + two antique armchairs + iron candelabra
box(18.1, 18.7, 0, HP, 10.6, 12.5, stoneM(1.9, HP));
box(18.08, 18.1, 0.3, 1.1, 11.05, 12.05, M('#141414'));
box(17.85, 18.7, 0, 0.3, 10.55, 12.55, M('#cdbfa8', { roughness: 0.7 }));
box(17.95, 18.2, 1.25, 1.35, 10.7, 12.4, darkWood);
for (let i = 0; i < 4; i++) cyl(18.05, 10.85 + i * 0.5, 0.03, 1.35, 1.6, M('#f4efe2'), 10);
{ const f = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.5, 16), new THREE.MeshBasicMaterial({ color: '#ff8a1e', toneMapped: false })); f.position.set(18.35, 0.55, 11.55); scene.add(f);
  const f2 = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.36, 16), new THREE.MeshBasicMaterial({ color: '#ffe066', toneMapped: false })); f2.position.set(18.3, 0.48, 11.4); scene.add(f2);
  for (const z of [11.35, 11.75]) { const lg = cyl(18.35, z, 0.07, 0.3, 0.44, M('#3b2616')); lg.rotation.z = Math.PI / 2; }
  const fl = new THREE.PointLight('#ff8a3a', 8, 0, 2); fl.position.set(17.6, 0.8, 11.55); scene.add(fl); }
function armchair(x, z, rot) {
  const g = new THREE.Group(), wood = walnutM, fab = T(kilim('#a8865a', '#5a2414', '#efe2c8'));
  const add = (w, h, d, px, py, pz, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(px, py, pz); b.castShadow = true; g.add(b); };
  add(0.62, 0.12, 0.6, 0, 0.42, 0, fab); add(0.62, 0.75, 0.1, 0, 0.85, -0.27, fab);
  add(0.08, 0.3, 0.6, -0.31, 0.6, 0, wood); add(0.08, 0.3, 0.6, 0.31, 0.6, 0, wood);
  for (const [dx, dz] of [[-0.28, -0.26], [0.28, -0.26], [-0.28, 0.26], [0.28, 0.26]]) add(0.05, 0.36, 0.05, dx, 0.18, dz, wood);
  g.position.set(x, 0, z); g.rotation.y = rot; scene.add(g);
}
armchair(16.7, 11.15, -Math.PI / 2 - 0.45); armchair(16.7, 12.25, -Math.PI / 2 + 0.45);
cyl(16.95, 11.7, 0.22, 0.55, 0.58, walnutM); cyl(16.95, 11.7, 0.03, 0, 0.55, walnutM, 8);
{ cyl(17.9, 12.9, 0.12, 0, 0.05, ironM); cyl(17.9, 12.9, 0.02, 0.05, 1.5, ironM, 8);
  for (let i = 0; i < 5; i++) { const a = i * 2 * Math.PI / 5; cyl(17.9 + Math.cos(a) * 0.18, 12.9 + Math.sin(a) * 0.18, 0.02, 1.45, 1.62, M('#f4efe2'), 8);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 6), new THREE.MeshBasicMaterial({ color: '#ffd27a', toneMapped: false })); b.position.set(17.9 + Math.cos(a) * 0.18, 1.66, 12.9 + Math.sin(a) * 0.18); scene.add(b); } }
// antique chest (cassapanca) under window
box(14.2, 15.3, 0, 0.55, 12.75, 13.2, walnutM); box(14.18, 15.32, 0.55, 0.6, 12.73, 13.22, darkWood);
// lounge lights: a paper lantern like yours + iron chandeliers
function chandelierP(x, z) { cyl(x, z, 0.008, HP - 0.9, HP, ironM, 6);
  cyl(x, z, 0.32, HP - 1.35, HP - 0.9, new THREE.MeshStandardMaterial({ color: '#fffaf0', emissive: '#ffe2b0', emissiveIntensity: 0.6, side: THREE.DoubleSide, transparent: true, opacity: 0.95 }), 32);
  const l = new THREE.PointLight('#ffdcae', 2.4, 0, 2); l.position.set(x, HP - 1.15, z); scene.add(l); }
chandelierP(12.0, 11.7);
{ const sv = HS; for (const [x, z] of [[9.5, 11.6], [16.6, 11.7]]) { cyl(x, z, 0.008, HP - 0.8, HP, ironM, 6);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.015, 8, 40), ironM); ring.rotation.x = Math.PI / 2; ring.position.set(x, HP - 0.85, z); scene.add(ring);
  for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; cyl(x + Math.cos(a) * 0.4, z + Math.sin(a) * 0.4, 0.025, HP - 0.85, HP - 0.72, M('#f4efe2'), 10);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffe2a8', toneMapped: false })); b.position.set(x + Math.cos(a) * 0.4, HP - 0.68, z + Math.sin(a) * 0.4); scene.add(b); }
  const l = new THREE.PointLight('#ffcc88', 2.0, 0, 2); l.position.set(x, HP - 0.95, z); scene.add(l); } }
// olive trees in terracotta pots
function olive(x, z, s = 1) { cyl(x, z, 0.22 * s, 0, 0.45 * s, M('#b56a3c'), 20, 0.28 * s); cyl(x, z, 0.04 * s, 0.45 * s, 1.2 * s, M('#6b5a45'), 8);
  for (let i = 0; i < 7; i++) { const lf = new THREE.Mesh(new THREE.SphereGeometry(0.24 * s, 10, 8), M('#8a9a6a', { roughness: 0.9 })); lf.position.set(x + (rnd() - 0.5) * 0.45 * s, 1.25 * s + rnd() * 0.4 * s, z + (rnd() - 0.5) * 0.45 * s); lf.castShadow = true; scene.add(lf); } }
olive(8.0, 10.25); olive(18.3, 9.4, 0.9); olive(10.6, 13.0, 0.8);

// ---------------------------------------------------------------- lights
scene.add(new THREE.HemisphereLight('#fff4e0', '#8a6a4a', 0.7));
const sun = new THREE.DirectionalLight('#ffe6c0', 1.6);
sun.position.set(5, 11, 24); sun.target.position.set(13, 0, 8); scene.add(sun.target);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -13, right: 13, top: 13, bottom: -13, near: 1, far: 60 }); sun.shadow.bias = -0.0005; scene.add(sun);

// ---------------------------------------------------------------- cameras
const cams = {
  bar:    { pos: [12.0, 1.65, 9.2], at: [15.6, 1.4, 2.4], fov: 62 },
  sala:   { pos: [17.9, 1.7, 8.55], at: [8.2, 1.3, 5.6], fov: 64 },
  lounge: { pos: [10.1, 1.75, 10.65], at: [18.4, 0.9, 12.1], fov: 64 },
  arco:   { pos: [13.0, 1.6, 12.6], at: [12.9, 1.5, 3.0], fov: 60 },
  top:    { pos: [3.5, 16, 21], at: [12.8, 0, 6.2], fov: 45 },
};
const c = cams[VIEW];
const camera = new THREE.PerspectiveCamera(c.fov, W / H, 0.05, 200);
camera.position.set(...c.pos); camera.lookAt(...c.at);
renderer.render(scene, camera);
window.done = true;
