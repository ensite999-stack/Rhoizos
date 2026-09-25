import {NextRequest,NextResponse} from "next/server";
import {fail,ok} from "@/lib/http";
import {normalizeDomain} from "@/lib/domain";
import {publicPrices,retailFromCost,retailPrice} from "@/lib/pricing";
import {domainAvailability,domainsAvailability} from "@/lib/spaceship";

export const runtime="nodejs";

const PAGE_SIZE=60;
const COMMON_TLDS=[
  "com","net","org","io","co","ai","dev","app","xyz","info",
  "me","tech","online","store","site","cloud","pro","biz","live","world",
  "shop","blog","design","digital","agency","solutions","services","website","space","club",
  "vip","top","link","news","media","social","network","systems","software","studio",
  "company","business","center","email","group","team","today","life","work","zone",
  "fun","one","art","cafe","city","global","guru","tips","tools","academy",
  "finance","money","capital","marketing","consulting","expert","support","international","technology",
  "computer","codes","domains","host","ink","wiki","photography","photos","video","games",
  "game","press","events","community","foundation","ventures","partners","holdings","exchange","market",
  "markets","trade","works","world","earth","green","energy","engineering","education","school",
  "college","university","law","legal","health","care","clinic","fitness","fashion","style",
  "beauty","travel","tours","vacations","holiday","rentals","property","realty","estate","house",
  "restaurant","pizza","coffee","bar","pub","beer","wine","food","delivery","auto",
  "cars","motorcycles","boats","pet","dog","family","baby","kids","love","bio"
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
      const allTlds=[...new Set(ordered)];
      const requestedTlds=(request.nextUrl.searchParams.get("tld")||"")
        .split(",")
        .map(value=>value.replace(/^\./,"").trim().toLowerCase())
        .filter(Boolean);
      if(requestedTlds.length>20||requestedTlds.some(tld=>!/^[a-z0-9-]{2,63}$/.test(tld))){
        return NextResponse.json({error:"Invalid domain extension filter."},{status:400});
      }
      const uniqueRequested=[...new Set(requestedTlds)];
      const page=uniqueRequested.length?0:Math.max(0,Number.parseInt(request.nextUrl.searchParams.get("page")||"0",10)||0);
      const start=page*PAGE_SIZE;
      const tlds=uniqueRequested.length?uniqueRequested:allTlds.slice(start,start+PAGE_SIZE);
      const domains=tlds.map(tld=>label+"."+tld);
      const hasMore=!uniqueRequested.length&&start+tlds.length<allTlds.length;

      if(!process.env.SPACESHIP_API_KEY||!process.env.SPACESHIP_API_SECRET){
        return ok({
          query:label,
          page,
          total:uniqueRequested.length?uniqueRequested.length:allTlds.length,
          hasMore,
          tlds:allTlds.map(tld=>"."+tld),
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
        page,
        total:uniqueRequested.length?uniqueRequested.length:allTlds.length,
        hasMore,
        tlds:allTlds.map(tld=>"."+tld),
        items:await Promise.all(domains.map(async (domain,index)=>{
          const state=availabilityMap.get(domain);
          const available=state?.available??null;
          const premium=state?.premium??false;
          const configured=priceMap.get(tlds[index])?.register??null;
          const live=state?.registerPrice
            ?await retailFromCost(state.registerPrice,"register")
            :configured;
          return {
            domain,
            available,
            premium,
            price:available===true?live:null,
            preview:false
          };
        }))
      });
    }

    if(!input) return ok({prices:await publicPrices()});

    const domain=normalizeDomain(input);
    const price=await retailPrice(domain,"register").catch(()=>null);

    if(!process.env.SPACESHIP_API_KEY||!process.env.SPACESHIP_API_SECRET){
      return ok({domain,available:null,premium:false,price,preview:true});
    }

    const result=await domainAvailability(domain);
    const live=result.registerPrice
      ?await retailFromCost(result.registerPrice,"register")
      :price;
    return ok({
      ...result,
      price:result.available?live:null,
      preview:false
    });
  }catch(error){
    const message=error instanceof Error?error.message:"";
    if(message==="Enter a valid domain name.") return fail(error);
    console.error("Domain search failed",error);
    return NextResponse.json({error:"Domain search is temporarily unavailable."},{status:503});
  }
}
