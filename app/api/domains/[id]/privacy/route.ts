import {requireUser} from "@/lib/auth";
import {ownedDomain} from "@/lib/dns";
import {fail,ok} from "@/lib/http";
import {domainDetails,setDomainPrivacy} from "@/lib/spaceship";

export const runtime="nodejs";

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const user=await requireUser();
    const {id}=await params;
    const body=await request.json() as {enabled?:boolean};
    const domain=await ownedDomain(user.id,id);
    const enabled=Boolean(body.enabled);

    const details=await domainDetails(String(domain.name));
    if(!details.privacyProtection) throw new Error("Privacy protection is not available for this domain.");

    await setDomainPrivacy(String(domain.name),enabled);
    return ok({enabled});
  }catch(error){return fail(error);}
}
