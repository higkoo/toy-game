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
  const handViewBtn = document.getElementById("handViewBtn");
  const iAna = document.getElementById("iAna");
  const anaBlock = document.getElementById("anaBlock");

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

  scene.add(new T.HemisphereLight(0xdceceb, 0x2d2520, .62));
  const key = new T.DirectionalLight(0xfff2e4, 2.05);
  key.position.set(1.6, 3.2, 2.5);
  scene.add(key);
  const rim = new T.DirectionalLight(0x9dc4cf, .62);
  rim.position.set(-2.2, 1.4, -2.2);
  scene.add(rim);
  const fill = new T.PointLight(0x8b9fd0, 0.36, 6);
  fill.position.set(1.8, 0.7, -1.4);
  scene.add(fill);
  const bounce = new T.DirectionalLight(0xffcfae, .55);
  bounce.position.set(0, -1.2, 1.4);
  scene.add(bounce);

  /* ---------- 人体 ---------- */
  const root = new T.Group();
  scene.add(root);

  const skinGroup = new T.Group();
  const boneGroup = new T.Group();
  const organGroup = new T.Group();
  root.add(skinGroup, boneGroup, organGroup);

  // CC0 真实人体基础网格（MakeHuman hm08，经 aicuc/3d-acupoint-atlas 适配）
  const realBody = new T.Group();
  realBody.name = "realBody";
  let realBodyMesh = null;
  root.add(realBody);
  const handDetailRoot = new T.Group();
  handDetailRoot.name = "handDetailRoot";
  handDetailRoot.visible = false;
  root.add(handDetailRoot);
  const handDetailGroups = { 1: null, "-1": null };
  (function buildRealBody() {
    const d = window.HUMAN_BODY;
    if (!d) return;
    function decode(text, signed) {
      const raw = atob(text);
      const view = new DataView(new ArrayBuffer(raw.length));
      for (let i = 0; i < raw.length; i++) view.setUint8(i, raw.charCodeAt(i));
      const out = new Array(raw.length / 2);
      for (let i = 0; i < raw.length; i += 2) out[i / 2] = signed ? view.getInt16(i, true) / 1000 : view.getUint16(i, true);
      return out;
    }
    const positions = decode(d.positions, true);
    // 参考模型为抬臂站姿；绕肩关节把上臂放下，使手落在髋侧，贴近本图谱坐标
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i], y = positions[i + 1];
      const ax = Math.abs(x);
      if (y < 3.45 || ax < .72) continue;
      const sgn = x >= 0 ? 1 : -1;
      const w = Math.min(1, Math.max(0, (ax - .74) / .22));
      if (!w) continue;
      const px = .84 * sgn, py = 6.22;
      const ang = -sgn * .384 * w; // 22°
      const dx = x - px, dy = y - py;
      const nx = px + dx * Math.cos(ang) - dy * Math.sin(ang);
      const ny = py + dx * Math.sin(ang) + dy * Math.cos(ang);
      positions[i] = x * (1 - w) + nx * w;
      positions[i + 1] = y * (1 - w) + ny * w;
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
    geo.setIndex(decode(d.indices, false));
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    geo.addGroup(0, d.skinIndexCount, 0);
    geo.addGroup(d.skinIndexCount, geo.index.count - d.skinIndexCount, 1);
    const skin = new T.MeshPhysicalMaterial({
      color: 0xf0c3a7, roughness: .60, metalness: 0,
      clearcoat: .14, clearcoatRoughness: .52,
      sheen: .25, sheenColor: 0x5a2d22, sheenRoughness: .7
    });
    const eye = new T.MeshPhysicalMaterial({ color: 0xf1e9df, roughness: .30, metalness: 0 });
    const mesh = new T.Mesh(geo, [skin, eye]);
    const scale = 1.8 / 7.628;
    mesh.scale.setScalar(scale);
    mesh.position.set(0, -0.279 * scale, -0.042);
    mesh.frustumCulled = false;
    realBody.add(mesh);
    realBodyMesh = mesh;

    /* 医学着装：运动内衣 + 高裁短裤，避免公开发布审核风险 */
    const garment = new T.Group(); realBody.add(garment);
    const clothMat = new T.MeshStandardMaterial({ color: 0x24464d, roughness: .80, metalness: .03, emissive: 0x0b2024, emissiveIntensity: .32 });
    const clothTrim = new T.MeshStandardMaterial({ color: 0xc9a66d, roughness: .48, metalness: .22, emissive: 0x3b2a12, emissiveIntensity: .32 });
    function clothRings(rings, mat, seg = 48) {
      const pos = [], idx = [];
      for (const [y, rx, rz] of rings) {
        for (let i = 0; i <= seg; i++) {
          const a = i / seg * Math.PI * 2;
          pos.push(Math.cos(a) * rx, y, Math.sin(a) * rz);
        }
      }
      for (let r = 0; r < rings.length - 1; r++) for (let i = 0; i < seg; i++) {
        const a = r * (seg + 1) + i, b = a + seg + 1;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
      const g = new T.BufferGeometry();
      g.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
      g.setIndex(idx); g.computeVertexNormals();
      return new T.Mesh(g, mat);
    }
    function trimRing(y, rx, rz) {
      const m = new T.Mesh(new T.TorusGeometry(1, .0035, 6, 64), clothTrim);
      m.rotation.x = Math.PI / 2; m.scale.set(rx, rz, 1); m.position.y = y;
      return m;
    }
    function braShell() {
      const seg = 64, rows = 13, pos = [], idx = [];
      const profile = [[.920, .190, .132], [1.010, .194, .138], [1.100, .208, .142], [1.185, .226, .148], [1.265, .242, .154], [1.330, .245, .154], [1.385, .238, .146], [1.410, .230, .138]];
      function at(t) {
        const f = t * (profile.length - 1), i = Math.min(profile.length - 2, Math.floor(f)), u = f - i;
        const a = profile[i], b = profile[i + 1];
        return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
      }
      for (let j = 0; j < rows; j++) {
        const t = j / (rows - 1);
        let [yBase, rx, rz] = at(t);
        for (let i = 0; i <= seg; i++) {
          const a = i / seg * Math.PI * 2;
          const x = Math.cos(a) * rx;
          const front = Math.max(0, Math.sin(a));
          const cupW = Math.sin(Math.PI * Math.min(1, Math.max(0, (yBase - 1.14) / .22)));
          const bulge = .030 * (Math.exp(-Math.pow((x - .092) / .066, 2)) + Math.exp(-Math.pow((x + .092) / .066, 2))) * front * Math.max(0, cupW);
          const dip = .032 * Math.exp(-Math.pow(x / .042, 2)) * Math.pow(Math.max(0, (yBase - 1.25) / .16), 3);
          pos.push(x, yBase - dip, Math.sin(a) * (rz + bulge));
        }
      }
      for (let j = 0; j < rows - 1; j++) for (let i = 0; i < seg; i++) {
        const a = j * (seg + 1) + i, b = a + seg + 1;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
      const g = new T.BufferGeometry();
      g.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
      g.setIndex(idx); g.computeVertexNormals();
      return new T.Mesh(g, clothMat);
    }
    const bra = braShell();
    bra.add(trimRing(.923, .191, .133));
    garment.add(bra);
    const hipBand = clothRings([[.918, .195, .144], [.965, .205, .151], [1.012, .197, .145], [1.048, .182, .135]], clothMat);
    hipBand.add(trimRing(1.048, .183, .136));
    garment.add(hipBand);
    for (const sg of [-1, 1]) {
      const leg = clothRings([[.748, .070, .083], [.795, .080, .094], [.855, .094, .108], [.915, .112, .126], [.972, .118, .130]], clothMat, 32);
      leg.position.x = sg * .092;
      leg.add(trimRing(.751, .071, .084));
      garment.add(leg);
    }

    /* 短发与眉眼，削弱“医学人偶”的裸模感 */
    const hair = new T.MeshStandardMaterial({ color: 0x18262c, roughness: .46, metalness: .03 });
    const cap = new T.Mesh(new T.SphereGeometry(.092, 28, 18, 0, Math.PI * 2, 0, Math.PI * .40), hair);
    cap.position.set(0, 1.742, -.006); cap.scale.set(.94, .82, 1.0);
    realBody.add(cap);
    const bun = new T.Mesh(new T.SphereGeometry(.042, 16, 12), hair);
    bun.position.set(0, 1.678, -.105); bun.scale.set(1.2, .8, .7);
    realBody.add(bun);
    const mouth = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3([
      V3(-.018, 1.638, .101), V3(0, 1.634, .106), V3(.018, 1.638, .101)
    ]), 10, .0018, 4, false), new T.MeshStandardMaterial({ color: 0x8b4d4a, roughness: .6 }));
    realBody.add(mouth);
    realBody.updateMatrixWorld(true);
  })();
  skinGroup.visible = false;

  const skinUniforms = { uTime: { value: 0 } };

  const skinMat = new T.MeshStandardMaterial({
    color: 0xf0c3a7, roughness: .60, metalness: .015,
    emissive: 0x24100c, emissiveIntensity: .035, side: T.FrontSide
  });
  const skinShadeMat = new T.MeshStandardMaterial({ color: 0xd79f81, roughness: .72, metalness: 0 });
  const nailMat = new T.MeshBasicMaterial({ color: 0xefc0a8 });
  const creaseMat = new T.MeshBasicMaterial({ color: 0x9a6a53, transparent: true, opacity: .13, depthWrite: false });
  const hairMat = new T.MeshStandardMaterial({ color: 0x17242c, roughness: .44, metalness: .04 });
  const browMat = new T.MeshBasicMaterial({ color: 0x3c2b25 });
  const scleraMat = new T.MeshStandardMaterial({ color: 0xf2e9dd, roughness: .38 });
  const irisMat = new T.MeshStandardMaterial({ color: 0x5c3d2b, roughness: .34, metalness: .05 });
  const pupilMat = new T.MeshBasicMaterial({ color: 0x10181b });
  const glintMat = new T.MeshBasicMaterial({ color: 0xffffff });
  const mouthMat = new T.MeshBasicMaterial({ color: 0x9c5f5b });
  const shortsMat = new T.MeshStandardMaterial({ color: 0x6f8894, roughness: .66, metalness: .02, emissive: 0x24343b, emissiveIntensity: .30 });
  const trimMat = new T.MeshStandardMaterial({ color: 0xc9a66d, roughness: .55, metalness: .15 });

  const outlineCache = new Map();
  function outlineMaterial(width) {
    if (outlineCache.has(width)) return outlineCache.get(width);
    const m = new T.ShaderMaterial({
      side: T.BackSide, depthWrite: true, depthTest: true, transparent: false,
      uniforms: { uWidth: { value: width } },
      vertexShader: `uniform float uWidth;
        void main(){ vec3 p = position + normal * uWidth; gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.0); }`,
      fragmentShader: `void main(){ gl_FragColor = vec4(0.055,0.075,0.082,1.0); }`
    });
    outlineCache.set(width, m);
    return m;
  }
  function addOutline(mesh, width = .0032) {
    const o = new T.Mesh(mesh.geometry, outlineMaterial(width));
    o.renderOrder = -1;
    mesh.add(o);
    return o;
  }

  function ringSurface(profile, seg = 64, sx = 1, capped = false) {
    const pos = [], nor = [], idx = [];
    const ringCount = profile.length;
    for (let i = 0; i < ringCount; i++) {
      const [y, rx, rz, zoff] = profile[i];
      for (let j = 0; j < seg; j++) {
        const a = (j / seg) * Math.PI * 2;
        pos.push(sx * rx * Math.cos(a), y, rz * Math.sin(a) + (zoff || 0));
        const nx = sx * Math.cos(a) / Math.max(rx, .01);
        const nz = Math.sin(a) / Math.max(rz, .01);
        const n = V3(nx, 0, nz).normalize();
        nor.push(n.x, n.y, n.z);
      }
    }
    for (let i = 0; i < ringCount - 1; i++) {
      for (let j = 0; j < seg; j++) {
        const a = i * seg + j, b = i * seg + ((j + 1) % seg);
        const c = (i + 1) * seg + j, d = (i + 1) * seg + ((j + 1) % seg);
        if (sx > 0) idx.push(a, c, b, b, c, d);
        else idx.push(a, b, c, b, d, c);
      }
    }
    if (capped) {
      const [y0, , , z0] = profile[0], [y1, , , z1] = profile[ringCount - 1];
      const ci0 = ringCount * seg, ci1 = ci0 + 1;
      pos.push(0, y0, z0 || 0, 0, y1, z1 || 0);
      nor.push(0, -1, 0, 0, 1, 0);
      for (let j = 0; j < seg; j++) {
        const a = j, b = (j + 1) % seg;
        const c = (ringCount - 1) * seg + j, d = (ringCount - 1) * seg + ((j + 1) % seg);
        if (sx > 0) { idx.push(ci0, a, b); idx.push(ci1, d, c); }
        else { idx.push(ci0, b, a); idx.push(ci1, c, d); }
      }
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
    geo.setAttribute("normal", new T.Float32BufferAttribute(nor, 3));
    geo.setIndex(idx);
    return geo;
  }

  function skinMesh(geo, parent = skinGroup, ow = .0032) {
    const mesh = new T.Mesh(geo, skinMat);
    if (ow) addOutline(mesh, ow);
    parent.add(mesh);
    return mesh;
  }

  // 躯干：肩宽、腰窄、骨盆收紧，保留解剖体表的起伏
  const torsoProfile = [
    [0.800, 0.128, 0.082, 0.000],
    [0.835, 0.148, 0.094, 0.000],
    [0.875, 0.158, 0.101, 0.001],
    [0.915, 0.157, 0.102, 0.003],
    [0.955, 0.148, 0.099, 0.004],
    [0.995, 0.139, 0.094, 0.005],
    [1.035, 0.131, 0.089, 0.006],
    [1.075, 0.130, 0.088, 0.007],
    [1.115, 0.139, 0.092, 0.008],
    [1.155, 0.152, 0.098, 0.009],
    [1.195, 0.166, 0.104, 0.010],
    [1.235, 0.178, 0.108, 0.010],
    [1.275, 0.190, 0.112, 0.009],
    [1.315, 0.200, 0.112, 0.007],
    [1.355, 0.207, 0.108, 0.005],
    [1.390, 0.212, 0.101, 0.003],
    [1.415, 0.207, 0.094, 0.001],
    [1.438, 0.160, 0.086, 0.000],
    [1.455, 0.100, 0.076, 0.001],
    [1.478, 0.069, 0.066, 0.002],
    [1.510, 0.062, 0.061, 0.003],
    [1.545, 0.057, 0.057, 0.004],
    [1.580, 0.055, 0.055, 0.005]
  ];
  skinMesh(ringSurface(torsoProfile, 80, 1), skinGroup, .0038);

  // 锁骨与胸大肌轮廓、肚脐
  for (const s of [-1, 1]) {
    const collar = new T.CatmullRomCurve3([
      V3(0, 1.428, .082), V3(s * .070, 1.424, .074), V3(s * .135, 1.418, .058)
    ]);
    const collarMesh = new T.Mesh(new T.TubeGeometry(collar, 16, .0032, 5, false), skinShadeMat);
    skinGroup.add(collarMesh);
    ellipsoid(.055, .026, .014, s * .058, 1.318, .084, skinMat, skinGroup, true);
  }
  ellipsoid(.0075, .0055, .004, 0, .992, .102, skinShadeMat, skinGroup);

  // 运动短裤：单圈高裁短裤，覆盖骨盆接缝并保留腿部开口
  const shortsProfile = [
    [0.858, 0.148, 0.099, 0.001],
    [0.874, 0.159, 0.106, 0.001],
    [0.892, 0.164, 0.109, 0.002],
    [0.912, 0.160, 0.106, 0.002],
    [0.930, 0.151, 0.102, 0.001]
  ];
  const shorts = new T.Mesh(ringSurface(shortsProfile, 64, 1), shortsMat);
  addOutline(shorts, .0038);
  skinGroup.add(shorts);
  const waistCurve = new T.CatmullRomCurve3((() => {
    const a = [];
    for (let i = 0; i <= 48; i++) {
      const t = i / 48 * Math.PI * 2;
      a.push(V3(.159 * Math.cos(t), .930, .109 * Math.sin(t) + .002));
    }
    return a;
  })(), false);
  const waist = new T.Mesh(new T.TubeGeometry(waistCurve, 64, .0042, 5, false), trimMat);
  skinGroup.add(waist);
  const hemCurve = new T.CatmullRomCurve3((() => {
    const a = [];
    for (let i = 0; i <= 48; i++) {
      const t = i / 48 * Math.PI * 2;
      a.push(V3(.148 * Math.cos(t), .860, .099 * Math.sin(t) + .001));
    }
    return a;
  })(), false);
  skinGroup.add(new T.Mesh(new T.TubeGeometry(hemCurve, 64, .0036, 5, false), trimMat));

  function ellipsoid(sx, sy, sz, x, y, z, material = skinMat, parent = skinGroup, outline = true) {
    const m = new T.Mesh(new T.SphereGeometry(1, 30, 22), material);
    m.scale.set(sx, sy, sz);
    m.position.set(x, y, z);
    if (outline && material === skinMat) addOutline(m, .0026);
    parent.add(m);
    return m;
  }

  function taper(a, b, r1, r2, material = skinMat, parent = skinGroup, outline = true, radial = 18) {
    const va = V3(...a), vb = V3(...b);
    const dir = vb.clone().sub(va);
    const len = dir.length();
    const geo = new T.CylinderGeometry(r2, r1, len, radial, 1);
    const mesh = new T.Mesh(geo, material);
    mesh.position.copy(va).add(vb).multiplyScalar(.5);
    mesh.quaternion.setFromUnitVectors(V3(0, 1, 0), dir.normalize());
    if (outline && material === skinMat) addOutline(mesh, .0028);
    parent.add(mesh);
    return mesh;
  }

  function sphereJoint(x, y, z, r, material = skinMat, parent = skinGroup, outline = true) {
    const m = new T.Mesh(new T.SphereGeometry(r, 18, 14), material);
    m.position.set(x, y, z);
    if (outline && material !== skinMat) addOutline(m, .0022);
    parent.add(m);
    return m;
  }

  // 颈、头、五官与短发
  taper([0, 1.582, .008], [0, 1.625, .010], .052, .047, skinMat, skinGroup, true, 24);
  function makeHeadGeometry() {
    const g = new T.SphereGeometry(1, 48, 36);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const low = Math.max(0, -y);
      const narrow = 1 - .31 * Math.pow(low, 1.35);
      x *= .103 * narrow;
      z *= .114 * (1 - .10 * low);
      z += .013 * low;
      y *= .128;
      pos.setXYZ(i, x, y + 1.674, z + .012);
    }
    g.computeVertexNormals();
    return g;
  }
  const headGeo = makeHeadGeometry();
  const head = skinMesh(headGeo, skinGroup, .0036);
  ellipsoid(.060, .045, .052, 0, 1.588, .049, skinMat, skinGroup, true);
  // 耳朵
  for (const s of [-1, 1]) {
    ellipsoid(.016, .030, .012, s * .104, 1.664, .004, skinMat, skinGroup, true);
  }

  // 眼白、虹膜、瞳孔、高光
  for (const s of [-1, 1]) {
    ellipsoid(.023, .0120, .0042, s * .038, 1.682, .112, scleraMat, skinGroup, false);
    ellipsoid(.0102, .0104, .0026, s * .038, 1.682, .1152, irisMat, skinGroup, false);
    ellipsoid(.0044, .0058, .0014, s * .038, 1.682, .1170, pupilMat, skinGroup, false);
    ellipsoid(.0032, .0032, .0010, s * .0345, 1.686, .1182, glintMat, skinGroup, false);
    // 上眼睑：皮肤色厚边包住眼球上半，外侧再压一条深色睫毛线
    const lid = new T.CatmullRomCurve3([
      V3(s * .015, 1.694, .110), V3(s * .038, 1.701, .114), V3(s * .061, 1.694, .110)
    ]);
    skinGroup.add(new T.Mesh(new T.TubeGeometry(lid, 16, .0032, 5, false), skinMat));
    const lash = new T.CatmullRomCurve3([
      V3(s * .017, 1.700, .114), V3(s * .038, 1.706, .117), V3(s * .059, 1.700, .113)
    ]);
    skinGroup.add(new T.Mesh(new T.TubeGeometry(lash, 16, .0011, 4, false), browMat));
    // 眉
    const brow = new T.CatmullRomCurve3([
      V3(s * .018, 1.710, .109), V3(s * .042, 1.714, .112), V3(s * .067, 1.710, .107)
    ]);
    skinGroup.add(new T.Mesh(new T.TubeGeometry(brow, 14, .0023, 5, false), browMat));
  }
  // 鼻梁与鼻尖
  taper([0, 1.695, .108], [0, 1.651, .132], .011, .007, skinMat, skinGroup, false, 10);
  ellipsoid(.008, .0075, .008, 0, 1.646, .130, skinMat, skinGroup, false);
  for (const s of [-1, 1]) ellipsoid(.0034, .0028, .0022, s * .0065, 1.640, .126, skinShadeMat, skinGroup, false);
  // 嘴唇
  const mouth = new T.CatmullRomCurve3([
    V3(-.023, 1.607, .118), V3(0, 1.603, .123), V3(.023, 1.607, .118)
  ]);
  skinGroup.add(new T.Mesh(new T.TubeGeometry(mouth, 16, .0022, 4, false), mouthMat));

  // 头发：后脑壳 + 顶部发盖 + 额前碎发
  ellipsoid(.107, .125, .074, 0, 1.682, -.038, hairMat, skinGroup, true);
  const hairGeo = new T.SphereGeometry(1, 36, 24, 0, Math.PI * 2, 0, Math.PI * .40);
  const hairCap = new T.Mesh(hairGeo, hairMat);
  hairCap.scale.set(.110, .136, .120);
  hairCap.position.set(0, 1.674, .006);
  addOutline(hairCap, .0034);
  skinGroup.add(hairCap);
  for (const s of [-1, 1]) {
    taper([s * .018, 1.744, .106], [s * .074, 1.706, .108], .014, .004, hairMat, skinGroup, false, 7);
    taper([s * .092, 1.708, .052], [s * .099, 1.663, .040], .012, .005, hairMat, skinGroup, false, 7);
  }
  taper([0, 1.788, -.006], [0, 1.798, -.030], .020, .004, hairMat, skinGroup, false, 7);

  // 上臂、前臂、手腕
  for (const s of [-1, 1]) {
    ellipsoid(.060, .050, .058, s * .208, 1.398, .002, skinMat, skinGroup, false);
    taper([s * .208, 1.405, .002], [s * .275, 1.058, .012], .061, .043, skinMat, skinGroup, false, 22);
    taper([s * .275, 1.058, .012], [s * .336, .806, .026], .043, .024, skinMat, skinGroup, false, 22);
    sphereJoint(s * .275, 1.058, .012, .047, skinMat, skinGroup, true);
    ellipsoid(.028, .030, .026, s * .336, .820, .030, skinMat, skinGroup, false);
  }

  /* ---------- 手部：手掌 + 五指三节 ---------- */
  const handRigs = [];
  const handSegments = [];
  function buildHand(s) {
    const wrist = V3(s * .336, .815, .035);
    const hg = new T.Group(); hg.name = "handDetail" + s;
    // 手掌：倒角挤出，腕部窄、掌指关节处宽、底边平，便于五指排布
    const palmShape = new T.Shape();
    palmShape.moveTo(-.021, .824);
    palmShape.quadraticCurveTo(-.035, .808, -.045, .786);
    palmShape.quadraticCurveTo(-.052, .762, -.052, .740);
    palmShape.quadraticCurveTo(-.051, .704, -.034, .699);
    palmShape.quadraticCurveTo(0, .695, .034, .699);
    palmShape.quadraticCurveTo(.051, .704, .052, .740);
    palmShape.quadraticCurveTo(.052, .762, .045, .786);
    palmShape.quadraticCurveTo(.035, .808, .021, .824);
    palmShape.quadraticCurveTo(0, .828, -.021, .824);
    const palmGeo = new T.ExtrudeGeometry(palmShape, {
      depth: .026, bevelEnabled: true, bevelThickness: .008, bevelSize: .006,
      bevelSegments: 3, curveSegments: 12, steps: 1
    });
    const palm = new T.Mesh(palmGeo, skinMat);
    palm.position.set(s * .335, 0, .026);
    hg.add(palm);
    // 掌根曲线本身已表达大鱼际/小鱼际，不再叠加球体
    // 掌纹改用贴面细线，避免浮在掌外产生阴影
    const wristCrease = new T.CatmullRomCurve3([
      V3(s * .304, .818, .0608), V3(s * .335, .816, .0622), V3(s * .368, .818, .0606)
    ]);
    hg.add(new T.Mesh(new T.TubeGeometry(wristCrease, 14, .0010, 4, false), creaseMat));

    function phalanx(a, b, r1, r2, outlineWidth = 0) {
      const va = V3(s * a[0], a[1], a[2]);
      const vb = V3(s * b[0], b[1], b[2]);
      const dir = vb.clone().sub(va);
      const len = dir.length();
      const geo = new T.CylinderGeometry(r2, r1, len, 12, 1);
      const mesh = new T.Mesh(geo, skinMat);
      mesh.position.copy(va).add(vb).multiplyScalar(.5);
      mesh.quaternion.setFromUnitVectors(V3(0, 1, 0), dir.clone().normalize());
      if (outlineWidth > 0) addOutline(mesh, outlineWidth);
      hg.add(mesh);
      return { mesh, va, vb, dir, len };
    }
    function joint(p, r) {
      const m = new T.Mesh(new T.SphereGeometry(r, 14, 11), skinMat);
      m.position.set(s * p[0], p[1], p[2]);
      hg.add(m);
      return m;
    }
    function crease(p, axis, r) {
      const torus = new T.Mesh(new T.TorusGeometry(r, .00045, 3, 10), creaseMat);
      torus.position.set(s * p[0], p[1], p[2]);
      torus.quaternion.setFromUnitVectors(V3(0, 0, 1), axis.clone().normalize());
      hg.add(torus);
    }
    function nail(a, b, dir, r) {
      const m = new T.Mesh(new T.SphereGeometry(1, 12, 8), nailMat);
      m.scale.set(.0054, .0078, .0016);
      const t = .70;
      m.position.set(s * (a[0] + (b[0] - a[0]) * t), a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t - r * .95);
      m.quaternion.setFromUnitVectors(V3(0, 1, 0), dir.clone().normalize());
      hg.add(m);
    }

    const defs = [
      { key: "thumb", name: "拇指", short: "拇", pts: [[.370, .796, .046], [.398, .779, .050], [.418, .764, .054], [.433, .752, .056]], radii: [.0150, .0130, .0115, .0095], metacarpal: true },
      { key: "index", name: "食指", short: "食", pts: [[.362, .720, .042], [.364, .684, .044], [.366, .658, .046], [.368, .636, .048]], radii: [.0116, .0100, .0088, .0074] },
      { key: "middle", name: "中指", short: "中", pts: [[.335, .720, .041], [.334, .682, .043], [.333, .652, .045], [.332, .627, .047]], radii: [.0120, .0105, .0092, .0078] },
      { key: "ring", name: "环指", short: "环", pts: [[.308, .720, .041], [.306, .685, .043], [.303, .658, .045], [.301, .638, .047]], radii: [.0110, .0095, .0084, .0070] },
      { key: "little", name: "小指", short: "小", pts: [[.289, .720, .042], [.286, .690, .044], [.283, .668, .046], [.280, .652, .048]], radii: [.0102, .0087, .0075, .0062] }
    ];

    const rig = { side: s, fingers: {}, segments: [] };
    defs.forEach(def => {
      const joints = def.pts.map((p, pi) => joint(p, pi === 0 ? def.radii[0] * (def.metacarpal ? 1.08 : 1.02) : def.radii[Math.min(pi, 3)] * .88));
      if (def.metacarpal) {
        phalanx(def.pts[0], def.pts[1], def.radii[0], def.radii[1], 0);
      }
      const firstSeg = def.metacarpal ? 1 : 0;
      const count = def.metacarpal ? 2 : 3;
      const segRecords = [];
      for (let i = firstSeg; i < 3; i++) {
        const k = i - firstSeg + 1;
        const a = def.pts[i], b = def.pts[i + 1];
        const r1 = def.radii[i], r2 = def.radii[i + 1];
        const seg = phalanx(a, b, r1, r2);
        joint(b, r2 * .88);
        if (i < 2) crease(b, seg.dir, r2 * 1.005);
        if (i === 2) nail(a, b, seg.dir, r2);
        const mid = seg.va.clone().add(seg.vb).multiplyScalar(.5);
        segRecords.push({ index: k, a: seg.va, b: seg.vb, mid, name: def.name, short: def.short });
        rig.segments.push({ side: s, name: def.name, short: def.short, index: k, mid, finger: def.key });
        handSegments.push({ side: s, name: def.name, short: def.short, index: k, mid, finger: def.key });
      }
      rig.fingers[def.key] = { name: def.name, segments: segRecords, base: V3(s * def.pts[0][0], def.pts[0][1], def.pts[0][2]), tip: V3(s * def.pts[3][0], def.pts[3][1], def.pts[3][2]) };
    });
    // 掌指关节隆起

    const cuff = new T.Mesh(new T.CylinderGeometry(.031, .038, .105, 22, 1, true), skinMat);
    cuff.position.set(s * .336, .875, .035); hg.add(cuff);
    const cuffTrim = new T.Mesh(new T.TorusGeometry(.038, .0032, 6, 28), trimMat);
    cuffTrim.rotation.x = Math.PI / 2; cuffTrim.position.set(s * .336, .818, .035); hg.add(cuffTrim);
    handRigs.push(rig);
    hg.visible = false;
    handDetailGroups[s] = hg;
    handDetailRoot.add(hg);
  }
  buildHand(1);
  buildHand(-1);

  // 腿与足
  for (const s of [-1, 1]) {
    taper([s * .088, .930, .001], [s * .104, .475, .010], .091, .054, skinMat, skinGroup, false, 24);
    taper([s * .104, .475, .010], [s * .100, .092, .008], .054, .032, skinMat, skinGroup, false, 24);
    sphereJoint(s * .088, .930, .001, .088, skinMat, skinGroup, true);
    sphereJoint(s * .104, .475, .010, .059, skinMat, skinGroup, true);
    sphereJoint(s * .100, .092, .008, .034, skinMat, skinGroup, true);
    ellipsoid(.052, .033, .092, s * .100, .033, .050, skinMat, skinGroup, true);
    // 足弓内侧、脚跟
    ellipsoid(.030, .030, .034, s * .077, .042, .020, skinMat, skinGroup, false);
    ellipsoid(.035, .026, .034, s * .100, .026, -.030, skinMat, skinGroup, true);
    // 五趾
    const toeX = [.065, .083, .099, .113, .125];
    const toeR = [.013, .0105, .0095, .0085, .0075];
    const toeZ = [.137, .140, .137, .132, .124];
    for (let i = 0; i < 5; i++) {
      ellipsoid(toeR[i], toeR[i] * .85, toeR[i] * 1.7, s * toeX[i], toeR[i] * .9 + .002, toeZ[i], skinMat, skinGroup, false);
    }
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

  /* ---------- 将旧坐标投影到真实人体表面 ---------- */
  const _ray = new T.Raycaster();
  const projectionCache = new Map();
  function outwardDir(p, sideSign = 0) {
    if (p.y > 1.70) return V3(0, 1, 0);
    if (p.y < .24) return V3((p.x || sideSign * .12) * 2, -1, p.z * 2).normalize();
    if (p.y < .92 && Math.abs(p.x) < .13) return V3(p.x * .4, 0, p.z >= 0 ? 1 : -1).normalize();
    if (Math.abs(p.x) > .13 || (sideSign && p.y < 1.36)) return V3(sideSign || p.x, 0, p.z * .45).normalize();
    return V3(p.x * .35, 0, p.z >= 0 ? 1 : -1).normalize();
  }
  function projectPoint(p, dirOverride, sideSign = 0) {
    if (!realBodyMesh) return p.clone();
    const cacheKey = dirOverride ? "" : `${p.x.toFixed(4)}|${p.y.toFixed(4)}|${p.z.toFixed(4)}|${sideSign}`;
    if (cacheKey && projectionCache.has(cacheKey)) return projectionCache.get(cacheKey).clone();
    const dir = (dirOverride || outwardDir(p)).clone().normalize();
    const origin = p.clone().add(dir.clone().multiplyScalar(.9));
    _ray.set(origin, dir.clone().negate());
    _ray.near = 0; _ray.far = 1.8;
    const hits = _ray.intersectObject(realBodyMesh, false);
    const sideOk = h => !sideSign || Math.abs(p.x) < .035 || h.point.x * sideSign >= -.002;
    const hit = hits.find(sideOk);
    if (hit) {
      const n = hit.face.normal.clone().transformDirection(realBodyMesh.matrixWorld).normalize();
      const out = hit.point.clone().add(n.multiplyScalar(.0035));
      if (cacheKey) projectionCache.set(cacheKey, out.clone());
      return out;
    }
    // 射线未命中时退回最近的同侧顶点
    const attr = realBodyMesh.geometry.attributes.position;
    const nor = realBodyMesh.geometry.attributes.normal;
    let best = Infinity, bi = 0;
    for (let i = 0; i < attr.count; i++) {
      const vx = attr.getX(i) * realBodyMesh.scale.x + realBodyMesh.position.x;
      const vy = attr.getY(i) * realBodyMesh.scale.y + realBodyMesh.position.y;
      const vz = attr.getZ(i) * realBodyMesh.scale.z + realBodyMesh.position.z;
      let d = (vx - p.x) ** 2 + (vy - p.y) ** 2 + (vz - p.z) ** 2;
      if (sideSign && p.x * vx < 0) d += .6;
      if (p.z > .025 && vz < 0) d += .6;
      if (p.z < -.025 && vz > 0) d += .6;
      if (d < best) { best = d; bi = i; }
    }
    const v = V3(attr.getX(bi), attr.getY(bi), attr.getZ(bi));
    v.applyMatrix4(realBodyMesh.matrixWorld);
    const n = V3(nor.getX(bi), nor.getY(bi), nor.getZ(bi)).transformDirection(realBodyMesh.matrixWorld).normalize();
    const out = v.add(n.multiplyScalar(.0035));
    if (cacheKey) projectionCache.set(cacheKey, out.clone());
    return out;
  }
  function isHandPoint(p) { return p.p[1] < .86 && Math.abs(p.p[0]) > .24; }
  function modelHint(p, sideHint) {
    if (isHandPoint(p)) {
      const sx = Math.abs(p.p[0]) - .34;
      return V3((sideHint || Math.sign(p.p[0])) * (.21 + sx * .22), .888 + (p.p[1] - .82) * .26, 0);
    }
    return V3(p.p[0] * (sideHint || 1), p.p[1], p.p[2]);
  }
  function smoothSurfaceCurve(vecs, samples = 60, sideSign = 0) {
    if (!realBodyMesh || vecs.length < 2) return new T.CatmullRomCurve3(vecs, false, "catmullrom", .38);
    const dirs = vecs.map(v => outwardDir(v, sideSign));
    const base = new T.CatmullRomCurve3(vecs, false, "catmullrom", .38);
    const projected = [];
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const p = base.getPoint(t);
      let k = 0, best = Infinity;
      vecs.forEach((v, vi) => { const d = v.distanceToSquared(p); if (d < best) { best = d; k = vi; } });
      projected.push(projectPoint(p, dirs[k], sideSign));
    }
    return new T.CatmullRomCurve3(projected, false, "catmullrom", .38);
  }

  function buildMeridian(m) {
    const group = new T.Group();
    const mats = [];
    const reg = (mat, full, dim) => { mats.push({ mat, full, dim }); return mat; };
    const color = new T.Color(m.color);
    const sides = m.central ? [0] : [1, -1];
    const pointsBySide = new Map();

    for (const sideSign of sides) {
      const sideGroup = new T.Group();
      const side = m.central ? "正中" : (sideSign > 0 ? "左侧" : "右侧");
      const sideKey = m.central ? "C" : (sideSign > 0 ? "L" : "R");
      const rawVecs = m.points.map(p => V3(p.p[0] * sideSign, p.p[1], p.p[2]));
      const sideHint = m.central ? 0 : sideSign;
      const vecs = rawVecs.map((p, i) => projectPoint(modelHint(m.points[i], sideHint), null, sideHint));
      if (vecs.length > 1) {
        const curve = new T.CatmullRomCurve3(vecs, false, "catmullrom", .35);
        const core = new T.Mesh(
          new T.TubeGeometry(curve, Math.max(56, vecs.length * 9), .0028, 7, false),
          reg(new T.MeshBasicMaterial({ color, transparent: true, opacity: .92, depthWrite: false, depthTest: false, toneMapped: false }), .95, .18)
        );
        sideGroup.add(core);
        const halo = new T.Mesh(
          new T.TubeGeometry(curve, Math.max(48, vecs.length * 7), .0078, 6, false),
          reg(new T.MeshBasicMaterial({ color, transparent: true, opacity: .13, depthWrite: false, depthTest: false, blending: T.AdditiveBlending, toneMapped: false }), .16, .018)
        );
        sideGroup.add(halo);
      }

      const pointRecs = [];
      m.points.forEach((p, idx) => {
        if (p.h) return;
        const rawPos = V3(p.p[0] * sideSign, p.p[1], p.p[2]);
        const pos = projectPoint(modelHint(p, sideHint), null, sideHint);
        const pointGroup = new T.Group();
        pointGroup.position.copy(pos);

        const core = new T.Mesh(
          new T.SphereGeometry(.0038, 10, 8),
          reg(new T.MeshBasicMaterial({ color, transparent: true, opacity: .98, depthWrite: false, depthTest: false, toneMapped: false }), 1, .30)
        );
        pointGroup.add(core);

        const haloMat = reg(new T.SpriteMaterial({
          map: glowTex, color, transparent: true, opacity: .52,
          depthWrite: false, depthTest: false, blending: T.AdditiveBlending, toneMapped: false
        }), .55, .12);
        const halo = new T.Sprite(haloMat);
        halo.scale.set(.034, .034, 1);
        pointGroup.add(halo);

        const selRing = new T.Sprite(new T.SpriteMaterial({
          map: ringTex, color, transparent: true, opacity: 0,
          depthWrite: false, depthTest: false, blending: T.AdditiveBlending, toneMapped: false
        }));
        selRing.scale.set(.07, .07, 1);
        pointGroup.add(selRing);

        const rec = { m, p, side, sideKey, pos, rawPos, modelPos: pos.clone(), handPos: rawPos.clone(), index: idx, group: sideGroup, pointGroup, selRing };
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
    meridianRuntime.set(m.id, { m, group, pointsBySide, mats });
  }

  DATA.forEach(buildMeridian);
  /* ---------- 手部专用经络覆盖层（与高精度手模同坐标） ---------- */
  const handOverlay = new T.Group();
  handOverlay.name = "handOverlay";
  handDetailRoot.add(handOverlay);
  const handOverlayGroups = { 1: null, "-1": null };
  for (const sideSign of [1, -1]) {
    const g = new T.Group();
    g.name = "handOverlay-" + sideSign;
    const recs = records.filter(r => r.p.ana && r.side === (sideSign > 0 ? "左侧" : "右侧"));
    const byMer = new Map();
    recs.forEach(rec => {
      const color = new T.Color(rec.m.color);
      const dot = new T.Mesh(
        new T.SphereGeometry(.0032, 10, 8),
        new T.MeshBasicMaterial({ color, transparent: true, opacity: .96, depthWrite: false, depthTest: false, toneMapped: false })
      );
      dot.position.copy(rec.rawPos);
      dot.renderOrder = 8;
      g.add(dot);
      const halo = new T.Sprite(new T.SpriteMaterial({
        map: glowTex, color, transparent: true, opacity: .5,
        depthWrite: false, depthTest: false, blending: T.AdditiveBlending, toneMapped: false
      }));
      halo.position.copy(rec.rawPos); halo.scale.set(.022, .022, 1); halo.renderOrder = 9;
      g.add(halo);
      rec.handOverlayPos = rec.rawPos.clone();
      if (!byMer.has(rec.m.id)) byMer.set(rec.m.id, []);
      byMer.get(rec.m.id).push(rec.rawPos);
    });
    byMer.forEach((vecs, id) => {
      if (vecs.length < 2) return;
      const m = DATA.find(x => x.id === id);
      const curve = new T.CatmullRomCurve3(vecs, false, "catmullrom", .35);
      const core = new T.Mesh(
        new T.TubeGeometry(curve, Math.max(20, vecs.length * 8), .0018, 6, false),
        new T.MeshBasicMaterial({ color: new T.Color(m.color), transparent: true, opacity: .9, depthWrite: false, depthTest: false, toneMapped: false })
      );
      core.renderOrder = 7;
      g.add(core);
    });
    handOverlayGroups[sideSign] = g;
    handOverlay.add(g);
  }
  handOverlay.visible = false;

  meridianRuntime.forEach(rt => rt.mats.forEach(x => { x.mat.opacity = x.dim; }));

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

  /* ---------- 十二地支子午流注罗盘底座 ---------- */
  (function buildCompassBase() {
    const cv = document.createElement("canvas");
    cv.width = cv.height = 1024;
    const g = cv.getContext("2d");
    const cx = 512, cy = 512, R = 500;
    const branch = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
    const hours = ["23–1", "1–3", "3–5", "5–7", "7–9", "9–11", "11–13", "13–15", "15–17", "17–19", "19–21", "21–23"];
    const organ = ["胆", "肝", "肺", "大肠", "胃", "脾", "心", "小肠", "膀胱", "肾", "心包", "三焦"];
    const grad = g.createRadialGradient(cx, cy, 30, cx, cy, R);
    grad.addColorStop(0, "rgba(10,25,28,.96)");
    grad.addColorStop(.72, "rgba(8,21,24,.94)");
    grad.addColorStop(1, "rgba(4,13,16,.78)");
    g.fillStyle = grad;
    g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "rgba(201,166,109,.55)"; g.lineWidth = 3;
    for (const rr of [.22, .31, .40, .485, .50, .995]) {
      g.beginPath(); g.arc(cx, cy, R * rr, 0, Math.PI * 2); g.stroke();
    }
    for (let i = 0; i < 12; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 6;
      g.strokeStyle = i % 3 === 0 ? "rgba(201,166,109,.62)" : "rgba(127,227,211,.26)";
      g.lineWidth = i % 3 === 0 ? 2.4 : 1.2;
      g.beginPath(); g.moveTo(cx + Math.cos(a) * R * .22, cy + Math.sin(a) * R * .22);
      g.lineTo(cx + Math.cos(a) * R * .995, cy + Math.sin(a) * R * .995); g.stroke();
    }
    const tex = new T.CanvasTexture(cv);
    tex.colorSpace = T.SRGBColorSpace;
    tex.anisotropy = 4;
    const disc = new T.Mesh(
      new T.CircleGeometry(.665, 72),
      new T.MeshBasicMaterial({ map: tex, transparent: true, opacity: .92, depthWrite: false, side: T.DoubleSide, toneMapped: false })
    );
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = .004;
    disc.renderOrder = -2;
    decor.add(disc);
    const outer = new T.Mesh(
      new T.TorusGeometry(.672, .0034, 6, 96),
      new T.MeshBasicMaterial({ color: 0xc9a66d, transparent: true, opacity: .42, depthWrite: false, blending: T.AdditiveBlending })
    );
    outer.rotation.x = Math.PI / 2;
    outer.position.y = .006;
    decor.add(outer);

    function labelTexture(branch, organ, time, center = false) {
      const lc = document.createElement("canvas");
      lc.width = center ? 512 : 256; lc.height = center ? 180 : 170;
      const lg = lc.getContext("2d");
      lg.clearRect(0, 0, lc.width, lc.height);
      lg.textAlign = "center"; lg.textBaseline = "middle";
      if (center) {
        lg.fillStyle = "rgba(231,201,141,.95)";
        lg.font = '600 54px "Noto Serif CJK SC",serif';
        lg.fillText("子午流注", 256, 70);
        lg.fillStyle = "rgba(168,239,227,.62)";
        lg.font = '400 25px "Noto Sans CJK SC",sans-serif';
        lg.fillText("十二地支 · 十二时辰", 256, 122);
      } else {
        lg.fillStyle = "rgba(7,20,23,.82)";
        lg.beginPath(); lg.roundRect(3, 3, 250, 164, 18); lg.fill();
        lg.strokeStyle = "rgba(201,166,109,.38)"; lg.lineWidth = 2; lg.stroke();
        lg.fillStyle = "#f1d39a";
        lg.font = '600 52px "Noto Serif CJK SC",serif';
        lg.fillText(branch, 128, 52);
        lg.fillStyle = "rgba(231,201,141,.88)";
        lg.font = '500 27px "Noto Serif CJK SC",serif';
        lg.fillText(organ, 128, 104);
        lg.fillStyle = "rgba(168,239,227,.62)";
        lg.font = '400 21px "Noto Sans CJK SC",sans-serif';
        lg.fillText(time, 128, 138);
      }
      const t = new T.CanvasTexture(lc); t.colorSpace = T.SRGBColorSpace; return t;
    }
    for (let i = 0; i < 12; i++) {
      const mid = -Math.PI / 2 + i * Math.PI / 6 + Math.PI / 12;
      const sp = new T.Sprite(new T.SpriteMaterial({ map: labelTexture(branch[i], organ[i], hours[i]), transparent: true, opacity: .92, depthWrite: false, depthTest: true, toneMapped: false }));
      sp.position.set(Math.cos(mid) * .405, .018, Math.sin(mid) * .405);
      sp.scale.set(.105, .070, 1);
      sp.renderOrder = -1;
      decor.add(sp);
    }
    const centerLabel = new T.Sprite(new T.SpriteMaterial({ map: labelTexture("", "", "", true), transparent: true, opacity: .82, depthWrite: false, depthTest: true, toneMapped: false }));
    centerLabel.position.set(0, .020, 0);
    centerLabel.scale.set(.30, .105, 1);
    centerLabel.renderOrder = -1;
    decor.add(centerLabel);
  })();

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
  const HOME = { r: MOBILE_UI ? (window.innerHeight < 760 ? 5.4 : 4.75) : 4.24, ty: MOBILE_UI ? 1.0 : .95 };
  const cam = { theta: .05, phi: 1.36, r: HOME.r, tx: 0, ty: HOME.ty };
  const goal = { theta: .05, phi: 1.36, r: HOME.r, tx: 0, ty: HOME.ty };
  let auto = !reduced;
  let handFocus = false, handSide = 1, handFinger = "index";

  function focusHand(side = handSide) {
    handSide = side;
    handFocus = true;
    auto = false;
    autoBtn.classList.remove("on");
    autoBtn.setAttribute("aria-pressed", "false");
    handViewBtn.classList.add("on");
    handViewBtn.setAttribute("aria-pressed", "true");
    document.body.classList.add("hand-focus");
    document.querySelectorAll("#fingerBar button").forEach(b => b.classList.toggle("on", b.dataset.finger === handFinger));
    handDetailRoot.visible = state.layers.skin;
    Object.keys(handDetailGroups).forEach(k => { if (handDetailGroups[k]) handDetailGroups[k].visible = Number(k) === side; });
    handOverlay.visible = state.layers.skin;
    Object.keys(handOverlayGroups).forEach(k => { if (handOverlayGroups[k]) handOverlayGroups[k].visible = Number(k) === side; });
    meridianRuntime.forEach(rt => { rt.group.visible = false; });
    realBody.visible = false;
    skinGroup.visible = false;
    goal.theta = 0;
    goal.phi = 1.48;
    goal.r = MOBILE_UI ? 1.75 : 1.15;
    goal.tx = side * .342;
    goal.ty = MOBILE_UI ? .735 : .742;
    document.querySelectorAll("[data-view]").forEach(b => b.classList.remove("on"));
    rebuildLabels();
    toast(`${side > 0 ? "左手" : "右手"}特写：拖拽手部检查五指，食1/2/3 即食指第1/2/3节`);
  }

  function setView(name) {
    handFocus = false;
    document.body.classList.remove("hand-focus");
    handDetailRoot.visible = false;
    handOverlay.visible = false;
    realBody.visible = state.layers.skin;
    skinGroup.visible = false;
    setActive(state.active, true);
    handViewBtn.classList.remove("on");
    handViewBtn.setAttribute("aria-pressed", "false");
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

  handViewBtn.addEventListener("click", () => {
    focusHand(handFocus ? (handSide === 1 ? -1 : 1) : 1);
  });
  document.querySelectorAll("#fingerBar button").forEach(b => {
    b.addEventListener("click", () => {
      handFinger = b.dataset.finger;
      document.querySelectorAll("#fingerBar button").forEach(x => x.classList.toggle("on", x === b));
      rebuildLabels();
    });
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
    if (handFocus) {
      const side = handSide > 0 ? "左侧" : "右侧";
      for (const rec of records) {
        if (!rec.p.ana || rec.side !== side || !rec.handOverlayPos) continue;
        v.copy(rec.handOverlayPos).project(camera);
        if (v.z > 1 || v.z < -1) continue;
        const x = (v.x * .5 + .5) * rect.width;
        const y = (-v.y * .5 + .5) * rect.height;
        const d = Math.hypot(x - px, y - py);
        if (d < bestD) { bestD = d; best = rec; }
      }
      return best;
    }
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
  canvas.addEventListener("click", e => {
    if (moved >= 7) return;
    const rec = pick(e);
    if (rec) selectPoint(rec);
    else clearSelection();
  });
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
    b.innerHTML = `<span class="dot" aria-hidden="true"></span><span class="mcopy"><b>${m.name}</b><em>${m.id} · ${m.route}</em></span><span class="cnt">${m.points.filter(p => !p.h).length}</span>`;
    b.addEventListener("click", () => setActive(m.id));
    merList.appendChild(b);
  });
  document.getElementById("merCount").textContent = DATA.length;
  pointTotalEl.textContent = new Set(DATA.flatMap(m => m.points.filter(p => !p.h).map(p => p.c))).size;

  const state = { active: "ALL", selected: null, layers: { skin: true, bone: false, organ: false } };
  boneGroup.visible = false;

  function setActive(id, quiet = false) {
    if (id === state.active && id !== "ALL") id = "ALL";
    state.active = id;
    const allMode = id === "ALL";
    meridianRuntime.forEach(rt => {
      rt.group.visible = (allMode || rt.m.id === id) && !handFocus;
      rt.mats.forEach(x => { x.mat.opacity = allMode ? x.dim : x.full; x.mat.depthTest = false; x.mat.needsUpdate = true; });
    });
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
    document.getElementById("iSide").textContent = rec.p.ana ? (rec.side === "左侧" ? "左手" : "右手") : rec.side;
    document.getElementById("iLoc").textContent = rec.p.loc;
    const handSideWord = rec.side === "左侧" ? "左手" : rec.side === "右侧" ? "右手" : "";
    iAna.textContent = rec.p.ana ? `${handSideWord} · ${rec.p.ana}` : "";
    anaBlock.style.display = rec.p.ana ? "" : "none";
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
    const onHand = !!r.p.ana;
    if (onHand) {
      focusHand(r.pos.x > 0 ? 1 : -1);
    } else {
      goal.r = 1.46;
      goal.theta = r.pos.z >= -.02 ? 0 : Math.PI;
      goal.phi = 1.42;
      goal.tx = r.pos.x;
      goal.ty = r.pos.y;
    }
    document.querySelectorAll("[data-view]").forEach(b => b.classList.remove("on"));
    toast(`聚焦 ${r.p.c} ${r.p.n}${onHand ? " · " + (r.pos.x > 0 ? "左手" : "右手") : ""}`);
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
    handFocus = false;
    handViewBtn.classList.remove("on");
    handViewBtn.setAttribute("aria-pressed", "false");
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
      if (layer === "skin") {
        handDetailRoot.visible = state.layers.skin && handFocus;
        handOverlay.visible = state.layers.skin && handFocus;
        skinGroup.visible = false;
        realBody.visible = state.layers.skin && !handFocus;
      }
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
  const handNodes = new Map();
  const projected = new T.Vector3();

  function rebuildLabels() {
    const keep = new Set();
    const keepHand = new Set();
    const activeRt = state.active === "ALL" ? null : meridianRuntime.get(state.active);
    let allowNames = false;
    if (activeRt) {
      const count = records.filter(r => r.m.id === state.active).length;
      allowNames = cam.r < 2.9;
    }
    if (!handFocus && activeRt && allowNames) {
      records.filter(r => r.m.id === state.active).forEach(r => keep.add(r));
    }
    if (state.selected) keep.add(state.selected);

    if (handFocus) handSegments.forEach(seg => {
      if (seg.side !== handSide) return;
      if (!MOBILE_UI || seg.finger === handFinger) keepHand.add(seg);
    });

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

    handNodes.forEach((node, seg) => {
      if (!keepHand.has(seg)) { node.remove(); handNodes.delete(seg); }
    });
    keepHand.forEach(seg => {
      if (handNodes.has(seg)) return;
      const el = document.createElement("span");
      el.className = "plabel phand";
      el.textContent = `${seg.short}${seg.index}`;
      el.title = `${seg.name}第${seg.index}节` + (seg.index === 3 ? "（远节）" : seg.index === 2 ? "（中节）" : "（近节）");
      labelsEl.appendChild(el);
      handNodes.set(seg, el);
    });
  }

  function updateLabels() {
    if (!labelNodes.size && !handNodes.size) return;
    const w = window.innerWidth, h = window.innerHeight;
    const items = [];
    labelNodes.forEach((el, rec) => {
      const labelPos = handFocus && rec.handOverlayPos ? rec.handOverlayPos : rec.pos;
      projected.copy(labelPos).project(camera);
      if (projected.z > 1 || projected.z < -1 || Math.abs(projected.x) > 1.3 || Math.abs(projected.y) > 1.3) {
        el.style.opacity = 0;
        return;
      }
      items.push({
        el, rec, pri: rec === state.selected ? 2 : 1,
        x: (projected.x * .5 + .5) * w,
        y: (-projected.y * .5 + .5) * h
      });
    });
    handNodes.forEach((el, seg) => {
      projected.copy(seg.mid).project(camera);
      if (projected.z > 1 || projected.z < -1 || Math.abs(projected.x) > 1.3 || Math.abs(projected.y) > 1.3) {
        el.style.opacity = 0;
        return;
      }
      const hot = state.selected && state.selected.p.ana && state.selected.pos.distanceTo(seg.mid) < .034;
      el.classList.toggle("hot", !!hot);
      el.style.opacity = hot ? 1 : .82;
      items.push({
        el, rec: null, pri: hot ? 3 : 1.3,
        x: (projected.x * .5 + .5) * w - handSide * (MOBILE_UI ? 20 : 26),
        y: (-projected.y * .5 + .5) * h
      });
    });
    items.sort((a, b) => b.pri - a.pri || a.y - b.y);
    const placed = [];
    items.forEach(it => {
      let guard = 0;
      while (guard++ < 4 && placed.some(p => Math.abs(p.x - it.x) < 18 && Math.abs(p.y - it.y) < 14)) it.y -= 15;
      placed.push(it);
      it.el.style.opacity = it.pri >= 3 ? 1 : it.el.style.opacity;
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
