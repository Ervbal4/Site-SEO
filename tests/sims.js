/* Simulateurs, côté interface : saisie CHF, erreurs, étapes, résultats, panneau de méthode, mobile. */
const {BASE,launch,ok,done}=require('./lib');
(async()=>{const b=await launch();
const mk=async(u,vw=1280)=>{const p=await b.newPage({viewport:{width:vw,height:900}});p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));await p.goto(BASE+u,{waitUntil:'networkidle'});return p};
const out=async p=>(await p.innerText('.out')).replace(/\s+/g,' ');
const setv=async(p,k,v)=>{await p.fill(`[data-k=${k}]`,String(v));};
const fld=(t,k)=>`#f-${t}-${k}`;
// ----- 3a
let p=await mk('/outils/simulateur-3e-pilier/');
let o=await out(p);
ok('3a : hiérarchie résultat principal / détail / hypothèses / limites',/Estimation indicative/.test(o)&&/Réduction d’impôt estimée, par an 1’815/.test(o)&&/Détail/.test(o)&&/Hypothèses/.test(o)&&/Limites/.test(o)&&/Comment est calculé/.test(o),o.slice(0,120));
ok('3a : champs d’une seule étape visibles, progression « Étape 1 sur 2 »',await p.isVisible(fld('3a','t'))&&!(await p.isVisible(fld('3a','v')))&&/Étape 1 sur 2/.test(await p.innerText('.sim-stepl')));
await p.click('[data-next]');ok('3a : étape 2 (versement) affichée avec explication',await p.isVisible(fld('3a','v'))&&/plafond/i.test(await p.innerText('.sim-why')));
for(const v of ["7'258","7 258","7’258","7258"]){await setv(p,'v',v);ok('3a : saisie « '+v+' » acceptée',!(await p.getAttribute(fld('3a','v'),'aria-invalid'))&&/1’815/.test(await out(p)))}
await p.fill(fld('3a','v'),'7258');await p.press(fld('3a','v'),'Tab');ok('3a : formatage CHF à la sortie du champ (7’258)',(await p.inputValue(fld('3a','v')))==='7’258');
await setv(p,'r','2,5');ok('3a : virgule décimale acceptée (2,5 %)',!(await p.getAttribute(fld('3a','r'),'aria-invalid')));await setv(p,'r','2');
await setv(p,'v','abc');ok('3a : saisie non numérique → erreur + état « corrigez »',(await p.getAttribute(fld('3a','v'),'aria-invalid'))==='true'&&/Saisissez un nombre/.test(await p.innerText(fld('3a','v')+'-e'))&&/Corrigez les champs/.test(await out(p)));
await setv(p,'v','');ok('3a : champ vide → « Renseignez ce champ »',/Renseignez/.test(await p.innerText(fld('3a','v')+'-e')));
await setv(p,'v','-5');ok('3a : montant négatif refusé',(await p.getAttribute(fld('3a','v'),'aria-invalid'))==='true');
await setv(p,'v','8000');o=await out(p);ok('3a : dépassement du plafond salarié signalé (7’258)',/dépasse le plafond annuel de 7’258 CHF/.test(o));
await p.click('[data-prev]');await p.selectOption(fld('3a','statut'),'independant');await p.click('[data-next]');await setv(p,'v','36288');ok('3a indépendant : 36’288 sans fausse alerte',!/dépasse le plafond/.test(await out(p)));
ok('3a : graphique avec alternative textuelle',await p.$eval('.out svg[role=img]',e=>/Courbe/.test(e.getAttribute('aria-label'))));
await p.click('.out [data-dialog]');ok('3a : panneau « Comment est calculé » ouvert (modale)',await p.$eval('#sim-method-3a',d=>d.open));
await p.keyboard.press('Escape');ok('3a : Échap ferme le panneau',!(await p.$eval('#sim-method-3a',d=>d.open)));
ok('3a : aucune erreur JavaScript',p.errs.length===0,p.errs.join());
// ----- LPP
p=await mk('/outils/simulateur-rachat-lpp/');
ok('LPP : 3 étapes',/Étape 1 sur 3/.test(await p.innerText('.sim-stepl')));
await p.fill(fld('lpp','ret'),'40');ok('LPP : âge de retraite ≤ âge actuel refusé',(await p.getAttribute(fld('lpp','ret'),'aria-invalid'))==='true'&&/Corrigez/.test(await out(p)));
await p.fill(fld('lpp','ret'),'65');await p.click('[data-next]');await p.click('[data-next]');await p.fill(fld('lpp','rach'),'20000');await p.fill(fld('lpp','t'),'30');
o=await out(p);ok('LPP : économie d’impôt 6’000 sur un rachat de 20’000 (30 %)',/estimée sur le rachat 6’000/.test(o));
// ----- AVS
p=await mk('/outils/simulateur-avs/');
o=await out(p);ok('AVS : rente mensuelle principale + annuelle (13 rentes)',/Rente mensuelle estimée 2’379/.test(o)&&/30’927/.test(o));
await p.fill(fld('avs','n'),'50');ok('AVS : plus de 44 années refusé',(await p.getAttribute(fld('avs','n'),'aria-invalid'))==='true');
await p.fill(fld('avs','n'),'22');await p.fill(fld('avs','E'),'95000');ok('AVS : 22 ans → moitié de la rente maximale (1’260)',/Rente mensuelle estimée 1’260/.test(await out(p)));
ok('AVS : limites mentionnent la 13e rente',/13e rente/.test(await out(p)));
// ----- CMU & franchise
p=await mk('/outils/simulateur-lamal-cmu/');
const outs=await p.$$('.out');ok('LAMal/CMU : deux simulateurs',outs.length===2);
const t0=(await outs[0].innerText()).replace(/\s+/g,' ');ok('CMU : écart, surcoût par adulte et par enfant',/moins chère de/.test(t0)&&/Surcoût LAMal par adulte/.test(t0)&&/par enfant/.test(t0));
const t1=(await outs[1].innerText()).replace(/\s+/g,' ');ok('Franchise : seuil de bascule et risque maximal',/Seuil de bascule environ 1’640/.test(t1)&&/Risque maximal/.test(t1),t1.slice(0,160));
await p.fill('#f-franchise-f2','200');ok('Franchise : haute ≤ basse refusée',(await p.getAttribute('#f-franchise-f2','aria-invalid'))==='true');
// ----- MOBILE 320
for(const u of ['/outils/simulateur-3e-pilier/','/outils/simulateur-rachat-lpp/','/outils/simulateur-avs/','/outils/simulateur-lamal-cmu/']){
 const pm=await mk(u,320);const w=await pm.evaluate(()=>[document.documentElement.scrollWidth,document.documentElement.clientWidth]);
 const tw=await pm.evaluate(()=>[...document.querySelectorAll('.out td')].filter(td=>td.getBoundingClientRect().right>document.documentElement.clientWidth+1).length);
 ok('Mobile 320 : '+u+' sans débordement',w[0]<=w[1]&&tw===0,w.join('/')+' cellules débordantes '+tw);
 if(u.includes('3e-pilier')){await pm.click('.out [data-dialog]');const r=await pm.$eval('#sim-method-3a',d=>{const b=d.getBoundingClientRect();return[d.open,Math.round(b.width),Math.round(b.bottom)]});ok('Mobile 320 : panneau en feuille du bas',r[0]&&r[1]<=320,r.join())}}
await b.close();done('simulateurs (interface)')})();
