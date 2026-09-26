import {fail,ok} from "@/lib/http";
import {getMarketplaceListing} from "@/lib/marketplace";

export const runtime="nodejs";

export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const {id}=await params;
    const item=await getMarketplaceListing(id);
    if(!item) return ok({error:"Listing not found."},404);
    return ok({item});
  }catch(error){return fail(error);}
}
