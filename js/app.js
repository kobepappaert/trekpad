/* Trekpad – app-logica */
const MODES=[
  {id:'ov',ic:'🚆',name:'Zonder auto',sub:'trein en bus'},
  {id:'car',ic:'🚗',name:'Eigen auto',sub:'rijden naar de start'},
  {id:'fly',ic:'✈️',name:'Vliegen',sub:'zonder huurauto'},
  {id:'flycar',ic:'🚙',name:'Vliegen + huurauto',sub:'auto ter plaatse'},
];
const HOMES={BRU:{name:'België (Brussel)'},AMS:{name:'Nederland (Amsterdam)'},PAR:{name:'Frankrijk (Parijs)'},DUS:{name:'Duitsland (Düsseldorf)'}};
const MONTHS=['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'];
const MONTHS_LONG=['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december'];
const SLEEP_COST={wild:0,camping:12,hut:35,hostel:40};
const DIFF_TXT=['','makkelijk','vrij makkelijk','gemiddeld','moeilijk','zeer moeilijk'];
const FIT={g:['g','Goed haalbaar'],a:['a','Haalbaar, maar omslachtig'],r:['r','Niet realistisch']};
const SAFE_GENERAL=[
  'Laat je routeplan (etappes, verwachte einddatum) achter bij iemand thuis en spreek af wanneer je je meldt.',
  'Download de kaart offline (bv. Organic Maps of Komoot) en neem een powerbank; reken niet op bereik.',
  'Test je rugzak vooraf: alles ingepakt max. 20 % van je lichaamsgewicht, en loop er minstens één lange dag mee thuis.',
  'Check de weersverwachting de avond vóór elke etappe en pas je plan aan.',
  'Noodnummer in heel Europa: 112. Zet locatie-deling op je gsm aan voor noodgevallen.',
];

/* ---------- state ---------- */
const LS='trekpad_v3';
let S={mode:'ov',home:'BRU',people:1,month:new Date().getMonth(),fuel:1.65,cons:6.5,rent:45,food:15,sleep:'camping',country:'',days:99,diff:5,sort:'fit',view:'home'};
try{Object.assign(S,JSON.parse(localStorage.getItem(LS)||'{}'))}catch(e){}
S.view='home';
function save(){try{localStorage.setItem(LS,JSON.stringify(S))}catch(e){}}
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];

/* ---------- helpers ---------- */
function inSeason(r,m){const [a,b]=r.season,mm=m+1;return a<=b?(mm>=a&&mm<=b):(mm>=a||mm<=b)}
function stars(n){return '★'.repeat(n)+'☆'.repeat(5-n)}
function cost(r){
  const p=S.people,nights=r.days-1,lines=[];let travel=0;
  if(S.mode==='car'){
    const km=(r.drive[S.home]||0)*2;if(!km)return null;
    const fuel=km/100*S.cons*S.fuel;lines.push(['Brandstof, '+km+' km heen en terug',fuel]);
    const tolls=/Frankrijk|Italië|Portugal|Spanje|Slovenië|Oostenrijk/.test(r.country)?Math.round(km*0.06):0;
    if(tolls)lines.push(['Tol (schatting)',tolls]);
    if(!r.loop)lines.push(['Terug naar de auto (trein/bus)',40*p]);
    travel=fuel+tolls+(r.loop?0:40*p);
  }else if(S.mode==='ov'){
    if(!r.train)return null;
    travel=r.train*p;lines.push(['Trein en bus, heen en terug ×'+p,travel]);
    lines.push(['Lokaal vervoer ×'+p,r.local*p]);travel+=r.local*p;
  }else{
    if(!r.fly[1])return null;
    const f=(r.fly[0]+r.fly[1])/2*p;lines.push(['Vlucht heen en terug (€'+r.fly[0]+'–'+r.fly[1]+') ×'+p,f]);travel=f;
    if(S.mode==='fly'){lines.push(['Lokaal vervoer ×'+p,r.local*p]);travel+=r.local*p}
    else{const rc=S.rent*(r.days+1);lines.push(['Huurauto, '+(r.days+1)+' dagen',rc]);const lf=300/100*S.cons*S.fuel;lines.push(['Brandstof ter plaatse (±300 km)',lf]);travel+=rc+lf}
  }
  const sl=SLEEP_COST[S.sleep]*nights*p;lines.push(['Overnachting, '+nights+' nachten ×'+p,sl]);
  const fd=S.food*r.days*p;lines.push(['Eten, '+r.days+' dagen ×'+p,fd]);
  return{lines,total:travel+sl+fd};
}
function advice(r,m){
  const [tmin,tmax,rain]=r.climate[m],out=[],warns=[];
  if(!inSeason(r,m))warns.push({t:'danger',s:'Buiten het seizoen: hutten kunnen dicht zijn, sneeuw op de passen, minder bussen. Beste periode: '+MONTHS_LONG[r.season[0]-1]+' tot '+MONTHS_LONG[r.season[1]-1]+'.'});
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

/* ---------- foto's (Wikipedia / Wikimedia Commons, met bronvermelding) ---------- */
const PH='trekpad_photos_v1';let photos={};try{photos=JSON.parse(localStorage.getItem(PH)||'{}')}catch(e){}
const loading={};
async function photo(r){
  if(photos[r.id])return photos[r.id];
  if(loading[r.id])return loading[r.id];
  loading[r.id]=(async()=>{
    try{
      const u=`https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(r.wiki)}&prop=pageimages&piprop=original|thumbnail|name&pithumbsize=1000&redirects=1&format=json&origin=*`;
      const j=await (await fetch(u)).json();
      const page=Object.values(j.query.pages)[0];
      if(!page||!page.thumbnail)throw new Error('geen foto');
      const p={thumb:page.thumbnail.source,file:page.pageimage,artist:'',license:''};
      try{
        const c=`https://commons.wikimedia.org/w/api.php?action=query&titles=File:${encodeURIComponent(page.pageimage)}&prop=imageinfo&iiprop=extmetadata&format=json&origin=*`;
        const cj=await (await fetch(c)).json();
        const md=Object.values(cj.query.pages)[0].imageinfo[0].extmetadata;
        p.artist=(md.Artist?md.Artist.value:'').replace(/<[^>]+>/g,'').trim().slice(0,60);
        p.license=md.LicenseShortName?md.LicenseShortName.value:'';
      }catch(e){}
      photos[r.id]=p;try{localStorage.setItem(PH,JSON.stringify(photos))}catch(e){}
      return p;
    }catch(e){photos[r.id]=null;return null}
  })();
  return loading[r.id];
}
function credit(p){if(!p)return'';const a=p.artist||'Wikimedia Commons';return `<a class="credit" href="https://commons.wikimedia.org/wiki/File:${encodeURIComponent(p.file)}" target="_blank" rel="noopener">Foto: ${a}${p.license?' · '+p.license:''}</a>`}
function applyPhoto(r){photo(r).then(p=>{$$('[data-photo="'+r.id+'"]').forEach(el=>{if(p){el.style.backgroundImage=`url("${p.thumb}")`;el.classList.add('has')}const c=el.querySelector('.credit-slot');if(c)c.innerHTML=credit(p)})})}

/* ---------- views ---------- */
function go(view){
  S.view=view;
  $$('.view').forEach(v=>v.classList.toggle('on',v.id==='v-'+view));
  $$('.nav button').forEach(b=>b.classList.toggle('on',b.dataset.v===view));
  $('#topbar').classList.toggle('detail',view==='detail');
  window.scrollTo(0,0);
  if(view==='map')setTimeout(()=>{bigMap();mapObj&&mapObj.invalidateSize()},30);
  if(view==='home')renderList();
}

function renderModes(){
  $('#modes').innerHTML=MODES.map(m=>`<button class="mode ${S.mode===m.id?'on':''}" data-m="${m.id}"><span>${m.ic}</span><b>${m.name}</b><small>${m.sub}</small></button>`).join('');
  $$('.mode').forEach(b=>b.onclick=()=>{S.mode=b.dataset.m;save();renderModes();renderList();if(mapObj)bigMap(true)});
}
function filtered(){
  let rs=ROUTES.filter(r=>(!S.country||r.country===S.country)&&r.days<=S.days&&r.diff<=S.diff).map(r=>({r,c:cost(r),f:r.access[S.mode]}));
  const rank={g:0,a:1,r:2};
  rs.sort((a,b)=>S.sort==='beauty'?b.r.beauty-a.r.beauty:S.sort==='days'?a.r.days-b.r.days:S.sort==='cost'?(a.c?a.c.total:1e9)-(b.c?b.c.total:1e9):
    rank[a.f]-rank[b.f]||(inSeason(b.r,S.month)-inSeason(a.r,S.month))||b.r.beauty-a.r.beauty);
  return rs;
}
function renderList(){
  const rs=filtered();
  $('#count').textContent=rs.length+' van '+ROUTES.length+' routes';
  if(!rs.length){$('#list').innerHTML='<div class="empty">Geen routes met deze filters. Zet een filter ruimer.</div>';return}
  $('#list').innerHTML=rs.map(({r,c,f})=>`<article class="rcard" data-id="${r.id}">
    <div class="rphoto" data-photo="${r.id}"><div class="shade"></div>
      <div class="rtitle"><h3>${r.name}</h3><p>${r.country}</p></div>
      <span class="fitdot ${f}" title="${FIT[f][1]}"></span>
    </div>
    <div class="rbody">
      <div class="rmeta"><span>${r.km} km</span><span>${r.days} dagen</span>${r.loop?'<span>rondtocht</span>':''}<span>${inSeason(r,S.month)?'in seizoen':'buiten seizoen'} in ${MONTHS[S.month]}</span></div>
      <div class="rscores"><div><em>Schoonheid</em><b class="st">${stars(r.beauty)}</b></div><div><em>Moeilijkheid</em><b>${r.diff}<small>/5</small> ${DIFF_TXT[r.diff]}</b></div></div>
      <div class="rfoot"><span class="fit ${f}">${FIT[f][1]}</span>${c?'<span class="price">± € '+Math.round(c.total/S.people)+' p.p.</span>':''}</div>
    </div></article>`).join('');
  $$('.rcard').forEach(el=>{el.onclick=()=>openRoute(el.dataset.id)});
  rs.forEach(({r})=>applyPhoto(r));
}

/* ---------- detail ---------- */
let current=null;
function openRoute(id){current=ROUTES.find(r=>r.id===id);renderDetail();go('detail')}
function renderDetail(){
  const r=current,m=S.month,c=cost(r),a=advice(r,m),mode=MODES.find(x=>x.id===S.mode),f=r.access[S.mode];
  $('#v-detail').innerHTML=`
  <div class="dhero" data-photo="${r.id}"><div class="shade"></div>
    <div class="dtitle"><p>${r.country} · ${r.region}</p><h2>${r.name}</h2></div>
  </div>
  <div class="wrap">
  <div class="credit-line"><span class="credit-slot"></span></div>
  <section class="block">
    <div class="rscores big"><div><em>Schoonheid</em><b class="st">${stars(r.beauty)}</b></div><div><em>Moeilijkheidsgraad</em><b>${r.diff}<small>/5</small> ${DIFF_TXT[r.diff]}</b></div></div>
    <p class="lead">${r.desc}</p>
    <dl class="facts"><div><dt>Afstand</dt><dd>${r.km} km</dd></div><div><dt>Duur</dt><dd>${r.days} dagen</dd></div><div><dt>Hoogte</dt><dd>${r.alt}</dd></div><div><dt>Beste periode</dt><dd>${MONTHS_LONG[r.season[0]-1]} – ${MONTHS_LONG[r.season[1]-1]}</dd></div></dl>
    <div id="dmap"></div>
  </section>

  <section class="block"><h4>Veilig starten</h4>
    <ol class="safe">${r.safety.map(s=>'<li>'+s+'</li>').join('')}</ol>
    <details><summary>Basisregels voor elke tocht</summary><ol class="safe">${SAFE_GENERAL.map(s=>'<li>'+s+'</li>').join('')}</ol></details>
  </section>

  <section class="block"><h4>Slapen</h4><ul class="tags">${r.sleep.map(s=>'<li>'+s+'</li>').join('')}</ul></section>

  <section class="block"><h4>Er geraken</h4>
    <div class="tabs">${MODES.map(x=>`<button class="tab ${S.mode===x.id?'on':''}" data-m="${x.id}">${x.ic} ${x.name}</button>`).join('')}</div>
    <p class="fit ${f} inline">${FIT[f][1]}</p>
    <p class="how">${r.how[S.mode]}</p>
  </section>

  <section class="block"><h4>Kosten, ${S.people} ${S.people>1?'personen':'persoon'}</h4>
    ${c?`<table class="costs">${c.lines.map(l=>`<tr><td>${l[0]}</td><td>€ ${Math.round(l[1])}</td></tr>`).join('')}<tr class="total"><td>Totaal</td><td>€ ${Math.round(c.total)}</td></tr></table>
      <p class="pp">€ ${Math.round(c.total/S.people)} per persoon</p>`:'<p class="how">Met deze reisvorm is de route niet realistisch. Kies hierboven een andere.</p>'}
    <div class="links">
      ${S.mode.startsWith('fly')&&r.airport?`<a href="https://www.google.com/travel/flights?q=flights%20to%20${r.airport}" target="_blank" rel="noopener">Vliegprijzen bekijken</a>`:''}
      ${S.mode==='ov'?`<a href="https://www.thetrainline.com/" target="_blank" rel="noopener">Treinprijzen bekijken</a>`:''}
      ${S.mode==='car'?`<a href="https://www.google.com/maps/dir/?api=1&destination=${r.lat},${r.lon}" target="_blank" rel="noopener">Route in Google Maps</a>`:''}
    </div>
    <p class="note">Schattingen. Brandstofprijs, verbruik en slaapvoorkeur pas je aan bij Instellingen.</p>
  </section>

  <section class="block"><h4>Weer komende 7 dagen</h4><div id="live"><p class="note">Weersverwachting laden…</p></div></section>

  <section class="block"><h4>Klimaat en kleding per maand</h4>
    <div class="tabs">${MONTHS.map((n,i)=>`<button class="tab ${i===m?'on':''}" data-mo="${i}">${n}</button>`).join('')}</div>
    <div class="wx"><div><b>${a.tmin}°</b><span>nacht</span></div><div><b>${a.tmax}°</b><span>dag</span></div><div><b>${a.rain}</b><span>regendagen</span></div></div>
    ${a.warns.map(w=>`<p class="warn ${w.t}">${w.s}</p>`).join('')}
    <ul class="adv">${a.out.map(x=>'<li>'+x+'</li>').join('')}</ul>
    <div class="links"><a href="https://www.windy.com/${r.lat}/${r.lon}?${r.lat},${r.lon},9" target="_blank" rel="noopener">Windy</a><a href="https://www.yr.no/en/search?q=${encodeURIComponent(r.name.split(/[(:–]/)[0].trim())}" target="_blank" rel="noopener">Yr.no</a></div>
    <p class="note">Gemiddelden op routehoogte. Check de verwachting vlak voor vertrek.</p>
  </section>
  </div>`;
  $$('#v-detail .tab[data-m]').forEach(b=>b.onclick=()=>{S.mode=b.dataset.m;save();renderDetail();renderModes()});
  $$('#v-detail .tab[data-mo]').forEach(b=>b.onclick=()=>{S.month=+b.dataset.mo;save();$('#fMonth').value=S.month;renderDetail()});
  applyPhoto(r);detailMap(r);liveWeather(r);
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
      const res=await fetch(u);if(!res.ok)throw new Error(res.status);
      d={t:Date.now(),j:await res.json()};wxCache[r.id]=d;
    }
    const dd=d.j.daily,days=['zo','ma','di','wo','do','vr','za'];
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
    box.innerHTML=`<div class="live">${dd.time.map((t,i)=>`<div><small>${days[new Date(t).getDay()]}</small><span>${WMO[dd.weather_code[i]]||'🌡️'}</span><b>${Math.round(dd.temperature_2m_max[i])}°</b><small>${Math.round(dd.temperature_2m_min[i])}°</small></div>`).join('')}</div>
      <ul class="adv">${(tips.length?tips:['Mild weer verwacht: de standaarduitrusting voor dit seizoen volstaat.']).map(x=>'<li>'+x+'</li>').join('')}</ul>
      <p class="note">Verwachting voor het startpunt; op hoogte kan het 5–10 °C kouder zijn. Bron: Open-Meteo.</p>`;
  }catch(e){box.innerHTML='<p class="note">Live weer kon niet geladen worden. Bekijk het klimaat per maand hieronder.</p>'}
}

/* ---------- kaarten ---------- */
let mapObj,markers,dMap;
const tiles=()=>L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'© OpenStreetMap'});
function bigMap(refresh){
  if(typeof L==='undefined')return;
  if(!mapObj){mapObj=L.map('map').setView([52,10],4);tiles().addTo(mapObj);markers=L.layerGroup().addTo(mapObj)}
  markers.clearLayers();
  filtered().forEach(({r,f})=>{
    const col=f==='g'?'#2e5e46':f==='a'?'#d9a441':'#b23a3a';
    L.circleMarker([r.lat,r.lon],{radius:10,color:'#fff',weight:2,fillColor:col,fillOpacity:.95}).addTo(markers)
      .bindPopup(`<b>${r.name}</b><br>${r.days} dagen · ${r.km} km · ${DIFF_TXT[r.diff]}<br><a href="#" onclick="openRoute('${r.id}');return false">Bekijk route</a>`);
  });
}
function detailMap(r){
  if(typeof L==='undefined')return;
  if(dMap){dMap.remove();dMap=null}
  dMap=L.map('dmap',{scrollWheelZoom:false}).setView([r.lat,r.lon],9);tiles().addTo(dMap);
  L.marker([r.lat,r.lon]).addTo(dMap).bindPopup('Startgebied');
}

/* ---------- init ---------- */
(function init(){
  const fc=$('#fCountry');[...new Set(ROUTES.map(r=>r.country))].sort().forEach(c=>fc.add(new Option(c,c)));
  MONTHS_LONG.forEach((n,i)=>$('#fMonth').add(new Option(n,i)));
  Object.entries(HOMES).forEach(([k,v])=>$('#sHome').add(new Option(v.name,k)));
  fc.value=S.country;$('#fDays').value=S.days;$('#fDiff').value=S.diff;$('#fSort').value=S.sort;$('#fMonth').value=S.month;$('#fPeople').value=S.people;
  $('#sHome').value=S.home;$('#sFuel').value=S.fuel;$('#sCons').value=S.cons;$('#sRent').value=S.rent;$('#sFood').value=S.food;$('#sSleep').value=S.sleep;
  const bind=(id,key,num)=>$(id).onchange=e=>{S[key]=num?+e.target.value:e.target.value;save();renderList()};
  bind('#fCountry','country');bind('#fDays','days',1);bind('#fDiff','diff',1);bind('#fSort','sort');bind('#fMonth','month',1);bind('#fPeople','people',1);
  bind('#sHome','home');bind('#sFuel','fuel',1);bind('#sCons','cons',1);bind('#sRent','rent',1);bind('#sFood','food',1);bind('#sSleep','sleep');
  $$('.nav button').forEach(b=>b.onclick=()=>go(b.dataset.v));
  $('#back').onclick=()=>go('home');
  $('#filterToggle').onclick=()=>$('#filters').classList.toggle('open');
  renderModes();renderList();
  if('serviceWorker' in navigator){navigator.serviceWorker.register('sw.js').catch(()=>{})}
})();
