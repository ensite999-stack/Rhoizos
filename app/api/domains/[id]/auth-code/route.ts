import {requireRecentAuth,requireUser} from "@/lib/auth";
import {ownedDomain} from "@/lib/dns";
import {fail,ok} from "@/lib/http";
import {getAuthCode} from "@/lib/spaceship";
import {appUrl} from "@/lib/env";
import {safeSendTemplateEmail} from "@/lib/email";

export const runtime="nodejs";
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const user=await requireUser();requireRecentAuth(user);
    const {id}=await params,domain=await ownedDomain(user.id,id);
    const authCode=await getAuthCode(String(domain.name));
    await safeSendTemplateEmail(
      user.email,
      "rhoizos-auth-code-accessed",
      {DOMAIN:String(domain.name),SECURITY_URL:appUrl()+"/account/security"},
      "rhoizos:auth-code:"+id+":"+Date.now()
    );
    return ok({authCode});
  }catch(error){return fail(error);}
}
