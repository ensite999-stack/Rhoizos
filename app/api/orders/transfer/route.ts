import {requireUser} from "@/lib/auth";
import {createCheckout,createTransferOrder} from "@/lib/orders";
import {fail,ok} from "@/lib/http";

export const runtime="nodejs";
export async function POST(request:Request){
  try{
    const user=await requireUser(),body=await request.json() as {domain?:string;authCode?:string};
    const orderId=await createTransferOrder(user.id,String(body.domain||""),String(body.authCode||""));
    return ok({orderId,checkoutUrl:await createCheckout(orderId,user.id)},201);
  }catch(error){return fail(error);}
}
