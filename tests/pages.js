/* Toutes les pages du sitemap : SEO, structure, liens, ressources, débordements, console, polices, téléphone. */
const {BASE,ROOT,launch,pages,ok,done}=require('./lib');const fs=require('fs');const path=require('path');
const WIDTHS=[320,375,430,768,1024,1280,1440,1600];
(async()=>{const b=await launch();const urls=pages();const titles={},h1s={},descs={};
console.log(urls.length,'pages');
for(const u of urls){
 const ctx=await b.newContext({viewport:{width:1280,height:900}});const p=await ctx.newPage();const errs=[];
 p.on('pageerror',e=>errs.push('JS '+e.message));p.on('console',m=>{if(m.type()==='error')errs.push('console '+m.text())});
 p.on('response',r=>{if(r.status()>=400)errs.push(r.status()+' '+r.url())});p.on('request',q=>{if(!q.url().startsWith(BASE))errs.push('TIERS '+q.url())});
 const r=await p.goto(BASE+u,{waitUntil:'networkidle'});
 const i=await p.evaluate(()=>({title:document.title,h1:[...document.querySelectorAll('h1')].map(x=>x.textContent.trim()),desc:(document.querySelector('meta[name=description]')||{}).content||'',canon:(document.querySelector('link[rel=canonical]')||{}).href||'',main:!!document.querySelector('main#contenu'),ld:[...document.querySelectorAll('script[type="application/ld+json"]')].map(s=>s.textContent),tels:document.querySelectorAll('a[href^="tel:"]').length,phone:/021 000|0 00 00/.test(document.documentElement.innerHTML),fonts:[...document.fonts].filter(f=>f.status==='loaded').length,alts:[...document.querySelectorAll('img:not([alt])')].length,h2first:!!document.querySelector('h1')&&[...document.querySelectorAll('h1,h2,h3')].findIndex(e=>e.tagName==='H1')===0}));
 let ldok=true;try{i.ld.forEach(t=>JSON.parse(t))}catch(e){ldok=false}
 const tag='['+u+'] ';
 ok(tag+'HTTP 200',r.status()===200);
 ok(tag+'titre, description, canonical',i.title.length>10&&i.desc.length>50&&i.canon==='https://exemple.ch'+u,i.title.length+'c / '+i.desc.length+'c');
 ok(tag+'un seul H1, en premier',i.h1.length===1&&i.h2first);
 ok(tag+'titre et H1 uniques',!titles[i.title]&&!h1s[i.h1[0]]&&!descs[i.desc]);titles[i.title]=1;h1s[i.h1[0]]=1;descs[i.desc]=1;
 ok(tag+'JSON-LD valide',ldok&&i.ld.length>=1);
 ok(tag+'zone principale + lien d’évitement',i.main);
 await p.keyboard.press('Tab');const f1=await p.evaluate(()=>document.activeElement.className);await p.keyboard.press('Enter');
 ok(tag+'lien d’évitement : focus sur le contenu',f1==='skip'&&await p.evaluate(()=>document.activeElement.id==='contenu'));
 ok(tag+'aucun numéro de téléphone ni lien tel:',!i.tels&&!i.phone);
 ok(tag+'polices hébergées chargées, aucune requête tierce, aucune erreur',i.fonts>=2&&errs.length===0,errs.join(' | '));
 // liens internes
 const links=await p.evaluate(()=>[...document.querySelectorAll('a[href^="/"]')].map(a=>a.getAttribute('href')));
 const bad=links.filter(h=>{const pth=h.split('#')[0].split('?')[0];if(pth.startsWith('/assets/'))return !fs.existsSync(path.join(ROOT,pth));const f=path.join(ROOT,pth,pth.endsWith('/')?'index.html':'');return !fs.existsSync(f)});
 ok(tag+'liens internes valides ('+links.length+')',bad.length===0,bad.join(','));
 await ctx.close();
}
// débordement horizontal sur toutes les largeurs
for(const w of WIDTHS){const ctx=await b.newContext({viewport:{width:w,height:900}});let over=[];
 for(const u of urls){const p=await ctx.newPage();await p.goto(BASE+u,{waitUntil:'networkidle'});if(await p.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth))over.push(u);await p.close()}
 ok('Aucun défilement horizontal à '+w+' px',over.length===0,over.join(','));await ctx.close()}
await b.close();done('pages')})();
