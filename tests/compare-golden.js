/* Non-régression des simulateurs : chaque nombre affiché par la version de référence doit figurer dans la version actuelle,
   et les valeurs clés (objet "sim") doivent être identiques. */
const { chromium } = require('playwright');const fs=require('fs');const path=require('path');
const base=process.argv[2]||'http://localhost:8080';
const gold=JSON.parse(fs.readFileSync(path.join(__dirname,'golden-simulators.json'),'utf8'));
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});const p=await b.newPage();
await p.goto(base+'/outils/simulateur-3e-pilier/',{waitUntil:'networkidle'});
const now=await p.evaluate((gold)=>{const R={};for(const k of Object.keys(gold)){R[k]=gold[k].map(c=>{const r=window.CimeSim.tools[k].calc(c.input);
 const txt=(r.html||'').replace(/<svg[\s\S]*?<\/svg>/g,' ').replace(/<[^>]+>/g,' ').replace(/[  ]/g,' ');
 const nums=(txt.match(/\d[\d’' ]*(?:[.,]\d+)?/g)||[]).map(x=>x.replace(/[’' ]/g,'').replace(',','.')).filter(x=>x!=='');
 return{sim:r.sim,numbers:nums}})}return R},gold);
let fails=0,cases=0;
for(const k of Object.keys(gold))gold[k].forEach((c,i)=>{cases++;const n=now[k][i];
 const simOK=JSON.stringify(c.sim)===JSON.stringify(n.sim);
 const missing=c.numbers.filter(x=>!n.numbers.includes(x));
 if(!simOK||missing.length){fails++;console.log('✘',k,JSON.stringify(c.input),simOK?'':'sim différent '+JSON.stringify(n.sim),missing.length?'nombres absents: '+missing.join(','):'')}});
console.log(fails?'ÉCHECS':'OK','—',cases,'cas comparés,',fails,'écart(s)');process.exitCode=fails?1:0;await b.close()})();
