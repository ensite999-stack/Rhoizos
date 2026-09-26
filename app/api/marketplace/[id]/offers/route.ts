import {requireUser} from "@/lib/auth";
import {fail,ok} from "@/lib/http";
import {createMarketplaceOffer} from "@/lib/marketplace";

export const runtime="nodejs";

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const user=await requireUser(),{id}=await params;
    const body=await request.json() as {offerAmount?:number|null;message?:string};
    const raw=body.offerAmount;
    const offerAmount=raw===null||raw===undefined||raw==="" as never?null:Number(raw);
    const deal=await createMarketplaceOffer({
      listingId:id,
      buyerUserId:user.id,
      offerAmount,
      message:String(body.message||"").trim()
    });
    return ok({deal},201);
  }catch(error){return fail(error);}
}
