import {requireUser} from "@/lib/auth";
import {cancelDropcatchRequest} from "@/lib/dropcatch";
import {fail,ok} from "@/lib/http";

export const runtime="nodejs";

export async function DELETE(_:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const user=await requireUser(),{id}=await params;
    await cancelDropcatchRequest(user.id,id);
    return ok({ok:true});
  }catch(error){return fail(error);}
}
