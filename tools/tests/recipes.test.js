// node tools/tests/recipes.test.js : the coach panel's publish check for recipes.
const fs=require('fs'),assert=require('assert');
const h=fs.readFileSync(__dirname+'/../../web/admin.html','utf8'),i=h.indexOf('function recipeProblem(');
eval(h.slice(i,h.indexOf('\n}\n',i)+2));
const ok={title:'Chicken salad',published:true,kcal:350,protein:30,carbs:12,fat:14,minutes:15,ingredients:['a'],steps:['b']};
assert.strictEqual(recipeProblem(ok),'');
assert(recipeProblem({...ok,title:'test'}));
assert(recipeProblem({...ok,title:'Urap',kcal:0,protein:0,minutes:0}));
assert(recipeProblem({...ok,minutes:0}));
assert(recipeProblem({...ok,ingredients:[]}));
assert(recipeProblem({...ok,kcal:900}),'macros must add up');
assert.strictEqual(recipeProblem({...ok,title:'test',kcal:0,published:false}),'','drafts can be incomplete');
console.log('recipe tests passed');
