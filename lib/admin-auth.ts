import {createHash,randomBytes,timingSafeEqual} from "node:crypto";
import {cookies} from "next/headers";
import {db} from "./db";
import {hashPassword,verifyPassword} from "./auth";

const ADMIN_COOKIE="rhoizos_admin_session";

export type AdminUser={
  id:string;
  email:string;
  display_name:string;
  active:boolean;
};

function tokenHash(token:string){
  return createHash("sha256").update(token).digest("hex");
}

function secureTextEqual(left:string,right:string){
  const a=Buffer.from(left);
  const b=Buffer.from(right);
  return a.length===b.length&&timingSafeEqual(a,b);
}

async function provisionConfiguredAdmin(email:string,password:string){
  const configuredEmail=process.env.RHOIZOS_ADMIN_EMAIL?.trim().toLowerCase();
  const configuredPassword=process.env.RHOIZOS_ADMIN_PASSWORD||"";
  if(!configuredEmail||!configuredPassword) return;
  if(!secureTextEqual(email,configuredEmail)||!secureTextEqual(password,configuredPassword)) return;

  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(configuredEmail)){
    throw new Error("Configured administrator email is invalid.");
  }

  const rows=await db()`
    select id,password_hash,active
    from admin_users
    where email=${configuredEmail}
    limit 1
  `;
  const row=rows[0];

  if(!row){
    const created=await db()`
      insert into admin_users (email,password_hash,display_name,active)
      values (${configuredEmail},${hashPassword(configuredPassword)},${"Administrator"},true)
      returning id
    `;
    const adminId=String(created[0].id);
    await audit(adminId,"admin.bootstrap.env","admin_user",adminId,{email:configuredEmail});
    return;
  }

  const passwordChanged=!verifyPassword(configuredPassword,String(row.password_hash));
  const reactivated=!Boolean(row.active);
  if(passwordChanged||reactivated){
    const nextHash=passwordChanged?hashPassword(configuredPassword):String(row.password_hash);
    await db()`
      update admin_users
      set password_hash=${nextHash},active=true
      where id=${String(row.id)}
    `;
    await audit(String(row.id),"admin.sync.env","admin_user",String(row.id),{
      email:configuredEmail,
      passwordUpdated:passwordChanged,
      reactivated
    });
  }
}

export async function createAdminSession(adminId:string){
  const token=randomBytes(32).toString("base64url");
  await db()`
    insert into admin_sessions (admin_user_id,token_hash,expires_at)
    values (${adminId},${tokenHash(token)},now()+interval '12 hours')
  `;
  (await cookies()).set(ADMIN_COOKIE,token,{
    httpOnly:true,
    secure:process.env.NODE_ENV==="production",
    sameSite:"strict",
    path:"/",
    maxAge:60*60*12
  });
}

export async function currentAdmin():Promise<AdminUser|null>{
  const token=(await cookies()).get(ADMIN_COOKIE)?.value;
  if(!token) return null;
  const rows=await db()`
    select a.id,a.email,a.display_name,a.active
    from admin_sessions s
    join admin_users a on a.id=s.admin_user_id
    where s.token_hash=${tokenHash(token)}
      and s.expires_at>now()
      and a.active=true
    limit 1
  `;
  if(!rows[0]) return null;
  await db()`update admin_sessions set last_seen_at=now() where token_hash=${tokenHash(token)}`;
  return rows[0] as unknown as AdminUser;
}

export async function requireAdmin(){
  const admin=await currentAdmin();
  if(!admin) throw new Error("ADMIN_REQUIRED");
  return admin;
}

export async function destroyAdminSession(){
  const store=await cookies();
  const token=store.get(ADMIN_COOKIE)?.value;
  if(token) await db()`delete from admin_sessions where token_hash=${tokenHash(token)}`;
  store.set(ADMIN_COOKIE,"",{path:"/",maxAge:0});
}

export async function loginAdmin(email:string,password:string){
  const normalizedEmail=email.trim().toLowerCase();
  await provisionConfiguredAdmin(normalizedEmail,password);
  const rows=await db()`
    select id,email,display_name,password_hash,active
    from admin_users
    where email=${normalizedEmail}
    limit 1
  `;

  const row=rows[0];
  if(!row||!row.active||!verifyPassword(password,String(row.password_hash))){
    throw new Error("Invalid administrator credentials.");
  }
  await createAdminSession(String(row.id));
  await audit(String(row.id),"admin.login","admin_user",String(row.id),{});
}

export async function bootstrapAdmin(input:{email:string;password:string;displayName?:string;token:string}){
  const expected=process.env.RHOIZOS_ADMIN_BOOTSTRAP_TOKEN?.trim();
  if(!expected) throw new Error("Admin bootstrap is disabled.");

  if(!secureTextEqual(input.token,expected)) throw new Error("Invalid bootstrap token.");

  const existing=await db()`select count(*)::int as count from admin_users`;
  if(Number(existing[0]?.count||0)>0) throw new Error("Administrator bootstrap has already been completed.");

  const email=input.email.trim().toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid administrator email.");

  const rows=await db()`
    insert into admin_users (email,password_hash,display_name)
    values (${email},${hashPassword(input.password)},${input.displayName?.trim()||"Administrator"})
    returning id,email,display_name
  `;
  const adminId=String(rows[0].id);
  await audit(adminId,"admin.bootstrap","admin_user",adminId,{email});
  return rows[0];
}

export async function audit(
  adminId:string,
  action:string,
  targetType?:string,
  targetId?:string,
  details:Record<string,unknown>={}
){
  await db()`
    insert into admin_audit_log (admin_user_id,action,target_type,target_id,details)
    values (${adminId},${action},${targetType||null},${targetId||null},${JSON.stringify(details)}::jsonb)
  `;
}
