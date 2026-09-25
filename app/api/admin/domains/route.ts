import {requireAdmin} from "@/lib/admin-auth";
import {db} from "@/lib/db";
import {fail,ok} from "@/lib/http";

export const runtime="nodejs";

export async function GET(){
  try{
    await requireAdmin();
    const rows=await db()`
      select d.id,d.name,d.lifecycle_status,d.expires_at,d.transfer_locked,d.updated_at,
        u.email as owner_email
      from domains d
      join users u on u.id=d.user_id
      order by d.updated_at desc
      limit 500
    `;
    return ok({items:rows});
  }catch(error){return fail(error);}
}
