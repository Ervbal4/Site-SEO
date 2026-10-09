/* Cime — simulateurs pédagogiques (3a, rachat LPP, AVS, LAMal/CMU, franchise).
   Calculs 100 % dans le navigateur. Les formules sont inchangées depuis la version de référence
   (voir tests/golden-simulators.json) ; cette version ne modifie que la présentation. */
(function(){
'use strict';
var C=window.CIME_CONFIG||{};
var $=function(s,r){return(r||document).querySelector(s)};
var NB=/[\u202f\u00a0]/g;
var fmt=function(n,u){return Math.round(n).toLocaleString('fr-CH').replace(NB,'\u2019')+(u===''?'':' '+(u||'CHF'))};
var fs=function(n){return n>=1e6?(n/1e6).toFixed(1).replace('.',',')+' M':n>=1e3?Math.round(n/1e3)+'k':Math.round(n)+''};
var COL=['var(--viz-1)','var(--viz-2)','var(--viz-3)','var(--viz-4)'];
var state={};            // résultats de tous les simulateurs de la page (joints à la demande d'étude)
var track=function(e,p){try{window.dataLayer=window.dataLayer||[];window.dataLayer.push(Object.assign({event:e},p||{}))}catch(_){}};
var ic=function(n){return'<svg class="i" aria-hidden="true"><use href="#i-'+n+'"/></svg>'};
/* Nombres saisis : accepte 7258, 7 258, 7'258, 7’258 et la virgule décimale (2,5). */
function parseNum(s){if(typeof s==='number')return s;s=String(s).replace(/[\s\u202f\u00a0'\u2019]/g,'').replace(',','.');return/^-?(\d+\.?\d*|\.\d+)$/.test(s)?parseFloat(s):NaN}
function fmtIn(v,kind){if(typeof v!=='number'||isNaN(v))return'';if(kind==='chf'||kind==='eur'||kind==='int')return v.toLocaleString('fr-CH',{maximumFractionDigits:0}).replace(NB,'\u2019');return String(v).replace('.',',')}
/* ---------- Règles de calcul ---------- */
var R0=C.avsRenteMin||1260,LPP_MAX=90720; // salaire maximal LPP (3 × rente AVS maximale de 30 240 CHF)
// Rente AVS mensuelle (échelle 44), selon le revenu annuel moyen E et les années de cotisation n.
function avsR(E,n){var Ee=Math.ceil(E/(1.2*R0)-1e-9)*1.2*R0,r=Ee<=12*R0?R0:Ee<=36*R0?.74*R0+13*Ee/600:Ee<72*R0?1.04*R0+8*Ee/600:2*R0;return Math.round((n>=44?1:Math.max(0,n)/44)*r)}
// Bonifications de vieillesse LPP (minimum légal) par âge.
function brk(a){return a>=55?.18:a>=45?.15:a>=35?.10:a>=25?.07:0}
// Avoir LPP à la retraite : salaire coordonné (déduction 26 460 CHF, salaire maximal assuré 90 720 CHF, soit un salaire coordonné maximal de 64 260 CHF), rendement constant.
function lppFin(o,rachat){var x=o.lpp,sc=Math.max(0,Math.min(o.sal,LPP_MAX)-26460);for(var a=o.age;a<o.ret;a++){x+=x*o.rg/100+sc*brk(a)+(a===o.age?rachat:0)}return x}
// Coût annuel LAMal pour des frais de santé X : prime + franchise + quote-part de 10 % (max. 700 CHF).
function lamalCost(prime,fr,X){return prime+Math.min(X,fr)+Math.min(Math.max(0,X-fr)*.1,700)}

/* ---------- Graphiques SVG ---------- */
function lineC(ser,xl,alt){var n=xl.length;if(n<2)return'';var W=460,H=210,p={l:44,r:12,t:12,b:26},mx=Math.max(1,Math.max.apply(null,[].concat.apply([],ser.map(function(s){return s.v}))))*1.08;
 var X=function(i){return p.l+(W-p.l-p.r)*i/(n-1)},Y=function(v){return p.t+(H-p.t-p.b)*(1-v/mx)};
 var gr=[0,.25,.5,.75,1].map(function(k){return'<line x1="'+p.l+'" x2="'+(W-p.r)+'" y1="'+Y(mx*k)+'" y2="'+Y(mx*k)+'" stroke="var(--line)"/><text x="'+(p.l-6)+'" y="'+(Y(mx*k)+4)+'" text-anchor="end" font-size="10" fill="var(--text-2)">'+fs(mx*k)+'</text>'}).join('');
 var xs=[0,Math.floor((n-1)/2),n-1].map(function(i){return'<text x="'+X(i)+'" y="'+(H-6)+'" text-anchor="middle" font-size="10" fill="var(--text-2)">'+xl[i]+'</text>'}).join('');
 var ls=ser.map(function(s,k){var d=s.v.map(function(v,i){return(i?'L':'M')+X(i).toFixed(1)+' '+Y(v).toFixed(1)}).join('');return(k===0?'<path d="'+d+'L'+X(n-1)+' '+Y(0)+'L'+X(0)+' '+Y(0)+'Z" fill="'+s.c+'" opacity=".12"/>':'')+'<path d="'+d+'" fill="none" stroke="'+s.c+'" stroke-width="2.5"/>'}).join('');
 return'<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+(alt||'Graphique')+'">'+gr+xs+ls+'</svg><div class="lg">'+ser.map(function(s){return'<span><b style="background:'+s.c+'"></b>'+s.n+'</span>'}).join('')+'</div>'}
function barsC(it,alt){var W=460,H=210,mx=Math.max(1,Math.max.apply(null,it.map(function(i){return i.v})))*1.15,bw=(W-40)/it.length;
 return'<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+(alt||'Graphique')+'">'+it.map(function(i,k){var h=(H-60)*i.v/mx,x=20+k*bw+bw*.18,m=x+bw*.32;return'<rect x="'+x+'" y="'+(H-30-h)+'" width="'+bw*.64+'" height="'+h+'" rx="6" fill="'+(i.c||COL[0])+'"/><text x="'+m+'" y="'+(H-34-h)+'" text-anchor="middle" font-size="11" font-weight="600" fill="var(--text)">'+fs(i.v)+'</text><text x="'+m+'" y="'+(H-12)+'" text-anchor="middle" font-size="10.5" fill="var(--text-2)">'+i.l+'</text>'}).join('')+'</svg>'}


/* ---------- Définition des simulateurs ---------- */
var SEL_STATUT=[['salarie','Salarié (avec LPP)'],['independant','Indépendant (sans LPP)']];
var TOOLS={
 '3a':{title:'Simulateur 3e pilier',sujet:'3a',
  steps:[
   {title:'Votre situation',why:'Le statut fixe le plafond de versement. Le taux marginal détermine l’impôt concerné par chaque franc déduit : vous le trouvez sur votre dernière déclaration ou dans le calculateur de votre canton.',
    fields:[{k:'statut',l:'Votre statut',o:SEL_STATUT,v:'salarie'},{k:'t',l:'Taux marginal d’impôt estimé',kind:'pct',v:25,min:0,max:60,hint:'Ordre de grandeur en Suisse romande : 20 à 35 %.'}]},
   {title:'Votre versement',why:'Le versement annuel est limité par un plafond. La durée et le rendement servent à projeter un capital : le rendement est une hypothèse, jamais une garantie.',
    fields:[{k:'v',l:'Versement annuel',kind:'chf',v:7258,min:0,max:200000,hint:'Plafond 2026 : 7 258 CHF (salarié), 36 288 CHF (indépendant).'},{k:'d',l:'Durée de versement',kind:'int',unit:'ans',v:25,min:1,max:50},{k:'r',l:'Rendement net supposé par an',kind:'pct',v:2,min:-5,max:12,hint:'Net de frais, constant sur toute la durée.'}]}],
  calc:function(o){var pl=(C.plafond3a||{})[o.statut]||(o.statut==='independant'?36288:7258),cap=0,ser=[0],tot=[0];
   for(var i=0;i<o.d;i++){cap=cap*(1+o.r/100)+o.v;ser.push(cap);tot.push(o.v*(i+1))}
   var eco=o.v*o.t/100,gain=cap-o.v*o.d;
   var alt=[['Compte épargne',1],['Assurance',2],['Fonds indiciels',3.6]].map(function(a){var c=0;for(var i=0;i<o.d;i++)c=c*(1+a[1]/100)+o.v;return'<tr><td>'+a[0]+' ('+String(a[1]).replace('.',',')+' %)</td><td>'+fmt(c)+'</td></tr>'}).join('');
   return{
    main:{label:'Réduction d’impôt estimée, par an',value:fmt(eco,''),unit:'CHF',note:'Versement de '+fmt(o.v)+' × taux marginal supposé de '+String(o.t).replace('.',',')+' %.'},
    warns:o.v>pl?['Votre versement dépasse le plafond annuel de '+fmt(pl)+(o.statut==='independant'?' (20 % du revenu net, au maximum).':'.')+' La part au-dessus du plafond n’est pas déductible.']:[],
    details:[['Total versé',fmt(o.v*o.d)],['Capital estimé après '+o.d+' ans',fmt(cap)],['Gain de placement (hypothèse)',fmt(gain)],['Réduction d’impôt cumulée',fmt(eco*o.d)]],
    extra:'<h3>Même versement, trois supports</h3><table>'+alt+'</table>',
    chartTitle:'Évolution du capital',chart:lineC([{n:'Capital estimé',c:COL[0],v:ser},{n:'Total versé',c:COL[1],v:tot}],ser.map(function(_,i){return'An '+i}),'Courbe du capital estimé et du total versé sur '+o.d+' ans'),
    assumptions:['Versements en fin d’année, rendement net constant','Taux marginal constant sur toute la durée','Plafond 2026 pris en compte : '+fmt(pl)],
    limits:['Le rendement n’est pas garanti et dépend du support choisi','Les frais réels varient d’un contrat à l’autre','L’impôt exact dépend de votre canton, de votre commune et de votre situation'],
    method:['Réduction d’impôt = versement annuel × taux marginal.','Capital = somme des versements capitalisés chaque année au rendement net supposé (versement en fin d’année).','Gain de placement = capital − total versé.'],
    next:[{t:'Comparer 3a bancaire et 3a en assurance',h:'/guides/3a-banque-vs-assurance/'}],
    sim:{capital:Math.round(cap),verse:o.v*o.d,economie_annuelle:Math.round(eco)}}}},
 'lpp':{title:'Simulateur rachat LPP',sujet:'lpp',
  steps:[
   {title:'Votre profil',why:'L’âge actuel et l’âge de retraite fixent le nombre d’années pendant lesquelles votre avoir est capitalisé et bonifié.',
    fields:[{k:'age',l:'Âge actuel',kind:'int',unit:'ans',v:45,min:18,max:70},{k:'ret',l:'Âge de la retraite',kind:'int',unit:'ans',v:65,min:58,max:75}]},
   {title:'Votre caisse de pension',why:'Ces montants figurent sur votre certificat de prévoyance. Le salaire sert à calculer les bonifications annuelles dans le minimum légal.',
    fields:[{k:'lpp',l:'Avoir LPP actuel',kind:'chf',v:150000,min:0,max:5000000,hint:'Ligne « avoir de vieillesse » du certificat.'},{k:'sal',l:'Salaire annuel brut',kind:'chf',v:80000,min:0,max:2000000},{k:'conv',l:'Taux de conversion',kind:'pct',v:5,min:3,max:8,hint:'Taux de votre caisse pour votre âge (souvent autour de 5 %).'}]},
   {title:'Le rachat',why:'Le rachat est limité par la lacune de prévoyance indiquée sur votre certificat. Le taux marginal détermine la déduction.',
    fields:[{k:'rach',l:'Rachat envisagé',kind:'chf',v:50000,min:0,max:5000000,hint:'Ne peut pas dépasser la lacune de votre certificat.'},{k:'rg',l:'Rendement de l’avoir par an',kind:'pct',v:1.5,min:-2,max:8},{k:'t',l:'Taux marginal d’impôt estimé',kind:'pct',v:30,min:0,max:60}]}],
  check:function(o){var e=[];if(o.ret<=o.age)e.push({k:'ret',m:'L’âge de la retraite doit être supérieur à votre âge actuel.'});return e},
  calc:function(o){var a=lppFin(o,0),b=lppFin(o,o.rach),eco=o.rach*o.t/100,se=function(r){var x=o.lpp,out=[x],sc=Math.max(0,Math.min(o.sal,LPP_MAX)-26460);for(var g=o.age;g<o.ret;g++){x+=x*o.rg/100+sc*brk(g)+(g===o.age?r:0);out.push(x)}return out};
   var s0=se(0),s1=se(o.rach);
   return{
    main:{label:'Réduction d’impôt estimée sur le rachat',value:fmt(eco,''),unit:'CHF',note:'Rachat de '+fmt(o.rach)+' × taux marginal supposé de '+String(o.t).replace('.',',')+' %. Coût net du rachat : '+fmt(o.rach-eco)+'.'},
    warns:['Un retrait en capital dans les 3 ans suivant un rachat peut remettre en cause la déduction.'],
    details:[['Avoir à '+o.ret+' ans, sans rachat',fmt(a)],['Avoir à '+o.ret+' ans, avec rachat',fmt(b)],['Rente annuelle estimée ('+String(o.conv).replace('.',',')+' %)',fmt(a*o.conv/100)+' → '+fmt(b*o.conv/100)],['Coût net du rachat',fmt(o.rach-eco)]],
    chartTitle:'Évolution de l’avoir',chart:lineC([{n:'Avec rachat',c:COL[0],v:s1},{n:'Sans rachat',c:COL[1],v:s0}],s0.map(function(_,i){return o.age+i}),'Courbes de l’avoir LPP avec et sans rachat, de '+o.age+' à '+o.ret+' ans'),
    assumptions:['Bonifications de vieillesse légales par tranche d’âge (7, 10, 15 et 18 %)','Salaire coordonné : déduction de 26 460 CHF, salaire maximal assuré de '+fmt(LPP_MAX)+' (soit 64 260 CHF coordonnés)','Rendement constant, taux de conversion saisi'],
    limits:['Votre caisse peut prévoir des prestations supérieures au minimum légal : votre certificat prime','Le rachat ne peut pas dépasser la lacune indiquée par la caisse','La déduction dépend de votre revenu imposable et de votre canton'],
    method:['Réduction d’impôt = rachat × taux marginal.','Avoir à la retraite = avoir actuel capitalisé chaque année au rendement saisi, plus la bonification légale (salaire coordonné × taux selon l’âge), plus le rachat la première année.','Rente annuelle estimée = avoir × taux de conversion.'],
    next:[{t:'Comprendre la déduction et l’étalement',h:'/guides/rachat-lpp-deduction-impots/'}],
    sim:{avoir_sans:Math.round(a),avoir_avec:Math.round(b),economie_impot:Math.round(eco)}}}},
 'avs':{title:'Simulateur AVS',sujet:'avs',
  steps:[{title:'Votre carrière',why:'La rente dépend de votre revenu annuel moyen (revalorisé) et du nombre d’années de cotisation. Votre extrait de compte individuel donne ces deux informations.',
    fields:[{k:'E',l:'Revenu annuel moyen',kind:'chf',v:80000,min:0,max:2000000},{k:'n',l:'Années de cotisation',kind:'int',unit:'ans',v:44,min:0,max:44,hint:'44 ans = carrière complète (échelle 44).'}]}],
  calc:function(o){var m=avsR(o.E,o.n),F=avsR(o.E,44);
   var rows=[0,1,2,3,5,10].map(function(k){var r=avsR(o.E,44-k);return'<tr><td>'+k+'</td><td>'+fmt(r)+'</td><td>'+(k?'− '+fmt((F-r)*13):'—')+'</td></tr>'}).join('');
   return{
    main:{label:'Rente mensuelle estimée',value:fmt(m,''),unit:'CHF / mois',note:'Soit '+fmt(m*13)+' par an avec 13 rentes.'},
    warns:m<F?['Lacune de '+(44-Math.min(44,o.n))+' an(s) : − '+fmt((F-m)*13)+' par an, à vie. Certaines lacunes peuvent encore être comblées : vérifiez votre extrait de compte individuel.']:[],
    details:[['Rente annuelle (13 rentes)',fmt(m*13)],['Rente avec carrière complète (44 ans)',fmt(F)]],
    extra:'<h3>Effet des années manquantes</h3><div class="tbl" tabindex="0" role="region" aria-label="Tableau, défilable horizontalement"><table><tr><th>Années manquantes</th><th>Rente / mois</th><th>Perte / an</th></tr>'+rows+'</table></div>',
    chartTitle:'Rente mensuelle selon les lacunes',chart:barsC([0,1,2,3,5,10].map(function(k){return{l:k?'−'+k+' an':'44 ans',v:avsR(o.E,44-k),c:k?COL[1]:COL[0]}}),'Rente mensuelle selon le nombre d’années manquantes'),
    assumptions:['Échelle de rente 44, rente minimale de '+fmt(R0)+' par mois et maximale de '+fmt(2*R0),'13 rentes par an (13e rente AVS versée dès décembre 2026)'],
    limits:['Estimation individuelle : le splitting, les bonifications éducatives et le plafonnement des couples ne sont pas pris en compte','La 13e rente ne s’applique pas à toutes les situations (génération transitoire, rente anticipée ou ajournée)','Les montants sont adaptés périodiquement : vérifiez-les sur ofas.admin.ch'],
    method:['Le revenu annuel moyen est ramené à la tranche de l’échelle 44.','La rente mensuelle est calculée selon les formules de l’échelle entre la rente minimale et maximale.','Si les années de cotisation sont inférieures à 44, la rente est réduite proportionnellement.'],
    next:[{t:'Préparer sa retraite',h:'/retraite/'}],
    sim:{avs_mensuel:m,avs_annuel:m*13}}}},
 'cmu':{title:'Comparateur LAMal / CMU',sujet:'lamal',
  steps:[
   {title:'Votre foyer',why:'La CMU se calcule sur le revenu fiscal de référence du foyer ; la LAMal se paie par personne. Le nombre d’adultes et d’enfants change donc fortement la comparaison.',
    fields:[{k:'rfr',l:'Revenu fiscal de référence du foyer',kind:'eur',v:80000,min:0,max:5000000,hint:'Figure sur votre avis d’imposition français.'},{k:'ad',l:'Adultes à assurer',kind:'int',unit:'',v:2,min:1,max:6},{k:'en',l:'Enfants à assurer',kind:'int',unit:'',v:2,min:0,max:10}]},
   {title:'Primes LAMal',why:'Reprenez les primes mensuelles de vos offres réelles (comparateur officiel priminfo.admin.ch). Les valeurs préremplies sont des exemples.',
    fields:[{k:'pa',l:'Prime LAMal par adulte, par mois',kind:'chf',v:400,min:0,max:2000},{k:'pe',l:'Prime LAMal par enfant, par mois',kind:'chf',v:100,min:0,max:1000}]},
   {title:'Hypothèses',why:'Le taux de change convertit les primes en euros. L’abattement vient des règles françaises : vérifiez-le auprès de l’URSSAF.',
    fields:[{k:'fx',l:'Taux de change (€ pour 1 CHF)',kind:'dec',unit:'€',v:1.07,min:.5,max:2},{k:'ab',l:'Abattement CMU',kind:'eur',v:11775,min:0,max:100000}]}],
  calc:function(o){var cm=Math.max(0,o.rfr-o.ab)*.08,la=(o.ad*o.pa+o.en*o.pe)*12*o.fx,d=cm-la,be=o.ab+la/.08;
   var e=function(n){return fmt(n,'€')};
   var xs=[30,50,70,90,110,130,150].map(function(k){return k*1e3});
   return{
    main:{label:d>0?'LAMal moins chère de':d<0?'CMU moins chère de':'Écart entre les deux options',value:fmt(Math.abs(d),''),unit:'€ / an',note:'Comparaison pour votre foyer, avec les primes saisies.'},
    warns:[],
    details:[['CMU (8 % après abattement)',e(cm)],['LAMal (primes converties en €)',e(la)],['Revenu de référence d’équilibre',e(be)],['Surcoût LAMal par adulte supplémentaire',e(o.pa*12*o.fx)+' / an'],['Surcoût LAMal par enfant supplémentaire',e(o.pe*12*o.fx)+' / an']],
    chartTitle:'Coût selon votre revenu de référence (€)',chart:lineC([{n:'CMU',c:COL[1],v:xs.map(function(r){return Math.max(0,r-o.ab)*.08})},{n:'LAMal',c:COL[0],v:xs.map(function(){return la})}],xs.map(fs),'Coût annuel de la CMU et de la LAMal selon le revenu fiscal de référence'),
    assumptions:['CMU : cotisation de 8 % du revenu fiscal de référence après abattement','LAMal : primes mensuelles saisies, converties au taux de change indiqué','La CMU couvre tout le foyer avec une cotisation unique, la LAMal se paie par personne'],
    limits:['Le droit d’option se prend dans les 3 mois suivant le début d’activité et se révise difficilement','Taux et abattement à vérifier auprès de l’URSSAF ; la CMU se calcule sur les revenus de l’avant-dernière année','Franchise, modèle d’assurance et complémentaires ne sont pas pris en compte ici'],
    method:['Cotisation CMU = 8 % × (revenu fiscal de référence − abattement), jamais négative.','Coût LAMal = (adultes × prime adulte + enfants × prime enfant) × 12 × taux de change.','Revenu d’équilibre = abattement + coût LAMal ÷ 8 %.'],
    next:[{t:'Lire le guide LAMal ou CMU',h:'/guides/frontalier-lamal-ou-cmu/'}],
    sim:{cmu_eur:Math.round(cm),lamal_eur:Math.round(la)}}}},
 'franchise':{title:'Simulateur franchise LAMal',sujet:'lamal',
  steps:[
   {title:'Vos primes',why:'Reprenez les primes annuelles que votre caisse propose pour deux franchises. La franchise haute baisse la prime mais augmente ce que vous payez en cas de soins.',
    fields:[{k:'p1',l:'Prime annuelle, franchise basse',kind:'chf',v:5400,min:0,max:20000},{k:'f1',l:'Franchise basse',kind:'chf',v:300,min:0,max:2500,hint:'Adulte : 300, 500, 1 000, 1 500, 2 000 ou 2 500 CHF.'},{k:'p2',l:'Prime annuelle, franchise haute',kind:'chf',v:4200,min:0,max:20000},{k:'f2',l:'Franchise haute',kind:'chf',v:2500,min:0,max:2500}]},
   {title:'Vos frais de santé',why:'Estimez les frais de santé remboursables d’une année ordinaire (consultations, médicaments, examens). Le graphique montre le résultat pour d’autres niveaux de frais.',
    fields:[{k:'x',l:'Frais de santé annuels attendus',kind:'chf',v:800,min:0,max:200000}]}],
  check:function(o){var e=[];if(o.f2<=o.f1)e.push({k:'f2',m:'La franchise haute doit être supérieure à la franchise basse.'});return e},
  calc:function(o){var a=lamalCost(o.p1,o.f1,o.x),b=lamalCost(o.p2,o.f2,o.x),d=a-b,seuil=null;
   for(var X=0;X<=30000;X+=10){if(lamalCost(o.p1,o.f1,X)<=lamalCost(o.p2,o.f2,X)){seuil=X;break}}
   var xs=[0,500,1000,1500,2000,3000,4000,6000,8000],pts=xs.map(function(x){return[lamalCost(o.p1,o.f1,x),lamalCost(o.p2,o.f2,x)]});
   return{
    main:{label:d>0?'Franchise haute plus avantageuse de':d<0?'Franchise basse plus avantageuse de':'Écart entre les deux franchises',value:fmt(Math.abs(d),''),unit:'CHF / an',note:'Pour '+fmt(o.x)+' de frais de santé dans l’année.'},
    warns:[],
    details:[['Franchise '+fmt(o.f1),fmt(a)],['Franchise '+fmt(o.f2),fmt(b)],['Seuil de bascule',seuil===null?'au-delà de 30 000 CHF':seuil===0?'aucun : la franchise basse l’emporte':'environ '+fmt(seuil)+' de frais'],['Risque maximal, franchise basse',fmt(o.p1+o.f1+700)],['Risque maximal, franchise haute',fmt(o.p2+o.f2+700)]],
    chartTitle:'Coût selon vos frais de santé',chart:lineC([{n:'Franchise basse',c:COL[1],v:pts.map(function(p){return p[0]})},{n:'Franchise haute',c:COL[0],v:pts.map(function(p){return p[1]})}],xs.map(fs),'Coût annuel total pour chaque franchise selon les frais de santé'),
    assumptions:['Coût total = prime + franchise + quote-part de 10 %, plafonnée à 700 CHF par an pour un adulte','En dessous du seuil de bascule, la franchise haute coûte moins cher ; au-dessus, la franchise basse'],
    limits:['Les frais de santé d’une année dépendent de votre état de santé : prévoyez une réserve égale au risque maximal','La contribution aux frais d’hospitalisation (15 CHF par jour) n’est pas incluse'],
    method:['Coût total = prime annuelle + part des frais à votre charge.','Part à votre charge = min(frais ; franchise) + min(10 % × (frais − franchise) ; 700 CHF).','Seuil de bascule = niveau de frais à partir duquel la franchise basse devient moins chère.'],
    next:[{t:'Choisir sa franchise et son modèle',h:'/services/assurance-maladie-lamal-et-complementaires/'}],
    sim:{cout_basse:Math.round(a),cout_haute:Math.round(b)}}}}
};

/* ---------- Rendu des résultats : principal, détails, hypothèses, limites, suite ---------- */
function render(T,r,key){
 var h='<span class="estimate-tag">Estimation indicative</span>';
 h+='<div class="res-main"><span class="lbl">'+r.main.label+'</span><span class="big num">'+r.main.value+(r.main.unit?'<small>'+r.main.unit+'</small>':'')+'</span><p class="note-i">'+r.main.note+'</p></div>';
 (r.warns||[]).forEach(function(w){h+='<p class="msg warn">'+ic('alert')+'<span>'+w+'</span></p>'});
 h+='<h3>Détail</h3><table>'+r.details.map(function(d){return'<tr><td>'+d[0]+'</td><td'+(String(d[1]).length>18?' class="wrap"':'')+'>'+d[1]+'</td></tr>'}).join('')+'</table>';
 if(r.extra)h+=r.extra;
 if(r.chart)h+='<h3>'+r.chartTitle+'</h3>'+r.chart;
 h+='<div class="res-limits"><strong>Hypothèses</strong><ul>'+r.assumptions.map(function(a){return'<li>'+a+'</li>'}).join('')+'</ul><strong>Limites</strong><ul>'+r.limits.map(function(a){return'<li>'+a+'</li>'}).join('')+'</ul></div>';
 h+='<div class="res-next"><button type="button" class="more" data-dialog="sim-method-'+key+'">Comment est calculé ce résultat ?</button>'+(r.next||[]).map(function(n){return'<a class="more" href="'+n.h+'">'+n.t+' '+ic('arrow')+'</a>'}).join('')+'</div>';
 return h;
}
window.CimeSim={tools:Object.keys(TOOLS).reduce(function(m,k){m[k]={calc:function(o){var r=TOOLS[k].calc(o);return{html:render(TOOLS[k],r,k),sim:r.sim,result:r}}};return m},{}),parseNum:parseNum};

/* Panneau « Comment est calculé ce résultat ? » (un par simulateur de la page) */
function ensureMethod(key,method){
 var id='sim-method-'+key,d=document.getElementById(id);
 var list='<h3>Formules</h3><ul>'+method.map(function(m){return'<li>'+m+'</li>'}).join('')+'</ul><p class="cap">Ces formules sont celles du simulateur. Elles donnent un ordre de grandeur : votre situation personnelle peut modifier le résultat.</p>';
 if(!d){d=document.createElement('dialog');d.className='panel';d.id=id;d.setAttribute('aria-labelledby',id+'-t');
  d.innerHTML='<div class="panel-head"><h2 id="'+id+'-t">Comment est calculé ce résultat ?</h2><button type="button" class="btn-icon" data-close aria-label="Fermer">'+ic('close')+'</button></div><div class="panel-body"></div>';document.body.appendChild(d)}
 d.querySelector('.panel-body').innerHTML=list;
}
/* ---------- Interface : étapes, champs, validation ---------- */
function fieldHTML(f,id){
 var hint=f.hint?'<span class="hint" id="'+id+'-h">'+f.hint+'</span>':'';
 var err='<span class="field-err" id="'+id+'-e" hidden>'+ic('alert')+'<span class="t"></span></span>';
 if(f.o)return'<div class="fld"><label for="'+id+'">'+f.l+'</label><select id="'+id+'" data-k="'+f.k+'" aria-describedby="'+(f.hint?id+'-h ':'')+id+'-e">'+f.o.map(function(x){return'<option value="'+x[0]+'"'+(x[0]===f.cur?' selected':'')+'>'+x[1]+'</option>'}).join('')+'</select>'+hint+err+'</div>';
 var unit=f.unit!==undefined?f.unit:({chf:'CHF',eur:'€',pct:'%'}[f.kind]||'');
 return'<div class="fld"><label for="'+id+'">'+f.l+'</label><div class="unit"><input id="'+id+'" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" data-k="'+f.k+'" value="'+fmtIn(f.cur,f.kind)+'" aria-describedby="'+(f.hint?id+'-h ':'')+id+'-e">'+(unit?'<span aria-hidden="true">'+unit+'</span>':'')+'</div>'+hint+err+'</div>';
}
function rangeMsg(f){var u=f.unit!==undefined?f.unit:({chf:'CHF',eur:'€',pct:'%'}[f.kind]||'');var n=function(v){return fmtIn(v,f.kind)};return'Entrez une valeur entre '+n(f.min)+' et '+n(f.max)+(u?' '+u:'')+'.'}
function build(root){
 var key=root.getAttribute('data-tool'),T=TOOLS[key];if(!T)return;
 var qs=new URLSearchParams(location.search),vals={},fields=[];
 T.steps.forEach(function(s){s.fields.forEach(function(f){var q=qs.get(f.k),pv=q!==null&&q!==''?(f.o?q:parseNum(q)):NaN;f.cur=f.o?(q!==null&&q!==''?q:f.v):(isNaN(pv)?f.v:pv);vals[f.k]=f.cur;fields.push(f)})});
 var n=T.steps.length,cur=0,id0='f-'+key;
 var inp=document.createElement('div');inp.className='sim-in';
 inp.innerHTML='<h2>'+T.title+'</h2><ol class="sim-steps" aria-hidden="true">'+T.steps.map(function(_,i){return'<li'+(i===0?' class="on"':'')+'></li>'}).join('')+'</ol>'+
  '<p class="sim-stepl" id="'+id0+'-sl"></p><p class="sim-why" id="'+id0+'-why"></p>'+
  T.steps.map(function(s,i){return'<div class="sim-fields" data-step="'+i+'"'+(i?' hidden':'')+'>'+s.fields.map(function(f){return fieldHTML(f,id0+'-'+f.k)}).join('')+'</div>'}).join('')+
  '<p class="cap mt-s m0">Valeurs d’exemple : remplacez-les par les vôtres.</p>'+
  '<div class="sim-nav"><button type="button" class="btn ghost" data-prev hidden>Retour</button><button type="button" class="btn" data-next'+(n===1?' hidden':'')+'>Continuer</button></div>';
 var out=document.createElement('div');out.className='out';
 var live=document.createElement('p');live.className='vh';live.setAttribute('role','status');
 root.appendChild(inp);root.appendChild(out);root.appendChild(live);
 var prev=$('[data-prev]',inp),next=$('[data-next]',inp);
 function show(i,focus){cur=i;[].forEach.call(inp.querySelectorAll('.sim-fields'),function(d,j){d.hidden=j!==i});
  [].forEach.call(inp.querySelectorAll('.sim-steps li'),function(l,j){l.className=j<=i?'on':''});
  $('#'+id0+'-sl').textContent=n>1?'Étape '+(i+1)+' sur '+n+' · '+T.steps[i].title:T.steps[i].title;$('#'+id0+'-why').textContent=T.steps[i].why;
  prev.hidden=i===0;next.hidden=i===n-1;if(focus){var c=inp.querySelector('[data-step="'+i+'"] input,[data-step="'+i+'"] select');if(c)c.focus()}}
 prev.addEventListener('click',function(){show(cur-1,true)});next.addEventListener('click',function(){show(cur+1,true)});
 inp.addEventListener('keydown',function(e){if(e.key==='Enter'&&e.target.tagName==='INPUT'&&cur<n-1){e.preventDefault();show(cur+1,true)}});
 var started=false;
 function setErr(f,msg){var el=$('#'+id0+'-'+f.k,inp),box=$('#'+id0+'-'+f.k+'-e',inp);if(!el||!box)return;if(msg){box.hidden=false;box.querySelector('.t').textContent=msg;el.setAttribute('aria-invalid','true')}else{box.hidden=true;el.removeAttribute('aria-invalid')}}
 function readAll(){
  var ok=true;
  fields.forEach(function(f){
   var el=$('#'+id0+'-'+f.k,inp);if(f.o){vals[f.k]=el.value;setErr(f,'');return}
   var v=parseNum(el.value),bad=null;
   if(el.value.trim()==='')bad='Renseignez ce champ.';else if(isNaN(v))bad='Saisissez un nombre (exemple : 7 258 ou 2,5).';else if(v<f.min||v>f.max)bad=rangeMsg(f);
   setErr(f,bad);if(bad)ok=false;else vals[f.k]=v});
  if(ok&&T.check){T.check(vals).forEach(function(c){var f=fields.filter(function(x){return x.k===c.k})[0];setErr(f,c.m);ok=false})}
  return ok;
 }
 var lastSig='';
 function run(announce){
  var ok=readAll(),sig=ok?JSON.stringify(vals):'err';
  // aucun nouveau rendu si rien n'a changé : évite de remplacer le bouton sur lequel l'utilisateur vient d'appuyer
  if(sig===lastSig&&out.innerHTML){if(announce&&ok&&state[key])live.textContent='Estimation à jour : '+out.querySelector('.lbl').textContent+' '+out.querySelector('.big').textContent+'.';return}
  lastSig=sig;
  if(!ok){out.className='out empty';out.innerHTML='<p>'+ic('alert')+' Corrigez les champs signalés pour afficher l’estimation.</p>';delete state[key];return}
  var r=T.calc(vals);out.className='out';out.innerHTML=render(T,r,key);ensureMethod(key,r.method);state[key]={inputs:Object.assign({},vals),results:r.sim};
  if(announce)live.textContent='Estimation mise à jour : '+r.main.label+' '+r.main.value+' '+(r.main.unit||'')+'.';
 }
 inp.addEventListener('input',function(e){if(!e.target.getAttribute('data-k'))return;if(!started){started=true;track('simulator_start',{tool:key})}run(false)});
 inp.addEventListener('change',function(e){var el=e.target,k=el.getAttribute('data-k');if(!k)return;
  var f=fields.filter(function(x){return x.k===k})[0];if(f&&!f.o){var v=parseNum(el.value);if(!isNaN(v)&&v>=f.min&&v<=f.max)el.value=fmtIn(v,f.kind)}run(true)});
 show(0,false);run(false);
}
document.querySelectorAll('.sim[data-tool]').forEach(build);

/* ---------- Appel à l'action de fin de simulation ---------- */
var cta=$('#sim-cta');
if(cta){
 var first=document.querySelector('.sim[data-tool]');
 var sujet=(TOOLS[first?first.getAttribute('data-tool'):'']||{}).sujet||'autre';
 var err=function(n){return'<span class="field-err" id="err-'+n+'-etude" hidden>'+ic('alert')+'<span class="t"></span></span>'};
 var fld=function(n,l,t,ac,extra){return'<div class="fld"><label for="etude-'+n+'">'+l+'</label><input id="etude-'+n+'" type="'+t+'" name="'+n+'" autocomplete="'+ac+'" '+(extra||'')+'>'+err(n)+'</div>'};
 cta.innerHTML='<div class="cta-in sim-cta"><h3>Demandez une étude comparative gratuite</h3><p>Nous reprenons votre simulation avec vos documents (certificat de prévoyance, décompte de contrat, prime actuelle) et vous remettons une étude comparative. Gratuit, sans engagement. Les résultats ci-dessus restent indicatifs.</p>'+
 '<form id="etude" class="form" novalidate><input class="hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">'+
 '<div class="row">'+fld('prenom','Prénom','text','given-name','required aria-required="true"')+fld('nom','Nom','text','family-name','required aria-required="true"')+'</div>'+
 fld('email','E-mail','email','email','required aria-required="true"')+
 '<div class="fld"><label class="chk" for="etude-consent"><input id="etude-consent" type="checkbox" name="consent" required aria-required="true"><span>J’accepte que Cime utilise ces informations pour traiter ma demande, conformément à la <a href="/confidentialite/">politique de confidentialité</a> (nLPD).</span></label>'+err('consent')+'</div>'+
 '<div class="acts"><button class="btn" type="submit" data-cta="sim_etude">Demander une étude comparative gratuite</button><a class="btn ghost" id="sim-rdv" href="/rendez-vous/?demande=echange&sujet='+sujet+'&source=simulateur" data-cta="sim_echange">Échanger 15 min avec un spécialiste</a></div><p id="etude-msg" class="msg" role="status"></p></form></div>';
 var form=$('#etude'),L=window.CimeLead;L.watch(form);
 form.addEventListener('submit',function(e){
  e.preventDefault();var msg=$('#etude-msg'),btn=form.querySelector('button[type=submit]');
  if(L.validate(form,{prenom:true,nom:true,email:true,consent:true})){L.status(msg,'err','Certains champs sont à corriger avant l’envoi.');return}
  var d={type:'etude',demande:'etude',prenom:form.prenom.value.trim(),nom:form.nom.value.trim(),email:form.email.value.trim(),consent:'oui',website:form.website.value,source:'simulateur',sujet:sujet,page:location.pathname,simulation:state,ts:new Date().toISOString()};
  btn.disabled=true;btn.setAttribute('aria-busy','true');
  L.send(d,'Demande d’étude Cime').then(function(r){btn.disabled=false;btn.removeAttribute('aria-busy');if(L.report(msg,r,'Merci, votre demande d’étude a été transmise. Nous revenons vers vous.'))form.reset()});
 });
}
})();
