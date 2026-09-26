import {requireUser} from "@/lib/auth";
import {db} from "@/lib/db";
import {fail,ok} from "@/lib/http";
import {namesiloDomainDetails} from "@/lib/namesilo";

export const runtime="nodejs";
export async function GET(){
  try{
    const user=await requireUser();
    const rows=await db()`select id,name,lifecycle_status,expires_at,transfer_locked from domains
      where user_id=${user.id} order by name asc`;
    const items=await Promise.all(rows.map(async row=>{
      try{
        const details=await namesiloDomainDetails(String(row.name));
        return {
          ...row,
          lifecycle_status:details.lifecycleStatus||row.lifecycle_status,
          expires_at:details.expirationDate||row.expires_at,
          transfer_locked:Boolean(details.eppStatuses?.includes("clientTransferProhibited")),
          privacy_supported:Boolean(details.privacyProtection),
          privacy_protected:details.privacyProtection?.level==="high"
        };
      }catch{
        return {...row,privacy_supported:false,privacy_protected:null};
      }
    }));
    return ok({items});
  }catch(error){return fail(error);}
}
