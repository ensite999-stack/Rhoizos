import {NextRequest} from "next/server";
import {normalizeDomain} from "@/lib/domain";
import {fail,ok} from "@/lib/http";

const origins:Record<string,string>={
  com:"https://rdap.verisign.com/com/v1",
  net:"https://rdap.verisign.com/net/v1",
  org:"https://rdap.publicinterestregistry.org/rdap"
};

function eventDate(events:any[],action:string){
  const item=events?.find(event=>String(event?.eventAction||"").toLowerCase()===action);
  return item?.eventDate||null;
}

function registrarName(entities:any[]){
  const registrar=entities?.find(entity=>Array.isArray(entity?.roles)&&entity.roles.includes("registrar"));
  const cards=registrar?.vcardArray?.[1];
  if(!Array.isArray(cards)) return null;
  const name=cards.find((entry:any)=>Array.isArray(entry)&&entry[0]==="fn");
  return name?.[3]||null;
}

export async function GET(request:NextRequest){
  try{
    const domain=normalizeDomain(request.nextUrl.searchParams.get("domain")||"");
    const tld=domain.split(".").at(-1)!;
    if(!origins[tld]) throw new Error("Public Domain details are currently available for .com, .net and .org.");

    const response=await fetch(`${origins[tld]}/domain/${encodeURIComponent(domain)}`,{
      cache:"no-store",redirect:"manual",signal:AbortSignal.timeout(15000)
    });
    if(!response.ok) throw new Error(`Public Domain lookup failed (HTTP ${response.status}).`);

    const data=await response.json();
    const statuses=Array.isArray(data.status)?data.status.map((x:unknown)=>String(x)):[];
    const nameservers=Array.isArray(data.nameservers)
      ?data.nameservers.map((item:any)=>String(item?.ldhName||"").toLowerCase()).filter(Boolean)
      :[];

    return ok({
      domain:String(data.ldhName||domain).toLowerCase(),
      registrar:registrarName(data.entities||[]),
      registeredAt:eventDate(data.events||[],"registration"),
      expiresAt:eventDate(data.events||[],"expiration"),
      updatedAt:eventDate(data.events||[],"last changed")||eventDate(data.events||[],"last update of rdap database"),
      statuses,
      nameservers,
      dnssec:Boolean(data.secureDNS?.delegationSigned)
    });
  }catch(error){return fail(error);}
}
