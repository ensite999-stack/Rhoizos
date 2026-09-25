import {audit,requireAdmin} from "@/lib/admin-auth";
import {db} from "@/lib/db";
import {fail,ok} from "@/lib/http";
import {adminPricing} from "@/lib/pricing";

export const runtime="nodejs";

function optionalNumber(value:unknown,min=0){
  if(value===null||value===""||value===undefined) return null;
  const n=Number(value);
  if(!Number.isFinite(n)||n<min) throw new Error("Invalid pricing value.");
  return n;
}

export async function PATCH(request:Request,{params}:{params:Promise<{tld:string}>}){
  try{
    const admin=await requireAdmin();
    const {tld:raw}=await params;
    const tld=raw.replace(/^\./,"").toLowerCase();
    if(!/^[a-z0-9-]{2,63}$/.test(tld)) throw new Error("Invalid TLD.");

    const body=await request.json() as Record<string,unknown>;
    const costRegister=optionalNumber(body.costRegister,0.01);
    const costRenew=optionalNumber(body.costRenew,0.01);
    const costTransfer=optionalNumber(body.costTransfer,0.01);
    if(costRegister===null||costRenew===null||costTransfer===null) throw new Error("Cost values are required.");

    const markupRegister=optionalNumber(body.markupRegister);
    const markupRenew=optionalNumber(body.markupRenew);
    const markupTransfer=optionalNumber(body.markupTransfer);
    const overrideRegister=optionalNumber(body.overrideRegister,0.01);
    const overrideRenew=optionalNumber(body.overrideRenew,0.01);
    const overrideTransfer=optionalNumber(body.overrideTransfer,0.01);
    const featured=Boolean(body.featured);
    const active=body.active!==false;

    await db()`
      update tld_prices set
        cost_register=${costRegister},cost_renew=${costRenew},cost_transfer=${costTransfer},
        markup_register_pct=${markupRegister},markup_renew_pct=${markupRenew},markup_transfer_pct=${markupTransfer},
        override_register=${overrideRegister},override_renew=${overrideRenew},override_transfer=${overrideTransfer},
        featured=${featured},active=${active},updated_at=now()
      where tld=${tld}
    `;
    await audit(admin.id,"pricing.tld.update","tld_price",tld,{
      costRegister,costRenew,costTransfer,markupRegister,markupRenew,markupTransfer,
      overrideRegister,overrideRenew,overrideTransfer,featured,active
    });
    return ok(await adminPricing());
  }catch(error){return fail(error);}
}
