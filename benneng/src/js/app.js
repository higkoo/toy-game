(function () {
  'use strict';

  var DATA = window.BENNENG_DATA;
  if (!DATA || !DATA.collections || !DATA.collections.length) return;

  var SEEN_KEY = 'benneng.seen.v1';
  var ACTIVE_KEY = 'benneng.active.v1';

  var tabsEl = document.getElementById('tabs');
  var listEl = document.getElementById('list');
  var emptyEl = document.getElementById('empty');
  var searchEl = document.getElementById('search');
  var searchClearEl = document.getElementById('searchClear');
  var collCardEl = document.getElementById('collectionCard');
  var collCoverEl = document.getElementById('collCover');
  var collKickerEl = document.getElementById('collKicker');
  var collNameEl = document.getElementById('collName');
  var collIntroEl = document.getElementById('collIntro');
  var collLinkEl = document.getElementById('collLink');
  var listMetaEl = document.getElementById('listMeta');
  var dockNameEl = document.getElementById('dockName');
  var seenCountEl = document.getElementById('seenCount');
  var seenTotalEl = document.getElementById('seenTotal');
  var barFillEl = document.getElementById('barFill');
  var continueBtn = document.getElementById('continueBtn');
  var toastEl = document.getElementById('toast');

  var seen = new Set(readArray(SEEN_KEY));
  var active = clampIndex(readNumber(ACTIVE_KEY), DATA.collections.length);
  var query = '';
  var toastTimer = null;

  function readArray(key) {
    try {
      var v = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(v) ? v : [];
    } catch (e) { return []; }
  }
  function readNumber(key) {
    try { return parseInt(localStorage.getItem(key), 10) || 0; } catch (e) { return 0; }
  }
  function clampIndex(n, len) { return n >= 0 && n < len ? n : 0; }
  function write(key, value) {
    try { localStorage.setItem(key, value); } catch (e) {}
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }
  function current() { return DATA.collections[active]; }

  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2200);
  }

  /* Toy SDK 在不同容器里可能挂在 window.Toy 或 window.toy 下，统一探测 */
  function toyApi() {
    var roots = [];
    try { if (window.Toy) roots.push(window.Toy); } catch (e) {}
    try { if (window.toy) roots.push(window.toy); } catch (e) {}
    for (var i = 0; i < roots.length; i++) {
      var o = roots[i];
      if (!o) continue;
      if (typeof o.navigate === 'function') return o;
      if (o.toy && typeof o.toy.navigate === 'function') return o.toy;
    }
    return null;
  }

  function openVideo(video) {
    markSeen(video.bv);
    var api = toyApi();
    if (api) {
      try {
        var r = api.navigate({ type: 'video', id: video.bv });
        if (r && typeof r.catch === 'function') {
          r.catch(function () { copyFallback(video); });
        }
        return;
      } catch (e) {}
    }
    copyFallback(video);
  }

  /* 非 Toy 容器 / 导航失败时：复制链接，交给 B 站 App 打开 */
  function copyFallback(video) {
    var url = 'https://www.bilibili.com/video/' + video.bv;
    var copied = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function () {}, function () {});
        copied = true;
      }
    } catch (e) {}
    showToast(copied ? '已复制视频链接 · ' + video.bv : '视频地址：' + url);
  }

  function markSeen(bv) {
    if (seen.has(bv)) { updateDock(); return; }
    seen.add(bv);
    write(SEEN_KEY, JSON.stringify(Array.from(seen)));

    var row = listEl.querySelector('[data-bv="' + bv + '"]');
    if (row) {
      row.classList.add('is-seen');
      var titleEl = row.querySelector('.row-title');
      if (titleEl && !titleEl.querySelector('.row-badge')) {
        var badge = document.createElement('span');
        badge.className = 'row-badge';
        badge.textContent = '已看';
        titleEl.appendChild(badge);
      }
    }
    updateDock();
  }

  function renderTabs() {
    tabsEl.innerHTML = DATA.collections.map(function (c, i) {
      return '<button class="tab' + (i === active ? ' is-active' : '') + '" type="button" role="tab"'
        + ' aria-selected="' + (i === active ? 'true' : 'false') + '" data-index="' + i + '">'
        + '<span class="tab-no">合集 ' + pad(i + 1) + '</span>'
        + '<span class="tab-name">' + esc(c.name) + '</span>'
        + '<span class="tab-count">' + c.count + ' 集</span>'
        + '</button>';
    }).join('');
  }

  function renderCollection() {
    var c = current();
    collCoverEl.src = c.cover;
    collCoverEl.alt = c.name + ' 封面';
    collKickerEl.innerHTML = '合集 ' + pad(active + 1) + '<i></i><span>' + c.count + ' 集</span>';
    collNameEl.textContent = c.name;
    collIntroEl.textContent = c.intro;
    collLinkEl.href = c.listUrl;
    dockNameEl.textContent = c.name;
    seenTotalEl.textContent = c.count;
    searchEl.value = '';
    query = '';
    searchClearEl.hidden = true;
  }

  function renderList() {
    var c = current();
    var q = query.trim().toLowerCase();
    var items = c.videos.filter(function (v) {
      return !q || v.t.toLowerCase().indexOf(q) !== -1 || v.bv.toLowerCase().indexOf(q) !== -1;
    });

    listEl.innerHTML = items.map(function (v) {
      var isSeen = seen.has(v.bv);
      return '<button class="row' + (isSeen ? ' is-seen' : '') + '" type="button" data-bv="' + v.bv + '"'
        + ' aria-label="第 ' + v.n + ' 讲：' + esc(v.t) + '">'
        + '<span class="row-no">' + pad(v.n) + '</span>'
        + '<span class="row-title">' + esc(v.t) + (isSeen ? '<span class="row-badge">已看</span>' : '') + '</span>'
        + '<span class="row-play" aria-hidden="true">'
        + '<svg viewBox="0 0 12 12" fill="currentColor"><path d="M3.2 1.6a.7.7 0 0 1 1.06-.6l6.1 4.4a.7.7 0 0 1 0 1.2l-6.1 4.4a.7.7 0 0 1-1.06-.6V1.6Z"/></svg>'
        + '</span></button>';
    }).join('');

    var hasItems = items.length > 0;
    emptyEl.hidden = hasItems;
    listMetaEl.textContent = q ? ('匹配 ' + items.length + ' 集') : (c.count + ' 集');
  }

  function updateDock() {
    var c = current();
    var done = c.videos.filter(function (v) { return seen.has(v.bv); }).length;
    seenCountEl.textContent = done;
    seenTotalEl.textContent = c.count;
    barFillEl.style.width = (c.count ? (done / c.count) * 100 : 0).toFixed(1) + '%';
    continueBtn.textContent = done >= c.count ? '重新温习' : '继续学习';
  }

  function setActive(index, options) {
    active = index;
    write(ACTIVE_KEY, String(active));
    renderTabs();
    renderCollection();
    renderList();
    updateDock();

    if (options && options.scroll) {
      collCardEl.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'start'
      });
    }
  }

  tabsEl.addEventListener('click', function (e) {
    var tab = e.target.closest('.tab');
    if (!tab) return;
    var index = parseInt(tab.getAttribute('data-index'), 10);
    if (index === active) {
      collCardEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    setActive(index, { scroll: true });
  });

  listEl.addEventListener('click', function (e) {
    var row = e.target.closest('.row');
    if (!row) return;
    var bv = row.getAttribute('data-bv');
    var c = current();
    var video = c.videos.filter(function (v) { return v.bv === bv; })[0];
    if (video) openVideo(video);
  });

  searchEl.addEventListener('input', function () {
    query = searchEl.value;
    searchClearEl.hidden = !query;
    renderList();
  });

  searchClearEl.addEventListener('click', function () {
    searchEl.value = '';
    query = '';
    searchClearEl.hidden = true;
    renderList();
    searchEl.focus();
  });

  continueBtn.addEventListener('click', function () {
    var c = current();
    var next = c.videos.filter(function (v) { return !seen.has(v.bv); })[0] || c.videos[0];
    if (next) openVideo(next);
  });

  document.getElementById('startBtn').addEventListener('click', function () {
    collCardEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  document.getElementById('topMeta').textContent = DATA.collections.length + ' 个合集 · ' + DATA.total + ' 集';

  renderTabs();
  renderCollection();
  renderList();
  updateDock();

  /* ===== Toy 原生底栏适配 =====
   * Toy 容器底部有一条原生互动栏覆盖在 WebView 上，env(safe-area-inset-bottom)
   * 不包含它。这里通过 SDK 的容器状态推出底部需要预留的高度，写入 --bottom-inset。 */
  (function () {
    var root = document.documentElement;
    var NATIVE_BAR = 64;
    var env = 0;
    var timer = null;

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
    function apply(px) {
      root.style.setProperty('--bottom-inset', Math.max(0, Math.round(px) || 0) + 'px');
    }
    function sdkNs() {
      var cands = [];
      try { if (window.Toy) cands.push(window.Toy); } catch (e) {}
      try { if (window.toy) cands.push(window.toy); } catch (e) {}
      for (var i = 0; i < cands.length; i++) {
        var c = cands[i];
        if (!c) continue;
        if (typeof c.getContainerState === 'function') return c;
        if (c.toy && typeof c.toy.getContainerState === 'function') return c.toy;
      }
      return null;
    }
    function fromState(st) {
      if (st && st.immersive === true) { apply(env); return; }
      var reported = 0;
      if (st && st.safeArea && typeof st.safeArea.bottom === 'number') reported = st.safeArea.bottom;
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
        } else {
          apply(env);
        }
      } catch (e) { apply(env); }
      return true;
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
    function boot() {
      env = envBottom();
      var tries = 0;
      timer = setInterval(function () {
        if (probe()) { clearInterval(timer); timer = null; return; }
        if (++tries > 24) { clearInterval(timer); timer = null; apply(env); }
      }, 150);
    }
    if (document.body) boot();
    else document.addEventListener('DOMContentLoaded', boot);
    window.addEventListener('resize', refresh);
    window.addEventListener('orientationchange', function () { setTimeout(refresh, 260); });
  })();
})();
