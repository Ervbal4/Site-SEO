/* Formulaires (rendez-vous en 2 étapes, demande d'étude), estimation express, navigation mobile. */
const {BASE,launch,ok,done}=require('./lib');
(async()=>{const b=await launch();
const mk=async(u,vw=1280)=>{const p=await b.newPage({viewport:{width:vw,height:900}});p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));await p.goto(BASE+u,{waitUntil:'networkidle'});return p};
// ---------- RENDEZ-VOUS
let p=await mk('/rendez-vous/?demande=echange&sujet=lamal&profil=frontalier');
ok('RDV : préremplissage depuis l’URL',(await p.inputValue('#rdv-demande'))==='echange'&&(await p.inputValue('#rdv-sujet'))==='lamal'&&(await p.inputValue('#rdv-profil'))==='frontalier');
ok('RDV : étape 1 visible, étape 2 masquée, progression « 1 sur 2 »',await p.isVisible('#rdv-step1')&&!(await p.isVisible('#rdv-step2'))&&/Étape 1 sur 2/.test(await p.innerText('#rdv-progl')));
await p.click('#rdv-next');ok('RDV : étape 2 affichée, focus sur Prénom',await p.isVisible('#rdv-step2')&&await p.evaluate(()=>document.activeElement.name)==='prenom'&&/Étape 2 sur 2/.test(await p.innerText('#rdv-progl')));
await p.click('#rdv-back');ok('RDV : retour à l’étape 1',await p.isVisible('#rdv-step1'));await p.click('#rdv-next');
ok('RDV : autocomplete prénom (given-name) / nom (family-name)',(await p.getAttribute('#rdv-prenom','autocomplete'))==='given-name'&&(await p.getAttribute('#rdv-nom','autocomplete'))==='family-name');
ok('RDV : libellés visibles « Prénom » et « Nom »',(await p.innerText('label[for=rdv-nom]')).trim()==='Nom'&&(await p.innerText('label[for=rdv-prenom]')).trim()==='Prénom');
await p.click('#rdv button[type=submit]');
const inv=await p.$$eval('#rdv [aria-invalid=true]',e=>e.map(x=>x.name));ok('RDV : champs vides → erreurs prénom, nom, téléphone, consentement',['prenom','nom','tel','consent'].every(n=>inv.includes(n))&&!inv.includes('email'),inv.join());
ok('RDV : focus sur le premier champ invalide, erreur liée au champ',await p.evaluate(()=>document.activeElement.name)==='prenom'&&(await p.getAttribute('#rdv-nom','aria-describedby'))==='err-nom-rdv');
ok('RDV : erreur = icône + texte (pas la couleur seule)',await p.$eval('#err-nom-rdv',e=>!!e.querySelector('svg')&&e.innerText.length>5));
await p.focus('#rdv-prenom');let tabbed=[];for(let i=0;i<10;i++){await p.keyboard.press('Tab');tabbed.push(await p.evaluate(()=>document.activeElement.name||document.activeElement.id))}
ok('RDV : champ piège inaccessible au clavier et masqué aux lecteurs d’écran',!tabbed.includes('website')&&await p.$eval('[name=website]',e=>e.getAttribute('aria-hidden')==='true'&&e.tabIndex===-1));
let body=null,hits=0;await p.route('https://hook.test/**',r=>{hits++;body=r.request().postData();r.fulfill({status:200,body:'ok'})});
await p.fill('#rdv-prenom','Anne');await p.fill('#rdv-nom','Dupont');await p.fill('#rdv-tel','0791234567');await p.check('#rdv-consent');await p.click('#rdv button[type=submit]');await p.waitForTimeout(300);
let m=await p.innerText('#rdv-msg');ok('RDV sans canal configuré : aucune fausse confirmation',/pas encore activé/.test(m)&&/pas été transmise/.test(m)&&!/Merci/.test(m)&&hits===0,m);
await p.evaluate(()=>{window.CIME_CONFIG.endpoint='https://hook.test/x'});await p.click('#rdv button[type=submit]');await p.waitForTimeout(500);
ok('RDV webhook : NOM et type de demande dans les données envoyées',body&&/(^|&)nom=Dupont(&|$)/.test(body)&&/prenom=Anne/.test(body)&&/demande=echange/.test(body)&&/sujet=lamal/.test(body),body&&body.slice(0,110));
ok('RDV succès : message « transmise », formulaire réinitialisé, retour étape 1',/transmise/.test(await p.innerText('#rdv-msg'))&&await p.$eval('#rdv-msg',e=>e.classList.contains('ok'))&&(await p.inputValue('#rdv-nom'))===''&&await p.isVisible('#rdv-step1'));
hits=0;await p.click('#rdv-next');await p.fill('#rdv-prenom','Bot');await p.fill('#rdv-nom','Bot');await p.fill('#rdv-tel','0791234567');await p.check('#rdv-consent');await p.evaluate(()=>{document.querySelector('[name=website]').value='spam'});await p.click('#rdv button[type=submit]');await p.waitForTimeout(300);ok('RDV piège rempli : aucune requête envoyée',hits===0);
await p.unroute('https://hook.test/**');await p.route('https://hook.test/**',r=>r.abort());await p.click('#rdv-next');await p.evaluate(()=>{document.querySelector('[name=website]').value=''});await p.fill('#rdv-prenom','Anne');await p.fill('#rdv-nom','D');await p.fill('#rdv-tel','0791234567');await p.check('#rdv-consent');await p.click('#rdv button[type=submit]');await p.waitForTimeout(400);
ok('RDV échec réseau : message d’échec honnête',/n’a pas été transmise/.test(await p.innerText('#rdv-msg'))&&await p.$eval('#rdv-msg',e=>e.classList.contains('err')));
await p.fill('#rdv-email','pas-un-mail');await p.click('#rdv button[type=submit]');ok('RDV : e-mail invalide signalé',(await p.getAttribute('#rdv-email','aria-invalid'))==='true');
ok('RDV : aucune erreur JavaScript',p.errs.length===0,p.errs.join());
const pm=await mk('/rendez-vous/',320);ok('RDV : pas de débordement à 320 px',await pm.evaluate(()=>document.documentElement.scrollWidth<=320));
// ---------- ÉTUDE (simulateur)
p=await mk('/outils/simulateur-3e-pilier/');
await p.click('#etude button[type=submit]');const inv2=await p.$$eval('#etude [aria-invalid=true]',e=>e.map(x=>x.name));ok('Étude : champs vides → prénom, nom, e-mail, consentement',['prenom','nom','email','consent'].every(n=>inv2.includes(n)),inv2.join());
body=null;await p.route('https://hook.test/**',r=>{body=r.request().postData();r.fulfill({status:200,body:'ok'})});await p.evaluate(()=>{window.CIME_CONFIG.endpoint='https://hook.test/e'});
await p.fill('#etude-prenom','Anne');await p.fill('#etude-nom','Dupont');await p.fill('#etude-email','anne@example.org');await p.check('#etude-consent');await p.click('#etude button[type=submit]');await p.waitForTimeout(500);
ok('Étude webhook : NOM et simulation dans les données',body&&/(^|&)nom=Dupont(&|$)/.test(body)&&/simulation=/.test(body)&&/demande=etude/.test(body),body&&body.slice(0,90));
ok('Étude : autocomplete family-name',(await p.getAttribute('#etude-nom','autocomplete'))==='family-name');
// ---------- ESTIMATION EXPRESS
p=await mk('/');
ok('Express : étape 1 visible, étape 2 masquée',await p.isVisible('#xs-s1')&&!(await p.isVisible('#xs-s2')));
ok('Express : aucun libellé de promesse',!/(?<!non )garanti|Bloquer|potentiel d’économie/i.test(await p.innerText('body')));
await p.click('#xs-next');ok('Express : étape 2, mention « Estimation indicative », hypothèses visibles',await p.isVisible('#xs-s2')&&/Estimation indicative/.test(await p.innerText('#xs'))&&await p.isVisible('#xs-assump'));
const v0=+await p.inputValue('#xs-v');await p.focus('#xs-v');await p.keyboard.press('ArrowLeft');ok('Express : flèche = −50 CHF',+await p.inputValue('#xs-v')===v0-50);
await p.keyboard.press('PageDown');ok('Express : PageDown = −500 CHF',+await p.inputValue('#xs-v')===v0-550);
await p.keyboard.press('Home');ok('Express : Début = 0',+await p.inputValue('#xs-v')===0);await p.keyboard.press('End');ok('Express : Fin = plafond 7258',+await p.inputValue('#xs-v')===7258);
ok('Express : aria-valuetext',/francs par an/.test(await p.getAttribute('#xs-v','aria-valuetext')));
await p.click('#xs-back');await p.click('[data-statut=independant]');await p.selectOption('#xs-canton','GE');await p.click('#xs-next');
ok('Express indépendant : max 36288',(await p.getAttribute('#xs-v','max'))==='36288');
const href=await p.getAttribute('#xs-cta','href');ok('Express : demande d’étude préremplie',/demande=etude/.test(href)&&/canton=GE/.test(href)&&/profil=independant/.test(href)&&/versement=20000/.test(href),href);
// ---------- NAVIGATION MOBILE
const pm2=await mk('/',375);
ok('Mobile : aucun lien tel:',(await pm2.$$eval('a[href^="tel:"]',e=>e.length))===0);
ok('Mobile : barre fixe masquée sur le héros',await pm2.$eval('.sticky',e=>e.classList.contains('wait')));
await pm2.evaluate(()=>window.scrollTo({top:1400,behavior:'instant'}));await pm2.waitForTimeout(400);ok('Mobile : barre fixe visible après le héros (1 bouton)',!(await pm2.$eval('.sticky',e=>e.classList.contains('wait')))&&(await pm2.$$eval('.sticky a',e=>e.length))===1);
await pm2.click('#menu summary');ok('Mobile : tiroir ouvert, liens visibles',await pm2.isVisible('#menu nav a[href="/prevoyance/"]')&&await pm2.isVisible('#menu nav .cta'));
await pm2.keyboard.press('Escape');ok('Mobile : Échap ferme le tiroir et rend le focus',!(await pm2.$eval('#menu',e=>e.open))&&await pm2.evaluate(()=>document.activeElement.tagName==='SUMMARY'));
await pm2.click('#menu summary');await pm2.click('#menu nav a[href="/fiscalite/"]');await pm2.waitForURL('**/fiscalite/');ok('Mobile : un lien du tiroir navigue',true);
await b.close();done('formulaires et navigation')})();
