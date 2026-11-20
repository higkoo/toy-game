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


// ---- 03 car.js ----
// ============================================================================
//  程序化低多边形赛车：楔形车身、四轮、尾翼、座舱罩
// ============================================================================

const CAR_COLORS = [
  0xffb547,  // 玩家：落日暖金
  0x3fd0c9, 0xff5a6e, 0xf0d9b5, 0x8fa8c8, 0x9be07a, 0xe87fb0, 0xff9d5c,
];

function buildCarBody() {
  const grp = new THREE.Group();

  // 主车身：一个拉长的、上下不对称的箱体（低多边形楔形）
  const bodyGeo = new THREE.BoxGeometry(1.86, 0.52, 4.35);
  const pos = bodyGeo.attributes.position;
  // 收窄车头、压低车尾、削斜前脸
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const t = (z + 2.175) / 4.35;             // 0=车尾 1=车头
    const narrow = lerp(1.0, 0.80, smoothstep(0.55, 1.0, t));
    pos.setX(i, x * narrow);
    if (y > 0) pos.setY(i, y * lerp(1.0, 0.42, smoothstep(0.62, 1.0, t)));   // 车头压扁
    else pos.setY(i, y * lerp(1.0, 0.78, smoothstep(0.0, 0.45, t)));        // 车尾略收
    if (z > 1.3) pos.setZ(i, z * 0.99);
  }
  bodyGeo.computeVertexNormals();
  const body = new THREE.Mesh(bodyGeo, new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }));
  body.castShadow = true;
  grp.add(body);

  // 前鼻锥
  const nose = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.30, 1.5), new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }));
  nose.position.set(0, -0.06, 2.28);
  nose.castShadow = true;
  grp.add(nose);

  // 座舱罩
  const cabGeo = new THREE.BoxGeometry(1.30, 0.46, 1.55);
  const cp = cabGeo.attributes.position;
  for (let i = 0; i < cp.count; i++) {
    const y = cp.getY(i), z = cp.getZ(i);
    if (y > 0) { cp.setX(i, cp.getX(i) * 0.80); cp.setZ(i, z * 0.72); }
  }
  cabGeo.computeVertexNormals();
  const cab = new THREE.Mesh(cabGeo, new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }));
  cab.position.set(0, 0.40, -0.28);
  cab.castShadow = true;
  grp.add(cab);

  // 尾翼
  const wing = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.10, 0.52), new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }));
  wing.position.set(0, 0.62, -2.05);
  wing.castShadow = true;
  grp.add(wing);
  const postMat = new THREE.MeshLambertMaterial({ color: 0x2b3040, flatShading: true });
  for (const s of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.36, 0.14), postMat);
    post.position.set(s * 0.70, 0.40, -2.02);
    grp.add(post);
  }

  // 前分流器
  const splitter = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.08, 0.42), new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }));
  splitter.position.set(0, -0.30, 2.32);
  grp.add(splitter);

  // 尾灯（发光平面）
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff3b3f, toneMapped: false });
  const tail = new THREE.Mesh(new THREE.PlaneGeometry(1.44, 0.20), tailMat);
  tail.position.set(0, 0.10, -2.20);
  tail.rotation.y = Math.PI;
  grp.add(tail);

  // 车顶号码牌
  const numCanvas = document.createElement('canvas');
  numCanvas.width = 128; numCanvas.height = 128;
  const ng = numCanvas.getContext('2d');
  ng.fillStyle = '#16233d'; ng.fillRect(0, 0, 128, 128);
  ng.fillStyle = '#ffb547';
  ng.font = 'bold 78px ui-monospace, monospace';
  ng.textAlign = 'center'; ng.textBaseline = 'middle';
  ng.fillText('07', 64, 68);
  const numTex = new THREE.CanvasTexture(numCanvas);
  numTex.colorSpace = THREE.SRGBColorSpace;
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(0.72, 0.72),
    new THREE.MeshBasicMaterial({ map: numTex, transparent: true }));
  plate.position.set(0, 0.64, -0.28);
  plate.rotation.x = -Math.PI / 2;
  grp.add(plate);

  return { grp, body, nose, cab, wing, splitter, tail, tailMat, plate, numCanvas, numTex };
}

function buildWheel() {
  const geo = new THREE.CylinderGeometry(0.46, 0.46, 0.36, 12);
  geo.rotateZ(Math.PI / 2);
  const mat = new THREE.MeshLambertMaterial({ color: 0x1a1d24, flatShading: true });
  const wheel = new THREE.Mesh(geo, mat);
  wheel.castShadow = true;
  // 轮毂
  const hubGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.38, 8);
  hubGeo.rotateZ(Math.PI / 2);
  const hub = new THREE.Mesh(hubGeo, new THREE.MeshLambertMaterial({ color: 0xc9cfd8, flatShading: true }));
  wheel.add(hub);
  return wheel;
}

// 一台完整的参赛车
function makeCar(bodyColor, num) {
  const root = new THREE.Group();
  const parts = buildCarBody();
  const paint = new THREE.MeshLambertMaterial({ color: bodyColor, flatShading: true });
  parts.body.material = paint;
  parts.nose.material = paint;
  parts.cab.material = paint;
  parts.wing.material = paint;
  parts.splitter.material = paint;

  if (num != null) {
    const g = parts.numCanvas.getContext('2d');
    g.fillStyle = '#16233d'; g.fillRect(0, 0, 128, 128);
    g.fillStyle = '#ffb547';
    g.font = 'bold 78px ui-monospace, monospace';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(String(num).padStart(2, '0'), 64, 68);
    parts.numTex.needsUpdate = true;
  }

  // 车轮：前两后两
  const wheels = [];
  const wp = [[-0.96, 1.44], [0.96, 1.44], [-1.00, -1.46], [1.00, -1.46]];
  wp.forEach((p, i) => {
    const w = buildWheel();
    w.position.set(p[0], -0.02, p[1]);
    root.add(w);
    wheels.push({ mesh: w, front: i < 2, side: Math.sign(p[0]) });
  });

  root.add(parts.grp);
  return { root, parts, wheels, paint, baseColor: bodyColor };
}

// ---- 04 ai.js ----
// ============================================================================
//  对手车：沿赛道跑，有基础速度、弯道保守度、内外线偏好，会互相超车
// ============================================================================

class Racer {
  constructor(track, opts) {
    this.track = track;
    this.isPlayer = !!opts.isPlayer;
    this.color = opts.color;
    this.num = opts.num;
    this.name = opts.name;

    this.dist = opts.dist || 0;         // 已跑弧长
    this.lap = 0;
    this.speed = 0;
    this.lat = opts.lat0 || 0;           // 横向偏移
    this.latTarget = this.lat;
    this.baseSpeed = opts.baseSpeed || 42;
    this.cornerSkill = opts.cornerSkill != null ? opts.cornerSkill : 0.5;
    this.lineBias = opts.lineBias != null ? opts.lineBias : 0;   // 正=偏内线
    this.rubberBand = opts.rubberBand || 0;
    this.finished = false;
    this.finishTime = 0;
    this.lapTimes = [];
    this.lapStart = 0;
    this.bestLap = Infinity;
    this.pos = new THREE.Vector3();
    this.heading = 0;
    this.car = null;
    this.wheelSpin = 0;
    this.steerVis = 0;
    this.offTrack = 0;
  }

  // 当前所在采样点
  sample() { return this.track.ptAt(this.track.uAtDist(this.dist)); }

  // 目标速度：弯道越急越慢，AI 越熟练越敢开
  targetSpeed() {
    const q = this.sample();
    const k = Math.abs(q.curv);
    // curv 越大弯越急。弯道限速 = base / (1 + k * 系数)
    const cornerLimit = this.baseSpeed / (1 + k * (26 - this.cornerSkill * 13));
    let v = Math.min(this.baseSpeed, cornerLimit);
    if (this.rubberBand) {
      // 橡皮筋：与玩家的距离越远越快
      v *= 1 + this.rubberBand;
    }
    return Math.max(9, v);
  }

  update(dt, playerDist) {
    if (this.finished) return;
    const q = this.sample();

    // 目标横向位置：内线偏好 + 一点随弯道摆动
    const curveBias = q.curv * 260;
    this.latTarget = clamp(-this.lineBias * 4 + curveBias * this.lineBias * 0.6, -TRACK_HALF + 1.6, TRACK_HALF - 1.6);
    this.lat = damp(this.lat, this.latTarget, 1.4, dt);

    // 速度
    const tv = this.targetSpeed();
    this.speed = approach(this.speed, tv, 1.1, dt);
    this.dist += this.speed * dt;

    // 圈数
    const L = this.track.length;
    while (this.dist >= L) {
      this.dist -= L;
      this.lap++;
      const now = this.trackTime ? this.trackTime() : 0;
      if (this.lapTimes.length) {
        const lt = now - this.lapStart;
        this.lapTimes.push(lt);
        if (lt < this.bestLap) this.bestLap = lt;
      }
      this.lapStart = now;
      if (this.lap >= this.track.laps) {
        this.finished = true;
        this.finishTime = now;
      }
    }

    // 位置与朝向
    const u = this.track.uAtDist(this.dist);
    this.pos.copy(this.track.posAt(u, this.lat));
    this.heading = Math.atan2(q.tan.x, q.tan.z);
    this.wheelSpin += this.speed * dt * 1.9;
    // 视觉转向角
    const steerWant = clamp(-q.curv * 240 - (this.latTarget - this.lat) * 0.09, -0.42, 0.42);
    this.steerVis = damp(this.steerVis, steerWant, 6, dt);
  }
}


// ---- 05 input.js ----
// ============================================================================
//  键鼠与触屏
// ============================================================================

// 触屏判定：任一触摸能力命中即显示触屏控件。
// 真机事故：检测逻辑一度缺失，body.touch 类永不生效，手机上按钮全部消失。
// 兜底：判定失败但收到 touchstart 时强制开启（WebView 媒体查询误报的自愈）。
const IS_TOUCH = (window.matchMedia && matchMedia('(pointer: coarse)').matches)
  || 'ontouchstart' in window
  || (navigator.maxTouchPoints || 0) > 0;
document.body.classList.toggle('touch', IS_TOUCH);
addEventListener('touchstart', () => document.body.classList.add('touch'),
  { once: true, passive: true });

const Keys = { up: false, down: false, left: false, right: false, drift: false, boost: false };
const Touch = { up: false, down: false, left: false, right: false, drift: false, boost: false, active: false };

const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  Space: 'drift',
  ShiftLeft: 'boost', ShiftRight: 'boost',
};

function bindInput(onReset, onPause, onCam) {
  addEventListener('keydown', (e) => {
    if (e.repeat) return;
    const k = KEYMAP[e.code];
    if (k) { Keys[k] = true; e.preventDefault(); }
    if (e.code === 'KeyR') onReset();
    if (e.code === 'Escape') onPause();
    if (e.code === 'KeyC') onCam();
  });
  addEventListener('keyup', (e) => {
    const k = KEYMAP[e.code];
    if (k) { Keys[k] = false; e.preventDefault(); }
  });
  addEventListener('blur', () => { for (const k in Keys) Keys[k] = false; });
}

// 触屏按钮：data-k="up|down|left|right|drift|boost"
function bindTouchUI(root) {
  const btns = root.querySelectorAll('[data-k]');
  const set = (k, v) => {
    Touch[k] = v;
    Touch.active = true;
    const el = root.querySelector(`[data-k="${k}"]`);
    if (el) el.classList.toggle('on', v);
  };
  btns.forEach((el) => {
    const k = el.dataset.k;
    const down = (e) => { e.preventDefault(); set(k, true); };
    const up = (e) => { e.preventDefault(); set(k, false); };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('pointerleave', up);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  });
}

const inputState = () => ({
  up: Keys.up || Touch.up,
  down: Keys.down || Touch.down,
  left: Keys.left || Touch.left,
  right: Keys.right || Touch.right,
  drift: Keys.drift || Touch.drift,
  boost: Keys.boost || Touch.boost,
  any: Touch.active,
});

// ---- 06 hud.js ----
// ============================================================================
//  HUD 与页面
// ============================================================================

const HUD = {
  lap: null, pos: null, time: null, speed: null, boost: null, boostCells: [],
  lapBest: null, rank: null, toast: null, warn: null,
};

function $(id) { return document.getElementById(id); }

function initHUD() {
  HUD.lap = $('hudLap');
  HUD.pos = $('hudPos');
  HUD.time = $('hudTime');
  HUD.speed = $('hudSpeed');
  HUD.lapBest = $('hudBest');
  HUD.rank = $('hudRank');
  HUD.toast = $('toast');
  HUD.boostCells = Array.from(document.querySelectorAll('#boostCells .bc'));
}

const TOAST_T = 2.2;
let toastTimer = 0;
function toast(msg) {
  HUD.toast.textContent = msg;
  HUD.toast.classList.add('show');
  toastTimer = TOAST_T;
}

function updateHUD(dt, g) {
  // 顶栏
  HUD.lap.textContent = String(Math.min(g.player.lap + 1, g.track.laps)) + '/' + g.track.laps;
  HUD.time.textContent = fmtTime(g.raceTime);
  HUD.pos.textContent = String(g.playerPos);
  HUD.rank.textContent = ['冠军', '亚军', '季军', '第四', '第五', '第六', '第七', '第八'][g.playerPos - 1] || '—';
  HUD.lapBest.textContent = g.player.bestLap < Infinity ? fmtLap(g.player.bestLap) : '--:--';

  // 速度
  const kmh = Math.round(g.player.speed * 3.6);
  HUD.speed.textContent = String(kmh);
  document.getElementById('hudSpeedUnit').textContent = 'km/h';

  // 氮气：6 格
  const cells = 6;
  const filled = Math.round((g.player.nitro / g.player.nitroMax) * cells);
  for (let i = 0; i < cells; i++) {
    const on = i < filled;
    if (HUD.boostCells[i].classList.contains('on') !== on) HUD.boostCells[i].classList.toggle('on', on);
  }

  // toast
  if (toastTimer > 0) {
    toastTimer -= dt;
    if (toastTimer <= 0) HUD.toast.classList.remove('show');
  }
}

// ---- 07 game.js ----
// ============================================================================
//  主循环与游戏状态
// ============================================================================

const LAPS = 3;

class Game {
  constructor() {
    this.canvas = $('gl');
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0xffb547, 260, 1250);

    this.camera = new THREE.PerspectiveCamera(58, 1, 0.5, 3000);
    this.camMode = 0;    // 0 跟随 1 车内 2 环绕

    this.buildScene();
    this.buildRacers();
    this.bindUI();

    this.state = 'title';    // title | race | paused | finish
    this.raceTime = 0;
    this.last = performance.now();
    this.acc = 0;

    this.resetRace();
    addEventListener('resize', () => this.resize());
    this.resize();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  buildScene() {
    const S = this.scene;

    // 光照
    const hemi = new THREE.HemisphereLight(0xffd9a0, 0x1c2b40, 1.15);
    S.add(hemi);
    const sun = new THREE.DirectionalLight(0xffc27a, 2.15);
    sun.position.set(120, 62, -150);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 220;
    const d = 62;
    sun.shadow.camera.left = -d; sun.shadow.camera.right = d;
    sun.shadow.camera.top = d; sun.shadow.camera.bottom = -d;
    sun.shadow.bias = -0.0012;
    sun.shadow.normalBias = 0.035;
    S.add(sun);
    S.add(sun.target);
    this.sunLight = sun;

    // 天空与落日
    const sky = buildSky(S);
    this.sunDir = sky.sunDir;

    // 赛道
    this.track = new Track();
    this.track.laps = LAPS;

    const roadMat = new THREE.MeshLambertMaterial({ color: 0x3a4055, flatShading: false });
    this.road = new THREE.Mesh(this.track.buildRoadMesh(TRACK_HALF), roadMat);
    this.road.receiveShadow = true;
    S.add(this.road);

    // 路肩：贴路缘的红白条纹带
    S.add(buildKerbStrip(this.track, -1, TRACK_HALF, 0.9));
    S.add(buildKerbStrip(this.track, 1, TRACK_HALF, 0.9));

    // 栏杆
    S.add(buildRail(this.track, -1, TRACK_HALF + 2.6, 1.0, 0xf0d9b5));
    S.add(buildRail(this.track, 1, TRACK_HALF + 2.6, 1.0, 0xf0d9b5));

    // 海
    this.sea = buildSea(S, this.sunDir);

    // 森林
    this.forest = buildForest(S, this.track);

    // 灯塔
    buildLighthouse(S, -205, 145);

    // 起跑线
    S.add(this.track.buildStripe(0));

    // 沙地：赛道两侧的一条宽带（在路肩之外），不能盖住路面
    const sandShape = new THREE.Shape();
    const OUT = 26;
    for (let i = 0; i <= TRACK_SEG; i++) {
      const q = this.track.pts[i % TRACK_SEG];
      const x = q.p.x + q.left.x * OUT, z = q.p.z + q.left.z * OUT;
      if (i === 0) sandShape.moveTo(x, z); else sandShape.lineTo(x, z);
    }
    for (let i = TRACK_SEG; i >= 0; i--) {
      const q = this.track.pts[i % TRACK_SEG];
      const x = q.p.x - q.left.x * OUT, z = q.p.z - q.left.z * OUT;
      sandShape.lineTo(x, z);
    }
    const sandGeo = new THREE.ShapeGeometry(sandShape);
    sandGeo.rotateX(-Math.PI / 2);
    const sand = new THREE.Mesh(sandGeo, new THREE.MeshLambertMaterial({ color: 0x8a7550, flatShading: true }));
    sand.position.y = -0.55;
    sand.receiveShadow = true;
    S.add(sand);

    // 远处的陆地：把海岸线推到赛道之外
    const landGeo = new THREE.RingGeometry(205, 1500, 72, 1);
    landGeo.rotateX(-Math.PI / 2);
    const land = new THREE.Mesh(landGeo, new THREE.MeshLambertMaterial({ color: 0x5d5a44, flatShading: true }));
    land.position.y = -1.9;
    S.add(land);
  }

  buildRacers() {
    this.racers = [];
    const NAMES = ['海风', '麦浪', '落日', '盐雾', '灯塔', '潮汐', '晚照'];
    const specs = [
      { baseSpeed: 41.5, cornerSkill: 0.62, lineBias: 0.3 },
      { baseSpeed: 41.0, cornerSkill: 0.55, lineBias: -0.3 },
      { baseSpeed: 40.4, cornerSkill: 0.48, lineBias: 0.6 },
      { baseSpeed: 40.0, cornerSkill: 0.44, lineBias: -0.6 },
      { baseSpeed: 39.4, cornerSkill: 0.40, lineBias: 0.1 },
      { baseSpeed: 39.0, cornerSkill: 0.36, lineBias: 0.45 },
      { baseSpeed: 38.6, cornerSkill: 0.33, lineBias: -0.15 },
    ];
    // 玩家
    this.player = new Racer(this.track, {
      isPlayer: true, color: CAR_COLORS[0], num: 7, name: '你',
      dist: 0, baseSpeed: 44, cornerSkill: 0.70,
    });
    this.player.trackTime = () => this.raceTime;
    this.racers.push(this.player);
    // 对手
    specs.forEach((s, i) => {
      const r = new Racer(this.track, {
        color: CAR_COLORS[(i + 1) % CAR_COLORS.length], num: i + 2, name: NAMES[i],
        lat0: (i % 2 ? 1 : -1) * (1.6 + (i % 3) * 1.5),
        dist: -26 - i * 13,                     // 排在玩家身后
        baseSpeed: s.baseSpeed, cornerSkill: s.cornerSkill, lineBias: s.lineBias,
        rubberBand: 0,
      });
      r.trackTime = () => this.raceTime;
      this.racers.push(r);
    });

    // 建车
    for (const r of this.racers) {
      r.car = makeCar(r.color, r.num);
      r.car.root.position.copy(r.pos);
      this.scene.add(r.car.root);
    }
  }

  bindUI() {
    const $t = $('title');
    $('btnStart').addEventListener('click', () => this.startRace());
    $('btnMute').addEventListener('click', () => this.toggleMute());
    $('btnHelp').addEventListener('click', () => $('help').classList.add('show'));
    $('helpClose').addEventListener('click', () => $('help').classList.remove('show'));
    $('help').addEventListener('click', (e) => { if (e.target === $('help')) $('help').classList.remove('show'); });
    $('btnResume').addEventListener('click', () => this.setState('race'));
    $('btnRestart').addEventListener('click', () => { this.resetRace(); this.setState('race'); });
    $('btnQuit').addEventListener('click', () => this.setState('title'));
    $('btnAgain').addEventListener('click', () => { this.resetRace(); this.setState('race'); });
    $('btnHome').addEventListener('click', () => this.setState('title'));
    bindTouchUI(document.body);
  }

  toggleMute() {
    this.muted = !this.muted;
    $('btnMute').textContent = this.muted ? '声音 关' : '声音 开';
    if (this.audio) this.audio.muted = this.muted;
  }

  setState(s) {
    this.state = s;
    $('title').classList.toggle('show', s === 'title');
    $('hud').classList.toggle('show', s === 'race');
    $('pause').classList.toggle('show', s === 'paused');
    $('finish').classList.toggle('show', s === 'finish');
    document.body.classList.toggle('playing', s === 'race');
  }

  resetRace() {
    this.raceTime = 0;
    this.playerPos = 8;
    this.player.dist = 0;
    this.player.lap = 0;
    this.player.speed = 0;
    this.player.lat = 0;
    this.player.latTarget = 0;
    this.player.finished = false;
    this.player.bestLap = Infinity;
    this.player.lapTimes = [];
    this.player.lapStart = 0;
    this.player.nitro = 0;
    this.player.nitroMax = 100;
    this.player.steer = 0;
    this.player.slip = 0;
    this.player.boosting = false;
    this.player.driftAmt = 0;
    this.player.driftDist = 0;
    this.player.topSpeed = 0;
    this.racers.forEach((r, i) => {
      if (i === 0) return;
      r.dist = -26 - (i - 1) * 13;
      r.lap = 0; r.speed = 0; r.finished = false;
      r.bestLap = Infinity; r.lapTimes = [];
    });
    this.updateRanks();
  }

  startRace() {
    this.resetRace();
    this.setState('race');
    this.last = performance.now();
    toast('GO！');
  }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // 名次：按已跑距离（含圈数）排序
  updateRanks() {
    const sorted = this.racers.slice().sort((a, b) => {
      const da = a.lap * this.track.length + a.dist;
      const db = b.lap * this.track.length + b.dist;
      return db - da;
    });
    sorted.forEach((r, i) => { r.rank = i + 1; });
    this.playerPos = this.player.rank;
  }

  // ---------------- 玩家驾驶 ----------------
  updatePlayer(dt) {
    const P = this.player;
    const inp = inputState();
    const q = P.sample();

    // 转向输入 → 目标转向角
    const steerIn = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    // 漂移时转向更灵，代价是抓地力下降
    const driftHeld = inp.drift && P.speed > 12;

    // 油门 / 刹车 —— 休闲向：默认自动油门，按刹车才减速；按油门键全功率
    const maxSpeed = 62;                     // m/s ≈ 223 km/h
    const boostMul = P.boosting ? 1.42 : 1;
    let accel = 0;
    if (inp.up) accel = 26;
    else if (inp.down) accel = -34;
    else accel = 13;                        // 自动油门：巡航加速，急弯的弯道阻力仍会让车自然减速
    if (P.boosting) accel *= 1.8;

    // 曲率影响：弯道自然减速
    const k = Math.abs(q.curv);
    const cornerDrag = k * 210;

    P.speed += (accel - cornerDrag) * dt;
    P.speed = clamp(P.speed, 0, maxSpeed * boostMul);
    if (P.speed < 0) P.speed = 0;

    // 转向
    const steerRate = driftHeld ? 2.5 : 3.1;
    const maxSteer = driftHeld ? 0.62 : 0.40;
    P.steer = damp(P.steer, steerIn * maxSteer, steerRate, dt);
    // 无输入时回正
    if (!steerIn) P.steer = damp(P.steer, 0, 5.5, dt);

    // 漂移量：转向 + 高速时积累
    const driftTarget = driftHeld ? clamp(Math.abs(P.steer) * 1.7, 0, 1) * clamp(P.speed / 30, 0, 1) : 0;
    P.driftAmt = damp(P.driftAmt, driftTarget, 6, dt);
    P.driftDist += P.driftAmt * P.speed * dt;

    // 漂移时抓地力下降：实际前进方向 = 车头方向偏侧滑角
    const slip = P.driftAmt * 0.62 * Math.sign(P.steer || 1);
    P.slip = damp(P.slip || 0, slip, 8, dt);

    // 横向位置：漂移会把车推向弯外侧
    const lateralDrift = -P.slip * P.speed * dt * 0.16;
    P.lat = clamp(P.lat + lateralDrift, -TRACK_HALF + 0.8, TRACK_HALF - 0.8);

    // 出界：速度大幅损失并回推
    const off = Math.abs(P.lat) > TRACK_HALF - 0.8;
    P.offTrack = damp(P.offTrack, off ? 1 : 0, 8, dt);
    if (off) {
      P.speed = damp(P.speed, 6, 2.4, dt);
      P.lat = clamp(P.lat, -TRACK_HALF + 0.8, TRACK_HALF - 0.8);
    }

    // 氮气
    if (inp.boost && P.nitro > 1 && P.speed > 8) {
      P.boosting = true;
      P.nitro = Math.max(0, P.nitro - 34 * dt);
      P.speed = Math.min(maxSpeed * 1.42, P.speed + 30 * dt);
    } else {
      P.boosting = false;
    }
    // 漂移攒氮气
    if (P.driftAmt > 0.25) P.nitro = Math.min(P.nitroMax, P.nitro + 26 * P.driftAmt * dt);

    // 前进
    const heading = Math.atan2(q.tan.x, q.tan.z) + P.steer * 0.42 + P.slip * 0.5;
    P.dist += P.speed * dt;
    P.topSpeed = Math.max(P.topSpeed, P.speed);

    // 圈数
    const L = this.track.length;
    if (P.dist >= L) {
      P.dist -= L;
      P.lap++;
      const lt = this.raceTime - P.lapStart;
      P.lapStart = this.raceTime;
      if (P.lapTimes.length) {
        P.lapTimes.push(lt);
        if (lt < P.bestLap) P.bestLap = lt;
      }
      if (P.lap >= LAPS) {
        P.finished = true;
        P.finishTime = this.raceTime;
        this.finishRace();
        return;
      }
      toast('第 ' + (P.lap + 1) + ' 圈');
    }

    // 位置
    const u = this.track.uAtDist(P.dist);
    P.pos.copy(this.track.posAt(u, P.lat));
    P.heading = heading;
  }

  finishRace() {
    // 名次按完赛顺序
    this.updateRanks();
    const p = this.player.rank;
    $('finPos').textContent = ['冠军', '亚军', '季军', '第四', '第五', '第六', '第七', '第八'][p - 1] || '—';
    $('finPosNum').textContent = '#' + p;
    $('finTime').textContent = fmtTime(this.raceTime);
    $('finBest').textContent = this.player.bestLap < Infinity ? fmtLap(this.player.bestLap) : '--';
    $('finDrift').textContent = fmtNum(this.player.driftDist) + ' m';
    $('finTop').textContent = fmtNum(this.player.topSpeed * 3.6) + ' km/h';
    $('finLaps').textContent = this.player.lapTimes.map((t) => fmtLap(t)).join('  ');
    // 本地最好成绩
    let best = null;
    try { best = JSON.parse(localStorage.getItem('seabreeze.best') || 'null'); } catch (e) { best = null; }
    const rec = !best || this.raceTime < best.time;
    if (rec) {
      try { localStorage.setItem('seabreeze.best', JSON.stringify({ time: this.raceTime, pos: p })); } catch (e) { }
      $('finRecord').classList.add('show');
    } else {
      $('finRecord').classList.remove('show');
      $('finRecordBest').textContent = '最好成绩 ' + fmtTime(best.time);
    }
    this.setState('finish');
  }

  updateHUD(dt) { updateHUD(dt, this); }

  // ---------------- 相机 ----------------
  updateCamera(dt) {
    const P = this.player;
    const car = P.car.root;
    const q = P.sample();

    if (this.camMode === 1) {
      // 车内视角：贴在车头，随车身朝向
      const cam = new THREE.Vector3(0, 0.95, 0.9);
      cam.applyEuler(car.rotation);
      cam.add(P.pos);
      this.camera.position.lerp(cam, 1 - Math.exp(-24 * dt));
      const look = new THREE.Vector3(0, 0.75, 16);
      look.applyEuler(car.rotation);
      look.add(P.pos);
      this.camera.lookAt(look);
    } else if (this.camMode === 2) {
      // 环绕
      this.camOrbit = (this.camOrbit || 0) + dt * 0.35;
      const r = 16;
      this.camera.position.set(
        P.pos.x + Math.cos(this.camOrbit) * r, P.pos.y + 6.5, P.pos.z + Math.sin(this.camOrbit) * r);
      this.camera.lookAt(P.pos);
    } else {
      // 跟随：机位挂在车身坐标系里，但用「路面切向」作为基准，避免漂移时镜头乱甩
      const q = P.sample();
      const fwd = new THREE.Vector3(q.tan.x, 0, q.tan.z).normalize();
      const side = new THREE.Vector3(-fwd.z, 0, fwd.x);
      const want = P.pos.clone()
        .addScaledVector(fwd, -10.6)
        .addScaledVector(side, 0.6)
        .add(new THREE.Vector3(0, 4.6, 0));
      this.camera.position.lerp(want, 1 - Math.exp(-7.5 * dt));
      const look = P.pos.clone().addScaledVector(fwd, 12).add(new THREE.Vector3(0, 1.4, 0));
      this.camera.lookAt(look);
    }

    // 氮气时拉 FOV
    const targetFov = this.player.boosting ? 72 : 58;
    this.camera.fov = damp(this.camera.fov, targetFov, 5, dt);
    this.camera.updateProjectionMatrix();
  }

  // ---------------- 车视觉 ----------------
  updateCarVisuals(dt) {
    for (const r of this.racers) {
      const c = r.car;
      c.root.position.copy(r.pos);
      // 车身朝向：切向 + 转向角
      const q = r.sample();
      let yaw = Math.atan2(q.tan.x, q.tan.z);
      if (r.isPlayer) yaw = r.heading;
      else yaw += r.steerVis * 0.5;
      c.root.rotation.y = yaw;

      // 车身侧倾与俯仰
      const lean = r.isPlayer ? (r.steer * 0.09 + (r.slip || 0) * 0.12) : r.steerVis * 0.09;
      c.root.rotation.z = damp(c.root.rotation.z, -lean, 8, dt);
      c.root.rotation.x = damp(c.root.rotation.x, r.isPlayer ? (r.speed > 1 ? -0.012 : 0) : 0, 5, dt);

      // 车轮：滚动 + 前轮转向
      for (const w of c.wheels) {
        w.mesh.rotation.x -= r.speed * dt * 2.2;
        if (w.front) w.mesh.rotation.y = r.isPlayer ? r.steer : r.steerVis;
      }
      // 车坐在路面上：车轴中心比路面高一个轮半径
      c.root.position.y = r.pos.y + 0.44;
    }
  }

  // ---------------- 尾气与漂移烟 ----------------
  updateFx(dt) {
    const P = this.player;
    // 漂移烟：青绿色粒子
    const wantSmoke = P.driftAmt > 0.35 ? 3 : 0;
    this.smokeAcc = (this.smokeAcc || 0) + wantSmoke * dt * 30;
    while (this.smokeAcc >= 1) {
      this.smokeAcc -= 1;
      this.spawnSmoke();
    }
    if (this.smokes) {
      for (let i = this.smokes.length - 1; i >= 0; i--) {
        const s = this.smokes[i];
        s.life -= dt;
        if (s.life <= 0) { this.scene.remove(s.mesh); this.smokes.splice(i, 1); continue; }
        s.mesh.position.addScaledVector(s.vel, dt);
        s.vel.y += 1.2 * dt;
        s.mesh.scale.multiplyScalar(1 + dt * 1.4);
        s.mesh.material.opacity = clamp(s.life / s.maxLife, 0, 1) * 0.34;
      }
    }
    // 氮气尾焰
    if (this.player.car.parts.tailMat) {
      const on = P.boosting;
      this.player.car.parts.tailMat.color.setHex(on ? 0x6ef0e6 : 0xff3b3f);
    }
  }

  spawnSmoke() {
    if (!this.smokes) this.smokes = [];
    const geo = new THREE.SphereGeometry(0.30, 6, 5);
    const mat = new THREE.MeshBasicMaterial({ color: 0x6fd8d2, transparent: true, opacity: 0.30, depthWrite: false });
    const m = new THREE.Mesh(geo, mat);
    const c = this.player.car.root;
    const w = this.player.car.wheels[2 + (Math.random() > 0.5 ? 0 : 1)];
    w.mesh.getWorldPosition(m.position);
    m.position.y += 0.14;
    m.position.copy(w.mesh.getWorldPosition(new THREE.Vector3()));
    m.position.y += 0.14;
    m.scale.setScalar(0.7);
    this.scene.add(m);
    this.smokes.push({ mesh: m, life: 1.0, maxLife: 1.0, vel: new THREE.Vector3((Math.random() - 0.5) * 1.6, 0.7, (Math.random() - 0.5) * 1.6) });
  }

  // ---------------- 主循环 ----------------
  loop(now) {
    requestAnimationFrame(this.loop);
    let dt = (now - this.last) / 1000;
    this.last = now;
    if (dt > 0.1) dt = 0.1;

    if (this.state === 'race') {
      this.raceTime += dt * 1000;
      this.updatePlayer(dt);
      for (const r of this.racers) if (!r.isPlayer) r.update(dt, this.player.dist);
      this.updateRanks();
      this.updateFx(dt);
      this.updateHUD(dt);
      if (this.sea) this.sea.mat.uniforms.uTime.value += dt;
    } else if (this.state === 'title' || this.state === 'finish') {
      // 标题页：镜头沿着赛道缓慢巡游
      this.titleT = (this.titleT || 0) + dt;
      const u = (this.titleT * 0.022) % 1;
      const q = this.track.ptAt(u);
      const look = q.p.clone().addScaledVector(q.tan, 26);
      this.camera.position.lerp(q.p.clone().add(new THREE.Vector3(0, 9, 0)), 1 - Math.exp(-2 * dt));
      this.camera.lookAt(look);
      if (this.sea) this.sea.mat.uniforms.uTime.value += dt;
      if (this.state === 'title') {
        // 标题页也让车跑起来（视觉）
        for (const r of this.racers) {
          if (r.isPlayer) continue;
          r.update(dt, 0);
          r.car.root.position.copy(r.pos);
          r.car.root.rotation.y = r.heading;
        }
      }
    }

    this.updateCarVisuals(dt);
    this.updateCamera(dt);

    // 阴影相机跟随玩家
    if (this.sunLight && this.player) {
      this.sunLight.position.set(this.player.pos.x + 90, this.player.pos.y + 70, this.player.pos.z - 110);
      this.sunLight.target.position.copy(this.player.pos);
      this.sunLight.target.updateMatrixWorld();
    }

    this.renderer.render(this.scene, this.camera);
  }
}

// ---- 08 boot.js ----
// ============================================================================

function boot() {
  initHUD();
  bindInput(
    () => { if (game.state === 'race') { game.resetRace(); toast('已重置'); } },
    () => { if (game.state === 'race') game.setState('paused'); else if (game.state === 'paused') game.setState('race'); },
    () => { game.camMode = (game.camMode + 1) % 3; toast(['跟随视角', '车内视角', '环绕视角'][game.camMode]); }
  );
  game = new Game();
  window.game = game;
  game.setState('title');
  // 竖屏提示
  const rot = $('rotate');
  const check = () => {
    const portrait = innerHeight > innerWidth;
    rot.classList.toggle('show', portrait && IS_TOUCH);
  };
  addEventListener('resize', check);
  addEventListener('orientationchange', check);
  check();
}

let game = null;
if (document.readyState === 'loading') addEventListener('DOMContentLoaded', boot);
else boot();
