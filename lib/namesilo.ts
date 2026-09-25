import {normalizeDomain} from "./domain";
import {requiredEnv} from "./env";

type RawAvailable={
  domain?:string;
  price?:string|number;
  renew?:string|number;
  premium?:string|number|boolean;
  duration?:string|number;
};

export type NameSiloAvailability={
  domain:string;
  available:boolean|null;
  premium:boolean;
  quotedPrice:number|null;
  quotedRenew:number|null;
};

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

export async function namesiloAvailability(inputs:string[]):Promise<NameSiloAvailability[]>{
  const domains=[...new Set(inputs.map(normalizeDomain))].slice(0,200);
  if(!domains.length)return [];

  const params=new URLSearchParams({
    version:"1",
    type:"json",
    key:requiredEnv("NAMESILO_API_KEY"),
    domains:domains.join(",")
  });
  const response=await fetch("https://www.namesilo.com/apibatch/checkRegisterAvailability?"+params.toString(),{
    method:"GET",
    headers:{Accept:"application/json"},
    cache:"no-store",
    signal:AbortSignal.timeout(12000)
  });
  if(!response.ok)throw new Error("NameSilo availability request failed.");

  const payload=await response.json() as {
    reply?:{
      code?:string|number;
      detail?:string;
      available?:RawAvailable|RawAvailable[]|string|string[];
      unavailable?:RawAvailable|RawAvailable[]|string|string[];
      invalid?:RawAvailable|RawAvailable[]|string|string[];
    }
  };
  const reply=payload.reply||{};
  if(Number(reply.code)!==300)throw new Error("NameSilo rejected the availability request.");

  const map=new Map<string,NameSiloAvailability>();
  for(const item of asArray(reply.available as RawAvailable|RawAvailable[]|string|string[])){
    const raw=typeof item==="string"?{domain:item}:item;
    if(!raw?.domain)continue;
    const domain=normalizeDomain(raw.domain);
    map.set(domain,{
      domain,
      available:true,
      premium:flag(raw.premium),
      quotedPrice:amount(raw.price),
      quotedRenew:amount(raw.renew)
    });
  }
  for(const item of asArray(reply.unavailable as RawAvailable|RawAvailable[]|string|string[])){
    const raw=typeof item==="string"?{domain:item}:item;
    if(!raw?.domain)continue;
    const domain=normalizeDomain(raw.domain);
    map.set(domain,{domain,available:false,premium:false,quotedPrice:null,quotedRenew:null});
  }
  for(const domain of domains){
    if(!map.has(domain))map.set(domain,{domain,available:null,premium:false,quotedPrice:null,quotedRenew:null});
  }
  return domains.map(domain=>map.get(domain)!);
}
