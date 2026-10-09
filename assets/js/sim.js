/* Cime — simulateurs pédagogiques (3a, rachat LPP, AVS, LAMal/CMU). Calculs 100 % dans le navigateur. */
(function(){
'use strict';
var C=window.CIME_CONFIG||{};
var $=function(s,r){return(r||document).querySelector(s)};
var fmt=function(n,u){return Math.round(n).toLocaleString('fr-CH').replace(/[  ]/g,'’')+' '+(u||'CHF')};
var fs=function(n){return n>=1e6?(n/1e6).toFixed(1).replace('.',',')+' M':n>=1e3?Math.round(n/1e3)+'k':Math.round(n)+''};
var COL=['#0d8a83','#e8a33d','#d1495b','#5b7fa6'];
var state={};            // résultats de tous les simulateurs de la page (envoyés avec la demande d'étude)
var track=function(e,p){try{window.dataLayer=window.dataLayer||[];window.dataLayer.push(Object.assign({event:e},p||{}))}catch(_){}};

/* ---------- Règles de calcul ---------- */
var R0=C.avsRenteMin||1260;
// Rente AVS mensuelle (échelle 44), selon le revenu annuel moyen E et les années de cotisation n.
function avsR(E,n){var Ee=Math.ceil(E/(1.2*R0)-1e-9)*1.2*R0,r=Ee<=12*R0?R0:Ee<=36*R0?.74*R0+13*Ee/600:Ee<72*R0?1.04*R0+8*Ee/600:2*R0;return Math.round((n>=44?1:Math.max(0,n)/44)*r)}
// Bonifications de vieillesse LPP (minimum légal) par âge.
function brk(a){return a>=55?.18:a>=45?.15:a>=35?.10:a>=25?.07:0}
// Avoir LPP à la retraite : salaire coordonné (déduction 26 460 CHF, salaire maximal assuré 88 200 CHF), rendement constant.
function lppFin(o,rachat){var x=o.lpp,sc=Math.max(0,Math.min(o.sal,88200)-26460);for(var a=o.age;a<o.ret;a++){x+=x*o.rg/100+sc*brk(a)+(a===o.age?rachat:0)}return x}
// Coût annuel LAMal pour des frais de santé X : prime + franchise + quote-part de 10 % (max. 700 CHF).
function lamalCost(prime,fr,X){return prime+Math.min(X,fr)+Math.min(Math.max(0,X-fr)*.1,700)}

/* ---------- Graphiques SVG ---------- */
function lineC(ser,xl){var n=xl.length;if(n<2)return'';var W=460,H=210,p={l:44,r:12,t:12,b:26},mx=Math.max(1,Math.max.apply(null,[].concat.apply([],ser.map(function(s){return s.v}))))*1.08;
 var X=function(i){return p.l+(W-p.l-p.r)*i/(n-1)},Y=function(v){return p.t+(H-p.t-p.b)*(1-v/mx)};
 var gr=[0,.25,.5,.75,1].map(function(k){return'<line x1="'+p.l+'" x2="'+(W-p.r)+'" y1="'+Y(mx*k)+'" y2="'+Y(mx*k)+'" stroke="var(--line)"/><text x="'+(p.l-6)+'" y="'+(Y(mx*k)+4)+'" text-anchor="end" font-size="10" fill="var(--mut)">'+fs(mx*k)+'</text>'}).join('');
 var xs=[0,Math.floor((n-1)/2),n-1].map(function(i){return'<text x="'+X(i)+'" y="'+(H-6)+'" text-anchor="middle" font-size="10" fill="var(--mut)">'+xl[i]+'</text>'}).join('');
 var ls=ser.map(function(s,k){var d=s.v.map(function(v,i){return(i?'L':'M')+X(i).toFixed(1)+' '+Y(v).toFixed(1)}).join('');return(k===0?'<path d="'+d+'L'+X(n-1)+' '+Y(0)+'L'+X(0)+' '+Y(0)+'Z" fill="'+s.c+'" opacity=".12"/>':'')+'<path d="'+d+'" fill="none" stroke="'+s.c+'" stroke-width="2.5"/>'}).join('');
 return'<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Graphique">'+gr+xs+ls+'</svg><div class="lg">'+ser.map(function(s){return'<span><b style="background:'+s.c+'"></b>'+s.n+'</span>'}).join('')+'</div>'}
function barsC(it){var W=460,H=210,mx=Math.max(1,Math.max.apply(null,it.map(function(i){return i.v})))*1.15,bw=(W-40)/it.length;
 return'<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Graphique">'+it.map(function(i,k){var h=(H-60)*i.v/mx,x=20+k*bw+bw*.18,m=x+bw*.32;return'<rect x="'+x+'" y="'+(H-30-h)+'" width="'+bw*.64+'" height="'+h+'" rx="6" fill="'+(i.c||COL[0])+'"/><text x="'+m+'" y="'+(H-34-h)+'" text-anchor="middle" font-size="11" font-weight="600" fill="var(--ink)">'+fs(i.v)+'</text><text x="'+m+'" y="'+(H-12)+'" text-anchor="middle" font-size="10.5" fill="var(--mut)">'+i.l+'</text>'}).join('')+'</svg>'}

/* ---------- Définition des simulateurs ---------- */
var TOOLS={
 '3a':{title:'Simulateur 3e pilier',sujet:'3a',
  fields:[{k:'statut',l:'Votre statut',o:[['salarie','Salarié (avec LPP)'],['independant','Indépendant (sans LPP)']],v:'salarie'},
   {k:'v',l:'Versement annuel (CHF)',v:7258},{k:'d',l:'Durée (années)',v:25},{k:'r',l:'Rendement net supposé (%)',v:2,step:.1},{k:'t',l:'Taux marginal d’impôt estimé (%)',v:25,step:.5}],
  calc:function(o){var pl=(C.plafond3a||{})[o.statut]||(o.statut==='independant'?36288:7258),cap=0,ser=[0],tot=[0];
   for(var i=0;i<o.d;i++){cap=cap*(1+o.r/100)+o.v;ser.push(cap);tot.push(o.v*(i+1))}
   var eco=o.v*o.t/100,gain=cap-o.v*o.d;
   var alt=[['Compte épargne',1],['Assurance',2],['Fonds indiciels',3.6]].map(function(a){var c=0;for(var i=0;i<o.d;i++)c=c*(1+a[1]/100)+o.v;return'<tr><td>'+a[0]+' ('+String(a[1]).replace('.',',')+' %)</td><td><b>'+fmt(c)+'</b></td></tr>'}).join('');
   var h='<h3>Votre simulation</h3><table><tr><td>Total versé</td><td><b>'+fmt(o.v*o.d)+'</b></td></tr><tr><td>Capital estimé</td><td><b>'+fmt(cap)+'</b></td></tr><tr><td>Gain de placement (hypothèse)</td><td><b>'+fmt(gain)+'</b></td></tr><tr><td>Économie d’impôt par an</td><td><b>'+fmt(eco)+'</b></td></tr><tr><td>Économie d’impôt cumulée</td><td><b>'+fmt(eco*o.d)+'</b></td></tr></table>'+
   (o.v>pl?'<p class="note">Attention : votre versement dépasse le plafond annuel de '+fmt(pl)+(o.statut==='independant'?' (20 % du revenu net, au maximum).':'.')+'</p>':'')+
   '<h3 style="margin-top:20px;font-size:1.15rem">Même versement, trois supports</h3><table>'+alt+'</table>'+
   '<h3 style="margin-top:20px;font-size:1.15rem">Évolution du capital</h3>'+lineC([{n:'Capital estimé',c:COL[0],v:ser},{n:'Total versé',c:COL[1],v:tot}],ser.map(function(_,i){return'An '+i}));
   return{html:h,sim:{capital:Math.round(cap),verse:o.v*o.d,economie_annuelle:Math.round(eco)}}}},
 'lpp':{title:'Simulateur rachat LPP',sujet:'lpp',
  fields:[{k:'age',l:'Âge actuel',v:45},{k:'ret',l:'Âge de la retraite',v:65},{k:'lpp',l:'Avoir LPP actuel (CHF)',v:150000},{k:'sal',l:'Salaire annuel brut (CHF)',v:80000},
   {k:'rach',l:'Rachat envisagé (CHF)',v:50000},{k:'rg',l:'Rendement de l’avoir (%)',v:1.5,step:.1},{k:'t',l:'Taux marginal d’impôt estimé (%)',v:30,step:.5},{k:'conv',l:'Taux de conversion (%)',v:5,step:.1}],
  calc:function(o){var a=lppFin(o,0),b=lppFin(o,o.rach),eco=o.rach*o.t/100,se=function(r){var x=o.lpp,out=[x],sc=Math.max(0,Math.min(o.sal,88200)-26460);for(var g=o.age;g<o.ret;g++){x+=x*o.rg/100+sc*brk(g)+(g===o.age?r:0);out.push(x)}return out};
   var s0=se(0),s1=se(o.rach);
   var h='<h3>Avoir LPP à '+o.ret+' ans</h3><table><tr><td>Sans rachat</td><td><b>'+fmt(a)+'</b></td></tr><tr><td>Avec rachat</td><td><b>'+fmt(b)+'</b></td></tr><tr><td>Rente annuelle estimée ('+String(o.conv).replace('.',',')+' %)</td><td><b>'+fmt(a*o.conv/100)+' → '+fmt(b*o.conv/100)+'</b></td></tr><tr><td>Économie d’impôt sur le rachat</td><td><b>'+fmt(eco)+'</b></td></tr><tr><td>Coût net du rachat</td><td><b>'+fmt(o.rach-eco)+'</b></td></tr></table>'+
   '<p class="note">Un retrait en capital dans les 3 ans suivant un rachat peut remettre en cause la déduction. Le montant maximal dépend de la lacune indiquée sur votre certificat.</p>'+
   '<h3 style="margin-top:20px;font-size:1.15rem">Évolution de l’avoir</h3>'+lineC([{n:'Avec rachat',c:COL[0],v:s1},{n:'Sans rachat',c:COL[1],v:s0}],s0.map(function(_,i){return o.age+i}));
   return{html:h,sim:{avoir_sans:Math.round(a),avoir_avec:Math.round(b),economie_impot:Math.round(eco)}}}},
 'avs':{title:'Simulateur AVS',sujet:'avs',
  fields:[{k:'E',l:'Revenu annuel moyen (CHF)',v:80000},{k:'n',l:'Années de cotisation (max. 44)',v:44}],
  calc:function(o){var m=avsR(o.E,o.n),F=avsR(o.E,44);
   var rows=[0,1,2,3,5,10].map(function(k){var r=avsR(o.E,44-k);return'<tr><td>'+k+'</td><td>'+fmt(r)+'</td><td>'+(k?'− '+fmt((F-r)*13):'—')+'</td></tr>'}).join('');
   var h='<h3>Rente estimée</h3><p class="big">'+fmt(m)+' <small class="mut" style="font-size:1rem;font-family:Manrope,sans-serif">/ mois</small></p><p>Avec 13 rentes : <b>'+fmt(m*13)+'</b> par an.</p>'+
   (m<F?'<p class="note">Lacune de '+(44-Math.min(44,o.n))+' an(s) : − '+fmt((F-m)*13)+' par an, à vie. Certaines lacunes peuvent encore être comblées : vérifiez votre extrait de compte individuel.</p>':'')+
   '<div class="tbl"><table><tr><th>Années manquantes</th><th>Rente / mois</th><th>Perte / an</th></tr>'+rows+'</table></div><h3 style="margin-top:20px;font-size:1.15rem">Rente mensuelle selon les lacunes</h3>'+
   barsC([0,1,2,3,5,10].map(function(k){return{l:k?'−'+k+' an':'44 ans',v:avsR(o.E,44-k),c:k?COL[1]:COL[0]}}));
   return{html:h,sim:{avs_mensuel:m,avs_annuel:m*13}}}},
 'cmu':{title:'Comparateur LAMal / CMU',sujet:'lamal',
  fields:[{k:'rfr',l:'Revenu fiscal de référence du foyer (€)',v:80000},{k:'ad',l:'Adultes à assurer',v:2},{k:'en',l:'Enfants à assurer',v:2},{k:'pa',l:'Prime LAMal adulte (CHF / mois)',v:400},{k:'pe',l:'Prime LAMal enfant (CHF / mois)',v:100},{k:'fx',l:'Taux de change (€ pour 1 CHF)',v:1.07,step:.01},{k:'ab',l:'Abattement CMU (€)',v:11775}],
  calc:function(o){var cm=Math.max(0,o.rfr-o.ab)*.08,la=(o.ad*o.pa+o.en*o.pe)*12*o.fx,d=cm-la,be=o.ab+la/.08;
   var e=function(n){return fmt(n,'€')};
   var xs=[30,50,70,90,110,130,150].map(function(k){return k*1e3});
   var h='<h3>Comparaison annuelle</h3><table><tr><td>CMU (8 % après abattement)</td><td><b>'+e(cm)+'</b></td></tr><tr><td>LAMal (primes converties en €)</td><td><b>'+e(la)+'</b></td></tr><tr><td><b>'+(d>0?'LAMal moins chère de':d<0?'CMU moins chère de':'Écart')+'</b></td><td><b>'+e(Math.abs(d))+'</b> / an</td></tr></table>'+
   '<p>Avec ces primes, les deux options s’équilibrent autour d’un revenu fiscal de référence d’environ <b>'+e(be)+'</b>.</p>'+
   '<p class="note">La CMU couvre tout le foyer avec une cotisation unique ; la LAMal se paie par personne. Le droit d’option se prend dans les 3 mois suivant le début d’activité et se révise difficilement. Vérifiez l’abattement et le taux auprès de l’URSSAF.</p>'+
   '<h3 style="margin-top:20px;font-size:1.15rem">Coût selon votre revenu de référence (€)</h3>'+lineC([{n:'CMU',c:COL[1],v:xs.map(function(r){return Math.max(0,r-o.ab)*.08})},{n:'LAMal',c:COL[0],v:xs.map(function(){return la})}],xs.map(fs));
   return{html:h,sim:{cmu_eur:Math.round(cm),lamal_eur:Math.round(la)}}}},
 'franchise':{title:'Simulateur franchise LAMal',sujet:'lamal',
  fields:[{k:'p1',l:'Prime annuelle, franchise basse (CHF)',v:5400},{k:'f1',l:'Franchise basse (CHF)',v:300},{k:'p2',l:'Prime annuelle, franchise haute (CHF)',v:4200},{k:'f2',l:'Franchise haute (CHF)',v:2500},{k:'x',l:'Frais de santé annuels attendus (CHF)',v:800}],
  calc:function(o){var a=lamalCost(o.p1,o.f1,o.x),b=lamalCost(o.p2,o.f2,o.x),d=a-b;
   var xs=[0,500,1000,1500,2000,3000,4000,6000,8000],pts=xs.map(function(x){return[lamalCost(o.p1,o.f1,x),lamalCost(o.p2,o.f2,x)]});
   var h='<h3>Coût annuel total (prime + frais à votre charge)</h3><table><tr><td>Franchise '+fmt(o.f1)+'</td><td><b>'+fmt(a)+'</b></td></tr><tr><td>Franchise '+fmt(o.f2)+'</td><td><b>'+fmt(b)+'</b></td></tr><tr><td><b>'+(d>0?'Franchise haute plus avantageuse de':d<0?'Franchise basse plus avantageuse de':'Écart')+'</b></td><td><b>'+fmt(Math.abs(d))+'</b></td></tr></table>'+
   '<p>Risque maximal : '+fmt(o.p1+o.f1+700)+' (franchise basse) contre '+fmt(o.p2+o.f2+700)+' (franchise haute).</p><h3 style="margin-top:20px;font-size:1.15rem">Coût selon vos frais de santé</h3>'+
   lineC([{n:'Franchise basse',c:COL[1],v:pts.map(function(p){return p[0]})},{n:'Franchise haute',c:COL[0],v:pts.map(function(p){return p[1]})}],xs.map(fs));
   return{html:h,sim:{cout_basse:Math.round(a),cout_haute:Math.round(b)}}}}
};

/* ---------- Rendu ---------- */
function build(root){
 var key=root.getAttribute('data-tool'),T=TOOLS[key];if(!T)return;
 var vals={};T.fields.forEach(function(f){vals[f.k]=f.v});
 var form=document.createElement('div');form.className='card';
 form.innerHTML='<h2 style="font-size:1.5rem">'+T.title+'</h2>'+T.fields.map(function(f){
  return f.o?'<label>'+f.l+'<select data-k="'+f.k+'">'+f.o.map(function(x){return'<option value="'+x[0]+'">'+x[1]+'</option>'}).join('')+'</select></label>'
           :'<label>'+f.l+'<input type="number" inputmode="decimal" data-k="'+f.k+'" value="'+f.v+'" step="'+(f.step||'any')+'"></label>'}).join('');
 var out=document.createElement('div');out.className='card out';out.setAttribute('aria-live','polite');
 root.appendChild(form);root.appendChild(out);
 var started=false;
 function run(){var r=T.calc(vals);out.innerHTML=r.html;state[key]={inputs:Object.assign({},vals),results:r.sim}}
 form.addEventListener('input',function(e){var k=e.target.getAttribute('data-k');if(!k)return;vals[k]=e.target.tagName==='SELECT'?e.target.value:(parseFloat(e.target.value)||0);if(!started){started=true;track('simulator_start',{tool:key})}run()});
 run();
}
document.querySelectorAll('.sim[data-tool]').forEach(build);

/* ---------- Appel à l'action de fin de simulation ---------- */
var cta=$('#sim-cta');
if(cta){
 var sujet=(TOOLS[(document.querySelector('.sim[data-tool]')||{getAttribute:function(){}}).getAttribute('data-tool')]||{}).sujet||'autre';
 cta.innerHTML='<div class="cta-in" style="max-width:none"><h3>Recevez l’étude complète ou parlez-en avec l’équipe</h3><p>Nous reprenons votre simulation, la vérifions avec vos documents (certificat de prévoyance, décompte de contrat, prime actuelle) et vous remettons une analyse comparative. Gratuit, sans engagement.</p>'+
 '<form id="etude" class="form" style="background:transparent;border:0;padding:0;color:var(--ink)"><div class="row"><label style="color:#fff">Prénom<input type="text" name="prenom" required autocomplete="given-name"></label><label style="color:#fff">E-mail<input type="email" name="email" required autocomplete="email"></label></div>'+
 '<label style="font-weight:400;display:flex;gap:10px;font-size:.88rem;color:#dbe7ee"><input type="checkbox" name="consent" required style="margin-top:5px"><span>J’accepte que Cime utilise ces informations pour m’envoyer l’étude, conformément à la <a href="/confidentialite/" style="color:#fff">politique de confidentialité</a> (nLPD).</span></label>'+
 '<div class="acts" style="margin:0"><button class="btn" type="submit" data-cta="sim_etude">Recevoir l’étude complète</button><a class="btn ghost" id="sim-rdv" href="/rendez-vous/?sujet='+sujet+'&source=simulateur" data-cta="sim_rdv">Réserver 15 minutes avec l’équipe</a></div><p id="etude-msg" role="status" style="margin:0"></p></form></div>';
 $('#etude').addEventListener('submit',function(e){
  e.preventDefault();var f=e.target,d={type:'etude',prenom:f.prenom.value.trim(),email:f.email.value.trim(),consent:true,page:location.pathname,simulation:state,ts:new Date().toISOString()},msg=$('#etude-msg');
  track('lead_submit',{source:'simulateur',tool:Object.keys(state).join(',')});
  if(C.endpoint){fetch(C.endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)}).then(function(r){if(!r.ok)throw 0;f.reset();msg.textContent='Merci ! Nous vous envoyons l’étude très prochainement.'}).catch(function(){msg.textContent='Envoi impossible pour le moment. Appelez-nous au 021 000 00 00.'})}
  else{location.href='mailto:'+(C.mailto||'')+'?subject='+encodeURIComponent('Demande d’étude Cime')+'&body='+encodeURIComponent('Prénom : '+d.prenom+'\nE-mail : '+d.email+'\nPage : '+d.page+'\n\nSimulation :\n'+JSON.stringify(state,null,1));msg.textContent='Votre messagerie s’ouvre avec la demande préremplie : il ne reste qu’à l’envoyer.'}
 });
}
})();
