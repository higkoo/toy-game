/* 我的健康减脂方法 · 页面渲染与交互
 * 内容全部来自 data/content.js（腾讯文档导出），此处只负责呈现。 */
(function () {
  'use strict';
  var D = window.JZ;
  if (!D) return;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function $(id) { return document.getElementById(id); }
  function fixed(v, n) { return Number(v).toFixed(n); }

  /* ---------------- 44 天体重曲线 ----------------
   * 窄屏换一套更小的 viewBox：SVG 内文字是用户单位，若沿用 820 宽再缩到
   * 343px，10px 刻度会变成 4px 看不清。窄屏用 380 宽，缩放约 0.9，字仍是 9px。 */
  function drawChart() {
    var rows = D.body, n = rows.length;
    var narrow = window.matchMedia && window.matchMedia('(max-width:760px)').matches;
    var W = narrow ? 380 : 820, H = narrow ? 200 : 250;
    var L = narrow ? 32 : 44, R = narrow ? 10 : 16;
    var T = narrow ? 16 : 18, B = narrow ? 28 : 32;
    var LO = 65, HI = 73.5;
    function X(i) { return L + i / (n - 1) * (W - L - R); }
    function Y(v) { return T + (HI - v) / (HI - LO) * (H - T - B); }

    var pts = rows.map(function (r, i) { return [X(i), Y(r.kg)]; });
    var line = pts.map(function (p, i) {
      return (i ? 'L' : 'M') + fixed(p[0], 1) + ' ' + fixed(p[1], 1);
    }).join(' ');
    var area = line + ' L' + fixed(X(n - 1), 1) + ' ' + fixed(H - B, 1) +
               ' L' + fixed(X(0), 1) + ' ' + fixed(H - B, 1) + ' Z';

    var grid = '', ticks = '';
    [66, 68, 70, 72].forEach(function (v) {
      var y = fixed(Y(v), 1);
      grid += '<line class="grid-line" x1="' + L + '" y1="' + y + '" x2="' + (W - R) + '" y2="' + y + '"/>';
      ticks += '<text class="axis-tick" x="' + (L - 8) + '" y="' + (Y(v) + 3.5) + '" text-anchor="end">' + v + '</text>';
    });

    // 4.24 是两期交界，原文第二期从这天重新开始
    var cut = -1;
    for (var i = 0; i < n; i++) if (rows[i].d === '2024.4.24') { cut = i; break; }
    var cutMark = '';
    if (cut > 0) {
      var cx = fixed(X(cut), 1);
      cutMark = '<line class="phase-line" x1="' + cx + '" y1="' + T + '" x2="' + cx + '" y2="' + (H - B) + '"/>' +
                '<text class="phase-label" x="' + (X(cut) + 5) + '" y="' + (T + 11) + '">' +
                (narrow ? '4.24 二期' : '第二期起点 4.24') + '</text>';
    }

    var a = pts[0], b = pts[n - 1];
    var dots =
      '<circle class="dot" cx="' + fixed(a[0], 1) + '" cy="' + fixed(a[1], 1) + '" r="4"/>' +
      '<text class="dot-label" x="' + (a[0] + 9) + '" y="' + (a[1] - 9) + '">' + fixed(rows[0].kg, 2) + '</text>' +
      '<circle class="dot" cx="' + fixed(b[0], 1) + '" cy="' + fixed(b[1], 1) + '" r="4"/>' +
      '<text class="dot-label" x="' + (b[0] - 9) + '" y="' + (b[1] - 10) + '" text-anchor="end">' + fixed(rows[n - 1].kg, 2) + '</text>';

    var baseLabels =
      '<text class="base-label" x="' + L + '" y="' + (H - 10) + '">4.3</text>' +
      (cut > 0 ? '<text class="base-label" x="' + X(cut) + '" y="' + (H - 10) + '" text-anchor="middle">4.24</text>' : '') +
      '<text class="base-label" x="' + (W - R) + '" y="' + (H - 10) + '" text-anchor="end">5.16</text>';

    var svg =
      '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" ' +
      'aria-label="44 天体重曲线：2024 年 4 月 3 日 72.25 公斤，到 5 月 16 日 66.35 公斤，累计下降 5.9 公斤。完整逐日数值见下方逐日数据表。">' +
      grid + ticks + cutMark +
      '<path class="area" d="' + area + '"/>' +
      '<path class="line" d="' + line + '"/>' +
      dots + baseLabels +
      '</svg>';
    $('chartSvg').innerHTML = svg;
    $('chartFoot').innerHTML =
      '朱红线为每日晨起体重，竖虚线是 4.24（第二期起点）。体脂率同期从 ' +
      fixed(D.meta.start.fat, 1) + '% 降到 ' + fixed(D.meta.end.fat, 1) +
      '%，逐日数值可在下方表格核对。';
  }

  /* ---------------- 核心思路 ---------------- */
  function renderIdea() {
    var cn = ['一', '二', '三'];
    $('ideaBody').innerHTML = D.principles.map(function (p, i) {
      return '<div class="pillar">' +
        '<h3><em>' + cn[i] + '</em>' + esc(p.title) + '</h3>' +
        '<ul>' + p.points.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' +
      '</div>';
    }).join('');
  }

  /* ---------------- 怎么吃 ---------------- */
  function renderHow() {
    var total = D.ratio.parts.reduce(function (a, p) { return a + p.v; }, 0);
    var ratio = '<div class="ratio"><div class="ratio-head">一顿饭的比例 · 菜 : 肉 : 饭 = 5 : 3 : 2</div>' +
      D.ratio.parts.map(function (p) {
        return '<div class="ratio-row">' +
          '<span class="k">' + esc(p.k) + '</span>' +
          '<span class="track"><span class="fill" style="width:' + (p.v / total * 100) + '%"></span></span>' +
          '<span class="v">' + p.v + '</span>' +
          '<span class="d">' + esc(p.name) + ' · ' + esc(p.desc) + '</span>' +
        '</div>';
      }).join('') +
      '<p class="ratio-note">注意是「低」不是「无」：不推荐水煮，缺少必要油脂、不好吃也难坚持。</p></div>';

    var order = '<div class="order" aria-label="进食顺序">' +
      D.ratio.order.map(function (s, i) {
        return (i ? '<span class="sep" aria-hidden="true">→</span>' : '') +
          '<span class="step"><b>' + (i + 1) + '</b>' + esc(s) + '</span>';
      }).join('') + '</div>' +
      '<p class="ratio-note" style="margin:-16px 0 24px">' + esc(D.ratio.orderNote) + '</p>';

    var cols = [
      { k: 'diet', t: '饮食 / 6 条' },
      { k: 'water', t: '饮水 / 5 条' },
      { k: 'sleep', t: '睡眠 / 3 条' }
    ];
    var method = '<div class="method-grid">' + cols.map(function (c) {
      return '<div class="method-col"><h3>' + c.t + '</h3><ol>' +
        D.method[c.k].map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') +
        '</ol></div>';
    }).join('') + '</div>';

    $('howBody').innerHTML = ratio + order + method;
  }

  /* ---------------- 逐日数据 ---------------- */
  var FIELDS = [
    { k: 'bmi', t: 'BMI', n: 1 }, { k: 'kg', t: '体重 kg', n: 2 },
    { k: 'fat', t: '体脂率 %', n: 1 }, { k: 'water', t: '水分率 %', n: 1 },
    { k: 'muscle', t: '肌肉率 %', n: 1 }, { k: 'vis', t: '内脏脂肪', n: 0 },
    { k: 'sub', t: '皮下脂肪', n: 1 }, { k: 'age', t: '身体年龄', n: 0 },
    { k: 'pro', t: '蛋白质率 %', n: 1 }
  ];

  function bodyTable() {
    var head = '<tr><th scope="col">日期</th>' +
      FIELDS.map(function (f) { return '<th scope="col">' + f.t + '</th>'; }).join('') + '</tr>';
    var rows = D.body.map(function (r) {
      var dateCell = r.img
        ? '<a href="' + esc(r.img) + '" target="_blank" rel="noopener noreferrer" title="查看当天体脂秤截图">' + esc(r.d) + '</a>'
        : esc(r.d);
      return '<tr><td>' + dateCell + '</td>' +
        FIELDS.map(function (f) { return '<td>' + fixed(r[f.k], f.n) + '</td>'; }).join('') + '</tr>';
    }).join('');
    return '<div class="tbl-wrap"><table class="jz">' +
      '<caption>逐日体脂记录 · 点日期可看当天的体脂秤截图（原站图片）' +
      '<span class="swipe-hint"> · 左右滑动看全部 9 项</span></caption>' +
      '<thead>' + head + '</thead><tbody>' + rows + '</tbody></table></div>';
  }

  /* 窄屏专用：三餐按天纵向排列，避免 4 列表格在手机上要横滑、文字被裁断 */
  function mealList() {
    return '<div class="meal-list">' + D.meals.map(function (m) {
      if (m.holiday) {
        return '<div class="meal-day holiday"><span class="d">' + esc(m.d) + '</span>' +
          '<span class="h">劳动节假期 · ' + esc(m.holiday) + '，未记录三餐</span></div>';
      }
      return '<div class="meal-day"><span class="d">' + esc(m.d) + '</span>' +
        '<div class="m"><i>早</i><span>' + esc(m.b || '—') + '</span></div>' +
        '<div class="m"><i>午</i><span>' + esc(m.l || '—') + '</span></div>' +
        '<div class="m"><i>晚</i><span>' + esc(m.s || '—') + '</span></div>' +
      '</div>';
    }).join('') + '</div>';
  }

  function mealTable() {
    var rows = D.meals.map(function (m) {
      if (m.holiday) {
        return '<tr class="holiday"><td>' + esc(m.d) + '</td>' +
          '<td colspan="3" class="meal">劳动节假期 · ' + esc(m.holiday) + '，未记录三餐</td></tr>';
      }
      return '<tr><td>' + esc(m.d) + '</td>' +
        '<td class="meal">' + esc(m.b || '—') + '</td>' +
        '<td class="meal">' + esc(m.l || '—') + '</td>' +
        '<td class="meal">' + esc(m.s || '—') + '</td></tr>';
    }).join('');
    return '<div class="tbl-wrap meal-table"><table class="jz">' +
      '<caption>44 天饮食日志 · 「代餐」表示这一餐用代餐粉代替</caption>' +
      '<thead><tr><th scope="col">日期</th><th scope="col">早餐</th><th scope="col">午餐</th><th scope="col">晚餐</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div>' + mealList();
  }

  function renderData() {
    var strip = '<div class="phase-strip">' + D.phases.map(function (p) {
      var kg = parseFloat(p.delta[1]);
      return '<div class="cell">' +
        '<div class="n">' + esc(p.name) + ' · ' + p.days + ' 天</div>' +
        '<div class="v">' + (kg > 0 ? '+' : '') + fixed(kg, 1) + '<small>kg</small></div>' +
        '<div class="u">' + esc(p.from) + ' — ' + esc(p.to) + '　体脂率 ' + esc(p.delta[2]) + '%</div>' +
      '</div>';
    }).join('') + '</div>';

    $('dataBody').innerHTML = strip +
      '<details class="fold" id="foldBody"><summary><span class="sign" aria-hidden="true">＋</span>' +
        '展开 44 天逐日体脂数据<span class="hint">9 项指标</span></summary>' +
        '<div class="fold-inner">' + bodyTable() + '</div></details>' +
      '<details class="fold" id="foldMeals"><summary><span class="sign" aria-hidden="true">＋</span>' +
        '展开 44 天饮食日志<span class="hint">早 / 午 / 晚</span></summary>' +
        '<div class="fold-inner">' + mealTable() + '</div></details>' +
      '<p class="ratio-note">数值来自体脂秤每日晨起记录，4.24 在两期里重复记录了一次，逐日表已合并去重。</p>';

    // 展开符号随状态变化，是响应动作的反馈，不是装饰
    ['foldBody', 'foldMeals'].forEach(function (id) {
      var d = $(id);
      d.addEventListener('toggle', function () {
        d.querySelector('.sign').textContent = d.open ? '−' : '＋';
      });
    });
  }

  /* ---------------- 记录与感受 ---------------- */
  function renderNotes() {
    var blocks = [
      { t: '实践感受', items: D.notes.practice },
      { t: '感想感悟', items: D.notes.thoughts },
      { t: '关于代餐', items: D.notes.meal }
    ];
    var html = '<div class="notes">' + blocks.map(function (b) {
      return '<div class="block"><h3>' + b.t + '</h3><ul>' +
        b.items.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') +
        '</ul></div>';
    }).join('') + '</div>';

    html += '<p class="ratio-note" style="margin-top:18px">代餐的开源配方见「出处」里的' +
      '<a href="https://www.bilibili.com/read/cv34208613" target="_blank" rel="noopener noreferrer" ' +
      'style="color:#B8412C;text-decoration:none;border-bottom:1px solid rgba(184,65,44,.4)">强生粥</a>。</p>';

    html += '<h3 style="font-size:13px;letter-spacing:.08em;margin:26px 0 4px">朋友的效果</h3>' +
      '<p class="prose" style="font-size:13px">' + esc(D.friend.intro) + '</p>' +
      '<div class="milestones">' + D.friend.milestones.map(function (m) {
        return '<div class="m"><div class="t">' + esc(m.t) + '</div>' +
          '<div class="v">' + esc(m.v) + '<small>' + esc(m.u) + '</small></div>' +
          '<div class="n">' + esc(m.note) + '</div></div>';
      }).join('') + '</div>' +
      '<p class="ratio-note">' + esc(D.friend.end) + '</p>';

    $('notesBody').innerHTML = html;
  }

  /* ---------------- 问答 ---------------- */
  function renderQA() {
    var total = D.qa.reduce(function (a, g) { return a + g.items.length; }, 0);
    var html = '<div class="qa-tools">' +
      '<input class="qa-search" id="qaSearch" type="search" autocomplete="off" ' +
        'placeholder="搜问题或答案，比如：主食、喝水、水果" aria-label="搜索问答" />' +
      '<span class="qa-count" id="qaCount">' + total + ' 条</span></div>' +
      '<div id="qaList">' + D.qa.map(function (g, gi) {
        return '<div class="qa-group" data-group="' + gi + '">' +
          '<h3>' + esc(g.title) + '</h3>' +
          '<p class="sub">' + esc(g.sub) + ' · ' + g.items.length + ' 条</p>' +
          g.items.map(function (it, i) {
            var text = (it.q + ' ' + it.a.join(' ')).toLowerCase();
            return '<details class="qa-item" data-text="' + esc(text) + '">' +
              '<summary><span class="no">' + (i + 1) + '</span>' +
                '<span class="q">' + esc(it.q) + '</span>' +
                '<span class="pm" aria-hidden="true">＋</span></summary>' +
              '<div class="qa-answer">' + it.a.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') + '</div>' +
            '</details>';
          }).join('') + '</div>';
      }).join('') + '</div>' +
      '<div class="qa-empty" id="qaEmpty" hidden>没有匹配的问答，换个词试试。</div>';

    $('qaBody').innerHTML = html;

    var items = [].slice.call($('qaBody').querySelectorAll('.qa-item'));
    var groups = [].slice.call($('qaBody').querySelectorAll('.qa-group'));
    items.forEach(function (d) {
      d.addEventListener('toggle', function () {
        d.querySelector('.pm').textContent = d.open ? '−' : '＋';
      });
    });

    var timer = null;
    $('qaSearch').addEventListener('input', function () {
      var kw = this.value.trim().toLowerCase();
      window.clearTimeout(timer);
      timer = window.setTimeout(function () {
        var hit = 0;
        items.forEach(function (d) {
          var ok = !kw || d.getAttribute('data-text').indexOf(kw) !== -1;
          d.hidden = !ok;
          if (ok) hit++;
          else d.open = false;
        });
        groups.forEach(function (g) {
          g.hidden = !g.querySelector('.qa-item:not([hidden])');
        });
        $('qaCount').textContent = kw ? ('找到 ' + hit + ' 条') : (total + ' 条');
        $('qaEmpty').hidden = hit > 0;
      }, 90);
    });
  }

  /* ---------------- 出处 ---------------- */
  function renderRefs() {
    $('refBody').innerHTML = '<ul class="refs">' + D.links.map(function (l) {
      return '<li><a href="' + esc(l.url) + '" target="_blank" rel="noopener noreferrer">' +
        esc(l.label) + ' ↗</a><span class="n">' + esc(l.note) + '</span></li>';
    }).join('') + '</ul>' +
    '<p class="ratio-note" style="margin-top:16px">本页是个人实践记录，不构成医学或营养建议；' +
    '有基础疾病、正在用药或准备大幅调整饮食前，请先咨询医生或营养师。</p>';
  }

  /* ---------------- 榜单：读过一章记 1 分 ---------------- */
  function initRank() {
    window.ToyRank.init({ key: 'jianzhi.rank.v1', kind: 'content' });
    var v = $('verTag');
    if (v) v.addEventListener('click', function () { window.ToyRank.open(); });

    var pending = [].slice.call(document.querySelectorAll('[data-chapter]'));
    function scan() {
      var h = window.innerHeight || 640;
      pending = pending.filter(function (sec) {
        var r = sec.getBoundingClientRect();
        if (r.top < h * 0.72 && r.bottom > 0) {
          try { window.ToyRank.watch(sec.getAttribute('data-chapter')); } catch (e) {}
          return false;
        }
        return true;
      });
    }
    var ticking = false;
    function onScroll() {
      if (ticking || !pending.length) return;
      ticking = true;
      window.requestAnimationFrame(function () { ticking = false; scan(); });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    scan();   // 首屏进入视口即记 1 分，「看过一次就计分」
  }

  /* ---------------- TOY 原生底栏适配 ----------------
   * 与 sanji / benneng 同一套逻辑：容器底部的原生互动栏以覆盖方式浮在
   * WebView 上，env(safe-area-inset-bottom) 不含它，必须另外预留。 */
  function initBottomInset() {
    var root = document.documentElement;
    var NATIVE_BAR = 64, env = 0, timer = null;

    function envBottom() {
      try {
        var d = document.createElement('div');
        d.style.cssText = 'position:fixed;left:0;bottom:0;width:0;height:0;padding-bottom:env(safe-area-inset-bottom,0px);';
        document.body.appendChild(d);
        var v = parseFloat(getComputedStyle(d).paddingBottom) || 0;
        if (d.parentNode) d.parentNode.removeChild(d);
        return v > 0 ? v : 0;
      } catch (e) { return 0; }
    }
    function apply(px) { root.style.setProperty('--toy-bottom-inset', Math.max(0, Math.round(px) || 0) + 'px'); }
    function sdkNs() {
      var c = [];
      try { if (window.Toy) c.push(window.Toy); } catch (e) {}
      try { if (window.toy) c.push(window.toy); } catch (e) {}
      for (var i = 0; i < c.length; i++) {
        if (!c[i]) continue;
        if (typeof c[i].getContainerState === 'function') return c[i];
        if (c[i].toy && typeof c[i].toy.getContainerState === 'function') return c[i].toy;
      }
      return null;
    }
    function fromState(st) {
      if (st && st.immersive === true) { apply(env); return; }
      var reported = (st && st.safeArea && typeof st.safeArea.bottom === 'number') ? st.safeArea.bottom : 0;
      apply(Math.max(env, NATIVE_BAR, reported));
    }
    function probe() {
      var sdk = sdkNs();
      if (!sdk) return false;
      var settled = false;
      try {
        var p = sdk.getContainerState();
        if (p && typeof p.then === 'function') {
          p.then(function (st) { settled = true; fromState(st); },
                 function () { settled = true; apply(env); });
          setTimeout(function () { if (!settled) fromState(null); }, 900);
        } else { settled = true; apply(env); }
      } catch (e) { settled = true; apply(env); }
      return true;
    }
    function boot() {
      env = envBottom();
      var tries = 0;
      timer = setInterval(function () {
        if (probe()) { clearInterval(timer); timer = null; return; }
        if (++tries > 24) { clearInterval(timer); timer = null; apply(env); }
      }, 150);
    }
    function refresh() {
      env = envBottom();
      var sdk = sdkNs();
      if (!sdk) { apply(env); return; }
      try {
        var p = sdk.getContainerState();
        if (p && typeof p.then === 'function') p.then(fromState, function () { apply(env); });
        else apply(env);
      } catch (e) { apply(env); }
    }
    boot();
    window.addEventListener('resize', refresh);
    window.addEventListener('orientationchange', function () { setTimeout(refresh, 260); });
    setTimeout(function () {
      var sdk = sdkNs();
      if (sdk && typeof sdk.onContainerChange === 'function') {
        try { sdk.onContainerChange(function (st) { fromState(st && st.state ? st.state : st); }); } catch (e) {}
      }
    }, 400);
  }

  /* ---------------- 启动 ---------------- */
  function boot() {
    drawChart();
    // 视口跨过 760px 断点时换 viewBox 重绘，不重播入场动画
    if (window.matchMedia) {
      var mq = window.matchMedia('(max-width:760px)');
      var onChange = function () {
        drawChart();
        var svg = $('chartSvg').querySelector('svg');
        if (svg) svg.classList.add('is-static');
      };
      if (mq.addEventListener) mq.addEventListener('change', onChange);
      else if (mq.addListener) mq.addListener(onChange);
    }
    renderIdea();
    renderHow();
    renderData();
    renderNotes();
    renderQA();
    renderRefs();
    initRank();
    initBottomInset();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
