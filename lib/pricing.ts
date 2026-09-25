import {db} from "./db";
import {tldOf} from "./domain";

export type PriceKind="register"|"renew"|"transfer";
export type PublicPrice={
  tld:string;
  register:number;
  renew:number;
  transfer:number;
  featured?:boolean;
};

type Table=Record<string,Record<PriceKind,number>>;

function fallbackTable():Table{
  const defaults:Table={
    com:{register:19.99,renew:19.99,transfer:18.99},
    net:{register:21.99,renew:21.99,transfer:20.99},
    org:{register:17.99,renew:17.99,transfer:16.99},
    io:{register:59.99,renew:59.99,transfer:58.99}
  };
  const rawText=process.env.RHOIZOS_TLD_PRICES_JSON?.trim();
  const raw=rawText?JSON.parse(rawText) as Table:defaults;
  return Object.fromEntries(Object.entries(raw).map(([k,v])=>[k.replace(/^\./,"").toLowerCase(),v]));
}

export async function retailPrice(domain:string,kind:PriceKind){
  const tld=tldOf(domain);

  if(process.env.DATABASE_URL){
    const rows=await db()`
      select register_price,renew_price,transfer_price
      from tld_prices
      where tld=${tld} and active=true
      limit 1
    `;
    const row=rows[0];
    if(!row) throw new Error("This extension is not currently offered.");
    const value=Number(
      kind==="register"?row.register_price:
      kind==="renew"?row.renew_price:
      row.transfer_price
    );
    if(!Number.isFinite(value)||value<=0) throw new Error("Pricing is temporarily unavailable.");
    return Math.round(value*100)/100;
  }

  const value=Number(fallbackTable()[tld]?.[kind]);
  if(!Number.isFinite(value)||value<=0) throw new Error("This extension is not currently offered.");
  return Math.round(value*100)/100;
}

export async function publicPrices():Promise<PublicPrice[]>{
  if(process.env.DATABASE_URL){
    const rows=await db()`
      select tld,register_price,renew_price,transfer_price,featured
      from tld_prices
      where active=true
      order by featured desc,sort_order asc,tld asc
    `;
    return rows.map(row=>({
      tld:"."+String(row.tld),
      register:Number(row.register_price),
      renew:Number(row.renew_price),
      transfer:Number(row.transfer_price),
      featured:Boolean(row.featured)
    }));
  }

  return Object.entries(fallbackTable()).map(([tld,p])=>({tld:"."+tld,...p}));
}
