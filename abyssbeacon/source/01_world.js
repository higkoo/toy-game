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
