import {requiredEnv} from "@/lib/env";
import {reconcileAll} from "@/lib/provision";

export const runtime="nodejs";

export async function GET(request:Request){
  const expected=`Bearer ${requiredEnv("CRON_SECRET")}`;
  if(request.headers.get("authorization")!==expected) return new Response("Unauthorized",{status:401});
  await reconcileAll();
  return Response.json({ok:true});
}
