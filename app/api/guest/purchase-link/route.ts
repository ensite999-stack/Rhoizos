import {NextRequest} from "next/server";
import {createGuestPurchaseLink,guestPurchaseLink} from "@/lib/guest-purchase";
import {fail,ok} from "@/lib/http";

export const runtime="nodejs";

export async function GET(request:NextRequest){
  try{
    const token=request.nextUrl.searchParams.get("token")||"";
    return ok(await guestPurchaseLink(token));
  }catch(error){return fail(error);}
}

export async function POST(request:Request){
  try{
    const body=await request.json() as {email?:string;domain?:string};
    await createGuestPurchaseLink(String(body.email||""),String(body.domain||""));
    return ok({sent:true});
  }catch(error){return fail(error);}
}
