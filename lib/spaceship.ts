import {normalizeDomain,type ContactInput,type DnsRecord} from "./domain";
import {requiredEnv} from "./env";

const BASE="https://spaceship.dev/api/v1";
export type SpaceshipResult<T>={body:T;headers:Headers};

type PremiumPrice={operation?:string;price?:number;currency?:string};
type AvailabilityBody={
  domain:string;
  result?:"available"|"taken";
  premiumPricing?:PremiumPrice[]|null;
};

function normalizeAvailability(body:AvailabilityBody){
  const registerPrice=Array.isArray(body.premiumPricing)
    ?body.premiumPricing.find(item=>(item?.operation==="register"||!item?.operation)&&Number(item?.price)>0)
    :undefined;
  const premium=Boolean(registerPrice);
  return {
    domain:normalizeDomain(body.domain),
    available:body.result==="available"?true:body.result==="taken"?false:null,
    taken:body.result==="taken",
    premium,
    registerPrice:registerPrice?Number(registerPrice.price):null,
    premiumPricing:premium?body.premiumPricing||[]:[]
  };
}

export async function spaceshipRequest<T>(
  method:"GET"|"POST"|"PUT"|"DELETE",path:string,body?:unknown
):Promise<SpaceshipResult<T>>{
  const response=await fetch(BASE+path,{
    method,
    headers:{
      Accept:"application/json","Content-Type":"application/json",
      "X-API-Key":requiredEnv("SPACESHIP_API_KEY"),
      "X-API-Secret":requiredEnv("SPACESHIP_API_SECRET")
    },
    body:body===undefined?undefined:JSON.stringify(body),
    cache:"no-store",redirect:"manual",signal:AbortSignal.timeout(20000)
  });
  if(!response.ok) throw new Error(`Spaceship rejected the request (HTTP ${response.status}).`);
  const text=await response.text();
  return {body:(text?JSON.parse(text):{}) as T,headers:response.headers};
}

export async function domainAvailability(input:string){
  const domain=normalizeDomain(input);
  const {body}=await spaceshipRequest<AvailabilityBody>(
    "GET",`/domains/${encodeURIComponent(domain)}/available`
  );
  return normalizeAvailability({...body,domain:body.domain||domain});
}

export async function domainsAvailability(inputs:string[]){
  const domains=inputs.map(normalizeDomain);
  if(!domains.length)return [];

  const batches:string[][]=[];
  for(let offset=0;offset<domains.length;offset+=20){
    batches.push(domains.slice(offset,offset+20));
  }

  const responses=await Promise.all(batches.map(async batch=>{
    const {body}=await spaceshipRequest<{domains?:AvailabilityBody[]}>(
      "POST","/domains/available",{domains:batch}
    );
    return (body.domains||[]).map(item=>normalizeAvailability(item));
  }));

  return responses.flat();
}

export async function domainDetails(input:string){
  const domain=normalizeDomain(input);
  return (await spaceshipRequest<{
    expirationDate?:string;registrationDate?:string;lifecycleStatus?:string;
    eppStatuses?:string[];nameservers?:{hosts?:string[]};
    privacyProtection?:{contactForm?:boolean;level?:"public"|"high"};
  }>("GET",`/domains/${encodeURIComponent(domain)}`)).body;
}
export async function createContact(c:ContactInput){
  const body:Record<string,string>={
    firstName:c.firstName,lastName:c.lastName,email:c.email,address1:c.address1,
    city:c.city,country:c.country,stateProvince:c.state,postalCode:c.postcode,phone:c.phone
  };
  if(c.company) body.organization=c.company;
  const r=await spaceshipRequest<{contactId?:string}>("PUT","/contacts",body);
  if(!r.body.contactId) throw new Error("Spaceship did not return a contact ID.");
  return r.body.contactId;
}
export async function listDnsRecords(input:string){
  const domain=normalizeDomain(input),items:DnsRecord[]=[];
  let skip=0;
  while(skip<10000){
    const {body}=await spaceshipRequest<{items?:DnsRecord[];total?:number}>(
      "GET",`/dns/records/${encodeURIComponent(domain)}?take=500&skip=${skip}`
    );
    const batch=body.items||[];
    items.push(...batch);skip+=batch.length;
    if(!batch.length||skip>=Number(body.total||0)) break;
  }
  return items;
}
export async function addDnsRecord(input:string,record:DnsRecord){
  const domain=normalizeDomain(input);
  await spaceshipRequest("PUT",`/dns/records/${encodeURIComponent(domain)}`,{force:false,items:[record]});
}
export async function deleteDnsRecord(input:string,record:DnsRecord){
  const domain=normalizeDomain(input);
  const payload={...record} as Partial<DnsRecord>;delete payload.ttl;
  await spaceshipRequest("DELETE",`/dns/records/${encodeURIComponent(domain)}`,payload);
}
export async function setDomainPrivacy(input:string,enabled:boolean){
  const domain=normalizeDomain(input);
  await spaceshipRequest("PUT",`/domains/${encodeURIComponent(domain)}/privacy/preference`,{
    privacyLevel:enabled?"high":"public",
    userConsent:true
  });
  return {enabled};
}

export async function setTransferLock(input:string,isLocked:boolean){
  const domain=normalizeDomain(input);
  await spaceshipRequest("PUT",`/domains/${encodeURIComponent(domain)}/transfer/lock`,{isLocked});
}
export async function getAuthCode(input:string){
  const domain=normalizeDomain(input);
  const {body}=await spaceshipRequest<{authCode?:string}>("GET",`/domains/${encodeURIComponent(domain)}/transfer/auth-code`);
  if(!body.authCode) throw new Error("Spaceship did not return an Auth Code.");
  return body.authCode;
}
