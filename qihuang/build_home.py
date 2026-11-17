# -*- coding: utf-8 -*-
"""重建 qihuang 首页：站点只保留知识库，首页即知识库门面（33 册目录 + 搜索）。"""
import re, io, os

P = 'src/index.html'
SRC = '/tmp/qh_orig_index.html'   # 构建源：原始首页（git HEAD 版本），保证脚本可重复执行
s = open(SRC if os.path.exists(SRC) else P, encoding='utf-8').read()

i_style_end = s.index('</style>')
i_body = s.index('<body>')

head = s[:i_style_end]          # <head> ... CSS ... (不含 </style>)

# ---- 清理首页已不再使用的 CSS 分段（视频导航相关，站点只剩知识库） ----
DEAD_SECTIONS = [
    '课程封面图窗', '章节横幅（天纪）', 'hero 人像', '电子书货架',
    '分集面板（移动端合集替代页）', '视频打不开时的兜底提示',
]
for name in DEAD_SECTIONS:
    m = re.search(r'/\* -+ ' + re.escape(name) + r' -+ \*/', head)
    if not m:
        print('  未找到分段:', name)
        continue
    start = m.start()
    # 结束点：下一个分段注释，或样式表末尾
    nxt = re.search(r'/\* -+ ', head[m.end():])
    end = m.end() + nxt.start() if nxt else len(head)
    head = head[:start] + head[end:]
    print('  已删除分段:', name)

# 孤立的 .card.finale 规则（地纪卡片专用）
head = re.sub(r'/\* 地纪特殊卡 \*/\s*\.card\.finale\{.*?\n\}\n', '', head, flags=re.S)
head = re.sub(r'\.card\.finale h3\{[^}]*\}\n', '', head)
head = re.sub(r'\.card\.finale \.unfinished\{[^}]*\}\n', '', head)
head = re.sub(r'\.card\.finale \.unfinished::before\{[^}]*\}\n', '', head)
# 其余已无 HTML 对应的卡片/货架/弹层规则
for pat in [
    r'\.card-media\{[^}]*\}\n', r'\.card-media img\{[^}]*\}\n',
    r'\.card-media \.card-cap\{[^}]*\}\n', r'\.card-media::after\{[^}]*\}\n',
    r'\.card-top\{[^}]*\}\n', r'\.card-idx\{[^}]*\}\n',
    r'\.card \.card-en\{[^}]*\}\n', r'\.card-foot\{[^}]*\}\n',
    r'\.card-foot \.dot\{[^}]*\}\n', r'\.card-foot span\{[^}]*\}\n',
    r'\.card-link\{[^}]*\}\n', r'\.card-link:hover\{[^}]*\}\n',
    r'\.card-link svg\{[^}]*\}\n', r'\.card-link\.doc\{[^}]*\}\n',
    r'\.card-link\.doc:hover\{[^}]*\}\n', r'\.card-link\.note\{[^}]*\}\n',
    r'\.card-link\.note:hover\{[^}]*\}\n',
    r'\.section-banner\{[^}]*\}\n', r'\.section-banner img\{[^}]*\}\n',
    r'\.shelf\{[^}]*\}\n', r'\.shelf \.book\{[^}]*\}\n',
    r'\.shelf \.book:hover\{[^}]*\}\n', r'\.shelf \.book-ic\{[^}]*\}\n',
    r'\.shelf \.book-bd\{[^}]*\}\n', r'\.shelf \.book-bd b\{[^}]*\}\n',
    r'\.shelf \.book-bd span\{[^}]*\}\n', r'\.shelf \.book-cta\{[^}]*\}\n',
    r'\.shelf \.book:hover \.book-cta\{[^}]*\}\n',
    r'\.shelf \.book-cta svg\{[^}]*\}\n',
    r'\.hero-portrait\{[^}]*\}\n', r'\.hero-portrait img\{[^}]*\}\n',
    r'\.vtip-url\{[^}]*\}\n',
    r'button\.link-copy\{[^}]*\}\n', r'button\.link-copy:focus-visible\{[^}]*\}\n',
    r'button\.foot-link\{[^}]*\}\n', r'button\.foot-link:hover\{[^}]*\}\n',
]:
    head = re.sub(pat, '', head)

rest = s[i_body:]

# 取出两个平台脚本块（榜单 / 底栏适配），原样保留
m_rank = re.search(r'<script>\n/\* ===== TOY 原生榜单.*?</script>', rest, re.S)
m_btm = re.search(r'<script>\n/\* ===== TOY 原生底栏.*?</script>', rest, re.S)
rank_js = m_rank.group(0)
btm_js = m_btm.group(0)

# 榜单 key 原为复制自 sanji 的串号，改成 qihuang 自己的，并把计分口径从「看集」改为「读册」
rank_js = rank_js.replace("key: 'sanji.rank.v1'", "key: 'qihuang.rank.v1'")
rank_js = rank_js.replace(
    "kind: 'content'", "kind: 'content',\n  unit: '册'")
rank_js = rank_js.replace(
    "'已看集数'", "'已读册数'")
rank_js = rank_js.replace(
    "'还没有人上榜。看一集，就会记 1 分。'",
    "'还没有人上榜。读一册，就会记 1 分。'")
rank_js = rank_js.replace(
    "'每看一集加 1 分，同一集不重复计，一直累计。'",
    "'每读一册加 1 分，同一册不重复计，一直累计。'")
rank_js = rank_js.replace(
    " *   - 内容：每看一集 +1，同一集只计一次，一直累计。",
    " *   - 内容：每读一册 +1，同一册只计一次，一直累计。")
rank_js = rank_js.replace(
    "/* 内容类：每看一集 +1；用已看 id 集合去重，同一集不重复计分 */",
    "/* 内容类：每读一册 +1；用已读 id 集合去重，同一册不重复计分 */")

# ------------------------------------------------------------------ 新增 CSS
EXTRA_CSS = """
/* ---------- 知识库门面（首页即知识库） ---------- */
.kb-search{
  position:relative;max-width:620px;margin:34px auto 0;
}
.kb-search input{
  width:100%;padding:15px 20px 15px 46px;border-radius:999px;
  border:1px solid rgba(163,128,63,.34);background:rgba(255,255,255,.82);
  font-family:inherit;font-size:15px;color:var(--ink);outline:none;
  transition:border-color .22s,box-shadow .22s,background .22s;
}
.kb-search input::placeholder{color:#a39884}
.kb-search input:focus{
  border-color:var(--gold);background:#fff;
  box-shadow:0 0 0 4px rgba(163,128,63,.1);
}
.kb-search .ico{
  position:absolute;left:18px;top:50%;transform:translateY(-50%);
  width:16px;height:16px;fill:none;stroke:var(--gold-deep);stroke-width:1.7;
  pointer-events:none;
}
.kb-hint{
  max-width:620px;margin:12px auto 0;text-align:center;
  font-size:11.5px;letter-spacing:.14em;color:var(--ink-soft);
}

.kb-bar{
  display:flex;align-items:baseline;gap:14px;flex-wrap:wrap;
  margin:56px 0 22px;padding-bottom:14px;
  border-bottom:1px solid rgba(216,181,106,.28);
}
.kb-bar h2{
  margin:0;font-size:clamp(21px,3.4vw,28px);font-weight:600;letter-spacing:.18em;color:var(--ink);
}
.kb-bar .cnt{margin-left:auto;font-size:12px;letter-spacing:.2em;color:var(--ink-soft)}

.vol-grid{
  display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;
  padding-bottom:20px;
}
.vol{
  position:relative;display:flex;flex-direction:column;overflow:hidden;
  border-radius:3px;padding:20px 20px 16px;min-height:196px;
  background:linear-gradient(165deg,rgba(255,255,255,.88),rgba(255,252,245,.55));
  border:1px solid rgba(120,100,64,.16);
  box-shadow:0 8px 20px rgba(120,100,64,.05);
  text-decoration:none;color:inherit;
  transition:transform .28s,border-color .28s,box-shadow .28s,background .28s;
}
.vol::before{
  content:"";position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity .3s;
  background:radial-gradient(380px 200px at 18% 0%,rgba(216,181,106,.2),transparent 70%);
}
.vol:hover{transform:translateY(-4px);border-color:rgba(163,128,63,.44);box-shadow:0 20px 42px rgba(120,95,50,.14)}
.vol:hover::before{opacity:1}
.vol:focus-visible{outline:2px solid var(--gold);outline-offset:3px}
.vol-top{display:flex;align-items:center;gap:10px;margin-bottom:11px}
.vol-seal{
  width:26px;height:26px;flex:0 0 26px;border:1px solid var(--gold);border-radius:5px;
  display:grid;place-items:center;font-size:12px;color:var(--gold-2);letter-spacing:0;
}
.vol-n{font-size:11px;letter-spacing:.22em;color:var(--ink-soft)}
.vol-num{margin-left:auto;font-size:11px;letter-spacing:.16em;color:var(--gold-deep)}
.vol h3{
  margin:0;font-size:20px;font-weight:600;letter-spacing:.12em;color:#2b2418;
  display:flex;align-items:baseline;gap:9px;
}
.vol h3 .go{
  font-size:12px;letter-spacing:.1em;color:var(--gold-2);opacity:0;
  transform:translateX(-6px);transition:opacity .25s,transform .25s;
}
.vol:hover h3 .go{opacity:1;transform:none}
.vol p{
  margin:12px 0 0;font-size:12.5px;line-height:1.95;color:var(--ink-dim);letter-spacing:.02em;flex:1;
}
.vol-tags{
  margin-top:14px;padding-top:12px;border-top:1px solid rgba(120,100,64,.14);
  display:flex;gap:6px;flex-wrap:wrap;
}
.vol-tags span{
  font-size:10.5px;letter-spacing:.14em;color:var(--ink-soft);
  border:1px solid rgba(120,100,64,.18);border-radius:999px;padding:2px 9px;
}
.vol-empty{
  grid-column:1/-1;text-align:center;padding:60px 0 70px;
  font-size:14px;letter-spacing:.1em;color:#97504a;
}

.kb-foot-note{
  max-width:640px;margin:56px auto 0;text-align:center;
  font-size:11.5px;line-height:2.1;letter-spacing:.05em;color:var(--ink-soft);
}

@media (max-width:860px){
  .vol-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
}
@media (max-width:600px){
  .vol-grid{grid-template-columns:1fr}
  .vol{min-height:0}
  .kb-search input{padding:13px 16px 13px 40px;font-size:14px}
  .kb-bar{margin:40px 0 18px}
}
"""

head = head + EXTRA_CSS + '\n</style>'

# ------------------------------------------------------------------ 新 body
BODY = """<body>

<div class="grain"></div>

<nav class="nav">
  <div class="nav-inner">
    <div class="nav-logo"><span class="seal">岐</span>典籍故事</div>
    <div class="nav-links">
      <a href="#kb">全部册目</a>
      <a href="#about">关于</a>
    </div>
  </div>
</nav>

<header class="hero">
  <svg class="hero-mountain" viewBox="0 0 1440 520" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <linearGradient id="mg1" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#8d7a56" stop-opacity=".14"/>
        <stop offset="100%" stop-color="#f7f2e7" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="mg2" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#7d6b48" stop-opacity=".2"/>
        <stop offset="100%" stop-color="#f7f2e7" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <path d="M0,380 L120,300 L210,346 L320,236 L420,320 L520,272 L640,360 L760,300 L880,352 L1000,264 L1120,330 L1230,286 L1340,360 L1440,318 L1440,520 L0,520 Z" fill="url(#mg1)"/>
    <path d="M0,440 L150,388 L260,428 L380,352 L500,420 L620,376 L740,436 L860,384 L980,440 L1100,372 L1220,428 L1340,392 L1440,440 L1440,520 L0,520 Z" fill="url(#mg2)"/>
  </svg>
  <div class="wrap hero-inner">
    <div class="eyebrow">典籍文化 · 故事合集</div>
    <h1>岐黄典籍故事</h1>
    <div class="cn-sub">源流 · 人物 · 典故 · 博物</div>
    <div class="en-sub">Stories from the Classics of Chinese Culture</div>
    <p class="lede">
      以中医典籍与传统文化的故事为线索，分三十三册整理 692 则文化读物：
      典籍源流、历代医家、成语典故、药名博物、天文历法、节气民俗、医德佳话、经络方名、医药器物。
      只谈文化与历史，不涉诊疗。
    </p>
    <p class="disclaimer">本站为传统文化与典籍知识介绍，仅供文化阅读，不构成医疗建议。</p>
    <div class="kb-search">
      <svg class="ico" viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="7" cy="7" r="5"/><line x1="11" y1="11" x2="15" y2="15"/>
      </svg>
      <input id="q" type="search" autocomplete="off"
             placeholder="搜索册名或条目：针灸、杏林、节气、李时珍……"
             aria-label="搜索册名或条目">
    </div>
    <p class="kb-hint">输入即筛选册目；点任一册进入条目列表，可按体裁筛选与章节导航。</p>
    <div class="hero-stats">
      <div class="st"><b>三十三</b><span>分 册</span></div>
      <div class="st"><b>六百九十二</b><span>则 读 物</span></div>
      <div class="st"><b>五</b><span>种 体 裁</span></div>
      <div class="st"><b>零</b><span>诊 疗 内 容</span></div>
    </div>
  </div>
</header>

<main class="wrap" id="kb">
  <div class="kb-bar">
    <h2>全部册目</h2>
    <span class="cnt" id="vstat"></span>
  </div>
  <div class="vol-grid" id="box"></div>
</main>

<section class="coda" id="about">
  <div class="quote reveal">为天地立心，为生民立命，为往圣继绝学</div>
  <div class="from reveal">— 全集结语 —</div>
  <p class="note reveal">
    本站为中医典籍与传统文化的故事合集，介绍典籍源流、名医逸事、成语典故与博物风物，
    仅供文化阅读与学习参考，不构成医疗建议。内容依据公开典籍与文化史材料整理，
    每一则均标注出处，体裁分为典籍、人物、典故与风物四类。
  </p>
</section>

<footer class="foot">
  <div class="wrap">
    <div class="links">
      <a href="#kb">全部册目</a>
      <a href="#about">关于</a>
    </div>
    <div class="copy">岐黄典籍故事 · 中医文化合集 · 仅供文化阅读，不构成医疗建议</div>
  </div>
</footer>

<button type="button" class="version" id="verTag" title="页面版本 · 点开排行榜" aria-label="打开排行榜">v3.0.0</button>

<script src="kb/catalog.js"></script>
<script>
/* ===== 知识库目录渲染 ===== */
(function () {
  'use strict';
  var C = window.KB_CATALOG || [];
  var box = document.getElementById('box');
  var q = document.getElementById('q');
  var stat = document.getElementById('vstat');

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c];
    });
  }
  function sealOf(name) {
    return esc(String(name).replace(/[^\\u4e00-\\u9fff]/g, '').slice(0, 1) || '卷');
  }
  function render(kw) {
    kw = (kw || '').trim();
    var hits = [];
    for (var i = 0; i < C.length; i++) {
      var v = C[i];
      if (kw && v.name.indexOf(kw) < 0 && v.keys.indexOf(kw) < 0) continue;
      hits.push(v);
    }
    stat.textContent = kw
      ? hits.length + ' 册匹配「' + kw + '」'
      : C.length + ' 册 · ' + C.reduce(function (a, v) { return a + v.count; }, 0) + ' 则';

    if (!hits.length) {
      box.innerHTML = '<div class="vol-empty">没有匹配的册目，换个词试试。</div>';
      return;
    }
    var out = '';
    for (var j = 0; j < hits.length; j++) {
      var v = hits[j];
      var tags = '';
      for (var k = 0; k < v.topics.length && k < 3; k++) {
        tags += '<span>' + esc(v.topics[k].n) + '</span>';
      }
      out += '<a class="vol" href="kb/' + esc(v.file) + '">' +
        '<div class="vol-top">' +
          '<span class="vol-seal">' + sealOf(v.name) + '</span>' +
          '<span class="vol-n">' + esc(v.file.replace('.html', '')) + '</span>' +
          '<span class="vol-num">' + v.count + ' 则</span>' +
        '</div>' +
        '<h3>' + esc(v.name) + '<span class="go">→</span></h3>' +
        '<p>' + esc(v.intro) + '</p>' +
        '<div class="vol-tags">' + tags + '</div>' +
      '</a>';
    }
    box.innerHTML = out;
  }

  q.addEventListener('input', function (e) { render(e.target.value); });
  render('');
})();
</script>

__RANK__

__BTM__

</body>
</html>
"""

BODY = BODY.replace('__RANK__', rank_js).replace('__BTM__', btm_js)

open(P, 'w', encoding='utf-8').write(head + BODY)
print('written, len =', len(head + BODY))
