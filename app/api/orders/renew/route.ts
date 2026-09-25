import {requireUser} from "@/lib/auth";
import {createCheckout,createRenewOrder} from "@/lib/orders";
import {fail,ok} from "@/lib/http";

export const runtime="nodejs";
export async function POST(request:Request){
  try{
    const user=await requireUser(),body=await request.json() as {domainId?:string};
    const orderId=await createRenewOrder(user.id,String(body.domainId||""));
    return ok({orderId,checkoutUrl:await createCheckout(orderId,user.id)},201);
  }catch(error){return fail(error);}
}
