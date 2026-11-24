(function () {
  'use strict';

  const { World, W, H } = window.TangdouPhysics;
  const LEVELS = window.TANGDOU_LEVELS;
  const STORAGE_KEY = 'tangdou-cut.progress.v1';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const frame = document.getElementById('frame');
  const hud = document.getElementById('hud');
  const screenTitle = document.getElementById('screenTitle');
  const screenLevels = document.getElementById('screenLevels');
  const screenResult = document.getElementById('screenResult');
  const screenPause = document.getElementById('screenPause');
  const levelGrid = document.getElementById('levelGrid');
  const titleBest = document.getElementById('titleBest');
  const totalStarsEl = document.getElementById('totalStars');
  const toastEl = document.getElementById('toast');

  const ui = {
    levelNo: document.getElementById('levelNo'),
    levelName: document.getElementById('levelName'),
    levelHint: document.getElementById('levelHint'),
    hudStars: Array.from(document.querySelectorAll('#hudStars .star')),
    btnSound: document.getElementById('btnSound'),
    btnRestart: document.getElementById('btnRestart'),
    btnPause: document.getElementById('btnPause'),
    btnLevels: document.getElementById('btnLevels'),
    btnStart: document.getElementById('btnStart'),
    btnTitleLevels: document.getElementById('btnTitleLevels'),
    btnCloseLevels: document.getElementById('btnCloseLevels'),
    btnResume: document.getElementById('btnResume'),
    btnPauseRestart: document.getElementById('btnPauseRestart'),
    btnPauseLevels: document.getElementById('btnPauseLevels'),
    btnResultLevels: document.getElementById('btnResultLevels'),
    btnResultNext: document.getElementById('btnResultNext'),
    btnResultReplay: document.getElementById('btnResultReplay'),
    resultKicker: document.getElementById('resultKicker'),
    resultTitle: document.getElementById('resultTitle'),
    resultText: document.getElementById('resultText'),
    resultStars: document.getElementById('resultStars'),
  };

  const progress = loadProgress();
  let soundOn = progress.sound !== false;
  let best = progress.best || {};
  let mode = 'title';
  let running = false;
  let world = null;
  let titleWorld = null;
  let levelIndex = 0;
  let pendingResult = null;
  let resultWin = null;
  let levelsOrigin = 'title';
  let playStartedAt = 0;
  let lastFrame = performance.now();
  let accumulator = 0;
  let shake = 0;
  let toastTimer = null;
  let particles = [];
  let trail = [];
  let pointer = { active: false, x: 0, y: 0, moved: 0, id: null };
  let tutorialDone = false;

  const ICONS = {
    sound: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5v5h3.5L13 18V6l-5.5 3.5H4z"/><path d="M16 9c1.2 1 1.2 5 0 6"/><path d="M19 6.5c3.2 3 3.2 8 0 11"/></svg>',
    soundOff: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5v5h3.5L13 18V6l-5.5 3.5H4z"/><path d="M16.5 9.5l5 5M21.5 9.5l-5 5"/></svg>',
    restart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8.5A7 7 0 1 1 4.5 14"/><path d="M5 4.5v4.2h4.2"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6.5v11M15 6.5v11"/></svg>',
    grid: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="5" width="5.5" height="5.5" rx="1.2"/><rect x="13.5" y="5" width="5.5" height="5.5" rx="1.2"/><rect x="5" y="13.5" width="5.5" height="5.5" rx="1.2"/><rect x="13.5" y="13.5" width="5.5" height="5.5" rx="1.2"/></svg>',
  };

  function loadProgress() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return {
        best: raw.best && typeof raw.best === 'object' ? raw.best : {},
        sound: raw.sound !== false,
      };
    } catch (e) {
      return { best: {}, sound: true };
    }
  }

  function saveProgress() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ best, sound: soundOn }));
    } catch (e) { /* 本机存储不可用时静默降级 */ }
  }

  function totalStars() {
    return Object.values(best).reduce((sum, v) => sum + Math.min(3, Math.max(0, Number(v) || 0)), 0);
  }

  function starsFor(id) {
    return Math.min(3, Math.max(0, Number(best[id]) || 0));
  }

  // ── Sound ─────────────────────────────────────────────────────────
  const sfx = {
    ac: null,
    ensure() {
      try {
        if (!this.ac) this.ac = new (window.AudioContext || window.webkitAudioContext)();
        if (this.ac.state === 'suspended') this.ac.resume();
      } catch (e) { this.ac = null; }
    },
    tone(freq, dur, type, gain, delay) {
      if (!soundOn || !this.ac) return;
      const t0 = this.ac.currentTime + (delay || 0);
      const osc = this.ac.createOscillator();
      const g = this.ac.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(gain || 0.06, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g).connect(this.ac.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    },
    play(name) {
      if (!soundOn) return;
      this.ensure();
      if (!this.ac) return;
      if (name === 'cut') {
        this.tone(880, .07, 'triangle', .045);
        this.tone(560, .1, 'triangle', .03, .04);
      } else if (name === 'star') {
        this.tone(980, .1, 'sine', .06);
        this.tone(1360, .16, 'sine', .045, .04);
      } else if (name === 'attach') {
        this.tone(440, .1, 'sine', .035);
        this.tone(660, .12, 'sine', .03, .05);
      } else if (name === 'pop') {
        this.tone(760, .07, 'triangle', .05);
        this.tone(300, .12, 'sine', .03, .04);
      } else if (name === 'bounce') {
        this.tone(180, .16, 'sine', .05);
        this.tone(360, .12, 'sine', .035, .05);
      } else if (name === 'win') {
        [523, 659, 784, 1046].forEach((f, i) => this.tone(f, .22, 'triangle', .055, i * .11));
      } else if (name === 'lose') {
        this.tone(330, .18, 'sine', .04);
        this.tone(220, .26, 'sine', .035, .14);
      } else if (name === 'click') {
        this.tone(620, .06, 'triangle', .035);
      }
    },
  };

  // ── Canvas / background ───────────────────────────────────────────
  function setupCanvas() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  const bgCanvas = document.createElement('canvas');
  bgCanvas.width = W;
  bgCanvas.height = H;
  const bg = bgCanvas.getContext('2d');
  renderBackground(bg);

  function roundRect(c, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + rr, y);
    c.arcTo(x + w, y, x + w, y + h, rr);
    c.arcTo(x + w, y + h, x, y + h, rr);
    c.arcTo(x, y + h, x, y, rr);
    c.arcTo(x, y, x + w, y, rr);
    c.closePath();
  }

  function seeded(i, salt) {
    const v = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
    return v - Math.floor(v);
  }

  function renderBackground(c) {
    // 天空
    const sky = c.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#ffe4be');
    sky.addColorStop(.34, '#fff0d6');
    sky.addColorStop(.67, '#fff8e9');
    sky.addColorStop(1, '#f4e7cc');
    c.fillStyle = sky;
    c.fillRect(0, 0, W, H);

    // 太阳光晕
    const sun = c.createRadialGradient(590, 142, 0, 590, 142, 300);
    sun.addColorStop(0, 'rgba(255,210,112,.55)');
    sun.addColorStop(.45, 'rgba(255,220,150,.2)');
    sun.addColorStop(1, 'rgba(255,230,180,0)');
    c.fillStyle = sun;
    c.fillRect(240, 0, 480, 470);
    c.fillStyle = 'rgba(255,206,94,.78)';
    c.beginPath();
    c.arc(590, 142, 54, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = 'rgba(255,242,200,.66)';
    c.beginPath();
    c.arc(576, 128, 19, 0, Math.PI * 2);
    c.fill();

    // 云
    drawCloud(c, 102, 160, 1.05, .52);
    drawCloud(c, 475, 92, .8, .38);
    drawCloud(c, 648, 250, .66, .28);
    drawCloud(c, 288, 72, .55, .24);

    // 远山
    c.fillStyle = '#d3e8d5';
    c.beginPath();
    c.moveTo(0, 770);
    c.bezierCurveTo(120, 690, 198, 735, 318, 686);
    c.bezierCurveTo(430, 644, 520, 724, 720, 650);
    c.lineTo(720, 1080);
    c.lineTo(0, 1080);
    c.closePath();
    c.fill();

    c.fillStyle = '#b9dcc7';
    c.beginPath();
    c.moveTo(0, 885);
    c.bezierCurveTo(130, 796, 235, 862, 348, 806);
    c.bezierCurveTo(486, 740, 590, 846, 720, 766);
    c.lineTo(720, 1080);
    c.lineTo(0, 1080);
    c.closePath();
    c.fill();

    // 前景草地
    const grass = c.createLinearGradient(0, 900, 0, 1080);
    grass.addColorStop(0, '#9bcfb4');
    grass.addColorStop(1, '#79b79d');
    c.fillStyle = grass;
    c.beginPath();
    c.moveTo(0, 985);
    c.bezierCurveTo(130, 930, 240, 988, 360, 960);
    c.bezierCurveTo(500, 925, 610, 980, 720, 930);
    c.lineTo(720, 1080);
    c.lineTo(0, 1080);
    c.closePath();
    c.fill();

    // 草地纹理
    c.strokeStyle = 'rgba(255,255,255,.16)';
    c.lineWidth = 2;
    for (let i = 0; i < 26; i++) {
      const x = seeded(i, 1) * W;
      const y = 962 + seeded(i, 2) * 105;
      c.beginPath();
      c.moveTo(x, y);
      c.quadraticCurveTo(x + 3, y - 12, x + 9, y - 16);
      c.stroke();
    }

    // 背景里的小糖果树
    drawLollipop(c, 78, 878, .8, -12);
    drawLollipop(c, 662, 930, .64, 12);
    drawCandyFlower(c, 39, 1010, .7);
    drawCandyFlower(c, 692, 1040, .55);

    // 柔和的中心光
    const focus = c.createRadialGradient(360, 500, 80, 360, 500, 520);
    focus.addColorStop(0, 'rgba(255,255,255,.18)');
    focus.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = focus;
    c.fillRect(0, 100, W, 940);

    // 装饰点
    for (let i = 0; i < 24; i++) {
      const x = seeded(i, 7) * W;
      const y = 110 + seeded(i, 11) * 720;
      c.fillStyle = i % 3 === 0 ? 'rgba(244,127,104,.22)' : i % 3 === 1 ? 'rgba(242,191,74,.30)' : 'rgba(142,214,192,.26)';
      c.beginPath();
      c.arc(x, y, 1.3 + seeded(i, 5) * 2.2, 0, Math.PI * 2);
      c.fill();
    }

    // 顶部与边缘暗角
    const vignette = c.createRadialGradient(W / 2, H * .45, H * .28, W / 2, H * .5, H * .82);
    vignette.addColorStop(0, 'rgba(74,42,28,0)');
    vignette.addColorStop(1, 'rgba(74,42,28,.16)');
    c.fillStyle = vignette;
    c.fillRect(0, 0, W, H);

    // 一条温暖的顶部压边，让 HUD 更稳
    c.fillStyle = 'rgba(255,251,241,.42)';
    c.fillRect(0, 0, W, 104);
  }

  function drawCloud(c, x, y, scale, alpha) {
    c.save();
    c.translate(x, y);
    c.scale(scale, scale);
    c.globalAlpha = alpha;
    c.fillStyle = '#fffdf8';
    const blobs = [
      [-48, 5, 32], [-16, -9, 40], [24, -4, 34], [54, 7, 25],
    ];
    for (const [bx, by, br] of blobs) {
      c.beginPath();
      c.ellipse(bx, by, br * 1.18, br * .72, 0, 0, Math.PI * 2);
      c.fill();
    }
    c.beginPath();
    c.ellipse(0, 12, 62, 17, 0, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  function drawLollipop(c, x, y, scale, tilt) {
    c.save();
    c.translate(x, y);
    c.scale(scale, scale);
    c.rotate((tilt || 0) * Math.PI / 180);
    c.strokeStyle = 'rgba(94,66,48,.3)';
    c.lineWidth = 7;
    c.beginPath();
    c.moveTo(0, 35);
    c.quadraticCurveTo(-8, 90, 4, 135);
    c.stroke();
    const pop = c.createRadialGradient(-8, -10, 2, 0, 0, 36);
    pop.addColorStop(0, '#fff0c7');
    pop.addColorStop(.36, '#f7bd7a');
    pop.addColorStop(1, '#e88370');
    c.fillStyle = pop;
    c.beginPath();
    c.arc(0, 0, 32, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = 'rgba(255,248,225,.8)';
    c.lineWidth = 3;
    c.beginPath();
    for (let a = 0; a < Math.PI * 4; a += .35) {
      const r = 3 + a * 1.6;
      const px = Math.cos(a) * Math.min(23, r);
      const py = Math.sin(a) * Math.min(23, r);
      if (a === 0) c.moveTo(px, py); else c.lineTo(px, py);
    }
    c.stroke();
    c.restore();
  }

  function drawCandyFlower(c, x, y, scale) {
    c.save();
    c.translate(x, y);
    c.scale(scale, scale);
    c.strokeStyle = 'rgba(73,123,95,.45)';
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(0, 0);
    c.quadraticCurveTo(-6, 32, 2, 60);
    c.stroke();
    c.fillStyle = '#fff9e9';
    for (let i = 0; i < 5; i++) {
      const a = i * Math.PI * 2 / 5 - .4;
      c.beginPath();
      c.ellipse(Math.cos(a) * 16, Math.sin(a) * 12 - 5, 9, 5, a, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = '#f5bd48';
    c.beginPath();
    c.arc(0, -5, 7, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  // ── Scene drawing ─────────────────────────────────────────────────
  const motes = Array.from({ length: 16 }, (_, i) => ({
    x: seeded(i, 21) * W,
    y: 120 + seeded(i, 31) * 780,
    r: 1.2 + seeded(i, 41) * 2.8,
    phase: seeded(i, 51) * Math.PI * 2,
    speed: .35 + seeded(i, 61) * .5,
  }));

  function drawScene(now) {
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    if (shake > 0) {
      ctx.translate((Math.random() - .5) * shake * 10, (Math.random() - .5) * shake * 8);
    }
    ctx.drawImage(bgCanvas, 0, 0);
    drawMotes(now / 1000);

    if (!world) {
      ctx.restore();
      return;
    }

    const t = now / 1000;
    const w = world;
    const title = mode === 'title';

    drawPads(w, t);
    drawSpikes(w, t);
    drawBubbleBacks(w, t);

    const hungry = w.state === 'won' || Math.hypot(w.candy.x - w.goal.x, w.candy.y - w.goal.y) < 260;
    drawMascot(ctx, w.goal.x, w.goal.y, t, {
      scale: title ? 1.06 : 1,
      mood: w.state === 'won' ? 'happy' : w.state === 'lost' ? 'sad' : 'hungry',
      hungry,
      chew: w.chew,
    });

    drawRopes(w, t);
    drawAnchors(w, t);
    drawStars(w, t);
    drawBubbleFronts(w, t);

    if (w.state !== 'won') drawCandy(ctx, w.candy.x, w.candy.y, w.candy.rot || 0, t);

    drawParticles();
    drawTrail();
    drawActionHint(w, now);
    ctx.restore();
  }

  function drawMotes(t) {
    for (const m of motes) {
      const x = m.x + Math.sin(t * m.speed + m.phase) * 18;
      const y = m.y + Math.cos(t * m.speed * .7 + m.phase) * 10;
      ctx.globalAlpha = .22 + .18 * Math.sin(t * 1.7 + m.phase);
      ctx.fillStyle = '#fff8dc';
      ctx.beginPath();
      ctx.arc(x, y, m.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawMascot(c, x, y, t, opts) {
    const o = opts || {};
    const scale = o.scale || 1;
    const mood = o.mood || 'idle';
    const hungry = o.hungry;
    const chew = o.chew || 0;
    const bob = Math.sin(t * 1.8) * 2.5;

    c.save();
    c.translate(x, y + bob);
    c.scale(scale, scale);

    // 影子
    c.fillStyle = 'rgba(63,54,40,.18)';
    c.beginPath();
    c.ellipse(0, 105, 88, 18, 0, 0, Math.PI * 2);
    c.fill();

    // 脚
    c.fillStyle = '#e77c68';
    for (const side of [-1, 1]) {
      c.beginPath();
      c.ellipse(side * 54, 94, 29, 17, side * .1, 0, Math.PI * 2);
      c.fill();
    }

    // 手臂
    c.fillStyle = '#f58f79';
    for (const side of [-1, 1]) {
      c.save();
      c.translate(side * 79, 25);
      c.rotate(side * .34 + Math.sin(t * 1.7 + side) * .05);
      c.beginPath();
      c.ellipse(0, 22, 19, 34, 0, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }

    // 耳朵
    c.fillStyle = '#ef806c';
    for (const side of [-1, 1]) {
      c.save();
      c.translate(side * 64, -79);
      c.rotate(side * -.34);
      c.beginPath();
      c.moveTo(-18, 10);
      c.quadraticCurveTo(-20, -15, 10, -14);
      c.quadraticCurveTo(22, 8, 4, 20);
      c.closePath();
      c.fill();
      c.fillStyle = '#ffb09e';
      c.beginPath();
      c.ellipse(0, 2, 11, 13, side * .2, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }

    // 身体
    const bodyGrad = c.createLinearGradient(-70, -120, 76, 100);
    bodyGrad.addColorStop(0, '#ffb19c');
    bodyGrad.addColorStop(.46, '#f9927b');
    bodyGrad.addColorStop(1, '#e87864');
    c.fillStyle = bodyGrad;
    c.beginPath();
    c.moveTo(-87, 22);
    c.quadraticCurveTo(-102, -50, -56, -92);
    c.quadraticCurveTo(-26, -120, 0, -116);
    c.quadraticCurveTo(26, -120, 56, -92);
    c.quadraticCurveTo(102, -50, 87, 22);
    c.quadraticCurveTo(78, 77, 43, 96);
    c.quadraticCurveTo(0, 112, -43, 96);
    c.quadraticCurveTo(-78, 77, -87, 22);
    c.closePath();
    c.fill();
    c.strokeStyle = 'rgba(112,55,43,.62)';
    c.lineWidth = 2;
    c.stroke();

    // 身体高光
    c.fillStyle = 'rgba(255,255,255,.16)';
    c.beginPath();
    c.ellipse(-39, -74, 30, 17, -.4, 0, Math.PI * 2);
    c.fill();

    // 肚皮
    const belly = c.createLinearGradient(0, 5, 0, 96);
    belly.addColorStop(0, '#fff0d3');
    belly.addColorStop(1, '#f9dbb6');
    c.fillStyle = belly;
    c.beginPath();
    c.ellipse(0, 48, 58, 57, 0, 0, Math.PI * 2);
    c.fill();

    // 呆毛
    c.save();
    c.translate(0, -114);
    c.rotate(-.12);
    c.fillStyle = '#64b99a';
    c.beginPath();
    c.moveTo(-3, 5);
    c.quadraticCurveTo(-23, -31, 7, -43);
    c.quadraticCurveTo(16, -18, 7, 4);
    c.closePath();
    c.fill();
    c.fillStyle = '#8ed6b9';
    c.beginPath();
    c.ellipse(2, -20, 4, 15, -.2, 0, Math.PI * 2);
    c.fill();
    c.restore();

    // 眼睛
    if (mood === 'happy') {
      c.strokeStyle = '#5d3027';
      c.lineWidth = 4;
      for (const side of [-1, 1]) {
        c.beginPath();
        c.arc(side * 36, -52, 16, Math.PI * 1.08, Math.PI * 1.92);
        c.stroke();
      }
    } else {
      for (const side of [-1, 1]) {
        c.fillStyle = '#fffdf4';
        c.beginPath();
        c.ellipse(side * 36, -54, 22, 25, side * -.05, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = 'rgba(112,55,43,.38)';
        c.lineWidth = 1.5;
        c.stroke();
        c.fillStyle = '#5b342a';
        const lookX = side * 2 + (mood === 'hungry' ? side * 2 : 0);
        c.beginPath();
        c.ellipse(side * 36 + lookX, -51, 9, 12, 0, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#fffdf6';
        c.beginPath();
        c.arc(side * 36 + lookX + 3, -56, 3.2, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = 'rgba(255,255,255,.7)';
        c.beginPath();
        c.ellipse(side * 36 - 7, -64, 5, 3, -.5, 0, Math.PI * 2);
        c.fill();
      }
    }

    // 腮红
    c.fillStyle = 'rgba(243,110,95,.26)';
    for (const side of [-1, 1]) {
      c.beginPath();
      c.ellipse(side * 61, -10, 13, 7, 0, 0, Math.PI * 2);
      c.fill();
    }

    // 嘴 / 目标点
    const open = mood === 'happy' ? 26 + Math.sin(chew * 8) * 5 : hungry ? 25 : 15;
    c.fillStyle = '#4a241e';
    c.beginPath();
    c.ellipse(0, 3, 32, open, 0, 0, Math.PI * 2);
    c.fill();
    if (open > 18) {
      c.fillStyle = '#f27f7b';
      c.beginPath();
      c.ellipse(0, 10, 20, open * .42, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#fff9e9';
      c.beginPath();
      c.roundRect(-11, -17, 10, 11, 2);
      c.fill();
    }

    c.restore();
  }

  function drawCandy(c, x, y, rot, t) {
    c.save();
    c.translate(x, y);
    c.rotate(rot);
    const wrapper = c.createLinearGradient(-40, 0, 40, 0);
    wrapper.addColorStop(0, '#e9a73e');
    wrapper.addColorStop(.45, '#ffd477');
    wrapper.addColorStop(1, '#e3932f');

    // 两端糖纸
    c.fillStyle = wrapper;
    c.strokeStyle = 'rgba(110,58,35,.6)';
    c.lineWidth = 1.6;
    for (const side of [-1, 1]) {
      c.beginPath();
      c.moveTo(side * 16, -8);
      c.lineTo(side * 38, -21);
      c.quadraticCurveTo(side * 46, 0, side * 38, 21);
      c.lineTo(side * 16, 8);
      c.closePath();
      c.fill();
      c.stroke();
      c.strokeStyle = 'rgba(255,248,210,.5)';
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(side * 22, -11);
      c.lineTo(side * 35, -14);
      c.moveTo(side * 22, 11);
      c.lineTo(side * 35, 14);
      c.stroke();
      c.strokeStyle = 'rgba(110,58,35,.6)';
    }

    // 糖身
    const body = c.createRadialGradient(-6, -10, 1, 0, 0, 26);
    body.addColorStop(0, '#ff9a7d');
    body.addColorStop(.35, '#f45f55');
    body.addColorStop(1, '#c43d3f');
    c.fillStyle = body;
    c.beginPath();
    c.arc(0, 0, 23, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = 'rgba(93,43,34,.72)';
    c.lineWidth = 2;
    c.stroke();

    // 高光与糖纸结
    c.fillStyle = 'rgba(255,255,255,.56)';
    c.beginPath();
    c.ellipse(-7, -10, 8, 4.5, -.7, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = 'rgba(255,241,193,.8)';
    c.beginPath();
    c.arc(7, 7, 3.2, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = 'rgba(255,235,175,.72)';
    c.lineWidth = 2.4;
    c.beginPath();
    c.arc(0, 0, 17, .2, 1.55);
    c.stroke();
    c.restore();
  }

  function drawRopes(w, t) {
    for (const rope of w.ropes) {
      if (!rope.active) continue;
      const pts = w.ropePoints(rope, 20);
      if (!pts.length) continue;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(83,51,36,.16)';
      ctx.lineWidth = 9;
      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        if (i === 0) ctx.moveTo(p.x, p.y + 2); else ctx.lineTo(p.x, p.y + 2);
      }
      ctx.stroke();

      ctx.strokeStyle = '#7a4a34';
      ctx.lineWidth = 5.5;
      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();

      ctx.strokeStyle = 'rgba(231,184,130,.72)';
      ctx.lineWidth = 1.3;
      ctx.setLineDash([4, 7]);
      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        if (i === 0) ctx.moveTo(p.x, p.y - 1); else ctx.lineTo(p.x, p.y - 1);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // 绳结小点
      ctx.fillStyle = 'rgba(255,226,174,.5)';
      for (let i = 2; i < pts.length - 1; i += 4) {
        ctx.beginPath();
        ctx.arc(pts[i].x, pts[i].y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 已断绳：短暂留一截断口
    for (const rope of w.ropes) {
      if (rope.active || !rope.snap) continue;
      const age = w.time - (rope.cutAt || 0);
      if (age > .32) continue;
      const pts = rope.snap.points;
      const mid = Math.floor(pts.length / 2);
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - age / .32) * .65;
      ctx.strokeStyle = '#7a4a34';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(pts[mid].x, pts[mid].y);
      ctx.quadraticCurveTo(pts[mid].x + rope.snap.dir * 13, pts[mid].y - 18, pts[mid].x + rope.snap.dir * 23, pts[mid].y - 9);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawAnchors(w, t) {
    for (const a of w.anchors) {
      if (a.orbit) {
        ctx.save();
        ctx.strokeStyle = 'rgba(94,66,48,.18)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([7, 8]);
        ctx.beginPath();
        ctx.arc(a.orbit.cx, a.orbit.cy, a.orbit.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }
      ctx.save();
      ctx.translate(a.x, a.y);
      // 木质挂钉
      ctx.fillStyle = 'rgba(64,42,30,.22)';
      ctx.beginPath();
      ctx.ellipse(2, 8, 14, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      const wood = ctx.createLinearGradient(-12, -12, 12, 12);
      wood.addColorStop(0, '#a97850');
      wood.addColorStop(.55, '#80563d');
      wood.addColorStop(1, '#5b3b2c');
      ctx.fillStyle = wood;
      ctx.beginPath();
      ctx.arc(0, 0, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(55,34,25,.55)';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,228,188,.32)';
      ctx.beginPath();
      ctx.ellipse(-4, -5, 5, 3, -.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3f281e';
      ctx.beginPath();
      ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#8ed6b9';
      ctx.beginPath();
      ctx.ellipse(10, -11, 7, 4, -.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawStars(w, t) {
    for (const s of w.stars) {
      if (s.got) continue;
      const bob = Math.sin(t * 2.4 + s.pulse) * 4;
      const rot = Math.sin(t * 1.7 + s.pulse) * .08;
      ctx.save();
      ctx.translate(s.x, s.y + bob);
      ctx.rotate(rot);
      ctx.shadowColor = 'rgba(255,206,84,.55)';
      ctx.shadowBlur = 18;
      const grad = ctx.createLinearGradient(0, -30, 0, 30);
      grad.addColorStop(0, '#fff1a9');
      grad.addColorStop(.55, '#f4bf4a');
      grad.addColorStop(1, '#dfa12f');
      ctx.fillStyle = grad;
      starPath(ctx, 0, 0, 29, 12.5);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(154,102,32,.3)';
      ctx.lineWidth = 1.3;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,235,.7)';
      ctx.beginPath();
      ctx.ellipse(-7, -10, 5, 7, -.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function starPath(c, x, y, outer, inner) {
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? outer : inner;
      const a = -Math.PI / 2 + i * Math.PI / 5;
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
    }
    c.closePath();
  }

  function drawSpikes(w, t) {
    for (const s of w.spikes) {
      if (s.move) {
        ctx.save();
        ctx.strokeStyle = 'rgba(94,66,48,.16)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 6]);
        ctx.beginPath();
        ctx.moveTo(s.baseX, s.baseY);
        ctx.lineTo(s.x, s.y);
        ctx.stroke();
        ctx.restore();
      }
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.fillStyle = 'rgba(53,42,32,.16)';
      ctx.beginPath();
      ctx.ellipse(0, 26, 58, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      // 三颗糖针
      for (const off of [-30, 0, 30]) {
        const top = off === 0 ? -40 : -31;
        const base = 26;
        const wdt = off === 0 ? 17 : 15;
        ctx.save();
        ctx.translate(off, 0);
        ctx.beginPath();
        ctx.moveTo(-wdt, base);
        ctx.lineTo(0, top);
        ctx.lineTo(wdt, base);
        ctx.closePath();
        ctx.fillStyle = '#fff2df';
        ctx.fill();
        ctx.strokeStyle = '#d2574c';
        ctx.lineWidth = 2;
        ctx.stroke();
        // 红白条纹
        ctx.save();
        ctx.clip();
        ctx.strokeStyle = '#e45e50';
        ctx.lineWidth = 6;
        for (let yy = -20; yy < 34; yy += 13) {
          ctx.beginPath();
          ctx.moveTo(-24, yy);
          ctx.lineTo(24, yy - 16);
          ctx.stroke();
        }
        ctx.restore();
        ctx.restore();
      }

      // 底座
      ctx.fillStyle = '#d95b4d';
      ctx.beginPath();
      ctx.roundRect(-55, 20, 110, 14, 7);
      ctx.fill();
      ctx.fillStyle = '#f08a73';
      ctx.beginPath();
      ctx.roundRect(-50, 21, 100, 5, 3);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawPads(w, t) {
    for (const p of w.pads) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle * Math.PI / 180);
      const flash = p.flash || 0;
      const squash = flash > 0 ? 1 + flash * .08 : 1;
      ctx.translate(0, 8 * flash);
      ctx.fillStyle = 'rgba(53,42,32,.14)';
      ctx.beginPath();
      ctx.ellipse(0, 44, p.w * .48, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      // 菌柄
      ctx.save();
      ctx.scale(1, squash);
      const stem = ctx.createLinearGradient(-20, 0, 20, 0);
      stem.addColorStop(0, '#f1cf9d');
      stem.addColorStop(.5, '#ffeccb');
      stem.addColorStop(1, '#e8bf87');
      ctx.fillStyle = stem;
      roundRect(ctx, -17, 8, 34, 39, 13);
      ctx.fill();
      ctx.strokeStyle = 'rgba(137,89,56,.3)';
      ctx.lineWidth = 1.3;
      ctx.stroke();

      // 菌盖
      const cap = ctx.createLinearGradient(0, -30, 0, 18);
      cap.addColorStop(0, '#ffd797');
      cap.addColorStop(.38, '#ffaf78');
      cap.addColorStop(1, '#e77b63');
      ctx.beginPath();
      ctx.moveTo(-p.w / 2, 8);
      ctx.quadraticCurveTo(-p.w / 2 + 8, -30, -p.w * .2, -25);
      ctx.quadraticCurveTo(0, -35, p.w * .2, -25);
      ctx.quadraticCurveTo(p.w / 2 - 8, -30, p.w / 2, 8);
      ctx.quadraticCurveTo(p.w / 2 - 12, 18, 0, 20);
      ctx.quadraticCurveTo(-p.w / 2 + 12, 18, -p.w / 2, 8);
      ctx.closePath();
      ctx.fillStyle = cap;
      ctx.fill();
      ctx.strokeStyle = 'rgba(135,71,52,.34)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 菌盖斑点与高光
      ctx.fillStyle = 'rgba(255,248,218,.82)';
      for (const [x, y, r] of [[-p.w * .27, -7, 6], [0, -15, 4.5], [p.w * .22, -4, 5]]) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = 'rgba(255,255,255,.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 2, p.w * .38, Math.PI * 1.08, Math.PI * 1.45);
      ctx.stroke();
      ctx.restore();
      ctx.restore();
    }
  }

  function drawBubbleBacks(w, t) {
    for (const b of w.bubbles) {
      if (b.used && !b.active) continue;
      const active = b.active;
      const x = active ? w.candy.x : b.x;
      const y = active ? w.candy.y : b.y + Math.sin(t * 2.2 + b.x) * 5;
      const r = active ? 59 : b.r;
      const grad = ctx.createRadialGradient(x - r * .25, y - r * .35, 2, x, y, r);
      grad.addColorStop(0, 'rgba(255,255,255,.56)');
      grad.addColorStop(.38, 'rgba(192,236,255,.18)');
      grad.addColorStop(.86, 'rgba(152,216,240,.13)');
      grad.addColorStop(1, 'rgba(235,253,255,.02)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawBubbleFronts(w, t) {
    for (const b of w.bubbles) {
      if (b.used && !b.active) continue;
      const active = b.active;
      const x = active ? w.candy.x : b.x;
      const y = active ? w.candy.y : b.y + Math.sin(t * 2.2 + b.x) * 5;
      const r = active ? 59 : b.r;
      ctx.save();
      ctx.strokeStyle = 'rgba(245,255,255,.7)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(173,221,241,.55)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, r - 4, .4, 2.4);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.72)';
      ctx.beginPath();
      ctx.ellipse(x - r * .28, y - r * .42, r * .22, r * .08, -.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.42)';
      ctx.beginPath();
      ctx.arc(x + r * .38, y + r * .28, 4.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (active) {
        const pulse = .5 + .5 * Math.sin(t * 4);
        ctx.save();
        ctx.strokeStyle = `rgba(255,250,223,${.3 + pulse * .25})`;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 8]);
        ctx.beginPath();
        ctx.arc(x, y, r + 10 + pulse * 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = 'rgba(61,42,32,.7)';
        ctx.font = '600 15px "PingFang SC","Noto Sans CJK SC",sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('点破泡泡', x, y - r - 20);
        ctx.restore();
      }
    }
  }

  function drawActionHint(w, now) {
    if (mode !== 'play' || w.state !== 'playing') return;
    if (levelIndex === 0 && now - playStartedAt < 5200 && !tutorialDone) {
      const alpha = .55 + Math.sin((now - playStartedAt) / 300) * .18;
      ctx.save();
      ctx.globalAlpha = Math.min(1, (now - playStartedAt) / 400) * alpha;
      ctx.strokeStyle = 'rgba(94,66,48,.52)';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([10, 10]);
      ctx.beginPath();
      ctx.moveTo(170, 263);
      ctx.quadraticCurveTo(360, 240, 545, 263);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(545, 263);
      ctx.lineTo(532, 253);
      ctx.lineTo(532, 273);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  function drawParticles() {
    for (const p of particles) {
      const a = Math.max(0, p.life / p.max);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot || 0);
      if (p.type === 'star') {
        ctx.fillStyle = p.color || '#ffd25c';
        starPath(ctx, 0, 0, p.size, p.size * .45);
        ctx.fill();
      } else if (p.type === 'confetti') {
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size * .5, -p.size * .22, p.size, p.size * .44);
      } else if (p.type === 'ring') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, p.size * (1 + (1 - a) * .8), 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawTrail() {
    if (!trail.length) return;
    const now = performance.now();
    const fresh = trail.filter((p) => now - p.t < 430);
    trail = fresh;
    if (!fresh.length) return;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,255,244,.72)';
    ctx.shadowColor = 'rgba(142,214,192,.65)';
    ctx.shadowBlur = 12;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    for (let i = 0; i < fresh.length; i++) {
      if (i === 0) ctx.moveTo(fresh[i].x, fresh[i].y); else ctx.lineTo(fresh[i].x, fresh[i].y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
    for (const p of fresh) {
      const age = (now - p.t) / 430;
      ctx.globalAlpha = (1 - age) * .7;
      ctx.fillStyle = '#fffbe8';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // ── Particles ─────────────────────────────────────────────────────
  function spawn(type, x, y, opts) {
    const o = opts || {};
    particles.push({
      type, x, y,
      vx: o.vx || 0,
      vy: o.vy || 0,
      size: o.size || 3,
      color: o.color || '#ffd25c',
      max: o.life || .6,
      life: o.life || .6,
      grav: o.grav === undefined ? 0 : o.grav,
      rot: o.rot || 0,
      spin: o.spin || 0,
    });
  }

  function burstCut(x1, y1, x2, y2) {
    for (let i = 0; i < 12; i++) {
      const t = Math.random();
      spawn('spark', x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, {
        vx: (Math.random() - .5) * 6,
        vy: -1 - Math.random() * 4,
        size: 1.2 + Math.random() * 2,
        color: 'rgba(255,235,175,.9)',
        life: .35 + Math.random() * .35,
        grav: 3,
      });
    }
  }

  function burstStar(x, y) {
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 2 + Math.random() * 2.2;
      spawn('star', x, y, {
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 1,
        size: 3 + Math.random() * 3,
        color: i % 2 ? '#ffe899' : '#ffc143',
        life: .55 + Math.random() * .35,
        grav: 2,
      });
    }
    spawn('ring', x, y, { size: 33, color: 'rgba(255,211,91,.7)', life: .55 });
  }

  function burstBubble(x, y) {
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * Math.PI * 2;
      spawn('bubble', x, y, {
        vx: Math.cos(a) * (2 + Math.random() * 4),
        vy: Math.sin(a) * (2 + Math.random() * 4) - 1,
        size: 2 + Math.random() * 5,
        color: 'rgba(220,252,255,.85)',
        life: .45 + Math.random() * .45,
        grav: -1.5,
      });
    }
  }

  function burstBounce(x, y) {
    for (let i = 0; i < 8; i++) {
      spawn('spark', x + (Math.random() - .5) * 100, y, {
        vx: (Math.random() - .5) * 4,
        vy: -3 - Math.random() * 4,
        size: 2 + Math.random() * 2,
        color: 'rgba(142,214,192,.9)',
        life: .4 + Math.random() * .2,
        grav: 3,
      });
    }
  }

  function burstWin() {
    const colors = ['#f47f68', '#f2bf4a', '#8ed6c0', '#fff2c5', '#d58a6a'];
    for (let i = 0; i < 48; i++) {
      spawn('confetti', world.goal.x + (Math.random() - .5) * 260, world.goal.y - 20, {
        vx: (Math.random() - .5) * 8,
        vy: -4 - Math.random() * 9,
        size: 4 + Math.random() * 5,
        color: colors[i % colors.length],
        life: 1.4 + Math.random() * .8,
        grav: 4,
        rot: Math.random() * Math.PI,
        spin: (Math.random() - .5) * 5,
      });
    }
    for (let i = 0; i < 14; i++) {
      spawn('star', world.goal.x + (Math.random() - .5) * 250, world.goal.y - 30, {
        vx: (Math.random() - .5) * 7,
        vy: -2 - Math.random() * 7,
        size: 3 + Math.random() * 3,
        color: '#ffe88e',
        life: .9 + Math.random() * .6,
        grav: 3,
      });
    }
  }

  function burstLose() {
    for (let i = 0; i < 12; i++) {
      spawn('spark', world.candy.x, world.candy.y, {
        vx: (Math.random() - .5) * 5,
        vy: (Math.random() - .5) * 5,
        size: 2 + Math.random() * 3,
        color: 'rgba(144,111,88,.55)',
        life: .5 + Math.random() * .3,
        grav: 2,
      });
    }
  }

  // ── Game state ───────────────────────────────────────────────────
  function makeTitleWorld() {
    return new World({
      id: 0, name: '糖豆快吃', hint: '',
      candy: { x: 500, y: 330 },
      anchors: [{ x: 500, y: 180, length: 165 }],
      stars: [{ x: 500, y: 480 }, { x: 500, y: 610 }, { x: 500, y: 735 }],
      goal: { x: 500, y: 930 },
    });
  }

  function setHudVisible(visible) {
    hud.classList.toggle('is-hidden', !visible);
    hud.setAttribute('aria-hidden', visible ? 'false' : 'true');
  }

  function updateHud() {
    const lv = LEVELS[levelIndex] || LEVELS[0];
    ui.levelNo.textContent = String(lv.id).padStart(2, '0');
    ui.levelName.textContent = lv.name;
    ui.levelHint.textContent = lv.hint;
    for (let i = 0; i < ui.hudStars.length; i++) {
      ui.hudStars[i].classList.toggle('is-on', i < (world ? world.starsGot : 0));
    }
    if (soundOn) { ui.btnSound.innerHTML = ICONS.sound; ui.btnSound.classList.remove('is-off'); }
    else { ui.btnSound.innerHTML = ICONS.soundOff; ui.btnSound.classList.add('is-off'); }
    titleBest.textContent = `${totalStars()} / 36 ★`;
    totalStarsEl.textContent = String(totalStars());
  }

  function hideScreens() {
    screenTitle.classList.add('is-hidden');
    screenLevels.classList.add('is-hidden');
    screenResult.classList.add('is-hidden');
    screenPause.classList.add('is-hidden');
  }

  function showTitle() {
    mode = 'title';
    running = false;
    levelIndex = 0;
    pendingResult = null;
    world = makeTitleWorld();
    titleWorld = world;
    hideScreens();
    screenTitle.classList.remove('is-hidden');
    setHudVisible(false);
    buildLevelGrid();
    updateHud();
    trail = [];
    particles = [];
    clearToast();
  }

  function startLevel(index) {
    const i = Math.max(0, Math.min(LEVELS.length - 1, Number(index) || 0));
    sfx.ensure();
    levelIndex = i;
    world = new World(LEVELS[i]);
    titleWorld = world;
    running = true;
    mode = 'play';
    pendingResult = null;
    resultWin = null;
    playStartedAt = performance.now();
    tutorialDone = false;
    accumulator = 0;
    shake = 0;
    particles = [];
    trail = [];
    hideScreens();
    setHudVisible(true);
    updateHud();
    buildLevelGrid();
    toast(LEVELS[i].hint, 2800);
    sfx.play('click');
  }

  function restartLevel() {
    startLevel(levelIndex);
  }

  function nextLevel() {
    if (levelIndex >= LEVELS.length - 1) startLevel(0);
    else startLevel(levelIndex + 1);
  }

  function scheduleResult(win) {
    if (pendingResult) return;
    resultWin = win;
    pendingResult = {
      win,
      at: performance.now() + (win ? 900 : 470),
    };
  }

  function showResult(win) {
    mode = 'result';
    running = win;
    hideScreens();
    screenResult.classList.remove('is-hidden');
    setHudVisible(true);
    ui.resultKicker.textContent = win ? 'LEVEL CLEAR' : 'TRY AGAIN';
    ui.resultTitle.textContent = win ? '糖豆吃饱啦' : '差一点点';
    const got = win ? world.starsGot : 0;
    Array.from(ui.resultStars.children).forEach((el, i) => {
      el.classList.toggle('on', i < got);
    });
    if (win) {
      const msgs = [
        '糖豆吃到了，但星星全漏掉了，再试一次？',
        '糖豆吃到了，还有两颗星星在等你。',
        '糖豆吃到了，只差一颗星星就完美了。',
        '三星通关，糖豆开心得转了个圈。',
      ];
      ui.resultText.textContent = msgs[Math.min(3, got)];
      ui.btnResultNext.innerHTML = levelIndex >= LEVELS.length - 1 ? '回到第一关 <span>→</span>' : '下一关 <span>→</span>';
      ui.btnResultReplay.classList.remove('is-hidden');
    } else {
      ui.resultText.textContent = world.reason || '糖果没有送到嘴里，再试一次吧。';
      ui.btnResultNext.innerHTML = '再试一次 <span>→</span>';
      ui.btnResultReplay.classList.add('is-hidden');
    }
    updateHud();
    if (win) {
      best[LEVELS[levelIndex].id] = Math.max(starsFor(LEVELS[levelIndex].id), got);
      saveProgress();
    }
  }

  function showPause() {
    if (mode !== 'play') return;
    mode = 'pause';
    running = false;
    clearToast();
    screenPause.classList.remove('is-hidden');
  }

  function resumePause() {
    if (mode !== 'pause') return;
    screenPause.classList.add('is-hidden');
    mode = 'play';
    running = true;
    accumulator = 0;
  }

  function openLevels(origin) {
    levelsOrigin = origin || mode;
    mode = 'levels';
    running = false;
    clearToast();
    hideScreens();
    screenLevels.classList.remove('is-hidden');
    buildLevelGrid();
    updateHud();
  }

  function closeLevels() {
    screenLevels.classList.add('is-hidden');
    if (levelsOrigin === 'title') {
      showTitle();
    } else if (levelsOrigin === 'pause') {
      mode = 'pause';
      screenPause.classList.remove('is-hidden');
    } else if (levelsOrigin === 'result') {
      mode = 'result';
      screenResult.classList.remove('is-hidden');
      running = !!resultWin;
      setHudVisible(true);
    } else {
      mode = 'play';
      running = true;
      accumulator = 0;
      setHudVisible(true);
    }
  }

  function buildLevelGrid() {
    levelGrid.innerHTML = '';
    LEVELS.forEach((lv, i) => {
      const b = document.createElement('button');
      b.className = 'level-card' + (i === levelIndex && mode !== 'title' ? ' is-current' : '');
      b.type = 'button';
      b.innerHTML = `<span class="num">${String(lv.id).padStart(2, '0')}</span><span class="name">${lv.name}</span><div class="mini-stars">${[0, 1, 2].map((n) => `<i class="${n < starsFor(lv.id) ? 'on' : ''}">★</i>`).join('')}</div>`;
      b.addEventListener('click', () => startLevel(i));
      levelGrid.appendChild(b);
    });
  }

  function toast(text, ms) {
    if (!text) return;
    clearToast();
    toastEl.textContent = text;
    toastEl.classList.remove('is-hidden');
    requestAnimationFrame(() => toastEl.classList.add('is-show'));
    toastTimer = setTimeout(() => {
      toastEl.classList.remove('is-show');
      setTimeout(() => toastEl.classList.add('is-hidden'), 240);
    }, ms || 2400);
  }

  function clearToast() {
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = null;
    toastEl.classList.remove('is-show');
    toastEl.classList.add('is-hidden');
  }

  function handleEvents() {
    const w = world;
    if (!w) return;
    const now = performance.now();
    for (const e of w.events) {
      if (e.type === 'cut') {
        burstCut(e.x, e.y, e.x2, e.y2);
        sfx.play('cut');
      } else if (e.type === 'star') {
        burstStar(e.x, e.y);
        sfx.play('star');
        updateHud();
      } else if (e.type === 'attach') {
        burstBubble(e.x, e.y);
        sfx.play('attach');
        toast('泡泡接住了糖果，点破它', 2200);
      } else if (e.type === 'pop') {
        burstBubble(e.x, e.y);
        sfx.play('pop');
      } else if (e.type === 'bounce') {
        burstBounce(e.x, e.y);
        sfx.play('bounce');
      } else if (e.type === 'win') {
        burstWin();
        sfx.play('win');
        clearToast();
        scheduleResult(true);
      } else if (e.type === 'lose') {
        burstLose();
        sfx.play('lose');
        clearToast();
        shake = 1;
        scheduleResult(false);
      }
    }
    w.events.length = 0;
    if (mode === 'play' && now - playStartedAt > 6000) tutorialDone = true;
  }

  function update(dt) {
    if (!world) return;
    if (running && world.state === 'playing') {
      accumulator = Math.min(accumulator + dt, .2);
      while (accumulator >= 1 / 60) {
        world.step(1 / 60);
        handleEvents();
        accumulator -= 1 / 60;
        if (world.state !== 'playing') break;
      }
    } else if (running && world.state === 'won') {
      world.step(1 / 60);
    }
    if (pendingResult && performance.now() >= pendingResult.at) {
      const win = pendingResult.win;
      pendingResult = null;
      showResult(win);
    }
    if (shake > 0) shake = Math.max(0, shake - dt * 2.4);
    // 粒子
    if (mode !== 'pause' && mode !== 'levels') {
      const f = dt * 60;
      for (const p of particles) {
        p.x += p.vx * f;
        p.y += p.vy * f;
        p.vy += p.grav * f;
        p.rot += p.spin * f;
        p.life -= dt;
      }
      particles = particles.filter((p) => p.life > 0);
    }
  }

  function frameLoop(now) {
    const dt = Math.min(.05, Math.max(.001, (now - lastFrame) / 1000));
    lastFrame = now;
    update(dt);
    drawScene(now);
    requestAnimationFrame(frameLoop);
  }

  // ── Input ─────────────────────────────────────────────────────────
  function canvasPoint(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * W,
      y: ((e.clientY - rect.top) / rect.height) * H,
    };
  }

  canvas.addEventListener('pointerdown', (e) => {
    if (mode !== 'play' || !world || world.state !== 'playing') return;
    sfx.ensure();
    const p = canvasPoint(e);
    pointer = { active: true, x: p.x, y: p.y, moved: 0, id: e.pointerId };
    canvas.setPointerCapture(e.pointerId);
    trail = [{ x: p.x, y: p.y, t: performance.now() }];
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!pointer.active || mode !== 'play' || !world) return;
    const p = canvasPoint(e);
    const d = Math.hypot(p.x - pointer.x, p.y - pointer.y);
    if (d < .8) return;
    world.cutSegment(pointer.x, pointer.y, p.x, p.y);
    trail.push({ x: p.x, y: p.y, t: performance.now() });
    if (trail.length > 80) trail.shift();
    pointer.x = p.x;
    pointer.y = p.y;
    pointer.moved += d;
  });

  function endPointer(e) {
    if (!pointer.active) return;
    const p = canvasPoint(e);
    if (pointer.moved < 9 && mode === 'play' && world && world.state === 'playing') {
      world.tapBubble(p.x, p.y);
    }
    pointer.active = false;
    pointer.id = null;
  }

  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', () => {
    pointer.active = false;
    pointer.id = null;
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'r' || e.key === 'R') {
      if (mode === 'play' || mode === 'pause' || mode === 'result') {
        e.preventDefault();
        restartLevel();
      }
    } else if (e.key === 'Escape') {
      if (mode === 'pause') { e.preventDefault(); resumePause(); }
      else if (mode === 'play') { e.preventDefault(); showPause(); }
      else if (mode === 'levels') { e.preventDefault(); closeLevels(); }
    } else if (e.code === 'Space') {
      if (mode === 'play' || mode === 'pause') { e.preventDefault(); togglePause(); }
    }
  });

  function togglePause() {
    if (mode === 'play') showPause();
    else if (mode === 'pause') resumePause();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && mode === 'play') showPause();
  });

  // ── Buttons ───────────────────────────────────────────────────────
  ui.btnSound.innerHTML = ICONS.sound;
  ui.btnRestart.innerHTML = ICONS.restart;
  ui.btnPause.innerHTML = ICONS.pause;
  ui.btnLevels.innerHTML = ICONS.grid;

  ui.btnStart.addEventListener('click', () => startLevel(0));
  ui.btnTitleLevels.addEventListener('click', () => openLevels('title'));
  ui.btnRestart.addEventListener('click', restartLevel);
  ui.btnPause.addEventListener('click', togglePause);
  ui.btnLevels.addEventListener('click', () => openLevels('play'));
  ui.btnSound.addEventListener('click', () => {
    soundOn = !soundOn;
    saveProgress();
    updateHud();
    if (soundOn) { sfx.ensure(); sfx.play('click'); }
  });
  ui.btnCloseLevels.addEventListener('click', closeLevels);
  ui.btnResume.addEventListener('click', resumePause);
  ui.btnPauseRestart.addEventListener('click', restartLevel);
  ui.btnPauseLevels.addEventListener('click', () => openLevels('pause'));
  ui.btnResultLevels.addEventListener('click', () => openLevels('result'));
  ui.btnResultNext.addEventListener('click', () => {
    if (resultWin) nextLevel(); else restartLevel();
  });
  ui.btnResultReplay.addEventListener('click', restartLevel);

  // 关卡卡片点击后，可能还在 levels 模式里，startLevel 会自动隐藏面板。
  // 标题页的装饰点击不拦截。
  screenTitle.addEventListener('click', (e) => {
    if (e.target.closest('button')) return;
    // 标题页空白处不做操作，避免误触。
  });

  window.__TANGDOU_DEBUG__ = {
    get mode() { return mode; },
    get world() { return world; },
    get levelIndex() { return levelIndex; },
    startLevel,
    restartLevel,
    cutRope(index) {
      if (!world) return false;
      const r = world.ropes[index];
      if (!r) return false;
      const pts = world.ropePoints(r);
      const mid = pts[Math.floor(pts.length / 2)];
      return world.cutSegment(r.anchor.x, r.anchor.y, mid.x, mid.y);
    },
    tapBubble() {
      if (!world) return false;
      return world.tapBubble(world.candy.x, world.candy.y);
    },
    get stars() { return world ? world.starsGot : 0; },
  };

  // ── Boot ─────────────────────────────────────────────────────────
  setupCanvas();
  window.addEventListener('resize', () => {
    setupCanvas();
  });
  // Resize the backing store on DPR changes (e.g. moving between monitors).
  if (window.ResizeObserver) {
    new ResizeObserver(() => setupCanvas()).observe(frame);
  }
  updateHud();
  showTitle();
  requestAnimationFrame((t) => {
    lastFrame = t;
    requestAnimationFrame(frameLoop);
  });
})();
