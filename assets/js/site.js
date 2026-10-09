/* Cime — comportements partagés. Le site reste pleinement utilisable sans JavaScript. */
(function(){
  // Formulaire d'orientation rapide : envoie vers la page la plus pertinente.
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
    if(!dest)return; // repli : envoi GET vers /rendez-vous/
    e.preventDefault();
    var q='?profil='+encodeURIComponent(profil)+'&canton='+encodeURIComponent(f.elements.canton.value)+'&source=orientation';
    try{window.dataLayer=window.dataLayer||[];window.dataLayer.push({event:'orientation_submit',profil:profil,besoin:besoin});}catch(_){}
    location.href=dest+q;
  });
})();

/* Formulaire de rendez-vous : préremplissage depuis l'URL, envoi au webhook (CimeLead), widget de réservation facultatif. */
(function(){
  var f=document.getElementById('rdv');
  if(!f)return;
  var C=window.CIME_CONFIG||{},p=new URLSearchParams(location.search);
  ['profil','sujet'].forEach(function(k){if(p.get(k)&&f.elements[k])f.elements[k].value=p.get(k);});
  var msg=document.getElementById('rdv-msg'),box=document.getElementById('booking');
  if(box&&C.booking&&C.booking.url){
    var fr=document.createElement('iframe');fr.src=C.booking.url;fr.title='Réserver un créneau avec un spécialiste';fr.loading='lazy';fr.style.cssText='width:100%;height:720px;border:0;border-radius:16px;background:var(--card)';
    box.appendChild(fr);box.hidden=false;
  }
  f.addEventListener('submit',function(e){
    e.preventDefault();
    var d={};new FormData(f).forEach(function(v,k){d[k]=v;});
    d.canton=p.get('canton')||'';d.versement=p.get('versement')||'';d.source=p.get('source')||'direct';d.page=location.pathname;d.ts=new Date().toISOString();
    var btn=f.querySelector('button[type=submit]');btn.disabled=true;
    window.CimeLead.send(d).then(function(r){
      btn.disabled=false;
      if(r.ok){f.reset();msg.textContent='Merci ! Un spécialiste vous rappelle au créneau choisi.';}
      else if(r.fallback){window.CimeLead.mailto('Demande de rappel Cime',d);msg.textContent='Votre messagerie s\'ouvre avec la demande préremplie : il ne reste qu\'à l\'envoyer.';}
      else{msg.textContent='Envoi impossible pour le moment. Appelez-nous au 021 000 00 00.';}
    });
  });
})();

/* Simulateur express de l'accueil : slider, canton, statut, calcul en temps réel. Aucune donnée n'est transmise. */
(function(){
  var root=document.getElementById('xs');
  if(!root)return;
  var C=window.CIME_CONFIG||{},PL=C.plafond3a||{salarie:7258,independant:36288};
  var RATE={VD:29,GE:31,VS:25,FR:28,NE:30,JU:29};   // taux marginal moyen indicatif par canton (hypothèse, en %)
  var YEARS=25,RET=2;                                // 25 ans de versements, rendement net 2 % (versements en fin d'année)
  var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $=function(id){return document.getElementById(id)};
  var rng=$('xs-v'),vout=$('xs-vout'),eco=$('xs-eco'),cap=$('xs-cap'),rate=$('xs-rate'),canton=$('xs-canton'),btns=[].slice.call(root.querySelectorAll('[data-statut]'));
  var st={statut:'salarie'},cur={eco:0,cap:0},raf={};
  var fmt=function(n){return Math.round(n).toLocaleString('fr-CH').replace(/[\u202f\u00a0]/g,'\u2019')};
  function tween(el,key,to){
    cancelAnimationFrame(raf[key]);
    if(reduce){cur[key]=to;el.textContent=fmt(to);return}
    var from=cur[key],t0=null;
    (function step(t){t0=t0||t;var k=Math.min(1,(t-t0)/260),e=1-Math.pow(1-k,3);cur[key]=from+(to-from)*e;el.textContent=fmt(cur[key]);if(k<1)raf[key]=requestAnimationFrame(step)})(performance.now());
  }
  function compute(){
    var v=+rng.value,r=RATE[canton.value]||28,c=0;
    for(var i=0;i<YEARS;i++)c=c*(1+RET/100)+v;
    return{v:v,r:r,eco:v*r/100,cap:c};
  }
  function render(announce){
    var o=compute(),max=+rng.max;
    rng.style.setProperty('--p',(max?o.v/max*100:0)+'%');
    vout.textContent=fmt(o.v)+' CHF';
    rate.textContent='Taux marginal supposé : '+o.r+' %';
    tween(eco,'eco',o.eco);tween(cap,'cap',o.cap);
    var q='sujet=3a&profil='+(st.statut==='salarie'?'resident':'independant')+'&canton='+canton.value+'&versement='+Math.round(o.v)+'&source=hero_express';
    $('xs-cta').href='/rendez-vous/?'+q;
    $('xs-more').href='/outils/simulateur-3e-pilier/?statut='+st.statut+'&v='+Math.round(o.v)+'&t='+o.r;
    if(announce)$('xs-sr').textContent='Versement '+fmt(o.v)+' francs : économie d’impôt estimée '+fmt(o.eco)+' francs par an, capital estimé à 65 ans '+fmt(o.cap)+' francs.';
  }
  function setStatut(s,focus){
    st.statut=s;var max=PL[s];
    btns.forEach(function(b){var on=b.dataset.statut===s;b.setAttribute('aria-checked',on);b.tabIndex=on?0:-1;if(on&&focus)b.focus()});
    rng.max=max;rng.value=s==='salarie'?max:Math.min(20000,max);
    $('xs-max').textContent=s==='salarie'?'Plafond 2026 : '+fmt(max)+' CHF':'Plafond 2026 : '+fmt(max)+' CHF (20 % du revenu net)';
    render(true);
  }
  btns.forEach(function(b,i){
    b.addEventListener('click',function(){setStatut(b.dataset.statut)});
    b.addEventListener('keydown',function(e){
      if(e.key==='ArrowRight'||e.key==='ArrowLeft'||e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();setStatut(btns[(i+1)%2].dataset.statut,true)}
    });
  });
  rng.addEventListener('input',function(){render(false)});
  rng.addEventListener('change',function(){render(true)});
  canton.addEventListener('change',function(){render(true)});
  // état initial sans animation
  var o=compute();cur.eco=o.eco;cur.cap=o.cap;eco.textContent=fmt(o.eco);cap.textContent=fmt(o.cap);render(false);
})();
