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
