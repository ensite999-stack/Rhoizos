import {db} from "./db";
import {tldOf} from "./domain";
import {namesiloPrices,namesiloStandardCost} from "./namesilo";

export type PriceKind="register"|"renew"|"transfer";
export type PublicPrice={
  tld:string;
  register:number;
  firstYear:number;
  promo:number|null;
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
function promotional(value:unknown,firstYear:number){
  const n=Number(value);
  return Number.isFinite(n)&&n>0&&n<firstYear?money(n):null;
}

async function databasePricing(){
  const settingsRows=await db()`
    select fixed_markup_usd,currency
    from pricing_settings where singleton=true limit 1
  `;
  const settings=settingsRows[0]||{fixed_markup_usd:DEFAULT_FIXED_MARKUP,currency:"USD"};

  const rows=await db()`
    select tld,register_price,renew_price,transfer_price,
      cost_register,cost_renew,cost_transfer,override_register,
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
    const standard=effective(await namesiloStandardCost(domain,kind),await fixedMarkup());
    if(kind!=="register"||!process.env.DATABASE_URL)return standard;

    const {rows}=await databasePricing();
    const row=rows.find(r=>String(r.tld)===tld);
    if(row&&!Boolean(row.active)) throw new Error("This extension is not currently offered.");
    return promotional(row?.override_register,standard)??standard;
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
    const standard=effective(cost,Number(settings.fixed_markup_usd||DEFAULT_FIXED_MARKUP));
    return kind==="register"?(promotional(row.override_register,standard)??standard):standard;
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
        const firstYear=effective(item.registration,markup);
        const promo=promotional(row.override_register,firstYear);
        return [{
          tld:"."+String(row.tld),
          register:promo??firstYear,
          firstYear,
          promo,
          renew:effective(item.renew,markup),
          transfer:effective(item.transfer,markup),
          featured:Boolean(row.featured)
        }];
      });
    }
    return [...provider.values()].map(item=>{
      const firstYear=effective(item.registration,DEFAULT_FIXED_MARKUP);
      return {
        tld:"."+item.tld,
        register:firstYear,
        firstYear,
        promo:null,
        renew:effective(item.renew,DEFAULT_FIXED_MARKUP),
        transfer:effective(item.transfer,DEFAULT_FIXED_MARKUP)
      };
    });
  }

  if(process.env.DATABASE_URL){
    const {settings,rows}=await databasePricing();
    const markup=Number(settings.fixed_markup_usd||DEFAULT_FIXED_MARKUP);
    return rows.filter(r=>Boolean(r.active)).map(row=>{
      const firstYear=effective(Number(row.cost_register??row.register_price),markup);
      const promo=promotional(row.override_register,firstYear);
      return {
        tld:"."+String(row.tld),
        register:promo??firstYear,
        firstYear,
        promo,
        renew:effective(Number(row.cost_renew??row.renew_price),markup),
        transfer:effective(Number(row.cost_transfer??row.transfer_price),markup),
        featured:Boolean(row.featured)
      };
    });
  }

  return Object.entries(fallbackTable()).map(([tld,p])=>{
    const firstYear=effective(p.register,DEFAULT_FIXED_MARKUP);
    return {
      tld:"."+tld,
      register:firstYear,
      firstYear,
      promo:null,
      renew:effective(p.renew,DEFAULT_FIXED_MARKUP),
      transfer:effective(p.transfer,DEFAULT_FIXED_MARKUP)
    };
  });
}

export async function adminPricing(){
  if(!process.env.DATABASE_URL) throw new Error("Database pricing is not configured.");
  const {settings,rows}=await databasePricing();
  const markup=Number(settings.fixed_markup_usd||DEFAULT_FIXED_MARKUP);
  return {
    settings:{fixedMarkup:markup,currency:String(settings.currency||"USD")},
    items:rows.map(row=>{
      const firstYear=effective(Number(row.cost_register??row.register_price),markup);
      const promo=promotional(row.override_register,firstYear);
      return {
        tld:String(row.tld),
        active:Boolean(row.active),
        featured:Boolean(row.featured),
        promoRegister:row.override_register===null||row.override_register===undefined?null:Number(row.override_register),
        cost:{
          register:Number(row.cost_register??row.register_price),
          renew:Number(row.cost_renew??row.renew_price),
          transfer:Number(row.cost_transfer??row.transfer_price)
        },
        effective:{
          register:promo??firstYear,
          firstYear,
          promo,
          renew:effective(Number(row.cost_renew??row.renew_price),markup),
          transfer:effective(Number(row.cost_transfer??row.transfer_price),markup)
        }
      };
    })
  };
}
