/* Ground floor 3D mock-up. Plan coords: x = east (m), z = south (m), y = up. */
const VIEW = (location.hash || '#bar').slice(1);
const W = 1600, H = 1000;
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H);
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#2b3a2f');

// ---------------------------------------------------------------- helpers
function cv(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
function M(color, o = {}) { return new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.85, metalness: 0 }, o)); }
function box(x0, x1, y0, y1, z0, z1, mat, cast = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat);
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  m.castShadow = cast; m.receiveShadow = true; scene.add(m); return m;
}
function cyl(x, z, r, y0, y1, mat, seg = 24, r2) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r2 ?? r, r, y1 - y0, seg), mat);
  m.position.set(x, (y0 + y1) / 2, z); m.castShadow = true; m.receiveShadow = true; scene.add(m); return m;
}
// plane on a wall. face: 'S' (normal +z), 'N' (-z), 'E' (+x), 'W' (-x)
function wallPlane(face, cx, cz, w, y0, y1, mat) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, y1 - y0), mat);
  m.position.set(cx, (y0 + y1) / 2, cz);
  m.rotation.y = { S: 0, N: Math.PI, E: Math.PI / 2, W: -Math.PI / 2 }[face];
  m.receiveShadow = true; scene.add(m); return m;
}
function rep(t, x, y) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(x, y); return t; }

// ---------------------------------------------------------------- textures
const texCotto = rep(cv(512, 512, (g, w, h) => {
  const n = 4, s = w / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const l = 52 + Math.random() * 10, hh = 18 + Math.random() * 8;
    g.fillStyle = `hsl(${hh},45%,${l}%)`; g.fillRect(i * s, j * s, s, s);
    for (let k = 0; k < 60; k++) { g.fillStyle = `rgba(90,40,20,${Math.random() * 0.08})`; g.fillRect(i * s + Math.random() * s, j * s + Math.random() * s, 6, 6); }
  }
  g.strokeStyle = '#d9c3a8'; g.lineWidth = 5;
  for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, h); g.stroke(); g.beginPath(); g.moveTo(0, i * s); g.lineTo(w, i * s); g.stroke(); }
}), 1, 1);

const BANDS = [[0, 0.9, '#f2b48a', 1], [0.9, 0.7, '#f3ede4', 0], [1.6, 0.9, '#4f7a94', 0], [2.5, 0.8, '#c2185b', 0],
  [3.3, 1.0, '#e0703a', 1], [4.3, 0.8, '#4f7a94', 0], [5.1, 0.8, '#c2185b', 0], [5.9, 0.4, '#f3ede4', 0]];
const texArches = cv(2520, 1280, (g, w, h) => {
  const k = w / 6.3;
  for (const [x, bw, c, arch] of BANDS) {
    g.fillStyle = c; g.fillRect(x * k, 0, bw * k + 1, h);
    if (arch) {
      g.strokeStyle = 'rgba(255,255,255,0.65)'; g.lineWidth = 7;
      const cx = (x + bw / 2) * k, cy = 1.25 * k;
      for (let r = bw / 2 - 0.07; r > 0.08; r -= 0.065) {
        g.beginPath(); g.moveTo(cx - r * k, h); g.lineTo(cx - r * k, cy); g.arc(cx, cy, r * k, Math.PI, 0); g.lineTo(cx + r * k, h); g.stroke();
      }
    }
  }
});
const texFluted = rep(cv(64, 256, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, w, 0);
  gr.addColorStop(0, '#14386a'); gr.addColorStop(0.35, '#3d6fb0'); gr.addColorStop(0.65, '#2a5a9a'); gr.addColorStop(1, '#10305c');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
}), 76, 1);
const texVelvet = rep(cv(128, 512, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, w, 0);
  gr.addColorStop(0, '#7e1830'); gr.addColorStop(0.5, '#e0506a'); gr.addColorStop(1, '#7e1830');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
}), 7, 1);
const texVelvetT = rep(cv(128, 512, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, w, 0);
  gr.addColorStop(0, '#7a3416'); gr.addColorStop(0.5, '#d9733a'); gr.addColorStop(1, '#7a3416');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
}), 40, 1);
function neon(text, w, h, size, color = '#fff6d8', glow = '#ffb347') {
  const t = cv(w, h, (g) => {
    g.font = `bold ${size}px Helvetica, Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = glow; g.shadowBlur = size * 0.5; g.fillStyle = color;
    for (let i = 0; i < 3; i++) g.fillText(text, w / 2, h / 2);
  });
  return new THREE.MeshBasicMaterial({ map: t, transparent: true, toneMapped: false });
}
const texMural = cv(2000, 1320, (g, w, h) => {
  g.fillStyle = '#ffd23f'; g.fillRect(0, 0, w, h);
  const cols = ['#ff4fa3', '#2ec4b6', '#e71d36', '#3a86ff', '#ff9f1c', '#8338ec', '#111'];
  for (let i = 0; i < 260; i++) { g.fillStyle = cols[i % cols.length]; g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 12 + Math.random() * 60, 0, 7); g.fill(); }
  // big pop sun-burst + lettering
  g.save(); g.translate(w * 0.5, h * 0.48);
  for (let i = 0; i < 24; i++) { g.fillStyle = i % 2 ? '#ff4fa3' : '#fff3d6'; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 900, i * Math.PI / 12, (i + 1) * Math.PI / 12); g.fill(); }
  g.fillStyle = '#3a86ff'; g.beginPath(); g.arc(0, 0, 330, 0, 7); g.fill();
  g.restore();
  g.font = 'bold 170px Helvetica, Arial'; g.textAlign = 'center'; g.lineWidth = 14; g.strokeStyle = '#111';
  g.fillStyle = '#fff'; g.strokeText('GOOD', w / 2, h * 0.43); g.fillText('GOOD', w / 2, h * 0.43);
  g.strokeText('PEOPLE', w / 2, h * 0.6); g.fillText('PEOPLE', w / 2, h * 0.6);
});
const texFloral = rep(cv(512, 512, (g, w, h) => {
  g.fillStyle = '#f4ead8'; g.fillRect(0, 0, w, h);
  const cols = ['#d9534f', '#e98a3a', '#c2185b', '#f2b134'];
  for (let i = 0; i < 14; i++) {
    const x = Math.random() * w, y = Math.random() * h, r = 22 + Math.random() * 26, c = cols[i % 4];
    g.fillStyle = '#6b8f4e'; for (let l = 0; l < 3; l++) { g.beginPath(); g.ellipse(x + Math.cos(l * 2) * r * 1.4, y + Math.sin(l * 2) * r * 1.4, r * 0.7, r * 0.3, l * 2, 0, 7); g.fill(); }
    g.fillStyle = c; for (let p = 0; p < 6; p++) { g.beginPath(); g.arc(x + Math.cos(p) * r * 0.6, y + Math.sin(p) * r * 0.6, r * 0.55, 0, 7); g.fill(); }
    g.fillStyle = '#5b2a12'; g.beginPath(); g.arc(x, y, r * 0.3, 0, 7); g.fill();
  }
}), 6, 2);
const texStone = rep(cv(512, 512, (g, w, h) => {
  g.fillStyle = '#7d6b58'; g.fillRect(0, 0, w, h);
  let y = 0;
  while (y < h) { const rh = 40 + Math.random() * 30; let x = -Math.random() * 60;
    while (x < w) { const rw = 70 + Math.random() * 80; const l = 50 + Math.random() * 20;
      g.fillStyle = `hsl(32,${15 + Math.random() * 10}%,${l}%)`; g.beginPath(); g.roundRect(x + 4, y + 4, rw - 8, rh - 8, 10); g.fill(); x += rw; }
    y += rh; }
}), 1, 3);
const texWood = rep(cv(256, 256, (g, w, h) => {
  g.fillStyle = '#9a6a3d'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 90; i++) { g.strokeStyle = `rgba(60,30,10,${Math.random() * 0.25})`; g.lineWidth = 1 + Math.random() * 2; g.beginPath(); const y = Math.random() * h; g.moveTo(0, y); g.bezierCurveTo(w / 3, y + 6, w / 2, y - 6, w, y + 3); g.stroke(); }
}), 2, 1);
const texChalk = cv(400, 300, (g, w, h) => {
  g.fillStyle = '#263238'; g.fillRect(0, 0, w, h); g.strokeStyle = '#a0703c'; g.lineWidth = 18; g.strokeRect(0, 0, w, h);
  g.fillStyle = '#fff'; g.font = 'bold 44px Helvetica'; g.textAlign = 'center'; g.fillText('MENU', w / 2, 70);
  g.font = '26px Helvetica'; g.textAlign = 'left';
  ['Pizza margherita', 'Pizza del glamping', 'Burger & patatine', 'Insalatona', 'Birra alla spina'].forEach((s, i) => { g.fillText(s, 36, 120 + i * 34); g.fillText('€', w - 60, 120 + i * 34); });
});
function sticker(bg, fg, word) {
  return cv(256, 600, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h); g.strokeStyle = fg; g.lineWidth = 10;
    g.beginPath(); g.arc(70, 400, 52, 0, 7); g.stroke(); g.beginPath(); g.arc(186, 400, 52, 0, 7); g.stroke();
    g.beginPath(); g.moveTo(70, 400); g.lineTo(115, 320); g.lineTo(186, 400); g.moveTo(115, 320); g.lineTo(150, 320); g.stroke();
    g.fillStyle = fg; g.beginPath(); g.arc(128, 250, 22, 0, 7); g.fill();
    g.font = 'bold 46px Helvetica'; g.textAlign = 'center'; g.fillText(word, w / 2, 130);
  });
}

// ---------------------------------------------------------------- materials
const plaster = M('#efe6d8', { roughness: 0.95 });
const ceilingM = M('#f6f1e8', { roughness: 1 });
const floorM = new THREE.MeshStandardMaterial({ map: texCotto, roughness: 0.75 });
const woodM = new THREE.MeshStandardMaterial({ map: texWood, roughness: 0.6 });
const darkWood = M('#5e3d22', { roughness: 0.6 });
const navy = M('#16325c', { roughness: 0.5 });
const metal = M('#9aa0a6', { metalness: 0.8, roughness: 0.35 });
const black = M('#1b1b1b', { roughness: 0.4 });

// ---------------------------------------------------------------- shell
const HS = 3.2, HP = 3.5;
const floor = new THREE.Mesh(new THREE.PlaneGeometry(14.5, 13.5), floorM);
floor.rotation.x = -Math.PI / 2; floor.position.set(11.6, 0, 6.6); floor.receiveShadow = true;
texCotto.repeat.set(14.5 / 1.6, 13.5 / 1.6); scene.add(floor);

const showCeiling = VIEW !== 'top';
// bar wall + store rooms
box(12.4, 18.9, 0, HS, 2.0, 2.38, plaster);
box(12.2, 12.4, 0, HS, 0, 2.38, plaster);
{ const d = new THREE.Mesh(new THREE.BoxGeometry(0.2, HS, 1.33), plaster); d.position.set(12.1, HS / 2, 2.97); d.rotation.y = Math.atan2(0.6, 1.18); d.castShadow = d.receiveShadow = true; scene.add(d); }
// alcove / oven / stairs / corridor
box(9.9, 12.4, 0, HS, -0.2, 0, plaster);
box(9.7, 9.9, 0, HS, 0, 2.67, M('#e7dccb'));
box(7.2, 9.9, 0, HS, 2.47, 2.67, plaster);
box(7.0, 7.2, 0, HS, 2.67, 3.3, plaster);
box(4.45, 7.2, 0, HS, 3.1, 3.3, plaster);
box(4.25, 4.45, 0, HS, 3.3, 4.95, plaster);
wallPlane('E', 4.46, 3.9, 0.85, 0, 2.15, M('#ff7aa2', { roughness: 0.5 }));
// WC block
box(4.45, 7.6, 0, HS, 4.95, 5.15, plaster);
box(7.4, 7.6, 0, HS, 5.15, 9.8, plaster);
// east wall
box(18.7, 18.9, 0, HP, 0, 5.6, plaster); box(18.7, 18.9, 0, HP, 6.5, 13.4, plaster);
box(18.7, 18.9, 2.2, HP, 5.6, 6.5, plaster);
box(18.9, 19.6, 0, 2.2, 5.6, 6.5, M('#3a3a3a'));
// porticato west wall with lobby opening
box(7.4, 7.6, 0, HP, 9.8, 10.9, plaster); box(7.4, 7.6, 0, HP, 12.1, 13.4, plaster); box(7.4, 7.6, 2.4, HP, 10.9, 12.1, plaster);
box(4.45, 7.4, 0, 2.6, 5.15, 9.8, M('#ddd6cb'));
if (showCeiling) {
  box(4.25, 18.9, HS, HS + 0.1, -0.2, 9.8, ceilingM, false);
  const cp = new THREE.Mesh(new THREE.PlaneGeometry(11.3, 3.6), new THREE.MeshStandardMaterial({ map: texFloral, roughness: 1 }));
  cp.rotation.x = Math.PI / 2; cp.position.set(13.15, HP, 11.55); scene.add(cp);
}
box(7.6, 18.7, HS, HP, 9.7, 9.9, plaster, false);
// glazing sala/porticato with openings
const glass = new THREE.MeshPhysicalMaterial({ color: '#cfe8f0', transparent: true, opacity: 0.18, roughness: 0.05, metalness: 0 });
for (const [a, b] of [[7.6, 9.0], [10.6, 12.0], [13.6, 15.0], [16.6, 18.7]]) {
  box(a, b, 0, HS, 9.78, 9.82, glass, false);
  for (let x = a; x <= b + 0.01; x += (b - a) / Math.max(1, Math.round((b - a) / 0.8))) box(x - 0.015, x + 0.015, 0, HS, 9.77, 9.83, M('#4a4a4a', { metalness: 0.6, roughness: 0.4 }));
}
// south glazing + garden backdrop
box(7.6, 18.7, 0, HP, 13.25, 13.29, glass, false);
for (let x = 7.6; x <= 18.71; x += 1.11) box(x - 0.015, x + 0.015, 0, HP, 13.24, 13.3, M('#4a4a4a'));
wallPlane('N', 13, 17, 34, -1, 10, new THREE.MeshBasicMaterial({ toneMapped: false, map: cv(1024, 320, (g, w, h) => {
  const sk = g.createLinearGradient(0, 0, 0, h); sk.addColorStop(0, '#9cc7e6'); sk.addColorStop(0.6, '#e8f1ea'); g.fillStyle = sk; g.fillRect(0, 0, w, h);
  g.fillStyle = '#c9c2b0'; g.beginPath(); g.moveTo(0, h * 0.55); for (let x = 0; x <= w; x += 40) g.lineTo(x, h * (0.35 + 0.15 * Math.sin(x / 90))); g.lineTo(w, h); g.lineTo(0, h); g.fill();
  for (let i = 0; i < 140; i++) { g.fillStyle = ['#4f7a3a', '#6b8f4e', '#3e6b35', '#7a9a5a'][i % 4]; g.beginPath(); g.arc(Math.random() * w, h * 0.62 + Math.random() * h * 0.3, 20 + Math.random() * 30, 0, 7); g.fill(); }
  g.fillStyle = '#6d8f4a'; g.fillRect(0, h * 0.85, w, h * 0.15);
}) }));
// curtains (wavy planes)
function curtain(x0, x1, z, h, tex, y0 = 0) {
  const w = x1 - x0, geo = new THREE.PlaneGeometry(w, h, Math.round(w * 30), 1), p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 22) * 0.04);
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, side: THREE.DoubleSide }));
  m.position.set((x0 + x1) / 2, y0 + h / 2, z); m.castShadow = true; m.receiveShadow = true; scene.add(m); return m;
}
curtain(7.7, 9.9, 13.12, HP - 0.05, texVelvetT); curtain(16.4, 18.6, 13.12, HP - 0.05, texVelvetT);
curtain(10.0, 10.8, 13.12, HP - 0.05, texVelvetT); curtain(15.5, 16.3, 13.12, HP - 0.05, texVelvetT);

// ---------------------------------------------------------------- BAR
wallPlane('S', 15.55, 2.385, 6.3, 0, HS, new THREE.MeshStandardMaterial({ map: texArches, roughness: 0.9 }));
curtain(14.78, 15.82, 2.47, 2.38, texVelvet); curtain(17.38, 18.42, 2.47, 2.38, texVelvet);
box(14.7, 15.9, 2.38, 2.42, 2.4, 2.5, black); box(17.3, 18.5, 2.38, 2.42, 2.4, 2.5, black);
wallPlane('S', 15.75, 2.4, 5.6, 2.58, 2.98, neon('GOOD FOOD · GOOD TIME · GOOD PEOPLE · GOOD LIFE', 2800, 200, 96));
wallPlane('S', 16.2, 2.395, 0.9, 1.35, 2.02, new THREE.MeshStandardMaterial({ map: texChalk, roughness: 0.9 }));
// counter
const fl = new THREE.MeshStandardMaterial({ map: texFluted, roughness: 0.55 });
box(13.0, 18.7, 0, 1.0, 3.3, 3.9, fl);
texFluted.repeat.set(5.7 / 0.075, 1);
box(12.95, 18.7, 1.0, 1.06, 3.26, 3.98, navy);
box(12.95, 18.7, 1.06, 1.12, 3.24, 4.0, woodM);
box(13.0, 18.7, 0.94, 0.97, 3.91, 3.93, new THREE.MeshBasicMaterial({ color: '#fff1c4', toneMapped: false }), false);
// pick-up heat shelf + lamps
box(13.1, 14.5, 1.5, 1.53, 3.35, 3.75, metal);
for (const x of [13.4, 13.8, 14.2]) { cyl(x, 3.55, 0.12, 1.58, 1.7, M('#ffb703', { emissive: '#ff8c00', emissiveIntensity: 0.6 }), 16, 0.05); }
for (const [x, c] of [[13.3, '#e9a03b'], [13.75, '#d9534f'], [14.2, '#e9a03b']]) cyl(x, 3.55, 0.16, 1.12, 1.14, M(c));
// pizza display
box(14.65, 15.55, 1.12, 1.45, 3.35, 3.85, new THREE.MeshPhysicalMaterial({ color: '#e8f6ff', transparent: true, opacity: 0.25, roughness: 0.05 }), false);
for (const x of [14.85, 15.1, 15.35]) cyl(x, 3.6, 0.13, 1.13, 1.16, M('#e9a03b'));
// till
box(16.0, 16.35, 1.12, 1.3, 3.5, 3.75, black);
box(16.05, 16.3, 1.3, 1.5, 3.62, 3.66, M('#7fd1c7', { emissive: '#3aa', emissiveIntensity: 0.5 }));
// beer tower + taps
box(17.1, 18.2, 1.12, 1.45, 3.5, 3.6, metal);
['#ffd166', '#e76f51', '#2a9d8f', '#f4a261', '#8ab17d'].forEach((c, i) => { const x = 17.2 + i * 0.22; cyl(x, 3.66, 0.012, 1.3, 1.42, metal, 8); box(x - 0.025, x + 0.025, 1.45, 1.62, 3.52, 3.58, M(c)); });
// bottle shelf
box(17.4, 18.4, 1.6, 1.63, 2.38, 2.6, darkWood);
for (let i = 0; i < 9; i++) cyl(17.48 + i * 0.11, 2.5, 0.035, 1.63, 1.93, M(['#2f5e2a', '#7a3b1d', '#c7a23a'][i % 3], { roughness: 0.2 }), 12);
// pendants (orange/red) + lights
[[13.4, '#f4a020'], [14.6, '#d62828'], [15.8, '#f4a020'], [17.0, '#d62828'], [18.2, '#f4a020']].forEach(([x, c]) => {
  cyl(x, 3.6, 0.005, 2.05, HS, black, 6);
  const s = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M(c, { side: THREE.DoubleSide, roughness: 0.4 }));
  s.position.set(x, 1.9, 3.6); scene.add(s);
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), new THREE.MeshBasicMaterial({ color: '#fff3c4', toneMapped: false })); b.position.set(x, 1.9, 3.6); scene.add(b);
  const l = new THREE.PointLight('#ffcf8a', 3.5, 0, 2); l.position.set(x, 1.82, 3.6); scene.add(l);
});
// pillar painted blue with menu
box(14.48, 14.83, 0, HS, 4.88, 5.23, M('#1f4e8c', { roughness: 0.6 }));
wallPlane('S', 14.655, 5.235, 0.3, 1.1, 1.6, new THREE.MeshStandardMaterial({ map: texChalk }));

// pizza station in alcove + wood oven mouth
box(10.0, 12.35, 0, 0.92, 0.06, 0.76, M('#c8553d', { roughness: 0.8 }));
box(9.98, 12.37, 0.92, 0.97, 0.04, 0.8, M('#e8e2d6', { roughness: 0.3 }));
wallPlane('S', 11.15, 0.01, 2.2, 2.2, 2.7, neon('PIZZA', 800, 200, 150, '#fff6d8', '#ff5a36'));
{ const arch = new THREE.Mesh(new THREE.CircleGeometry(0.42, 32, 0, Math.PI), new THREE.MeshBasicMaterial({ color: '#ff7a1a', toneMapped: false }));
  arch.position.set(9.91, 1.05, 1.3); arch.rotation.y = Math.PI / 2; scene.add(arch);
  box(9.9, 9.92, 0.9, 1.06, 0.85, 1.75, M('#7a3b1d'));
  const ol = new THREE.PointLight('#ff7a2a', 6, 0, 2); ol.position.set(10.3, 1.2, 1.3); scene.add(ol); }

// ---------------------------------------------------------------- SALA
wallPlane('E', 7.61, 7.6, 3.6, 0, HS, new THREE.MeshStandardMaterial({ map: texMural, roughness: 0.9 }));
// bathroom door with sticker
wallPlane('E', 7.605, 5.55, 0.85, 0, 2.15, new THREE.MeshStandardMaterial({ map: sticker('#f4a261', '#1f4e8c', 'WC') }));
// self station
box(7.62, 8.15, 0, 0.92, 5.95, 7.4, M('#8ecae6', { roughness: 0.6 }));
box(7.6, 8.18, 0.92, 0.96, 5.93, 7.42, woodM);
for (let i = 0; i < 6; i++) box(7.7, 8.05, 0.96 + i * 0.025, 0.98 + i * 0.025, 6.0, 6.45, M('#f2f2f2'));
cyl(7.9, 6.9, 0.12, 0.96, 1.35, new THREE.MeshPhysicalMaterial({ color: '#cfefff', transparent: true, opacity: 0.4 }));
// tables + mismatched chairs
const CH = ['#e63946', '#f4a261', '#2a9d8f', '#457b9d', '#e9c46a', '#8ab17d', '#d62828', '#6d597a'];
let k = 0;
function chair(x, z, rot, c) {
  const g = new THREE.Group(); const mat = M(c, { roughness: 0.5 });
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.42), mat); seat.position.y = 0.45; g.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.45, 0.03), mat); back.position.set(0, 0.7, -0.2); g.add(back);
  for (const [dx, dz] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.45, 0.03), mat); l.position.set(dx, 0.225, dz); g.add(l); }
  g.traverse(o => { o.castShadow = true; o.receiveShadow = true; });
  g.position.set(x, 0, z); g.rotation.y = rot; scene.add(g);
}
function table(x, z, w = 0.8, d = 0.8, h = 0.75) {
  box(x - w / 2, x + w / 2, h - 0.04, h, z - d / 2, z + d / 2, woodM);
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(x + dx * (w / 2 - 0.05) - 0.025, x + dx * (w / 2 - 0.05) + 0.025, 0, h - 0.04, z + dz * (d / 2 - 0.05) - 0.025, z + dz * (d / 2 - 0.05) + 0.025, darkWood);
}
for (const z of [6.75, 8.75]) for (const x of [9.6, 10.95, 12.3, 13.65, 15.0]) {
  table(x, z);
  chair(x - 0.2, z - 0.6, 0, CH[k++ % 8]); chair(x + 0.2, z - 0.6, 0, CH[k++ % 8]);
  chair(x - 0.2, z + 0.6, Math.PI, CH[k++ % 8]); chair(x + 0.2, z + 0.6, Math.PI, CH[k++ % 8]);
  const v = cyl(x, z, 0.04, 0.75, 0.95, M('#ffffff', { roughness: 0.2 }), 12); // small vase
  const f = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), M(CH[(k + 3) % 8])); f.position.set(x, 1.0, z); scene.add(f);
}
// 3 coloured cabinets on east wall
['#4f7a3a', '#f5f5f0', '#c0392b'].forEach((c, i) => {
  const z0 = 6.75 + i * 1.0;
  box(18.2, 18.7, 0, 1.9, z0, z0 + 0.92, M(c, { roughness: 0.5 }));
  box(18.18, 18.2, 0.15, 1.85, z0 + 0.45, z0 + 0.47, M('#00000033'));
  box(18.16, 18.18, 0.95, 1.05, z0 + 0.38, z0 + 0.42, metal); box(18.16, 18.18, 0.95, 1.05, z0 + 0.5, z0 + 0.54, metal);
});
// sala ceiling lights
if (showCeiling) for (const z of [6.75, 8.75]) for (const x of [10.3, 13.0, 15.7]) {
  cyl(x, z, 0.2, HS - 0.06, HS, new THREE.MeshBasicMaterial({ color: '#fff4dc', toneMapped: false }), 24);
  const l = new THREE.PointLight('#ffd9a8', 2.2, 0, 2); l.position.set(x, HS - 0.35, z); scene.add(l);
}

// ---------------------------------------------------------------- LOUNGE
// rugs
function rug(x0, x1, z0, z1, c1, c2) {
  const t = cv(256, 256, (g, w, h) => { g.fillStyle = c1; g.fillRect(0, 0, w, h); g.strokeStyle = c2; g.lineWidth = 14; g.strokeRect(14, 14, w - 28, h - 28);
    g.fillStyle = c2; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(w / 2, 40 + i * 40); g.lineTo(w / 2 + 40, 60 + i * 40); g.lineTo(w / 2, 80 + i * 40); g.lineTo(w / 2 - 40, 60 + i * 40); g.fill(); } });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), new THREE.MeshStandardMaterial({ map: t, roughness: 1 }));
  m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, 0.005, (z0 + z1) / 2); m.receiveShadow = true; scene.add(m);
}
rug(12.6, 15.1, 11.25, 13.15, '#8c2f1f', '#e9c46a'); rug(15.3, 17.9, 10.9, 13.1, '#2f4a6e', '#d9a35b');
// grand piano (extruded plan shape)
{ const s = new THREE.Shape(); s.moveTo(8.75, 11.55); s.lineTo(10.2, 11.55); s.lineTo(10.2, 12.1);
  s.bezierCurveTo(10.2, 12.65, 10.05, 13.05, 9.65, 13.1); s.bezierCurveTo(9.3, 13.15, 9.25, 12.75, 8.75, 12.75); s.lineTo(8.75, 11.55);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: false }); g.rotateX(Math.PI / 2);
  const p = new THREE.Mesh(g, M('#0d0d0d', { roughness: 0.15, metalness: 0.2 })); p.position.y = 1.0; p.castShadow = true; scene.add(p);
  box(8.75, 10.2, 0.7, 0.72, 11.5, 11.75, M('#f5f5f0'));
  for (const [x, z] of [[8.9, 11.7], [10.05, 11.7], [9.6, 12.9]]) box(x - 0.04, x + 0.04, 0, 0.7, z - 0.04, z + 0.04, black);
  const lid = new THREE.Mesh(new THREE.ShapeGeometry(s), M('#111', { roughness: 0.15, side: THREE.DoubleSide }));
  lid.rotation.x = Math.PI / 2; lid.position.y = 1.0; scene.add(lid);
  box(9.15, 9.75, 0, 0.48, 11.15, 11.45, M('#8a5d36')); }
// LED dance floor
const LED = ['#ff4fa3', '#ffd166', '#4cc9f0', '#80ed99', '#f77f00', '#b388eb'];
for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
  const c = LED[(i * 2 + j) % 6];
  box(10.55 + i * 0.45, 10.98 + i * 0.45, 0, 0.02, 11.3 + j * 0.45, 11.73 + j * 0.45, new THREE.MeshBasicMaterial({ color: c, toneMapped: false }), false);
}
{ const l = new THREE.PointLight('#d08cff', 2.5, 0, 2); l.position.set(11.45, 0.4, 12.2); scene.add(l); }
// moroccan corner: low table, poufs, pink sofa
box(13.4, 14.3, 0, 0.4, 11.95, 12.45, M('#8a5d36', { roughness: 0.5 }));
box(13.45, 14.25, 0.4, 0.42, 12.0, 12.4, M('#c9a24a', { metalness: 0.6, roughness: 0.3 }));
for (const x of [13.1, 13.85, 14.6]) cyl(x, 11.55, 0.24, 0, 0.42, M('#e9c46a', { roughness: 0.9 }), 20, 0.22);
function sofa(x0, x1, z0, z1, c, backSide) {
  const mat = M(c, { roughness: 0.9 });
  box(x0, x1, 0, 0.45, z0, z1, mat);
  if (backSide === 'S') box(x0, x1, 0.45, 0.85, z1 - 0.18, z1, mat);
  if (backSide === 'W') box(x0, x0 + 0.18, 0.45, 0.85, z0, z1, mat);
  if (backSide === 'S') { box(x0, x0 + 0.15, 0.45, 0.65, z0, z1, mat); box(x1 - 0.15, x1, 0.45, 0.65, z0, z1, mat); }
}
sofa(12.8, 14.9, 12.6, 13.15, '#f2a7b8', 'S');
for (const [x, c] of [[13.3, '#c2185b'], [13.9, '#e9c46a'], [14.5, '#2a9d8f']]) box(x - 0.18, x + 0.18, 0.45, 0.8, 12.85, 12.97, M(c));
sofa(15.4, 15.95, 11.0, 12.7, '#c75b7a', 'W');
// comics cabinet
box(15.35, 16.35, 0, 0.9, 12.85, 13.17, M('#6d597a'));
for (let i = 0; i < 12; i++) box(15.42 + i * 0.075, 15.47 + i * 0.075, 0.5, 0.82, 12.86, 12.9, M(LED[i % 6]));
// rocking chairs facing the fire
function rocker(x, z, rot) {
  const g = new THREE.Group(), mat = M('#a0702c', { roughness: 0.6 });
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.5), mat); seat.position.y = 0.42; g.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.65, 0.05), mat); back.position.set(0, 0.78, -0.26); back.rotation.x = -0.25; g.add(back);
  const cush = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.06, 0.44), M('#e8d9b5')); cush.position.y = 0.47; g.add(cush);
  for (const dx of [-0.24, 0.24]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.02, 6, 24, 0.75), mat); r.rotation.y = Math.PI / 2; r.rotation.z = -Math.PI / 2 - 0.375; r.position.set(dx, 0.92, 0); g.add(r);
    for (const dz of [-0.2, 0.2]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.4, 0.03), mat); l.position.set(dx, 0.22, dz); g.add(l); } }
  g.traverse(o => { o.castShadow = true; }); g.position.set(x, 0, z); g.rotation.y = rot; scene.add(g);
}
rocker(16.9, 11.0, -Math.PI / 2 - 0.5); rocker(16.6, 11.9, -Math.PI / 2); rocker(16.9, 12.8, -Math.PI / 2 + 0.5);
// fireplace (stone chimney breast on east wall)
const stoneM = new THREE.MeshStandardMaterial({ map: texStone, roughness: 0.95 });
box(18.15, 18.7, 0, HP, 10.6, 12.5, stoneM);
box(18.14, 18.16, 0.35, 1.15, 11.05, 12.05, black);
box(17.9, 18.7, 0, 0.35, 10.6, 12.5, M('#8a5d36'));
box(18.0, 18.2, 1.25, 1.35, 10.75, 12.35, darkWood);
{ const fire = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.55, 16), new THREE.MeshBasicMaterial({ color: '#ff8a1e', toneMapped: false }));
  fire.position.set(18.3, 0.68, 11.55); scene.add(fire);
  const f2 = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.4, 16), new THREE.MeshBasicMaterial({ color: '#ffe066', toneMapped: false })); f2.position.set(18.25, 0.6, 11.4); scene.add(f2);
  for (const z of [11.35, 11.75]) { const lg = cyl(18.3, z, 0.07, 0.36, 0.5, M('#5e3d22')); lg.rotation.z = Math.PI / 2; }
  const fl = new THREE.PointLight('#ff8a3a', 9, 0, 2); fl.position.set(17.7, 0.8, 11.55); scene.add(fl); }
wallPlane('W', 18.145, 11.55, 1.6, 1.7, 2.2, neon('GOOD LIFE', 800, 200, 130));
// chandeliers (recovered props)
for (const [x, z] of [[9.6, 11.5], [12.4, 11.6], [16.2, 11.6]]) {
  cyl(x, z, 0.01, HP - 0.7, HP, black, 6);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.02, 8, 32), M('#c9a24a', { metalness: 0.8, roughness: 0.3 })); ring.rotation.x = Math.PI / 2; ring.position.set(x, HP - 0.75, z); scene.add(ring);
  for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; const b = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ color: '#fff0c8', toneMapped: false })); b.position.set(x + Math.cos(a) * 0.35, HP - 0.68, z + Math.sin(a) * 0.35); scene.add(b); }
  const l = new THREE.PointLight('#ffd59a', 2.5, 0, 2); l.position.set(x, HP - 0.9, z); scene.add(l);
}
// plants
function plant(x, z, s = 1) { cyl(x, z, 0.18 * s, 0, 0.4 * s, M('#b5562b'), 16, 0.22 * s);
  for (let i = 0; i < 6; i++) { const lf = new THREE.Mesh(new THREE.SphereGeometry(0.22 * s, 10, 8), M('#4f7a3a', { roughness: 0.8 })); lf.position.set(x + (Math.random() - 0.5) * 0.3 * s, 0.6 * s + Math.random() * 0.5 * s, z + (Math.random() - 0.5) * 0.3 * s); lf.castShadow = true; scene.add(lf); } }
plant(7.95, 10.2); plant(18.35, 9.45); plant(10.3, 9.45, 0.8); plant(16.9, 9.45, 0.8); plant(8.0, 4.6, 0.9);

// ---------------------------------------------------------------- lights
scene.add(new THREE.HemisphereLight('#fff4e0', '#8a6a4a', 0.75));
const sun = new THREE.DirectionalLight('#ffe2b8', 1.3);
sun.position.set(6, 12, 22); sun.target.position.set(13, 0, 8); scene.add(sun.target);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 50 });
sun.shadow.bias = -0.0005; scene.add(sun);

// ---------------------------------------------------------------- cameras
const cams = {
  bar:    { pos: [12.2, 1.65, 9.3], at: [15.4, 1.35, 2.4], fov: 62 },
  sala:   { pos: [17.7, 1.7, 9.2], at: [8.2, 1.3, 5.4], fov: 64 },
  lounge: { pos: [9.2, 1.95, 10.15], at: [18.4, 0.9, 12.0], fov: 66 },
  top:    { pos: [3.5, 16, 21], at: [12.8, 0, 6.2], fov: 45 },
};
const c = cams[VIEW];
const camera = new THREE.PerspectiveCamera(c.fov, W / H, 0.05, 200);
camera.position.set(...c.pos); camera.lookAt(...c.at);
renderer.render(scene, camera);
window.done = true;
