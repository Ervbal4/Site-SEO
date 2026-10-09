/* axe-core (WCAG 2.2 AA) : thèmes clair et sombre, mobile et bureau. Requiert axe-core (npm pack axe-core). */
const {BASE,launch,pages,ok,done}=require('./lib');const fs=require('fs');const path=require('path');
const axeSrc=fs.readFileSync(process.env.AXE||require.resolve('axe-core/axe.min.js'),'utf8');
(async()=>{const b=await launch();const urls=pages();let n=0;
for(const scheme of ['light','dark'])for(const w of [375,1280]){const ctx=await b.newContext({viewport:{width:w,height:900},colorScheme:scheme});
 for(const u of urls){const p=await ctx.newPage();await p.goto(BASE+u,{waitUntil:'networkidle'});await p.addScriptTag({content:axeSrc});
  const r=await p.evaluate(async()=>await axe.run(document,{runOnly:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}));n++;
  ok('axe '+scheme+' '+w+' '+u,r.violations.length===0,r.violations.map(v=>v.id+'×'+v.nodes.length+' '+v.nodes[0].target.join(' ')).join(' ; '));await p.close()}
 await ctx.close()}
await b.close();done('accessibilité ('+n+' analyses)')})();
