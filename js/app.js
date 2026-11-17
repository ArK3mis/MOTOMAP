const $=s=>document.querySelector(s);
const peso=n=>'₱'+n.toLocaleString('en-PH');
const view=$('#view');
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
renderer.setPixelRatio(Math.min(2,window.devicePixelRatio||1));
renderer.outputEncoding=THREE.sRGBEncoding;
view.insertBefore(renderer.domElement,view.firstChild);
const canvas=renderer.domElement;
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(35,1.6,.05,60);
scene.add(new THREE.HemisphereLight(0xffffff,0x6f86ad,.95),new THREE.AmbientLight(0xffffff,.28));
const sun=new THREE.DirectionalLight(0xffffff,1.1);sun.position.set(3,5,4);scene.add(sun);
const fill=new THREE.DirectionalLight(0xbcd2ff,.55);fill.position.set(-4,3,-3);scene.add(fill);

/* floor: disc, rings and a soft contact shadow */
const floorMat=new THREE.MeshBasicMaterial({color:0x102a52}),ringMat=new THREE.LineBasicMaterial({color:0x2f5a9a});
const floor=new THREE.Mesh(new THREE.CircleGeometry(3.4,64),floorMat);floor.rotation.x=-Math.PI/2;floor.position.y=-.004;scene.add(floor);
[1.2,2.2,3.3].forEach(r=>{const pts=[];for(let i=0;i<=96;i++){const a=i/96*Math.PI*2;pts.push(new THREE.Vector3(Math.cos(a)*r,0,Math.sin(a)*r));}
  const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),ringMat);l.position.y=-.002;scene.add(l);});
(function(){const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');
  const g=x.createRadialGradient(64,64,4,64,64,64);g.addColorStop(0,'rgba(0,0,0,.5)');g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(0,0,128,128);
  const m=new THREE.Mesh(new THREE.PlaneGeometry(2.8,1.1),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false}));
  m.rotation.x=-Math.PI/2;m.position.y=.001;scene.add(m);})();

/* models are built the first time they are shown */
const modelById={},VEH={};for(const t in MODELS)MODELS[t].forEach(m=>modelById[m.id]=m);
function veh(id){if(!VEH[id]){const v=modelById[id].build();v.visible=false;scene.add(v);scene.updateMatrixWorld(true);VEH[id]=v;}return VEH[id];}
const DEFAULT_SEL={bike:'BC-0013',moto:'MC-0016'};
const LABEL={bike:'bicycle',moto:'motorbike'};
const S={veh:'bike',model:MODELS.bike[0].id,modelOf:{bike:MODELS.bike[0].id,moto:MODELS.moto[0].id},sel:null,kind:'none',selPart:null,anchor:null,pinPos:null,hover:null,xray:false,spin:true,cat:'All',q:'',cart:{}};
const MODEL=()=>modelById[S.model];
const cur_=()=>CATALOG[S.veh].find(x=>x.sku===S.sel);
const cam={az:25,el:14,r:3.4,tx:0,ty:.45,tz:0},goal={...cam};
const boxes={};
function partBox(m,id){const k=m+id;if(!boxes[k]){const b=new THREE.Box3().setFromObject(veh(m).userData.parts[id]);boxes[k]={c:b.getCenter(new THREE.Vector3()),s:b.getSize(new THREE.Vector3())};}return boxes[k];}
const aspectK=()=>Math.max(1,1.25/(view.clientWidth/view.clientHeight||1.6));
const unwrap=t=>cam.az+(((t-cam.az+540)%360)-180);
function flyWhole(){const w=MODEL().whole;Object.assign(goal,{tx:0,ty:w.ty,tz:0,r:w.r*aspectK(),el:14,az:unwrap(25)});}
function flyPart(id){const b=partBox(S.model,id),v=ZONE_VIEW[S.veh][id]||[25,12],m=Math.max(b.s.x,b.s.y,b.s.z);
  Object.assign(goal,{tx:b.c.x,ty:b.c.y,tz:b.c.z,r:Math.min(Math.max(m*3.4,.6),MODEL().whole.r*.8)*aspectK(),el:v[1],az:unwrap(v[0])});}
const marker=new THREE.Mesh(new THREE.SphereGeometry(.022,16,12),new THREE.MeshBasicMaterial({color:0xff7a1a,depthTest:false,transparent:true}));
marker.renderOrder=9;marker.visible=false;scene.add(marker);
function flyAnchor(a){Object.assign(goal,{tx:a[0][0],ty:a[0][1],tz:a[0][2],r:a[2]*aspectK(),el:a[1][1],az:unwrap(a[1][0])});}
function select(sku){S.sel=sku;S.spin=false;S.kind='none';S.selPart=null;S.anchor=null;S.pinPos=null;
  const it=sku&&cur_();
  if(it){const z=it.zone;
    if(veh(S.model).userData.parts[z]){S.kind='part';S.selPart=z;S.pinPos=partBox(S.model,z).c;flyPart(z);}
    else if(ANCHORS[S.veh][z]){const a=anchorFor(S.veh,MODEL(),ANCHORS[S.veh][z]);S.kind='anchor';S.anchor=a;S.pinPos=new THREE.Vector3(...a[0]);marker.position.copy(S.pinPos);flyAnchor(a);}
    else flyWhole();}
  else flyWhole();
  marker.visible=S.kind==='anchor';syncTools();renderDetail();renderList();}

/* materials follow the selection: the chosen part glows, the rest turn into ghosts */
const HL=new THREE.Color(0xff7a1a);
function updateMaterials(t,dt){
  const k=1-Math.exp(-dt*9),pulse=.55+.35*Math.sin(t*4.5);
  for(const id in VEH){const on=id===S.model;VEH[id].visible=on;if(!on)continue;
    const parts=VEH[id].userData.parts;
    for(const pid in parts){const isSel=S.selPart===pid,isHov=S.kind==='none'&&S.hover===pid;
      const target=S.kind==='part'?(isSel?1:.17):S.kind==='anchor'?.5:(S.xray?.32:1);
      parts[pid].traverse(o=>{if(!o.isMesh)return;const m=o.material;
        m.opacity+=(target-m.opacity)*k;m.transparent=m.opacity<.985;m.depthWrite=m.opacity>.6;
        if(isSel){m.emissive.copy(HL);m.emissiveIntensity=pulse*.8;}
        else if(isHov){m.emissive.copy(HL);m.emissiveIntensity=.35;}
        else{m.emissive.copy(o.userData.baseE);m.emissiveIntensity=o.userData.baseEI;}
        o.renderOrder=isSel?2:(target<.5?0:1);});}}
}
const meshesOf=()=>{const a=[];veh(S.model).traverse(o=>{if(o.isMesh&&o.material.opacity>.3)a.push(o);});return a;};
const ray=new THREE.Raycaster(),ndc=new THREE.Vector2();
function pick(e){const r=canvas.getBoundingClientRect();ndc.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height)*2+1);
  ray.setFromCamera(ndc,camera);const h=ray.intersectObjects(meshesOf(),false)[0];if(!h)return null;
  let o=h.object;while(o&&!o.userData.partId)o=o.parent;return o?o.userData.partId:null;}

/* orbit, zoom, pinch */
const ptrs=new Map();let moved=0,pinchD=0;
canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});moved=0;
  if(ptrs.size===2){const[a,b]=[...ptrs.values()];pinchD=Math.hypot(a.x-b.x,a.y-b.y);}
  if(S.spin){S.spin=false;syncTools();}});
canvas.addEventListener('pointermove',e=>{
  if(!ptrs.has(e.pointerId)){const id=pick(e);if(id!==S.hover){S.hover=id;canvas.classList.toggle('pick',!!id);}return;}
  const p=ptrs.get(e.pointerId),dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;moved+=Math.abs(dx)+Math.abs(dy);
  if(ptrs.size===1){cam.az-=dx*.4;cam.el=Math.max(-4,Math.min(82,cam.el+dy*.3));goal.az=cam.az;goal.el=cam.el;}
  else if(ptrs.size===2){const[a,b]=[...ptrs.values()],d=Math.hypot(a.x-b.x,a.y-b.y);if(pinchD){goal.r=Math.max(.3,Math.min(6,goal.r*pinchD/d));cam.r=goal.r;}pinchD=d;}});
canvas.addEventListener('pointerup',e=>{if(ptrs.has(e.pointerId)){ptrs.delete(e.pointerId);if(ptrs.size===0&&moved<6){const id=pick(e);if(id&&PICK[S.veh][id])select(PICK[S.veh][id]);}}});
canvas.addEventListener('pointercancel',e=>ptrs.delete(e.pointerId));
canvas.addEventListener('pointerleave',()=>{S.hover=null;});
canvas.addEventListener('wheel',e=>{e.preventDefault();goal.r=Math.max(.3,Math.min(6,goal.r*Math.exp(e.deltaY*.0012)));},{passive:false});

/* resize + loop */
function resize(){const w=view.clientWidth,h=view.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
new ResizeObserver(resize).observe(view);resize();
const pin=$('#pin');let last=performance.now();
function frame(now){requestAnimationFrame(frame);const dt=Math.min(.05,(now-last)/1000),t=now/1000;last=now;
  if(S.spin&&!S.sel&&ptrs.size===0){cam.az+=7*dt;goal.az=cam.az;}
  const k=1-Math.exp(-dt*4.5);for(const key of['az','el','r','tx','ty','tz'])cam[key]+=(goal[key]-cam[key])*k;
  const a=cam.az*Math.PI/180,e=cam.el*Math.PI/180;
  camera.position.set(cam.tx+cam.r*Math.sin(a)*Math.cos(e),cam.ty+cam.r*Math.sin(e),cam.tz+cam.r*Math.cos(a)*Math.cos(e));
  camera.lookAt(cam.tx,cam.ty,cam.tz);
  updateMaterials(t,dt);renderer.render(scene,camera);
  if(S.pinPos){marker.scale.setScalar(1+.25*Math.sin(t*5));const c=S.pinPos.clone().project(camera),w=view.clientWidth,h=view.clientHeight;
    pin.style.display=c.z<1?'block':'none';pin.style.transform=`translate(${(c.x*.5+.5)*w}px,${(-c.y*.5+.5)*h}px)`;
    pin.classList.toggle('flip',(c.x*.5+.5)*w>w-190);}else pin.style.display='none';}
requestAnimationFrame(frame);

/* ---------- interface ---------- */
const KCLS={'Engine':1,'Fuel & Air':2,'Transmission':3,'Brakes':4,'Electrical':5,'Suspension & Steering':6,'Wheels & Tires':7,'Body & Exhaust':8,'Consumables & Small Parts':9,
  'Frame & Structure':6,'Drivetrain':3,'Suspension':2,'Steering & Controls':5,'Accessories':8,'Maintenance':9};
const kv=c=>`var(--k${KCLS[c]||9})`;
function syncTools(){$('#tX').setAttribute('aria-pressed',S.xray);$('#tSpin').setAttribute('aria-pressed',S.spin);
  $('#vBike').setAttribute('aria-pressed',S.veh==='bike');$('#vMoto').setAttribute('aria-pressed',S.veh==='moto');
  $('#tAll').textContent='Whole '+LABEL[S.veh];}
const stockOf=n=>n>=5?['ok','In stock · '+n]:n>0?['low','Only '+n+' left']:['ask','Ask for stock'];
const rng=it=>it.list!=null?[it.list,it.list]:[it.low,it.high];
const priceText=it=>{const[a,b]=rng(it);return(a===b?peso(a):peso(a)+' – '+peso(b))+(it.list!=null?'':' est.');};
function renderModels(){const m=MODEL();$('#pickBrand').textContent=m.brand;$('#pickName').textContent=m.label;$('#pickSub').textContent=m.sub;}
let mBrand='All',mQ='',lastFocus=null;
const brandsOf=()=>['Generic',...[...new Set(MODELS[S.veh].map(m=>m.brand))].filter(b=>b!=='Generic').sort()];
function renderPicker(){const list=MODELS[S.veh],brands=brandsOf();if(mBrand!=='All'&&!brands.includes(mBrand))mBrand='All';
  $('#mTitle').textContent='Choose a '+LABEL[S.veh];
  $('#mBrands').innerHTML=`<button class="chip all" type="button" data-b="All" aria-pressed="${mBrand==='All'}">All ${list.length}</button>`+brands.map(b=>`<button class="chip" style="--k:var(--k6)" type="button" data-b="${b}" aria-pressed="${mBrand===b}">${b} ${list.filter(m=>m.brand===b).length}</button>`).join('');
  const q=mQ.toLowerCase(),out=[];
  for(const b of brands){if(mBrand!=='All'&&b!==mBrand)continue;
    const ms=list.filter(m=>m.brand===b&&(!q||(m.brand+' '+m.label+' '+m.sub+' '+m.styleLabel).toLowerCase().includes(q)));if(!ms.length)continue;
    out.push(`<section><h3 class="bh">${b}<small>${ms.length} model${ms.length>1?'s':''}</small></h3><div class="mg">`+ms.map(m=>`<button class="mc" type="button" data-m="${m.id}" aria-current="${m.id===S.model}"><i style="background:${m.swatch}"></i><b>${m.label}</b><span>${m.sub}</span></button>`).join('')+'</div></section>');}
  $('#mGrid').innerHTML=out.join('')||'<div class="empty">No model matches that search.</div>';}
function openPicker(){lastFocus=document.activeElement;mQ='';$('#mq').value='';renderPicker();$('#modal').hidden=false;$('#mq').focus();
  $('#modal .sheet').scrollTop=0;}
function closePicker(){$('#modal').hidden=true;if(lastFocus&&lastFocus.focus)lastFocus.focus();}
function stepModel(d){const l=MODELS[S.veh],i=l.findIndex(m=>m.id===S.model);setModel(l[(i+d+l.length)%l.length].id);}
function renderChips(){const cats=[...new Set(CATALOG[S.veh].map(p=>p.cat))];if(S.cat!=='All'&&!cats.includes(S.cat))S.cat='All';
  $('#chips').innerHTML=`<button class="chip all" type="button" data-c="All" aria-pressed="${S.cat==='All'}">All</button>`+
    cats.map(c=>`<button class="chip" style="--k:${kv(c)}" type="button" data-c="${c}" aria-pressed="${c===S.cat}">${c}</button>`).join('');}
function renderList(){const q=S.q.toLowerCase();
  const items=CATALOG[S.veh].filter(p=>(S.cat==='All'||p.cat===S.cat)&&(!q||(p.name+' '+p.sub+' '+p.cat+' '+p.where).toLowerCase().includes(q)));
  $('#count').textContent=items.length+' parts';
  $('#list').innerHTML=items.length?items.map(p=>{const[sc,st]=stockOf(p.stock);
    return `<article class="card" style="--k:${kv(p.cat)}" data-id="${p.sku}" aria-current="${S.sel===p.sku}"><div class="t"><button class="n" type="button" data-act="sel">${p.name}</button><span class="p">${priceText(p)}</span></div>
    <div class="c"><em>${p.cat}</em> · ${p.sub} · ${p.sku}</div><div class="row"><span class="stock ${sc}">${st}</span><span><button class="go fill" type="button" data-act="sel">${p.zone==='none'?'Details':'Where does it go?'}</button><button class="go" type="button" data-act="add">+ Cart</button></span></div></article>`;}).join(''):'<div class="empty">No part matches that search.</div>';
  const c=$('#list [aria-current="true"]');if(c&&matchMedia('(min-width:900px)').matches)c.scrollIntoView({block:'nearest'});}
function renderDetail(){const d=$('#detail'),p=S.sel&&cur_();
  if(!p){d.style.setProperty('--k','var(--accent)');
    d.innerHTML=`<h2>Find any part in three taps</h2><div class="steps"><div><i>1</i><span>Pick a model above: city, road, BMX, big bike, scooter and more.</span></div>
    <div><i>2</i><span>Tap a part in the catalog, or tap it right on the ${LABEL[S.veh]}.</span></div><div><i>3</i><span>The model turns and zooms to the exact spot. An orange marker shows where it goes.</span></div></div>`;return;}
  d.style.setProperty('--k',kv(p.cat));
  const[sc,st]=stockOf(p.stock),none=p.zone==='none';
  d.innerHTML=`<h2>${p.name}</h2><div class="meta"><span class="pricetag">${priceText(p)}</span><span class="pill">${p.cat} · ${p.sub}</span><span class="stock ${sc}">${st}</span><span>${p.sku}</span></div>
  <div class="cols"><div><div class="where"><h3>${none?'Where it is used':'Where it goes'}</h3><p>${p.where}</p></div><h3>What it does</h3><p>${p.does}</p>
  ${none?'<p class="note">This item is not shown on the 3D model. It is a workshop, wear or loose item.</p>':''}</div>
  <div>${p.steps?`<h3>How it is fitted</h3><ol>${p.steps.map(s=>`<li><span>${s}</span></li>`).join('')}</ol><h3>Tools</h3><p>${p.tools}</p><h3>Replace it when</h3><p>${p.signs}</p>`:''}
  <h3>Before you buy</h3><p>Check the make, model, year and part number. Parts with the same name often do not fit across models.${p.list==null?' The price is an estimate until a listing price is set.':''}</p></div></div>
  <div class="actions"><button class="btn pri" type="button" data-act="add" data-id="${p.sku}">Add to cart</button><button class="btn" type="button" id="dAll">Show whole ${LABEL[S.veh]}</button></div>`;}
function addCart(id,btn){const k=S.veh+':'+id;S.cart[k]=(S.cart[k]||0)+1;renderCart();
  if(btn){const o=btn.textContent;btn.textContent='Added ✓';setTimeout(()=>btn.textContent=o,900);}}
function renderCart(){let n=0,lo=0,hi=0;const rows=[];
  for(const k in S.cart){const[v,id]=k.split(':'),p=CATALOG[v].find(x=>x.sku===id),q=S.cart[k],[a,b]=rng(p);n+=q;lo+=q*a;hi+=q*b;
    rows.push(`<li><span>${q} × ${p.name}</span><span>${peso(q*a)}${a===b?'':' – '+peso(q*b)} <button class="x" type="button" data-k="${k}">remove</button></span></li>`);}
  const tot=lo===hi?peso(lo):peso(lo)+' – '+peso(hi);
  $('#cartN').textContent=n;$('#cartT').textContent=n?tot:peso(0);
  $('#cartPop').innerHTML=rows.length?`<ul>${rows.join('')}</ul><strong>Total ${tot}</strong><p style="margin:6px 0 0;color:var(--muted)">Prices are estimates. Checkout is not connected yet.</p>`:'<div class="empty">Your cart is empty.</div>';}
function setModel(id){S.model=id;S.modelOf[S.veh]=id;S.hover=null;veh(id);renderModels();select(S.sel);}
function setVeh(v){S.veh=v;S.model=S.modelOf[v];S.cat='All';mBrand='All';S.q='';$('#q').value='';S.hover=null;veh(S.model);renderChips();renderModels();select(DEFAULT_SEL[v]);}
$('#vBike').onclick=()=>S.veh!=='bike'&&setVeh('bike');$('#vMoto').onclick=()=>S.veh!=='moto'&&setVeh('moto');
$('#pickBtn').onclick=openPicker;$('#prevM').onclick=()=>stepModel(-1);$('#nextM').onclick=()=>stepModel(1);$('#mClose').onclick=closePicker;
$('#modal').onclick=e=>{if(e.target.id==='modal')closePicker();};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#modal').hidden)closePicker();});
$('#mq').oninput=e=>{mQ=e.target.value;renderPicker();};
$('#mBrands').onclick=e=>{const c=e.target.closest('.chip');if(c){mBrand=c.dataset.b;renderPicker();}};
$('#mGrid').onclick=e=>{const b=e.target.closest('.mc');if(b){if(b.dataset.m!==S.model)setModel(b.dataset.m);closePicker();}};
$('#tAll').onclick=()=>select(null);
$('#tX').onclick=()=>{S.xray=!S.xray;syncTools();};
$('#tSpin').onclick=()=>{S.spin=!S.spin;if(S.spin&&S.sel)select(null);syncTools();};
$('#q').oninput=e=>{S.q=e.target.value;renderList();};
$('#chips').onclick=e=>{const c=e.target.closest('.chip');if(c){S.cat=c.dataset.c;renderChips();renderList();}};
$('#list').onclick=e=>{const b=e.target.closest('button');if(!b)return;const id=b.closest('.card').dataset.id;if(b.dataset.act==='add')addCart(id,b);else select(id);};
$('#detail').onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.id==='dAll')select(null);else if(b.dataset.act==='add')addCart(b.dataset.id,b);};
$('#cartBtn').onclick=()=>{const p=$('#cartPop');p.hidden=!p.hidden;$('#cartBtn').setAttribute('aria-expanded',!p.hidden);};
$('#cartPop').onclick=e=>{const b=e.target.closest('.x');if(b){delete S.cart[b.dataset.k];renderCart();}};
document.addEventListener('click',e=>{if(!e.target.closest('.head-r'))$('#cartPop').hidden=true;});
veh(S.model);renderChips();renderModels();renderCart();syncTools();
cam.r=MODEL().whole.r*aspectK()*1.15;
select(DEFAULT_SEL.bike);
