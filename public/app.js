const runtime=document.querySelector('meta[name="rhoizos-base"]');
const base=runtime?.content||'./';
const live=!!runtime;
const asset=live?base+'rhoizos-assets/':'./';
const $=(s,r=document)=>r.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icons={
 search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
 arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>',
 cart:'<path d="M3 4h2l2.2 10.5h10.9L21 7H6M9 20h.01M18 20h.01"/>',
 user:'<circle cx="12" cy="8" r="3.5"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/>',
 menu:'<path d="M4 8h16M4 16h16"/>',
 globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
 note:'<path d="M5 4h14v16H5z"/><path d="M8 8h8M8 12h5"/>',
 lock:'<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>'
};
const icon=n=>'<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">'+(icons[n]||icons.arrow)+'</svg>';
const brand=()=>'<a href="#search" class="brand" aria-label="Rhoizos home"><span class="mark"><img src="'+asset+'assets/rhoizos-mark.svg" alt=""></span><span>Rhoizos</span></a>';
let profile=null,cart=[],tlds=[],menuOpen=false,dnsOrder=null,dnsRecords=[],orders=[];
let previewRecords=[
 {type:'A',name:'@',address:'192.0.2.1',ttl:3600,label:'Website origin'},
 {type:'CNAME',name:'www',cname:'example.com',ttl:3600,label:'Public website'},
 {type:'TXT',name:'@',value:'v=spf1 -all',ttl:3600,label:'Mail policy'}
];
const previewPrices=[
 {tld:'.com',price_registration:19.99,price_renew:19.99,price_transfer:18.99},
 {tld:'.net',price_registration:21.99,price_renew:21.99,price_transfer:20.99},
 {tld:'.org',price_registration:17.99,price_renew:17.99,price_transfer:16.99},
 {tld:'.io',price_registration:59.99,price_renew:59.99,price_transfer:58.99}
];

async function api(scope,method,data={}){
 if(!live)throw Error('Preview only. Connect the live Rhoizos backend to use this action.');
 const csrf=$('meta[name="csrf-token"]')?.content||'';
 const r=await fetch(base+'index.php?_url=/api/'+scope+'/'+method,{
  method:'POST',credentials:'same-origin',
  headers:{'Content-Type':'application/json','Accept':'application/json'},
  body:JSON.stringify({...data,CSRFToken:csrf}),
  signal:AbortSignal.timeout(25000)
 });
 let j;
 try{j=await r.json();}catch{throw Error('The service is temporarily unavailable.');}
 if(!r.ok||j.error)throw Error(j.error?.message||'Request failed');
 return j.result;
}
function money(n){return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(n||0));}
function toast(s){const el=$('#toast');el.textContent=s;clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.textContent='',5000);}
function previewNote(){return live?'':'<p class="preview-note">Design preview · No availability, payment, registration, renewal, or transfer request is sent.</p>';}
function route(){return location.hash.slice(1).split('?')[0]||'search';}
function routeParams(){return new URLSearchParams(location.hash.split('?')[1]||'');}
function setMain(html,cls='page'){ $('#main').innerHTML='<div class="wrap '+cls+'">'+html+'</div>'; }
function title(k,h,p){return '<p class="eyebrow">'+k+'</p><h1>'+h+'</h1>'+(p?'<p class="sub">'+p+'</p>':'');}

function shell(){
 $('#app').innerHTML=
  '<header class="site-header">'+brand()+
  '<nav class="desktop-links" aria-label="Primary"><a href="#search">Search</a><a href="#transfer">Transfer</a><a href="#rdap">RDAP</a></nav>'+
  '<nav class="nav-actions" aria-label="Account">'+
   '<a href="#cart" aria-label="Cart">'+icon('cart')+'<span class="badge" id="cart-count">'+cart.length+'</span></a>'+
   '<a href="#'+(profile?'domains':'login')+'" aria-label="'+(profile?'Account':'Log in')+'">'+icon('user')+'</a>'+
   '<button id="menu-toggle" aria-expanded="'+menuOpen+'" aria-controls="menu" aria-label="Menu">'+icon('menu')+'</button>'+
  '</nav></header>'+
  '<section id="menu" '+(menuOpen?'':'hidden')+'>'+menu()+'</section>'+
  '<main id="main" tabindex="-1"></main>'+
  '<footer><div class="wrap footer-grid"><div><strong>Rhoizos</strong><p>Your domain. Your world.</p></div><div><a href="#search">Search</a><a href="#transfer">Transfer in</a><a href="#rdap">RDAP</a></div><div><a href="#domains">My domains</a><a href="#policies">Privacy & terms</a><a href="#support">Support</a></div><div class="footer-meta">Search, register, transfer, renew and manage DNS.<br>Focused domain infrastructure.</div></div><div class="wrap footer-bottom">© '+new Date().getFullYear()+' Rhoizos</div></footer>';
 $('#menu-toggle').onclick=()=>{menuOpen=!menuOpen;$('#menu').hidden=!menuOpen;$('#menu-toggle').setAttribute('aria-expanded',String(menuOpen));}; const close=$('.menu-close');if(close)close.onclick=()=>{menuOpen=false;$('#menu').hidden=true;$('#menu-toggle').setAttribute('aria-expanded','false');};
}
function menu(){
 const account=profile
  ?'<a href="#domains">My domains</a><a href="#dns">DNS</a><button class="menu-link" id="logout">Log out</button>'
  :'<a href="#login">Log in</a><a href="#signup">Create account</a>';
 return '<div class="menu-panel"><div class="menu-head"><span>Rhoizos</span><button type="button" class="menu-close" aria-label="Close menu">Close</button></div><div class="menu-grid">'+
  '<div><span>Services</span><a href="#search">Domain search</a><a href="#transfer">Transfer in</a><a href="#rdap">RDAP lookup</a></div>'+
  '<div><span>Domains</span><a href="#domains">My domains</a><a href="#dns">DNS management</a><a href="#cart">Checkout</a></div>'+
  '<div><span>Account</span>'+account+'<a href="#policies">Privacy & terms</a><a href="#support">Support</a></div>'+
 '</div></div>';
}
function home(){
 const prices=(live?tlds:previewPrices).slice(0,4);
 setMain(
  '<section class="hero">'+
   '<div class="hero-inner">'+
    '<div class="hero-copy">'+
     '<p class="hero-kicker">Your domain. Your world.</p>'+
     '<h1>你的域名，<br><span>你的世界。</span></h1>'+
     '<p class="sub">搜索、注册、转移、续费和 DNS 管理。只做域名真正需要的事。</p>'+
    '</div>'+
    '<div class="search-area">'+
     '<form id="search-form" class="searchbox">'+
      icon('search')+
      '<input id="domain" aria-label="Domain name" placeholder="Search your domain" required autocomplete="off" spellcheck="false" maxlength="253">'+
      '<button class="primary">Search '+icon('arrow')+'</button>'+
     '</form>'+
     '<div id="results" aria-live="polite"></div>'+
     '<div class="search-links"><a href="#transfer">Transfer a domain</a><a href="#rdap">RDAP lookup</a></div>'+
    '</div>'+
    '<div class="price-strip">'+prices.map(t=>'<div><b>'+esc(t.tld)+'</b><span>'+money(t.price_registration)+'</span><small>/ year</small></div>').join('')+'</div>'+
    previewNote()+
   '</div>'+
  '</section>'+
  '<section class="services">'+
   '<div class="services-intro"><p class="eyebrow">DOMAIN SERVICES</p><h2>Everything essential.<br>Nothing in the way.</h2></div>'+
   '<div class="service-list">'+
    '<a href="#search"><h3>Register</h3><p>Find an available name, see the price, and register it.</p><span>Search domains →</span></a>'+
    '<a href="#transfer"><h3>Transfer & renew</h3><p>Move domains in, renew them, or unlock and transfer out.</p><span>Manage transfers →</span></a>'+
    '<a href="#dns"><h3>DNS management</h3><p>Edit records and keep private notes beside the records that matter.</p><span>Manage DNS →</span></a>'+
   '</div>'+
  '</section>','home'
 );
 $('#search-form').onsubmit=search;
}
function splitDomain(raw){
 let domain=raw.trim().toLowerCase();
 if(/[:/\s@?#]/.test(domain))throw Error('Enter a domain name without URL, path, email, or spaces.');
 try{domain=new URL('https://'+domain).hostname;}catch{throw Error('Enter a valid domain name.');}
 const choices=(tlds.length?tlds:previewPrices).map(t=>t.tld).sort((a,b)=>b.length-a.length);
 let tld=choices.find(t=>domain.endsWith(t));
 if(!domain.includes('.')){tld='.com';domain+=tld;}
 if(!tld)throw Error('This extension is not currently offered.');
 const sld=domain.slice(0,-tld.length);
 if(!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(sld))throw Error('Enter one registrable domain label.');
 return {domain,sld,tld};
}
async function search(e){
 e.preventDefault();
 const box=$('#results'),button=$('button[type="submit"]',e.target)||$('button',e.target);
 button.disabled=true;
 box.innerHTML='<p class="loading">Checking availability…</p>';
 try{
  const d=splitDomain($('#domain').value);
  const price=(tlds.length?tlds:previewPrices).find(x=>x.tld===d.tld)||{};
  if(!live){
   box.innerHTML='<div class="result-card"><div><span class="status neutral">Preview</span><h2>'+esc(d.domain)+'</h2><p>Availability is not queried in design preview.</p></div><div class="result-action"><strong>'+money(price.price_registration)+'</strong><button class="secondary" disabled>Live connection required</button></div></div>';
   return;
  }
  await api('guest','servicedomain/check',d);
  const p=await api('guest','servicedomain/pricing',d);
  box.innerHTML='<div class="result-card"><div><span class="status">Available</span><h2>'+esc(d.domain)+'</h2><p>Renews at '+money(p.price_renew)+'/year.</p></div><div class="result-action"><strong>'+money(p.price_registration)+'</strong><button class="primary" id="register-domain">Register</button></div></div>';
  $('#register-domain').onclick=async()=>{try{await addCart(d,'register');location.hash='cart';}catch(x){toast(x.message);}};
 }catch(x){box.innerHTML='<p class="error">'+esc(x.message)+'</p>';}
 finally{button.disabled=false;}
}
async function addCart(d,action,code=''){
 await api('guest','rhoizos/add_domain',{...d,action,transfer_code:code});
 await refreshCart();
 const c=$('#cart-count');if(c)c.textContent=cart.length;
}
async function refreshCart(){if(!live)return;const r=await api('guest','cart/get');cart=r.items||[];}

function transfer(){
 setMain('<div class="narrow">'+title('TRANSFER IN','Bring your domain with you.','Enter the domain and its EPP/Auth code. The transfer price is confirmed before payment.')+
  '<form id="transfer-form" class="panel"><label>Domain<input name="domain" placeholder="example.com" required></label><label>EPP / Auth code<input name="code" type="password" autocomplete="off" required maxlength="80"></label><p class="fine">Unlock the domain at your current registrar first. Registry transfer rules still apply.</p><p class="error" id="form-error"></p><button class="primary">Continue to checkout '+icon('arrow')+'</button></form>'+previewNote()+'</div>');
 form('#transfer-form',async d=>{
  const domain=splitDomain(d.domain);
  if(!live)throw Error('Transfer is disabled in design preview.');
  await api('guest','servicedomain/can_be_transferred',domain);
  await addCart(domain,'transfer',d.code);
  location.hash='cart';
 });
}
function field(label,name,type='text',extra=''){return '<label>'+label+'<input name="'+name+'" type="'+type+'" required '+extra+'></label>';}
function form(selector,fn){
 const el=$(selector);if(!el)return;
 el.onsubmit=async e=>{
  e.preventDefault();
  const b=$('button[type="submit"],button:not([type])',e.target);if(b)b.disabled=true;
  const err=$('#form-error',e.target);if(err)err.textContent='';
  try{await fn(Object.fromEntries(new FormData(e.target)));}
  catch(x){if(err)err.textContent=x.message;else toast(x.message);}
  finally{if(b)b.disabled=false;}
 };
}
function auth(signup=false){
 setMain('<div class="auth '+(signup?'':'auth-small')+'">'+title('ACCOUNT',signup?'Create account.':'Welcome back.',signup?'One contact profile is used for your domain registration details.':'Access your domains, renewals, transfers and DNS.')+
 '<form id="auth-form" class="panel">'+
 (signup?'<div class="form-grid">'+field('First name','first_name','text','autocomplete="given-name" maxlength="125"')+field('Last name','last_name','text','autocomplete="family-name" maxlength="125"')+
 '<label class="full">Account type<select name="type" id="account-type" aria-label="Account type"><option value="individual">Individual</option><option value="company">Company / organization</option></select></label>'+
 '<label class="full">Company / organization <span class="muted">(required for company accounts)</span><input name="company" id="company" autocomplete="organization" maxlength="255"></label></div>':'')+
 '<div class="form-grid">'+field('Email','email','email','autocomplete="email" maxlength="255"')+
 (signup?field('Phone','phone_full','tel','placeholder="+86.13800138000" pattern="\\+[0-9]{1,3}\\.[0-9]{4,14}" maxlength="17"'):'')+
 field('Password','password','password','autocomplete="'+(signup?'new-password':'current-password')+'" minlength="12"')+
 (signup?field('Confirm password','password_confirm','password','autocomplete="new-password" minlength="12"'):'')+'</div>'+
 (signup?'<div class="form-grid"><label>Country / region<select name="country" id="country" required><option value="">Select country</option></select></label>'+field('State / province','state','text','autocomplete="address-level1"')+field('City','city','text','autocomplete="address-level2"')+field('Postal / ZIP','postcode','text','autocomplete="postal-code" maxlength="16"')+'<div class="full">'+field('Street address','address_1','text','autocomplete="street-address" maxlength="255"')+'</div></div><p class="fine">Use Latin characters for registry contact fields. Use 00000 only where your location has no postal code.</p><label class="check"><input type="checkbox" name="consent" required> I confirm the details are accurate and accept the <a href="#policies">privacy & terms</a>.</label>':'')+
 '<p class="error" id="form-error"></p><div class="form-actions"><button class="primary">'+(signup?'Create account':'Log in')+'</button><a href="#'+(signup?'login':'signup')+'">'+(signup?'Already have an account?':'Create account')+'</a></div>'+
 (signup?'':'<button type="button" class="text-button" id="reset-password">Forgot password?</button>')+'</form>'+previewNote()+'</div>');
 if(signup){
  const names=new Intl.DisplayNames(['en'],{type:'region'}),countries=[];
  for(let a=65;a<=90;a++)for(let b=65;b<=90;b++){const code=String.fromCharCode(a,b),name=names.of(code);if(name&&name!==code&&!['EU','UN','EZ','QO','XA','XB','ZZ'].includes(code))countries.push([code,name]);}
  $('#country').innerHTML+=[...countries].sort((a,b)=>a[1].localeCompare(b[1])).map(x=>'<option value="'+x[0]+'">'+esc(x[1])+'</option>').join('');
  $('#account-type').onchange=e=>$('#company').required=e.target.value==='company';
 }else{
  $('#reset-password').onclick=openReset;
 }
 form('#auth-form',async d=>{
  if(signup){
   if(d.password!==d.password_confirm)throw Error('Passwords do not match.');
   if(!live)throw Error('Account creation is disabled in design preview.');
   await api('guest','rhoizos/signup',d);toast('Account created. Check your email, then log in.');location.hash='login';
  }else{
   if(!live)throw Error('Login is disabled in design preview.');
   await api('guest','client/login',d);location.href=base+'index.php?_url=/rhoizos#domains';
  }
 });
}
function modal(head,body){
 $('#modal').innerHTML='<div class="dialog-head"><h2 id="modal-title">'+head+'</h2><button class="dialog-close" aria-label="Close">×</button></div><div class="dialog-body">'+body+'</div>';
 $('.dialog-close').onclick=()=>$('#modal').close();
 $('#modal').showModal();
}
function openReset(){
 modal('Reset password','<form id="reset-form">'+field('Email','email','email','autocomplete="email"')+'<p class="error" id="form-error"></p><button class="primary">Send reset email</button></form>');
 form('#reset-form',async d=>{if(!live)throw Error('Password reset is disabled in preview.');await api('guest','client/reset_password',d);$('#modal').close();toast('If the account exists, a reset email will be sent.');});
}
function requireLogin(){
 if(live&&!profile){setMain('<div class="narrow">'+title('ACCOUNT','Log in to continue.','Your domains and DNS records are private to your account.')+'<a class="primary inline" href="#login">Log in</a></div>');return true;}
 return false;
}

async function cartPage(){
 setMain('<div class="narrow">'+title('CHECKOUT','Confirm and pay.','Review the order before continuing to payment.')+'<div id="cart-body"><p class="loading">Loading cart…</p></div>'+previewNote()+'</div>');
 if(!live){
  $('#cart-body').innerHTML='<div class="panel"><div class="empty-state"><h2>Checkout preview</h2><p>Add-to-cart and payment are intentionally disabled until the live backend is connected.</p></div></div>';
  return;
 }
 try{
  await refreshCart();
  $('#cart-body').innerHTML=cart.length?'<div class="panel">'+cart.map(c=>'<div class="cart-row"><div><strong>'+esc(c.title)+'</strong><span>'+esc(c.period||'1 year')+'</span></div><div><b>'+money(c.total??c.price)+'</b><button class="text-button" data-remove="'+esc(c.id)+'">Remove</button></div></div>').join('')+
   '<label class="check"><input type="checkbox" id="checkout-consent"> I accept the privacy & terms and authorize the required registrar submission.</label><button class="primary wide" id="checkout">'+(profile?'Pay with crypto':'Log in to continue')+'</button></div>'
   :'<div class="panel empty-state"><h2>Your cart is empty.</h2><p>Search for a domain or start a transfer.</p><a class="secondary inline" href="#search">Search domains</a></div>';
  const checkout=$('#checkout');
  if(checkout)checkout.onclick=async()=>{
   if(!profile){location.hash='login';return;}
   if(!$('#checkout-consent').checked){toast('Accept the terms before checkout.');return;}
   checkout.disabled=true;
   try{
    const result=await api('client','rhoizos/checkout',{consent:true});
    if(result.invoice_hash)location.href=base+'index.php?_url=/invoice/'+encodeURIComponent(result.invoice_hash);
    else{toast('Order created.');location.hash='domains';}
   }catch(x){toast(x.message);checkout.disabled=false;}
  };
 }catch(x){$('#cart-body').innerHTML='<p class="error">'+esc(x.message)+'</p>';}
}

async function domains(){
 if(requireLogin())return;
 setMain('<div class="page-head"><div>'+title('MY DOMAINS','Your domains.','Register, renew, manage DNS, or transfer out when you need to.')+'</div><a href="#search" class="secondary inline">Register a domain</a></div><div id="domain-list"><p class="loading">Loading domains…</p></div>'+previewNote());
 try{
  const data=live?await api('client','order/get_list',{type:'domain',per_page:100,page:1}):{list:[{id:1,title:'example.com',status:'active',expires_at:'2027-09-25'}]};
  orders=data.list||[];
  $('#domain-list').innerHTML=orders.length?'<div class="domain-list">'+orders.map(o=>
   '<article class="domain-card"><div class="domain-main"><span class="status '+(o.status==='active'?'':'neutral')+'">'+esc(o.status)+'</span><h2>'+esc(o.title)+'</h2><p>Expires <strong>'+esc((o.expires_at||'Pending').split(' ')[0])+'</strong></p></div><div class="domain-actions"><button class="secondary" data-manage="'+esc(o.id)+'">DNS</button><button class="secondary" data-renew="'+esc(o.id)+'" data-domain="'+esc(o.title)+'">Renew</button><button class="secondary" data-transfer-out="'+esc(o.id)+'" data-domain="'+esc(o.title)+'">Transfer out</button></div></article>'
  ).join('')+'</div>':'<div class="panel empty-state"><h2>No domains yet.</h2><p>Your registered or transferred domains will appear here.</p><a class="primary inline" href="#search">Search domains</a></div>';
 }catch(x){$('#domain-list').innerHTML='<p class="error">'+esc(x.message)+'</p>';}
}
function renewDomain(id,domain){
 modal('Renew '+esc(domain),'<p>Renewal creates an invoice at your configured renewal price. Payment is completed through the crypto checkout.</p><form id="renew-form"><p class="error" id="form-error"></p><button class="primary">Create renewal invoice</button></form>');
 form('#renew-form',async()=>{
  if(!live)throw Error('Renewal is disabled in design preview.');
  const hash=await api('client','invoice/renewal_invoice',{order_id:Number(id)});
  location.href=base+'index.php?_url=/invoice/'+encodeURIComponent(hash);
 });
}
function transferOut(id,domain){
 modal('Transfer out '+esc(domain),'<div class="transfer-warning">'+icon('lock')+'<div><strong>You stay in control.</strong><p>Unlock the domain only when you are ready to move it. The EPP/Auth code is sensitive.</p></div></div><p class="error" id="transfer-error"></p><button class="primary" id="reveal-epp">Unlock & reveal EPP code</button>');
 $('#reveal-epp').onclick=async()=>{
  const b=$('#reveal-epp'),err=$('#transfer-error');b.disabled=true;err.textContent='';
  try{
   if(!live)throw Error('Transfer-out actions are disabled in design preview.');
   await api('client','servicedomain/unlock',{order_id:Number(id)});
   const code=await api('client','servicedomain/get_transfer_code',{order_id:Number(id)});
   $('.dialog-body').innerHTML='<p class="fine">Domain unlocked. Share this code only with your new registrar.</p><div class="secret-code"><code>'+esc(code)+'</code></div><button class="secondary" id="relock-domain">Lock domain again</button>';
   $('#relock-domain').onclick=async()=>{try{await api('client','servicedomain/lock',{order_id:Number(id)});$('#modal').close();toast('Domain locked again.');}catch(x){toast(x.message);}};
  }catch(x){err.textContent=x.message;b.disabled=false;}
 };
}

async function dns(){
 if(requireLogin())return;
 setMain('<div class="page-head"><div>'+title('DNS','Records, without the clutter.','Every record can carry a private note that is visible only inside Rhoizos.')+'</div><button class="primary" id="add-record">Add record</button></div><div class="toolbar"><label>Domain<select id="dns-domain"><option>Loading…</option></select></label><button class="secondary" id="nameservers">Nameservers</button></div><div id="dns-body"></div>'+previewNote());
 try{
  const r=live?await api('client','order/get_list',{type:'domain',status:'active',per_page:100,page:1}):{list:[{id:1,title:'example.com'}]};
  orders=r.list||[];
  $('#dns-domain').innerHTML=orders.length?orders.map(o=>'<option value="'+esc(o.id)+'">'+esc(o.title)+'</option>').join(''):'<option value="">No active domains</option>';
  const requested=routeParams().get('id');
  if(requested&&orders.some(o=>String(o.id)===requested))dnsOrder=requested;
  if(dnsOrder&&orders.some(o=>String(o.id)===String(dnsOrder)))$('#dns-domain').value=dnsOrder;
  $('#dns-domain').onchange=loadDns;
  $('#add-record').onclick=recordDialog;
  $('#nameservers').onclick=nameservers;
  await loadDns();
 }catch(x){$('#dns-body').innerHTML='<p class="error">'+esc(x.message)+'</p>';}
}
async function loadDns(){
 dnsOrder=$('#dns-domain').value;
 $('#add-record').disabled=!dnsOrder;$('#nameservers').disabled=!dnsOrder;
 if(!dnsOrder){$('#dns-body').innerHTML='<div class="panel empty-state">No active domain to manage.</div>';return;}
 $('#dns-body').innerHTML='<p class="loading">Loading DNS…</p>';
 try{
  const r=live?await api('client','rhoizos/dns_list',{order_id:dnsOrder}):{items:previewRecords};
  dnsRecords=r.items||[];
  $('#dns-body').innerHTML='<div class="dns-list"><div class="dns-head"><span>Type</span><span>Name</span><span>Value</span><span>TTL</span><span>Private note</span><span></span></div>'+
   dnsRecords.map((r,i)=>'<div class="dns-row"><code>'+esc(r.type)+'</code><span>'+esc(r.name)+'</span><code class="dns-value">'+esc(recordValue(r))+'</code><span>'+esc(r.ttl)+'</span><button class="note-button" data-label="'+i+'">'+icon('note')+' '+esc(r.label||'Add note')+'</button><button class="text-button danger" data-delete="'+i+'">Delete</button></div>').join('')+
   (dnsRecords.length?'':'<div class="empty-state">No DNS records.</div>')+'</div>';
 }catch(x){$('#dns-body').innerHTML='<p class="error">'+esc(x.message)+'</p>';}
}
function recordValue(r){return r.address??r.cname??r.exchange??r.value??r.target??'';}
function recordDialog(){
 modal('Add DNS record','<form id="record-form"><div class="form-grid"><label>Type<select name="type"><option>A</option><option>AAAA</option><option>CNAME</option><option>TXT</option><option>MX</option></select></label>'+field('Name','name','text','value="@" maxlength="253"')+'<div class="full">'+field('Value','value','text','maxlength="2048"')+'</div>'+field('TTL','ttl','number','value="3600" min="60" max="3600"')+field('MX priority','preference','number','value="10" min="0" max="65535"')+'<label class="full">Private note<input name="label" maxlength="80" placeholder="e.g. Website origin"></label></div><p class="error" id="form-error"></p><button class="primary">Save record</button></form>');
 form('#record-form',async d=>{
  if(!live){
   const key={A:'address',AAAA:'address',CNAME:'cname',TXT:'value',MX:'exchange'}[d.type];
   previewRecords.push({type:d.type,name:d.name,[key]:d.value,ttl:Number(d.ttl),label:d.label});
  }else await api('client','rhoizos/dns_add',{order_id:dnsOrder,...d});
  $('#modal').close();await loadDns();toast('Record saved.');
 });
}
function labelDialog(i){
 const r=dnsRecords[i];
 modal('Private note','<form id="label-form"><label>Note<input name="label" maxlength="80" value="'+esc(r.label||'')+'" placeholder="What is this record for?"></label><p class="fine">This note is stored in Rhoizos and is never published in DNS.</p><p class="error" id="form-error"></p><button class="primary">Save note</button></form>');
 form('#label-form',async d=>{if(live)await api('client','rhoizos/dns_label',{order_id:dnsOrder,record:r,label:d.label});else r.label=d.label;$('#modal').close();await loadDns();});
}
function deleteRecord(i){
 const r=dnsRecords[i];
 modal('Delete DNS record?','<p>Remove <strong>'+esc(r.type)+' '+esc(r.name)+'</strong> → '+esc(recordValue(r))+'?</p><p class="fine">This may interrupt the service that depends on it.</p><form id="delete-form"><p class="error" id="form-error"></p><button class="primary">Delete record</button></form>');
 form('#delete-form',async()=>{if(live)await api('client','rhoizos/dns_delete',{order_id:dnsOrder,record:r});else previewRecords.splice(i,1);$('#modal').close();await loadDns();});
}
function nameservers(){
 modal('Nameservers','<form id="ns-form">'+field('Nameserver 1','ns1','text','placeholder="ns1.example.com"')+field('Nameserver 2','ns2','text','placeholder="ns2.example.com"')+'<p class="fine">Changing nameservers can move DNS hosting away from the current provider.</p><p class="error" id="form-error"></p><button class="primary">Update nameservers</button></form>');
 form('#ns-form',async d=>{if(!live)throw Error('Nameserver changes are disabled in preview.');await api('client','servicedomain/update_nameservers',{order_id:dnsOrder,...d});$('#modal').close();toast('Nameservers updated.');});
}

function rdap(){
 setMain('<div class="narrow">'+title('RDAP','Read the public record.','Look up registry-published domain information without leaving Rhoizos.')+'<form id="rdap-form" class="searchbox compact">'+icon('search')+'<input name="domain" aria-label="Domain to look up" placeholder="example.com" required><button class="primary">Lookup</button></form><div id="rdap-result"></div>'+previewNote()+'</div>');
 $('#rdap-form').onsubmit=async e=>{
  e.preventDefault();const out=$('#rdap-result');out.innerHTML='<p class="loading">Looking up domain…</p>';
  try{
   if(!live)throw Error('RDAP requests are disabled in design preview.');
   const d=await api('guest','rhoizos/rdap',{domain:new FormData(e.target).get('domain')});
   out.innerHTML='<div class="panel rdap-card"><span class="status neutral">'+esc((d.status||[]).join(' · ')||'RDAP')+'</span><h2>'+esc(d.ldhName||'')+'</h2>'+(d.events||[]).map(v=>'<div class="detail-row"><span>'+esc(v.eventAction)+'</span><strong>'+esc(v.eventDate)+'</strong></div>').join('')+'<h3>Nameservers</h3>'+(d.nameservers||[]).map(n=>'<code>'+esc(n.ldhName)+'</code>').join('');
  }catch(x){out.innerHTML='<p class="error">'+esc(x.message)+'</p>';}
 };
}
function policies(){
 setMain('<article class="article">'+title('PRIVACY & TERMS','Clear rules, no mythology.','A short operational baseline for the service.')+
 '<h2>Domain data</h2><p>Accurate registration contact data is required where applicable and is submitted to the configured registrar and relevant registry. Rhoizos does not promise anonymous domain registration.</p>'+
 '<h2>Payments</h2><p>Crypto payments are processed through NOWPayments. A payment confirmation and a completed domain provisioning operation are separate states.</p>'+
 '<h2>Acceptable use</h2><p>Do not use the service for phishing, malware, fraud, unlawful exploitation, or activity prohibited by applicable registrar or registry rules.</p>'+
 '<h2>Transfers</h2><p>You can request the transfer code for an eligible domain. Registry locks, transfer windows, verification, and other registry rules still apply.</p>'+
 '<h2>Operator details</h2><p>Legal identity, jurisdiction, retention periods, refund terms, and abuse contact must be published before production launch.</p></article>');
}
function support(){
 setMain('<article class="article">'+title('SUPPORT','Direct, when you need it.','Account, payment, registration, renewal, transfer, and DNS support.')+'<div id="support-details" class="panel">Support contact is not configured in design preview.</div></article>');
 if(live)api('guest','rhoizos/support').then(d=>{$('#support-details').innerHTML=d.email?'<p>Email <a href="mailto:'+esc(d.email)+'">'+esc(d.email)+'</a></p>'+(d.pgp?'<pre>'+esc(d.pgp)+'</pre>':''):'Support contact has not been configured.';}).catch(x=>toast(x.message));
}
async function render(){
 menuOpen=false;shell();
 const views={search:home,transfer,login:()=>auth(false),signup:()=>auth(true),cart:cartPage,domains,dashboard:domains,dns,rdap,policies,support};
 await (views[route()]||home)();
 window.scrollTo(0,0);
}
document.addEventListener('click',async e=>{
 const el=e.target.closest('button');if(!el)return;
 if(el.dataset.route)location.hash=el.dataset.route;
 if(el.dataset.manage){dnsOrder=el.dataset.manage;location.hash='dns?id='+encodeURIComponent(el.dataset.manage);}
 if(el.dataset.renew)renewDomain(el.dataset.renew,el.dataset.domain||'domain');
 if(el.dataset.transferOut)transferOut(el.dataset.transferOut,el.dataset.domain||'domain');
 if(el.dataset.label!==undefined)labelDialog(Number(el.dataset.label));
 if(el.dataset.delete!==undefined)deleteRecord(Number(el.dataset.delete));
 if(el.dataset.remove){try{await api('guest','cart/remove_item',{id:el.dataset.remove});await cartPage();const c=$('#cart-count');if(c)c.textContent=cart.length;}catch(x){toast(x.message);}}
 if(el.id==='logout'){try{await api('client','profile/logout');profile=null;location.href=base+'index.php?_url=/rhoizos';}catch(x){toast(x.message);}}
});
document.addEventListener('click',e=>{if(e.target.closest('#menu a')){menuOpen=false;const panel=$('#menu');if(panel)panel.hidden=true;}});
window.addEventListener('hashchange',render);
if(live){
 try{tlds=await api('guest','servicedomain/tlds',{allow_register:true});}catch{}
 try{profile=await api('client','profile/get');}catch{}
 try{await refreshCart();}catch{}
}else tlds=previewPrices;
await render();
