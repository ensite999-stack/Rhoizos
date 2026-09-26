import {fail,ok} from "@/lib/http";
import {listMarketplaceListings} from "@/lib/marketplace";

export const runtime="nodejs";

export async function GET(){
  try{
    return ok({items:await listMarketplaceListings()});
  }catch(error){return fail(error);}
}
