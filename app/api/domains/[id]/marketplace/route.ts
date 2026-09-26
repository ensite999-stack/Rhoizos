import {requireUser} from "@/lib/auth";
import {fail,ok} from "@/lib/http";
import {requireOwnedDomain} from "@/lib/owned-domain";
import {
  namesiloMarketplaceCancelSale,
  namesiloMarketplaceSales,
  namesiloMarketplaceSetSale
} from "@/lib/namesilo";

export const runtime="nodejs";

async function currentSale(domain:string){
  return (await namesiloMarketplaceSales()).find(item=>item.domain===domain)||null;
}

export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const user=await requireUser(),{id}=await params;
    const owned=await requireOwnedDomain(user.id,id);
    const domain=String(owned.name);
    return ok({domain,sale:await currentSale(domain)});
  }catch(error){return fail(error);}
}

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const user=await requireUser(),{id}=await params;
    const owned=await requireOwnedDomain(user.id,id);
    const domain=String(owned.name);
    const body=await request.json() as {
      saleType?:"auction"|"offer_counter_offer";
      reserve?:number|null;
      buyNow?:number|null;
      description?:string;
      paymentPlanOffered?:boolean;
    };
    const saleType=body.saleType==="auction"?"auction":"offer_counter_offer";
    const existing=await currentSale(domain);
    await namesiloMarketplaceSetSale({
      domain,
      action:existing?"modify":"add",
      saleType,
      reserve:body.reserve,
      buyNow:body.buyNow,
      description:String(body.description||""),
      paymentPlanOffered:Boolean(body.paymentPlanOffered)
    });
    return ok({domain,sale:await currentSale(domain)});
  }catch(error){return fail(error);}
}

export async function DELETE(_:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const user=await requireUser(),{id}=await params;
    const owned=await requireOwnedDomain(user.id,id);
    const domain=String(owned.name);
    const sale=await currentSale(domain);
    if(!sale)return ok({ok:true});
    if(sale.saleType!=="auction"&&sale.saleType!=="offer_counter_offer"){
      throw new Error("This marketplace listing type cannot be cancelled from Rhoizos.");
    }
    await namesiloMarketplaceCancelSale(domain,sale.saleType);
    return ok({ok:true});
  }catch(error){return fail(error);}
}
