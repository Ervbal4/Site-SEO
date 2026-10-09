const { chromium } = require('playwright');const fs=require('fs');const path=require('path');
const ROOT=path.resolve(__dirname,'..');
exports.BASE=process.env.BASE||'http://localhost:8080';
exports.ROOT=ROOT;
exports.launch=()=>chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
exports.pages=()=>{const x=fs.readFileSync(path.join(ROOT,'sitemap.xml'),'utf8');return [...x.matchAll(/<loc>https:\/\/exemple\.ch([^<]*)<\/loc>/g)].map(m=>m[1])};
let fails=0;exports.ok=(n,c,d)=>{if(!c)fails++;console.log(c?'✔':'✘',n,d===undefined?'':d)};
exports.done=(name)=>{console.log('\n'+name+' — échecs :',fails);process.exitCode=fails?1:0};
