import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';

const server=spawn(process.execPath,['scripts/preview.mjs'],{stdio:['ignore','pipe','inherit']});
await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});

try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));

 await page.goto('http://127.0.0.1:3000');
 await page.getByRole('heading',{name:'你的域名，你的世界。'}).waitFor();

 await page.getByRole('button',{name:'Menu',exact:true}).click();
 await page.getByRole('heading',{name:'Menu',exact:true}).waitFor();
 await page.getByRole('link',{name:'DNS management',exact:true}).click();

 await page.getByRole('button',{name:/Website origin/}).click();
 await page.getByLabel('Note',{exact:true}).fill('Origin server');
 await page.getByRole('button',{name:'Save note',exact:true}).click();
 await page.getByRole('button',{name:/Origin server/}).waitFor();

 await mkdir('test-results',{recursive:true});
 await page.screenshot({path:'test-results/dns-desktop.png',fullPage:true});

 await page.goto('http://127.0.0.1:3000/#signup');
 await page.getByRole('heading',{name:'Create account.'}).waitFor();
 await page.getByLabel('Account type',{exact:true}).selectOption('company');
 assert.equal(await page.locator('#company').evaluate(e=>e.required),true);
 await page.getByLabel('Phone',{exact:true}).fill('+86.13800138000');
 assert.equal(await page.getByLabel('Phone',{exact:true}).evaluate(e=>e.checkValidity()),true);

 await page.goto('http://127.0.0.1:3000/#domains');
 await page.getByRole('heading',{name:'Everything you own.'}).waitFor();
 await page.getByRole('button',{name:'Renew',exact:true}).click();
 await page.getByRole('heading',{name:'Renew example.com'}).waitFor();
 await page.getByRole('button',{name:'Close',exact:true}).click();
 await page.getByRole('button',{name:'Transfer out',exact:true}).click();
 await page.getByRole('heading',{name:'Transfer out example.com'}).waitFor();
 await page.getByRole('button',{name:'Close',exact:true}).click();

 await page.goto('http://127.0.0.1:3000/#search');
 await page.screenshot({path:'test-results/home-desktop.png',fullPage:true});

 await page.setViewportSize({width:390,height:844});
 for(const route of ['search','signup','domains','dns','cart','transfer','rdap','policies']){
  await page.goto('http://127.0.0.1:3000/#'+route);
  await page.locator('main h1').waitFor();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),route+' has horizontal overflow');
 }
 await page.goto('http://127.0.0.1:3000/#search');
 await page.screenshot({path:'test-results/home-mobile.png',fullPage:true});

 assert.deepEqual(errors,[]);
 console.log('PASS Scandinavian redesign, domain actions, DNS notes, signup rules, responsive navigation, no browser errors');
}finally{
 await browser.close();
 server.kill();
}
