/* Vandra – app-logica */
const MODE_IDS=['ov','car','fly','flycar'];
const SLEEP_COST={wild:0,camping:12,hut:35,hostel:40};
const SAFE_GENERAL=[
  'Laat je routeplan (etappes, verwachte einddatum) achter bij iemand thuis en spreek af wanneer je je meldt.',
  'Download de kaart offline (de GPX hieronder, of een app als Organic Maps) en neem een powerbank; reken niet op bereik.',
  'Test je rugzak vooraf: alles ingepakt maximaal 20 % van je lichaamsgewicht, en loop er thuis minstens één lange dag mee.',
  'Check de weersverwachting de avond vóór elke etappe en pas je plan aan.',
  'Noodnummer in heel Europa: 112. Zet locatie-delen op je gsm aan voor noodgevallen.',
];

/* ---------- state ---------- */
const VERSION='0.5.3';
const LS='vandra_v1';
const navLang=(navigator.language||'nl').slice(0,2);
let S={lang:I18N[navLang]?navLang:'en',mode:'ov',home:{name:'Brussel, België',lat:50.85,lon:4.35},people:1,month:new Date().getMonth(),fuel:1.65,cons:6.5,rent:45,food:15,sleep:'camping',country:'',away:99,diff:5,sort:'fit'};
try{Object.assign(S,JSON.parse(localStorage.getItem(LS)||'{}'))}catch(e){}
let T=I18N[S.lang];
function save(){try{localStorage.setItem(LS,JSON.stringify(S))}catch(e){}}
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const fmt=(s,o)=>s.replace(/\{(\w+)\}/g,(_,k)=>o[k]);

/* ---------- afstand, haalbaarheid, dagen, kosten ---------- */
function haversine(a,b){const R=6371,d=Math.PI/180,dl=(b.lat-a.lat)*d,dn=(b.lon-a.lon)*d,x=Math.sin(dl/2)**2+Math.cos(a.lat*d)*Math.cos(b.lat*d)*Math.sin(dn/2)**2;return 2*R*Math.asin(Math.sqrt(x))}
function distKm(r){return Math.round(haversine(S.home,r)*1.3)}
function access(r){
  const km=distKm(r),loc=r.access;
  if(S.mode==='car')return r.island?'r':km<1200?'g':km<2000?'a':'r';
  if(S.mode==='ov')return loc.ov==='r'||r.island?'r':km<1300?loc.ov:'a';
  if(S.mode==='fly')return km<350?'a':loc.fly;
  if(loc.flycar==='r')return 'r';
  return km<350?'a':(loc.fly!=='r'||loc.flycar==='g')?'g':'a';
}
/* reisdagen heen + terug, bovenop de wandeldagen */
function travelDays(r){
  const km=distKm(r);
  if(S.mode==='car')return km<400?1:km<900?2:km<1600?3:4;
  if(S.mode==='ov')return km<500?1:km<1200?2:km<2000?3:4;
  return km<2500?2:3;
}
function awayDays(r){return r.days+travelDays(r)}
function inSeason(r,m){const [a,b]=r.season,mm=m+1;return a<=b?(mm>=a&&mm<=b):(mm>=a||mm<=b)}
function cost(r){
  const p=S.people,nights=r.days-1,lines=[],km=distKm(r),L=T.costLines;let travel=0;
  if(access(r)==='r')return null;
  if(S.mode==='car'){
    const fuel=km*2/100*S.cons*S.fuel;lines.push([fmt(L.fuel,{km:km*2}),fuel]);
    const tolls=/Frankrijk|Italië|Portugal|Spanje|Slovenië|Oostenrijk/.test(r.country)?Math.round(km*2*0.06):0;
    if(tolls)lines.push([L.toll,tolls]);
    if(!r.loop)lines.push([L.backToCar,40*p]);
    travel=fuel+tolls+(r.loop?0:40*p);
  }else if(S.mode==='ov'){
    const t=Math.min(180,15+km*0.08)*2*p;lines.push([fmt(L.train,{p}),t]);
    lines.push([fmt(L.local,{p}),r.local*p]);travel=t+r.local*p;
  }else{
    const f=(r.fly[0]+r.fly[1])/2*p;lines.push([fmt(L.flight,{a:r.fly[0],b:r.fly[1],p}),f]);travel=f;
    if(S.mode==='fly'){lines.push([fmt(L.local,{p}),r.local*p]);travel+=r.local*p}
    else{const rc=S.rent*(r.days+1);lines.push([fmt(L.rental,{d:r.days+1}),rc]);const lf=300/100*S.cons*S.fuel;lines.push([L.localFuel,lf]);travel+=rc+lf}
  }
  const sl=SLEEP_COST[S.sleep]*nights*p;lines.push([fmt(L.stay,{n:nights,p}),sl]);
  const fd=S.food*r.days*p;lines.push([fmt(L.food,{d:r.days,p}),fd]);
  return{lines,total:travel+sl+fd};
}
function advice(r,m){
  const [tmin,tmax,rain]=r.climate[m],out=[],warns=[];
  if(!inSeason(r,m))warns.push({t:'danger',s:'Buiten het seizoen: hutten kunnen dicht zijn, sneeuw op de passen, minder bussen. Beste periode: '+T.monthsLong[r.season[0]-1]+' – '+T.monthsLong[r.season[1]-1]+'.'});
  if(tmin<=-5){out.push('Winteruitrusting: slaapzak comfort −10 °C, isolatiematje R≥4, donsjas, muts, handschoenen.');out.push('Sneeuw en ijs: stokken, eventueel micro-spikes; korte dagen.')}
  else if(tmin<=0){out.push('Warme slaapzak (comfort −5 °C), thermisch ondergoed, muts en handschoenen. Nachtvorst is normaal.');out.push('Mogelijk sneeuwvelden op hoogte: wandelstokken en schoenen met profiel.')}
  else if(tmin<=6)out.push('Slaapzak comfort 0 °C, fleece of lichte donsjas voor de avond, dunne muts.');
  else if(tmin<=12)out.push('Slaapzak comfort +5 °C, lichte fleece voor ’s avonds.');
  else out.push('Lichte slaapzak of liner volstaat; toch een lange broek en dunne trui voor de avond.');
  if(tmax>=25)out.push('Hitte: zonnehoed, zonnecrème, 2–3 liter water per dag, vroeg starten, rust tussen 12 en 15 u.');
  else if(tmax>=18)out.push('Zomers overdag: korte broek en lichte, ademende laag; zonnecrème.');
  if(rain>=14)out.push('Zeer nat: regenjas én regenbroek, drybags, waterdichte schoenen, reservesokken. Geen katoen.');
  else if(rain>=9)out.push('Regelmatig regen: regenjas, regenbroek en rugzakhoes; drybag voor je slaapzak.');
  else if(rain>=5)out.push('Enkele buien mogelijk: lichte regenjas en rugzakhoes.');
  else out.push('Droog seizoen: een lichte regenjas blijft mee voor onweer.');
  const top=parseInt((r.alt.match(/–\s*(\d+)/)||[])[1]||0);
  if(top>=1500){out.push('Op hoogte waait het harder en is de zon feller: windjack, zonnebril, zonnecrème SPF50.');if(m>=5&&m<=8)warns.push({t:'',s:'Onweer in de namiddag is typisch voor de bergen in de zomer: vertrek vroeg, wees vóór 14 u over de pas.'})}
  if(r.danger>=3)warns.push({t:'danger',s:'Neem kaart en kompas of GPS, een EHBO-set, en laat je route achter bij iemand thuis. In afgelegen gebied: overweeg een noodbaken.'});
  return{tmin,tmax,rain,out,warns};
}

/* ---------- scores ---------- */
function peaks(n){return `<span class="peaks" aria-label="${n}/5">${[1,2,3,4,5].map(i=>`<svg viewBox="0 0 20 16" class="${i<=n?'on':''}"><path d="M2 15 L10 2 L18 15 Z"/></svg>`).join('')}</span>`}
function steps(n){return `<span class="steps" aria-label="${n}/5">${[1,2,3,4,5].map(i=>`<i style="height:${4+i*3}px" class="${i<=n?'on':''}"></i>`).join('')}</span>`}

/* ---------- foto's: Wikimedia Commons, 5 beste per route, met bronvermelding ---------- */
const PH='vandra_photos_v1';let photos={};try{photos=JSON.parse(localStorage.getItem(PH)||'{}')}catch(e){}
const loading={};
async function commonsSearch(q,penalty){
  const u=`https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(q+' -filemime:svg')}&gsrnamespace=6&gsrlimit=25&prop=imageinfo&iiprop=url|size|mime|extmetadata&iiurlwidth=1400&format=json&origin=*`;
  const j=await (await fetch(u)).json();
  return Object.values((j.query||{}).pages||{}).map(p=>{
    const ii=(p.imageinfo||[])[0];if(!ii)return null;
    const md=ii.extmetadata||{},ratio=ii.width/ii.height;
    if(!/jpeg|png/.test(ii.mime)||ii.width<1000||ratio<1.05||ratio>2.4)return null;
    const ass=(md.Assessments?md.Assessments.value:'').toLowerCase();
    return{url:ii.thumburl||ii.url,file:p.title.replace(/^File:/,''),artist:(md.Artist?md.Artist.value:'').replace(/<[^>]+>/g,'').trim().slice(0,50),license:md.LicenseShortName?md.LicenseShortName.value:'',
      score:(ass.includes('featured')?10:0)+(ass.includes('quality')?6:0)+(ass.includes('valued')?3:0)+Math.min(4,ii.width/1500)-(penalty||0)};
  }).filter(Boolean);
}
async function photoSet(r){
  if(photos[r.id])return photos[r.id];
  if(loading[r.id])return loading[r.id];
  loading[r.id]=(async()=>{
    let list=[];
    try{list=await commonsSearch(r.photoQuery,0)}catch(e){}
    if(list.length<3){try{const seen=new Set(list.map(x=>x.file));(await commonsSearch(r.wiki.replace(/_/g,' ').replace(/%27/g,"'"),1)).forEach(x=>{if(!seen.has(x.file))list.push(x)})}catch(e){}}
    list.sort((a,b)=>b.score-a.score);list=list.slice(0,5);
    photos[r.id]=list;try{localStorage.setItem(PH,JSON.stringify(photos))}catch(e){}
    return list;
  })();
  return loading[r.id];
}
function credit(p){if(!p)return'';return `<a class="credit" href="https://commons.wikimedia.org/wiki/File:${encodeURIComponent(p.file)}" target="_blank" rel="noopener">${T.photo}: ${p.artist||'Wikimedia Commons'}${p.license?' · '+p.license:''}</a>`}
function applyPhoto(r){photoSet(r).then(list=>{const p=list[0];$$('[data-photo="'+r.id+'"]').forEach(el=>{if(p){el.style.backgroundImage=`url("${p.url}")`;el.classList.add('has')}})})}

/* ---------- views ---------- */
let view='home';
function go(v){
  view=v;
  $$('.view').forEach(x=>x.classList.toggle('on',x.id==='v-'+v));
  $$('.nav button').forEach(b=>b.classList.toggle('on',b.dataset.v===v));
  document.body.classList.toggle('in-detail',v==='detail');
  window.scrollTo(0,0);
  if(v==='map')setTimeout(()=>{bigMap();mapObj&&mapObj.invalidateSize()},30);
  if(v==='home')renderList();
  if(v==='detail')setTimeout(()=>dMap&&dMap.invalidateSize(),50);
}
function renderModes(){
  $('#modes').innerHTML=MODE_IDS.map(m=>`<button class="mode ${S.mode===m?'on':''}" data-m="${m}"><b>${T.modes[m][0]}</b><small>${T.modes[m][1]}</small></button>`).join('');
  $$('.mode').forEach(b=>b.onclick=()=>{S.mode=b.dataset.m;save();renderModes();renderList();if(mapObj)bigMap()});
  $('#homeName').textContent=S.home.name.split(',')[0];
}
function filtered(){
  let rs=ROUTES.filter(r=>(!S.country||r.country===S.country)&&r.diff<=S.diff).map(r=>({r,c:cost(r),f:access(r),km:distKm(r),away:awayDays(r)}));
  const total=rs.length;
  rs=rs.filter(x=>x.f==='g'&&x.away<=S.away); // alleen wat echt haalbaar is
  rs.sort((a,b)=>S.sort==='beauty'?b.r.beauty-a.r.beauty:S.sort==='days'?a.r.days-b.r.days:S.sort==='cost'?(a.c?a.c.total:1e9)-(b.c?b.c.total:1e9):S.sort==='near'?a.km-b.km:
    (inSeason(b.r,S.month)-inSeason(a.r,S.month))||b.r.beauty-a.r.beauty);
  rs.hiddenCount=total-rs.length;
  return rs;
}
function renderList(){
  const rs=filtered();
  $('#count').textContent=rs.length+' '+T.routes+(rs.hiddenCount?' · '+rs.hiddenCount+' '+T.hidden:'');
  if(!rs.length){$('#list').innerHTML='<div class="empty">'+T.empty+'</div>';return}
  $('#list').innerHTML=rs.map(({r,c,away})=>`<article class="tile" data-id="${r.id}">
    <div class="tphoto" data-photo="${r.id}"></div>
    <div class="tshade"></div>
    <div class="ttext">
      <p class="tcountry">${r.country}</p>
      <h3>${r.name}</h3>
      <div class="tline"><span>${r.km} ${T.km}</span><span>${r.days} ${T.days}</span><span>${away} ${T.away}</span>${inSeason(r,S.month)?'':'<span class="off">'+T.offSeason+' '+T.months[S.month]+'</span>'}</div>
      <div class="tscores"><span>${peaks(r.beauty)} ${T.beautyTxt[r.beauty]}</span><span>${steps(r.diff)} ${T.diffTxt[r.diff]}</span>${c?'<span class="price">± € '+Math.round(c.total/S.people)+' '+T.pp+'</span>':''}</div>
    </div></article>`).join('');
  $$('.tile').forEach(el=>{el.onclick=()=>openRoute(el.dataset.id)});
  rs.forEach(({r})=>applyPhoto(r));
}

/* ---------- detail ---------- */
let current=null;
function openRoute(id){current=ROUTES.find(r=>r.id===id);go('detail');renderDetail();setTimeout(()=>dMap&&dMap.invalidateSize(),50)}
function renderDetail(){
  const r=current,m=S.month,c=cost(r),a=advice(r,m),f=access(r),km=distKm(r),away=awayDays(r);
  $('#v-detail').innerHTML=`
  <div class="strip" id="strip"><div class="slide" data-photo="${r.id}"></div></div>
  <div class="credit-line" id="creditLine"></div>
  <div class="wrap">
  <header class="dhead">
    <p class="tcountry">${r.country} · ${r.region}</p>
    <h2>${r.name}</h2>
    ${S.lang!=='nl'?'<p class="note">'+T.routeTextNote+'</p>':''}
    <p class="lead">${r.desc}</p>
    <div class="dscores">
      <div><em>${T.beauty}</em>${peaks(r.beauty)}<b>${T.beautyTxt[r.beauty]}</b></div>
      <div><em>${T.difficulty}</em>${steps(r.diff)}<b>${T.diffTxt[r.diff]}</b></div>
    </div>
    <dl class="facts"><div><dt>${T.distance}</dt><dd>${r.km} ${T.km}</dd></div><div><dt>${T.duration}</dt><dd>${r.days} ${T.days} · ${away} ${T.away}</dd></div><div><dt>${T.altitude}</dt><dd>${r.alt}</dd></div><div><dt>${T.season}</dt><dd>${T.monthsLong[r.season[0]-1]} – ${T.monthsLong[r.season[1]-1]}</dd></div></dl>
  </header>

  <section class="sec"><h4>${T.mapGpx}</h4>
    <div id="dmap"></div>
    <div class="maplegend"><span><i class="l-route"></i>${T.legend[0]}</span><span><i class="l-hut"></i>${T.legend[1]}</span><span><i class="l-camp"></i>${T.legend[2]}</span><span><i class="l-bed"></i>${T.legend[3]}</span></div>
    <div class="links" id="gpxLinks"></div>
    <p class="note" id="trackNote">${T.loading}</p>
  </section>

  <section class="sec"><h4>${T.safe}</h4>
    <ol class="safe">${r.safety.map(s=>'<li>'+s+'</li>').join('')}</ol>
    <details><summary>${T.safeAll}</summary><ol class="safe">${SAFE_GENERAL.map(s=>'<li>'+s+'</li>').join('')}</ol></details>
  </section>

  <section class="sec"><h4>${T.sleep}</h4><ul class="tags">${r.sleep.map(s=>'<li>'+s+'</li>').join('')}</ul></section>

  <section class="sec"><h4>${T.getThere} ${S.home.name.split(',')[0]}</h4>
    <div class="tabs">${MODE_IDS.map(x=>`<button class="tab ${S.mode===x?'on':''}" data-m="${x}">${T.modes[x][0]}</button>`).join('')}</div>
    <p class="fit ${f} inline">${T.fit[f]} · ${km} ${T.km}</p>
    <p class="how">${r.how[S.mode]}</p>
  </section>

  <section class="sec"><h4>${T.costs} ${S.people} ${S.people>1?T.persons:T.person}</h4>
    ${c?`<table class="costs">${c.lines.map(l=>`<tr><td>${l[0]}</td><td>€ ${Math.round(l[1])}</td></tr>`).join('')}<tr class="total"><td>${T.costLines.total}</td><td>€ ${Math.round(c.total)}</td></tr></table>
      <p class="pp">€ ${Math.round(c.total/S.people)} <small>${T.perPerson}</small></p>`:'<p class="how">'+T.notRealistic+'</p>'}
    <div class="links">
      ${S.mode.startsWith('fly')&&r.airport?`<a class="btn ghost" href="https://www.google.com/travel/flights?q=flights%20to%20${r.airport}" target="_blank" rel="noopener">${T.flights}</a>`:''}
      ${S.mode==='ov'?`<a class="btn ghost" href="https://www.thetrainline.com/" target="_blank" rel="noopener">${T.trains}</a>`:''}
      ${S.mode==='car'?`<a class="btn ghost" href="https://www.google.com/maps/dir/?api=1&origin=${S.home.lat},${S.home.lon}&destination=${r.lat},${r.lon}" target="_blank" rel="noopener">${T.maps}</a>`:''}
    </div>
    <p class="note">${T.costNote}</p>
  </section>

  <section class="sec"><h4>${T.weather7}</h4><div id="live"><p class="note">${T.weatherLoading}</p></div></section>

  <section class="sec"><h4>${T.climate}</h4>
    <div class="tabs">${T.months.map((n,i)=>`<button class="tab ${i===m?'on':''}" data-mo="${i}">${n}</button>`).join('')}</div>
    <div class="wx"><div><b>${a.tmin}°</b><span>${T.night}</span></div><div><b>${a.tmax}°</b><span>${T.day}</span></div><div><b>${a.rain}</b><span>${T.rainDays}</span></div></div>
    ${a.warns.map(w=>`<p class="warn ${w.t}">${w.s}</p>`).join('')}
    <ul class="adv">${a.out.map(x=>'<li>'+x+'</li>').join('')}</ul>
    <div class="links"><a class="btn ghost" href="https://www.windy.com/${r.lat}/${r.lon}?${r.lat},${r.lon},9" target="_blank" rel="noopener">Windy</a><a class="btn ghost" href="https://www.yr.no/en/search?q=${encodeURIComponent(r.name.split(/[(:–]/)[0].trim())}" target="_blank" rel="noopener">Yr.no</a></div>
    <p class="note">${T.climateNote}</p>
  </section>
  </div>`;
  $$('#v-detail .tab[data-m]').forEach(b=>b.onclick=()=>{S.mode=b.dataset.m;save();renderDetail();renderModes()});
  $$('#v-detail .tab[data-mo]').forEach(b=>b.onclick=()=>{S.month=+b.dataset.mo;save();$('#fMonth').value=S.month;renderDetail()});
  renderStrip(r);detailMap(r);loadTrack(r);liveWeather(r);
}
function renderStrip(r){
  photoSet(r).then(list=>{
    const strip=$('#strip');if(!strip||current!==r)return;
    if(!list.length){strip.innerHTML='<div class="slide nophoto"><span>'+T.noPhoto+'</span></div>';return}
    strip.innerHTML=list.map((p,i)=>`<div class="slide has" style="background-image:url('${p.url}')" data-i="${i}"></div>`).join('');
    const cl=$('#creditLine');const setCredit=i=>{cl.innerHTML=`<span>${i+1}/${list.length}</span>${credit(list[i])}`};setCredit(0);
    strip.onscroll=()=>{const i=Math.round(strip.scrollLeft/strip.clientWidth);setCredit(Math.min(list.length-1,Math.max(0,i)))};
  });
}

/* ---------- live weer (Open-Meteo) ---------- */
const WMO={0:'☀️',1:'🌤️',2:'⛅',3:'☁️',45:'🌫️',48:'🌫️',51:'🌦️',53:'🌦️',55:'🌧️',61:'🌧️',63:'🌧️',65:'🌧️',71:'🌨️',73:'🌨️',75:'❄️',77:'🌨️',80:'🌦️',81:'🌧️',82:'⛈️',85:'🌨️',86:'❄️',95:'⛈️',96:'⛈️',99:'⛈️'};
const wxCache={};
async function liveWeather(r){
  const box=$('#live');if(!box)return;
  try{
    let d=wxCache[r.id];
    if(!d||Date.now()-d.t>30*60*1000){
      const u=`https://api.open-meteo.com/v1/forecast?latitude=${r.lat}&longitude=${r.lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max&timezone=auto&forecast_days=7`;
      const res=await fetch(u);if(!res.ok)throw new Error(res.status);d={t:Date.now(),j:await res.json()};wxCache[r.id]=d;
    }
    const dd=d.j.daily;
    const tmin=Math.min(...dd.temperature_2m_min),tmax=Math.max(...dd.temperature_2m_max);
    const rainy=dd.precipitation_sum.filter(p=>p>=1).length,wind=Math.max(...dd.wind_speed_10m_max),tips=[];
    if(tmin<=0)tips.push('Nachtvorst verwacht: slaapzak comfort −5 °C of kouder, muts en handschoenen.');
    else if(tmin<=6)tips.push('Koude nachten: slaapzak comfort 0 °C, warme laag voor ’s avonds.');
    if(tmax>=26)tips.push('Warm overdag: 3 liter water, zonnehoed, vroeg starten.');
    if(rainy>=4)tips.push(`Regen op ${rainy} van de 7 dagen: volledige regenuitrusting en drybags.`);
    else if(rainy>=1)tips.push(`Regen op ${rainy} dag${rainy>1?'en':''}: regenjas en rugzakhoes bovenaan.`);
    if(wind>=50)tips.push(`Windstoten tot ${Math.round(wind)} km/u: vermijd graten en open passen op die dagen, tent goed verankeren.`);
    if(dd.weather_code.some(c=>c>=95))tips.push('Onweer in de verwachting: die dag kort plannen, in de namiddag uit de hoogte blijven.');
    if(dd.weather_code.some(c=>c>=71&&c<=86))tips.push('Sneeuw verwacht: stokken, gaiters, eventueel micro-spikes; check of de passen open zijn.');
    box.innerHTML=`<div class="live">${dd.time.map((t,i)=>`<div><small>${T.weekdays[new Date(t).getDay()]}</small><span>${WMO[dd.weather_code[i]]||'🌡️'}</span><b>${Math.round(dd.temperature_2m_max[i])}°</b><small>${Math.round(dd.temperature_2m_min[i])}°</small></div>`).join('')}</div>
      <p class="sub">${T.adviceWeek}</p><ul class="adv">${(tips.length?tips:['Mild weer verwacht: de standaarduitrusting voor dit seizoen volstaat.']).map(x=>'<li>'+x+'</li>').join('')}</ul>
      <p class="note">${T.weatherNote}</p>`;
  }catch(e){box.innerHTML='<p class="note">'+T.weatherFail+'</p>'}
}

/* ---------- kaarten ---------- */
let mapObj,markers,dMap,trackLayer;
const tiles=()=>L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'© OpenStreetMap'});
function bigMap(){
  if(typeof L==='undefined')return;
  if(!mapObj){mapObj=L.map('map').setView([52,10],4);tiles().addTo(mapObj);markers=L.layerGroup().addTo(mapObj)}
  markers.clearLayers();
  L.circleMarker([S.home.lat,S.home.lon],{radius:7,color:'#152018',weight:2,fillColor:'#fff',fillOpacity:1}).addTo(markers).bindPopup(T.yourStart+': '+S.home.name);
  filtered().forEach(({r,km})=>{
    L.circleMarker([r.lat,r.lon],{radius:10,color:'#fff',weight:2,fillColor:'#2e5e46',fillOpacity:.95}).addTo(markers)
      .bindPopup(`<b>${r.name}</b><br>${r.days} ${T.days} · ${r.km} km · ${T.diffTxt[r.diff]}<br>${km} ${T.fromYou}<br><a href="#" onclick="openRoute('${r.id}');return false">${T.view}</a>`);
  });
}
function detailMap(r){
  if(typeof L==='undefined')return;
  if(dMap){dMap.remove();dMap=null}
  dMap=L.map('dmap',{scrollWheelZoom:false}).setView([r.lat,r.lon],9);tiles().addTo(dMap);
  trackLayer=L.layerGroup().addTo(dMap);
  if(r.stages){const pl=L.polyline(r.stages,{color:'#b23a3a',weight:4,opacity:.8,dashArray:'6 8'}).addTo(trackLayer);dMap.fitBounds(pl.getBounds().pad(.15))}
  else L.marker([r.lat,r.lon]).addTo(dMap).bindPopup(T.startArea);
}
/* tracé + slaapplekken uit OpenStreetMap (Overpass, met reserveservers en cache); etappepunten als terugval */
const SLEEP_TAGS={alpine_hut:['hut','Berghut'],wilderness_hut:['hut','Schuilhut (onbemand)'],camp_site:['camp','Camping'],camp_pitch:['camp','Kampeerplek'],hostel:['bed','Hostel'],guest_house:['bed','Gastenverblijf'],chalet:['bed','Chalet']};
const POI_FILTER='["tourism"~"^(alpine_hut|wilderness_hut|camp_site|camp_pitch|hostel|guest_house|chalet)$"]';
const OVERPASS=['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter','https://overpass.private.coffee/api/interpreter'];
const TK='vandra_tracks_v1';let trackStore={};try{trackStore=JSON.parse(localStorage.getItem(TK)||'{}')}catch(e){}
async function overpass(q){
  let err;
  for(const u of OVERPASS){
    try{const res=await fetch(u,{method:'POST',body:'data='+encodeURIComponent(q)});if(!res.ok)throw new Error(res.status);return await res.json()}catch(e){err=e}
  }
  throw err;
}
/* lijn vereenvoudigen (Douglas-Peucker) zodat cache en GPX klein blijven */
function simplify(pts,tol){
  if(pts.length<3)return pts;
  const sq=(a,b,c)=>{const x=c[0]-b[0],y=c[1]-b[1];if(x===0&&y===0)return (a[0]-b[0])**2+(a[1]-b[1])**2;let t=((a[0]-b[0])*x+(a[1]-b[1])*y)/(x*x+y*y);t=Math.max(0,Math.min(1,t));return (a[0]-(b[0]+t*x))**2+(a[1]-(b[1]+t*y))**2};
  const keep=new Array(pts.length).fill(false);keep[0]=keep[pts.length-1]=true;const stack=[[0,pts.length-1]];
  while(stack.length){const [a,b]=stack.pop();let mx=0,mi=-1;for(let i=a+1;i<b;i++){const d=sq(pts[i],pts[a],pts[b]);if(d>mx){mx=d;mi=i}}if(mx>tol*tol){keep[mi]=true;stack.push([a,mi],[mi,b])}}
  return pts.filter((_,i)=>keep[i]);
}
function bboxOf(ways){let s=90,w=180,n=-90,e=-180;ways.forEach(l=>l.forEach(p=>{if(p[0]<s)s=p[0];if(p[0]>n)n=p[0];if(p[1]<w)w=p[1];if(p[1]>e)e=p[1]}));return [s-.02,w-.03,n+.02,e+.03]}
function nearTrack(p,ways,km){const d=km/111;for(const l of ways)for(let i=0;i<l.length;i+=3){if(Math.abs(l[i][0]-p[0])<d&&Math.abs(l[i][1]-p[1])<d*1.6)return true}return false}
async function loadTrack(r){
  const note=$('#trackNote'),links=$('#gpxLinks');if(!note)return;
  links.innerHTML='';
  try{
    let data=trackStore[r.id];
    if(data&&Date.now()-data.t>30*24*3600*1000)data=null;
    if(!data){ // vooraf berekend bestand (snel)
      try{const res=await fetch(`data/tracks/${r.id}.json?v=${VERSION}`);if(res.ok){const j=await res.json();data={t:Date.now(),ways:j.ways,fromOsm:j.fromOsm,pois:j.pois.map(p=>({lat:p.lat,lon:p.lon,kind:[p.kind,(SLEEP_TAGS[p.type]||['bed','Slaapplek'])[1]],name:p.name,web:p.web,phone:p.phone}))}}}catch(e){}
    }
    if(!data){ // live uit OpenStreetMap (traag, reserve)
      let ways=[],fromOsm=false;
      if(r.osm){
        const d=1.6,bbox=`${r.lat-d},${r.lon-d*1.6},${r.lat+d},${r.lon+d*1.6}`;
        const j=await overpass(`[out:json][timeout:40];rel["route"="hiking"]["name"~"${r.osm}"](${bbox})->.r;(.r;rel(r.r);)->.rr;way(r.rr)(${bbox});out geom;`);
        ways=j.elements.filter(e=>e.type==='way'&&e.geometry).map(w=>simplify(w.geometry.map(p=>[+p.lat.toFixed(5),+p.lon.toFixed(5)]),0.00008));
        fromOsm=ways.length>0;
      }
      if(!fromOsm){if(!r.stages)throw new Error('leeg');ways=[r.stages]}
      const bb=bboxOf(ways);
      let pois=[];
      try{
        const j2=await overpass(`[out:json][timeout:25];nwr${POI_FILTER}(${bb.join(',')});out center;`);
        pois=j2.elements.filter(e=>e.tags&&e.tags.tourism).map(n=>{const c=n.center||n;return{lat:c.lat,lon:c.lon,kind:SLEEP_TAGS[n.tags.tourism]||['bed','Slaapplek'],name:n.tags.name||'',web:n.tags.website||n.tags['contact:website']||'',phone:n.tags.phone||n.tags['contact:phone']||''}}).filter(p=>p.lat&&nearTrack([p.lat,p.lon],ways,fromOsm?1.5:3));
      }catch(e){}
      data={t:Date.now(),ways,pois,fromOsm};
      trackStore[r.id]=data;try{localStorage.setItem(TK,JSON.stringify(trackStore))}catch(e){}
    }
    if(current!==r)return;
    trackLayer.clearLayers();
    const poly=L.polyline(data.ways,{color:'#b23a3a',weight:4,opacity:.9,dashArray:data.fromOsm?null:'6 8'}).addTo(trackLayer);
    const colors={hut:'#2e5e46',camp:'#d9a441',bed:'#5fb3a9'};
    data.pois.forEach(p=>L.circleMarker([p.lat,p.lon],{radius:6,color:'#fff',weight:1.5,fillColor:colors[p.kind[0]],fillOpacity:1}).addTo(trackLayer).bindPopup(`<b>${p.name||p.kind[1]}</b><br>${p.kind[1]}${p.web?'<br><a href="'+p.web+'" target="_blank" rel="noopener">'+T.website+'</a>':''}${p.phone?'<br>'+p.phone:''}`));
    dMap.fitBounds(poly.getBounds().pad(.08));
    links.innerHTML=`<button class="btn" id="dlGpx">${T.gpx}</button>`;$('#dlGpx').onclick=()=>downloadGpx(r,data);
    note.textContent=(data.fromOsm?T.trackNote:T.trackStages)+' · '+data.pois.length+' 🛏';
  }catch(e){
    if(current!==r||!$('#gpxLinks'))return;
    $('#gpxLinks').innerHTML=`<button class="btn ghost" id="retryTrack">${T.retry}</button>`;$('#retryTrack').onclick=()=>loadTrack(r);
    $('#trackNote').textContent=T.trackFail;
  }
}
function downloadGpx(r,data){
  const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
  let g=`<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Vandra" xmlns="http://www.topografix.com/GPX/1/1">\n<metadata><name>${esc(r.name)}</name><desc>${esc(r.desc)} © OpenStreetMap contributors (ODbL).</desc></metadata>\n`;
  data.pois.forEach(p=>{g+=`<wpt lat="${p.lat}" lon="${p.lon}"><name>${esc(p.name||p.kind[1])}</name><type>${esc(p.kind[1])}</type></wpt>\n`});
  g+=`<trk><name>${esc(r.name)}</name>\n`;
  data.ways.forEach(w=>{g+='<trkseg>'+w.map(p=>`<trkpt lat="${p[0]}" lon="${p[1]}"/>`).join('')+'</trkseg>\n'});
  g+='</trk>\n</gpx>';
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([g],{type:'application/gpx+xml'}));a.download='vandra-'+r.id+'.gpx';document.body.appendChild(a);a.click();a.remove();
}

/* ---------- vertrekpunt ---------- */
async function geocode(q){
  const res=await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&accept-language=${S.lang}`);
  return (await res.json()).map(x=>({name:x.display_name.split(',').slice(0,2).map(s=>s.trim()).join(', '),lat:+x.lat,lon:+x.lon}));
}
function setHome(h){S.home=h;save();renderModes();renderList();if(mapObj)bigMap();$('#homeInput').value='';$('#homeResults').innerHTML='';$('#homeStatus').textContent=T.homeIs+' '+h.name}
function initHome(){
  $('#homeSearch').onclick=async()=>{const q=$('#homeInput').value.trim();if(!q)return;$('#homeResults').innerHTML='<li class="note">'+T.searching+'</li>';
    try{const rs=await geocode(q);$('#homeResults').innerHTML=rs.length?rs.map((h,i)=>`<li><button class="pick" data-i="${i}">${h.name}</button></li>`).join(''):'<li class="note">'+T.noResult+'</li>';
      $$('#homeResults .pick').forEach(b=>b.onclick=()=>setHome(rs[+b.dataset.i]));}catch(e){$('#homeResults').innerHTML='<li class="note">'+T.searchFail+'</li>'}};
  $('#homeInput').onkeydown=e=>{if(e.key==='Enter')$('#homeSearch').click()};
  $('#homeGeo').onclick=()=>{if(!navigator.geolocation){$('#homeStatus').textContent=T.geoNo;return}
    $('#homeStatus').textContent=T.geoBusy;
    navigator.geolocation.getCurrentPosition(async pos=>{const {latitude:lat,longitude:lon}=pos.coords;let name=T.myLocation;
      try{const j=await (await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10&accept-language=${S.lang}`)).json();const a=j.address||{};name=[a.city||a.town||a.village||a.municipality||j.name,a.country].filter(Boolean).join(', ')}catch(e){}
      setHome({name,lat,lon})},()=>{$('#homeStatus').textContent=T.geoDenied},{timeout:10000})};
}

/* ---------- vaste teksten vertalen ---------- */
function applyLang(){
  T=I18N[S.lang];document.documentElement.lang=S.lang;
  $$('[data-t]').forEach(el=>{el.textContent=T[el.dataset.t]});
  $$('[data-tp]').forEach(el=>{el.placeholder=T[el.dataset.tp]});
  const fill=(id,arr,vals)=>{const sel=$(id),v=sel.value;sel.innerHTML='';arr.forEach((t,i)=>sel.add(new Option(t,vals[i])));if(v!=='')sel.value=v};
  fill('#fAway',T.fAwayOpt,[99,4,7,10,14,21]);fill('#fDiff',T.fDiffOpt,[5,2,3,4]);fill('#fSort',T.fSortOpt,['fit','near','beauty','cost','days']);
  fill('#fMonth',T.monthsLong,[0,1,2,3,4,5,6,7,8,9,10,11]);fill('#sSleep',T.sleepOpt,['wild','camping','hut','hostel']);
  $('#fCountry').options[0].text=T.all;
  $('#filterToggle').textContent=$('#filters').classList.contains('open')?T.filtersClose:T.filters;
  $('#homeStatus').textContent=T.homeIs+' '+S.home.name;
  renderModes();renderList();
}

/* ---------- init ---------- */
(function init(){
  const fc=$('#fCountry');[...new Set(ROUTES.map(r=>r.country))].sort().forEach(c=>fc.add(new Option(c,c)));
  $('#sLang').value=S.lang;applyLang();
  fc.value=S.country;$('#fAway').value=S.away;$('#fDiff').value=S.diff;$('#fSort').value=S.sort;$('#fMonth').value=S.month;$('#fPeople').value=S.people;
  $('#sFuel').value=S.fuel;$('#sCons').value=S.cons;$('#sRent').value=S.rent;$('#sFood').value=S.food;$('#sSleep').value=S.sleep;
  const bind=(id,key,num)=>$(id).onchange=e=>{S[key]=num?+e.target.value:e.target.value;save();renderList()};
  bind('#fCountry','country');bind('#fAway','away',1);bind('#fDiff','diff',1);bind('#fSort','sort');bind('#fMonth','month',1);bind('#fPeople','people',1);
  bind('#sFuel','fuel',1);bind('#sCons','cons',1);bind('#sRent','rent',1);bind('#sFood','food',1);bind('#sSleep','sleep');
  $('#sLang').onchange=e=>{S.lang=e.target.value;save();applyLang()};
  $$('.nav button').forEach(b=>b.onclick=()=>go(b.dataset.v));
  $('#back').onclick=()=>go('home');
  $('#filterToggle').onclick=()=>{$('#filters').classList.toggle('open');$('#filterToggle').textContent=$('#filters').classList.contains('open')?T.filtersClose:T.filters};
  $('#homeLink').onclick=()=>go('settings');
  initHome();renderList();
  if('serviceWorker' in navigator){navigator.serviceWorker.register('sw.js').catch(()=>{})}
})();
