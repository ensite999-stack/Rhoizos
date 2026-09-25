import {requireUser} from "@/lib/auth";
import {db} from "@/lib/db";
import {fail,ok} from "@/lib/http";
export const runtime="nodejs";
export async function GET(){
  try{
    const user=await requireUser();
    const rows=await db()`
      select o.id,o.kind,o.status,o.last_error,o.created_at,o.updated_at,r.domain,r.payment_status
      from operations o join orders r on r.id=o.order_id
      where r.user_id=${user.id}
      order by o.updated_at desc limit 100
    `;
    return ok({items:rows});
  }catch(error){return fail(error);}
}
