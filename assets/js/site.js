/* Cime — comportements de l'accueil et du rendez-vous. Le site reste utilisable sans JavaScript. */
(function(){
  // Formulaire d'orientation : envoie vers la page la plus pertinente (information, pas de collecte).
  var f=document.getElementById('orientation');
  if(!f)return;
  var ROUTES={
    'assurance-maladie':'/services/assurance-maladie-lamal-et-complementaires/',
    'frontalier-lamal-cmu':'/guides/frontalier-lamal-ou-cmu/',
    '3e-pilier':'/services/optimisation-3e-pilier-3a-3b/',
    'lpp-rachat':'/services/prevoyance-professionnelle-lpp-retraite/',
    'avs':'/outils/simulateur-avs/',
    'independant':'/guides/independant-prevoyance-sans-lpp/'
  };
  f.addEventListener('submit',function(e){
    var besoin=f.elements.besoin.value,profil=f.elements.profil.value;
    var dest=ROUTES[besoin];
    if(besoin==='assurance-maladie'&&profil==='frontalier')dest=ROUTES['frontalier-lamal-cmu'];
    if(profil==='independant'&&besoin==='3e-pilier')dest=ROUTES['independant'];
    if(!dest)return;
    e.preventDefault();
    var q='?profil='+encodeURIComponent(profil)+'&canton='+encodeURIComponent(f.elements.canton.value)+'&source=orientation';
    try{window.dataLayer=window.dataLayer||[];window.dataLayer.push({event:'orientation_submit',profil:profil,besoin:besoin});}catch(_){}
    location.href=dest+q;
  });
})();

/* Formulaire de rendez-vous / demande d'étude. */
(function(){
  var f=document.getElementById('rdv');
  if(!f)return;
  var C=window.CIME_CONFIG||{},p=new URLSearchParams(location.search),L=window.CimeLead;
  ['profil','sujet','demande'].forEach(function(k){if(p.get(k)&&f.elements[k]&&[].some.call(f.elements[k].options,function(o){return o.value===p.get(k)}))f.elements[k].value=p.get(k)});
  var msg=document.getElementById('rdv-msg'),box=document.getElementById('booking');
  if(box&&C.booking&&C.booking.url){
    var fr=document.createElement('iframe');fr.src=C.booking.url;fr.title='Réserver un créneau avec un spécialiste';fr.loading='lazy';fr.className='booking-frame';
    box.appendChild(fr);box.hidden=false;
  }
  L.watch(f);
  f.addEventListener('submit',function(e){
    e.preventDefault();
    if(L.validate(f,{prenom:true,nom:true,tel:true,email:false,consent:true})){L.status(msg,'err','Certains champs sont à corriger avant l’envoi.');return}
    var d={};new FormData(f).forEach(function(v,k){d[k]=v});
    d.canton=p.get('canton')||'';d.versement=p.get('versement')||'';d.source=p.get('source')||'direct';d.page=location.pathname;d.ts=new Date().toISOString();
    var btn=f.querySelector('button[type=submit]');btn.disabled=true;
    L.send(d,'Demande Cime').then(function(r){btn.disabled=false;if(L.report(msg,r))f.reset()});
  });
})();

/* Simulateur express de l'accueil : 2 étapes, estimation indicative. Aucune donnée n'est transmise. */
(function(){
  var root=document.getElementById('xs');
  if(!root)return;
  var C=window.CIME_CONFIG||{},PL=C.plafond3a||{salarie:7258,independant:36288};
  var RATE={VD:29,GE:31,VS:25,FR:28,NE:30,JU:29};   // taux marginal moyen indicatif par canton (hypothèse, en %)
  var NAMES={VD:'Vaud',GE:'Genève',VS:'Valais',FR:'Fribourg',NE:'Neuchâtel',JU:'Jura'};
  var YEARS=25,RET=2;                                // 25 ans de versements, rendement net 2 % (versements en fin d'année)
  var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $=function(id){return document.getElementById(id)};
  var rng=$('xs-v'),vout=$('xs-vout'),eco=$('xs-eco'),cap=$('xs-cap'),canton=$('xs-canton'),btns=[].slice.call(root.querySelectorAll('[data-statut]'));
  var s1=$('xs-s1'),s2=$('xs-s2'),stepl=$('xs-stepl');
  var st={statut:'salarie'},cur={eco:0,cap:0},raf={};
  var fmt=function(n){return Math.round(n).toLocaleString('fr-CH').replace(/[  ]/g,'’')};
  function tween(el,key,to){
    cancelAnimationFrame(raf[key]);
    if(reduce){cur[key]=to;el.textContent=fmt(to);return}
    var from=cur[key],t0=null;
    (function step(t){t0=t0||t;var k=Math.min(1,(t-t0)/240),e=1-Math.pow(1-k,3);cur[key]=from+(to-from)*e;el.textContent=fmt(cur[key]);if(k<1)raf[key]=requestAnimationFrame(step)})(performance.now());
  }
  function compute(){var v=+rng.value,r=RATE[canton.value]||28,c=0;for(var i=0;i<YEARS;i++)c=c*(1+RET/100)+v;return{v:v,r:r,eco:v*r/100,cap:c}}
  function render(announce){
    var o=compute(),max=+rng.max;
    rng.style.setProperty('--p',(max?o.v/max*100:0)+'%');
    rng.setAttribute('aria-valuetext',fmt(o.v)+' francs par an');
    vout.textContent=fmt(o.v)+' CHF';
    $('xs-rate').textContent='Taux marginal supposé : '+o.r+' % (valeur moyenne indicative pour '+NAMES[canton.value]+')';
    tween(eco,'eco',o.eco);tween(cap,'cap',o.cap);
    var q='demande=etude&sujet=3a&profil='+(st.statut==='salarie'?'resident':'independant')+'&canton='+canton.value+'&versement='+Math.round(o.v)+'&source=estimation';
    $('xs-cta').href='/rendez-vous/?'+q;
    $('xs-more').href='/outils/simulateur-3e-pilier/?statut='+st.statut+'&v='+Math.round(o.v)+'&t='+o.r;
    if(announce)$('xs-sr').textContent='Estimation indicative. Versement '+fmt(o.v)+' francs : impôt concerné environ '+fmt(o.eco)+' francs par an, capital possible à 65 ans environ '+fmt(o.cap)+' francs.';
  }
  function setStatut(s,focus){
    st.statut=s;var max=PL[s];
    btns.forEach(function(b){var on=b.dataset.statut===s;b.setAttribute('aria-checked',on);b.tabIndex=on?0:-1;if(on&&focus)b.focus()});
    rng.max=max;rng.value=s==='salarie'?max:Math.min(20000,max);
    $('xs-max').textContent='Plafond 2026 : '+fmt(max)+' CHF'+(s==='independant'?' (20 % du revenu net)':'');
    render(false);
  }
  function step(n){
    var two=n===2;s1.hidden=two;s2.hidden=!two;
    stepl.textContent=two?'Étape 2 sur 2 · Votre versement':'Étape 1 sur 2 · Votre situation';
    if(two){render(true);rng.focus({preventScroll:true})}else $('xs-next').focus({preventScroll:true});
  }
  btns.forEach(function(b,i){
    b.addEventListener('click',function(){setStatut(b.dataset.statut)});
    b.addEventListener('keydown',function(e){if(/^Arrow/.test(e.key)){e.preventDefault();setStatut(btns[(i+1)%2].dataset.statut,true)}});
  });
  // clavier du curseur : flèches = 50 CHF, PageUp/PageDown = 500 CHF, Début/Fin = bornes
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
  s2.hidden=true;                 // sans JavaScript, les deux étapes restent visibles
})();

/* Barre mobile : sur l'accueil, elle n'apparaît qu'après le héros pour ne pas doubler son bouton. */
(function(){
  var bar=document.querySelector('.sticky'),hero=document.querySelector('.hero');
  if(!bar||!hero)return;
  bar.classList.add('wait');
  function upd(){bar.classList.toggle('wait',hero.getBoundingClientRect().bottom>0)}
  addEventListener('scroll',upd,{passive:true});upd();
})();
