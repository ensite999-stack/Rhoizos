import {NextRequest} from "next/server";
import {fail,ok} from "@/lib/http";
import {normalizeDomain} from "@/lib/domain";
import {publicPrices,retailPrice} from "@/lib/pricing";
import {domainAvailability} from "@/lib/spaceship";

export const runtime="nodejs";

export async function GET(request:NextRequest){
  try{
    const input=request.nextUrl.searchParams.get("domain");
    if(!input) return ok({prices:publicPrices()});
    const domain=normalizeDomain(input);
    const result=await domainAvailability(domain);
    return ok({...result,price:result.available&&!result.premium?retailPrice(domain,"register"):null});
  }catch(error){return fail(error);}
}
