// ============================================================================
//  01_world.js — 深蓝信标 · 海底世界
//  程序化生成：地形 / 荧光珊瑚 / 水母 / 沉船 / 灯塔 / 粒子 / 光囊
//  配色 token 见 DESIGN.md：abyss #05121f / cyan #4ff5d8 / magenta #ff5c8a / amber #ffc66b
// ============================================================================

const C = {
  abyss: 0x05121f, mid: 0x0b2b3d, cyan: 0x4ff5d8, magenta: 0xff5c8a,
  amber: 0xffc66b, foam: 0xdff5f0, rock: 0x123043, sand: 0x1d4453,
};
const WORLD = 260;        // 海域半径
const FLOOR = -30;        // 海床基准高度
const CEIL = 42;          // 海面高度

// ---------- 确定性随机（同一 seed 每次生成同一片海） ----------
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20261116);
const rr = (a, b) => a + rnd() * (b - a);

// ---------- 简易值噪声（地形起伏） ----------
function hash2(x, z) {
  let h = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return h - Math.floor(h);
}
function noise2(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash2(xi, zi), b = hash2(xi + 1, zi), c = hash2(xi, zi + 1), d = hash2(xi + 1, zi + 1);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}
function seabed(x, z) {
  const d = Math.hypot(x, z) / WORLD;
  const base = noise2(x * 0.012, z * 0.012) * 14 + noise2(x * 0.045, z * 0.045) * 4;
  return FLOOR + base - d * d * 18;   // 边缘下沉，形成盆地
}

// ---------- 工具：低多边形材质 ----------
function mat(color, opts = {}) {
  return new THREE.MeshLambertMaterial({
    color, emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.ei ?? 1,
    transparent: !!opts.transparent, opacity: opts.opacity ?? 1,
    side: opts.side ?? THREE.FrontSide, flatShading: true,
    depthWrite: opts.depthWrite ?? true,
  });
}
function glowMat(color, opacity = 0.9) {
  return new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide });
}

// ============================================================================
//  海床地形
// ============================================================================
function buildSeabed(scene) {
  const SEG = 120, size = WORLD * 2.2;
  const geo = new THREE.PlaneGeometry(size, size, SEG, SEG);
  geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  const colors = [];
  const cSand = new THREE.Color(C.sand), cRock = new THREE.Color(C.rock), cDeep = new THREE.Color(C.abyss);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), y = seabed(x, z);
    p.setY(i, y);
    const h = (y - FLOOR + 20) / 34;
    const col = cDeep.clone().lerp(cRock, Math.min(1, h * 1.1)).lerp(cSand, Math.max(0, h - 0.5));
    colors.push(col.r, col.g, col.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const m = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const mesh = new THREE.Mesh(geo, m);
  mesh.name = 'seabed';
  scene.add(mesh);
  return mesh;
}

// ============================================================================
//  荧光珊瑚：细枝 + 顶端发光球
// ============================================================================
function buildCoral(scene, x, z, hue) {
  const g = new THREE.Group();
  const baseY = seabed(x, z);
  g.position.set(x, baseY, z);
  const color = hue === 'magenta' ? C.magenta : hue === 'amber' ? C.amber : C.cyan;
  const stalk = mat(C.rock.clone ? C.rock : C.rock);
  const branchMat = mat(0x1a4a58);
  const tipMat = glowMat(color, 0.92);

  const n = 3 + Math.floor(rr(0, 4));
  for (let i = 0; i < n; i++) {
    const h = rr(3, 8), tilt = rr(-0.5, 0.5), len = rr(1.6, 3.4);
    const dir = rr(0, Math.PI * 2);
    const dx = Math.cos(dir) * len, dz = Math.sin(dir) * len;
    // 主干
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.42, h, 5), branchMat);
    stem.position.set(Math.sin(tilt) * h * 0.3, h / 2, Math.cos(tilt) * h * 0.2);
    stem.rotation.z = tilt * 0.5;
    g.add(stem);
    // 分叉
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.2, len, 5), branchMat);
    arm.position.set(dx * 0.5, h * 0.85, dz * 0.5);
    arm.rotation.z = -Math.atan2(dz, h) * 0.9;
    arm.rotation.x = Math.atan2(dx, h) * 0.6;
    g.add(arm);
    // 荧光 Tip
    const tip = new THREE.Mesh(new THREE.IcosahedronGeometry(rr(0.5, 0.95), 0), tipMat);
    tip.position.set(dx, h * 0.85 + len * 0.4, dz);
    tip.userData.pulse = rr(0, Math.PI * 2);
    tip.userData.tip = true;
    g.add(tip);
  }
  scene.add(g);
  return g;
}

// ============================================================================
//  水母：伞盖 + 触须，缓慢上下漂移（环境运动，非用户触发）
// ============================================================================
function buildJelly(scene, x, y, z, hue) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  const color = hue === 'magenta' ? C.magenta : hue === 'amber' ? C.amber : C.cyan;
  const bellMat = glowMat(color, 0.28);
  const bell = new THREE.Mesh(new THREE.SphereGeometry(2.2, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.58), bellMat);
  g.add(bell);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.14, 5, 14), glowMat(color, 0.75));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = -0.15;
  g.add(rim);
  const tentMat = glowMat(color, 0.55);
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2;
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.02, rr(3, 5), 4), tentMat);
    t.position.set(Math.cos(a) * 1.2, -2.2, Math.sin(a) * 1.2);
    t.rotation.z = Math.cos(a) * 0.18;
    g.add(t);
  }
  g.userData = { jelly: true, y0: y, phase: rr(0, Math.PI * 2), spd: rr(0.25, 0.5) };
  scene.add(g);
  return g;
}

// ============================================================================
//  沉船：低多边形船体 + 断裂桅杆（叙事道具）
// ============================================================================
function buildWreck(scene, x, z) {
  const g = new THREE.Group();
  g.position.set(x, seabed(x, z) + 1, z);
  g.rotation.set(rr(-0.15, 0.15), rr(0, Math.PI * 2), rr(-0.18, 0.18));
  const hull = mat(0x244047);
  const shape = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 5.2, 22, 7, 1, false, 0, Math.PI), hull);
  shape.rotation.z = Math.PI / 2;
  shape.rotation.y = Math.PI / 2;
  shape.position.y = 3;
  g.add(shape);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(19, 0.8, 8), hull);
  deck.position.y = 5.4;
  g.add(deck);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 16, 6), hull);
  mast.position.set(-3, 12, 0); mast.rotation.z = 0.35;
  g.add(mast);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(5, 3.5, 6), hull);
  cabin.position.set(5, 7, 0);
  g.add(cabin);
  // 舷窗：一点冷青余光
  for (let i = 0; i < 4; i++) {
    const p = new THREE.Mesh(new THREE.CircleGeometry(0.45, 8), glowMat(C.cyan, 0.8));
    p.position.set(3 + i * 2, 7.6, 3.05);
    g.add(p);
  }
  scene.add(g);
  return g;
}

// ============================================================================
//  远古灯塔：分层石塔 + 顶端灯室。初始熄灭，送达光囊后逐层点亮
// ============================================================================
function buildBeacon(scene, x, z, index) {
  const g = new THREE.Group();
  g.position.set(x, seabed(x, z), z);
  const stone = mat(0x2a4250);
  const rings = [];
  for (let i = 0; i < 5; i++) {
    const r = 5.4 - i * 0.5;
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(r - 0.5, r, 4.4, 8), stone);
    seg.position.y = 2.2 + i * 4.4;
    seg.rotation.y = i * 0.22;
    g.add(seg);
    // 每层一圈荧光纹：熄灭时暗，点亮后亮
    const band = new THREE.Mesh(new THREE.TorusGeometry(r - 0.15, 0.18, 5, 20), glowMat(C.amber, 0.06));
    band.rotation.x = Math.PI / 2;
    band.position.y = 3.9 + i * 4.4;
    g.add(band);
    rings.push(band);
  }
  const lampMat = glowMat(C.amber, 0.08);
  const lamp = new THREE.Mesh(new THREE.IcosahedronGeometry(2.6, 1), lampMat);
  lamp.position.y = 25;
  g.add(lamp);
  const cage = new THREE.Mesh(new THREE.TorusGeometry(3.1, 0.16, 5, 12), mat(0x355062));
  cage.rotation.x = Math.PI / 2; cage.position.y = 25;
  g.add(cage);
  // 光柱：初始隐藏，点亮时显示
  const beamMat = new THREE.MeshBasicMaterial({ color: C.amber, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 8, 90, 12, 1, true), beamMat);
  beam.position.y = 25 + 45;
  g.add(beam);

  g.userData = { beacon: true, index, rings, lamp, lampMat, beam, beamMat, x, z, charge: 0 };
  scene.add(g);
  return g;
}

// ============================================================================
//  光囊（收集物）：冷青发光体，缓慢自转与漂浮
// ============================================================================
function buildPod(scene, x, y, z, kind) {
  const color = kind === 'shell' ? C.foam : C.cyan;
  const g = new THREE.Group();
  g.position.set(x, y, z);
  let core;
  if (kind === 'shell') {
    core = new THREE.Mesh(new THREE.SphereGeometry(1.1, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.55), glowMat(color, 0.85));
    core.scale.set(1, 0.55, 1);
  } else {
    core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.15, 0), glowMat(color, 0.9));
  }
  g.add(core);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(2.0, 8, 6), glowMat(color, 0.13));
  g.add(halo);
  g.userData = { pod: true, kind, y0: y, phase: rr(0, Math.PI * 2), core, halo };
  scene.add(g);
  return g;
}

// ============================================================================
//  环境粒子：浮游生物（ Points，缓慢上升）
// ============================================================================
function buildPlankton(scene) {
  const N = 900, pos = new Float32Array(N * 3), spd = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = rr(-WORLD, WORLD);
    pos[i * 3 + 1] = rr(FLOOR, CEIL);
    pos[i * 3 + 2] = rr(-WORLD, WORLD);
    spd[i] = rr(0.4, 1.6);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({ color: C.cyan, size: 0.55, transparent: true, opacity: 0.42, depthWrite: false, blending: THREE.AdditiveBlending });
  const pts = new THREE.Points(geo, m);
  pts.userData = { plankton: true, spd };
  scene.add(pts);
  return pts;
}

// ============================================================================
//  海面：从下方看到的波光顶盖
// ============================================================================
function buildSurface(scene) {
  const geo = new THREE.PlaneGeometry(WORLD * 2.4, WORLD * 2.4, 40, 40);
  geo.rotateX(Math.PI / 2);
  const m = new THREE.MeshBasicMaterial({ color: C.mid, transparent: true, opacity: 0.34, side: THREE.DoubleSide, depthWrite: false });
  const mesh = new THREE.Mesh(geo, m);
  mesh.position.y = CEIL;
  scene.add(mesh);
  return mesh;
}

// ============================================================================
//  组装整个海域
// ============================================================================
function buildWorld(scene) {
  scene.background = new THREE.Color(C.abyss);
  scene.fog = new THREE.FogExp2(C.abyss, 0.0075);

  // 光照：幽暗环境 + 上方冷光 + 潜航器自带探照（在 02_sub.js 中）
  scene.add(new THREE.AmbientLight(0x4a7f8c, 0.85));
  const sun = new THREE.DirectionalLight(0x8fe6d8, 0.55);
  sun.position.set(40, 120, 20);
  scene.add(sun);

  buildSeabed(scene);
  buildSurface(scene);
  const plankton = buildPlankton(scene);

  // 三座灯塔，分布在海域三个方位
  const sites = [ [-95, -70], [110, -55], [15, 120] ];
  const beacons = sites.map((s, i) => buildBeacon(scene, s[0], s[1], i));

  // 珊瑚丛：沿岸随机散布
  const corals = [];
  for (let i = 0; i < 70; i++) {
    const a = rr(0, Math.PI * 2), r = rr(35, WORLD * 0.92);
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const hue = rnd() < 0.14 ? 'magenta' : rnd() < 0.12 ? 'amber' : 'cyan';
    corals.push(...buildCoral(scene, x, z, hue).children.filter(c => c.userData.tip));
  }

  // 水母：中层漂浮
  const jellies = [];
  for (let i = 0; i < 22; i++) {
    const a = rr(0, Math.PI * 2), r = rr(20, WORLD * 0.8);
    const hue = rnd() < 0.3 ? 'magenta' : 'cyan';
    jellies.push(buildJelly(scene, Math.cos(a) * r, rr(FLOOR + 22, CEIL - 8), Math.sin(a) * r, hue));
  }

  // 沉船：两处叙事地标
  buildWreck(scene, -60, 85);
  buildWreck(scene, 130, 40);

  return { beacons, corals, jellies, plankton };
}

// ============================================================================
//  环境动画（每帧调用）
// ============================================================================
function animateWorld(world, t, dt) {
  for (const j of world.jellies) {
    const u = j.userData;
    j.position.y = u.y0 + Math.sin(t * u.spd + u.phase) * 3.2;
    j.rotation.y += dt * 0.12;
  }
  for (const c of world.corals) {
    c.material.opacity = 0.72 + Math.sin(t * 1.3 + c.userData.pulse) * 0.2;
  }
  const pos = world.plankton.geometry.attributes.position;
  const arr = pos.array, spd = world.plankton.userData.spd;
  for (let i = 0; i < spd.length; i++) {
    arr[i * 3 + 1] += spd[i] * dt * 0.5;
    if (arr[i * 3 + 1] > CEIL) arr[i * 3 + 1] = FLOOR;
  }
  pos.needsUpdate = true;
}

// ============================================================================
//  02_sub.js — 深蓝信标 · 深潜器建模与操控
//  低多边形微型潜航器「萤火号」：外部视角 / 驾驶舱视角切换
// ============================================================================

function buildSub(scene) {
  const g = new THREE.Group();
  // 船体：胶囊形（多段圆柱 + 球帽）
  const hullMat = mat(0xd8e8e4);
  const hull = new THREE.Mesh(new THREE.CapsuleGeometry(1.5, 3.2, 4, 10), hullMat);
  hull.rotation.x = Math.PI / 2;
  g.add(hull);
  // 观察窗（驾驶舱正面）
  const glass = new THREE.Mesh(new THREE.SphereGeometry(1.35, 12, 8), glowMat(0x2a6b80, 0.85));
  glass.position.set(0, 0.35, -1.6);
  glass.scale.set(1, 0.85, 0.6);
  g.add(glass);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.16, 6, 16), mat(0x33555f));
  ring.position.set(0, 0.35, -1.85);
  g.add(ring);
  // 尾翼
  const finMat = mat(0xb8cfc9);
  const finV = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.8, 1.6), finMat);
  finV.position.set(0, 1.2, 2.2); g.add(finV);
  const finH = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.18, 1.4), finMat);
  finH.position.set(0, 0, 2.4); g.add(finH);
  // 双侧推进器
  for (const s of [-1, 1]) {
    const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 1.8, 8), hullMat);
    pod.rotation.x = Math.PI / 2; pod.position.set(s * 1.9, -0.3, 1.1);
    g.add(pod);
    const glow = new THREE.Mesh(new THREE.CircleGeometry(0.42, 10), glowMat(C.cyan, 0.9));
    glow.position.set(s * 1.9, -0.3, 2.05); glow.rotation.y = Math.PI;
    g.add(glow);
  }
  // 顶部信号灯（琥珀）
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), glowMat(C.amber, 0.95));
  beacon.position.set(0, 1.7, -0.4);
  g.add(beacon);
  // 探照灯：聚光灯 + 可见光锥
  const spot = new THREE.SpotLight(0xdff5f0, 2.6, 70, Math.PI / 7, 0.55, 1.2);
  spot.position.set(0, 0, -1.5);
  const target = new THREE.Object3D(); target.position.set(0, -2, -30);
  g.add(spot); g.add(target); spot.target = target;
  const coneMat = new THREE.MeshBasicMaterial({ color: 0xbfeae0, transparent: true, opacity: 0.05, depthWrite: false, side: THREE.DoubleSide });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(9, 34, 14, 1, true), coneMat);
  cone.rotation.x = -Math.PI / 2;
  cone.position.set(0, -0.4, -18);
  g.add(cone);

  scene.add(g);
  return { root: g, glass, beacon, spot, cone };
}

// ============================================================================
//  潜航器运动状态
// ============================================================================
class Sub {
  constructor(scene) {
    this.model = buildSub(scene);
    this.pos = new THREE.Vector3(0, 6, 150);   // 出生点：朝海域中心
    this.yaw = Math.PI;                         // 面向 -Z
    this.pitch = 0;
    this.vy = 0;
    this.speed = 0;
    this.cockpit = false;
    this.bob = 0;
  }
  reset() {
    this.pos.set(0, 6, 150);
    this.yaw = Math.PI; this.pitch = 0; this.vy = 0; this.speed = 0; this.bob = 0;
    this.model.root.position.copy(this.pos);
    this.model.root.rotation.set(0, this.yaw, 0);
  }
  update(dt, inp) {
    // 推进：W/S 或触屏前后
    const thrust = (inp.up ? 1 : 0) - (inp.down ? 1 : 0);
    const target = thrust * 26;
    this.speed += (target - this.speed) * Math.min(1, dt * (thrust ? 1.6 : 2.4));
    // 转向
    const turn = (inp.left ? 1 : 0) - (inp.right ? 1 : 0);
    this.yaw += turn * dt * 1.5 * (0.6 + Math.abs(this.speed) / 30);
    // 上浮下潜
    const vert = (inp.ascend ? 1 : 0) - (inp.descend ? 1 : 0);
    this.vy += (vert * 13 - this.vy) * Math.min(1, dt * 2.2);
    this.pos.y += this.vy * dt;
    // 前进（沿朝向）
    this.pos.x += Math.sin(this.yaw) * this.speed * dt;
    this.pos.z += Math.cos(this.yaw) * this.speed * dt;

    // 边界约束：海域圆形 + 高度限制
    const d = Math.hypot(this.pos.x, this.pos.z), lim = WORLD - 8;
    if (d > lim) { this.pos.x *= lim / d; this.pos.z *= lim / d; this.speed *= 0.4; }
    const ground = seabed(this.pos.x, this.pos.z) + 3.5;
    if (this.pos.y < ground) { this.pos.y = ground; this.vy = Math.max(0, this.vy); }
    if (this.pos.y > CEIL - 3) { this.pos.y = CEIL - 3; this.vy = Math.min(0, this.vy); }

    // 姿态：轻微俯仰跟随垂直速度，缓慢浮动
    this.bob += dt;
    const wantPitch = -this.vy * 0.02 + Math.sin(this.bob * 1.4) * 0.02;
    this.pitch += (wantPitch - this.pitch) * Math.min(1, dt * 3);
    const roll = -turn * 0.16;
    this.model.root.position.copy(this.pos);
    this.model.root.rotation.set(this.pitch, this.yaw, roll, 'YXZ');
    // 探照灯轻微摆动
    this.model.cone.material.opacity = 0.04 + Math.sin(this.bob * 2) * 0.008;
  }
}

// ============================================================================
//  相机：外部跟随 / 驾驶舱内视
// ============================================================================
class CameraRig {
  constructor(camera) {
    this.cam = camera;
    this.cockpit = false;
    this.pos = new THREE.Vector3();
    this.look = new THREE.Vector3();
  }
  toggle() { this.cockpit = !this.cockpit; return this.cockpit; }
  update(sub, dt) {
    if (this.cockpit) {
      // 驾驶舱：贴在观察窗内
      const f = new THREE.Vector3(Math.sin(sub.yaw), 0, Math.cos(sub.yaw));
      const want = sub.pos.clone().addScaledVector(f, -1.2).add(new THREE.Vector3(0, 0.45, 0));
      this.pos.lerp(want, Math.min(1, dt * 14));
      this.cam.position.copy(this.pos);
      const tgt = sub.pos.clone().addScaledVector(f, 30).add(new THREE.Vector3(0, -1.5, 0));
      this.cam.lookAt(tgt);
      this.cam.fov += (76 - this.cam.fov) * Math.min(1, dt * 5);
    } else {
      // 外部：跟在艇后上方
      const f = new THREE.Vector3(Math.sin(sub.yaw), 0, Math.cos(sub.yaw));
      const want = sub.pos.clone().addScaledVector(f, -11).add(new THREE.Vector3(0, 4.2, 0));
      this.pos.lerp(want, Math.min(1, dt * 3.5));
      this.cam.position.copy(this.pos);
      const tgt = sub.pos.clone().addScaledVector(f, 12).add(new THREE.Vector3(0, 0.5, 0));
      this.cam.lookAt(tgt);
      this.cam.fov += (66 - this.cam.fov) * Math.min(1, dt * 5);
    }
    this.cam.updateProjectionMatrix();
  }
}

// ============================================================================
//  03_game.js — 深蓝信标 · 输入 / HUD / 玩法 / 主循环
// ============================================================================

// ---- 05 input.js ----
// 触摸判定：三分命中（coarse / ontouchstart / maxTouchPoints），任一即移动端
// 与《夜行记录仪》v105 同款；正常设备零回归。
const IS_TOUCH = (window.matchMedia && matchMedia('(pointer: coarse)').matches)
  || ('ontouchstart' in window)
  || (navigator.maxTouchPoints > 0);
document.body.classList.toggle('touch', IS_TOUCH);

const Keys = { up: false, down: false, left: false, right: false, ascend: false, descend: false };
const Touch = Object.assign({}, Keys);
const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
  Space: 'ascend', ShiftLeft: 'descend', ShiftRight: 'descend',
};
const input = () => {
  const o = {};
  for (const k in Keys) o[k] = Keys[k] || Touch[k];
  return o;
};

// ============================================================================
//  DOM 引用
// ============================================================================
const $ = (id) => document.getElementById(id);
const UI = {
  title: $('title'), hud: $('hud'), toast: $('toast'),
  pods: $('hudPods'), beacons: $('hudBeacons'), depth: $('hudDepth'), heading: $('hudHeading'),
  hint: $('hint'), btnStart: $('btnStart'), viewBtn: $('viewBtn'),
  end: $('end'), endTitle: $('endTitle'), endSub: $('endSub'), btnAgain: $('btnAgain'),
  ver: $('verTag'), touch: $('touch'), portrait: $('portrait'),
};

// ============================================================================
//  游戏状态
// ============================================================================
// 光囊 18 个（通关需 12），富余 6 个作容错——漏捡几个仍可通关
const POD_TOTAL = 18, SHELL_TOTAL = 8, BEACON_TOTAL = 3, NEED_PER_BEACON = 4;
const SAVE_KEY = 'abyss-beacon-save-v1';
let renderer, scene, camera, world, sub, rig;
let state = 'title';      // title / play / end
let clock = 0, lastT = 0;
const progress = { pods: 0, shells: 0, delivered: 0, lights: [0, 0, 0] };
let nearBeacon = -1;
let toastTimer = null;

function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    if (Array.isArray(s.lights) && s.lights.length === BEACON_TOTAL) {
      progress.best = s.best || 0;
    }
  } catch (e) { }
}
function saveBest() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ best: progress.best || 0, lights: progress.lights })); } catch (e) { }
}
function toast(msg, ms = 2600) {
  UI.toast.textContent = msg;
  UI.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => UI.toast.classList.remove('show'), ms);
}

// ============================================================================
//  光囊生成（每局固定布局：12 光囊 + 8 贝片）
// ============================================================================
function spawnPods() {
  if (world.pods) for (const p of world.pods) scene.remove(p.root);
  world.pods = [];
  const put = (kind, x, y, z) => {
    const root = buildPod(scene, x, y, z, kind);
    world.pods.push(Object.assign(root.userData, { root, taken: false }));
  };
  // 光囊：三座灯塔周边各 4 个，散落在前往灯塔的路上
  const sites = [[-95, -70], [110, -55], [15, 120]];
  sites.forEach(([sx, sz], i) => {
    for (let k = 0; k < POD_TOTAL / BEACON_TOTAL; k++) {
      const a = rr(0, Math.PI * 2), r = rr(18, 62);
      put('pod', sx + Math.cos(a) * r, rr(FLOOR + 12, CEIL - 12), sz + Math.sin(a) * r);
    }
  });
  // 贝片：围绕出生点与中途
  for (let k = 0; k < SHELL_TOTAL; k++) {
    const a = rr(0, Math.PI * 2), r = rr(30, 110);
    put('shell', Math.cos(a) * r, rr(FLOOR + 8, CEIL - 14), Math.sin(a) * r);
  }
}

// ============================================================================
//  玩法逻辑
// ============================================================================
function resetGame() {
  progress.pods = 0; progress.shells = 0; progress.delivered = 0;
  progress.lights = [0, 0, 0];
  world.beacons.forEach(b => {
    b.userData.charge = 0;
    b.userData.rings.forEach(r => r.material.opacity = 0.06);
    b.userData.lampMat.opacity = 0.08;
    b.userData.beamMat.opacity = 0;
  });
  sub.reset();
  spawnPods();
  updateHUD();
}

function startGame() {
  resetGame();
  state = 'play';
  UI.title.classList.remove('show');
  UI.hud.classList.add('show');
  UI.end.classList.remove('show');
}

function collectPod(p) {
  if (p.taken) return;
  p.taken = true;
  scene.remove(p.root);
  if (p.kind === 'shell') {
    progress.shells++;
    toast(`拾得贝片 · ${progress.shells}/${SHELL_TOTAL}`);
  } else {
    progress.pods++;
    toast(`收得光囊 · ${progress.pods}/${POD_TOTAL}`);
  }
  updateHUD();
}

function deliverToBeacon(i) {
  const b = world.beacons[i], u = b.userData;
  if (progress.pods <= 0) { toast('需要先收集光囊'); return; }
  if (u.charge >= NEED_PER_BEACON) { toast('这座灯塔已经亮了'); return; }
  progress.pods--;
  u.charge++;
  const lit = u.charge / NEED_PER_BEACON;
  u.rings.forEach((r, k) => r.material.opacity = (k / NEED_PER_BEACON < lit) ? 0.95 : 0.06);
  u.lampMat.opacity = 0.08 + lit * 0.72;
  u.beamMat.opacity = lit * 0.16;
  progress.delivered++;
  progress.lights[i] = u.charge;
  updateHUD();
  if (u.charge >= NEED_PER_BEACON) {
    u.beamMat.opacity = 0.3;
    toast('灯塔亮了 · 航路重现', 3200);
    if (progress.lights.every(v => v >= NEED_PER_BEACON)) endGame(true);
  } else {
    toast(`注入光囊 · ${u.charge}/${NEED_PER_BEACON}`);
  }
}

function endGame(won) {
  state = 'end';
  const score = progress.delivered * 100 + progress.shells * 50;
  progress.best = Math.max(progress.best || 0, score);
  saveBest();
  UI.endTitle.textContent = won ? '三座灯塔已亮' : '本次潜航结束';
  UI.endSub.textContent = `送达光囊 ${progress.delivered} · 拾得贝片 ${progress.shells} · 得分 ${score}`;
  UI.end.classList.add('show');
  UI.hint.classList.remove('show');
}

function checkInteractions(dt) {
  const p = sub.pos;
  // 收集：距离判定
  for (const pod of world.pods) {
    if (pod.taken) continue;
    const r = pod.root.position;
    if ((p.x - r.x) ** 2 + (p.y - r.y) ** 2 + (p.z - r.z) ** 2 < 16) collectPod(pod);
  }
  // 灯塔：距离 + 朝向
  let near = -1, bestD = 22 * 22;
  world.beacons.forEach((b, i) => {
    const dx = p.x - b.userData.x, dz = p.z - b.userData.z;
    const d = dx * dx + dz * dz;
    if (d < bestD) { bestD = d; near = i; }
  });
  if (near !== nearBeacon) {
    nearBeacon = near;
    if (near >= 0) UI.hint.classList.add('show');
    else UI.hint.classList.remove('show');
  }
  return near;
}

function updateHUD() {
  UI.pods.textContent = `${progress.pods} / ${POD_TOTAL}`;
  UI.beacons.textContent = `${progress.lights.filter(v => v >= NEED_PER_BEACON).length} / ${BEACON_TOTAL}`;
}
function updateInstruments() {
  UI.depth.textContent = String(Math.max(0, Math.round(CEIL - sub.pos.y))).padStart(3, '0');
  const deg = ((sub.yaw * 180 / Math.PI) % 360 + 360) % 360;
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  UI.heading.textContent = dirs[Math.round(deg / 45) % 8];
}

// ============================================================================
//  触屏输入绑定：pointer 事件（兼容所有 WebView，不依赖 touch 事件）
// ============================================================================
function bindTouch() {
  const pads = UI.touch.querySelectorAll('[data-k]');
  const active = new Map();   // pointerId -> key
  const setKey = (k, on) => { if (k in Touch) Touch[k] = on; };
  for (const pad of pads) {
    const k = pad.dataset.k;
    pad.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      // 部分 WebView / 合成 pointer 事件没有活跃指针，setPointerCapture 会抛错；
      // 不能让它中断按键状态设置（否则按钮亮了但车不动）。
      try { pad.setPointerCapture?.(e.pointerId); } catch (err) { }
      active.set(e.pointerId, k); setKey(k, true); pad.classList.add('on');
    });
    const up = (e) => {
      if (active.get(e.pointerId) === k) {
        active.delete(e.pointerId); setKey(k, false); pad.classList.remove('on');
      }
    };
    pad.addEventListener('pointerup', up);
    pad.addEventListener('pointercancel', up);
    pad.addEventListener('lostpointercapture', up);
  }
  // 视角切换（桌面按钮 + 触屏按钮）
  UI.viewBtn.addEventListener('click', () => rig.toggle());
  $('touchView').addEventListener('pointerdown', (e) => { e.preventDefault(); rig.toggle(); });
  $('touchDeliver').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (state === 'play' && nearBeacon >= 0) deliverToBeacon(nearBeacon);
    else if (state === 'play') toast('靠近灯塔才能投放光囊');
  });
  // pointerOnly 浏览器：首次触摸也解锁音频/全屏
  window.addEventListener('pointerdown', function unlock() {
    if (document.documentElement.requestFullscreen && screen.orientation?.lock) {
      document.documentElement.requestFullscreen({ navigationUI: 'hide' })
        .then(() => screen.orientation.lock('landscape').catch(() => { })).catch(() => { });
    }
    window.removeEventListener('pointerdown', unlock);
  }, { once: true, passive: true });
}

// ============================================================================
//  键盘输入
// ============================================================================
function bindKeys() {
  addEventListener('keydown', (e) => {
    if (e.code in KEYMAP) { Keys[KEYMAP[e.code]] = true; e.preventDefault(); }
    if (e.code === 'KeyC' && state === 'play') rig.toggle();
    if (e.code === 'KeyE' && state === 'play' && nearBeacon >= 0) deliverToBeacon(nearBeacon);
    if (e.code === 'Enter') {
      if (state === 'title') startGame();
      else if (state === 'end') startGame();
    }
    if (e.code === 'Escape' && state === 'play') { /* Toy 内不退出，忽略 */ }
  });
  addEventListener('keyup', (e) => { if (e.code in KEYMAP) { Keys[KEYMAP[e.code]] = false; e.preventDefault(); } });
  addEventListener('blur', () => { for (const k in Keys) Keys[k] = false; for (const k in Touch) Touch[k] = false; });
}

// ============================================================================
//  初始化与主循环
// ============================================================================
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  // 竖屏保护：粗指针设备才提示
  UI.portrait.classList.toggle('show', h > w && IS_TOUCH);
}

function boot() {
  renderer = new THREE.WebGLRenderer({ canvas: $('gl'), antialias: !IS_TOUCH, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1) * (IS_TOUCH ? 0.8 : 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(66, 1, 0.1, 800);
  world = buildWorld(scene);
  sub = new Sub(scene);
  rig = new CameraRig(camera);
  rig.update(sub, 1);

  loadSave();
  bindKeys();
  bindTouch();
  UI.btnStart.addEventListener('click', startGame);
  UI.btnAgain.addEventListener('click', startGame);
  addEventListener('resize', resize);
  resize();

  UI.title.classList.add('show');
  window.game = { sub, world, progress, get state() { return state; }, start: startGame, deliver: deliverToBeacon };

  lastT = performance.now();
  requestAnimationFrame(loop);
}

function loop(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now; clock += dt;
  animateWorld(world, clock, dt);
  if (state === 'play') {
    sub.update(dt, input());
    checkInteractions(dt);
    updateInstruments();
  } else {
    sub.update(dt, {});   // 标题页缓慢浮动
  }
  rig.update(sub, dt);
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

boot();
