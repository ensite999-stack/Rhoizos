import {bootstrapAdmin} from "@/lib/admin-auth";
import {fail,ok} from "@/lib/http";

export const runtime="nodejs";

export async function POST(request:Request){
  try{
    const body=await request.json() as {email?:string;password?:string;displayName?:string;token?:string};
    const admin=await bootstrapAdmin({
      email:String(body.email||""),
      password:String(body.password||""),
      displayName:String(body.displayName||""),
      token:String(body.token||"")
    });
    return ok({created:true,admin:{email:admin.email,displayName:admin.display_name}},201);
  }catch(error){return fail(error);}
}
