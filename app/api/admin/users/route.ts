import {requireAdmin} from "@/lib/admin-auth";
import {db} from "@/lib/db";
import {fail,ok} from "@/lib/http";

export const runtime="nodejs";

export async function GET(){
  try{
    await requireAdmin();
    const rows=await db()`
      select u.id,u.email,u.first_name,u.last_name,u.company,u.country,u.created_at,
        count(distinct d.id)::int as domain_count,
        count(distinct o.id)::int as order_count
      from users u
      left join domains d on d.user_id=u.id
      left join orders o on o.user_id=u.id
      group by u.id
      order by u.created_at desc
      limit 500
    `;
    return ok({items:rows});
  }catch(error){return fail(error);}
}
