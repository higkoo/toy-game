/* 糖豆快吃 — 原创割绳物理解算
 * 逻辑坐标固定 720×1080，60Hz 定步长。
 * 这个文件不依赖渲染层，可在浏览器和 Node 中直接跑。
 */
(function (root) {
  'use strict';

  const W = 720;
  const H = 1080;
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function segPointDist(p, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const len2 = dx * dx + dy * dy || 1;
    const t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / len2, 0, 1);
    return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
  }

  function segmentsCross(a, b, c, d) {
    const cross = (p, q, r) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
    const x = cross(a, b, c), y = cross(a, b, d), z = cross(c, d, a), w = cross(c, d, b);
    if (((x > 0 && y < 0) || (x < 0 && y > 0)) && ((z > 0 && w < 0) || (z < 0 && w > 0))) {
      return true;
    }
    return (Math.abs(x) < 1e-7 && segPointDist(c, a, b) < 1e-7) ||
      (Math.abs(y) < 1e-7 && segPointDist(d, a, b) < 1e-7) ||
      (Math.abs(z) < 1e-7 && segPointDist(a, c, d) < 1e-7) ||
      (Math.abs(w) < 1e-7 && segPointDist(b, c, d) < 1e-7);
  }

  function pointInPolyline(p, pts, radius = 0) {
    for (let i = 1; i < pts.length; i++) {
      if (segPointDist(p, pts[i - 1], pts[i]) < radius) return true;
    }
    return false;
  }

  function makeCandy(level) {
    const x = Number(level.candy.x);
    const y = Number(level.candy.y);
    return { x, y, px: x, py: y, vx: 0, vy: 0, r: 19, rot: 0 };
  }

  class World {
    constructor(level) {
      this.level = level;
      this.width = W;
      this.height = H;
      this.time = 0;
      this.state = 'playing';
      this.reason = '';
      this.events = [];
      this.starsGot = 0;
      this.cuts = 0;
      this.padFlash = 0;
      this.bubbleFlash = 0;
      this.chew = 0;

      this.candy = makeCandy(level);
      this.anchors = (level.anchors || []).map((a) => ({
        ...a,
        x: Number(a.x),
        y: Number(a.y),
        baseX: Number(a.x),
        baseY: Number(a.y),
        _x: Number(a.x),
        _y: Number(a.y),
      }));
      this.ropes = this.anchors.map((anchor, index) => {
        const length = Number(anchor.length) || dist(this.candy, anchor) + 12;
        return { anchor, index, length, active: true, cutAt: null, snap: null };
      });
      this.stars = (level.stars || []).map((s, i) => ({
        ...s,
        id: i,
        got: false,
        pulse: Math.random() * TAU,
      }));
      this.spikes = (level.spikes || []).map((s) => ({
        ...s,
        r: Number(s.r) || 38,
        baseX: Number(s.x),
        baseY: Number(s.y),
        _x: Number(s.x),
        _y: Number(s.y),
      }));
      this.pads = (level.pads || []).map((p) => ({
        ...p,
        w: Number(p.w) || 180,
        angle: Number(p.angle) || 0,
        power: Number(p.power) || 1.15,
        flash: 0,
      }));
      this.bubbles = (level.bubbles || []).map((b) => ({
        ...b,
        x: Number(b.x),
        y: Number(b.y),
        r: Number(b.r) || 54,
        drift: Number(b.drift) || 0,
        lift: Number(b.lift) || 2.2,
        used: false,
        active: false,
        t: 0,
      }));
      this.activeBubble = null;
      this.goal = {
        x: Number(level.goal.x),
        y: Number(level.goal.y),
        r: 49,
      };
      this.updateAnchors(0);
    }

    activeRopes() {
      return this.ropes.filter((r) => r.active);
    }

    updateAnchors(dt) {
      for (const a of this.anchors) {
        if (a.orbit) {
          const o = a.orbit;
          const phase = Number(o.phase || 0) + this.time * Number(o.speed || 0);
          a._x = Number(o.cx) + Number(o.r) * Math.cos(phase);
          a._y = Number(o.cy) + Number(o.r) * Math.sin(phase);
        } else {
          a._x = a.baseX;
          a._y = a.baseY;
        }
        a.x = a._x;
        a.y = a._y;
      }
    }

    updateSpikes() {
      for (const s of this.spikes) {
        if (s.move) {
          const m = s.move;
          s._x = s.baseX + Number(m.x || 0) * Math.sin(this.time * Number(m.speed || 0.6) + Number(m.phase || 0));
          s._y = s.baseY + Number(m.y || 0) * Math.sin(this.time * Number(m.speed || 0.6) + Number(m.phase || 0));
          s.x = s._x;
          s.y = s._y;
        }
      }
    }

    reset() {
      this.constructor(this.level);
    }

    emit(type, x = this.candy.x, y = this.candy.y, extra = {}) {
      this.events.push({ type, x, y, ...extra });
    }

    ropePoints(rope, segments = 18) {
      const a = rope.anchor;
      const c = this.candy;
      const points = [];
      const d = dist(a, c);
      const sag = rope.active ? Math.max(0, Math.min(86, (rope.length - d) * 0.34)) : 0;
      const nx = c.x - a.x, ny = c.y - a.y;
      const len = Math.hypot(nx, ny) || 1;
      const px = -ny / len, py = nx / len;
      const midX = (a.x + c.x) / 2 + px * sag;
      const midY = (a.y + c.y) / 2 + py * sag + sag * 0.5;
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const u = 1 - t;
        points.push({
          x: u * u * a.x + 2 * u * t * midX + t * t * c.x,
          y: u * u * a.y + 2 * u * t * midY + t * t * c.y,
        });
      }
      return points;
    }

    cutSegment(x1, y1, x2, y2) {
      if (this.state !== 'playing') return 0;
      let count = 0;
      const a = { x: x1, y: y1 };
      const b = { x: x2, y: y2 };
      for (const rope of this.ropes) {
        if (!rope.active) continue;
        const pts = this.ropePoints(rope, 20);
        let hit = false;
        for (let i = 1; i < pts.length; i++) {
          if (segmentsCross(a, b, pts[i - 1], pts[i])) { hit = true; break; }
        }
        if (!hit) continue;
        rope.active = false;
        rope.cutAt = this.time;
        rope.snap = {
          points: pts,
          t: 0,
          dir: (Math.random() < 0.5 ? -1 : 1),
        };
        this.cuts += 1;
        count += 1;
        this.emit('cut', x1, y1, { x2, y2 });
      }
      return count;
    }

    tapBubble(x, y) {
      if (this.state !== 'playing' || !this.activeBubble) return false;
      if (Math.hypot(x - this.candy.x, y - this.candy.y) > 72) return false;
      const b = this.activeBubble;
      b.active = false;
      b.used = true;
      this.activeBubble = null;
      this.candy.vx *= 0.7;
      this.candy.vy = 1.5;
      this.bubbleFlash = 1;
      this.emit('pop', x, y);
      return true;
    }

    popBubbleAtTop() {
      if (!this.activeBubble) return;
      const b = this.activeBubble;
      b.active = false;
      b.used = true;
      this.activeBubble = null;
      this.candy.vy = 1.5;
      this.bubbleFlash = 1;
      this.emit('pop', this.candy.x, this.candy.y);
    }

    bouncePad(pad) {
      const c = this.candy;
      const ang = (pad.angle || 0) * Math.PI / 180;
      const dx = c.x - pad.x;
      const dy = c.y - pad.y;
      const lx = dx * Math.cos(ang) + dy * Math.sin(ang);
      const ly = -dx * Math.sin(ang) + dy * Math.cos(ang);
      const surface = 12;
      if (Math.abs(lx) > pad.w / 2) return false;
      if (ly < -surface || ly > surface + 18) return false;
      if (c.vy < 0 && ly < 2) return false;
      const speed = Math.max(18, Math.abs(c.vy)) * pad.power;
      const nx = -Math.sin(ang);
      const ny = -Math.cos(ang);
      c.x += nx * 4;
      c.y += ny * 4;
      c.vx = nx * speed * 0.8;
      c.vy = ny * speed;
      pad.flash = 1;
      this.emit('bounce', pad.x, pad.y);
      return true;
    }

    fail(reason) {
      if (this.state !== 'playing') return;
      this.state = 'lost';
      this.reason = reason;
      this.emit('lose', this.candy.x, this.candy.y, { reason });
    }

    win() {
      if (this.state !== 'playing') return;
      this.state = 'won';
      this.chew = 0.001;
      this.emit('win', this.goal.x, this.goal.y);
    }

    step(dt = 1 / 60) {
      if (this.state !== 'playing') {
        if (this.state === 'won') this.chew = Math.min(1, this.chew + dt * 1.8);
        this.padFlash = Math.max(0, this.padFlash - dt * 3);
        this.bubbleFlash = Math.max(0, this.bubbleFlash - dt * 3);
        return;
      }
      this.time += dt;
      this.updateAnchors(dt);
      this.updateSpikes();

      const c = this.candy;
      const b = this.activeBubble;
      if (b) {
        b.t += dt;
        b.x += b.drift * dt * 60;
        b.y -= b.lift * dt * 60;
        c.x = b.x;
        c.y = b.y;
        c.vx = 0;
        c.vy = 0;
        if (b.y < 132 || b.t > 7) this.popBubbleAtTop();
      } else {
        c.vy += 0.62;
        c.vx *= 0.9985;
        c.vy *= 0.9985;
        c.x += c.vx;
        c.y += c.vy;
      }

      // 绳约束：先拉回半径，再把径向速度削掉，保留切向摆荡。
      const active = this.activeRopes();
      for (let pass = 0; pass < 3; pass++) {
        for (const rope of active) {
          const a = rope.anchor;
          const dx = c.x - a.x;
          const dy = c.y - a.y;
          const d = Math.hypot(dx, dy);
          if (d <= rope.length || d < 0.001) continue;
          const nx = dx / d, ny = dy / d;
          const pull = d - rope.length;
          c.x -= nx * pull;
          c.y -= ny * pull;
          const radial = c.vx * nx + c.vy * ny;
          if (radial > 0) {
            c.vx -= radial * nx;
            c.vy -= radial * ny;
          }
        }
      }

      // 弹垫
      if (!this.activeBubble) {
        for (const pad of this.pads) {
          if (this.bouncePad(pad)) break;
        }
      }

      // 泡泡：绳索全部切断后才会接住糖果，避免和绳约束打架。
      if (!this.activeBubble && active.length === 0) {
        for (const bubble of this.bubbles) {
          if (bubble.used || bubble.active) continue;
          if (Math.hypot(c.x - bubble.x, c.y - bubble.y) < bubble.r - 4) {
            bubble.active = true;
            bubble.used = true;
            bubble.t = 0;
            bubble.x = c.x;
            bubble.y = c.y;
            this.activeBubble = bubble;
            c.vx = 0;
            c.vy = 0;
            this.emit('attach', c.x, c.y);
            break;
          }
        }
      }

      // 星星
      for (const s of this.stars) {
        if (s.got) continue;
        if (Math.hypot(c.x - s.x, c.y - s.y) < 39 + c.r * 0.35) {
          s.got = true;
          this.starsGot += 1;
          this.emit('star', s.x, s.y, { n: this.starsGot });
        }
      }

      // 尖刺
      for (const s of this.spikes) {
        if (Math.hypot(c.x - s.x, c.y - s.y) < s.r + 8) {
          this.fail('糖果碰到尖刺了，再试一次吧');
          return;
        }
      }

      // 糖豆的嘴
      if (Math.hypot(c.x - this.goal.x, c.y - this.goal.y) < this.goal.r) {
        this.win();
        return;
      }

      // 掉出场景
      if (c.y > H + 80 || c.y < -120 || c.x < -100 || c.x > W + 100) {
        this.fail('糖果飞走了，换个时机切绳吧');
        return;
      }

      // 动画衰减
      this.padFlash = Math.max(0, this.padFlash - dt * 3);
      this.bubbleFlash = Math.max(0, this.bubbleFlash - dt * 3);
      for (const pad of this.pads) pad.flash = Math.max(0, pad.flash - dt * 3);
      c.rot += Math.hypot(c.vx, c.vy) * 0.004;
    }
  }

  const api = { World, W, H, dist, segmentsCross, segPointDist, pointInPolyline };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.TangdouPhysics = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
