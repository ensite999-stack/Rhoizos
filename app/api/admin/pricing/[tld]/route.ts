import {audit,requireAdmin} from "@/lib/admin-auth";
import {db} from "@/lib/db";
import {fail,ok} from "@/lib/http";
import {adminPricing} from "@/lib/pricing";

export const runtime="nodejs";

function requiredCost(value:unknown){
  const n=Number(value);
  if(!Number.isFinite(n)||n<=0) throw new Error("Provider cost must be greater than zero.");
  return n;
}

export async function PATCH(request:Request,{params}:{params:Promise<{tld:string}>}){
  try{
    const admin=await requireAdmin();
    const {tld:raw}=await params;
    const tld=raw.replace(/^\./,"").toLowerCase();
    if(!/^[a-z0-9-]{2,63}$/.test(tld)) throw new Error("Invalid TLD.");

    const body=await request.json() as Record<string,unknown>;
    const costRegister=requiredCost(body.costRegister);
    const costRenew=requiredCost(body.costRenew);
    const costTransfer=requiredCost(body.costTransfer);
    const featured=Boolean(body.featured);
    const active=body.active!==false;
    const promoRaw=body.promoRegister;
    const promoRegister=promoRaw===null||promoRaw===undefined||promoRaw===""?null:Number(promoRaw);
    if(promoRegister!==null&&(!Number.isFinite(promoRegister)||promoRegister<=0)){
      throw new Error("Promotional price must be greater than zero.");
    }

    await db()`
      update tld_prices set
        cost_register=${costRegister},cost_renew=${costRenew},cost_transfer=${costTransfer},
        markup_register_pct=null,markup_renew_pct=null,markup_transfer_pct=null,
        override_register=${promoRegister},override_renew=null,override_transfer=null,
        featured=${featured},active=${active},updated_at=now()
      where tld=${tld}
    `;
    await audit(admin.id,"pricing.tld.update","tld_price",tld,{
      costRegister,costRenew,costTransfer,promoRegister,featured,active
    });
    return ok(await adminPricing());
  }catch(error){return fail(error);}
}
