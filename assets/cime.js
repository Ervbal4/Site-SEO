/* ==========================================================================
   CIME PRÉVOYANCE — scripts partagés (v2.0)
   <script src="[racine]/assets/cime.js" defer></script>

   Chaque module ne s'active que si les éléments qu'il cible existent sur la page.
   Le site reste lisible et les formulaires restent visibles sans JavaScript.

   1 Configuration        2 Utilitaires            3 Leads (validation, envoi nLPD)
   4 Formulaires de lead  5 Navigation & en-tête   6 Sommaire d'article
   7 Orientation          8 Estimation express 3a  9 Relief du héros (canvas)
   ========================================================================== */
(function(){
'use strict';

/* ---------- 1. Configuration (modifiable sans toucher au reste) ---------- */
window.CIME_CONFIG=Object.assign({
  // Webhook qui reçoit les demandes (Make, n8n, Zapier, CRM...). POST application/x-www-form-urlencoded.
  // Champs transmis : demande, prenom, nom, email, tel, profil, sujet, creneau, message, consent,
  // canton, versement, source, page, ts.
  endpoint:'',
  // Widget de réservation (Cal.com, Calendly...) affiché sur la page rendez-vous, ex. https://cal.com/cime/15min?embed=true
  booking:{url:''},
  // Repli e-mail : uniquement une adresse réelle. Vide = le formulaire signale que l'envoi n'est pas activé.
  mailto:'',
  // Plafonds 3a (OFAS / AFC). 2027 : communiqué du Conseil fédéral du 02.10.2026.
  plafond3a:{salarie:7258,independant:36288},
  plafond3a2027:{salarie:7373,independant:36864},
  // Rente AVS mensuelle minimale (la maximale vaut le double)
  avsRente:{min:1260,max:2520},
  avsRente2027:{min:1280,max:2560},
  // LPP 2026 : déduction de coordination et salaire maximal assuré (2027 : 26880 / 92160)
  lpp:{coordination:26460,salaireMax:90720},
  // CMU frontaliers : abattement = 25 % du PASS 2026 (48 060 €)
  cmuAbattement:12015
},window.CIME_CONFIG||{});

/* ---------- 2. Utilitaires ---------- */
var doc=document,$=function(id){return doc.getElementById(id)},$$=function(sel,root){return [].slice.call((root||doc).querySelectorAll(sel))};
var reduce=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
// Racine du site, déduite de l'emplacement de ce fichier (/assets/cime.js) : fonctionne à toute profondeur.
var ROOT=(function(){var s=doc.currentScript||$$('script[src*="assets/cime.js"]')[0];try{return new URL('../',s.src).href}catch(_){return ''}})();
var fmt=function(n){return Math.round(n).toLocaleString('fr-CH').replace(/[\s  ']/g,'’')};
function track(name,data){try{window.dataLayer=window.dataLayer||[];window.dataLayer.push(Object.assign({event:name},data||{}))}catch(_){}}
doc.documentElement.classList.add('js');
$$('[data-year]').forEach(function(el){el.textContent=new Date().getFullYear()});
window.Cime={root:ROOT,fmt:fmt,track:track};

/* ---------- 3. Leads : validation accessible et envoi ---------- */
var CimeLead=window.CimeLead=(function(){
  var MSG={
    prenom:'Indiquez votre prénom.',
    nom:'Indiquez votre nom.',
    email:'Indiquez une adresse e-mail valide, par exemple nom@exemple.ch.',
    tel:'Indiquez un numéro de téléphone joignable (ex. 079 123 45 67).',
    consent:'Cochez cette case pour que nous puissions traiter votre demande.'
  };
  var ICON={info:'info',ok:'ok',err:'alert'};
  function box(form,name){return form.querySelector('#err-'+name+'-'+(form.id||'f'))}
  function setErr(form,name,msg){
    var el=form.elements[name],b=box(form,name);if(!el||!b)return;
    if(msg){b.hidden=false;b.querySelector('.t').textContent=msg;el.setAttribute('aria-invalid','true');el.setAttribute('aria-describedby',b.id)}
    else{b.hidden=true;el.removeAttribute('aria-invalid');el.removeAttribute('aria-describedby')}
  }
  /* rules : {champ:true|false} — true = obligatoire, false = format vérifié s'il est rempli.
     Retourne le premier champ invalide (qui reçoit le focus) ou null. */
  function validate(form,rules){
    var first=null;
    Object.keys(rules).forEach(function(name){
      var el=form.elements[name];if(!el)return;
      var v=el.type==='checkbox'?el.checked:String(el.value||'').trim(),bad=false;
      if(rules[name]&&!v)bad=true;
      else if(v&&name==='email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v))bad=true;
      else if(v&&name==='tel'&&String(v).replace(/\D/g,'').length<7)bad=true;
      setErr(form,name,bad?(MSG[name]||'Ce champ est à compléter.'):'');
      if(bad&&!first)first=el;
    });
    if(first)first.focus();
    return first;
  }
  function watch(form){['input','change'].forEach(function(ev){form.addEventListener(ev,function(e){var n=e.target.name;if(n&&e.target.getAttribute('aria-invalid'))setErr(form,n,'')})})}
  function status(el,kind,text){
    if(!el)return;el.className='msg '+kind;
    el.innerHTML='<svg class="i" aria-hidden="true"><use href="#i-'+ICON[kind]+'"/></svg><span></span>';
    el.lastChild.textContent=text;
  }
  /* Résultats : {ok:true} transmis · {unavailable:true} aucun canal · {mailto:true} · {ok:false} échec */
  function send(payload,subject){
    if(payload.website)return Promise.resolve({ok:true});   // champ piège anti-robots : aucun envoi
    delete payload.website;
    var cfg=window.CIME_CONFIG;
    if(cfg.endpoint){
      var body=new URLSearchParams();
      Object.keys(payload).forEach(function(k){var v=payload[k];body.append(k,v!==null&&typeof v==='object'?JSON.stringify(v):String(v))});
      return fetch(cfg.endpoint,{method:'POST',body:body,mode:'no-cors'}).then(function(){track('lead_submit',{source:payload.source||'',sujet:payload.sujet||'',demande:payload.demande||''});return{ok:true}}).catch(function(){return{ok:false}});
    }
    if(cfg.mailto){
      var lines=Object.keys(payload).map(function(k){return k+' : '+payload[k]}).join('\n');
      location.href='mailto:'+cfg.mailto+'?subject='+encodeURIComponent(subject||'Demande assurémentSuisse')+'&body='+encodeURIComponent(lines);
      return Promise.resolve({mailto:true});
    }
    return Promise.resolve({unavailable:true});
  }
  function report(el,r,okText){
    if(r.ok){status(el,'ok',okText||'Merci, votre demande a bien été transmise. Un spécialiste vous répond par écrit.');return true}
    if(r.mailto){status(el,'info','Votre messagerie s’ouvre avec la demande préremplie. Elle sera transmise une fois le message envoyé.');return false}
    if(r.unavailable){status(el,'err','L’envoi des demandes n’est pas encore activé sur ce site : votre demande n’a pas été transmise.');return false}
    status(el,'err','L’envoi n’a pas abouti et votre demande n’a pas été transmise. Réessayez dans quelques instants.');return false;
  }
  return{validate:validate,watch:watch,send:send,status:status,report:report};
})();

/* ---------- 4. Formulaires de lead ----------
   <form data-lead data-required="prenom,nom,email,tel,consent" data-source="accueil">
   Option : fieldset.step (plusieurs étapes) + #<id>-progl (libellé) + .bar-steps i (progression).
   Prénom et Nom sont toujours transmis dans deux champs distincts : prenom, nom. */
$$('form[data-lead]').forEach(function(f){
  var params=new URLSearchParams(location.search);
  var req=(f.getAttribute('data-required')||'prenom,nom,email,tel,consent').split(','),chk=(f.getAttribute('data-check')||'').split(',');
  var rules={};chk.forEach(function(n){if(n)rules[n]=false});req.forEach(function(n){if(n)rules[n]=true});
  var msg=f.querySelector('.msg[role=status]');
  // Préremplissage depuis l'URL (?demande=echange&sujet=lpp&profil=independant)
  ['demande','sujet','profil'].forEach(function(k){
    var v=params.get(k),el=f.elements[k];if(!v||!el)return;
    if(el.tagName==='SELECT'){if([].some.call(el.options,function(o){return o.value===v}))el.value=v}
    else if(el.length){[].forEach.call(el,function(r){if(r.value===v)r.checked=true})}
    else if(el.type==='hidden')el.value=v;
  });
  CimeLead.watch(f);

  // Étapes
  var steps=$$('fieldset.step',f),cur=0,progl=f.querySelector('.progress'),bars=$$('.bar-steps i',f);
  function show(n,focus){
    cur=n;steps.forEach(function(s,i){s.hidden=i!==n});
    if(progl)progl.textContent='Étape '+(n+1)+' sur '+steps.length+' : '+(steps[n].getAttribute('data-title')||'');
    bars.forEach(function(b,i){b.className=i<=n?'on':''});
    if(focus){var first=steps[n].querySelector('input:not([type=hidden]):not(.hp),select,textarea');if(first)first.focus()}
  }
  if(steps.length>1){
    $$('[data-step-ui]',f).forEach(function(el){el.hidden=false});
    $$('[data-next]',f).forEach(function(b){b.addEventListener('click',function(){show(cur+1,true)})});
    $$('[data-prev]',f).forEach(function(b){b.addEventListener('click',function(){show(cur-1,true)})});
    show(0,false);
  }

  f.addEventListener('submit',function(e){
    e.preventDefault();
    if(steps.length>1&&cur<steps.length-1){show(cur+1,true);return}
    if(CimeLead.validate(f,rules)){CimeLead.status(msg,'err','Certains champs sont à compléter avant l’envoi.');return}
    var d={};new FormData(f).forEach(function(v,k){d[k]=typeof v==='string'?v.trim():v});
    d.consent=d.consent?'oui':'non';
    ['canton','versement'].forEach(function(k){if(params.get(k))d[k]=params.get(k)});
    // Données complémentaires fournies par la page (ex. résultats d'un simulateur)
    if(typeof window.CimeLeadExtra==='function'){try{Object.assign(d,window.CimeLeadExtra(f)||{})}catch(_){}}
    d.source=params.get('source')||f.getAttribute('data-source')||'direct';
    d.page=location.pathname;d.ts=new Date().toISOString();
    var btn=f.querySelector('button[type=submit]');btn.disabled=true;btn.setAttribute('aria-busy','true');
    CimeLead.send(d,'Demande assurémentSuisse – '+d.prenom+' '+d.nom).then(function(r){
      btn.disabled=false;btn.removeAttribute('aria-busy');
      if(CimeLead.report(msg,r)){f.reset();if(steps.length>1)show(0,false)}
    });
  });
});

// Widget de réservation (page rendez-vous)
(function(){
  var box=$('booking'),url=window.CIME_CONFIG.booking&&window.CIME_CONFIG.booking.url;
  if(!box||!url)return;
  var fr=doc.createElement('iframe');fr.src=url;fr.title='Réserver un créneau de 15 minutes';fr.loading='lazy';fr.className='booking-frame';
  box.appendChild(fr);box.hidden=false;
})();


/* ---------- Onglets de profil (accueil) ---------- */
(function(){
  var list=doc.querySelector('.hub-tabs');if(!list)return;
  var tabs=$$('[role=tab]',list),panels=tabs.map(function(t){return doc.getElementById(t.getAttribute('aria-controls'))});
  function sel(i,focus){tabs.forEach(function(t,k){var on=k===i;t.setAttribute('aria-selected',on);t.tabIndex=on?0:-1;if(panels[k])panels[k].hidden=!on});if(focus)tabs[i].focus();track('hub_tab',{profil:tabs[i].id.replace('tab-','')})}
  list.hidden=false;sel(0,false);
  tabs.forEach(function(t,i){
    t.addEventListener('click',function(){sel(i,false)});
    t.addEventListener('keydown',function(e){var n=i;
      if(e.key==='ArrowRight'||e.key==='ArrowDown')n=(i+1)%tabs.length;
      else if(e.key==='ArrowLeft'||e.key==='ArrowUp')n=(i+tabs.length-1)%tabs.length;
      else if(e.key==='Home')n=0;else if(e.key==='End')n=tabs.length-1;else return;
      e.preventDefault();sel(n,true)});
  });
})();

/* ---------- 5. Navigation & en-tête ---------- */
(function(){
  var h=doc.querySelector('header.site'),bar=doc.querySelector('.sticky'),hero=doc.querySelector('.hero,.phero'),ticking=false;
  if(bar&&hero)bar.classList.add('wait');
  function upd(){ticking=false;if(h)h.classList.toggle('scrolled',scrollY>8);if(bar&&hero)bar.classList.toggle('wait',hero.getBoundingClientRect().bottom>0)}
  addEventListener('scroll',function(){if(!ticking){ticking=true;requestAnimationFrame(upd)}},{passive:true});upd();
  var m=$('menu');if(!m)return;
  function close(focus){if(m.open){m.open=false;if(focus)m.querySelector('summary').focus()}}
  doc.addEventListener('keydown',function(e){if(e.key==='Escape')close(true)});
  doc.addEventListener('click',function(e){if(m.open&&(e.target===m||e.target.closest('#menu nav a')))close(false)});
  addEventListener('resize',function(){if(innerWidth>1060)close(false)});
})();

/* ---------- 6. Sommaire d'article : section en cours de lecture ---------- */
(function(){
  var links=$$('.toc a[href^="#"]');
  if(!links.length||!('IntersectionObserver' in window))return;
  var map={};links.forEach(function(a){var t=$(a.getAttribute('href').slice(1));if(t)map[t.id]=a});
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){links.forEach(function(a){a.classList.remove('on');a.removeAttribute('aria-current')});map[e.target.id].classList.add('on');map[e.target.id].setAttribute('aria-current','true')}})},{rootMargin:'-20% 0px -70% 0px'});
  Object.keys(map).forEach(function(id){io.observe($(id))});
})();

/* ---------- 7. Orientation : redirige vers la page pertinente (aucune collecte) ---------- */
(function(){
  var f=$('orientation');if(!f)return;
  var ROUTES={
    'assurance-maladie':'services/assurance-maladie-lamal-et-complementaires/index.html',
    'frontalier-lamal-cmu':'guides/frontalier-lamal-ou-cmu/index.html',
    '3e-pilier':'services/optimisation-3e-pilier-3a-3b/index.html',
    'lpp-rachat':'services/prevoyance-professionnelle-lpp-retraite/index.html',
    'avs':'outils/simulateur-avs/index.html',
    'independant':'guides/independant-prevoyance-sans-lpp/index.html'
  };
  f.addEventListener('submit',function(e){
    var besoin=f.elements.besoin.value,profil=f.elements.profil.value,dest=ROUTES[besoin];
    if(besoin==='assurance-maladie'&&profil==='frontalier')dest=ROUTES['frontalier-lamal-cmu'];
    if(profil==='independant'&&besoin==='3e-pilier')dest=ROUTES.independant;
    if(!dest)return;
    e.preventDefault();track('orientation_submit',{profil:profil,besoin:besoin});
    location.href=ROOT+dest+'?profil='+encodeURIComponent(profil)+'&canton='+encodeURIComponent(f.elements.canton.value)+'&source=orientation';
  });
})();

/* ---------- 8. Estimation express 3a (indicative, aucune donnée transmise) ---------- */
(function(){
  var root=$('xs');if(!root)return;
  var PL=window.CIME_CONFIG.plafond3a;
  var RATE={VD:29,GE:31,VS:25,FR:28,NE:30,JU:29};   // taux marginal moyen indicatif (hypothèse, %)
  var NAMES={VD:'Vaud',GE:'Genève',VS:'Valais',FR:'Fribourg',NE:'Neuchâtel',JU:'Jura'};
  var YEARS=25,RET=2;
  var rng=$('xs-v'),vout=$('xs-vout'),eco=$('xs-eco'),cap=$('xs-cap'),canton=$('xs-canton'),btns=$$('[data-statut]',root);
  var s1=$('xs-s1'),s2=$('xs-s2'),stepl=$('xs-stepl'),b2=$('xs-b2');
  var st={statut:'salarie'},cur={eco:0,cap:0},raf={};
  function tween(el,key,to){
    cancelAnimationFrame(raf[key]);
    if(reduce){cur[key]=to;el.textContent=fmt(to);return}
    var from=cur[key],t0=null;
    (function step(t){t0=t0||t;var k=Math.min(1,(t-t0)/260),e=1-Math.pow(1-k,3);cur[key]=from+(to-from)*e;el.textContent=fmt(cur[key]);if(k<1)raf[key]=requestAnimationFrame(step)})(performance.now());
  }
  function compute(){var v=+rng.value,r=RATE[canton.value]||28,c=0;for(var i=0;i<YEARS;i++)c=c*(1+RET/100)+v;return{v:v,r:r,eco:v*r/100,cap:c}}
  function render(announce){
    var o=compute(),max=+rng.max;
    rng.style.setProperty('--p',(max?o.v/max*100:0)+'%');
    rng.setAttribute('aria-valuetext',fmt(o.v)+' francs par an');
    vout.textContent=fmt(o.v)+' CHF';
    $('xs-rate').textContent='Taux marginal supposé : '+o.r+' % (valeur moyenne indicative pour '+NAMES[canton.value]+')';
    tween(eco,'eco',o.eco);tween(cap,'cap',o.cap);
    var q='demande=etude&sujet=3a&profil='+(st.statut==='salarie'?'resident':'independant')+'&canton='+canton.value+'&versement='+Math.round(o.v)+'&source=estimation';
    $('xs-cta').href=ROOT+'rendez-vous/index.html?'+q;
    $('xs-more').href=ROOT+'outils/simulateur-3e-pilier/index.html?statut='+st.statut+'&v='+Math.round(o.v)+'&t='+o.r+'&canton='+canton.value;
    if(announce)$('xs-sr').textContent='Estimation indicative. Versement de '+fmt(o.v)+' francs : réduction d’impôt d’environ '+fmt(o.eco)+' francs par an, capital indicatif d’environ '+fmt(o.cap)+' francs après 25 ans.';
  }
  function setStatut(s,focus){
    st.statut=s;var max=PL[s];
    btns.forEach(function(b){var on=b.dataset.statut===s;b.setAttribute('aria-checked',on);b.tabIndex=on?0:-1;if(on&&focus)b.focus()});
    rng.max=max;rng.value=s==='salarie'?max:Math.min(20000,max);
    $('xs-max').textContent='Plafond 2026 : '+fmt(max)+' CHF'+(s==='independant'?' (max. 20 % du revenu net)':'');
    render(false);
  }
  function step(n){
    var two=n===2;s1.hidden=two;s2.hidden=!two;if(b2)b2.className=two?'on':'';
    stepl.textContent=two?'Étape 2 sur 2 : votre versement':'Étape 1 sur 2 : votre situation';
    if(two){render(true);rng.focus({preventScroll:true})}else $('xs-next').focus({preventScroll:true});
  }
  btns.forEach(function(b,i){
    b.addEventListener('click',function(){setStatut(b.dataset.statut)});
    b.addEventListener('keydown',function(e){if(/^Arrow/.test(e.key)){e.preventDefault();setStatut(btns[(i+1)%2].dataset.statut,true)}});
  });
  rng.addEventListener('keydown',function(e){
    var d={ArrowRight:50,ArrowUp:50,ArrowLeft:-50,ArrowDown:-50,PageUp:500,PageDown:-500}[e.key],max=+rng.max;
    if(d===undefined&&e.key!=='Home'&&e.key!=='End')return;
    e.preventDefault();
    rng.value=e.key==='Home'?0:e.key==='End'?max:Math.max(0,Math.min(max,+rng.value+d));
    render(false);
  });
  rng.addEventListener('input',function(){render(false)});
  rng.addEventListener('change',function(){render(true)});
  canton.addEventListener('change',function(){render(false)});
  $('xs-next').addEventListener('click',function(){step(2)});
  $('xs-back').addEventListener('click',function(){step(1)});
  var o=compute();cur.eco=o.eco;cur.cap=o.cap;eco.textContent=fmt(o.eco);cap.textContent=fmt(o.cap);
  setStatut('salarie');
  s2.hidden=true;   // sans JavaScript, les deux étapes restent visibles
})();

/* ---------- 9. Relief du héros (canvas 2D) ----------
   Relief alpin en lignes, éclairage rasant qui se déplace lentement, ligne de niveau
   dorée qui monte vers la cime. ~30 images/s, pause hors écran ou onglet masqué.
   prefers-reduced-motion : une seule image fixe. */
(function(){
  var cv=$('relief');if(!cv||!cv.getContext)return;
  var ctx=cv.getContext('2d');if(!ctx)return;
  var W=0,H=0,rows=[],raf=0,running=false,visible=true,last=0,start=performance.now();
  function g(x,z,cx,cz,sx,sz){var dx=x-cx,dz=z-cz;return Math.exp(-(dx*dx/sx+dz*dz/sz))}
  function height(x,z){
    var dx=x-.22,dz=z-.6,h=1.08*Math.exp(-Math.pow(dx*dx/.06+dz*dz/.03,.6))+.58*g(x,z,-.4,.76,.13,.05)+.46*g(x,z,1.0,.52,.12,.06)+.34*g(x,z,-1.25,.58,.22,.08)+.22*g(x,z,1.9,.8,.4,.1);
    var r=.07*Math.sin(x*7.3+z*3.1)*Math.cos(z*9.7-x*2.3)+.035*Math.sin(x*17.0+z*13.0+1.7)+.018*Math.sin(x*31.0-z*23.0);
    h+=r*(.25+h);
    return Math.max(0,h+.04*Math.sin(x*2.1+z*5.0));
  }
  function build(){
    var r=cv.getBoundingClientRect();W=r.width;H=r.height;if(!W||!H)return false;
    var dpr=Math.min(window.devicePixelRatio||1,2);
    cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
    var small=W<600,NR=small?34:54,NC=small?70:120;rows=[];
    for(var j=0;j<NR;j++){
      var z=1-j/(NR-1),d=1+z*1.7,span=1.02*d,pts=[];
      for(var i=0;i<NC;i++){
        var x=-span+2*span*i/(NC-1),h=height(x,z),e=.012;
        var gx=(height(x+e,z)-height(x-e,z))/(2*e),gz=(height(x,Math.min(1,z+e))-height(x,Math.max(0,z-e)))/(2*e);
        var nl=Math.sqrt(gx*gx+1+gz*gz);
        pts.push({x:W*.5+x*W*.6/d,y:H*.15+(H*.93-h*H*.62)/d,h:h,nx:-gx/nl,ny:1/nl,nz:-gz/nl});
      }
      rows.push({z:z,pts:pts});
    }
    return true;
  }
  function mix(a,b,t){return Math.round(a+(b-a)*t)}
  function draw(t){
    if(!rows.length)return;
    ctx.clearRect(0,0,W,H);
    var az=2.2+.55*Math.sin(t*.09);
    var lx=Math.cos(az)*.78,ly=.5,lz=Math.sin(az)*.38,ll=Math.sqrt(lx*lx+ly*ly+lz*lz);lx/=ll;ly/=ll;lz/=ll;
    var level=.2+.62*(.5-.5*Math.cos(t*.22)),B=5;
    for(var j=0;j<rows.length;j++){
      var row=rows[j],p=row.pts,z=row.z,n=p.length,i,k;
      ctx.beginPath();ctx.moveTo(p[0].x,p[0].y);
      for(i=1;i<n;i++)ctx.lineTo(p[i].x,p[i].y);
      ctx.lineTo(p[n-1].x,H+4);ctx.lineTo(p[0].x,H+4);ctx.closePath();
      ctx.fillStyle='rgb('+mix(234,245,z)+','+mix(240,248,z)+','+mix(244,250,z)+')';
      ctx.fill();
      var paths=[];for(k=0;k<B;k++)paths.push(new Path2D());var gold=new Path2D(),hasGold=false;
      for(i=0;i<n-1;i++){
        var a=p[i],b=p[i+1],sh=Math.max(0,a.nx*lx+a.ny*ly+a.nz*lz),k2=Math.min(B-1,Math.floor((1-sh)*B*1.15));
        if(a.h>.06&&Math.abs(a.h-level)<.016){gold.moveTo(a.x,a.y);gold.lineTo(b.x,b.y);hasGold=true}
        else{paths[k2].moveTo(a.x,a.y);paths[k2].lineTo(b.x,b.y)}
      }
      var fade=1-.62*z;
      for(k=0;k<B;k++){ctx.strokeStyle='rgba(11,37,51,'+((.07+.11*k)*fade).toFixed(3)+')';ctx.lineWidth=k>2?1.1:.9;ctx.stroke(paths[k])}
      if(hasGold){ctx.strokeStyle='rgba(169,130,74,'+(.95*fade+.05).toFixed(3)+')';ctx.lineWidth=1.8;ctx.stroke(gold)}
    }
  }
  function loop(now){raf=0;if(!running)return;if(now-last>=33){last=now;draw((now-start)/1000)}raf=requestAnimationFrame(loop)}
  function play(){if(reduce||running||!visible||doc.hidden)return;running=true;raf=requestAnimationFrame(loop)}
  function pause(){running=false;if(raf)cancelAnimationFrame(raf);raf=0}
  function refresh(){if(build())draw(reduce?9:(performance.now()-start)/1000)}
  refresh();play();
  if('IntersectionObserver' in window)new IntersectionObserver(function(es){visible=es[0].isIntersecting;visible?play():pause()}).observe(cv);
  doc.addEventListener('visibilitychange',function(){doc.hidden?pause():play()});
  var rt;
  if('ResizeObserver' in window)new ResizeObserver(function(){clearTimeout(rt);rt=setTimeout(refresh,120)}).observe(cv);
  else addEventListener('resize',function(){clearTimeout(rt);rt=setTimeout(refresh,120)});
})();

})();
