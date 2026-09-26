import {Buffer} from "node:buffer";
import {normalizeDomain,tldOf,type ContactInput,type DnsRecord} from "./domain";
import {requiredEnv} from "./env";

const API_BASE="https://www.namesilo.com/api";
const BATCH_BASE="https://www.namesilo.com/apibatch";
const PRICE_CACHE_MS=5*60*1000;

type RawAvailable={
  domain?:string;
  "#text"?:string;
  price?:string|number;
  renew?:string|number;
  premium?:string|number|boolean;
  duration?:string|number;
};

type ReplyBase={
  code?:string|number;
  detail?:string;
  message?:string;
};

export type NameSiloAvailability={
  domain:string;
  available:boolean|null;
  taken:boolean;
  premium:boolean;
  quotedPrice:number|null;
  quotedRenew:number|null;
};

export type NameSiloTldPrice={
  tld:string;
  registration:number;
  renew:number;
  transfer:number;
};

export type NameSiloDomainDetails={
  expirationDate:string|null;
  registrationDate:string|null;
  lifecycleStatus:string;
  eppStatuses:string[];
  nameservers:{hosts:string[]};
  privacyProtection:{level:"high"|"public"}|null;
};

export type NameSiloDnsRecord=DnsRecord&{recordId:string};

let priceCache:{expires:number;items:Map<string,NameSiloTldPrice>}|null=null;

function asArray<T>(value:T|T[]|null|undefined):T[]{
  if(value===null||value===undefined)return [];
  return Array.isArray(value)?value:[value];
}
function flag(value:unknown){
  return value===true||value===1||value==="1"||String(value).toLowerCase()==="true"||String(value).toLowerCase()==="yes";
}
function amount(value:unknown){
  const n=Number(value);
  return Number.isFinite(n)&&n>0?n:null;
}
function itemDomain(item:RawAvailable|string){
  if(typeof item==="string")return item;
  return item.domain||item["#text"]||"";
}
function localPhone(phone:string){
  const local=phone.includes(".")?phone.split(".").at(-1)!:phone;
  return local.replace(/\D/g,"");
}
function successful(reply:ReplyBase,operation:string){
  if(Number(reply.code)!==300)throw new Error(reply.detail||reply.message||`NameSilo rejected ${operation}.`);
}
function contactParams(c:ContactInput){
  return {
    fn:c.firstName,
    ln:c.lastName,
    ad:c.address1,
    cy:c.city,
    st:c.state,
    zp:c.postcode,
    ct:c.country,
    em:c.email,
    ph:localPhone(c.phone),
    cp:c.company||undefined
  };
}

async function namesiloGet<T>(
  base:string,
  operation:string,
  params:Record<string,string|number|boolean|undefined>={}
):Promise<T>{
  const query=new URLSearchParams({
    version:"1",
    type:"json",
    key:requiredEnv("NAMESILO_API_KEY")
  });
  for(const [key,value] of Object.entries(params)){
    if(value!==undefined)query.set(key,String(value));
  }
  const response=await fetch(`${base}/${operation}?${query.toString()}`,{
    method:"GET",
    headers:{Accept:"application/json"},
    cache:"no-store",
    signal:AbortSignal.timeout(15000)
  });
  if(!response.ok)throw new Error(`NameSilo ${operation} request failed (HTTP ${response.status}).`);
  return response.json() as Promise<T>;
}

async function command(
  operation:string,
  params:Record<string,string|number|boolean|undefined>={}
){
  const payload=await namesiloGet<{reply?:ReplyBase&Record<string,unknown>}>(API_BASE,operation,params);
  const reply=payload.reply||{};
  successful(reply,operation);
  return reply;
}

export async function namesiloAvailability(inputs:string[]):Promise<NameSiloAvailability[]>{
  const domains=[...new Set(inputs.map(normalizeDomain))].slice(0,200);
  if(!domains.length)return [];

  const payload=await namesiloGet<{
    reply?:ReplyBase&{
      available?:RawAvailable|RawAvailable[]|string|string[]|{domain?:RawAvailable|RawAvailable[]|string|string[]};
      unavailable?:RawAvailable|RawAvailable[]|string|string[]|{domain?:RawAvailable|RawAvailable[]|string|string[]};
      invalid?:RawAvailable|RawAvailable[]|string|string[];
    }
  }>(BATCH_BASE,"checkRegisterAvailability",{domains:domains.join(",")});

  const reply=payload.reply||{};
  successful(reply,"checkRegisterAvailability");

  const map=new Map<string,NameSiloAvailability>();
  const normalizeBucket=(bucket:unknown)=>{
    if(bucket&&typeof bucket==="object"&&!Array.isArray(bucket)&&"domain" in bucket){
      return asArray((bucket as {domain?:RawAvailable|RawAvailable[]|string|string[]}).domain);
    }
    return asArray(bucket as RawAvailable|RawAvailable[]|string|string[]);
  };

  for(const item of normalizeBucket(reply.available)){
    const raw=typeof item==="string"?{domain:item}:item;
    const name=itemDomain(raw);
    if(!name)continue;
    const domain=normalizeDomain(name);
    map.set(domain,{
      domain,
      available:true,
      taken:false,
      premium:flag(raw.premium),
      quotedPrice:amount(raw.price),
      quotedRenew:amount(raw.renew)
    });
  }
  for(const item of normalizeBucket(reply.unavailable)){
    const raw=typeof item==="string"?{domain:item}:item;
    const name=itemDomain(raw);
    if(!name)continue;
    const domain=normalizeDomain(name);
    map.set(domain,{domain,available:false,taken:true,premium:false,quotedPrice:null,quotedRenew:null});
  }
  for(const domain of domains){
    if(!map.has(domain))map.set(domain,{domain,available:null,taken:false,premium:false,quotedPrice:null,quotedRenew:null});
  }
  return domains.map(domain=>map.get(domain)!);
}

export async function namesiloPrices(force=false):Promise<Map<string,NameSiloTldPrice>>{
  if(!force&&priceCache&&priceCache.expires>Date.now())return priceCache.items;

  const payload=await namesiloGet<{reply?:ReplyBase&Record<string,unknown>}>(BATCH_BASE,"getPrices");
  const reply=payload.reply||{};
  successful(reply,"getPrices");

  const items=new Map<string,NameSiloTldPrice>();
  for(const [rawTld,value] of Object.entries(reply)){
    if(rawTld==="code"||rawTld==="detail"||rawTld==="message"||!value||typeof value!=="object")continue;
    const row=value as {registration?:unknown;renew?:unknown;transfer?:unknown};
    const registration=amount(row.registration),renew=amount(row.renew),transfer=amount(row.transfer);
    if(registration===null||renew===null||transfer===null)continue;
    const tld=rawTld.replace(/^\./,"").toLowerCase();
    items.set(tld,{tld,registration,renew,transfer});
  }
  priceCache={expires:Date.now()+PRICE_CACHE_MS,items};
  return items;
}

export async function namesiloStandardCost(domain:string,kind:"register"|"renew"|"transfer"){
  const item=(await namesiloPrices()).get(tldOf(domain));
  if(!item)throw new Error("This extension is not currently offered by NameSilo.");
  return kind==="register"?item.registration:kind==="renew"?item.renew:item.transfer;
}

export async function namesiloRegisterDomain(input:{
  domain:string;
  years:number;
  contact:ContactInput;
}){
  const domain=normalizeDomain(input.domain);
  const years=Math.max(1,Math.min(10,Math.trunc(input.years||1)));
  const reply=await command("registerDomain",{
    domain,
    years,
    payment_id:requiredEnv("NAMESILO_PAYMENT_ID"),
    private:1,
    auto_renew:0,
    ...contactParams(input.contact)
  });
  return {domain:normalizeDomain(String(reply.domain||domain)),orderAmount:amount(reply.order_amount)};
}

export async function namesiloTransferDomain(input:{
  domain:string;
  authCode:string;
  contact:ContactInput;
}){
  const domain=normalizeDomain(input.domain);
  const auth="base64:"+Buffer.from(input.authCode,"utf8").toString("base64");
  const reply=await command("transferDomain",{
    domain,
    payment_id:requiredEnv("NAMESILO_PAYMENT_ID"),
    auth,
    private:1,
    auto_renew:0,
    ...contactParams(input.contact)
  });
  return {domain,orderAmount:amount(reply.order_amount)};
}

export async function namesiloRenewDomain(input:{domain:string;years:number}){
  const domain=normalizeDomain(input.domain);
  const years=Math.max(1,Math.min(10,Math.trunc(input.years||1)));
  const reply=await command("renewDomain",{
    domain,
    years,
    payment_id:requiredEnv("NAMESILO_PAYMENT_ID")
  });
  return {domain,orderAmount:amount(reply.order_amount)};
}

export async function namesiloTransferStatus(input:string){
  const domain=normalizeDomain(input);
  const reply=await command("checkTransferStatus",{domain});
  return {
    status:String(reply.status||"").trim(),
    message:String(reply.message||"").trim(),
    date:String(reply.date||"").trim()
  };
}

export async function namesiloDomainDetails(input:string):Promise<NameSiloDomainDetails>{
  const domain=normalizeDomain(input);
  const reply=await command("getDomainInfo",{domain});

  const rawNameservers=reply.nameservers;
  let hosts:string[]=[];
  if(Array.isArray(rawNameservers)){
    hosts=rawNameservers.map(String);
  }else if(rawNameservers&&typeof rawNameservers==="object"){
    const candidate=(rawNameservers as Record<string,unknown>).nameserver;
    hosts=asArray(candidate as string|string[]).map(String);
  }else if(typeof rawNameservers==="string"){
    hosts=[rawNameservers];
  }
  hosts=hosts.map(host=>host.trim().toLowerCase()).filter(Boolean);

  const locked=flag(reply.locked??reply.lock);
  const isPrivate=flag(reply.private??reply.privacy);
  const rawStatus=String(reply.status||"active").trim().toLowerCase();
  const lifecycleStatus=rawStatus==="active"?"registered":rawStatus.replace(/\s+/g,"_");

  return {
    expirationDate:String(reply.expires??reply.expiration_date??reply.expirationDate??"")||null,
    registrationDate:String(reply.created??reply.registration_date??reply.registrationDate??"")||null,
    lifecycleStatus,
    eppStatuses:locked?["clientTransferProhibited"]:[],
    nameservers:{hosts},
    privacyProtection:{level:isPrivate?"high":"public"}
  };
}

export async function namesiloSetDomainPrivacy(input:string,enabled:boolean){
  const domain=normalizeDomain(input);
  await command(enabled?"addPrivacy":"removePrivacy",{domain});
  return {enabled};
}

export async function namesiloSetTransferLock(input:string,locked:boolean){
  const domain=normalizeDomain(input);
  await command(locked?"domainLock":"domainUnlock",{domain});
  return {locked};
}

export async function namesiloGetAuthCode(input:string){
  const domain=normalizeDomain(input);
  const reply=await command("retrieveAuthCode",{domain});
  const value=String(reply.auth_code??reply.authCode??reply.authorization_code??"");
  if(!value)throw new Error("NameSilo did not return an authorization code.");
  return value;
}

function relativeHost(host:string,domain:string){
  const value=host.trim().replace(/\.$/,"").toLowerCase();
  if(!value||value===domain)return "@";
  const suffix="."+domain;
  return value.endsWith(suffix)?value.slice(0,-suffix.length):value;
}

export async function namesiloListDnsRecords(input:string):Promise<NameSiloDnsRecord[]>{
  const domain=normalizeDomain(input);
  const reply=await command("dnsListRecords",{domain});
  const rows=asArray(reply.resource_record as Record<string,unknown>|Record<string,unknown>[]);
  const records:NameSiloDnsRecord[]=[];

  for(const row of rows){
    const recordId=String(row.record_id||"");
    const type=String(row.type||"").toUpperCase() as DnsRecord["type"];
    if(!recordId||!["A","AAAA","CNAME","TXT","MX"].includes(type))continue;
    const name=relativeHost(String(row.host||""),domain);
    const ttl=Math.max(60,Number(row.ttl)||3600);
    const value=String(row.value||"");
    const record:NameSiloDnsRecord={recordId,type,name,ttl};
    if(type==="A"||type==="AAAA")record.address=value;
    else if(type==="CNAME")record.cname=value.replace(/\.$/,"").toLowerCase();
    else if(type==="TXT")record.value=value;
    else{
      record.exchange=value.replace(/\.$/,"").toLowerCase();
      record.preference=Number(row.distance)||10;
    }
    records.push(record);
  }
  return records;
}

function recordValue(record:DnsRecord){
  if(record.type==="A"||record.type==="AAAA")return record.address||"";
  if(record.type==="CNAME")return record.cname||"";
  if(record.type==="TXT")return record.value||"";
  return record.exchange||"";
}

export async function namesiloAddDnsRecord(input:string,record:DnsRecord){
  const domain=normalizeDomain(input);
  const reply=await command("dnsAddRecord",{
    domain,
    rrtype:record.type,
    rrhost:record.name==="@"?"":record.name,
    rrvalue:recordValue(record),
    rrdistance:record.type==="MX"?record.preference??10:undefined,
    rrttl:record.ttl
  });
  return String(reply.record_id||"");
}

export async function namesiloDeleteDnsRecord(input:string,recordId:string){
  const domain=normalizeDomain(input);
  if(!recordId)throw new Error("DNS record ID is missing.");
  await command("dnsDeleteRecord",{domain,rrid:recordId});
}

export async function namesiloChangeNameServers(input:string,hosts:string[]){
  const domain=normalizeDomain(input);
  const normalized=[...new Set(hosts.map(normalizeDomain))].slice(0,13);
  if(normalized.length<2)throw new Error("At least two name servers are required.");
  const params:Record<string,string>={domain};
  normalized.forEach((host,index)=>{params["ns"+(index+1)]=host;});
  await command("changeNameServers",params);
}
