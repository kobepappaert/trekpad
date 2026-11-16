// Builds data/tracks/<id>.json for every route: track from OpenStreetMap (Overpass) + places to sleep near it.
// Run: node scripts/build-tracks.mjs            (all routes; skips ones refreshed in the last 20 days)
//      node scripts/build-tracks.mjs whw tmb    (only these ids)
//      FORCE=1 node scripts/build-tracks.mjs    (rebuild everything)
import fs from 'node:fs';
import vm from 'node:vm';

const ctx={};vm.createContext(ctx);
vm.runInContext(fs.readFileSync('js/routes.js','utf8')+';this.ROUTES=ROUTES;',ctx);
const ROUTES=ctx.ROUTES;
const ENDPOINTS=['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter','https://overpass.private.coffee/api/interpreter','https://lz4.overpass-api.de/api/interpreter'];
const POI='["tourism"~"^(alpine_hut|wilderness_hut|camp_site|camp_pitch|hostel|guest_house|chalet)$"]';
const KIND={alpine_hut:['hut','Berghut'],wilderness_hut:['hut','Schuilhut (onbemand)'],camp_site:['camp','Camping'],camp_pitch:['camp','Kampeerplek'],hostel:['bed','Hostel'],guest_house:['bed','Gastenverblijf'],chalet:['bed','Chalet']};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function overpass(q){
  let last;
  for(let attempt=0;attempt<3;attempt++){
    for(const u of ENDPOINTS){
      try{
        const ctl=new AbortController();const t=setTimeout(()=>ctl.abort(),120000);
        const res=await fetch(u,{method:'POST',body:'data='+encodeURIComponent(q),signal:ctl.signal,headers:{'User-Agent':'vandra-track-builder'}});
        clearTimeout(t);
        if(!res.ok)throw new Error('HTTP '+res.status);
        return await res.json();
      }catch(e){last=e;await sleep(3000)}
    }
    await sleep(20000);
  }
  throw last;
}
function simplify(pts,tol){
  if(pts.length<3)return pts;
  const sq=(a,b,c)=>{const x=c[0]-b[0],y=c[1]-b[1];if(x===0&&y===0)return (a[0]-b[0])**2+(a[1]-b[1])**2;let t=((a[0]-b[0])*x+(a[1]-b[1])*y)/(x*x+y*y);t=Math.max(0,Math.min(1,t));return (a[0]-(b[0]+t*x))**2+(a[1]-(b[1]+t*y))**2};
  const keep=new Array(pts.length).fill(false);keep[0]=keep[pts.length-1]=true;const stack=[[0,pts.length-1]];
  while(stack.length){const [a,b]=stack.pop();let mx=0,mi=-1;for(let i=a+1;i<b;i++){const d=sq(pts[i],pts[a],pts[b]);if(d>mx){mx=d;mi=i}}if(mx>tol*tol){keep[mi]=true;stack.push([a,mi],[mi,b])}}
  return pts.filter((_,i)=>keep[i]);
}
// join ways that share endpoints into longer segments
function stitch(ways){
  const segs=ways.map(w=>w.slice());const out=[];
  const key=p=>p[0].toFixed(4)+','+p[1].toFixed(4);
  while(segs.length){
    let cur=segs.shift();let grew=true;
    while(grew){grew=false;
      for(let i=0;i<segs.length;i++){const s=segs[i];
        if(key(s[0])===key(cur[cur.length-1])){cur=cur.concat(s.slice(1));segs.splice(i,1);grew=true;break}
        if(key(s[s.length-1])===key(cur[cur.length-1])){cur=cur.concat(s.slice(0,-1).reverse());segs.splice(i,1);grew=true;break}
        if(key(s[s.length-1])===key(cur[0])){cur=s.slice(0,-1).concat(cur);segs.splice(i,1);grew=true;break}
        if(key(s[0])===key(cur[0])){cur=s.slice(1).reverse().concat(cur);segs.splice(i,1);grew=true;break}
      }}
    out.push(cur);
  }
  return out;
}
function bboxOf(ways){let s=90,w=180,n=-90,e=-180;ways.forEach(l=>l.forEach(p=>{if(p[0]<s)s=p[0];if(p[0]>n)n=p[0];if(p[1]<w)w=p[1];if(p[1]>e)e=p[1]}));return [s-.02,w-.03,n+.02,e+.03]}
function nearTrack(p,ways,km){const d=km/111;for(const l of ways)for(let i=0;i<l.length;i++){if(Math.abs(l[i][0]-p[0])<d&&Math.abs(l[i][1]-p[1])<d*1.6)return true}return false}

const only=process.argv.slice(2);const force=!!process.env.FORCE;
let ok=0,fail=0;
for(const r of ROUTES){
  if(only.length&&!only.includes(r.id))continue;
  const file=`data/tracks/${r.id}.json`;
  if(!force&&fs.existsSync(file)){const old=JSON.parse(fs.readFileSync(file,'utf8'));if(Date.now()-new Date(old.updated).getTime()<20*86400000&&old.fromOsm!==false){console.log('skip',r.id);continue}}
  try{
    let ways=[],fromOsm=false;
    if(r.osm){
      const d=1.6,bbox=`${r.lat-d},${r.lon-d*1.6},${r.lat+d},${r.lon+d*1.6}`;
      const j=await overpass(`[out:json][timeout:180];rel["route"="hiking"]["name"~"${r.osm}"](${bbox})->.r;(.r;rel(r.r);)->.rr;way(r.rr)(${bbox});out geom;`);
      const raw=j.elements.filter(e=>e.type==='way'&&e.geometry).map(w=>w.geometry.map(p=>[p.lat,p.lon]));
      ways=stitch(raw).map(w=>simplify(w,0.00006).map(p=>[+p[0].toFixed(5),+p[1].toFixed(5)]));
      fromOsm=ways.length>0;
    }
    if(!fromOsm){if(!r.stages){console.log('no track',r.id);fail++;continue}ways=[r.stages]}
    const bb=bboxOf(ways);
    const j2=await overpass(`[out:json][timeout:120];nwr${POI}(${bb.join(',')});out center;`);
    const pois=j2.elements.filter(e=>e.tags&&e.tags.tourism).map(n=>{const c=n.center||n;return{lat:+c.lat.toFixed(5),lon:+c.lon.toFixed(5),kind:(KIND[n.tags.tourism]||['bed','Slaapplek'])[0],type:n.tags.tourism,name:n.tags.name||'',web:n.tags.website||n.tags['contact:website']||'',phone:n.tags.phone||n.tags['contact:phone']||''}}).filter(p=>p.lat&&nearTrack([p.lat,p.lon],ways,fromOsm?1.5:3));
    fs.writeFileSync(file,JSON.stringify({id:r.id,updated:new Date().toISOString().slice(0,10),fromOsm,ways,pois}));
    console.log('ok',r.id,'ways',ways.length,'pts',ways.reduce((s,w)=>s+w.length,0),'pois',pois.length);ok++;
    await sleep(4000);
  }catch(e){console.log('FAIL',r.id,e.message);fail++}
}
console.log(`done: ${ok} built, ${fail} failed`);
