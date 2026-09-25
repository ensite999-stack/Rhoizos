import {requiredEnv} from "./env";
import {tldOf} from "./domain";

export type PriceKind="register"|"renew"|"transfer";
type Table=Record<string,Record<PriceKind,number>>;
let cache:Table|undefined;

function table():Table{
  if(!cache){
    const raw=JSON.parse(requiredEnv("RHOIZOS_TLD_PRICES_JSON")) as Table;
    cache=Object.fromEntries(Object.entries(raw).map(([k,v])=>[k.replace(/^\./,"").toLowerCase(),v]));
  }
  return cache;
}
export function retailPrice(domain:string,kind:PriceKind){
  const value=Number(table()[tldOf(domain)]?.[kind]);
  if(!Number.isFinite(value)||value<=0) throw new Error("This extension is not currently offered.");
  return Math.round(value*100)/100;
}
export function publicPrices(){return Object.entries(table()).map(([tld,p])=>({tld:`.${tld}`,...p}));}
