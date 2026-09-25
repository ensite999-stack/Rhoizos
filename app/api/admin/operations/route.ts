import {requireAdmin} from "@/lib/admin-auth";
import {db} from "@/lib/db";
import {fail,ok} from "@/lib/http";

export const runtime="nodejs";

export async function GET(){
  try{
    await requireAdmin();
    const rows=await db()`
      select p.id,p.kind,p.status,p.provider_operation_id,p.last_error,p.updated_at,
        o.domain,o.status as order_status,o.payment_status
      from operations p
      join orders o on o.id=p.order_id
      order by p.updated_at desc
      limit 500
    `;
    return ok({items:rows});
  }catch(error){return fail(error);}
}
