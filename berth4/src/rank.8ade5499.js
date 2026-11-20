/* ===== 四号泊位 · 排行榜
 * 入口是标题页「开发体验版」那个隐形按钮，页面不主动提示，属于隐藏彩蛋。
 * 沿用项目其余 Toy 已验证的榜单模块骨架（SDK 探测 / 只增不减 / 超时兜底 / 缓存），
 * 面板配色与文案改成这个游戏自己的暗色战术 HUD 语言。
 *
 * 计分口径：成功登船撤离一次 +1，阵亡不加分，跨局累计，只加不减。
 * submitScore 传绝对分，服务端只保留该榜位历史最高分。
 */
(function () {
  'use strict';
  var BOARD = 1, LIMIT = 20, WAIT_MAX = 40;
  var MIN = -16777216, MAX = 16777215;
  var KEY = 'zhidu.berth4.rank.v1';
  var lastSent = null, cache = {}, period = 'all', lastScreen = '';

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

  /* 只在成功撤离时调用：+1，累计，绝不回退 */
  function settle(delta) {
    var v = num(KEY, 0) + (delta || 0);
    if (v < 0) v = 0;
    v = put(KEY, clamp(v));
    if (v > 0) send(v, 0, 0);
    return v;
  }

  /* ---------------- 面板：暗色战术 HUD ---------------- */
  var CSS = [
    '.tyrank-mask{position:fixed;inset:0;z-index:9998;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(6,8,10,.82);font-family:var(--f-label)}',
    '.tyrank-mask[hidden]{display:none}',
    '.tyrank-card{width:min(430px,100%);max-height:min(78vh,620px);display:flex;flex-direction:column;background:var(--plate-solid);color:var(--bone);border:1px solid var(--line);border-top:3px solid var(--signal);box-shadow:0 18px 60px rgba(0,0,0,.55);overflow:hidden}',
    '.tyrank-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:16px 18px 12px;border-bottom:1px solid var(--line)}',
    '.tyrank-title{font:900 26px/1 var(--f-display);letter-spacing:.12em}',
    '.tyrank-sub{display:block;margin-top:7px;font:400 10px/1.4 var(--f-mono);letter-spacing:.16em;color:var(--steel)}',
    '.tyrank-x{border:0;background:none;color:var(--bone);font-size:22px;line-height:1;cursor:pointer;opacity:.55;padding:0 4px}',
    '.tyrank-x:hover{opacity:1}',
    '.tyrank-tabs{display:flex;gap:8px;padding:12px 18px 4px}',
    '.tyrank-tab{border:1px solid var(--line);background:transparent;color:var(--steel);font:600 12px/1 var(--f-label);letter-spacing:.16em;padding:7px 15px;cursor:pointer;border-radius:0}',
    '.tyrank-tab.on{background:var(--signal);border-color:var(--signal);color:var(--ink)}',
    '.tyrank-me{display:flex;gap:8px;padding:10px 18px 14px}',
    '.tyrank-me>div{flex:1;min-width:0;background:rgba(232,228,218,.045);border:1px solid var(--line);padding:10px 8px;text-align:center}',
    '.tyrank-me b{display:block;font:700 20px/1.3 var(--f-mono);font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.tyrank-me span{display:block;margin-top:4px;font:400 10px/1 var(--f-label);letter-spacing:.14em;color:var(--steel)}',
    '.tyrank-list{flex:1;min-height:80px;overflow-y:auto;padding:0 12px 12px;-webkit-overflow-scrolling:touch}',
    '.tyrank-row{display:flex;align-items:center;gap:10px;padding:8px 6px;border-bottom:1px solid var(--line)}',
    '.tyrank-row:last-child{border-bottom:0}',
    '.tyrank-no{width:26px;flex:0 0 26px;text-align:center;font:700 12px/1 var(--f-mono);color:var(--steel)}',
    '.tyrank-no.top{color:var(--signal)}',
    '.tyrank-av{width:30px;height:30px;flex:0 0 30px;object-fit:cover;background:rgba(232,228,218,.08)}',
    '.tyrank-name{flex:1;min-width:0;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.tyrank-score{font:700 14px/1 var(--f-mono);font-variant-numeric:tabular-nums;color:var(--signal-hot)}',
    '.tyrank-tip{padding:26px 16px;text-align:center;font-size:13px;line-height:1.9;color:var(--bone-dim)}',
    '.tyrank-foot{padding:10px 18px 14px;font:400 10.5px/1.7 var(--f-mono);letter-spacing:.04em;color:var(--steel);border-top:1px solid var(--line)}',
    '.tyrank-retry{margin-top:10px;border:1px solid var(--line);background:transparent;color:var(--bone);font:600 12px/1 var(--f-label);letter-spacing:.16em;padding:7px 14px;cursor:pointer;border-radius:0}',
    '.tyrank-x:focus-visible,.tyrank-tab:focus-visible,.tyrank-retry:focus-visible{outline:2px solid var(--signal);outline-offset:2px}'
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
        nickname: it.nickname || it.name || it.uname || it.nick || '队员',
        avatar: it.avatar || it.face || it.avatar_url || ''
      };
    }).filter(Boolean);
  }

  function meMarkup(my) {
    var rankTxt = (my && my.ranked && my.rank) ? ('第 ' + my.rank + ' 名') : '未上榜';
    return '<div><b>' + esc(rankTxt) + '</b><span>我的名次</span></div>' +
           '<div><b>' + esc(String(num(KEY, 0))) + '</b><span>成功撤离</span></div>';
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
      listEl.innerHTML = '<div class="tyrank-tip">还没有人登船。<br>成功撤离一次，就会记 1 分。</div>';
    } else {
      listEl.innerHTML = listMarkup(data.list);
    }
  }

  function setLoading() {
    var mask = document.getElementById('tyrank-mask');
    if (mask) mask.querySelector('.tyrank-list').innerHTML =
      '<div class="tyrank-tip">正在接通指挥中心…</div>';
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
    var tag = document.getElementById('rankTag');
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
      '<div class="tyrank-head"><div><span class="tyrank-title">排行榜</span>' +
        '<span class="tyrank-sub">B4 港区 · 撤离记录</span></div>' +
        '<button type="button" class="tyrank-x" aria-label="关闭">×</button></div>' +
      '<div class="tyrank-tabs">' +
        '<button type="button" class="tyrank-tab on" data-period="all">总榜</button>' +
        '<button type="button" class="tyrank-tab" data-period="week">本周</button>' +
      '</div>' +
      '<div class="tyrank-me"></div>' +
      '<div class="tyrank-list"></div>' +
      '<div class="tyrank-foot">成功登船撤离一次加 1 分，一直累计；分数只加不减，取历史最好成绩。</div>';
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

  /* 菜单由游戏在启动后异步创建，用事件委托绑定，不依赖创建时机 */
  document.addEventListener('click', function (e) {
    var n = e.target;
    while (n && n !== document) {
      if (n.id === 'rankTag') { e.preventDefault(); openPanel(); return; }
      n = n.parentNode;
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' || e.keyCode === 27) closePanel();
  });

  /* 游戏用 menu.dataset.screen 切换界面；complete 即成功登船撤离 */
  function checkScreen() {
    var m = document.querySelector('.menu');
    var s = m ? (m.getAttribute('data-screen') || '') : '';
    if (s === lastScreen) return;
    lastScreen = s;
    if (s === 'complete') settle(1);
  }
  if (window.MutationObserver) {
    new window.MutationObserver(checkScreen).observe(document.documentElement, {
      subtree: true, attributes: true, attributeFilter: ['data-screen']
    });
  }
  window.setInterval(checkScreen, 1000);
  checkScreen();

  window.ToyRank = {
    settle: settle,
    open: openPanel,
    close: closePanel,
    value: function () { return num(KEY, 0); }
  };
  injectStyle();
})();
