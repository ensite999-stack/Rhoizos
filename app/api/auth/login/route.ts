import {db} from "@/lib/db";
import {createSession,verifyPassword} from "@/lib/auth";
import {fail,ok} from "@/lib/http";

export const runtime="nodejs";

export async function POST(request:Request){
  try{
    const body=await request.json() as {email?:string;password?:string};
    const email=String(body.email||"").trim().toLowerCase();
    const password=String(body.password||"");
    const rows=await db()`select id,password_hash,active from users where email=${email} limit 1`;
    const user=rows[0];
    if(!user||!user.active||!verifyPassword(password,String(user.password_hash))) throw new Error("Invalid email or password.");
    await createSession(String(user.id));
    return ok({authenticated:true});
  }catch(error){return fail(error);}
}
