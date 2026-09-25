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

function money(value:number){return Math.round(value*100)/100;}

function effective(
  cost:number,
  globalMarkup:number,
  customMarkup:number|null,
  override:number|null,
  minimumMargin:number
){
  if(Number.isFinite(override as number)&&Number(override)>0) return money(Number(override));
  const markup=customMarkup===null?globalMarkup:customMarkup;
  const byPercent=cost*(1+markup/100);
  const byMargin=cost+minimumMargin;
  return money(Math.max(byPercent,byMargin));
}

async function databasePricing(){
  const settingsRows=await db()`
    select default_register_markup_pct,default_renew_markup_pct,default_transfer_markup_pct,
      minimum_margin,currency
    from pricing_settings where singleton=true limit 1
  `;
  const settings=settingsRows[0]||{
    default_register_markup_pct:0,default_renew_markup_pct:0,default_transfer_markup_pct:0,
    minimum_margin:0,currency:"USD"
  };

  const rows=await db()`
    select tld,register_price,renew_price,transfer_price,
      cost_register,cost_renew,cost_transfer,
      markup_register_pct,markup_renew_pct,markup_transfer_pct,
      override_register,override_renew,override_transfer,
      featured,sort_order,active
    from tld_prices
    order by featured desc,sort_order asc,tld asc
  `;

  return {settings,rows};
}

export async function retailPrice(domain:string,kind:PriceKind){
  const tld=tldOf(domain);

  if(process.env.DATABASE_URL){
    const {settings,rows}=await databasePricing();
    const row=rows.find(r=>String(r.tld)===tld&&Boolean(r.active));
    if(!row) throw new Error("This extension is not currently offered.");

    const minimumMargin=Number(settings.minimum_margin||0);
    if(kind==="register"){
      const cost=Number(row.cost_register??row.register_price);
      return effective(cost,Number(settings.default_register_markup_pct||0),row.markup_register_pct===null?null:Number(row.markup_register_pct),row.override_register===null?null:Number(row.override_register),minimumMargin);
    }
    if(kind==="renew"){
      const cost=Number(row.cost_renew??row.renew_price);
      return effective(cost,Number(settings.default_renew_markup_pct||0),row.markup_renew_pct===null?null:Number(row.markup_renew_pct),row.override_renew===null?null:Number(row.override_renew),minimumMargin);
    }
    const cost=Number(row.cost_transfer??row.transfer_price);
    return effective(cost,Number(settings.default_transfer_markup_pct||0),row.markup_transfer_pct===null?null:Number(row.markup_transfer_pct),row.override_transfer===null?null:Number(row.override_transfer),minimumMargin);
  }

  const value=Number(fallbackTable()[tld]?.[kind]);
  if(!Number.isFinite(value)||value<=0) throw new Error("This extension is not currently offered.");
  return money(value);
}

export async function retailFromCost(cost:number,kind:PriceKind){
  if(!Number.isFinite(cost)||cost<=0) throw new Error("Invalid provider price.");
  if(process.env.DATABASE_URL){
    const {settings}=await databasePricing();
    const markup=kind==="register"
      ?Number(settings.default_register_markup_pct||0)
      :kind==="renew"
        ?Number(settings.default_renew_markup_pct||0)
        :Number(settings.default_transfer_markup_pct||0);
    return effective(cost,markup,null,null,Number(settings.minimum_margin||0));
  }
  return money(cost);
}

export async function retailFromCosts(costs:number[],kind:PriceKind){
  if(costs.some(cost=>!Number.isFinite(cost)||cost<=0)) throw new Error("Invalid provider price.");
  if(!costs.length)return [];
  if(process.env.DATABASE_URL){
    const {settings}=await databasePricing();
    const markup=kind==="register"
      ?Number(settings.default_register_markup_pct||0)
      :kind==="renew"
        ?Number(settings.default_renew_markup_pct||0)
        :Number(settings.default_transfer_markup_pct||0);
    const minimumMargin=Number(settings.minimum_margin||0);
    return costs.map(cost=>effective(cost,markup,null,null,minimumMargin));
  }
  return costs.map(money);
}

export async function publicPrices():Promise<PublicPrice[]>{
  if(process.env.DATABASE_URL){
    const {settings,rows}=await databasePricing();
    const minimumMargin=Number(settings.minimum_margin||0);

    return rows.filter(r=>Boolean(r.active)).map(row=>({
      tld:"."+String(row.tld),
      register:effective(Number(row.cost_register??row.register_price),Number(settings.default_register_markup_pct||0),row.markup_register_pct===null?null:Number(row.markup_register_pct),row.override_register===null?null:Number(row.override_register),minimumMargin),
      renew:effective(Number(row.cost_renew??row.renew_price),Number(settings.default_renew_markup_pct||0),row.markup_renew_pct===null?null:Number(row.markup_renew_pct),row.override_renew===null?null:Number(row.override_renew),minimumMargin),
      transfer:effective(Number(row.cost_transfer??row.transfer_price),Number(settings.default_transfer_markup_pct||0),row.markup_transfer_pct===null?null:Number(row.markup_transfer_pct),row.override_transfer===null?null:Number(row.override_transfer),minimumMargin),
      featured:Boolean(row.featured)
    }));
  }

  return Object.entries(fallbackTable()).map(([tld,p])=>({tld:"."+tld,...p}));
}

export async function adminPricing(){
  if(!process.env.DATABASE_URL) throw new Error("Database pricing is not configured.");
  const {settings,rows}=await databasePricing();
  const minimumMargin=Number(settings.minimum_margin||0);
  return {
    settings:{
      registerMarkup:Number(settings.default_register_markup_pct||0),
      renewMarkup:Number(settings.default_renew_markup_pct||0),
      transferMarkup:Number(settings.default_transfer_markup_pct||0),
      minimumMargin,
      currency:String(settings.currency||"USD")
    },
    items:rows.map(row=>({
      tld:String(row.tld),
      active:Boolean(row.active),
      featured:Boolean(row.featured),
      sortOrder:Number(row.sort_order),
      cost:{
        register:Number(row.cost_register??row.register_price),
        renew:Number(row.cost_renew??row.renew_price),
        transfer:Number(row.cost_transfer??row.transfer_price)
      },
      markup:{
        register:row.markup_register_pct===null?null:Number(row.markup_register_pct),
        renew:row.markup_renew_pct===null?null:Number(row.markup_renew_pct),
        transfer:row.markup_transfer_pct===null?null:Number(row.markup_transfer_pct)
      },
      override:{
        register:row.override_register===null?null:Number(row.override_register),
        renew:row.override_renew===null?null:Number(row.override_renew),
        transfer:row.override_transfer===null?null:Number(row.override_transfer)
      },
      effective:{
        register:effective(Number(row.cost_register??row.register_price),Number(settings.default_register_markup_pct||0),row.markup_register_pct===null?null:Number(row.markup_register_pct),row.override_register===null?null:Number(row.override_register),minimumMargin),
        renew:effective(Number(row.cost_renew??row.renew_price),Number(settings.default_renew_markup_pct||0),row.markup_renew_pct===null?null:Number(row.markup_renew_pct),row.override_renew===null?null:Number(row.override_renew),minimumMargin),
        transfer:effective(Number(row.cost_transfer??row.transfer_price),Number(settings.default_transfer_markup_pct||0),row.markup_transfer_pct===null?null:Number(row.markup_transfer_pct),row.override_transfer===null?null:Number(row.override_transfer),minimumMargin)
      }
    }))
  };
}
