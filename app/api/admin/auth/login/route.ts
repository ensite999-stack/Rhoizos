import {loginAdmin} from "@/lib/admin-auth";
import {fail,ok} from "@/lib/http";

export const runtime="nodejs";

export async function POST(request:Request){
  try{
    const body=await request.json() as {email?:string;password?:string};
    await loginAdmin(String(body.email||""),String(body.password||""));
    return ok({authenticated:true});
  }catch(error){return fail(error);}
}
