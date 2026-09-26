import {requireAdmin} from "@/lib/admin-auth";
import {fail,ok} from "@/lib/http";
import {adminPricing} from "@/lib/pricing";

export const runtime="nodejs";

export async function GET(){
  try{
    await requireAdmin();
    return ok(await adminPricing());
  }catch(error){return fail(error);}
}
