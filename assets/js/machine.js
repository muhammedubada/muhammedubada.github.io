// Interactive 3D "project machine" for the Projects page.
// Adapted from the Agentic Factory 3D template (procedural three.js, no models):
// six stations on a metal plate, each one of Muhammed Ubada Alioğlu's machine projects,
// a conveyor carrying a part through them, four modes and five cameras.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const TAU = Math.PI * 2;
const lang = () => (window.I18N && window.I18N.lang) || 'tr';
const L = (en, tr) => (lang() === 'tr' ? tr : en);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// station id -> project title fragment (matched against SITE_CONTENT.projects, English canonical)
const STATIONS = [
  { id: 'pres', match: /Eccentric Press/i, step: 1, pos: [-4.15, 0.29, -0.65], out: ['part formed', 'parça şekillendi'] },
  { id: 'fosfat', match: /Phosphating/i, step: 2, pos: [-1.65, 0.29, -2.03], out: ['phosphate coat', 'fosfat kaplama'] },
  { id: 'galvaniz', match: /Galvanizing/i, step: 3, pos: [1.5, 0.29, -2.08], out: ['zinc coat', 'çinko kaplama'] },
  { id: 'paketleme', match: /Flow-Pack/i, step: 4, pos: [4.03, 0.29, 0.12], out: ['packed', 'paketlendi'] },
  { id: 'pompa', match: /Wastewater/i, step: 5, pos: [0.93, 0.29, 1.85], out: ['water treated', 'su arıtmaya'] },
  { id: 'depozitor', match: /Depositor/i, step: 0, pos: [-1.6, 0.29, 1.2], out: ['dosing', 'dozajlama'] },
];

const SHORT = {
  pres: ['Press cell', 'Pres hücresi'],
  fosfat: ['Phosphating', 'Fosfat'],
  galvaniz: ['Galvanizing', 'Galvaniz'],
  paketleme: ['Flow-pack', 'Paketleme'],
  pompa: ['Pump stations', 'Pompa istasyonu'],
  depozitor: ['Depositor', 'Depozitör'],
};

const UI = {
  title: ['Project workshop', 'Proje atölyesi'],
  sub: ['Interactive machine', 'Etkileşimli makine'],
  running: ['Machine running', 'Makine çalışıyor'],
  paused: ['Machine paused', 'Makine durdu'],
  heading: ['The machines I programmed', 'Programladığım makineler'],
  index: ['6 STATIONS / 1 SYSTEM', '6 İSTASYON / 1 SİSTEM'],
  coords: ['PROTOTYPE 01 — FROM BLANK TO PACKAGE', 'PROTOTİP 01 — PARÇADAN PAKETE'],
  assembled: ['Assembled', 'Bütün'], cutaway: ['Cutaway', 'Kesit'], stations: ['Stations', 'İstasyonlar'], order: ['One part', 'Bir parça'],
  view: ['VIEW', 'GÖRÜNÜM'], overview: ['Overview', 'Genel'], side: ['Side', 'Yan'], top: ['Top', 'Üst'], station: ['Station', 'İstasyon'], flight: ['Flight', 'Uçuş'],
  hint: ['Drag to rotate · click a station to open the project', 'Döndürmek için sürükle · projeyi açmak için istasyona tıkla'],
  credit: ['3D scene adapted from the Agentic Factory template', '3D sahne Agentic Factory şablonundan uyarlandı'],
  loading: ['Assembling the machine', 'Makine kuruluyor'],
  errTitle: ['Could not start the 3D scene', '3D sahne başlatılamadı'],
  errBody: ['Check that WebGL is turned on in your browser. The project list is below.', 'Tarayıcında WebGL açık mı kontrol et. Proje listesi aşağıda.'],
  retry: ['Try again', 'Tekrar dene'],
  stepWord: ['Step', 'Adım'],
  control: ['control', 'kontrol'],
  pauseLbl: ['Pause the animation', 'Animasyonu durdur'],
  resumeLbl: ['Resume the animation', 'Animasyonu sürdür'],
};
const T = (k) => L(UI[k][0], UI[k][1]);

const JOURNEY = [
  [['Blank arrives', 'Press cell · a raw part is loaded by the servo axis'], ['Ham parça geldi', 'Pres hücresi · servo eksen parçayı yükledi']],
  [['Part formed', 'Press cell · 100 ms pulse, the eccentric press strikes'], ['Parça şekillendi', 'Pres hücresi · 100 ms darbe, eksantrik pres bastı']],
  [['Phosphate coating', 'Phosphating · energy per product is being counted'], ['Fosfat kaplama', 'Fosfat · ürün başına enerji sayılıyor']],
  [['Zinc coating', 'Galvanizing · acid, rinse, flux and the furnace dip'], ['Çinko kaplama', 'Galvaniz · asit, durulama, flux ve ocak dalışı']],
  [['Packed', 'Flow-pack · three servos, three heating zones'], ['Paketlendi', 'Paketleme · üç servo, üç ısı bölgesi']],
  [['Wash water treated', 'Pump station · three stages, PID at 30–50 Hz'], ['Yıkama suyu arıtıldı', 'Pompa istasyonu · üç kademe, 30–50 Hz PID']],
];

const SVG = {
  assembled: '<path d="M8 1.5l6 3.3v6.4l-6 3.3-6-3.3V4.8L8 1.5zM2 4.8l6 3.4 6-3.4M8 8.2v6.3" stroke="currentColor" stroke-linejoin="round"/>',
  cutaway: '<path d="M3 2h10v12H3zM8 2v12M10.5 4l2.5 2.5m-2.5 0L13 9m-2.5 0 2.5 2.5" stroke="currentColor" stroke-linejoin="round"/>',
  stations: '<path d="M8 1.5l6 3-6 3-6-3 6-3zM2 8l6 3 6-3M2 11.5l6 3 6-3" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>',
  order: '<path d="M5 2.5l8 5.5-8 5.5v-11z" stroke="currentColor" stroke-linejoin="round"/>',
};

function markup() {
  const modes = ['assembled', 'cutaway', 'stations', 'order'];
  const cams = ['overview', 'side', 'top', 'station', 'flight'];
  return `
  <div class="mx-scene" data-role="scene" role="img" aria-label="${esc(L('Interactive 3D machine with six stations, one for each project. Drag to rotate, click a station to open it.', 'Altı istasyonlu etkileşimli 3D makine; her istasyon bir proje. Döndürmek için sürükle, açmak için istasyona tıkla.'))}"></div>
  <div class="mx-vignette"></div>
  <header class="mx-topbar">
    <div class="mx-identity">
      <div class="mx-mark"><svg width="17" height="17" viewBox="0 0 20 20" fill="none"><path d="M3 5l7 11 7-11M7 5l3 5 3-5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
      <div><strong>${esc(T('title'))}</strong><small>${esc(T('sub'))}</small></div>
    </div>
    <div class="mx-status" data-role="status"><i></i><span data-role="status-text">${esc(T('running'))}</span><span>SERIES 2026</span></div>
  </header>
  <div class="mx-heading">${esc(T('heading'))} <span class="mx-index">${esc(T('index'))}</span></div>
  <div class="mx-coords">${esc(T('coords'))}</div>
  <div class="mx-journey" data-role="journey">
    <div class="mx-journey-icon"><svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M3 4h10v9H3zM6 4V2h4v2m-5 4h6" stroke="currentColor" stroke-linejoin="round"/></svg></div>
    <div><strong data-role="journey-title"></strong><small data-role="journey-detail"></small></div>
    <div class="mx-track"><i data-role="journey-progress"></i></div>
  </div>
  <div class="mx-labels" data-role="labels"></div>
  <div class="mx-tooltip" data-role="tooltip" role="tooltip"><strong></strong><p></p></div>
  <div class="mx-controls">
    <nav class="mx-modebar" aria-label="${esc(L('Machine mode', 'Makine modu'))}">
      ${modes.map((m, i) => `<button type="button" data-mode="${m}" aria-pressed="${i === 0}"><svg viewBox="0 0 16 16" fill="none">${SVG[m]}</svg>${esc(T(m))}</button>`).join('')}
    </nav>
    <nav class="mx-camrow" aria-label="${esc(L('Camera', 'Kamera'))}">
      <span class="mx-caption">${esc(T('view'))}</span>
      ${cams.map((c, i) => `<button type="button" data-camera="${c}" aria-pressed="${i === 0}">${esc(T(c))}</button>`).join('')}
      <span class="mx-divider"></span>
      <button type="button" data-role="play" aria-label="${esc(T('pauseLbl'))}" aria-pressed="false"></button>
    </nav>
  </div>
  <footer class="mx-footer">
    <span class="mx-credit">${esc(T('credit'))}</span>
    <span class="mx-hint"><svg width="13" height="16" viewBox="0 0 13 16" fill="none"><rect x="2" y="1" width="9" height="14" rx="4.5" stroke="currentColor"/><path d="M6.5 4v3" stroke="currentColor" stroke-linecap="round"/></svg>${esc(T('hint'))}</span>
  </footer>
  <div class="mx-loading" data-role="loading"><i></i><span>${esc(T('loading'))}</span></div>
  <div class="mx-error" data-role="error" role="alert"><strong>${esc(T('errTitle'))}</strong><p>${esc(T('errBody'))}</p><button type="button" data-role="retry">${esc(T('retry'))}</button></div>`;
}

export function mountMachine(host, content) {
  host.classList.add('mx');
  host.style.height = '';
  host.setAttribute('data-noi18n', '');
  host.innerHTML = markup();
  const $ = (role) => host.querySelector(`[data-role="${role}"]`);
  const projects = (content.projects || []).filter((p) => p && p.title);
  // the English canonical list is what the regexes match; the rendered content may be translated
  const canon = (window.SITE_CONTENT && window.SITE_CONTENT.projects) || projects;
  const defs = STATIONS.map((d, i) => {
    let idx = canon.findIndex((p) => d.match.test(p.title));
    if (idx < 0) idx = Math.min(i, projects.length - 1);
    const p = projects[idx] || {};
    return { ...d, index: i, projectIndex: idx, name: L(SHORT[d.id][0], SHORT[d.id][1]), title: p.title || '', desc: p.summary || '' };
  });
  const cleanups = [];
  const listen = (t, type, fn, opts) => { t.addEventListener(type, fn, opts); cleanups.push(() => t.removeEventListener(type, fn, opts)); };
  const dispose = () => { for (const fn of cleanups.reverse()) fn(); cleanups.length = 0; };
  const showError = (msg) => { $('loading').classList.add('done'); $('error').style.display = 'block'; if (msg) $('error').querySelector('p').textContent = msg; };
  $('retry').addEventListener('click', () => { dispose(); mountMachine(host, content); });

  const fontFamily = "'JetBrains Mono', ui-monospace, Menlo, monospace";
  const coarse = matchMedia('(pointer: coarse)').matches;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lowPerf = !!(window.PERF && window.PERF.tier === 'low');

  try {
    const sceneEl = $('scene');
    const frameWidth = () => host.clientWidth, frameHeight = () => host.clientHeight;
    const LIME = 0xc3e41d;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(33, Math.max(1, frameWidth()) / Math.max(1, frameHeight()), 0.1, 150);
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: !lowPerf, alpha: true, powerPreference: 'high-performance' });
    } catch (e) { showError(); throw e; }
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(devicePixelRatio, lowPerf ? 1 : frameWidth() < 900 ? 1.5 : 1.75));
    renderer.setSize(frameWidth(), frameHeight());
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = !lowPerf;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.localClippingEnabled = true;
    sceneEl.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.065; controls.enablePan = false;
    controls.minDistance = 7; controls.maxDistance = 55; controls.minPolarAngle = 0.09; controls.maxPolarAngle = Math.PI * 0.475;
    controls.rotateSpeed = 0.48; controls.enableZoom = false;   // the wheel scrolls the page
    if (coarse) controls.enableRotate = false;                  // a finger scrolls the page

    const pmrem = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment();
    const env = pmrem.fromScene(room, 0.04);
    scene.environment = env.texture; scene.environmentIntensity = 0.62; room.dispose(); pmrem.dispose();
    scene.add(new THREE.HemisphereLight(0xdbe5f4, 0x29211a, 2));
    const key = new THREE.DirectionalLight(0xfff1d8, 4.2);
    key.position.set(-4, 12, 7); key.castShadow = !lowPerf; key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -10, right: 10, top: 9, bottom: -9, near: 0.5, far: 35 });
    key.shadow.normalBias = 0.035; key.shadow.bias = -0.0002; key.shadow.radius = 4; scene.add(key);
    const rim = new THREE.DirectionalLight(0xc4d4ed, 3.1); rim.position.set(3, 7, -8); scene.add(rim);
    const warm = new THREE.PointLight(0xe9ff6a, 22, 20, 2); warm.position.set(-4, 5, 3); scene.add(warm);
    const front = new THREE.DirectionalLight(0xffffff, 1); front.position.set(5, 3, 10); scene.add(front);

    const mat = (color, metalness = 0.1, roughness = 0.4, extra = {}) => new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });
    const M = {
      body: mat(0x30363f, 0.75, 0.29), base: mat(0x292f37, 0.85, 0.32), edge: mat(0x707986, 0.85, 0.24),
      chrome: mat(0xc3cad0, 0.92, 0.18), dark: mat(0x12171d, 0.45, 0.38), rubber: mat(0x0b1015, 0.1, 0.6),
      lime: mat(LIME, 0.52, 0.28), ivory: mat(0xdfe3df, 0.48, 0.26), copper: mat(0xc57e45, 0.85, 0.3),
      light: mat(LIME, 0.2, 0.25, { emissive: LIME, emissiveIntensity: 1.5 }),
      green: mat(0xc6d9a1, 0.1, 0.3, { emissive: 0x91b364, emissiveIntensity: 0.7 }),
      red: mat(0xff5a5a, 0.2, 0.3, { emissive: 0xff2a2a, emissiveIntensity: 0.6 }),
      glass: mat(0x81949e, 0.45, 0.16, { transparent: true, opacity: 0.19, depthWrite: false }),
      liquid: mat(0x9bc21a, 0.1, 0.1, { transparent: true, opacity: 0.55, emissive: 0x6f8f0a, emissiveIntensity: 0.25 }),
      water: mat(0x3f8fb0, 0.1, 0.1, { transparent: true, opacity: 0.55, emissive: 0x1d5570, emissiveIntensity: 0.2 }),
      acid: mat(0xd9d27a, 0.1, 0.1, { transparent: true, opacity: 0.55 }),
      zinc: mat(0xbfc7d2, 0.9, 0.15, { transparent: true, opacity: 0.8, emissive: 0x333a44, emissiveIntensity: 0.3 }),
      film: mat(0xe8ecef, 0.1, 0.2, { transparent: true, opacity: 0.6 }),
    };
    const geometries = new Map();
    const boxGeo = (w, h, d, r = 0.04) => {
      const k = `b${w},${h},${d},${r}`;
      if (!geometries.has(k)) geometries.set(k, r ? new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 3, h / 3, d / 3)) : new THREE.BoxGeometry(w, h, d));
      return geometries.get(k);
    };
    const box = (parent, w, h, d, x, y, z, m = M.body, r = 0.04) => { const o = new THREE.Mesh(boxGeo(w, h, d, r), m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; parent.add(o); return o; };
    const cyl = (parent, r, h, x, y, z, m = M.chrome, r2 = r, seg = 24) => {
      const k = `c${r},${r2},${h},${seg}`;
      if (!geometries.has(k)) geometries.set(k, new THREE.CylinderGeometry(r, r2, h, seg));
      const o = new THREE.Mesh(geometries.get(k), m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; parent.add(o); return o;
    };
    const ball = (parent, r, x, y, z, m = M.chrome) => { const k = `s${r}`; if (!geometries.has(k)) geometries.set(k, new THREE.SphereGeometry(r, 12, 8)); const o = new THREE.Mesh(geometries.get(k), m); o.position.set(x, y, z); parent.add(o); return o; };
    const tube = (parent, pts, r, m = M.chrome) => { const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))); const o = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(12, pts.length * 7), r, 8, false), m); o.castShadow = true; parent.add(o); return o; };
    const screw = (parent, x, y, z) => { cyl(parent, 0.055, 0.026, x, y, z, M.chrome, undefined, 12); box(parent, 0.068, 0.005, 0.009, x, y + 0.014, z, M.dark, 0); };
    const canvasTexture = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const ctx = c.getContext('2d'); draw(ctx, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy()); return { texture: t, canvas: c, ctx }; };
    const print = (ctx, txt, x, y, size = 20, color = '#eef1f7', weight = 500) => { ctx.fillStyle = color; ctx.font = `${weight} ${size}px ${fontFamily}`; ctx.fillText(txt, x, y); };
    const screen = (parent, w, h, x, y, z, tex) => { const map = 'texture' in tex ? tex.texture : tex; const o = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map, toneMapped: false })); o.position.set(x, y, z); parent.add(o); return o; };
    const bar = (c, x, y, w, h, frac, color = '#c3e41d', back = '#1f2a10') => { c.fillStyle = back; c.fillRect(x, y, w, h); c.fillStyle = color; c.fillRect(x, y, Math.max(2, w * Math.min(1, Math.max(0, frac))), h); };

    const machine = new THREE.Group(); scene.add(machine);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(70, 70), new THREE.ShadowMaterial({ opacity: 0.23 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -0.43; floor.receiveShadow = true; scene.add(floor);
    const shadowTex = canvasTexture(128, 128, (c, w, h) => { const g = c.createRadialGradient(64, 64, 12, 64, 64, 64); g.addColorStop(0, 'rgba(0,0,0,.8)'); g.addColorStop(0.55, 'rgba(0,0,0,.45)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); });
    const contact = new THREE.Mesh(new THREE.PlaneGeometry(18, 13), new THREE.MeshBasicMaterial({ map: shadowTex.texture, transparent: true, depthWrite: false, opacity: 0.65 }));
    contact.rotation.x = -Math.PI / 2; contact.position.y = -0.415; scene.add(contact);

    // plate
    box(machine, 12.8, 0.38, 8.25, 0, -0.09, 0, M.base, 0.17);
    box(machine, 12.6, 0.055, 8.08, 0, 0.13, 0, M.edge, 0.11);
    box(machine, 12.49, 0.09, 7.96, 0, 0.19, 0, M.body, 0.1);
    box(machine, 12.55, 0.027, 8.02, 0, -0.19, 0, M.dark, 0.06);
    box(machine, 11.9, 0.026, 0.032, 0, -0.17, 4.115, M.light, 0.01);
    for (const x of [-5.6, 5.6]) for (const z of [-3.35, 3.35]) { cyl(machine, 0.39, 0.25, x, -0.31, z, M.rubber); cyl(machine, 0.29, 0.09, x, -0.4, z, M.dark); screw(machine, x, 0.253, z); }
    for (const x of [-6.02, 6.02]) for (const z of [-3.73, 3.73]) screw(machine, x, 0.255, z);
    const engraving = canvasTexture(1536, 176, (c, w, h) => {
      c.fillStyle = '#252b32'; c.fillRect(0, 0, w, h); c.strokeStyle = '#4d545c'; c.lineWidth = 2; c.strokeRect(2, 2, w - 4, h - 4);
      print(c, 'ARKON', 45, 79, 40, '#d9d8cd', 650);
      print(c, L('·  PLC  ·  HMI  ·  SCADA  ·  six machines, one plate', '·  PLC  ·  HMI  ·  SCADA  ·  altı makine, tek plaka'), 240, 79, 34, '#b8bdc1', 450);
      print(c, L('MUHAMMED UBADA ALIOGLU    /    MACHINE PROJECTS 2025 – 2026', 'MUHAMMED UBADA ALIOGLU    /    MAKINE PROJELERI 2025 – 2026'), 47, 133, 19, '#737e88', 500);
      print(c, 'No. 2026', 1330, 130, 23, '#c3e41d');
    });
    const plate = screen(machine, 7.35, 0.84, -0.4, 0.25, 3.51, engraving); plate.rotation.x = -Math.PI / 2;
    for (let i = 0; i < 16; i++) box(machine, 0.015, 0.009, 0.11 + (i % 4) * 0.035, -5.6 + i * 0.09, 0.249, 3.5, M.edge, 0);
    const drafting = new THREE.Group(); scene.add(drafting);
    const dpts = [];
    for (const r of [7.5, 8.1]) for (let i = 0; i < 120; i++) for (const j of [i, i + 1]) { const a = (j / 120) * TAU; dpts.push(new THREE.Vector3(Math.cos(a) * r, -0.4, Math.sin(a) * r * 0.72)); }
    for (let i = 0; i < 52; i++) { const a = (i / 52) * TAU, r = 8.1; dpts.push(new THREE.Vector3(Math.cos(a) * r, -0.395, Math.sin(a) * r * 0.72), new THREE.Vector3(Math.cos(a) * (r + (i % 4 === 0 ? 0.16 : 0.07)), -0.395, Math.sin(a) * (r + (i % 4 === 0 ? 0.16 : 0.07)) * 0.72)); }
    drafting.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(dpts), new THREE.LineBasicMaterial({ color: 0x69717a, transparent: true, opacity: 0.12 })));

    // stations: common plinth
    const cutPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 10);
    const shell = (m) => { const s = m.clone(); s.clippingPlanes = [cutPlane]; s.clipShadows = true; s.side = THREE.DoubleSide; return s; };
    const S = { body: shell(M.body), ivory: shell(M.ivory), lime: shell(M.lime), edge: shell(M.edge), dark: shell(M.dark) };
    const gears = [];
    const gear = (parent, x, y, z, r = 0.3, vertical = false) => {
      const g = new THREE.Group(); g.position.set(x, y, z); if (vertical) g.rotation.x = Math.PI / 2; parent.add(g);
      cyl(g, r, 0.09, 0, 0, 0, M.copper); cyl(g, r * 0.66, 0.105, 0, 0, 0, M.dark); cyl(g, r * 0.22, 0.14, 0, 0, 0, M.chrome);
      for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU, b = box(g, r * 0.26, 0.085, r * 0.2, Math.cos(a) * r, 0, Math.sin(a) * r, M.copper, 0.008); b.rotation.y = -a; }
      g.userData.moving = true; gears.push({ g, vertical }); return g;
    };
    const stations = [];
    defs.forEach((d, i) => {
      const group = new THREE.Group(); group.position.fromArray(d.pos); machine.add(group);
      const glowMat = M.light.clone(); glowMat.emissiveIntensity = 0.5;
      box(group, 2.05, 0.12, 1.78, 0, 0.03, 0, M.dark, 0.1);
      box(group, 1.97, 0.03, 1.7, 0, 0.12, 0, glowMat, 0.09);
      box(group, 2.03, 0.17, 1.75, 0, 0.215, 0, M.body, 0.1);
      for (const x of [-0.85, 0.85]) for (const z of [-0.7, 0.7]) screw(group, x, 0.311, z);
      gear(group, -0.35, 0.45, 0, 0.27); gear(group, 0.22, 0.45, 0.12, 0.21);
      box(group, 0.6, 0.15, 0.36, 0.52, 0.47, -0.33, M.dark);
      for (let j = 0; j < 6; j++) box(group, 0.025, 0.16, 0.37, 0.3 + j * 0.08, 0.47, -0.33, M.edge, 0.004);
      tube(group, [[-0.7, 0.4, -0.4], [-0.55, 0.48, 0.4], [0.35, 0.45, 0.6], [0.7, 0.58, 0.23]], 0.023, M.light);
      const plaque = canvasTexture(512, 116, (c, w, h) => { c.fillStyle = '#151a20'; c.fillRect(0, 0, w, h); print(c, String(i + 1).padStart(2, '0'), 24, 76, 42, '#c3e41d', 550); print(c, d.name.toLocaleUpperCase(lang() === 'tr' ? 'tr' : 'en'), 111, 73, 33, '#d7d9d7', 550); });
      screen(group, 1.54, 0.345, 0, 0.27, 0.891, plaque);
      const label = document.createElement('button');
      label.type = 'button'; label.className = 'mx-label'; label.dataset.case = 'projects:' + d.projectIndex;
      label.innerHTML = `<span class="mx-stem"></span><span class="mx-label-card"><span class="mx-label-title"><span>${String(i + 1).padStart(2, '0')}</span>${esc(d.name)}</span><span class="mx-label-meta">${d.step ? `${esc(T('stepWord'))} ${d.step} · ${esc(L(d.out[0], d.out[1]))}` : esc(T('control')) + ' · ' + esc(L(d.out[0], d.out[1]))}</span></span>`;
      $('labels').appendChild(label); cleanups.push(() => label.remove());
      stations.push({ ...d, group, base: new THREE.Vector3(...d.pos), glowMat, label, anchor: new THREE.Vector3(0, 2.5, 0) });
    });
    const byId = Object.fromEntries(stations.map((s) => [s.id, s]));
    const moving = [];
    const mark = (g) => { g.userData.moving = true; moving.push(g); return g; };

    // ---- 01 PRES: columns, crossbeam, ram, gripper rail, tray
    const pres = byId.pres.group;
    box(pres, 1.74, 0.5, 1.33, 0, 0.58, -0.05, S.ivory, 0.13);
    box(pres, 1.2, 0.12, 0.9, 0, 0.9, -0.3, S.dark, 0.03);
    for (const x of [-0.68, 0.68]) { cyl(pres, 0.065, 1.73, x, 1.35, -0.3, M.chrome); box(pres, 0.22, 1.8, 0.22, x, 1.37, -0.55, S.ivory, 0.035); }
    box(pres, 1.82, 0.3, 0.5, 0, 2.3, -0.4, S.lime, 0.045);
    const ram = mark(new THREE.Group()); pres.add(ram); ram.position.set(0, 1.6, -0.3);
    box(ram, 0.5, 0.42, 0.44, 0, 0, 0, M.body, 0.05); cyl(ram, 0.12, 0.28, 0, -0.33, 0, M.chrome); box(ram, 0.3, 0.05, 0.3, 0, -0.5, 0, M.dark, 0.01);
    cyl(pres, 0.08, 0.6, 0, 2.0, -0.4, M.chrome);
    box(pres, 1.5, 0.07, 0.14, 0, 1.1, 0.5, M.chrome, 0.02);           // gripper rail
    const grip = mark(new THREE.Group()); pres.add(grip); grip.position.set(-0.5, 1.1, 0.5);
    box(grip, 0.24, 0.3, 0.2, 0, 0.18, 0, M.body, 0.03); box(grip, 0.05, 0.3, 0.14, -0.08, -0.2, 0, M.lime, 0.01); box(grip, 0.05, 0.3, 0.14, 0.08, -0.2, 0, M.lime, 0.01);
    box(pres, 0.9, 0.16, 0.5, 0.35, 0.42, 0.55, S.dark, 0.03);        // tray
    const presTex = canvasTexture(512, 300, () => {});
    const drawPres = (t) => { const c = presTex.ctx; c.fillStyle = '#111b20'; c.fillRect(0, 0, 512, 300); const step = [0, 10, 20, 30, 50, 60, 70][Math.floor(t * 0.5) % 7];
      print(c, L('PRESS CYCLE', 'PRES ÇEVRİMİ'), 24, 44, 22, '#acb9b8', 550); print(c, `index = ${step}`, 330, 44, 22, '#c3e41d', 500);
      const rows = L(['Axis → press position', 'Gripper holds part', 'xPresBassin 100 ms', 'Tray down · knock-off', 'Back to part position'], ['Eksen → pres konumu', 'Pens parçayı tuttu', 'xPresBassin 100 ms', 'Pot aşağı · tokatlama', 'Parça konumuna dön']);
      rows.forEach((r, i) => { const on = Math.floor(t * 0.5) % 5 === i; c.fillStyle = on ? '#2a3414' : '#202c30'; c.beginPath(); c.roundRect(21, 70 + i * 44, 470, 36, 6); c.fill(); print(c, r, 36, 95 + i * 44, 18, on ? '#e9ff6a' : '#aab2a8'); }); };
    drawPres(0); const presScreen = screen(pres, 0.95, 0.56, 0.5, 1.55, 0.72, presTex); presScreen.rotation.y = -0.2;

    // ---- 02 FOSFAT: tank with liquid, dipping basket, tilted console
    const fos = byId.fosfat.group;
    box(fos, 1.9, 0.6, 1.36, 0, 0.64, -0.04, S.body, 0.11);
    box(fos, 1.1, 0.7, 0.9, -0.3, 1.25, -0.2, M.glass, 0.03);
    box(fos, 1.04, 0.5, 0.84, -0.3, 1.15, -0.2, M.liquid, 0.02);
    const basket = mark(new THREE.Group()); fos.add(basket); basket.position.set(-0.3, 1.9, -0.2);
    cyl(basket, 0.03, 0.9, 0, 0.45, 0, M.chrome); box(basket, 0.6, 0.3, 0.5, 0, 0, 0, M.edge, 0.02);
    for (let i = 0; i < 4; i++) box(basket, 0.08, 0.2, 0.08, -0.2 + i * 0.13, 0.05, 0, M.chrome, 0.01);
    box(fos, 0.08, 1.4, 0.08, -0.3, 1.85, -0.72, M.chrome, 0.01); box(fos, 0.08, 0.08, 0.6, -0.3, 2.55, -0.45, M.chrome, 0.01);
    const consoleTop = new THREE.Group(); consoleTop.position.set(0.55, 0.98, 0.25); consoleTop.rotation.x = -0.32; fos.add(consoleTop);
    box(consoleTop, 0.8, 0.12, 0.9, 0, 0, 0, S.ivory, 0.04);
    const fosTex = canvasTexture(640, 400, () => {});
    const drawFos = (t) => { const c = fosTex.ctx; c.fillStyle = '#111b20'; c.fillRect(0, 0, 640, 400);
      print(c, L('ENERGY PER PRODUCT', 'ÜRÜN BAŞINA ENERJİ'), 25, 45, 21, '#acb9b8', 550); print(c, (11.8 + Math.sin(t * 0.3) * 0.9).toFixed(1) + ' kWh', 470, 45, 22, '#c3e41d', 500);
      c.strokeStyle = '#c3e41d'; c.lineWidth = 4; c.beginPath();
      for (let i = 0; i <= 40; i++) { const x = 25 + i * 14.7, y = 220 - Math.max(0, Math.sin(i * 0.5 + t * 1.5)) * 100 - Math.sin(i * 0.13 + t * 0.4) * 20; i ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
      print(c, L('LOT 2026-10-A · M8×12 · 184 kg', 'LOT 2026-10-A · M8×12 · 184 kg'), 25, 275, 17, '#9db03a'); print(c, L('Operator: Default · auto cycle', 'Operatör: Varsayılan · oto çevrim'), 25, 305, 17, '#81948f');
      bar(c, 25, 335, 590, 14, (t * 0.07) % 1); print(c, L('CYCLE', 'ÇEVRİM'), 25, 380, 15, '#607475'); };
    drawFos(0); const fosScreen = screen(consoleTop, 0.7, 0.44, 0, 0.067, -0.08, fosTex); fosScreen.rotation.x = -Math.PI / 2;
    const toggles = [];
    for (let i = 0; i < 3; i++) { const x = -0.25 + i * 0.25; cyl(consoleTop, 0.05, 0.035, x, 0.08, 0.35, M.dark); const tg = cyl(consoleTop, 0.02, 0.12, x, 0.15, 0.35, M.chrome); tg.rotation.x = -0.4; tg.userData.moving = true; toggles.push(tg); }
    cyl(fos, 0.075, 0.06, 0.8, 1.02, -0.6, M.green);
    const barcode = mark(new THREE.Group()); fos.add(barcode); barcode.position.set(0.85, 1.3, 0.7);
    box(barcode, 0.12, 0.3, 0.1, 0, 0, 0, M.dark, 0.02); box(barcode, 0.08, 0.02, 0.4, 0, 0.1, 0.2, M.red, 0.005);

    // ---- 03 GALVANİZ: three tanks, overhead crane, big SCADA screen
    const gal = byId.galvaniz.group;
    box(gal, 1.95, 0.3, 1.0, 0, 0.44, 0.2, S.ivory, 0.045);
    const tankMats = [M.acid, M.water, M.zinc];
    for (let i = 0; i < 3; i++) { const x = -0.62 + i * 0.62; box(gal, 0.54, 0.4, 0.7, x, 0.8, 0.25, M.glass, 0.02); box(gal, 0.5, 0.3, 0.66, x, 0.74, 0.25, tankMats[i], 0.01); }
    for (const x of [-1.0, 1.0]) cyl(gal, 0.04, 1.7, x, 1.45, 0.25, M.chrome);
    box(gal, 2.1, 0.08, 0.1, 0, 2.3, 0.25, M.chrome, 0.01);
    const crane = mark(new THREE.Group()); gal.add(crane); crane.position.set(-0.62, 2.3, 0.25);
    box(crane, 0.3, 0.16, 0.2, 0, 0, 0, M.body, 0.02);
    const rope = mark(new THREE.Group()); crane.add(rope); cyl(rope, 0.015, 1.0, 0, -0.5, 0, M.dark);
    const hook = mark(new THREE.Group()); crane.add(hook); hook.position.y = -1.0; box(hook, 0.42, 0.14, 0.42, 0, 0, 0, M.edge, 0.02);
    for (let j = 0; j < 3; j++) cyl(hook, 0.03, 0.26, -0.12 + j * 0.12, -0.18, 0, M.chrome, 0.03, 8);
    box(gal, 2.42, 1.3, 0.2, 0, 1.9, -0.6, S.ivory, 0.08); box(gal, 2.28, 1.17, 0.1, 0, 1.9, -0.475, M.dark, 0.045);
    const galTex = canvasTexture(896, 440, () => {});
    const drawGal = (t) => { const c = galTex.ctx; c.fillStyle = '#0d1116'; c.fillRect(0, 0, 896, 440); c.fillStyle = '#1c2530'; c.fillRect(0, 0, 896, 54);
      print(c, L('GALVANIZING LINE · SCADA', 'GALVANİZ HATTI · SCADA'), 24, 36, 22, '#eef1f7', 600); print(c, L('AUTO', 'OTO'), 800, 36, 20, '#c3e41d', 600);
      const names = L(['ACID', 'RINSE', 'FLUX', 'FURNACE', 'COOL'], ['ASİT', 'DURULAMA', 'FLUX', 'OCAK', 'SOĞUTMA']);
      names.forEach((n, i) => { const x = 30 + i * 170; c.strokeStyle = '#c3e41d'; c.lineWidth = 3; c.strokeRect(x, 110, 140, 150); c.fillStyle = i === 3 ? '#ff8a3d55' : '#c3e41d33'; const lvl = 60 + Math.sin(t * 0.8 + i) * 12; c.fillRect(x + 4, 260 - lvl, 132, lvl - 4); print(c, n, x + 8, 290, 17, '#9db03a'); });
      const pos = 30 + ((Math.sin(t * 0.25) + 1) / 2) * 680; c.fillStyle = '#e9ff6a'; c.fillRect(pos, 70, 140, 10); c.fillRect(pos + 65, 80, 10, 30);
      print(c, L(`FURNACE ${Math.round(452 + Math.sin(t * 0.4) * 3)} °C`, `OCAK ${Math.round(452 + Math.sin(t * 0.4) * 3)} °C`), 30, 350, 20, '#e9ff6a', 600); print(c, L('DIP 02:14', 'DALIŞ 02:14'), 300, 350, 20, '#eef1f7'); print(c, L('RECIPE · LOT 4471 · PDF / EXCEL', 'REÇETE · LOT 4471 · PDF / EXCEL'), 520, 350, 17, '#81948f');
      bar(c, 30, 390, 836, 10, (t * 0.05) % 1); };
    drawGal(0); screen(gal, 2.16, 1.06, 0, 1.9, -0.42, galTex);
    box(gal, 0.21, 0.019, 0.008, 0, 1.3, -0.42, M.light, 0.003);

    // ---- 04 PAKETLEME: cabinet, film reel, jaws, packs
    const pak = byId.paketleme.group;
    box(pak, 1.75, 1.2, 1.02, 0, 0.95, -0.13, S.body, 0.12);
    box(pak, 1.58, 0.13, 1.09, 0, 1.6, -0.13, S.lime, 0.04);
    const reel = mark(new THREE.Group()); pak.add(reel); reel.position.set(-0.5, 2.1, -0.1);
    const core = cyl(reel, 0.42, 0.3, 0, 0, 0, M.film); core.rotation.x = Math.PI / 2;
    for (const z of [-0.17, 0.17]) { const disc = cyl(reel, 0.46, 0.04, 0, 0, z, M.chrome); disc.rotation.x = Math.PI / 2; }
    const axle = cyl(reel, 0.08, 0.5, 0, 0, 0, M.lime); axle.rotation.x = Math.PI / 2;
    box(pak, 0.1, 0.5, 0.1, -0.5, 1.75, -0.4, M.chrome, 0.01);
    box(pak, 1.3, 0.06, 0.5, 0.2, 1.6, 0.5, M.chrome, 0.01);                  // product bed
    const jawTop = mark(new THREE.Group()); pak.add(jawTop); jawTop.position.set(0.45, 2.0, 0.5);
    box(jawTop, 0.5, 0.18, 0.5, 0, 0, 0, M.body, 0.03); box(jawTop, 0.46, 0.04, 0.46, 0, -0.1, 0, M.red, 0.01);
    const jawBot = mark(new THREE.Group()); pak.add(jawBot); jawBot.position.set(0.45, 1.68, 0.5);
    box(jawBot, 0.5, 0.12, 0.5, 0, 0, 0, M.body, 0.03); box(jawBot, 0.46, 0.04, 0.46, 0, 0.07, 0, M.red, 0.01);
    for (const x of [0.2, 0.7]) cyl(pak, 0.03, 1.0, x, 2.1, 0.75, M.chrome);
    box(pak, 0.8, 0.1, 0.1, 0.45, 2.6, 0.75, M.lime, 0.02);
    const pusher = mark(new THREE.Group()); pak.add(pusher); pusher.position.set(-0.4, 1.72, 0.5);
    box(pusher, 0.08, 0.14, 0.3, 0, 0, 0, M.lime, 0.01);
    const pack = mark(new THREE.Group()); pak.add(pack); pack.position.set(-0.1, 1.72, 0.5);
    box(pack, 0.3, 0.12, 0.22, 0, 0, 0, M.ivory, 0.02);
    const pakTex = canvasTexture(512, 300, () => {});
    const drawPak = (t) => { const c = pakTex.ctx; c.fillStyle = '#111b20'; c.fillRect(0, 0, 512, 300); print(c, 'FLOW-PACK · c430', 24, 44, 22, '#acb9b8', 550); print(c, `${Math.round(38 + Math.sin(t) * 4)} ${L('ppm', 'ad/dk')}`, 380, 44, 22, '#c3e41d', 500);
      const ax = L(['JAW · servo 1', 'PUSHER · servo 2', 'FILM · servo 3'], ['ÇENE · servo 1', 'ASKER · servo 2', 'FİLM · servo 3']);
      ax.forEach((n, i) => { print(c, n, 24, 95 + i * 52, 17, '#aab2a8'); bar(c, 24, 105 + i * 52, 460, 10, (Math.sin(t * (1 + i * 0.3) + i) + 1) / 2); });
      const temps = [186, 184, 171].map((v, i) => Math.round(v + Math.sin(t * 0.5 + i) * 1.5));
      print(c, L(`ZONES ${temps[0]} · ${temps[1]} · ${temps[2]} °C`, `BÖLGELER ${temps[0]} · ${temps[1]} · ${temps[2]} °C`), 24, 275, 18, '#ff8a3d'); };
    drawPak(0); const pakScreen = screen(pak, 1.0, 0.58, 0.05, 1.05, 0.4, pakTex);

    // ---- 05 POMPA: wet well with rising water, three pumps, pipes
    const pmp = byId.pompa.group;
    box(pmp, 1.91, 0.3, 1.32, 0, 0.47, -0.06, S.body, 0.12);
    const well = cyl(pmp, 0.62, 1.2, -0.35, 1.2, -0.1, M.glass, 0.62, 32);
    const water = mark(cyl(pmp, 0.58, 1.0, -0.35, 1.1, -0.1, M.water, 0.58, 32));
    cyl(pmp, 0.66, 0.08, -0.35, 1.82, -0.1, M.edge, 0.66, 32);
    const pumps = [];
    for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU + 0.5, x = -0.35 + Math.cos(a) * 0.38, z = -0.1 + Math.sin(a) * 0.38; cyl(pmp, 0.11, 0.3, x, 2.0, z, M.body); const motor = cyl(pmp, 0.09, 0.22, x, 2.26, z, i === 2 ? M.edge : M.lime); motor.userData.moving = true; pumps.push(motor); cyl(pmp, 0.035, 1.1, x, 1.25, z, M.chrome); }
    tube(pmp, [[-0.35, 1.9, -0.1], [0.1, 2.2, -0.2], [0.55, 1.6, -0.3], [0.8, 0.7, -0.3]], 0.05, M.chrome);
    box(pmp, 0.9, 0.9, 0.5, 0.5, 1.07, 0.35, S.ivory, 0.05);
    const pmpTex = canvasTexture(512, 440, () => {});
    const drawPmp = (t) => { const c = pmpTex.ctx; c.fillStyle = '#111b20'; c.fillRect(0, 0, 512, 440); const lvl = (Math.sin(t * 0.35) + 1) / 2;
      print(c, L('STATION 1 · WET WELL', 'İSTASYON 1 · HAZNE'), 24, 44, 21, '#acb9b8', 550); print(c, `%${Math.round(20 + lvl * 70)}`, 410, 44, 22, '#c3e41d', 500);
      c.fillStyle = '#1f2a10'; c.fillRect(24, 70, 120, 300); c.fillStyle = '#3f8fb0'; c.fillRect(24, 370 - lvl * 300, 120, lvl * 300);
      [0.35, 0.6, 0.85].forEach((th, i) => { c.strokeStyle = '#c3e41d'; c.setLineDash([6, 6]); c.beginPath(); c.moveTo(24, 370 - th * 300); c.lineTo(144, 370 - th * 300); c.stroke(); c.setLineDash([]); print(c, L(`STAGE ${i + 1}`, `KADEME ${i + 1}`), 150, 375 - th * 300, 14, '#9db03a'); });
      ['P1', 'P2', 'P3'].forEach((p, i) => { const on = lvl > [0.3, 0.55, 0.8][i]; print(c, `${p}  ${on ? Math.round(30 + lvl * 20) + ' Hz' : L('standby', 'yedek')}`, 270, 110 + i * 60, 20, on ? '#e9ff6a' : '#607475', 600); });
      print(c, L('PID 30–50 Hz · torque OK', 'PID 30–50 Hz · tork OK'), 270, 330, 15, '#81948f'); print(c, 'WD770 · Modbus', 270, 360, 15, '#81948f');
      bar(c, 24, 400, 464, 10, lvl); };
    drawPmp(0); screen(pmp, 0.78, 0.68, 0.5, 1.15, 0.61, pmpTex);

    // ---- 06 DEPOZİTÖR: pedestal HMI, two-axis gantry with nozzle, cups
    const dep = byId.depozitor.group;
    box(dep, 1.6, 0.3, 1.1, 0, 0.44, 0, S.ivory, 0.05);
    for (const x of [-0.6, 0.6]) cyl(dep, 0.035, 1.1, x, 1.0, -0.2, M.chrome);
    box(dep, 1.4, 0.08, 0.08, 0, 1.55, -0.2, M.chrome, 0.01);
    const carriage = mark(new THREE.Group()); dep.add(carriage); carriage.position.set(-0.3, 1.55, -0.2);
    box(carriage, 0.26, 0.2, 0.26, 0, 0, 0, M.body, 0.02);
    const nozzle = mark(new THREE.Group()); carriage.add(nozzle); nozzle.position.set(0, -0.3, 0.12);
    cyl(nozzle, 0.04, 0.4, 0, 0, 0, M.chrome, 0.02); ball(nozzle, 0.05, 0, -0.22, 0, M.lime);
    for (let i = 0; i < 4; i++) cyl(dep, 0.1, 0.12, -0.45 + i * 0.3, 0.65, -0.08, M.ivory, 0.08, 16);
    cyl(dep, 0.07, 1.0, 0.55, 1.0, 0.5, M.body);
    const hmi = new THREE.Group(); hmi.position.set(0.55, 1.6, 0.5); hmi.rotation.x = -0.35; dep.add(hmi);
    box(hmi, 0.9, 0.6, 0.06, 0, 0, 0, M.dark, 0.03);
    const depTex = canvasTexture(640, 400, () => {});
    const drawDep = (t) => { const c = depTex.ctx; c.fillStyle = '#e7ebf0'; c.fillRect(0, 0, 640, 400); c.fillStyle = '#1c2530'; c.fillRect(0, 0, 640, 56); print(c, L('DEPOSITOR · AUTO', 'DEPOZİTÖR · OTO'), 24, 37, 22, '#e9ff6a', 600);
      const a1 = 60 + Math.sin(t * 0.7) * 50, a2 = 25 + Math.max(0, Math.sin(t * 1.4)) * 20;
      [[L('AXIS 1', 'EKSEN 1'), a1, 130], [L('AXIS 2', 'EKSEN 2'), a2, 60]].forEach(([n, v, mx], i) => { const y = 95 + i * 130; c.fillStyle = '#ffffff'; c.beginPath(); c.roundRect(24, y - 25, 430, 100, 8); c.fill(); print(c, `${n}   ${v.toFixed(2)} mm`, 40, y + 10, 24, '#131c26', 700); c.strokeStyle = '#55636f'; c.lineWidth = 2; c.beginPath(); c.moveTo(40, y + 50); c.lineTo(440, y + 50); c.stroke(); c.fillStyle = '#d1292b'; c.fillRect(40 + (v / mx) * 400 - 2, y + 40, 4, 20); c.fillStyle = '#134aa8'; c.beginPath(); const px = 40 + (0.7 * 400); c.moveTo(px, y + 42); c.lineTo(px - 7, y + 32); c.lineTo(px + 7, y + 32); c.fill(); });
      c.fillStyle = '#1c7a3a'; c.beginPath(); c.roundRect(480, 80, 130, 70, 10); c.fill(); print(c, L('AUTO START', 'OTO START'), 492, 122, 18, '#fff', 700); c.fillStyle = '#d1292b'; c.beginPath(); c.roundRect(480, 165, 130, 50, 10); c.fill(); print(c, 'STOP', 522, 198, 18, '#fff', 700); };
    drawDep(0); screen(hmi, 0.84, 0.54, 0, 0, 0.035, depTex);

    // ---- conveyor
    const path = new THREE.CatmullRomCurve3([[-3.95, 0.84, 0.65], [-3.1, 0.84, -0.12], [-1.45, 0.84, -0.79], [1.32, 0.84, -0.8], [3.3, 0.84, 0.19], [3.43, 0.84, 1.21], [1.35, 0.84, 2.7], [-1.4, 0.84, 2.52], [-3.54, 0.84, 1.65]].map((p) => new THREE.Vector3(...p)), true, 'catmullrom', 0.25);
    const belt = new THREE.Group(); machine.add(belt);
    const frameMesh = new THREE.Mesh(new THREE.TubeGeometry(path, 150, 0.35, 8, true), M.dark); frameMesh.scale.y = 0.3; frameMesh.position.y = 0.51; belt.add(frameMesh);
    const beltCount = 148, beltSlats = new THREE.InstancedMesh(boxGeo(0.135, 0.065, 0.63, 0.012), M.body, beltCount);
    beltSlats.receiveShadow = true; belt.add(beltSlats); beltSlats.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const dummy = new THREE.Object3D(), pVec = new THREE.Vector3(), tVec = new THREE.Vector3();
    const updateBelt = (t) => { for (let i = 0; i < beltCount; i++) { const u = (i / beltCount + t * 0.012) % 1; path.getPointAt(u, pVec); path.getTangentAt(u, tVec); dummy.position.copy(pVec); dummy.rotation.set(0, -Math.atan2(tVec.z, tVec.x), 0); dummy.updateMatrix(); beltSlats.setMatrixAt(i, dummy.matrix); } beltSlats.instanceMatrix.needsUpdate = true; };
    updateBelt(0);
    for (const side of [-1, 1]) { const pts = []; for (let i = 0; i <= 160; i++) { path.getPointAt(i / 160, pVec); path.getTangentAt(i / 160, tVec); pts.push(pVec.clone().add(new THREE.Vector3(-tVec.z * 0.36 * side, 0.09, tVec.x * 0.36 * side))); } belt.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.028, 6, false), M.chrome)); }
    for (let i = 0; i < 16; i++) { const p = path.getPointAt(i / 16); cyl(belt, 0.045, 0.43, p.x, 0.53, p.z, M.chrome); }
    const pipes = new THREE.Group(); machine.add(pipes);
    const flow = ['pres', 'fosfat', 'galvaniz', 'paketleme', 'pompa'].map((id) => byId[id]);
    for (let i = 0; i < flow.length - 1; i++) { const a = flow[i].base, b = flow[i + 1].base; const pts = [a.clone().add(new THREE.Vector3(0.4, 0.12, 0)), a.clone().lerp(b, 0.35).add(new THREE.Vector3(0, 0.1, -0.6)), a.clone().lerp(b, 0.65).add(new THREE.Vector3(0, 0.1, -0.6)), b.clone().add(new THREE.Vector3(-0.4, 0.12, 0))]; pipes.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, 0.054, 8, false), M.copper)); }

    // part cards carried on the belt
    const card = (title, sub, bg, fg) => canvasTexture(256, 352, (c, w, h) => { c.fillStyle = bg; c.fillRect(0, 0, w, h); c.strokeStyle = fg + '88'; c.lineWidth = 2; c.strokeRect(23, 112, 210, 139); c.fillStyle = fg; c.beginPath(); c.arc(128, 181, 38, 0, TAU); c.fill(); c.fillStyle = bg; c.beginPath(); c.arc(128, 181, 14, 0, TAU); c.fill(); print(c, title, 21, 48, 24, fg, 650); print(c, sub, 21, 79, 18, fg, 500); print(c, 'M8 × 12', 23, 320, 17, fg); });
    const packetTextures = [
      card(L('BLANK', 'HAM'), L('raw part', 'ham parça'), '#c57e45', '#30362d'),
      card(L('FORMED', 'ŞEKİLLİ'), L('press cell', 'pres hücresi'), '#dfe3df', '#30362d'),
      card(L('PHOSPHATE', 'FOSFAT'), L('coated', 'kaplandı'), '#3a4a14', '#e9ff6a'),
      card(L('ZINC', 'ÇİNKO'), L('galvanized', 'galvanizlendi'), '#bfc7d2', '#1c2530'),
      card(L('PACKED', 'PAKET'), L('flow-pack', 'flow-pack'), '#c3e41d', '#1c2530'),
    ];
    const packets = [];
    for (let i = 0; i < 6; i++) { const g = new THREE.Group(); g.userData.moving = true; machine.add(g); box(g, 0.47, 0.71, 0.04, 0, 0, 0, M.ivory, 0.022); const faces = packetTextures.map((tex) => { const s = screen(g, 0.43, 0.665, 0, 0, 0.024, tex); s.material.side = THREE.DoubleSide; s.visible = false; return s; }); const halo = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.414, 40), new THREE.MeshBasicMaterial({ color: LIME, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false })); halo.rotation.x = -Math.PI / 2; halo.position.y = -0.37; g.add(halo); halo.visible = false; packets.push({ group: g, faces, halo, stage: -1, phase: 0 }); }
    const nearestPort = (x, z) => { let best = 0, dist = Infinity; for (let i = 0; i < 300; i++) { const p = path.getPointAt(i / 300), d = (p.x - x) ** 2 + (p.z - z) ** 2; if (d < dist) { dist = d; best = i / 300; } } return best; };
    const fosU = nearestPort(-1.65, -0.7), galU = nearestPort(1.5, -0.7), pakU = nearestPort(3.3, 0.5), pmpU = nearestPort(0.93, 2.65);

    // merge static geometry
    function compact(group) {
      for (const child of [...group.children]) if (child.isGroup) compact(child);
      const buckets = new Map();
      for (const child of group.children) { if (!child.isMesh || child.isInstancedMesh || child.userData.moving || Array.isArray(child.material)) continue; const k = child.material.uuid; if (!buckets.has(k)) buckets.set(k, []); buckets.get(k).push(child); }
      for (const list of buckets.values()) { if (list.length < 2) continue; const geos = list.map((m) => { m.updateMatrix(); const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone(); return g.applyMatrix4(m.matrix); }); const merged = mergeGeometries(geos, false); for (const geo of geos) geo.dispose(); if (!merged) continue; const mesh = new THREE.Mesh(merged, list[0].material); mesh.castShadow = list.some((x) => x.castShadow); mesh.receiveShadow = list.some((x) => x.receiveShadow); for (const m of list) group.remove(m); group.add(mesh); }
    }
    compact(machine);
    stations.forEach((s) => s.group.traverse((o) => { o.userData.station = s.id; }));
    const pickables = stations.map((s) => s.group);

    let mode = 'assembled', cameraMode = 'overview', playing = !reduceMotion, simTime = 0, spread = 0, selected = 'pres', hovered = null;
    let width = frameWidth(), height = frameHeight(), mobile = width <= 900, lastInteraction = performance.now(), dragging = false, wasDragged = false, downX = 0, downY = 0;
    let cameraAnimating = true, flightTime = 0, lastDraw = -1, visible = true, contextLost = false, sized = false, baseDistance = 25;
    const desiredPosition = new THREE.Vector3(), desiredTarget = new THREE.Vector3(0, 1, 0), viewDirection = new THREE.Vector3(10.5, 10.8, 17).normalize();
    function layoutCamera() {
      if (!frameWidth() || !frameHeight()) return;
      const first = !sized; sized = true; width = frameWidth(); height = frameHeight(); mobile = width <= 900;
      renderer.setSize(width, height); camera.aspect = width / height;
      const aspect = width / height, availableWidth = mobile ? 0.91 : Math.min(0.55, aspect > 2 ? 0.54 : 0.57);
      const hf = 17.3 / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * aspect * availableWidth);
      const vf = 11.5 / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 0.62);
      baseDistance = Math.max(hf, vf) * (mobile ? 0.9 : 0.8); controls.maxDistance = Math.max(55, baseDistance * 1.6);
      camera.updateProjectionMatrix(); setCameraGoal(); cameraAnimating = true;
      if (first) { camera.position.copy(desiredPosition); controls.target.copy(desiredTarget); controls.update(); cameraAnimating = false; }
    }
    function setCameraGoal() {
      const expand = mode === 'stations' ? 1.2 : 1;
      if (cameraMode === 'station') { const s = byId[selected]; desiredTarget.copy(s.group.position).add(new THREE.Vector3(0, 1.25, 0)); desiredPosition.copy(desiredTarget).addScaledVector(viewDirection, mobile ? 9 : 12); }
      else { desiredTarget.set(0, 0.35, 0); const d = baseDistance * expand; if (cameraMode === 'side') desiredPosition.set(13, 5, 20).normalize().multiplyScalar(d).add(desiredTarget); else if (cameraMode === 'top') desiredPosition.set(0.01, d, 0.8).add(desiredTarget); else desiredPosition.copy(viewDirection).multiplyScalar(d).add(desiredTarget); }
    }
    const syncButtons = () => { host.querySelectorAll('[data-mode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === mode))); host.querySelectorAll('[data-camera]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.camera === cameraMode))); $('journey').classList.toggle('visible', mode === 'order'); };
    function setMode(name) { mode = name; lastInteraction = performance.now(); if (mode === 'order') { simTime = 0; lastDraw = -1; play(); cameraMode = 'overview'; } else if (cameraMode === 'station') cameraMode = 'overview'; setCameraGoal(); cameraAnimating = true; syncButtons(); }
    function focusStation(id) { if (!byId[id]) return; selected = id; if (mode === 'order') mode = 'assembled'; cameraMode = 'station'; lastInteraction = performance.now(); setCameraGoal(); cameraAnimating = true; syncButtons(); }
    function setCamera(name) { cameraMode = name; if (mode === 'order') mode = 'assembled'; lastInteraction = performance.now(); flightTime = 0; setCameraGoal(); cameraAnimating = true; syncButtons(); }
    function syncPlayback() { const b = $('play'); b.setAttribute('aria-label', playing ? T('pauseLbl') : T('resumeLbl')); b.setAttribute('aria-pressed', String(!playing)); b.innerHTML = playing ? '<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><rect x="2" y="1" width="2.5" height="10" rx=".5"/><rect x="7.5" y="1" width="2.5" height="10" rx=".5"/></svg>' : '<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M3 1l8 5-8 5z"/></svg>'; $('status').classList.toggle('paused', !playing); $('status-text').textContent = playing ? T('running') : T('paused'); }
    const play = () => { playing = true; syncPlayback(); }, pause = () => { playing = false; syncPlayback(); };
    host.querySelectorAll('[data-mode]').forEach((b) => listen(b, 'click', () => setMode(b.dataset.mode)));
    host.querySelectorAll('[data-camera]').forEach((b) => listen(b, 'click', () => setCamera(b.dataset.camera)));
    listen($('play'), 'click', () => (playing ? pause() : play()));
    syncPlayback(); layoutCamera(); camera.position.copy(desiredPosition); controls.target.copy(desiredTarget); controls.update(); cameraAnimating = false;
    const ro = new ResizeObserver(() => layoutCamera()); ro.observe(host); cleanups.push(() => ro.disconnect());
    controls.addEventListener('start', () => { dragging = true; cameraAnimating = false; lastInteraction = performance.now(); });
    controls.addEventListener('end', () => { dragging = false; lastInteraction = performance.now(); });

    const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2(), tooltip = $('tooltip');
    const local = (e) => { const r = host.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    const hitStation = (x, y) => { pointer.set((x / width) * 2 - 1, (-y / height) * 2 + 1); raycaster.setFromCamera(pointer, camera); const hits = raycaster.intersectObjects(pickables, true); return hits.length ? byId[hits[0].object.userData.station] : null; };
    listen(renderer.domElement, 'pointermove', (e) => { const [x, y] = local(e); if (Math.hypot(x - downX, y - downY) > 5) wasDragged = true; if (dragging) return; const s = hitStation(x, y); hovered = s ? s.id : null; renderer.domElement.style.cursor = s ? 'pointer' : 'grab'; tooltip.classList.toggle('visible', !!s); if (s) { tooltip.querySelector('strong').innerHTML = `<span>${String(s.index + 1).padStart(2, '0')}</span>${esc(s.title || s.name)}`; tooltip.querySelector('p').textContent = s.desc; tooltip.style.left = Math.min(width - 255, Math.max(10, x + 16)) + 'px'; tooltip.style.top = Math.max(10, Math.min(height - 95, y - 65)) + 'px'; } });
    listen(renderer.domElement, 'pointerleave', () => { hovered = null; tooltip.classList.remove('visible'); });
    listen(renderer.domElement, 'pointerdown', (e) => { [downX, downY] = local(e); wasDragged = false; tooltip.classList.remove('visible'); });
    listen(renderer.domElement, 'pointerup', (e) => { if (wasDragged) return; const [x, y] = local(e); const s = hitStation(x, y); if (!s) return; if (cameraMode === 'station' && selected === s.id) { openProject(s); return; } focusStation(s.id); });
    function openProject(s) { const a = document.createElement('a'); a.href = '#projects'; a.dataset.case = 'projects:' + s.projectIndex; a.style.display = 'none'; document.body.appendChild(a); a.click(); a.remove(); }
    listen(document, 'visibilitychange', () => { visible = !document.hidden; lastFrame = performance.now(); });
    const io = new IntersectionObserver((es) => { visible = es[0].isIntersecting && !document.hidden; lastFrame = performance.now(); }, { threshold: 0.01 }); io.observe(renderer.domElement); cleanups.push(() => io.disconnect());
    listen(renderer.domElement, 'webglcontextlost', (e) => { e.preventDefault(); contextLost = true; });
    listen(renderer.domElement, 'webglcontextrestored', () => { contextLost = false; lastFrame = performance.now(); });

    const scratch = new THREE.Vector3(), anchor = new THREE.Vector3();
    let prevJourney = -1, lastFrame = performance.now(), frameCount = 0, measureTime = 0, pixelRatio = renderer.getPixelRatio(), rafId = 0;
    const offsets = mobile ? [[-30, 25], [-27, -50], [15, -65], [16, -1], [-5, 52], [-40, 30]] : [[-48, -14], [-8, -64], [30, -12], [30, 20], [-12, 40], [-60, 30]];
    function animate(now) {
      rafId = requestAnimationFrame(animate);
      const dt = Math.max(0, Math.min((now - lastFrame) / 1000, 0.045)); lastFrame = now;
      if (!visible || contextLost) return;
      if (playing) { simTime += dt; flightTime += dt; }
      const t = simTime, beat = (t / 4) % 1, tact = (t * TAU) / 4, smooth = 1 - Math.exp(-dt * 5);
      spread = THREE.MathUtils.lerp(spread, mode === 'stations' ? 1 : 0, smooth);
      cutPlane.constant = THREE.MathUtils.lerp(cutPlane.constant, mode === 'cutaway' ? 0.99 : 10, smooth);
      stations.forEach((s, i) => { s.group.position.copy(s.base); s.group.position.x *= 1 + spread * 0.29; s.group.position.z *= 1 + spread * 0.37; s.group.position.y += spread * (i % 2 ? 0.32 : 0.55); const pulse = Math.pow(Math.max(0, Math.sin(tact - i * 0.9)), 7); s.glowMat.emissiveIntensity = THREE.MathUtils.lerp(s.glowMat.emissiveIntensity, hovered === s.id || (cameraMode === 'station' && selected === s.id) ? 3.5 : 0.55 + pulse * 0.65, smooth); });
      belt.scale.set(1 + spread * 0.12, 1, 1 + spread * 0.15); pipes.scale.set(1 + spread * 0.25, 1, 1 + spread * 0.3);
      gears.forEach(({ g, vertical }, i) => { if (vertical) g.rotation.z = t * (i % 2 ? -1 : 1) * 1.1; else g.rotation.y = t * (i % 2 ? -1 : 1) * 1.1; });
      // press: ram strikes once per beat, gripper shuttles
      const strike = Math.pow(Math.max(0, Math.sin(tact)), 6); ram.position.y = 1.75 - strike * 0.55;
      grip.position.x = -0.5 + ((Math.sin(tact * 0.5 - 1) + 1) / 2) * 1.0; grip.position.y = 1.1 - Math.max(0, Math.sin(tact)) * 0.1;
      // phosphating: basket dips, barcode scanner sweeps, toggles
      basket.position.y = 1.9 - ((Math.sin(t * 0.6) + 1) / 2) * 0.55; barcode.rotation.z = Math.sin(t * 2) * 0.3;
      toggles.forEach((o, i) => (o.rotation.x = Math.sin(tact + i) > 0 ? -0.4 : 0.4));
      // galvanizing: crane travels over the tanks and dips the basket
      const cu = (Math.sin(t * 0.25) + 1) / 2; crane.position.x = -0.62 + cu * 1.24; rope.scale.y = 1 + Math.max(0, Math.sin(t * 0.75)) * 0.4; hook.position.y = -1.0 - Math.max(0, Math.sin(t * 0.75)) * 0.4;
      // flow-pack: reel turns, jaws close, pusher and pack move
      reel.rotation.z = -t * 0.9; const jaw = Math.pow(Math.max(0, Math.sin(tact * 2)), 4); jawTop.position.y = 2.0 - jaw * 0.2; jawBot.position.y = 1.68 + jaw * 0.05;
      const pu = (t * 0.5) % 1; pusher.position.x = -0.6 + pu * 0.5; pack.position.x = -0.3 + pu * 1.4; pack.visible = pu < 0.9;
      // pumps: water level, motors spin when their stage is on
      const lvl = (Math.sin(t * 0.35) + 1) / 2; water.scale.y = 0.2 + lvl * 0.8; water.position.y = 0.6 + (0.2 + lvl * 0.8) * 0.5;
      pumps.forEach((m, i) => { if (lvl > [0.3, 0.55, 0.8][i]) m.rotation.y += dt * 8; });
      // depositor: carriage moves, nozzle dips
      carriage.position.x = -0.45 + ((Math.sin(t * 0.7) + 1) / 2) * 0.9; nozzle.position.y = -0.3 - Math.max(0, Math.sin(t * 1.4)) * 0.3;
      if (t - lastDraw > 1 / 14 || lastDraw < 0) { drawPres(t); drawFos(t); drawGal(t); drawPak(t); drawPmp(t); drawDep(t); for (const tx of [presTex, fosTex, galTex, pakTex, pmpTex, depTex]) tx.texture.needsUpdate = true; updateBelt(t); lastDraw = t; }
      // part cards: fly into the press, then ride the belt through the stations
      packets.forEach((packet, i) => {
        const phase = (t / 24 + i / 6) % 1; packet.phase = phase; let stage;
        if (phase < 0.15) { stage = 0; const f = phase / 0.15; packet.group.position.copy(byId.pres.group.position).add(new THREE.Vector3(-0.5, 3.2, 1.2)); scratch.copy(byId.pres.group.position).add(new THREE.Vector3(0.3, 1.3, 0.65)); packet.group.position.lerp(scratch, f); packet.group.position.y += Math.sin(f * Math.PI) * 1.2; packet.group.rotation.set(0, Math.sin(f * Math.PI) * 0.28, Math.sin(f * Math.PI) * -0.1); }
        else { const u = ((phase - 0.15) / 0.85) * pmpU; path.getPointAt(u, packet.group.position); packet.group.position.x *= 1 + spread * 0.12; packet.group.position.z *= 1 + spread * 0.15; packet.group.position.y += 0.43; packet.group.rotation.set(0, 0.18, 0); stage = u < fosU * 0.7 ? 1 : u < galU * 0.96 ? 2 : u < pakU * 0.9 ? 3 : 4; }
        if (packet.stage !== stage) { packet.faces.forEach((f, j) => (f.visible = j === stage)); packet.stage = stage; }
        packet.group.visible = mode !== 'order' || i === 0; packet.halo.visible = mode === 'order' && i === 0; packet.group.scale.setScalar(mode === 'order' ? 1.35 : 1);
        if (phase > 0.94) packet.group.scale.multiplyScalar(Math.max(0.05, (1 - phase) / 0.06));
      });
      if (mode === 'order') {
        const packet = packets[0]; const step = packet.phase > 0.94 ? 5 : packet.stage;
        if (step !== prevJourney) { const j = JOURNEY[step][lang() === 'tr' ? 1 : 0]; $('journey-title').textContent = j[0]; $('journey-detail').textContent = j[1]; prevJourney = step; }
        $('journey-progress').style.width = packet.phase * 100 + '%';
        if (!dragging && playing) { desiredTarget.copy(packet.group.position); desiredPosition.copy(desiredTarget).addScaledVector(viewDirection, mobile ? 10 : 15); cameraAnimating = true; }
      } else if (cameraMode === 'flight' && playing && !dragging) { const a = flightTime * 0.12, d = baseDistance * (mode === 'stations' ? 1.2 : 1); desiredTarget.set(0, 0.35, 0); desiredPosition.set(Math.sin(a + 0.55) * d * 0.83, d * (0.5 + Math.sin(a * 0.7) * 0.09), Math.cos(a + 0.55) * d * 0.83).add(desiredTarget); cameraAnimating = true; }
      else if (cameraMode === 'station' && cameraAnimating) setCameraGoal();
      if (cameraAnimating && !dragging) { const speed = 1 - Math.exp(-dt * (mode === 'order' ? 2.2 : 3)); camera.position.lerp(desiredPosition, speed); controls.target.lerp(desiredTarget, speed); if (cameraMode !== 'flight' && mode !== 'order' && camera.position.distanceTo(desiredPosition) < 0.015 && controls.target.distanceTo(desiredTarget) < 0.015) cameraAnimating = false; }
      controls.autoRotate = playing && !reduceMotion && !dragging && !cameraAnimating && mode !== 'order' && cameraMode === 'overview' && now - lastInteraction > 6500;
      controls.autoRotateSpeed = 0.24; controls.update(dt);
      stations.forEach((s, i) => { const show = mode === 'stations'; s.label.classList.toggle('visible', show); if (!show) return; anchor.copy(s.group.position).add(s.anchor).project(camera); let x = (anchor.x * 0.5 + 0.5) * width - 40 + offsets[i][0], y = (-anchor.y * 0.5 + 0.5) * height - 52 + offsets[i][1]; x = THREE.MathUtils.clamp(x, 9, width - (mobile ? 123 : 165)); y = THREE.MathUtils.clamp(y, 130, height - 200); s.label.style.transform = `translate(${x}px,${y}px)`; });
      renderer.render(scene, camera);
      if (playing) { frameCount++; measureTime += dt; if (measureTime > 4) { if (frameCount / measureTime < 43 && pixelRatio > 1) { pixelRatio = Math.max(1, pixelRatio - 0.25); renderer.setPixelRatio(pixelRatio); } frameCount = 0; measureTime = 0; } }
    }
    rafId = requestAnimationFrame(animate);
    cleanups.push(() => { cancelAnimationFrame(rafId); controls.dispose(); scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); const list = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []; for (const m of list) { for (const v of Object.values(m)) if (v instanceof THREE.Texture) v.dispose(); m.dispose(); } }); geometries.forEach((g) => g.dispose()); env.dispose(); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); });
    renderer.compile(scene, camera);
    $('loading').classList.add('done'); $('error').style.display = 'none';
    host.__machine = { setMode, setCamera, focusStation, play, pause, dispose };
  } catch (err) {
    console.error('Machine: failed to start', err);
    showError();
  }
  return dispose;
}

// ---- boot: take over the #spread area of the Projects page
(function boot() {
  const host = document.getElementById('spread');
  if (!host) return;
  host.dataset.machine = '1';
  let mounted = false, disposeFn = null;
  const go = (content) => {
    if (!content) return;
    if (disposeFn) disposeFn();
    try { disposeFn = mountMachine(host, content); mounted = true; } catch (e) { console.error(e); }
  };
  document.addEventListener('content:rendered', (e) => go(e.detail));
  if (!mounted && window.SITE_CONTENT && document.body.classList.contains('is-ready')) go(window.I18N ? window.I18N.content(window.SITE_CONTENT) : window.SITE_CONTENT);
})();
