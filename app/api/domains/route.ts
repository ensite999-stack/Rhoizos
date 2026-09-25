import {requireUser} from "@/lib/auth";
import {db} from "@/lib/db";
import {fail,ok} from "@/lib/http";

export const runtime="nodejs";
export async function GET(){
  try{
    const user=await requireUser();
    const rows=await db()`select id,name,lifecycle_status,expires_at,transfer_locked from domains
      where user_id=${user.id} order by name asc`;
    return ok({items:rows});
  }catch(error){return fail(error);}
}
