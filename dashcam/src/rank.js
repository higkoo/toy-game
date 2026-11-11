/* ===== 夜行记录仪 · 排行榜
 * 入口是设置页右下角那个版本号（原生 button），页面不主动提示，属于隐藏彩蛋。
 * 沿用项目其余 Toy 已验证的榜单模块骨架（SDK 探测 / 只增不减 / 超时兜底 / 缓存），
 * 面板配色与文案取自这个游戏自己的 token：夜间仪表盘的黑底、直播红与余额金。
 *
 * 计分口径：每局直播结束按累计总里程记分（km，取整），里程只增不减。
 * submitScore 传绝对分，服务端只保留该榜位历史最高分。
 */
(function () {
  'use strict';
  var BOARD = 1, LIMIT = 20, WAIT_MAX = 40;
  var MIN = -16777216, MAX = 16777215;
  var KEY = 'dashcam.toy.rank.v1';
  var lastSent = null, cache = {}, period = 'all';

  function sdk() {
    var w = window;
    var list = [w.toy, w.Toy, w.toy && w.toy.toy, w.Toy && w.Toy.toy];
    for (var i = 0; i < list.length; i++) {
      if (list[i] && typeof list[i].submitScore === 'function') return list[i];
    }
    return null;
  }
  function num(k, d) {
    try { var v = window.localStorage.getItem(k); return v === null ? d : (parseInt(v, 10) || 0); }
    catch (e) { return d; }
  }
  function put(k, v) {
    try { window.localStorage.setItem(k, String(v)); } catch (e) {}
    return v;
  }
  function clamp(v) { return v < MIN ? MIN : (v > MAX ? MAX : v); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  /* 游戏侧通过 window.__dashcamKm 暴露当前累计里程 */
  function km() {
    var v = Number(window.__dashcamKm);
    return isFinite(v) && v > 0 ? v : num(KEY, 0);
  }

  function send(score, wait, retry) {
    var t = sdk();
    if (!t) {
      if (wait < WAIT_MAX) window.setTimeout(function () { send(score, wait + 1, retry); }, 150);
      return;
    }
    if (lastSent === score) return;
    lastSent = score;
    var fail = function () {
      if (lastSent === score) lastSent = null;
      if (retry < 2) window.setTimeout(function () { send(score, 0, retry + 1); }, 1200 * Math.pow(2, retry));
    };
    try {
      var r = t.submitScore({ score: score, board: BOARD });
      if (r && typeof r.catch === 'function') r.catch(fail);
    } catch (e) { fail(); }
  }

  /* 每局直播结算上报一次：分数是累计总里程，绝对值提交 */
  function report(totalKm) {
    var v = Math.floor(Number(totalKm) || 0);
    if (v < 0) v = 0;
    v = put(KEY, clamp(Math.max(v, num(KEY, 0))));
    if (v > 0) send(v, 0, 0);
    return v;
  }

  /* ---------------- 面板：夜间仪表盘 ---------------- */
  var CSS = [
    '.tyrank-mask{position:fixed;inset:0;z-index:9998;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(4,6,9,.86);font-family:var(--fb,"Barlow","Segoe UI","Microsoft YaHei","PingFang SC",sans-serif)}',
    '.tyrank-mask[hidden]{display:none}',
    '.tyrank-card{width:min(430px,100%);max-height:min(80vh,640px);display:flex;flex-direction:column;background:rgba(9,11,15,.94);color:#f2f4f6;border:1px solid rgba(255,255,255,.13);border-top:3px solid var(--red,#e8262b);box-shadow:0 24px 70px rgba(0,0,0,.6);overflow:hidden}',
    '.tyrank-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:15px 18px 12px;border-bottom:1px solid rgba(255,255,255,.1)}',
    '.tyrank-title{font:800 26px/1 var(--fd,"Barlow Condensed","Bahnschrift","DIN Condensed",sans-serif);letter-spacing:.06em;text-transform:uppercase}',
    '.tyrank-sub{display:block;margin-top:6px;font:400 10px/1.4 var(--fd,"Barlow Condensed",sans-serif);letter-spacing:.18em;text-transform:uppercase;color:#69727d}',
    '.tyrank-x{border:0;background:none;color:inherit;font-size:22px;line-height:1;cursor:pointer;opacity:.5;padding:0 4px}',
    '.tyrank-x:hover{opacity:1}',
    '.tyrank-tabs{display:flex;gap:8px;padding:12px 18px 4px}',
    '.tyrank-tab{border:1px solid rgba(255,255,255,.18);background:transparent;color:#9aa3ae;font:700 12px/1 var(--fd,"Barlow Condensed",sans-serif);letter-spacing:.14em;text-transform:uppercase;padding:8px 16px;cursor:pointer;border-radius:0}',
    '.tyrank-tab.on{background:var(--red,#e8262b);border-color:var(--red,#e8262b);color:#fff}',
    '.tyrank-me{display:flex;gap:8px;padding:10px 18px 14px}',
    '.tyrank-me>div{flex:1;min-width:0;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.1);padding:10px 8px;text-align:center}',
    '.tyrank-me b{display:block;font:800 22px/1.25 var(--fd,"Barlow Condensed",sans-serif);letter-spacing:.02em;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.tyrank-me span{display:block;margin-top:5px;font:400 10px/1 var(--fd,"Barlow Condensed",sans-serif);letter-spacing:.16em;text-transform:uppercase;color:#69727d}',
    '.tyrank-me .gold b{color:var(--gold,#ffc83d)}',
    '.tyrank-list{flex:1;min-height:80px;overflow-y:auto;padding:0 12px 12px;-webkit-overflow-scrolling:touch}',
    '.tyrank-row{display:flex;align-items:center;gap:10px;padding:8px 6px;border-bottom:1px solid rgba(255,255,255,.08)}',
    '.tyrank-row:last-child{border-bottom:0}',
    '.tyrank-no{width:28px;flex:0 0 28px;text-align:center;font:800 13px/1 var(--fd,"Barlow Condensed",sans-serif);color:#69727d}',
    '.tyrank-no.top{color:var(--red2,#ff4a4f)}',
    '.tyrank-av{width:28px;height:28px;flex:0 0 28px;object-fit:cover;background:rgba(255,255,255,.07)}',
    '.tyrank-name{flex:1;min-width:0;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.tyrank-score{font:800 15px/1 var(--fd,"Barlow Condensed",sans-serif);font-variant-numeric:tabular-nums;color:var(--gold,#ffc83d)}',
    '.tyrank-score i{font-style:normal;font-size:10px;letter-spacing:.1em;color:#69727d;margin-left:3px}',
    '.tyrank-tip{padding:26px 16px;text-align:center;font-size:13px;line-height:1.9;color:#9aa3ae}',
    '.tyrank-foot{padding:10px 18px 14px;font:400 10.5px/1.7 var(--fd,"Barlow Condensed",sans-serif);letter-spacing:.04em;color:#69727d;border-top:1px solid rgba(255,255,255,.1)}',
    '.tyrank-retry{margin-top:10px;border:1px solid rgba(255,255,255,.25);background:transparent;color:#f2f4f6;font:700 12px/1 var(--fd,"Barlow Condensed",sans-serif);letter-spacing:.14em;text-transform:uppercase;padding:8px 16px;cursor:pointer;border-radius:0}',
    '.tyrank-x:focus-visible,.tyrank-tab:focus-visible,.tyrank-retry:focus-visible{outline:2px solid var(--red2,#ff4a4f);outline-offset:2px}'
  ].join('');

  function injectStyle() {
    if (document.getElementById('tyrank-style')) return;
    var s = document.createElement('style');
    s.id = 'tyrank-style';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function normalizeList(raw) {
    if (!raw) return null;
    var arr = Array.isArray(raw) ? raw
      : (raw.items || raw.list || raw.rankList || raw.rank_list || raw.data);
    if (!Array.isArray(arr)) return null;
    return arr.map(function (it, i) {
      if (!it || typeof it !== 'object') return null;
      return {
        rank: Number(it.rank) || (i + 1),
        score: Number(it.score) || 0,
        nickname: it.nickname || it.name || it.uname || it.nick || '车主',
        avatar: it.avatar || it.face || it.avatar_url || ''
      };
    }).filter(Boolean);
  }

  function meMarkup(my) {
    var rankTxt = (my && my.ranked && my.rank) ? ('第 ' + my.rank + ' 名') : '未上榜';
    return '<div><b>' + esc(rankTxt) + '</b><span>我的名次</span></div>' +
           '<div class="gold"><b>' + esc(String(km())) + '<i>km</i></b><span>累计里程</span></div>';
  }

  function listMarkup(list) {
    return list.map(function (it) {
      var av = it.avatar
        ? '<img class="tyrank-av" src="' + esc(it.avatar) + '" alt="" loading="lazy" />'
        : '<span class="tyrank-av"></span>';
      return '<div class="tyrank-row">' +
        '<span class="tyrank-no' + (it.rank <= 3 ? ' top' : '') + '">' + it.rank + '</span>' +
        av +
        '<span class="tyrank-name">' + esc(it.nickname) + '</span>' +
        '<span class="tyrank-score">' + it.score + '<i>km</i></span>' +
      '</div>';
    }).join('');
  }

  function paint(data) {
    var mask = document.getElementById('tyrank-mask');
    if (!mask) return;
    var listEl = mask.querySelector('.tyrank-list');
    var meEl = mask.querySelector('.tyrank-me');
    var tabs = mask.querySelectorAll('.tyrank-tab');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].classList.toggle('on', tabs[i].getAttribute('data-period') === period);
    }
    meEl.innerHTML = meMarkup(data && data.my);
    if (data && data.error) {
      listEl.innerHTML = '<div class="tyrank-tip">榜单没加载出来。<br>' +
        '到 B站 App 内打开本 Toy 再试。<br>' +
        '<button type="button" class="tyrank-retry">重试</button></div>';
      var btn = listEl.querySelector('.tyrank-retry');
      if (btn) btn.addEventListener('click', function () { load(period, true); });
    } else if (!data || !data.list || !data.list.length) {
      listEl.innerHTML = '<div class="tyrank-tip">还没有人上路。<br>跑完一局直播，就会记下里程。</div>';
    } else {
      listEl.innerHTML = listMarkup(data.list);
    }
  }

  function setLoading() {
    var mask = document.getElementById('tyrank-mask');
    if (mask) mask.querySelector('.tyrank-list').innerHTML =
      '<div class="tyrank-tip">正在接入路况…</div>';
  }

  /* 不在 Toy 宿主时 SDK 握手会一直挂着，加超时给出明确下一步 */
  function withTimeout(p, ms) {
    return new window.Promise(function (resolve) {
      var done = false;
      window.setTimeout(function () { if (!done) { done = true; resolve(null); } }, ms);
      window.Promise.resolve(p).then(function (v) {
        if (!done) { done = true; resolve(v); }
      }, function () { if (!done) { done = true; resolve(null); } });
    });
  }

  function load(p, force) {
    period = p;
    if (cache[p] && !force) { paint(cache[p]); return; }
    var t = sdk();
    if (!t) { paint({ error: 'unavailable' }); return; }
    setLoading();
    var lp = t.getRankList
      ? withTimeout(window.Promise.resolve().then(function () {
          return t.getRankList({ board: BOARD, period: p, limit: LIMIT });
        }).catch(function () { return null; }), 3500)
      : window.Promise.resolve(null);
    var mp = t.getMyRank
      ? withTimeout(window.Promise.resolve().then(function () {
          return t.getMyRank({ board: BOARD, period: p });
        }).catch(function () { return null; }), 3500)
      : window.Promise.resolve(null);
    window.Promise.all([lp, mp]).then(function (res) {
      var list = normalizeList(res[0]), my = res[1];
      if (list === null) { paint({ error: 'unavailable' }); return; }
      if (my && my.ranked && typeof my.score === 'number' && my.score > num(KEY, 0)) {
        put(KEY, clamp(my.score));
      }
      cache[p] = { list: list, my: my || null };
      paint(cache[p]);
    });
  }

  function closePanel() {
    var mask = document.getElementById('tyrank-mask');
    if (!mask || mask.hidden) return;
    mask.hidden = true;
    var tag = document.getElementById('verTag');
    if (tag) tag.focus();
  }

  function openPanel() {
    injectStyle();
    var mask = document.getElementById('tyrank-mask');
    if (mask) { mask.hidden = false; load(period); focusClose(mask); return; }
    mask = el('div', 'tyrank-mask');
    mask.id = 'tyrank-mask';
    mask.addEventListener('click', function (e) { if (e.target === mask) closePanel(); });
    var card = el('div', 'tyrank-card');
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');
    card.setAttribute('aria-label', '排行榜');
    card.innerHTML =
      '<div class="tyrank-head"><div><span class="tyrank-title">Total Distance</span>' +
        '<span class="tyrank-sub">夜行记录仪 · 累计里程榜</span></div>' +
        '<button type="button" class="tyrank-x" aria-label="关闭">×</button></div>' +
      '<div class="tyrank-tabs">' +
        '<button type="button" class="tyrank-tab on" data-period="all">总榜</button>' +
        '<button type="button" class="tyrank-tab" data-period="week">本周</button>' +
      '</div>' +
      '<div class="tyrank-me"></div>' +
      '<div class="tyrank-list"></div>' +
      '<div class="tyrank-foot">每局直播结束按累计总里程记 1 次，里程只增不减，取历史最好成绩。</div>';
    mask.appendChild(card);
    document.body.appendChild(mask);
    card.querySelector('.tyrank-x').addEventListener('click', closePanel);
    var tabs = card.querySelectorAll('.tyrank-tab');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].addEventListener('click', function () { load(this.getAttribute('data-period')); });
    }
    paint(null);
    load('all');
    focusClose(mask);
  }

  function focusClose(mask) {
    var x = mask.querySelector('.tyrank-x');
    if (x) x.focus();
  }

  /* 入口：设置页的版本号。用事件委托，不依赖脚本与 DOM 的先后顺序 */
  document.addEventListener('click', function (e) {
    var n = e.target;
    while (n && n !== document) {
      if (n.id === 'verTag') { e.preventDefault(); openPanel(); return; }
      n = n.parentNode;
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' || e.keyCode === 27) closePanel();
  });

  window.ToyRank = {
    report: report,
    open: openPanel,
    close: closePanel,
    value: km
  };
  injectStyle();
})();
