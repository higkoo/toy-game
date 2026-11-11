// ---- 05 input.js ----
// ============================================================================
//  键鼠与触屏
// ============================================================================

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
    rot.classList.toggle('show', portrait && matchMedia('(pointer: coarse)').matches);
  };
  addEventListener('resize', check);
  addEventListener('orientationchange', check);
  check();
}

let game = null;
if (document.readyState === 'loading') addEventListener('DOMContentLoaded', boot);
else boot();
