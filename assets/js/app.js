// HERO SLIDER SYSTEM
let slides=[
  {id:2,label:'Holiday Escapes · Maldives',title:'Paradise Found<br><em>in the Maldives</em>',sub:'Overwater villas, pristine turquoise lagoons, and world-class service — your dream escape awaits.',cta:'View Holiday Packages',link:'holiday',bg:'linear-gradient(135deg,#0d3d52 0%,#1a6b8a 55%,#0e5f82 100%)',img:'',active:true},
  {id:3,label:'Mediterranean Cruises · 2026',title:'Sail the World<br><em>in Luxury</em>',sub:'Explore 6 stunning countries in 10 magical nights aboard world-class Mediterranean cruise liners.',cta:'Discover Cruises',link:'cruise',bg:'linear-gradient(135deg,#1a3060 0%,#2858a8 55%,#12285e 100%)',img:'',active:true},
  {id:4,label:'Flights · 150+ Destinations',title:'Fly Anywhere,<br><em>Seamlessly</em>',sub:'Hundreds of routes, competitive fares, and effortless booking — your next adventure starts here.',cta:'Search Flights',link:'flights',bg:'linear-gradient(135deg,#1C2B45 0%,#0B1120 55%,#2E4270 100%)',img:'',active:true},
];
let sliderSettings={autoplay:true,interval:5000,arrows:true,dots:true,counter:true};
let currentSlide=0;
let sliderTimer=null;
let slidesPaused=false;

function renderHeroSlides(){
  const c=document.getElementById('slides-container');
  const d=document.getElementById('sliderDots');
  if(!c||!d)return;
  const activeSlides=slides.filter(s=>s.active);
  c.innerHTML='';
  d.innerHTML='';
  if(!activeSlides.length)return;
  activeSlides.forEach((s,i)=>{
    // Slide
    const el=document.createElement('div');
    el.className='slide'+(i===0?' s-active':'');
    el.id='slide-'+i;
    const bgStyle=s.img?`background-image:url(${s.img});background:${s.bg}`:`background:${s.bg}`;
    el.innerHTML=`
      <div class="slide-bg" style="${bgStyle};background-size:cover;background-position:center"></div>
      <div class="slide-overlay"></div>
      <div class="slide-content">
        <div class="slide-label">${s.label}</div>
        <h1 class="slide-title">${s.title}</h1>
        <p class="slide-sub">${s.sub}</p>
        <div class="slide-cta"><button class="btn-gold" style="padding:13px 36px;font-size:15px" onclick="goSearch('${s.link}')">${s.cta}</button></div>
      </div>`;
    c.appendChild(el);
    // Dot
    const dot=document.createElement('button');
    dot.className='sdot'+(i===0?' act':'');
    dot.setAttribute('aria-label','Slide '+(i+1));
    dot.onclick=()=>goSlide(i);
    d.appendChild(dot);
  });
  updateSliderCounter();
  toggleSliderControls();
}

function goSlide(n){
  const active=document.querySelectorAll('#slides-container .slide');
  const dots=document.querySelectorAll('#sliderDots .sdot');
  if(!active.length)return;
  const total=active.length;
  n=((n%total)+total)%total;
  active.forEach((s,i)=>s.classList.toggle('s-active',i===n));
  dots.forEach((d,i)=>d.classList.toggle('act',i===n));
  currentSlide=n;
  updateSliderCounter();
  animateProgress();
  updatePreview(n);
}
function nextSlide(){goSlide(currentSlide+1)}
function prevSlide(){goSlide(currentSlide-1)}

function startSliderAuto(){
  clearInterval(sliderTimer);
  if(!sliderSettings.autoplay)return;
  sliderTimer=setInterval(()=>{if(!slidesPaused)nextSlide()},sliderSettings.interval);
}
function pauseSlider(){slidesPaused=true}
function resumeSlider(){slidesPaused=false}

function updateSliderCounter(){
  const c=document.getElementById('sliderCounter');
  if(!c)return;
  const total=slides.filter(s=>s.active).length;
  c.textContent=(currentSlide+1)+' / '+total;
  c.style.display=sliderSettings.counter?'block':'none';
}
function toggleSliderControls(){
  const pa=document.querySelector('.slider-prev');
  const na=document.querySelector('.slider-next');
  const dd=document.getElementById('sliderDots');
  if(pa)pa.style.display=sliderSettings.arrows?'flex':'none';
  if(na)na.style.display=sliderSettings.arrows?'flex':'none';
  if(dd)dd.style.display=sliderSettings.dots?'flex':'none';
}
function animateProgress(){
  const p=document.getElementById('sliderProgress');
  if(!p)return;
  p.style.transition='width 0s';p.style.width='0%';
  requestAnimationFrame(()=>{requestAnimationFrame(()=>{
    p.style.transition=`width ${sliderSettings.interval}ms linear`;
    p.style.width='100%';
  })});
}
function updateSliderSetting(key,val){
  sliderSettings[key]=val;
  if(key==='autoplay'){startSliderAuto();if(!val){clearInterval(sliderTimer)}}
  if(key==='interval'){startSliderAuto()}
  if(key==='arrows'||key==='dots'){toggleSliderControls()}
  if(key==='counter'){updateSliderCounter()}
  toast(`Slider setting updated: ${key}= ${val}`,'t-green');
}

// Admin Hero Manager
function renderSlideManager(){
  const list=document.getElementById('slide-manager-list');
  const cnt=document.getElementById('hero-slide-count');
  if(!list)return;
  const active=slides.filter(s=>s.active).length;
  if(cnt)cnt.textContent=`${slides.length} slides · ${active} active · auto-play ${sliderSettings.autoplay?'ON':'OFF'}`;
  list.innerHTML=slides.map((s,i)=>`
    <div class="slide-card${s.active?'':' s-inactive'}" id="sc-${s.id}">
      <div class="slide-thumb" style="background:${s.bg}${s.img?';background-image:url('+s.img+')':''}">
        <div class="slide-thumb-overlay"></div>
        <div class="slide-thumb-content">
          <div class="slide-thumb-title">${s.title.replace(/<[^>]*>/g,'')}</div>
          <div class="slide-thumb-sub">${s.label}</div>
        </div>
      </div>
      <div class="slide-card-foot">
        <div class="flex aic gap8">
          ${s.active?'<span class="badge b-green">Active</span>':'<span class="badge b-slate">Inactive</span>'}
          <span style="font-size:11px;color:var(--slate2)">${s.cta}</span>
        </div>
        <div class="flex aic gap8">
          <div class="slide-order-btns">
            <button class="slide-order-btn" onclick="moveSlide(${i},-1)" title="Move Up" ${i===0?'disabled':''}>↑</button>
            <button class="slide-order-btn" onclick="moveSlide(${i},1)" title="Move Down" ${i===slides.length-1?'disabled':''}>↓</button>
          </div>
          <button class="btn-icon" onclick="toggleSlideActive(${i})" title="${s.active?'Deactivate':'Activate'}">${s.active?'🔴':'🟢'}</button>
          <button class="btn-icon" onclick="openEditSlide(${i})">✏</button>
          <button class="btn-icon" style="color:var(--red)" onclick="deleteSlide(${i})">🗑</button>
        </div>
      </div>
    </div>`).join('');
  renderPreviewDots();
  updatePreview(0);
}
function moveSlide(idx,dir){
  const ni=idx+dir;
  if(ni<0||ni>=slides.length)return;
  [slides[idx],slides[ni]]=[slides[ni],slides[idx]];
  renderSlideManager();renderHeroSlides();startSliderAuto();
  toast('Slide order updated','t-green');
}
function toggleSlideActive(idx){
  slides[idx].active=!slides[idx].active;
  renderSlideManager();renderHeroSlides();startSliderAuto();
  toast(`Slide ${slides[idx].active?'activated':'deactivated'}`,'t-gold');
}
function deleteSlide(idx){
  if(slides.length<=1){toast('Cannot delete the last slide','t-red');return}
  if(!confirm('Delete this slide?'))return;
  slides.splice(idx,1);
  renderSlideManager();renderHeroSlides();startSliderAuto();
  toast('Slide deleted','t-green');
}
function openEditSlide(idx){
  const s=slides[idx];
  document.getElementById('es-id').value=idx;
  document.getElementById('es-label').value=s.label;
  document.getElementById('es-title').value=s.title.replace(/<br>/g,'');
  document.getElementById('es-sub').value=s.sub;
  document.getElementById('es-cta').value=s.cta;
  document.getElementById('es-link').value=s.link;
  document.getElementById('es-img').value=s.img||'';
  // Set gradient dropdown — match by value, fallback to first option
  const gradSel=document.getElementById('es-grad');
  const matchOpt=Array.from(gradSel.options).find(o=>o.value===s.bg);
  if(matchOpt)gradSel.value=s.bg;else gradSel.selectedIndex=0;
  // Update preview box
  const prev=document.getElementById('es-prev');
  if(prev){
    prev.style.background=s.bg;
    prev.style.backgroundSize='cover';
    prev.style.backgroundPosition='center';
    if(s.img){prev.style.backgroundImage=`url(${s.img})`}else{prev.style.backgroundImage='none'}
  }
  document.getElementById('es-active').checked=s.active;
  openModal('m-edit-slide');
}
function saveEditSlide(){
  const idx=parseInt(document.getElementById('es-id').value);
  slides[idx]={...slides[idx],
    label:document.getElementById('es-label').value,
    title:document.getElementById('es-title').value,
    sub:document.getElementById('es-sub').value,
    cta:document.getElementById('es-cta').value,
    link:document.getElementById('es-link').value,
    img:document.getElementById('es-img').value,
    bg:document.getElementById('es-grad').value,
    active:document.getElementById('es-active').checked,
  };
  closeModal('m-edit-slide');
  renderSlideManager();renderHeroSlides();startSliderAuto();
  toast('Slide updated successfully','t-green');
}
function addSlideFromModal(){
  const img=document.getElementById('ns-img').value;
  slides.push({
    id:Date.now(),
    label:document.getElementById('ns-label').value||'New Slide',
    title:document.getElementById('ns-title').value||'New Destination',
    sub:document.getElementById('ns-sub').value||'',
    cta:document.getElementById('ns-cta').value||'Learn More',
    link:document.getElementById('ns-link').value,
    bg:document.getElementById('ns-grad').value,
    img,active:document.getElementById('ns-active').checked,
  });
  closeModal('m-add-slide');
  renderSlideManager();renderHeroSlides();startSliderAuto();
  toast('Slide added successfully','t-green');
}
function renderPreviewDots(){
  const d=document.getElementById('prev-dots');
  if(!d)return;
  d.innerHTML=slides.filter(s=>s.active).map((_,i)=>`<div onclick="updatePreview(${i})" style="width:${i===0?'20px':'8px'};height:8px;border-radius:4px;background:${i===0?'var(--gold)':'rgba(255,255,255,.3)'};cursor:pointer;transition:all .3s"></div>`).join('');
}
function updatePreview(idx){
  const active=slides.filter(s=>s.active);
  const s=active[idx];if(!s)return;
  const bg=document.getElementById('prev-bg');
  const pl=document.getElementById('prev-label');
  const pt=document.getElementById('prev-title');
  const ps=document.getElementById('prev-sub');
  const pc=document.getElementById('prev-cta');
  if(bg)bg.style.background=s.bg+(s.img?';background-image:url('+s.img+');background-size:cover;background-position:center':'');
  if(pl)pl.textContent=s.label;
  if(pt)pt.innerHTML=s.title;
  if(ps)ps.textContent=s.sub;
  if(pc)pc.textContent=s.cta;
}
function previewModalImg(url,previewId){
  const prev=document.getElementById(previewId);
  if(!prev)return;
  if(!url){prev.style.backgroundImage='none';prev.style.background='var(--surface2)';prev.textContent='Preview will appear here';return}
  const img=new Image();
  img.onload=()=>{
    prev.style.backgroundImage=`url(${url})`;
    prev.style.backgroundSize='cover';
    prev.style.backgroundPosition='center';
    prev.textContent='';
  };
  img.onerror=()=>{prev.style.backgroundImage='none';prev.textContent='⚠ Image could not be loaded'};
  img.src=url;
}
function testImageUrl(url){
  const p=document.getElementById('img-test-preview');
  if(!url){if(p){p.style.backgroundImage='none';p.style.background='var(--surface2)';p.textContent='Enter URL above to preview'}return}
  previewModalImg(url,'img-test-preview');
}
// API INTEGRATION SYSTEM
let apiConfig={baseUrl:'https://api.keenantravel.com/v1',apiKey:'sk_live_kt_a1b2c3d4e5f6',env:'',timeout:5000};
const API_ENDPOINTS=[
  {method:'POST',path:'/flights/search',desc:'Search live NDC flights',group:'flights'},
  {method:'POST',path:'/flights/fare-confirm',desc:'Confirm price and check bundles',group:'flights'},
  {method:'POST',path:'/flights/add-passengers',desc:'Add traveler details to offer',group:'flights'},
  {method:'POST',path:'/flights/book',desc:'Issue flight ticket (Stripe)',group:'flights'},
  {method:'POST',path:'/flights/hold',desc:'Place flight offer on hold',group:'flights'},
  {method:'POST',path:'/flights/book-after-hold',desc:'Issue ticket for held booking',group:'flights'},
  {method:'POST',path:'/flights/retrieve',desc:'Retrieve PNR details from NDC',group:'flights'},
  {method:'GET',path:'/flights/bookings',desc:'List all flight bookings (Admin)',group:'flights'},
  {method:'GET',path:'/flights/bookings/{id}',desc:'Get booking details',group:'flights'},
  {method:'PUT',path:'/flights/bookings/{id}',desc:'Update a booking (Admin)',group:'flights'},
  {method:'PATCH',path:'/flights/bookings/{id}/status',desc:'Update booking status',group:'flights'},
  {method:'DELETE',path:'/flights/bookings/{id}',desc:'Cancel a booking',group:'flights'},

  {method:'GET',path:'/umrah/packages',desc:'List Umrah packages',group:'umrah'},
  {method:'POST',path:'/umrah/packages',desc:'Create Umrah package',group:'umrah'},
  {method:'GET',path:'/umrah/packages/{id}',desc:'Get package details',group:'umrah'},
  {method:'PUT',path:'/umrah/packages/{id}',desc:'Update a package',group:'umrah'},
  {method:'DELETE',path:'/umrah/packages/{id}',desc:'Delete a package',group:'umrah'},
  {method:'GET',path:'/umrah/bookings',desc:'List Umrah bookings',group:'umrah'},
  {method:'POST',path:'/umrah/bookings',desc:'Create Umrah booking',group:'umrah'},
  {method:'GET',path:'/holiday/packages',desc:'List holiday packages',group:'holiday'},
  {method:'POST',path:'/holiday/packages',desc:'Create holiday package',group:'holiday'},
  {method:'GET',path:'/holiday/bookings',desc:'List holiday bookings',group:'holiday'},
  {method:'POST',path:'/holiday/bookings',desc:'Create holiday booking',group:'holiday'},
  {method:'GET',path:'/cruise/packages',desc:'List cruise packages',group:'cruise'},
  {method:'POST',path:'/cruise/packages',desc:'Create cruise package',group:'cruise'},
  {method:'GET',path:'/cruise/bookings',desc:'List cruise bookings',group:'cruise'},
  {method:'POST',path:'/cruise/bookings',desc:'Create cruise booking',group:'cruise'},
  {method:'GET',path:'/visa/applications',desc:'List visa applications',group:'visa'},
  {method:'POST',path:'/visa/applications',desc:'Submit visa application',group:'visa'},
  {method:'GET',path:'/visa/applications/{id}',desc:'Get application details',group:'visa'},
  {method:'PUT',path:'/visa/applications/{id}',desc:'Update application',group:'visa'},
  {method:'PATCH',path:'/visa/applications/{id}/status',desc:'Update visa status',group:'visa'},
  {method:'GET',path:'/customers',desc:'List all customers',group:'customers'},
  {method:'POST',path:'/customers',desc:'Create a customer',group:'customers'},
  {method:'GET',path:'/customers/{id}',desc:'Get customer profile',group:'customers'},
  {method:'PUT',path:'/customers/{id}',desc:'Update customer info',group:'customers'},
  {method:'DELETE',path:'/customers/{id}',desc:'Delete a customer',group:'customers'},
  {method:'GET',path:'/admin/dashboard',desc:'Dashboard metrics',group:'admin'},
  {method:'GET',path:'/admin/reports',desc:'Generate report data',group:'admin'},
  {method:'GET',path:'/admin/hero-slides',desc:'List hero slides',group:'admin'},
  {method:'POST',path:'/admin/hero-slides',desc:'Add a hero slide',group:'admin'},
  {method:'PUT',path:'/admin/hero-slides/{id}',desc:'Update a hero slide',group:'admin'},
  {method:'DELETE',path:'/admin/hero-slides/{id}',desc:'Delete a hero slide',group:'admin'},
];
function saveApiConfig(){
  apiConfig.baseUrl=document.getElementById('api-base-url').value;
  apiConfig.apiKey=document.getElementById('api-key').value;
  apiConfig.env=document.getElementById('api-env').value;
  apiConfig.timeout=parseInt(document.getElementById('api-timeout').value);
  document.getElementById('api-status-url').textContent=apiConfig.baseUrl;
  toast('API configuration saved','t-green');
}
function setApiStatus(state,msg){
  const dot=document.getElementById('api-dot');
  const text=document.getElementById('api-status-text');
  if(!dot||!text)return;
  dot.className='api-status-dot '+(state==='connected'?'connected':state==='testing'?'testing':'disconnected');
  text.textContent=msg;
}
async function testApiConnection(){
  setApiStatus('testing','Testing connection…');
  const btn=document.getElementById('test-btn');
  if(btn){btn.textContent='⏳ Testing…';btn.disabled=true}
  const res=document.getElementById('api-test-result');
  // Simulate API call (mock – real implementation would use actual fetch)
  await new Promise(r=>setTimeout(r,1400+Math.random()*600));
  const ok=Math.random()>0.2;
  const latency=Math.floor(80+Math.random()*120);
  if(res){
    res.style.display='block';
    if(ok){
      res.style.background='var(--green-bg)';res.style.color='var(--green)';res.style.border='1px solid rgba(15,123,91,.2)';
      res.innerHTML=`✓ Connected successfully · ${latency}ms response time<br><small style="opacity:.7">GET ${apiConfig.baseUrl}/health → 200 OK</small>`;
      setApiStatus('connected','Connected');
      logRequest('GET','/health','200',latency+'ms');
      document.getElementById('api-last-sync').textContent='Just now';
    }else{
      res.style.background='var(--red-bg)';res.style.color='var(--red)';res.style.border='1px solid rgba(185,28,28,.2)';
      res.innerHTML=`✕ Connection failed · Network timeout or invalid URL<br><small style="opacity:.7">Check the API base URL and try again</small>`;
      setApiStatus('disconnected','Connection Failed');
    }
  }
  if(btn){btn.textContent='🔗 Test Connection';btn.disabled=false}
}
function syncEndpoints(){
  const list=document.getElementById('endpoint-list');
  const cnt=document.getElementById('ep-total');
  const ok=document.getElementById('ep-ok');
  const warn=document.getElementById('ep-warn');
  const err=document.getElementById('ep-err');
  const sync=document.getElementById('ep-last-sync');
  if(!list)return;
  list.innerHTML='';
  let okN=0,warnN=0,errN=0;
  API_ENDPOINTS.forEach(ep=>{
    const r=Math.random();
    const st=r>0.15?'ok':r>0.05?'warn':'err';
    const lat=Math.floor(50+Math.random()*200);
    if(st==='ok')okN++;else if(st==='warn')warnN++;else errN++;
    const mc={'GET':'ep-get','POST':'ep-post','PUT':'ep-put','PATCH':'ep-patch','DELETE':'ep-delete'}[ep.method]||'ep-get';
    list.innerHTML+=`<div class="endpoint-item"><span class="ep-method ${mc}">${ep.method}</span><span class="ep-path">${ep.path}</span><span class="ep-desc">${ep.desc}</span><div class="ep-status${st==='err'?' err':st==='warn'?' warn':''}"></div><span class="ep-latency">${st==='err'?'timeout':lat+'ms'}</span></div>`;
  });
  if(cnt)cnt.textContent=API_ENDPOINTS.length;
  if(ok)ok.textContent=okN;if(warn)warn.textContent=warnN;if(err)err.textContent=errN;
  if(sync)sync.textContent=new Date().toLocaleTimeString();
  setApiStatus(errN===0?'connected':'disconnected',errN===0?'All Endpoints OK':`${errN} endpoint${errN>1?'s':''} unreachable`);
  toast(`Synced ${API_ENDPOINTS.length} endpoints · ${okN} OK, ${errN} errors`,'t-gold');
}
function logRequest(method,path,status,latency){
  const log=document.getElementById('req-log');
  if(!log)return;
  const first=log.querySelector('.req-log-row.head');
  const row=document.createElement('div');
  const mc={'GET':'ep-get','POST':'ep-post','PUT':'ep-put','PATCH':'ep-patch','DELETE':'ep-delete'}[method]||'';
  const sc=status.startsWith('2')?'sc-2xx':status.startsWith('4')?'sc-4xx':'sc-5xx';
  row.className='req-log-row';
  row.innerHTML=`<div><span class="ep-method ${mc}" style="font-size:11px;padding:2px 6px">${method}</span></div><div style="font-family:monospace;font-size:12px">${path}</div><div><span class="status-code ${sc}">${status}</span></div><div style="color:var(--slate2)">${new Date().toLocaleTimeString()}</div><div style="color:var(--slate2)">${latency}</div>`;
  if(first)first.after(row);else log.appendChild(row);
  // Keep only last 10
  const rows=log.querySelectorAll('.req-log-row:not(.head)');
  if(rows.length>10)rows[rows.length-1].remove();
}
function addHeader(){
  const list=document.getElementById('headers-list');
  const row=document.createElement('div');
  row.className='header-row';
  row.style.cssText='display:grid;grid-template-columns:1fr 1fr auto;gap:8px;margin-top:8px';
  row.innerHTML=`<input type="text" placeholder="Header name" style="font-size:13px;padding:8px 10px;border:1.5px solid var(--surface3);border-radius:8px;background:var(--surface2);font-family:var(--sans);color:var(--ink);outline:none"><input type="text" placeholder="Value" style="font-size:13px;padding:8px 10px;border:1.5px solid var(--surface3);border-radius:8px;background:var(--surface2);font-family:var(--sans);color:var(--ink);outline:none"><button class="btn-danger" onclick="this.parentNode.remove()">✕</button>`;
  list.appendChild(row);
}
// SWAGGER UI — OpenAPI 3.0 SPEC
const openApiSpec={
  openapi:'3.0.0',
  info:{title:'Keenan Travel API',version:'1.0.0',description:'Complete REST API for the Keenan Travel B2C Platform. Covers Flights, Umrah, Holiday, Cruise, Visa, Customers, and Admin management.',contact:{name:'Keenan Travel Dev Team',email:'api@keenantravel.com'}},
  servers:[{url:'https://api.keenantravel.com/v1',description:'Production'},{url:'https://staging-api.keenantravel.com/v1',description:'Staging'},{url:'http://localhost:3000/v1',description:'Development'}],
  components:{
    securitySchemes:{
      BearerAuth:{type:'http',scheme:'bearer',bearerFormat:'JWT',description:'JWT token obtained from /auth/login'},
      ApiKeyAuth:{type:'apiKey',in:'header',name:'X-API-Key',description:'Static API key for server-to-server'}
    },
    schemas:{
      Booking:{type:'object',properties:{id:{type:'integer'},reference:{type:'string',example:'BK-8820'},customer_id:{type:'integer'},service_type:{type:'string',enum:['flight','umrah','holiday','cruise','visa']},amount:{type:'number',format:'float'},status:{type:'string',enum:['pending','confirmed','on_hold','cancelled']},created_at:{type:'string',format:'date-time'}}},
      Customer:{type:'object',properties:{id:{type:'integer'},first_name:{type:'string'},last_name:{type:'string'},email:{type:'string',format:'email'},phone:{type:'string'},nationality:{type:'string'},passport_number:{type:'string'},status:{type:'string',enum:['active','inactive','blocked']},total_bookings:{type:'integer'},total_spent:{type:'number'}}},
      VisaApplication:{type:'object',properties:{id:{type:'integer'},reference:{type:'string',example:'VA-4821'},customer_id:{type:'integer'},destination_country:{type:'string'},visa_type:{type:'string',enum:['tourist','business','transit','student']},travel_date:{type:'string',format:'date'},status:{type:'string',enum:['pending','processing','approved','rejected']},fee_paid:{type:'number'}}},
      UmrahPackage:{type:'object',properties:{id:{type:'integer'},name:{type:'string'},type:{type:'string',enum:['economy','standard','premium','vip']},nights:{type:'integer'},makkah_hotel:{type:'string'},madinah_hotel:{type:'string'},price_per_person:{type:'number'},visa_included:{type:'boolean'},flights_included:{type:'boolean'}}},
      HeroSlide:{type:'object',properties:{id:{type:'integer'},label:{type:'string'},title:{type:'string'},subtitle:{type:'string'},cta_text:{type:'string'},cta_link:{type:'string'},background_image_url:{type:'string'},background_gradient:{type:'string'},active:{type:'boolean'},sort_order:{type:'integer'}}},
      Error:{type:'object',properties:{error:{type:'string'},message:{type:'string'},statusCode:{type:'integer'}}}
    }
  },
  security:[{BearerAuth:[]}],
  paths:{
    '/flights/search':{post:{tags:['Flights'],summary:'Search live NDC flights',requestBody:{required:true,content:{'application/json':{schema:{type:'object',required:['from','to','date'],properties:{from:{type:'string',example:'DXB'},to:{type:'string',example:'LHR'},date:{type:'string',format:'date-time'},adult_count:{type:'integer',default:1},child_count:{type:'integer',default:0},infant_count:{type:'integer',default:0}}}}}},responses:{'200':{description:'List of available flight offers'}}}},
    '/flights/fare-confirm':{post:{tags:['Flights'],summary:'Confirm fare and bundles',requestBody:{required:true,content:{'application/json':{schema:{type:'object',required:['offerId'],properties:{offerId:{type:'string'}}}}}},responses:{'200':{description:'Confirmed offer details and available bundles'}}}},
    '/flights/add-passengers':{post:{tags:['Flights'],summary:'Add passengers to offer',requestBody:{required:true,content:{'application/json':{schema:{type:'object',required:['OfferId','Passengers'],properties:{OfferId:{type:'string'},Passengers:{type:'object'}}}}}},responses:{'200':{description:'Offer updated with passenger details'}}}},
    '/flights/book':{post:{tags:['Flights'],summary:'Book and Pay (Issue Ticket)',requestBody:{required:true,content:{'application/json':{schema:{type:'object',required:['offerId','stripePaymentIntentId'],properties:{offerId:{type:'string'},stripePaymentIntentId:{type:'string'},selectedBundles:{type:'array',items:{type:'string'}}}}}}},responses:{'200':{description:'Booking successful with PNR and ticket number'}}}},
    '/flights/hold':{post:{tags:['Flights'],summary:'Place booking on hold',requestBody:{required:true,content:{'application/json':{schema:{type:'object',required:['offerId'],properties:{offerId:{type:'string'},selectedBundles:{type:'array',items:{type:'string'}}}}}}},responses:{'200':{description:'Booking held successfully'}}}},
    '/flights/bookings':{get:{tags:['Flights'],summary:'List all flight bookings',parameters:[{name:'status',in:'query',schema:{type:'string',enum:['pending','confirmed','on_hold','cancelled']}},{name:'page',in:'query',schema:{type:'integer',default:1}},{name:'limit',in:'query',schema:{type:'integer',default:20}}],responses:{'200':{description:'Paginated list of bookings'}}}},
    '/flights/bookings/{id}':{get:{tags:['Flights'],summary:'Get booking details',parameters:[{name:'id',in:'path',required:true,schema:{type:'integer'}}],responses:{'200':{description:'Booking details'}}},put:{tags:['Flights'],summary:'Update booking (Admin)',parameters:[{name:'id',in:'path',required:true,schema:{type:'integer'}}],responses:{'200':{description:'Updated'}}},delete:{tags:['Flights'],summary:'Cancel booking',parameters:[{name:'id',in:'path',required:true,schema:{type:'integer'}}],responses:{'200':{description:'Cancelled'}}}},
    '/umrah/packages':{
      get:{tags:['Umrah'],summary:'List Umrah packages',responses:{'200':{description:'Array of Umrah packages',content:{'application/json':{schema:{type:'array',items:{$ref:'#/components/schemas/UmrahPackage'}}}}}}},
      post:{tags:['Umrah'],summary:'Create a new Umrah package',requestBody:{required:true,content:{'application/json':{schema:{$ref:'#/components/schemas/UmrahPackage'}}}},responses:{'201':{description:'Package created'}}}
    },
    '/umrah/packages/{id}':{get:{tags:['Umrah'],summary:'Get package details',parameters:[{name:'id',in:'path',required:true,schema:{type:'integer'}}],responses:{'200':{description:'Package details'}}},put:{tags:['Umrah'],summary:'Update package',parameters:[{name:'id',in:'path',required:true,schema:{type:'integer'}}],requestBody:{required:true,content:{'application/json':{schema:{$ref:'#/components/schemas/UmrahPackage'}}}},responses:{'200':{description:'Updated'}}},delete:{tags:['Umrah'],summary:'Delete package',parameters:[{name:'id',in:'path',required:true,schema:{type:'integer'}}],responses:{'204':{description:'Deleted'}}}},
    '/umrah/bookings':{get:{tags:['Umrah'],summary:'List Umrah bookings',responses:{'200':{description:'Umrah bookings list'}}},post:{tags:['Umrah'],summary:'Create Umrah booking',requestBody:{required:true,content:{'application/json':{schema:{type:'object',properties:{customer_id:{type:'integer'},package_id:{type:'integer'},pilgrims:{type:'integer'},travel_date:{type:'string',format:'date'}}}}}},responses:{'201':{description:'Booking created'}}}},
    '/holiday/packages':{get:{tags:['Holiday'],summary:'List holiday packages',responses:{'200':{description:'Holiday packages'}}},post:{tags:['Holiday'],summary:'Create holiday package',requestBody:{required:true,content:{'application/json':{schema:{type:'object'}}}},responses:{'201':{description:'Created'}}}},
    '/holiday/bookings':{get:{tags:['Holiday'],summary:'List holiday bookings',responses:{'200':{description:'Holiday bookings'}}},post:{tags:['Holiday'],summary:'Create holiday booking',requestBody:{required:true,content:{'application/json':{schema:{type:'object'}}}},responses:{'201':{description:'Created'}}}},
    '/cruise/packages':{get:{tags:['Cruise'],summary:'List cruise packages',responses:{'200':{description:'Cruise packages'}}},post:{tags:['Cruise'],summary:'Create cruise package',requestBody:{required:true,content:{'application/json':{schema:{type:'object'}}}},responses:{'201':{description:'Created'}}}},
    '/cruise/bookings':{get:{tags:['Cruise'],summary:'List cruise bookings',responses:{'200':{description:'Cruise bookings'}}},post:{tags:['Cruise'],summary:'Create cruise booking',requestBody:{required:true,content:{'application/json':{schema:{type:'object'}}}},responses:{'201':{description:'Created'}}}},
    '/visa/applications':{get:{tags:['Visa'],summary:'List visa applications',parameters:[{name:'status',in:'query',schema:{type:'string',enum:['pending','processing','approved','rejected']}}],responses:{'200':{description:'Visa applications list'}}},post:{tags:['Visa'],summary:'Submit visa application',requestBody:{required:true,content:{'application/json':{schema:{$ref:'#/components/schemas/VisaApplication'}}}},responses:{'201':{description:'Application submitted'}}}},
    '/visa/applications/{id}':{get:{tags:['Visa'],summary:'Get visa application',parameters:[{name:'id',in:'path',required:true,schema:{type:'integer'}}],responses:{'200':{description:'Application details'}}},put:{tags:['Visa'],summary:'Update visa application',parameters:[{name:'id',in:'path',required:true,schema:{type:'integer'}}],requestBody:{required:true,content:{'application/json':{schema:{$ref:'#/components/schemas/VisaApplication'}}}},responses:{'200':{description:'Updated'}}}},
    '/visa/applications/{id}/status':{patch:{tags:['Visa'],summary:'Update visa status',description:'Used by admin to approve or reject visa applications',parameters:[{name:'id',in:'path',required:true,schema:{type:'integer'}}],requestBody:{required:true,content:{'application/json':{schema:{type:'object',required:['status'],properties:{status:{type:'string',enum:['processing','approved','rejected']},notes:{type:'string',description:'Admin notes on decision'}}}}}},responses:{'200':{description:'Status updated'},'422':{description:'Invalid status transition'}}}},
    '/customers':{get:{tags:['Customers'],summary:'List customers',parameters:[{name:'search',in:'query',schema:{type:'string'}},{name:'status',in:'query',schema:{type:'string'}},{name:'page',in:'query',schema:{type:'integer'}}],responses:{'200':{description:'Customers list',content:{'application/json':{schema:{type:'object',properties:{data:{type:'array',items:{$ref:'#/components/schemas/Customer'}},total:{type:'integer'}}}}}}}},post:{tags:['Customers'],summary:'Create customer',requestBody:{required:true,content:{'application/json':{schema:{$ref:'#/components/schemas/Customer'}}}},responses:{'201':{description:'Customer created'}}}},
    '/customers/{id}':{get:{tags:['Customers'],summary:'Get customer profile',parameters:[{name:'id',in:'path',required:true,schema:{type:'integer'}}],responses:{'200':{description:'Customer profile'}}},put:{tags:['Customers'],summary:'Update customer',parameters:[{name:'id',in:'path',required:true,schema:{type:'integer'}}],requestBody:{required:true,content:{'application/json':{schema:{$ref:'#/components/schemas/Customer'}}}},responses:{'200':{description:'Updated'}}},delete:{tags:['Customers'],summary:'Delete customer',parameters:[{name:'id',in:'path',required:true,schema:{type:'integer'}}],responses:{'204':{description:'Deleted'}}}},
    '/admin/dashboard':{get:{tags:['Admin'],summary:'Get dashboard metrics',description:'Returns KPIs, recent bookings, activity feed, and revenue data',responses:{'200':{description:'Dashboard data',content:{'application/json':{schema:{type:'object',properties:{total_bookings:{type:'integer'},total_revenue:{type:'number'},active_customers:{type:'integer'},pending_actions:{type:'integer'},revenue_by_service:{type:'object'},recent_bookings:{type:'array'}}}}}}}}},
    '/admin/reports':{get:{tags:['Admin'],summary:'Generate report data',parameters:[{name:'type',in:'query',schema:{type:'string',enum:['revenue','bookings','customers','visa']}},{name:'period',in:'query',schema:{type:'string',enum:['monthly','quarterly','yearly']}},{name:'service',in:'query',schema:{type:'string'}}],responses:{'200':{description:'Report data generated'}}}},
    '/admin/hero-slides':{get:{tags:['Admin'],summary:'List hero slides',responses:{'200':{description:'All hero slides',content:{'application/json':{schema:{type:'array',items:{$ref:'#/components/schemas/HeroSlide'}}}}}}},post:{tags:['Admin'],summary:'Add a hero slide',requestBody:{required:true,content:{'application/json':{schema:{$ref:'#/components/schemas/HeroSlide'}}}},responses:{'201':{description:'Slide created'}}}},
    '/admin/hero-slides/{id}':{put:{tags:['Admin'],summary:'Update a hero slide',parameters:[{name:'id',in:'path',required:true,schema:{type:'integer'}}],requestBody:{required:true,content:{'application/json':{schema:{$ref:'#/components/schemas/HeroSlide'}}}},responses:{'200':{description:'Slide updated'}}},delete:{tags:['Admin'],summary:'Delete a hero slide',parameters:[{name:'id',in:'path',required:true,schema:{type:'integer'}}],responses:{'204':{description:'Slide deleted'}}}}
  }
};
let swaggerInitialized=false;
function initSwagger(){
  if(swaggerInitialized)return;
  if(typeof SwaggerUIBundle==='undefined'){
    document.getElementById('swagger-ui-container').innerHTML='<div style="padding:32px;text-align:center;color:var(--slate)"><div style="font-size:32px;margin-bottom:12px">⚠️</div><div>Swagger UI requires an internet connection to load.<br>Please check your network and reload the page.</div></div>';
    return;
  }
  SwaggerUIBundle({
    spec:openApiSpec,
    dom_id:'#swagger-ui-container',
    presets:[SwaggerUIBundle.presets.apis,SwaggerUIBundle.SwaggerUIStandalonePreset],
    layout:'BaseLayout',
    defaultModelsExpandDepth:1,
    defaultModelExpandDepth:1,
    docExpansion:'list',
    filter:true,
    persistAuthorization:true,
  });
  swaggerInitialized=true;
}
function downloadSpec(){
  const blob=new Blob([JSON.stringify(openApiSpec,null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);
  a.download='keenan-travel-api-spec.json';a.click();
  toast('OpenAPI spec downloaded as JSON','t-green');
}
// MYSQL DATABASE SCHEMA
const DB_TABLES=[
  {name:'customers',icon:'👤',desc:'Registered customer accounts',cols:[
    {name:'id',type:'INT',extra:'AUTO_INCREMENT',key:'PK',nullable:false,default:null},
    {name:'first_name',type:'VARCHAR(100)',extra:'',key:'',nullable:false,default:null},
    {name:'last_name',type:'VARCHAR(100)',extra:'',key:'',nullable:false,default:null},
    {name:'email',type:'VARCHAR(255)',extra:'',key:'UK',nullable:false,default:null},
    {name:'phone',type:'VARCHAR(30)',extra:'',key:'',nullable:true,default:'NULL'},
    {name:'nationality',type:'VARCHAR(100)',extra:'',key:'',nullable:true,default:'NULL'},
    {name:'date_of_birth',type:'DATE',extra:'',key:'',nullable:true,default:'NULL'},
    {name:'passport_number',type:'VARCHAR(50)',extra:'',key:'',nullable:true,default:'NULL'},
    {name:'passport_expiry',type:'DATE',extra:'',key:'',nullable:true,default:'NULL'},
    {name:'status',type:"ENUM('active','inactive','blocked')",extra:'',key:'',nullable:false,default:"'active'"},
    {name:'created_at',type:'TIMESTAMP',extra:'DEFAULT CURRENT_TIMESTAMP',key:'',nullable:false,default:null},
    {name:'updated_at',type:'TIMESTAMP',extra:'DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',key:'',nullable:false,default:null},
  ]},
  {name:'bookings',icon:'📋',desc:'Master bookings table across all services',cols:[
    {name:'id',type:'INT',extra:'AUTO_INCREMENT',key:'PK',nullable:false,default:null},
    {name:'reference',type:'VARCHAR(50)',extra:'UNIQUE',key:'UK',nullable:false,default:null},
    {name:'customer_id',type:'INT',extra:'',key:'FK',nullable:false,default:null},
    {name:'service_type',type:"ENUM('flight','umrah','holiday','cruise','visa')",extra:'',key:'',nullable:false,default:null},
    {name:'amount',type:'DECIMAL(12,2)',extra:'',key:'',nullable:false,default:null},
    {name:'currency',type:'VARCHAR(3)',extra:'',key:'',nullable:false,default:"'AED'"},
    {name:'status',type:"ENUM('pending','confirmed','on_hold','cancelled')",extra:'',key:'',nullable:false,default:"'pending'"},
    {name:'notes',type:'TEXT',extra:'',key:'',nullable:true,default:'NULL'},
    {name:'created_at',type:'TIMESTAMP',extra:'DEFAULT CURRENT_TIMESTAMP',key:'',nullable:false,default:null},
    {name:'updated_at',type:'TIMESTAMP',extra:'DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',key:'',nullable:false,default:null},
  ]},
  {name:'flight_bookings',icon:'✈',desc:'Flight-specific booking data',cols:[
    {name:'id',type:'INT',extra:'AUTO_INCREMENT',key:'PK',nullable:false,default:null},
    {name:'booking_id',type:'INT',extra:'',key:'FK',nullable:false,default:null},
    {name:'airline',type:'VARCHAR(100)',extra:'',key:'',nullable:false,default:null},
    {name:'flight_number',type:'VARCHAR(20)',extra:'',key:'',nullable:false,default:null},
    {name:'origin',type:'VARCHAR(10)',extra:'',key:'',nullable:false,default:null},
    {name:'destination',type:'VARCHAR(10)',extra:'',key:'',nullable:false,default:null},
    {name:'departure_datetime',type:'DATETIME',extra:'',key:'',nullable:false,default:null},
    {name:'arrival_datetime',type:'DATETIME',extra:'',key:'',nullable:false,default:null},
    {name:'cabin_class',type:"ENUM('economy','business','first')",extra:'',key:'',nullable:false,default:"'economy'"},
    {name:'pnr',type:'VARCHAR(20)',extra:'',key:'',nullable:true,default:'NULL'},
    {name:'ticket_number',type:'VARCHAR(50)',extra:'',key:'',nullable:true,default:'NULL'},
  ]},
  {name:'umrah_packages',icon:'🕌',desc:'Umrah pilgrimage packages',cols:[
    {name:'id',type:'INT',extra:'AUTO_INCREMENT',key:'PK',nullable:false,default:null},
    {name:'name',type:'VARCHAR(255)',extra:'',key:'',nullable:false,default:null},
    {name:'type',type:"ENUM('economy','standard','premium','vip')",extra:'',key:'',nullable:false,default:null},
    {name:'nights',type:'INT',extra:'',key:'',nullable:false,default:null},
    {name:'makkah_hotel',type:'VARCHAR(255)',extra:'',key:'',nullable:false,default:null},
    {name:'madinah_hotel',type:'VARCHAR(255)',extra:'',key:'',nullable:false,default:null},
    {name:'price_per_person',type:'DECIMAL(10,2)',extra:'',key:'',nullable:false,default:null},
    {name:'visa_included',type:'TINYINT(1)',extra:'',key:'',nullable:false,default:'1'},
    {name:'flights_included',type:'TINYINT(1)',extra:'',key:'',nullable:false,default:'1'},
    {name:'transport_type',type:"ENUM('private','shared','group')",extra:'',key:'',nullable:false,default:"'shared'"},
    {name:'max_capacity',type:'INT',extra:'',key:'',nullable:true,default:'NULL'},
    {name:'is_active',type:'TINYINT(1)',extra:'',key:'',nullable:false,default:'1'},
    {name:'created_at',type:'TIMESTAMP',extra:'DEFAULT CURRENT_TIMESTAMP',key:'',nullable:false,default:null},
  ]},
  {name:'umrah_bookings',icon:'🕌',desc:'Umrah booking records',cols:[
    {name:'id',type:'INT',extra:'AUTO_INCREMENT',key:'PK',nullable:false,default:null},
    {name:'booking_id',type:'INT',extra:'',key:'FK',nullable:false,default:null},
    {name:'package_id',type:'INT',extra:'',key:'FK',nullable:false,default:null},
    {name:'num_pilgrims',type:'INT',extra:'',key:'',nullable:false,default:'1'},
    {name:'departure_date',type:'DATE',extra:'',key:'',nullable:false,default:null},
    {name:'departure_city',type:'VARCHAR(100)',extra:'',key:'',nullable:false,default:null},
  ]},
  {name:'holiday_packages',icon:'🌴',desc:'Holiday & leisure packages',cols:[
    {name:'id',type:'INT',extra:'AUTO_INCREMENT',key:'PK',nullable:false,default:null},
    {name:'name',type:'VARCHAR(255)',extra:'',key:'',nullable:false,default:null},
    {name:'destination',type:'VARCHAR(100)',extra:'',key:'',nullable:false,default:null},
    {name:'country_code',type:'VARCHAR(3)',extra:'',key:'',nullable:false,default:null},
    {name:'nights',type:'INT',extra:'',key:'',nullable:false,default:null},
    {name:'star_rating',type:'INT',extra:'CHECK (star_rating BETWEEN 1 AND 5)',key:'',nullable:false,default:null},
    {name:'price_per_person',type:'DECIMAL(10,2)',extra:'',key:'',nullable:false,default:null},
    {name:'meal_plan',type:"ENUM('room_only','bed_breakfast','half_board','full_board','all_inclusive')",extra:'',key:'',nullable:false,default:"'bed_breakfast'"},
    {name:'flights_included',type:'TINYINT(1)',extra:'',key:'',nullable:false,default:'1'},
    {name:'is_active',type:'TINYINT(1)',extra:'',key:'',nullable:false,default:'1'},
    {name:'created_at',type:'TIMESTAMP',extra:'DEFAULT CURRENT_TIMESTAMP',key:'',nullable:false,default:null},
  ]},
  {name:'cruise_packages',icon:'🚢',desc:'Cruise voyage packages',cols:[
    {name:'id',type:'INT',extra:'AUTO_INCREMENT',key:'PK',nullable:false,default:null},
    {name:'name',type:'VARCHAR(255)',extra:'',key:'',nullable:false,default:null},
    {name:'ship_name',type:'VARCHAR(100)',extra:'',key:'',nullable:false,default:null},
    {name:'cruise_line',type:'VARCHAR(100)',extra:'',key:'',nullable:false,default:null},
    {name:'route',type:'VARCHAR(255)',extra:'',key:'',nullable:false,default:null},
    {name:'departure_port',type:'VARCHAR(100)',extra:'',key:'',nullable:false,default:null},
    {name:'departure_date',type:'DATE',extra:'',key:'',nullable:false,default:null},
    {name:'nights',type:'INT',extra:'',key:'',nullable:false,default:null},
    {name:'cabin_type',type:"ENUM('interior','ocean_view','balcony','suite')",extra:'',key:'',nullable:false,default:"'ocean_view'"},
    {name:'price_per_person',type:'DECIMAL(10,2)',extra:'',key:'',nullable:false,default:null},
    {name:'is_active',type:'TINYINT(1)',extra:'',key:'',nullable:false,default:'1'},
    {name:'created_at',type:'TIMESTAMP',extra:'DEFAULT CURRENT_TIMESTAMP',key:'',nullable:false,default:null},
  ]},
  {name:'visa_applications',icon:'🛂',desc:'Visa application records',cols:[
    {name:'id',type:'INT',extra:'AUTO_INCREMENT',key:'PK',nullable:false,default:null},
    {name:'reference',type:'VARCHAR(50)',extra:'UNIQUE',key:'UK',nullable:false,default:null},
    {name:'customer_id',type:'INT',extra:'',key:'FK',nullable:false,default:null},
    {name:'nationality',type:'VARCHAR(100)',extra:'',key:'',nullable:false,default:null},
    {name:'destination_country',type:'VARCHAR(100)',extra:'',key:'',nullable:false,default:null},
    {name:'visa_type',type:"ENUM('tourist','business','transit','student')",extra:'',key:'',nullable:false,default:null},
    {name:'travel_date',type:'DATE',extra:'',key:'',nullable:false,default:null},
    {name:'passport_number',type:'VARCHAR(50)',extra:'',key:'',nullable:false,default:null},
    {name:'fee_paid',type:'DECIMAL(8,2)',extra:'',key:'',nullable:false,default:null},
    {name:'status',type:"ENUM('pending','processing','approved','rejected')",extra:'',key:'',nullable:false,default:"'pending'"},
    {name:'admin_notes',type:'TEXT',extra:'',key:'',nullable:true,default:'NULL'},
    {name:'decision_at',type:'DATETIME',extra:'',key:'',nullable:true,default:'NULL'},
    {name:'decided_by',type:'INT',extra:'',key:'FK',nullable:true,default:'NULL'},
    {name:'created_at',type:'TIMESTAMP',extra:'DEFAULT CURRENT_TIMESTAMP',key:'',nullable:false,default:null},
    {name:'updated_at',type:'TIMESTAMP',extra:'DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',key:'',nullable:false,default:null},
  ]},
  {name:'hero_slides',icon:'🖼',desc:'Homepage hero slider content',cols:[
    {name:'id',type:'INT',extra:'AUTO_INCREMENT',key:'PK',nullable:false,default:null},
    {name:'label',type:'VARCHAR(200)',extra:'',key:'',nullable:true,default:'NULL'},
    {name:'title',type:'VARCHAR(255)',extra:'',key:'',nullable:false,default:null},
    {name:'subtitle',type:'TEXT',extra:'',key:'',nullable:true,default:'NULL'},
    {name:'cta_text',type:'VARCHAR(100)',extra:'',key:'',nullable:true,default:'NULL'},
    {name:'cta_link',type:'VARCHAR(50)',extra:'',key:'',nullable:true,default:'NULL'},
    {name:'background_image_url',type:'TEXT',extra:'',key:'',nullable:true,default:'NULL'},
    {name:'background_gradient',type:'VARCHAR(255)',extra:'',key:'',nullable:true,default:'NULL'},
    {name:'is_active',type:'TINYINT(1)',extra:'',key:'',nullable:false,default:'1'},
    {name:'sort_order',type:'INT',extra:'',key:'',nullable:false,default:'0'},
    {name:'created_at',type:'TIMESTAMP',extra:'DEFAULT CURRENT_TIMESTAMP',key:'',nullable:false,default:null},
    {name:'updated_at',type:'TIMESTAMP',extra:'DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',key:'',nullable:false,default:null},
  ]},
  {name:'admin_users',icon:'👨‍💼',desc:'Admin panel user accounts',cols:[
    {name:'id',type:'INT',extra:'AUTO_INCREMENT',key:'PK',nullable:false,default:null},
    {name:'name',type:'VARCHAR(200)',extra:'',key:'',nullable:false,default:null},
    {name:'email',type:'VARCHAR(255)',extra:'',key:'UK',nullable:false,default:null},
    {name:'password_hash',type:'VARCHAR(255)',extra:'',key:'',nullable:false,default:null},
    {name:'role',type:"ENUM('super_admin','manager','agent')",extra:'',key:'',nullable:false,default:"'agent'"},
    {name:'last_login',type:'DATETIME',extra:'',key:'',nullable:true,default:'NULL'},
    {name:'is_active',type:'TINYINT(1)',extra:'',key:'',nullable:false,default:'1'},
    {name:'created_at',type:'TIMESTAMP',extra:'DEFAULT CURRENT_TIMESTAMP',key:'',nullable:false,default:null},
  ]},
  {name:'api_configurations',icon:'⚙️',desc:'API integration settings',cols:[
    {name:'id',type:'INT',extra:'AUTO_INCREMENT',key:'PK',nullable:false,default:null},
    {name:'environment',type:"ENUM('production','staging','development')",extra:'',key:'',nullable:false,default:null},
    {name:'base_url',type:'VARCHAR(500)',extra:'',key:'',nullable:false,default:null},
    {name:'api_key_encrypted',type:'TEXT',extra:'',key:'',nullable:false,default:null},
    {name:'timeout_ms',type:'INT',extra:'',key:'',nullable:false,default:'5000'},
    {name:'is_active',type:'TINYINT(1)',extra:'',key:'',nullable:false,default:'1'},
    {name:'last_tested_at',type:'DATETIME',extra:'',key:'',nullable:true,default:'NULL'},
    {name:'created_at',type:'TIMESTAMP',extra:'DEFAULT CURRENT_TIMESTAMP',key:'',nullable:false,default:null},
  ]},
  {name:'audit_log',icon:'📜',desc:'System audit trail for all admin actions',cols:[
    {name:'id',type:'BIGINT',extra:'AUTO_INCREMENT',key:'PK',nullable:false,default:null},
    {name:'admin_id',type:'INT',extra:'',key:'FK',nullable:false,default:null},
    {name:'action',type:'VARCHAR(100)',extra:'',key:'',nullable:false,default:null},
    {name:'entity_type',type:'VARCHAR(50)',extra:'',key:'',nullable:false,default:null},
    {name:'entity_id',type:'INT',extra:'',key:'',nullable:true,default:'NULL'},
    {name:'old_values',type:'JSON',extra:'',key:'',nullable:true,default:'NULL'},
    {name:'new_values',type:'JSON',extra:'',key:'',nullable:true,default:'NULL'},
    {name:'ip_address',type:'VARCHAR(45)',extra:'',key:'',nullable:true,default:'NULL'},
    {name:'created_at',type:'TIMESTAMP',extra:'DEFAULT CURRENT_TIMESTAMP',key:'',nullable:false,default:null},
  ]},
];
function renderSchemaNav(){
  const nav=document.getElementById('schema-nav');
  if(!nav)return;
  nav.innerHTML=DB_TABLES.map((t,i)=>`<button class="stab-item${i===0?' act':''}" onclick="showTableSchema(${i},this)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="9" x2="9" y2="21"/></svg>${t.icon} ${t.name}</button>`).join('');
  showTableSchema(0,nav.querySelector('.stab-item'));
}
function showTableSchema(idx,el){
  document.querySelectorAll('.stab-item').forEach(e=>e.classList.remove('act'));
  if(el)el.classList.add('act');
  const t=DB_TABLES[idx];
  const d=document.getElementById('schema-detail');
  if(!d)return;
  const keyBadge=k=>k?`<span class="col-key ${k==='PK'?'col-pk':k==='FK'?'col-fk':'col-uk'}">${k}</span>`:'';
  d.innerHTML=`
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
      <span style="font-size:28px">${t.icon}</span>
      <div><div style="font-family:var(--serif);font-size:22px;font-weight:700;color:var(--ink)">${t.name}</div><div class="fs13 slate2">${t.desc} · ${t.cols.length} columns</div></div>
    </div>
    <table class="schema-col-table">
      <thead><tr><th>Column</th><th>Type</th><th>Key</th><th>Nullable</th><th>Default</th><th>Extra</th></tr></thead>
      <tbody>${t.cols.map(c=>`<tr><td style="font-weight:${c.key==='PK'?'700':'500'};font-family:monospace;font-size:13px">${c.name}</td><td><span class="col-type">${c.type}</span></td><td>${keyBadge(c.key)}</td><td style="color:${c.nullable?'var(--amber)':'var(--green)'};font-size:12px;font-weight:700">${c.nullable?'YES':'NO'}</td><td style="font-family:monospace;font-size:12px;color:var(--slate2)">${c.default||'—'}</td><td style="font-size:12px;color:var(--slate2)">${c.extra||'—'}</td></tr>`).join('')}</tbody>
    </table>
    <div style="margin-top:24px">
      <div style="font-size:13px;font-weight:700;color:var(--slate2);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">CREATE TABLE Statement</div>
      <div class="sql-block"><button class="sql-copy-btn" onclick="navigator.clipboard.writeText(getTableSql(${idx}));toast('SQL copied!','t-green')">Copy</button><div>${renderSql(t)}</div></div>
    </div>`;
}
function getTableSql(idx){return generateSql(DB_TABLES[idx])}
function generateSql(t){
  const lines=t.cols.map(c=>{
    let l=`  \`${c.name}\` ${c.type}`;
    if(c.key==='PK')l+=' PRIMARY KEY';
    if(c.extra&&!c.extra.includes('CURRENT_TIMESTAMP'))l+=` ${c.extra}`;
    if(!c.nullable&&c.key!=='PK')l+=' NOT NULL';
    if(c.default!==null)l+=` DEFAULT ${c.default}`;
    if(c.extra&&c.extra.includes('CURRENT_TIMESTAMP'))l+=` ${c.extra}`;
    return l;
  });
  // Add foreign keys
  const fks=t.cols.filter(c=>c.key==='FK').map(c=>`  INDEX \`idx_${t.name}_${c.name}\` (\`${c.name}\`)`);
  const uks=t.cols.filter(c=>c.key==='UK').map(c=>`  UNIQUE KEY \`uk_${t.name}_${c.name}\` (\`${c.name}\`)`);
  return `CREATE TABLE \`${t.name}\` (\n${[...lines,...uks,...fks].join(',\n')}\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`;
}
function renderSql(t){
  // IMPORTANT: longer/specific patterns must be replaced before shorter ones
  // e.g. DEFAULT CHARSET before DEFAULT, CURRENT_TIMESTAMP variants before bare DEFAULT
  return generateSql(t)
    .replace(/CREATE TABLE/g,'<span class="sql-kw">CREATE TABLE</span>')
    .replace(/PRIMARY KEY/g,'<span class="sql-kw">PRIMARY KEY</span>')
    .replace(/UNIQUE KEY/g,'<span class="sql-kw">UNIQUE KEY</span>')
    .replace(/NOT NULL/g,'<span class="sql-kw">NOT NULL</span>')
    .replace(/AUTO_INCREMENT/g,'<span class="sql-type">AUTO_INCREMENT</span>')
    .replace(/DEFAULT CHARSET=utf8mb4/g,'<span class="sql-kw">DEFAULT CHARSET</span>=<span class="sql-str">utf8mb4</span>')
    .replace(/COLLATE=utf8mb4_unicode_ci/g,'<span class="sql-kw">COLLATE</span>=<span class="sql-str">utf8mb4_unicode_ci</span>')
    .replace(/ENGINE=InnoDB/g,'<span class="sql-kw">ENGINE</span>=<span class="sql-str">InnoDB</span>')
    .replace(/DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP/g,'<span class="sql-kw">DEFAULT</span> <span class="sql-str">CURRENT_TIMESTAMP</span> <span class="sql-kw">ON UPDATE</span> <span class="sql-str">CURRENT_TIMESTAMP</span>')
    .replace(/DEFAULT CURRENT_TIMESTAMP/g,'<span class="sql-kw">DEFAULT</span> <span class="sql-str">CURRENT_TIMESTAMP</span>')
    .replace(/DEFAULT /g,'<span class="sql-kw">DEFAULT</span> ')
    .replace(/INDEX /g,'<span class="sql-kw">INDEX</span> ')
    .replace(/CHECK /g,'<span class="sql-kw">CHECK</span> ')
    .replace(/'([^'<]+)'/g,"<span class=\"sql-str\">'$1'</span>")
    .replace(/\n/g,'<br>');
}
function erdClick(idx){
  // Switch to the Schema Explorer tab using correct string ID
  const schemaTab=document.querySelector('#ap-database .a-tab');
  if(schemaTab)aTab(schemaTab,'db-schema');
  // Show schema and highlight correct nav item
  const navItems=document.querySelectorAll('.stab-item');
  showTableSchema(idx,navItems[idx]||null);
}
function renderERD(){
  const wrap=document.getElementById('erd-wrap');
  if(!wrap)return;
  wrap.innerHTML=DB_TABLES.map((t,i)=>`
    <div class="erd-table" onclick="erdClick(${i})">
      <div class="erd-table-head">${t.icon} ${t.name}</div>
      ${t.cols.slice(0,5).map(c=>`<div class="erd-table-col${c.key==='PK'?' pk':c.key==='FK'?' fk':''}">${c.key?'🔑 ':c.name.includes('_id')?'↗ ':' '}<code style="font-size:11px">${c.name}</code></div>`).join('')}
      ${t.cols.length>5?`<div class="erd-table-col" style="color:var(--slate3);font-style:italic">+ ${t.cols.length-5} more…</div>`:''}
    </div>`).join('');
}
function renderFullSql(){
  const el=document.getElementById('full-sql-content');
  if(!el)return;
  const today=new Date().toLocaleDateString('en-GB',{year:'numeric',month:'long',day:'numeric'});
  const header=
    `<span class="sql-cm">-- =====================================================<br>`
    +`-- Keenan Travel — MySQL Database Schema<br>`
    +`-- MySQL 8.0+  ·  Generated ${today}<br>`
    +`-- =====================================================</span><br><br>`
    +`<span class="sql-kw">CREATE DATABASE IF NOT EXISTS</span> <span class="sql-str">\`keenan_travel\`</span> <span class="sql-kw">CHARACTER SET</span> <span class="sql-str">utf8mb4</span> <span class="sql-kw">COLLATE</span> <span class="sql-str">utf8mb4_unicode_ci</span>;<br>`
    +`<span class="sql-kw">USE</span> <span class="sql-str">\`keenan_travel\`</span>;<br>`
    +`<span class="sql-kw">SET</span> FOREIGN_KEY_CHECKS = <span class="sql-num">0</span>;<br><br>`;
  const tables=DB_TABLES.map(t=>`<span class="sql-cm">-- Table: \`${t.name}\` — ${t.desc}</span><br>${renderSql(t)}<br><br>`).join('');
  el.innerHTML=header+tables+`<span class="sql-kw">SET</span> FOREIGN_KEY_CHECKS = <span class="sql-num">1</span>;`;
}
function copySql(){
  const sql=DB_TABLES.map(t=>`-- ${t.desc}\n${generateSql(t)}`).join('\n\n');
  navigator.clipboard.writeText(sql);toast('Full SQL schema copied to clipboard!','t-green');
}
function downloadSql(){
  const header=`-- Keenan Travel Database Schema\n-- MySQL 8.0+\n-- Generated ${new Date().toLocaleDateString()}\n\nCREATE DATABASE IF NOT EXISTS keenan_travel CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\nUSE keenan_travel;\nSET FOREIGN_KEY_CHECKS = 0;\n\n`;
  const sql=header+DB_TABLES.map(t=>`-- ${t.name}: ${t.desc}\n${generateSql(t)}\n`).join('\n')+'\nSET FOREIGN_KEY_CHECKS = 1;';
  const blob=new Blob([sql],{type:'text/sql'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);
  a.download='keenan_travel_schema.sql';a.click();
  toast('MySQL schema downloaded as .sql','t-green');
}
// VIEW ROUTING
const VIEWS=['home','results-flights','results-umrah','results-holiday','results-cruise','results-visa','detail','booking','confirmation','track','admin','admin-login','umrah-detail','holiday-detail'];
function go(name){
  VIEWS.forEach(v=>{const el=document.getElementById('view-'+v);if(el)el.classList.remove('on')});
  const el=document.getElementById('view-'+name);
  if(el){el.classList.add('on');window.scrollTo(0,0)}
  const nav=document.getElementById('site-nav');
  if(nav)nav.style.display=(name==='admin'||name==='admin-login')?'none':'flex';
  document.querySelectorAll('.nl').forEach(n=>n.classList.remove('act'));
  if(name==='home')document.querySelector('.nl')?.classList.add('act');
  if(name.startsWith('results-'))buildResults(name.replace('results-',''));
}
function goSearch(tab){
  go('home');
  setTimeout(()=>{
    document.querySelectorAll('.sw-tab').forEach(t=>t.classList.remove('act'));
    const t=document.querySelector(`.sw-tab[data-tab="${tab}"]`);
    if(t){t.classList.add('act');swTab(tab,t)}
    document.querySelector('.search-widget')?.scrollIntoView({behavior:'smooth'});
  },50);
}
function swTab(tab,el){
  document.querySelectorAll('.sw-tab').forEach(t=>t.classList.remove('act'));
  el.classList.add('act');
  ['flights','umrah','holiday','cruise','visa'].forEach(t=>{
    const b=document.getElementById('sw-'+t);
    if(b)b.classList.toggle('act',t===tab);
  });
}
// RESULTS BUILDER
window.RESULTS_BY_COUNTRY = {
  AE: {
    flights:{title:'Flight Results',sub:'Searching...',items:[]},
    holiday:{title:'Holiday Packages',sub:'July 2026 · 2 Adults · 18 packages found',
      items:[
        {name:'Maldives Escape · 7 Nights',tags:['5★ Overwater Villa','All Inclusive','Flights Included'],meta:['Private beach & lagoon · Water sports · Complimentary spa'],price:6499,currency:'AED',plabel:'per person',rating:'4.9',bg:'#0d3d52'},
        {name:'Bali Discovery · 10 Nights',tags:['4★ Private Pool Villa','Half Board','Flights Included'],meta:['Temple tours included · Rice terrace trekking'],price:4850,currency:'AED',plabel:'per person',rating:'4.8',bg:'#3d1a0d'},
        {name:'Istanbul Cultural · 5 Nights',tags:['4★ Boutique Hotel','Breakfast','Flights Included'],meta:['Guided Bosphorus cruise · Blue Mosque tour'],price:2899,currency:'AED',plabel:'per person',rating:'4.7',bg:'#1a2d3d'},
      ]},
    cruise:{title:'Mediterranean Cruises',sub:'Departing August 2026 · 2 Guests · 9 cruises found',
      items:[
        {name:'MSC Grandiosa · 10 Nights',tags:['Mediterranean','6 Ports','Ocean View Cabin'],meta:['Rome · Barcelona · Marseille · Palermo · All dining included'],price:4199,currency:'AED',plabel:'per person',rating:'4.7',bg:'#1a3060'},
        {name:'Arabian Gulf Explorer · 7 Nights',tags:['Arabian Gulf','4 Ports','Balcony Cabin'],meta:['Dubai · Muscat · Abu Dhabi · All dining included'],price:3650,currency:'AED',plabel:'per person',rating:'4.9',bg:'#1a2040'},
      ]},
    visa:{title:'UK Visa — Tourist',sub:'UAE Nationality · Travel: September 2026',
      items:[
        {name:'UK Standard Visitor Visa',tags:['Tourist','6 Months','Multiple Entry','10 Year Validity'],meta:['5–10 business days · 94% approval rate for UAE nationals'],price:450,currency:'AED',plabel:'per applicant · all fees included',rating:'',bg:'#0d2040'},
        {name:'UK Priority Visitor Visa',tags:['Tourist · Priority','6 Months','Multiple Entry'],meta:['3–5 business days · Dedicated case officer'],price:820,currency:'AED',plabel:'per applicant · priority processing',rating:'',bg:'#1a1a40'},
      ]},
  },
  PK: {
    flights:{title:'Flight Results',sub:'Searching...',items:[]},
    holiday:{title:'Holiday Packages',sub:'July 2026 · 2 Adults · 10 packages found',
      items:[
        {name:'Turkey Explorer · 7 Nights',tags:['4★ Hotel','Breakfast','Flights Included'],meta:['Istanbul & Cappadocia · Guided Tours'],price:280000,currency:'PKR',plabel:'per person',rating:'4.7',bg:'#1a2d3d'},
        {name:'Baku Escape · 5 Nights',tags:['4★ Hotel','Breakfast','Flights Included'],meta:['City tour included · Visa assistance'],price:190000,currency:'PKR',plabel:'per person',rating:'4.5',bg:'#3d1a0d'},
        {name:'Dubai Shopping Festival · 5 Nights',tags:['3★ Hotel','Breakfast','Flights Included'],meta:['Close to metro · Desert Safari included'],price:150000,currency:'PKR',plabel:'per person',rating:'4.6',bg:'#0d3d52'},
      ]},
    cruise:{title:'Arabian Gulf Cruises',sub:'Departing August 2026 · 2 Guests · 3 cruises found',
      items:[
        {name:'Arabian Gulf Explorer · 7 Nights',tags:['Arabian Gulf','4 Ports','Balcony Cabin'],meta:['Dubai · Muscat · Abu Dhabi · (Connecting flight KHI-DXB included)'],price:295000,currency:'PKR',plabel:'per person',rating:'4.9',bg:'#1a2040'},
      ]},
    visa:{title:'UAE Visa — Tourist',sub:'Pakistan Nationality · Travel: September 2026',
      items:[
        {name:'UAE 30 Days Tourist Visa',tags:['Tourist','30 Days','Single Entry'],meta:['3–5 business days'],price:25000,currency:'PKR',plabel:'per applicant · all fees included',rating:'',bg:'#0d2040'},
        {name:'UAE 60 Days Tourist Visa',tags:['Tourist','60 Days','Single Entry'],meta:['3–5 business days'],price:45000,currency:'PKR',plabel:'per applicant · all fees included',rating:'',bg:'#1a1a40'},
      ]},
  }
};
window.buildResults = function(type){
  if(type === 'umrah' || type === 'flights') return;
  const el=document.getElementById('view-results-'+type);
  const code = (window.KT && window.KT.get().code) || 'AE';
  const d=window.RESULTS_BY_COUNTRY[code] && window.RESULTS_BY_COUNTRY[code][type];
  if(!d||!el)return;
  const isVisa=type==='visa';
  const dest=isVisa?'detail':'booking';
  const cards=d.items.map(it=>`
    <div class="result-card" onclick="go('${dest}')">
      <div class="rc-img" style="background:${it.bg}"></div>
      <div class="rc-body">
        <div class="rc-name">${it.name}</div>
        <div class="rc-tags">${it.tags.map((t,i)=>`<span class="rc-tag${i===0?' gold':''}">${t}</span>`).join('')}</div>
        <div class="rc-meta">${it.meta.map(m=>`<span>· ${m}</span>`).join('')}</div>
        ${it.rating?`<div style="display:flex;align-items:center;gap:5px;font-size:13px;margin-top:8px"><span style="color:var(--gold)">★</span><strong>${it.rating}</strong><span style="font-size:12px;color:var(--slate2)">Excellent</span></div>`:''}
      </div>
      <div class="rc-price-col">
        <div><div class="rc-price">${window.formatPrice(it.price, it.currency)}</div><div class="rc-price-label">${it.plabel}</div></div>
        <button class="btn-gold btn-sm" onclick="event.stopPropagation();go('${dest}')">${isVisa?'Apply Now':'Book Now'}</button>
        <div style="font-size:11px;color:var(--slate3)">Free cancellation 24h</div>
      </div>
    </div>`).join('');
  el.innerHTML=`
    <div class="results-hero">
      <div class="results-inner">
        <div class="breadcrumb"><span onclick="go('home')">Home</span><span>›</span><span>${type.charAt(0).toUpperCase()+type.slice(1)}</span><span>›</span><span style="color:rgba(255,255,255,.7)">${d.title}</span></div>
        <div style="font-family:var(--serif);font-size:28px;font-weight:700;color:var(--white);margin-bottom:6px">${d.title}</div>
        <div style="color:rgba(255,255,255,.5);font-size:14px">${d.sub}</div>
      </div>
    </div>
    <div class="results-layout">
      <div class="filter-panel">
        <div class="fp-head"><div style="font-size:14px;font-weight:700;color:var(--ink)">Filters</div><button style="background:none;border:none;font-size:12px;color:var(--gold3);font-weight:600;cursor:pointer;font-family:var(--sans)">Clear all</button></div>
        <div class="fp-section"><div class="fp-label">Price Range</div><input type="range" style="width:100%;accent-color:var(--gold);margin:8px 0" min="0" max="15000" value="12000"><div style="display:flex;justify-content:space-between;font-size:12px;color:var(--slate2)"><span>AED 0</span><span>AED 12,000</span></div></div>
        <div class="fp-section"><div class="fp-label">Rating</div><label class="fp-check"><input type="checkbox" checked> 5 Stars</label><label class="fp-check"><input type="checkbox" checked> 4+ Stars</label><label class="fp-check"><input type="checkbox"> 3+ Stars</label></div>
        <div class="fp-section"><div class="fp-label">Includes</div><label class="fp-check"><input type="checkbox" checked> Flights</label><label class="fp-check"><input type="checkbox" checked> Meals</label><label class="fp-check"><input type="checkbox"> Transfer</label></div>
      </div>
      <div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:10px">
          <div style="font-size:14px;color:var(--slate)">${d.items.length} results found</div>
          <select class="tbl-select"><option>Sort: Recommended</option><option>Sort: Lowest Price</option><option>Sort: Highest Rated</option></select>
        </div>
        ${cards}
      </div>
    </div>`;
}
// BOOKING STEPS
function goStep(n){
  if(n===4){
    document.getElementById('bstep-3').style.display='none';
    document.getElementById('bstep-4').style.display='block';
    document.getElementById('fn3').className='snum done';document.getElementById('fn3').textContent='✓';
    document.getElementById('fl3').className='sline done';
    document.getElementById('fn4').className='snum curr';
    document.getElementById('sl4').className='slabel curr';
  }else if(n===5){
    // Mark step 4 as done before navigating
    const fn4=document.getElementById('fn4');
    const fl4=document.getElementById('fl4');
    const sl4=document.getElementById('sl4');
    if(fn4){fn4.className='snum done';fn4.textContent='✓'}
    if(fl4)fl4.className='sline done';
    if(sl4)sl4.className='slabel done';
    go('confirmation');
  }
}
// ADMIN PANELS
const PANELS=['dashboard','orders','customers','flights','umrah','holiday','cruise','visa','hero','api','swagger','database','reports','settings'];
const PANEL_META={
  dashboard:{title:'Dashboard',sub:'Overview of all services · April 2026'},
  orders:{title:'All Orders',sub:'1,284 total bookings across all services'},
  customers:{title:'Customers',sub:'3,891 registered customers'},
  flights:{title:'Flights Management',sub:'612 bookings this month'},
  umrah:{title:'Umrah Management',sub:'284 bookings this month'},
  holiday:{title:'Holiday Packages',sub:'198 bookings this month'},
  cruise:{title:'Cruise Management',sub:'87 bookings this month'},
  visa:{title:'Visa Services',sub:'103 applications this month — 23 pending'},
  hero:{title:'Hero Slider Manager',sub:'Control homepage hero images, titles, and auto-play settings'},
  api:{title:'API Integration',sub:'Configure backend API connection, test endpoints, and view request logs'},
  swagger:{title:'API Documentation',sub:'Interactive Swagger UI — OpenAPI 3.0 · Keenan Travel REST API v1.0'},
  database:{title:'MySQL Database',sub:'Schema explorer, ERD diagram, and SQL export'},
  reports:{title:'Reports & Analytics',sub:'Revenue and booking performance data'},
  settings:{title:'Settings',sub:'System configuration and admin users'},
};
function aPanel(name,el){
  if (typeof window.resetState === 'function') window.resetState();
  document.querySelectorAll('.admin-content > div[id^="ap-"]').forEach(p=>{p.style.display='none'});
  const e=document.getElementById('ap-'+name);if(e)e.style.display='block';
  document.querySelectorAll('.an-item').forEach(i=>i.classList.remove('act'));
  if(el)el.classList.add('act');
  const meta=PANEL_META[name]||{title:name.charAt(0).toUpperCase() + name.slice(1),sub:''};
  const tEl = document.getElementById('aTitle'); if(tEl) tEl.textContent=meta.title;
  const sEl = document.getElementById('aSub'); if(sEl) sEl.textContent=meta.sub;
  // Lazy init panels
  if(name==='hero')renderSlideManager();
  if(name==='swagger')setTimeout(initSwagger,100);
  if(name==='database'){renderSchemaNav();renderERD();renderFullSql()}
  if(name==='api')syncEndpoints();
  if(name==='refunds' && typeof window.loadRefunds === 'function') window.loadRefunds();
  if(name==='reissues' && typeof window.loadReissues === 'function') window.loadReissues();
}
function aTab(el,targetId){
  const tabEl=el.closest('.a-tabs');
  tabEl.querySelectorAll('.a-tab').forEach(t=>t.classList.remove('act'));
  el.classList.add('act');
  const container=tabEl.nextElementSibling?.parentElement||el.closest('.admin-content');
  container.querySelectorAll('.a-tab-c').forEach(c=>c.classList.remove('act'));
  const t=document.getElementById(targetId);if(t)t.classList.add('act');
  if (targetId === 'at-f3' && typeof window.loadAirlineDiscounts === 'function') window.loadAirlineDiscounts();
}
// TABLE FILTER ENGINE
const FILTER_CFG={
  orders:  {tbody:'tbody-orders', search:'srch-orders', filters:[['flt-ord-svc','service'],['flt-ord-st','status'],['flt-ord-dt',null]]},
  flights: {tbody:'tbody-flt',    search:'srch-flt',    filters:[['flt-flt-st','status'],['flt-flt-airline','airline'],['flt-flt-class','class']]},
  umrah:   {tbody:'tbody-um',     search:'srch-um',     filters:[['flt-um-type','type'],['flt-um-nights','nights'],['flt-um-visa','visa']]},
  holiday: {tbody:'tbody-ho',     search:'srch-ho',     filters:[['flt-ho-dest','dest'],['flt-ho-stars','stars'],['flt-ho-meal','meal'],['flt-ho-st','status']]},
  cruise:  {tbody:'tbody-cr',     search:'srch-cr',     filters:[['flt-cr-region','region'],['flt-cr-cabin','cabin'],['flt-cr-nights',null]]},
  visa:    {tbody:'tbody-vi',     search:'srch-vi',     filters:[['flt-vi-st','status'],['flt-vi-country','country'],['flt-vi-type','type']]},
  customers:{tbody:'tbody-cu',    search:'srch-cu',     filters:[['flt-cu-st','status'],['flt-cu-nat','nat']]},
};
function filterTable(tbodyId,searchId,filters){
  const tbody=document.getElementById(tbodyId);
  if(!tbody)return;
  const q=(searchId?(document.getElementById(searchId)||{}).value||'':'').toLowerCase().trim();
  let vis=0;
  Array.from(tbody.rows).forEach(r=>{
    let ok=true;
    if(q&&!r.textContent.toLowerCase().includes(q))ok=false;
    if(ok)filters.forEach(([selId,dataKey])=>{
      const v=(document.getElementById(selId)||{}).value||'';
      if(!v||v===''||v.startsWith('All ')||v.startsWith('—'))return;
      if(!dataKey)return; // date/complex filters — skip for now
      const rv=(r.dataset[dataKey]||'').toLowerCase();
      if(!rv.includes(v.toLowerCase()))ok=false;
    });
    r.style.display=ok?'':'none';
    if(ok)vis++;
  });
}
function applyFilter(panel){
  const cfg=FILTER_CFG[panel];
  if(cfg)filterTable(cfg.tbody,cfg.search,cfg.filters);
}
// STATUS CHANGE — also updates data-status for filter
function chgStatus(sel){
  const v=sel.value.toLowerCase().replace(/\s+/g,'');
  sel.className='ss ss-'+v;
  const row=sel.closest('tr');
  if(row)row.dataset.status=sel.value.toLowerCase().replace(/\s+/g,'');
  toast(`Status updated to "${sel.value}"`,'t-green');
}
// VIEW & EDIT ORDER MODALS
let _activeEditRow=null; // reference to the TR being edited

function openViewModal(row){
  _activeEditRow=row;
  const d=row.dataset;
  const svc=d.service||'order';
  const svcIcons={flights:'✈',umrah:'🕌',holiday:'🌴',cruise:'🚢',visa:'🛂'};
  const icon=svcIcons[svc]||'📋';
  const statusClass={confirmed:'b-green',onhold:'b-amber',cancelled:'b-red',pending:'b-amber',approved:'b-green',rejected:'b-red',processing:'b-blue'}[d.status]||'b-slate';
  const statusLabel=d.status?d.status.charAt(0).toUpperCase()+d.status.slice(1):'—';

  document.getElementById('vo-title').textContent=`${icon} ${svc.charAt(0).toUpperCase()+svc.slice(1)} Booking`;
  document.getElementById('vo-ref').textContent=d.ref||'—';
  document.getElementById('vo-status-badge').innerHTML=`<span class="badge ${statusClass}">${statusLabel}</span>`;

  // Build body content based on service
  let html=`
    <div style="display:flex;flex-direction:column;gap:20px">
      <!-- Customer -->
      <div>
        <div style="font-size:11px;font-weight:700;color:var(--slate2);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:12px">Customer Information</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          ${detailRow('Name', d.passenger||'—')}
          ${detailRow('Phone', d.phone||'—')}
          ${detailRow('Email', d.email||'—', true)}
        </div>
      </div>`;

  if(svc==='flights'){
    html+=`
      <div>
        <div style="font-size:11px;font-weight:700;color:var(--slate2);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:12px">Flight Details</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          ${detailRow('Route', (d.from||'—')+'  →  '+(d.to||'—'))}
          ${detailRow('Flight Number', d.flightNum||'—')}
          ${detailRow('Departure', d.depDate||'—')}
          ${detailRow('Return', d.retDate||'—')}
          ${detailRow('Passengers', d.pax||'1')}
          ${detailRow('Cabin Class', d.cabin||'—')}
          ${detailRow('Baggage', d.baggage||'—')}
        </div>
      </div>
      <div style="background:rgba(200,169,110,.06);border:1px solid rgba(200,169,110,.2);border-radius:var(--r);padding:16px">
        <div style="font-size:11px;font-weight:700;color:var(--gold3);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:12px">Booking Reference Numbers</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
          ${detailRow('Agency PNR', d.agencyPnr||'—', false, true)}
          ${detailRow('Airline PNR / GDS', d.airlinePnr||'—', false, true)}
          ${detailRow('Ticket Number', d.ticket||'—', false, true)}
        </div>
      </div>`;
  } else {
    const pkg=d.package||d.packageName||'—';
    html+=`
      <div>
        <div style="font-size:11px;font-weight:700;color:var(--slate2);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:12px">Service Details</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          ${detailRow('Package / Service', pkg, true)}
          ${d.guests?detailRow('Guests', d.guests):''}
          ${d.pilgrims?detailRow('Pilgrims', d.pilgrims):''}
          ${d.cabin?detailRow('Cabin / Room', d.cabin):''}
          ${d.checkin?detailRow('Check-in', d.checkin):''}
          ${d.depDate?detailRow('Departure', d.depDate):''}
          ${d.travelMonth?detailRow('Travel Month', d.travelMonth):''}
          ${d.depCity?detailRow('Departure City', d.depCity):''}
        </div>
      </div>`;
  }

  html+=`
      <div>
        <div style="font-size:11px;font-weight:700;color:var(--slate2);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:12px">Order Summary</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          ${detailRow('Total Amount', d.amount||'—')}
          ${detailRow('Status', statusLabel)}
          ${d.notes&&d.notes.trim()?detailRow('Notes', d.notes, true):''}
        </div>
      </div>
    </div>`;

  document.getElementById('vo-body').innerHTML=html;
  openModal('m-view-order');
}

function detailRow(label,value,full=false,mono=false){
  return `<div style="grid-column:${full?'1/-1':'auto'}">
    <div style="font-size:11px;font-weight:700;color:var(--slate2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">${label}</div>
    <div style="font-size:14px;font-weight:600;color:var(--ink);${mono?'font-family:monospace;background:var(--surface2);padding:4px 8px;border-radius:6px;display:inline-block':''}">${value||'—'}</div>
  </div>`;
}

function promoteToEdit(){
  closeModal('m-view-order');
  if(_activeEditRow)openEditModal(_activeEditRow);
}

function openEditModal(row){
  _activeEditRow=row;
  const d=row.dataset;
  const svc=d.service||'order';

  document.getElementById('eo-ref').textContent=(d.ref||'')+(d.ref?' — ':'')+(svc.charAt(0).toUpperCase()+svc.slice(1));
  document.getElementById('eo-name').value=d.passenger||'';
  document.getElementById('eo-phone').value=d.phone||'';
  document.getElementById('eo-email').value=d.email||'';
  document.getElementById('eo-amount').value=d.amount||'';
  document.getElementById('eo-notes').value=d.notes||'';

  // Status
  const eoSt=document.getElementById('eo-status');
  Array.from(eoSt.options).forEach(o=>o.selected=(o.value===(d.status||'confirmed')));

  // Flights block
  const fb=document.getElementById('eo-flight-block');
  const gb=document.getElementById('eo-generic-block');
  if(svc==='flights'){
    fb.style.display='flex'; gb.style.display='none';
    document.getElementById('eo-from').value=d.from||'';
    document.getElementById('eo-to').value=d.to||'';
    document.getElementById('eo-flight-num').value=d.flightNum||'';
    document.getElementById('eo-dep-date').value=d.depDate||'';
    document.getElementById('eo-ret-date').value=d.retDate||'';
    document.getElementById('eo-pax').value=d.pax||1;
    const cab=document.getElementById('eo-cabin');
    Array.from(cab.options).forEach(o=>o.selected=o.text.toLowerCase()===(d.cabin||'economy').toLowerCase());
    const bag=document.getElementById('eo-baggage');
    Array.from(bag.options).forEach(o=>o.selected=o.text.toLowerCase()===(d.baggage||'').toLowerCase());
    document.getElementById('eo-agency-pnr').value=d.agencyPnr||'';
    document.getElementById('eo-airline-pnr').value=d.airlinePnr||'';
    document.getElementById('eo-ticket').value=d.ticket||'';
  } else {
    fb.style.display='none'; gb.style.display='flex';
    document.getElementById('eo-package').value=d.package||d.packageName||'';
  }

  openModal('m-edit-order');
}

function saveEditOrder(){
  if(!_activeEditRow){closeModal('m-edit-order');return}
  const d=_activeEditRow.dataset;
  const svc=d.service||'order';

  // Read values back
  d.passenger=document.getElementById('eo-name').value.trim();
  d.phone=document.getElementById('eo-phone').value.trim();
  d.email=document.getElementById('eo-email').value.trim();
  d.amount=document.getElementById('eo-amount').value.trim();
  d.notes=document.getElementById('eo-notes').value.trim();
  const newStatus=document.getElementById('eo-status').value;
  d.status=newStatus;

  if(svc==='flights'){
    d.from=document.getElementById('eo-from').value.trim().toUpperCase();
    d.to=document.getElementById('eo-to').value.trim().toUpperCase();
    d.flightNum=document.getElementById('eo-flight-num').value.trim();
    d.depDate=document.getElementById('eo-dep-date').value.trim();
    d.retDate=document.getElementById('eo-ret-date').value.trim();
    d.pax=document.getElementById('eo-pax').value;
    d.cabin=document.getElementById('eo-cabin').value;
    d.baggage=document.getElementById('eo-baggage').value;
    d.agencyPnr=document.getElementById('eo-agency-pnr').value.trim().toUpperCase();
    d.airlinePnr=document.getElementById('eo-airline-pnr').value.trim().toUpperCase();
    d.ticket=document.getElementById('eo-ticket').value.trim();
  } else {
    const pkg=document.getElementById('eo-package').value.trim();
    if(d.package!==undefined)d.package=pkg;
  }

  // Update visible cells in the row
  const cells=[...document.querySelectorAll(`#tbody-orders tr, #tbody-flt tr`)].filter(r=>r===_activeEditRow);
  // Refresh status select styling
  const sel=_activeEditRow.querySelector('select.ss');
  if(sel){sel.className='ss ss-'+newStatus;Array.from(sel.options).forEach(o=>o.selected=o.value===newStatus)}
  // Refresh customer name cell (2nd or 3rd td depending on table)
  const nameTd=[..._activeEditRow.querySelectorAll('td')].find(td=>td.textContent.includes(d.passenger)||td.querySelector('.avatar'));
  if(nameTd&&nameTd.querySelector('.avatar')){
    const avatarDiv=nameTd.querySelector('.avatar');
    if(avatarDiv)avatarDiv.nextSibling&&(avatarDiv.nextSibling.textContent=d.passenger);
  }
  // Refresh amount
  const amtTd=[..._activeEditRow.querySelectorAll('td.semi')].find(td=>td.textContent.includes('AED'));
  if(amtTd)amtTd.textContent=d.amount.startsWith('AED')?d.amount:'AED '+d.amount;
  // Update PNR cells in flights table (columns 6,7,8)
  if(svc==='flights'&&_activeEditRow.closest('#tbody-flt')){
    const tds=[..._activeEditRow.querySelectorAll('td')];
    if(tds[6])tds[6].textContent=d.agencyPnr||'—';
    if(tds[7])tds[7].textContent=d.airlinePnr||'—';
    if(tds[8])tds[8].textContent=d.ticket||'—';
  }

  closeModal('m-edit-order');
  toast(`Order ${d.ref||''} updated successfully`,'t-green');
}

function printTicket(row){
  const d=row.dataset;
  const now=new Date();

  // Format helpers
  const fmtNow=()=>now.toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});
  const fmtNowTime=()=>now.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});

  // Parse dep date for day-of-week
  let depDayStr='—', depDateStr=d.depDate||'—';
  try{
    const dp=new Date(d.depDate);
    if(!isNaN(dp)){
      depDayStr=dp.toLocaleDateString('en-GB',{weekday:'long'});
      depDateStr=dp.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
    }
  }catch(e){}

  const depTime  = d.depTime  || '08:00 AM';
  const arrTime  = d.arrTime  || '12:25 PM';
  const aircraft = d.aircraft || 'Boeing 777';
  const terminal = d.terminal || 'Terminal 3';
  const fareBasis= d.fareBasis|| 'YOWUS';
  const fareType = d.fareType || 'Value (Incl. Bag)';
  const pnrCode  = d.airlinePnr || d.agencyPnr || 'KTREF';
  const passengerUC = (d.passenger||'—').toUpperCase();

  /* ── Barcode SVG (full-width, stacked below PNR) ── */
  function barcodeSVG(str){
    const W=240, H=56;
    // Encode each char as a pattern of wide/narrow bars
    const chars=str.padEnd(12,'0').slice(0,12);
    const weights=[3,1,2,1,3,1,1,2,1,3,2,1,1,3,1,2,1,3,1,1,2,1,3,2,1,1,3,1,2,1,1,3,1,2,3,1];
    let bars='', x=0;
    const unit=W/weights.reduce((a,b)=>a+b,0);
    weights.forEach((n,i)=>{
      const bw=n*unit;
      if(i%2===0)bars+=`<rect x="${x.toFixed(1)}" y="0" width="${bw.toFixed(1)}" height="${H}" fill="#111"/>`;
      x+=bw;
    });
    // White guard bars at edges
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${bars}</svg>`;
  }

  const barcodeStr = barcodeSVG(pnrCode);

  const html=`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>E-Ticket — ${d.ref||'KT'}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Arial',sans-serif;background:#fff;color:#111;font-size:13px;line-height:1.5}
  .page{width:210mm;margin:0 auto;padding:14mm 15mm 12mm;background:#fff}

  /* ── HEADER ── */
  .hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px}
  .hdr h1{font-size:34px;font-weight:900;color:#111;font-family:'Arial Black',sans-serif;letter-spacing:-1px;line-height:1}
  .hdr-ref{text-align:right}
  .ref-label{font-size:9px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:#555;margin-bottom:4px}
  .ref-code{font-size:26px;font-weight:900;letter-spacing:5px;color:#c0392b;font-family:'Arial Black',sans-serif;margin-bottom:8px}
  .barcode-wrap{display:flex;justify-content:flex-end}

  /* ── DIVIDERS ── */
  .div-bold{border:none;border-top:2.5px solid #111;margin:10px 0}
  .div-thin{border:none;border-top:1px solid #ccc;margin:8px 0}

  /* ── AIRLINE BLOCK ── */
  .airline-block{display:flex;justify-content:space-between;align-items:center;padding:6px 0 8px}
  .airline-label{font-size:11px;font-style:italic;color:#c0392b;font-weight:700;margin-bottom:3px}
  .airline-name{font-size:30px;font-weight:900;color:#111;font-family:'Arial Black',sans-serif;letter-spacing:-0.5px}
  .airline-name span{color:#c0392b}
  .mob-box{border:1.5px solid #111;padding:7px 14px;text-align:left;min-width:150px}
  .mob-label{font-size:10px;font-weight:700;color:#111;margin-bottom:3px;display:flex;align-items:center;gap:5px}
  .mob-num{font-size:14px;font-weight:700;color:#111;text-decoration:underline}

  /* ── META / BOOKED BY ── */
  .meta-row{display:flex;justify-content:space-between;font-size:11px;color:#444;margin-bottom:5px}
  .meta-icon{margin-right:3px}
  .booked-label{font-size:11px;font-weight:700;color:#c0392b;margin-bottom:3px}
  .booked-name{font-size:15px;font-weight:900;color:#111;text-transform:uppercase;letter-spacing:.3px}

  /* ── FLIGHT SECTION ── */
  .flight-section{
    display:flex;align-items:center;
    padding:16px 0 12px;
    border-top:2px solid #111;
    border-bottom:1px solid #ccc;
    margin:10px 0;gap:0
  }
  .fl-daycol{text-align:center;min-width:76px;margin-right:8px}
  .fl-day{font-size:13px;font-weight:700;color:#333}
  .fl-date{font-size:14px;font-weight:900;color:#111;margin-top:2px}
  .fl-from{text-align:center;margin-right:10px}
  .fl-code{font-size:40px;font-weight:900;color:#111;font-family:'Arial Black',sans-serif;letter-spacing:-2px;line-height:1}
  .fl-time{font-size:12px;font-weight:700;color:#333;margin-top:3px}
  .fl-mid{flex:1;display:flex;flex-direction:column;align-items:center;padding:0 10px}
  .fl-route-lbl{font-size:11px;color:#555;margin-bottom:7px}
  .fl-line{display:flex;align-items:center;width:100%;gap:3px}
  .fl-dot{width:8px;height:8px;border-radius:50%;background:#111;flex-shrink:0}
  .fl-dash{flex:1;height:1.5px;background:#111}
  .fl-plane{font-size:16px;color:#111;transform:rotate(0deg);flex-shrink:0}
  .fl-to{text-align:center;margin-left:10px;margin-right:18px}
  .fl-terminal{font-size:10px;color:#888;margin-top:2px}
  .fl-badges{display:flex;align-items:center;gap:18px}
  .fl-badge{text-align:center}
  .fl-badge-label{font-size:9px;font-weight:700;letter-spacing:.5px;color:#888;text-transform:uppercase;margin-bottom:2px}
  .fl-badge-val{font-size:13px;font-weight:900;color:#111}

  /* ── COUPON TABLE ── */
  .coupon-table{width:100%;border-collapse:collapse;margin-top:14px;font-size:11px}
  .coupon-table thead tr{background:#1a1a2e}
  .coupon-table th{color:#fff;padding:8px 10px;text-align:left;font-size:10px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;white-space:nowrap}
  .coupon-table th.center,.coupon-table td.center{text-align:center}
  .coupon-table td{padding:8px 10px;border-bottom:1px solid #e8e8e8;color:#111}
  .coupon-table tr.pax-row td{
    font-size:12px;font-weight:900;text-transform:uppercase;
    background:#f5f5f5;border-bottom:1.5px solid #ccc;
    padding:9px 10px;letter-spacing:.3px
  }
  .ticket-num{font-family:monospace;font-size:11.5px;text-decoration:underline;color:#1a1a2e;font-weight:700}
  .status-ok{font-weight:900;font-size:12px;color:#111;text-align:center}

  /* ── FOOTER ── */
  .ticket-footer{
    margin-top:16px;padding-top:10px;
    border-top:1px solid #ccc;
    display:flex;justify-content:space-between;align-items:flex-end
  }
  .footer-logo{font-size:15px;font-weight:900;color:#111;font-family:'Arial Black',sans-serif}
  .footer-sub{font-size:10px;color:#888;font-style:italic;margin-top:2px}
  .footer-note{font-size:9px;color:#999;text-align:right;max-width:260px;line-height:1.5}

  @media print{
    body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .page{padding:10mm 13mm}
    @page{size:A4 portrait;margin:0}
  }
</style>
</head>
<body>
<div class="page">

  <!-- ① HEADER: e-ticket left · BOOKING REFERENCE + PNR + barcode (stacked) right -->
  <div class="hdr">
    <div><h1>e-ticket</h1></div>
    <div class="hdr-ref">
      <div class="ref-label">Booking Reference</div>
      <div class="ref-code">${pnrCode}</div>
      <div class="barcode-wrap">${barcodeStr}</div>
    </div>
  </div>

  <hr class="div-bold">

  <!-- ② AIRLINE BLOCK -->
  <div class="airline-block">
    <div>
      <div class="airline-label">Airline name or Logo</div>
      <div class="airline-name">Keenan <span>Travel</span></div>
    </div>
    <div class="mob-box">
      <div class="mob-label">&#128222; Mob. No</div>
      <div class="mob-num">${d.phone||'+971 4 000 0000'}</div>
    </div>
  </div>

  <!-- ③ META + BOOKED BY (no passenger box below this) -->
  <div class="meta-row">
    <span><span class="meta-icon">&#128438;</span> Reserved on ${depDateStr} at ${fmtNowTime()}</span>
    <span>&#10008; Ticketed on ${depDateStr} at ${fmtNowTime()}</span>
  </div>
  <div class="booked-label">Booked By:</div>
  <div class="booked-name">${passengerUC}</div>

  <!-- ④ FLIGHT SECTION (directly after Booked By — passenger box removed) -->
  <div class="flight-section">
    <!-- Day + Date -->
    <div class="fl-daycol">
      <div class="fl-day">${depDayStr}</div>
      <div class="fl-date">${depDateStr}</div>
    </div>
    <!-- From airport -->
    <div class="fl-from">
      <div class="fl-code">${d.from||'—'}</div>
      <div class="fl-time">${depTime}</div>
    </div>
    <!-- Route line -->
    <div class="fl-mid">
      <div class="fl-route-lbl">${d.from||'?'} to ${d.to||'?'}</div>
      <div class="fl-line">
        <div class="fl-dot"></div>
        <div class="fl-dash"></div>
        <div class="fl-plane">&#9992;</div>
        <div class="fl-dash"></div>
        <div class="fl-dot"></div>
      </div>
    </div>
    <!-- To airport -->
    <div class="fl-to">
      <div class="fl-code">${d.to||'—'}</div>
      <div class="fl-time">${arrTime}</div>
      <div class="fl-terminal">${terminal}</div>
    </div>
    <!-- Flight meta badges -->
    <div class="fl-badges">
      <div class="fl-badge">
        <div class="fl-badge-label">Flight</div>
        <div class="fl-badge-val">${d.flightNum||'—'}</div>
      </div>
      <div class="fl-badge">
        <div class="fl-badge-label">Class</div>
        <div class="fl-badge-val">${(d.cabin||'Economy').toUpperCase()}</div>
      </div>
      <div class="fl-badge">
        <div class="fl-badge-label">Aircraft</div>
        <div class="fl-badge-val" style="font-size:11px">&#9992; ${aircraft}</div>
      </div>
    </div>
  </div>

  <!-- ⑤ COUPON TABLE -->
  <table class="coupon-table">
    <thead>
      <tr>
        <th>Ticket / Coupon</th>
        <th>Flight No</th>
        <th>Route</th>
        <th>Date</th>
        <th>Fare Type</th>
        <th class="center" title="Check bag">&#128197;</th>
        <th>Fare Basis</th>
        <th class="center">Status</th>
      </tr>
    </thead>
    <tbody>
      <tr class="pax-row">
        <td colspan="8">${passengerUC}</td>
      </tr>
      <tr>
        <td><span class="ticket-num">${d.ticket||'—'} /1</span></td>
        <td style="font-weight:700">${d.flightNum||'—'}</td>
        <td style="font-weight:700">${d.from||'?'}-${d.to||'?'}</td>
        <td>${depDateStr}</td>
        <td>${fareType}</td>
        <td class="center" style="font-weight:600">${d.baggage||'—'}</td>
        <td style="font-family:monospace;font-weight:700">${fareBasis}</td>
        <td class="status-ok">${(d.status||'confirmed').toLowerCase()==='confirmed'?'OK':(d.status||'—').toUpperCase()}</td>
      </tr>
    </tbody>
  </table>

  <!-- ⑥ FOOTER -->
  <div class="ticket-footer">
    <div>
      <div class="footer-logo">Keenan Travel</div>
      <div class="footer-sub">Licensed Travel Agency &mdash; UAE Ministry of Economy</div>
    </div>
    <div class="footer-note">
      This is an electronic ticket. Please carry a valid photo ID at the<br>
      time of check-in. Issued: ${fmtNow()} &bull; Ref: ${d.ref||'—'}
    </div>
  </div>

</div>
<script>window.onload=function(){window.print()}<\/script>
</body>
</html>`;

  const win=window.open('','_blank','width=960,height=750');
  if(!win){toast('Please allow popups to generate the ticket PDF','t-red');return}
  win.document.write(html);
  win.document.close();
}
// NEW ORDER MODAL
function toggleOrderFields(svc){
  const allFields=['flights','umrah','holiday','cruise','visa'];
  allFields.forEach(s=>{
    const el=document.getElementById('no-'+s);
    if(el)el.style.display='none';
  });
  const cust=document.getElementById('no-customer-block');
  const amt=document.getElementById('no-amount-block');
  const btn=document.getElementById('no-submit-btn');
  if(!svc){
    if(cust)cust.style.display='none';
    if(amt)amt.style.display='none';
    if(btn){btn.disabled=true;btn.style.opacity='.5';btn.style.cursor='not-allowed'}
    return;
  }
  if(cust)cust.style.display='flex';
  if(amt)amt.style.display='flex';
  if(btn){btn.disabled=false;btn.style.opacity='1';btn.style.cursor='pointer'}
  const target=document.getElementById('no-'+svc);
  if(target)target.style.display='flex';
}
function submitNewOrder(){
  const svc=document.getElementById('no-service').value;
  const name=document.getElementById('no-name').value.trim();
  const amount=document.getElementById('no-amount').value;
  const status=document.getElementById('no-status').value;
  const notes=document.getElementById('no-notes')?.value.trim()||'';
  if(!svc){toast('Please select a service','t-red');return}
  if(!name){toast('Please enter the customer name','t-red');return}
  if(!amount){toast('Please enter the order amount','t-red');return}

  const ref='BK-'+Math.floor(8000+Math.random()*999);
  const svcLabels={flights:'✈ Flights',umrah:'🕌 Umrah',holiday:'🌴 Holiday',cruise:'🚢 Cruise',visa:'🛂 Visa'};
  const initials=name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
  const colors={flights:'rgba(200,169,110,.15)',umrah:'rgba(15,123,91,.1)',holiday:'rgba(29,78,216,.1)',cruise:'rgba(180,83,9,.1)',visa:'rgba(124,58,237,.1)'};
  const textColors={flights:'var(--gold3)',umrah:'var(--green)',holiday:'var(--blue)',cruise:'var(--amber)',visa:'var(--purple)'};
  const today=new Date().toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
  const phone=document.getElementById('no-phone')?.value.trim()||'';
  const email=document.getElementById('no-email')?.value.trim()||'';
  const amtFormatted='AED '+parseFloat(amount).toLocaleString();

  // Collect flight-specific data
  const from=document.getElementById('no-from')?.value.trim().toUpperCase()||'';
  const to=document.getElementById('no-to')?.value.trim().toUpperCase()||'';
  const flightNum=document.getElementById('no-flight-num')?.value.trim()||'';
  const depDate=document.getElementById('no-dep-date')?.value||'';
  const retDate=document.getElementById('no-ret-date')?.value||'';
  const pax=document.getElementById('no-pax')?.value||'1';
  const cabin=document.getElementById('no-cabin')?.value||'';
  const baggage=document.getElementById('no-baggage')?.value||'';
  const agencyPnr=document.getElementById('no-agency-pnr')?.value.trim().toUpperCase()||'';
  const airlinePnr=document.getElementById('no-airline-pnr')?.value.trim().toUpperCase()||'';
  const ticket=document.getElementById('no-ticket')?.value.trim()||'';

  const detailText=svc==='flights'
    ?`${from}→${to} · ${flightNum}`
    :'Manual Entry';

  const tbody=document.getElementById('tbody-orders');
  if(tbody){
    const row=document.createElement('tr');
    const ssClass='ss-'+(status==='onhold'?'onhold':status==='pending'?'pending':status);
    // Store all data as attributes for view/edit
    Object.assign(row.dataset,{
      service:svc, status, ref, passenger:name, phone, email,
      from, to, flightNum, depDate, retDate, pax, cabin, baggage,
      agencyPnr, airlinePnr, ticket, amount:amtFormatted, notes
    });
    row.innerHTML=`
      <td><input type="checkbox"></td>
      <td class="td-mono">${ref}</td>
      <td><div class="flex aic gap8"><div class="avatar" style="width:32px;height:32px;background:${colors[svc]};color:${textColors[svc]};font-size:11px">${initials}</div>${name}</div></td>
      <td>${svcLabels[svc]}</td>
      <td class="fs13 slate2">${detailText}</td>
      <td class="fs13">${today}</td>
      <td class="semi">${amtFormatted}</td>
      <td><select class="ss ${ssClass}" onchange="chgStatus(this)">
        <option value="confirmed"${status==='confirmed'?' selected':''}>Confirmed</option>
        <option value="onhold"${status==='onhold'?' selected':''}>On Hold</option>
        <option value="cancelled">Cancelled</option>
      </select></td>
      <td class="td-actions">
        <button class="btn-icon" onclick="openViewModal(this.closest('tr'))">👁</button>
        <button class="btn-icon" onclick="openEditModal(this.closest('tr'))">✏</button>
      </td>`;
    tbody.insertBefore(row,tbody.firstChild);
  }
  closeModal('m-new-order');
  document.getElementById('no-service').value='';
  toggleOrderFields('');
  toast(`Order ${ref} created for ${name}`,'t-green');
  aPanel('orders',document.querySelector('[onclick*="\'orders\'"]'));
}
// MODALS
function openModal(id){document.getElementById(id).classList.add('open')}
function closeModal(id){document.getElementById(id).classList.remove('open')}

function addVisaFeeRow(){
  const country=document.getElementById('vf-country').value.trim();
  const type=document.getElementById('vf-type').value;
  const fee=document.getElementById('vf-fee').value;
  const time=document.getElementById('vf-time').value.trim();
  const priority=document.getElementById('vf-priority').value;
  const validity=document.getElementById('vf-validity').value.trim();
  const entry=document.getElementById('vf-entry').value;
  if(!country||!fee){toast('Please enter a destination country and fee amount','t-red');return}
  const tbody=document.getElementById('visa-fee-tbody');
  const row=document.createElement('tr');
  row.style.borderTop='1px solid #F0F3F9';
  row.innerHTML=`
    <td style="padding:11px 14px;font-size:13px;font-weight:600">${country}</td>
    <td style="padding:11px 14px;font-size:13px;color:var(--slate2)">${type}</td>
    <td style="padding:11px 14px;font-size:13px;font-weight:700">AED ${parseFloat(fee).toFixed(0)}</td>
    <td style="padding:11px 14px;font-size:13px;color:var(--slate2)">${priority?'AED '+parseFloat(priority).toFixed(0):'—'}</td>
    <td style="padding:11px 14px;font-size:13px;color:var(--slate2)">${time||'—'}</td>
    <td style="padding:11px 14px;text-align:right"><button class="btn-danger" onclick="this.closest('tr').remove();toast('Fee removed','t-gold')">✕</button></td>`;
  tbody.appendChild(row);
  // Clear inputs for next entry
  document.getElementById('vf-country').value='';
  document.getElementById('vf-fee').value='';
  document.getElementById('vf-time').value='';
  document.getElementById('vf-priority').value='';
  document.getElementById('vf-validity').value='';
  toast(`Visa fee added: ${country} – ${type} – AED ${fee}`,'t-green');
}
// TRACK & MISC
function showTrackResult(){document.getElementById('track-result').style.display='block'}
// TOAST
let _tt;
function toast(msg,cls='t-green'){
  const t=document.getElementById('toast');
  t.querySelector('#t-icon').textContent=cls==='t-red'?'✕':cls==='t-gold'?'★':'✓';
  t.querySelector('#t-msg').textContent=msg;
  t.className='toast '+cls+' show';
  clearTimeout(_tt);_tt=setTimeout(()=>t.classList.remove('show'),3500);
}
// INIT
function bootstrapLegacyApp(){
  // Init hero slider
  renderHeroSlides();startSliderAuto();animateProgress();
  // Hide all admin panels except dashboard
  PANELS.forEach(p=>{const e=document.getElementById('ap-'+p);if(e&&p!=='dashboard')e.style.display='none'});
  // Auto-advance admin hero preview panel with a clean tracked index
  let previewIdx=0;
  setInterval(()=>{
    const heroPanel=document.getElementById('ap-hero');
    if(!heroPanel||heroPanel.style.display==='none')return;
    const active=slides.filter(s=>s.active);
    if(!active.length)return;
    previewIdx=(previewIdx+1)%active.length;
    updatePreview(previewIdx);
    // Sync dot styles
    const d=document.getElementById('prev-dots');
    if(d){
      Array.from(d.children).forEach((dot,i)=>{
        dot.style.width=i===previewIdx?'20px':'8px';
        dot.style.background=i===previewIdx?'var(--gold)':'rgba(0,0,0,.15)';
      });
    }
  },2500);
}

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',bootstrapLegacyApp);
}else{
  bootstrapLegacyApp();
}

window.updateSearchWidgetDefaults = function() {
  if (!window.KT) return;
  const ctx = window.KT.get();
  // Update departure city inputs
  document.querySelectorAll('input[data-role="dep-city"]')
    .forEach(el => el.value = ctx.depCities[0]);
  // Update Umrah departure default
  document.querySelectorAll('input[data-role="umrah-dep"]')
    .forEach(el => el.value = ctx.umrahDep);
};

window.updateDestinationCards = function() {
  if (!window.KT) return;
  const ctx = window.KT.get();
  const isAE = ctx.code === 'AE';
  
  const container = document.getElementById('dest-cards-container');
  if (!container) return;

  if (isAE) {
    container.innerHTML = `
      <div class="dest-card" onclick="go('results-holiday')">
        <div class="dc-img" style="background:linear-gradient(160deg,#0e5f82,#1a9ed4,#0d3d52)"><span class="dc-ribbon">Holiday</span></div>
        <div class="dc-body"><div class="dc-name">Maldives</div><div class="dc-info">7 Nights · 5★ Overwater Villas · All Inclusive</div><div class="dc-foot"><div class="dc-price"><span class="from">from</span><span class="amount">${window.KT.format(6499)}</span></div><div class="dc-stars">★★★★★ 4.9</div></div></div>
      </div>
      <div class="dest-card" onclick="go('results-holiday')">
        <div class="dc-img" style="background:linear-gradient(160deg,#6b3a2a,#b85c38,#8a3022)"><span class="dc-ribbon">Holiday</span></div>
        <div class="dc-body"><div class="dc-name">Istanbul</div><div class="dc-info">5 Nights · 4★ Boutique Hotels · Guided Tours</div><div class="dc-foot"><div class="dc-price"><span class="from">from</span><span class="amount">${window.KT.format(2899)}</span></div><div class="dc-stars">★★★★★ 4.8</div></div></div>
      </div>
      <div class="dest-card" onclick="go('results-cruise')">
        <div class="dc-img" style="background:linear-gradient(160deg,#1a3a6e,#2858a8,#12285e)"><span class="dc-ribbon">Cruise</span></div>
        <div class="dc-body"><div class="dc-name">Mediterranean</div><div class="dc-info">10 Nights · 6 Countries · MSC Grandiosa</div><div class="dc-foot"><div class="dc-price"><span class="from">from</span><span class="amount">${window.KT.format(4199)}</span></div><div class="dc-stars">★★★★★ 4.7</div></div></div>
      </div>
      <div class="dest-card" onclick="go('results-umrah')">
        <div class="dc-img" style="background:linear-gradient(160deg,#1a1a35,#2d2d60,#111128)"><span class="dc-ribbon">Umrah</span></div>
        <div class="dc-body"><div class="dc-name">Makkah & Madinah</div><div class="dc-info">14 Nights · Visa + Flights Included · 5★</div><div class="dc-foot"><div class="dc-price"><span class="from">from</span><span class="amount">${window.KT.format(3500)}</span></div><div class="dc-stars">★★★★★ 5.0</div></div></div>
      </div>
    `;
  } else {
    container.innerHTML = `
      <div class="dest-card" onclick="go('results-holiday')">
        <div class="dc-img" style="background:linear-gradient(160deg,#0e5f82,#1a9ed4,#0d3d52)"><span class="dc-ribbon">Holiday</span></div>
        <div class="dc-body"><div class="dc-name">Turkey</div><div class="dc-info">7 Nights · Istanbul & Cappadocia · Guided Tours</div><div class="dc-foot"><div class="dc-price"><span class="from">from</span><span class="amount">${window.KT.format(280000)}</span></div><div class="dc-stars">★★★★★ 4.7</div></div></div>
      </div>
      <div class="dest-card" onclick="go('results-holiday')">
        <div class="dc-img" style="background:linear-gradient(160deg,#6b3a2a,#b85c38,#8a3022)"><span class="dc-ribbon">Holiday</span></div>
        <div class="dc-body"><div class="dc-name">Baku</div><div class="dc-info">5 Nights · 4★ Hotels · City Tour</div><div class="dc-foot"><div class="dc-price"><span class="from">from</span><span class="amount">${window.KT.format(190000)}</span></div><div class="dc-stars">★★★★★ 4.5</div></div></div>
      </div>
      <div class="dest-card" onclick="go('results-flights')">
        <div class="dc-img" style="background:linear-gradient(160deg,#1a3a6e,#2858a8,#12285e)"><span class="dc-ribbon">Flights</span></div>
        <div class="dc-body"><div class="dc-name">Dubai</div><div class="dc-info">Direct Flights · 30kg Baggage</div><div class="dc-foot"><div class="dc-price"><span class="from">from</span><span class="amount">${window.KT.format(75000)}</span></div><div class="dc-stars">★★★★★ 4.3</div></div></div>
      </div>
      <div class="dest-card" onclick="go('results-umrah')">
        <div class="dc-img" style="background:linear-gradient(160deg,#1a1a35,#2d2d60,#111128)"><span class="dc-ribbon">Umrah</span></div>
        <div class="dc-body"><div class="dc-name">Makkah & Madinah</div><div class="dc-info">14 Nights · Direct Flights · Premium</div><div class="dc-foot"><div class="dc-price"><span class="from">from</span><span class="amount">${window.KT.format(450000)}</span></div><div class="dc-stars">★★★★★ 5.0</div></div></div>
      </div>
    `;
  }
};
