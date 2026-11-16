/* Trekpad – app-logica */
const MODES=[
  {id:'ov',name:'Zonder auto',sub:'trein en bus'},
  {id:'car',name:'Eigen auto',sub:'rijden naar de start'},
  {id:'fly',name:'Vliegen',sub:'zonder huurauto'},
  {id:'flycar',name:'Vliegen + huurauto',sub:'auto ter plaatse'},
];
const MONTHS=['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'];
const MONTHS_LONG=['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december'];
const SLEEP_COST={wild:0,camping:12,hut:35,hostel:40};
const DIFF_TXT=['','makkelijk','vrij makkelijk','gemiddeld','moeilijk','zeer moeilijk'];
const BEAUTY_TXT=['','gewoon','aangenaam','mooi','heel mooi','adembenemend'];
const FIT={g:['g','Goed haalbaar'],a:['a','Haalbaar, maar omslachtig'],r:['r','Niet realistisch']};
const SAFE_GENERAL=[
  'Laat je routeplan (etappes, verwachte einddatum) achter bij iemand thuis en spreek af wanneer je je meldt.',
  'Download de kaart offline (de GPX hieronder, of een app als Organic Maps) en neem een powerbank; reken niet op bereik.',
  'Test je rugzak vooraf: alles ingepakt maximaal 20 % van je lichaamsgewicht, en loop er thuis minstens één lange dag mee.',
  'Check de weersverwachting de avond vóór elke etappe en pas je plan aan.',
  'Noodnummer in heel Europa: 112. Zet locatie-delen op je gsm aan voor noodgevallen.',
];

/* ---------- state ---------- */
const LS='trekpad_v4';
let S={mode:'ov',home:{name:'Brussel, België',lat:50.85,lon:4.35},people:1,month:new Date().getMonth(),fuel:1.65,cons:6.5,rent:45,food:15,sleep:'camping',country:'',days:99,diff:5,sort:'fit'};
try{Object.assign(S,JSON.parse(localStorage.getItem(LS)||'{}'))}catch(e){}
function save(){try{localStorage.setItem(LS,JSON.stringify(S))}catch(e){}}
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];

/* ---------- afstand, haalbaarheid, kosten ---------- */
function haversine(a,b){const R=6371,d=Math.PI/180,dl=(b.lat-a.lat)*d,dn=(b.lon-a.lon)*d,x=Math.sin(dl/2)**2+Math.cos(a.lat*d)*Math.cos(b.lat*d)*Math.sin(dn/2)**2;return 2*R*Math.asin(Math.sqrt(x))}
function distKm(r){return Math.round(haversine(S.home,r)*1.3)} // wegafstand ≈ 1,3 × hemelsbreed
function access(r){
  const km=distKm(r),loc=r.access;
  if(S.mode==='car')return r.island?'r':km<1200?'g':km<2000?'a':'r';
  if(S.mode==='ov')return loc.ov==='r'||r.island?'r':km<1300?loc.ov:'a';
  if(S.mode==='fly')return km<350?'a':loc.fly;
  return km<350?'a':loc.flycar;
}
function inSeason(r,m){const [a,b]=r.season,mm=m+1;return a<=b?(mm>=a&&mm<=b):(mm>=a||mm<=b)}
function cost(r){
  const p=S.people,nights=r.days-1,lines=[],km=distKm(r);let travel=0;
  if(access(r)==='r')return null;
  if(S.mode==='car'){
    const fuel=km*2/100*S.cons*S.fuel;lines.push(['Brandstof, '+km*2+' km heen en terug',fuel]);
    const tolls=/Frankrijk|Italië|Portugal|Spanje|Slovenië|Oostenrijk/.test(r.country)?Math.round(km*2*0.06):0;
    if(tolls)lines.push(['Tol (schatting)',tolls]);
    if(!r.loop)lines.push(['Terug naar de auto (trein of bus)',40*p]);
    travel=fuel+tolls+(r.loop?0:40*p);
  }else if(S.mode==='ov'){
    const t=Math.min(180,15+km*0.08)*2*p;lines.push(['Trein en bus, heen en terug ×'+p,t]);
    lines.push(['Lokaal vervoer ×'+p,r.local*p]);travel=t+r.local*p;
  }else{
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

/* ---------- scores als bergprofiel ---------- */
function peaks(n){return `<span class="peaks" aria-label="${n} op 5">${[1,2,3,4,5].map(i=>`<svg viewBox="0 0 20 16" class="${i<=n?'on':''}"><path d="M2 15 L10 2 L18 15 Z"/></svg>`).join('')}</span>`}
function steps(n){return `<span class="steps" aria-label="${n} op 5">${[1,2,3,4,5].map(i=>`<i style="height:${4+i*3}px" class="${i<=n?'on':''}"></i>`).join('')}</span>`}

/* ---------- foto's: Wikimedia Commons, 5 beste per route, met bronvermelding ---------- */
const PH='trekpad_photos_v3';let photos={};try{photos=JSON.parse(localStorage.getItem(PH)||'{}')}catch(e){}
const loading={};
async function photoSet(r){
  if(photos[r.id])return photos[r.id];
  if(loading[r.id])return loading[r.id];
  loading[r.id]=(async()=>{
    let list=[];
    try{
      const q=encodeURIComponent(r.photoQuery+' -filemime:svg');
      const u=`https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${q}&gsrnamespace=6&gsrlimit=25&prop=imageinfo&iiprop=url|size|mime|extmetadata&iiurlwidth=1400&format=json&origin=*`;
      const j=await (await fetch(u)).json();
      const pages=Object.values((j.query||{}).pages||{});
      list=pages.map(p=>{
        const ii=(p.imageinfo||[])[0];if(!ii)return null;
        const md=ii.extmetadata||{},ratio=ii.width/ii.height;
        if(!/jpeg|png/.test(ii.mime)||ii.width<1000||ratio<1.05||ratio>2.4)return null;
        const ass=(md.Assessments?md.Assessments.value:'').toLowerCase();
        let score=(ass.includes('featured')?10:0)+(ass.includes('quality')?6:0)+(ass.includes('valued')?3:0)+Math.min(4,ii.width/1500);
        return{url:ii.thumburl||ii.url,file:p.title.replace(/^File:/,''),artist:(md.Artist?md.Artist.value:'').replace(/<[^>]+>/g,'').trim().slice(0,50),license:md.LicenseShortName?md.LicenseShortName.value:'',score};
      }).filter(Boolean).sort((a,b)=>b.score-a.score).slice(0,5);
    }catch(e){}
    if(list.length<3){ // tweede poging met de Wikipedia-titel als zoekterm
      try{
        const q2=encodeURIComponent(r.wiki.replace(/_/g,' ')+' -filemime:svg');
        const u2=`https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${q2}&gsrnamespace=6&gsrlimit=25&prop=imageinfo&iiprop=url|size|mime|extmetadata&iiurlwidth=1400&format=json&origin=*`;
        const j2=await (await fetch(u2)).json();
        const seen=new Set(list.map(x=>x.file));
        Object.values((j2.query||{}).pages||{}).forEach(p=>{
          const ii=(p.imageinfo||[])[0];if(!ii)return;const md=ii.extmetadata||{},ratio=ii.width/ii.height;
          if(!/jpeg|png/.test(ii.mime)||ii.width<1000||ratio<1.05||ratio>2.4)return;
          const file=p.title.replace(/^File:/,'');if(seen.has(file))return;
          const ass=(md.Assessments?md.Assessments.value:'').toLowerCase();
          list.push({url:ii.thumburl||ii.url,file,artist:(md.Artist?md.Artist.value:'').replace(/<[^>]+>/g,'').trim().slice(0,50),license:md.LicenseShortName?md.LicenseShortName.value:'',score:(ass.includes('featured')?10:0)+(ass.includes('quality')?6:0)+(ass.includes('valued')?3:0)+Math.min(4,ii.width/1500)-1});
        });
        list.sort((a,b)=>b.score-a.score);list=list.slice(0,5);
      }catch(e){}
    }
    if(!list.length){ // fallback: hoofdfoto van het Wikipedia-artikel
      try{
        const u=`https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(r.wiki)}&prop=pageimages&piprop=thumbnail|name&pithumbsize=1400&redirects=1&format=json&origin=*`;
        const j=await (await fetch(u)).json();const page=Object.values(j.query.pages)[0];
        if(page&&page.thumbnail)list=[{url:page.thumbnail.source,file:page.pageimage,artist:'',license:''}];
      }catch(e){}
    }
    photos[r.id]=list;try{localStorage.setItem(PH,JSON.stringify(photos))}catch(e){}
    return list;
  })();
  return loading[r.id];
}
function credit(p){if(!p)return'';return `<a class="credit" href="https://commons.wikimedia.org/wiki/File:${encodeURIComponent(p.file)}" target="_blank" rel="noopener">Foto: ${p.artist||'Wikimedia Commons'}${p.license?' · '+p.license:''}</a>`}
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
}
function renderModes(){
  $('#modes').innerHTML=MODES.map(m=>`<button class="mode ${S.mode===m.id?'on':''}" data-m="${m.id}"><b>${m.name}</b><small>${m.sub}</small></button>`).join('');
  $$('.mode').forEach(b=>b.onclick=()=>{S.mode=b.dataset.m;save();renderModes();renderList();if(mapObj)bigMap()});
  $('#homeName').textContent=S.home.name;
}
function filtered(){
  let rs=ROUTES.filter(r=>(!S.country||r.country===S.country)&&r.days<=S.days&&r.diff<=S.diff).map(r=>({r,c:cost(r),f:access(r),km:distKm(r)}));
  const rank={g:0,a:1,r:2};
  rs.sort((a,b)=>S.sort==='beauty'?b.r.beauty-a.r.beauty:S.sort==='days'?a.r.days-b.r.days:S.sort==='cost'?(a.c?a.c.total:1e9)-(b.c?b.c.total:1e9):S.sort==='near'?a.km-b.km:
    rank[a.f]-rank[b.f]||(inSeason(b.r,S.month)-inSeason(a.r,S.month))||b.r.beauty-a.r.beauty);
  return rs;
}
function renderList(){
  const rs=filtered();
  $('#count').textContent=rs.length+' routes';
  if(!rs.length){$('#list').innerHTML='<div class="empty">Geen routes met deze filters. Zet een filter ruimer.</div>';return}
  $('#list').innerHTML=rs.map(({r,c,f,km})=>`<article class="tile" data-id="${r.id}">
    <div class="tphoto" data-photo="${r.id}"></div>
    <div class="tshade"></div>
    <div class="ttop"><span class="fit ${f}">${FIT[f][1]}</span><span class="dist">${km} km van je vertrekpunt</span></div>
    <div class="ttext">
      <p class="tcountry">${r.country}</p>
      <h3>${r.name}</h3>
      <div class="tline"><span>${r.km} km</span><span>${r.days} dagen</span><span>${r.loop?'rondtocht':'van A naar B'}</span>${inSeason(r,S.month)?'':'<span class="off">buiten seizoen in '+MONTHS[S.month]+'</span>'}</div>
      <div class="tscores"><span>${peaks(r.beauty)} ${BEAUTY_TXT[r.beauty]}</span><span>${steps(r.diff)} ${DIFF_TXT[r.diff]}</span>${c?'<span class="price">± € '+Math.round(c.total/S.people)+' p.p.</span>':''}</div>
    </div></article>`).join('');
  $$('.tile').forEach(el=>{el.onclick=()=>openRoute(el.dataset.id)});
  rs.forEach(({r})=>applyPhoto(r));
}

/* ---------- detail ---------- */
let current=null;
function openRoute(id){current=ROUTES.find(r=>r.id===id);renderDetail();go('detail')}
function renderDetail(){
  const r=current,m=S.month,c=cost(r),a=advice(r,m),f=access(r),km=distKm(r);
  $('#v-detail').innerHTML=`
  <div class="strip" id="strip"><div class="slide" data-photo="${r.id}"></div></div>
  <div class="credit-line" id="creditLine"></div>
  <div class="wrap">
  <header class="dhead">
    <p class="tcountry">${r.country} · ${r.region}</p>
    <h2>${r.name}</h2>
    <p class="lead">${r.desc}</p>
    <div class="dscores">
      <div><em>Schoonheid</em>${peaks(r.beauty)}<b>${BEAUTY_TXT[r.beauty]}</b></div>
      <div><em>Moeilijkheidsgraad</em>${steps(r.diff)}<b>${DIFF_TXT[r.diff]}</b></div>
    </div>
    <dl class="facts"><div><dt>Afstand</dt><dd>${r.km} km</dd></div><div><dt>Duur</dt><dd>${r.days} dagen</dd></div><div><dt>Hoogte</dt><dd>${r.alt}</dd></div><div><dt>Beste periode</dt><dd>${MONTHS_LONG[r.season[0]-1]} – ${MONTHS_LONG[r.season[1]-1]}</dd></div></dl>
  </header>

  <section class="sec"><h4>Kaart en GPX</h4>
    <div id="dmap"></div>
    <div class="maplegend"><span><i class="l-route"></i>route</span><span><i class="l-hut"></i>hut</span><span><i class="l-camp"></i>camping</span><span><i class="l-bed"></i>hostel / B&B</span></div>
    <div class="links" id="gpxLinks">
      ${r.osm?`<button class="btn" id="loadTrack">Route en slaapplekken laden</button>`:`<a class="btn" href="https://hiking.waymarkedtrails.org/#?map=10/${r.lat}/${r.lon}" target="_blank" rel="noopener">Bekijk wandelroutes op de kaart</a>`}
    </div>
    <p class="note" id="trackNote">${r.osm?'Het tracé en de slaapplekken komen uit OpenStreetMap. Na het laden kan je de GPX downloaden, met hutten en campings als waypoints.':'Voor deze tocht bestaat geen vast tracé in OpenStreetMap; gebruik de kaartlink om de paden te bekijken.'}</p>
  </section>

  <section class="sec"><h4>Veilig starten</h4>
    <ol class="safe">${r.safety.map(s=>'<li>'+s+'</li>').join('')}</ol>
    <details><summary>Basisregels voor elke tocht</summary><ol class="safe">${SAFE_GENERAL.map(s=>'<li>'+s+'</li>').join('')}</ol></details>
  </section>

  <section class="sec"><h4>Slapen</h4><ul class="tags">${r.sleep.map(s=>'<li>'+s+'</li>').join('')}</ul></section>

  <section class="sec"><h4>Er geraken vanuit ${S.home.name.split(',')[0]}</h4>
    <div class="tabs">${MODES.map(x=>`<button class="tab ${S.mode===x.id?'on':''}" data-m="${x.id}">${x.name}</button>`).join('')}</div>
    <p class="fit ${f} inline">${FIT[f][1]} · ${km} km</p>
    <p class="how">${r.how[S.mode]}</p>
  </section>

  <section class="sec"><h4>Kosten voor ${S.people} ${S.people>1?'personen':'persoon'}</h4>
    ${c?`<table class="costs">${c.lines.map(l=>`<tr><td>${l[0]}</td><td>€ ${Math.round(l[1])}</td></tr>`).join('')}<tr class="total"><td>Totaal</td><td>€ ${Math.round(c.total)}</td></tr></table>
      <p class="pp">€ ${Math.round(c.total/S.people)} <small>per persoon</small></p>`:'<p class="how">Met deze reisvorm is de route vanuit jouw vertrekpunt niet realistisch. Kies hierboven een andere.</p>'}
    <div class="links">
      ${S.mode.startsWith('fly')&&r.airport?`<a class="btn ghost" href="https://www.google.com/travel/flights?q=flights%20to%20${r.airport}" target="_blank" rel="noopener">Vliegprijzen</a>`:''}
      ${S.mode==='ov'?`<a class="btn ghost" href="https://www.thetrainline.com/" target="_blank" rel="noopener">Treinprijzen</a>`:''}
      ${S.mode==='car'?`<a class="btn ghost" href="https://www.google.com/maps/dir/?api=1&origin=${S.home.lat},${S.home.lon}&destination=${r.lat},${r.lon}" target="_blank" rel="noopener">Route in Google Maps</a>`:''}
    </div>
    <p class="note">Schattingen op basis van de afstand vanuit je vertrekpunt. Brandstofprijs, verbruik en slaapvoorkeur pas je aan bij Instellingen.</p>
  </section>

  <section class="sec"><h4>Weer, komende 7 dagen</h4><div id="live"><p class="note">Weersverwachting laden…</p></div></section>

  <section class="sec"><h4>Klimaat en kleding per maand</h4>
    <div class="tabs">${MONTHS.map((n,i)=>`<button class="tab ${i===m?'on':''}" data-mo="${i}">${n}</button>`).join('')}</div>
    <div class="wx"><div><b>${a.tmin}°</b><span>nacht</span></div><div><b>${a.tmax}°</b><span>dag</span></div><div><b>${a.rain}</b><span>regendagen</span></div></div>
    ${a.warns.map(w=>`<p class="warn ${w.t}">${w.s}</p>`).join('')}
    <ul class="adv">${a.out.map(x=>'<li>'+x+'</li>').join('')}</ul>
    <div class="links"><a class="btn ghost" href="https://www.windy.com/${r.lat}/${r.lon}?${r.lat},${r.lon},9" target="_blank" rel="noopener">Windy</a><a class="btn ghost" href="https://www.yr.no/en/search?q=${encodeURIComponent(r.name.split(/[(:–]/)[0].trim())}" target="_blank" rel="noopener">Yr.no</a></div>
    <p class="note">Gemiddelden op routehoogte. Check de verwachting vlak voor vertrek.</p>
  </section>
  </div>`;
  $$('#v-detail .tab[data-m]').forEach(b=>b.onclick=()=>{S.mode=b.dataset.m;save();renderDetail();renderModes()});
  $$('#v-detail .tab[data-mo]').forEach(b=>b.onclick=()=>{S.month=+b.dataset.mo;save();$('#fMonth').value=S.month;renderDetail()});
  const lt=$('#loadTrack');if(lt)lt.onclick=()=>loadTrack(r);
  renderStrip(r);detailMap(r);liveWeather(r);
}
function renderStrip(r){
  photoSet(r).then(list=>{
    const strip=$('#strip');if(!strip||current!==r)return;
    if(!list.length){strip.innerHTML='<div class="slide nophoto"><span>Nog geen foto gevonden</span></div>';return}
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
let mapObj,markers,dMap,trackLayer;
const tiles=()=>L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'© OpenStreetMap'});
function bigMap(){
  if(typeof L==='undefined')return;
  if(!mapObj){mapObj=L.map('map').setView([52,10],4);tiles().addTo(mapObj);markers=L.layerGroup().addTo(mapObj)}
  markers.clearLayers();
  L.circleMarker([S.home.lat,S.home.lon],{radius:7,color:'#142019',weight:2,fillColor:'#fff',fillOpacity:1}).addTo(markers).bindPopup('Je vertrekpunt: '+S.home.name);
  filtered().forEach(({r,f,km})=>{
    const col=f==='g'?'#2e5e46':f==='a'?'#d9a441':'#b23a3a';
    L.circleMarker([r.lat,r.lon],{radius:10,color:'#fff',weight:2,fillColor:col,fillOpacity:.95}).addTo(markers)
      .bindPopup(`<b>${r.name}</b><br>${r.days} dagen · ${r.km} km · ${DIFF_TXT[r.diff]}<br>${km} km van je vertrekpunt<br><a href="#" onclick="openRoute('${r.id}');return false">Bekijk route</a>`);
  });
}
function detailMap(r){
  if(typeof L==='undefined')return;
  if(dMap){dMap.remove();dMap=null}
  dMap=L.map('dmap',{scrollWheelZoom:false}).setView([r.lat,r.lon],9);tiles().addTo(dMap);
  L.marker([r.lat,r.lon]).addTo(dMap).bindPopup('Startgebied');
  trackLayer=null;
}
/* tracé + slaapplekken uit OpenStreetMap (Overpass) */
const SLEEP_TAGS={alpine_hut:['hut','Berghut'],wilderness_hut:['hut','Schuilhut (onbemand)'],camp_site:['camp','Camping'],camp_pitch:['camp','Kampeerplek'],hostel:['bed','Hostel'],guest_house:['bed','Gastenverblijf'],chalet:['bed','Chalet']};
const trackCache={};
async function loadTrack(r){
  const btn=$('#loadTrack'),note=$('#trackNote');if(!btn)return;
  btn.disabled=true;btn.textContent='Laden… (kan 10–30 s duren)';
  try{
    let data=trackCache[r.id];
    if(!data){
      const d=1.6,bbox=`${r.lat-d},${r.lon-d*1.6},${r.lat+d},${r.lon+d*1.6}`;
      const q=`[out:json][timeout:60];rel["route"="hiking"]["name"~"${r.osm}"](${bbox})->.r;way(r.r)(${bbox})->.w;(.w;node(around.w:1500)["tourism"~"^(alpine_hut|wilderness_hut|camp_site|camp_pitch|hostel|guest_house|chalet)$"];);out geom;`;
      const res=await fetch('https://overpass-api.de/api/interpreter',{method:'POST',body:'data='+encodeURIComponent(q)});
      if(!res.ok)throw new Error(res.status);
      const j=await res.json();
      const ways=j.elements.filter(e=>e.type==='way'&&e.geometry).map(w=>w.geometry.map(p=>[p.lat,p.lon]));
      const pois=j.elements.filter(e=>e.type==='node'&&e.tags).map(n=>({lat:n.lat,lon:n.lon,kind:SLEEP_TAGS[n.tags.tourism]||['bed','Slaapplek'],name:n.tags.name||'',tags:n.tags}));
      if(!ways.length)throw new Error('leeg');
      data=trackCache[r.id]={ways,pois};
    }
    if(trackLayer)trackLayer.remove();
    trackLayer=L.layerGroup().addTo(dMap);
    const poly=L.polyline(data.ways,{color:'#b23a3a',weight:4,opacity:.9}).addTo(trackLayer);
    const colors={hut:'#2e5e46',camp:'#d9a441',bed:'#5fb3a9'};
    data.pois.forEach(p=>L.circleMarker([p.lat,p.lon],{radius:6,color:'#fff',weight:1.5,fillColor:colors[p.kind[0]],fillOpacity:1}).addTo(trackLayer).bindPopup(`<b>${p.name||p.kind[1]}</b><br>${p.kind[1]}${p.tags.website?'<br><a href="'+p.tags.website+'" target="_blank" rel="noopener">website</a>':''}${p.tags.phone?'<br>'+p.tags.phone:''}`));
    dMap.fitBounds(poly.getBounds().pad(.05));
    const n=data.pois.length;
    $('#gpxLinks').innerHTML=`<button class="btn" id="dlGpx">Download GPX</button>`;
    $('#dlGpx').onclick=()=>downloadGpx(r,data);
    note.textContent=`${Math.round(data.ways.reduce((s,w)=>s+w.length,0)/10)*10} punten tracé, ${n} slaapplek${n===1?'':'ken'} binnen 1,5 km van de route. Bron: OpenStreetMap-bijdragers (ODbL). Controleer openingstijden en reservaties vooraf.`;
  }catch(e){
    btn.disabled=false;btn.textContent='Opnieuw proberen';
    note.innerHTML=`Het tracé kon niet geladen worden (de OpenStreetMap-server is druk, of de route heeft nog geen volledige registratie). <a href="https://hiking.waymarkedtrails.org/#?map=10/${r.lat}/${r.lon}" target="_blank" rel="noopener">Bekijk de route op Waymarked Trails</a>.`;
  }
}
function downloadGpx(r,data){
  const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
  let g=`<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Trekpad" xmlns="http://www.topografix.com/GPX/1/1">\n<metadata><name>${esc(r.name)}</name><desc>${esc(r.desc)} Tracé en slaapplekken: © OpenStreetMap-bijdragers (ODbL).</desc></metadata>\n`;
  data.pois.forEach(p=>{g+=`<wpt lat="${p.lat}" lon="${p.lon}"><name>${esc(p.name||p.kind[1])}</name><type>${esc(p.kind[1])}</type></wpt>\n`});
  g+=`<trk><name>${esc(r.name)}</name>\n`;
  data.ways.forEach(w=>{g+='<trkseg>'+w.map(p=>`<trkpt lat="${p[0]}" lon="${p[1]}"/>`).join('')+'</trkseg>\n'});
  g+='</trk>\n</gpx>';
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([g],{type:'application/gpx+xml'}));a.download=r.id+'.gpx';document.body.appendChild(a);a.click();a.remove();
}

/* ---------- vertrekpunt ---------- */
async function geocode(q){
  const res=await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&accept-language=nl`);
  return (await res.json()).map(x=>({name:x.display_name.split(',').slice(0,2).map(s=>s.trim()).join(', '),lat:+x.lat,lon:+x.lon}));
}
function setHome(h){S.home=h;save();renderModes();renderList();if(mapObj)bigMap();$('#homeInput').value='';$('#homeResults').innerHTML='';$('#homeStatus').textContent='Vertrekpunt: '+h.name}
function initHome(){
  $('#homeStatus').textContent='Vertrekpunt: '+S.home.name;
  $('#homeSearch').onclick=async()=>{const q=$('#homeInput').value.trim();if(!q)return;$('#homeResults').innerHTML='<li class="note">Zoeken…</li>';
    try{const rs=await geocode(q);$('#homeResults').innerHTML=rs.length?rs.map((h,i)=>`<li><button class="pick" data-i="${i}">${h.name}</button></li>`).join(''):'<li class="note">Niets gevonden. Probeer een stad of dorp.</li>';
      $$('#homeResults .pick').forEach(b=>b.onclick=()=>setHome(rs[+b.dataset.i]));}catch(e){$('#homeResults').innerHTML='<li class="note">Zoeken lukte niet. Probeer later opnieuw.</li>'}};
  $('#homeInput').onkeydown=e=>{if(e.key==='Enter')$('#homeSearch').click()};
  $('#homeGeo').onclick=()=>{if(!navigator.geolocation){$('#homeStatus').textContent='Locatie is niet beschikbaar op dit toestel.';return}
    $('#homeStatus').textContent='Locatie bepalen…';
    navigator.geolocation.getCurrentPosition(async pos=>{const {latitude:lat,longitude:lon}=pos.coords;let name='Mijn locatie';
      try{const j=await (await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10&accept-language=nl`)).json();const a=j.address||{};name=[a.city||a.town||a.village||a.municipality||j.name,a.country].filter(Boolean).join(', ')}catch(e){}
      setHome({name,lat,lon})},()=>{$('#homeStatus').textContent='Locatie geweigerd of niet gevonden. Typ een plaats in.'},{timeout:10000})};
}

/* ---------- init ---------- */
(function init(){
  const fc=$('#fCountry');[...new Set(ROUTES.map(r=>r.country))].sort().forEach(c=>fc.add(new Option(c,c)));
  MONTHS_LONG.forEach((n,i)=>$('#fMonth').add(new Option(n,i)));
  fc.value=S.country;$('#fDays').value=S.days;$('#fDiff').value=S.diff;$('#fSort').value=S.sort;$('#fMonth').value=S.month;$('#fPeople').value=S.people;
  $('#sFuel').value=S.fuel;$('#sCons').value=S.cons;$('#sRent').value=S.rent;$('#sFood').value=S.food;$('#sSleep').value=S.sleep;
  const bind=(id,key,num)=>$(id).onchange=e=>{S[key]=num?+e.target.value:e.target.value;save();renderList()};
  bind('#fCountry','country');bind('#fDays','days',1);bind('#fDiff','diff',1);bind('#fSort','sort');bind('#fMonth','month',1);bind('#fPeople','people',1);
  bind('#sFuel','fuel',1);bind('#sCons','cons',1);bind('#sRent','rent',1);bind('#sFood','food',1);bind('#sSleep','sleep');
  $$('.nav button').forEach(b=>b.onclick=()=>go(b.dataset.v));
  $('#back').onclick=()=>go('home');
  $('#filterToggle').onclick=()=>{$('#filters').classList.toggle('open');$('#filterToggle').textContent=$('#filters').classList.contains('open')?'Filters sluiten':'Filters'};
  $('#homeLink').onclick=()=>go('settings');
  initHome();renderModes();renderList();
  if('serviceWorker' in navigator){navigator.serviceWorker.register('sw.js').catch(()=>{})}
})();
