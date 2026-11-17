
const LV3='须「绝「对「强「标」',LV2='须「强「标」',LV1='须「标」';
let filter='all',topic='',kw='',shown=0,hits=[],PAGE=60;
function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function rich(s){
  s=esc(s);
  s=s.replace(/\*\*(.+?)\*\*/g,'<b>$1</b>');
  s=s.split(LV3).join('<span class="lv lv3">须绝对强标</span>');
  s=s.split(LV2).join('<span class="lv lv2">须强标</span>');
  s=s.split(LV1).join('<span class="lv lv1">须标</span>');
  return s;
}
function hl(s){if(!kw)return s;const re=new RegExp('('+kw.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','gi');
  return s.replace(re,'<mark>$1</mark>');}
function fmt(s){return hl(rich(s))}
function isSep(l){return /^\|?[\s:|-]*-{2,}[\s:|-]*\|?$/.test(l)&&l.indexOf('-')>=0&&!/[^\s:|-]/.test(l.replace(/\|/g,''))}
function isRow(l){return l.indexOf('|')>=0 && l.split('|').length>=3}
function cells(r){
  let x=r.trim();
  if(x.startsWith('|'))x=x.slice(1);
  if(x.endsWith('|'))x=x.slice(0,-1);
  return x.split('|').map(t=>t.trim());
}
function tableHtml(rows){
  let h='<table class="tb">';
  rows.forEach(r=>{
    if(isSep(r))return;
    const cs=cells(r);
    h+='<tr>'+cs.map(c=>'<td>'+fmt(c)+'</td>').join('')+'</tr>';
  });
  return h+'</table>';
}
function body(s){
  if(!s)return '';
  const lines=s.split('\n'); let out=[],tbl=null,para=[];
  const flushP=()=>{if(para.length){out.push('<p>'+fmt(para.join(' '))+'</p>');para=[]}};
  const flushT=()=>{if(tbl){out.push(tableHtml(tbl));tbl=null}};
  for(const raw of lines){
    const l=raw.trim();
    if(!l){flushP();continue}
    if(isRow(l)){flushP(); (tbl=tbl||[]).push(l); continue;}
    flushT(); para.push(l);
  }
  flushT(); flushP();
  return out.join('');
}
function has(x,k){return (x.t+' '+x.h+' '+x.c+' '+x.o).indexOf(k)>=0}
function match(x){
  if(topic&&x.t!==topic)return false;
  if(filter==='lv3'&&(x.c+x.o).indexOf(LV3)<0)return false;
  if(filter==='lv2'&&(x.c+x.o).indexOf(LV2)<0)return false;
  if(kw&&!has(x,kw))return false;
  return true;
}
function render(reset){
  const list=document.getElementById('list');
  if(reset){list.innerHTML='';shown=0;}
  const slice=hits.slice(shown,shown+PAGE);
  let last=null,frag='';
  slice.forEach(x=>{
    if(x.t!==last){frag+='<div class="topic">'+esc(x.t)+'</div>';last=x.t;}
    frag+='<div class="item"><h3>'+hl(esc(x.h))+'</h3><div class="c">'+body(x.c)+
      '</div><div class="o">'+hl(rich(x.o))+'</div></div>';
  });
  list.insertAdjacentHTML('beforeend',frag);
  shown+=slice.length;
  const more=document.getElementById('more');
  more.style.display=shown<hits.length?'block':'none';
  more.textContent='继续显示（还有 '+(hits.length-shown)+' 条）';
  document.getElementById('cnt').textContent=hits.length+' 条';
}
function buildTopics(){
  const box=document.getElementById('topics'); if(!box) return;
  const seen=new Map();
  D.forEach(x=>seen.set(x.t,(seen.get(x.t)||0)+1));
  let h='<span class="tchip on" data-t="">全部 '+D.length+'</span>';
  for(const [k,v] of seen) h+='<span class="tchip" data-t="'+esc(k)+'">'+esc(k)+' <b style="color:#9a6b4f;font-weight:600">'+v+'</b></span>';
  box.innerHTML=h;
  const btn=document.getElementById('tbtn');
  btn.textContent='章节导航（'+seen.size+' 节）▾';
  btn.addEventListener('click',()=>{
    const open=box.classList.toggle('open');
    btn.textContent='章节导航（'+seen.size+' 节）'+(open?'▴':'▾');
  });
  box.querySelectorAll('.tchip').forEach(c=>c.addEventListener('click',()=>{
    box.querySelectorAll('.tchip').forEach(x=>x.classList.remove('on'));
    c.classList.add('on'); topic=c.dataset.t; run();
    document.getElementById('list').scrollIntoView({block:'start'});
  }));
}
function run(){
  hits=D.filter(match);render(true);
  if(!hits.length){document.getElementById('list').innerHTML=
    '<div class="topic" style="color:#97504a">没有匹配的条目</div>';
    document.getElementById('cnt').textContent='0 条';}
}
let timer=null;
document.getElementById('q').addEventListener('input',e=>{
  clearTimeout(timer);timer=setTimeout(()=>{kw=e.target.value.trim();run();},180);
});
document.querySelectorAll('.chip').forEach(c=>c.addEventListener('click',()=>{
  document.querySelectorAll('.chip').forEach(x=>x.classList.remove('on'));
  c.classList.add('on');filter=c.dataset.f;run();window.scrollTo({top:0,behavior:'smooth'});
}));
document.getElementById('more').addEventListener('click',()=>render(false));
buildTopics();run();
