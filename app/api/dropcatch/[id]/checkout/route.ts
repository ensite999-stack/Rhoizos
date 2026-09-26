import {requireUser} from "@/lib/auth";
import {createDropcatchCheckout} from "@/lib/dropcatch";
import {fail,ok} from "@/lib/http";

export const runtime="nodejs";

export async function POST(_:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const user=await requireUser(),{id}=await params;
    return ok({checkoutUrl:await createDropcatchCheckout(user.id,id)});
  }catch(error){return fail(error);}
}
