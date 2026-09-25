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
    if(!process.env.SPACESHIP_API_KEY||!process.env.SPACESHIP_API_SECRET){
      return ok({domain,available:null,premium:false,price:retailPrice(domain,"register"),preview:true});
    }
    const result=await domainAvailability(domain);
    return ok({...result,price:result.available&&!result.premium?retailPrice(domain,"register"):null,preview:false});
  }catch(error){return fail(error);}
}
