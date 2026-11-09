/* ===== TOY 原生榜单：章节阅读上报 + 页面内排行榜面板 =====
 * 沿用项目其余 Toy 已验证的 v3 模块（sanji / benneng / gomoku / go / tetris），
 * 只把配色与文案改成 jianzhi 的「坐标记录纸」语言。
 *
 * 平台约束（官方 SDK 类型声明）：
 *   - submitScore 传绝对分，服务端只保留该榜位历史最高分 → 分数只增不减。
 *   - getRankList 游客可读，返回 [{ rank, score, nickname, avatar }]。
 *   - getMyRank 需登录，是否上榜必须用 ranked 判断（score 允许 0 / 负）。
 * 计分口径：每读一章 +1，同一章只计一次，一直累计。
 * 面板只在用户点开时拉一次并缓存，不轮询，避免占用单 Toy 共享 QPS。
 */
(function () {
  'use strict';
  var BOARD = 1, LIMIT = 20, WAIT_MAX = 40;
  var MIN = -16777216, MAX = 16777215;
  var lastSent = null;
  var cache = {};
  var CFG = null;
  var period = 'all';

  function sdk() {
    var w = window;
    var list = [w.toy, w.Toy, w.toy && w.toy.toy, w.Toy && w.Toy.toy];
    for (var i = 0; i < list.length; i++) {
      if (list[i] && typeof list[i].submitScore === 'function') return list[i];
    }
    return null;
  }
  function num(k, d) {
    try {
      var v = window.localStorage.getItem(k);
      return v === null ? d : (parseInt(v, 10) || 0);
    } catch (e) { return d; }
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

  function settle(delta) {
    if (!CFG) return 0;
    var v = num(CFG.key, 0) + (delta || 0);
    if (v < 1) v = 1;
    v = put(CFG.key, clamp(v));
    send(v, 0, 0);
    return v;
  }

  /* 每读一章 +1：用已读 id 集合去重，同一章不重复计分 */
  function watch(id) {
    if (!CFG || !id) return 0;
    var sk = CFG.key + '.seen', list = [];
    try { list = JSON.parse(window.localStorage.getItem(sk) || '[]') || []; } catch (e) { list = []; }
    if (!Array.isArray(list)) list = [];
    if (list.indexOf(id) !== -1) return num(CFG.key, 0);
    list.push(id);
    try { window.localStorage.setItem(sk, JSON.stringify(list)); } catch (e) {}
    var v = put(CFG.key, clamp(num(CFG.key, 0) + 1));
    send(v, 0, 0);
    return v;
  }

  /* ---------------- 面板 ---------------- */
  var CSS = [
    '.tyrank-mask{position:fixed;inset:0;z-index:9998;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(16,26,31,.58)}',
    '.tyrank-card{width:min(420px,100%);max-height:min(78vh,620px);display:flex;flex-direction:column;background:#FBFAF6;color:#1B2830;border:1px solid #AEBBB8;border-radius:2px;box-shadow:0 18px 60px rgba(16,26,31,.28);overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif}',
    '.tyrank-head{display:flex;align-items:center;justify-content:space-between;padding:14px 16px 10px;border-bottom:1px solid #CDD5D2}',
    '.tyrank-title{font-size:15px;font-weight:700;letter-spacing:.08em}',
    '.tyrank-x{border:0;background:none;color:inherit;font-size:22px;line-height:1;cursor:pointer;opacity:.55;padding:0 4px}',
    '.tyrank-tabs{display:flex;gap:6px;padding:10px 16px 4px}',
    '.tyrank-tab{border:1px solid #AEBBB8;background:transparent;color:#4E6066;font-size:12px;font-weight:700;padding:5px 13px;border-radius:2px;cursor:pointer;opacity:.7}',
    '.tyrank-tab.on{background:#B8412C;color:#FBFAF6;border-color:#B8412C;opacity:1}',
    '.tyrank-me{display:flex;gap:8px;padding:8px 16px 12px}',
    '.tyrank-me > div{flex:1;min-width:0;background:rgba(27,40,48,.055);border:1px solid #CDD5D2;padding:9px 8px;text-align:center}',
    '.tyrank-me b{display:block;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:17px;line-height:1.3;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.tyrank-me span{display:block;font-size:10px;color:#6E7E81;margin-top:3px;letter-spacing:.08em}',
    '.tyrank-list{flex:1;min-height:80px;overflow-y:auto;padding:0 10px 10px;-webkit-overflow-scrolling:touch}',
    '.tyrank-row{display:flex;align-items:center;gap:9px;padding:7px 6px;border-bottom:1px solid #CDD5D2}',
    '.tyrank-row:last-child{border-bottom:0}',
    '.tyrank-no{width:24px;flex:0 0 24px;text-align:center;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;font-weight:700;opacity:.6}',
    '.tyrank-no.top{color:#B8412C;opacity:1}',
    '.tyrank-av{width:30px;height:30px;flex:0 0 30px;border-radius:50%;object-fit:cover;background:rgba(27,40,48,.1)}',
    '.tyrank-name{flex:1;min-width:0;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.tyrank-score{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:13px;font-weight:700;font-variant-numeric:tabular-nums}',
    '.tyrank-tip{padding:22px 16px;text-align:center;font-size:13px;line-height:1.8;color:#4E6066}',
    '.tyrank-foot{padding:9px 16px 12px;font-size:10.5px;line-height:1.7;color:#6E7E81;border-top:1px solid #CDD5D2}',
    '.tyrank-retry{border:1px solid #AEBBB8;background:transparent;color:#1B2830;font-size:12px;padding:5px 12px;border-radius:2px;cursor:pointer;margin-top:8px}'
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
        nickname: it.nickname || it.name || it.uname || it.nick || '读者',
        avatar: it.avatar || it.face || it.avatar_url || ''
      };
    }).filter(Boolean);
  }

  function meMarkup(my) {
    var rankTxt = (my && my.ranked && my.rank) ? ('第 ' + my.rank + ' 名') : '未上榜';
    return '<div><b>' + esc(rankTxt) + '</b><span>我的名次</span></div>' +
           '<div><b>' + esc(String(num(CFG.key, 0))) + '</b><span>已读章节</span></div>';
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
        '<span class="tyrank-score">' + it.score + '</span>' +
      '</div>';
    }).join('');
  }

  function paint(data) {
    var mask = document.getElementById('tyrank-mask');
    if (!mask || !CFG) return;
    var listEl = mask.querySelector('.tyrank-list');
    var meEl = mask.querySelector('.tyrank-me');
    var tabs = mask.querySelectorAll('.tyrank-tab');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].classList.toggle('on', tabs[i].getAttribute('data-period') === period);
    }
    meEl.innerHTML = meMarkup(data && data.my);
    if (data && data.error) {
      listEl.innerHTML = '<div class="tyrank-tip">榜单没加载出来。<br>' +
        '如果是在电脑浏览器里预览，请到 B站 App 内打开本 Toy。<br>' +
        '<button type="button" class="tyrank-retry">重新加载</button></div>';
      var btn = listEl.querySelector('.tyrank-retry');
      if (btn) btn.addEventListener('click', function () { load(period, true); });
    } else if (!data || !data.list || !data.list.length) {
      listEl.innerHTML = '<div class="tyrank-tip">还没有人上榜。读一章，就会记 1 分。</div>';
    } else {
      listEl.innerHTML = listMarkup(data.list);
    }
  }

  function setLoading() {
    var mask = document.getElementById('tyrank-mask');
    if (mask) mask.querySelector('.tyrank-list').innerHTML =
      '<div class="tyrank-tip">榜单加载中…</div>';
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
      if (my && my.ranked && typeof my.score === 'number' && my.score > num(CFG.key, 0)) {
        put(CFG.key, clamp(my.score));
      }
      cache[p] = { list: list, my: my || null };
      paint(cache[p]);
    });
  }

  function openPanel() {
    injectStyle();
    var mask = document.getElementById('tyrank-mask');
    if (mask) { mask.hidden = false; load(period); return; }
    mask = el('div', 'tyrank-mask');
    mask.id = 'tyrank-mask';
    mask.addEventListener('click', function (e) { if (e.target === mask) mask.hidden = true; });
    var card = el('div', 'tyrank-card');
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');
    card.setAttribute('aria-label', '排行榜');
    card.innerHTML =
      '<div class="tyrank-head"><span class="tyrank-title">排行榜</span>' +
        '<button type="button" class="tyrank-x" aria-label="关闭">×</button></div>' +
      '<div class="tyrank-tabs">' +
        '<button type="button" class="tyrank-tab on" data-period="all">总榜</button>' +
        '<button type="button" class="tyrank-tab" data-period="week">本周</button>' +
      '</div>' +
      '<div class="tyrank-me"></div>' +
      '<div class="tyrank-list"></div>' +
      '<div class="tyrank-foot">每读一章加 1 分，同一章不重复计，一直累计；分数只加不减，取历史最好成绩。</div>';
    mask.appendChild(card);
    document.body.appendChild(mask);
    card.querySelector('.tyrank-x').addEventListener('click', function () { mask.hidden = true; });
    var tabs = card.querySelectorAll('.tyrank-tab');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].addEventListener('click', function () { load(this.getAttribute('data-period')); });
    }
    paint(null);
    load('all');
  }

  window.ToyRank = {
    init: function (cfg) { CFG = cfg; injectStyle(); },
    settle: settle,
    watch: watch,
    open: openPanel,
    value: function () { return CFG ? num(CFG.key, 0) : 0; }
  };
})();
