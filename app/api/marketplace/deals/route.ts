import {requireUser} from "@/lib/auth";
import {fail,ok} from "@/lib/http";
import {listMarketplaceDeals} from "@/lib/marketplace";

export const runtime="nodejs";

export async function GET(){
  try{
    const user=await requireUser();
    return ok({items:await listMarketplaceDeals(user.id)});
  }catch(error){return fail(error);}
}
