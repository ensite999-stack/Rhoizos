import {db} from "@/lib/db";
import {fail,ok} from "@/lib/http";
import {namesiloMarketplaceSales} from "@/lib/namesilo";

export const runtime="nodejs";

export async function GET(){
  try{
    const local=await db()`select name from domains where lifecycle_status='registered'`;
    const allowed=new Set(local.map(row=>String(row.name).toLowerCase()));
    const sales=(await namesiloMarketplaceSales())
      .filter(item=>allowed.has(item.domain))
      .map(item=>({
        domain:item.domain,
        status:item.status,
        reserve:item.reserve,
        buyNow:item.buyNow,
        saleType:item.saleType,
        paymentPlanOffered:item.paymentPlanOffered,
        endDate:item.endDate,
        timeRemaining:item.timeRemaining
      }));
    return ok({items:sales});
  }catch(error){return fail(error);}
}
