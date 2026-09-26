import {processDropcatchBatch} from "@/lib/dropcatch";
import {requiredEnv} from "@/lib/env";

export const runtime="nodejs";

export async function GET(request:Request){
  const expected=`Bearer ${requiredEnv("CRON_SECRET")}`;
  if(request.headers.get("authorization")!==expected)return new Response("Unauthorized",{status:401});
  return Response.json(await processDropcatchBatch());
}
