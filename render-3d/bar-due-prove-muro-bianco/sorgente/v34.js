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
function rectPath(p, x0, x1, h) { p.moveTo(x0, 0); p.lineTo(x0, h); p.lineTo(x1, h); p.lineTo(x1, 0); p.lineTo(x0, 0); }
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
function panelTexW(cols, rows) {
  return cv(256 * cols, 256 * rows, (g, w, h) => { g.fillStyle = '#f5f1ea'; g.fillRect(0, 0, w, h);
    for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) { const x = c * 256 + 28, y = r * 256 + 28, s = 200;
      g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 6; g.strokeRect(x, y, s, s); g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 3; g.strokeRect(x + 5, y + 5, s - 10, s - 10); } });
}
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

const texDoorSage = cv(256, 512, (g, w, h) => {
  g.fillStyle = '#8fa58a'; g.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 42) { g.fillStyle = `hsl(110,${12 + rnd() * 6}%,${56 + rnd() * 5}%)`; g.fillRect(x + 2, 0, 38, h); }
  g.fillStyle = '#2b2b2b'; [90, 420].forEach(y => g.fillRect(10, y, w - 20, 12));
});
const texTerrazzo = rep(cv(512, 512, (g, w, h) => {
  g.fillStyle = '#f1eee8'; g.fillRect(0, 0, w, h);
  const cs = ['#c9c2b6', '#8a8378', '#d9a67a', '#7f9a8e', '#3e3e3e', '#e3d5c0'];
  for (let i = 0; i < 1400; i++) { g.fillStyle = cs[i % cs.length]; g.beginPath(); const x = rnd() * w, y = rnd() * h, r = 1 + rnd() * 5;
    g.moveTo(x, y - r); g.lineTo(x + r, y); g.lineTo(x + r * 0.3, y + r); g.lineTo(x - r, y + r * 0.2); g.fill(); }
}), 2, 1);
const texFluted = rep(cv(64, 256, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, w, 0);
  gr.addColorStop(0, '#152f52'); gr.addColorStop(0.35, '#3a68a3'); gr.addColorStop(0.65, '#2a5690'); gr.addColorStop(1, '#122a4a');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
}), 76, 1);
const texTileW = rep(cv(256, 256, (g, w, h) => {
  g.fillStyle = '#d8d2c8'; g.fillRect(0, 0, w, h);
  for (let r = 0; r < 8; r++) for (let c = 0; c < 4; c++) { g.fillStyle = `hsl(40,${10 + rnd() * 8}%,${92 + rnd() * 5}%)`; g.fillRect(c * 64 + (r % 2) * 32 + 2, r * 32 + 2, 60, 28); g.fillRect(c * 64 + (r % 2) * 32 - 62, r * 32 + 2, 60, 28); }
}), 4, 1);
function neon(text, w, h, size, font = 'italic', color = '#fff6e0', glow = '#ffb35c') {
  const t = cv(w, h, (g) => { g.font = `${font} ${size}px Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = glow; g.shadowBlur = size * 0.6; g.fillStyle = color; g.strokeStyle = color; g.lineWidth = size * 0.06; for (let i = 0; i < 4; i++) { g.strokeText(text, w / 2, h / 2); g.fillText(text, w / 2, h / 2); } });
  return new THREE.MeshBasicMaterial({ map: t, transparent: true, toneMapped: false });
}
const texSticker = cv(300, 740, (g, w, h) => {
  g.fillStyle = '#1f4e8c'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#f4a020'; g.beginPath(); g.arc(w / 2, 250, 120, 0, 7); g.fill();
  g.fillStyle = '#e24a3b'; for (let i = 0; i < 6; i++) g.fillRect(0, 430 + i * 22, w, 10);
  g.strokeStyle = '#111'; g.lineWidth = 12; g.lineCap = 'round';
  g.beginPath(); g.arc(80, 560, 55, 0, 7); g.stroke(); g.beginPath(); g.arc(220, 560, 55, 0, 7); g.stroke();
  g.beginPath(); g.moveTo(80, 560); g.lineTo(130, 470); g.lineTo(220, 560); g.moveTo(130, 470); g.lineTo(190, 470); g.lineTo(220, 560); g.moveTo(150, 470); g.lineTo(170, 400); g.lineTo(200, 380); g.stroke();
  g.fillStyle = '#111'; g.beginPath(); g.arc(205, 345, 22, 0, 7); g.fill();
  g.fillStyle = '#fff'; g.font = 'bold 54px Helvetica'; g.textAlign = 'center'; g.fillText('RIDERS', w / 2, 100); g.font = 'bold 34px Helvetica'; g.fillText('W C', w / 2, 690);
});
const navyM = M('#f1ebe0', { roughness: 0.6 });
let CH; let terrazzoM = null;
function rod(a, b, r, mat) { const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), L = A.distanceTo(B);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, L, 8), mat); m.position.copy(A).add(B).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize()); m.castShadow = true; scene.add(m); return m; }
// vintage racing bike hung on a wall facing -x (wheels in the YZ plane)
function bike(x, z, y, col = '#c0392b') {
  const fm = M(col, { roughness: 0.35, metalness: 0.4 }), tm = M('#111', { roughness: 0.6 });
  for (const dz of [-0.5, 0.5]) { const w = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.018, 8, 40), tm); w.rotation.y = Math.PI / 2; w.position.set(x, y, z + dz); scene.add(w);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.006, 6, 40), M('#bbb', { metalness: 0.9, roughness: 0.2 })); rim.rotation.y = Math.PI / 2; rim.position.set(x, y, z + dz); scene.add(rim); }
  const P = (dz, dy) => [x, y + dy, z + dz];
  rod(P(-0.5, 0), P(-0.05, 0), 0.012, fm); rod(P(-0.05, 0), P(-0.15, 0.48), 0.014, fm); rod(P(-0.5, 0), P(-0.15, 0.48), 0.012, fm);
  rod(P(-0.15, 0.48), P(0.38, 0.46), 0.016, fm); rod(P(-0.05, 0), P(0.38, 0.46), 0.018, fm); rod(P(0.38, 0.46), P(0.5, 0), 0.014, fm);
  rod(P(0.38, 0.46), P(0.36, 0.58), 0.012, tm); rod(P(0.3, 0.6), P(0.45, 0.6), 0.012, tm);
  rod(P(-0.17, 0.52), P(-0.17, 0.58), 0.01, tm); box(x - 0.04, x + 0.04, y + 0.58, y + 0.62, z - 0.28, z - 0.08, tm);
}
function bell(x, z, y, col) { cyl(x, z, 0.005, y + 0.2, HS, ironM, 6);
  const s = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.24, 0.26, 18, 1, true), new THREE.MeshStandardMaterial({ color: col || '#f1e6cf', roughness: col ? 0.3 : 1, side: THREE.DoubleSide, emissive: col || '#ffcf8a', emissiveIntensity: col ? 0.25 : 0.35, flatShading: !col })); if (col) { s.geometry = new THREE.SphereGeometry(0.17, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2); s.scale.y = 1.3; } s.position.set(x, y, z); scene.add(s);
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshBasicMaterial({ color: '#fff3c4', toneMapped: false })); b.position.set(x, y, z); scene.add(b);
  const l = new THREE.PointLight('#ffd49a', 2.6, 0, 2); l.position.set(x, y - 0.08, z); scene.add(l); }
function dome(x, z, y) { y += 0.15; cyl(x, z, 0.005, y + 0.25, HS, ironM, 6);
  const s = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#f4efe2', roughness: 0.35, side: THREE.DoubleSide, emissive: '#ffe2b0', emissiveIntensity: 0.15 }));
  s.position.set(x, y, z); scene.add(s);
  const b = new THREE.Mesh(new THREE.CircleGeometry(0.2, 24), new THREE.MeshBasicMaterial({ color: '#fff1d0', toneMapped: false, side: THREE.DoubleSide })); b.rotation.x = Math.PI / 2; b.position.set(x, y + 0.02, z); scene.add(b);
  const l = new THREE.SpotLight('#ffdcaa', 6, 0, 1.0, 0.6, 2); l.position.set(x, y, z); l.target.position.set(x, 0, z); scene.add(l); scene.add(l.target); }
function bistro(x, z, rot, col) {
  const g = new THREE.Group(), fr = M(col, { roughness: 0.4, metalness: 0.5 }), ply = M('#d2b48a', { roughness: 0.5 });
  const add = (m, px, py, pz) => { m.position.set(px, py, pz); m.castShadow = true; g.add(m); return m; };
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.03, 24), ply), 0, 0.46, 0);
  for (const [dx, dz] of [[-0.15, 0.15], [0.15, 0.15], [-0.15, -0.15], [0.15, -0.15]]) { const l = add(new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.47, 6), fr), dx * 1.1, 0.23, dz * 1.1); l.rotation.z = dx * 0.25; l.rotation.x = -dz * 0.25; }
  const back = add(new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.012, 6, 24, Math.PI), fr), 0, 0.62, -0.17); back.rotation.z = 0;
  const pad = add(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.07, 0.015), ply), 0, 0.78, -0.17);
  for (const dx of [-0.17, 0.17]) add(new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.34, 6), fr), dx, 0.63, -0.17);
  g.position.set(x, 0, z); g.rotation.y = rot; scene.add(g);
}

const texOpus = rep(cv(1024, 1024, (g, w, h) => {
  g.fillStyle = '#cfc6b6'; g.fillRect(0, 0, w, h);
  const u = 64; const grid = [];
  for (let y = 0; y < 16; y++) { grid.push(new Array(16).fill(0)); }
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    if (grid[y][x]) continue; let tw = [1, 2, 2, 3][Math.floor(rnd() * 4)], th = [1, 2, 2][Math.floor(rnd() * 3)];
    while (x + tw > 16 || grid[y].slice(x, x + tw).some(v => v)) tw--; if (y + th > 16) th = 16 - y;
    for (let yy = y; yy < y + th; yy++) for (let xx = x; xx < x + tw; xx++) grid[yy][xx] = 1;
    const l = 74 + rnd() * 9; g.fillStyle = `hsl(${34 + rnd() * 8},${14 + rnd() * 10}%,${l}%)`; g.fillRect(x * u + 2, y * u + 2, tw * u - 4, th * u - 4);
    for (let k = 0; k < 30 * tw * th; k++) { g.fillStyle = `rgba(${90 + rnd() * 60},${80 + rnd() * 40},60,${rnd() * 0.08})`; g.fillRect(x * u + rnd() * tw * u, y * u + rnd() * th * u, 4 + rnd() * 16, 2 + rnd() * 6); }
  }
}), 1, 1);
const texMural = cv(2400, 1350, (g, w, h) => {
  const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#e9e4da'); bg.addColorStop(1, '#bdb6aa'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(40,35,30,${rnd() * 0.06})`; g.fillRect(rnd() * w, rnd() * h, 3, 3); }
  g.fillStyle = '#9a9286'; g.beginPath(); g.moveTo(0, h * 0.55); for (let x = 0; x <= w; x += 60) g.lineTo(x, h * (0.5 + 0.05 * Math.sin(x / 210))); g.lineTo(w, h); g.lineTo(0, h); g.fill();
  g.fillStyle = '#8a8276'; g.fillRect(0, h * 0.8, w, h * 0.2);
  const ink = '#1f1d1a'; g.strokeStyle = ink; g.fillStyle = ink; g.lineCap = 'round';
  for (let i = 0; i < 8; i++) {
    const s = 0.78 + (i % 3) * 0.1, bx = 170 + i * 285, gy = h * 0.82 - (i % 2) * 18;
    const R = 95 * s; g.lineWidth = 9 * s;
    g.beginPath(); g.arc(bx - 115 * s, gy - R, R, 0, 7); g.stroke(); g.beginPath(); g.arc(bx + 115 * s, gy - R, R, 0, 7); g.stroke();
    g.lineWidth = 7 * s; g.beginPath(); g.moveTo(bx - 115 * s, gy - R); g.lineTo(bx - 20 * s, gy - R - 120 * s); g.lineTo(bx + 75 * s, gy - R - 120 * s); g.lineTo(bx + 115 * s, gy - R);
    g.moveTo(bx - 20 * s, gy - R - 120 * s); g.lineTo(bx, gy - R); g.lineTo(bx - 115 * s, gy - R); g.moveTo(bx, gy - R); g.lineTo(bx + 75 * s, gy - R - 120 * s); g.stroke();
    // soldier standing beside the bike
    const sx = bx - 40 * s, top = gy - 470 * s;
    g.fillRect(sx - 32 * s, top + 70 * s, 64 * s, 190 * s);
    g.fillRect(sx - 30 * s, top + 255 * s, 24 * s, 215 * s); g.fillRect(sx + 6 * s, top + 255 * s, 24 * s, 215 * s);
    g.beginPath(); g.arc(sx, top + 45 * s, 30 * s, 0, 7); g.fill();
    g.beginPath(); g.ellipse(sx, top + 20 * s, 62 * s, 12 * s, 0, 0, 7); g.fill(); g.fillRect(sx - 30 * s, top - 15 * s, 60 * s, 35 * s);
    g.lineWidth = 8 * s; g.beginPath(); g.moveTo(sx + 30 * s, top + 90 * s); g.lineTo(bx + 60 * s, gy - R - 110 * s); g.stroke();
    g.lineWidth = 6 * s; g.beginPath(); g.moveTo(sx - 70 * s, top - 20 * s); g.lineTo(sx + 60 * s, top + 330 * s); g.stroke();
  }
  g.fillStyle = '#1f1d1a'; g.textAlign = 'left'; g.font = 'bold 120px Georgia, serif'; g.fillText('BUFFALO SOLDIERS', 90, 170);
  g.font = 'italic 56px Georgia, serif'; g.fillText('25th Infantry Bicycle Corps · Fort Missoula → St. Louis · 1897', 95, 250);
});
function straw(x, z, rot, col) {
  col = ['#7a5232', '#6b4528', '#7a5232'][Math.floor(rnd() * 3)];
  const g = new THREE.Group(), fr = M(col, { roughness: 0.5 }), seatM = T(texStraw);
  const add = (geo, m, px, py, pz) => { const o = new THREE.Mesh(geo, m); o.position.set(px, py, pz); o.castShadow = true; o.receiveShadow = true; g.add(o); return o; };
  add(new THREE.BoxGeometry(0.4, 0.05, 0.4), seatM, 0, 0.45, 0);
  for (const [dx, dz, hh] of [[-0.19, 0.18, 0.45], [0.19, 0.18, 0.45], [-0.19, -0.18, 0.92], [0.19, -0.18, 0.92]]) add(new THREE.CylinderGeometry(0.018, 0.018, hh, 10), fr, dx, hh / 2, dz);
  add(new THREE.BoxGeometry(0.4, 0.12, 0.02), fr, 0, 0.84, -0.18); add(new THREE.BoxGeometry(0.4, 0.035, 0.02), fr, 0, 0.64, -0.18);
  for (const dz of [-0.18, 0.18]) add(new THREE.BoxGeometry(0.38, 0.025, 0.02), fr, 0, 0.2, dz);
  add(new THREE.BoxGeometry(0.4, 0.04, 0.4).translate(0, 0, 0), fr, 0, 0.42, 0).scale.set(1, 0.4, 1);
  g.position.set(x, 0, z); g.rotation.y = rot; scene.add(g);
}

const texMajolica = rep(cv(256, 256, (g, w, h) => {
  const t = 128;
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { const x = i * t, y = j * t;
    g.fillStyle = '#f4efe2'; g.fillRect(x, y, t, t);
    g.fillStyle = '#2d5d8a'; for (const [cx, cy] of [[0, 0], [t, 0], [0, t], [t, t]]) { g.beginPath(); g.arc(x + cx, y + cy, 34, 0, 7); g.fill(); }
    g.fillStyle = '#e3a72f'; for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; g.beginPath(); g.ellipse(x + t / 2 + Math.cos(a) * 26, y + t / 2 + Math.sin(a) * 26, 22, 10, a, 0, 7); g.fill(); }
    g.fillStyle = '#2d5d8a'; g.beginPath(); g.arc(x + t / 2, y + t / 2, 12, 0, 7); g.fill();
    g.fillStyle = '#4f8a5b'; for (let k = 0; k < 4; k++) { const a = Math.PI / 4 + k * Math.PI / 2; g.beginPath(); g.ellipse(x + t / 2 + Math.cos(a) * 44, y + t / 2 + Math.sin(a) * 44, 12, 5, a, 0, 7); g.fill(); }
    g.strokeStyle = '#d9d2c2'; g.lineWidth = 3; g.strokeRect(x, y, t, t); }
}), 1, 1);
const texMarble = rep(cv(512, 256, (g, w, h) => { g.fillStyle = '#f1eee8'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 26; i++) { g.strokeStyle = `rgba(120,115,110,${0.1 + rnd() * 0.25})`; g.lineWidth = 0.6 + rnd() * 1.6; g.beginPath(); let x = rnd() * w, y = rnd() * h; g.moveTo(x, y);
    for (let k = 0; k < 8; k++) { x += 20 + rnd() * 50; y += (rnd() - 0.5) * 40; g.lineTo(x, y); } g.stroke(); } }), 2, 1);
const texLinen = rep(cv(64, 64, (g, w, h) => { g.fillStyle = '#f3eee3'; g.fillRect(0, 0, w, h); for (let i = 0; i < 64; i += 2) { g.fillStyle = `rgba(150,130,100,${rnd() * 0.08})`; g.fillRect(i, 0, 1, h); g.fillRect(0, i, w, 1); } }), 4, 4);
const texStripe = rep(cv(64, 64, (g, w, h) => { g.fillStyle = '#f3eee3'; g.fillRect(0, 0, w, h); g.fillStyle = '#b5482f'; for (let i = 0; i < 64; i += 16) g.fillRect(i, 0, 5, h); }), 3, 1);
function painting(seedv, w, h) {
  return cv(Math.round(w * 300), Math.round(h * 300), (g, W, H) => {
    g.fillStyle = '#b8913f'; g.fillRect(0, 0, W, H); g.fillStyle = '#8a6a2a'; g.fillRect(8, 8, W - 16, H - 16); g.fillStyle = '#f2ead8'; g.fillRect(18, 18, W - 36, H - 36);
    const k = seedv % 4;
    if (k === 0) { const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#9cc0d8'); sky.addColorStop(1, '#f0d9b0'); g.fillStyle = sky; g.fillRect(30, 30, W - 60, H - 60);
      g.fillStyle = '#2d5d8a'; g.fillRect(30, H * 0.62, W - 60, H * 0.38 - 30); ['#e3a72f', '#d98a6a', '#e8c9a8', '#c45a3c', '#f0dca0'].forEach((c, i) => { g.fillStyle = c; g.fillRect(40 + i * (W - 80) / 5, H * 0.35, (W - 80) / 5 - 4, H * 0.28); g.fillStyle = '#4f6b54'; g.fillRect(48 + i * (W - 80) / 5, H * 0.42, 8, 14); }); }
    else if (k === 1) { g.fillStyle = '#d9cbb0'; g.fillRect(30, 30, W - 60, H - 60); g.fillStyle = '#555'; g.beginPath(); g.arc(W / 2, H * 0.4, Math.min(W, H) * 0.18, 0, 7); g.fill(); g.fillRect(W * 0.3, H * 0.55, W * 0.4, H * 0.35); }
    else if (k === 2) { g.fillStyle = '#efe6d2'; g.fillRect(30, 30, W - 60, H - 60); ['#c0392b', '#e3a72f', '#4f8a5b', '#d98a6a'].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(W * (0.3 + 0.13 * i), H * (0.45 + 0.06 * (i % 2)), Math.min(W, H) * 0.1, 0, 7); g.fill(); }); g.fillStyle = '#8a6a3a'; g.fillRect(W * 0.2, H * 0.62, W * 0.6, 10); }
    else { g.fillStyle = '#cfc8ba'; g.fillRect(30, 30, W - 60, H - 60); g.strokeStyle = '#222'; g.lineWidth = 6; g.beginPath(); g.arc(W * 0.35, H * 0.65, Math.min(W, H) * 0.14, 0, 7); g.stroke(); g.beginPath(); g.arc(W * 0.68, H * 0.65, Math.min(W, H) * 0.14, 0, 7); g.stroke(); g.fillStyle = '#222'; g.fillRect(W * 0.48, H * 0.3, 10, H * 0.3); }
  });
}
function plates(x0, z0, face, n, y) { const cols = ['#2d5d8a', '#e3a72f', '#4f8a5b', '#c45a3c', '#f4efe2'];
  for (let i = 0; i < n; i++) { const m = new THREE.Mesh(new THREE.CircleGeometry(0.13, 24), new THREE.MeshStandardMaterial({ map: cv(64, 64, (g, w, h) => { g.fillStyle = '#f7f3ea'; g.beginPath(); g.arc(32, 32, 31, 0, 7); g.fill(); g.strokeStyle = cols[i % 5]; g.lineWidth = 6; g.beginPath(); g.arc(32, 32, 24, 0, 7); g.stroke(); g.fillStyle = cols[(i + 2) % 5]; g.beginPath(); g.arc(32, 32, 10, 0, 7); g.fill(); }), roughness: 0.3 }));
    if (face === 'S') { m.position.set(x0 + i * 0.32, y + (i % 2) * 0.3, z0); } else { m.rotation.y = face === 'W' ? -Math.PI / 2 : Math.PI / 2; m.position.set(x0, y + (i % 2) * 0.3, z0 + i * 0.32); }
    scene.add(m); } }
function floorLamp(x, z) { cyl(x, z, 0.14, 0, 0.03, M('#2b2b2b')); cyl(x, z, 0.012, 0.03, 1.45, brassM, 8);
  cyl(x, z, 0.22, 1.4, 1.7, new THREE.MeshStandardMaterial({ color: '#efe2c8', emissive: '#ffcf8a', emissiveIntensity: 0.6, side: THREE.DoubleSide }), 24, 0.15);
  const l = new THREE.PointLight('#ffc98a', 1.8, 0, 2); l.position.set(x, 1.5, z); scene.add(l); }
function tableLamp(x, y, z) { cyl(x, z, 0.06, y, y + 0.3, M('#f4f0e8', { roughness: 0.3 }), 16, 0.04);
  cyl(x, z, 0.14, y + 0.3, y + 0.48, new THREE.MeshStandardMaterial({ color: '#f2e6cc', emissive: '#ffcf8a', emissiveIntensity: 0.6, side: THREE.DoubleSide }), 20, 0.09);
  const l = new THREE.PointLight('#ffc98a', 1.0, 0, 2); l.position.set(x, y + 0.38, z); scene.add(l); }

terrazzoM = T(texMarble, { roughness: 0.25 });
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
const beamM = M('#c4a782', { roughness: 0.8 });

function chandelier(x, z, y, r = 0.38, n = 6, lightI = 2.2) {
  cyl(x, z, 0.008, y + 0.05, HS, ironM, 6);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.015, 8, 40), ironM); ring.rotation.x = Math.PI / 2; ring.position.set(x, y, z); scene.add(ring);
  for (let i = 0; i < n; i++) { const a = i * 2 * Math.PI / n, px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
    cyl(px, pz, 0.025, y, y + 0.12, M('#f4efe2'), 10);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffe2a8', toneMapped: false })); b.scale.y = 1.6; b.position.set(px, y + 0.16, pz); scene.add(b); }
  const l = new THREE.PointLight('#ffcc88', lightI, 0, 2); l.position.set(x, y - 0.1, z); scene.add(l);
}
// ---------------------------------------------------------------- shell
const HS = 3.2, HP = 3.5;
{ const f = new THREE.Mesh(new THREE.PlaneGeometry(14.6, 13.6), T(texOpus, { roughness: 0.55 }));
  texOpus.repeat.set(14.6 / 4, 13.6 / 4); f.rotation.x = -Math.PI / 2; f.position.set(11.6, 0, 6.6); f.receiveShadow = true; scene.add(f); }
const showCeiling = VIEW !== 'top' && VIEW !== 'piantabar' && VIEW !== 'pianta';

// bar back wall: exposed stone with two arched old wooden doors framed in brick
{ const s = new THREE.Shape(); s.moveTo(12.4, 0); s.lineTo(18.7, 0); s.lineTo(18.7, HS); s.lineTo(12.4, HS); s.lineTo(12.4, 0);
  for (const [a, b] of [[14.85, 15.75], [17.45, 18.35]]) { const hp = new THREE.Path(); rectPath(hp, a, b, 2.15); s.holes.push(hp); }
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.35, bevelEnabled: false });
  const t = texStone.clone(); t.needsUpdate = true; rep(t, 1 / 1.6, 1 / 1.6);
  const m = new THREE.Mesh(g, T(texPlaster, { color: '#dcae63', roughness: 0.95 })); m.position.z = 2.03; m.receiveShadow = true; m.castShadow = true; scene.add(m);
  for (const [a, b] of [[14.85, 15.75], [17.45, 18.35]]) {
    const ring = new THREE.Shape(); const r = (b - a) / 2, cx = a + r;
    ring.moveTo(a - 0.14, 0); ring.lineTo(a - 0.14, 1.75); ring.absarc(cx, 1.75, r + 0.14, Math.PI, 0, true); ring.lineTo(b + 0.14, 0); ring.lineTo(b, 0); ring.lineTo(b, 1.75);
    ring.absarc(cx, 1.75, r, 0, Math.PI, false); ring.lineTo(a, 0); ring.lineTo(a - 0.14, 0);
    const rg = new THREE.ExtrudeGeometry(ring, { depth: 0.38, bevelEnabled: false });
    const bt = texBrick.clone(); bt.needsUpdate = true; rep(bt, 1 / 0.8, 1 / 0.8);
    // door frames removed: the storeroom and cellar doors become flush doors painted with the drawing
    const ds = new THREE.Shape(); rectPath(ds, a, b, 2.15);
    const dg = new THREE.ShapeGeometry(ds); const uv = dg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) - a) / (b - a), uv.getY(i) / 2.15);
    const dm = new THREE.Mesh(dg, T(rep(cv(64, 256, (g, w, h) => { g.fillStyle = '#4f6b54'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,0.25)'; for (let y = 8; y < h; y += 16) g.fillRect(4, y, w - 8, 4); }), 1, 1), { roughness: 0.6 })); dm.position.z = 2.2; scene.add(dm);
  }
}
box(12.2, 12.4, 0, HS, 0, 2.38, plasterM);
{ const d = new THREE.Mesh(new THREE.BoxGeometry(0.3, HS, 1.33), plasterM); d.position.set(12.1, HS / 2, 2.97); d.rotation.y = Math.atan2(0.6, 1.18); d.castShadow = d.receiveShadow = true; scene.add(d); }
// pizza alcove in brick + oven mouth
{ const tt = texTileW.clone(); tt.needsUpdate = true; rep(tt, 5, 6); box(9.9, 12.4, 0, HS, -0.2, 0, T(tt, { roughness: 0.25 })); }
box(9.7, 9.9, 0, HS, 0, 2.67, plasterM);
box(7.2, 9.9, 0, HS, 2.47, 2.67, plasterM); box(7.0, 7.2, 0, HS, 2.67, 3.3, plasterM);
box(4.45, 7.2, 0, HS, 3.1, 3.3, plasterM); box(4.25, 4.45, 0, HS, 3.3, 4.95, plasterM);

// WC block
box(4.45, 7.6, 0, HS, 4.95, 5.15, plasterM); box(7.3, 7.6, 0, HS, 5.15, 9.8, plasterM); box(4.45, 7.3, 0, 2.6, 5.15, 9.8, M('#ddd6cb'));
// east wall: lower plaster, upper exposed stone (like your living room)
box(18.7, 18.9, 0, HP, 0, 5.6, plasterM); box(18.7, 18.9, 0, HP, 6.5, 13.4, plasterM); box(18.7, 18.9, 2.2, HP, 5.6, 6.5, plasterM);
box(18.9, 19.6, 0, 2.2, 5.6, 6.5, M('#3a3a3a'));

// porticato west wall with lobby opening
box(7.4, 7.6, 0, HP, 9.8, 10.9, plasterM); box(7.4, 7.6, 0, HP, 12.1, 13.4, plasterM); box(7.4, 7.6, 2.4, HP, 10.9, 12.1, plasterM);
// ceilings with wooden beams
if (showCeiling) {
  box(4.25, 18.9, HS, HS + 0.1, -0.2, 9.8, ceilingM, false);
  for (let x = 8.2; x < 18.7; x += 1.1) box(x - 0.08, x + 0.08, HS - 0.18, HS, 0, 9.6, beamM, false);
  for (let x = 8.1; x < 18.7; x += 0.9) box(x - 0.07, x + 0.07, HP - 0.16, HP, 9.8, 13.3, beamM, false);
  box(7.6, 18.7, HP, HP + 0.1, 9.8, 13.4, ceilingM, false);
}
// stone arcade between sala and lounge (three big arches)
{ const s = new THREE.Shape(); s.moveTo(7.6, 0); s.lineTo(18.7, 0); s.lineTo(18.7, HP); s.lineTo(7.6, HP); s.lineTo(7.6, 0);
  const arches = [[9.0, 10.8], [12.0, 13.8], [15.0, 16.8]];
  for (const [a, b] of arches) { const p = new THREE.Path(); rectPath(p, a, b, 2.45); s.holes.push(p); }
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.45, bevelEnabled: false });
  const m = new THREE.Mesh(g, plasterM); m.position.z = 9.58; m.castShadow = true; m.receiveShadow = true; scene.add(m);
  const fr = M('#2b2b2b', { metalness: 0.5, roughness: 0.4 }), gl = new THREE.MeshPhysicalMaterial({ color: '#e6f2f4', transparent: true, opacity: 0.16, roughness: 0.05 });
  for (const [a, b] of arches) { box(a, b, 0, 2.45, 9.79, 9.81, gl, false);
    for (const x of [a + 0.03, (a + b) / 2, b - 0.03]) box(x - 0.025, x + 0.025, 0, 2.45, 9.77, 9.83, fr);
    for (const y of [0.03, 1.0, 2.1, 2.42]) box(a, b, y - 0.025, y + 0.025, 9.77, 9.83, fr);
    cyl((a + b) / 2 - 0.08, 9.86, 0.012, 0.95, 1.15, brassM, 8); }
}
// south wall: big arched windows with sheer linen curtains
{ const s = new THREE.Shape(); s.moveTo(7.6, 0); s.lineTo(18.7, 0); s.lineTo(18.7, HP); s.lineTo(7.6, HP); s.lineTo(7.6, 0);
  const win = [[8.3, 10.3], [10.9, 12.9], [13.6, 15.6], [16.2, 18.2]];
  for (const [a, b] of win) { const p = new THREE.Path(); archPath(p, a, b, 1.6); s.holes.push(p); }
  const m = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.4, bevelEnabled: false }), plasterM); m.position.z = 13.27; m.castShadow = true; m.receiveShadow = true; scene.add(m);
  const glass = new THREE.MeshPhysicalMaterial({ color: '#dfeff2', transparent: true, opacity: 0.12, roughness: 0.05 });
  const sheer = new THREE.MeshStandardMaterial({ color: '#fbf8f1', transparent: true, opacity: 0.55, roughness: 1, side: THREE.DoubleSide });
  for (const [a, b] of win) {
    for (const xm of [a + 0.04, (a + b) / 2, b - 0.04]) box(xm - 0.04, xm + 0.04, 0, xm === (a + b) / 2 ? 2.6 : 1.6, 13.4, 13.5, M('#f4f4f2')); box(a, b, 1.56, 1.64, 13.4, 13.5, M('#f4f4f2')); box(a, b, 0.85, 0.9, 13.4, 13.5, M('#f4f4f2'));
    { const ar = new THREE.Mesh(new THREE.TorusGeometry((b - a) / 2 - 0.04, 0.04, 8, 32, Math.PI), M('#f4f4f2')); ar.position.set((a + b) / 2, 1.6, 13.45); scene.add(ar); }
    const gs = new THREE.Shape(); archPath(gs, a, b, 1.6); const gm = new THREE.Mesh(new THREE.ShapeGeometry(gs), glass); gm.position.z = 13.47; scene.add(gm);
    for (const side of [0, 1]) { const x0 = side ? b - 0.55 : a, geo = new THREE.PlaneGeometry(0.55, 2.7, 24, 1), p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 30) * 0.03); geo.computeVertexNormals();
      const c = new THREE.Mesh(geo, sheer); c.position.set(x0 + 0.275, 1.38, 13.2); scene.add(c); }
    box(a - 0.1, b + 0.1, 2.75, 2.78, 13.17, 13.2, ironM, false);
  }
}
wallPlane('N', 13, 17.5, 34, -1, 10, new THREE.MeshBasicMaterial({ map: texGarden, toneMapped: false }));

// ================================================================ v8 – open lounge, contemporary Italian (Domus mood)
const texTrav = rep(cv(512, 512, (g, w, h) => {
  g.fillStyle = '#e4d8c4'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 70; i++) { const y = rnd() * h; g.fillStyle = `rgba(${170 + rnd() * 40},${150 + rnd() * 30},${115 + rnd() * 25},${0.15 + rnd() * 0.25})`; g.fillRect(0, y, w, 1 + rnd() * 5); }
  for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(140,115,85,${rnd() * 0.25})`; g.beginPath(); g.ellipse(rnd() * w, rnd() * h, 1 + rnd() * 5, 0.6 + rnd() * 1.5, 0, 0, 7); g.fill(); }
}), 1, 1);
const travM = (rx = 1, ry = 1) => { const t = texTrav.clone(); t.needsUpdate = true; rep(t, rx, ry); return T(t, { roughness: 0.55 }); };
const texBoucle = (base) => rep(cv(128, 128, (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${rnd() > 0.5 ? '255,255,255' : '0,0,0'},${rnd() * 0.09})`; g.beginPath(); g.arc(rnd() * w, rnd() * h, 1 + rnd() * 2.5, 0, 7); g.fill(); } }), 4, 4);
const oakM = T(rep(cv(512, 128, (g, w, h) => { g.fillStyle = '#b98d5e'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 120; i++) { g.strokeStyle = `rgba(110,70,35,${0.08 + rnd() * 0.18})`; g.lineWidth = 0.5 + rnd() * 1.5; const y = rnd() * h; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(w / 3, y + 5 * rnd(), w * 0.6, y - 5 * rnd(), w, y + 2); g.stroke(); } }), 1, 1), { roughness: 0.55 });
const RUST = '#a4502f', OLIVE = '#6f7448', CREAM = '#efe6d6', SAND = '#d8c7aa';
function boucle(c) { return T(texBoucle(c), { roughness: 1 }); }
function olive(x, z, s = 1) { cyl(x, z, 0.24 * s, 0, 0.5 * s, travM(), 24, 0.26 * s); cyl(x, z, 0.04 * s, 0.5 * s, 1.3 * s, M('#6b5a45'), 8);
  for (let i = 0; i < 9; i++) { const lf = new THREE.Mesh(new THREE.SphereGeometry(0.26 * s, 10, 8), M('#8a9670', { roughness: 0.9 })); lf.position.set(x + (rnd() - 0.5) * 0.55 * s, 1.35 * s + rnd() * 0.5 * s, z + (rnd() - 0.5) * 0.55 * s); lf.castShadow = true; scene.add(lf); } }
// paper lantern (Akari-like)
function lantern(x, z, y, r = 0.32, sy = 1.0, light = 1.6) {
  cyl(x, z, 0.004, y + r * sy, HS, M('#222'), 6);
  const s = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 20), new THREE.MeshStandardMaterial({ color: '#fbf6ec', emissive: '#ffe7c2', emissiveIntensity: 0.85, roughness: 1 }));
  s.scale.y = sy; s.position.set(x, y, z); scene.add(s);
  for (let k = -3; k <= 3; k++) { const rr = r * Math.sqrt(1 - (k / 4) ** 2); const ring = new THREE.Mesh(new THREE.TorusGeometry(rr * 1.002, 0.003, 4, 40), M('#e6dccb')); ring.rotation.x = Math.PI / 2; ring.position.set(x, y + (k / 4) * r * sy, z); scene.add(ring); }
  const l = new THREE.PointLight('#ffd9a6', light, 0, 2); l.position.set(x, y - 0.1, z); scene.add(l);
}
function floorLantern(x, z, h = 1.2) { cyl(x, z, 0.012, 0, 0.3, M('#222'), 6);
  const s = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, h - 0.3, 32), new THREE.MeshStandardMaterial({ color: '#fbf6ec', emissive: '#ffe1b5', emissiveIntensity: 0.9 })); s.position.set(x, 0.3 + (h - 0.3) / 2, z); scene.add(s);
  const l = new THREE.PointLight('#ffd09a', 1.3, 0, 2); l.position.set(x, h * 0.7, z); scene.add(l); }
// contemporary dining chair: oak frame, upholstered seat
function dchair(x, z, rot, c) {
  const g = new THREE.Group(), fr = oakM, up = boucle(c);
  const add = (geo, m, px, py, pz, rx = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(px, py, pz); o.rotation.x = rx; o.castShadow = true; o.receiveShadow = true; g.add(o); return o; };
  add(new THREE.BoxGeometry(0.44, 0.07, 0.42), up, 0, 0.46, 0.02);
  for (const [dx, dz] of [[-0.19, 0.18], [0.19, 0.18], [-0.19, -0.17], [0.19, -0.17]]) add(new THREE.CylinderGeometry(0.018, 0.014, 0.44, 10), fr, dx, 0.22, dz);
  const back = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.14, 24, 1, true, Math.PI * 0.7, Math.PI * 0.6), fr); back.material = new THREE.MeshStandardMaterial({ map: oakM.map, side: THREE.DoubleSide, roughness: 0.55 }); back.position.set(0, 0.76, 0.05); g.add(back);
  for (const dx of [-0.19, 0.19]) add(new THREE.CylinderGeometry(0.014, 0.014, 0.32, 8), fr, dx, 0.62, -0.17);
  g.position.set(x, 0, z); g.rotation.y = rot; scene.add(g);
}
// long communal table: oak top on two slim black frames
function longTable(x0, x1, z, d = 0.95, h = 0.75) {
  box(x0, x1, h - 0.045, h, z - d / 2, z + d / 2, oakM); box(x0 + 0.1, x1 - 0.1, h, h + 0.004, z - 0.22, z + 0.22, T(texLinen, { roughness: 1 }));
  const lm = M('#1f1f1f', { metalness: 0.5, roughness: 0.4 }); for (const x of [x0 + 0.3, x1 - 0.3]) { for (const dz of [-1, 1]) box(x - 0.02, x + 0.02, 0, h - 0.045, z + dz * (d / 2 - 0.12) - 0.02, z + dz * (d / 2 - 0.12) + 0.02, lm); box(x - 0.02, x + 0.02, h - 0.1, h - 0.045, z - d / 2 + 0.1, z + d / 2 - 0.1, lm); } box(x0 + 0.3, x1 - 0.3, 0.2, 0.24, z - 0.02, z + 0.02, lm);
  for (let x = x0 + 0.5; x < x1 - 0.3; x += 1.1) { cyl(x, z, 0.035, h, h + 0.22, M(['#e9e2d6', '#a4502f', '#6f7448'][Math.floor(rnd() * 3)], { roughness: 0.4 }), 16, 0.02);
    cyl(x + 0.35, z + 0.12, 0.035, h, h + 0.09, new THREE.MeshPhysicalMaterial({ color: '#fff', transparent: true, opacity: 0.35 }), 12); }
}
function bench(x0, x1, z, d = 0.38) { box(x0, x1, 0.4, 0.46, z - d / 2, z + d / 2, oakM); for (const x of [x0 + 0.15, x1 - 0.15]) box(x - 0.02, x + 0.02, 0, 0.4, z - d / 2 + 0.05, z + d / 2 - 0.05, M('#1f1f1f')); }
// rounded lounge armchair
function loungeChair(x, z, rot, c) {
  const g = new THREE.Group(), up = boucle(c);
  const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.38, 32), up); seat.position.y = 0.19; g.add(seat);
  const back = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.13, 16, 32, Math.PI * 1.15), up); back.rotation.x = Math.PI / 2; back.rotation.z = Math.PI * 0.92; back.position.y = 0.48; g.add(back);
  const cush = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.08, 32), up); cush.position.y = 0.42; g.add(cush);
  g.traverse(o => { o.castShadow = true; o.receiveShadow = true; }); g.position.set(x, 0, z); g.rotation.y = rot; scene.add(g);
}
// low modular sofa
function modSofa(x0, x1, z0, z1, side, c) {
  const up = boucle(c);
  box(x0, x1, 0.06, 0.42, z0, z1, up); box(x0, x1, 0, 0.06, z0 + 0.05, z1 - 0.05, M('#2a2a2a'));
  if (side === 'S') box(x0, x1, 0.42, 0.72, z1 - 0.22, z1, up);
  if (side === 'E') box(x1 - 0.22, x1, 0.42, 0.72, z0, z1, up);
  if (side === 'W') box(x0, x0 + 0.22, 0.42, 0.72, z0, z1, up);
  const n = Math.max(1, Math.round((side === 'S' ? x1 - x0 : z1 - z0) / 0.9));
  for (let i = 0; i < n; i++) { const c2 = [CREAM, SAND, RUST, OLIVE][i % 4];
    const k = new THREE.Mesh(new THREE.BoxGeometry(side === 'S' ? 0.45 : 0.14, 0.4, side === 'S' ? 0.14 : 0.45), boucle(c2));
    if (side === 'S') k.position.set(x0 + (i + 0.5) * (x1 - x0) / n, 0.62, z1 - 0.3); else k.position.set(side === 'E' ? x1 - 0.3 : x0 + 0.3, 0.62, z0 + (i + 0.5) * (z1 - z0) / n);
    k.castShadow = true; scene.add(k); }
}
function rug(x0, x1, z0, z1, c) { const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), boucle(c)); m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, 0.006, (z0 + z1) / 2); m.receiveShadow = true; scene.add(m); }
function roundTable(x, z, r, h, m) { cyl(x, z, r, h - 0.05, h, m, 40); cyl(x, z, r * 0.45, 0, h - 0.05, m, 32, r * 0.35); }
function abstractArt(w, h, seedv) {
  return cv(Math.round(w * 260), Math.round(h * 260), (g, W, H) => {
    g.fillStyle = '#f1e9dc'; g.fillRect(0, 0, W, H);
    g.fillStyle = RUST; g.beginPath(); g.arc(W * 0.32, H * 0.55, H * 0.32, 0, 7); g.fill();
    g.fillStyle = OLIVE; g.fillRect(W * 0.52, H * 0.18, W * 0.22, H * 0.64);
    g.fillStyle = '#1f1f1f'; g.beginPath(); g.arc(W * 0.8, H * 0.32, H * 0.08, 0, 7); g.fill();
    g.strokeStyle = '#c9a87a'; g.lineWidth = H * 0.02; g.beginPath(); g.moveTo(W * 0.08, H * 0.85); g.bezierCurveTo(W * 0.4, H * 0.7, W * 0.6, H * 0.95, W * 0.92, H * 0.78); g.stroke();
    g.strokeStyle = '#2b2b2b'; g.lineWidth = 10; g.strokeRect(0, 0, W, H);
  });
}

// ---------------------------------------------------------------- BAR – long travertine counter wall to wall, with lift-up flap + food pass
{ const Z0 = 3.65, Z1 = 4.3, ZC = (Z0 + Z1) / 2;
  // main run: from the oven wall line (x 9.95) to the east wall
  const navyB = T(rep(cv(512, 256, (g, w, h) => { g.fillStyle = '#9a8670'; g.fillRect(0, 0, w, h); for (let i = 0; i < 90; i++) { const x = rnd() * w, y = rnd() * h, rw = 30 + rnd() * 90, rh = 25 + rnd() * 70, n = 6 + Math.floor(rnd() * 4); const l = 38 + rnd() * 28;
    g.fillStyle = `hsl(${26 + rnd() * 12},${14 + rnd() * 14}%,${l}%)`; g.beginPath(); for (let k = 0; k < n; k++) { const a = k / n * 6.283, rr = 0.7 + rnd() * 0.3; g.lineTo(x + Math.cos(a) * rw / 2 * rr, y + Math.sin(a) * rh / 2 * rr); } g.closePath(); g.fill();
    g.strokeStyle = 'rgba(40,25,15,0.45)'; g.lineWidth = 2; g.stroke(); g.fillStyle = 'rgba(255,240,220,0.15)'; g.fillRect(x - rw / 4, y - rh / 3, rw / 3, rh / 6); } }), 9, 1), { roughness: 0.97 });

  // STEEL BAR: brushed stainless front, stylised bikers + climbers etched along the whole length
  const steelTex = (art) => cv(art ? 4096 : 512, art ? 470 : 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#d9dcdf'); gr.addColorStop(0.5, '#b9bec3'); gr.addColorStop(1, '#a3a8ad'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < h * 3; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '255,255,255' : '40,45,50'},${0.03 + rnd() * 0.06})`; g.fillRect(0, rnd() * h, w, 0.6 + rnd()); }
    if (!art) return;
    const line = (pts) => { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) g.lineTo(p[0], p[1]); g.stroke(); };
    const etch = (fn) => { g.lineCap = 'round'; g.lineJoin = 'round';
      g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 15; g.save(); g.translate(3, 3); fn(); g.restore();
      g.strokeStyle = '#2c3034'; g.lineWidth = 13; fn(); };
    // only two big figures: a biker and a climber
    const ground = () => h * 0.93;
    const biker = (x, s) => { const r = 34 * s; g.save(); g.translate(x, ground() - r);
      etch(() => { g.beginPath(); g.arc(-62 * s, 0, r, 0, 6.283); g.stroke(); g.beginPath(); g.arc(62 * s, 0, r, 0, 6.283); g.stroke();
        line([[-62 * s, 0], [-14 * s, -50 * s], [42 * s, -50 * s], [62 * s, 0]]); line([[-14 * s, -50 * s], [0, 0], [-62 * s, 0]]); line([[0, 0], [42 * s, -50 * s]]);
        line([[42 * s, -50 * s], [48 * s, -74 * s], [64 * s, -78 * s]]); line([[-14 * s, -50 * s], [-24 * s, -64 * s]]);
        line([[0, 0], [10 * s, -40 * s], [-18 * s, -66 * s]]); line([[-18 * s, -66 * s], [30 * s, -112 * s], [62 * s, -78 * s]]);
        g.beginPath(); g.arc(46 * s, -134 * s, 17 * s, 0, 6.283); g.stroke(); line([[26 * s, -144 * s], [66 * s, -148 * s]]); });
      g.restore(); };
    const climber = (x, s) => { g.save(); g.translate(x, h * 0.5); g.scale(s, s);
      etch(() => { line([[74, -218], [64, -150], [80, -90], [62, -20], [78, 60], [64, 130], [76, 218]]); }); // rock edge
        g.scale(1.5, 1.5); g.lineWidth = 13; etch(() => {
        line([[-6, -58], [0, 12]]); g.beginPath(); g.arc(-12, -82, 17, 0, 6.283); g.stroke();
        line([[-6, -52], [14, -100], [42, -142]]); line([[-6, -48], [-36, -24], [-46, 6]]);
        line([[0, 12], [30, 34], [44, 88]]); line([[0, 12], [-22, 70], [46, 120]]); });
      g.restore(); };
    g.lineWidth = 8; biker(w * 0.27, 2.3); climber(w * 0.53, 1.05);
    window.STEELCANVAS = g.canvas; g.font = 'bold 40px Helvetica, Arial, sans-serif'; g.textAlign = 'center'; g.fillStyle = '#2c3034';
    
  });
  const steelArt = T(cv(3500, 400, (g, w, h) => { g.fillStyle = '#f4efe6'; g.fillRect(0, 0, w, h);
    const P = [['#efe1cc', '#d29a6a'], ['#4f6f86', '#e0783a'], ['#e0783a', '#a8461a']], pw = w / 3;
    P.forEach(([bg, ln], i) => { const x = i * pw; g.fillStyle = bg; g.fillRect(x + 8, 0, pw - 16, h);
      for (const cx of [x + pw * 0.27, x + pw * 0.73]) { g.strokeStyle = ln; g.lineWidth = 9; for (let k = 0; k < 9; k++) { const r = h * 0.9 - k * 34; if (r < 20) break; g.beginPath(); g.arc(cx, h, r, Math.PI, 0); g.stroke(); } } }); }), { roughness: 0.5 });
  const steelM = M('#f4efe6', { roughness: 0.5 });
  const steelFront = new THREE.Mesh(new THREE.PlaneGeometry(18.7 - 9.95, 1.0), steelArt); steelFront.position.set((9.95 + 18.7) / 2, 0.5, Z1 + 0.003); steelFront.receiveShadow = true; scene.add(steelFront);
  box(9.95, 18.7, 0, 1.0, Z0, Z1, steelM);
  box(9.95, 18.7, 0, 0.08, Z1 - 0.06, Z1 + 0.001, M('#1e2124', { metalness: 0.5, roughness: 0.5 })); // kick plinth
  box(9.85, 18.7, 1.06, 1.14, Z0 - 0.08, Z1 + 0.12, oakM); // oak top
  





  box(9.95, 18.7, 1.0, 1.02, Z1 + 0.13, Z1 + 0.15, new THREE.MeshBasicMaterial({ color: '#ffe2b0', toneMapped: false }), false); // LED under the top edge
  // return to the wall with the LIFT-UP FLAP (staff lift it to go to the pizza oven / kitchen)
  box(9.95, 10.6, 0, 1.0, 2.67, 2.9, steelM);
  box(9.95, 10.6, 0.05, 1.0, 2.95, Z0 - 0.03, M('#d9ccb6', { roughness: 0.6 })); // swing door under the flap
  { const flap = oakM;
    box(9.92, 10.63, 1.04, 1.1, 2.9, Z0 - 0.02, flap);
    for (const z of [3.05, 3.45]) box(10.58, 10.64, 1.1, 1.12, z - 0.04, z + 0.04, brassM); // hinges
    box(9.9, 10.65, 1.1, 1.101, 2.895, 2.905, M('#7a6a55')); box(9.9, 10.65, 1.1, 1.101, Z0 - 0.025, Z0 - 0.015, M('#7a6a55')); }
  // food pass on the extension: raised shelf + heat lamps, in front of the pizza oven
  box(10.7, 13.6, 1.4, 1.44, Z0 + 0.05, Z0 + 0.4, M('#efeae0', { roughness: 0.3 }));
  for (const x of [10.9, 13.4]) box(x - 0.02, x + 0.02, 1.1, 1.4, Z0 + 0.2, Z0 + 0.24, brassM);
  for (const x of [11.2, 11.9, 12.6, 13.3]) { cyl(x, Z0 + 0.22, 0.004, 1.75, HS, M('#222'), 6); cyl(x, Z0 + 0.22, 0.1, 1.62, 1.75, brassM, 20, 0.05);
    const l = new THREE.PointLight('#ffb870', 1.0, 0, 2); l.position.set(x, 1.55, Z0 + 0.22); scene.add(l); }
  for (const [x, c] of [[11.15, '#e3b26b'], [11.85, '#d9a65e'], [12.55, '#e3b26b'], [13.2, '#c9944f']]) cyl(x, Z0 + 0.22, 0.17, 1.44, 1.46, M(c));
  // espresso machine, taps, glasses on the main run
  box(15.5, 16.2, 1.1, 1.5, Z0 + 0.05, Z0 + 0.45, M('#d9d6cf', { metalness: 0.9, roughness: 0.2 }));
  box(17.1, 18.2, 1.1, 1.42, ZC - 0.04, ZC + 0.04, brassM);
  for (let i = 0; i < 5; i++) { const x = 17.2 + i * 0.22; cyl(x, ZC + 0.08, 0.012, 1.26, 1.38, brassM, 8); box(x - 0.02, x + 0.02, 1.42, 1.6, ZC - 0.02, ZC + 0.02, M('#1f1f1f')); }
  for (let i = 0; i < 6; i++) cyl(14.0 + i * 0.16, ZC, 0.035, 1.1, 1.24, new THREE.MeshPhysicalMaterial({ color: '#fff', transparent: true, opacity: 0.35, roughness: 0.05 }), 12, 0.04);
  // oak shelf + neon on the terracotta wall
  { const pl = T(rep(cv(256, 512, (g, w, h) => { for (let x = 0; x < w; x += 32) { g.fillStyle = `hsl(28,${30 + rnd() * 10}%,${30 + rnd() * 10}%)`; g.fillRect(x, 0, 31, h); for (let i = 0; i < 20; i++) { g.fillStyle = `rgba(20,10,0,${rnd() * 0.15})`; g.fillRect(x + rnd() * 30, rnd() * h, 1, 20 + rnd() * 60); } } }), 6, 1), { roughness: 0.7 });
    wallPlane('S', 15.55, 2.40, 6.3, 0, HS, T(texPlaster, { color: '#f6f2ea', roughness: 0.97 })); // plain white wall
    for (const x of [13.5, 15.3, 17.1]) { const l = new THREE.PointLight('#ffc070', 1.4, 0, 2); l.position.set(x, 2.0, 2.75); scene.add(l); } }

  const nt = cv(2400, 300, (g, w, h) => { g.font = 'italic 104px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = '#ffb46b'; g.shadowBlur = 50; g.fillStyle = '#fff4e2'; for (let i = 0; i < 3; i++) g.fillText('good food, good time, good people, good life', w / 2, h / 2); });
  wallPlane('S', 15.55, 2.395, 6.3, 0, HS, T(texPlaster, { color: '#d6c8b4', roughness: 0.98 }));







  // stools along the drinks part
  for (let i = 0; i < 5; i++) { const x = 15.1 + i * 0.68; if (i % 2) { cyl(x, Z1 + 0.38, 0.17, 0, 0.7, oakM, 10, 0.2); cyl(x, Z1 + 0.38, 0.2, 0.7, 0.78, M('#3a3532', { roughness: 1 }), 24); } else { for (const [dx, dz] of [[-0.12, -0.12], [0.12, -0.12], [-0.12, 0.12], [0.12, 0.12]]) cyl(x + dx, Z1 + 0.38 + dz, 0.015, 0, 0.72, M('#1c1c1c'), 8); cyl(x, Z1 + 0.38, 0.2, 0.72, 0.8, M('#4a3a2c', { roughness: 1 }), 24); } }

  [14.6, 16.0, 17.4].forEach(x => { cyl(x, ZC + 0.3, 0.004, 1.8, HS, M('#111'), 6); const b = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffd28a', toneMapped: false })); b.scale.y = 1.5; b.position.set(x, 1.78, ZC + 0.3); scene.add(b); const l = new THREE.PointLight('#ffc98a', 0.9, 0, 2); l.position.set(x, 1.7, ZC + 0.3); scene.add(l); });
}
box(14.48, 14.83, 0, HS, 4.88, 5.23, plasterM);
wallPlane('E', 4.46, 3.9, 0.85, 0, 2.1, oakM);
// pizza corner: plain white tiles + oven mouth
box(10.0, 12.35, 0, 0.92, 0.06, 0.76, travM(2, 1));
{ const sh = new THREE.Shape(); archPath(sh, -0.5, 0.5, 0.35); const mouth = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshBasicMaterial({ color: '#ff8a2a', toneMapped: false }));
  mouth.rotation.y = Math.PI / 2; mouth.position.set(9.905, 0.95, 1.3); scene.add(mouth);
  box(9.9, 10.1, 0, 0.95, 0.55, 2.05, M(RUST, { roughness: 0.9 }));
  const ol = new THREE.PointLight('#ff7a2a', 4, 0, 2); ol.position.set(10.4, 1.2, 1.3); scene.add(ol); }

// ---------------------------------------------------------------- SALA: long shared tables + banquette
// olive bouclé banquette along the WC wall, big abstract canvas above
box(7.6, 8.1, 0, 0.45, 6.0, 9.45, oakM); box(7.62, 8.08, 0.45, 0.52, 6.02, 9.43, T(texStripe, { roughness: 1 }));
for (let i = 0; i < 4; i++) { const k = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.38, 0.5), T(texLinen, { roughness: 1 })); k.position.set(7.95, 0.62, 6.4 + i * 0.85); k.rotation.z = -0.12; scene.add(k); }
[[6.4, 1.95, 0.7, 0.9, 0], [7.2, 2.2, 0.5, 0.6, 1], [7.2, 1.55, 0.5, 0.45, 2], [8.0, 1.95, 0.8, 1.0, 3], [8.85, 2.2, 0.55, 0.55, 2], [8.85, 1.6, 0.55, 0.5, 0]].forEach(([z, y, w, h, k]) => wallPlane('E', 7.61, z, w, y - h / 2, y + h / 2, T(k % 2 ? photoBW(k) : painting(k, w, h), { roughness: 0.6 })));
wallPlane('E', 7.605, 5.55, 0.85, 0, 2.1, T(texSticker, { roughness: 0.5 }));
// table A + B face the banquette end; C near the bar
CH = () => ['#7a5232', '#6b4528', '#7a5232'][Math.floor(rnd() * 3)];
longTable(8.6, 13.6, 6.6, 1.0); for (let x = 9.05; x < 13.5; x += 0.75) { straw(x, 6.02, 0, 0); straw(x, 7.18, Math.PI, 0); }
longTable(8.6, 13.6, 8.6, 1.0); for (let x = 9.05; x < 13.5; x += 0.75) { straw(x, 8.02, 0, 0); } bench(8.7, 13.5, 9.25);
longTable(15.0, 18.1, 7.4, 1.0); for (let x = 15.4; x < 18.0; x += 0.75) { straw(x, 6.82, 0, 0); straw(x, 7.98, Math.PI, 0); }
olive(18.25, 9.15, 1.0); olive(14.2, 9.2, 0.75);
bike(18.62, 4.4, 1.55, '#2b2b2b');

// ---------------------------------------------------------------- LOUNGE: open, low and soft – you can eat here too
{ const m = new THREE.Mesh(new THREE.PlaneGeometry(7, 1.95), T(kilim('#b5482f', '#2a2522', '#e3c48a'), { roughness: 1 })); m.rotation.x = -Math.PI / 2; m.scale.set(0.55, 1, 1); m.position.set(10.0, 0.006, 11.32); scene.add(m); }
// grand piano by the lobby opening
{ const s = new THREE.Shape(); s.moveTo(15.6, 10.6); s.lineTo(17.05, 10.6); s.lineTo(17.05, 11.15);
  s.bezierCurveTo(17.05, 11.7, 16.9, 12.05, 16.5, 12.1); s.bezierCurveTo(16.15, 12.15, 16.1, 11.8, 15.6, 11.8); s.lineTo(15.6, 10.6);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: false }); g.rotateX(Math.PI / 2);
  const p = new THREE.Mesh(g, M('#0d0d0d', { roughness: 0.12, metalness: 0.2 })); p.position.y = 1.0; p.castShadow = true; scene.add(p);
  for (const [x, z] of [[15.75, 10.75], [16.9, 10.75], [16.45, 11.9]]) cyl(x, z, 0.04, 0, 0.7, M('#0d0d0d', { roughness: 0.2 }), 10);
  box(15.6, 17.05, 0.7, 0.72, 10.55, 10.8, M('#f5f5f0')); box(16.0, 16.65, 0, 0.48, 10.05, 10.4, M('#0d0d0d', { roughness: 0.2 })); }
// FLOOR SEATING – durable: solid oak platform, leather + waxed-canvas cushions, low oak tables
const leatherM0 = (c) => { const t = rep(cv(128, 128, (g, w, h) => { g.fillStyle = c; g.fillRect(0, 0, w, h); for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(${rnd() > 0.5 ? '255,220,180' : '30,10,0'},${rnd() * 0.08})`; g.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 10, 1 + rnd() * 4); } }), 2, 2); return T(t, { roughness: 0.55 }); };
const COG = '#8c2f1f', DARKL = '#3c4a5e', CANV = '#c9b48a'; const leatherM = (c) => T(kilim(c, '#2a2522', '#efe2c8'), { roughness: 1 });
function cushion(x, z, w, d, h, m, rot = 0) { const c = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); c.position.set(x, h / 2, z); c.rotation.y = rot; c.castShadow = true; c.receiveShadow = true; scene.add(c);
  const piping = new THREE.Mesh(new THREE.BoxGeometry(w + 0.01, 0.01, d + 0.01), M('#2a1a10')); piping.position.set(x, h - 0.01, z); piping.rotation.y = rot; scene.add(piping); }
// MAH JONG-STYLE FLOOR SEATING: long modular patchwork cushions (base + seat + back + bolster), low and relaxed
function patch(seedv) { return rep(cv(512, 512, (g, w, h) => { const pal = ['#a3262a', '#c2452d', '#7a1f3d', '#d98a2b', '#2f4a6e', '#1f5c5a', '#6b2f63', '#e0b04a', '#8c3b1f', '#3a2a5a'];
  const n = 8, s = w / n; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { g.fillStyle = pal[Math.floor(rnd() * pal.length)]; g.fillRect(i * s, j * s, s, s);
    const k = Math.floor(rnd() * 4); g.fillStyle = pal[Math.floor(rnd() * pal.length)];
    if (k === 0) { for (let r = 0; r < 4; r++) { g.beginPath(); g.arc(i * s + s / 2, j * s + s / 2, s * 0.4 - r * 7, 0, 7); g.lineWidth = 3; g.strokeStyle = r % 2 ? '#f2d38a' : pal[(r + i) % pal.length]; g.stroke(); } }
    else if (k === 1) { for (let r = 0; r < s; r += 8) g.fillRect(i * s, j * s + r, s, 3); }
    else if (k === 2) { g.beginPath(); g.moveTo(i * s + s / 2, j * s + 6); g.lineTo(i * s + s - 6, j * s + s / 2); g.lineTo(i * s + s / 2, j * s + s - 6); g.lineTo(i * s + 6, j * s + s / 2); g.fill(); }
    else { for (let q = 0; q < 14; q++) { g.fillStyle = ['#f2d38a', '#fff', pal[q % pal.length]][q % 3]; g.beginPath(); g.arc(i * s + rnd() * s, j * s + rnd() * s, 2 + rnd() * 4, 0, 7); g.fill(); } }
    g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 2; g.strokeRect(i * s, j * s, s, s); } }), 1, 1); }
const quilt = (c) => T(rep(cv(128, 128, (g, w, h) => { g.fillStyle = c; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 2; for (let i = 0; i < w; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); }
  g.fillStyle = 'rgba(255,255,255,0.12)'; for (let i = 16; i < w; i += 32) for (let j = 16; j < h; j += 32) { g.beginPath(); g.arc(i, j, 9, 0, 7); g.fill(); } }), 2, 2), { roughness: 1 });
function soft(x0, x1, y0, y1, z0, z1, mat) { const w = x1 - x0, h = y1 - y0, d = z1 - z0; const g = new THREE.BoxGeometry(w, h, d, 6, 2, 6); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const nx = p.getX(i) / (w / 2), ny = p.getY(i) / (h / 2), nz = p.getZ(i) / (d / 2); const bul = (1 - nx * nx) * (1 - nz * nz); p.setY(i, p.getY(i) + ny * bul * h * 0.18); p.setX(i, p.getX(i) * (1 - 0.03 * ny * ny)); p.setZ(i, p.getZ(i) * (1 - 0.03 * ny * ny)); }
  g.computeVertexNormals(); const m = new THREE.Mesh(g, mat); m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); m.castShadow = true; m.receiveShadow = true; scene.add(m); return m; }
let pi = 0; const PM = () => { const t = patch(pi++); t.repeat.set(1.2, 1.2); return T(t, { roughness: 1 }); };
const plainCols = ['#2f4a6e', '#efe6d6', '#1f5c5a', '#a3262a'];
// long run under the windows (z 12.4..13.2), 7.2 m, in 1.2 m modules
for (let x = 8.3, k = 0; x < 11.8; x += 1.2, k++) {
  soft(x + 0.02, x + 1.18, 0, 0.2, 12.35, 13.2, k % 2 ? quilt(plainCols[k % 4]) : PM());           // base
  soft(x + 0.04, x + 1.16, 0.2, 0.38, 12.38, 13.15, k % 3 === 1 ? quilt(plainCols[(k + 1) % 4]) : PM()); // seat
  soft(x + 0.05, x + 1.15, 0.34, 0.78, 12.98, 13.2, PM());                                           // back
  if (k % 2 === 0) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.6, 20), PM()); b.rotation.z = Math.PI / 2; b.position.set(x + 0.6, 0.5, 12.75); b.castShadow = true; scene.add(b); } }
for (const [x, z] of [[8.6, 11.0], [9.9, 11.0]]) { soft(x, x + 1.0, 0, 0.18, z, z + 0.85, PM()); soft(x + 0.02, x + 0.98, 0.18, 0.34, z + 0.02, z + 0.83, quilt(plainCols[Math.floor(rnd() * 4)])); }
// SATURDAY NIGHT FEVER DANCE FLOOR – coloured lit squares (about 3 x 2 m) between cushions and piano
{ const X0 = 12.2, Z0 = 10.5, N = 6, R = 4, S = 0.5, cols = ['#e0157a', '#f5b800', '#0aa6e6', '#2fc94a', '#f05a14', '#8a3be8', '#f2f2f2'];
  box(X0 - 0.05, X0 + N * S + 0.05, 0, 0.004, Z0 - 0.05, Z0 + R * S + 0.05, M('#111', { metalness: 0.6, roughness: 0.3 }), false); // flush with the floor
  for (let i = 0; i < N; i++) for (let j = 0; j < R; j++) { const c = cols[(i * 3 + j * 2 + (i * j) % 3) % cols.length];
    const t = new THREE.Mesh(new THREE.BoxGeometry(S - 0.04, 0.004, S - 0.04), new THREE.MeshBasicMaterial({ color: c, toneMapped: false }));
    t.position.set(X0 + i * S + S / 2, 0.005, Z0 + j * S + S / 2); scene.add(t); }
  for (const [x, c] of [[12.9, '#ff5fae'], [14.5, '#5fd0ff']]) { const l = new THREE.PointLight(c, 2.5, 0, 2); l.position.set(x, 0.4, 11.5); scene.add(l); }
  const cx = X0 + N * S / 2, cz = Z0 + R * S / 2;
  cyl(cx, cz, 0.004, 2.65, HP, ironM, 6); const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 2), new THREE.MeshStandardMaterial({ color: '#e8e8e8', metalness: 0.3, roughness: 0.2, flatShading: true, emissive: '#cccccc', emissiveIntensity: 0.6 })); ball.position.set(cx, 2.5, cz); scene.add(ball); }
// low brass trays as tables
for (const x of [9.3, 10.8]) { cyl(x, 11.95, 0.42, 0.28, 0.31, brassM, 32); cyl(x, 11.95, 0.03, 0, 0.28, M('#2b2b2b'), 8); for (let i = 0; i < 3; i++) cyl(x - 0.2 + i * 0.2, 11.95, 0.04, 0.31, 0.42, new THREE.MeshPhysicalMaterial({ color: '#fff', transparent: true, opacity: 0.4 }), 10); }
// fireplace corner: minimal lime-plaster block with a long fire slot
box(18.15, 18.7, 0, HP, 10.7, 12.6, plasterM); box(17.75, 18.7, 0, 0.4, 10.4, 12.9, plasterM); box(17.95, 18.2, 1.25, 1.31, 10.7, 12.6, oakM);
box(18.13, 18.15, 0.55, 0.95, 10.95, 12.35, M('#111'));
{ const f = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.28, 1.3), new THREE.MeshBasicMaterial({ color: '#ff9a3a', toneMapped: false })); f.position.set(18.12, 0.7, 11.65); scene.add(f);
  const fl = new THREE.PointLight('#ff8a3a', 6, 0, 2); fl.position.set(17.6, 0.8, 11.65); scene.add(fl); }
floorLamp(8.0, 12.9); floorLamp(17.55, 13.0);
chandelier(9.9, 11.6, HP - 0.85, 0.45, 6, 2.0); chandelier(16.4, 11.4, HP - 0.85, 0.4, 6, 1.6);


// ---------------------------------------------------------------- LOBBY / INGRESSO
{ const f = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 4.5), T(texOpus.clone(), { roughness: 0.55 })); f.material.map.needsUpdate = true; rep(f.material.map, 5.2 / 4, 4.5 / 4);
  f.rotation.x = -Math.PI / 2; f.position.set(4.9, 0.001, 13.05); f.receiveShadow = true; scene.add(f);
  box(2.2, 7.4, 0, HP, 10.7, 10.9, plasterM); box(2.2, 2.4, 0, HP, 10.9, 15.3, plasterM);
  box(2.4, 4.4, 0, HP, 15.1, 15.3, plasterM); box(5.4, 7.6, 0, HP, 15.1, 15.3, plasterM); box(4.4, 5.4, 2.4, HP, 15.1, 15.3, plasterM);
  box(4.4, 5.4, 0, 2.4, 15.18, 15.22, new THREE.MeshPhysicalMaterial({ color: '#dfeff2', transparent: true, opacity: 0.15 }), false);
  if (showCeiling) box(2.2, 7.6, HP, HP + 0.1, 10.7, 15.3, ceilingM, false);
  { const img = document.getElementById('bs'); const t = new THREE.Texture(img); t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; wallPlane('S', 4.9, 10.905, 5.0, 0, 3.4, new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 })); }
  // bikers' storage: steel + oak cubbies – helmets on top, backpacks in the middle, shoes at the bottom, hooks for jackets
  function helmet(x, y, z, c) { const h = new THREE.Mesh(new THREE.SphereGeometry(0.14, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), M(c, { roughness: 0.25 })); h.scale.set(1, 1.05, 1.3); h.position.set(x, y, z); scene.add(h);
    const v = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.03, 0.06), M('#111')); v.position.set(x, y + 0.04, z + 0.17); scene.add(v); }
  function backpack(x, y, z, c) { box(x - 0.13, x + 0.13, y, y + 0.36, z - 0.15, z + 0.15, M(c, { roughness: 0.9 })); box(x - 0.14, x + 0.14, y + 0.08, y + 0.2, z - 0.1, z + 0.1, M('#222', { roughness: 0.8 })); }
  function shoes(x, y, z, c) { for (const dz of [-0.06, 0.06]) { box(x - 0.13, x + 0.13, y, y + 0.08, z + dz - 0.045, z + dz + 0.045, M(c, { roughness: 0.6 })); box(x - 0.14, x + 0.14, y, y + 0.02, z + dz - 0.05, z + dz + 0.05, M('#e9e4da')); } }
  function storage(xWall, dir, z0, z1) {
    const xf = xWall + dir * 0.42, st = M('#1f1f1f', { metalness: 0.5, roughness: 0.4 }), xa = Math.min(xWall, xf), xb = Math.max(xWall, xf), xc = xWall + dir * 0.22;
    const n = Math.round((z1 - z0) / 0.5), dz = (z1 - z0) / n;
    for (let i = 0; i <= n; i++) box(xa, xb, 0, 2.2, z0 + i * dz - 0.015, z0 + i * dz + 0.015, st);
    for (const y of [0.1, 0.45, 1.0, 1.55, 2.2]) box(xa, xb, y, y + 0.03, z0, z1, oakM);
    for (let i = 0; i < n; i++) { const zc = z0 + (i + 0.5) * dz;
      helmet(xc, 1.58, zc, ['#1f1f1f', '#e8e2d6', '#7b7a5a', '#a4502f', '#2f4a6e'][i % 5]);
      if (i % 3 !== 2) backpack(xc, 1.03, zc, ['#4b5a3a', '#2b2b2b', '#8a4a26', '#3a4a5a'][i % 4]);
      if (i % 2 === 0) shoes(xc, 0.13, zc, ['#2b2b2b', '#e9e4da', '#4b5a3a'][i % 3]);
      if (i % 3 === 1) shoes(xc, 0.48, zc, '#6b4528');
      // numbered tag on the shelf edge
      box(xf - dir * 0.005, xf + dir * 0.005, 0.47, 0.53, zc - 0.05, zc + 0.05, M('#e9c46a')); }
    // hook rail above with jackets
    box(xWall + dir * 0.02, xWall + dir * 0.05, 2.45, 2.52, z0, z1, oakM);
    for (let i = 0; i < n; i++) { const zc = z0 + (i + 0.5) * dz; cyl(xWall + dir * 0.09, zc, 0.012, 2.4, 2.48, brassM, 8);
      if (i % 2 === 1) box(xWall + dir * 0.06, xWall + dir * 0.2, 1.85, 2.42, zc - 0.2, zc + 0.2, M(['#2b2b2b', '#5a3a22', '#3a4a5a'][i % 3], { roughness: 0.7 })); }
  }
  // LEFT wall: keep the door near the photo, storage after it
  storage(2.4, 1, 12.35, 14.85);
  { box(2.38, 2.42, 0, 2.2, 11.15, 12.15, T(rep(cv(64, 256, (g, w, h) => { g.fillStyle = '#b98d5e'; g.fillRect(0, 0, w, h); for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(110,70,35,${rnd() * 0.2})`; g.fillRect(0, rnd() * h, w, 1 + rnd() * 2); } }), 1, 1)));
    box(2.4, 2.47, 0, 2.28, 11.07, 11.15, M('#efe9df')); box(2.4, 2.47, 0, 2.28, 12.15, 12.23, M('#efe9df')); box(2.4, 2.47, 2.2, 2.28, 11.07, 12.23, M('#efe9df'));
    box(2.43, 2.5, 1.0, 1.03, 11.95, 12.1, brassM); }
  // RIGHT wall: square doorway to the lounge gets a real glazed steel door (divides, but you still see through)
  box(7.4, 7.6, 0, HP, 13.3, 15.3, plasterM);
  storage(7.4, -1, 12.3, 14.85);
  { const st = M('#1f1f1f', { metalness: 0.5, roughness: 0.4 }), gl = new THREE.MeshPhysicalMaterial({ color: '#dfeff2', transparent: true, opacity: 0.18, roughness: 0.05 });
    for (const [z0, z1] of [[10.92, 11.5], [11.5, 12.08]]) { box(7.47, 7.53, 0.02, 2.38, z0 + 0.01, z1 - 0.01, gl, false);
      for (const z of [z0 + 0.02, z1 - 0.02]) box(7.46, 7.54, 0, 2.4, z - 0.02, z + 0.02, st);
      for (const y of [0.02, 0.9, 1.65, 2.38]) box(7.46, 7.54, y - 0.02, y + 0.02, z0, z1, st); }
    box(7.4, 7.6, 2.38, 2.42, 10.9, 12.1, st); }
  // small check-in desk + bench for helmets
  box(4.2, 5.8, 0, 1.0, 13.1, 13.6, walnutM); box(4.15, 5.85, 1.0, 1.04, 13.05, 13.65, slateM); box(3.0, 4.2, 0, 0.45, 14.45, 14.85, oakM); box(5.6, 6.8, 0, 0.45, 14.45, 14.85, oakM);
  chandelier(4.9, 12.6, 2.6, 0.4, 6, 1.8);
  const l = new THREE.PointLight('#ffe2b8', 2.5, 0, 2); l.position.set(4.85, 3.0, 12.2); scene.add(l);
  }



// ================= wood ceiling over the bar zone
if (showCeiling) { box(9.9, 18.7, HS - 0.04, HS - 0.01, 2.4, 4.9, T(rep(cv(512, 64, (g, w, h) => { g.fillStyle = '#6b4a2e'; g.fillRect(0, 0, w, h); for (let i = 0; i < 60; i++) { g.strokeStyle = `rgba(30,15,5,${rnd() * 0.3})`; g.beginPath(); const y = rnd() * h; g.moveTo(0, y); g.lineTo(w, y + 2); g.stroke(); } }), 2, 8), { roughness: 0.8 }), false);
  for (const x of [11.0, 13.4, 15.8, 18.0]) box(x - 0.13, x + 0.13, HS - 0.3, HS - 0.04, 2.4, 4.9, M('#4e3420', { roughness: 0.9 }), false); }
// ================= COPPER BEER TANKS above the beer end of the bar
{ const cu = M('#e08a52', { metalness: 0.55, roughness: 0.28, emissive: '#5a2a10', emissiveIntensity: 0.35 }), ss = M('#d6d6d6', { metalness: 0.9, roughness: 0.2 }), blk = M('#1f1f1f', { metalness: 0.6, roughness: 0.4 }), Y0 = 2.25;
  box(15.9, 18.7, Y0 - 0.08, Y0, 2.38, 3.3, blk);           // steel shelf
  for (const x of [16.0, 18.6]) box(x - 0.03, x + 0.03, Y0 - 0.5, Y0 - 0.08, 2.38, 2.46, blk);
  for (const [x, n] of [[16.75, '1'], [17.95, '2']]) { const r = 0.45, z = 2.85;
    cyl(x, z, r, Y0, Y0 + 0.55, cu, 40);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(r, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2), cu); dome.scale.y = 0.35; dome.position.set(x, Y0 + 0.55, z); scene.add(dome);
    cyl(x, z, 0.2, Y0 + 0.66, Y0 + 0.7, ss, 32); const wh = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.012, 6, 20), ss); wh.rotation.x = Math.PI / 2; wh.position.set(x, Y0 + 0.74, z); scene.add(wh);
    for (const dx of [-0.25, 0.25]) cyl(x + dx, z - 0.12, 0.05, Y0 + 0.6, Y0 + 0.66, ss, 16);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 0.82, 0.006, 4, 48), M('#3a2516')); ring.rotation.x = Math.PI / 2; ring.position.set(x, Y0 + 0.6, z); ring.scale.set(1, 1, 1); scene.add(ring);
    rod([x, Y0, z + 0.2], [x, Y0 - 0.15, z + 0.25], 0.03, ss); }
  for (const x of [16.6, 18.1]) { const d = new THREE.Mesh(new THREE.CircleGeometry(0.1, 24), new THREE.MeshBasicMaterial({ color: '#ffd59a', toneMapped: false })); d.position.set(x, 1.95, 2.395); scene.add(d); const l = new THREE.PointLight('#ffc98a', 0.8, 0, 2); l.position.set(x, 1.95, 2.6); scene.add(l); } }
// ================= DRIED-GRASS CEILING (Honest Greens style): steel mesh + hanging bunches + terracotta bells
if (false) { const meshM = M('#2a2a2a', { metalness: 0.6, roughness: 0.5 }), Y = HS - 0.35;
  for (let x = 7.8; x <= 18.6; x += 0.5) box(x - 0.006, x + 0.006, Y - 0.006, Y + 0.006, 2.6, 9.6, meshM, false);
  for (let z = 2.6; z <= 9.6; z += 0.5) box(7.8, 18.6, Y - 0.006, Y + 0.006, z - 0.006, z + 0.006, meshM, false);
  const grass = ['#c9b07a', '#b89a5c', '#d8c38f', '#a68a4e', '#8f8a52', '#bfa36a'];
  for (let i = 0; i < 70; i++) { const x = 8.0 + rnd() * 10.4, z = 4.6 + rnd() * 4.9, n = 18 + Math.floor(rnd() * 14), L = 0.45 + rnd() * 0.6, c = grass[Math.floor(rnd() * grass.length)];
    const gm = M(c, { roughness: 1 });
    for (let k = 0; k < n; k++) { const a = rnd() * Math.PI * 2, r = rnd() * 0.22, l = L * (0.6 + rnd() * 0.5);
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.012, l, 4), gm); st.position.set(x + Math.cos(a) * r, Y - l / 2, z + Math.sin(a) * r); st.rotation.x = (rnd() - 0.5) * 0.35; st.rotation.z = (rnd() - 0.5) * 0.35; scene.add(st);
      if (rnd() < 0.35) { const sp = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), gm); sp.scale.y = 3; sp.position.set(st.position.x, Y - l, st.position.z); scene.add(sp); } } }
  const terr = M('#b5663f', { roughness: 0.9, side: THREE.DoubleSide });
  for (const [x, z] of [[9.3, 6.0], [10.8, 6.0], [12.3, 6.0], [9.3, 8.6], [10.8, 8.6], [12.3, 8.6], [15.6, 7.4], [17.0, 7.4]]) {
    cyl(x, z, 0.025, 2.0, HS, M('#c8b48a', { roughness: 1 }), 8);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), terr); b.scale.y = 1.25; b.position.set(x, 1.85, z); scene.add(b);
    const l = new THREE.PointLight('#ffc98a', 1.6, 0, 2); l.position.set(x, 1.75, z); scene.add(l); } }
// ---------------------------------------------------------------- lights
scene.add(new THREE.HemisphereLight('#fff0d8', '#8a6a4a', 0.6));
const sun = new THREE.DirectionalLight('#ffe6c0', 1.6);
sun.position.set(5, 11, 24); sun.target.position.set(13, 0, 8); scene.add(sun.target);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -13, right: 13, top: 13, bottom: -13, near: 1, far: 60 }); sun.shadow.bias = -0.0005; scene.add(sun);

// ---------------------------------------------------------------- cameras
const cams = {
  bar:    { pos: [13.8, 1.6, 9.4], at: [14.2, 1.3, 2.8], fov: 74 },
  tank: { pos: [15.2, 1.5, 5.6], at: [17.2, 2.4, 2.6], fov: 62 },
  barblu: { pos: [15.6, 1.55, 6.6], at: [15.4, 1.45, 2.4], fov: 70 },
  vicino: { pos: [13.5, 1.0, 6.3], at: [13.5, 0.6, 4.3], fov: 72 },
  bancone: { pos: [14.3, 1.25, 8.6], at: [14.3, 0.75, 4.0], fov: 66 },
  bancone2: { pos: [11.2, 1.0, 6.2], at: [16.5, 0.65, 4.2], fov: 60 },
  passe:  { pos: [8.4, 1.7, 6.3], at: [11.6, 1.1, 3.2], fov: 64 },
  piantabar: { pos: [13.6, 10.5, 7.6], at: [13.6, 0, 3.3], fov: 50 },
  soffitto: { pos: [17.9, 1.45, 9.2], at: [9.0, 2.2, 5.6], fov: 70 },
  sala:   { pos: [17.6, 1.65, 9.1], at: [8.0, 1.2, 6.0], fov: 66 },
  lounge: { pos: [8.6, 1.65, 10.35], at: [18.0, 0.8, 12.2], fov: 66 },
  aperto: { pos: [13.0, 1.6, 12.8], at: [12.6, 1.3, 4.0], fov: 66 },
  ingresso: { pos: [4.9, 1.6, 15.0], at: [4.9, 1.55, 10.9], fov: 74 },
  pista: { pos: [8.4, 1.65, 10.4], at: [17.5, 0.8, 11.8], fov: 66 },
  pista2: { pos: [17.3, 1.6, 10.3], at: [8.5, 0.6, 12.2], fov: 66 },
  lounge3: { pos: [17.6, 1.5, 10.5], at: [9.5, 0.4, 12.6], fov: 66 },
  ingresso2: { pos: [6.6, 1.65, 14.9], at: [3.4, 1.3, 11.6], fov: 72 },
  ingresso3: { pos: [3.2, 1.65, 14.9], at: [6.8, 1.3, 11.6], fov: 72 },
  top:    { pos: [3.5, 16, 21], at: [12.8, 0, 6.2], fov: 45 },
  pianta: { pos: [10.6, 30, 8.6], at: [10.6, 0, 8.4], fov: 44 },
};
const c = cams[VIEW];
const camera = new THREE.PerspectiveCamera(c.fov, W / H, 0.05, 200);
camera.position.set(...c.pos); camera.lookAt(...c.at);
renderer.render(scene, camera);
window.done = true;
