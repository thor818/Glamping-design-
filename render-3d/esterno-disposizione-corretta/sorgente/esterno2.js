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

// ================================================================ EXTERIOR – Ligurian facade colours
const HS = 3.2;
const COL = { giallo: '#ffc21a', rosso: '#e0352a', arancio: '#ff7a1f', rosa: '#f08a8a' }[VIEW.split('-')[1] || 'giallo'];
const facade = T(rep(cv(256, 256, (g, w, h) => { g.fillStyle = COL; g.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${rnd() > 0.5 ? '255,255,255' : '80,40,20'},${rnd() * 0.03})`; g.beginPath(); g.arc(rnd() * w, rnd() * h, 2 + rnd() * 18, 0, 7); g.fill(); } }), 3, 2), { roughness: 0.95, emissive: COL, emissiveIntensity: 0.12 });
const trim = M('#ffffff', { roughness: 0.7 }), shut = M('#2e8a4e', { roughness: 0.5 }), roofM = M('#d2552f', { roughness: 0.8 });
// main house (2 floors) x 0..18.7, z 0..10.5 ; gable roof along x
const H2 = 6.4;
box(0, 18.7, 0, H2, 0, 10.5, facade);
box(-0.05, 18.75, 0, 0.6, -0.05, 10.55, stoneM(40, 1));
{ const sh = new THREE.Shape(); sh.moveTo(-0.6, 0); sh.lineTo(5.25 + 0.6, 0); sh.lineTo(5.25, 0); sh.moveTo(-0.6, 0); sh.lineTo(11.1, 0); sh.lineTo(5.25, 2.6); sh.lineTo(-0.6, 0);
  const g = new THREE.ExtrudeGeometry(sh, { depth: 19.9, bevelEnabled: false }); const r = new THREE.Mesh(g, roofM); r.rotation.y = -Math.PI / 2; r.position.set(19.3, H2, -0.3); r.castShadow = true; scene.add(r);
  const gs = new THREE.Shape(); gs.moveTo(0, 0); gs.lineTo(10.5, 0); gs.lineTo(5.25, 2.3); gs.lineTo(0, 0); for (const x of [0.01, 18.69]) { const gm = new THREE.Mesh(new THREE.ShapeGeometry(gs), facade); gm.rotation.y = -Math.PI / 2; gm.position.set(x === 0.01 ? -0.01 : 18.71, H2, 0); if (x !== 0.01) gm.rotation.y = Math.PI / 2, gm.position.set(18.71, H2, 10.5); scene.add(gm); } }
box(-0.1, 18.8, H2 - 0.12, H2, -0.1, 10.6, trim);
// windows on the south facade (z = 10.5): white frames + green shutters ; arched door
function win(x, y, w = 1.1, h = 1.4) { box(x - w / 2 - 0.12, x + w / 2 + 0.12, y - 0.12, y + h + 0.12, 10.5, 10.56, trim); box(x - w / 2, x + w / 2, y, y + h, 10.55, 10.58, M('#2f3a3a', { roughness: 0.2 }));
  box(x - 0.02, x + 0.02, y, y + h, 10.57, 10.6, trim); for (const sx of [x - w / 2 - 0.55, x + w / 2 + 0.03]) { box(sx, sx + 0.52, y, y + h, 10.56, 10.62, shut); for (let yy = y + 0.1; yy < y + h; yy += 0.12) box(sx + 0.04, sx + 0.48, yy, yy + 0.02, 10.62, 10.63, M('#2c4433')); } }
for (const x of [2.5, 6.5, 10.5, 14.5]) win(x, 4.2);
win(2.5, 1.3);
// arched door
{ const sh = new THREE.Shape(); archPath(sh, -0.6, 0.6, 1.9); const d = new THREE.Mesh(new THREE.ShapeGeometry(sh), walnutM); d.position.set(4.9, 0, 10.56); scene.add(d);
  const ring = new THREE.Shape(); ring.moveTo(-0.78, 0); ring.lineTo(-0.78, 1.9); ring.absarc(0, 1.9, 0.78, Math.PI, 0, true); ring.lineTo(0.78, 0); ring.lineTo(0.6, 0); ring.lineTo(0.6, 1.9); ring.absarc(0, 1.9, 0.6, 0, Math.PI, false); ring.lineTo(-0.78, 0);
  const rm = new THREE.Mesh(new THREE.ShapeGeometry(ring), trim); rm.position.set(4.9, 0, 10.555); scene.add(rm); }
// porticato with big arched glazing + tent canopy in front (ground floor right side)
for (const x of [9.0, 12.0, 15.0]) { const sh = new THREE.Shape(); archPath(sh, -1.2, 1.2, 1.6); const g = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshPhysicalMaterial({ color: '#cfe0e6', roughness: 0.1, metalness: 0.2 })); g.position.set(x, 0.6, 10.57); scene.add(g);
  const ring = new THREE.Shape(); ring.moveTo(-1.35, 0); ring.lineTo(-1.35, 1.6); ring.absarc(0, 1.6, 1.35, Math.PI, 0, true); ring.lineTo(1.35, 0); ring.lineTo(1.2, 0); ring.lineTo(1.2, 1.6); ring.absarc(0, 1.6, 1.2, 0, Math.PI, false); ring.lineTo(-1.35, 0);
  const rm = new THREE.Mesh(new THREE.ShapeGeometry(ring), trim); rm.position.set(x, 0.6, 10.565); scene.add(rm); }

// ================================================================ OUTDOOR in the "Sleeping Giant" mood, adapted to the real site
const SERA = VIEW.includes('sera');
const glow = (c) => new THREE.MeshBasicMaterial({ color: c, toneMapped: false });
const grassM = T(rep(cv(256, 256, (g, w, h) => { g.fillStyle = '#7f8f55'; g.fillRect(0, 0, w, h); for (let i = 0; i < 2500; i++) { g.fillStyle = `hsl(${70 + rnd() * 25},${25 + rnd() * 20}%,${28 + rnd() * 18}%)`; g.fillRect(rnd() * w, rnd() * h, 1.5, 3); } }), 30, 30), { roughness: 1 });
const gravelM = T(rep(cv(256, 256, (g, w, h) => { g.fillStyle = '#d8ccb2'; g.fillRect(0, 0, w, h); for (let i = 0; i < 3000; i++) { g.fillStyle = `hsl(${30 + rnd() * 15},${10 + rnd() * 15}%,${60 + rnd() * 25}%)`; g.beginPath(); g.arc(rnd() * w, rnd() * h, 0.8 + rnd() * 1.8, 0, 7); g.fill(); } }), 8, 8), { roughness: 1 });
const travM = T(rep(cv(256, 256, (g, w, h) => { g.fillStyle = '#e6dac4'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 64) for (let x = 0; x < w; x += 128) { g.fillStyle = `hsl(35,${20 + rnd() * 10}%,${80 + rnd() * 8}%)`; g.fillRect(x + ((y / 64) % 2) * 64 + 1, y + 1, 126, 62); for (let i = 0; i < 12; i++) { g.strokeStyle = 'rgba(150,120,80,0.15)'; g.beginPath(); const yy = y + rnd() * 64; g.moveTo(x, yy); g.lineTo(x + 128, yy + 3); g.stroke(); } } }), 6, 6), { roughness: 0.8 });
const terraM = T(rep(cv(256, 256, (g, w, h) => { for (let y = 0; y < h; y += 32) for (let x = 0; x < w; x += 32) { g.fillStyle = `hsl(${14 + rnd() * 8},${45 + rnd() * 15}%,${40 + rnd() * 10}%)`; g.fillRect(x + 1, y + 1, 30, 30); } }), 4, 2), { roughness: 0.5 });
const waterM = new THREE.MeshPhysicalMaterial({ color: '#4fb8c9', roughness: 0.05, metalness: 0.1, clearcoat: 1 });
const linenM = M('#f1ebdf', { roughness: 1 }), creamM = boucle('#e9dfcc'), orangeM = boucle('#d0652a'), rustM = boucle('#a8502c'), sageM = boucle('#9aa07a');
const reedM = T(rep(texStraw.clone(), 6, 6), { roughness: 1, side: THREE.DoubleSide });
const canvasM = M('#efe7d6', { roughness: 0.95, side: THREE.DoubleSide });
const copperM = M('#b4693a', { metalness: 0.8, roughness: 0.35 });
const stoneW = (w, h) => stoneM(w, h);

function olive(x, y, z, s = 1) { const tr = M('#5e5244', { roughness: 1 });
  for (let k = 0; k < 2; k++) { const t = cyl(x + (k - 0.5) * 0.15 * s, z, 0.13 * s, y, y + 1.4 * s, tr, 7, 0.09 * s); t.rotation.z = (k - 0.5) * 0.35; }
  for (let i = 0; i < 9; i++) { const lf = new THREE.Mesh(new THREE.SphereGeometry((0.6 + rnd() * 0.35) * s, 9, 7), M(rnd() > 0.5 ? '#8b9a72' : '#768561', { roughness: 1 }));
    lf.scale.y = 0.7; lf.position.set(x + (rnd() - 0.5) * 2.2 * s, y + (1.7 + rnd() * 0.9) * s, z + (rnd() - 0.5) * 2.2 * s); lf.castShadow = true; scene.add(lf); } }
function bellTent(x, y, z, r = 2.6) { box(x - r - 0.6, x + r + 0.6, y, y + 0.35, z - r - 0.6, z + r + 1.6, oakM);
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.75, 32, 1, true), canvasM); wall.position.set(x, y + 0.35 + 0.375, z); scene.add(wall);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(r + 0.1, 2.6, 32, 1, true), canvasM); cone.position.set(x, y + 1.1 + 1.3, z); cone.castShadow = true; scene.add(cone);
  cyl(x, z, 0.04, y + 3.7, y + 4.0, oakM, 6);
  const door = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.6), new THREE.MeshStandardMaterial({ color: '#2b2520', emissive: SERA ? '#ffb060' : '#000', emissiveIntensity: SERA ? 1.2 : 0 })); door.position.set(x, y + 1.15, z + r + 0.02); scene.add(door);
  for (const dx of [-1.0, 1.0]) { box(x + dx - 0.35, x + dx + 0.35, y + 0.35, y + 0.75, z + r + 0.6, z + r + 1.3, oakM); box(x + dx - 0.3, x + dx + 0.3, y + 0.75, y + 0.85, z + r + 0.65, z + r + 1.25, creamM); }
  const l = new THREE.PointLight('#ffc78a', SERA ? 3 : 0.4, 0, 2); l.position.set(x, y + 1.5, z + r + 0.6); scene.add(l); }

// ================= LAYOUT AS EXPLAINED BY THE OWNERS (driving up along +x: house on the LEFT, pool/tipi/fire/bike polo on the RIGHT)
{ const g = new THREE.Mesh(new THREE.PlaneGeometry(320, 153), grassM); g.rotation.x = -Math.PI / 2; g.position.set(0, 0, -33.5); g.receiveShadow = true; scene.add(g);
  box(-160, -6, -1, 0, 43, 150, grassM); box(40, 160, -1, 0, 43, 150, grassM); box(-6, 40, -1, 0, 75, 150, grassM); box(-6, -5.7, -1.6, 0, 43, 75, stoneW(32, 1.6)); box(39.7, 40, -1.6, 0, 43, 75, stoneW(32, 1.6)); }
const roadM = T(rep(cv(256, 256, (g, w, h) => { g.fillStyle = '#9a9488'; g.fillRect(0, 0, w, h); for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(${rnd() > 0.5 ? '255,255,255' : '40,40,40'},${rnd() * 0.12})`; g.fillRect(rnd() * w, rnd() * h, 2, 2); } }), 40, 2), { roughness: 1 });
box(-70, 30, -0.02, 0.03, 20.5, 25.5, roadM, false);                 // the road going up
box(-2, 22, -0.02, 0.025, 10.5, 20.5, gravelM, false);               // forecourt in front of the house
function label(txt, x, y, z, w = 4, ry = 0) { const s = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 0.2), new THREE.MeshBasicMaterial({ map: sign([txt], 800, 160, txt.length > 14 ? 40 : 70, '#2b2b2b', '#f2e6cc') })); s.position.set(x, y, z); s.rotation.y = ry; scene.add(s); return s; }

// ---- 1. PARKING on the left at the arrival + BIKE WASH & BIKE GARAGE against the wall on its right side
{ box(-62, -33, -0.02, 0.035, -2, 19.5, roadM, false);
  for (let i = 0; i < 6; i++) for (const z of [1.5, 16]) { if (rnd() < 0.25) continue; const x = -59 + i * 3.2, c = ['#c9c9c9', '#2b3a55', '#8a1f1f', '#e8e4da', '#2f2f2f', '#5a6b4a'][Math.floor(rnd() * 6)];
    box(x - 0.9, x + 0.9, 0.25, 0.9, z - 2.1, z + 2.1, M(c, { roughness: 0.3, metalness: 0.4 })); box(x - 0.8, x + 0.8, 0.9, 1.4, z - 1.1, z + 0.9, M('#24303a', { roughness: 0.1, metalness: 0.5 }));
    for (const dx of [-0.85, 0.85]) for (const dz of [-1.3, 1.3]) { const w = cyl(x + dx, z + dz, 0.33, 0.0, 0.25, M('#111'), 12); w.rotation.z = Math.PI / 2; w.position.y = 0.33; } }
  box(-33, -31.8, 0, 3.0, -4, 21, stoneW(25, 3));                    // the wall on the right
  // bike garage: timber shed open to the parking, racks with bikes, lockers
  const gx0 = -34.6, gz0 = -1.5, gz1 = 8.5;
  box(gx0 - 0.1, -33, 2.8, 2.95, gz0 - 0.4, gz1 + 0.4, oakM); for (const z of [gz0, gz1]) box(gx0 - 0.1, gx0 + 0.1, 0, 2.8, z - 0.1, z + 0.1, oakM);
  box(gx0 - 0.1, -33, 0, 2.8, gz0 - 0.15, gz0, oakM);
  for (let i = 0; i < 8; i++) bike(-33.4, gz0 + 0.8 + i * 0.95 + 0.0, 0.34 + (i % 2) * 0.9, ['#c0392b', '#2e6f9e', '#e0a12a', '#3b7a45', '#222', '#d35400', '#7f8c8d', '#8e44ad'][i]);
  label('BIKE GARAGE', gx0 - 0.15, 3.2, (gz0 + gz1) / 2, 4, -Math.PI / 2);
  // bike wash: 3 bays with hoses, drain grid, card-payment totem
  const wz0 = 10, wz1 = 18; box(-38, -33, 0, 0.06, wz0, wz1, M('#b9b4aa', { roughness: 0.8 }));
  for (let i = 0; i < 3; i++) { const z = wz0 + 1.3 + i * 2.7; box(-33.4, -33.0, 0.6, 2.2, z - 0.5, z + 0.5, M('#2e6f9e', { roughness: 0.4 })); cyl(-33.5, z, 0.12, 1.2, 1.5, M('#ddd', { metalness: 0.6 }), 12);
    rod([-33.5, 1.3, z], [-35.2, 0.1, z + 0.3], 0.02, M('#111')); box(-36.5, -33.4, 0.06, 0.08, z - 0.3, z + 0.3, M('#444', { metalness: 0.7 })); if (i < 2) bike(-35.5, z, 0.4, ['#e0a12a', '#3b7a45'][i]); }
  box(-33.8, -33.2, 0, 1.5, wz1 - 0.6, wz1, M('#222', { metalness: 0.4 })); box(-33.85, -33.8, 1.0, 1.35, wz1 - 0.5, wz1 - 0.1, glow('#7fd3ff'));
  label('BIKE WASH  ·  PAGAMENTO CON CARTA', -33.9, 3.2, (wz0 + wz1) / 2, 6, -Math.PI / 2);
  for (const z of [10.5, 16.5]) box(-33, -31.8, 2.25, 2.35, z - 0.05, z + 0.05, M('#111'));
  // small chill corner for bikers: benches + umbrella
  for (const z of [3, 6.5]) { box(-41, -38.5, 0.42, 0.48, z - 0.25, z + 0.25, oakM); for (const x of [-40.7, -38.8]) box(x - 0.05, x + 0.05, 0, 0.42, z - 0.2, z + 0.2, ironM); }
  cyl(-39.8, 4.7, 0.03, 0, 2.3, oakM, 8); { const u = new THREE.Mesh(new THREE.ConeGeometry(1.6, 0.5, 20), reedM); u.position.set(-39.8, 2.4, 4.7); scene.add(u); }
  // the campsite in front of the parking (free pitches)
  for (let i = 0; i < 7; i++) { const x = -60 + i * 4 + rnd(), z = -14 - rnd() * 8; const t = new THREE.Mesh(new THREE.SphereGeometry(1.2, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), M(['#e07a2a', '#3a7a9a', '#6a8a3a', '#d8c9a0'][i % 4], { roughness: 0.8 })); t.scale.set(1.3, 0.9, 1); t.position.set(x, 0, z); t.castShadow = true; scene.add(t); }
  for (const [x, z] of [[-48, -4], [-38, -10], [-58, -24], [-30, -22]]) olive(x, 0, z, 1.1); }

// ---- 2. RIGHT side, a bit before the house: POOL on the upper terrace, and above it the TIPI for yoga
{ const P = 1.2, x0 = -26, x1 = -5, z0 = 28, z1 = 41;
  box(x0, x1, -0.5, P, z0, z1, grassM); box(x0, x1, 0, P, z0 - 0.3, z0, stoneW(21, P)); box(x1 - 2.5, x1 - 0.5, 0, P, z0 - 2.4, z0, stoneW(2, P));
  for (let i = 0; i < 6; i++) box(x1 - 2.5, x1 - 0.5, 0, (i + 1) * 0.2, z0 - 2.4 + i * 0.4, z0 - 2.0 + i * 0.4, stoneW(2, 0.2));
  box(x0 + 2, x1 - 2, P, P + 0.12, z0 + 1.5, z1 - 1.5, travM); box(x0 + 4, x1 - 6, P + 0.02, P + 0.13, z0 + 3.5, z0 + 8.5, waterM);
  for (let i = 0; i < 5; i++) { const x = x0 + 4 + i * 2.2; box(x, x + 1.5, P + 0.12, P + 0.42, z0 + 9.3, z0 + 11.3, M('#e7dccb')); box(x + 0.05, x + 1.45, P + 0.42, P + 0.56, z0 + 9.35, z0 + 11.25, linenM);
    if (i % 2 === 0) { cyl(x + 1.85, z0 + 10.3, 0.03, P + 0.12, P + 2.4, oakM, 8); const u = new THREE.Mesh(new THREE.ConeGeometry(1.4, 0.5, 20), reedM); u.position.set(x + 1.85, P + 2.45, z0 + 10.3); scene.add(u); } }
  for (const [x, z] of [[x1 - 3.5, z0 + 3], [x1 - 3.5, z0 + 8]]) { cyl(x, z, 0.45, P + 0.12, P + 0.85, M('#b9673d'), 16, 0.55); olive(x, P + 0.85, z, 0.45); }
  label('PISCINA', -15.5, 2.0, z0 - 0.35, 3);
  // tipi terrace above the pool
  const T2 = 2.6, tz0 = 41, tz1 = 56; box(x0, x1, -0.5, T2, tz0, tz1, grassM); box(x0, x1, P, T2, tz0 - 0.3, tz0, stoneW(21, T2 - P));
  const tx = -15.5, tz = 48.5; cyl(tx, tz, 5.2, T2, T2 + 0.25, oakM, 40);
  const tp = new THREE.Mesh(new THREE.ConeGeometry(4.4, 8.5, 40, 1, true), canvasM); tp.position.set(tx, T2 + 0.25 + 4.25, tz); tp.castShadow = true; scene.add(tp);
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; rod([tx + Math.cos(a) * 4.3, T2 + 0.25, tz + Math.sin(a) * 4.3], [tx - Math.cos(a) * 0.6, T2 + 10, tz - Math.sin(a) * 0.6], 0.06, oakM); }
  const dr = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.4), M('#3a2e24')); dr.position.set(tx, T2 + 1.45, tz - 3.6); dr.rotation.y = Math.PI; dr.rotation.x = 0.45; scene.add(dr);
  for (let i = 0; i < 5; i++) box(tx - 4 + i * 2, tx - 3.3 + i * 2, T2 + 0.25, T2 + 0.28, tz - 6.4, tz - 4.6, M(['#9aa07a', '#d0652a', '#e9dfcc'][i % 3]));
  label('YOGA', tx, T2 + 2.0, tz - 5.4, 2.2); for (const [x, z] of [[-24, 53], [-7, 54]]) olive(x, T2, z, 1.0); }

// ---- 3. the HOUSE on the left (already built above) + the GREEN PERGOLA in front of it (vine roof), long tables, fire grill
{ const x0 = 6.5, x1 = 18.5, z0 = 11.3, z1 = 18.5, Hp = 3.0;
  for (let x = x0; x <= x1 + 0.01; x += 3) for (const z of [z0, z1]) box(x - 0.1, x + 0.1, 0, Hp, z - 0.1, z + 0.1, oakM);
  for (let x = x0; x <= x1 + 0.01; x += 3) box(x - 0.07, x + 0.07, Hp, Hp + 0.18, z0 - 0.3, z1 + 0.3, oakM);
  for (let z = z0; z <= z1; z += 0.9) box(x0 - 0.3, x1 + 0.3, Hp + 0.18, Hp + 0.24, z - 0.04, z + 0.04, oakM);
  const vine = [M('#5f7f3a', { roughness: 1 }), M('#4e6e2f', { roughness: 1 }), M('#7a9445', { roughness: 1 })];
  for (let i = 0; i < 260; i++) { const lf = new THREE.Mesh(new THREE.SphereGeometry(0.35 + rnd() * 0.35, 8, 6), vine[i % 3]); lf.scale.y = 0.45; lf.position.set(x0 - 0.3 + rnd() * (x1 - x0 + 0.6), Hp + 0.25 + rnd() * 0.25, z0 - 0.3 + rnd() * (z1 - z0 + 0.6)); lf.castShadow = true; scene.add(lf); }
  for (let i = 0; i < 70; i++) { const lf = new THREE.Mesh(new THREE.SphereGeometry(0.18 + rnd() * 0.15, 7, 5), vine[i % 3]); const onX = rnd() < 0.5; lf.position.set(onX ? x0 + rnd() * (x1 - x0) : (rnd() < 0.5 ? x0 : x1), Hp - rnd() * 0.8, onX ? (rnd() < 0.5 ? z0 : z1) : z0 + rnd() * (z1 - z0)); scene.add(lf); }
  for (let x = x0; x <= x1 + 0.01; x += 3) for (const z of [z0, z1]) for (let y = 0.3; y < Hp; y += 0.35) { const lf = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 5), vine[(y * 10 | 0) % 3]); lf.position.set(x + Math.sin(y * 4) * 0.14, y, z + Math.cos(y * 4) * 0.14); scene.add(lf); }
  for (const z of [12.9, 16.9]) { for (const xs of [[x0 + 0.6, 11.0], [14.0, x1 - 0.6]]) { box(xs[0], xs[1], 0.72, 0.8, z - 0.5, z + 0.5, walnutM); box(xs[0] + 0.2, xs[0] + 0.32, 0, 0.72, z - 0.35, z + 0.35, ironM); box(xs[1] - 0.32, xs[1] - 0.2, 0, 0.72, z - 0.35, z + 0.35, ironM);
      for (const dz of [-0.85, 0.85]) box(xs[0], xs[1], 0.42, 0.47, z + dz - 0.17, z + dz + 0.17, oakM); } }
  const fx = 12.5, fz = 14.9; cyl(fx, fz, 1.0, 0, 0.55, stoneW(2, 1), 24); const fr = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.6, 10), glow('#ff8a2a')); fr.position.set(fx, 0.9, fz); scene.add(fr);
  cyl(fx, fz, 0.9, 2.2, 2.75, copperM, 24, 0.25); cyl(fx, fz, 0.18, 2.75, Hp + 0.2, copperM, 12);
  for (const z of [z0 + 0.2, (z0 + z1) / 2, z1 - 0.2]) for (let x = x0; x < x1; x += 0.6) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), glow('#ffd79a')); b.position.set(x, Hp - 0.15 - 0.12 * Math.sin(((x - x0) % 3) / 3 * Math.PI), z); scene.add(b); }
  if (SERA) for (let x = x0 + 1.5; x < x1; x += 3) { const l = new THREE.PointLight('#ffcc88', 2.5, 0, 2); l.position.set(x, Hp - 0.4, (z0 + z1) / 2); scene.add(l); }
  for (const [x, z] of [[-6, 2], [-8, 14], [24, 2]]) olive(x, 0, z, 1.2); }

// ---- 4. further on the RIGHT: the round FIRE (Sleeping Giant) with the BAR; below it the BIKE POLO field
{ const fx = 12, fz = 35;
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 0.5, 48, 1, true), stoneW(10, 0.5)); ring.position.set(fx, -0.24, fz); scene.add(ring);
  const pit = new THREE.Mesh(new THREE.CircleGeometry(3.4, 48), gravelM); pit.rotation.x = -Math.PI / 2; pit.position.set(fx, 0.015, fz); scene.add(pit);
  for (let i = 0; i < 22; i++) { const a = i / 22 * Math.PI * 2; if (Math.abs(a - Math.PI * 1.5) < 0.22) continue; const bx = fx + Math.cos(a) * 2.8, bz = fz + Math.sin(a) * 2.8;
    const b = box(bx - 0.45, bx + 0.45, 0, 0.42, bz - 0.3, bz + 0.3, stoneW(1, 0.4)); b.rotation.y = -a + Math.PI / 2;
    const c = box(bx - 0.36, bx + 0.36, 0.42, 0.55, bz - 0.24, bz + 0.24, [creamM, rustM, sageM][i % 3]); c.rotation.y = -a + Math.PI / 2; }
  cyl(fx, fz, 0.8, 0, 0.35, M('#3a3530'), 32); for (let i = 0; i < 6; i++) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.12 + rnd() * 0.1, 0.4 + rnd() * 0.4, 8), glow(i % 2 ? '#ffb03a' : '#ff6a1a')); f.position.set(fx + (rnd() - 0.5) * 0.6, 0.55 + rnd() * 0.15, fz + (rnd() - 0.5) * 0.6); scene.add(f); }
  const l = new THREE.PointLight('#ff8a3a', SERA ? 9 : 2.5, 0, 2); l.position.set(fx, 1.0, fz); scene.add(l);
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + 0.2; const lx = fx + Math.cos(a) * 3.9, lz = fz + Math.sin(a) * 3.9; cyl(lx, lz, 0.1, 0, 0.35, M('#2b2b2b'), 8); const g2 = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), glow('#ffd28a')); g2.position.set(lx, 0.4, lz); scene.add(g2); }
  // the bar next to the fire: timber pergola, terracotta-tile counter, wooden stools
  const x0 = 18.5, x1 = 26.5, z0 = 30, z1 = 36, Hp = 2.9;
  for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) box(x - 0.1, x + 0.1, 0, Hp, z - 0.1, z + 0.1, oakM);
  const rf = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0 + 0.8, z1 - z0 + 0.8), reedM); rf.rotation.x = -Math.PI / 2; rf.position.set((x0 + x1) / 2, Hp + 0.05, (z0 + z1) / 2); scene.add(rf);
  box(x0 + 1.4, x0 + 2.0, 0, 1.1, z0 + 0.6, z1 - 0.6, terraM); box(x0 + 1.3, x0 + 2.15, 1.1, 1.16, z0 + 0.5, z1 - 0.5, oakM);
  box(x1 - 0.35, x1 - 0.1, 0, 2.2, z0 + 0.3, z1 - 0.3, stoneW(6, 2.2)); for (const y of [1.4, 1.8]) box(x1 - 0.6, x1 - 0.35, y, y + 0.04, z0 + 0.8, z1 - 0.8, oakM);
  for (let z = z0 + 1; z < z1 - 0.8; z += 0.3) cyl(x1 - 0.48, z, 0.04, 1.44, 1.72, M(['#c98a2a', '#e9d7a8', '#5a2414', '#2f4a2a'][Math.floor(rnd() * 4)], { roughness: 0.2 }), 10);
  for (let z = z0 + 1.2; z < z1 - 0.8; z += 1.0) { cyl(x0 + 1.0, z, 0.2, 0, 0.75, oakM, 12, 0.14); cyl(x0 + 1.0, z, 0.22, 0.75, 0.82, oakM, 16); }
  label('BAR', (x0 + x1) / 2, Hp + 0.45, z0 - 0.45, 2);
  if (SERA) { const bl = new THREE.PointLight('#ffc070', 3, 0, 2); bl.position.set((x0 + x1) / 2, 2.4, (z0 + z1) / 2); scene.add(bl); }
  for (const [x, z] of [[1, 33], [30, 33], [5, 41]]) olive(x, 0, z, 1.1);
  // BIKE POLO on the lower plot
  const BP = -1.6, px0 = 3, px1 = 31, pz0 = 45, pz1 = 62;
  box(-6, 40, BP - 1, BP, 43, 75, grassM); box(-6, 40, BP, 0, 42.7, 43, stoneW(46, 1.6));
  for (let i = 0; i < 8; i++) box(34 - 0.8, 34 + 0.8, BP + i * 0.2, BP + (i + 1) * 0.2, 43 - i * 0.35 - 0.35, 43 - i * 0.35, stoneW(1.6, 0.2));
  box(px0, px1, BP, BP + 0.04, pz0, pz1, M('#8d8a83', { roughness: 0.9 }));
  for (const z of [pz0, pz1]) box(px0, px1, BP, BP + 0.6, z - 0.06, z + 0.06, oakM); for (const x of [px0, px1]) box(x - 0.06, x + 0.06, BP, BP + 0.6, pz0, pz1, oakM);
  box((px0 + px1) / 2 - 0.03, (px0 + px1) / 2 + 0.03, BP + 0.04, BP + 0.05, pz0, pz1, M('#f2efe6'));
  for (const x of [px0 + 0.8, px1 - 0.8]) { const s = x < 15 ? 1 : -1; for (const dz of [-0.9, 0.9]) rod([x, BP, (pz0 + pz1) / 2 + dz], [x, BP + 0.9, (pz0 + pz1) / 2 + dz], 0.04, M('#e9e4da')); rod([x, BP + 0.9, (pz0 + pz1) / 2 - 0.9], [x, BP + 0.9, (pz0 + pz1) / 2 + 0.9], 0.04, M('#e9e4da'));
    const net = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.9), M('#ddd', { transparent: true, opacity: 0.5, side: THREE.DoubleSide })); net.rotation.y = Math.PI / 2; net.position.set(x - s * 0.5, BP + 0.45, (pz0 + pz1) / 2); scene.add(net); }
  for (const [x, z, c] of [[11, 52, '#c0392b'], [14, 55, '#2e6f9e'], [19, 51, '#e0a12a'], [21, 56, '#3b7a45']]) { const g = new THREE.Group(); scene.add(g); bike(x, z, BP + 0.34, c); }
  { const b = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), M('#ff7a1a')); b.position.set(16, BP + 0.1, 53.5); scene.add(b); }
  label('BIKE POLO', (px0 + px1) / 2, BP + 1.2, pz0 - 0.2, 4);
  for (const x of [px0 + 4, px1 - 4]) for (const zz of [pz1 + 1.5]) { box(x - 1.5, x + 1.5, BP + 0.42, BP + 0.48, zz - 0.25, zz + 0.25, oakM); }
  for (const [x, z] of [[-3, 50], [36, 52], [-2, 66], [36, 70]]) olive(x, BP, z, 1.1); }

// ---- 5. straight ahead at the end: OLIVE GROVE with HAMMOCKS hanging between the trees
{ const pts = [[36, 8], [41, 12], [36, 17], [42, 21], [37, 26], [44, 28], [47, 16], [46, 6]];
  for (const [x, z] of pts) olive(x, 0, z, 1.25);
  const hm = [M('#e9dfcc', { side: THREE.DoubleSide }), M('#d0652a', { side: THREE.DoubleSide }), M('#9aa07a', { side: THREE.DoubleSide })];
  function hammock(a, b, m) { const A = new THREE.Vector3(a[0], 1.6, a[1]), B = new THREE.Vector3(b[0], 1.6, b[1]); const d = B.clone().sub(A); const n = new THREE.Vector3(-d.z, 0, d.x).normalize();
    for (let k = -3; k <= 3; k++) { const o = n.clone().multiplyScalar(k * 0.12); const mid = A.clone().add(B).multiplyScalar(0.5).add(o); mid.y = 0.75 + Math.abs(k) * 0.05;
      const c = new THREE.CatmullRomCurve3([A.clone().add(o.clone().multiplyScalar(0.2)), A.clone().lerp(B, 0.25).add(o).setY(1.0), mid, A.clone().lerp(B, 0.75).add(o).setY(1.0), B.clone().add(o.clone().multiplyScalar(0.2))]);
      const t = new THREE.Mesh(new THREE.TubeGeometry(c, 24, 0.07, 6, false), m); t.castShadow = true; scene.add(t); } }
  hammock([36, 8], [41, 12], hm[0]); hammock([41, 12], [36, 17], hm[1]); hammock([36, 17], [42, 21], hm[2]); hammock([42, 21], [37, 26], hm[0]); hammock([47, 16], [46, 6], hm[1]);
  for (let i = 0; i < 6; i++) { const x = 38 + rnd() * 6, z = 9 + rnd() * 14; box(x - 0.5, x + 0.5, 0, 0.25, z - 0.5, z + 0.5, [orangeM, creamM, sageM][i % 3]); }
  label('LE AMACHE', 33, 1.8, 20.2, 3, -Math.PI / 2); }

// ---- glamping bell tents on the slope behind (as in the approved plan, many more around)
// no tents near the house
for (const [x, z] of [[20, -18], [-24, -14], [36, -22]]) olive(x, 0, z, 1.2);

// ---- sky, hills, light
for (let i = 0; i < 46; i++) { const a = i / 46 * Math.PI * 2, r = 170 + rnd() * 40; const hm = new THREE.Mesh(new THREE.SphereGeometry(32 + rnd() * 25, 16, 10), M(i % 3 ? (SERA ? '#3d4a3a' : '#71815a') : (SERA ? '#6a5a5a' : '#b9ae97'), { roughness: 1 }));
  hm.scale.y = 0.5 + rnd() * 0.5; hm.position.set(Math.cos(a) * r, -12, 20 + Math.sin(a) * r); scene.add(hm); }
scene.background = new THREE.Color(SERA ? '#33405e' : '#9cc6ea'); scene.fog = new THREE.Fog(SERA ? '#5a5a70' : '#c9dbe6', 130, 330);
scene.add(new THREE.HemisphereLight(SERA ? '#8a8fb5' : '#eaf4ff', '#5b5a42', SERA ? 0.35 : 0.9));
const sun = new THREE.DirectionalLight(SERA ? '#ffb27a' : '#fff6e6', SERA ? 0.9 : 3.0); sun.position.set(SERA ? -40 : 10, SERA ? 10 : 40, 40); sun.target.position.set(-5, 0, 20); scene.add(sun.target);
sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 1, far: 200 }); sun.shadow.bias = -0.0005; scene.add(sun);
renderer.toneMappingExposure = SERA ? 1.15 : 1.0;
const cams = {
  aerea: [[-62, 42, 82], [-2, -2, 22], 50], aerea2: [[55, 45, 85], [-2, -2, 22], 50],
  arrivo: [[-68, 1.7, 23], [-40, 1.2, 14], 62], bikewash: [[-44, 1.8, 13], [-33, 1.2, 7.5], 64],
  piscina: [[-5, 3.0, 25], [-16, 1.2, 34], 62], tipi: [[-2, 4.5, 37], [-15.5, 5, 49], 62],
  pergola: [[3.5, 1.7, 22.5], [13, 1.6, 13], 62], fuoco: [[5, 3.2, 27], [17, 0.3, 35], 60],
  bikepolo: [[0, 2.5, 41], [17, -1.4, 54], 62], amache: [[27, 1.7, 22.5], [40, 1.0, 16], 62],
};
const k = cams[VIEW.replace('-sera', '')] || cams.aerea;
const camera = new THREE.PerspectiveCamera(k[2], W / H, 0.1, 500); camera.position.set(...k[0]); camera.lookAt(...k[1]);
renderer.render(scene, camera);
window.done = true;
