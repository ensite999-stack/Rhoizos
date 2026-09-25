import {audit,requireAdmin} from "@/lib/admin-auth";
import {db} from "@/lib/db";
import {fail,ok} from "@/lib/http";

export const runtime="nodejs";

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const admin=await requireAdmin();
    const {id}=await params;
    const body=await request.json() as {active?:boolean};
    const active=Boolean(body.active);
    const rows=await db()`
      update users set active=${active},updated_at=now()
      where id=${id}
      returning id,email,active
    `;
    if(!rows[0]) throw new Error("User not found.");
    if(!active) await db()`delete from sessions where user_id=${id}`;
    await audit(admin.id,active?"user.enable":"user.disable","user",id,{email:rows[0].email});
    return ok({user:rows[0]});
  }catch(error){return fail(error);}
}
