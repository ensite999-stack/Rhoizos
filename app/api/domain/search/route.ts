import {NextRequest,NextResponse} from "next/server";
import {fail,ok} from "@/lib/http";
import {normalizeDomain} from "@/lib/domain";
import {publicPrices,retailPrice} from "@/lib/pricing";
import {domainAvailability,domainsAvailability} from "@/lib/spaceship";

export const runtime="nodejs";

const COMMON_TLDS=[
  "com","net","org","io","co","ai","dev","app","xyz","info",
  "me","tech","online","store","site","cloud","pro","biz","live","world"
];

export async function GET(request:NextRequest){
  try{
    const input=request.nextUrl.searchParams.get("domain");
    const query=request.nextUrl.searchParams.get("q");

    if(query!==null){
      const label=query.trim().toLowerCase();
      if(!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)){
        return NextResponse.json({error:"Enter a valid domain name."},{status:400});
      }

      const prices=await publicPrices();
      const priceMap=new Map(prices.map(item=>[item.tld.replace(/^\./,"").toLowerCase(),item]));
      const ordered=[
        ...prices.filter(item=>item.featured!==false).map(item=>item.tld.replace(/^\./,"").toLowerCase()),
        ...prices.map(item=>item.tld.replace(/^\./,"").toLowerCase()),
        ...COMMON_TLDS
      ];
      const tlds=[...new Set(ordered)].slice(0,20);
      const domains=tlds.map(tld=>label+"."+tld);

      if(!process.env.SPACESHIP_API_KEY||!process.env.SPACESHIP_API_SECRET){
        return ok({
          query:label,
          items:domains.map((domain,index)=>{
            const price=priceMap.get(tlds[index]);
            return {domain,available:null,premium:false,price:price?.register??null,preview:true};
          })
        });
      }

      const availability=await domainsAvailability(domains);
      const availabilityMap=new Map(availability.map(item=>[item.domain,item]));
      return ok({
        query:label,
        items:domains.map((domain,index)=>{
          const state=availabilityMap.get(domain);
          const available=state?.available??null;
          const premium=state?.premium??false;
          const price=priceMap.get(tlds[index]);
          return {
            domain,
            available,
            premium,
            price:available===true&&!premium?(price?.register??null):null,
            preview:false
          };
        })
      });
    }

    if(!input) return ok({prices:await publicPrices()});

    const domain=normalizeDomain(input);
    const price=await retailPrice(domain,"register").catch(()=>null);

    if(!process.env.SPACESHIP_API_KEY||!process.env.SPACESHIP_API_SECRET){
      return ok({domain,available:null,premium:false,price,preview:true});
    }

    const result=await domainAvailability(domain);
    return ok({
      ...result,
      price:result.available&&!result.premium?price:null,
      preview:false
    });
  }catch(error){
    const message=error instanceof Error?error.message:"";
    if(message==="Enter a valid domain name.") return fail(error);
    console.error("Domain search failed",error);
    return NextResponse.json({error:"Domain search is temporarily unavailable."},{status:503});
  }
}
