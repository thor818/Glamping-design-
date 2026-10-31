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
  const s = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.24, 0.26, 18, 1, true), new THREE.MeshStandardMaterial({ color: '#f1e6cf', roughness: 1, side: THREE.DoubleSide, emissive: '#ffcf8a', emissiveIntensity: 0.35, flatShading: true })); s.position.set(x, y, z); scene.add(s);
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
const beamM = M('#8a6644', { roughness: 0.8 });

function chandelier(x, z, y, r = 0.38, n = 6, lightI = 2.2) {
  cyl(x, z, 0.008, y + 0.05, HS, ironM, 6);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.015, 8, 40), ironM); ring.rotation.x = Math.PI / 2; ring.position.set(x, y, z); scene.add(ring);
  for (let i = 0; i < n; i++) { const a = i * 2 * Math.PI / n, px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
    cyl(px, pz, 0.025, y, y + 0.12, M('#f4efe2'), 10);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffe2a8', toneMapped: false })); b.scale.y = 1.6; b.position.set(px, y + 0.16, pz); scene.add(b); }
  const l = new THREE.PointLight('#ffcc88', lightI, 0, 2); l.position.set(x, y - 0.1, z); scene.add(l);
}

const oakM = T(rep(cv(512, 128, (g, w, h) => { g.fillStyle = '#b98d5e'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 120; i++) { g.strokeStyle = `rgba(110,70,35,${0.08 + rnd() * 0.18})`; g.lineWidth = 0.5 + rnd() * 1.5; const y = rnd() * h; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(w / 3, y + 5 * rnd(), w * 0.6, y - 5 * rnd(), w, y + 2); g.stroke(); } }), 1, 1), { roughness: 0.55 });
const texBoucle = (base) => rep(cv(128, 128, (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${rnd() > 0.5 ? '255,255,255' : '0,0,0'},${rnd() * 0.09})`; g.beginPath(); g.arc(rnd() * w, rnd() * h, 1 + rnd() * 2.5, 0, 7); g.fill(); } }), 4, 4);
function boucle(c) { return T(texBoucle(c), { roughness: 1 }); }
function floorLantern(x, z, h = 1.2) { cyl(x, z, 0.012, 0, 0.3, M('#222'), 6);
  const s = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, h - 0.3, 32), new THREE.MeshStandardMaterial({ color: '#fbf6ec', emissive: '#ffe1b5', emissiveIntensity: 0.9 })); s.position.set(x, 0.3 + (h - 0.3) / 2, z); scene.add(s);
  const l = new THREE.PointLight('#ffd09a', 1.3, 0, 2); l.position.set(x, h * 0.7, z); scene.add(l); }
function roundTable(x, z, r, h, m) { cyl(x, z, r, h - 0.05, h, m, 40); cyl(x, z, r * 0.45, 0, h - 0.05, m, 32, r * 0.35); }
function pillow(x, y, z, w, c) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.4, w), c); p.position.set(x, y, z); p.rotation.z = -0.25; p.castShadow = true; scene.add(p); }
function carvedPanelTex(base, accent) { return cv(1024, 512, (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(110,60,30,${0.15 + rnd() * 0.4})`; g.beginPath(); g.ellipse(rnd() * w, rnd() * h, 2 + rnd() * 9, 1 + rnd() * 3, rnd() * 3, 0, 7); g.fill(); }
  for (const cx of [w * 0.17, w * 0.5, w * 0.83]) { const rw = cx === w * 0.5 ? w * 0.18 : w * 0.13;
    g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 7; g.beginPath(); g.ellipse(cx, h * 0.55, rw, h * 0.32, 0, 0, 7); g.stroke(); g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 4; g.beginPath(); g.ellipse(cx, h * 0.55, rw - 10, h * 0.32 - 10, 0, 0, 7); g.stroke();
    for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5; g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 3; g.beginPath(); g.moveTo(cx, h * 0.55); g.lineTo(cx + Math.cos(a) * rw * 0.8, h * 0.55 + Math.sin(a) * h * 0.26); g.stroke(); }
    g.fillStyle = accent; g.beginPath(); g.arc(cx, h * 0.55, 22, 0, 7); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 3; g.stroke(); } }); }
// ================================================================ REAL BEDROOMS (first floor 1:50) – two versions: Damonte (dm) / ours (ns)
const [TYPE, STY] = VIEW.split('-');      // ant | mod | bagno ; dm | ns
const DM = STY === 'dm', HS = 2.8, HP = 2.8;
const RM = { ant: { W: 4.25, D: 3.10 }, mod: { W: 3.25, D: 4.05 }, bagno: { W: 1.50, D: 2.05 } }[TYPE];
const W0 = RM.W, D0 = RM.D;
const linenW = T(texLinen, { roughness: 1 });
// floors: ours = oak planks (as asked for the rooms), Damonte = pink herringbone cotto like her plan
const plank = rep(cv(512, 512, (g, w, h) => { const n = 8, ph = h / n; for (let r = 0; r < n; r++) { let x = -rnd() * 200; while (x < w) { const L = 180 + rnd() * 220; g.fillStyle = `hsl(${30 + rnd() * 6},${38 + rnd() * 10}%,${50 + rnd() * 10}%)`; g.fillRect(x, r * ph, L, ph);
  for (let k = 0; k < 6; k++) { g.strokeStyle = `rgba(110,70,35,${0.08 + rnd() * 0.15})`; g.lineWidth = 1; const yy = r * ph + rnd() * ph; g.beginPath(); g.moveTo(x, yy); g.lineTo(x + L, yy + rnd() * 4); g.stroke(); }
  g.fillStyle = 'rgba(60,35,15,0.45)'; g.fillRect(x, r * ph, 2, ph); x += L; } g.fillStyle = 'rgba(60,35,15,0.35)'; g.fillRect(0, r * ph, w, 2); } }), W0 / 2.2, D0 / 2.2);
const herring = rep(cv(512, 512, (g, w, h) => { g.fillStyle = '#d9c3ad'; g.fillRect(0, 0, w, h); const s = 32;
  for (let y = -4 * s; y < h + 4 * s; y += s) for (let x = -4 * s; x < w + 4 * s; x += 2 * s) { for (const [dx, rot] of [[0, 1], [s, -1]]) { g.save(); g.translate(x + dx, y + (rot > 0 ? 0 : s)); g.rotate(rot * Math.PI / 4); g.fillStyle = `hsl(${12 + rnd() * 8},${35 + rnd() * 15}%,${62 + rnd() * 8}%)`; g.fillRect(1, 1, s * 2 - 2, s - 2); g.restore(); } } }), W0 / 1.4, D0 / 1.4);
const stripeT = rep(cv(128, 64, (g, w, h) => { for (let x = 0; x < w; x += 16) { g.fillStyle = (x / 16) % 2 ? '#f1ece2' : '#3f6b4a'; g.fillRect(x, 0, 16, h); } g.fillStyle = 'rgba(255,255,255,0.15)'; for (let x = 2; x < w; x += 16) g.fillRect(x, 0, 2, h); }), 6, 1);
{ const fm = TYPE === 'bagno' ? (DM ? T(rep(cv(128, 128, (g, w, h) => { for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = (x + y) % 2 ? '#f1ece2' : '#2f5a40'; g.fillRect(x * 32, y * 32, 32, 32); } }), 4, 5), { roughness: 0.3 }) : T(texTileW, { roughness: 0.3 })) : T(DM ? herring : plank, { roughness: 0.6 });
  const f = new THREE.Mesh(new THREE.PlaneGeometry(W0, D0), fm); f.rotation.x = -Math.PI / 2; f.position.set(W0 / 2, 0, D0 / 2); f.receiveShadow = true; scene.add(f); }
// walls: lime plaster (Damonte warm greige, ours Ligurian white with a painted headboard wall)
const wallM = T(texPlaster, { color: DM ? '#e6d8c6' : '#f7f3ec', roughness: 0.97 });
// window wall: ant = south (z = D0, terrace French door), mod = north (z = 0, street), bagno = small window north
const winZ = TYPE === 'ant' ? D0 : 0, winX0 = TYPE === 'ant' ? 0.7 : 1.0, winX1 = TYPE === 'ant' ? 1.9 : 2.2, winY0 = TYPE === 'ant' ? 0 : 0.9, winY1 = TYPE === 'bagno' ? 2.0 : 2.3;
const wz = (z) => z === 0 ? [-0.2, 0] : [D0, D0 + 0.2];
if (TYPE === 'bagno') { box(-0.2, W0 + 0.2, 0, HS, ...wz(0), wallM); }
else { const [a, b] = wz(winZ); box(-0.2, winX0, 0, HS, a, b, wallM); box(winX1, W0 + 0.2, 0, HS, a, b, wallM); box(winX0, winX1, winY1, HS, a, b, wallM); if (winY0 > 0) box(winX0, winX1, 0, winY0, a, b, wallM);
  box(winX0, winX1, winY0, winY1, (a + b) / 2 - 0.01, (a + b) / 2 + 0.01, new THREE.MeshPhysicalMaterial({ color: '#dfeff2', transparent: true, opacity: 0.15 }), false);
  for (const x of [winX0, (winX0 + winX1) / 2, winX1]) box(x - 0.03, x + 0.03, winY0, winY1, (a + b) / 2 - 0.03, (a + b) / 2 + 0.03, M('#f4f1ea'));
  const cur = new THREE.MeshStandardMaterial({ color: DM ? '#efe4d2' : '#fbf8f1', transparent: true, opacity: 0.75, side: THREE.DoubleSide });
  for (const cx of [winX0 - 0.15, winX1 + 0.15]) { const geo = new THREE.PlaneGeometry(0.5, 2.6, 24, 1), p = geo.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 40) * 0.03); const c = new THREE.Mesh(geo, cur); c.position.set(cx, 1.4, winZ === 0 ? 0.12 : D0 - 0.12); scene.add(c); }
  wallPlane(winZ === 0 ? 'N' : 'S', W0 / 2, winZ === 0 ? -3 : D0 + 3, 30, -3, 8, new THREE.MeshBasicMaterial({ map: texGarden, toneMapped: false })); }
const otherZ = (TYPE === 'ant') ? 0 : D0; box(-0.2, W0 + 0.2, 0, HS, ...wz(otherZ), wallM);
if (TYPE === 'bagno') box(-0.2, W0 + 0.2, 0, HS, ...wz(D0), wallM);
box(-0.2, 0, 0, HS, 0, D0, wallM); box(W0, W0 + 0.2, 0, HS, 0, D0, wallM);
box(-0.2, W0 + 0.2, HS, HS + 0.1, -0.2, D0 + 0.2, T(texPlaster, { color: '#faf7f1' }), false);
// door to the corridor (on the non-window wall, right side)
{ const dz = otherZ === 0 ? 0.01 : D0 - 0.01, dx = W0 - 0.6; box(dx - 0.42, dx + 0.42, 0, 2.1, dz - 0.02, dz + 0.02, DM ? oakM : walnutM); cyl(dx - 0.3, dz + (otherZ === 0 ? 0.04 : -0.04), 0.025, 1.0, 1.05, brassM, 8); }
function rattanPendant(x, z, y, r) { cyl(x, z, 0.006, y + 0.2, HS, M('#222'), 6); const s = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), T(texStraw, { side: THREE.DoubleSide })); s.scale.y = 0.45; s.position.set(x, y, z); scene.add(s);
  const l = new THREE.PointLight('#ffcf94', 1.6, 0, 2); l.position.set(x, y - 0.15, z); scene.add(l); }
function terraLamp(x, y, z) { cyl(x, z, 0.1, y, y + 0.28, M('#9a3b22', { roughness: 0.35 }), 20, 0.07); const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.17, 0.2, 24, 1, true), M('#efe6d6', { side: THREE.DoubleSide, emissive: '#ffd9a0', emissiveIntensity: 0.6 })); sh.position.set(x, y + 0.38, z); scene.add(sh);
  const l = new THREE.PointLight('#ffd09a', 0.8, 0, 2); l.position.set(x, y + 0.4, z); scene.add(l); }
// a generic low upholstered bed (Damonte) with head on x = 0 wall
function dmBed(zc, w = 1.6, L = 2.05) { const up = boucle('#ede4d4'); box(0.02, 0.16, 0, 1.15, zc - w / 2 - 0.1, zc + w / 2 + 0.1, up);
  box(0.16, L, 0.12, 0.34, zc - w / 2, zc + w / 2, up); box(0.18, L - 0.02, 0.34, 0.55, zc - w / 2 + 0.03, zc + w / 2 - 0.03, linenW);
  box(1.0, L + 0.03, 0.55, 0.6, zc - w / 2 - 0.02, zc + w / 2 + 0.02, boucle('#c9a27a')); pillow(0.32, 0.72, zc - w / 4, w / 2 - 0.1, linenW); pillow(0.32, 0.72, zc + w / 4, w / 2 - 0.1, linenW);
  for (const z of [zc - w / 2 - 0.45, zc + w / 2 + 0.45]) { cyl(0.3, z, 0.24, 0, 0.5, oakM, 24); terraLamp(0.3, 0.5, z); }
  const st = boucle('#efe8dc'); cyl(L + 0.45, zc, 0.28, 0, 0.42, st, 24); }
// our antique carved white bed (from your photos) – head on x = 0 wall
function antBed(zc) { const white = '#efe9dc', wm = M(white, { roughness: 0.6 }), hw = 0.98, L = 2.05, W = 1.75;
  const sh = new THREE.Shape(); sh.moveTo(-hw, 0); sh.lineTo(-hw, 0.95); sh.bezierCurveTo(-hw * 0.7, 1.15, -hw * 0.35, 1.0, -0.15, 1.2); sh.quadraticCurveTo(0, 1.38, 0.15, 1.2); sh.bezierCurveTo(hw * 0.35, 1.0, hw * 0.7, 1.15, hw, 0.95); sh.lineTo(hw, 0); sh.lineTo(-hw, 0);
  const g = new THREE.ExtrudeGeometry(sh, { depth: 0.07, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2 }); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) + hw) / (2 * hw), uv.getY(i) / 1.38);
  const m = new THREE.Mesh(g, [T(carvedPanelTex(white, '#f7f2e8'), { roughness: 0.6 }), wm]); m.rotation.y = Math.PI / 2; m.position.set(0.04, 0, zc); m.castShadow = true; scene.add(m);
  box(0.12, L, 0.25, 0.32, zc - W / 2, zc + W / 2, wm); box(0.14, L - 0.02, 0.32, 0.57, zc - W / 2 + 0.03, zc + W / 2 - 0.03, linenW); box(0.75, L - 0.02, 0.57, 0.65, zc - W / 2 - 0.03, zc + W / 2 + 0.03, T(kilim('#5a7fb0', '#efe6d6', '#c9b48a'), { roughness: 1 }));
  box(L - 0.02, L + 0.05, 0, 0.62, zc - W / 2, zc + W / 2, wm);
  pillow(0.3, 0.78, zc - 0.42, 0.65, linenW); pillow(0.3, 0.78, zc + 0.42, 0.65, linenW);
  for (const z of [zc - 1.2, zc + 1.2]) { box(0.02, 0.47, 0.12, 0.62, z - 0.22, z + 0.22, wm); box(0.0, 0.49, 0.62, 0.66, z - 0.24, z + 0.24, M('#d9c3a0', { roughness: 0.2 })); tableLamp(0.24, 0.66, z); } }

if (TYPE === 'ant') {
  const zc = 1.55;
  if (DM) { dmBed(zc); wallPlane('E', 0.005, zc, 2.6, 0, HS, T(texPlaster, { color: '#d8c3a8' }));
    box(2.6, 3.9, 0, 0.75, 0.02, 0.45, oakM); for (let i = 0; i < 3; i++) box(2.65 + i * 0.42, 3.03 + i * 0.42, 0.08, 0.7, 0.45, 0.46, M('#a07a50'));
    { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.03, 10, 40), M('#9a6a3a', { roughness: 0.5 })); ring.position.set(3.25, 1.5, 0.03); scene.add(ring); const mir = new THREE.Mesh(new THREE.CircleGeometry(0.38, 40), M('#cfd8da', { metalness: 0.3, roughness: 0.1 })); mir.position.set(3.25, 1.5, 0.025); scene.add(mir); }
    rattanPendant(1.4, zc, 2.2, 0.55); const rug = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.6), boucle('#cdb79a')); rug.rotation.x = -Math.PI / 2; rug.position.set(1.4, 0.006, zc); scene.add(rug);
    box(3.6, 4.2, 0, 0.45, 2.3, 2.95, oakM); cyl(3.9, 2.6, 0.12, 0.45, 1.3, M('#b9673d'), 12, 0.06); }
  else { antBed(zc); wallPlane('E', 0.005, zc, 3.1, 0, HS, T(texPlaster, { color: '#e9cfc0' }));
    box(2.4, 3.9, 0.15, 0.9, 0.02, 0.5, T(carvedPanelTex('#efe9dc', '#3b2a20'), { roughness: 0.6 })); box(2.38, 3.92, 0.9, 0.95, 0.0, 0.52, M('#d9c3a0', { roughness: 0.15 }));
    { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.06, 12, 40), M('#c9a24a', { metalness: 0.9, roughness: 0.3 })); ring.scale.set(1, 1.3, 1); ring.position.set(3.15, 1.65, 0.04); scene.add(ring); const mir = new THREE.Mesh(new THREE.CircleGeometry(0.38, 40), M('#cfd8da', { metalness: 0.3, roughness: 0.1 })); mir.scale.set(1, 1.3, 1); mir.position.set(3.15, 1.65, 0.035); scene.add(mir); }
    chandelier(1.4, zc, 2.25, 0.35, 6, 1.6); const rug = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.2), T(kilim('#b5482f', '#efe6d6', '#2f4a6e'), { roughness: 1 })); rug.rotation.x = -Math.PI / 2; rug.position.set(2.4, 0.006, zc); scene.add(rug);
    const ch = boucle('#d9693a'); box(3.4, 4.1, 0.15, 0.45, 2.2, 2.9, ch); box(3.95, 4.1, 0.45, 0.95, 2.2, 2.9, ch); }
}
if (TYPE === 'mod') {
  const zc = 2.2;
  if (DM) { dmBed(zc); wallPlane('E', 0.005, zc, 2.6, 0, HS, T(texPlaster, { color: '#d8c3a8' }));
    box(0.75, 1.95, 0, 2.3, 3.45, 4.03, oakM); for (const x of [1.15, 1.55]) box(x - 0.005, x + 0.005, 0.05, 2.25, 3.44, 3.45, M('#8a6a44'));
    box(2.4, 3.2, 0.72, 0.76, 0.05, 0.6, oakM); cyl(2.6, 0.4, 0.02, 0, 0.72, ironM, 6); cyl(3.05, 0.4, 0.02, 0, 0.72, ironM, 6); terraLamp(3.0, 0.76, 0.25);
    rattanPendant(1.3, zc, 2.2, 0.55); }
  else { const panel = M('#f4f1ea', { roughness: 0.5 }), green = M('#8a9a5b', { roughness: 0.6 });
    box(0.0, 0.45, 0, 2.3, 1.1, 3.3, panel); wallPlane('E', 0.452, 2.2, 2.2, 0.05, 2.25, T(cv(512, 512, (g, w, h) => { g.fillStyle = '#8a9a5b'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 3; g.strokeRect(4, 4, w - 8, h - 8); g.beginPath(); g.moveTo(0, h * 0.22); g.lineTo(w, h * 0.22); g.stroke(); g.fillStyle = '#c9a24a'; g.fillRect(w * 0.48, h * 0.55, w * 0.04, h * 0.1); }), { roughness: 0.5 }));
    const sf = boucle('#d9693a'); box(0.5, 1.35, 0.15, 0.45, 1.25, 3.15, sf); box(0.5, 0.72, 0.45, 0.9, 1.25, 3.15, sf);
    roundTable(1.9, 2.2, 0.35, 0.4, oakM); box(0.6, 1.8, 0, 2.4, 3.45, 4.03, panel); for (const x of [1.0, 1.4]) box(x - 0.005, x + 0.005, 0.05, 2.35, 3.44, 3.45, M('#ccc'));
    bike(3.17, 1.5, 1.35, '#c0392b'); wallPlane('E', 0.46, 2.2, 0.01, 0, 0.01, panel);
    const pl = new THREE.Mesh(new THREE.SphereGeometry(0.25, 24, 16), new THREE.MeshStandardMaterial({ color: '#fbf6ec', emissive: '#ffe1b5', emissiveIntensity: 0.8 })); pl.position.set(1.6, 2.35, 2.0); scene.add(pl); const l = new THREE.PointLight('#ffd9a6', 1.8, 0, 2); l.position.set(1.6, 2.1, 2.0); scene.add(l);
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2.2), boucle('#d8c7aa')); rug.rotation.x = -Math.PI / 2; rug.position.set(1.6, 0.006, 2.2); scene.add(rug); }
}
if (TYPE === 'bagno') {
  if (DM) { for (const [face, cx, cz, w] of [['E', 0.005, D0 / 2, D0], ['W', W0 - 0.005, D0 / 2, D0], ['N', W0 / 2, 0.005, W0]]) wallPlane(face, cx, cz, w, 0, 1.3, T(stripeT.clone(), { roughness: 0.2 }));
    box(0.05, 1.45, 0.82, 0.88, 0.02, 0.5, oakM); const sink = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M('#a3262a', { roughness: 0.25 })); sink.position.set(0.75, 1.05, 0.25); scene.add(sink);
    { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.025, 10, 40), M('#9a6a3a')); ring.scale.set(1, 1.35, 1); ring.position.set(0.75, 1.75, 0.03); scene.add(ring); const mir = new THREE.Mesh(new THREE.CircleGeometry(0.29, 40), M('#cfd8da', { metalness: 0.3, roughness: 0.1 })); mir.scale.set(1, 1.35, 1); mir.position.set(0.75, 1.75, 0.025); scene.add(mir); }
    for (const x of [0.3, 1.2]) { const sc = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.2, 16, 1, true), M('#b9673d', { side: THREE.DoubleSide, emissive: '#ff9a50', emissiveIntensity: 0.4 })); sc.position.set(x, 1.85, 0.06); scene.add(sc); }
    const wc = M('#2f5a40', { roughness: 0.25 }); box(1.0, 1.4, 0, 0.42, 0.7, 1.25, wc); }
  else { wallPlane('N', W0 / 2, 0.005, W0, 0, 2.2, T(texTileW, { roughness: 0.3 })); wallPlane('E', 0.005, D0 / 2, D0, 0, 2.2, T(texTileW, { roughness: 0.3 }));
    box(0.05, 1.2, 0.5, 0.55, 0.02, 0.5, oakM); cyl(0.6, 0.25, 0.2, 0.55, 0.68, M('#f4f1ea', { roughness: 0.2 }), 24);
    const mir = new THREE.Mesh(new THREE.CircleGeometry(0.33, 40), M('#cfd8da', { metalness: 0.3, roughness: 0.1 })); mir.position.set(0.6, 1.55, 0.02); scene.add(mir);
    wallPlane('W', W0 - 0.005, D0 - 0.6, 1.1, 0, 2.2, M('#d9764a', { roughness: 0.4 })); box(0.3, W0, 0.0, 2.1, D0 - 1.15, D0 - 1.13, new THREE.MeshPhysicalMaterial({ color: '#e0f0f4', transparent: true, opacity: 0.2 }), false);
    box(0.4, 0.8, 0, 0.42, 0.75, 1.25, M('#f4f1ea', { roughness: 0.2 })); }
  const l = new THREE.PointLight('#fff0d8', 1.8, 0, 2); l.position.set(W0 / 2, 2.3, D0 / 2); scene.add(l);
}
scene.add(new THREE.HemisphereLight('#fff0d8', '#8a6a4a', 0.75));
const sun = new THREE.DirectionalLight('#ffe6c0', 1.6); sun.position.set(W0 / 2 + 2, 6, winZ === 0 ? -8 : D0 + 8); sun.target.position.set(W0 / 2, 0, D0 / 2); scene.add(sun.target);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 40 }); sun.shadow.bias = -0.0005; scene.add(sun);
const CAM = { ant: [[W0 - 0.3, 1.6, D0 - 0.3], [0.6, 0.9, 1.0], 76], mod: [[W0 - 0.25, 1.6, D0 - 0.25], [0.3, 0.9, 1.7], 76], bagno: [[W0 - 0.15, 1.6, D0 - 0.15], [0.5, 1.1, 0.2], 80] }[TYPE];
const camera = new THREE.PerspectiveCamera(CAM[2], W / H, 0.05, 200); camera.position.set(...CAM[0]); camera.lookAt(...CAM[1]);
renderer.render(scene, camera);
window.done = true;
