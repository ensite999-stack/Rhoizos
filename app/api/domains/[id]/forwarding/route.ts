import {requireUser} from "@/lib/auth";
import {fail,ok} from "@/lib/http";
import {requireOwnedDomain} from "@/lib/owned-domain";
import {namesiloDisableDomainForward,namesiloDomainDetails,namesiloSetDomainForward} from "@/lib/namesilo";

export const runtime="nodejs";

export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const user=await requireUser(),{id}=await params;
    const domain=await requireOwnedDomain(user.id,id);
    const details=await namesiloDomainDetails(String(domain.name));
    return ok({domain:String(domain.name),forwarding:details.forwarding});
  }catch(error){return fail(error);}
}

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const user=await requireUser(),{id}=await params;
    const domain=await requireOwnedDomain(user.id,id);
    const body=await request.json() as {targetUrl?:string;method?:"301"|"302";acknowledgeDnsImpact?:boolean};
    if(body.acknowledgeDnsImpact!==true){
      throw new Error("Confirm that domain forwarding can replace NameSilo nameservers and interrupt existing website or email hosting.");
    }
    const method=body.method==="302"?"302":"301";
    const result=await namesiloSetDomainForward(String(domain.name),String(body.targetUrl||""),method);
    return ok({domain:String(domain.name),forwarding:{enabled:true,url:result.url,type:method}});
  }catch(error){return fail(error);}
}

export async function DELETE(_:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const user=await requireUser(),{id}=await params;
    const domain=await requireOwnedDomain(user.id,id);
    await namesiloDisableDomainForward(String(domain.name));
    return ok({ok:true});
  }catch(error){return fail(error);}
}
