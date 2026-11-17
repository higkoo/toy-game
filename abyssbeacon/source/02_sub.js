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
