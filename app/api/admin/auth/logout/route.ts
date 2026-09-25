import {destroyAdminSession} from "@/lib/admin-auth";
import {ok} from "@/lib/http";

export const runtime="nodejs";

export async function POST(){
  await destroyAdminSession();
  return ok({ok:true});
}
