const { MongoMemoryReplSet } = require('mongodb-memory-server');
const {createRequire}=require('node:module');
const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');
const {pathToFileURL}=require('node:url');const srv=createRequire(path.resolve('server/package.json'));
(async()=>{
const dbPath = fs.mkdtempSync(path.join(path.resolve(process.env.QA_TMP || require('node:os').tmpdir()), 'thinkup-admin-db-'));
const repl=await MongoMemoryReplSet.create({instanceOpts:[{dbPath}],replSet:{count:1,storageEngine:'wiredTiger'}});
process.env.MONGODB_URI=repl.getUri();process.env.MONGODB_DB_NAME='Thinkup_admin_api_test_stage';process.env.JWT_SECRET=crypto.randomBytes(48).toString('hex');
const load=f=>import(pathToFileURL(path.resolve('server/src',f)));
const {getMongoDb}=await load('user/db.js');const db=await getMongoDb();
const {generateTOTP}=await load('admin/auth/auth.admin.js');
process.env.CORS_ORIGIN = 'http://127.0.0.1:4287';
const {default:app}=await load('server.js');
const express=srv('express'),wrapper=express();wrapper.use((req,res,next)=>req.path.startsWith('/api/')?app(req,res,next):next());
const dist=path.resolve('admin/dist/staging/browser');wrapper.use(express.static(dist));wrapper.get('/{*path}',(req,res)=>res.sendFile('index.html',{root:dist}));
const port=4287;const base='http://127.0.0.1:'+port;
await new Promise((r,j)=>wrapper.listen(port,'127.0.0.1',r).once('error',j));
try {
const tokens={};for(const role of ['SA','FA','CS','CA']){
const email='stage-'+role.toLowerCase()+'@thinkup.vn',password=crypto.randomBytes(24).toString('hex')+'!Ab';
const secret=Array.from(crypto.randomBytes(24),b=>'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'[b%32]).join('');
await db.collection('admins').insertOne({email,full_name:'Staging '+role,role,status:'ACTIVE',is_active:true,is_2fa_enabled:true,password_hash:await srv('bcryptjs').hash(password,10),two_factor_secret:secret,password_changed_at:new Date()});
const post=async(p,b)=>{const r=await fetch(base+'/api/admin/auth/'+p,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(b)});if(!r.ok)throw Error('auth '+p+' '+r.status+' '+(await r.json()).code);return r.json()};
const ch=await post('login',{email,password});const ok=await post('verify-2fa',{twoFactorToken:ch.twoFactorToken,otp:generateTOTP(secret)});tokens[role]=ok.accessToken;
}
console.log('STAGE_READY '+base+' real login + TOTP SA/CA/CS/FA');
const {spawn}=require('node:child_process');
const run=(file,args,env={})=>new Promise(resolve=>{const c=spawn(process.execPath,[file,...args],{env:{...process.env,...env},stdio:['ignore','pipe','pipe']});let out='';c.stdout.on('data',x=>out+=x);c.stderr.on('data',x=>out+=x);c.on('exit',code=>{console.log(file.split('/').pop(),code,out.split(/\r?\n/).filter(l=>/^(?:# (?:tests|pass|fail|skipped)|not ok|  error:|    .* returned [45][0-9][0-9]|    .*must be denied|QA |UI |NEWMAN )/.test(l)).slice(-15).join(' '));resolve(code)})});

const codes = await Promise.all([
 run('--test',['server/src/admin/test/admin-api-read-contract.integration.test.js'],{MONGODB_DB_NAME:'Thinkup_admin_api_test_contract'}),
 run('--test',['server/src/admin/business/test/payouts.mongo.integration.test.js'],{MONGODB_DB_NAME:'Thinkup_payout_test_stage'}),
 run('--test',['server/src/admin/support/test/faqs.api.mongo.integration.test.js'],{MONGODB_DB_NAME:'Thinkup_admin_api_test_faq'})
]);
if (codes.some(code => code !== 0)) throw Error('Integration suite failed');
const filename=path.resolve('qa/admin-api/check-stage.cjs');
if(fs.existsSync(filename)) await require(filename)({tokens,base});
console.log('STAGE_CHECKS_DONE');
} finally { await repl.stop({doCleanup:true,force:true}); }
process.exit(0)
})().catch(e=>{console.error(e.message);process.exit(1)});