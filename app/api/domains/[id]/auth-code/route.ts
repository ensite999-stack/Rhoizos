import {requireRecentAuth,requireUser} from "@/lib/auth";
import {ownedDomain} from "@/lib/dns";
import {fail,ok} from "@/lib/http";
import {getAuthCode} from "@/lib/spaceship";

export const runtime="nodejs";
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const user=await requireUser();requireRecentAuth(user);
    const {id}=await params,domain=await ownedDomain(user.id,id);
    return ok({authCode:await getAuthCode(String(domain.name))});
  }catch(error){return fail(error);}
}
