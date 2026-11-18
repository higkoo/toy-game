
class Biq {
  constructor() { this.b0 = 1; this.b1 = 0; this.b2 = 0; this.a1 = 0; this.a2 = 0; this.x1 = 0; this.x2 = 0; this.y1 = 0; this.y2 = 0; }
  set(type, f, q, fs, gainDb) {
    f = Math.min(Math.max(f, 10), fs * 0.45);
    const w = 2 * Math.PI * f / fs, cs = Math.cos(w), sn = Math.sin(w), al = sn / (2 * q);
    let b0, b1, b2, a0, a1, a2;
    if (type === 0) { b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = b0; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; }       // lowpass
    else if (type === 1) { b0 = al; b1 = 0; b2 = -al; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; }             // bandpass (0 dB peak)
    else if (type === 2) { b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = b0; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; } // highpass
    else { const A = Math.pow(10, (gainDb || 0) / 40); b0 = 1 + al * A; b1 = -2 * cs; b2 = 1 - al * A; a0 = 1 + al / A; a1 = -2 * cs; a2 = 1 - al / A; } // peaking
    this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0; this.a1 = a1 / a0; this.a2 = a2 / a0;
  }
  run(x) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y;
    return y;
  }
}
class EngineDSP {
  constructor(fs) {
    this.fs = fs; this.idt = 1 / fs;
    this.tgt = { rpm: 0, load: 0, thr: 0, boost: 0, on: 0, starter: 0, cut: 0, gain: 1, pops: 0, sc: 0, scA: 1, ext: 0, seqStamp: 0, seqDelay: 0, seqTime: 0, seqTone: 0, fastShift: 0 };
    this.scN = 0; this.scQ = 0; this.scW = 0; this.scA = 1;
    this.seqN = 0; this.seqDelay = 0; this.seqLeft = 0; this.seqToneLeft = 0; this.seqGate = 1;
    this.c = { rpm: 0, load: 0, thr: 0, boost: 0, on: 0, starter: 0, cut: 0, gain: 1 };
    this.sd = 0x2545F491;
    this.cyc = 0; this.slot = 0; this.nextPos = 0.05;
    this.P = new Float32Array(16 * 6); this.np = 0;   // pulses: t, tau, amp, noise, bank, alive
    this.wg = [new Float32Array(4096), new Float32Array(4096)]; this.wi = 0; this.wlp = [0, 0];
    this.lp1 = new Biq(); this.lp2 = new Biq(); this.boom = new Biq(); this.body = new Biq();
    this.inBp = new Biq(); this.tbHp = new Biq(); this.bovBp = new Biq(); this.mechHp = new Biq(); this.raspBp = new Biq(); this.lump = 1; this.rot = false; this.dcx = 0; this.dcy = 0;
    this.popBp = new Biq(); this.flBp = new Biq(); this.wgHp = new Biq(); this.tk = false; this.flut = 0; this.flT = 9; this.wgE = 0;
    this.jit = 0; this.lfo = 0; this.tPh = 0; this.whPh = 0; this.stPh = 0; this.env = 0;
    this.bov = 0; this.bovT = 9; this.prevThr = 0; this.overrun = 0; this.thrHi = 0;
    this.lastOut = 0; this.blockN = 0;
    this.setup('i6');
  }
  rnd() { let x = this.sd; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; this.sd = x; return (x >>> 0) / 4294967296; }
  setup(kind) {
    const N = kind === 'v12' ? 12 : kind === 'v8' ? 8 : kind === 'i4' || kind === 'r2' ? 4 : 6;
    this.rot = kind === 'r2';   // twin rotor: 4 even exhaust events per 720 deg, a peripheral port that snaps open
    this.kind = kind; this.slot = 0; this.cyc = 0; this.nextPos = 0.5 / N;
    this.N = N; this.turbo = kind === 'v12' || ((kind === 'v8' || kind === 'r2' || kind === 'i6h') && !!this.tk);
    // firing slots (cycle fraction), bank of each slot, per-cylinder amplitude & timing offsets
    this.bank = []; this.amp = []; this.off = [];
    const bankPat = kind === 'v12' ? [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1] : kind === 'v8' ? [0, 1, 1, 0, 1, 0, 0, 1] : (kind === 'i6' || kind === 'i6h' ? [0, 1, 0, 1, 0, 1] : kind === 'r2' ? [0, 1, 0, 1] : [0, 0, 0, 0]);
    const varA = kind === 'v12' ? 0.035 : kind === 'v8' ? 0.16 : kind === 'i4' ? 0.1 : kind === 'r2' ? 0.05 : 0.07;
    for (let i = 0; i < N; i++) {
      this.bank.push(bankPat[i]);
      this.amp.push(1 + (this.rnd() - 0.5) * 2 * varA);
      this.off.push((this.rnd() - 0.5) * 0.024);
    }
    // exhaust pipe lengths (m) per bank -> waveguide delay
    const L = kind === 'v12' ? [1.62, 1.78] : kind === 'v8' ? [2.2, 2.45] : kind === 'i4' ? [1.9, 1.9] : kind === 'r2' ? [1.32, 1.46] : kind === 'i6h' ? [2.0, 2.12] : [2.35, 2.5];
    this.D = L.map((l) => Math.min(4000, Math.round(2 * l / 343 * this.fs)));
    this.refl = kind === 'v12' ? -0.58 : kind === 'v8' ? -0.55 : kind === 'i4' ? -0.42 : kind === 'r2' ? -0.34 : -0.48;
    this.nb = kind === 'i4' || kind === 'r2' ? 1 : 2;
    this.boom.set(1, kind === 'v12' ? 102 : kind === 'v8' ? 58 : kind === 'r2' ? 84 : 66, 2.5, this.fs);
    this.body.set(1, kind === 'v12' ? 245 : kind === 'i4' ? 150 : kind === 'r2' ? 330 : kind === 'i6h' ? 170 : 128, kind === 'r2' ? 1.3 : 1.6, this.fs);   // r2: hollow, nasal body
    this.raspBp.set(1, 2300, 0.9, this.fs); this.lump = 0;
    // v78 rotary: each rotor has three faces that fire in turn (one per shaft turn), each a little different - the 1/3-order
    // warble that makes a rotary sound like a rotary; one face per rotor burns weakly at idle (overlap dilution) -> "brap brap"
    this.face = [0, 0]; this.faceA = []; this.fOff = []; this.weakF = [Math.floor(this.rnd() * 3), Math.floor(this.rnd() * 3)];
    for (let i = 0; i < 6; i++) { this.faceA.push(1 + (this.rnd() - 0.5) * 0.2); this.fOff.push((this.rnd() - 0.5) * 0.02); }
    this.boomG = kind === 'r2' ? 0.55 : 1; this.bodyG = kind === 'r2' ? 1.35 : 1;
    // v79 (from a real FD recording): at idle one face of one rotor goes off as a sharp crack once per rotor turn (~5.6 Hz at
    // 1000 rpm) - the lumpy "brap"; a lift from high revs gives 2-4 distinct bangs ~90 ms apart, then a clean mid overrun tone
    this.crackR = kind === 'r2' ? Math.floor(this.rnd() * 2) : 0; this.crackF = kind === 'r2' ? Math.floor(this.rnd() * 3) : 0; this.liftQ = 0; this.liftT = 0; this.burstN = 0; this.liftArm = false;
    this.ovHp = new Biq(); this.ovHp.set(2, 190, 0.7, this.fs); this.ovK = 0;
    this.mechHp.set(2, 2600, 0.7, this.fs);
    this.tbHp.set(2, 4200, 0.7, this.fs);
    this.popBp.set(1, 900, 0.9, this.fs);
    this.flBp.set(1, 620, 1.4, this.fs); this.wgHp.set(2, 3200, 0.7, this.fs);
    // v81 XH-6 twin turbos / overrun: shaft speed, vent + surge after a lift, overrun fuel left in the exhaust
    this.sh = 0; this.ventP = 0; this.ventT = 9; this.ventShort = false; this.surgeK = 0; this.sgPh = 0; this.whP1 = 0; this.whP2 = 0.37;
    this.ovF = 0; this.liftArm6 = false;
    this.ventBp = this.ventBp || new Biq(); this.surgeBp = this.surgeBp || new Biq(); this.flowBp = this.flowBp || new Biq();
    this.flowBp.set(1, 3800, 0.8, this.fs); this.ventBp.set(1, 4000, 1.1, this.fs); this.surgeBp.set(1, 900, 2.0, this.fs);
  }
  set(m) {
    for (const k in m) this.tgt[k] = m[k];
    if (m.kind && m.kind !== this.kind) this.setup(m.kind);
    this.tk = (this.kind === 'v8' || this.kind === 'r2' || this.kind === 'i6h') && !!this.tgt.tk;
    this.turbo = this.kind === 'v12' || this.tk;
    if (!this.turbo) { this.bov = 0; this.flut = 0; this.wgE = 0; }
  }
  spawn(amp, tau, noise, bank) {
    let i = -1;
    for (let k = 0; k < 16; k++) if (this.P[k * 6 + 5] === 0) { i = k; break; }
    if (i < 0) return;
    const o = i * 6;
    this.P[o] = 0; this.P[o + 1] = tau; this.P[o + 2] = amp; this.P[o + 3] = noise; this.P[o + 4] = bank; this.P[o + 5] = 1;
  }
  process(out, n) {
    const c = this.c, t = this.tgt, fs = this.fs, idt = this.idt;
    const external = !!t.ext;
    // Sequential ignition cuts are audio-clock events, not a short render-frame flag that can disappear.
    if (!external && (t.seqStamp | 0) !== this.seqN) {
      this.seqN = t.seqStamp | 0;
      this.seqDelay = Math.max(0, Math.min(0.05, t.seqDelay || 0));
      this.seqLeft = Math.max(0, Math.min(0.14, t.seqTime || 0));
      this.seqToneLeft = Math.max(this.seqDelay + this.seqLeft + 0.04, Math.min(0.4, t.seqTone || 0.18));
      this.scQ = 0; // do not stack the stock multi-pop shift tail over a dry sequential cut
    }
    const fastShift = !external && (t.fastShift > 0.5 || this.seqToneLeft > 0);
    // ---- block-rate smoothing ----
    const k1 = 1 - Math.exp(-n * idt / 0.012), k2 = 1 - Math.exp(-n * idt / 0.03);
    const kFast = fastShift ? 1 - Math.exp(-n * idt / 0.003) : k1;
    c.rpm += (t.rpm - c.rpm) * kFast; c.load += (t.load - c.load) * kFast; c.thr += (t.thr - c.thr) * kFast;
    c.boost += (t.boost - c.boost) * k2; c.on += (t.on - c.on) * k2; c.starter += (t.starter - c.starter) * k2;
    c.cut = t.cut; c.gain += (t.gain - c.gain) * k2;
    const rpm = Math.max(0, c.rpm), load = Math.min(1, Math.max(0, c.load)), thr = c.thr;
    const rn = rpm / (this.rot || this.kind === 'i6h' ? 8200 : 7000);
    const allowPops = (t.pops > 0 && (external || this.tk)) || this.rot;
    if (external && t.on <= 0 && c.on < 0.001) { out.fill(0, 0, n); return; }
    // Source exhaust is brighter outside; the external listener supplies cabin muffling.
    const fc = external ? 800 + 2300 * Math.pow(load, 0.7) + rpm * 0.43 : 150 + 1100 * Math.pow(load, 1.2) + rpm * (0.16 + 0.07 * load);
    const fcR = this.rot && !external ? fc * 1.5 + 380 : fc;
    if (this.rot) this.body.set(1, 330 + 320 * load * Math.min(1, rn * 1.3), 1.3, fs);   // the panel resonance climbs with load: a harder mid bark   // v79: the rotary's rasp gets through the bulkhead
    this.lp1.set(0, fcR, 0.6, fs); this.lp2.set(0, fcR * 1.6, 0.55, fs);
    this.inBp.set(1, 420 + rpm * 0.28, 1.3, fs);
    const bovF = 1300 + 2600 * Math.exp(-this.bovT * 5);
    this.bovBp.set(1, bovF, 1.2, fs);
    // ---- block-rate events: blow-off, overrun window ----
    if (!external && this.turbo && (this.thrPk || 0) > 0.45 && thr < 0.2 && c.boost > 0.35 && this.bovT > 0.4) { this.bov = Math.min(1, c.boost * 1.1); this.bovT = 0; if (this.tk) { this.bov = 0; } }
    if (this.kind === 'i6h' && !external) {
      const bt = Math.min(1.3, Math.max(0, c.boost)), drive = Math.min(1, rn * 1.1) * (0.25 + 0.75 * load);
      const tgS = Math.max(bt / 1.25, drive * 0.6);   // exhaust energy spins the shafts up, their inertia lets them run down slowly
      this.sh += (tgS - this.sh) * (1 - Math.exp(-n * idt / (tgS > this.sh ? 0.22 : 1.3)));
      if ((this.thrPk || 0) > 0.45 && thr < 0.2 && bt > 0.3 && this.ventT > 0.5) { this.ventP = bt; this.ventT = 0; this.ventShort = false; this.surgeK = 0.35 + 0.45 * this.rnd(); }
      if (this.ventP > 0.002) this.ventBp.set(1, 1300 + 3700 * Math.exp(-this.ventT * (this.ventShort ? 14 : 5)), 1.1, fs);
      this.surgeBp.set(1, 600 + 550 * this.sh, 2.0, fs);
      // overrun: a hard lift from high revs leaves fuel in the hot exhaust; it lights in clusters, fewer as it burns off
      if (thr > 0.5 && rpm > 3000) this.liftArm6 = true;
      if (this.liftArm6 && thr < 0.08 && rpm > 3000) { this.liftArm6 = false; this.ovF = Math.min(1, 0.45 + 0.55 * this.thrHi * Math.min(1, (rpm - 3000) / 4000)); }
      if (thr > 0.3) this.ovF = 0; else this.ovF *= Math.exp(-n * idt / 1.3);
    }
    // V8 turbo kit: wastegate opens and chatters once boost reaches its ~0.9 bar limit
    this.wgE += ((this.tk && c.boost > (this.kind === 'i6h' ? 1.18 : 0.9) && thr > 0.7 ? 1 : 0) - this.wgE) * (1 - Math.exp(-n * idt / 0.08));
    this.prevThr = thr; this.thrPk = thr < 0.2 && this.bovT < 0.05 ? 0 : Math.max(thr, (this.thrPk || 0) - n * idt * 1.5);
    if (thr > 0.4 && rpm > 2000) this.thrHi = Math.min(1, this.thrHi + n * idt * 2); else this.thrHi = Math.max(0, this.thrHi - n * idt * 0.15);
    if (thr < 0.06) this.overrun = Math.min(1, this.overrun + n * idt * 4) * 1; else this.overrun = 0;
    if (this.rot) {
      if (thr > 0.5) this.liftArm = true;
      if (this.liftArm && thr < 0.12 && rpm > 2800 && (this.thrPk || 0) > 0.3) { this.liftArm = false; this.liftQ = 2 + (this.rnd() < 0.5 && rpm > 4500 ? 1 : 0); this.liftT = 0.03; }
      if (this.liftQ > 0 && thr > 0.3) this.liftQ = 0;
      if (this.liftQ > 0) { this.liftT -= n * idt; if (this.liftT <= 0) { this.burstN = 2 + Math.floor(this.rnd() * 2); this.liftQ--; this.liftT = 0.075 + 0.035 * this.rnd(); } }
      this.ovK += ((thr < 0.06 && rpm > 1300 ? 0.85 * Math.min(1, (rpm - 1300) / 1200) : 0) - this.ovK) * (1 - Math.exp(-n * idt / 0.08));
    }
    // upshift crackle: a few hard misfires ~30 ms after the ignition cut
    if ((t.sc | 0) !== this.scN) {
      this.scN = t.sc | 0; this.scQ = allowPops ? (this.kind === 'i6h' ? 1 + Math.floor(this.rnd() * 2) : 2 + Math.floor(this.rnd() * 3)) : 0; this.scW = 0.03; this.scA = t.scA || 1;
      if (this.kind === 'i6h' && !external && c.boost > 0.3) { this.ventP = Math.min(0.4, c.boost * 0.3); this.ventT = 0; this.ventShort = true; }   // twin-clutch upshift: a tiny chuff of pressure, no full vent
    }
    if (!allowPops) this.scQ = 0;
    if (this.scW > 0) this.scW -= n * idt;
    const N = this.N, D0 = this.D[0], D1 = this.D[1], refl = this.refl;
    const comb = 0.06 + 0.94 * Math.pow(load, 1.15);
    const hiK = Math.min(1, Math.max(0, (rn - 0.55) / 0.45));
    const ampBase = (c.starter > 0.5 ? 0.25 : (0.10 + 0.9 * comb)) * (0.55 + 0.45 * Math.min(1, rn * 1.6)) * (1 + 0.3 * load * hiK * hiK * (3 - 2 * hiK));
    const tauBase = Math.max(0.00055, Math.min(0.0042, 0.2 * 120 / Math.max(rpm, 150) / N)) * fs;
    const st = c.starter;
    // motor whine target (block rate): drive and regen raise it, speed fades it
    const mv = Math.max(0, t.v || 0), mtg = this.kind === 'i6h' && !external ? (0.012 + 0.085 * Math.min(1, t.mot || 0) + 0.04 * Math.min(1, t.regen || 0)) * Math.min(1, mv / 3) * (1 - 0.55 * Math.min(1, Math.max(0, (mv - 30) / 50))) : 0;
    this.mVol = (this.mVol || 0) + (mtg - (this.mVol || 0)) * k2; this.mPh = this.mPh || 0;
    const mvol = this.mVol, mf = 40 + mv * 38;
    const gateDown = 1 - Math.exp(-idt / 0.0012), gateUp = 1 - Math.exp(-idt / 0.0028);
    for (let i = 0; i < n; i++) {
      if (!external) {
        if (this.seqDelay > 0) this.seqDelay -= idt;
        else if (this.seqLeft > 0) this.seqLeft -= idt;
        this.seqToneLeft = Math.max(0, this.seqToneLeft - idt);
      }
      const seqCut = !external && this.seqDelay <= 0 && this.seqLeft > 0;
      this.seqGate += ((seqCut ? 0.035 : 1) - this.seqGate) * (seqCut ? gateDown : gateUp);
      // idle instability random walk
      this.jit += (this.rnd() - 0.5) * 0.002 - this.jit * 0.0006;
      const rpmE = rpm * (1 + this.jit * (rpm < 1300 ? (this.rot ? 2.2 : 1.6) : 0.3));
      const dc = rpmE / 120 * idt;
      this.cyc += dc;
      // firing events (slot positions are fractions of the 720° cycle)
      while (this.cyc >= this.nextPos) {
        const sl = this.slot;
        if (c.on > 0.05 || st > 0.05) {
          let a = ampBase * this.amp[sl] * (0.88 + 0.24 * this.rnd());
          let nz = 0.25 + 0.6 * load;
          let tau = tauBase * (0.9 + 0.2 * this.rnd());
          if (this.rot) {   // the peripheral port snaps open: a step-fronted, long, raspy pulse; faces differ; weak face at idle
            const r = this.bank[sl], f = this.face[r], lo = 1 - Math.min(1, Math.max(0, (rpm - 1100) / 1600));
            this.face[r] = (f + 1) % 3;
            a *= Math.pow(this.faceA[r * 3 + f], 1 + 2.5 * lo) * 1.35 * (1 + 0.4 * lo);
            tau *= 1.3 * (1 + 1.7 * lo); nz += 0.3 + 0.35 * (1 - load) + 0.4 * lo;
            if (lo > 0 && f === this.weakF[r]) { a *= 1 - 0.6 * lo * (0.75 + 0.25 * this.rnd()); nz += 0.9 * lo; tau *= 1 + 0.5 * lo; }
            if (lo > 0 && r === this.crackR && f === this.crackF) { a *= 1 + lo * (1.6 + 0.8 * this.rnd()); nz += 3.2 * lo; tau *= 1 - 0.45 * lo; }   // the idle crack
          }
          if (st > 0.5) { a *= 0.5; nz = 0.05; tau *= 2.2; }
          else if (c.cut > 0.5 || seqCut) { a *= 0.06; }
          else if (allowPops && this.scQ > 0 && this.scW <= 0 && rpm > 2000 && this.rnd() < 0.6) {
            a = (1.0 + 1.3 * this.rnd()) * (0.45 + 0.55 * this.scA); nz = 2.4; tau *= 0.55; this.scQ--;
          }
          else if (this.rot && this.burstN > 0 && rpm > 1500) {   // lift-off bang: unburnt charge lighting in the exhaust
            a = (0.7 + 0.6 * this.rnd()) * (0.5 + 0.5 * this.thrHi); nz = 3.4; tau *= 0.45; this.burstN--;
          }
          else if (this.kind === 'i6h' && this.ovF > 0.02 && thr < 0.08 && rpm > 1800 && this.rnd() < this.ovF * (0.035 + 0.075 * rn)) {
            const big = this.rnd() < 0.15 * this.ovF;   // mostly crisp crackle, now and then a deep bang that rings the pipes
            a = (0.5 + 0.9 * this.rnd()) * (0.4 + 0.6 * Math.sqrt(this.ovF)) * (big ? 2.1 : 1); nz = big ? 3.4 : 2.5; tau *= big ? 1.1 : 0.42; this.ovF -= big ? 0.06 : 0.014;
          }
          else if (this.kind !== 'i6h' && allowPops && this.overrun > 0.3 && rpm > 1900 && this.rnd() < 0.09 * (this.tk ? 1.9 : this.rot ? 0.1 : 1.7) * Math.min(1, (rpm - 1900) / 2300) * (0.3 + this.thrHi)) {
            a = (0.9 + 1.4 * this.rnd()) * (0.4 + this.thrHi * 0.6) * (this.rot ? 0.7 : 1);
            nz = this.kind === 'v8' ? 1.5 : this.kind === 'i4' ? 2.8 : this.rot ? 3.2 : 2.2; tau *= this.kind === 'v8' ? 0.85 : this.kind === 'i4' ? 0.45 : this.rot ? 0.5 : 0.6;   // V8 burbles, the four-pot snaps
          }
          a *= Math.max(c.on, st);
          this.spawn(a, tau, nz, this.bank[sl]);
        }
        this.slot = sl + 1;
        if (this.slot >= N) { this.slot = 0; this.cyc -= 1; }
        this.nextPos = (this.slot + 0.5 + this.off[this.slot] + (this.rot ? this.fOff[this.bank[this.slot] * 3 + this.face[this.bank[this.slot]]] : 0)) / N;
      }
      // sum pulses into bank excitations
      let x0 = 0, x1 = 0, envP = 0;
      for (let k = 0; k < 16; k++) {
        const o = k * 6;
        if (this.P[o + 5] === 0) continue;
        const tt = this.P[o] / this.P[o + 1];
        const e = this.rot ? (tt < 0.14 ? tt / 0.14 : Math.exp(-(tt - 0.14) * 1.05)) : tt * Math.exp(1 - tt);   // rotary: step front
        const v = this.P[o + 2] * e * (1 + this.P[o + 3] * (this.rnd() * 2 - 1));
        if (this.P[o + 4] < 0.5) x0 += v; else x1 += v;
        envP += this.P[o + 2] * e;
        this.P[o] += 1;
        if (tt > 9) this.P[o + 5] = 0;
      }
      // exhaust waveguides (open end reflection, lossy)
      const wi = this.wi, W0 = this.wg[0], W1 = this.wg[1];
      const d0 = W0[(wi - D0 + 4096) & 4095], d1 = W1[(wi - D1 + 4096) & 4095];
      this.wlp[0] += (d0 - this.wlp[0]) * 0.38; this.wlp[1] += (d1 - this.wlp[1]) * 0.38;
      const y0 = x0 + refl * this.wlp[0], y1 = x1 + refl * this.wlp[1];
      W0[wi] = y0; W1[wi] = y1; this.wi = (wi + 1) & 4095;
      let ex = this.nb === 1 ? y0 + x1 : (y0 + y1);
      // DC block
      const dcy = ex - this.dcx + 0.995 * this.dcy; this.dcx = ex; this.dcy = dcy; ex = dcy;
      // muffler + cabin
      let cab = this.lp2.run(this.lp1.run(ex));
      cab += this.boom.run(ex) * (external ? 0.6 : 0.9) * this.boomG + this.body.run(ex) * (external ? 0.72 : 0.45) * this.bodyG;
      if (this.rot) { const hp = this.ovHp.run(cab); cab += (hp * 1.5 - cab) * this.ovK; }   // overrun: the drone thins out to a clean mid tone
      // intake roar (induction noise, AM by firing envelope)
      const wn = this.rnd() * 2 - 1;
      this.env += (envP - this.env) * 0.02;
      const intake = this.inBp.run(wn) * (0.25 + 0.75 * Math.min(1, this.env * 3)) * Math.pow(thr, 1.5) * (0.15 + rn + 0.45 * rn * rn) * 0.55;
      // mechanical: valvetrain tick + accessory whine
      this.whPh += rpmE / 60 * 3 * idt; if (this.whPh > 1) this.whPh -= 1;
      const camE = Math.pow(0.5 + 0.5 * Math.sin(this.cyc * 6.2832 * N * 2), 6);
      let mech = this.mechHp.run(wn) * camE * (this.rot ? 0.008 : 0.035) * Math.min(1, rpm / 3000) * c.on + Math.sin(this.whPh * 6.2832) * 0.0035 * c.on * Math.min(1, rpm / 2000);
      // rotor buzz: the port edge tears the gas loose on every face, a dry rasp riding the pulses that grows with revs
      if (this.rot) mech += this.raspBp.run(wn) * Math.min(1, this.env * 3) * (0.02 + 0.085 * load) * Math.min(1.25, rn * rn * 1.3) * c.on;
      // turbo whistle + spool hiss
      let turbo = 0;
      if (this.turbo && this.kind === 'i6h') {
        const s2 = this.sh, b = c.boost, f1 = 1500 + 9500 * s2;
        // two small turbos at slightly different shaft speeds: a beating twin whistle that follows the shafts, not the pedal
        this.whP1 += f1 * idt; if (this.whP1 > 1) this.whP1 -= 1;
        this.whP2 += f1 * 1.017 * idt; if (this.whP2 > 1) this.whP2 -= 1;
        const wa = 0.0075 * s2 * s2 * (0.4 + 0.6 * thr);
        turbo = (Math.sin(this.whP1 * 6.2832) + 0.8 * Math.sin(this.whP2 * 6.2832) + 0.18 * Math.sin(this.whP1 * 12.566)) * wa;
        turbo += this.flowBp.run(wn) * 0.02 * s2 * Math.max(0, b) * thr;   // intake rush
        if (this.wgE > 0.003) turbo += this.wgHp.run(wn) * this.wgE * 0.018 * (0.55 + 0.45 * Math.sin(this.cyc * 6.2832 * 3.0));
        if (this.ventP > 0.002) {
          this.ventT += idt; const T = this.ventT, P0 = this.ventP;
          // blow-off: the valve vents the charge pipe, its hiss falling in pitch as the pressure goes
          const ev = P0 * Math.exp(-T / (this.ventShort ? 0.05 : 0.16 + 0.08 * P0)) * Math.min(1, T / 0.004);
          turbo += this.ventBp.run(wn) * ev * (this.ventShort ? 0.18 : 0.3);
          if (!this.ventShort) {   // surge: what the valve cannot pass pushes back through the compressor in pulses, slowing with the shafts
            this.sgPh += (9 + 26 * this.sh) * idt; if (this.sgPh > 1) this.sgPh -= 1;
            const am = Math.pow(0.5 + 0.5 * Math.cos(this.sgPh * 6.2832), 4), se = P0 * this.surgeK * Math.exp(-T / 0.42) * Math.min(1, T / 0.05);
            turbo += this.surgeBp.run(wn) * se * am * 0.9;
          }
          if (T > 1.6) this.ventP = 0;
        }
      } else if (this.turbo) {
        const b = c.boost;
        this.lfo += idt * 0.9; this.tPh += (2000 + 5600 * Math.pow(b, 0.8) + 260 * Math.sin(this.lfo)) * idt; if (this.tPh > 1) this.tPh -= 1;
        turbo = Math.sin(this.tPh * 6.2832) * 0.0105 * b * b * (0.35 + 0.65 * thr) + this.tbHp.run(wn) * 0.018 * b * thr;
        if (this.tk) {
          turbo *= 1.5;
          if (this.wgE > 0.003) turbo += this.wgHp.run(wn) * this.wgE * 0.03 * (0.55 + 0.45 * Math.sin(this.cyc * 6.2832 * 2.0));
          if (this.flut > 0.002) {          // compressor surge flutter: "stu-tu-tu" as the trapped charge pushes back through the wheel
            this.flT += idt;
            const e = this.flut * Math.exp(-this.flT / 0.3) * Math.min(1, this.flT / 0.01);
            const am = 0.5 + 0.5 * Math.sin(this.flT * 6.2832 * (19 - this.flT * 16));
            turbo += this.flBp.run(wn) * e * am * am * am * 0.55;
            if (this.flT > 1.5) this.flut = 0;
          }
        }
      }
      // blow-off valve (with compressor flutter)
      let bov = 0;
      if (this.bov > 0.002) {
        this.bovT += idt;
        const e = this.bov * Math.exp(-this.bovT / 0.17) * Math.min(1, this.bovT / 0.006);
        bov = this.bovBp.run(wn) * e * (0.75 + 0.25 * Math.sin(this.bovT * 6.2832 * 23)) * 0.42;
        if (this.bovT > 1.2) this.bov = 0;
      } else this.bovT += idt;
      // starter motor
      let starter = 0;
      if (st > 0.01) {
        this.stPh += 98 * idt; if (this.stPh > 1) this.stPh -= 1;
        const comp = 0.6 + 0.4 * Math.sin(this.cyc * 6.2832 * N);
        starter = ((this.stPh * 2 - 1) * 0.5 + Math.sin(this.stPh * 6.2832 * 7) * 0.2) * comp * st * 0.045;
      }
      let howl = 0;
      if (external && this.kind === 'v12') {
        const ph = this.cyc * 6.2831853 * N;
        howl = (Math.sin(ph) * 0.19 + Math.sin(ph * 2 + 0.25) * 0.075 + Math.sin(ph * 3) * 0.03) * Math.pow(load, 0.8) * Math.min(1.3, rn) * c.on * (1 - 0.94 * c.cut);
        turbo *= 2.3;
      }
      // Gate combustion and its pipe tail, not road/wind/cabin sound or a boosted turbo still spinning.
      let y = (cab * (external ? 1.05 : 0.95 * this.seqGate) + intake * (external ? 1.4 : 0.15 + 0.85 * this.seqGate) + mech + turbo + bov + starter + howl) * c.gain;
      // soft saturation of the "engine bay"
      y = y / (1 + Math.abs(y) * 0.6);
      // v81 hybrid: front motor whine, pitch with road speed; loud at low speed, fading as the engine takes over
      if (!external && (mvol > 1e-5)) {
        this.mPh += mf * idt; if (this.mPh > 1) this.mPh -= 1;
        const p = this.mPh * 6.2832;
        this.mPh2 = (this.mPh2 || 0) + (2350 + 18 * mv) * idt; if (this.mPh2 > 1) this.mPh2 -= 1;   // inverter switching tone, high and thin
        y += (Math.sin(p) * 0.55 + Math.sin(2 * p + 0.4) * 0.3 + Math.sin(3 * p + 1.1) * 0.14 + Math.sin(6 * p) * 0.05 + Math.sin(this.mPh2 * 6.2832) * 0.12) * mvol;
      }
      out[i] = y;
    }
  }
}


if (typeof AudioWorkletProcessor !== 'undefined' && typeof registerProcessor === 'function') {

class EngineProc extends AudioWorkletProcessor {
  constructor() { super(); this.dsp = new EngineDSP(sampleRate); this.port.onmessage = (e) => this.dsp.set(e.data); }
  process(inputs, outputs) { const o = outputs[0][0]; if (o) this.dsp.process(o, o.length); return true; }
}
registerProcessor('engine-dsp', EngineProc);

}
if (typeof window !== 'undefined') window.EngineDSP = EngineDSP;
