// node tools/tests/nutrition.test.js : checks the shared target rule and meal-plan portion balancing.
const fs=require('fs'),assert=require('assert');
const html=fs.readFileSync(__dirname+'/../../web/index.html','utf8');
const grab=(name)=>{const i=html.indexOf('function '+name+'(');let d=0,j=html.indexOf('{',i);for(;j<html.length;j++){if(html[j]=='{')d++;else if(html[j]=='}'&&--d===0)break}return html.slice(i,j+1)};
eval(['ntBalanceDay','ntBalancePlan','ntDayTotals','ntDayError','ntDayOff'].map(grab).join('\n'));
const fixSrc=html.slice(html.indexOf('async function ntFixPlan('),html.indexOf('\n}\n',html.indexOf('async function ntFixPlan('))+2);eval(fixSrc.replace('async function ntFixPlan','var ntFixPlan=async function'));
const gate=fs.readFileSync(__dirname+'/../../web/gate.js','utf8');
const fill=new Function('lsGet','window',gate.slice(gate.indexOf('window.ntTargetFill='),gate.indexOf('  function fixTarget'))+';return window.ntTargetFill')(()=>'{}',{});
const sum=(m,k)=>m.reduce((a,x)=>a+x[k],0);

// shared target rule fills carbs/fat only when missing, consistent with calories
const t=fill({calories:1728,protein:110});
assert.deepStrictEqual([t.carbs,t.fat],[161,72]);
assert.strictEqual(fill({calories:1728,protein:110,carbs:150,fat:70}).carbs,150);
assert.strictEqual(fill({calories:1600,protein:110},{style:'low carb'}).carbs,73);

// a carb-heavy Friday like the one reported: 205g carbs / 49g fat
const fri=[{s:'B',n:'Oats',k:350,p:20,c:55,f:8},{s:'L',n:'Chicken wrap',k:450,p:30,c:60,f:10},
  {s:'D',n:'Salmon & potatoes',k:520,p:38,c:70,f:12},{s:'S',n:'Yoghurt & nuts',k:280,p:17,c:20,f:19}];
assert.deepStrictEqual([sum(fri,'c'),sum(fri,'f')],[205,49]);
const out=ntBalanceDay(fri,t),tot={k:sum(out,'k'),p:sum(out,'p'),c:sum(out,'c'),f:sum(out,'f')};
console.log('Friday balanced:',tot,'portions',out.map(m=>m.x));
assert(ntDayError(out,t)<ntDayError(fri,t),'balancing gets closer');
assert(ntDayOff(out,t),'carb-heavy day still needs a different selection');
out.forEach(m=>{const f0=fri.find(f=>f.n===m.n);assert(m.x>=.6&&m.x<=1.6);assert.deepStrictEqual(m.o,{k:f0.k,p:f0.p,c:f0.c,f:f0.f})});
// re-balancing is stable (uses the original values, not the scaled ones)
assert.deepStrictEqual(ntBalanceDay(out,t).map(m=>m.x),out.map(m=>m.x));
// no targets -> untouched
assert.strictEqual(ntBalanceDay(fri,{}),fri);
(async()=>{
  const better={m:[{s:'B',n:'Eggs & toast',k:420,p:28,c:30,f:20},{s:'L',n:'Tuna salad',k:450,p:32,c:35,f:20},
    {s:'D',n:'Chicken & rice',k:580,p:35,c:65,f:18},{s:'S',n:'Apple & peanut butter',k:280,p:8,c:30,f:14}]};
  const worse={m:fri};
  let asked=0;const days=[{d:'Fri',m:out},{d:'Sat',m:out}];
  const r=await ntFixPlan(days,t,'',async()=>{asked++;return better},i=>i===1);
  assert.strictEqual(asked,1,'protected day not re-asked');
  const ft=ntDayTotals(r[0].m);console.log('Friday after re-selection:',ft);
  assert(!ntDayOff(r[0].m,t),'fixed day within 15%');assert.strictEqual(r[1],days[1]);
  const r2=await ntFixPlan([{d:'Fri',m:out}],t,'',async()=>worse);assert.strictEqual(r2[0].m,out,'worse answer ignored');
  const r3=await ntFixPlan([{d:'Fri',m:out}],t,'',async()=>{throw new Error('AI down')});assert.strictEqual(r3[0].m,out,'AI failure keeps the day');
  console.log('nutrition tests passed');
})().catch(e=>{console.error(e);process.exit(1)});
