import {NextRequest} from "next/server";
import {normalizeDomain} from "@/lib/domain";
import {fail,ok} from "@/lib/http";

type VCardEntry=[string,Record<string,unknown>,string,unknown];

function text(value:unknown){return typeof value==="string"?value:null;}
function eventDate(events:any[],action:string){
  const item=events?.find(event=>String(event?.eventAction||"").toLowerCase()===action);
  return item?.eventDate||null;
}
function vcard(entity:any){
  const rows=Array.isArray(entity?.vcardArray?.[1])?entity.vcardArray[1] as VCardEntry[]:[];
  const values=(name:string)=>rows.filter(row=>row?.[0]===name).map(row=>row?.[3]).filter(value=>value!==undefined&&value!==null);
  return {
    name:text(values("fn")[0]),
    organization:text(values("org")[0]),
    email:text(values("email")[0]),
    phone:text(values("tel")[0]),
    address:values("adr")[0]||null
  };
}
function entityInfo(entity:any){
  return {
    handle:text(entity?.handle),
    roles:Array.isArray(entity?.roles)?entity.roles.map(String):[],
    publicIds:Array.isArray(entity?.publicIds)?entity.publicIds:[],
    links:Array.isArray(entity?.links)?entity.links.map((link:any)=>({rel:text(link?.rel),href:text(link?.href),title:text(link?.title),type:text(link?.type)})):[],
    ...vcard(entity)
  };
}
function flattenEntities(entities:any[]):ReturnType<typeof entityInfo>[]{
  const out:ReturnType<typeof entityInfo>[]=[];
  const visit=(items:any[])=>{
    for(const entity of items||[]){
      out.push(entityInfo(entity));
      if(Array.isArray(entity?.entities))visit(entity.entities);
    }
  };
  visit(entities||[]);
  return out;
}
async function rdapBase(tld:string){
  const response=await fetch("https://data.iana.org/rdap/dns.json",{
    next:{revalidate:86400},
    signal:AbortSignal.timeout(10000)
  });
  if(!response.ok) throw new Error("RDAP bootstrap lookup failed.");
  const data=await response.json() as {services?:[string[],string[]][]};
  for(const service of data.services||[]){
    if(service[0]?.map(x=>x.toLowerCase()).includes(tld)&&service[1]?.[0]) return service[1][0];
  }
  throw new Error("No RDAP service is published for this domain extension.");
}
async function dnsQuery(domain:string,type:string){
  try{
    const response=await fetch("https://dns.google/resolve?name="+encodeURIComponent(domain)+"&type="+encodeURIComponent(type),{
      headers:{Accept:"application/dns-json"},
      cache:"no-store",
      signal:AbortSignal.timeout(7000)
    });
    if(!response.ok)return [];
    const data=await response.json() as {Answer?:{name?:string;type?:number;TTL?:number;data?:string}[]};
    return (data.Answer||[]).map(answer=>({
      name:String(answer.name||domain).replace(/\.$/,""),
      type,
      ttl:Number(answer.TTL||0),
      value:String(answer.data||"").replace(/\.$/,"")
    }));
  }catch{return [];}
}
function notes(items:any[]){
  return (items||[]).map(item=>({
    title:text(item?.title),
    description:Array.isArray(item?.description)?item.description.map(String):[]
  }));
}

export async function GET(request:NextRequest){
  try{
    const domain=normalizeDomain(request.nextUrl.searchParams.get("domain")||"");
    const tld=domain.split(".").at(-1)!;
    const base=(await rdapBase(tld)).replace(/\/$/,"");
    const response=await fetch(base+"/domain/"+encodeURIComponent(domain),{
      cache:"no-store",
      redirect:"follow",
      signal:AbortSignal.timeout(15000)
    });
    if(!response.ok) throw new Error(`Public Domain lookup failed (HTTP ${response.status}).`);

    const data=await response.json();
    const entities=flattenEntities(data.entities||[]);
    const registrar=entities.find(entity=>entity.roles.includes("registrar"))||null;
    const nameservers=Array.isArray(data.nameservers)?data.nameservers.map((item:any)=>({
      name:String(item?.ldhName||item?.unicodeName||"").toLowerCase(),
      unicodeName:text(item?.unicodeName),
      ipv4:Array.isArray(item?.ipAddresses?.v4)?item.ipAddresses.v4.map(String):[],
      ipv6:Array.isArray(item?.ipAddresses?.v6)?item.ipAddresses.v6.map(String):[]
    })).filter((item:any)=>item.name):[];

    const recordTypes=["A","AAAA","CNAME","MX","TXT","NS","CAA","SOA"];
    const dnsRecords=(await Promise.all(recordTypes.map(type=>dnsQuery(domain,type)))).flat();

    return ok({
      domain:String(data.ldhName||domain).toLowerCase(),
      unicodeName:text(data.unicodeName),
      handle:text(data.handle),
      port43:text(data.port43),
      registrar:registrar?.name||registrar?.organization||null,
      registeredAt:eventDate(data.events||[],"registration"),
      expiresAt:eventDate(data.events||[],"expiration"),
      updatedAt:eventDate(data.events||[],"last changed")||eventDate(data.events||[],"last update of rdap database"),
      statuses:Array.isArray(data.status)?data.status.map(String):[],
      events:Array.isArray(data.events)?data.events.map((event:any)=>({
        action:text(event?.eventAction),
        date:text(event?.eventDate),
        actor:text(event?.eventActor)
      })):[],
      entities,
      nameservers,
      dnssec:{
        delegationSigned:Boolean(data.secureDNS?.delegationSigned),
        zoneSigned:Boolean(data.secureDNS?.zoneSigned),
        maxSigLife:data.secureDNS?.maxSigLife??null,
        dsData:Array.isArray(data.secureDNS?.dsData)?data.secureDNS.dsData:[],
        keyData:Array.isArray(data.secureDNS?.keyData)?data.secureDNS.keyData:[]
      },
      publicIds:Array.isArray(data.publicIds)?data.publicIds:[],
      notices:notes(data.notices||[]),
      remarks:notes(data.remarks||[]),
      links:Array.isArray(data.links)?data.links.map((link:any)=>({rel:text(link?.rel),href:text(link?.href),title:text(link?.title),type:text(link?.type)})):[],
      dnsRecords
    });
  }catch(error){return fail(error);}
}
