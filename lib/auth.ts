import {createHash,randomBytes,scryptSync,timingSafeEqual} from "node:crypto";
import {cookies} from "next/headers";
import {db} from "./db";

const COOKIE="rhoizos_session";

export type SessionUser={
  id:string;email:string;first_name:string;last_name:string;company:string|null;
  account_type:"individual"|"company";country:string;state:string;city:string;
  address1:string;postcode:string;phone:string;authenticated_at:Date;
};

function tokenHash(token:string){return createHash("sha256").update(token).digest("hex");}

export function hashPassword(password:string){
  if(password.length<12) throw new Error("Password must contain at least 12 characters.");
  const salt=randomBytes(16),digest=scryptSync(password,salt,64);
  return `scrypt$${salt.toString("hex")}$${digest.toString("hex")}`;
}
export function verifyPassword(password:string,encoded:string){
  const [kind,saltText,digestText]=encoded.split("$");
  if(kind!=="scrypt"||!saltText||!digestText) return false;
  const expected=Buffer.from(digestText,"hex");
  const actual=scryptSync(password,Buffer.from(saltText,"hex"),expected.length);
  return expected.length===actual.length&&timingSafeEqual(expected,actual);
}
export async function createSession(userId:string){
  const token=randomBytes(32).toString("base64url");
  await db()`insert into sessions (user_id,token_hash,expires_at,authenticated_at)
    values (${userId},${tokenHash(token)},now()+interval '30 days',now())`;
  (await cookies()).set(COOKIE,token,{
    httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:60*60*24*30
  });
}
export async function currentUser():Promise<SessionUser|null>{
  const token=(await cookies()).get(COOKIE)?.value;
  if(!token) return null;
  const rows=await db()`
    select u.id,u.email,u.first_name,u.last_name,u.company,u.account_type,u.country,u.state,u.city,
      u.address1,u.postcode,u.phone,s.authenticated_at
    from sessions s join users u on u.id=s.user_id
    where s.token_hash=${tokenHash(token)} and s.expires_at>now() and u.active=true limit 1
  `;
  return (rows[0] as unknown as SessionUser)||null;
}
export async function requireUser(){
  const user=await currentUser();
  if(!user) throw new Error("AUTH_REQUIRED");
  return user;
}
export function requireRecentAuth(user:SessionUser,seconds=600){
  if(Date.now()-new Date(user.authenticated_at).getTime()>seconds*1000) throw new Error("RECENT_AUTH_REQUIRED");
}
export async function destroySession(){
  const store=await cookies(),token=store.get(COOKIE)?.value;
  if(token) await db()`delete from sessions where token_hash=${tokenHash(token)}`;
  store.set(COOKIE,"",{path:"/",maxAge:0});
}
export async function destroyAllSessions(userId:string){
  await db()`delete from sessions where user_id=${userId}`;
  (await cookies()).set(COOKIE,"",{path:"/",maxAge:0});
}
