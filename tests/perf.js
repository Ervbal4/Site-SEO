/* Mesures de laboratoire (Chromium local, sans limitation de réseau) : CLS, LCP, poids des ressources.
   Indicatif : ce ne sont pas des mesures terrain (Core Web Vitals réels). */
const {BASE,launch,ok,done}=require('./lib');
(async()=>{const b=await launch();
for(const [name,w,h] of [['bureau 1440',1440,900],['mobile 390',390,844]]){
 for(const u of ['/','/services/optimisation-3e-pilier-3a-3b/','/outils/simulateur-3e-pilier/','/rendez-vous/']){
  const ctx=await b.newContext({viewport:{width:w,height:h}});const p=await ctx.newPage();let bytes=0,n=0;
  p.on('response',async r=>{try{const l=r.headers()['content-length'];bytes+=l?+l:(await r.body()).length;n++}catch(_){}});
  await p.addInitScript(()=>{window.__cls=0;window.__lcp=0;new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)window.__cls+=e.value}).observe({type:'layout-shift',buffered:true});new PerformanceObserver(l=>{const e=l.getEntries().pop();window.__lcp=e.startTime}).observe({type:'largest-contentful-paint',buffered:true})});
  await p.goto(BASE+u,{waitUntil:'networkidle'});await p.evaluate(()=>window.scrollTo({top:document.body.scrollHeight/2,behavior:'instant'}));await p.waitForTimeout(500);
  const m=await p.evaluate(()=>({cls:window.__cls,lcp:window.__lcp}));
  console.log(name.padEnd(12),u.padEnd(46),'CLS',m.cls.toFixed(3),' LCP',Math.round(m.lcp)+' ms',' ',n,'requêtes',(bytes/1024).toFixed(0)+' Ko');
  ok(name+' '+u+' : CLS < 0,1',m.cls<0.1);await ctx.close()}}
await b.close();done('performance (laboratoire)')})();
