import {audit,requireAdmin} from "@/lib/admin-auth";
import {db} from "@/lib/db";
import {fail,ok} from "@/lib/http";
import {adminPricing} from "@/lib/pricing";

export const runtime="nodejs";

export async function GET(){
  try{
    await requireAdmin();
    return ok(await adminPricing());
  }catch(error){return fail(error);}
}

export async function PATCH(request:Request){
  try{
    const admin=await requireAdmin();
    const body=await request.json() as {fixedMarkup?:number};
    const fixedMarkup=Number(body.fixedMarkup);
    if(!Number.isFinite(fixedMarkup)||fixedMarkup<0||fixedMarkup>10000) throw new Error("Fixed markup is invalid.");

    await db()`
      update pricing_settings
      set fixed_markup_usd=${fixedMarkup},updated_at=now()
      where singleton=true
    `;
    await audit(admin.id,"pricing.global.update","pricing_settings","global",{fixedMarkup});
    return ok(await adminPricing());
  }catch(error){return fail(error);}
}
