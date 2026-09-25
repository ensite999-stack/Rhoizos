import {requireAdmin} from "@/lib/admin-auth";
import {db} from "@/lib/db";
import {fail,ok} from "@/lib/http";

export const runtime="nodejs";

export async function GET(){
  try{
    await requireAdmin();
    const sql=db();
    const [users,domains,orders,review,operations]=await Promise.all([
      sql`select count(*)::int as count from users`,
      sql`select count(*)::int as count from domains`,
      sql`select count(*)::int as count from orders`,
      sql`select count(*)::int as count from orders where status in ('manual_review','payment_review','failed')`,
      sql`select count(*)::int as count from operations where status in ('pending','accepted','failed')`
    ]);
    return ok({
      users:Number(users[0]?.count||0),
      domains:Number(domains[0]?.count||0),
      orders:Number(orders[0]?.count||0),
      needsAttention:Number(review[0]?.count||0),
      openOperations:Number(operations[0]?.count||0)
    });
  }catch(error){return fail(error);}
}
