import {requireUser} from "@/lib/auth";
import {db} from "@/lib/db";
import {fail,ok} from "@/lib/http";
export const runtime="nodejs";
export async function GET(){
  try{
    const user=await requireUser();
    const rows=await db()`
      select id,kind,domain,amount_usd,status,payment_status,created_at,updated_at
      from orders where user_id=${user.id} order by created_at desc limit 100
    `;
    return ok({items:rows});
  }catch(error){return fail(error);}
}
