const DEFAULT_API_BASE=(()=>{const saved=localStorage.getItem("zyrex_api_base");if(saved)return saved;const h=location.hostname;if((h==="localhost"||h==="127.0.0.1")&&location.port!=="3000")return `${location.protocol}//${h}:3000/api`;return "/api";})();
const CONFIG={apiBase:DEFAULT_API_BASE,social:{whatsapp:"https://wa.me/",telegram:"https://t.me/",github:"https://github.com/",instagram:"https://instagram.com/"}};
async function jsonFetch(url, options={}){
  const r=await fetch(url,options);
  const text=await r.text();
  let data=null; try{data=JSON.parse(text)}catch{throw new Error(`API returned non-JSON (${r.status}): ${text.slice(0,120)}`)}
  if(!r.ok) throw new Error(data?.error||`API error ${r.status}`);
  return data;
}

const projects=[{id:"core",title:"ZYREX Digital Core",category:"WEB",description:"A portfolio and digital-store foundation with an editorial interface.",tech:["HTML","CSS","JavaScript"],year:2026,status:"ACTIVE",demo:"#",source:"#",featured:true},{id:"roblox",title:"Motor System",category:"ROBLOX",description:"Interactive vehicle lighting and motion systems built for Roblox experiences.",tech:["Lua","Roblox"],year:2026,status:"ACTIVE",demo:"#",source:"#",featured:false},{id:"interface",title:"Interface Lab",category:"DESIGN",description:"A dark interface study focused on hierarchy, motion and compact systems.",tech:["UI","UX","CSS"],year:2026,status:"CONCEPT",demo:"#",source:"#",featured:false},{id:"landing",title:"Launch Surface",category:"WEB",description:"A responsive landing system for products, services and creator brands.",tech:["HTML","CSS","JS"],year:2026,status:"CONCEPT",demo:"#",source:"#",featured:false}];
const FALLBACK_PRODUCTS=[
{id:'p1',name:'ZYREX Landing Kit',category:'TEMPLATES',description:'A premium vanilla HTML/CSS landing foundation.',price:79000,image:'',file_path:'zyrex-landing-kit.zip',active:true},
{id:'p2',name:'Motion UI Pack',category:'UI KITS',description:'Micro-interaction patterns and reusable interface components.',price:59000,image:'',file_path:'motion-ui-pack.zip',active:true},
{id:'p3',name:'Roblox Core Scripts',category:'SCRIPTS',description:'Editable starter systems for Roblox creators.',price:99000,image:'',file_path:'roblox-core-scripts.zip',active:true},
{id:'p4',name:'Creator Utility Pack',category:'DIGITAL TOOLS',description:'Small utilities designed to speed up creator workflows.',price:49000,image:'',file_path:'creator-utility-pack.zip',active:true}
];
let products=[],paymentMethods=[],selectedPaymentMethodId=null;
const services=[["01","WEB DEVELOPMENT","Modern responsive websites with a clean frontend core.","HTML / CSS / JS"],["02","ROBLOX DEVELOPMENT","Gameplay, UI and system scripting for Roblox experiences.","LUA / ROBLOX"],["03","UI DESIGN","Premium interfaces with hierarchy, motion and responsive thinking.","UI / UX / CSS"],["04","CUSTOM DEVELOPMENT","Custom digital systems built around a specific workflow.","FULL STACK / API"]];
const quotes=[["EDITABLE PLACEHOLDER","Replace this with a real customer testimonial when available."],["YOUR NEXT SIGNAL","Real feedback can be added from the admin system later."],["ZYREX ECOSYSTEM","Testimonials stay editable — no invented client claims."]];
let filter="ALL",cart=JSON.parse(localStorage.getItem("zyrex_cart")||"[]");
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
function rupiah(n){return new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(n)}
function toast(t){const e=$("#toast");e.textContent=t;e.classList.add("show");setTimeout(()=>e.classList.remove("show"),2400)}

function renderFilters(){const cats=["ALL","WEB","ROBLOX","DESIGN"];$("#filters").innerHTML=cats.map(c=>`<button class="${c===filter?"active":""}" data-filter="${c}">${c}</button>`).join("");$$("[data-filter]").forEach(b=>b.onclick=()=>{filter=b.dataset.filter;renderFilters();renderProjects()})}
function renderProjects(){const q=$("#projectSearch").value.toLowerCase();const list=projects.filter(p=>(filter==="ALL"||p.category===filter)&&[p.title,p.category,p.description,...p.tech].join(" ").toLowerCase().includes(q));$("#projects").innerHTML=list.length?list.map(p=>`<article class="project" data-project="${p.id}"><div class="project-visual"></div><div class="project-arrow">↗</div><div class="project-content"><span class="project-cat">${p.category} / ${p.year}</span><h3>${p.title}</h3><p>${p.description}</p></div></article>`).join(""):`<div class="project" style="grid-column:1/-1;min-height:180px"><div class="project-content"><span class="project-cat">NO SIGNAL</span><h3>No project found.</h3><p>Try another title, technology or category.</p></div></div>`;$$("[data-project]").forEach(e=>e.onclick=()=>openProject(projects.find(p=>p.id===e.dataset.project)))}
function openProject(p){$("#modalCat").textContent=`${p.category} / ${p.year} / ${p.status}`;$("#modalTitle").textContent=p.title;$("#modalDesc").textContent=p.description;$("#modalInfo").innerHTML=`<div>TECHNOLOGY<b>${p.tech.join(" / ")}</b></div><div>STATUS<b>${p.status}</b></div><div>CATEGORY<b>${p.category}</b></div><div>YEAR<b>${p.year}</b></div>`;if($("#modalDemo"))$("#modalDemo").href=p.demo;if($("#modalSource"))$("#modalSource").href=p.source;openModal("projectModal")}
function renderServices(){$("#servicesList").innerHTML=services.map(s=>`<article class="service"><div class="service-num">${s[0]}</div><h3>${s[1]}</h3><div><p>${s[2]}</p><small style="display:block;color:#4e5663;margin-top:8px;font-size:8px;letter-spacing:.1em">${s[3]}</small></div></article>`).join("")}

// Store — product cards, now image-aware with a graceful fallback mark
function renderProducts(){
  if(!products.length){$("#products").innerHTML=`<div class="product-empty"><span>DIGITAL STORE</span><h3>No products yet.</h3><p>Products added from the admin panel will show up here.</p></div>`;return}
  $("#products").innerHTML=products.map(p=>`<article class="product"><div class="product-visual">${p.image?`<img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy">`:`<span class="product-visual-mark">${esc(p.category)}</span>`}</div><div class="product-info"><span>${esc(p.category)}</span><h3>${esc(p.name)}</h3><p>${esc(p.description)}</p><div class="price">${rupiah(p.price)}</div><button class="btn primary" data-buy="${p.id}">Add to cart <b>+</b></button></div></article>`).join("");
  $$("[data-buy]").forEach(b=>b.onclick=()=>addCart(b.dataset.buy));
}
function addCart(id){const p=products.find(x=>x.id===id),item=cart.find(x=>x.id===id);item?item.qty++:cart.push({id,qty:1});saveCart();toast(`${p.name} added to cart`)}
function saveCart(){localStorage.setItem("zyrex_cart",JSON.stringify(cart));$("#cartCount").textContent=cart.reduce((a,b)=>a+b.qty,0)}
function renderCart(){const items=cart.map(i=>{const p=products.find(x=>x.id===i.id);return p?`<div class="cart-item"><div><h4>${esc(p.name)}</h4><small>${i.qty} × ${rupiah(p.price)}</small></div><button data-remove="${p.id}">Remove</button></div>`:""}).join("");$("#cartItems").innerHTML=items||`<p>YOUR CART IS EMPTY — FIND SOMETHING GREAT.</p>`;const total=cart.reduce((a,i)=>a+(products.find(p=>p.id===i.id)?.price||0)*i.qty,0);$("#cartTotal").textContent=rupiah(total);$$("[data-remove]").forEach(b=>b.onclick=()=>{cart=cart.filter(i=>i.id!==b.dataset.remove);saveCart();renderCart()})}

function openModal(id){$("#"+id).classList.add("open");$("#"+id).setAttribute("aria-hidden","false")}
function closeModals(){$$(".modal.open").forEach(m=>{m.classList.remove("open");m.setAttribute("aria-hidden","true")})}
$("#cartOpen").onclick=()=>{renderCart();openModal("cartModal")};
$$("[data-close]").forEach(b=>b.onclick=closeModals);
$$(".modal").forEach(m=>m.onclick=e=>{if(e.target===m)closeModals()});
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeModals()});
$("#projectSearch").oninput=renderProjects;
$("#featuredBtn").onclick=()=>openProject(projects[0]);

// Payment methods — customer picks one at checkout, admin manages the list
function renderPaymentMethodChoices(){
  const box=$("#paymentMethodChoices"); if(!box)return;
  if(!paymentMethods.length){box.innerHTML=`<p class="muted">PAYMENT METHODS ARE LOADING…</p>`;return}
  if(!selectedPaymentMethodId||!paymentMethods.some(m=>m.id===selectedPaymentMethodId))selectedPaymentMethodId=paymentMethods[0].id;
  box.innerHTML=paymentMethods.map(m=>`<label class="pm-option ${m.id===selectedPaymentMethodId?"active":""}"><input type="radio" name="paymentMethodId" value="${m.id}" ${m.id===selectedPaymentMethodId?"checked":""}><span>${esc(m.label)}</span><small>${m.type==="QRIS"?"QRIS":"BANK TRANSFER"}</small>${m.image?`<img class="pm-qr-preview" src="${esc(m.image)}" alt="QRIS" loading="lazy">`:""}</label>`).join("");
  [...box.querySelectorAll('input[name="paymentMethodId"]')].forEach(r=>r.onchange=()=>{selectedPaymentMethodId=r.value;renderPaymentMethodChoices()});
}
async function loadPaymentMethods(){
  const fallback=[{
    id:"pm_qris",
    type:"QRIS",
    label:"QRIS — Semua Bank & E-Wallet",
    image:"assets/zyrex-qris.jpg",
    instructions:"Scan QRIS dengan aplikasi pembayaran kamu.",
    active:true
  }];
  try{
    const data=await jsonFetch(`${CONFIG.apiBase}/payment-methods`,{cache:"no-store"});
    paymentMethods=Array.isArray(data)&&data.length?data:fallback;
  }catch(err){
    console.warn("Payment API unavailable; using QRIS fallback.",err);
    paymentMethods=fallback;
  }
  renderPaymentMethodChoices();
}

let currentOrderId=null;
function openPayment(order){
  currentOrderId=order.orderId;
  $("#paymentOrderId").textContent=order.orderId;
  $("#paymentAmount").textContent=rupiah(order.amount||0);
  const method=order.paymentMethod||{};
  const box=$("#paymentMethodBox");
  if(method.type==="BANK_TRANSFER"){
    box.innerHTML=`<div class="bank-card"><div class="bank-row"><span>BANK</span><b>${esc(method.bankName)}</b></div><div class="bank-row"><span>ACCOUNT NO.</span><b>${esc(method.accountNumber)}</b></div><div class="bank-row"><span>ACCOUNT HOLDER</span><b>${esc(method.accountHolder)}</b></div></div>`;
  } else {
    box.innerHTML=method.image?`<div class="qris-wrap"><img src="${esc(method.image)}" alt="${esc(method.label||"QRIS payment code")}"></div>`:`<p class="muted">No payment code configured for this method yet.</p>`;
  }
  $("#paymentMethodNote").textContent=method.instructions||"Pay the exact total shown above, then upload your payment proof.";
  $("#proofResult").innerHTML="";
  $("#proofForm").reset();
  $("#proofName").textContent="No file selected";
  closeModals(); openModal("paymentModal");
}
$("#proofFile").onchange=()=>{
  const f=$("#proofFile").files[0];
  $("#proofName").textContent=f?`${f.name} · ${(f.size/1024/1024).toFixed(2)} MB`:"No file selected";
};

let qi=0;function renderQuote(){const q=quotes[qi];$("#quoteText").textContent=q[1];$("#quoteBy").textContent="— "+q[0]}
$("#prevQuote").onclick=()=>{qi=(qi+quotes.length-1)%quotes.length;renderQuote()};
$("#nextQuote").onclick=()=>{qi=(qi+1)%quotes.length;renderQuote()};
const liquidNav=$("#liquidNav");
function moveNavPill(link){if(!liquidNav||!link)return;const pill=liquidNav.querySelector(".dock-active-pill");if(!pill)return;const navRect=liquidNav.getBoundingClientRect(),r=link.getBoundingClientRect();pill.style.left=`${r.left-navRect.left}px`;pill.style.width=`${r.width}px`;}
if(liquidNav){
  const navLinks=$$("#liquidNav a");
  navLinks.forEach(a=>a.onclick=()=>{navLinks.forEach(x=>x.classList.remove("active"));a.classList.add("active");moveNavPill(a)});
  const sections=navLinks.map(a=>$(a.getAttribute("href"))).filter(Boolean);
  const navObs=new IntersectionObserver(entries=>{const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];if(!visible)return;const a=navLinks.find(x=>x.getAttribute("href")===`#${visible.target.id}`);if(a){navLinks.forEach(x=>x.classList.remove("active"));a.classList.add("active");moveNavPill(a)}},{rootMargin:"-25% 0px -55% 0px",threshold:[0,.2,.5,.8]});
  sections.forEach(sec=>navObs.observe(sec));
  requestAnimationFrame(()=>moveNavPill(navLinks[0]));window.addEventListener("resize",()=>moveNavPill(navLinks.find(a=>a.classList.contains("active"))));
}
if($("#menuBtn"))$("#menuBtn").onclick=()=>{window.scrollTo({top:0,behavior:"smooth"})};
const observer=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)e.target.classList.add("seen")}),{threshold:.12});
$$(".section").forEach(s=>{s.classList.add("reveal");observer.observe(s)});
const counts=$$("[data-count]");
const countObs=new IntersectionObserver(es=>es.forEach(e=>{if(!e.isIntersecting||e.target.dataset.done)return;e.target.dataset.done=1;const n=+e.target.dataset.count;let x=0;const step=Math.max(1,Math.ceil(n/35));const timer=setInterval(()=>{x=Math.min(n,x+step);e.target.textContent=x.toLocaleString("id-ID");if(x>=n)clearInterval(timer)},28)}),{threshold:.6});
counts.forEach(c=>countObs.observe(c));
window.addEventListener("load",()=>setTimeout(()=>$("#loader").classList.add("done"),1000));

async function loadProducts(){
  try{
    const data=await jsonFetch(`${CONFIG.apiBase}/products`);
    products=Array.isArray(data)?data:[];
    renderProducts();renderCart();
  }catch(err){
    products=FALLBACK_PRODUCTS.map(x=>({...x}));renderProducts();renderCart();toast("Preview catalog aktif — sambungkan API untuk checkout");console.error(err);
  }
}
renderFilters();renderProjects();renderServices();saveCart();renderQuote();loadProducts();loadPaymentMethods();

// V14 GUEST SECURE CHECKOUT — no customer account required.
document.querySelector('#checkoutBtn').onclick=()=>{
  if(!cart.length)return toast('Cart is empty');
  closeModals();renderPaymentMethodChoices();openModal('checkoutModal');
};
document.querySelector('#checkoutForm').onsubmit=async e=>{
  e.preventDefault();
  if(!selectedPaymentMethodId)return toast('Choose a payment method');
  const result=document.querySelector('#checkoutResult');result.innerHTML='<p>Creating secure order…</p>';
  try{
    const data=Object.fromEntries(new FormData(e.target));
    const res=await fetch(`${CONFIG.apiBase}/orders`,{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({customer:{name:data.name,email:data.email},items:cart.map(i=>({productId:i.id,quantity:i.qty})),type:data.type,paymentMethodId:selectedPaymentMethodId})});
    const json=await res.json();if(!res.ok)throw Error(json.error||'Could not create order');
    cart=[];saveCart();closeModals();openPayment(json);
  }catch(err){result.innerHTML=`<p class="notice">${esc(err.message||'Could not create order')}</p>`}
};
document.querySelector('#proofForm').onsubmit=async e=>{
  e.preventDefault();
  const result=document.querySelector('#proofResult'),file=document.querySelector('#proofFile').files[0];
  if(!currentOrderId)return;
  if(!file)return result.innerHTML='<span class="status-error">Choose your payment proof first.</span>';
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))return result.innerHTML='<span class="status-error">Only JPG, PNG or WebP files are accepted.</span>';
  if(file.size>5*1024*1024)return result.innerHTML='<span class="status-error">Proof file must be 5 MB or smaller.</span>';
  result.innerHTML="<span class='status-pending'>Uploading proof securely…</span>";
  const reader=new FileReader();
  reader.onload=async()=>{
    try{
      const res=await fetch(`${CONFIG.apiBase}/payments/proof`,{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({orderId:currentOrderId,proofData:reader.result})});
      const json=await res.json();if(!res.ok)throw Error(json.error||'Upload failed');
      result.innerHTML=`<span class="status-success">✓ Proof submitted. Order ${esc(currentOrderId)} is now WAITING FOR VERIFICATION.</span>`;
      toast('Payment proof submitted');
    }catch(err){result.innerHTML=`<span class="status-error">${esc(err.message||'Could not submit proof.')}</span>`}
  };
  reader.readAsDataURL(file);
};

// ZYREX AI CHAT — API key stays server-side in backend/.env
const aiChat=$("#aiChat"),aiMessages=$("#aiMessages"),aiForm=$("#aiForm"),aiInput=$("#aiInput");
let aiHistory=[];
function toggleAi(open){if(!aiChat)return;aiChat.classList.toggle("open",open);aiChat.setAttribute("aria-hidden",String(!open));if(open)setTimeout(()=>aiInput?.focus(),80)}
$("#aiFab")?.addEventListener("click",()=>toggleAi(true));$("#aiHeadBtn")?.addEventListener("click",()=>toggleAi(true));$("#aiClose")?.addEventListener("click",()=>toggleAi(false));
function addAiMessage(role,text,typing=false){const d=document.createElement("div");d.className=`ai-msg ${role}${typing?" typing":""}`;d.innerHTML=`<small>${role==="user"?"YOU":"ZYREX AI"}</small><p>${esc(text)}</p>`;aiMessages.appendChild(d);aiMessages.scrollTop=aiMessages.scrollHeight;return d}
aiForm?.addEventListener("submit",async e=>{e.preventDefault();const text=aiInput.value.trim();if(!text)return;addAiMessage("user",text);aiInput.value="";aiInput.style.height="44px";aiHistory.push({role:"user",content:text});const typing=addAiMessage("ai","Thinking…",true);try{const r=await fetch(`${CONFIG.apiBase}/ai/chat`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:aiHistory.slice(-12)})});const j=await r.json();if(!r.ok)throw Error(j.error||"AI service unavailable");typing.remove();addAiMessage("ai",j.message||"No response.");aiHistory.push({role:"assistant",content:j.message||""})}catch(err){typing.remove();addAiMessage("ai",`AI belum tersambung: ${err.message}`);aiHistory.pop()}});
aiInput?.addEventListener("input",()=>{aiInput.style.height="44px";aiInput.style.height=Math.min(aiInput.scrollHeight,120)+"px"});

/* ZYREX V9 HYPER INTERACTION LAYER */
(()=>{
  const core=document.getElementById('cursorCore'), ring=document.getElementById('cursorRing');
  if(core&&ring&&matchMedia('(pointer:fine)').matches){
    let x=0,y=0,rx=0,ry=0;
    addEventListener('pointermove',e=>{x=e.clientX;y=e.clientY;core.style.left=x+'px';core.style.top=y+'px'});
    const loop=()=>{rx+=(x-rx)*.14;ry+=(y-ry)*.14;ring.style.left=rx+'px';ring.style.top=ry+'px';requestAnimationFrame(loop)};loop();
    document.querySelectorAll('a,button,.project,.product,.map-node,.service').forEach(el=>{el.addEventListener('mouseenter',()=>{ring.style.width='68px';ring.style.height='68px';ring.style.borderColor='rgba(255,59,212,.75)'});el.addEventListener('mouseleave',()=>{ring.style.width='42px';ring.style.height='42px';ring.style.borderColor='rgba(98,231,255,.55)'})});
  }
  document.querySelectorAll('.project,.product,.map-node,.feature-screen').forEach(card=>{
    card.addEventListener('pointermove',e=>{if(!matchMedia('(pointer:fine)').matches)return;const r=card.getBoundingClientRect();const px=(e.clientX-r.left)/r.width-.5,py=(e.clientY-r.top)/r.height-.5;card.style.transform=`perspective(900px) rotateX(${py*-4}deg) rotateY(${px*5}deg) translateY(-6px)`});
    card.addEventListener('pointerleave',()=>card.style.transform='');
  });
  const hero=document.querySelector('.hero');
  hero?.addEventListener('pointermove',e=>{if(!matchMedia('(pointer:fine)').matches)return;const r=hero.getBoundingClientRect();hero.style.setProperty('--mx',((e.clientX-r.left)/r.width*100)+'%');hero.style.setProperty('--my',((e.clientY-r.top)/r.height*100)+'%')});
})();


/* =========================================================
   ZYREX V10 NEXUS — COMMAND + PARTICLE CORE
   ========================================================= */
(()=>{
  const canvas=document.getElementById('nexusCanvas');
  if(canvas){
    const ctx=canvas.getContext('2d');
    let w=0,h=0,dpr=1,pts=[];
    const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const resize=()=>{dpr=Math.min(devicePixelRatio||1,2);w=innerWidth;h=innerHeight;canvas.width=w*dpr;canvas.height=h*dpr;canvas.style.width=w+'px';canvas.style.height=h+'px';ctx.setTransform(dpr,0,0,dpr,0,0);const n=Math.min(95,Math.floor(w*h/16000));pts=Array.from({length:n},()=>({x:Math.random()*w,y:Math.random()*h,vx:(Math.random()-.5)*.22,vy:(Math.random()-.5)*.22,r:Math.random()*1.4+.3}))};
    resize();addEventListener('resize',resize);
    const draw=()=>{ctx.clearRect(0,0,w,h);if(reduce)return;for(let i=0;i<pts.length;i++){const p=pts[i];p.x+=p.vx;p.y+=p.vy;if(p.x<0||p.x>w)p.vx*=-1;if(p.y<0||p.y>h)p.vy*=-1;ctx.beginPath();ctx.fillStyle='rgba(217,255,88,.42)';ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();for(let j=i+1;j<pts.length;j++){const q=pts[j],dx=p.x-q.x,dy=p.y-q.y,dist=Math.hypot(dx,dy);if(dist<105){ctx.beginPath();ctx.strokeStyle=`rgba(66,245,255,${(1-dist/105)*.10})`;ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke()}}}requestAnimationFrame(draw)};draw();
  }
  const terminal=document.getElementById('nexusTerminalText');
  if(terminal){const lines=['visual core online…','routing signal…','loading creative modules…','store gateway ready…','AI channel armed…','ZYREX V10 / ALL SYSTEMS GO'];let i=0;setInterval(()=>{terminal.textContent=lines[i++%lines.length]},1500)}
  document.querySelectorAll('[data-nexus-jump]').forEach(b=>b.addEventListener('click',()=>document.querySelector(b.dataset.nexusJump)?.scrollIntoView({behavior:'smooth',block:'start'})));
  const palette=document.getElementById('nexusPalette'),input=document.getElementById('paletteInput'),items=[...document.querySelectorAll('[data-palette]')];
  const open=()=>{palette?.classList.add('open');palette?.setAttribute('aria-hidden','false');setTimeout(()=>input?.focus(),50)};
  const close=()=>{palette?.classList.remove('open');palette?.setAttribute('aria-hidden','true');if(input)input.value=''};
  document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();open()}if(e.key==='Escape')close()});
  document.getElementById('paletteClose')?.addEventListener('click',close);
  palette?.addEventListener('click',e=>{if(e.target===palette)close()});
  input?.addEventListener('input',()=>{const q=input.value.toLowerCase();items.forEach(x=>x.style.display=x.textContent.toLowerCase().includes(q)?'grid':'none')});
  items.forEach(x=>x.addEventListener('click',()=>{const v=x.dataset.palette;if(v==='AI'){document.getElementById('aiFab')?.click()}else document.querySelector(v)?.scrollIntoView({behavior:'smooth'});close()}));
  // ambient pointer light
  addEventListener('pointermove',e=>{document.documentElement.style.setProperty('--mx',e.clientX+'px');document.documentElement.style.setProperty('--my',e.clientY+'px')},{passive:true});
})();

/* =========================================================
   ZYREX V11 BLACKSITE — INTERACTION POLISH
   ========================================================= */
(()=>{
  const fine=matchMedia('(pointer:fine)').matches;
  if(fine){
    document.querySelectorAll('.project,.product,.map-node,.deck-grid article,.feature-screen').forEach(card=>{
      card.addEventListener('pointermove',e=>{
        const r=card.getBoundingClientRect(); const x=(e.clientX-r.left)/r.width-.5; const y=(e.clientY-r.top)/r.height-.5;
        card.style.setProperty('--tilt-x',(y*-2.8)+'deg'); card.style.setProperty('--tilt-y',(x*3.8)+'deg');
      });
      card.addEventListener('pointerleave',()=>{card.style.removeProperty('--tilt-x');card.style.removeProperty('--tilt-y')});
    });
  }
  const sections=[...document.querySelectorAll('main section[id], .blacksite-deck')];
  if('IntersectionObserver' in window){
    const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)e.target.classList.add('in-view')}),{threshold:.08});
    sections.forEach(s=>io.observe(s));
  }
  const clock=()=>{const el=document.querySelector('.hud-tr span');if(el){const d=new Date();el.textContent='LOCAL // '+d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'})}};clock();setInterval(clock,1000);
})();


/* V14 PERFORMANCE CORE */
(()=>{
  const mobile=matchMedia('(pointer:coarse), (max-width:900px)').matches;
  if(!mobile)return;
  const canvas=document.getElementById('nexusCanvas');
  if(canvas){canvas.width=1;canvas.height=1;canvas.style.display='none';}
  document.querySelectorAll('.cursor-core,.cursor-ring,.ambient-cursor').forEach(x=>x.remove());
})();

/* V14.4 LARGE QRIS */
(()=>{
  const setup=()=>{
    if(document.getElementById('zyrexQrisLightbox')) return;
    const lb=document.createElement('div');
    lb.id='zyrexQrisLightbox';
    lb.className='qris-lightbox';
    lb.innerHTML='<button type="button" aria-label="Close QRIS">×</button><img alt="QRIS enlarged">';
    document.body.appendChild(lb);
    lb.querySelector('button').onclick=()=>lb.classList.remove('open');
    lb.onclick=e=>{if(e.target===lb)lb.classList.remove('open')};
  };
  const openQris=(src)=>{
    setup();
    const lb=document.getElementById('zyrexQrisLightbox');
    lb.querySelector('img').src=src;
    lb.classList.add('open');
  };
  document.addEventListener('click',e=>{
    const img=e.target.closest('#paymentModal img[src*="qris"],#paymentModal img[alt*="QRIS"],#paymentModal .qris-image,#paymentModal .payment-qr');
    if(img && img.src){e.preventDefault();openQris(img.src);}
  });
})();
