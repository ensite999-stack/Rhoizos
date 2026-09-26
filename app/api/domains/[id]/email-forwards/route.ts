import {requireUser} from "@/lib/auth";
import {fail,ok} from "@/lib/http";
import {requireOwnedDomain} from "@/lib/owned-domain";
import {namesiloConfigureEmailForward,namesiloDeleteEmailForward,namesiloListEmailForwards} from "@/lib/namesilo";

export const runtime="nodejs";

export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const user=await requireUser(),{id}=await params;
    const domain=await requireOwnedDomain(user.id,id);
    return ok({domain:String(domain.name),items:await namesiloListEmailForwards(String(domain.name))});
  }catch(error){return fail(error);}
}

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const user=await requireUser(),{id}=await params;
    const domain=await requireOwnedDomain(user.id,id);
    const body=await request.json() as {email?:string;forwardsTo?:unknown};
    const destinations=Array.isArray(body.forwardsTo)?body.forwardsTo.map(String):[];
    await namesiloConfigureEmailForward(String(domain.name),String(body.email||""),destinations);
    return ok({items:await namesiloListEmailForwards(String(domain.name))});
  }catch(error){return fail(error);}
}

export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const user=await requireUser(),{id}=await params;
    const domain=await requireOwnedDomain(user.id,id);
    const body=await request.json() as {email?:string};
    await namesiloDeleteEmailForward(String(domain.name),String(body.email||""));
    return ok({items:await namesiloListEmailForwards(String(domain.name))});
  }catch(error){return fail(error);}
}
