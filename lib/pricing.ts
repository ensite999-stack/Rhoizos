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
const SERVICE_MARGIN_USD=1;
const DEFAULT_PAYMENT_FEE_RATE=0.015;

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

function moneyUp(value:number){
  const cents=Number((value*100).toFixed(8));
  return Math.ceil(cents)/100;
}

function paymentFeeRate(){
  const configured=Number(process.env.RHOIZOS_PAYMENT_FEE_RATE);
  if(Number.isFinite(configured)&&configured>=0&&configured<0.2)return configured;
  return DEFAULT_PAYMENT_FEE_RATE;
}

function customerPrice(cost:number){
  if(!Number.isFinite(cost)||cost<=0)throw new Error("Invalid registrar cost.");
  const fee=paymentFeeRate();
  return moneyUp((cost+SERVICE_MARGIN_USD)/(1-fee));
}

async function databasePricing(){
  const settingsRows=await db()`
    select currency
    from pricing_settings where singleton=true limit 1
  `;
  const settings=settingsRows[0]||{currency:"USD"};

  const rows=await db()`
    select tld,cost_register,cost_renew,cost_transfer,
      register_price,renew_price,transfer_price,
      featured,sort_order,active
    from tld_prices
    order by featured desc,sort_order asc,tld asc
  `;

  return {settings,rows};
}

async function assertDomainOffered(domain:string){
  if(!process.env.DATABASE_URL)return;
  const {rows}=await databasePricing();
  const tld=tldOf(domain);
  const row=rows.find(r=>String(r.tld)===tld);
  if(row&&!Boolean(row.active))throw new Error("This extension is not currently offered.");
}

export async function retailPrice(domain:string,kind:PriceKind){
  const tld=tldOf(domain);
  await assertDomainOffered(domain);

  if(process.env.NAMESILO_API_KEY){
    return customerPrice(await namesiloStandardCost(domain,kind));
  }

  if(process.env.DATABASE_URL){
    const {rows}=await databasePricing();
    const row=rows.find(r=>String(r.tld)===tld&&Boolean(r.active));
    if(!row)throw new Error("This extension is not currently offered.");
    const cost=kind==="register"
      ?Number(row.cost_register??row.register_price)
      :kind==="renew"
        ?Number(row.cost_renew??row.renew_price)
        :Number(row.cost_transfer??row.transfer_price);
    return customerPrice(cost);
  }

  const cost=Number(fallbackTable()[tld]?.[kind]);
  if(!Number.isFinite(cost)||cost<=0)throw new Error("This extension is not currently offered.");
  return customerPrice(cost);
}

export async function retailFromCost(cost:number,_kind:PriceKind){
  return customerPrice(cost);
}

export async function retailFromDomainCost(domain:string,cost:number,_kind:PriceKind){
  await assertDomainOffered(domain);
  return customerPrice(cost);
}

export async function retailFromCosts(costs:number[],_kind:PriceKind){
  if(costs.some(cost=>!Number.isFinite(cost)||cost<=0))throw new Error("Invalid registrar cost.");
  return costs.map(customerPrice);
}

export async function publicPrices():Promise<PublicPrice[]>{
  if(process.env.NAMESILO_API_KEY){
    const provider=await namesiloPrices();
    if(process.env.DATABASE_URL){
      const {rows}=await databasePricing();
      return rows.filter(r=>Boolean(r.active)).flatMap(row=>{
        const tld=String(row.tld);
        const item=provider.get(tld);
        if(!item)return [];
        return [{
          tld:"."+tld,
          register:customerPrice(item.registration),
          renew:customerPrice(item.renew),
          transfer:customerPrice(item.transfer),
          featured:Boolean(row.featured)
        }];
      });
    }
    return [...provider.values()].map(item=>({
      tld:"."+item.tld,
      register:customerPrice(item.registration),
      renew:customerPrice(item.renew),
      transfer:customerPrice(item.transfer)
    }));
  }

  if(process.env.DATABASE_URL){
    const {rows}=await databasePricing();
    return rows.filter(r=>Boolean(r.active)).map(row=>({
      tld:"."+String(row.tld),
      register:customerPrice(Number(row.cost_register??row.register_price)),
      renew:customerPrice(Number(row.cost_renew??row.renew_price)),
      transfer:customerPrice(Number(row.cost_transfer??row.transfer_price)),
      featured:Boolean(row.featured)
    }));
  }

  return Object.entries(fallbackTable()).map(([tld,p])=>({
    tld:"."+tld,
    register:customerPrice(p.register),
    renew:customerPrice(p.renew),
    transfer:customerPrice(p.transfer)
  }));
}

export async function adminPricing(){
  if(!process.env.DATABASE_URL)throw new Error("Database pricing is not configured.");
  const {settings,rows}=await databasePricing();
  const feeRate=paymentFeeRate();
  return {
    settings:{
      serviceMargin:SERVICE_MARGIN_USD,
      paymentFeeRate:feeRate,
      currency:String(settings.currency||"USD")
    },
    items:rows.map(row=>{
      const register=Number(row.cost_register??row.register_price);
      const renew=Number(row.cost_renew??row.renew_price);
      const transfer=Number(row.cost_transfer??row.transfer_price);
      return {
        tld:String(row.tld),
        active:Boolean(row.active),
        featured:Boolean(row.featured),
        cost:{register,renew,transfer},
        effective:{
          register:customerPrice(register),
          renew:customerPrice(renew),
          transfer:customerPrice(transfer)
        }
      };
    })
  };
}
