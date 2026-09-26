import {requireUser} from "@/lib/auth";
import {createDropcatchRequest,dropcatchWindowOpen,listDropcatchRequests} from "@/lib/dropcatch";
import {fail,ok} from "@/lib/http";

export const runtime="nodejs";

export async function GET(){
  try{
    const user=await requireUser();
    return ok({items:await listDropcatchRequests(user.id),windowOpen:dropcatchWindowOpen()});
  }catch(error){return fail(error);}
}

export async function POST(request:Request){
  try{
    const user=await requireUser();
    const body=await request.json() as {domain?:string;years?:number;private?:boolean;autoRenew?:boolean};
    const id=await createDropcatchRequest(user.id,String(body.domain||""),{
      years:body.years,
      private:body.private,
      autoRenew:body.autoRenew
    });
    return ok({id},201);
  }catch(error){return fail(error);}
}
