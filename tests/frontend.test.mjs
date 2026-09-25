import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('public/app.js','utf8');
// Exercise actual frontend domain parser, independent of a browser or network.
const parser=source.slice(source.indexOf('function splitDomain('),source.indexOf('\nasync function search('));
const context=vm.createContext({URL,tlds:[{tld:'.com'},{tld:'.net'},{tld:'.co.uk'}],previewPrices:[]});
vm.runInContext(parser,context);
test('longest configured suffix and normalisation',()=>assert.equal(context.splitDomain('EXAMPLE.CO.UK').sld,'example'));
test('bare label defaults to .com',()=>assert.equal(context.splitDomain('rhoizos').domain,'rhoizos.com'));
test('URL and subdomains do not become purchases',()=>{for(const input of ['https://example.com','foo.example.com','a.com/path','a.com?x=1','-bad.com'])assert.throws(()=>context.splitDomain(input));});
test('unsupported suffix rejected',()=>assert.throws(()=>context.splitDomain('example.unknown')));
test('IDN normalized to ASCII',()=>assert.equal(context.splitDomain('bücher.com').domain,'xn--bcher-kva.com'));
