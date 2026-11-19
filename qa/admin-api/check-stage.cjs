module.exports=async ({tokens,base})=>{
const path=require('node:path'),assert=require('node:assert/strict'),fs=require('node:fs');
const newman=require('newman');
const values=Object.entries(tokens).map(([role,value])=>({key:'token'+role,value}));values.push({key:'baseUrl',value:base+'/api'});
const spec=require(path.resolve('qa/admin-api/ThinkUp-Admin.postman_collection.json'));
await new Promise((resolve,reject)=>newman.run({collection:spec,environment:{values},reporters:[],timeoutRequest:15000},(err,summary)=>{
 if(err)return reject(err);console.log('NEWMAN requests',summary.run.stats.requests.total,'assertions',summary.run.stats.assertions.total,'failures',summary.run.failures.map(f=>f.source.name+' '+f.error.name+' '+f.error.message));if(summary.run.failures.length)return reject(Error('Newman assertions failed'));resolve();
}));
const {chromium}=require('playwright-core');
const browser=await chromium.launch({channel:process.env.QA_BROWSER_CHANNEL || 'msedge',headless:true});
try{
const page=await browser.newPage({viewport:{width:1440,height:900}});
await page.addInitScript(token=>{sessionStorage.setItem('access_token',token);sessionStorage.setItem('thinkup_admin_user',JSON.stringify({id:'QA',email:'stage-sa@thinkup.vn',fullName:'QA Admin',role:'admin',accessRole:'SA'}))},tokens.SA);
await page.goto(base+'/support/faq');
const checkedWidths=[];
for (const width of [1920,1440,1366,1280,1100,1024,900,768]) {
  await page.setViewportSize({ width, height: 900 });
  await page.waitForTimeout(80);
  const dimensions=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}));
  assert.ok(dimensions.scrollWidth <= dimensions.clientWidth, `FAQ page overflows at ${width}px: ${JSON.stringify(dimensions)}`);
  checkedWidths.push(width);
}
await page.setViewportSize({width:1440,height:900});
await page.getByRole('button',{name:'Thêm câu hỏi'}).click();
await page.locator('#editor-category').click();
await page.getByRole('option',{name:'Khác',exact:true}).click();
const question='Stage FAQ '+Date.now();
await page.locator('#editor-question').fill(question);await page.locator('#editor-answer').fill('QA persisted answer');
await page.getByRole('button',{name:/Lưu và áp dụng/}).click();
await page.getByText(question,{exact:true}).first().waitFor();
await page.reload();await page.getByText(question,{exact:true}).first().waitFor();
const found=(await (await fetch(base+'/api/admin/support/faqs',{headers:{authorization:'Bearer '+tokens.SA}})).json()).data.items.find(x=>x.question===question);
assert.equal(found.answer,'QA persisted answer');
assert.equal((await fetch(base+'/api/admin/support/faqs/'+found.id,{method:'DELETE',headers:{authorization:'Bearer '+tokens.SA}})).status,200);
await page.reload();await page.getByRole('button',{name:'Thêm câu hỏi'}).waitFor();assert.equal(await page.getByText(question,{exact:true}).count(),0);
console.log('UI FAQ create / reload / API compare / delete PASS; no page overflow at',checkedWidths.join(','));
}finally{await browser.close()}
};
