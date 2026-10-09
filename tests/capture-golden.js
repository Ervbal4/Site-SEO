/* Capture les résultats des simulateurs : sim (valeurs clés) + tous les nombres affichés. */
const { chromium } = require('playwright');const fs=require('fs');const path=require('path');
const base=process.argv[2]||'http://localhost:8080';const out=process.argv[3]||path.join(__dirname,'golden-simulators.json');
const inputs=JSON.parse(fs.readFileSync(path.join(__dirname,'inputs.json'),'utf8'));
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});const p=await b.newPage();
await p.goto(base+'/outils/simulateur-3e-pilier/',{waitUntil:'networkidle'});
const res=await p.evaluate((inputs)=>{const R={};
 for(const k of Object.keys(inputs)){R[k]=inputs[k].map(o=>{const r=window.CimeSim.tools[k].calc(o);
  const txt=(r.html||'').replace(/<svg[\s\S]*?<\/svg>/g,' ').replace(/<[^>]+>/g,' ').replace(/[  ]/g,' ');
  const nums=(txt.match(/\d[\d’' ]*(?:[.,]\d+)?/g)||[]).map(x=>x.replace(/[’' ]/g,'').replace(',','.')).filter(x=>x!=='');
  return{input:o,sim:r.sim,numbers:nums}})}
 return R},inputs);
fs.writeFileSync(out,JSON.stringify(res,null,1));console.log('capturé',Object.values(res).reduce((a,x)=>a+x.length,0),'cas →',out);await b.close()})();
