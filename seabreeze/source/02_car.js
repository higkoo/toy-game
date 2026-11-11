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
