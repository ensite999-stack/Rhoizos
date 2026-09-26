import {db} from "./db";

export async function requireOwnedDomain(userId:string,domainId:string){
  const rows=await db()`
    select id,user_id,name,lifecycle_status,expires_at,transfer_locked
    from domains
    where id=${domainId} and user_id=${userId}
    limit 1
  `;
  if(!rows[0])throw new Error("Domain not found.");
  return rows[0];
}
