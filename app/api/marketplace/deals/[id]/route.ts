import {requireUser} from "@/lib/auth";
import {fail,ok} from "@/lib/http";
import {marketplaceDealAction} from "@/lib/marketplace";

export const runtime="nodejs";

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const user=await requireUser(),{id}=await params;
    const body=await request.json() as {
      action?:"accept"|"reject"|"cancel"|"release";
      confirmRelease?:boolean;
    };
    if(!body.action||!["accept","reject","cancel","release"].includes(body.action)){
      throw new Error("Invalid marketplace action.");
    }
    return ok(await marketplaceDealAction({
      userId:user.id,
      dealId:id,
      action:body.action,
      confirmRelease:Boolean(body.confirmRelease)
    }));
  }catch(error){return fail(error);}
}
