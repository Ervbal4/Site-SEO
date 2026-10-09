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
    d.canton=p.get('canton')||'';d.source=p.get('source')||'direct';d.page=location.pathname;d.ts=new Date().toISOString();
    var btn=f.querySelector('button[type=submit]');btn.disabled=true;
    window.CimeLead.send(d).then(function(r){
      btn.disabled=false;
      if(r.ok){f.reset();msg.textContent='Merci ! Un spécialiste vous rappelle au créneau choisi.';}
      else if(r.fallback){window.CimeLead.mailto('Demande de rappel Cime',d);msg.textContent='Votre messagerie s\'ouvre avec la demande préremplie : il ne reste qu\'à l\'envoyer.';}
      else{msg.textContent='Envoi impossible pour le moment. Appelez-nous au 021 000 00 00.';}
    });
  });
})();
