/* ==========================================================================
   CIME PRÉVOYANCE — moteur des simulateurs (v2.0)
   À charger après cime.js, uniquement sur les pages /outils/ :
     <script src="[racine]/assets/cime.js" defer></script>
     <script src="[racine]/assets/cime-sim.js" defer></script>
   Balisage attendu : <div class="sim" data-tool="3a|lpp|avs|cmu|franchise|perte-de-gain|prevoyance-risques|salaire-net"></div>

   Calculs 100 % dans le navigateur, aucune donnée transmise sans demande explicite.
   Les formules sont identiques à la version de référence ; seuls l'interface
   (curseurs, hypothèses visibles) et les paramètres 2026/2027 évoluent.
   ========================================================================== */
(function(){
'use strict';
var C=window.CIME_CONFIG||{},ROOT=(window.Cime&&window.Cime.root)||'';
var $=function(s,r){return(r||document).querySelector(s)};
var NB=/[  \s']/g;
var fmt=function(n,u){return Math.round(n).toLocaleString('fr-CH').replace(NB,'’')+(u===''?'':' '+(u||'CHF'))};
var fs=function(n){return n>=1e6?(n/1e6).toFixed(1).replace('.',',')+' M':n>=1e3?Math.round(n/1e3)+'k':Math.round(n)+''};
var pc=function(n){return String(n).replace('.',',')+' %'};
var COL=['var(--viz-1)','var(--viz-2)'];
var state={};
var track=function(e,p){try{window.dataLayer=window.dataLayer||[];window.dataLayer.push(Object.assign({event:e},p||{}))}catch(_){}};
var ic=function(n){return'<svg class="i" aria-hidden="true"><use href="#i-'+n+'"/></svg>'};
/* Nombres saisis : accepte 7258, 7 258, 7'258, 7’258 et la virgule décimale (2,5). */
function parseNum(s){if(typeof s==='number')return s;s=String(s).replace(/[\s  '’]/g,'').replace(',','.');return/^-?(\d+\.?\d*|\.\d+)$/.test(s)?parseFloat(s):NaN}
function fmtIn(v,kind){if(typeof v!=='number'||isNaN(v))return'';if(kind==='chf'||kind==='eur'||kind==='int')return v.toLocaleString('fr-CH',{maximumFractionDigits:0}).replace(NB,'’');return String(v).replace('.',',')}

/* ---------- Paramètres officiels ---------- */
var PL={2026:C.plafond3a||{salarie:7258,independant:36288},2027:C.plafond3a2027||{salarie:7373,independant:36864}};
var AVS={2026:(C.avsRente||{}).min||1260,2027:(C.avsRente2027||{}).min||1280};
var LAA_MAX=148200,AC_MAX=148200,LPP_ENTRY=22680;                                                  // 2026 : gain assuré LAA et AC, seuil d’entrée LPP
var COORD=(C.lpp||{}).coordination||26460,LPP_MAX=(C.lpp||{}).salaireMax||90720;   // 2026
var RATE={VD:29,GE:31,VS:25,FR:28,NE:30,JU:29,autre:28};                            // taux marginal moyen indicatif (hypothèse, %)
var CANTONS=[['VD','Vaud'],['GE','Genève'],['VS','Valais'],['FR','Fribourg'],['NE','Neuchâtel'],['JU','Jura'],['autre','Autre canton']];
var CNAME={};CANTONS.forEach(function(c){CNAME[c[0]]=c[1]});

/* ---------- Règles de calcul ---------- */
// Rente AVS mensuelle (échelle 44), selon le revenu annuel moyen E, les années de cotisation n et la rente minimale R0.
function avsR(E,n,R0){var Ee=Math.ceil(E/(1.2*R0)-1e-9)*1.2*R0,r=Ee<=12*R0?R0:Ee<=36*R0?.74*R0+13*Ee/600:Ee<72*R0?1.04*R0+8*Ee/600:2*R0;return Math.round((n>=44?1:Math.max(0,n)/44)*r)}
// Bonifications de vieillesse LPP (minimum légal) par âge.
function brk(a){return a>=55?.18:a>=45?.15:a>=35?.10:a>=25?.07:0}
function lppSeries(o,rachat){var x=o.lpp,out=[x],sc=Math.max(0,Math.min(o.sal,LPP_MAX)-COORD);for(var a=o.age;a<o.ret;a++){x+=x*o.rg/100+sc*brk(a)+(a===o.age?rachat:0);out.push(x)}return out}
// Coût annuel LAMal pour des frais de santé X : prime + franchise + quote-part de 10 % (max. 700 CHF).
function lamalCost(prime,fr,X){return prime+Math.min(X,fr)+Math.min(Math.max(0,X-fr)*.1,700)}

/* ---------- Graphiques SVG (une seule échelle, légende + info-bulles natives) ---------- */
function lineC(ser,xl,alt,unit){var n=xl.length;if(n<2)return'';var W=480,H=220,p={l:46,r:14,t:14,b:28},mx=Math.max(1,Math.max.apply(null,[].concat.apply([],ser.map(function(s){return s.v}))))*1.08;
 var X=function(i){return p.l+(W-p.l-p.r)*i/(n-1)},Y=function(v){return p.t+(H-p.t-p.b)*(1-v/mx)};
 var gr=[0,.25,.5,.75,1].map(function(k){return'<line x1="'+p.l+'" x2="'+(W-p.r)+'" y1="'+Y(mx*k)+'" y2="'+Y(mx*k)+'" stroke="var(--line)"/><text x="'+(p.l-6)+'" y="'+(Y(mx*k)+4)+'" text-anchor="end" font-size="10" fill="var(--text-2)">'+fs(mx*k)+'</text>'}).join('');
 var xs=[0,Math.floor((n-1)/2),n-1].map(function(i){return'<text x="'+X(i)+'" y="'+(H-8)+'" text-anchor="middle" font-size="10" fill="var(--text-2)">'+xl[i]+'</text>'}).join('');
 var ls=ser.map(function(s,k){var d=s.v.map(function(v,i){return(i?'L':'M')+X(i).toFixed(1)+' '+Y(v).toFixed(1)}).join('');return(k===0?'<path d="'+d+'L'+X(n-1)+' '+Y(0)+'L'+X(0)+' '+Y(0)+'Z" fill="'+s.c+'" opacity=".08"/>':'')+'<path d="'+d+'" fill="none" stroke="'+s.c+'" stroke-width="2" stroke-linejoin="round"/>'}).join('');
 var hit=xl.map(function(l,i){var t=l+' : '+ser.map(function(s){return s.n+' '+fmt(s.v[i],unit)}).join(' ; ');return'<rect x="'+(X(i)-(W-p.l-p.r)/(2*(n-1)))+'" y="'+p.t+'" width="'+(W-p.l-p.r)/(n-1)+'" height="'+(H-p.t-p.b)+'" fill="transparent"><title>'+t+'</title></rect>'}).join('');
 return'<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+alt+'">'+gr+xs+ls+hit+'</svg><div class="lg">'+ser.map(function(s){return'<span><b style="background:'+s.c+'"></b>'+s.n+'</span>'}).join('')+'</div>'}
function barsC(it,alt,suf){suf=suf||'par mois';var W=480,H=220,mx=Math.max(1,Math.max.apply(null,it.map(function(i){return i.v})))*1.15,bw=(W-40)/it.length;
 return'<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+alt+'">'+it.map(function(i,k){var h=(H-60)*i.v/mx,x=20+k*bw+bw*.2,m=x+bw*.3;return'<g><title>'+i.l+' : '+fmt(i.v)+' '+suf+'</title><rect x="'+x+'" y="'+(H-30-h)+'" width="'+bw*.6+'" height="'+h+'" rx="4" fill="'+(i.c||COL[0])+'"/><text x="'+m+'" y="'+(H-36-h)+'" text-anchor="middle" font-size="11" font-weight="600" fill="var(--text)">'+fs(i.v)+'</text><text x="'+m+'" y="'+(H-12)+'" text-anchor="middle" font-size="10.5" fill="var(--text-2)">'+i.l+'</text></g>'}).join('')+'</svg>'}

/* ---------- Définition des simulateurs ----------
   Champ : k (clé), l (libellé), kind (chf, eur, pct, int, dec), v (défaut), min/max (validation),
   s (curseur : [min, max, pas] ou fonction(valeurs)), o (options d'une liste), num (liste numérique),
   hint (aide), sets ({k, map} : renseigne un autre champ au changement). */
var SEL_STATUT=[['salarie','Salarié avec caisse de pension'],['independant','Indépendant sans caisse de pension']];
var SEL_AN=[['2026','2026'],['2027','2027']];
var FRANCH=[['300','300 CHF'],['500','500 CHF'],['1000','1’000 CHF'],['1500','1’500 CHF'],['2000','2’000 CHF'],['2500','2’500 CHF']];
function pl3a(o){return(PL[o.an]||PL[2026])[o.statut]}

var TOOLS={
 '3a':{title:'Mon 3e pilier 3a',sujet:'3a',
  steps:[
   {title:'Votre situation',why:'Le statut et l’année fixent le plafond de versement. Le canton préremplit un taux marginal moyen indicatif, que vous pouvez remplacer par le vôtre (dernière déclaration d’impôt).',
    fields:[{k:'statut',l:'Votre statut',o:SEL_STATUT,v:'salarie'},{k:'an',l:'Année fiscale',o:SEL_AN,v:'2026'},
     {k:'canton',l:'Canton de domicile',o:CANTONS,v:'VD',sets:{k:'t',map:RATE}},
     {k:'t',l:'Taux marginal d’impôt',kind:'pct',v:29,min:0,max:60,s:[0,45,.5],hint:'Préréglé sur la moyenne indicative du canton. Ordre de grandeur : 20 à 35 %.'}]},
   {title:'Votre versement',why:'La durée et le rendement servent à projeter un capital : le rendement est une hypothèse, jamais une garantie.',
    fields:[{k:'v',l:'Versement annuel',kind:'chf',v:7258,min:0,max:200000,s:function(o){return[0,pl3a(o),50]},hint:'Plafond 2026 : 7’258 CHF (salarié) ou 36’288 CHF (indépendant). 2027 : 7’373 CHF ou 36’864 CHF.'},
     {k:'d',l:'Durée de versement',kind:'int',unit:'ans',v:25,min:1,max:50,s:[1,45,1]},
     {k:'r',l:'Rendement net supposé',kind:'pct',v:2,min:-5,max:12,s:[0,6,.1],hint:'Net de frais, constant sur toute la durée.'}]}],
  calc:function(o){var pl=pl3a(o),cap=0,ser=[0],tot=[0];
   for(var i=0;i<o.d;i++){cap=cap*(1+o.r/100)+o.v;ser.push(cap);tot.push(o.v*(i+1))}
   var eco=o.v*o.t/100,gain=cap-o.v*o.d,avg=RATE[o.canton];
   var alt=[['Compte épargne 3a',1],['3a d’assurance',2],['3a en fonds indiciels',3.6]].map(function(a){var c=0;for(var i=0;i<o.d;i++)c=c*(1+a[1]/100)+o.v;return'<tr><th scope="row">'+a[0]+' ('+pc(a[1])+')</th><td>'+fmt(c)+'</td></tr>'}).join('');
   return{
    main:{label:'Réduction d’impôt estimée, par an',value:fmt(eco,''),unit:'CHF',note:'Versement de '+fmt(o.v)+' × taux marginal de '+pc(o.t)+'.'},
    assumptions:['Année fiscale '+o.an+' : plafond de '+fmt(pl)+(o.statut==='independant'?' (20 % du revenu net au maximum)':''),
     'Canton : '+CNAME[o.canton]+' ; taux marginal retenu '+pc(o.t)+(o.t===avg?' (moyenne indicative du canton)':' (moyenne indicative du canton : '+pc(avg)+')'),
     'Durée : '+o.d+' ans, versement en fin d’année',
     'Rendement net : '+pc(o.r)+' par an, constant et non garanti'],
    warns:o.v>pl?['Votre versement dépasse le plafond '+o.an+' de '+fmt(pl)+'. La part au-dessus du plafond n’est pas déductible.']:[],
    details:[['Total versé',fmt(o.v*o.d)],['Capital estimé après '+o.d+' ans',fmt(cap)],['Gain de placement (hypothèse)',fmt(gain)],['Réduction d’impôt cumulée',fmt(eco*o.d)]],
    extra:'<h3>Même versement, trois supports</h3><div class="tbl"><table><caption class="vh">Capital après '+o.d+' ans selon le support</caption><tbody>'+alt+'</tbody></table></div>',
    chartTitle:'Évolution du capital',chart:lineC([{n:'Capital estimé',c:COL[0],v:ser},{n:'Total versé',c:COL[1],v:tot}],ser.map(function(_,i){return'An '+i}),'Courbe du capital estimé et du total versé sur '+o.d+' ans'),
    limits:['Le rendement n’est pas garanti et dépend du support choisi','Les frais réels varient d’un contrat à l’autre','L’impôt exact dépend de votre commune, de votre revenu et de votre situation familiale'],
    method:['Réduction d’impôt = versement annuel × taux marginal.','Capital = somme des versements capitalisés chaque année au rendement net supposé (versement en fin d’année).','Gain de placement = capital − total versé.'],
    next:[{t:'Comparer 3a bancaire et 3a d’assurance',h:ROOT+'guides/3a-banque-vs-assurance/index.html'}],
    sim:{annee:o.an,canton:o.canton,taux_marginal:o.t,versement:o.v,capital:Math.round(cap),economie_annuelle:Math.round(eco)}}}},

 'lpp':{title:'Mon rachat LPP',sujet:'lpp',
  steps:[
   {title:'Votre profil',why:'L’âge actuel et l’âge de la retraite fixent le nombre d’années pendant lesquelles votre avoir est rémunéré et bonifié.',
    fields:[{k:'age',l:'Âge actuel',kind:'int',unit:'ans',v:45,min:18,max:70,s:[25,64,1]},{k:'ret',l:'Âge de la retraite',kind:'int',unit:'ans',v:65,min:58,max:75,s:[58,70,1]}]},
   {title:'Votre caisse de pension',why:'Ces montants figurent sur votre certificat de prévoyance. Le salaire sert à calculer les bonifications annuelles du minimum légal.',
    fields:[{k:'lpp',l:'Avoir de vieillesse actuel',kind:'chf',v:150000,min:0,max:5000000,s:[0,1000000,1000],hint:'Ligne « avoir de vieillesse » du certificat.'},{k:'sal',l:'Salaire annuel brut',kind:'chf',v:80000,min:0,max:2000000,s:[0,250000,1000]},{k:'conv',l:'Taux de conversion',kind:'pct',v:5,min:3,max:8,s:[4,6.8,.1],hint:'Taux de votre caisse pour votre âge, souvent autour de 5 %.'}]},
   {title:'Le rachat',why:'Le rachat est limité par le potentiel indiqué sur votre certificat. Le taux marginal détermine la déduction.',
    fields:[{k:'rach',l:'Rachat envisagé',kind:'chf',v:50000,min:0,max:5000000,s:[0,300000,1000],hint:'Ne peut pas dépasser le rachat possible indiqué sur votre certificat.'},{k:'rg',l:'Rémunération de l’avoir',kind:'pct',v:1.5,min:-2,max:8,s:[0,4,.1]},
     {k:'canton',l:'Canton de domicile',o:CANTONS,v:'VD',sets:{k:'t',map:RATE}},{k:'t',l:'Taux marginal d’impôt',kind:'pct',v:29,min:0,max:60,s:[0,45,.5]}]}],
  check:function(o){var e=[];if(o.ret<=o.age)e.push({k:'ret',m:'L’âge de la retraite doit être supérieur à votre âge actuel.'});return e},
  calc:function(o){var s0=lppSeries(o,0),s1=lppSeries(o,o.rach),a=s0[s0.length-1],b=s1[s1.length-1],eco=o.rach*o.t/100;
   return{
    main:{label:'Réduction d’impôt estimée sur le rachat',value:fmt(eco,''),unit:'CHF',note:'Rachat de '+fmt(o.rach)+' × taux marginal de '+pc(o.t)+'. Coût net : '+fmt(o.rach-eco)+'.'},
    assumptions:['Canton : '+CNAME[o.canton]+' ; taux marginal retenu '+pc(o.t),
     'Durée : '+(o.ret-o.age)+' ans jusqu’à la retraite à '+o.ret+' ans',
     'Minimum légal 2026 : déduction de coordination de '+fmt(COORD)+', salaire maximal assuré de '+fmt(LPP_MAX),
     'Bonifications de vieillesse de 7, 10, 15 et 18 % selon l’âge ; rémunération constante de '+pc(o.rg)],
    warns:['Un retrait en capital dans les trois ans qui suivent un rachat n’est pas possible et peut remettre en cause la déduction.'],
    details:[['Avoir à '+o.ret+' ans, sans rachat',fmt(a)],['Avoir à '+o.ret+' ans, avec rachat',fmt(b)],['Rente annuelle estimée ('+pc(o.conv)+')',fmt(a*o.conv/100)+' → '+fmt(b*o.conv/100)],['Coût net du rachat',fmt(o.rach-eco)]],
    chartTitle:'Évolution de l’avoir',chart:lineC([{n:'Avec rachat',c:COL[0],v:s1},{n:'Sans rachat',c:COL[1],v:s0}],s0.map(function(_,i){return(o.age+i)+' ans'}),'Courbes de l’avoir LPP avec et sans rachat, de '+o.age+' à '+o.ret+' ans'),
    limits:['Votre caisse peut prévoir des prestations supérieures au minimum légal : votre certificat prime','Le rachat ne peut pas dépasser le potentiel indiqué par la caisse','La déduction dépend de votre revenu imposable et de votre canton','Valeurs 2027 : coordination 26’880 CHF, salaire maximal 92’160 CHF'],
    method:['Réduction d’impôt = rachat × taux marginal.','Avoir à la retraite = avoir actuel rémunéré chaque année, plus la bonification légale (salaire coordonné × taux selon l’âge), plus le rachat la première année.','Rente annuelle estimée = avoir × taux de conversion.'],
    next:[{t:'Comprendre la déduction et l’étalement',h:ROOT+'guides/rachat-lpp-deduction-impots/index.html'}],
    sim:{canton:o.canton,taux_marginal:o.t,rachat:o.rach,avoir_sans:Math.round(a),avoir_avec:Math.round(b),economie_impot:Math.round(eco)}}}},

 'avs':{title:'Ma rente AVS',sujet:'avs',
  steps:[{title:'Votre carrière',why:'La rente dépend de votre revenu annuel moyen revalorisé et du nombre d’années de cotisation. Votre extrait de compte individuel donne ces deux informations.',
    fields:[{k:'an',l:'Barème',o:[['2026','2026 (rente de 1’260 à 2’520 CHF)'],['2027','2027 (rente de 1’280 à 2’560 CHF)']],v:'2026'},{k:'E',l:'Revenu annuel moyen',kind:'chf',v:80000,min:0,max:2000000,s:[0,200000,1000]},{k:'n',l:'Années de cotisation',kind:'int',unit:'ans',v:44,min:0,max:44,s:[0,44,1],hint:'44 ans = carrière complète (échelle 44).'}]}],
  calc:function(o){var R0=AVS[o.an]||1260,m=avsR(o.E,o.n,R0),F=avsR(o.E,44,R0);
   var rows=[0,1,2,3,5,10].map(function(k){var r=avsR(o.E,44-k,R0);return'<tr><th scope="row">'+k+'</th><td>'+fmt(r)+'</td><td>'+(k?'− '+fmt((F-r)*13):'—')+'</td></tr>'}).join('');
   return{
    main:{label:'Rente mensuelle estimée',value:fmt(m,''),unit:'CHF par mois',note:'Soit '+fmt(m*13)+' par an avec la 13e rente.'},
    assumptions:['Barème '+o.an+' : rente minimale de '+fmt(R0)+' et maximale de '+fmt(2*R0)+' par mois','Échelle de rente 44, revenu annuel moyen de '+fmt(o.E),'Durée de cotisation : '+o.n+' ans sur 44','13 rentes par an (13e rente AVS versée dès décembre 2026)'],
    warns:m<F?['Lacune de '+(44-Math.min(44,o.n))+' an(s) : − '+fmt((F-m)*13)+' par an, à vie. Certaines lacunes récentes peuvent encore être comblées : vérifiez votre extrait de compte individuel.']:[],
    details:[['Rente annuelle (13 rentes)',fmt(m*13)],['Rente avec carrière complète (44 ans)',fmt(F)+' par mois']],
    extra:'<h3>Effet des années manquantes</h3><div class="tbl"><table><thead><tr><th scope="col">Années manquantes</th><th scope="col">Rente par mois</th><th scope="col">Perte par an</th></tr></thead><tbody>'+rows+'</tbody></table></div>',
    chartTitle:'Rente mensuelle selon les lacunes',chart:barsC([0,1,2,3,5,10].map(function(k){return{l:k?'−'+k+' an'+(k>1?'s':''):'44 ans',v:avsR(o.E,44-k,R0),c:k?COL[1]:COL[0]}}),'Rente mensuelle selon le nombre d’années manquantes'),
    limits:['Estimation individuelle : splitting, bonifications éducatives et plafonnement des couples non pris en compte','La 13e rente ne s’applique pas à toutes les situations (rentes de survivants et AI notamment)','Les montants sont adaptés périodiquement : vérifiez-les sur bsv.admin.ch'],
    method:['Le revenu annuel moyen est ramené à la tranche de l’échelle 44.','La rente mensuelle suit les formules de l’échelle, entre rente minimale et maximale.','Si les années de cotisation sont inférieures à 44, la rente est réduite proportionnellement.'],
    next:[{t:'Préparer sa retraite',h:ROOT+'retraite/index.html'}],
    sim:{bareme:o.an,avs_mensuel:m,avs_annuel:m*13}}}},

 'cmu':{title:'LAMal ou CMU',sujet:'lamal',
  steps:[
   {title:'Votre foyer',why:'La CMU se calcule sur le revenu fiscal de référence du foyer ; la LAMal se paie par personne. La composition du foyer change donc fortement la comparaison.',
    fields:[{k:'rfr',l:'Revenu fiscal de référence du foyer',kind:'eur',v:80000,min:0,max:5000000,s:[0,250000,1000],hint:'Figure sur votre avis d’imposition français.'},{k:'ad',l:'Adultes à assurer',kind:'int',unit:'',v:2,min:1,max:6,s:[1,6,1]},{k:'en',l:'Enfants à assurer',kind:'int',unit:'',v:2,min:0,max:10,s:[0,6,1]}]},
   {title:'Primes LAMal',why:'Reprenez les primes mensuelles de vos offres réelles (comparateur officiel priminfo.admin.ch). Les valeurs préremplies sont des exemples.',
    fields:[{k:'pa',l:'Prime LAMal par adulte, par mois',kind:'chf',v:400,min:0,max:2000,s:[150,900,5]},{k:'pe',l:'Prime LAMal par enfant, par mois',kind:'chf',v:100,min:0,max:1000,s:[50,250,5]}]},
   {title:'Hypothèses',why:'Le taux de change convertit les primes en euros. L’abattement vient des règles françaises : vérifiez-le auprès de l’URSSAF.',
    fields:[{k:'fx',l:'Taux de change (€ pour 1 CHF)',kind:'dec',unit:'€',v:1.07,min:.5,max:2,s:[.9,1.2,.01]},{k:'ab',l:'Abattement CMU',kind:'eur',v:C.cmuAbattement||12015,min:0,max:100000,hint:'2026 : 12’015 €, soit 25 % du plafond annuel de la sécurité sociale (48’060 €).'}]}],
  calc:function(o){var cm=Math.max(0,o.rfr-o.ab)*.08,la=(o.ad*o.pa+o.en*o.pe)*12*o.fx,d=cm-la,be=o.ab+la/.08;
   var e=function(n){return fmt(n,'€')};
   var xs=[30,50,70,90,110,130,150].map(function(k){return k*1e3});
   return{
    main:{label:d>0?'LAMal moins chère de':d<0?'CMU moins chère de':'Écart entre les deux options',value:fmt(Math.abs(d),''),unit:'€ par an',note:'Comparaison pour votre foyer, avec les primes saisies.'},
    assumptions:['Foyer : '+o.ad+' adulte(s) et '+o.en+' enfant(s), revenu de référence de '+e(o.rfr),'CMU : 8 % du revenu après un abattement de '+e(o.ab),'LAMal : primes saisies, converties à '+String(o.fx).replace('.',',')+' € pour 1 CHF','Comparaison sur une année, assurance de base uniquement'],
    warns:[],
    details:[['CMU (8 % après abattement)',e(cm)],['LAMal (primes converties en €)',e(la)],['Revenu de référence d’équilibre',e(be)],['Coût LAMal par adulte supplémentaire',e(o.pa*12*o.fx)+' par an'],['Coût LAMal par enfant supplémentaire',e(o.pe*12*o.fx)+' par an']],
    chartTitle:'Coût annuel selon le revenu de référence (€)',chart:lineC([{n:'LAMal',c:COL[0],v:xs.map(function(){return la})},{n:'CMU',c:COL[1],v:xs.map(function(r){return Math.max(0,r-o.ab)*.08})}],xs.map(fs),'Coût annuel de la CMU et de la LAMal selon le revenu fiscal de référence','€'),
    limits:['Le droit d’option s’exerce dans les trois mois suivant le début de l’activité et se révise difficilement','La CMU se calcule sur les revenus de l’avant-dernière année ; taux et abattement à vérifier auprès de l’URSSAF','Franchise, modèle d’assurance et complémentaires ne sont pas pris en compte'],
    method:['Cotisation CMU = 8 % × (revenu fiscal de référence − abattement), jamais négative.','Coût LAMal = (adultes × prime adulte + enfants × prime enfant) × 12 × taux de change.','Revenu d’équilibre = abattement + coût LAMal ÷ 8 %.'],
    next:[{t:'Lire le guide LAMal ou CMU',h:ROOT+'guides/frontalier-lamal-ou-cmu/index.html'}],
    sim:{cmu_eur:Math.round(cm),lamal_eur:Math.round(la)}}}},

 'franchise':{title:'Ma franchise LAMal',sujet:'lamal',
  steps:[
   {title:'Vos primes',why:'Reprenez les primes annuelles que votre caisse propose pour deux franchises. La franchise haute baisse la prime mais augmente ce que vous payez en cas de soins.',
    fields:[{k:'f1',l:'Franchise basse',o:FRANCH,num:true,v:'300'},{k:'p1',l:'Prime annuelle avec la franchise basse',kind:'chf',v:5400,min:0,max:20000,s:[1500,9000,50]},{k:'f2',l:'Franchise haute',o:FRANCH,num:true,v:'2500'},{k:'p2',l:'Prime annuelle avec la franchise haute',kind:'chf',v:4200,min:0,max:20000,s:[1500,9000,50]}]},
   {title:'Vos frais de santé',why:'Estimez les frais de santé remboursables d’une année ordinaire : consultations, médicaments, examens. Le graphique montre le résultat pour d’autres niveaux de frais.',
    fields:[{k:'x',l:'Frais de santé annuels attendus',kind:'chf',v:800,min:0,max:200000,s:[0,10000,50]}]}],
  check:function(o){var e=[];if(o.f2<=o.f1)e.push({k:'f2',m:'La franchise haute doit être supérieure à la franchise basse.'});return e},
  calc:function(o){var a=lamalCost(o.p1,o.f1,o.x),b=lamalCost(o.p2,o.f2,o.x),d=a-b,seuil=null;
   for(var X=0;X<=30000;X+=10){if(lamalCost(o.p1,o.f1,X)<=lamalCost(o.p2,o.f2,X)){seuil=X;break}}
   var xs=[0,500,1000,1500,2000,3000,4000,6000,8000],pts=xs.map(function(x){return[lamalCost(o.p1,o.f1,x),lamalCost(o.p2,o.f2,x)]});
   return{
    main:{label:d>0?'Franchise haute plus avantageuse de':d<0?'Franchise basse plus avantageuse de':'Écart entre les deux franchises',value:fmt(Math.abs(d),''),unit:'CHF par an',note:'Pour '+fmt(o.x)+' de frais de santé dans l’année.'},
    assumptions:['Primes saisies : '+fmt(o.p1)+' (franchise '+fmt(o.f1)+') et '+fmt(o.p2)+' (franchise '+fmt(o.f2)+')','Frais de santé de '+fmt(o.x)+' sur une année','Quote-part de 10 %, plafonnée à 700 CHF par an pour un adulte'],
    warns:[],
    details:[['Coût total, franchise '+fmt(o.f1),fmt(a)],['Coût total, franchise '+fmt(o.f2),fmt(b)],['Seuil de bascule',seuil===null?'au-delà de 30’000 CHF':seuil===0?'aucun : la franchise basse l’emporte':'environ '+fmt(seuil)+' de frais'],['Risque maximal, franchise basse',fmt(o.p1+o.f1+700)],['Risque maximal, franchise haute',fmt(o.p2+o.f2+700)]],
    chartTitle:'Coût total selon vos frais de santé',chart:lineC([{n:'Franchise haute',c:COL[0],v:pts.map(function(p){return p[1]})},{n:'Franchise basse',c:COL[1],v:pts.map(function(p){return p[0]})}],xs.map(fs),'Coût annuel total pour chaque franchise selon les frais de santé'),
    limits:['Vos frais d’une année dépendent de votre santé : prévoyez une réserve égale au risque maximal','La contribution aux frais d’hospitalisation (15 CHF par jour) n’est pas incluse','Changement de franchise : 30 novembre pour une franchise plus basse, 31 décembre pour une plus haute'],
    method:['Coût total = prime annuelle + part des frais à votre charge.','Part à votre charge = min(frais ; franchise) + min(10 % × (frais − franchise) ; 700 CHF).','Seuil de bascule = niveau de frais à partir duquel la franchise basse devient moins chère.'],
    next:[{t:'Choisir sa franchise et son modèle',h:ROOT+'services/assurance-maladie-lamal-et-complementaires/index.html'}],
    sim:{cout_basse:Math.round(a),cout_haute:Math.round(b)}}}},

 'perte-de-gain':{title:'Ma perte de gain',sujet:'pertegain',
  steps:[
   {title:'Votre situation',why:'Le scénario et le statut déterminent l’assurance qui verse l’indemnité. En cas d’accident, le gain assuré LAA est plafonné à 148’200 CHF par an.',
    fields:[{k:'scen',l:'Cause de l’arrêt de travail',o:[['maladie','Maladie (indemnités journalières maladie, IJM)'],['accident','Accident (LAA)']],v:'maladie'},
     {k:'statut',l:'Votre statut',o:[['salarie','Salarié'],['independant','Indépendant']],v:'salarie'},
     {k:'sal',l:'Salaire brut annuel ou revenu net AVS',kind:'chf',v:85000,min:0,max:1000000,s:[20000,300000,1000],hint:'Pour un indépendant : revenu net soumis à l’AVS.'},
     {k:'ch',l:'Charges fixes mensuelles incompressibles',kind:'chf',v:3500,min:0,max:100000,s:[0,12000,100],hint:'Loyer, primes d’assurance, emprunts, impôts : ce qu’il faut payer quoi qu’il arrive.'}]},
   {title:'Votre couverture',why:'Le délai d’attente est la période pendant laquelle aucune indemnité n’est versée. Le taux de couverture est la part du salaire que l’assurance verse ensuite.',
    fields:[{k:'delai',l:'Délai d’attente',o:[['14','14 jours'],['30','30 jours'],['60','60 jours'],['90','90 jours'],['180','180 jours']],num:true,v:'30'},
     {k:'duree',l:'Durée prévisible de l’arrêt de travail',kind:'int',unit:'mois',v:6,min:1,max:24,s:[1,24,1]},
     {k:'taux',l:'Taux de couverture de l’indemnité',kind:'pct',v:80,min:70,max:100,s:[70,100,1],hint:'80 % est le taux le plus courant ; il est réglable de 70 à 100 %.'}]}],
  calc:function(o){
   var acc=o.scen==='accident',gain=acc?Math.min(o.sal,LAA_MAX):o.sal,jour=gain*o.taux/100/365,mois=jour*30,
    smois=o.sal/12,maint=smois>0?mois/smois*100:0,charges=o.ch*o.delai/30,
    jours=o.duree*30,verse=Math.max(0,jours-o.delai)*jour,perdu=smois*o.duree,gap=Math.max(0,perdu-verse),manque=Math.max(0,smois-mois);
   var rows=[14,30,60,90,180].map(function(d){return'<tr><th scope="row">'+d+' jours</th><td>'+fmt(o.ch*d/30)+'</td><td>'+fmt(smois*d/30)+'</td></tr>'}).join('');
   var warns=[];
   if(o.delai>0)warns.push('Charges fixes à financer avant le premier franc versé par l’assurance : '+fmt(charges)+' ('+o.delai+' jours de délai d’attente à '+fmt(o.ch)+' par mois). Cette somme doit provenir de vos réserves'+(o.statut==='salarie'?', sauf maintien du salaire par votre employeur pendant cette période':'')+'.');
   if(jours<=o.delai)warns.push('Votre arrêt se termine avant la fin du délai d’attente : aucune indemnité n’est versée dans ce scénario.');
   if(acc&&o.sal>LAA_MAX)warns.push('Le gain assuré LAA est plafonné à '+fmt(LAA_MAX)+' par an : la part de salaire au-dessus n’est pas couverte par l’assurance accident obligatoire.');
   if(acc&&o.statut==='salarie')warns.push('Pour un salarié, l’assurance accident obligatoire verse ses indemnités dès le 3e jour : un délai plus long ne concerne qu’une assurance facultative.');
   return{
    main:{label:'Indemnité mensuelle estimée',value:fmt(mois,''),unit:'CHF par mois',note:'Soit '+pc(Math.round(maint*10)/10)+' de votre salaire mensuel maintenu, une fois le délai d’attente écoulé.'},
    assumptions:['Scénario : '+(acc?'accident (LAA)':'maladie (indemnités journalières privées)')+', statut '+(o.statut==='salarie'?'salarié':'indépendant'),
     'Revenu retenu : '+fmt(gain)+' par an'+(acc&&o.sal>LAA_MAX?' (plafond LAA)':''),
     'Indemnité de '+pc(o.taux)+' du revenu, sur 365 jours par an et 30 jours par mois',
     'Délai d’attente de '+o.delai+' jours, arrêt de '+o.duree+' mois, 100 % d’incapacité de travail',
     'Charges fixes de '+fmt(o.ch)+' par mois, supposées constantes'],
    warns:warns,
    details:[['Indemnité par jour',fmt(jour)],['Manque mensuel après le délai',fmt(manque)],['Indemnités perçues pendant l’arrêt',fmt(verse)],['Revenu habituel sur la durée de l’arrêt',fmt(perdu)],['Perte non couverte sur toute la durée',fmt(gap)]],
    extra:'<h3>Effet du délai d’attente sur votre trésorerie</h3><div class="tbl"><table><caption class="vh">Charges fixes et revenu à financer selon le délai d’attente</caption><thead><tr><th scope="col">Délai</th><th scope="col">Charges fixes à financer</th><th scope="col">Revenu habituel non versé</th></tr></thead><tbody>'+rows+'</tbody></table></div>',
    chartTitle:'Revenu habituel, indemnité et charges (par mois)',chart:barsC([{l:'Revenu habituel',v:smois,c:COL[0]},{l:'Indemnité',v:mois,c:COL[1]},{l:'Charges fixes',v:o.ch,c:'var(--text-2)'}],'Revenu mensuel habituel, indemnité mensuelle et charges fixes mensuelles'),
    limits:['Les conditions de votre contrat prévalent : délai, taux, durée maximale des prestations (souvent 730 jours) et exclusions','Un salarié peut recevoir son salaire de son employeur pendant une durée limitée selon le contrat, la loi (art. 324a CO) et l’ancienneté : ce simulateur ne la déduit pas','Une incapacité de travail partielle, les prestations de l’AI et les autres revenus ne sont pas pris en compte','Les indemnités journalières maladie sont en principe imposables : le net perçu est inférieur au brut estimé'],
    method:['Indemnité par jour = (revenu retenu × taux de couverture) ÷ 365 ; en cas d’accident, revenu retenu = min(revenu ; 148’200 CHF).','Indemnité mensuelle = indemnité par jour × 30.','Charges à financer pendant le délai = charges fixes × délai ÷ 30.','Perte non couverte = revenu habituel sur la durée de l’arrêt − indemnités perçues après le délai d’attente.'],
    next:[{t:'Indépendant : bâtir sa couverture',h:ROOT+'guides/independant-prevoyance-sans-lpp/index.html'}],
    sim:{annee:2026,scenario:o.scen,statut:o.statut,delai_attente:o.delai,indemnite_mensuelle:Math.round(mois),charges_fixes:Math.round(o.ch),perte_non_couverte:Math.round(gap)}}}},

 'prevoyance-risques':{title:'Ma protection en cas d’invalidité ou de décès',sujet:'invalidite',
  steps:[
   {title:'En cas d’invalidité',why:'Les rentes des trois piliers s’additionnent, avec une limite de surindemnisation. Le revenu cible correspond à 80 % de votre salaire, un repère courant pour maintenir son niveau de vie.',
    fields:[{k:'sal',l:'Salaire annuel actuel',kind:'chf',v:120000,min:0,max:2000000,s:[20000,300000,1000]},
     {k:'deg',l:'Degré d’invalidité',kind:'pct',v:100,min:40,max:100,s:[40,100,1],hint:'Rente AI dès 40 % ; rente entière dès 70 %.'},
     {k:'enf',l:'Enfants à charge',kind:'int',unit:'',v:1,min:0,max:10,s:[0,6,1]},
     {k:'orig',l:'Origine de l’invalidité',o:[['maladie','Maladie'],['accident','Accident']],v:'maladie'},
     {k:'age',l:'Âge actuel',kind:'int',unit:'ans',v:40,min:18,max:64,s:[20,64,1]},
     {k:'ret',l:'Âge de la retraite',kind:'int',unit:'ans',v:65,min:58,max:70,s:[58,70,1]},
     {k:'lppc',l:'Rente d’invalidité LPP selon votre certificat',kind:'chf',v:0,min:0,max:300000,s:[0,80000,500],hint:'Ligne « rente d’invalidité » de votre certificat de prévoyance, par an. Laissez 0 pour une estimation au minimum légal.'}]},
   {title:'En cas de décès',why:'Les rentes de survivants dépendent de l’état civil : un concubin n’a droit à aucune rente légale AVS ni LPP.',
    fields:[{k:'fam',l:'Situation familiale',o:[['marie','Marié ou partenariat enregistré'],['concubin','Concubinage']],v:'marie'},
     {k:'sv',l:'Conjoint ou partenaire survivant',o:[['veuve','Une veuve ou un partenaire féminin'],['veuf','Un veuf ou un partenaire masculin']],v:'veuve'},
     {k:'agesv',l:'Âge du survivant',kind:'int',unit:'ans',v:40,min:18,max:100,s:[20,70,1]},
     {k:'enfd',l:'Enfants de moins de 18 ans, ou de moins de 25 ans en formation',kind:'int',unit:'',v:2,min:0,max:10,s:[0,6,1]},
     {k:'enfage',l:'Âge du plus jeune enfant',kind:'int',unit:'ans',v:6,min:0,max:24,s:[0,24,1]},
     {k:'cap',l:'Capitaux décès existants (LPP, 3a, assurance risque)',kind:'chf',v:100000,min:0,max:5000000,s:[0,1000000,5000]}]}],
  check:function(o){var e=[];if(o.ret<=o.age)e.push({k:'ret',m:'L’âge de la retraite doit être supérieur à votre âge actuel.'});return e},
  calc:function(o){
   var R0=AVS[2026],rA=avsR(o.sal,44,R0)*12,acc=o.orig==='accident',dg=o.deg/100,
    aiF=o.deg>=70?1:o.deg>=50?dg:.25+(o.deg-40)*.025,lpF=o.deg>=70?1:o.deg>=60?.75:o.deg>=50?.5:.25;
   var ai=rA*aiF,aiE=ai*.4*o.enf,aiT=ai+aiE;
   var sc=Math.max(0,Math.min(o.sal,LPP_MAX)-COORD),proj=0;for(var a=25;a<o.ret;a++)proj+=sc*brk(a);
   var lppFull=o.lppc>0?o.lppc:proj*.068,lpp=lppFull*lpF,lppT=lpp*(1+.2*o.enf);
   var gain=Math.min(o.sal,LAA_MAX),laa=0,laaCut=false,lppCut=false;
   if(acc){laa=gain*.8*dg;var capA=gain*.9*dg;if(aiT+laa>capA){laa=Math.max(0,capA-aiT);laaCut=true}}
   var capAll=o.sal*.9*dg;if(aiT+laa+lppT>capAll){lppT=Math.max(0,capAll-aiT-laa);lppCut=true}
   var res=o.sal*(1-dg),tot=aiT+lppT+laa,cible=o.sal*.8,gap=Math.max(0,cible-tot-res),an=Math.max(0,o.ret-o.age),manq=gap*an;
   // décès
   var mar=o.fam==='marie',dAVS=mar&&(o.enfd>0||(o.sv==='veuve'&&o.agesv>=45)),dLPP=mar&&(o.enfd>0||o.agesv>=45);
   var avsC=dAVS?.8*rA:0,lppC=dLPP?.6*lppFull:0,avsO=.4*rA*o.enfd,lppO=.2*lppFull*o.enfd;
   var dur=o.enfd>0?Math.max(1,25-o.enfage):5,app=o.cap/dur,rentes=avsC+lppC+avsO+lppO,tD=rentes+app,bes=o.sal*.8,ec=Math.max(0,bes-tD);
   var warns=[];
   if(laaCut)warns.push('Surindemnisation : la rente LAA est réduite pour que AI et LAA ne dépassent pas 90 % du gain présumé perdu.');
   if(lppCut)warns.push('Surindemnisation : la rente LPP est réduite pour que l’ensemble des rentes ne dépasse pas 90 % du gain présumé perdu.');
   if(o.sal>LAA_MAX&&acc)warns.push('Le gain assuré LAA est plafonné à '+fmt(LAA_MAX)+' par an.');
   var dw=[];
   if(!mar)dw.push('Concubinage : aucune rente de survivant AVS ni LPP légale n’est versée au concubin. Seules les rentes d’orphelins et le capital prévu par une clause bénéficiaire (caisse de pension, 3a, assurance) s’appliquent.');
   else if(!dAVS||!dLPP)dw.push('Sans enfant à charge, la rente de survivant n’est due que sous conditions d’âge (45 ans) et de durée de mariage (5 ans) : elle n’est pas retenue ici pour votre situation.');
   var bars=[{l:'AI + enfants',v:aiT,c:COL[0]},{l:'LPP',v:lppT,c:COL[0]}];
   if(acc)bars.push({l:'LAA',v:laa,c:COL[0]});
   if(res>0)bars.push({l:'Revenu résiduel',v:res,c:'var(--text-2)'});
   bars.push({l:'Cible 80 %',v:cible,c:COL[1]});
   var dbars=[{l:'AVS',v:avsC+avsO,c:COL[0]},{l:'LPP',v:lppC+lppO,c:COL[0]},{l:'Capital',v:app,c:'var(--text-2)'},{l:'Besoin 80 %',v:bes,c:COL[1]}];
   var ex='<h3>Invalidité : rentes et revenu cible (par an)</h3><figure class="res-chart">'+barsC(bars,'Rentes annuelles en cas d’invalidité comparées au revenu cible','par an')+'</figure>'+
    '<h3>Décès : protection des proches</h3>'+dw.map(function(w){return'<p class="res-warn">'+ic('alert')+'<span>'+w+'</span></p>'}).join('')+
    '<dl class="res-dl"><div><dt>Rente de veuf ou veuve : AVS (80 %)</dt><dd>'+fmt(avsC)+' par an</dd></div><div><dt>Rente de veuf ou veuve : LPP (60 %)</dt><dd>'+fmt(lppC)+' par an</dd></div><div><dt>Rentes d’orphelins : AVS (40 %) et LPP (20 %)</dt><dd>'+fmt(avsO+lppO)+' par an</dd></div><div><dt>Capitaux décès, répartis sur '+dur+' an'+(dur>1?'s':'')+'</dt><dd>'+fmt(app)+' par an</dd></div><div><dt>Total pour les proches</dt><dd>'+fmt(tD)+' par an</dd></div><div><dt>Besoin du foyer (80 % du salaire)</dt><dd>'+fmt(bes)+' par an</dd></div><div><dt>Écart financier résiduel</dt><dd>'+fmt(ec)+' par an</dd></div></dl>'+
    '<figure class="res-chart">'+barsC(dbars,'Revenus annuels des proches comparés au besoin du foyer','par an')+'</figure>';
   return{
    main:{label:'Déficit annuel en cas d’invalidité',value:fmt(gap,''),unit:'CHF par an',note:'Rentes'+(res>0?' et revenu résiduel':'')+' de '+fmt(tot+res)+' pour un revenu cible de '+fmt(cible)+' (80 % du salaire). Capital manquant jusqu’à la retraite : '+fmt(manq)+'.'},
    assumptions:['Salaire de '+fmt(o.sal)+', invalidité de '+o.deg+' % d’origine '+(acc?'accidentelle':'maladie'),'Rente AI : échelle suisse (25 % dès 40 %, 50 à 69 % en échelle linéaire, rente entière dès 70 %), carrière complète supposée, barème 2026 ('+fmt(R0)+' à '+fmt(2*R0)+' par mois), 12 rentes par an','Rente d’enfant AI : 40 % de la rente ; rente LPP : '+(o.lppc>0?'selon votre certificat':'estimée au minimum légal (bonifications dès 25 ans, conversion 6,8 %)')+', majorée de 20 % par enfant',
     'Surindemnisation : l’ensemble des rentes est limité à 90 % du gain présumé perdu'+(acc?' ; rente LAA de 80 % du gain assuré (plafond '+fmt(LAA_MAX)+')':''),'Revenu résiduel : la part d’activité restante ('+(100-o.deg)+' %) est supposée maintenue au même salaire','Décès : AVS 80 % (veuf ou veuve) et 40 % (orphelin) de la rente de vieillesse ; LPP 60 % et 20 % de la rente d’invalidité'],
    warns:warns,
    details:[['Rente AI, enfants compris',fmt(aiT)+' par an'],['Rente LPP, enfants compris',fmt(lppT)+' par an'],['Rente LAA',acc?fmt(laa)+' par an':'sans objet (maladie)'],['Revenu résiduel d’activité',fmt(res)+' par an'],['Total des rentes et du revenu résiduel',fmt(tot+res)+' par an'],['Revenu cible (80 % du salaire)',fmt(cible)+' par an'],['Capital manquant jusqu’à '+o.ret+' ans ('+an+' ans)',fmt(manq)]],
    extra:ex,
    limits:['Le règlement de votre caisse de pension peut prévoir des prestations supérieures au minimum légal : votre certificat prime','La rente AI dépend de la carrière réelle et de la décision de l’office AI ; le délai d’attente avant une rente est d’au moins un an','Sans enfant à charge, une veuve n’a droit à une rente AVS qu’à partir de 45 ans et après cinq ans de mariage ; le capital manquant n’est ni actualisé ni indexé','Les rentes d’orphelins cessent à 18 ans, ou à 25 ans en formation : elles sont ici retenues sur la durée choisie, sans distinguer chaque enfant','Les rentes AVS de survivants ne comprennent pas la 13e rente'],
    method:['Rente AI = rente AVS entière (échelle 44) × fraction selon le degré : 25 % + 2,5 points par point au-dessus de 40 % jusqu’à 49 %, 50 à 69 % égal au degré, 100 % dès 70 %.','Rente LPP d’invalidité = rente à 100 % × 25, 50, 75 ou 100 % selon le degré ; rente à 100 % estimée à partir des bonifications légales jusqu’à la retraite, converties à 6,8 %.','Rente LAA = 80 % du gain assuré × degré d’invalidité, puis limite de surindemnisation de 90 %.','Déficit = revenu cible − rentes − revenu résiduel ; capital manquant = déficit × années jusqu’à la retraite.','Décès : rentes de survivants, plus les capitaux décès divisés par la durée de transition familiale (jusqu’aux 25 ans du plus jeune enfant, ou 5 ans sans enfant).'],
    next:[{t:'Indépendant : prévoyance sans LPP',h:ROOT+'guides/independant-prevoyance-sans-lpp/index.html'},{t:'Comprendre les trois piliers',h:ROOT+'prevoyance/index.html'}],
    sim:{annee:2026,origine:o.orig,degre_invalidite:o.deg,enfants_a_charge:o.enf,rentes_invalidite_annuelles:Math.round(tot),deficit_invalidite:Math.round(gap),capital_manquant:Math.round(manq),situation_familiale:o.fam,rentes_survivants_annuelles:Math.round(rentes),ecart_deces:Math.round(ec)}}}},

 'salaire-net':{title:'Mon salaire net',sujet:'lpp',
  steps:[
   {title:'Votre salaire',why:'Le salaire net estimé est le salaire brut moins les cotisations sociales obligatoires. Les impôts ne sont pas déduits : ils dépendent du canton, du statut et de votre situation.',
    fields:[{k:'per',rescale:'sal',l:'Le montant saisi est',o:[['annuel','Un salaire annuel brut'],['mensuel','Un salaire mensuel brut (× 12)']],v:'annuel'},
     {k:'sal',l:'Salaire brut',kind:'chf',v:96000,min:0,max:2000000,s:function(o){return o.per==='mensuel'?[0,30000,100]:[0,300000,1000]},hint:'Avec un 13e salaire, saisissez le total annuel.'},
     {k:'canton',l:'Canton de travail',o:[['GE','Genève'],['VD','Vaud'],['NE','Neuchâtel'],['FR','Fribourg'],['VS','Valais'],['JU','Jura']],v:'VD'},
     {k:'statut',l:'Votre statut',o:[['resident','Résident en Suisse'],['frontalier','Frontalier (domicile en France)']],v:'resident'},
     {k:'age',l:'Âge',kind:'int',unit:'ans',v:40,min:18,max:70,s:[18,65,1],hint:'Les bonifications LPP dépendent de la tranche d’âge : 7, 10, 15 ou 18 %.'},
     {k:'aanp',l:'Prime assurance accident non professionnel (AANP)',kind:'pct',v:1.2,min:0,max:5,s:[0,3,.05],hint:'Hypothèse : le taux dépend de votre employeur et de son assureur. Voir votre fiche de salaire.'}]}],
  calc:function(o){
   var brut=o.per==='mensuel'?o.sal*12:o.sal,avs=brut*.053,ac=Math.min(brut,AC_MAX)*.011,
    sc=Math.max(0,Math.min(brut,LPP_MAX)-COORD),bon=brk(o.age),lppTot=brut>=LPP_ENTRY?sc*bon:0,lpp=lppTot/2,
    aanp=Math.min(brut,LAA_MAX)*o.aanp/100,cot=avs+ac+lpp+aanp,net=brut-cot,taux=brut>0?cot/brut*100:0;
   var imp;
   if(o.statut==='resident')imp='En tant que résident, vous êtes soit imposé à la source (permis B, par exemple), soit taxé ordinairement sur déclaration. La taxation ordinaire ultérieure (TOU) permet à un contribuable imposé à la source de faire valoir ses déductions réelles.';
   else if(o.canton==='GE'||o.canton==='FR')imp='Frontalier travaillant à '+CNAME[o.canton]+' : l’impôt est prélevé à la source en Suisse. Selon les revenus du foyer, un statut de quasi-résident peut ouvrir droit aux déductions (3a, rachat LPP) : à faire vérifier.';
   else imp='Frontalier travaillant à '+CNAME[o.canton]+' : en principe, pas d’impôt à la source en Suisse. Vous êtes imposé en France, sur présentation d’une attestation de résidence fiscale à votre employeur.';
   var warns=[];
   if(brut<LPP_ENTRY&&brut>0)warns.push('Sous le seuil d’entrée LPP de '+fmt(LPP_ENTRY)+' par an, l’affiliation à la caisse de pension n’est pas obligatoire : aucune cotisation LPP n’est retenue ici.');
   if(o.age<25)warns.push('Avant 25 ans, les bonifications de vieillesse LPP ne sont pas dues : seule la couverture des risques est prélevée, et elle n’est pas estimée ici.');
   return{
    main:{label:'Salaire net mensuel estimé, avant impôt',value:fmt(net/12,''),unit:'CHF par mois',note:'Soit '+fmt(net)+' par an, après '+fmt(cot)+' de cotisations sociales ('+pc(Math.round(taux*10)/10)+' du brut).'},
    assumptions:['Salaire brut annuel de '+fmt(brut)+(o.per==='mensuel'?' (salaire mensuel × 12)':''),'AVS, AI et APG : 5,3 % à la charge du salarié','Assurance chômage : 1,1 % jusqu’à '+fmt(AC_MAX)+' de salaire','LPP : bonification de '+pc(Math.round(bon*100))+' pour l’âge de '+o.age+' ans, sur le salaire coordonné ; part du salarié supposée égale à 50 %','AANP : '+pc(o.aanp)+' du salaire, plafonné à '+fmt(LAA_MAX),'Barèmes 2026 ; impôts non déduits'],
    warns:warns,
    details:[['AVS, AI, APG (5,3 %)',fmt(avs)+' par an'],['Assurance chômage (1,1 %)',fmt(ac)+' par an'],['LPP, part du salarié',fmt(lpp)+' par an'],['AANP',fmt(aanp)+' par an'],['Total des cotisations',fmt(cot)+' par an'],['Salaire net avant impôt',fmt(net)+' par an']],
    extra:'<h3>Et les impôts ?</h3><p class="res-p">'+imp+'</p>',
    bridge:'<div class="bridge"><p><strong>Vous souhaitez optimiser votre net et préparer votre retraite ?</strong></p><p>Votre part LPP de '+fmt(lpp)+' par an alimente votre retraite : un expert lit votre certificat et repère ce qui peut être optimisé.</p><a class="btn" href="'+ROOT+'rendez-vous/index.html?demande=etude&amp;sujet=lpp&amp;profil='+(o.statut==='frontalier'?'frontalier':'resident')+'&amp;canton='+o.canton+'&amp;source=sim-salaire-pont" data-cta="salaire_pont">Faire analyser mon certificat LPP par un expert</a></div>',
    chartTitle:'Du brut au net (par an)',chart:barsC([{l:'Brut',v:brut,c:COL[0]},{l:'Cotisations',v:cot,c:COL[1]},{l:'Net avant impôt',v:net,c:COL[0]}],'Salaire brut, cotisations sociales et salaire net avant impôt','par an'),
    limits:['Estimation selon les taux légaux : votre fiche de salaire et le règlement de votre caisse de pension prévalent','Votre caisse peut prélever plus de 50 % des bonifications, ou un taux différent pour les risques','Assurance d’indemnités journalières maladie, frais, impôt et prélèvements propres à votre employeur non pris en compte','Valeurs 2027 : coordination LPP de 26’880 CHF et seuil d’entrée de 23’040 CHF'],
    method:['AVS, AI, APG = brut × 5,3 %.','Assurance chômage = min(brut ; 148’200 CHF) × 1,1 %.','LPP salarié = (min(brut ; 90’720 CHF) − 26’460 CHF) × taux de bonification de l’âge ÷ 2, dès le seuil d’entrée de 22’680 CHF.','AANP = min(brut ; 148’200 CHF) × taux saisi.','Net avant impôt = brut − cotisations.'],
    next:[{t:'Estimer ma rente AVS',h:ROOT+'outils/simulateur-avs/index.html'},{t:'Simuler un rachat LPP',h:ROOT+'outils/simulateur-rachat-lpp/index.html'}],
    sim:{annee:2026,canton:o.canton,statut:o.statut,age:o.age,salaire_brut:Math.round(brut),cotisations:Math.round(cot),lpp_salarie:Math.round(lpp),net_avant_impot:Math.round(net)}}}}


};

/* ---------- Rendu du résultat ---------- */
function render(r,key){
 var h='<div class="res-head"><span class="tag">Estimation indicative</span></div>';
 h+='<div class="res-main"><p class="res-lbl">'+r.main.label+'</p><p class="res-big">'+r.main.value+(r.main.unit?'<small>'+r.main.unit+'</small>':'')+'</p><p class="res-note">'+r.main.note+'</p></div>';
 h+='<div class="res-hyp"><p><strong>Hypothèses retenues</strong></p><ul>'+r.assumptions.map(function(a){return'<li>'+a+'</li>'}).join('')+'</ul></div>';
 (r.warns||[]).forEach(function(w){h+='<p class="res-warn">'+ic('alert')+'<span>'+w+'</span></p>'});
 h+='<h3>Détail</h3><dl class="res-dl">'+r.details.map(function(d){return'<div><dt>'+d[0]+'</dt><dd>'+d[1]+'</dd></div>'}).join('')+'</dl>';
 if(r.extra)h+=r.extra;
 if(r.bridge)h+=r.bridge;
 if(r.chart)h+='<h3>'+r.chartTitle+'</h3><figure class="res-chart">'+r.chart+'</figure>';
 h+='<details class="res-more"><summary>Limites et méthode de calcul</summary><div><p><strong>Limites</strong></p><ul>'+r.limits.map(function(a){return'<li>'+a+'</li>'}).join('')+'</ul><p><strong>Formules</strong></p><ul>'+r.method.map(function(m){return'<li>'+m+'</li>'}).join('')+'</ul></div></details>';
 h+='<div class="res-next">'+(r.next||[]).map(function(n){return'<a class="link" href="'+n.h+'">'+n.t+' '+ic('arrow')+'</a>'}).join('')+'<a class="link" href="#etude" data-cta="sim_to_form_'+key+'">Recevoir mon étude comparative '+ic('arrow')+'</a></div>';
 return h;
}
window.CimeSim={tools:TOOLS,parseNum:parseNum,state:state};

/* ---------- Interface ---------- */
function unitOf(f){return f.unit!==undefined?f.unit:({chf:'CHF',eur:'€',pct:'%'}[f.kind]||'')}
function sliderOf(f,vals){return typeof f.s==='function'?f.s(vals):f.s}
function fieldHTML(f,id,vals){
 var hint=f.hint?'<span class="hint blk" id="'+id+'-h">'+f.hint+'</span>':'';
 var err='<span class="field-err" id="'+id+'-e" hidden>'+ic('alert')+'<span class="t"></span></span>';
 var desc='aria-describedby="'+(f.hint?id+'-h ':'')+id+'-e"';
 if(f.o)return'<div class="fld"><label for="'+id+'">'+f.l+'</label><select id="'+id+'" data-k="'+f.k+'" '+desc+'>'+f.o.map(function(x){return'<option value="'+x[0]+'"'+(String(x[0])===String(f.cur)?' selected':'')+'>'+x[1]+'</option>'}).join('')+'</select>'+hint+err+'</div>';
 var u=unitOf(f),s=sliderOf(f,vals);
 var rng=s?'<input class="rng" type="range" id="'+id+'-r" data-r="'+f.k+'" min="'+s[0]+'" max="'+s[1]+'" step="'+s[2]+'" value="'+Math.min(s[1],Math.max(s[0],f.cur))+'" aria-label="'+f.l+' (curseur)">':'';
 return'<div class="fld"><div class="fld-top"><label for="'+id+'">'+f.l+'</label><div class="unit"><input id="'+id+'" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" data-k="'+f.k+'" value="'+fmtIn(f.cur,f.kind)+'" '+desc+'>'+(u?'<span aria-hidden="true">'+u+'</span>':'')+'</div></div>'+rng+hint+err+'</div>';
}
function rangeMsg(f){var u=unitOf(f);return'Entrez une valeur entre '+fmtIn(f.min,f.kind)+' et '+fmtIn(f.max,f.kind)+(u?' '+u:'')+'.'}
function paint(r){var mn=+r.min,mx=+r.max,v=+r.value;r.style.setProperty('--p',(mx>mn?(v-mn)/(mx-mn)*100:0)+'%')}

function build(root){
 var key=root.getAttribute('data-tool'),T=TOOLS[key];if(!T)return;
 var qs=new URLSearchParams(location.search),vals={},fields=[];
 T.steps.forEach(function(s){s.fields.forEach(function(f){var q=qs.get(f.k),pv=q!==null&&q!==''?(f.o?q:parseNum(q)):NaN;
  if(f.o&&q!==null&&!f.o.some(function(x){return String(x[0])===q}))q=null;
  f.cur=f.o?(q!==null&&q!==''?q:f.v):(isNaN(pv)?f.v:pv);vals[f.k]=f.o&&f.num?parseFloat(f.cur):f.cur;fields.push(f)})});
 // taux marginal : si le canton est fourni sans taux, on applique la moyenne du canton
 fields.forEach(function(f){if(f.sets&&qs.get(f.k)&&!qs.get(f.sets.k)&&f.sets.map[vals[f.k]]!==undefined){vals[f.sets.k]=f.sets.map[vals[f.k]];fields.forEach(function(g){if(g.k===f.sets.k)g.cur=vals[g.k]})}});
 var n=T.steps.length,cur=0,id0='f-'+key;
 root.innerHTML='';
 var inp=document.createElement('div');inp.className='sim-in';
 inp.innerHTML='<h2>'+T.title+'</h2>'+(n>1?'<div class="bar-steps" aria-hidden="true">'+T.steps.map(function(_,i){return'<i'+(i===0?' class="on"':'')+'></i>'}).join('')+'</div>':'')+
  '<p class="sim-stepl" id="'+id0+'-sl"></p><p class="sim-why" id="'+id0+'-why"></p>'+
  T.steps.map(function(s,i){return'<div class="sim-fields" data-step="'+i+'"'+(i?' hidden':'')+'>'+s.fields.map(function(f){return fieldHTML(f,id0+'-'+f.k,vals)}).join('')+'</div>'}).join('')+
  '<p class="cap sim-ex">Valeurs d’exemple : remplacez-les par les vôtres.</p>'+
  '<div class="sim-nav"><button type="button" class="btn ghost" data-prev hidden>Retour</button><button type="button" class="btn" data-next'+(n===1?' hidden':'')+'>Continuer</button></div>';
 var out=document.createElement('div');out.className='out';out.setAttribute('aria-labelledby',id0+'-res');
 var live=document.createElement('p');live.className='vh';live.setAttribute('role','status');
 root.appendChild(inp);root.appendChild(out);root.appendChild(live);
 var prev=$('[data-prev]',inp),next=$('[data-next]',inp);
 function show(i,focus){cur=i;[].forEach.call(inp.querySelectorAll('.sim-fields'),function(d,j){d.hidden=j!==i});
  [].forEach.call(inp.querySelectorAll('.bar-steps i'),function(l,j){l.className=j<=i?'on':''});
  $('#'+id0+'-sl').textContent=n>1?'Étape '+(i+1)+' sur '+n+' : '+T.steps[i].title.toLowerCase():T.steps[i].title;$('#'+id0+'-why').textContent=T.steps[i].why;
  prev.hidden=i===0;next.hidden=i===n-1;if(focus){var c=inp.querySelector('[data-step="'+i+'"] input:not([type=range]),[data-step="'+i+'"] select');if(c)c.focus()}}
 prev.addEventListener('click',function(){show(cur-1,true)});next.addEventListener('click',function(){show(cur+1,true)});
 inp.addEventListener('keydown',function(e){if(e.key==='Enter'&&e.target.tagName==='INPUT'&&cur<n-1){e.preventDefault();show(cur+1,true)}});
 var started=false;
 function el(k){return $('#'+id0+'-'+k,inp)}
 function setErr(f,msg){var e=el(f.k),box=$('#'+id0+'-'+f.k+'-e',inp);if(!e||!box)return;if(msg){box.hidden=false;box.querySelector('.t').textContent=msg;e.setAttribute('aria-invalid','true')}else{box.hidden=true;e.removeAttribute('aria-invalid')}}
 function syncSliders(){fields.forEach(function(f){var r=$('#'+id0+'-'+f.k+'-r',inp);if(!r)return;var s=sliderOf(f,vals);r.min=s[0];r.max=s[1];r.step=s[2];var v=vals[f.k];if(typeof v==='number'&&!isNaN(v))r.value=Math.min(s[1],Math.max(s[0],v));paint(r)})}
 function readAll(){
  var ok=true;
  fields.forEach(function(f){
   var e=el(f.k);if(f.o){vals[f.k]=f.num?parseFloat(e.value):e.value;setErr(f,'');return}
   var v=parseNum(e.value),bad=null;
   if(e.value.trim()==='')bad='Renseignez ce champ.';else if(isNaN(v))bad='Saisissez un nombre (exemple : 7’258 ou 2,5).';else if(v<f.min||v>f.max)bad=rangeMsg(f);
   setErr(f,bad);if(bad)ok=false;else vals[f.k]=v});
  if(ok&&T.check){T.check(vals).forEach(function(c){var f=fields.filter(function(x){return x.k===c.k})[0];setErr(f,c.m);ok=false})}
  return ok;
 }
 var lastSig='';
 function run(announce){
  var ok=readAll(),sig=ok?JSON.stringify(vals):'err';
  syncSliders();
  if(sig===lastSig&&out.innerHTML)return;
  lastSig=sig;
  if(!ok){out.className='out empty';out.innerHTML='<p>'+ic('alert')+' Corrigez les champs signalés pour afficher l’estimation.</p>';delete state[key];return}
  var r=T.calc(vals);out.className='out';out.innerHTML=render(r,key);
  var h=out.querySelector('.res-lbl');if(h)h.id=id0+'-res';
  state[key]={entrees:Object.assign({},vals),resultats:r.sim};
  if(announce)live.textContent='Estimation mise à jour : '+r.main.label+' '+r.main.value+' '+(r.main.unit||'')+'.';
 }
 function start(){if(!started){started=true;track('simulator_start',{tool:key})}}
 inp.addEventListener('input',function(e){
  var t=e.target,rk=t.getAttribute('data-r');
  if(rk){var f=fields.filter(function(x){return x.k===rk})[0];el(rk).value=fmtIn(parseFloat(t.value),f.kind);paint(t);start();run(false);return}
  if(!t.getAttribute('data-k'))return;start();run(false)});
 inp.addEventListener('change',function(e){var t=e.target,k=t.getAttribute('data-k')||t.getAttribute('data-r');if(!k)return;
  var f=fields.filter(function(x){return x.k===k})[0];
  if(f&&f.sets&&f.sets.map[t.value]!==undefined){el(f.sets.k).value=fmtIn(f.sets.map[t.value],'pct')}
  if(f&&f.rescale){var tg=el(f.rescale),pv=parseNum(tg.value);if(!isNaN(pv)){var nv=Math.round(pv*(t.value==='mensuel'?1/12:12)/ (t.value==='mensuel'?1:1));tg.value=fmtIn(nv,'chf')}}
  if(f&&!f.o&&t.getAttribute('data-k')){var v=parseNum(t.value);if(!isNaN(v)&&v>=f.min&&v<=f.max)t.value=fmtIn(v,f.kind)}
  run(true)});
 show(0,false);run(false);
}
document.querySelectorAll('.sim[data-tool]').forEach(build);

/* Le formulaire d'étude joint les résultats des simulateurs de la page (format JSON). */
window.CimeLeadExtra=function(){return Object.keys(state).length?{simulation:JSON.stringify(state)}:{}};
})();
