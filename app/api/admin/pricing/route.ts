import {audit,requireAdmin} from "@/lib/admin-auth";
import {db} from "@/lib/db";
import {fail,ok} from "@/lib/http";
import {adminPricing} from "@/lib/pricing";

export const runtime="nodejs";

function pct(value:unknown){
  const n=Number(value);
  if(!Number.isFinite(n)||n<0||n>1000) throw new Error("Markup must be between 0 and 1000 percent.");
  return n;
}

export async function GET(){
  try{
    await requireAdmin();
    return ok(await adminPricing());
  }catch(error){return fail(error);}
}

export async function PATCH(request:Request){
  try{
    const admin=await requireAdmin();
    const body=await request.json() as {
      registerMarkup?:number;renewMarkup?:number;transferMarkup?:number;minimumMargin?:number
    };
    const registerMarkup=pct(body.registerMarkup);
    const renewMarkup=pct(body.renewMarkup);
    const transferMarkup=pct(body.transferMarkup);
    const minimumMargin=Number(body.minimumMargin);
    if(!Number.isFinite(minimumMargin)||minimumMargin<0||minimumMargin>10000) throw new Error("Minimum margin is invalid.");

    await db()`
      update pricing_settings
      set default_register_markup_pct=${registerMarkup},
          default_renew_markup_pct=${renewMarkup},
          default_transfer_markup_pct=${transferMarkup},
          minimum_margin=${minimumMargin},
          updated_at=now()
      where singleton=true
    `;
    await audit(admin.id,"pricing.global.update","pricing_settings","global",{
      registerMarkup,renewMarkup,transferMarkup,minimumMargin
    });
    return ok(await adminPricing());
  }catch(error){return fail(error);}
}
