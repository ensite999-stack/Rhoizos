import {tldOf} from "./domain";

export type PriceKind="register"|"renew"|"transfer";
type Table=Record<string,Record<PriceKind,number>>;
let cache:Table|undefined;

function table():Table{
  if(!cache){
    const fallback:Table={
      com:{register:19.99,renew:19.99,transfer:18.99},
      net:{register:21.99,renew:21.99,transfer:20.99},
      org:{register:17.99,renew:17.99,transfer:16.99},
      io:{register:59.99,renew:59.99,transfer:58.99}
    };
    const rawText=process.env.RHOIZOS_TLD_PRICES_JSON?.trim();
    const raw=rawText?JSON.parse(rawText) as Table:fallback;
    cache=Object.fromEntries(Object.entries(raw).map(([k,v])=>[k.replace(/^\./,"").toLowerCase(),v]));
  }
  return cache;
}
export function retailPrice(domain:string,kind:PriceKind){
  const value=Number(table()[tldOf(domain)]?.[kind]);
  if(!Number.isFinite(value)||value<=0) throw new Error("This extension is not currently offered.");
  return Math.round(value*100)/100;
}
export function publicPrices(){return Object.entries(table()).map(([tld,p])=>({tld:"."+tld,...p}));}
