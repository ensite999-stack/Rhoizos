import {completeGuestPurchase} from "@/lib/guest-purchase";
import {fail,ok} from "@/lib/http";
import type {ContactInput} from "@/lib/domain";

export const runtime="nodejs";

export async function POST(request:Request){
  try{
    const body=await request.json() as ContactInput&{token?:string};
    const result=await completeGuestPurchase(String(body.token||""),body);
    return ok(result,201);
  }catch(error){return fail(error);}
}
