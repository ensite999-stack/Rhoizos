import {db} from "./db";
import {tldOf} from "./domain";
import {namesiloPrices,namesiloStandardCost} from "./namesilo";

export type PriceKind="register"|"renew"|"transfer";
export type PublicPrice={
  tld:string;
  register:number;
  renew:number;
  transfer:number;
  featured?:boolean;
};

type Table=Record<string,Record<PriceKind,number>>;
const DEFAULT_FIXED_MARKUP=2.10;

function fallbackTable():Table{
  const defaults:Table={
    com:{register:9.08,renew:10.18,transfer:9.68},
    net:{register:11.40,renew:11.40,transfer:11.40},
    org:{register:6.85,renew:11.59,transfer:11.29},
    io:{register:31.98,renew:51.75,transfer:51.75}
  };
  const rawText=process.env.RHOIZOS_TLD_PRICES_JSON?.trim();
  const raw=rawText?JSON.parse(rawText) as Table:defaults;
  return Object.fromEntries(Object.entries(raw).map(([k,v])=>[k.replace(/^\./,"").toLowerCase(),v]));
}

function money(value:number){return Math.round(value*100)/100;}
function effective(cost:number,fixedMarkup:number){
  return money(cost+fixedMarkup);
}

async function databasePricing(){
  const settingsRows=await db()`
    select fixed_markup_usd,currency
    from pricing_settings where singleton=true limit 1
  `;
  const settings=settingsRows[0]||{fixed_markup_usd:DEFAULT_FIXED_MARKUP,currency:"USD"};

  const rows=await db()`
    select tld,register_price,renew_price,transfer_price,
      cost_register,cost_renew,cost_transfer,
      featured,sort_order,active
    from tld_prices
    order by featured desc,sort_order asc,tld asc
  `;

  return {settings,rows};
}

async function fixedMarkup(){
  if(!process.env.DATABASE_URL)return DEFAULT_FIXED_MARKUP;
  const {settings}=await databasePricing();
  const value=Number(settings.fixed_markup_usd);
  return Number.isFinite(value)&&value>=0?value:DEFAULT_FIXED_MARKUP;
}

export async function retailPrice(domain:string,kind:PriceKind){
  const tld=tldOf(domain);

  if(process.env.NAMESILO_API_KEY){
    if(process.env.DATABASE_URL){
      const {settings,rows}=await databasePricing();
      const row=rows.find(r=>String(r.tld)===tld&&Boolean(r.active));
      if(!row) throw new Error("This extension is not currently offered.");
      return effective(await namesiloStandardCost(domain,kind),Number(settings.fixed_markup_usd||DEFAULT_FIXED_MARKUP));
    }
    return effective(await namesiloStandardCost(domain,kind),DEFAULT_FIXED_MARKUP);
  }

  if(process.env.DATABASE_URL){
    const {settings,rows}=await databasePricing();
    const row=rows.find(r=>String(r.tld)===tld&&Boolean(r.active));
    if(!row) throw new Error("This extension is not currently offered.");
    const cost=kind==="register"
      ?Number(row.cost_register??row.register_price)
      :kind==="renew"
        ?Number(row.cost_renew??row.renew_price)
        :Number(row.cost_transfer??row.transfer_price);
    if(!Number.isFinite(cost)||cost<=0) throw new Error("This extension has no valid provider cost.");
    return effective(cost,Number(settings.fixed_markup_usd||DEFAULT_FIXED_MARKUP));
  }

  const cost=Number(fallbackTable()[tld]?.[kind]);
  if(!Number.isFinite(cost)||cost<=0) throw new Error("This extension is not currently offered.");
  return effective(cost,DEFAULT_FIXED_MARKUP);
}

export async function retailFromCost(cost:number,_kind:PriceKind){
  if(!Number.isFinite(cost)||cost<=0) throw new Error("Invalid provider price.");
  return effective(cost,await fixedMarkup());
}

export async function retailFromCosts(costs:number[],_kind:PriceKind){
  if(costs.some(cost=>!Number.isFinite(cost)||cost<=0)) throw new Error("Invalid provider price.");
  if(!costs.length)return [];
  const markup=await fixedMarkup();
  return costs.map(cost=>effective(cost,markup));
}

export async function publicPrices():Promise<PublicPrice[]>{
  if(process.env.NAMESILO_API_KEY){
    const provider=await namesiloPrices();
    if(process.env.DATABASE_URL){
      const {settings,rows}=await databasePricing();
      const markup=Number(settings.fixed_markup_usd||DEFAULT_FIXED_MARKUP);
      return rows.filter(r=>Boolean(r.active)).flatMap(row=>{
        const item=provider.get(String(row.tld));
        if(!item)return [];
        return [{
          tld:"."+String(row.tld),
          register:effective(item.registration,markup),
          renew:effective(item.renew,markup),
          transfer:effective(item.transfer,markup),
          featured:Boolean(row.featured)
        }];
      });
    }
    return [...provider.values()].map(item=>({
      tld:"."+item.tld,
      register:effective(item.registration,DEFAULT_FIXED_MARKUP),
      renew:effective(item.renew,DEFAULT_FIXED_MARKUP),
      transfer:effective(item.transfer,DEFAULT_FIXED_MARKUP)
    }));
  }

  if(process.env.DATABASE_URL){
    const {settings,rows}=await databasePricing();
    const markup=Number(settings.fixed_markup_usd||DEFAULT_FIXED_MARKUP);
    return rows.filter(r=>Boolean(r.active)).map(row=>({
      tld:"."+String(row.tld),
      register:effective(Number(row.cost_register??row.register_price),markup),
      renew:effective(Number(row.cost_renew??row.renew_price),markup),
      transfer:effective(Number(row.cost_transfer??row.transfer_price),markup),
      featured:Boolean(row.featured)
    }));
  }

  return Object.entries(fallbackTable()).map(([tld,p])=>({
    tld:"."+tld,
    register:effective(p.register,DEFAULT_FIXED_MARKUP),
    renew:effective(p.renew,DEFAULT_FIXED_MARKUP),
    transfer:effective(p.transfer,DEFAULT_FIXED_MARKUP)
  }));
}

export async function adminPricing(){
  if(!process.env.DATABASE_URL) throw new Error("Database pricing is not configured.");
  const {settings,rows}=await databasePricing();
  const markup=Number(settings.fixed_markup_usd||DEFAULT_FIXED_MARKUP);
  return {
    settings:{fixedMarkup:markup,currency:String(settings.currency||"USD")},
    items:rows.map(row=>({
      tld:String(row.tld),
      active:Boolean(row.active),
      featured:Boolean(row.featured),
      cost:{
        register:Number(row.cost_register??row.register_price),
        renew:Number(row.cost_renew??row.renew_price),
        transfer:Number(row.cost_transfer??row.transfer_price)
      },
      effective:{
        register:effective(Number(row.cost_register??row.register_price),markup),
        renew:effective(Number(row.cost_renew??row.renew_price),markup),
        transfer:effective(Number(row.cost_transfer??row.transfer_price),markup)
      }
    }))
  };
}
