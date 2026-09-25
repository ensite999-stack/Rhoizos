import {NextRequest} from "next/server";
import {normalizeDomain} from "@/lib/domain";
import {fail,ok} from "@/lib/http";

const origins:Record<string,string>={
  com:"https://rdap.verisign.com/com/v1",
  net:"https://rdap.verisign.com/net/v1",
  org:"https://rdap.publicinterestregistry.org/rdap"
};

export async function GET(request:NextRequest){
  try{
    const domain=normalizeDomain(request.nextUrl.searchParams.get("domain")||"");
    const tld=domain.split(".").at(-1)!;
    if(!origins[tld]) throw new Error("RDAP is currently available for .com, .net and .org.");
    const response=await fetch(`${origins[tld]}/domain/${encodeURIComponent(domain)}`,{
      cache:"no-store",redirect:"manual",signal:AbortSignal.timeout(15000)
    });
    if(!response.ok) throw new Error(`RDAP lookup failed (HTTP ${response.status}).`);
    const data=await response.json();
    return ok({ldhName:data.ldhName,status:data.status,events:data.events,nameservers:data.nameservers});
  }catch(error){return fail(error);}
}
