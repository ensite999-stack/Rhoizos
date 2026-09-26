import {requireUser} from "@/lib/auth";
import {fail,ok} from "@/lib/http";
import {requireOwnedDomain} from "@/lib/owned-domain";
import {
  cancelMarketplaceListing,
  getSellerListing,
  saveMarketplaceListing
} from "@/lib/marketplace";

export const runtime="nodejs";

export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const user=await requireUser(),{id}=await params;
    const owned=await requireOwnedDomain(user.id,id);
    return ok({domain:String(owned.name),sale:await getSellerListing(user.id,id)});
  }catch(error){return fail(error);}
}

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const user=await requireUser(),{id}=await params;
    const owned=await requireOwnedDomain(user.id,id);
    const body=await request.json() as {
      askingPrice?:number|null;
      allowOffers?:boolean;
      description?:string;
    };
    const askingPrice=body.askingPrice===null||body.askingPrice===undefined?null:Number(body.askingPrice);
    const sale=await saveMarketplaceListing({
      userId:user.id,
      domainId:id,
      askingPrice,
      allowOffers:body.allowOffers!==false,
      description:String(body.description||"").trim()
    });
    return ok({domain:String(owned.name),sale});
  }catch(error){return fail(error);}
}

export async function DELETE(_:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const user=await requireUser(),{id}=await params;
    await requireOwnedDomain(user.id,id);
    await cancelMarketplaceListing(user.id,id);
    return ok({ok:true});
  }catch(error){return fail(error);}
}
