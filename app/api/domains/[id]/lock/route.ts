import {requireRecentAuth,requireUser} from "@/lib/auth";
import {ownedDomain} from "@/lib/dns";
import {db} from "@/lib/db";
import {fail,ok} from "@/lib/http";
import {namesiloSetTransferLock} from "@/lib/namesilo";

export const runtime="nodejs";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const user=await requireUser();requireRecentAuth(user);
    const {id}=await params,body=await request.json() as {locked?:boolean};
    const domain=await ownedDomain(user.id,id);
    const locked=Boolean(body.locked);
    await namesiloSetTransferLock(String(domain.name),locked);
    await db()`update domains set transfer_locked=${locked},updated_at=now() where id=${id} and user_id=${user.id}`;
    return ok({locked});
  }catch(error){return fail(error);}
}
