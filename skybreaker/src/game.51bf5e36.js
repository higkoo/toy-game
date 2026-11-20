(()=>{'use strict';const T=window.TH,$=id=>document.getElementById(id),vec=(x=0,y=0,z=0)=>new T.Vector(x,y,z);
const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,v)),rand=(a,b)=>a+Math.random()*(b-a),choice=a=>a[Math.floor(Math.random()*a.length)];
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
let renderer;
try{renderer=new T.Renderer({canvas:$('scene'),antialias:true,powerPreference:'high-performance'})}catch(err){$('ultHint').textContent='需要支持 WebGL 2 的浏览器，请打开硬件加速。';$('loadState').textContent='无法启动 3D 渲染。';$('start').disabled=true;return}
const scene=new T.Scene(),camera=new T.Camera(52,1,.2,3600);scene.fog=new T.Fog(0x9db7c4,.0028);
renderer.outputColorSpace='srgb';renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix()}resize();onresize=resize;
const daylight=new T.Sun(0xffeacf,2.65);daylight.position.set(-90,110,38);scene.add(daylight,new T.Hemi(0xe5f5ff,0x50606d,1.5));
const assetPack=window.__FLIGHT_ASSETS__;
if(!assetPack||!assetPack.mesh||!assetPack.maps){$('ultHint').textContent='资源包 assets.js 未能加载，请刷新页面重试。';$('loadState').textContent='资源加载失败，请刷新重试。';$('start').disabled=true;return}
const decodeBytes=value=>Uint8Array.from(atob(value),c=>c.charCodeAt(0));
const textures=new Map();
function loadMap(name) {
 if(textures.has(name))return textures.get(name);
 const img=new Image(), texture=new T.Texture();
 img.onload=()=>{texture.image=img;texture.needsUpdate=true};
 img.src=assetPack.maps[name];texture.colorSpace='srgb';texture.anisotropy=4;textures.set(name,texture);return texture;
}
let airframe;
function buildTomcat(){
 const group=new T.Group();
 for(const [name,vertexData,indexData] of assetPack.mesh){
  const packed=new Int16Array(decodeBytes(vertexData).buffer),index=new Uint16Array(decodeBytes(indexData).buffer),positions=[],uv=[];
  for(let i=0;i<packed.length;i+=5){positions.push(packed[i]/4096,packed[i+1]/4096,packed[i+2]/4096);uv.push(packed[i+3]/4096,packed[i+4]/4096)}
  const geometry=new T.Geometry();
  geometry.setAttribute('position',new T.Attribute(positions,3));geometry.setAttribute('uv',new T.Attribute(uv,2));geometry.setIndex(Array.from(index));geometry.computeVertexNormals();
  const glass=name==='glass';
  const material=new T.Material({map:assetPack.maps[name]?loadMap(name):null,color:glass?'#7197a5':name==='gray'?'#535a5d':'#ffffff',side:2,roughness:glass?.16:.7,metalness:glass?.43:.13});
  group.add(new T.Mesh(geometry,material));
 }
 return group;
}

function plumeTexture(seed) {
 const canvas=document.createElement('canvas'); canvas.width=canvas.height=96;
 const ctx=canvas.getContext('2d'), pixels=ctx.createImageData(96,96);
 const hash=(x,y)=>{const h=Math.sin(x*127.1+y*311.7+seed)*43758.5453;return h-Math.floor(h)};
 function noise(x,y){
  const i=Math.floor(x),j=Math.floor(y);let u=x-i,v=y-j;
  u=u*u*(3-2*u);v=v*v*(3-2*v);
  return (hash(i,j)*(1-u)+hash(i+1,j)*u)*(1-v)+(hash(i,j+1)*(1-u)+hash(i+1,j+1)*u)*v;
 }
 for(let y=0;y<96;y++)for(let x=0;x<96;x++){
  const u=(x-47.5)/47.5,v=(y-47.5)/47.5;
  const n=.55*noise(u*3,v*3)+.29*noise(u*7,v*7)+.16*noise(u*15,v*15);
  const a=Math.min(1,Math.max(0,(.69-Math.hypot(u,v)+(n-.5)*.76)*3));
  const i=(y*96+x)*4,shade=105+100*n-26*v;
  pixels.data.set([shade,shade,shade,Math.round(255*a*a)],i);
 }
 ctx.putImageData(pixels,0,0);
 return new T.Texture(canvas);
}
const smokeMaps=[plumeTexture(7),plumeTexture(18),plumeTexture(43)];

const geo={box:new T.Box(1,1,1),oval:new T.Sphere(1,24,14),tube:new T.Cylinder(1,1,1,20),cone:new T.Cone(1,1,16),ring:new T.Torus(1,.032,6,72)};
const materials=new Map();
function surface(color,lit=true){const key=color+':'+lit;if(!materials.has(key))materials.set(key,lit?new T.Material({color,metalness:.25,roughness:.63}):new T.Basic({color}));return materials.get(key)}
function shape(parent,kind,col,x,y,z,w,h,d,lit=true){const m=new T.Mesh(geo[kind],surface(col,lit));m.position.set(x,y,z);m.scale.set(w,h,d);parent.add(m);return m}
function group(parent=scene){const g=new T.Group();parent.add(g);return g}
const model=buildTomcat(),player=model.clone(true);scene.add(player);const pos=player.position;pos.set(0,12,0);
const forward=vec(0,0,-1),axis=vec(0,1,0),tmp=vec();
function between(object,a,b,width){const delta=b.clone().sub(a);object.position.copy(a).lerp(b,.5);object.scale.set(width,delta.length(),width);if(delta.lengthSq()>.00001)object.quaternion.setFromUnitVectors(axis,delta.normalize())}
const props=[],sparks=[],deadPlanes=[],enemies=[],shots=[],threats=[],allies=[],tasks=[];
function remove(arr,item){const i=arr.indexOf(item);if(i>=0)arr.splice(i,1)}
let state='intro',mode='flight',time=0,elapsed=0,travel=0,zone=-1,wave=0,nextWave=1,kills=0,pending=0,xp=0,level=1;
const SHIELD_FIRST=2,SHIELD_NEXT=1,ULT_KILLS_PER_USE=20,ULT_CAPACITY=3;
let shield=4,hp=100,shieldWait=0,hitGrace=0,action='',actionAge=0,guardWindow=0,perfectGuard=false,shieldBank=0,shieldCD=0,counterCD=0,counterCount=2;
let mouse={x:0,y:0},firing=false,triggerTap=false,upgradeOptions=[],rerollUsed=false,repairDrop=0;
let msgTime=0,ultUses=1,ultKills=0,ultId='nuke',activeUlt=null,boss=null,bossIntro=0,nextBoss='',target=null;
const STAGE_TIME=82, SLOT_LIMIT=6, gear=[{id:'cannon',rank:1,cd:0}];
const kitTypes={spread:['扇射炮','实弹','三线扫射，强化后增加扇面条数'],rotary:['转管炮','实弹','持续开火逐步提速，松开后转速衰减'],cannon:['双联机炮','实弹','双管连续发射曳光弹'],pierce:['穿甲炮','实弹','弹芯贯穿多架敌机'],flak:['空爆炮','实弹','近炸溅射周围目标'],split:['分裂炮','实弹','弹头在前方分叉'],bounce:['跳弹炮','实弹','命中后转向第二个目标'],laser:['聚焦激光','能量','持续照射同一部位提高伤害'],pulse:['脉冲炮','能量','快速连续的能量脉冲'],chain:['电弧炮','能量','命中后在邻近单位间传导'],charge:['蓄雷炮','能量','第三次命中引爆电荷'],plasma:['等离子炮','能量','慢速球体穿透并灼伤敌群'],guided:['锁定弹仓','导弹','每5秒向最多四个目标齐射'],heavy:['重型火箭','导弹','装填后下次按左键直射重弹'],cluster:['分裂寻的弹','导弹','母弹离架后分裂追踪'],radar:['反辐射导弹','导弹','优先追踪雷达和发射车'],barrage:['集束空爆弹','导弹','弹群覆盖目标区域'],escort:['伴飞炮机','僚机','跟随开火，升级增加火力'],cross:['交叉光翼','僚机','宽间距侧射激光'],hunter:['游猎截击机','僚机','主动出击，优先猎杀侦察机'],strike:['对地攻击机','僚机','自动俯冲打击地面和炮塔'],jam:['电子战僚机','僚机','引走附近的制导弹并反击'],guard:['护盾僚机','僚机','前出挡弹，力竭后退回充能']};
const specials={nuke:['战术核打击','前方标定落点，冲击波清弹并重创敌群。'],swarm:['无人机群','三批无人机分头突击，自动重新分配目标。'],fort:['空中一号','重型友军编队提供火力，并替你拦住来弹。'],rail:['天枪校射','集火标定部件，提高轨道炮威力。再按右键可提前结算。'],web:['导电猎场','命中敌人激活节点，让目标之间形成电网。']};
function say(text,sec=2){$('msg').textContent=text;msgTime=sec}
function beam(a,b,color,width=.08,life=.09,realTime=false){const o=shape(scene,'tube',color,0,0,0,1,1,1,false);between(o,a,b,width);sparks.push({o,life,max:life,fixed:true,realTime})}
function flash(p,kind,size,life=.6,velocity=vec(),realTime=false){const smoke=kind==='smoke';const material=new T.SpriteMaterial({map:choice(smokeMaps),color:smoke?0x3a424b:kind==='ice'?0x9bfaff:0xffb14d,transparent:true,depthWrite:false,blending:smoke?1:2,rotation:rand(0,6)});const o=new T.Sprite(material);o.position.copy(p);o.scale.setScalar(size);scene.add(o);sparks.push({o,life,max:life,size,velocity,sprite:true,realTime})}
function burst(p,size=3,realTime=false){flash(p,'fire',size*1.8,.32,vec(),realTime);flash(p,'smoke',size,.9,vec(0,2,1),realTime);for(let i=0;i<6;i++)flash(p,'fire',size*.4,.35,vec(rand(-7,7),rand(-3,7),rand(-7,7)),realTime)}
function ring(p,color,r,life=.37,realTime=false){const o=shape(scene,'ring',color,0,0,0,1,1,1,false);o.position.copy(p);sparks.push({o,life,max:life,r,realTime})}
function fxTick(dt,realDt){for(let i=sparks.length-1;i>=0;i--){const e=sparks[i];const step=e.realTime?realDt:dt;e.life-=step;if(e.life<=0){scene.remove(e.o);if(e.sprite)e.o.material.dispose();sparks.splice(i,1);continue}const f=1-e.life/e.max;if(e.r)e.o.scale.setScalar(.3+e.r*f);if(e.sprite){e.o.position.addScaledVector(e.velocity,step);e.o.material.opacity=1-f*f;e.o.scale.setScalar(e.size*(.75+f))}}
 for(let i=deadPlanes.length-1;i>=0;i--){const e=deadPlanes[i];e.age+=dt;e.o.position.y-=dt*(2+e.age*6);e.o.position.x+=dt*e.spin*2;e.o.rotation.z+=dt*e.spin;e.o.rotation.x-=dt*.24;e.emit-=dt;if(e.emit<=0){e.emit=.09;flash(e.o.position,'smoke',e.size*1.2,1.5,vec(0,2,-4));flash(e.o.position,'fire',e.size,.3)}if(e.age>3.6){scene.remove(e.o);deadPlanes.splice(i,1);if(e.final)finish(true)}}}
function schedule(delay,fn){tasks.push({at:time+delay,fn})}
function targets(){return enemies.filter(e=>e.hp>0&&!e.hidden)}
function nearest(p,list=targets()){return list.reduce((best,e)=>!best||p.distanceToSquared(e.o.position)<p.distanceToSquared(best.o.position)?e:best,null)}
const passives={counter:['反击挂架','完美闪避多发射一枚追踪反击弹（最多六枚）']};
function arsenalComplete(){return gear.length>=SLOT_LIMIT && gear.every(g=>g.rank===MAX_RANK)}
function upgradeXP(points){
 if(arsenalComplete())return;
 const oldPending=pending;xp+=points;
 let price=8+Math.ceil(level*.95);
 while(xp>=price){xp-=price;level++;pending++;price=8+Math.ceil(level*.95)}
 if(pending&&!upgradeOptions.length)offer();
 else if(pending!==oldPending)$('pick').querySelector('.pick-count').textContent=pending;
}
function eligibleUpgrades(){
 const existing=gear.filter(g=>g.rank<MAX_RANK).map(g=>g.id);
 if(gear.length>=SLOT_LIMIT)return existing;
 const fresh=Object.keys(kitTypes).filter(id=>!gear.some(g=>g.id===id));
 return existing.concat(fresh,counterCount<6?['counter']:[]);
}
function dealUpgrades(pool){
 const candidates=shuffle(pool);
 const owned=id=>gear.find(g=>g.id===id);
 const evolution=candidates.find(id=>owned(id)?.rank===MAX_RANK-1);
 const fresh=candidates.find(id=>kitTypes[id]&&!owned(id));
 const improve=candidates.find(id=>owned(id)||id==='counter');
 const preferred=[evolution,fresh,improve,...candidates].filter(Boolean);
 return shuffle([...new Set(preferred)].slice(0,3));
}
function offer(){
 rerollUsed=false;
 upgradeOptions=dealUpgrades(eligibleUpgrades());
 if(!upgradeOptions.length)pending=0;
 drawCards();
}
function otherUpgrades(){return eligibleUpgrades().filter(id=>!upgradeOptions.includes(id))}
function reroll(){
 if(!pending||rerollUsed||!['play','paused'].includes(state))return;
 const others=otherUpgrades();if(!others.length)return;
 upgradeOptions=dealUpgrades(others);rerollUsed=true;drawCards();
}
function card(id){
 if(passives[id])return passives[id];
 const g=gear.find(i=>i.id===id);
 if(g?.rank===10)return ['终极进化 · '+evolutions[id][0],kitTypes[id][0]+' 10 → 11　'+evolutions[id][1]];
 return [kitTypes[id][0]+(g?' '+g.rank+' → '+(g.rank+1)+'级':' · 新装备'),g?upgradeText(id,g.rank+1):kitTypes[id][2]];
}
function upgradeText(id,n){
 const details={spread:'提高扇射威力，逐级增加弹道',rotary:'提升连射伤害',split:'增加分叉数量与伤害',pierce:'增加穿透目标数',bounce:'增加后续跳弹次数',chain:'增加电弧传导节点',flak:'扩大近炸半径',laser:'提高持续照射伤害',cluster:'增加分裂子弹头数量',escort:'改装穿甲弹，提高伴飞火力'};
 return details[id]||'提升这件装备的攻击威力';
}
function drawCards(){
 const box=$('pick');box.hidden=!pending;if(!pending){box.replaceChildren();return}
 const cards=upgradeOptions.map((id,i)=>{
  const [name,desc]=card(id),ultimate=gear.some(g=>g.id===id&&g.rank===10);
  return '<button data-n="'+i+'" class="'+(ultimate?'evolution':'')+'"><b>'+(i+1)+'</b>'+name+'<em>'+desc+'</em></button>'
 }).join('');
 const available=otherUpgrades().length;
 const refreshLabel=rerollUsed?'本次已刷新':available?'R　刷新一次':'无其他选项';
 box.innerHTML='<div class="pick-tools"><small>'+(gear.length>=SLOT_LIMIT?'六槽已满 · 强化现有装备':'武器升级')+'　×<span class="pick-count">'+pending+'</span></small><button type="button" class="refresh" '+(rerollUsed||!available?'disabled':'')+'>'+refreshLabel+'</button></div><div class="cards">'+cards+'</div>';
 box.querySelector('.refresh').onclick=reroll;
 box.querySelectorAll('[data-n]').forEach(b=>b.onclick=()=>selectUpgrade(Number(b.dataset.n)));
}
function selectUpgrade(i){
 if(!pending||!['play','paused'].includes(state))return;
 const id=upgradeOptions[i];if(!id)return;
 const owned=gear.find(g=>g.id===id);let evolved=false;
 if(owned&&owned.rank<MAX_RANK){owned.rank++;evolved=owned.rank===MAX_RANK}
 else if(gear.length<SLOT_LIMIT && id==='counter'&&counterCount<6)counterCount++;
 else if(gear.length<SLOT_LIMIT && !owned && kitTypes[id])gear.push({id,rank:1,cd:.2});
 else {say(owned&&owned.rank>=MAX_RANK?'该装备已满级':'六槽已满 · 只能强化现有装备',1.2);return}
 pending--;upgradeOptions=[];syncWings();
 if(arsenalComplete())pending=0;
 if(pending)offer();else drawCards();
 if(evolved){ring(pos,'#ffcf66',12,.65);tone(970,.25);say('终极进化 · '+evolutions[id][0],2.4)}
 else say('已装配 · '+(kitTypes[id]?.[0]||passives[id][0]),1.1);
}
function mountLabel(g){return g.rank===MAX_RANK?'★ '+evolutions[g.id][0]:kitTypes[g.id][0]+' '+g.rank}

// The F-14B canopy glass spans x ±0.19, y -0.04…0.28 and z -2.69…-0.90 in model space.
const canopyOffset=vec(0,.12,-1.79), canopyRadii=vec(.185,.155,.87);
const GUARD_RADIUS=10, PERFECT_WINDOW=.15, WARNING_TIME=.6, FORECAST_STEP=.025;
function newCanopyPose(){return {center:vec(),inverse:player.quaternion.clone()}}
function locateCanopy(pose,origin,orientation){
 pose.center.copy(canopyOffset).applyQuaternion(orientation).add(origin);
 pose.inverse.copy(orientation).invert();
}
const canopy=newCanopyPose(),lastCanopy=newCanopyPose();
locateCanopy(canopy,pos,player.quaternion);
locateCanopy(lastCanopy,pos,player.quaternion);
const localStart=vec(),localEnd=vec(),sweepAxes=player.quaternion.clone();
function canopyEntry(start,end,from,to,padding=0){
 // Relative swept segment in canopy space. A fast round can cross it between rendered frames.
 const axes=from===to?to.inverse:sweepAxes.copy(from.inverse).slerp(to.inverse,.5);
 const a=localStart.copy(start).sub(from.center).applyQuaternion(axes);
 const d=localEnd.copy(end).sub(to.center).applyQuaternion(axes);
 const rx=canopyRadii.x+padding,ry=canopyRadii.y+padding,rz=canopyRadii.z+padding;
 a.x/=rx;a.y/=ry;a.z/=rz;d.x/=rx;d.y/=ry;d.z/=rz;d.sub(a);
 const c=a.lengthSq()-1;if(c<=0)return 0;
 const dd=d.lengthSq(),ad=a.dot(d),disc=ad*ad-dd*c;
 if(dd<1e-12||ad>=0||disc<0)return Infinity;
 const fraction=c/(-ad+Math.sqrt(disc));
 return fraction<=1?fraction:Infinity;
}
function steerAirframe(origin,rotation,dt,rolling,rollAge){
 const oldX=origin.x,smoothing=1-Math.exp(-dt*(rolling?3.8:5));
 origin.x+=(mouse.x*27-origin.x)*smoothing;
 origin.y+=(12+mouse.y*13-origin.y)*smoothing;
 rotation.x=mouse.y*.07;
 if(rolling){
  const t=clamp(rollAge/.43,0,1);
  rotation.z=t<1?2*Math.PI*t*t*(3-2*t):0;
 }else{
  const bank=clamp((oldX-origin.x)/Math.max(dt,.001)*.015,-.58,.58);
  rotation.z+=(bank-rotation.z)*Math.min(1,dt*7);
 }
}
function inBurstRange(point,origin=pos,radius=GUARD_RADIUS){
 return point.distanceToSquared(origin)<=radius*radius;
}
const forecastPlane=new T.Group();
const forecast=[canopy,...Array.from({length:Math.round(WARNING_TIME/FORECAST_STEP)},newCanopyPose)];
function forecastCourse(horizon){
 const steps=Math.round(horizon/FORECAST_STEP);
 forecastPlane.position.copy(pos);forecastPlane.rotation.copy(player.rotation);
 let rollAge=actionAge;
 for(let i=1;i<=steps;i++){
  const rolling=action==='roll'&&rollAge<.43;
  rollAge+=FORECAST_STEP/Math.max(IDLE_RATE,combatRate);
  steerAirframe(forecastPlane.position,forecastPlane.rotation,FORECAST_STEP,rolling,rollAge);
  locateCanopy(forecast[i],forecastPlane.position,forecastPlane.quaternion);
 }
 return steps;
}
function radarLinked(b){return b.team<0||enemies.some(e=>e.team===b.team&&e.type==='radar'&&e.hp>0)}
function nearbyJammer(point){return allies.find(a=>a.id==='jam'&&a.o.position.distanceToSquared(point)<400)}
const homingDirection=vec();
function steerIncomingMissile(point,velocity,destination,jammer,dt){
 const goal=homingDirection.copy(jammer?jammer.o.position:destination);
 if(jammer){goal.x+=12;goal.y+=1;goal.z+=2}
 goal.sub(point).normalize().multiplyScalar(32);
 velocity.lerp(goal,Math.min(1,dt*(jammer?6:1.8)));
}
const pathStart=vec(),pathEnd=vec(),pathVelocity=vec();
function predictedEntry(b,steps){
 const start=pathStart.copy(b.o.position),v=pathVelocity.copy(b.v);
 const guided=b.homing&&b.age<2.8&&radarLinked(b);
 if(Math.abs(start.z-canopy.center.z)>1.1+steps*FORECAST_STEP*(guided?32:Math.abs(v.z)))return Infinity;
 for(let i=1;i<=steps;i++){
  const age=b.age+i*FORECAST_STEP;if(age>6)return Infinity;
  if(guided&&age<2.8)steerIncomingMissile(start,v,forecast[i].center,nearbyJammer(start),FORECAST_STEP);
  pathEnd.copy(start).addScaledVector(v,FORECAST_STEP);
  const enter=canopyEntry(start,pathEnd,forecast[i-1],forecast[i]);
  if(enter!==Infinity)return (i-1+enter)*FORECAST_STEP;
  start.copy(pathEnd);
 }
 return Infinity;
}
function firstIncoming(horizon){
 if(!threats.length)return null;
 const steps=forecastCourse(horizon);let first=null,eta=Infinity;
 for(const b of threats){
  const arrival=predictedEntry(b,steps);
  if(arrival<eta){eta=arrival;first=b}
 }
 return first?{bullet:first,eta}:null;
}

const world=group(),backdrop=group(),sky=new T.Mesh(new T.Sphere(1500,48,24),new T.Basic({map:loadMap('sky'),side:1,fog:false}));scene.add(sky);sky.rotation.y=2.0;
const mapNames=['临港都市','海岸航空基地','外海航母群'];
function canvasMap(w,h,paint){const c=document.createElement('canvas');c.width=w;c.height=h;paint(c.getContext('2d'),w,h);const tex=new T.Texture(c);tex.colorSpace='srgb';tex.wrapS=tex.wrapT=1000;return tex}
const facade=canvasMap(128,256,(c,w,h)=>{c.fillStyle='#697d86';c.fillRect(0,0,w,h);for(let r=0;r<30;r++)for(let k=0;k<8;k++){c.fillStyle=choice(['#354957','#687e8b','#89a0a7','#4c6371','#9db2b2','#b6aa89']);c.fillRect(k*16+1,r*8.5+2,13,5.5)}});
const wall=new T.Material({map:facade,roughness:.55,metalness:.25}),roof=surface('#839298');
const cityGround=canvasMap(768,768,(c,w,h)=>{c.fillStyle='#677166';c.fillRect(0,0,w,h);for(let j=0;j<6;j++)for(let i=0;i<6;i++){let x=i*128,y=j*128;c.fillStyle='#38444a';c.fillRect(x,y,128,14);c.fillRect(x,y,14,128);c.fillStyle='#bcc1aa';for(let n=0;n<128;n+=19){c.fillRect(x+n,y+6,9,1);c.fillRect(x+6,y+n,1,9)}for(let n=0;n<9;n++){c.fillStyle=choice(['#767b75','#a0a69b','#899287','#62785e']);c.fillRect(x+18+Math.random()*70,y+18+Math.random()*74,rand(9,31),rand(8,25))}}});cityGround.repeat.set(4,4);
const starsGeo=new T.Geometry(),starPos=[];for(let i=0;i<2500;i++){const a=rand(0,6.28),b=rand(-1,1),s=Math.sqrt(1-b*b);starPos.push(900*Math.cos(a)*s,900*b,900*Math.sin(a)*s)}starsGeo.setAttribute('position',new T.Attribute(starPos,3));const stars=new T.Points(starsGeo,new T.PointMaterial({color:'#e4f3ff',size:1.5,fog:false}));scene.add(stars);stars.visible=false;
const planetMap=canvasMap(512,256,(c,w,h)=>{for(let y=0;y<h;y++){c.fillStyle='hsl('+ (24+8*Math.sin(y*.067)) +' 33% '+(48+14*Math.sin(y*.13)+6*Math.cos(y*.47))+'%)';c.fillRect(0,y,w,1)}});
const ocean=new T.Shader({uniforms:{clock:{value:0}},vertexShader:'varying vec3 loc;void main(){vec4 wp=modelMatrix*vec4(position,1.);loc=wp.xyz;gl_Position=projectionMatrix*viewMatrix*wp;}',fragmentShader:`uniform float clock;
varying vec3 loc;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.545);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
float wave(vec2 p,float t){float large=noise(p*.085+t*.18);return .36*sin(p.y*.95+p.x*.3+large*5.+t*2.)+.18*sin(dot(p,vec2(.93,1.77))+t*1.6+large*3.)+.06*sin(dot(p,vec2(2.6,3.2))-t*2.3);}
void main(){vec2 p=loc.xz;float t=clock;float h=wave(p,t);
vec3 n=normalize(vec3((h-wave(p+vec2(.1,0),t))*2.1,1.,(h-wave(p+vec2(0,.1),t))*2.1));
vec3 v=normalize(cameraPosition-loc),l=normalize(vec3(-.24,.55,-.65));
float fres=pow(1.-max(dot(n,v),0.),3.);
vec3 ocean=mix(vec3(.05,.23,.28),vec3(.31,.48,.55),fres*.8+noise(p*.05)*.12);
float spec=pow(max(dot(n,normalize(l+v)),0.),75.);
ocean+=vec3(.86,.84,.70)*spec*.67;
ocean=mix(ocean,vec3(.60,.73,.78),smoothstep(50.,370.,length(cameraPosition-loc)));
gl_FragColor=vec4(ocean,1.);
}
`});
function tileFloor(material,y=-9){const o=new T.Mesh(new T.Plane(1700,1600),material);o.rotation.x=-Math.PI/2;o.position.set(0,y,-425);world.add(o)}
function runway(parent,x,z,len){shape(parent,'box','#353e42',x,-8.7,z,16,.3,len);for(let k=-len/2+3;k<len/2;k+=12)shape(parent,'box','#ede2c0',x,-8.49,z+k,.35,.12,5)}
function prop(g,x,z){g.position.set(x,-9,z);world.add(g);props.push(g);return g}
function building(){const g=new T.Group(),w=rand(4,10),h=rand(6,22),d=rand(5,14);const box=new T.Mesh(geo.box,wall);box.scale.set(w,h,d);box.position.y=h/2;g.add(box);shape(g,'box','#859099',0,h+.25,0,w*1.025,.5,d*1.025);shape(g,'box','#687782',w*.12,h+.9,d*.14,w*.38,1.4,d*.4);return g}
function ship(parent,scale=1,carrier=false){const g=group(parent);shape(g,'oval','#344954',0,0,0,2.5,1.15,9);shape(g,'box','#677a7d',0,.75,0,4.4,.65,15.6);shape(g,'box','#8d9995',carrier?1.5:0,2,.4,1.6,2.2,3.8);shape(g,'tube','#4c5b62',1,3.6,1,.1,2.8,.1);shape(g,'box','#ecdb9e',-.4,1.11,0,.12,.05,13);g.scale.setScalar(scale);return g}
let atmosphere=null;function mapScene(kind){
 world.clear();backdrop.clear();props.length=0;const space=['orbit','ufo','hive'].includes(kind);stars.visible=space;sky.visible=!space;scene.background=new T.Color(space?'#070e24':'#a3c4d0');scene.fog.color.set(space?'#172344':kind==='sand'?'#d6ae86':kind==='night'?'#405772':kind==='ice'?'#c5e2e8':'#a6c3cf');scene.fog.density=space?.001:.003;
 daylight.color.set(kind==='sand'?'#ffc78e':space?'#adc5ff':kind==='night'?'#779cce':'#fff0d4');sky.material.color.set(kind==='night'?'#465778':kind==='sand'?'#e8ccaa':'#fff');
 if(space){
  const planet=new T.Mesh(geo.oval,new T.Material({map:planetMap,color:kind==='ufo'?'#8bc7d1':kind==='hive'?'#ad80bb':'#d5be9e',roughness:1}));planet.scale.setScalar(kind==='orbit'?120:82);planet.position.set(-105,74,-430);backdrop.add(planet);
  const belt=shape(backdrop,'ring','#aaa4b6',-105,74,-430,185,142,110);belt.rotation.set(.7,.3,-.24);
  for(let i=0;i<36;i++){const g=new T.Group();shape(g,kind==='hive'?'oval':'box',kind==='hive'?'#564558':'#586174',0,0,0,rand(1,6),rand(.8,4),rand(2,9));const o=prop(g,choice([-1,1])*rand(48,190),rand(-460,60));o.position.y=rand(-42,62);o.rotation.set(rand(0,5),rand(0,5),0)}
 }else if(kind==='sea'||kind==='strait'){
  tileFloor(ocean);
  if(kind==='strait'){for(const side of [-1,1])for(let j=0;j<6;j++){const island=shape(backdrop,'oval','#4e635a',side*(94+j*14),-14,-40-j*43,rand(24,47),rand(12,24),rand(20,60));island.rotation.y=rand(-1,1)}}
  for(let i=0;i<11;i++){const g=new T.Group();ship(g,i%4===0?2.1:1.1,i%4===0);prop(g,choice([-1,1])*rand(21,100),-i*35).position.y=-8}
 }else if(kind==='sand'||kind==='ice'){
  mountains(kind);
 }else {
  tileFloor(new T.Basic({map:groundSheet(kind==='base'?'airfield':'harbor'),color:kind==='night'?'#7891a7':'#d6ddda'}));
  const base=kind==='base';for(let i=0;i<(base?37:78);i++){let g=base?new T.Group():building();if(base){shape(g,'box','#7f8777',0,1.8,0,10,3.5,13);shape(g,'oval','#a3a493',0,3.4,0,5.2,2.1,6.6)}
   if(kind==='night'){for(let k=0;k<4;k++)shape(g,'box','#eac081',0,1.5+k*2.3,3,3,.14,.14,false)}
   const lane=i%6;prop(g,(lane<3?-1:1)*(42+(lane%3)*17)+rand(-3,3),-Math.floor(i/6)*34+rand(-7,5))}
  if(base){for(let r=0;r<4;r++){const g=new T.Group();runway(g,0,0,108);prop(g,0,-r*115).position.y=0}}
 }
 atmosphere=bossSkyEffects(kind);
}
function mapTick(dt){if(atmosphere){for(const o of atmosphere.children)if(o.name==='rain'){o.position.y-=65*dt;o.position.x-=8*dt;if(o.position.y<0){o.position.y=62;o.position.x=rand(-64,64)}}}ocean.uniforms.clock.value=time;const speed=mode==='boss'?9:31;travel+=dt*speed;for(const sheet of earthScreens.values())sheet.offset.y+=dt*speed/500;for(const o of props){o.position.z+=dt*speed;if(o.position.z>65)o.position.z-=495}}
function jetShape(kind){
 if(['fighter','interceptor','escort','scout'].includes(kind)){const o=model.clone(true);o.scale.setScalar(kind==='interceptor'?.97:kind==='scout'?1.23:1.08);if(kind==='scout'){shape(o,'oval','#697781',0,1.05,.4,2.3,.23,1);shape(o,'tube','#8e9390',0,.68,.4,.12,.6,.12)}return o}
 const o=new T.Group();if(kind==='bomber'){shape(o,'oval','#7b8384',0,0,0,1,.85,4.6);shape(o,'oval','#7d8383',0,.1,.5,6,.2,2);for(const k of [-1,1]){shape(o,'oval','#464f52',k*3,-.2,0,.6,.46,1.45);shape(o,'box','#727779',k*.8,.75,3.1,.18,1.6,1.65)}}
 else if(kind==='frigate'||kind==='carrier'){ship(o,kind==='carrier'?1.55:.95,kind==='carrier')}
 else{shape(o,'box','#546151',0,.7,0,2.8,1.2,4.4);for(const k of [-1,1])shape(o,'box','#303a37',k*1.3,.35,0,.55,.8,4.6);shape(o,'box','#75806b',0,1.6,0,1.7,.9,2);if(kind==='radar'){const dish=shape(o,'oval','#a8b5a4',0,3,0,1.6,.3,1.1);dish.rotation.x=.7}else for(const k of (kind==='tank'?[0]:[-.6,.6])){const gun=shape(o,'tube',kind==='sam'?'#c2c4ad':'#4b5c49',k,2.1,-1.3,kind==='sam'?.32:.13,3.3,kind==='sam'?.32:.13);gun.rotation.x=-1.1}}
 return o
}
const unitStats={fighter:[28,3,2],escort:[30,3,2],interceptor:[25,2.7,3],scout:[50,3.4,5],bomber:[82,5,5],tank:[44,3,3],flak:[46,3,3],radar:[47,3,4],sam:[49,3,4],frigate:[108,5,5],carrier:[200,8,8]};
let squadNo=0;
function unit(type,x,y,z,team,swing=0){const [health,radius,reward]=unitStats[type],o=jetShape(type);scene.add(o);o.position.set(x,y,z);const ground=['tank','flak','radar','sam','frigate','carrier'].includes(type);o.rotation.y=ground?0:Math.PI;
 const e={type,o,hp:health,max:health,r:radius,reward,team,ground,baseX:x,baseY:y,age:0,swing,fire:rand(2,4),burst:0,call:7,charge:0};enemies.push(e);return e}
// Spread the front across the width and height of the chase view.
const waveLimits=[42,52,62];
function spawnWing(pattern){
 const cap=waveLimits[zone]||42,team=++squadNo;
 const side=team%2?1:-1,center=side*rand(5,16),height=rand(8,22);
 let order=0;
 function add(type,x,y,z,turn=0){
  if(enemies.length>=cap)return;
  const e=unit(type,x,y,z,team,turn);
  e.order=order++;e.fire=1.15+e.order*.105+rand(0,.4);
 }
 function chevron(type,x,y,z,count){
  for(let i=0;i<count;i++){
   const lane=i-(count-1)/2;
   add(type,x+lane*4.8,y+.48*Math.abs(lane),z-2.2*Math.abs(lane));
  }
 }
 if(pattern==='intercept'){
  for(let i=0;i<4;i++){add('interceptor',-29-i*2,7+i*3,-92-i*6,1);add('interceptor',29+i*2,23-i*3,-101-i*6,-1)}
 }else if(pattern==='scout'){
  add('scout',center,height,-101);
  for(const side of [-1,1])for(let i=1;i<=3;i++)add('escort',center+side*i*4.2,height+i*.35,-100-i*3);
  chevron('fighter',-center,height*.5,-117,5);
 }else if(pattern==='bomb'){
  chevron('bomber',center,21,-108,3);chevron('escort',-center,13,-97,7);
 }else if(pattern==='base'){
  ['tank','tank','flak','radar','sam','flak','tank','sam'].forEach((k,i)=>add(k,(i%4-1.5)*10+center*.36,-7,-85-Math.floor(i/4)*21-i%2*6));
  chevron('fighter',-center,15,-116,5);
 }else if(pattern==='fleet'){
  add('carrier',center,-7,-119);
  for(let i=0;i<4;i++)add('frigate',center+(i%2?1:-1)*(9+Math.floor(i/2)*6),-7,-92-Math.floor(i/2)*18);
  chevron('escort',-center,15,-100,6);
 }else{
  chevron('fighter',center,height,-80,5);
  chevron('fighter',-center,26-height*.55,-111,7);
 }
}
function formation(pattern){spawnWing(pattern)}
function firePattern(e){
 const p=e.o.position;
 if(e.type==='radar'||e.type==='scout')return 4;
 if(p.z>-17)return 1; // Already passing the player: no point-blank volleys.
 const distance=-p.z;
 const anchor=canopy.center.clone();
 // Each salvo commits to a line; its gap stays put while the pilot moves.
 if(e.type==='sam'){
  const linked=enemies.some(f=>f.team===e.team&&f.type==='radar'&&f.hp>0);
  threat(p,'missile',0,linked,e.team);return rand(3.2,4.1)
 }
 if(e.type==='bomber'||e.type==='carrier'){
  const tilt=e.age*.64+e.team, count=e.type==='carrier'?12:9;
  for(let i=0;i<count;i++){
   const angle=i*2*Math.PI/count+tilt;
   // An open ellipse: the central pocket and a missing sector are flyable.
   if(i===(e.order||0)%count)continue;
   emitPatternRound(p,anchor,Math.cos(angle)*16,Math.sin(angle)*9,'crown',29);
  }
  return rand(2.3,3.15)
 }
 if(e.type==='interceptor'){
  // Hold aim for a three-round burst rather than following every mouse move.
  if(!e.burst)e.aim=anchor;
  emitPatternRound(p,e.aim,(e.burst-1)*2.8,0,'tracer',43);
  if(++e.burst<3)return .14;
  e.burst=0;return rand(1.6,2.4)
 }
 if(e.type==='flak'||e.type==='frigate'){
  // Two banks with an offset opening between them.
  const gap=5.4*Math.sin(e.team+e.age*.42);
  for(const dx of [-19,-12,-6,6,12,19])emitPatternRound(p,anchor,dx+gap,Math.sin(dx*.16)*3,'flak',30);
  return rand(2.1,3.1)
 }
 const rank=e.order||0;
 const wide=clamp(distance*.16,7,16);
 const sweep=Math.sin(e.age*.72+e.team)*8;
 const offsets=e.type==='tank'?[-1,0,1]:[-1,-.5,0,.5,1];
 for(const offset of offsets)emitPatternRound(p,anchor,offset*wide+sweep,(rank%2?1:-1)*offset*3.4,'fan',32+rank%3);
 return rand(2.05,3.05)
}
function emitPatternRound(origin,anchor,dx,dy,id,speed){
 const b=threat(origin,id,0,false,-1,false);
 if(!b)return;
 b.v.copy(anchor).add(vec(dx,dy,0)).sub(origin).normalize().multiplyScalar(speed);
 b.o.quaternion.setFromUnitVectors(forward,b.v.clone().normalize());
}
function tickSquads(dt){for(const e of enemies.slice()){if(e.part||e.hp<=0)continue;e.age+=dt;const p=e.o.position;
 p.z+=dt*(e.ground?6:e.type==='interceptor'?16:6.5);p.x=e.baseX+(e.type==='interceptor'?e.swing*e.age*4:Math.sin(e.age*.66+e.team)*(e.ground?.8:4));if(!e.ground)p.y=e.baseY+Math.sin(e.age*.9)*.8;
 if((e.type==='scout'||e.type==='carrier')&&(e.call-=dt)<=0&&enemies.length<(waveLimits[zone]||42)){e.call=14;unit('interceptor',p.x-8,13,p.z-9,e.team,1);say('敌方增援升空',1.4)}
 e.fire-=dt;
 if(e.fire<=0)e.fire=threats.length>=240?.35:firePattern(e);
 if(p.z>14||Math.abs(p.x)>58){scene.remove(e.o);remove(enemies,e)}
 }}
const earthScreens=new Map();
function groundSheet(name){if(!earthScreens.has(name)){const img=loadMap(name);img.wrapS=img.wrapT=1000;img.repeat.set(3.4,3.2);img.anisotropy=8;earthScreens.set(name,img)}return earthScreens.get(name)}
function hazySky(){sky.material.onBeforeCompile=s=>{s.vertexShader='varying float skyHeight;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n skyHeight=position.y/1500.;');s.uniforms.haze={value:scene.fog.color};s.fragmentShader='uniform vec3 haze;varying float skyHeight;\n'+s.fragmentShader.replace('#include <tonemapping_fragment>','gl_FragColor.rgb=mix(haze,gl_FragColor.rgb,smoothstep(-.05,.22,skyHeight));\n#include <tonemapping_fragment>')}}
hazySky();
const mountainHeights=new Int16Array(decodeBytes(assetPack.dem).buffer);
function mountains(kind){const n=Math.round(Math.sqrt(mountainHeights.length)),positions=[],uv=[],ix=[];for(let r=0;r<n;r+=2){for(let c=0;c<n;c+=2){const u=c/(n-1),v=r/(n-1);positions.push((u-.5)*1300,((mountainHeights[r*n+c]-3250)*.12)-53,(v-.5)*1450-380);uv.push(u,1-v);const i=uv.length/2-1,m=Math.ceil(n/2);if(r&&c)ix.push(i-m-1,i-1,i,i-m-1,i,i-m)}}
 const geometry=new T.Geometry();geometry.setAttribute('position',new T.Attribute(positions,3));geometry.setAttribute('uv',new T.Attribute(uv,2));geometry.setIndex(ix);const mat=new T.Basic({map:loadMap('terrain'),color:kind==='ice'?'#def4ff':'#d2a578',side:2});const mesh=new T.Mesh(geometry,mat);mesh.position.y=-75;world.add(mesh)}

// Attach the discharge to the airframe so its origin stays visible during a bank.
const discharges=new Map();
function emitShield(owner,perfect){
 const previous=discharges.get(owner);
 if(previous)endDischarge(previous);
 const root=group(owner);
 root.position.set(0,.1,-.45);
 const color=perfect?'#8effca':'#54cfff';
 const skin=new T.Shader({
  uniforms:{tint:{value:new T.Color(color)},fade:{value:1}},
  vertexShader:`varying vec3 viewNormal,viewPosition;
   void main(){vec4 p=modelViewMatrix*vec4(position,1.);
    viewNormal=normalMatrix*normal;viewPosition=-p.xyz;gl_Position=projectionMatrix*p;}`,
  fragmentShader:`uniform vec3 tint;uniform float fade;varying vec3 viewNormal,viewPosition;
   void main(){float rim=1.-abs(dot(normalize(viewNormal),normalize(viewPosition)));
    float glow=pow(rim,2.3);gl_FragColor=vec4(mix(tint,vec3(1.),glow*.65),(.045+.92*glow)*fade);}`,
  transparent:true,depthWrite:false,blending:2
 });
 const line=new T.Basic({color:perfect?'#fff0ad':'#c6faff',transparent:true,opacity:1,depthWrite:false});
 const shell=new T.Mesh(geo.oval,skin);root.add(shell);
 shell.scale.set(1,.78,1);
 const rim=new T.Mesh(geo.ring,line);rim.rotation.x=Math.PI*.44;root.add(rim);
 const arc=new T.Mesh(geo.ring,line);arc.rotation.set(.14,.4,-.18);arc.scale.set(1,.76,1);root.add(arc);
 const coreGlow=new T.Mesh(geo.oval,line);owner.add(coreGlow);
 coreGlow.position.copy(root.position);coreGlow.position.y+=.18;
 let lance=null;
 if(owner===player){
  lance=new T.Mesh(geo.tube,line);owner.add(lance);
  between(lance,vec(0,.1,-.45),vec(0,.1,-120),.29);
 }
 const pulse={owner,root,skin,line,coreGlow,lance,age:0,duration:perfect?.68:.48,radius:perfect?12:GUARD_RADIUS};
 root.scale.setScalar(.24);coreGlow.scale.set(.32,.38,.8);discharges.set(owner,pulse);
}
function endDischarge(p){
 if(p.lance)p.owner.remove(p.lance);
 p.owner.remove(p.root,p.coreGlow);p.skin.dispose();p.line.dispose();discharges.delete(p.owner);
}
function updateDischarges(realDt){
 for(const p of discharges.values()){
  p.age+=realDt;const t=p.age/p.duration;
  if(t>=1){endDischarge(p);continue}
  const reach=1-(1-t)*(1-t);
  p.root.scale.setScalar(.24+p.radius*reach);
  const fade=Math.min(1,(1-t)*1.65);
  p.skin.uniforms.fade.value=fade;p.line.opacity=fade*.9;
  if(p.lance){
   const width=.29*Math.max(0,1-p.age/.25);
   p.lance.visible=width>0;p.lance.scale.x=p.lance.scale.z=width;
  }
  // A short flash between the wing roots marks the source of the outgoing wave.
  const flash=Math.max(0,1-t*3.6);
  p.coreGlow.visible=flash>0;p.coreGlow.scale.set(.37+flash*.45,.34+flash*.35,.9+flash*.55);
 }
}

function damage(e,power,kind='direct'){
 if(!e||e.hp<=0||e.hidden||e.part&&bossIntro>.5)return;if(e.part&&e.role==='core'&&boss?.shieldUntil>time)power*=.3;if(e.part&&e.role==='core'&&boss?.heat>0)power*=1.6;const actual=Math.min(e.hp,power);e.hp-=power;
 if(activeUlt&&kind==='direct'){
  if(activeUlt.id==='rail'&&(!activeUlt.mark||activeUlt.mark===e)){activeUlt.mark=e;activeUlt.gain=Math.min(90,(activeUlt.gain||0)+actual);activeUlt.last=e.o.position.clone()}
  if(activeUlt.id==='web'&&e.o.position.distanceTo(activeUlt.center)<39&&!activeUlt.nodes.has(e)){activeUlt.nodes.add(e);for(const other of activeUlt.nodes){if(other!==e&&other.hp>0){beam(e.o.position,other.o.position,'#6efffc',.17,.27,true);damage(other,12,'web');damage(e,12,'web');break}}}
 }
 if(e.hp>0||e.destroyed)return;e.destroyed=true;e.hp=0;
 if(e.part){breakPart(e);return}
 remove(enemies,e);recordKill();upgradeXP(e.reward);burst(e.o.position,e.r);
 if(e.ground)scene.remove(e.o);else deadPlanes.push({o:e.o,size:e.r*.75,emit:0,age:0,spin:choice([-1,1])*.9});
 if(e.type==='scout')say('侦察机已击落');
 if(kills%15===0){repairDrop+=12;hp=Math.min(100,hp+12);say('补给抵达 · 机体修复')}
}
function blast(center,r,power,kind='area'){ring(center,'#ffcf89',r,.37,kind==='ult');for(const e of targets())if(e.o.position.distanceTo(center)<r+e.r)damage(e,power,kind)}
function pickTarget(){const aim=vec(mouse.x*37,12+mouse.y*24,-90);let best=null,score=Infinity;for(const e of targets()){const p=e.o.position;if(p.z>1)continue;const d=Math.hypot(p.x-aim.x,(p.y-aim.y)*1.1)+Math.abs(p.z)*.012;if(d<score){score=d;best=e}}return best}
function aimDir(origin,e,assist=1){const natural=vec(mouse.x*37,12+mouse.y*24,-90).sub(origin).normalize();if(!e)return natural;let goal=e.o.position.clone().sub(origin).normalize();return natural.lerp(goal,assist).normalize()}
function missileMesh(glow){const o=group();shape(o,'oval','#b7c6c9',0,0,0,.14,.14,.86);for(let i=0;i<2;i++){const fin=shape(o,'box','#737e84',0,0,.39,.7,.055,.45);fin.rotation.z=i*Math.PI/2}shape(o,'oval',glow,0,0,1,.14,.14,.53,false);return o}
function shot(origin,e,id,power,rank=1,dir=null,realTime=false){const missile=['guided','heavy','cluster','radar','barrage','reaction','return','drone','child','hunterMissile','blackBolt'].includes(id),color=({pulse:'#6ee5ff',chain:'#78aaff',charge:'#bc8dff',plasma:'#59f9e0',return:'#6dfbf4',blackBolt:'#ce8bff',hunterMissile:'#ffeaa6',goldShard:'#ffb348',reaction:'#ffb566'})[id]||'#ffe7b0';
 const o=id==='drone'?model.clone(true):missile?missileMesh(color):shape(scene,'oval',color,0,0,0,id==='plasma'?.8:.11,id==='plasma'?.8:.11,id==='plasma'?1.1:1.3,false);
 if(id==='drone'){o.scale.setScalar(.26);scene.add(o)}
 o.position.copy(origin);const speed=missile?48:id==='plasma'?44:143;const v=(dir||aimDir(origin,e)).clone().normalize().multiplyScalar(speed);
 shots.push({o,e,id,power,rank,missile,v,speed,realTime,age:0,trail:0,seen:new Set(),pierce:id==='plasma'?6:id==='pierce'?rank+1:1});return o}
function shock(a,b){let start=a;for(let i=1;i<=5;i++){let point=a.clone().lerp(b,i/5);if(i<5){point.x+=rand(-1,1);point.y+=rand(-1,1)}beam(start,point,'#99c6ff',.13,.16);start=point}}
function hitShot(s,e){const p=e.o.position.clone();damage(e,s.power);flash(p,'fire',1.4,.12,vec(),s.realTime);
 if(s.id==='chain'||s.id==='bounce'){let from=e,seen=new Set([e]);for(let i=0;i<s.rank+(s.id==='chain'?1:0);i++){let dest=nearest(from.o.position,targets().filter(a=>!seen.has(a)&&a.o.position.distanceTo(from.o.position)<27));if(!dest)break;seen.add(dest);if(s.id==='chain')shock(from.o.position,dest.o.position);else beam(from.o.position,dest.o.position,'#ffd780',.12);damage(dest,s.power*.75);from=dest}}
 if(s.id==='charge'&&++e.charge%3===0){ring(p,'#ad87ff',7);blast(p,7,16*s.rank)}
 if(['flak','barrage','heavy','drone'].includes(s.id))blast(p,6+s.rank*1.7,s.power*.55,s.realTime?'ult':'area');
 if(s.id==='blackBolt')bloom(p,5,14,'#bb8cff');
 if(s.missile)burst(p,2.6,s.realTime)
}
function deadShot(s){scene.remove(s.o);remove(shots,s)}
function tickShots(worldDt,realDt){for(const s of shots.slice()){const dt=s.realTime?realDt:worldDt;s.age+=dt;const q=s.o.position,old=q.clone();
 if(s.missile){if(s.e?.hp<=0||s.e?.hidden||s.id==='drone'&&!s.e)s.e=nearest(q,targets());if(s.e&&s.id!=='heavy'&&s.age>.12&&!(s.e.part&&boss?.jamUntil>time&&s.id!=='radar')){const goal=s.e.o.position.clone().sub(q).normalize().multiplyScalar(s.speed);s.v.lerp(goal,Math.min(1,dt*6))}s.trail-=dt;if(s.trail<=0){s.trail=.10;flash(q,s.id==='return'?'ice':'smoke',.85,.6,vec(0,.3,1.4),s.realTime)}}
 s.o.quaternion.setFromUnitVectors(forward,s.v.clone().normalize());q.addScaledVector(s.v,dt);
 if((s.id==='split'||s.id==='cluster')&&s.age>(s.id==='cluster'?.43:.2)){
  const n=s.id==='cluster'?3+s.rank:2+s.rank,opts=targets();for(let i=0;i<n;i++){let d=s.v.clone().normalize();d.x+=(i-(n-1)/2)*.10;shot(q,opts[i%Math.max(1,opts.length)]||s.e,s.id==='cluster'?'child':'fragment',s.power*.7,1,d.normalize())}deadShot(s);continue}
 for(const e of targets()){if(s.seen.has(e))continue;const seg=q.clone().sub(old),u=clamp(e.o.position.clone().sub(old).dot(seg)/(seg.lengthSq()||1),0,1);
 if(old.clone().addScaledVector(seg,u).distanceTo(e.o.position)<e.r+(s.id==='flak'?2:.4)){s.seen.add(e);hitShot(s,e);if(--s.pierce<=0){deadShot(s);break}}}
 if(s.age>4.8||q.z>25||q.z< -170)deadShot(s)
 }}
function salvo(id,n,power,origin=pos,wingResponse=false){const es=targets().sort((a,b)=>pos.distanceToSquared(a.o.position)-pos.distanceToSquared(b.o.position));if(!es.length)return false;
 for(let i=0;i<n;i++){const source=wingResponse&&allies.length?allies[i%(allies.length+1)]?.o.position||origin:origin;const start=source.clone();start.x+=(i%2?1:-1)*1.4;shot(start,es[i%es.length],id,power,1,vec((i-(n-1)/2)*.15,-.08,-1).normalize())}return true}
// Draw the unpowered rounds in one pass. Physics still uses their world-space flight paths.
const tracerCapacity=512;
const tracerGeometry=new T.Geometry();
const tracerPositions=new T.Attribute(new Float32Array(tracerCapacity*3),3);
const tracerDirections=new T.Attribute(new Float32Array(tracerCapacity*3),3);
const tracerKinds=new T.Attribute(new Float32Array(tracerCapacity),1);
tracerGeometry.setAttribute('position',tracerPositions);
tracerGeometry.setAttribute('velocity',tracerDirections);
tracerGeometry.setAttribute('kind',tracerKinds);
tracerGeometry.setDrawRange(0,0);
const tracerMaterial=new T.Shader({
 uniforms:{screenHeight:{value:700},aspect:{value:1},pixelRatio:{value:1}},
 vertexShader:`attribute vec3 velocity; attribute float kind;
 uniform float screenHeight,aspect,pixelRatio; varying vec2 direction; varying float pattern;
 void main(){
 vec4 mv=modelViewMatrix*vec4(position,1.); vec4 head=projectionMatrix*mv;
 vec4 tail=projectionMatrix*(modelViewMatrix*vec4(position-velocity*.045,1.));
 vec2 d=(head.xy/head.w-tail.xy/tail.w)*vec2(aspect,1.);
 direction=length(d)>.0001?normalize(d):vec2(0.,1.);pattern=kind;
 gl_Position=head;gl_PointSize=clamp(screenHeight*(kind==0.?2.1:1.65)/max(1.,-mv.z),7.,36.)*pixelRatio;
 }`,
 fragmentShader:`varying vec2 direction; varying float pattern;
 void main(){
 vec2 uv=(gl_PointCoord-.5)*2.;uv.y=-uv.y;
 float x=dot(uv,vec2(-direction.y,direction.x)),y=dot(uv,direction);
 float lengthScale=pattern==0.?1.:.78;
 float dist=length(vec2(x*(pattern==0.?3.6:2.35),y/lengthScale));
 float halo=1.-smoothstep(.40,1.,dist),core=1.-smoothstep(.16,.56,dist);
 vec3 rim=pattern<1.5?vec3(.98,.21,.065):vec3(.97,.39,.12);
 vec3 hot=mix(vec3(1.,.80,.34),vec3(1.,.93,.71),smoothstep(-.8,.8,y));
 float opacity=max(halo*.83,core);if(opacity<.035)discard;
 gl_FragColor=vec4(mix(rim,hot,core),opacity);
 }`,transparent:true,depthWrite:false
});
const tracerCloud=new T.Points(tracerGeometry,tracerMaterial);
tracerCloud.frustumCulled=false;tracerCloud.renderOrder=2;scene.add(tracerCloud);
function renderEnemyRounds(){
 let n=0;
 for(const b of threats){
  if(n>=tracerCapacity)break;
  if(b.id==='missile')continue;
  const p=b.o.position;tracerPositions.setXYZ(n,p.x,p.y,p.z);
  tracerDirections.setXYZ(n,b.v.x,b.v.y,b.v.z);
  tracerKinds.setX(n,b.id==='tracer'?0:b.id==='fan'?1:2);n++;
 }
 tracerGeometry.setDrawRange(0,n);
 tracerPositions.needsUpdate=tracerDirections.needsUpdate=tracerKinds.needsUpdate=true;
 tracerMaterial.uniforms.screenHeight.value=innerHeight;
 tracerMaterial.uniforms.aspect.value=camera.aspect;
 tracerMaterial.uniforms.pixelRatio.value=renderer.getPixelRatio();
}

function threat(origin,id='tracer',lane=0,homing=false,team=-1,muzzle=true){
 const missile=id==='missile',o=missile?missileMesh('#ff945d'):new T.Group();
 o.position.copy(origin);
 const aim=canopy.center.clone();aim.x+=lane;
 const v=aim.sub(origin).normalize().multiplyScalar(missile?32:39);
 const bullet={o,id,v,homing,team,age:0,power:missile?2:1,trail:0};
 threats.push(bullet);if(muzzle)flash(origin,'fire',1.5,.1);return bullet
}
function eraseThreat(b){if(b.removed)return;b.removed=true;scene.remove(b.o);remove(threats,b)}
function harm(points,unblockable=false){if(hitGrace>0||state!=='play'||boss?.dying)return;if(action==='roll'&&actionAge<.25&&!unblockable)return;
 if(guardWindow>0&&!unblockable){guardPerfect(points);return}shieldWait=SHIELD_FIRST;hitGrace=.78;const used=Math.min(shield,points);shield-=used;hp=Math.max(0,hp-(points-used)*16);flash(canopy.center,'ice',2.5,.22);if(hp<=0)finish(false)}
function rollNow(){if(action||state!=='play'||boss?.dying)return;const perfect=firstIncoming(PERFECT_WINDOW)||bossSweepNear();action='roll';actionAge=0;if(perfect){allies.forEach(a=>a.roll=.43);if(counterCD<=0&&salvo('reaction',counterCount,20,pos,true))counterCD=3;say('完美闪避 · 联动反击',1)}}
function absorb(origin,r){let energy=0;for(const b of threats.slice())if(inBurstRange(b.o.position,origin,r)){energy+=b.power;beam(b.o.position,origin,'#74fff1',.09,.18,true);eraseThreat(b)}return energy}
function guardPerfect(extra=0){if(perfectGuard)return;perfectGuard=true;shield=4;shieldBank=Math.min(12,shieldBank+extra);let bossHit=false;for(const owner of [player,...allies.map(a=>a.o)]){const c=owner.position;emitShield(owner,true);shieldBank=Math.min(12,shieldBank+absorb(c,12));for(const e of targets()){if(e.o.position.distanceTo(c)>12+e.r)continue;if(e.part){if(!bossHit){damage(e,9,'area');bossHit=true}}else damage(e,['fighter','escort','interceptor'].includes(e.type)?e.hp:20,'area')}}say('完美格挡 · 全盾恢复',1.2)}
let guardQueued=false;
function requestGuard(){
 if(state!=='play'||boss?.dying)return;
 if(shield<1){say('护盾耗尽 · 等待一格回复',1);return}
 if(action){
  const remaining=(action==='roll'?.43:.44)-actionAge;
  if(remaining<=.14)guardQueued=true;
  else say(action==='roll'?'翻滚回正中':'护盾收束中',.35);
  return
 }
 guardNow()
}
function guardNow(){
 if(state!=='play'||action||shield<1||boss?.dying)return;
 shield--;action='guard';actionAge=0;perfectGuard=false;guardWindow=PERFECT_WINDOW;shieldWait=SHIELD_FIRST;
 const near=firstIncoming(PERFECT_WINDOW),energy=absorb(pos,GUARD_RADIUS);
 shieldBank=Math.min(12,shieldBank+energy);
 tone(energy?490:365,.12);
 for(const e of targets())if(e.o.position.z<pos.z&&Math.hypot(e.o.position.x-pos.x,e.o.position.y-pos.y)<e.r+1)damage(e,12);
 if(near)guardPerfect();else{emitShield(player,false);say(energy?'爆盾 · 已吸收 '+energy+' 点火力':'爆盾 · 消耗 1 格',.8)}
}
const previousRound=vec();
function threatsTick(dt){for(const b of threats.slice()){if(b.removed)continue;b.age+=dt;b.trail-=dt;
 previousRound.copy(b.o.position);
 if(b.homing&&b.age<2.8){
  b.homing=radarLinked(b);
  if(b.homing)steerIncomingMissile(b.o.position,b.v,canopy.center,nearbyJammer(b.o.position),dt);
 }
 b.o.position.addScaledVector(b.v,dt);b.o.quaternion.setFromUnitVectors(forward,b.v.clone().normalize());if(b.id==='missile'&&b.trail<=0){flash(b.o.position,'smoke',.9,.6);b.trail=.12}
 const guard=allies.find(a=>a.id==='guard'&&a.stamina>0&&a.o.position.distanceTo(b.o.position)<5);
 if(guard){guard.stamina--;guard.recover=4;ring(guard.o.position,'#a3edff',3);eraseThreat(b);continue}
 if(activeUlt?.id==='fort'&&activeUlt.friends.some(f=>f.hp>0&&f.o.position.distanceTo(b.o.position)<7&&(f.hp-=b.power)>-4)){eraseThreat(b);continue}
 if(canopyEntry(previousRound,b.o.position,lastCanopy,canopy)!==Infinity){if(b.id==='flak')burst(b.o.position,2.8);harm(b.power);eraseThreat(b);continue}
 if(b.o.position.z>17||b.age>6)eraseThreat(b)
 }}
function syncWings(){const ids=gear.filter(g=>kitTypes[g.id][1]==='僚机').map(g=>g.id);for(const a of allies.slice())if(!ids.includes(a.id)){scene.remove(a.o);remove(allies,a)}for(const id of ids)if(!allies.some(a=>a.id===id)){const o=model.clone(true);o.scale.setScalar(.57);o.position.copy(pos);scene.add(o);allies.push({id,o,roll:0,cd:0,stamina:3,recover:0})}}
function pilotWeapons(dt,realDt){const list=targets();target=pickTarget();
 for(const [idx,g] of gear.entries()){g.cd=Math.max(0,g.cd-dt);const cat=kitTypes[g.id][1],rank=g.rank;
 if(cat==='僚机'){const a=allies.find(a=>a.id===g.id);if(!a)continue;let dest=pos.clone().add(vec((idx%2?1:-1)*(4+idx*.8),.3,-1));let enemy=target;
 if(g.id==='hunter'||g.id==='strike'){enemy=nearest(pos,list.filter(e=>g.id==='strike'?e.ground||e.part:e.type==='scout'||e.type==='interceptor'))||target;if(enemy){dest.lerp(enemy.o.position,.54+.22*Math.sin(time*1.3));dest.x+=3*Math.sin(time)}}
 if(g.id==='cross')dest.x+=(idx%2?1:-1)*7;if(g.id==='guard'){a.recover-=dt;if(a.recover<=0)a.stamina=3;dest.z=a.stamina>0?-7:3}
 a.roll=Math.max(0,a.roll-realDt);a.o.position.lerp(dest,1-Math.exp(-dt*5));a.o.rotation.z=a.roll?Math.PI*2*(1-a.roll/.43):player.rotation.z*.6;
 if(!g.cd&&enemy&&(g.id!=='escort'||firing)){evolveFire(g,a.o.position,enemy);if(g.id==='cross'){beam(a.o.position,enemy.o.position,'#68e5fa',.1,.19);damage(enemy,4*rank)}else shot(a.o.position,enemy,({jam:'chain',strike:'flak',hunter:'pulse',escort:rank>1?'pierce':'cannon'})[g.id]||'pulse',4+rank*2,rank);g.cd=g.id==='escort'?.33:.79}continue}
 if(g.id==='rotary'&&!firing)g.spin=Math.max(0,(g.spin||0)-dt*1.8);if(g.cd>0)continue;
 if(cat==='导弹'){if(g.id==='heavy'){if(!triggerTap)continue;evolveFire(g,pos,target);shot(pos,target,'heavy',35+rank*8,rank,aimDir(pos,null));g.cd=6.8}
 else if(list.length){evolveFire(g,pos,target);if(g.id==='guided')salvo('guided',4,11+rank*3);else{const e=(g.id==='radar'?list.find(e=>['radar','sam'].includes(e.type)||e.part):null)||target;shot(pos,e,g.id,12+rank*6,rank)}g.cd=({guided:5,cluster:5.6,radar:4.8,barrage:6})[g.id]}continue}
 // The first gun follows the trigger. Added cannons fire automatically.
 const manual=gear.find(w=>['实弹','能量'].includes(kitTypes[w.id][1]))===g;
 const fireTarget=manual&&target&&Math.hypot(target.o.position.x-mouse.x*37,target.o.position.y-12-mouse.y*24)>Math.max(8,target.r+4)?null:target;
 if(manual?!(firing||triggerTap):!target)continue;const start=pos.clone();start.x+=(Math.floor(time*16)%2?1:-1)*.85;start.z-=2;evolveFire(g,start,fireTarget);
 if(g.id==='spread'){const d=aimDir(start,fireTarget),count=3+2*Math.floor(rank/2);for(let i=0;i<count;i++){const ray=d.clone().applyAxisAngle(axis,(i-(count-1)/2)*.083);shot(start,fireTarget,'fragment',3+rank,rank,ray)}g.cd=.37}
 else if(g.id==='rotary'){g.spin=Math.min(1,(g.spin||0)+.1);shot(start,fireTarget,'cannon',2.6+rank,rank);g.cd=.18-.114*g.spin}
 else if(g.id==='laser'){g.focus=g.last===fireTarget?Math.min(2,(g.focus||0)+.09):0;g.last=fireTarget;const end=fireTarget?fireTarget.o.position:start.clone().addScaledVector(aimDir(start,null),110);beam(start,end,'#8afff8',.08+rank*.025,.11);if(fireTarget)damage(fireTarget,(1+g.focus)*rank*.85);g.cd=.1}
 else{shot(start,fireTarget,g.id,(g.id==='cannon'?4:6)+rank*1.5,rank);g.cd=({cannon:.14,pulse:.17,split:.48,flak:.56,pierce:.32,plasma:.65,charge:.32,bounce:.36,chain:.4})[g.id]||.4}
 }
 triggerTap=false;if(shieldBank>0&&shieldCD<=0&&list.length){const n=Math.min(6,Math.ceil(shieldBank/2));if(salvo('return',n,8+Math.min(8,shieldBank)*.9,pos,true)){shieldBank=0;shieldCD=3.2}}
}
function recordKill(){
 kills++;
 if(ultUses>=ULT_CAPACITY)return;
 if(++ultKills>=ULT_KILLS_PER_USE){ultKills=0;ultUses++;tone(740,.12)}
}
function ultNow(){
 if(state!=='play'||boss?.dying)return;
 if(activeUlt?.id==='rail'){releaseRail();return}
 if(activeUlt){say(specials[ultId][0]+' · 正在执行',.8);return}
 if(!ultUses){say('再击破 '+(ULT_KILLS_PER_USE-ultKills)+' 个敌人可补充一次大招',1.2);return}
 ultUses--;
 const center=pickTarget()?.o.position.clone()||pos.clone().addScaledVector(aimDir(pos,null),70);
 const u=activeUlt={id:ultId,age:0,center,mark:null,last:center.clone(),gain:0,nodes:new Set(),friends:[],volleys:0,cd:0};
 say(specials[ultId][0]+' · 已启动',1.4);tone(560,.16);
 if(u.id==='fort'){
  for(const k of [-1,0,1]){const o=jetShape('bomber');o.scale.setScalar(1.45);scene.add(o);o.position.copy(pos).add(vec(k*8,2,-9));u.friends.push({o,hp:18})}
 }
 if(u.id==='rail')ring(center,'#c3ffff',4,.32,true);
}
function releaseRail(){
 const u=activeUlt,e=u.mark?.hp>0?u.mark:null,pt=e?.o.position||u.last;
 beam(pt.clone().add(vec(-18,100,8)),pt,'#e1ffff',1.2+u.gain/60,.5,true);
 blast(pt,11,36+u.gain,'ult');flash(pt,'fire',14,.48,vec(),true);activeUlt=null;
}
function ultiTick(dt){
 const u=activeUlt;if(!u)return;u.age+=dt;u.cd-=dt;
 if(u.id==='rail'){
  if(u.cd<=0){ring(u.mark?.o.position||u.center,'#c3ffff',3,.22,true);u.cd=.2}
  if(u.age>=4||u.mark?.hp<=0)releaseRail()
 }
 if(u.id==='web'){
  if(u.cd<=0){u.cd=.3;for(let i=0;i<3;i++){let a=u.center.clone().add(vec(Math.cos(i*2.094)*32,Math.sin(i*2.094)*15,0)),b=u.center.clone().add(vec(Math.cos((i+1)*2.094)*32,Math.sin((i+1)*2.094)*15,0));beam(a,b,'#43acbf',.08,.32,true)}}
  if(u.age>=6)activeUlt=null
 }
 if(u.id==='nuke'){
  if(u.age<1){if(u.cd<=0){ring(u.center,'#ffbe77',10,.3,true);u.cd=.3}}
  else{blast(u.center,65,85,'ult');for(const b of threats.slice())eraseThreat(b);flash(u.center,'fire',40,.8,vec(),true);activeUlt=null}
 }
 if(u.id==='swarm'){
  if(u.volleys<3&&u.cd<=0){
   const es=shuffle(targets());
   for(let i=0;i<6;i++){
    const origin=pos.clone().add(vec((i-2.5)*1.6,rand(-.6,.6),-1));
    shot(origin,es.length?es[i%es.length]:null,'drone',14,1,null,true);
   }
   u.volleys++;u.cd=.8;
  }
  if(u.age>=3)activeUlt=null
 }
 if(u.id==='fort'){
  for(const [i,f] of u.friends.entries()){
   f.o.visible=f.hp>0;f.o.position.lerp(pos.clone().add(vec((i-1)*8,2,-11)),dt*4);
   if(f.hp>0&&u.cd<=0&&target)shot(f.o.position,target,'pierce',10,2,null,true)
  }
  if(u.cd<=0)u.cd=.5;
  if(u.age>=12){for(const f of u.friends)scene.remove(f.o);activeUlt=null}
 }
}

// Each evolved mount has its own attack, silhouette and combat role.
// Specials use direct strikes and finite secondary blasts, never recursively spawning themselves.
const evolutions={
 cannon:['天火交叉炮','双炮汇成白热交点，沿准线贯穿后排。'],
 spread:['孔雀开屏','展开十三道金色扇刃，横扫整排编队。'],
 rotary:['日冕风暴','满转速时倾泻螺旋弹链，并轰击中心。'],
 pierce:['贯星钨矛','射出超长蓝白穿甲矛，整条弹道内的目标同时受创。'],
 flak:['焰幕星座','七朵空爆围成花冠，中心延时引爆。'],
 split:['万花裂变','弹束两次分叉成一棵燃烧的弹道树。'],
 bounce:['绯色弹舞','在多个目标间折返两次，留下红金色折线。'],
 laser:['日蚀切割阵','两道高能切割束从左右合剪，在夹点引爆。'],
 pulse:['脉冲海啸','三重青色冲击环沿射线推进，越推越宽。'],
 chain:['雷神织网','在邻近目标间织成多边形雷网，并向中心落雷。'],
 charge:['天罚雷柱','投下三枚电印，短延迟后由上空贯下雷柱。'],
 plasma:['微型超新星','放出缓行等离子星核，连续灼烧后爆发。'],
 guided:['白隼围猎','四枚导弹齐射时加发四枚绕翼猎弹，锁住同一目标时夹击。'],
 heavy:['地心钻头','无制导重弹贯穿航线，沿途延爆出四段火柱。'],
 cluster:['蜂巢女王','母弹分两级开舱，金色子母弹群自动分配目标。'],
 radar:['黑曜追缉令','优先标定三个雷达、发射架或炮塔，以紫色追踪弹逐点爆破。'],
 barrage:['焦土弹雨','在目标上空铺开矩形弹区，由远到近连续覆盖。'],
 escort:['王牌双枪','伴飞僚机与主机进行交叉穿甲齐射。'],
 cross:['光棱天门','从翼侧张开双光棱，折射三束扫过敌阵。'],
 hunter:['红隼突袭','游猎僚机连袭三个敌位，每次穿越留下红色斩痕。'],
 strike:['陨星俯冲','攻击机在地面或舰体上投下一条由小到大的爆破带。'],
 jam:['离子反叛','近处敌弹被截获并转为紫色反击弹，缺少敌弹时释放基础电击。'],
 guard:['圣盾反应炉','前出僚机放出扩张力场，清弹并将拦截火力反射到敌阵。']
};
const MAX_RANK=11;
const evoGates={cannon:1.25,spread:1.8,rotary:1.55,pierce:1.8,flak:2.8,split:2.3,bounce:2.1,laser:2.3,pulse:1.7,chain:2.4,charge:2.6,plasma:3.3,escort:1.9,cross:2.3,hunter:2.6,strike:3,jam:2.4,guard:2.8};
function marked(p,color,r=4){ring(p,color,r,.36);flash(p,'fire',r*.45,.21)}
function lineStrike(a,b,width,power,color,thickness=.24){
 beam(a,b,color,thickness,.19);const delta=b.clone().sub(a),denom=delta.lengthSq()||1;
 for(const enemy of targets()){
  const offset=enemy.o.position.clone().sub(a);
  const u=clamp(offset.dot(delta)/denom,0,1);
  if(a.clone().addScaledVector(delta,u).distanceTo(enemy.o.position)<=width+enemy.r)damage(enemy,power,'evolution');
 }
}
function bloom(p,r,power,color='#ffc270'){ring(p,color,r,.46);flash(p,'fire',r*.68,.43);blast(p,r,power,'evolution')}
function later(delay,fn){schedule(delay,()=>{if(state==='play'&&!boss?.dying)fn()})}
function evolveFire(g,source,enemy){
 if(g.rank!==MAX_RANK||!enemy||time<(g.nextEvolution||0))return;
 if(g.id==='rotary'&&(g.spin||0)<.8)return;
 g.nextEvolution=time+(evoGates[g.id]||.25);
 const origin=source.clone(),point=enemy.o.position.clone();
 const ordered=targets().sort((a,b)=>point.distanceToSquared(a.o.position)-point.distanceToSquared(b.o.position));
 const ray=point.clone().sub(origin).normalize(),far=origin.clone().addScaledVector(ray,155);
 const offset=(p,x,y,z)=>p.clone().add(vec(x,y,z));
 switch(g.id){
 case 'cannon':
 case 'escort':{
  const span=g.id==='escort'?9:2.4;
  for(const side of [-1,1])lineStrike(offset(origin,side*span,0,0),point,1,19,'#ffda85');
  lineStrike(point,far,2.2,44,'#fff4d3',.45);marked(point,'#ffe5ad');break}
 case 'pierce':
  lineStrike(origin,far,3.6,84,'#69dfff',.63);beam(origin,far,'#f5ffff',.19,.29);for(let i=1;i<=3;i++)ring(origin.clone().lerp(far,i/4),'#84f6ff',2.4,.32);break;
 case 'spread':
  for(let i=-6;i<=6;i++){const d=ray.clone().applyAxisAngle(axis,i*.043);
   shot(origin,null,'goldShard',22,1,d);beam(origin,origin.clone().addScaledVector(d,8),'#ffba69',.12,.15)}break;
 case 'rotary':
  for(let i=0;i<8;i++)later(i*.045,()=>{const a=i*Math.PI*.7;
   const muzzle=offset(pos,Math.cos(a)*1.9,Math.sin(a)*1.7,-2);
   beam(muzzle,point,'#ff8d40',.14,.12);if(enemy.hp>0)damage(enemy,10,'evolution')});break;
 case 'flak':
  for(let i=0;i<7;i++){const a=i*2*Math.PI/7;later(i*.035,()=>bloom(offset(point,Math.cos(a)*9,Math.sin(a)*6,0),5.2,22))}later(.38,()=>bloom(point,11,43));break;
 case 'split':{
  const fork=origin.clone().lerp(point,.43);beam(origin,fork,'#fff0b5',.28,.26);
  for(const sign of [-1,1]){const branch=offset(point,sign*5,1,0);beam(fork,branch,'#ffbd62',.2,.3);
   for(let j=-2;j<=2;j++)shot(branch,null,'goldShard',24,1,vec(sign*.07+j*.12,j*.035,-1).normalize())}
  bloom(point,6,30);break}
 case 'bounce':{
  let previous=origin;const path=ordered.slice(0,6);
  [...path,...path.slice().reverse()].forEach((unit,i)=>{const a=previous.clone(),b=unit.o.position.clone();previous=b;
   later(i*.045,()=>{beam(a,b,'#ff7850',.24,.22);if(unit.hp>0)damage(unit,16,'evolution')})});break}
 case 'laser':
 case 'cross':{
  const arms=g.id==='laser'?2:3;
  for(let k=0;k<arms;k++){const mirror=offset(origin,(k-(arms-1)/2)*9,3,-10);
   beam(origin,mirror,'#57f6ef',.18,.28);ring(mirror,'#94fbff',2);
   lineStrike(mirror,point,2.8,24,'#a8fff7',.29)}
  bloom(point,7.5,32,'#95fff8');break}
 case 'pulse':
 case 'plasma':{
  const nuclear=g.id==='plasma',steps=nuclear?6:3;
  for(let k=0;k<steps;k++){const q=origin.clone().lerp(point,(k+1)/steps);
   later(k*(nuclear?.12:.075),()=>{ring(q,nuclear?'#75ffd8':'#74dfff',4+k*1.4,.48);
    for(const unit of targets())if(q.distanceTo(unit.o.position)<9+unit.r)damage(unit,24,'evolution');
    if(nuclear)flash(q,'ice',6+k,.36)})}
  if(nuclear)later(.77,()=>bloom(point,14,72,'#6dffc7'));break}
 case 'chain':{
  const web=ordered.slice(0,6);web.forEach((u,i)=>{shock(u.o.position,web[(i+1)%web.length].o.position);damage(u,22,'evolution')});
  shock(offset(point,3,25,0),point);bloom(point,6,24,'#9a9bff');break}
 case 'charge':
  ordered.slice(0,3).forEach((u,i)=>{const q=u.o.position.clone();marked(q,'#c49aff',3);later(.27+i*.11,()=>{const hit=u.hp>0?u.o.position:q;shock(offset(hit,2,30,0),hit);bloom(hit,7,43,'#d3a0ff')})});break;
 case 'guided':
  for(let i=0;i<4;i++){const a=(i-1.5)*.38;shot(offset(origin,i%2?2:-2,0,0),ordered[i%ordered.length],'hunterMissile',37,1,vec(a,.14,-1).normalize())}break;
 case 'heavy':
  for(let i=1;i<=4;i++){const q=origin.clone().addScaledVector(aimDir(origin,null),i*28);later(i*.11,()=>{bloom(q,10+i,45);beam(q,offset(q,0,10,0),'#ff9f55',.7,.3)})}break;
 case 'cluster':
  for(let i=0;i<2;i++){const q=offset(origin,(i?1:-1)*4,1,-8);
   later(.23+i*.12,()=>{marked(q,'#ffdb87',3);for(let k=0;k<5;k++)shot(q,ordered[(i*5+k)%ordered.length],'child',23,1,vec((k-2)*.22,.15,-1).normalize())})}break;
 case 'radar':{
  const priority=ordered.sort((a,b)=>Number(b.part||['radar','sam'].includes(b.type))-Number(a.part||['radar','sam'].includes(a.type)));
  for(let i=0;i<3;i++){const u=priority[i%priority.length];marked(u.o.position,'#cba4ff',3);
   shot(origin,u,'blackBolt',46,1,vec((i-1)*.28,.17,-1).normalize())}break}
 case 'barrage':
 case 'strike':
  for(let i=0;i<7;i++){const q=offset(point,g.id==='strike'?0:(i%3-1)*6,0,(i-3)*4);
   later(i*.085,()=>{beam(offset(q,0,14,-4),q,'#ffba65',.2);bloom(q,5+i*.65,20+i*2)})}break;
 case 'hunter':{
  const wing=allies.find(a=>a.id==='hunter');if(!wing)break;
  ordered.slice(0,3).forEach((u,i)=>later(i*.18,()=>{if(!allies.includes(wing))return;
   const q=u.o.position.clone();lineStrike(wing.o.position,q,1.6,35,'#ff776b');wing.o.position.copy(offset(q,2,2,-2));marked(q,'#ffb09b',2.5)}));break}
 case 'jam':
 case 'guard':{
  const radius=g.id==='jam'?20:14;const color=g.id==='jam'?'#bd97ff':'#7df5eb';
  const energy=absorb(origin,radius);ring(origin,color,radius,.65);
  if(g.id==='guard')for(const u of ordered)if(origin.distanceTo(u.o.position)<radius+u.r)damage(u,38,'evolution');
  for(let i=0;i<Math.min(6,2+energy);i++)shot(origin,ordered[i%ordered.length],g.id==='jam'?'blackBolt':'return',23,1,vec((i-1)*.13,.12,-1).normalize());break}
 }
}

// Hull plating, deck markings and navigation lights give the targets a readable scale.
const plating=canvasMap(256,256,(c,w,h)=>{c.fillStyle='#ced5d4';c.fillRect(0,0,w,h);for(let y=0;y<256;y+=32)for(let x=-64+(y%64);x<256;x+=64){const k=Math.round(rand(178,218));c.fillStyle='rgb('+k+','+(k+4)+','+(k+6)+')';c.fillRect(x+1,y+1,62,30);c.fillStyle='#818e91';for(let dx of [3,58])for(let dy of [3,27])c.fillRect(x+dx,y+dy,2,1)}});
function detailBoss(id,g){
 const armored=new Map();g.traverse(o=>{if(!o.isMesh||!o.material.isMeshStandardMaterial)return;const key=o.material.color.getHex();if(!armored.has(key))armored.set(key,new T.Material({color:key,map:plating,metalness:.32,roughness:.65}));o.material=armored.get(key)});
 const detail=(kind,c,x,y,z,w,h,d,lit=true)=>shape(g,kind,c,x,y,z,w,h,d,lit);
 if(['dread','deck','drill'].includes(id))for(const side of [-1,1]){
  const edge=id==='deck'?10.9:id==='drill'?7.9:4.1;
  for(let i=0;i<10;i++){const z=-12+i*2.6;detail('box','#2d3a42',side*edge,0,z,1.35,1.2,1.75);detail('box',i%3?'#bdccca':'#f1be73',side*(edge+.71),.18,z,.07,.17,.69,false)}
  for(let i=0;i<3;i++){const z=-9+4*i;detail('tube','#53636a',side*3.2,3.5,z,.66,.65,.66);detail('box','#899ca1',side*3.2,4.2,z,.19,1.1,1.7)}
 }
 if(id==='deck')for(const s of [-1,1]){for(let i=0;i<5;i++){const f=model.clone(true);f.scale.setScalar(.22);f.position.set(s*8.6,2.25,i*3.7-8);g.add(f)}detail('box','#dde1ce',s*5.1,1.96,0,.1,.06,26)}
 if(id==='one'){for(let j=-10;j<12;j+=1.25)for(let s of [-1,1])detail('oval','#354b59',s*2.7,1,j,.16,.23,.38);for(let s of [-1,1]){const engine=detail('oval','#445564',s*6.6,-1.2,-1,.98,1,2.4);detail('oval','#243139',engine.position.x,-1.2,.9,.72,.72,.1)}}
 if(id==='iron'){for(let s of [-1,1])for(let j=0;j<8;j++){let z=-8+j*2.2;detail('box','#cfac79',s*3,-.1,z,1.4,.29,.6,false)}}
 if(id==='ring'){for(let i=0;i<32;i++){const a=i*Math.PI/16;detail('oval','#9de5ed',Math.cos(a)*10.8,.45,Math.sin(a)*9,.23,.13,.23,false)}}
 if(id==='hive'){for(let j=0;j<44;j++){const a=j*2.4,b=Math.acos(1-2*(j+.5)/44);const x=7.3*Math.sin(b)*Math.cos(a),y=4.8*Math.cos(b),z=9*Math.sin(b)*Math.sin(a);detail('oval',j%3?'#65466a':'#af7896',x,y,z,1.3,.85,1.7);if(j%4===0)detail('oval','#f38d90',x*.99,y*1.13,z*1.03,.5,.33,.53,false)}}
 if(id==='dread'){for(let s of [-1,1])for(let i=0;i<5;i++)detail('box','#91e4f4',s*2,1.45,9+i*2.3,.63,.12,1,false)}
}
function specialSystems(dt){
 const b=boss;if(!b||b.dying||bossIntro)return;
 const live=b.parts.filter(p=>p.hp>0),primary=live.filter(p=>p.role==='primary'),core=live.find(p=>p.role==='core');
 b.specialTimer=(b.specialTimer??4)-dt;b.heat=Math.max(0,(b.heat||0)-dt);
 if(b.specialTimer<=0){b.specialTimer=b.phase===1?6.5:4.5;
  if(b.id==='iron'){for(const bay of live.filter(p=>p.role==='secondary'))for(let i=-1;i<=1;i++)threat(bay.o.position,'flak',i*3)}
  if(b.id==='drill'){for(const arm of primary){const side=Math.sign(arm.local.x),spot=pos.clone();spot.x=side*12;
   for(let i=-1;i<2;i++)schedule((i+1)*.14,()=>{if(arm.hp>0){threat(arm.o.position,'flak',side*6+i*4);flash(arm.o.position,'smoke',6,.8)}})}}
  if(b.id==='ring'){for(const emitter of primary){const angle=emitter.index*Math.PI/3+b.age*.34;const aim=vec(13*Math.cos(angle),12+10*Math.sin(angle),0);const b0=threat(emitter.o.position,'pulse');b0.v.copy(aim.sub(emitter.o.position).normalize().multiplyScalar(34))}}
  if(b.id==='dread'){for(const capacitor of primary){const at=b.parts.filter(p=>p.role==='primary').indexOf(capacitor);schedule(at*.5,()=>{if(capacitor.hp>0&&!b.dying){beam(capacitor.o.position,b.body.position.clone().add(vec(0,0,22)),'#8bd8ff',.35,.3);threat(capacitor.o.position,'flak')}})}}
  if(b.id==='one'&&live.some(p=>p.role==='secondary')){b.jamUntil=time+2.8;say('敌机干扰 · 使用机炮压制吊舱',1.5)}
  if(b.id==='hive'&&b.phase>=2&&primary.some(p=>p.index===1)){b.shieldUntil=time+1.6;ring(b.body.position,'#be8bff',14,.9)}
 }
 if(core&&!core.hidden&&b.id==='dread'&&b.heat>0)core.o.children[0].material=surface('#fbc384',false);
}
function bossSkyEffects(kind){
 const groupFx=group(backdrop);
 if(kind==='night'){
  const moon=shape(groupFx,'oval','#c1dced',-145,110,-570,19,19,19,false);
  for(let i=0;i<34;i++){const drop=shape(groupFx,'box','#869daf',rand(-64,64),rand(1,62),rand(-100,5),.045,1.4,.045,false);drop.rotation.z=-.16;drop.name='rain'}
 }
 if(kind==='ufo'||kind==='hive'){
  // Layer broad translucent atmospheric bands behind the combat volume.
  const paint=canvasMap(512,128,(c,w,h)=>{c.clearRect(0,0,w,h);for(let x=0;x<w;x++){let u=x/w,crest=h*(.52+.21*Math.sin(6*u)+.1*Math.sin(18*u)),gradient=c.createLinearGradient(0,0,0,h);gradient.addColorStop(0,'transparent');gradient.addColorStop(Math.max(.04,crest/h-.22),kind==='ufo'?'rgba(80,255,190,.14)':'rgba(178,77,210,.14)');gradient.addColorStop(crest/h,kind==='ufo'?'rgba(93,233,170,.68)':'rgba(199,111,236,.6)');gradient.addColorStop(Math.min(.96,crest/h+.21),'transparent');gradient.addColorStop(1,'transparent');c.fillStyle=gradient;c.fillRect(x,0,1,h)}});
  const band=new T.Mesh(new T.Plane(800,210),new T.Basic({map:paint,transparent:true,opacity:.65,side:2,depthWrite:false,blending:2,fog:false}));band.position.set(60,70,-560);band.rotation.z=kind==='hive'?-.44:.17;groupFx.add(band);
 }
 if(kind==='orbit'){for(let j=0;j<6;j++){const slab=shape(groupFx,'box','#727e8c',-95+j*29,38+j%2*8,-295-j*4,16,5,22);slab.rotation.z=j*.4;shape(groupFx,'box','#669cba',-95+j*29,42+j%2*8,-295-j*4,28,.45,5)}}
 return groupFx
}

const bossBook={
 iron:['铁幕','沙暴走廊','sand','破坏侧推进器，迫使弹舱倾斜','推进器','弹舱','龙骨'],
 one:['苍穹一号','雨夜都市','night','干扰吊舱掩护编队，机炮可直接攻击发动机','发动机','干扰吊舱','指挥舱'],
 deck:['利维坦','热带海峡','strait','击毁升降机，切断该侧舰载机增援','升降机','近防炮','舰桥'],
 drill:['断层','冰川峡谷','ice','摧毁钻臂打开安全航线，击破履带迫使母机偏航','钻臂','履带','散热鳍'],
 ring:['蚀环','极光轨道','ufo','摧毁发射器，利用缺口攻击内环','外环发射器','磁极','内环核心'],
 dread:['天穹级','碎星轨道','orbit','击毁电容减少舰首主炮连射，冷却时打击炮闩','电容','侧舷炮','主炮炮闩'],
 hive:['群星巢','紫星残骸带','hive','切断孵化臂，阻止对应蜂群出生','孵化臂','护盾囊','母巢核心']
};
function drawBoss(){const keys=Object.keys(bossBook);let bag=[];try{bag=JSON.parse(localStorage.getItem('sky-bag-v1')||'[]').filter(x=>keys.includes(x))}catch{}if(!bag.length)bag=shuffle(keys);const next=bag.pop();try{localStorage.setItem('sky-bag-v1',JSON.stringify(bag))}catch{}return next}
function addBossPart(name,x,y,z,role,form,col,size,hp,index){const root=group();const dims=form==='box'?[size*1.7,size*.75,size*2]:form==='cone'?[size*.8,size*3,size*.8]:[size*1.15,size*.84,size*1.35];const m=shape(root,form,col,0,0,0,...dims);if(form==='cone')m.rotation.x=-Math.PI/2;
 shape(root,'box',role==='core'?'#a7f3ed':'#ffc381',0,dims[1]*(form==='box'?.55:.95),0,size*.55,.13,size*.6,false);
 const e={o:root,name,part:true,local:vec(x,y,z),role,index,hp,max:hp,r:size*1.25,reward:0,charge:0,hidden:role==='core'};e.o.visible=!e.hidden;boss.parts.push(e);enemies.push(e);return e}
function buildBoss(id){
 nextBoss=id;const [name,arena,map,hint,primary,secondary,core]=bossBook[id];boss={id,name,arena,body:group(),parts:[],age:0,phase:1,cycle:0,cd:3,gun:1.5,reinforce:5,attack:null,dying:false};const b=boss,g=b.body;
 const hull=(kind,c,x,y,z,w,h,d)=>shape(g,kind,c,x,y,z,w,h,d);
 const guns=(x,y,z,role,name,size,form='box',idx=0)=>addBossPart(name,x,y,z,role,form,role==='primary'?'#a48a68':'#667785',size,role==='primary'?410:250,idx);
 if(id==='iron'){for(const side of [-1,1]){hull('oval','#948c75',side*5,3,0,5.6,5.7,16);for(let j=-2;j<=2;j++){const strap=hull('ring','#585c53',side*5,3,j*4,5.3,5.5,.8);strap.rotation.z=.05}guns(side*11,0,3,'primary',primary,2,'oval',side);guns(side*3,-3,5,'secondary',secondary,2.1,'box',side)}hull('box','#484e4c',0,-1,0,10,3.8,17)}
 if(id==='one'){hull('oval','#d3dce0',0,0,0,3.2,3,16);hull('oval','#315678',0,-.8,0,3.18,2.4,15.7);hull('oval','#a8b8be',0,.1,-1,18,.55,5);hull('oval','#889da8',0,0,-11,8,.45,2.6);hull('box','#35668b',0,3,-11,.65,6,4);for(let s of [-1,1]){guns(s*9,-1,2,'primary',primary,2,'oval',s);guns(s*14,-1,-1,'primary',primary,1.6,'oval',s)}guns(0,3,1,'secondary',secondary,2.1,'oval')}
 if(id==='deck'){hull('oval','#4b606a',0,-1,0,9,3,19);for(let s of [-1,1]){hull('box','#586e76',s*7,1,0,8,1.8,30);for(let j=-2;j<3;j++)hull('box','#d2c8a7',s*7,1.96,j*5,.22,.08,3);guns(s*9,2,7,'primary',primary,2.5,'box',s);guns(s*12,-1,-3,'secondary',secondary,1.65,'oval',s)}hull('box','#657d83',0,3,-5,3.5,5,6)}
 if(id==='drill'){hull('box','#797660',0,-1,0,16,8,21);for(let s of [-1,1]){guns(s*10,0,6,'primary',primary,3.1,'cone',s);guns(s*6,-4,-2,'secondary',secondary,3,'box',s);hull('box','#5b655e',s*6,3,0,2,3,15)}}
 if(id==='ring'){hull('oval','#758899',0,0,0,11,2.6,10);for(let j=0;j<6;j++){let a=j*Math.PI/3;guns(Math.cos(a)*13,1,Math.sin(a)*10,'primary',primary,2,'oval',j);const rim=hull('box','#6b9299',Math.cos(a)*10.8,0,Math.sin(a)*9,6.3,1.2,2.4);rim.rotation.y=-a-Math.PI/2}hull('oval','#a7dcec',0,2,0,4,2.1,4)}
 if(id==='dread'){hull('box','#495761',0,0,0,8,5,31);hull('box','#627584',0,3,-5,5,4,8);for(let s of [-1,1]){hull('box','#455262',s*6,0,-3,5,4,20);hull('box','#7894a3',s*2,0,16,1.8,2.7,12);guns(s*7,2,0,'primary',primary,2.6,'oval',s);guns(s*9,0,6,'secondary',secondary,1.9,'box',s)}}
 if(id==='ring'){
  b.inner=group(g);for(let i=0;i<9;i++){const a=i*.63;const blade=shape(b.inner,'box','#5f869b',Math.cos(a)*5.6,2.2,Math.sin(a)*4.8,2.4,.5,.75);blade.rotation.y=-a}
 }
 if(id==='hive'){hull('oval','#775777',0,0,0,7.5,5,9);for(let j=0;j<3;j++){const a=j*2.094;const xx=Math.cos(a)*11,yy=Math.sin(a)*5;const arm=hull('oval','#6e4a67',xx*.62,yy*.6,0,6,1.8,4);arm.rotation.z=a;guns(xx,yy,2,'primary',['截击孵化臂','护盾孵化臂','自爆孵化臂'][j],2.25,'oval',j)}guns(0,4,-1,'secondary',secondary,2,'oval')}
 detailBoss(id,g);g.scale.setScalar(id==='dread'?1.95:1.65);for(const part of b.parts){part.o.scale.copy(g.scale);part.r*=g.scale.x}
 addBossPart(core,0,id==='iron'?-3.2:1.4,id==='dread'?19:7,'core','oval','#5da5aa',3,2100,0);
 for(const s of shots.slice())deadShot(s);mode='boss';bossIntro=2.7;mapScene(map);for(const e of enemies.slice())if(!e.part){scene.remove(e.o);remove(enemies,e)}for(const t of threats.slice())eraseThreat(t);
 $('bossHud').hidden=false;say(name+' · '+hint,3.6);b.body.position.set(0,12,-136);placeParts();
}
function placeParts(){const b=boss;b.body.updateMatrixWorld();for(const e of b.parts)if(e.hp>0){const local=e.local.clone();if(b.id==='ring'&&e.role==='primary')local.applyAxisAngle(axis,b.age*.34);e.o.position.copy(b.body.localToWorld(local));e.o.quaternion.copy(b.body.quaternion)}}
function breakPart(e){
 const b=boss;burst(e.o.position,e.r*1.7);scene.remove(e.o);remove(enemies,e);upgradeXP(3);if(e.role==='core'){
 recordKill();b.dying=true;b.attack=null;$('warning').textContent='';for(const p of b.parts){p.hp=0;scene.remove(p.o);remove(enemies,p)}for(const t of threats.slice())eraseThreat(t);deadPlanes.push({o:b.body,size:8,emit:0,age:0,spin:.25,final:true});say('核心摧毁 · 目标坠落',4);return}
 say(e.name+' 已摧毁',1.3);
 const broken=b.parts.filter(p=>p.role!=='core'&&p.hp<=0).length;
 const primaries=b.parts.filter(p=>p.role==='primary'&&p.hp<=0).length;const ready=b.id==='iron'||b.id==='deck'?primaries>=1:b.id==='hive'||b.id==='ring'?primaries>=2:broken>=2&&primaries>=1;
 if(b.phase===1&&ready){b.phase=2;const core=b.parts.find(p=>p.role==='core');core.hidden=false;core.o.visible=true;b.cd=1.2;say('第二阶段 · '+core.name+'暴露',2.5)}
}
const sweepOrigin=vec(),sweepAim=vec(),sweepEnd=vec();
function placeSweep(x,pose){
 sweepOrigin.copy(boss.body.position);sweepOrigin.z+=10;
 sweepAim.copy(pose.center);sweepAim.x=x;
 sweepEnd.copy(sweepAim);sweepEnd.z+=7;
}
function sweepHits(x,pose){
 placeSweep(x,pose);
 return canopyEntry(sweepOrigin,sweepAim,pose,pose,.72)!==Infinity||
        canopyEntry(sweepAim,sweepEnd,pose,pose,.62)!==Infinity;
}
function bossSweepNear(){
 const a=boss?.attack;
 if(a?.kind!=='laser'||a.t<a.wind-PERFECT_WINDOW||a.t>=a.wind+a.duration)return false;
 const steps=forecastCourse(PERFECT_WINDOW);
 for(let i=0;i<=steps;i++){
  const phase=(a.t+i*FORECAST_STEP-a.wind)/a.duration;
  if(phase>=0&&phase<=1&&sweepHits(a.base-12+24*phase,forecast[i]))return true;
 }
 return false;
}
function warningBeam(a,live){
 placeSweep(a.x,canopy);
 beam(sweepOrigin,sweepAim,live?'#f2d5ff':'#b280ff',live?.72:.14,.055);
 beam(sweepAim,sweepEnd,live?'#f2d5ff':'#b280ff',live?.62:.1,.055);
}
function startAttack(){const b=boss;const sequences={iron:['bomb','fan','bomb'],one:['fan','laser','fan'],deck:['bomb','fan','laser'],drill:['fan','bomb','fan'],ring:['laser','laser','fan'],dread:['laser','fan','laser'],hive:['fan','bomb','fan']};let kind=sequences[b.id][b.cycle++%3];if(b.phase===1&&kind==='laser')kind='fan';
 if(b.id==='dread'&&kind==='laser')b.remainingLances=b.parts.filter(p=>p.role==='primary'&&p.hp>0).length;
 const a=b.attack={kind,t:0,wind:kind==='bomb'?2:1.5,duration:kind==='laser'?1.25:.25,x:canopy.center.x-12,base:canopy.center.x,center:canopy.center.clone(),visual:0,done:false};
 if(kind==='bomb'){$('warning').textContent='◎　空爆预警 · 离开标区或精准爆盾';tone(210,.14);schedule(.25,()=>tone(210,.14))}
 if(kind==='laser'){$('warning').textContent='✦　主炮蓄能 · 横移或翻滚穿越';tone(850,.4)}
}
function tickBoss(dt){const b=boss;if(b.dying)return;b.age+=dt;bossIntro=Math.max(0,bossIntro-dt);const broken=b.parts.filter(p=>p.hp<=0),side=broken.reduce((v,p)=>v+(p.role==='primary'?Math.sign(p.local.x):0),0);
 const drift=b.id==='drill'?4:b.id==='one'?14:8;
 b.body.position.set(Math.sin(b.age*(b.phase===3?.33:.23))*drift+(b.id==='drill'?side*3:0),12+Math.sin(b.age*.29)*(b.id==='drill'?1:3),-66-68*Math.exp(-b.age*1.2));
 b.body.rotation.z=(b.id==='iron'?side*.16:0)+Math.sin(b.age*.35)*.045;b.body.rotation.x=(b.id==='deck'?.20:b.id==='dread'?.12:0)+Math.sin(b.age*.31)*.035;b.body.rotation.y=Math.sin(b.age*.25)*(b.id==='one'&&b.phase===2?.55:.14);
 if(b.inner)b.inner.rotation.y=-b.age*.72;placeParts();if(bossIntro)return;specialSystems(dt);
 b.gun-=dt;b.cd-=dt;b.reinforce-=dt;
 if(b.gun<=0){const guns=b.parts.filter(p=>p.hp>0&&p.role!=='core');const loc=choice(guns)?.o.position||b.body.position;
 threat(loc,'tracer');b.gun=(b.phase===3?.85:1.2)+broken.length*.25}
 if(b.reinforce<=0){b.reinforce=13;const live=b.parts.filter(p=>p.role==='primary'&&p.hp>0);if(b.id==='deck'||b.id==='hive'||b.id==='one'){for(const p of live.slice(0,3)){const kind=b.id==='hive'?['interceptor','escort','bomber'][p.index]:b.id==='one'?'escort':'fighter';unit(kind,p.o.position.x,p.o.position.y,p.o.position.z,++squadNo,0)}}}
 if(!b.attack&&b.cd<=0)startAttack();const a=b.attack;if(!a)return;a.t+=dt;a.visual-=dt;const live=a.t>=a.wind;
 if(a.kind==='laser'){a.x=a.base-12+24*clamp((a.t-a.wind)/a.duration,0,1);if(a.visual<=0){a.visual=.042;warningBeam(a,live)}if(live&&sweepHits(a.x,canopy)) {if(!(action==='roll'&&actionAge<.25))harm(2,true)}}
 if(a.kind==='bomb'){const radius=8.5;if(a.visual<=0){a.visual=.065;const edge=shape(scene,'ring','#ff9b46',a.center.x,a.center.y,a.center.z,radius,radius,1,false);sparks.push({o:edge,life:.08,max:.08,fixed:true});const r=Math.max(.2,radius*clamp(a.t/a.wind,0,1));const inner=shape(scene,'ring','#ffc883',a.center.x,a.center.y,a.center.z+.05,r,r,1,false);sparks.push({o:inner,life:.08,max:.08,fixed:true})}
 if(live&&!a.done){a.done=true;burst(a.center,7);if(canopy.center.distanceToSquared(a.center)<radius*radius){if(guardWindow>0)guardPerfect(3);else harm(2,true)}}}
 if(a.kind==='fan'&&live&&!a.done){a.done=true;const origins=b.parts.filter(p=>p.role!=='core'&&p.hp>0);for(const p of origins.slice(0,5)){threat(p.o.position,b.id==='iron'?'flak':'tracer',p.local.x*.17);if(b.phase>=2)threat(p.o.position,'missile',2,false)}}
 if(a.t>a.wind+a.duration){if(b.id==='dread'&&a.kind==='laser'&&b.remainingLances>0){b.remainingLances--;a.t=0;a.wind=1.1;a.x=canopy.center.x-12;a.base=canopy.center.x;return}
 if(b.id==='dread'&&a.kind==='laser')b.heat=3;b.attack=null;b.cd=b.phase===3?1.45:b.phase===2?2.5:3.2;$('warning').textContent=''}
 const core=b.parts.find(p=>p.role==='core');if(b.phase===2&&core.hp<core.max*.45&&b.phase!==3){b.phase=3;say('终段 · 核心过载',2);b.cd=.4}
}

const sightLayer=$('threatHud'),sight=sightLayer.getContext('2d');
const screenCanopy=vec(),screenRound=vec(),eyeRound=vec();
let sightTime=0;
function projectSight(world,out){
 out.copy(world).project(camera);
 if(out.z< -1||out.z>1||Math.abs(out.x)>1.08||Math.abs(out.y)>1.08)return false;
 out.x=(out.x+1)*innerWidth*.5;out.y=(1-out.y)*innerHeight*.5;return true;
}
function strokeSight(color,width){
 sight.lineWidth=width+2;sight.strokeStyle='rgba(32,19,26,.8)';sight.stroke();
 sight.lineWidth=width;sight.strokeStyle=color;sight.stroke();
}
function addCorners(x,y,r){
 const arm=Math.min(7,r*.48);
 for(const sx of [-1,1])for(const sy of [-1,1]){
  const px=x+sx*r,py=y+sy*r;
  sight.moveTo(px-sx*arm,py);sight.lineTo(px,py);sight.lineTo(px,py-sy*arm);
 }
}
// 预警用的来袭预测每 2 帧算一次（30Hz），期间按时间差扣减 eta，避免逐帧做全量扫掠求交。
let incomingMemo=null,incomingMemoAt=-1;
function incomingHint(){
 if(incomingMemo&&sightTime-incomingMemoAt<.033)return {bullet:incomingMemo.bullet,eta:Math.max(0,incomingMemo.eta-(sightTime-incomingMemoAt))};
 incomingMemoAt=sightTime;incomingMemo=firstIncoming(WARNING_TIME);return incomingMemo;
}
function drawThreatHud(realDt){
 sightTime+=realDt;
 const dpr=Math.min(devicePixelRatio||1,2),w=Math.round(innerWidth*dpr),h=Math.round(innerHeight*dpr);
 if(sightLayer.width!==w||sightLayer.height!==h){sightLayer.width=w;sightLayer.height=h}
 sight.setTransform(dpr,0,0,dpr,0,0);sight.clearRect(0,0,innerWidth,innerHeight);
 sight.lineJoin='round';sight.lineCap='round';
 // Every eligible projectile gets a bracket, including close rounds that will miss.
 sight.beginPath();
 for(const b of threats){
  if(!inBurstRange(b.o.position)||!projectSight(b.o.position,screenRound))continue;
  const eyeDepth=Math.max(1,-eyeRound.copy(b.o.position).applyMatrix4(camera.matrixWorldInverse).z);
  const r=b.id==='missile'?clamp(innerHeight/eyeDepth*.75,12,27):clamp(innerHeight/eyeDepth*.82,9,21);
  addCorners(screenRound.x,screenRound.y,r);
 }
 strokeSight('#ff6264',1.65);
 if(!projectSight(canopy.center,screenCanopy))return;
 const x=screenCanopy.x,y=screenCanopy.y;
 sight.beginPath();sight.moveTo(x,y-5);sight.lineTo(x+5,y);sight.lineTo(x,y+5);sight.lineTo(x-5,y);sight.closePath();
 strokeSight('#bcf7ed',1.4);
 const next=incomingHint();
 if(!next)return;
 const b=next.bullet;
 screenRound.copy(b.o.position).project(camera);
 const dx=(screenRound.x+1)*innerWidth*.5-x,dy=(1-screenRound.y)*innerHeight*.5-y;
 const angle=Math.abs(dx)+Math.abs(dy)<1?-Math.PI/2:Math.atan2(dy,dx);
 const t=clamp(next.eta/WARNING_TIME,0,1),r=12+24*t;
 const perfect=next.eta<=PERFECT_WINDOW;
 if(perfect&&b.cueTime===undefined)b.cueTime=sightTime;
 const flash=perfect&&sightTime-b.cueTime<.09;
 sight.beginPath();sight.arc(x,y,r,angle-.82,angle+.82);
 strokeSight(flash?'#fffdf4':perfect?'#ffe9a6':'#ffb345',flash?3.6:2.8);
}

let actx=null;
function tone(freq,duration){if(!actx||actx.state!=='running')return;const osc=actx.createOscillator(),amp=actx.createGain();osc.type='sine';osc.frequency.setValueAtTime(freq,actx.currentTime);osc.frequency.exponentialRampToValueAtTime(freq*1.25,actx.currentTime+duration);amp.gain.setValueAtTime(.018,actx.currentTime);amp.gain.exponentialRampToValueAtTime(.0001,actx.currentTime+duration);osc.connect(amp);amp.connect(actx.destination);osc.start();osc.stop(actx.currentTime+duration)}
function chooseUlt(id){ultId=id;$('ultHint').textContent=specials[id][1]+' 开局 1 次，每击破 '+ULT_KILLS_PER_USE+' 个补充 1 次，上限 '+ULT_CAPACITY+' 次。';for(const b of $('ultPick').children)b.classList.toggle('sel',b.dataset.ult===id)}
for(const [id,[label]] of Object.entries(specials)){const b=document.createElement('button');b.textContent=label;b.dataset.ult=id;b.onclick=()=>chooseUlt(id);$('ultPick').append(b)}chooseUlt('nuke');
function startGame(){if(state!=='intro')return;try{actx=new AudioContext();actx.resume().catch(()=>{})}catch{}state='play';$('intro').hidden=true;$('hud').hidden=false;camera.fov=57;camera.updateProjectionMatrix();camera.position.set(0,18,22);camera.lookAt(0,12,-28);nextBoss=drawBoss();enterZone(0);nextWave=time;gear.push({id:'guided',rank:1,cd:1});say('按住左键开火 · 松开进入战术慢速',4)}
function changePause(){if(state==='play'){secondaryDown=guardQueued=false;state='paused';firing=triggerTap=false;$('pause').hidden=false;$('hud').classList.add('paused');$('inspect').textContent=gear.map(mountLabel).join('　/　')+(pending?'。可在下方继续查看并选择升级。':'。')}else if(state==='paused'){state='play';$('pause').hidden=true;$('hud').classList.remove('paused')}}
function finish(win){if(state!=='play')return;state='end';firing=false;$('resultTitle').textContent=win?'任务完成':'机体损毁';$('report').textContent=(boss?boss.arena:mapNames[zone])+'　·　击破 '+kills+' 个目标　·　等级 '+level+'　·　飞行 '+Math.floor(elapsed/60)+'分'+Math.floor(elapsed%60)+'秒';$('result').hidden=false;$('hud').hidden=true}
$('start').onclick=startGame;$('start').disabled=false;$('start').textContent='出击　→';$('loadState').textContent='';$('resume').onclick=changePause;
function isGuardKey(e){
 return e.code==='ControlLeft'||(e.key==='Control'&&e.location!==2)||e.code==='KeyF';
}
window.addEventListener('keydown',e=>{
 if(state!=='play'||!isGuardKey(e))return;
 e.preventDefault();e.stopImmediatePropagation();
 if(!e.repeat)requestGuard()
},true);
$('guardButton').addEventListener('pointerdown',e=>{
 if(e.button!==0)return;
 e.preventDefault();e.stopPropagation();requestGuard()
});
$('guardButton').addEventListener('click',e=>{if(e.detail===0)requestGuard()});

window.addEventListener('keydown',e=>{if(e.code==='Escape'){e.preventDefault();if(!e.repeat)changePause();return}if(e.code==='KeyR'&&pending){e.preventDefault();if(!e.repeat)reroll();return}if(e.code.startsWith('Digit')&&pending){if(!e.repeat&&['Digit1','Digit2','Digit3'].includes(e.code))selectUpgrade(Number(e.code.slice(-1))-1);return}if(state!=='play')return;if(e.code==='Space'){e.preventDefault();if(!e.repeat)rollNow()}});
window.addEventListener('pointermove',e=>{mouse.x=clamp(e.clientX/innerWidth*2-1,-1,1);mouse.y=clamp(1-e.clientY/innerHeight*2,-1,1)});
let secondaryDown=false,lastSecondaryUp=-Infinity;
// Mouse events report each button in a chord, including right-click during sustained fire.
window.addEventListener('mousedown',e=>{
 if(state!=='play')return;
 if(e.button===0&&e.target===$('scene')){firing=true;triggerTap=true}
 if(e.button===2){e.preventDefault();secondaryDown=true;ultNow()}
});
window.addEventListener('mouseup',e=>{
 if(e.button===0)firing=false;
 if(e.button===2&&secondaryDown){secondaryDown=false;lastSecondaryUp=performance.now()}
});
window.addEventListener('contextmenu',e=>{
 if(state!=='play')return;
 e.preventDefault();
 // Some trackpads issue only contextmenu. A physical click has already cast on mousedown.
 if(!e.ctrlKey&&!secondaryDown&&performance.now()-lastSecondaryUp>300)ultNow()
});
$('scene').onpointerdown=e=>{
 if(e.pointerType==='mouse'||e.button!==0||state!=='play')return;
 e.preventDefault();firing=true;triggerTap=true
};
window.onpointerup=e=>{if(e.pointerType!=='mouse'&&e.button===0)firing=false};
window.onpointercancel=()=>{firing=triggerTap=secondaryDown=false};
$('ultButton').addEventListener('click',ultNow);
window.onblur=()=>{if(state==='play')changePause()};document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='play')changePause()});
function enterZone(n){zone=n;mapScene(['city','base','sea'][n]);say(['进入临港空域 · 截击来袭编队','接近基地跑道 · 优先摧毁制导雷达','进入近海 · 压制航母飞行甲板'][n],3);nextWave=time+1}
const patterns=[['fighter','scout','intercept','bomb','fighter','scout'],['base','bomb','fighter','base','intercept','scout'],['fleet','intercept','bomb','fighter','fleet','scout']];
let bossPreview=false;function advanceMission(){if(mode!=='flight')return;if(!bossPreview&&elapsed>STAGE_TIME*3-5){bossPreview=true;say('长距雷达 · '+bossBook[nextBoss][0]+'正在接近',4);tone(310,.2)}const n=Math.floor(elapsed/STAGE_TIME);if(n>=3){buildBoss(nextBoss);return}if(n!==zone)enterZone(n);if(time>=nextWave){formation(patterns[zone][wave%6]);wave++;nextWave=time+(zone===0?3.3:zone===1?2.9:2.6)}}
function move(dt,realDt){
 const oldX=pos.x,previousAge=actionAge;
 lastCanopy.center.copy(canopy.center);lastCanopy.inverse.copy(canopy.inverse);
 if(action)actionAge+=realDt;
 steerAirframe(pos,player.rotation,dt,action==='roll',actionAge);
 locateCanopy(canopy,pos,player.quaternion);
 if(action==='roll'&&actionAge>.43*.08&&actionAge<.43*.8&&Math.floor(actionAge*18)!==Math.floor(previousAge*18))makeGhost(player);
 if(action&&actionAge>=(action==='roll'?.43:.44)){action='';if(guardQueued){guardQueued=false;guardNow()}}
 guardWindow=Math.max(0,guardWindow-realDt);hitGrace=Math.max(0,hitGrace-dt);shieldCD=Math.max(0,shieldCD-dt);counterCD=Math.max(0,counterCD-dt);
 if(shield<4){
  shieldWait-=realDt;
  if(shieldWait<=1e-6){shield++;shieldWait+=SHIELD_NEXT}
 }
 const wide=mode==='boss'?20:22.5;const ratio=Math.max(0,1.35-camera.aspect);const entrance=bossIntro?Math.sin((1-bossIntro/2.7)*Math.PI)*4:0;
 camera.position.lerp(vec(pos.x*.87+entrance,pos.y+5.4+entrance*.6,wide+ratio*9+entrance),1-Math.exp(-dt*6));
 camera.up.set(Math.sin((oldX-pos.x)*.018),1,0).normalize();camera.lookAt(pos.x*.79,pos.y+.8,-22);camera.updateMatrixWorld();
}
const ghostMaterial=new T.Basic({color:'#a1d6e0',transparent:true,opacity:.13,depthWrite:false});
function makeGhost(source){const ghost=model.clone(true);ghost.position.copy(source.position);ghost.quaternion.copy(source.quaternion);ghost.scale.copy(source.scale);ghost.traverse(o=>{if(o.isMesh)o.material=ghostMaterial});scene.add(ghost);ghost.position.z+=1.2;sparks.push({o:ghost,life:.19,max:.19,fixed:true,realTime:true})}
function hud(){ $('guardButton').textContent=action==='guard'?'爆盾释放中':action==='roll'?'回正中':shield>0?'爆盾　Ctrl / F':'爆盾　缺盾';const bossLive=boss&&!boss.dying;$('region').innerHTML=mode==='boss'?'关底空域<b>'+boss.arena+'</b>':'航段 0'+(zone+1)+' / 03<b>'+mapNames[zone]+'</b>';$('bars').textContent='▰'.repeat(shield)+'▱'.repeat(4-shield);$('hp').textContent='机体 '+Math.ceil(hp)+'%';$('loadout').innerHTML='装备 '+gear.length+' / '+SLOT_LIMIT+'　·　等级 '+level+'<b>'+gear.map(mountLabel).join(' · ')+'</b>';
 const load=gear.filter(g=>kitTypes[g.id][1]==='导弹').map(g=>kitTypes[g.id][0]+(g.cd>0?' '+g.cd.toFixed(1)+'s':' 就绪')).join('　');
 const stock=ultUses===ULT_CAPACITY?'储备已满':'再击破 '+(ULT_KILLS_PER_USE-ultKills)+' 个补充';
 const command=activeUlt?.id==='rail'?'右键引爆':activeUlt?'执行中':'右键';
 $('ultButton').textContent=command+' · '+specials[ultId][0]+' ×'+ultUses+'　'+stock;
 $('statusDetail').textContent=action==='roll'?'翻滚回正':action==='guard'?'护盾收束':shieldBank?'已储能 '+shieldBank:load||'反击弹 ×'+counterCount;
 const aim=target?.hp>0&&Math.hypot(target.o.position.x-mouse.x*37,target.o.position.y-12-mouse.y*24)<Math.max(8,target.r+4)?target.o.position:pos.clone().addScaledVector(aimDir(pos,null),75);const v=aim.clone().project(camera);$('reticle').style.left=clamp(v.x*50+50,2,98)+'%';$('reticle').style.top=clamp(50-v.y*50,4,95)+'%';$('reticle').style.borderColor=target?'#ffc788':'#c1d5db';
 if(bossLive){$('bossName').textContent=boss.name+'　·　第 '+boss.phase+' 阶段';$('bossHp').value=boss.parts.reduce((a,e)=>a+Math.max(0,e.hp),0)/boss.parts.reduce((a,e)=>a+e.max,0)}
 const label=$('partLabels');label.replaceChildren();if(bossLive){for(const part of boss.parts.filter(e=>e.hp>0&&!e.hidden)){const q=part.o.position.clone().project(camera);if(Math.abs(q.x)>.96||Math.abs(q.y)>.9||q.z>=1)continue;const tag=document.createElement('span');tag.className='label3';tag.style.left=50+q.x*50+'%';tag.style.top=(50-q.y*50)-3+'%';tag.textContent=(part===target?'◇ ':'')+part.name+' '+Math.ceil(100*part.hp/part.max)+'%';label.append(tag)}}
 $('tempo').hidden=firing||bossIntro>0||boss?.dying;
 $('msg').style.opacity=msgTime>0?'1':'0'
}
const IDLE_RATE=.02;
let hudClock=0,prevFrame=0,hangarClock=0,combatRate=IDLE_RATE;
function frame(stamp){requestAnimationFrame(frame);const realDt=Math.min(.25,Math.max(0,(stamp-prevFrame)/1000));prevFrame=stamp;
 if(state==='paused'||state==='end')return;
 if(state==='intro'){hangarClock+=realDt;const angle=.76+Math.sin(hangarClock*.16)*.38;camera.position.set(12*Math.sin(angle),16.6,12*Math.cos(angle));camera.lookAt(-2.9,12,1.9);renderer.render(scene,camera);return}
 // Automatic weapons follow the combat clock. Only the pilot's trigger restores full speed.
 if(firing||triggerTap||bossIntro>0||boss?.dying)combatRate=1;
 else combatRate=IDLE_RATE+(combatRate-IDLE_RATE)*Math.exp(-realDt*25);
 const dt=Math.min(.055,realDt)*combatRate;
 time+=dt;elapsed+=dt;msgTime-=realDt;move(dt,realDt);advanceMission();mapTick(dt);if(mode==='boss')tickBoss(dt);if(!boss?.dying){tickSquads(dt);pilotWeapons(dt,realDt);tickShots(dt,realDt);threatsTick(dt);ultiTick(realDt)}
 for(let i=tasks.length-1;i>=0;i--){if(tasks[i].at<=time)tasks.splice(i,1)[0].fn()}
 fxTick(dt,realDt);updateDischarges(realDt);hudClock-=realDt;if(hudClock<=0){hudClock=.08;hud()}renderEnemyRounds();drawThreatHud(realDt);renderer.render(scene,camera)
}
mapScene('city');requestAnimationFrame(frame);
})()
