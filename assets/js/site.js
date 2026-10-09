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

/* Formulaire de rendez-vous : préremplissage depuis l'URL, envoi vers un endpoint (CRM) ou repli e-mail. */
(function(){
  var f=document.getElementById('rdv');
  if(!f)return;
  var p=new URLSearchParams(location.search);
  ['profil','sujet'].forEach(function(k){if(p.get(k)&&f.elements[k])f.elements[k].value=p.get(k);});
  var msg=document.getElementById('rdv-msg');
  f.addEventListener('submit',function(e){
    e.preventDefault();
    var d={};new FormData(f).forEach(function(v,k){d[k]=v;});
    d.canton=p.get('canton')||'';d.source=p.get('source')||'direct';d.page=location.pathname;
    try{window.dataLayer=window.dataLayer||[];window.dataLayer.push({event:'lead_submit',profil:d.profil,sujet:d.sujet});}catch(_){}
    var ep=f.getAttribute('data-endpoint');
    if(ep){
      fetch(ep,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)})
        .then(function(r){if(!r.ok)throw 0;f.reset();msg.textContent='Merci ! Nous vous rappelons au créneau choisi.';})
        .catch(function(){msg.textContent='Envoi impossible pour le moment. Appelez-nous au 021 000 00 00.';});
    }else{
      var body=Object.keys(d).map(function(k){return k+' : '+d[k];}).join('\n');
      location.href='mailto:'+f.getAttribute('data-mailto')+'?subject='+encodeURIComponent('Demande de rappel Cime')+'&body='+encodeURIComponent(body);
      msg.textContent='Votre messagerie s\'ouvre avec la demande préremplie. Il ne reste qu\'à l\'envoyer.';
    }
  });
})();
