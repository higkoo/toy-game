/* 经络图谱 · 3D —— 程序化人体 + 十四经脉 + 穴位点选 */
(() => {
  "use strict";

  const T = window.THREE;
  const DATA = window.MERIDIANS || [];
  const app = document.getElementById("app");
  const canvas = document.getElementById("scene");
  const labelsEl = document.getElementById("labels");
  const hoverTip = document.getElementById("hoverTip");
  const infoEl = document.getElementById("info");
  const infoDetail = document.getElementById("infoDetail");
  const searchEl = document.getElementById("search");
  const searchResults = document.getElementById("searchResults");
  const toastEl = document.getElementById("toast");
  const srEl = document.getElementById("sr");
  const loader = document.getElementById("loader");
  const autoBtn = document.getElementById("autoBtn");
  const pointTotalEl = document.getElementById("pointTotal");

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const V3 = (x, y, z) => new T.Vector3(x, y, z);
  const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 基础场景 ---------- */
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;

  const scene = new T.Scene();
  scene.fog = new T.FogExp2(0x071116, 0.052);

  const camera = new T.PerspectiveCamera(31, window.innerWidth / window.innerHeight, 0.01, 80);

  scene.add(new T.HemisphereLight(0xbfe9ef, 0x1b2422, 1.1));
  const key = new T.DirectionalLight(0xffe3c4, 1.35);
  key.position.set(1.6, 3.2, 2.5);
  scene.add(key);
  const rim = new T.DirectionalLight(0x6fe3d4, 1.6);
  rim.position.set(-2.2, 1.4, -2.2);
  scene.add(rim);
  const fill = new T.PointLight(0x7c9dff, 0.85, 6);
  fill.position.set(1.8, 0.7, -1.4);
  scene.add(fill);

  /* ---------- 人体 ---------- */
  const root = new T.Group();
  scene.add(root);

  const skinGroup = new T.Group();
  const boneGroup = new T.Group();
  const organGroup = new T.Group();
  root.add(skinGroup, boneGroup, organGroup);

  const skinUniforms = {
    uWarm: { value: new T.Color(0xe8b68d) },
    uCool: { value: new T.Color(0x7fe3d3) },
    uTime: { value: 0 }
  };
  const skinMat = new T.ShaderMaterial({
    uniforms: skinUniforms,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: T.DoubleSide,
    blending: T.AdditiveBlending,
    vertexShader: `
      varying vec3 vN; varying vec3 vV; varying float vY;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        vY = (modelMatrix * vec4(position, 1.0)).y;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uWarm; uniform vec3 uCool; uniform float uTime;
      varying vec3 vN; varying vec3 vV; varying float vY;
      void main(){
        float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.25);
        float scan = 0.5 + 0.5 * sin(vY * 82.0 - uTime * 1.6);
        vec3 col = mix(uWarm, uCool, 0.055);
        float a = 0.032 + fres * 0.30 + scan * 0.005;
        gl_FragColor = vec4(col, a);
      }`
  });

  function ringSurface(profile, seg = 64) {
    const pos = [], nor = [], idx = [];
    const ringCount = profile.length;
    for (let i = 0; i < ringCount; i++) {
      const [y, rx, rz, zoff] = profile[i];
      for (let j = 0; j < seg; j++) {
        const a = (j / seg) * Math.PI * 2;
        pos.push(rx * Math.cos(a), y, rz * Math.sin(a) + (zoff || 0));
        const nx = Math.cos(a) / Math.max(rx, .01);
        const nz = Math.sin(a) / Math.max(rz, .01);
        const n = V3(nx, 0, nz).normalize();
        nor.push(n.x, n.y, n.z);
      }
    }
    for (let i = 0; i < ringCount - 1; i++) {
      for (let j = 0; j < seg; j++) {
        const a = i * seg + j, b = i * seg + ((j + 1) % seg);
        const c = (i + 1) * seg + j, d = (i + 1) * seg + ((j + 1) % seg);
        idx.push(a, c, b, b, c, d);
      }
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
    geo.setAttribute("normal", new T.Float32BufferAttribute(nor, 3));
    geo.setIndex(idx);
    return geo;
  }

  const torsoProfile = [
    [0.815, 0.135, 0.085, 0.000],
    [0.845, 0.165, 0.100, 0.000],
    [0.880, 0.180, 0.108, 0.002],
    [0.920, 0.182, 0.108, 0.003],
    [0.960, 0.170, 0.105, 0.004],
    [1.000, 0.158, 0.098, 0.005],
    [1.040, 0.147, 0.092, 0.006],
    [1.080, 0.143, 0.090, 0.008],
    [1.120, 0.151, 0.096, 0.009],
    [1.160, 0.164, 0.102, 0.010],
    [1.200, 0.180, 0.108, 0.011],
    [1.240, 0.195, 0.112, 0.010],
    [1.280, 0.207, 0.115, 0.008],
    [1.320, 0.216, 0.113, 0.006],
    [1.360, 0.223, 0.108, 0.004],
    [1.390, 0.228, 0.102, 0.002],
    [1.415, 0.224, 0.097, 0.000],
    [1.438, 0.168, 0.088, 0.000],
    [1.455, 0.104, 0.078, 0.002],
    [1.478, 0.074, 0.070, 0.003],
    [1.505, 0.068, 0.066, 0.004],
    [1.540, 0.061, 0.061, 0.005],
    [1.575, 0.059, 0.059, 0.007]
  ];

  function addSkinMesh(geo) {
    const mesh = new T.Mesh(geo, skinMat);
    skinGroup.add(mesh);
    return mesh;
  }
  addSkinMesh(ringSurface(torsoProfile));

  function ellipsoid(sx, sy, sz, x, y, z, material, parent = skinGroup) {
    const m = new T.Mesh(new T.SphereGeometry(1, 28, 20), material);
    m.scale.set(sx, sy, sz);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  }

  ellipsoid(.104, .132, .116, 0, 1.665, .012, skinMat);
  ellipsoid(.083, .082, .096, 0, 1.612, .027, skinMat);
  ellipsoid(.018, .032, .013, .102, 1.652, .010, skinMat);
  ellipsoid(.018, .032, .013, -.102, 1.652, .010, skinMat);

  function taper(a, b, r1, r2, material, parent) {
    const va = V3(...a), vb = V3(...b);
    const dir = vb.clone().sub(va);
    const len = dir.length();
    const geo = new T.CylinderGeometry(r2, r1, len, 16, 1);
    const mesh = new T.Mesh(geo, material);
    mesh.position.copy(va).add(vb).multiplyScalar(.5);
    mesh.quaternion.setFromUnitVectors(V3(0, 1, 0), dir.normalize());
    parent.add(mesh);
    return mesh;
  }

  function sphereJoint(x, y, z, r, material, parent) {
    const m = new T.Mesh(new T.SphereGeometry(r, 14, 12), material);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  }

  // 手臂
  for (const s of [-1, 1]) {
    taper([s * .214, 1.408, 0], [s * .286, 1.045, .006], .058, .043, skinMat, skinGroup);
    taper([s * .286, 1.045, .006], [s * .336, .825, .020], .043, .027, skinMat, skinGroup);
    sphereJoint(s * .214, 1.408, 0, .068, skinMat, skinGroup);
    sphereJoint(s * .286, 1.045, .006, .047, skinMat, skinGroup);
    sphereJoint(s * .336, .825, .020, .030, skinMat, skinGroup);
    ellipsoid(.038, .060, .023, s * .346, .776, .026, skinMat, skinGroup);
    // 手指
    taper([s * .350, .790, .030], [s * .359, .744, .040], .012, .006, skinMat, skinGroup);
    taper([s * .337, .792, .025], [s * .341, .750, .032], .010, .005, skinMat, skinGroup);
  }

  // 腿
  for (const s of [-1, 1]) {
    taper([s * .087, .905, 0], [s * .100, .470, .010], .091, .058, skinMat, skinGroup);
    taper([s * .100, .470, .010], [s * .100, .086, .005], .058, .033, skinMat, skinGroup);
    sphereJoint(s * .087, .905, 0, .095, skinMat, skinGroup);
    sphereJoint(s * .100, .470, .010, .060, skinMat, skinGroup);
    sphereJoint(s * .100, .086, .005, .035, skinMat, skinGroup);
    ellipsoid(.052, .030, .096, s * .100, .034, .050, skinMat, skinGroup);
  }

  /* ---------- 骨骼 ---------- */
  const boneMat = new T.MeshStandardMaterial({
    color: 0xd8cfb9, roughness: .72, metalness: .04,
    transparent: true, opacity: .29, depthWrite: false, side: T.DoubleSide
  });
  const boneLineMat = new T.MeshBasicMaterial({ color: 0xd8cfb9, transparent: true, opacity: .29, depthWrite: false });

  // 颅骨
  ellipsoid(.089, .111, .100, 0, 1.668, .010, boneMat, boneGroup);
  // 脊柱
  for (let i = 0; i < 25; i++) {
    const t = i / 24;
    const y = .960 + t * .565;
    const z = -.030 - Math.sin(t * Math.PI) * .010;
    const m = sphereJoint(0, y, z, .0135 - t * .0025, boneMat, boneGroup);
    m.scale.set(1.7, .75, 1.15);
  }
  // 肋骨
  for (let i = 0; i < 8; i++) {
    const y = 1.185 + i * .026;
    const w = .105 + i * .012;
    for (const s of [-1, 1]) {
      const curve = new T.CatmullRomCurve3([
        V3(0, y, -.030),
        V3(s * w * .55, y + .004, .015),
        V3(s * w, y - .010, .070),
        V3(s * .040, y - .040, .105)
      ]);
      const tube = new T.Mesh(new T.TubeGeometry(curve, 24, .0042, 6, false), boneMat);
      boneGroup.add(tube);
    }
  }
  taper([0, 1.365, .105], [0, 1.185, .108], .010, .007, boneMat, boneGroup);
  for (const s of [-1, 1]) {
    const curve = new T.CatmullRomCurve3([
      V3(0, 1.407, .085), V3(s * .075, 1.417, .045), V3(s * .195, 1.412, .012)
    ]);
    boneGroup.add(new T.Mesh(new T.TubeGeometry(curve, 16, .005, 6, false), boneMat));
    const pelvis = new T.CatmullRomCurve3([
      V3(0, .948, -.035), V3(s * .080, .942, -.005), V3(s * .136, .918, .015), V3(s * .104, .875, .050), V3(0, .862, .062)
    ]);
    boneGroup.add(new T.Mesh(new T.TubeGeometry(pelvis, 30, .0065, 6, false), boneMat));
    // 四肢骨
    taper([s * .214, 1.400, 0], [s * .284, 1.055, .008], .009, .007, boneMat, boneGroup);
    taper([s * .284, 1.050, .008], [s * .334, .832, .020], .008, .006, boneMat, boneGroup);
    taper([s * .086, .900, -.005], [s * .099, .478, .008], .013, .010, boneMat, boneGroup);
    taper([s * .099, .472, .008], [s * .100, .094, .006], .010, .007, boneMat, boneGroup);
  }
  // 胸骨
  taper([0, 1.370, .105], [0, 1.195, .108], .012, .008, boneMat, boneGroup);

  /* ---------- 脏腑 ---------- */
  const organMat = (color, opacity = .2) => new T.MeshStandardMaterial({
    color, roughness: .6, transparent: true, opacity, depthWrite: false, side: T.DoubleSide
  });
  const lungsMat = organMat(0x7eaebd, .18), heartMat = organMat(0xd06d68, .30);
  const liverMat = organMat(0x9b5d4f, .22), stomachMat = organMat(0xc6a16b, .22);
  const kidneyMat = organMat(0x8b5f6b, .22), gutMat = organMat(0xb98d63, .16);
  ellipsoid(.060, .102, .048, .078, 1.298, .020, lungsMat, organGroup);
  ellipsoid(.060, .102, .048, -.078, 1.298, .020, lungsMat, organGroup);
  ellipsoid(.044, .054, .036, .010, 1.278, .048, heartMat, organGroup);
  ellipsoid(.078, .044, .048, .068, 1.142, .022, liverMat, organGroup);
  ellipsoid(.052, .061, .043, -.052, 1.132, .030, stomachMat, organGroup);
  ellipsoid(.030, .050, .028, .074, 1.032, -.030, kidneyMat, organGroup);
  ellipsoid(.030, .050, .028, -.074, 1.032, -.030, kidneyMat, organGroup);
  const gut = new T.Mesh(new T.TorusGeometry(.058, .026, 9, 26), gutMat);
  gut.rotation.x = Math.PI / 2;
  gut.position.set(0, 1.028, .025);
  organGroup.add(gut);
  organGroup.visible = false;

  /* ---------- 经脉与穴位 ---------- */
  const meridianGroup = new T.Group();
  root.add(meridianGroup);
  const records = [];
  const meridianRuntime = new Map();
  const glowTex = makeGlowTexture();
  const ringTex = makeRingTexture();

  function makeGlowTexture() {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d");
    const rg = g.createRadialGradient(32, 32, 0, 32, 32, 31);
    rg.addColorStop(0, "rgba(255,255,255,.92)");
    rg.addColorStop(.18, "rgba(255,255,255,.45)");
    rg.addColorStop(.52, "rgba(255,255,255,.10)");
    rg.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = rg; g.fillRect(0, 0, 64, 64);
    const tex = new T.CanvasTexture(c);
    tex.colorSpace = T.SRGBColorSpace;
    return tex;
  }
  function makeRingTexture() {
    const c = document.createElement("canvas");
    c.width = c.height = 96;
    const g = c.getContext("2d");
    g.clearRect(0, 0, 96, 96);
    g.strokeStyle = "rgba(255,255,255,.95)";
    g.lineWidth = 4;
    g.beginPath(); g.arc(48, 48, 38, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = "rgba(255,255,255,.35)";
    g.lineWidth = 2;
    g.beginPath(); g.arc(48, 48, 44, 0, Math.PI * 2); g.stroke();
    const tex = new T.CanvasTexture(c);
    tex.colorSpace = T.SRGBColorSpace;
    return tex;
  }

  function buildMeridian(m) {
    const group = new T.Group();
    const color = new T.Color(m.color);
    const sides = m.central ? [0] : [1, -1];
    const pointsBySide = new Map();

    for (const sideSign of sides) {
      const sideGroup = new T.Group();
      const side = m.central ? "正中" : (sideSign > 0 ? "左侧" : "右侧");
      const sideKey = m.central ? "C" : (sideSign > 0 ? "L" : "R");
      const vecs = m.points.map(p => V3(p.p[0] * sideSign, p.p[1], p.p[2]));
      if (vecs.length > 1) {
        const curve = new T.CatmullRomCurve3(vecs, false, "catmullrom", .38);
        const core = new T.Mesh(
          new T.TubeGeometry(curve, Math.max(56, vecs.length * 9), .0034, 7, false),
          new T.MeshBasicMaterial({ color, transparent: true, opacity: .92, depthWrite: false, toneMapped: false })
        );
        sideGroup.add(core);
        const halo = new T.Mesh(
          new T.TubeGeometry(curve, Math.max(48, vecs.length * 7), .0092, 6, false),
          new T.MeshBasicMaterial({ color, transparent: true, opacity: .13, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false })
        );
        sideGroup.add(halo);
      }

      const pointRecs = [];
      m.points.forEach((p, idx) => {
        const pos = V3(p.p[0] * sideSign, p.p[1], p.p[2]);
        const pointGroup = new T.Group();
        pointGroup.position.copy(pos);

        const core = new T.Mesh(
          new T.SphereGeometry(.0046, 10, 8),
          new T.MeshBasicMaterial({ color, transparent: true, opacity: .98, depthWrite: false, toneMapped: false })
        );
        pointGroup.add(core);

        const halo = new T.Sprite(new T.SpriteMaterial({
          map: glowTex, color, transparent: true, opacity: .52,
          depthWrite: false, depthTest: true, blending: T.AdditiveBlending, toneMapped: false
        }));
        halo.scale.set(.058, .058, 1);
        pointGroup.add(halo);

        const selRing = new T.Sprite(new T.SpriteMaterial({
          map: ringTex, color, transparent: true, opacity: 0,
          depthWrite: false, depthTest: false, blending: T.AdditiveBlending, toneMapped: false
        }));
        selRing.scale.set(.07, .07, 1);
        pointGroup.add(selRing);

        const rec = { m, p, side, sideKey, pos, core, halo, selRing, index: idx, group: sideGroup };
        records.push(rec);
        pointRecs.push(rec);
        sideGroup.add(pointGroup);
      });
      pointsBySide.set(sideKey, pointRecs);
      sideGroup.name = `${m.id}-${sideKey}`;
      group.add(sideGroup);
    }
    group.userData.meridian = m;
    meridianGroup.add(group);
    meridianRuntime.set(m.id, { m, group, pointsBySide });
  }

  DATA.forEach(buildMeridian);

  /* ---------- 全息底座与粒子 ---------- */
  const decor = new T.Group();
  root.add(decor);
  function ringLine(radius, y, color, opacity, seg = 96) {
    const pts = [];
    for (let i = 0; i < seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      pts.push(V3(Math.cos(a) * radius, y, Math.sin(a) * radius));
    }
    const geo = new T.BufferGeometry().setFromPoints(pts);
    const line = new T.LineLoop(geo, new T.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
    decor.add(line);
  }
  ringLine(.45, .002, 0x7fe3d3, .18);
  ringLine(.55, .002, 0x7fe3d3, .12);
  ringLine(.665, .002, 0xe7c98d, .16);
  const tickPos = [];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const inner = i % 6 === 0 ? .53 : .58;
    tickPos.push(Math.cos(a) * inner, .003, Math.sin(a) * inner, Math.cos(a) * .66, .003, Math.sin(a) * .66);
  }
  const ticksGeo = new T.BufferGeometry();
  ticksGeo.setAttribute("position", new T.Float32BufferAttribute(tickPos, 3));
  decor.add(new T.LineSegments(ticksGeo, new T.LineBasicMaterial({ color: 0x7fe3d3, transparent: true, opacity: .16, depthWrite: false })));

  const scanRing = new T.Mesh(
    new T.TorusGeometry(.36, .0018, 4, 72),
    new T.MeshBasicMaterial({ color: 0x7fe3d3, transparent: true, opacity: .16, depthWrite: false, blending: T.AdditiveBlending })
  );
  scanRing.rotation.x = Math.PI / 2;
  scanRing.position.y = .9;
  decor.add(scanRing);

  const dustGeo = new T.BufferGeometry();
  const dustPos = [];
  for (let i = 0; i < 260; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = .55 + Math.random() * .55;
    dustPos.push(Math.cos(a) * r, Math.random() * 1.85, Math.sin(a) * r);
  }
  dustGeo.setAttribute("position", new T.Float32BufferAttribute(dustPos, 3));
  const dust = new T.Points(dustGeo, new T.PointsMaterial({
    color: 0x8ce8db, size: .012, transparent: true, opacity: .24,
    depthWrite: false, blending: T.AdditiveBlending, sizeAttenuation: true
  }));
  decor.add(dust);

  /* ---------- 相机控制 ---------- */
  const MOBILE_UI = window.innerWidth < 820;
  const HOME = { r: MOBILE_UI ? (window.innerHeight < 760 ? 5.4 : 4.75) : 4.05, ty: MOBILE_UI ? 1.0 : .95 };
  const cam = { theta: .05, phi: 1.36, r: HOME.r, tx: 0, ty: HOME.ty };
  const goal = { theta: .05, phi: 1.36, r: HOME.r, tx: 0, ty: HOME.ty };
  let auto = !reduced;

  function setView(name) {
    const dirs = { front: 0, back: Math.PI, left: Math.PI / 2, right: -Math.PI / 2 };
    goal.theta = dirs[name] || 0;
    goal.phi = 1.36;
    goal.r = HOME.r;
    goal.tx = 0; goal.ty = HOME.ty;
    document.querySelectorAll("[data-view]").forEach(b => b.classList.toggle("on", b.dataset.view === name));
  }

  document.querySelectorAll("[data-view]").forEach(btn => {
    btn.addEventListener("click", () => setView(btn.dataset.view));
  });

  const pointers = new Map();
  let dragStart = null;
  let moved = 0;
  let pinchStart = null;
  let hovered = null;

  function pick(e) {
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left, py = e.clientY - rect.top;
    const limit = rect.width < 820 ? 25 : 19;
    let best = null, bestD = limit;
    const v = new T.Vector3();
    for (const rec of records) {
      const rt = meridianRuntime.get(rec.m.id);
      if (!rt || !rt.group.visible) continue;
      v.copy(rec.pos).project(camera);
      if (v.z > 1 || v.z < -1) continue;
      const x = (v.x * .5 + .5) * rect.width;
      const y = (-v.y * .5 + .5) * rect.height;
      const d = Math.hypot(x - px, y - py);
      if (d < bestD) { bestD = d; best = rec; }
    }
    return best;
  }

  canvas.addEventListener("pointerdown", e => {
    canvas.focus();
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    canvas.setPointerCapture(e.pointerId);
    if (pointers.size === 1) {
      dragStart = { x: e.clientX, y: e.clientY, t: Date.now() };
      moved = 0;
      canvas.classList.add("dragging");
    } else if (pointers.size === 2) {
      const p = Array.from(pointers.values());
      pinchStart = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
    }
  });

  canvas.addEventListener("pointermove", e => {
    if (!pointers.has(e.pointerId)) {
      if (!dragStart) {
        const rec = pick(e);
        if (rec !== hovered) {
          hovered = rec;
          canvas.classList.toggle("hovering", !!rec);
          if (rec) {
            hoverTip.innerHTML = `${rec.p.n}<b>${rec.p.c}</b>`;
            hoverTip.style.left = `${e.clientX}px`;
            hoverTip.style.top = `${e.clientY}px`;
            hoverTip.style.opacity = 1;
          } else {
            hoverTip.style.opacity = 0;
            hoverTip.style.left = "0px";
            hoverTip.style.top = "0px";
          }
        }
      }
      return;
    }
    const prev = pointers.get(e.pointerId);
    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.size === 2) {
      const p = Array.from(pointers.values());
      const d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
      if (pinchStart) {
        goal.r = clamp(goal.r * (pinchStart / Math.max(d, 1)), 1.45, 5.8);
        pinchStart = d;
      }
      moved += Math.abs(dx) + Math.abs(dy);
      return;
    }

    if (dragStart) {
      moved += Math.abs(dx) + Math.abs(dy);
      goal.theta -= dx * .0068;
      goal.phi = clamp(goal.phi - dy * .0062, .62, 2.55);
      document.querySelectorAll("[data-view]").forEach(b => b.classList.remove("on"));
    }
  });

  function endPointer(e) {
    const wasSingle = pointers.size === 1;
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinchStart = null;
    if (wasSingle && dragStart) {
      if (moved < 7 && Date.now() - dragStart.t < 520) {
        const rec = pick(e);
        if (rec) selectPoint(rec);
        else clearSelection();
      }
      dragStart = null;
      canvas.classList.remove("dragging");
    }
    if (pointers.size === 0) {
      dragStart = null;
      canvas.classList.remove("dragging");
    }
  }
  canvas.addEventListener("pointerup", endPointer);
  canvas.addEventListener("pointercancel", endPointer);
  canvas.addEventListener("pointerleave", () => {
    if (!dragStart) {
      hovered = null;
      hoverTip.style.opacity = 0;
      canvas.classList.remove("hovering");
    }
  });

  canvas.addEventListener("wheel", e => {
    e.preventDefault();
    goal.r = clamp(goal.r * Math.exp(e.deltaY * .0012), 1.45, 5.8);
  }, { passive: false });

  canvas.addEventListener("keydown", e => {
    if (e.key === "ArrowLeft") { goal.theta -= .15; e.preventDefault(); }
    else if (e.key === "ArrowRight") { goal.theta += .15; e.preventDefault(); }
    else if (e.key === "ArrowUp") { goal.phi = clamp(goal.phi - .1, .62, 2.55); e.preventDefault(); }
    else if (e.key === "ArrowDown") { goal.phi = clamp(goal.phi + .1, .62, 2.55); e.preventDefault(); }
    else if (e.key === "+" || e.key === "=") { goal.r = clamp(goal.r * .86, 1.45, 5.8); }
    else if (e.key === "-") { goal.r = clamp(goal.r / .86, 1.45, 5.8); }
    else if (e.key === "Escape") { clearSelection(); }
  });
  canvas.tabIndex = 0;

  /* ---------- 侧栏 ---------- */
  const merList = document.getElementById("merList");
  const allBtn = document.createElement("button");
  allBtn.className = "mer rail-all";
  allBtn.type = "button";
  allBtn.setAttribute("role", "listitem");
  allBtn.innerHTML = `<span class="dot"></span><span class="mcopy"><b>全部经脉</b><em>ALL MERIDIANS</em></span>`;
  allBtn.addEventListener("click", () => setActive("ALL"));
  merList.appendChild(allBtn);

  DATA.forEach(m => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "mer"; b.dataset.id = m.id; b.setAttribute("role", "listitem");
    b.style.setProperty("--c", m.color);
    b.innerHTML = `<span class="dot" aria-hidden="true"></span><span class="mcopy"><b>${m.name}</b><em>${m.id} · ${m.route}</em></span><span class="cnt">${m.points.length}</span>`;
    b.addEventListener("click", () => setActive(m.id));
    merList.appendChild(b);
  });
  document.getElementById("merCount").textContent = DATA.length;
  pointTotalEl.textContent = new Set(DATA.flatMap(m => m.points.map(p => p.c))).size;

  const state = { active: "ALL", selected: null, layers: { skin: true, bone: false, organ: false } };
  boneGroup.visible = false;

  function setActive(id, quiet = false) {
    if (id === state.active && id !== "ALL") id = "ALL";
    state.active = id;
    meridianRuntime.forEach(rt => { rt.group.visible = id === "ALL" || rt.m.id === id; });
    document.querySelectorAll(".mer").forEach(b => b.classList.toggle("active", b.dataset.id === id || (id === "ALL" && b === allBtn)));
    if (id === "BL" || id === "GV") goal.theta = Math.PI;
    else if (id === "CV") goal.theta = 0;
    rebuildLabels();
    const label = id === "ALL" ? "全部经脉" : DATA.find(m => m.id === id).name;
    srEl.textContent = `已显示${label}`;
    if (!quiet) toast(id === "ALL" ? "已恢复全身经脉" : `只显示 ${label}`);
  }

  /* ---------- 穴位选择 ---------- */
  function selectPoint(rec) {
    if (state.selected === rec) return;
    if (state.selected) state.selected.selRing.material.opacity = 0;
    state.selected = rec;
    rec.selRing.material.opacity = 1;
    setActive(rec.m.id, true);

    document.getElementById("iCode").textContent = rec.p.c;
    document.getElementById("iName").textContent = rec.p.n;
    document.getElementById("iMer").textContent = rec.m.name;
    document.getElementById("iSide").textContent = rec.side;
    document.getElementById("iLoc").textContent = rec.p.loc;
    document.getElementById("iFx").textContent = rec.p.fx;
    document.getElementById("iRoute").textContent = `${rec.m.route} · ${rec.m.clock}。${rec.m.desc}`;
    document.getElementById("infoHead").style.setProperty("--c", rec.m.color);
    infoEl.classList.add("open", "detail");
    infoDetail.classList.add("show");
    document.body.classList.add("info-open");
    rebuildLabels();
    srEl.textContent = `${rec.p.c} ${rec.p.n}，${rec.m.name}，${rec.side}`;
  }

  function clearSelection() {
    if (state.selected) {
      state.selected.selRing.material.opacity = 0;
      state.selected = null;
    }
    infoEl.classList.remove("open", "detail");
    infoDetail.classList.remove("show");
    document.body.classList.remove("info-open");
    rebuildLabels();
  }

  document.getElementById("infoClose").addEventListener("click", clearSelection);

  document.getElementById("focusBtn").addEventListener("click", () => {
    const r = state.selected;
    if (!r) return;
    goal.r = 1.46;
    goal.theta = r.pos.z >= -.02 ? 0 : Math.PI;
    goal.phi = 1.42;
    goal.tx = r.pos.x;
    goal.ty = r.pos.y;
    document.querySelectorAll("[data-view]").forEach(b => b.classList.remove("on"));
    toast(`聚焦 ${r.p.c} ${r.p.n}`);
  });

  function stepPoint(delta) {
    const r = state.selected;
    if (!r) return;
    const list = records.filter(x => x.m.id === r.m.id && x.sideKey === r.sideKey);
    const i = list.indexOf(r);
    const next = list[(i + delta + list.length) % list.length];
    selectPoint(next);
    if (goal.r < 2.2) { goal.tx = next.pos.x; goal.ty = next.pos.y; }
  }
  document.getElementById("prevBtn").addEventListener("click", () => stepPoint(-1));
  document.getElementById("nextBtn").addEventListener("click", () => stepPoint(1));

  function resetAll() {
    clearSelection();
    setActive("ALL");
    setView("front");
    toast("已回到全身视角");
  }
  document.getElementById("resetBtn").addEventListener("click", resetAll);
  document.getElementById("resetBtn2").addEventListener("click", resetAll);

  document.getElementById("zoomOut").addEventListener("click", () => { goal.r = clamp(goal.r * 1.14, 1.45, 5.8); });
document.getElementById("zoomIn").addEventListener("click", () => { goal.r = clamp(goal.r * .88, 1.45, 5.8); });

document.getElementById("tourBtn").addEventListener("click", () => {
    const rec = records[Math.floor(Math.random() * records.length)];
    selectPoint(rec);
    goal.r = 1.7; goal.tx = rec.pos.x; goal.ty = rec.pos.y; goal.phi = 1.42;
    toast(`随机一穴：${rec.p.c} ${rec.p.n}`);
  });

  /* ---------- 图层 ---------- */
  document.querySelectorAll("[data-layer]").forEach(btn => {
    btn.addEventListener("click", () => {
      const layer = btn.dataset.layer;
      state.layers[layer] = !state.layers[layer];
      btn.classList.toggle("on", state.layers[layer]);
      if (layer === "skin") skinGroup.visible = state.layers.skin;
      if (layer === "bone") boneGroup.visible = state.layers.bone;
      if (layer === "organ") organGroup.visible = state.layers.organ;
      toast(`${btn.textContent}已${state.layers[layer] ? "显示" : "隐藏"}`);
    });
  });

  /* ---------- 自动旋转 ---------- */
  autoBtn.addEventListener("click", () => {
    auto = !auto;
    autoBtn.classList.toggle("on", auto);
    autoBtn.setAttribute("aria-pressed", String(auto));
    toast(auto ? "自动旋转已开启" : "自动旋转已暂停");
  });
  autoBtn.classList.toggle("on", auto);
  autoBtn.setAttribute("aria-pressed", String(auto));

  document.getElementById("aboutBtn").addEventListener("click", () => {
    toast("拖拽旋转 · 滚轮缩放 · 点穴位看信息 · 左侧筛经脉");
  });

  /* ---------- 搜索 ---------- */
  const searchIndex = [];
  records.forEach(r => {
    if (r.sideKey === "R") return;
    searchIndex.push({ rec: r, text: `${r.p.n} ${r.p.c} ${r.m.name} ${r.m.short}`.toLowerCase() });
  });
  const seenCodes = new Set();
  const uniqueSearch = searchIndex.filter(x => {
    if (seenCodes.has(x.rec.p.c)) return false;
    seenCodes.add(x.rec.p.c);
    return true;
  });

  function renderSearch() {
    const q = searchEl.value.trim().toLowerCase();
    if (!q) { searchResults.classList.remove("show"); searchResults.innerHTML = ""; return; }
    const hits = uniqueSearch.filter(x => x.text.includes(q)).slice(0, 8);
    if (!hits.length) {
      searchResults.innerHTML = `<div class="sr-empty">没有匹配的穴位，试试“合谷”或“LI4”</div>`;
    } else {
      searchResults.innerHTML = hits.map((x, i) =>
        `<button type="button" class="sr-item" role="option" data-i="${i}"><code>${x.rec.p.c}</code><b>${x.rec.p.n}</b><em>${x.rec.m.name}</em></button>`
      ).join("");
      searchResults.querySelectorAll(".sr-item").forEach((el, i) => {
        el.addEventListener("click", () => {
          const x = hits[i];
          searchEl.value = "";
          searchResults.classList.remove("show");
          selectPoint(x.rec);
          toast(`已选中 ${x.rec.p.c} ${x.rec.p.n}，可点“聚焦此穴”拉近`);
        });
      });
    }
    searchResults.classList.add("show");
  }
  searchEl.addEventListener("input", renderSearch);
  searchEl.addEventListener("keydown", e => {
    if (e.key === "Escape") { searchEl.value = ""; searchResults.classList.remove("show"); searchEl.blur(); }
    if (e.key === "Enter") {
      const first = searchResults.querySelector(".sr-item");
      if (first) first.click();
    }
  });
  document.addEventListener("keydown", e => {
    if (e.key === "/" && document.activeElement !== searchEl) { e.preventDefault(); searchEl.focus(); }
  });

  /* ---------- 浮动穴位标签 ---------- */
  const labelNodes = new Map();
  const projected = new T.Vector3();

  function rebuildLabels() {
    const keep = new Set();
    const activeRt = state.active === "ALL" ? null : meridianRuntime.get(state.active);
    let allowNames = false;
    if (activeRt) {
      const count = records.filter(r => r.m.id === state.active).length;
      allowNames = cam.r < 2.9;
    }
    if (activeRt && allowNames) {
      records.filter(r => r.m.id === state.active).forEach(r => keep.add(r));
    }
    if (state.selected) keep.add(state.selected);

    labelNodes.forEach((node, rec) => {
      if (!keep.has(rec)) { node.remove(); labelNodes.delete(rec); }
    });
    keep.forEach(rec => {
      if (labelNodes.has(rec)) return;
      const el = document.createElement("span");
      el.className = "plabel" + (rec === state.selected ? " sel" : "");
      el.textContent = rec.p.n;
      labelsEl.appendChild(el);
      labelNodes.set(rec, el);
    });
  }

  function updateLabels() {
    if (!labelNodes.size) return;
    const w = window.innerWidth, h = window.innerHeight;
    const items = [];
    labelNodes.forEach((el, rec) => {
      projected.copy(rec.pos).project(camera);
      if (projected.z > 1 || projected.z < -1 || Math.abs(projected.x) > 1.3 || Math.abs(projected.y) > 1.3) {
        el.style.opacity = 0;
        return;
      }
      items.push({
        el, rec,
        x: (projected.x * .5 + .5) * w,
        y: (-projected.y * .5 + .5) * h
      });
    });
    items.sort((a, b) => (b.rec === state.selected) - (a.rec === state.selected) || a.y - b.y);
    const placed = [];
    items.forEach(it => {
      let guard = 0;
      while (guard++ < 4 && placed.some(p => Math.abs(p.x - it.x) < 18 && Math.abs(p.y - it.y) < 14)) it.y -= 15;
      placed.push(it);
      it.el.style.opacity = 1;
      it.el.style.left = `${it.x}px`;
      it.el.style.top = `${it.y}px`;
    });
  }

  /* ---------- 提示 ---------- */
  let toastTimer = 0;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 1800);
  }

  /* ---------- 尺寸 ---------- */
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    rebuildLabels();
  }
  window.addEventListener("resize", resize);
  if (window.visualViewport) window.visualViewport.addEventListener("resize", resize);

  /* ---------- 主循环 ---------- */
  const clock = new T.Clock();
  let selectedPulse = 0;
  function animate() {
    const dt = Math.min(clock.getDelta(), .05);
    if (auto && !dragStart && pointers.size === 0) goal.theta += dt * .22;

    cam.theta = lerp(cam.theta, goal.theta, 1 - Math.pow(.001, dt));
    cam.phi = lerp(cam.phi, goal.phi, 1 - Math.pow(.001, dt));
    cam.r = lerp(cam.r, goal.r, 1 - Math.pow(.001, dt));
    cam.tx = lerp(cam.tx, goal.tx, 1 - Math.pow(.001, dt));
    cam.ty = lerp(cam.ty, goal.ty, 1 - Math.pow(.001, dt));

    const sp = Math.sin(cam.phi);
    camera.position.set(
      cam.tx + cam.r * sp * Math.sin(cam.theta),
      cam.ty + cam.r * Math.cos(cam.phi),
      cam.r * sp * Math.cos(cam.theta)
    );
    camera.lookAt(cam.tx, cam.ty, 0);

    skinUniforms.uTime.value += dt;
    scanRing.position.y = .86 + ((skinUniforms.uTime.value * .055) % 1.0) * .95;
    scanRing.material.opacity = .09 + .10 * Math.sin(skinUniforms.uTime.value * 1.4 + 1);
    dust.rotation.y += dt * .035;

    if (state.selected) {
      selectedPulse += dt;
      const s = .075 + Math.sin(selectedPulse * 4.2) * .012;
      state.selected.selRing.scale.set(s, s, 1);
      state.selected.selRing.material.opacity = .55 + .25 * Math.sin(selectedPulse * 4.2);
    }

    updateLabels();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  resize();
  rebuildLabels();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
  setTimeout(() => loader.classList.add("hidden"), 750);
})();
