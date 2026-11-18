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

// 把存档里的灯塔电量同步到场景与 HUD；开局和读档都走这里
function applyLights() {
  if (!world || !Array.isArray(world.beacons)) return;
  world.beacons.forEach((b, i) => {
    const c = Math.max(0, Math.min(NEED_PER_BEACON, Math.floor(Number(progress.lights[i]) || 0)));
    progress.lights[i] = c;
    const u = b.userData, lit = c / NEED_PER_BEACON;
    u.charge = c;
    u.rings.forEach((r, k) => r.material.opacity = (k / NEED_PER_BEACON < lit) ? 0.95 : 0.06);
    u.lampMat.opacity = 0.08 + lit * 0.72;
    u.beamMat.opacity = c >= NEED_PER_BEACON ? 0.3 : lit * 0.16;
  });
  updateHUD();
}

function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    if (Number.isFinite(Number(s.best))) progress.best = Math.max(0, Number(s.best));
    if (Array.isArray(s.lights) && s.lights.length === BEACON_TOTAL) {
      progress.lights = s.lights.map(v => Math.max(0, Math.min(NEED_PER_BEACON, Math.floor(Number(v) || 0))));
    }
  } catch (e) { }
  applyLights();
}

function saveProgress() {
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
  // 灯塔电量来自存档，不再每局清零
  applyLights();
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
  saveProgress();
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
  if (won) {
    // 通关后清空灯塔进度，下一局从零开始；最好成绩保留
    progress.lights = [0, 0, 0];
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ best: progress.best, lights: progress.lights })); } catch (e) { }
  } else {
    saveProgress();
  }
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
