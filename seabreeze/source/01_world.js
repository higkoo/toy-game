/* ============================================================================
 *  海风竞速 · Sea Breeze GP
 *  —— 程序化低多边形海滨竞速
 *
 *  段落：
 *    00 util      工具函数与数学
 *    01 track     赛道曲线与路面网格
 *    02 world     海面、天空、落日、防风林、灯塔
 *    03 car       程序化赛车建模
 *    04 ai        对手车
 *    05 input     键鼠与触屏
 *    06 hud       HUD 与页面
 *    07 game      主循环与游戏状态
 * ==========================================================================*/

// ---- 00 util.js ----
// ============================================================================
'use strict';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
// 帧率无关的指数逼近：rate 越大越快追上
const approach = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));
const damp = (cur, target, rate, dt) => approach(cur, target, rate, dt);

// 确定性伪随机：同一个 seed 永远得到同一串数
function mulberry(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 一维平滑噪声（值噪声 + 三次插值）
function makeNoise1(seed) {
  const rnd = mulberry(seed);
  const N = 512;
  const tbl = new Float32Array(N);
  for (let i = 0; i < N; i++) tbl[i] = rnd() * 2 - 1;
  return function (x) {
    const xi = Math.floor(x);
    const t = x - xi;
    const a = tbl[((xi % N) + N) % N];
    const b = tbl[(((xi + 1) % N) + N) % N];
    const s = t * t * (3 - 2 * t);
    return a + (b - a) * s;
  };
}

function fmtTime(ms) {
  if (!isFinite(ms) || ms < 0) ms = 0;
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const c = Math.floor((ms % 1000) / 10);
  return m > 0
    ? m + ':' + String(s).padStart(2, '0') + '.' + String(c).padStart(2, '0')
    : s + '.' + String(c).padStart(2, '0');
}
const fmtLap = (ms) => fmtTime(ms);
const fmtNum = (n) => Math.round(n).toLocaleString('en-US');

// 颜色：接受 0xRRGGBB
const col = (hex) => new THREE.Color(hex);

// 创建一个带描边的圆角矩形贴图（给路面标线、号码牌用）
function makeStripeTexture(w, h, bg, fg, vertical) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.fillStyle = fg;
  if (vertical) g.fillRect(0, 0, w, h * 0.5); else g.fillRect(0, 0, w * 0.5, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// ---- 01 track.js ----
// ============================================================================
//  闭合赛道：12 个控制点的 Catmull-Rom 曲线，采样成弧长均匀的点列。
//  每个采样点记录：位置、切线、法线（左）、宽度、曲率、累计高度。
// ============================================================================

const TRACK_SEG = 360;          // 采样点数
const TRACK_W = 10.6;            // 路面宽度（米）
const TRACK_HALF = TRACK_W / 2;

// 12 个控制点，围出一张不规则的海岸公路闭环
const CTRL = [
  [0, 0], [118, 26], [176, 104], [150, 186], [56, 208],
  [-52, 178], [-104, 210], [-176, 168], [-190, 74], [-140, -4],
  [-172, -88], [-88, -132],
];

class Track {
  constructor() {
    this.curve = new THREE.CatmullRomCurve3(
      CTRL.map((p) => new THREE.Vector3(p[0], 0, p[1])), true, 'catmullrom', 0.5);
    this.pts = [];       // 采样点
    this.cum = [];       // 累计弧长
    this.length = 0;
    this._sample();
    this._computeFrames();
    this._computeCurvature();
  }

  _sample() {
    const raw = this.curve.getSpacedPoints(TRACK_SEG);
    // getSpacedPoints 已按弧长均匀；补上切线与曲率
    for (let i = 0; i < TRACK_SEG; i++) {
      const p = raw[i];
      const prev = raw[(i - 1 + TRACK_SEG) % TRACK_SEG];
      const next = raw[(i + 1) % TRACK_SEG];
      const tan = new THREE.Vector3().subVectors(next, prev).normalize();
      this.pts.push({ p, tan, left: new THREE.Vector3(), y: 0 });
    }
    // 累计弧长
    let acc = 0;
    for (let i = 0; i < TRACK_SEG; i++) {
      const a = this.pts[i].p, b = this.pts[(i + 1) % TRACK_SEG].p;
      acc += a.distanceTo(b);
      this.cum.push(acc);
    }
    this.length = acc;
  }

  // 建立 Frenet 标架（left = 水平法线），并把路面做出起伏
  _computeFrames() {
    for (let i = 0; i < TRACK_SEG; i++) {
      const q = this.pts[i];
      const left = new THREE.Vector3(-q.tan.z, 0, q.tan.x); // 左手法线（XZ 平面内）
      q.left = left;
      // 路面起伏：低频噪声，海岸公路的缓坡
      const t = i / TRACK_SEG;
      const n = makeNoise1(9271);
      const h = n(t * 6.0) * 1.7 + n(t * 13.0 + 40) * 0.55;
      q.y = h;
      q.p.y = h;
    }
  }

  // 曲率：转向角 / 弧长，用于 AI 判断弯道难度
  _computeCurvature() {
    for (let i = 0; i < TRACK_SEG; i++) {
      const a = this.pts[i].tan, b = this.pts[(i + 1) % TRACK_SEG].tan;
      const dot = clamp(a.dot(b), -1, 1);
      const ang = Math.acos(dot);
      const segLen = Math.max(0.001, this.pts[i].p.distanceTo(this.pts[(i + 1) % TRACK_SEG].p));
      this.pts[i].curv = ang / segLen;
    }
    // 平滑一下，避免相邻点跳变
    const sm = this.pts.map((q) => q.curv);
    for (let i = 0; i < TRACK_SEG; i++) {
      this.pts[i].curv = (sm[(i - 1 + TRACK_SEG) % TRACK_SEG] + sm[i] * 2 + sm[(i + 1) % TRACK_SEG]) / 4;
    }
  }

  // 进度 0..1 -> 采样索引（浮点）
  idxAt(u) { return ((u % 1) + 1) % 1 * TRACK_SEG; }
  ptAt(u) { return this.pts[Math.floor(this.idxAt(u)) % TRACK_SEG]; }
  // 弧长 -> 归一化进度
  uAtDist(d) { return ((d % this.length) + this.length) % this.length / this.length; }
  distAtU(u) { return (((u % 1) + 1) % 1) * this.length; }

  // 在进度 u 处、横向偏移 lat（米，正为左）取世界坐标
  posAt(u, lat, out) {
    const q = this.ptAt(u);
    out = out || new THREE.Vector3();
    out.copy(q.p).addScaledVector(q.left, lat);
    return out;
  }

  // 生成路面网格（横向 10 段 × 纵向 TRACK_SEG 段）
  buildRoadMesh(halfWidth) {
    const LAT = 10;
    const geo = new THREE.BufferGeometry();
    const vCount = (LAT + 1) * (TRACK_SEG + 1);
    const pos = new Float32Array(vCount * 3);
    const uv = new Float32Array(vCount * 2);
    const nrm = new Float32Array(vCount * 3);
    const idx = [];
    let v = 0;
    for (let i = 0; i <= TRACK_SEG; i++) {
      const q = this.pts[i % TRACK_SEG];
      for (let j = 0; j <= LAT; j++) {
        const t = j / LAT;
        const lat = (t * 2 - 1) * halfWidth;
        const x = q.p.x + q.left.x * lat;
        const z = q.p.z + q.left.z * lat;
        // 路拱：中间略高
        const camber = Math.cos((t - 0.5) * Math.PI) * 0.12;
        pos[v * 3] = x; pos[v * 3 + 1] = q.y + camber; pos[v * 3 + 2] = z;
        nrm[v * 3] = 0; nrm[v * 3 + 1] = 1; nrm[v * 3 + 2] = 0;
        uv[v * 2] = t; uv[v * 2 + 1] = i / TRACK_SEG * this.length / 8;
        v++;
      }
    }
    for (let i = 0; i < TRACK_SEG; i++) {
      for (let j = 0; j < LAT; j++) {
        const a = i * (LAT + 1) + j;
        const b = a + 1;
        const c = a + (LAT + 1);
        const d = c + 1;
        // 绕序需保证法线朝上（+Y），否则背面剔除会把整条路丢掉
        idx.push(a, b, c, b, d, c);
      }
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
  }

  // 路面宽度方向的条纹（起跑线 / 检查点），贴在路面上
  buildStripe(yOffset) {
    const geo = new THREE.PlaneGeometry(TRACK_W, 2.2);
    geo.rotateX(-Math.PI / 2);
    const m = new THREE.MeshBasicMaterial({
      map: makeStripeTexture(64, 16, '#f4f6fb', '#16233d', true),
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.copy(this.pts[0].p);
    mesh.position.y += 0.06 + yOffset;
    mesh.rotation.y = Math.atan2(this.pts[0].tan.x, this.pts[0].tan.z);
    return mesh;
  }
}

// ---- 02 world.js ----
// ============================================================================
//  海面、天空、落日、防风林、灯塔、路侧栏杆
// ============================================================================

function buildSky(scene) {
  // 天穹：一个反面渲染的大球，垂直渐变
  const geo = new THREE.SphereGeometry(1400, 32, 20);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      cTop: { value: col(0x16233d) },
      cMid: { value: col(0x6b5a8a) },
      cHor: { value: col(0xffb547) },
      cSunDir: { value: new THREE.Vector3(0.62, 0.12, -0.78).normalize() },
    },
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 cTop, cMid, cHor, cSunDir;
      varying vec3 vDir;
      void main() {
        float h = clamp(vDir.y * 0.5 + 0.5, 0.0, 1.0);
        vec3 c = mix(cHor, cMid, smoothstep(0.50, 0.68, h));
        c = mix(c, cTop, smoothstep(0.66, 0.95, h));
        // 地平线以下压暗（海面方向）
        c = mix(c * 0.30, c, smoothstep(0.42, 0.52, h));
        // 太阳周围的辉光
        float d = max(0.0, dot(normalize(vDir), normalize(cSunDir)));
        c += vec3(1.0, 0.72, 0.34) * pow(d, 90.0) * 1.4;
        c += vec3(1.0, 0.60, 0.26) * pow(d, 8.0) * 0.30;
        // 细微噪点，避免大面积色带
        float n = fract(sin(dot(vDir.xy, vec2(12.9898, 78.233))) * 43758.5453);
        c += (n - 0.5) * 0.012;
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const sky = new THREE.Mesh(geo, mat);
  sky.frustumCulled = false;
  scene.add(sky);

  // 太阳圆盘
  const sunGeo = new THREE.CircleGeometry(46, 48);
  const sunMat = new THREE.MeshBasicMaterial({ color: 0xfff0c4, fog: false, toneMapped: false });
  const sun = new THREE.Mesh(sunGeo, sunMat);
  const sd = new THREE.Vector3(0.62, 0.12, -0.78).normalize().multiplyScalar(1150);
  sun.position.copy(sd);
  sun.lookAt(0, 0, 0);
  scene.add(sun);
  return { sky, sun, sunDir: sd.clone().normalize() };
}

function buildSea(scene, sunDir) {
  const geo = new THREE.PlaneGeometry(2600, 2600, 120, 120);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
      uTime: { value: 0 },
      cDeep: { value: col(0x0e1c33) },
      cShallow: { value: col(0x2a5f6e) },
      cSun: { value: col(0xffb547) },
      uSunDir: { value: sunDir.clone() },
      fogColor: { value: col(0xffb547) },
      fogNear: { value: 300 },
      fogFar: { value: 1500 },
    },
    vertexShader: `
      uniform float uTime;
      varying vec3 vWorld;
      varying float vWave;
      void main() {
        vec3 p = position;
        float w = sin(p.x * 0.045 + uTime * 0.9) * 0.42
                + sin(p.z * 0.062 - uTime * 0.72) * 0.34
                + sin((p.x + p.z) * 0.021 + uTime * 0.45) * 0.55;
        p.y += w;
        vWave = w;
        vec4 wp = modelMatrix * vec4(p, 1.0);
        vWorld = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: `
      uniform vec3 cDeep, cShallow, cSun, uSunDir;
      uniform float uTime, fogNear, fogFar;
      uniform vec3 fogColor;
      varying vec3 vWorld;
      varying float vWave;
      void main() {
        vec3 v = normalize(cameraPosition - vWorld);
        vec3 n = normalize(vec3(
          cos(vWorld.x * 0.045 + uTime * 0.9) * 0.019 + cos((vWorld.x+vWorld.z)*0.021 + uTime*0.45)*0.011,
          1.0,
          cos(vWorld.z * 0.062 - uTime * 0.72) * 0.021 + cos((vWorld.x+vWorld.z)*0.021 + uTime*0.45)*0.011
        ));
        float fres = pow(1.0 - max(0.0, dot(n, v)), 3.0);
        vec3 c = mix(cDeep, cShallow, clamp(fres * 1.5, 0.0, 1.0));
        // 太阳镜面反射：一条通向落日的粼光带
        vec3 h = normalize(uSunDir + v);
        float spec = pow(max(0.0, dot(n, h)), 90.0);
        float band = pow(max(0.0, dot(normalize(vec3(vWorld.x, 0.0, vWorld.z)), -normalize(vec3(uSunDir.x, 0.0, uSunDir.z)))), 3.0);
        c += cSun * spec * 2.2;
        c += cSun * band * 0.16 * smoothstep(-0.2, 0.5, vWave);
        float d = length(cameraPosition - vWorld);
        float f = smoothstep(fogNear, fogFar, d);
        c = mix(c, fogColor * 0.55, f * 0.85);
        gl_FragColor = vec4(c, 0.94);
      }`,
  });
  const sea = new THREE.Mesh(geo, mat);
  sea.position.y = -1.6;
  sea.renderOrder = -1;
  scene.add(sea);
  return { sea, mat };
}

// 低多边形松树：一段圆柱 + 三层锥体
function makeTreeGeo() {
  const trunk = new THREE.CylinderGeometry(0.16, 0.24, 1.1, 5);
  trunk.translate(0, 0.55, 0);
  const layers = [];
  for (let i = 0; i < 3; i++) {
    const r = 1.05 - i * 0.26;
    const h = 1.5 - i * 0.24;
    const c = new THREE.ConeGeometry(r, h, 6);
    c.translate(0, 1.35 + i * 0.78, 0);
    layers.push(c);
  }
  return mergeGeos([trunk].concat(layers));
}

// 合并多个 BufferGeometry（只有 position/normal/uv 时足够）
function mergeGeos(list) {
  let vc = 0, ic = 0;
  for (const g of list) {
    vc += g.attributes.position.count;
    ic += g.index ? g.index.count : g.attributes.position.count;
  }
  const pos = new Float32Array(vc * 3);
  const nrm = new Float32Array(vc * 3);
  const uv = new Float32Array(vc * 2);
  const idx = new Uint32Array(ic);
  let vo = 0, io = 0;
  for (const g of list) {
    const p = g.attributes.position.array;
    const n = g.attributes.normal ? g.attributes.normal.array : null;
    const u = g.attributes.uv ? g.attributes.uv.array : null;
    pos.set(p, vo * 3);
    if (n) nrm.set(n, vo * 3);
    if (u) uv.set(u, vo * 2);
    const c = g.attributes.position.count;
    if (g.index) {
      const gi = g.index.array;
      for (let i = 0; i < gi.length; i++) idx[io++] = gi[i] + vo;
    } else {
      for (let i = 0; i < c; i++) idx[io++] = i + vo;
    }
    vo += c;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  out.computeVertexNormals();
  return out;
}

function buildForest(scene, track) {
  const geo = makeTreeGeo();
  const mat = new THREE.MeshLambertMaterial({ color: 0x1f4d3f, flatShading: true });
  const rnd = mulberry(4477);
  const noise = makeNoise1(1201);
  const placements = [];
  for (let i = 0; i < track.length; i += 3.4) {
    const u = track.uAtDist(i);
    const q = track.ptAt(u);
    for (const side of [-1, 1]) {
      // 一排松树，密度随噪声起伏
      const dens = 0.55 + 0.45 * Math.sin(u * TAU * 7 + side * 2.1);
      if (rnd() > dens * 0.9) continue;
      const off = TRACK_HALF + 9 + rnd() * 26 + Math.abs(noise(u * 90 + side * 20)) * 14;
      const x = q.p.x + q.left.x * side * off;
      const z = q.p.z + q.left.z * side * off;
      const y = q.y - 0.6;
      placements.push({ x, y, z, s: 0.8 + rnd() * 1.5, r: rnd() * TAU });
    }
  }
  const inst = new THREE.InstancedMesh(geo, mat, placements.length);
  inst.castShadow = true;
  const m = new THREE.Matrix4();
  const q4 = new THREE.Quaternion();
  const sc = new THREE.Vector3();
  const pv = new THREE.Vector3();
  placements.forEach((p, i) => {
    q4.setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.r);
    sc.set(p.s, p.s * (0.85 + (i % 5) * 0.06), p.s);
    pv.set(p.x, p.y, p.z);
    m.compose(pv, q4, sc);
    inst.setMatrixAt(i, m);
  });
  inst.instanceMatrix.needsUpdate = true;
  scene.add(inst);
  return { inst, placements };
}

// 路侧栏杆：白色立柱 + 顶部横条
function buildRail(track, side, offset, height, color) {
  const grp = new THREE.Group();
  const postGeo = new THREE.BoxGeometry(0.18, height, 0.18);
  const postMat = new THREE.MeshLambertMaterial({ color, flatShading: true });
  const step = 3.0;
  const n = Math.floor(track.length / step);
  const posts = new THREE.InstancedMesh(postGeo, postMat, n);
  posts.castShadow = false;
  const m = new THREE.Matrix4();
  const pv = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const sc = new THREE.Vector3(1, 1, 1);
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < n; i++) {
    const u = track.uAtDist(i * step);
    const pt = track.ptAt(u);
    pv.copy(pt.p).addScaledVector(pt.left, side * offset);
    pv.y += height / 2;
    q.setFromAxisAngle(up, Math.atan2(pt.tan.x, pt.tan.z));
    m.compose(pv, q, sc);
    posts.setMatrixAt(i, m);
  }
  posts.instanceMatrix.needsUpdate = true;
  grp.add(posts);

  // 顶部横条：沿曲线的一串短盒
  const barGeo = new THREE.BoxGeometry(0.12, 0.12, step * 1.02);
  const bars = new THREE.InstancedMesh(barGeo, postMat, n);
  for (let i = 0; i < n; i++) {
    const u = track.uAtDist(i * step);
    const pt = track.ptAt(u);
    pv.copy(pt.p).addScaledVector(pt.left, side * offset);
    pv.y += height;
    q.setFromAxisAngle(up, Math.atan2(pt.tan.x, pt.tan.z));
    m.compose(pv, q, sc);
    bars.setMatrixAt(i, m);
  }
  bars.instanceMatrix.needsUpdate = true;
  grp.add(bars);
  return grp;
}

// 灯塔：塔身 + 灯室 + 光锥
function buildLighthouse(scene, x, z) {
  const grp = new THREE.Group();
  const tower = new THREE.Mesh(
    new THREE.CylinderGeometry(1.5, 2.4, 22, 10),
    new THREE.MeshLambertMaterial({ color: 0xf4f1e8, flatShading: true }));
  tower.position.y = 11; tower.castShadow = true;
  grp.add(tower);
  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(1.72, 1.86, 3.2, 10),
    new THREE.MeshLambertMaterial({ color: 0xff5a6e, flatShading: true }));
  band.position.y = 17; grp.add(band);
  const lamp = new THREE.Mesh(
    new THREE.CylinderGeometry(1.9, 1.9, 3, 10),
    new THREE.MeshBasicMaterial({ color: 0xfff0c4, toneMapped: false }));
  lamp.position.y = 23.2; grp.add(lamp);
  const cap = new THREE.Mesh(
    new THREE.ConeGeometry(2.4, 2.6, 10),
    new THREE.MeshLambertMaterial({ color: 0x2a3550, flatShading: true }));
  cap.position.y = 26; grp.add(cap);
  grp.position.set(x, 0, z);
  scene.add(grp);
  return grp;
}


// 路肩条纹带：沿赛道两侧各一条，UV 沿弧长重复红白格
function buildKerbStrip(track, side, offset, width) {
  const LAT = 2;
  const geo = new THREE.BufferGeometry();
  const vCount = (LAT + 1) * (TRACK_SEG + 1);
  const pos = new Float32Array(vCount * 3);
  const uv = new Float32Array(vCount * 2);
  const idx = [];
  let v = 0;
  for (let i = 0; i <= TRACK_SEG; i++) {
    const q = track.pts[i % TRACK_SEG];
    for (let j = 0; j <= LAT; j++) {
      const t = j / LAT;
      const lat = side * (offset + t * width);
      pos[v * 3] = q.p.x + q.left.x * lat;
      pos[v * 3 + 1] = q.y + 0.05;
      pos[v * 3 + 2] = q.p.z + q.left.z * lat;
      uv[v * 2] = t;
      uv[v * 2 + 1] = i / TRACK_SEG * track.length / 1.5;
      v++;
    }
  }
  for (let i = 0; i < TRACK_SEG; i++) {
    for (let j = 0; j < LAT; j++) {
      const a = i * (LAT + 1) + j, b = a + 1, c = a + (LAT + 1), d = c + 1;
      if (side > 0) idx.push(a, b, c, b, d, c);
      else idx.push(a, c, b, b, c, d);
    }
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();

  // 红白格贴图
  const c = document.createElement('canvas');
  c.width = 8; c.height = 8;
  const g2 = c.getContext('2d');
  g2.fillStyle = '#f4f6fb'; g2.fillRect(0, 0, 8, 8);
  g2.fillStyle = '#ff5a6e'; g2.fillRect(0, 0, 8, 4);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;

  const mat = new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  return mesh;
}
