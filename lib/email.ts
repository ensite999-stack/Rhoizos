import {db} from "./db";
import {appUrl,requiredEnv} from "./env";

export type TemplateVariables=Record<string,string|number>;

export async function sendTemplateEmail(
  to:string,
  template:string,
  variables:TemplateVariables,
  idempotencyKey?:string
){
  const response=await fetch("https://api.resend.com/emails",{
    method:"POST",
    headers:{
      Authorization:"Bearer "+requiredEnv("RESEND_API_KEY"),
      "Content-Type":"application/json",
      ...(idempotencyKey?{"Idempotency-Key":idempotencyKey}:{})
    },
    body:JSON.stringify({
      from:requiredEnv("RHOIZOS_EMAIL_FROM"),
      to:[to],
      template:{id:template,variables}
    }),
    signal:AbortSignal.timeout(15000)
  });

  if(!response.ok){
    const providerBody=await response.text().catch(()=>"");
    console.error("Resend template send failed",{
      template,
      status:response.status,
      providerBody:providerBody.slice(0,500)
    });
    throw new Error("Transactional email could not be sent.");
  }
}

export async function safeSendTemplateEmail(
  to:string,
  template:string,
  variables:TemplateVariables,
  idempotencyKey?:string
){
  try{
    await sendTemplateEmail(to,template,variables,idempotencyKey);
    return true;
  }catch(error){
    console.error("Transactional email notification failed",template,error);
    return false;
  }
}

export async function safeSendUserTemplate(
  userId:string,
  template:string,
  variables:TemplateVariables,
  idempotencyKey?:string
){
  try{
    const rows=await db()`select email from users where id=${userId} and active=true limit 1`;
    if(!rows[0]?.email)return false;
    return await safeSendTemplateEmail(String(rows[0].email),template,variables,idempotencyKey);
  }catch(error){
    console.error("Could not resolve email recipient",template,error);
    return false;
  }
}

export async function sendExpiryReminders(){
  const rows=await db()`
    select d.id,d.user_id,d.name,d.expires_at,u.email
    from domains d
    join users u on u.id=d.user_id
    where d.expires_at is not null
      and d.expires_at>now()
      and d.expires_at<=now()+interval '31 days'
      and u.active=true
    order by d.expires_at asc
  `;

  const now=Date.now();
  for(const row of rows){
    const expires=new Date(row.expires_at as string|Date);
    const days=Math.max(1,Math.ceil((expires.getTime()-now)/86400000));
    const threshold=days<=1?1:days<=7?7:days<=30?30:null;
    if(!threshold)continue;

    const notificationKey=[
      "expiry",
      String(row.id),
      expires.toISOString(),
      String(threshold)
    ].join(":");

    const claim=await db()`
      insert into email_notifications (notification_key,user_id,domain_id,kind)
      values (${notificationKey},${String(row.user_id)},${String(row.id)},'expiry_reminder')
      on conflict (notification_key) do nothing
      returning id
    `;
    if(!claim[0])continue;

    try{
      await sendTemplateEmail(
        String(row.email),
        "rhoizos-domain-expiry-reminder",
        {
          DOMAIN:String(row.name),
          DAYS_LEFT:days,
          EXPIRES_AT:expires.toISOString().slice(0,10),
          RENEW_URL:appUrl()+"/domains"
        },
        "rhoizos:"+notificationKey
      );
    }catch(error){
      await db()`delete from email_notifications where id=${String(claim[0].id)}`;
      console.error("Expiry reminder failed",row.id,error);
    }
  }
}
