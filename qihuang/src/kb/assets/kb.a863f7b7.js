/* 中医典籍文化故事 · 知识库渲染 */
let filter='all',topic='',kw='',shown=0,hits=[],PAGE=40;
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function rich(s){s=esc(s);return s.replace(/\*\*(.+?)\*\*/g,'<b>$1</b>')}
function hl(s){if(!kw)return s;const re=new RegExp('('+kw.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','gi');
  return s.replace(re,'<mark>$1</mark>');}
function fmt(s){return hl(rich(s))}
function body(s){if(!s)return '';return s.split('\n').map(l=>l.trim()).filter(Boolean)
  .map(l=>'<p>'+fmt(l)+'</p>').join('');}
function has(x,k){return (x.t+' '+x.h+' '+x.c+' '+x.o).indexOf(k)>=0}
function match(x){
  if(topic&&x.t!==topic)return false;
  if(filter!=='all'&&x.g!==filter)return false;
  if(kw&&!has(x,kw))return false;
  return true;
}
const GENRE={'all':'全部','典籍':'典籍','人物':'人物','典故':'典故','风物':'风物'};
function render(reset){
  const list=document.getElementById('list');
  if(reset){list.innerHTML='';shown=0;}
  const slice=hits.slice(shown,shown+PAGE);
  let last=null,frag='';
  slice.forEach(x=>{
    if(x.t!==last){frag+='<div class="topic">'+esc(x.t)+'</div>';last=x.t;}
    frag+='<div class="item"><div class="genre">'+esc(GENRE[x.g]||x.g)+'</div>'+
      '<h3>'+hl(esc(x.h))+'</h3><div class="c">'+body(x.c)+
      '</div><div class="o">'+hl(esc(x.o))+'</div></div>';
  });
  list.insertAdjacentHTML('beforeend',frag);
  shown+=slice.length;
  const more=document.getElementById('more');
  more.style.display=shown<hits.length?'block':'none';
  more.textContent='继续显示（还有 '+(hits.length-shown)+' 则）';
  document.getElementById('cnt').textContent=hits.length+' 则';
}
function buildTopics(){
  const box=document.getElementById('topics');if(!box)return;
  const seen=new Map();
  D.forEach(x=>seen.set(x.t,(seen.get(x.t)||0)+1));
  let h='<span class="tchip on" data-t="">全部 '+D.length+'</span>';
  for(const [k,v] of seen)h+='<span class="tchip" data-t="'+esc(k)+'">'+esc(k)+' '+v+'</span>';
  box.innerHTML=h;
  const btn=document.getElementById('tbtn');
  btn.textContent='章节导航（'+seen.size+' 节）▾';
  btn.addEventListener('click',()=>{
    const open=box.classList.toggle('open');
    btn.textContent='章节导航（'+seen.size+' 节）'+(open?'▴':'▾');
  });
  box.querySelectorAll('.tchip').forEach(c=>c.addEventListener('click',()=>{
    box.querySelectorAll('.tchip').forEach(x=>x.classList.remove('on'));
    c.classList.add('on');topic=c.dataset.t;run();
    document.getElementById('list').scrollIntoView({block:'start'});
  }));
}
function run(){
  hits=D.filter(match);render(true);
  if(!hits.length){document.getElementById('list').innerHTML=
    '<div class="topic" style="color:#97504a">没有匹配的条目</div>';
    document.getElementById('cnt').textContent='0 则';}
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
