import {destroyAllSessions,hashPassword,requireUser,verifyPassword} from "@/lib/auth";
import {db} from "@/lib/db";
import {fail,ok} from "@/lib/http";
export const runtime="nodejs";

export async function POST(request:Request){
  try{
    const user=await requireUser();
    const body=await request.json() as {currentPassword?:string;newPassword?:string};
    const rows=await db()`select password_hash from users where id=${user.id} limit 1`;
    if(!rows[0]||!verifyPassword(String(body.currentPassword||""),String(rows[0].password_hash))) throw new Error("Current password is incorrect.");
    const next=hashPassword(String(body.newPassword||""));
    await db()`update users set password_hash=${next},updated_at=now() where id=${user.id}`;
    return ok({saved:true});
  }catch(error){return fail(error);}
}

export async function DELETE(){
  try{
    const user=await requireUser();
    await destroyAllSessions(user.id);
    return ok({signedOut:true});
  }catch(error){return fail(error);}
}
