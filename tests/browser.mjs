import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const server=spawn(process.execPath,['scripts/preview.mjs'],{stdio:['ignore','pipe','inherit']});
await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:3000');
 await page.getByRole('heading',{name:'Your name. Your space.'}).waitFor();
 await page.getByRole('button',{name:'Menu',exact:true}).click();
 await page.getByRole('heading',{name:'Console Index'}).waitFor();
 await page.getByRole('link',{name:'DNS Management',exact:true}).click();
 await page.getByRole('button',{name:'Main website',exact:true}).click();
 await page.getByLabel('Label',{exact:true}).fill('Origin server');
 await page.getByRole('button',{name:'Save label',exact:true}).click();
 await page.getByRole('button',{name:'Origin server',exact:true}).waitFor();
 await mkdir('test-results',{recursive:true});
 await page.screenshot({path:'test-results/dns-desktop.png',fullPage:true});
 await page.goto('http://127.0.0.1:3000/#signup');
 await page.getByRole('heading',{name:'Create your workspace.'}).waitFor();
 await page.getByLabel('Account type',{exact:true}).selectOption('company');
 assert.equal(await page.locator('#company').evaluate(e=>e.required),true);
 await page.getByLabel('Phone number',{exact:true}).fill('+86.13800138000');
 assert.equal(await page.getByLabel('Phone number',{exact:true}).evaluate(e=>e.checkValidity()),true);
 await page.goto('http://127.0.0.1:3000/#search');
 await page.getByRole('heading',{name:'Your name. Your space.'}).waitFor();
 await page.screenshot({path:'test-results/home-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});
 for(const route of ['search','signup','dns','cart','invoices','transfer','rdap']){
  await page.goto('http://127.0.0.1:3000/#'+route);
  await page.locator('main h1').waitFor();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),route+' has horizontal overflow');
 }
 await page.goto('http://127.0.0.1:3000/#search');
 await page.screenshot({path:'test-results/home-mobile.png',fullPage:true});
 assert.deepEqual(errors,[]);
 console.log('PASS desktop/mobile navigation, private DNS label editing, signup rules, no horizontal overflow, no browser errors');
}finally{await browser.close();server.kill();}
