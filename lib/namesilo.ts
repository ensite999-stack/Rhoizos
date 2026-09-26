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
  forwarding:{
    enabled:boolean;
    url:string|null;
    type:string|null;
  };
};

export type NameSiloEmailForward={
  email:string;
  forwardsTo:string[];
};

export type NameSiloMarketplaceSale={
  domain:string;
  status:string;
  reserve:number|null;
  buyNow:number|null;
  saleType:string;
  paymentPlanOffered:boolean;
  endDate:string|null;
  timeRemaining:string|null;
  private:boolean;
};

export type NameSiloDnsRecord=DnsRecord&{recordId:string};

let priceCache:{expires:number;items:Map<string,NameSiloTldPrice>}|null=null;
let retailPriceCache:{expires:number;items:Map<string,NameSiloTldPrice>}|null=null;

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
function neutralRegistrarMessage(value:unknown){
  return String(value||"")
    .replace(/namesilo(?:\.com)?/gi,"registrar")
    .replace(/\s+/g," ")
    .trim();
}
function successful(reply:ReplyBase,operation:string){
  if(Number(reply.code)!==300){
    const message=neutralRegistrarMessage(reply.detail||reply.message);
    throw new Error(message||`Registrar rejected ${operation}.`);
  }
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
  if(!response.ok)throw new Error(`Registrar request failed (HTTP ${response.status}).`);
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

async function loadNameSiloPrices(retail:boolean,force=false):Promise<Map<string,NameSiloTldPrice>>{
  const cached=retail?retailPriceCache:priceCache;
  if(!force&&cached&&cached.expires>Date.now())return cached.items;

  const payload=await namesiloGet<{reply?:ReplyBase&Record<string,unknown>}>(
    BATCH_BASE,
    "getPrices",
    retail?{retail_prices:1}:{}
  );
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
  const next={expires:Date.now()+PRICE_CACHE_MS,items};
  if(retail)retailPriceCache=next;else priceCache=next;
  return items;
}

export async function namesiloPrices(force=false){
  return loadNameSiloPrices(false,force);
}

export async function namesiloRetailPrices(force=false){
  return loadNameSiloPrices(true,force);
}

export async function namesiloStandardCost(domain:string,kind:"register"|"renew"|"transfer"){
  const item=(await namesiloPrices()).get(tldOf(domain));
  if(!item)throw new Error("This extension is not currently offered.");
  return kind==="register"?item.registration:kind==="renew"?item.renew:item.transfer;
}

export async function namesiloAccountBalance(){
  const reply=await command("getAccountBalance");
  const balance=Number(reply.balance);
  if(!Number.isFinite(balance)||balance<0)throw new Error("Registrar returned an invalid account-funds balance.");
  return balance;
}

async function paymentParams(cost:number){
  const paymentId=process.env.NAMESILO_PAYMENT_ID?.trim();
  try{
    const balance=await namesiloAccountBalance();
    if(balance+0.0001>=cost)return {payment_id:undefined,paymentSource:"account_funds" as const};
    if(paymentId)return {payment_id:paymentId,paymentSource:"verified_card" as const};
    throw new Error("Registrar account funds are insufficient and no verified card payment method is configured.");
  }catch(error){
    if(error instanceof Error&&error.message.includes("insufficient"))throw error;
    if(paymentId)return {payment_id:paymentId,paymentSource:"verified_card" as const};
    return {payment_id:undefined,paymentSource:"account_funds" as const};
  }
}

export async function namesiloRegisterDomain(input:{
  domain:string;
  years:number;
  contact:ContactInput;
  cost:number;
}){
  const domain=normalizeDomain(input.domain);
  const years=Math.max(1,Math.min(10,Math.trunc(input.years||1)));
  const payment=await paymentParams(input.cost);
  const reply=await command("registerDomain",{
    domain,
    years,
    payment_id:payment.payment_id,
    private:1,
    auto_renew:0,
    ...contactParams(input.contact)
  });
  return {
    domain:normalizeDomain(String(reply.domain||domain)),
    orderAmount:amount(reply.order_amount),
    paymentSource:payment.paymentSource
  };
}

export async function namesiloTransferDomain(input:{
  domain:string;
  authCode:string;
  contact:ContactInput;
  cost:number;
}){
  const domain=normalizeDomain(input.domain);
  const auth="base64:"+Buffer.from(input.authCode,"utf8").toString("base64");
  const payment=await paymentParams(input.cost);
  const reply=await command("transferDomain",{
    domain,
    payment_id:payment.payment_id,
    auth,
    private:1,
    auto_renew:0,
    ...contactParams(input.contact)
  });
  return {domain,orderAmount:amount(reply.order_amount),paymentSource:payment.paymentSource};
}

export async function namesiloRenewDomain(input:{domain:string;years:number;cost:number}){
  const domain=normalizeDomain(input.domain);
  const years=Math.max(1,Math.min(10,Math.trunc(input.years||1)));
  const payment=await paymentParams(input.cost);
  const reply=await command("renewDomain",{
    domain,
    years,
    payment_id:payment.payment_id
  });
  return {domain,orderAmount:amount(reply.order_amount),paymentSource:payment.paymentSource};
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

  const forwardUrl=String(reply.forward_url??reply.forwardUrl??"").trim()||null;
  const trafficType=String(reply.traffic_type??reply.trafficType??"").trim().toLowerCase();
  return {
    expirationDate:String(reply.expires??reply.expiration_date??reply.expirationDate??"")||null,
    registrationDate:String(reply.created??reply.registration_date??reply.registrationDate??"")||null,
    lifecycleStatus,
    eppStatuses:locked?["clientTransferProhibited"]:[],
    nameservers:{hosts},
    privacyProtection:{level:isPrivate?"high":"public"},
    forwarding:{
      enabled:Boolean(forwardUrl)||trafficType==="forwarded",
      url:forwardUrl,
      type:String(reply.forward_type??reply.forwardType??"").trim()||null
    }
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
  if(!value)throw new Error("Registrar did not return an authorization code.");
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


function validEmail(value:string){
  const email=value.trim().toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254){
    throw new Error("Enter a valid forwarding destination.");
  }
  return email;
}

export async function namesiloListEmailForwards(input:string):Promise<NameSiloEmailForward[]>{
  const domain=normalizeDomain(input);
  const reply=await command("listEmailForwards",{domain});
  const raw=reply.addresses;
  let rows:unknown[]=[];
  if(Array.isArray(raw))rows=raw;
  else if(raw&&typeof raw==="object"){
    const obj=raw as Record<string,unknown>;
    rows=asArray((obj.address??obj.email_forward??obj.forward) as unknown);
  }else if(raw)rows=[raw];

  const items:NameSiloEmailForward[]=[];
  for(const value of rows){
    if(!value||typeof value!=="object")continue;
    const row=value as Record<string,unknown>;
    const rawEmail=String(row.email??row.address??"").trim().toLowerCase();
    if(!rawEmail)continue;
    const email=rawEmail.endsWith("@"+domain)?rawEmail.slice(0,-(domain.length+1)):rawEmail;
    const rawTargets=row.forwards_to??row.forwardsTo??row.forward_to??row.forward;
    const forwardsTo=asArray(rawTargets as string|string[])
      .flatMap(item=>String(item).split(","))
      .map(item=>item.trim().toLowerCase())
      .filter(Boolean);
    items.push({email,forwardsTo});
  }
  return items;
}

export async function namesiloConfigureEmailForward(
  input:string,
  aliasInput:string,
  destinations:string[]
){
  const domain=normalizeDomain(input);
  const alias=aliasInput.trim().toLowerCase();
  if(alias!=="*"&&!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}$/.test(alias)){
    throw new Error("Enter a valid email alias or * for catch-all.");
  }
  const forwards=[...new Set(destinations.map(validEmail))];
  if(forwards.length<1||forwards.length>5)throw new Error("Use between 1 and 5 forwarding destinations.");

  const params:Record<string,string>={domain,email:alias,forward1:forwards[0]};
  forwards.slice(1).forEach((email,index)=>{params["forward"+(index+2)]=email;});
  await command("configureEmailForward",params);
}

export async function namesiloDeleteEmailForward(input:string,aliasInput:string){
  const domain=normalizeDomain(input);
  const alias=aliasInput.trim().toLowerCase();
  if(alias!=="*"&&!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}$/.test(alias)){
    throw new Error("Invalid email alias.");
  }
  await command("deleteEmailForward",{domain,email:alias});
}

export async function namesiloSetDomainForward(
  input:string,
  targetInput:string,
  method:"301"|"302"
){
  const domain=normalizeDomain(input);
  const target=new URL(targetInput.trim());
  if(target.protocol!=="http:"&&target.protocol!=="https:")throw new Error("Forwarding URL must use HTTP or HTTPS.");
  if(target.username||target.password)throw new Error("Forwarding URL must not contain credentials.");
  if(!["301","302"].includes(method))throw new Error("Unsupported forwarding method.");

  // NameSilo's current forwarding service documents HTTP forwarding. Keep the
  // target's requested scheme in the address while using the API protocol value.
  const protocol=target.protocol.replace(":","");
  const address=target.host+target.pathname+target.search+target.hash;
  await command("domainForward",{domain,protocol,address,method});
  return {url:target.toString(),method};
}

export async function namesiloDisableDomainForward(input:string){
  const domain=normalizeDomain(input);
  await command("forceDomainTrafficType",{domain,traffic_type:3});
}

function marketplaceNumber(value:unknown){
  const n=Number(value);
  return Number.isFinite(n)&&n>0?n:null;
}

function marketplaceRows(value:unknown):Record<string,unknown>[]{
  if(Array.isArray(value))return value.filter(item=>item&&typeof item==="object") as Record<string,unknown>[];
  if(value&&typeof value==="object"){
    const obj=value as Record<string,unknown>;
    const nested=obj.sale??obj.sales??obj.sale_detail;
    if(Array.isArray(nested))return nested.filter(item=>item&&typeof item==="object") as Record<string,unknown>[];
    if(nested&&typeof nested==="object")return [nested as Record<string,unknown>];
    if("domain" in obj)return [obj];
  }
  return [];
}

export async function namesiloMarketplaceSales():Promise<NameSiloMarketplaceSale[]>{
  const reply=await command("marketplaceActiveSalesOverview");
  const rows=marketplaceRows(reply.sale_details??reply.sales);
  return rows.flatMap(row=>{
    const rawDomain=String(row.domain??"").trim();
    if(!rawDomain)return [];
    let domain:string;
    try{domain=normalizeDomain(rawDomain);}catch{return [];}
    return [{
      domain,
      status:String(row.status??"").trim(),
      reserve:marketplaceNumber(row.reserve),
      buyNow:marketplaceNumber(row.buy_now??row.buyNow),
      saleType:(()=>{
        const raw=String(row.sale_type??row.saleType??"").trim().toLowerCase().replace(/[\s-]+/g,"_");
        if(raw==="auction")return "auction";
        if(raw==="offer_counter_offer"||raw==="offer/counter_offer"||raw==="offer_counteroffer")return "offer_counter_offer";
        return raw;
      })(),
      paymentPlanOffered:flag(row.pay_plan_offered??row.payment_plan_offered),
      endDate:String(row.end_date??"").trim()||null,
      timeRemaining:String(row.time_remaining??"").trim()||null,
      private:flag(row.private)
    }];
  });
}

export async function namesiloMarketplaceSetSale(input:{
  domain:string;
  action:"add"|"modify";
  saleType:"auction"|"offer_counter_offer";
  reserve?:number|null;
  buyNow?:number|null;
  description?:string;
  paymentPlanOffered?:boolean;
}){
  const domain=normalizeDomain(input.domain);
  const money=(value:number|null|undefined,label:string)=>{
    if(value===null||value===undefined)return undefined;
    if(!Number.isFinite(value)||value<=0||value>100000000)throw new Error(`${label} is invalid.`);
    return Math.round(value*100)/100;
  };
  const description=(input.description||"").trim();
  if(description.length>2000)throw new Error("Marketplace description is too long.");

  await command("marketplaceAddOrModifySale",{
    domain,
    action:input.action,
    sale_type:input.saleType,
    reserve:money(input.reserve,"Reserve price"),
    buy_now:money(input.buyNow,"Buy-now price"),
    payment_plan_offered:input.paymentPlanOffered?1:0,
    description:description||undefined,
    use_for_sale_landing_page:0,
    mp_use_our_nameservers:0
  });
}

export async function namesiloMarketplaceCancelSale(
  input:string,
  saleType:"auction"|"offer_counter_offer"
){
  const domain=normalizeDomain(input);
  await command("marketplaceAddOrModifySale",{
    domain,
    action:"modify",
    sale_type:saleType,
    cancel_sale:1
  });
}

export async function namesiloRegisterDomainDrop(input:{
  domain:string;
  years:number;
  private?:boolean;
  autoRenew?:boolean;
}){
  const domain=normalizeDomain(input.domain);
  const years=Math.max(1,Math.min(10,Math.trunc(input.years||1)));
  const payload=await namesiloGet<{reply?:ReplyBase&Record<string,unknown>}>(
    BATCH_BASE,
    "registerDomainDrop",
    {
      domain,
      years,
      private:input.private===false?0:1,
      auto_renew:input.autoRenew?1:0
    }
  );
  const reply=payload.reply||{};
  successful(reply,"registerDomainDrop");
  return {
    domain:normalizeDomain(String(reply.domain||domain)),
    orderAmount:amount(reply.order_amount)
  };
}
