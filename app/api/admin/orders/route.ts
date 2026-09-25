import {requireAdmin} from "@/lib/admin-auth";
import {db} from "@/lib/db";
import {fail,ok} from "@/lib/http";

export const runtime="nodejs";

export async function GET(){
  try{
    await requireAdmin();
    const rows=await db()`
      select o.id,o.kind,o.domain,o.amount_usd,o.status,o.payment_status,o.last_error,o.created_at,
        u.email as customer_email
      from orders o
      join users u on u.id=o.user_id
      order by o.created_at desc
      limit 500
    `;
    return ok({items:rows});
  }catch(error){return fail(error);}
}
