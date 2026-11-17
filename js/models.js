const UP=new THREE.Vector3(0,1,0);
const M=(c,m=.5,r=.5,extra)=>new THREE.MeshStandardMaterial(Object.assign({color:c,metalness:m,roughness:r},extra||{}));
function tube(a,b,r,m,seg=14){
  const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),d=B.clone().sub(A);
  const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,d.length(),seg),m);
  mesh.position.copy(A).add(B).multiplyScalar(.5);
  mesh.quaternion.setFromUnitVectors(UP,d.normalize());
  return mesh;
}
function poly(pts,r,m,g){for(let i=0;i<pts.length-1;i++){g.add(tube(pts[i],pts[i+1],r,m));
  if(i>0){const s=new THREE.Mesh(new THREE.SphereGeometry(r,10,8),m);s.position.set(...pts[i]);g.add(s);}}}
function box(w,h,d,m,p,rot){const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);b.position.set(...p);if(rot)b.rotation.set(...rot);return b;}
function ell(sx,sy,sz,m,p,rot){const s=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),m);s.scale.set(sx,sy,sz);s.position.set(...p);if(rot)s.rotation.set(...rot);return s;}
function cylZ(r,len,m,p,seg=24){const c=new THREE.Mesh(new THREE.CylinderGeometry(r,r,len,seg),m);c.rotation.x=Math.PI/2;c.position.set(...p);return c;}
function cylX(r,len,m,p,seg=20){const c=new THREE.Mesh(new THREE.CylinderGeometry(r,r,len,seg),m);c.rotation.z=Math.PI/2;c.position.set(...p);return c;}
function wheel(R,tr,spokes,rimM,tireM,hubM,width){
  const g=new THREE.Group();
  g.add(new THREE.Mesh(new THREE.TorusGeometry(R-tr,tr,16,64),tireM));
  const rim=new THREE.Mesh(new THREE.TorusGeometry(R-tr*1.7,tr*.3,8,64),rimM);g.add(rim);
  g.add(cylZ(R*.1,width||.08,hubM,[0,0,0],16));
  for(let i=0;i<spokes;i++){const a=i/spokes*Math.PI*2,z=(i%2?1:-1)*(width||.08)*.4;
    const x=Math.cos(a)*(R-tr*1.7),y=Math.sin(a)*(R-tr*1.7);
    g.add(tube([0,0,z],[x,y,0],.0035,hubM,6));}
  return g;
}
function part(vehicle,id,build){
  const g=new THREE.Group();g.userData.partId=id;build(g);
  g.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.userData.baseE=o.material.emissive.clone();o.userData.baseEI=o.material.emissiveIntensity;}});
  vehicle.add(g);vehicle.userData.parts[id]=g;return g;
}
function newVehicle(){const v=new THREE.Group();v.userData.parts={};return v;}

/* ---------- Bicycles: one parametric builder, four specs ---------- */
function buildBike(P){
  const V=newVehicle();
  const col=()=>M(P.color,.5,.35),dark=()=>M(0x20262c,.4,.6),alu=()=>M(0xb7bec6,.9,.3),rubber=()=>M(0x14171a,0,.9);
  const R=P.R,RA=[-P.rx,R,0],FA=[P.fx,R,0],BB=[0,P.bby,0],ST=P.st,HB=P.htB,HT=P.htT,T=P.tube||.017;
  const rimTop=2*R-P.tr*1.7,[sx1,sy1,sx2,sy2]=P.stem;
  part(V,'frame',g=>{const m=col();
    g.add(tube(BB,[ST[0],ST[1],0],T,m),tube([ST[0]+.01,ST[1]-.02,0],[HT[0],HT[1]-.01,0],T,m),tube(BB,[HB[0],HB[1],0],T*1.15,m),tube([HB[0],HB[1],0],[HT[0],HT[1],0],T*1.3,m));
    for(const z of[-1,1])g.add(tube(BB,[RA[0],RA[1],z*.06],T*.65,m),tube([ST[0]+.01,ST[1]-.04,0],[RA[0],RA[1],z*.055],T*.55,m));
    g.add(cylZ(.025,.09,alu(),[...BB]));
    if(P.ebike){const dx=HB[0]-BB[0],dy=HB[1]-BB[1];g.add(box(.3,.065,.07,M(0x1c2530,.3,.5),[(BB[0]+HB[0])/2+.0,(BB[1]+HB[1])/2+.045,0],[0,0,Math.atan2(dy,dx)]),
      box(.05,.02,.02,M(0x39d98a,0,.4,{emissive:0x39d98a,emissiveIntensity:.8}),[(BB[0]+HB[0])/2,(BB[1]+HB[1])/2+.09,.036],[0,0,Math.atan2(dy,dx)]));}});
  part(V,'fork',g=>{const m=dark();
    for(const z of[-1,1]){const A=[HB[0]+.005,HB[1],z*.05],B=[FA[0],FA[1],z*.05];
      if(P.susp){const k=.45,mid=[A[0]+(B[0]-A[0])*k,A[1]+(B[1]-A[1])*k,A[2]];g.add(tube(A,mid,.02,m),tube(mid,B,.013,alu()));}
      else g.add(tube(A,B,.011,m));}
    g.add(box(.03,.03,.14,m,[HB[0]+.005,HB[1],0]),tube([HB[0],HB[1],0],[sx1,sy1-.005,0],.012,m));});
  part(V,'handlebar',g=>{const m=alu(),gr=rubber();
    g.add(tube([sx1,sy1,0],[sx2,sy2,0],.015,m));
    if(P.bar==='flat'){const w=P.barW;g.add(tube([sx2,sy2,-w],[sx2,sy2,w],.011,m));for(const z of[-1,1])g.add(tube([sx2,sy2,z*(w-.07)],[sx2,sy2,z*w],.017,gr));}
    else if(P.bar==='drop'){g.add(tube([sx2,sy2,-.2],[sx2,sy2,.2],.011,gr));
      for(const z of[-1,1]){poly([[0,0],[.045,.005],[.08,-.03],[.08,-.09],[.05,-.12],[0,-.125]].map(p=>[sx2+p[0],sy2+p[1],z*.2]),.011,gr,g);g.add(box(.07,.05,.04,dark(),[sx2+.05,sy2+.005,z*.2]));}}
    else{for(const z of[-1,1]){g.add(tube([sx2,sy2,z*.06],[sx2+.03,sy2+.2,z*.3],.012,m),tube([sx2+.03,sy2+.2,z*.3],[sx2+.03,sy2+.2,z*.37],.017,gr));}
      g.add(tube([sx2+.015,sy2+.1,-.18],[sx2+.015,sy2+.1,.18],.01,m),tube([sx2+.03,sy2+.2,-.3],[sx2+.03,sy2+.2,.3],.012,m));}});
  part(V,'saddle',g=>{const m=dark();
    g.add(tube([ST[0],ST[1],0],[P.post[0],P.post[1],0],.012,alu()),ell(P.sad[0],P.sad[1],P.sad[2],m,[P.saddle[0],P.saddle[1],0]),ell(P.sad[0]*.55,P.sad[1]*.85,P.sad[2]*.5,m,[P.saddle[0]+P.sad[0]*.85,P.saddle[1],0]));});
  const bw=(id,ax)=>part(V,id,g=>{const w=wheel(R,P.tr,P.spokes,alu(),rubber(),alu(),.1);w.position.set(...ax);g.add(w);if(P.ebike&&id==='rearwheel')g.add(cylZ(.07,.1,M(0x2a2f35,.6,.4),ax));});
  bw('frontwheel',FA);bw('rearwheel',RA);
  const k=P.crank/.172,ex=.14*k,ey=-.1*k;
  part(V,'crank',g=>{const m=alu();
    g.add(cylZ(P.ring,.01,m,[0,BB[1],.055],36),cylZ(P.ring*.74,.008,M(0x444c54,.8,.4),[0,BB[1],.062],30),
      tube([0,BB[1],.06],[ex,BB[1]+ey,.065],.012,m),tube([0,BB[1],-.06],[-ex,BB[1]-ey,-.065],.012,m));});
  part(V,'pedals',g=>{const m=dark();
    g.add(box(.1,.02,.085,m,[ex+.02,BB[1]+ey,.11]),box(.1,.02,.085,m,[-ex-.02,BB[1]-ey,-.11]),
      tube([ex,BB[1]+ey,.065],[ex,BB[1]+ey,.11],.006,alu()),tube([-ex,BB[1]-ey,-.065],[-ex,BB[1]-ey,-.11],.006,alu()));});
  part(V,'chain',g=>{const m=M(0x50565c,.9,.35);
    g.add(tube([0,BB[1]+P.ring,.05],[RA[0],RA[1]+P.cog,.05],.007,m),tube([0,BB[1]-P.ring,.05],[RA[0],RA[1]-P.cog,.05],.007,m));});
  part(V,'brakes',g=>{const m=M(0xcc2a2a,.4,.5),steel=M(0xc9ced3,1,.2);
    for(const z of[-1,1])g.add(box(.012,.012,.07,dark(),[sx2,sy2,z*(P.bar==='bmx'?.18:P.bar==='drop'?.2:.12)]));
    if(P.brake==='vbrake'||P.brake==='caliper'){
      for(const z of[-1,1]){g.add(box(.025,.05,.012,m,[FA[0]-.015,rimTop-.012,z*.052]),box(.025,.05,.012,m,[RA[0]+.025,rimTop-.05,z*.052]));}
      if(P.brake==='caliper')g.add(tube([FA[0]-.03,rimTop+.03,-.05],[FA[0]-.03,rimTop+.03,.05],.006,m),tube([RA[0]+.04,rimTop-.01,-.05],[RA[0]+.04,rimTop-.01,.05],.006,m));
    }else if(P.brake==='disc'){
      g.add(cylZ(.085,.004,steel,[FA[0],FA[1],-.045],36),cylZ(.085,.004,steel,[RA[0],RA[1],-.045],36),
        box(.05,.07,.025,m,[FA[0]-.05,FA[1]+.03,-.045],[0,0,.3]),box(.05,.07,.025,m,[RA[0]+.03,RA[1]+.05,-.045],[0,0,-.3]));
    }else{for(const z of[-1,1])g.add(box(.025,.05,.012,m,[RA[0]+.02,rimTop-.05,z*.052]));g.add(tube([RA[0]+.02,rimTop-.02,-.05],[RA[0]+.02,rimTop-.02,.05],.006,m));}
    g.add(tube([sx2,sy2-.005,.12],[FA[0]-.01,rimTop,.05],.003,dark(),6));});
  part(V,'derailleur',g=>{const m=M(0x2a2f35,.7,.4),a=alu(),s=P.cog/.047;
    if(P.single){g.add(cylZ(P.cog,.008,a,[RA[0],RA[1],.05],20));}
    else{[.06,.052,.045,.038,.032].forEach((r,i)=>g.add(cylZ(r*s,.008,a,[RA[0],RA[1],.03+i*.009],20)));
      g.add(tube([RA[0]-.01,RA[1],.075],[RA[0]+.02,RA[1]-.13,.075],.007,m),ell(.016,.016,.01,m,[RA[0]+.02,RA[1]-.13,.075]),ell(.016,.016,.01,m,[RA[0]+.01,RA[1]-.16,.075]));}});
  part(V,'light',g=>{const lp=[sx2+.015,sy2+.04,.04];g.add(cylX(.025,.05,M(0x222222,.3,.5),lp),cylX(.02,.004,M(0xfff2b0,0,.2,{emissive:0xffe27a,emissiveIntensity:.8}),[lp[0]+.027,lp[1],lp[2]]));});
  return V;
}
const BIKE_SPECS={
 city:{color:0x1d6fb8,R:.34,tr:.028,rx:.52,fx:.52,bby:.27,st:[-.15,.76],htB:[.46,.66],htT:[.42,.78],stem:[.41,.845,.485,.865],bar:'flat',barW:.22,
   saddle:[-.2,.925],post:[-.185,.9],sad:[.13,.03,.07],ring:.095,crank:.172,cog:.047,brake:'vbrake',susp:false,spokes:16},
 road:{color:0xd7263d,R:.34,tr:.013,rx:.41,fx:.575,bby:.27,st:[-.13,.72],htB:[.5,.6],htT:[.468,.715],stem:[.462,.77,.535,.79],bar:'drop',
   saddle:[-.16,.89],post:[-.15,.865],sad:[.12,.025,.06],ring:.105,crank:.172,cog:.04,brake:'caliper',susp:false,spokes:20,tube:.015},
 mtb:{color:0x1f9d55,R:.37,tr:.04,rx:.44,fx:.635,bby:.33,st:[-.14,.76],htB:[.54,.62],htT:[.505,.75],stem:[.5,.8,.565,.82],bar:'flat',barW:.3,
   saddle:[-.18,.925],post:[-.17,.9],sad:[.12,.03,.065],ring:.09,crank:.175,cog:.05,brake:'disc',susp:true,spokes:24,tube:.02},
 bmx:{color:0xff6a1a,R:.255,tr:.03,rx:.36,fx:.58,bby:.265,st:[-.07,.6],htB:[.485,.54],htT:[.455,.655],stem:[.45,.665,.47,.69],bar:'bmx',
   saddle:[-.11,.69],post:[-.09,.665],sad:[.09,.025,.05],ring:.085,crank:.165,cog:.035,brake:'bmxrear',susp:false,single:true,spokes:20,tube:.02}};
/* ---------- Motorbikes: one layout-driven builder, five layouts ---------- */
const LIFT=.01;
function buildMoto(L){
  const V=newVehicle();
  const col=()=>M(L.color,.5,.3),dark=()=>M(0x1c2026,.5,.5),steel=()=>M(0x8d959d,.9,.3),rubber=()=>M(0x111315,0,.9),chrome=()=>M(0xd7dde2,1,.15),frm=()=>M(L.frameCol||0x2a2f36,.6,.45);
  const kit={col,dark,steel,chrome,rubber};
  const FA=[L.fx,L.R-LIFT,0],RA=[-L.rx,L.Rr-LIFT,0],p3=(a,z)=>a.map(p=>[p[0],p[1],z]);
  const [ex,ey]=L.eng.c,es=L.eng.s||1,angs=L.eng.vtwin?[L.eng.th,-L.eng.th]:[L.eng.th];
  const at=(a,len)=>[ex+len*es*Math.sin(a),ey+len*es*Math.cos(a)];
  part(V,'frame',g=>{const m=frm();
    for(const z of[-1,1]){poly(p3(L.cradle,z*(L.fw||.075)),.014,m,g);g.add(tube([L.pivot[0],L.pivot[1],z*.1],[RA[0],RA[1],z*.1],.018,m));
      for(const e of(L.extra||[]))g.add(tube([e[0][0],e[0][1],z*e[2]],[e[1][0],e[1][1],z*e[2]],.011,m));}
    poly(p3(L.spine,0),.018,m,g);
    g.add(tube([L.head[0],L.head[1],0],[L.headLow[0],L.headLow[1],0],.03,m),box(.04,.04,.15,m,[L.pivot[0],L.pivot[1],0]));
    if(L.body)L.body(g,kit);});
  part(V,'fork',g=>{const up=steel(),lo=chrome(),A=[L.head[0]+.01,L.head[1]-.02],B=[FA[0],FA[1]],mid=[A[0]+(B[0]-A[0])*.55,A[1]+(B[1]-A[1])*.55];
    for(const z of[-1,1])g.add(tube([A[0],A[1],z*.09],[mid[0],mid[1],z*.09],.016,lo),tube([mid[0],mid[1],z*.09],[B[0],B[1],z*.09],.024,up));
    g.add(box(.05,.03,.22,dark(),[A[0],A[1],0]),box(.05,.03,.22,dark(),[L.headLow[0]+.04,L.headLow[1],0]),ell(.045,.03,.06,dark(),[FA[0]-.02,FA[1],.09]));});
  const b=L.bar;
  part(V,'handlebar',g=>{const m=dark(),gr=rubber();
    if(b.type==='scooter'){g.add(ell(.1,.06,.34,col(),[b.x,b.y,0]));for(const z of[-1,1])g.add(tube([b.x-.02,b.y+.02,z*.3],[b.x-.02,b.y+.02,z*.4],.018,gr));return;}
    g.add(tube([L.head[0],L.head[1],0],[b.x,b.y-.01,0],.014,steel()));
    const inner=b.type==='clip'?.1:0;
    for(const z of[-1,1]){g.add(tube([b.x,b.y,z*inner],[b.x-b.sweep,b.y,z*b.w],.012,m),tube([b.x-b.sweep,b.y,z*b.w],[b.x-b.sweep,b.y,z*(b.w+.09)],.018,gr),
      tube([b.x+.01,b.y+.01,z*b.w*.6],[b.x+.08,b.y+.015,z*b.w*.9],.005,chrome()),box(.05,.03,.04,dark(),[b.x,b.y+.005,z*b.w*.35]));}});
  part(V,'tank',g=>{const t=L.tank;g.add(ell(t.s[0],t.s[1],t.s[2],col(),t.c,[0,0,t.rot||0]));
    g.add(cylZ(.035,.02,chrome(),[t.c[0],t.c[1]+t.s[1]*.92,0]).rotateX(Math.PI/2));});
  part(V,'seat',g=>{const m=M(0x14171a,0,.8);for(const s of L.seat)g.add(ell(s[2],s[3],s[4],m,[s[0],s[1],0]));if(L.rear)L.rear(g,kit);});
  part(V,'engine',g=>{const m=M(0x6d747b,.8,.45),m2=M(0x3a4047,.7,.5);
    g.add(box(.36*es,.26*es,.2,m,[ex,ey,0]),cylZ(.1*es,.22,m,[ex,ey-.01,0],24),cylZ(.045,.03,steel(),[ex-.1*es,ey-.08*es,.11]));
    for(const a of angs){const j=at(a,.21),h=at(a,.33);
      g.add(box(.17*es,.2*es,.17,m2,[j[0],j[1],0],[0,0,-a]),box(.18*es,.09*es,.2,m,[h[0],h[1],0],[0,0,-a]));
      for(let k=0;k<4;k++){const f=at(a,.14+k*.045);g.add(box(.19*es,.012,.19,m,[f[0],f[1],0],[0,0,-a]));}}});
  part(V,'plug',g=>{const h=at(angs[0],.33);
    g.add(tube([h[0],h[1],.09],[h[0],h[1],.17],.011,M(0xe8e4d8,0,.4)),tube([h[0],h[1],.17],[h[0],h[1],.24],.016,M(0x15181b,0,.7)),tube([h[0],h[1],.09],[h[0],h[1],.11],.016,steel()));});
  part(V,'exhaust',g=>{const m=M(0x9a9fa5,.9,.3),x=L.exh;
    for(const z of(x.dual?[1,-1]:[1])){poly(x.pts.map(p=>[p[0],p[1],z*x.z]),.025,m,g);const a=x.can[0],c=x.can[1];
      g.add(tube([a[0],a[1],z*x.zc],[c[0],c[1],z*x.zc],x.r,M(0x2c3035,.9,.4),20),ell(.012,x.r,x.r,m,[c[0]-.005,c[1],z*x.zc]));}});
  part(V,'headlight',g=>{const hs=L.hlS||1;g.add(ell(.09*hs,.1*hs,.1*hs,M(0x2a2f36,.7,.35),[L.hl[0],L.hl[1],0]),ell(.03*hs,.075*hs,.075*hs,M(0xfff4c4,0,.15,{emissive:0xffe27a,emissiveIntensity:.9}),[L.hl[0]+.08*hs,L.hl[1],0]));
    if(L.fairing)L.fairing(g,kit);});
  const mw=(id,ax,R,tr)=>part(V,id,g=>{const w=wheel(R,tr,L.mag?12:24,steel(),rubber(),steel(),.1);w.position.set(...ax);g.add(w);if(L.mag)g.add(cylZ(R-tr*1.8,.03,steel(),ax,40));});
  mw('frontwheel',FA,L.R,L.tr);mw('rearwheel',RA,L.Rr,L.trR);
  part(V,'brake',g=>{g.add(cylZ(L.R*.39,.007,M(0xc9ced3,1,.2),[FA[0],FA[1],.07],40),box(.06,.07,.035,M(0xc9a227,.6,.4),[FA[0]-.07,FA[1]+.08,.07],[0,0,.7]),
    tube([FA[0]-.08,FA[1]+.1,.075],[L.head[0]+.03,L.head[1]-.04,.08],.004,dark(),6));});
  part(V,'shock',g=>{for(const s of L.shocks){const a=[s[0],s[1],s[4]],c=[s[2],s[3],s[5]];g.add(tube(a,c,.012,chrome()));
    const d=new THREE.Vector3(...c).sub(new THREE.Vector3(...a)),len=d.length(),n=Math.max(5,Math.round(len/.045)),gr=new THREE.Group();
    for(let i=0;i<n;i++){const t=new THREE.Mesh(new THREE.TorusGeometry(.03,.006,6,14),M(0xe0a419,.6,.4));t.rotation.x=Math.PI/2;t.position.y=-len*.4+i*(len*.8/(n-1));gr.add(t);}
    gr.position.set((a[0]+c[0])/2,(a[1]+c[1])/2,(a[2]+c[2])/2);gr.quaternion.setFromUnitVectors(UP,d.normalize());g.add(gr);}});
  part(V,'chain',g=>{const m=M(0x4e555c,.9,.35);
    if(L.drive==='cvt'){g.add(ell(.36,.11,.06,M(0x2a2f36,.4,.5),[-.26,.29,-.14]),cylZ(.07,.02,steel(),[RA[0],RA[1],-.1]));return;}
    const fs=L.fs;g.add(cylZ(.1,.01,steel(),[RA[0],RA[1],-.085],32),cylZ(.05,.01,steel(),[fs[0],fs[1],-.095],24),
      tube([fs[0],fs[1]+.05,-.09],[RA[0],RA[1]+.1,-.09],.007,m),tube([fs[0],fs[1]-.05,-.09],[RA[0],RA[1]-.1,-.09],.007,m));});
  part(V,'mirrors',g=>{const bx=b.x-b.sweep*.8,w=b.w*.94;for(const z of[-1,1]){
    g.add(tube([bx,b.y+.01,z*w],[bx-.04,b.y+.19,z*(w+.05)],.006,dark(),8),ell(.015,.045,.06,M(0x1b1e22,.4,.5),[bx-.04,b.y+.22,z*(w+.05)]),ell(.004,.036,.05,M(0xaedcf0,1,.05),[bx-.025,b.y+.22,z*(w+.05)]));}});
  part(V,'battery',g=>{const p=L.batt;g.add(box(.11,.1,.07,M(0x1f2a52,.2,.6),[p[0],p[1],0]),box(.02,.02,.02,M(0xcc2a2a,.3,.5),[p[0]-.03,p[1]+.06,.02]),box(.02,.02,.02,M(0x111,.3,.5),[p[0]+.03,p[1]+.06,.02]));});
  V.position.y=LIFT;return V;
}
const MOTO_SPECS={
 naked:{color:0xc23a1e,R:.31,tr:.07,Rr:.31,trR:.07,rx:.62,fx:.62,head:[.43,.9],headLow:[.4,.78],spine:[[.43,.9],[-.34,.8]],cradle:[[.42,.82],[.05,.28],[-.3,.33],[-.34,.78]],pivot:[-.3,.34],
  extra:[[[-.2,.78],[-.62,.8],.075],[[-.34,.76],[-.58,.35],.1]],tank:{c:[.12,.88,0],s:[.3,.13,.15],rot:-.08},seat:[[-.28,.835,.32,.05,.14],[-.55,.86,.2,.05,.12]],
  eng:{c:[0,.38],s:1,th:.3},exh:{pts:[[.12,.62],[.04,.34],[-.22,.22],[-.48,.28]],z:.14,can:[[-.48,.28],[-.88,.36]],r:.06,zc:.15},hl:[.56,.93],
  bar:{type:'std',x:.41,y:.98,w:.35,sweep:.05},shocks:[[-.38,.76,-.56,.36,.14,.12],[-.38,.76,-.56,.36,-.14,-.12]],fs:[-.1,.3],batt:[-.24,.58]},
 sport:{color:0x1553d8,R:.31,tr:.075,Rr:.31,trR:.1,rx:.6,fx:.62,head:[.4,.88],headLow:[.37,.74],spine:[[.4,.88],[-.2,.8],[-.55,.84]],cradle:[[.38,.76],[.03,.3],[-.28,.34],[-.3,.72]],pivot:[-.28,.34],
  extra:[[[-.3,.72],[-.58,.78],.08]],tank:{c:[.1,.86,0],s:[.3,.11,.15],rot:-.05},seat:[[-.24,.82,.2,.045,.12],[-.55,.89,.3,.06,.1]],
  eng:{c:[0,.38],s:1.2,th:.55},exh:{pts:[[.2,.42],[.12,.22],[-.2,.18],[-.36,.22]],z:.12,can:[[-.36,.22],[-.8,.46]],r:.06,zc:.13},hl:[.56,.84],
  bar:{type:'clip',x:.37,y:.93,w:.3,sweep:.03},shocks:[[-.2,.72,-.4,.36,0,0]],fs:[-.12,.3],batt:[-.22,.56],
  fairing:(g,k)=>{const c=k.col();g.add(ell(.2,.16,.17,c,[.46,.82,0]),ell(.3,.16,.035,c,[.15,.58,.15],[0,0,.2]),ell(.3,.16,.035,c,[.15,.58,-.15],[0,0,.2]),ell(.3,.07,.14,k.dark(),[.02,.22,0]),
    ell(.1,.1,.012,M(0xaadcff,.2,.1,{transparent:true,opacity:.6}),[.4,1.0,0],[0,0,-.7]));}},
 cruiser:{color:0x7a1631,frameCol:0x1a1d21,R:.33,tr:.05,Rr:.31,trR:.1,rx:.7,fx:.78,head:[.58,.96],headLow:[.52,.8],spine:[[.58,.96],[.1,.66],[-.45,.6]],cradle:[[.54,.82],[.12,.28],[-.32,.3],[-.4,.58]],pivot:[-.32,.31],
  extra:[[[-.3,.6],[-.7,.62],.08]],tank:{c:[.18,.8,0],s:[.27,.14,.16],rot:-.1},seat:[[-.15,.64,.28,.05,.18],[-.45,.68,.2,.05,.15]],
  eng:{c:[.03,.4],s:1.3,th:.65,vtwin:true},exh:{pts:[[.22,.42],[.14,.24],[-.2,.19],[-.55,.22]],z:.16,can:[[-.55,.22],[-1,.3]],r:.05,zc:.16,dual:true},hl:[.7,.93],
  bar:{type:'cruiser',x:.5,y:1.08,w:.42,sweep:.12},shocks:[[-.38,.62,-.64,.34,.15,.13],[-.38,.62,-.64,.34,-.15,-.13]],fs:[-.14,.3],batt:[-.2,.46],
  body:(g,k)=>{g.add(ell(.33,.03,.15,k.col(),[-.72,.66,0],[0,0,.15]),ell(.2,.03,.09,k.col(),[.76,.7,0],[0,0,-.1]));}},
 scooter:{color:0x0fa3a3,R:.26,tr:.05,Rr:.26,trR:.055,rx:.46,fx:.52,mag:true,head:[.4,.98],headLow:[.38,.78],spine:[[.4,.96],[.36,.4],[.22,.22],[-.2,.24],[-.38,.5]],cradle:[[.38,.8],[.3,.24],[-.2,.22],[-.4,.46]],pivot:[-.3,.3],
  tank:{c:[-.25,.44,0],s:[.2,.1,.12]},seat:[[-.24,.7,.34,.06,.15],[-.48,.72,.16,.05,.12]],eng:{c:[-.3,.3],s:.75,th:1.3},
  exh:{pts:[[-.15,.22],[-.3,.17],[-.5,.2]],z:.14,can:[[-.5,.2],[-.82,.3]],r:.055,zc:.15},hl:[.5,1.02],bar:{type:'scooter',x:.4,y:1.04,w:.3,sweep:.02},
  shocks:[[-.3,.62,-.5,.3,.14,.12],[-.3,.62,-.5,.3,-.14,-.12]],drive:'cvt',fs:[-.3,.3],batt:[.15,.26],
  body:(g,k)=>{const c=k.col();g.add(ell(.07,.34,.22,c,[.42,.62,0],[0,0,.15]),box(.52,.04,.34,c,[.12,.2,0]),ell(.36,.17,.19,c,[-.3,.46,0]),ell(.18,.07,.14,c,[-.6,.62,0]),ell(.15,.025,.08,c,[.52,.5,0]));}},
 adv:{color:0xe86a10,R:.38,tr:.055,Rr:.36,trR:.075,rx:.72,fx:.74,head:[.52,1.1],headLow:[.48,.94],spine:[[.52,1.1],[-.4,.96]],cradle:[[.5,.96],[.08,.4],[-.3,.42],[-.4,.92]],pivot:[-.3,.44],
  extra:[[[-.3,.9],[-.72,.95],.08]],tank:{c:[.14,1.04,0],s:[.34,.15,.18],rot:-.04},seat:[[-.3,.99,.36,.05,.15],[-.64,1.01,.22,.05,.13]],
  eng:{c:[.05,.52],s:1.15,th:.2},exh:{pts:[[.2,.78],[.12,.48],[-.25,.4]],z:.17,can:[[-.25,.4],[-.98,.66]],r:.06,zc:.17},hl:[.64,1.14],
  bar:{type:'adv',x:.44,y:1.2,w:.42,sweep:.04},shocks:[[-.34,.96,-.66,.44,.14,.12],[-.34,.96,-.66,.44,-.14,-.12]],fs:[-.12,.42],batt:[-.25,.7],
  fairing:(g,k)=>{g.add(ell(.18,.035,.1,k.col(),[.7,.95,0],[0,0,-.3]),ell(.08,.17,.012,M(0xaadcff,.2,.1,{transparent:true,opacity:.6}),[.5,1.34,0],[0,0,-.2]));},
  body:(g,k)=>{g.add(box(.45,.025,.2,k.dark(),[.06,.3,0]));},
  rear:(g,k)=>{const m=k.steel();for(const z of[-1,1])g.add(tube([-.4,1.03,z*.16],[-.9,1.03,z*.16],.01,m));g.add(tube([-.9,1.03,-.16],[-.9,1.03,.16],.01,m));}}};
/* more body styles */
MOTO_SPECS.underbone={color:0x1f6fd6,R:.285,tr:.045,Rr:.285,trR:.05,rx:.56,fx:.54,head:[.4,.88],headLow:[.37,.76],spine:[[.4,.88],[.2,.7],[-.2,.64],[-.5,.7]],cradle:[[.37,.76],[.05,.28],[-.28,.3],[-.35,.62]],pivot:[-.28,.31],
  tank:{c:[.12,.8,0],s:[.24,.1,.13],rot:-.35},seat:[[-.2,.7,.38,.05,.13],[-.5,.75,.2,.045,.11]],eng:{c:[0,.34],s:.8,th:1.15},
  exh:{pts:[[.2,.3],[.12,.18],[-.2,.16],[-.4,.22]],z:.14,can:[[-.4,.22],[-.8,.3]],r:.05,zc:.15},hl:[.5,.9],bar:{type:'std',x:.37,y:.98,w:.3,sweep:.04},
  shocks:[[-.3,.7,-.48,.34,.1,.1],[-.3,.7,-.48,.34,-.1,-.1]],fs:[-.1,.28],batt:[-.1,.44],
  body:(g,k)=>{const c=k.col();g.add(ell(.05,.22,.14,c,[.38,.6,0],[0,0,.12]),ell(.18,.025,.09,c,[.54,.62,0]),ell(.26,.03,.12,c,[-.56,.62,0]));}};
MOTO_SPECS.maxi=Object.assign({},MOTO_SPECS.scooter,{R:.28,Rr:.28,tr:.055,trR:.06,rx:.52,fx:.58,head:[.44,1.04],headLow:[.4,.8],spine:[[.44,1],[.4,.4],[.25,.22],[-.2,.24],[-.4,.55]],cradle:[[.4,.8],[.3,.24],[-.2,.22],[-.42,.5]],
  tank:{c:[-.25,.46,0],s:[.22,.1,.13]},seat:[[-.24,.76,.38,.065,.16],[-.5,.78,.18,.055,.13]],eng:{c:[-.32,.31],s:.85,th:1.3},hl:[.54,1.08],bar:{type:'scooter',x:.43,y:1.1,w:.32,sweep:.02},
  shocks:[[-.3,.66,-.52,.3,.15,.13],[-.3,.66,-.52,.3,-.15,-.13]],
  body:(g,k)=>{const c=k.col();g.add(ell(.08,.38,.25,c,[.45,.65,0],[0,0,.15]),box(.56,.04,.38,c,[.14,.2,0]),ell(.4,.19,.21,c,[-.3,.5,0]),ell(.2,.08,.15,c,[-.62,.68,0]),ell(.16,.025,.09,c,[.57,.55,0]),
    ell(.09,.13,.012,M(0xaadcff,.2,.1,{transparent:true,opacity:.6}),[.42,1.27,0],[0,0,-.4]));}});
MOTO_SPECS.enduro={color:0xd32f2f,R:.39,tr:.045,Rr:.35,trR:.055,rx:.62,fx:.68,head:[.46,1.06],headLow:[.43,.92],spine:[[.46,1.06],[-.3,.96]],cradle:[[.44,.94],[.06,.36],[-.28,.38],[-.34,.92]],pivot:[-.28,.4],
  extra:[[[-.3,.9],[-.66,.95],.07]],tank:{c:[.1,1,0],s:[.26,.12,.13],rot:-.04},seat:[[-.26,.97,.4,.04,.12],[-.62,.99,.2,.04,.1]],eng:{c:[.04,.5],s:.9,th:.15},
  exh:{pts:[[.14,.74],[.08,.46],[-.22,.4]],z:.14,can:[[-.22,.4],[-.88,.66]],r:.05,zc:.15},hl:[.56,1.08],bar:{type:'adv',x:.4,y:1.18,w:.38,sweep:.04},
  shocks:[[-.24,.92,-.5,.42,0,0]],fs:[-.1,.4],batt:[-.2,.66],fairing:(g,k)=>{g.add(ell(.17,.03,.09,k.col(),[.66,.9,0],[0,0,-.2]));}};
MOTO_SPECS.retro=Object.assign({},MOTO_SPECS.naked,{color:0x2f5d50,tank:{c:[.1,.88,0],s:[.28,.14,.16],rot:-.05},hl:[.58,.93],hlS:1.35,seat:[[-.26,.82,.34,.045,.13],[-.56,.86,.18,.05,.1]],
  bar:{type:'std',x:.42,y:.96,w:.34,sweep:.02},body:(g,k)=>{g.add(ell(.2,.025,.09,k.chrome(),[.6,.62,0]),ell(.28,.025,.12,k.chrome(),[-.62,.62,0]));}});
/* more bicycle styles */
BIKE_SPECS.hybrid=Object.assign({},BIKE_SPECS.city,{color:0x2a8f6a,tr:.022,brake:'disc',barW:.25,spokes:20,rx:.45,fx:.55});
BIKE_SPECS.gravel=Object.assign({},BIKE_SPECS.road,{color:0x6d4c41,tr:.022,brake:'disc',rx:.43,spokes:24});
BIKE_SPECS.fat=Object.assign({},BIKE_SPECS.mtb,{color:0xffb300,R:.36,tr:.08,susp:false,rx:.45,fx:.63,bby:.31});
BIKE_SPECS.folding={color:0xe53935,R:.2,tr:.025,rx:.33,fx:.38,bby:.21,st:[-.12,.5],htB:[.36,.4],htT:[.34,.52],stem:[.33,.92,.41,.94],bar:'flat',barW:.2,
  saddle:[-.14,.89],post:[-.13,.86],sad:[.1,.025,.055],ring:.07,crank:.15,cog:.035,brake:'vbrake',susp:false,spokes:16,tube:.02};
/* touring + mini motorbikes, beach cruiser + e-bike */
MOTO_SPECS.touring={color:0x37474f,frameCol:0x1a1d21,R:.31,tr:.08,Rr:.31,trR:.11,rx:.72,fx:.78,head:[.5,1],headLow:[.46,.84],spine:[[.5,1],[-.1,.86],[-.6,.9]],cradle:[[.48,.86],[.08,.3],[-.32,.34],[-.4,.82]],pivot:[-.32,.35],
  extra:[[[-.4,.82],[-.7,.88],.08]],tank:{c:[.12,.94,0],s:[.34,.14,.19],rot:-.05},seat:[[-.25,.88,.38,.06,.17],[-.6,.92,.25,.06,.15]],eng:{c:[.02,.42],s:1.35,th:.9,vtwin:true},
  exh:{pts:[[.2,.4],[.12,.24],[-.2,.2],[-.55,.26]],z:.18,can:[[-.55,.26],[-1,.34]],r:.07,zc:.2,dual:true},hl:[.62,1.02],bar:{type:'adv',x:.44,y:1.12,w:.4,sweep:.04},
  shocks:[[-.4,.84,-.68,.38,.16,.14],[-.4,.84,-.68,.38,-.16,-.14]],fs:[-.14,.34],batt:[-.25,.62],
  fairing:(g,k)=>{g.add(ell(.26,.2,.24,k.col(),[.46,.92,0]),ell(.1,.2,.012,M(0xaadcff,.2,.1,{transparent:true,opacity:.6}),[.42,1.24,0],[0,0,-.4]));},
  body:(g,k)=>{const c=k.col();for(const z of[-1,1])g.add(box(.42,.22,.14,c,[-.66,.66,z*.25]));g.add(box(.3,.2,.26,c,[-.8,1.04,0]));}};
MOTO_SPECS.mini={color:0xe53935,R:.22,tr:.06,Rr:.22,trR:.06,rx:.42,fx:.45,head:[.33,.7],headLow:[.3,.6],spine:[[.33,.7],[-.25,.62]],cradle:[[.31,.62],[.04,.26],[-.2,.28],[-.26,.6]],pivot:[-.2,.28],
  tank:{c:[.08,.68,0],s:[.2,.1,.11],rot:-.06},seat:[[-.12,.64,.24,.04,.1],[-.34,.66,.14,.04,.09]],eng:{c:[.03,.3],s:.8,th:.35},
  exh:{pts:[[.12,.44],[.06,.24],[-.2,.16],[-.35,.2]],z:.12,can:[[-.35,.2],[-.6,.26]],r:.045,zc:.12},hl:[.43,.74],bar:{type:'std',x:.3,y:.8,w:.27,sweep:.04},
  shocks:[[-.22,.62,-.36,.28,.1,.1],[-.22,.62,-.36,.28,-.1,-.1]],fs:[-.1,.28],batt:[-.12,.45]};
BIKE_SPECS.beach={color:0x26a69a,R:.34,tr:.036,rx:.55,fx:.55,bby:.27,st:[-.2,.66],htB:[.5,.62],htT:[.46,.76],stem:[.45,.8,.52,.85],bar:'flat',barW:.3,
  saddle:[-.24,.78],post:[-.22,.755],sad:[.14,.03,.09],ring:.09,crank:.172,cog:.045,brake:'vbrake',susp:false,spokes:20,tube:.02};
BIKE_SPECS.ebike=Object.assign({},BIKE_SPECS.hybrid,{color:0x37474f,tr:.03,ebike:true,tube:.02});
/* ---------- model library: body styles, then brand models built from them ---------- */
const STYLE_META={
 bike:{city:{label:'City bike',spec:BIKE_SPECS.city,whole:{r:2.7,ty:.42}},road:{label:'Road bike',spec:BIKE_SPECS.road,whole:{r:2.65,ty:.42}},
   mtb:{label:'Mountain bike',spec:BIKE_SPECS.mtb,whole:{r:2.9,ty:.44}},bmx:{label:'BMX',spec:BIKE_SPECS.bmx,whole:{r:2.1,ty:.36}},
   hybrid:{label:'Hybrid bike',spec:BIKE_SPECS.hybrid,whole:{r:2.7,ty:.42}},gravel:{label:'Gravel bike',spec:BIKE_SPECS.gravel,whole:{r:2.65,ty:.42}},
   fat:{label:'Fat bike',spec:BIKE_SPECS.fat,whole:{r:3,ty:.44}},folding:{label:'Folding bike',spec:BIKE_SPECS.folding,whole:{r:2,ty:.44}},
   beach:{label:'Beach cruiser',spec:BIKE_SPECS.beach,whole:{r:2.9,ty:.44}},ebike:{label:'E-bike',spec:BIKE_SPECS.ebike,whole:{r:2.7,ty:.42}}},
 moto:{naked:{label:'Standard',spec:MOTO_SPECS.naked,whole:{r:3.3,ty:.5}},sport:{label:'Sport',spec:MOTO_SPECS.sport,whole:{r:3.4,ty:.5}},
   cruiser:{label:'Cruiser',spec:MOTO_SPECS.cruiser,whole:{r:3.8,ty:.5}},scooter:{label:'Scooter',spec:MOTO_SPECS.scooter,whole:{r:2.9,ty:.45}},
   adv:{label:'Adventure',spec:MOTO_SPECS.adv,whole:{r:4,ty:.58}},underbone:{label:'Underbone',spec:MOTO_SPECS.underbone,whole:{r:3,ty:.48}},
   maxi:{label:'Maxi scooter',spec:MOTO_SPECS.maxi,whole:{r:3.2,ty:.5}},enduro:{label:'Dual-sport',spec:MOTO_SPECS.enduro,whole:{r:3.7,ty:.58}},
   retro:{label:'Retro classic',spec:MOTO_SPECS.retro,whole:{r:3.3,ty:.5}},
   touring:{label:'Touring',spec:MOTO_SPECS.touring,whole:{r:4.3,ty:.55}},mini:{label:'Mini bike',spec:MOTO_SPECS.mini,whole:{r:2.5,ty:.38}}}};
const MODELS={bike:[],moto:[]};
function addModel(type,brand,name,style,color,sub){
  const st=STYLE_META[type][style],spec=color==null?st.spec:Object.assign({},st.spec,{color});
  MODELS[type].push({id:type+'-'+(brand+'-'+name).toLowerCase().replace(/[^a-z0-9]+/g,'-'),brand,label:name,sub,style,styleLabel:st.label,whole:st.whole,spec,
    swatch:'#'+spec.color.toString(16).padStart(6,'0'),build:()=>type==='bike'?buildBike(spec):buildMoto(spec)});}
for(const t in STYLE_META)for(const s in STYLE_META[t])addModel(t,'Generic',STYLE_META[t][s].label,s,null,'Basic shape');
const MOTO_LIST=[
 ['Honda',[['Click 125','scooter',0xd32f2f,'125cc scooter'],['Beat 110','scooter',0x1e88e5,'110cc scooter'],['ADV160','maxi',0x263238,'160cc adventure scooter'],['XRM125','underbone',0xd32f2f,'125cc underbone'],
   ['TMX 125','naked',0x2b2b2b,'125cc standard'],['CB150R','naked',0xc62828,'150cc naked'],['CBR650R','sport',0xb71c1c,'650cc sport'],['Rebel 500','cruiser',0x1a1a1a,'500cc cruiser'],
   ['CRF300L','enduro',0xd32f2f,'300cc dual-sport'],['Africa Twin','adv',0xc62828,'1100cc adventure']]],
 ['Yamaha',[['Mio i 125','scooter',0x00a7c4,'125cc scooter'],['NMAX 155','maxi',0x1565c0,'155cc maxi scooter'],['Aerox 155','maxi',0xffd600,'155cc sport scooter'],['Sniper 155','underbone',0x1565c0,'155cc underbone'],
   ['MT-15','naked',0x283593,'155cc naked'],['YZF-R15','sport',0x1e40af,'155cc sport'],['XSR155','retro',0xcfd8dc,'155cc retro'],['Ténéré 700','adv',0x1565c0,'700cc adventure']]],
 ['Suzuki',[['Raider R150','underbone',0x1e3a8a,'150cc underbone'],['Smash 115','underbone',0xc62828,'115cc underbone'],['Burgman Street 125','scooter',0x90a4ae,'125cc scooter'],
   ['GSX-R150','sport',0x1e40af,'150cc sport'],['V-Strom 250 SX','adv',0xffd600,'250cc adventure']]],
 ['Kawasaki',[['Ninja 400','sport',0x39b54a,'400cc sport'],['Z400','naked',0x39b54a,'400cc naked'],['Rouser NS200','naked',0x2b2b2b,'200cc naked'],['KLX150','enduro',0x39b54a,'150cc dual-sport'],
   ['Vulcan S','cruiser',0x1a1a1a,'650cc cruiser'],['Versys 650','adv',0x39b54a,'650cc adventure'],['Z650RS','retro',0x3b7a57,'650cc retro']]],
 ['Ducati',[['Panigale V4','sport',0xd50000,'1100cc superbike'],['Monster','naked',0xd50000,'940cc naked'],['Scrambler Icon','retro',0xf5c400,'800cc retro']]],
 ['Harley-Davidson',[['Street Bob 114','cruiser',0x222222,'1900cc cruiser'],['Sportster S','cruiser',0x6e6e6e,'1250cc cruiser'],['Pan America 1250','adv',0x8d6e1b,'1250cc adventure']]],
 ['Royal Enfield',[['Classic 350','retro',0x2f4f4f,'350cc retro'],['Himalayan','adv',0xb0bec5,'450cc adventure']]],
 ['BMW',[['R 1250 GS','adv',0xeceff1,'1250cc adventure'],['S 1000 RR','sport',0x1c69d4,'1000cc superbike']]],
 ['KTM',[['390 Duke','naked',0xff6900,'390cc naked'],['RC 390','sport',0xff6900,'390cc sport'],['390 Adventure','adv',0xff6900,'390cc adventure']]],
 ['Vespa',[['Primavera 150','scooter',0x7fd1b9,'150cc classic scooter']]]];
const BIKE_LIST=[
 ['Trek',[['Marlin 5','mtb',0xb3122e,'Mountain'],['Domane AL 2','road',0x0b2a5b,'Road'],['FX 2','hybrid',0x37474f,'Hybrid']]],
 ['Giant',[['Talon 3','mtb',0x1e88e5,'Mountain'],['Contend AR','road',0x37474f,'Road'],['Escape 3','hybrid',0x2e7d32,'Hybrid'],['Revolt','gravel',0x212121,'Gravel'],['TCR Advanced','road',0xff6f00,'Race road']]],
 ['Specialized',[['Rockhopper','mtb',0xe53935,'Mountain'],['Allez','road',0xfbc02d,'Road'],['Sirrus','hybrid',0x546e7a,'Hybrid'],['Diverge','gravel',0x5d4037,'Gravel'],['Fatboy','fat',0x424242,'Fat bike']]],
 ['Cannondale',[['Trail 5','mtb',0x2fb34a,'Mountain'],['CAAD13','road',0x1e88e5,'Race road']]],
 ['Polygon',[['Xtrada 5','mtb',0x263238,'Mountain'],['Strattos S3','road',0xe53935,'Road']]],
 ['Trinx',[['M136','mtb',0xff6f00,'Mountain'],['Tempo 1.0','road',0x00acc1,'Road']]],
 ['Mongoose',[['Legion L20','bmx',0x111111,'BMX'],['Dolomite','fat',0xffb300,'Fat bike']]],
 ['Haro',[['Downtown','bmx',0x7b1fa2,'BMX']]],
 ['Brompton',[['C Line','folding',0xe53935,'Folding']]],
 ['Dahon',[['Boardwalk','folding',0x1e88e5,'Folding']]]];
for(const[b,l]of MOTO_LIST)for(const m of l)addModel('moto',b,m[0],m[1],m[2],m[3]);
for(const[b,l]of BIKE_LIST)for(const m of l)addModel('bike',b,m[0],m[1],m[2],m[3]);

/* second batch of brands and models */
const MORE_MOTO=[
 ['Honda',[['PCX160','maxi',0x455a64,'160cc maxi scooter'],['Genio 110','scooter',0xffb300,'110cc scooter'],['CRF150L','enduro',0xd32f2f,'150cc dual-sport'],['XR150L','enduro',0xc62828,'150cc dual-sport'],
   ['Supra GTR 150','underbone',0xd32f2f,'150cc underbone'],['RS150R','underbone',0xfafafa,'150cc underbone'],['Super Cub C125','underbone',0xe53935,'125cc classic underbone'],['Monkey 125','mini',0xffd600,'125cc mini bike'],
   ['MSX125 Grom','mini',0x1e88e5,'125cc mini bike'],['Rebel 1100','cruiser',0x263238,'1100cc cruiser'],['CB500X','adv',0xd32f2f,'500cc adventure'],['Gold Wing','touring',0x455a64,'1800cc tourer'],['CB650R','naked',0x212121,'650cc naked'],['CBR1000RR-R','sport',0xd32f2f,'1000cc superbike']]],
 ['Yamaha',[['XMAX 300','maxi',0x546e7a,'300cc maxi scooter'],['Fazzio','scooter',0xf5e6c8,'125cc retro scooter'],['Fino','scooter',0xe91e63,'125cc scooter'],['YZF-R3','sport',0x1e40af,'320cc sport'],
   ['MT-07','naked',0x263238,'700cc naked'],['MT-09','naked',0x1e40af,'900cc naked'],['Tracer 9 GT','adv',0x37474f,'900cc sport-tourer'],['WR155R','enduro',0x1e40af,'155cc dual-sport'],
   ['XSR900','retro',0x1565c0,'900cc retro'],['YZF-R1','sport',0x1e40af,'1000cc superbike'],['YZF-R6','sport',0x0d47a1,'600cc sport'],['Zuma 125','mini',0xff6f00,'125cc mini bike']]],
 ['Suzuki',[['Skydrive Crossover','underbone',0x37474f,'115cc underbone'],['Avenis 125','scooter',0xff6f00,'125cc scooter'],['Burgman 400','maxi',0x37474f,'400cc maxi scooter'],['GSX-S150','naked',0x1e40af,'150cc naked'],
   ['DR650','enduro',0xfdd835,'650cc dual-sport'],['Hayabusa','sport',0x1e40af,'1340cc superbike'],['SV650','naked',0x1e40af,'650cc naked'],['GSX-8S','naked',0xfdd835,'800cc naked'],['V-Strom 650','adv',0x1e40af,'650cc adventure']]],
 ['Kawasaki',[['Barako II','naked',0x2b2b2b,'175cc standard'],['Ninja ZX-10R','sport',0x39b54a,'1000cc superbike'],['Ninja 650','sport',0x39b54a,'650cc sport'],['Z900','naked',0x39b54a,'950cc naked'],
   ['KLX230','enduro',0x39b54a,'230cc dual-sport'],['Eliminator','cruiser',0x1a1a1a,'450cc cruiser'],['W800','retro',0x7f1d1d,'800cc retro'],['Versys-X 300','adv',0x39b54a,'300cc adventure']]],
 ['Ducati',[['Multistrada V4','adv',0xd50000,'1160cc adventure'],['DesertX','adv',0xe0e0e0,'940cc adventure'],['Diavel V4','cruiser',0x212121,'1160cc power cruiser'],['Streetfighter V2','naked',0xd50000,'955cc naked']]],
 ['Harley-Davidson',[['Fat Bob 114','cruiser',0x424242,'1900cc cruiser'],['Low Rider S','cruiser',0x1a1a1a,'1900cc cruiser'],['Road Glide','touring',0x263238,'1900cc tourer'],['Nightster','cruiser',0x6d4c41,'975cc cruiser']]],
 ['BMW',[['F 850 GS','adv',0xeceff1,'850cc adventure'],['G 310 R','naked',0x1c69d4,'310cc naked'],['G 310 GS','adv',0x1c69d4,'310cc adventure'],['R nineT','retro',0x90a4ae,'1170cc retro'],['M 1000 RR','sport',0x1c69d4,'1000cc superbike'],['K 1600 GT','touring',0x37474f,'1600cc tourer']]],
 ['KTM',[['790 Duke','naked',0xff6900,'790cc naked'],['250 Adventure','adv',0xff6900,'250cc adventure'],['690 Enduro R','enduro',0xff6900,'690cc dual-sport'],['1290 Super Duke R','naked',0xff6900,'1300cc naked']]],
 ['Vespa',[['Sprint 150','scooter',0xffd54f,'150cc classic scooter'],['GTS 300','maxi',0x80cbc4,'300cc classic scooter']]],
 ['Bajaj',[['Pulsar NS200','naked',0x1e40af,'200cc naked'],['Pulsar RS200','sport',0xd32f2f,'200cc sport'],['Dominar 400','naked',0x2b2b2b,'400cc sport-tourer']]],
 ['TVS',[['Apache RTR 200','naked',0xd32f2f,'200cc naked'],['Apache RR 310','sport',0x1e40af,'310cc sport'],['Ntorq 125','scooter',0x00bcd4,'125cc scooter']]],
 ['Benelli',[['TNT 600i','naked',0xd32f2f,'600cc naked'],['Leoncino 500','retro',0x37474f,'500cc retro'],['TRK 502','adv',0xd32f2f,'500cc adventure'],['Imperiale 400','retro',0x7f1d1d,'400cc retro']]],
 ['CFMoto',[['450SR','sport',0xff6f00,'450cc sport'],['650MT','adv',0x37474f,'650cc adventure'],['700CL-X','retro',0x8d6e63,'700cc retro']]],
 ['Triumph',[['Street Triple','naked',0x37474f,'765cc naked'],['Bonneville T120','retro',0x1b5e20,'1200cc retro'],['Tiger 900','adv',0x37474f,'900cc adventure'],['Speed Twin 900','retro',0xb71c1c,'900cc retro'],['Rocket 3','cruiser',0x212121,'2500cc cruiser']]],
 ['Aprilia',[['RS 660','sport',0x6a1b9a,'660cc sport'],['Tuono 660','naked',0x6a1b9a,'660cc naked']]],
 ['Indian',[['Scout','cruiser',0xb71c1c,'1250cc cruiser'],['Chief','cruiser',0x212121,'1800cc cruiser'],['Challenger','touring',0x37474f,'1800cc tourer']]],
 ['Husqvarna',[['Svartpilen 401','naked',0xeceff1,'400cc naked'],['Vitpilen 401','naked',0xf5f5f5,'400cc naked']]],
 ['Kymco',[['Like 150i','scooter',0xffb74d,'150cc scooter'],['AK 550','maxi',0x546e7a,'550cc maxi scooter']]],
 ['SYM',[['Jet 14','scooter',0x29b6f6,'125cc scooter'],['Maxsym','maxi',0x455a64,'400cc maxi scooter']]],
 ['Keeway',[['K-Light 202','cruiser',0x1a1a1a,'200cc cruiser']]],
 ['Rusi',[['Classic 250','retro',0x795548,'250cc classic']]],
 ['Moto Guzzi',[['V7','retro',0x607d8b,'850cc retro']]],
 ['Royal Enfield',[['Meteor 350','cruiser',0x1a237e,'350cc cruiser'],['Interceptor 650','retro',0x8d6e63,'650cc retro'],['Hunter 350','retro',0x90a4ae,'350cc retro']]]];
const MORE_BIKE=[
 ['Trek',[['Madone','road',0x111111,'Race road'],['Emonda','road',0xd32f2f,'Light road'],['Checkpoint','gravel',0x4e342e,'Gravel'],['Fuel EX','mtb',0x1b5e20,'Trail mountain'],['X-Caliber','mtb',0x1565c0,'Mountain'],['Dual Sport','hybrid',0x455a64,'Hybrid'],['Verve+','ebike',0x37474f,'E-bike']]],
 ['Giant',[['Anthem','mtb',0xd32f2f,'Cross-country'],['Defy','road',0x1565c0,'Endurance road'],['Propel','road',0x212121,'Aero road'],['ATX 27.5','mtb',0x37474f,'Mountain'],['Explore E+','ebike',0x37474f,'E-bike']]],
 ['Specialized',[['Tarmac','road',0xd32f2f,'Race road'],['Roubaix','road',0x37474f,'Endurance road'],['Stumpjumper','mtb',0x2e7d32,'Trail mountain'],['Epic','mtb',0x1565c0,'Cross-country'],['Chisel','mtb',0xff6f00,'Mountain'],['Turbo Vado','ebike',0x455a64,'E-bike']]],
 ['Cannondale',[['SuperSix EVO','road',0x111111,'Race road'],['Topstone','gravel',0x1b5e20,'Gravel'],['Synapse','road',0x1e88e5,'Endurance road'],['Habit','mtb',0x2fb34a,'Trail mountain']]],
 ['Polygon',[['Cascade','mtb',0xe53935,'Mountain'],['Siskiu T','mtb',0x37474f,'Trail mountain'],['Strattos S5','road',0x1565c0,'Road']]],
 ['Trinx',[['M500','mtb',0xff6f00,'Mountain'],['X1','mtb',0x1565c0,'Mountain']]],
 ['Merida',[['Big Nine','mtb',0x2e7d32,'Cross-country'],['Scultura','road',0xd32f2f,'Race road'],['Crossway','hybrid',0x455a64,'Hybrid'],['Silex','gravel',0x6d4c41,'Gravel']]],
 ['Scott',[['Aspect','mtb',0xffd600,'Mountain'],['Scale','mtb',0x1565c0,'Cross-country'],['Speedster','road',0x212121,'Road'],['Addict','road',0xd32f2f,'Race road'],['Sub Cross','hybrid',0x37474f,'Hybrid']]],
 ['Bianchi',[['Oltre','road',0x26c6da,'Race road'],['Impulso','gravel',0x26c6da,'Gravel'],['C-Sport','hybrid',0x26c6da,'Hybrid']]],
 ['Cube',[['Aim','mtb',0x37474f,'Mountain'],['Attention','mtb',0x1565c0,'Cross-country'],['Nature','hybrid',0x2e7d32,'Hybrid'],['Attain','road',0x212121,'Road'],['Nuroad','gravel',0x6d4c41,'Gravel']]],
 ['Raleigh',[['Merit','hybrid',0x1b5e20,'Hybrid'],['Tokul','mtb',0xb71c1c,'Mountain']]],
 ['GT',[['Aggressor','mtb',0x1565c0,'Mountain'],['Avalanche','mtb',0xd32f2f,'Mountain'],['Grade','gravel',0x4e342e,'Gravel'],['Performer','bmx',0xd32f2f,'BMX']]],
 ['Kona',[['Process','mtb',0x2e7d32,'Trail mountain'],['Rove','gravel',0xff6f00,'Gravel'],['Dew','hybrid',0x455a64,'Hybrid']]],
 ['Santa Cruz',[['Hightower','mtb',0x00897b,'Trail mountain'],['5010','mtb',0xff6f00,'Trail mountain'],['Blur','mtb',0x7b1fa2,'Cross-country']]],
 ['Canyon',[['Ultimate','road',0xd32f2f,'Race road'],['Grail','gravel',0x37474f,'Gravel'],['Lux','mtb',0x1565c0,'Cross-country']]],
 ['Pinarello',[['Dogma F','road',0xd32f2f,'Race road'],['Prince','road',0x1565c0,'Road']]],
 ['Cervélo',[['S5','road',0x111111,'Aero road'],['R5','road',0xd32f2f,'Light road']]],
 ['Fuji',[['Absolute','hybrid',0x1565c0,'Hybrid'],['Jari','gravel',0x2e7d32,'Gravel']]],
 ['Java',[['Siluro','road',0x1565c0,'Road']]],
 ['Surly',[['Pugsley','fat',0x2e7d32,'Fat bike'],['Ice Cream Truck','fat',0xd81b60,'Fat bike']]],
 ['Brompton',[['P Line','folding',0x1565c0,'Folding'],['T Line','folding',0x37474f,'Folding']]],
 ['Dahon',[['K3','folding',0xd32f2f,'Folding']]],
 ['Tern',[['Link B7','folding',0x00acc1,'Folding']]],
 ['Mongoose',[['Title','bmx',0x37474f,'BMX']]],
 ['Haro',[['Leucadia','bmx',0x1565c0,'BMX']]],
 ['Kink',[['Curb','bmx',0x111111,'BMX'],['Gap','bmx',0xd32f2f,'BMX']]],
 ['Sunday',[['Primer','bmx',0xfdd835,'BMX']]],
 ['We The People',[['Arcade','bmx',0x26a69a,'BMX']]],
 ['Electra',[['Cruiser 1','beach',0x80cbc4,'Beach cruiser'],['Townie Go!','ebike',0x1565c0,'E-bike']]],
 ['Schwinn',[['Cruiser Classic','beach',0xd32f2f,'Beach cruiser']]],
 ['Generic e-bikes',[['City e-bike','ebike',0x37474f,'E-bike']]]];
for(const[b,l]of MORE_MOTO)for(const m of l)addModel('moto',b,m[0],m[1],m[2],m[3]);
for(const[b,l]of MORE_BIKE)for(const m of l)addModel('bike',b,m[0],m[1],m[2],m[3]);
/* anchor spots were placed on the standard models; scale them to each model's proportions */
function anchorFor(type,model,a){const s=model.spec,base=type==='bike'?{f:.52,r:.52,h:.78}:{f:.62,r:.62,h:.9},hy=type==='bike'?s.htT[1]:s.head[1],c=a[0];
  return [[c[0]>=0?c[0]*s.fx/base.f:c[0]*s.rx/base.r,c[1]*hy/base.h,c[2]],a[1],a[2]*(type==='bike'?s.R/.34:1),a[3]];}
