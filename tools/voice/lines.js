// Lists every line the Mind tab speaks and writes web/voice/lines.json ({key,text}) and
// adds new keys to web/voice/manifest.json as null (= waiting to be recorded).
// Run: node tools/voice/lines.js   (after changing any Mind text)
const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..','..');
const html=fs.readFileSync(path.join(root,'web/index.html'),'utf8');
const gate=fs.readFileSync(path.join(root,'web/gate.js'),'utf8');

// Load the voice engine's own text rules (clean/split/key) so keys always match the app.
global.window={};global.document={addEventListener(){},removeEventListener(){}};
global.localStorage={getItem(){return null},setItem(){}};global.fetch=()=>Promise.reject();
eval(gate.slice(gate.indexOf('/* Calm voice guide')));
const V=window.ntVoice;

// Pull a JS array literal out of the app, starting at a marker.
function arr(marker){
  let i=html.indexOf(marker);if(i<0)throw new Error('not found: '+marker);
  i=html.indexOf('[',i);let d=0,j=i,q=null;
  for(;j<html.length;j++){const c=html[j];
    if(q){if(c==='\\'){j++;continue}if(c===q)q=null;continue}
    if(c==='"'||c==="'"||c==='`'){q=c;continue}
    if(c==='[')d++;else if(c===']'&&--d===0)break}
  return eval('('+html.slice(i,j+1)+')');
}
const relax=arr('oo=["Make yourself'),nlp=arr('io=[{id:"swish"'),points=arr('Tt=[{p:"Karate'),morning=arr('ca=["I love'),night=arr('pa=["I am getting');
const panic=arr('function v(){const r='),colours=arr('function y(){const r='),eft=arr('function l(){const r='),medit=arr('function s(){const r=');

const L=[];const add=(...x)=>x.flat().forEach(t=>L.push(t));
// voice switch
add("Voice guide on. I'll talk you through each technique.");
// breathing cues + intros
add(Object.values(V.CUES));
add(["Let's do box breathing together.","In for four... hold for four... out for four... and hold for four.","Just follow my voice."],
 ["Let's do four seven eight breathing.","Breathe in through your nose for four... hold softly for seven... and let a slow breath out for eight."],
 ["Let's do the physiological sigh. It's the fastest reset there is.","Breathe in... take a little top-up sip... then a long, slow breath out."]);
// meditation
add(medit,"Beautifully done.",[2,5,10].map(c=>"That's "+c+" minutes you gave back to yourself."));
// guided relaxation + rituals
add(relax,morning,night);
// anxiety
add("You're safe.","This feeling is a wave. It rises... it peaks... and it always passes.","Let's slow your breathing down together. Breathe in... take a little top-up sip... then a long, slow breath out.");
// panic grounding
add("You did it. You're here.","The wave is passing. Sit for a minute, breathe slowly, and be gentle with yourself.","Panic is exhausting, and you just handled it brilliantly.",
 "You are safe.","Your body has hit a false alarm, and we're going to switch it off by bringing you back to now.","Slow breaths out as you go. Take your time.","Well done.","Tap the button each time you find one.","Good. Just one more.");
panic.forEach(F=>{add("Find "+F.n+" "+F.label.toLowerCase()+".",F.hint);for(let g=1;g<F.n;g++){const l=F.n-g;if(l>1)add("Good. "+l+" more.")}});
// colour breathing
add("Soften your gaze on the circle.","Breathe in the colour.","And breathe it out, through your body.");colours.forEach(x=>add(x.n+".",x.b));
// EFT
add("Start with the karate chop point, on the side of your hand.","Tap it continuously, and say this out loud with me.","Again.","One more time.","Tap gently, and say...",
 "Round complete.","Take a deep breath.","How strong is the feeling now, from zero to ten? If it's still above a three or four, go again. Most people need two or three rounds.");
eft.forEach(x=>add(x.setup,x.reminder+"."));points.forEach(t=>add(t.p.replace(/\(.*?\)/g,"").trim()+"."));
// NLP
nlp.forEach(t=>add(t.name+".",t.steps));
// Belief Builder (the user's own belief is personal, so it is not recorded)
add(["Your thoughts are not facts.","Old beliefs, like I can't do it, were learned. So they can be unlearned.","Which thought sounds like you? Pick the one that feels most true right now, or write your own."],
 ["Where do you think it came from?","A belief is just a thought you've thought many times. It was learned, not born with you, which means it can change."],
 ["Let's question it.","One. When has this not been true, even once?","Two. What would you say to your best friend if she said this?","Three. What has believing this cost you?"],
 ["Your new belief.","Make it something you can believe today. A step forward, rather than a giant leap.","Edit the words so they feel like yours."],
 ["Make it stick.","Every morning, it joins your mirror ritual. Say it out loud, looking into your eyes.","Every day, add one piece of proof. Small proof counts... a glass of water, a walk, a kind word to yourself.","When the old thought comes back, notice it, say that's an old thought, and repeat your new belief.","Your new belief is..."]);

const out=new Map();V._parts(L,0).forEach(p=>{if(!out.has(p.k))out.set(p.k,p.t)});
const dir=path.join(root,'web/voice');fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(path.join(dir,'lines.json'),JSON.stringify([...out].map(([key,text])=>({key,text})),null,1)+'\n');
const mp=path.join(dir,'manifest.json');let m={};try{m=JSON.parse(fs.readFileSync(mp,'utf8'))}catch(e){}
for(const k of out.keys())if(!(k in m))m[k]=null;
for(const k of Object.keys(m))if(!out.has(k))delete m[k];
fs.writeFileSync(mp,JSON.stringify(m,null,1)+'\n');
const done=Object.values(m).filter(Boolean).length;
console.log(out.size+' lines, '+done+' recorded, '+(out.size-done)+' to go, '+[...out.values()].join(' ').length+' characters');
