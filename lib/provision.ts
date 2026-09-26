import {db} from "./db";
import {openSecret} from "./crypto";
import {appUrl,liveRegistration} from "./env";
import {
  namesiloAvailability,
  namesiloDomainDetails,
  namesiloRegisterDomain,
  namesiloRenewDomain,
  namesiloStandardCost,
  namesiloTransferDomain,
  namesiloTransferStatus
} from "./namesilo";
import type {ContactInput} from "./domain";
import {retailFromCost} from "./pricing";
import {safeSendUserTemplate,sendExpiryReminders} from "./email";

async function syncOwnedDomain(row:Record<string,unknown>){
  let details;
  try{
    details=await namesiloDomainDetails(String(row.domain));
  }catch(error){
    if(String(row.kind)==="transfer")return false;
    throw error;
  }
  if(String(row.kind)==="transfer"&&details.lifecycleStatus!=="registered")return false;
  await db()`
    insert into domains (user_id,name,registrar,lifecycle_status,expires_at,transfer_locked)
    values (
      ${String(row.user_id)},${String(row.domain)},'namesilo',
      ${String(details.lifecycleStatus||"registered")},${details.expirationDate||null},
      ${Boolean(details.eppStatuses.includes("clientTransferProhibited"))}
    )
    on conflict (name) do update set
      user_id=excluded.user_id,registrar='namesilo',lifecycle_status=excluded.lifecycle_status,
      expires_at=excluded.expires_at,transfer_locked=excluded.transfer_locked,updated_at=now()
  `;
  return true;
}

async function notifyCompleted(row:Record<string,unknown>){
  const kind=String(row.kind),domain=String(row.domain),orderId=String(row.order_id),userId=String(row.user_id);
  if(kind==="register"){
    await safeSendUserTemplate(
      userId,
      "rhoizos-registration-complete",
      {DOMAIN:domain,DOMAIN_URL:appUrl()+"/domains"},
      "rhoizos:registration-complete:"+orderId
    );
    return;
  }
  if(kind==="transfer"){
    await safeSendUserTemplate(
      userId,
      "rhoizos-transfer-complete",
      {DOMAIN:domain,DOMAIN_URL:appUrl()+"/domains"},
      "rhoizos:transfer-complete:"+orderId
    );
    return;
  }
  const details=await namesiloDomainDetails(domain);
  await safeSendUserTemplate(
    userId,
    "rhoizos-renewal-complete",
    {
      DOMAIN:domain,
      EXPIRES_AT:details.expirationDate?new Date(details.expirationDate).toISOString().slice(0,10):"Updated",
      DOMAIN_URL:appUrl()+"/domains"
    },
    "rhoizos:renewal-complete:"+orderId
  );
}

async function markSuccess(orderId:string,row:Record<string,unknown>){
  await db()`update operations set status='success',updated_at=now() where order_id=${orderId}`;
  await db()`update orders set status='active',updated_at=now() where id=${orderId}`;
  await notifyCompleted({...row,order_id:orderId});
}

export async function startProvisioning(orderId:string){
  if(!liveRegistration()) throw new Error("Live registration is not enabled.");
  const sql=db();
  const rows=await sql`select id,user_id,kind,domain,amount_usd,status,payment_status,request from orders where id=${orderId} limit 1`;
  const order=rows[0];if(!order) throw new Error("Order not found.");
  if(order.payment_status!=="paid") throw new Error("Order is not paid.");

  const claim=await sql`insert into operations (order_id,kind,status) values (${orderId},${String(order.kind)},'submitting')
    on conflict (order_id) do nothing returning id`;
  if(!claim[0]) return;

  try{
    const domain=String(order.domain),kind=String(order.kind);
    const row={...order,order_id:orderId};

    if(kind==="register"){
      const [a]=await namesiloAvailability([domain]);
      if(!a.available) throw new Error("Domain is no longer available for registration.");
      const providerCost=a.quotedPrice??(a.premium?null:await namesiloStandardCost(domain,"register"));
      if(!providerCost) throw new Error("Current premium pricing is unavailable. Manual review is required.");
      const latest=await retailFromCost(providerCost,"register");
      if(latest>Number(order.amount_usd)+0.009) throw new Error("The live registration price increased after payment. Manual review is required.");

      const request=order.request as {contact:ContactInput;years?:number};
      await namesiloRegisterDomain({domain,years:Number(request.years||1),contact:request.contact,cost:providerCost});
      await syncOwnedDomain(row);
      await sql`update operations set provider_operation_id=${"namesilo-register:"+domain} where order_id=${orderId}`;
      await markSuccess(orderId,row);
      return;
    }

    if(kind==="transfer"){
      const providerCost=await namesiloStandardCost(domain,"transfer");
      const latest=await retailFromCost(providerCost,"transfer");
      if(latest>Number(order.amount_usd)+0.009) throw new Error("The live transfer price increased after payment. Manual review is required.");

      const request=order.request as {contact:ContactInput;authCode:string};
      await namesiloTransferDomain({
        domain,
        authCode:openSecret(request.authCode),
        contact:request.contact,
        cost:providerCost
      });
      await sql`update operations set provider_operation_id=${"namesilo-transfer:"+domain},status='pending',updated_at=now() where order_id=${orderId}`;
      await sql`update orders set status='transferring',updated_at=now() where id=${orderId}`;
      await safeSendUserTemplate(
        String(order.user_id),
        "rhoizos-transfer-started",
        {DOMAIN:domain,ORDER_ID:orderId,ACTIVITY_URL:appUrl()+"/account/activity"},
        "rhoizos:transfer-started:"+orderId
      );
      return;
    }

    const details=await namesiloDomainDetails(domain);
    if(details.lifecycleStatus!=="registered"||!details.expirationDate){
      throw new Error("Domain is outside the normal renewal path. Contact support.");
    }
    const providerCost=await namesiloStandardCost(domain,"renew");
    const latest=await retailFromCost(providerCost,"renew");
    if(latest>Number(order.amount_usd)+0.009) throw new Error("The live renewal price increased after payment. Manual review is required.");

    await namesiloRenewDomain({
      domain,
      years:Number((order.request as {years?:number}).years||1),
      cost:providerCost
    });
    await syncOwnedDomain(row);
    await sql`update operations set provider_operation_id=${"namesilo-renew:"+domain} where order_id=${orderId}`;
    await markSuccess(orderId,row);
  }catch(error){
    const message=error instanceof Error?error.message.slice(0,500):"Provisioning failed.";
    await sql`update operations set last_error=${message},updated_at=now() where order_id=${orderId}`;
    await sql`update orders set status='manual_review',last_error=${message},updated_at=now() where id=${orderId}`;
    const kind=String(order.kind),domain=String(order.domain);
    await safeSendUserTemplate(
      String(order.user_id),
      kind==="register"?"rhoizos-registration-review":"rhoizos-operation-review",
      kind==="register"
        ?{DOMAIN:domain,ORDER_ID:orderId,SUPPORT_URL:appUrl()+"/support"}
        :{DOMAIN:domain,ORDER_ID:orderId,ORDER_KIND:kind,SUPPORT_URL:appUrl()+"/support"},
      "rhoizos:manual-review:"+orderId
    );
    throw error;
  }
}

function transferState(status:string){
  const value=status.trim().toLowerCase();
  if(/complete|completed|success/.test(value))return "success";
  if(/fail|cancel|reject|denied|error/.test(value))return "failed";
  return "pending";
}

export async function reconcileOperation(operationId:string){
  const sql=db();
  const rows=await sql`
    select o.id as operation_id,o.order_id,o.status as operation_status,o.provider_operation_id,
      r.user_id,r.domain,r.kind,r.status as order_status
    from operations o join orders r on r.id=o.order_id where o.id=${operationId} limit 1
  `;
  const row=rows[0];if(!row) return;
  if(String(row.kind)!=="transfer"||!row.provider_operation_id)return;

  const remote=await namesiloTransferStatus(String(row.domain));
  const status=transferState(remote.status);
  if(status==="failed"){
    const message=(remote.message||"NameSilo transfer failed.").slice(0,500);
    await sql`update operations set status='failed',last_error=${message},updated_at=now() where id=${operationId}`;
    await sql`update orders set status='failed',last_error=${message},updated_at=now() where id=${String(row.order_id)}`;
    await safeSendUserTemplate(
      String(row.user_id),
      "rhoizos-operation-review",
      {
        DOMAIN:String(row.domain),
        ORDER_ID:String(row.order_id),
        ORDER_KIND:String(row.kind),
        SUPPORT_URL:appUrl()+"/support"
      },
      "rhoizos:operation-failed:"+String(row.order_id)
    );
    return;
  }
  if(status!=="success"){
    await sql`update operations set status='pending',updated_at=now() where id=${operationId}`;
    return;
  }
  if(!(await syncOwnedDomain(row))){
    await sql`update operations set status='pending',updated_at=now() where id=${operationId}`;
    return;
  }
  await sql`update operations set status='success',updated_at=now() where id=${operationId}`;
  await sql`update orders set status='active',updated_at=now() where id=${String(row.order_id)}`;
  await notifyCompleted(row);
}

export async function reconcileAll(limit=50){
  const sql=db();
  const paid=await sql`select id from orders where payment_status='paid' and status='paid' order by updated_at asc limit ${limit}`;
  for(const row of paid){try{await startProvisioning(String(row.id));}catch{}}
  const ops=await sql`select id from operations where status='pending' order by updated_at asc limit ${limit}`;
  for(const row of ops){try{await reconcileOperation(String(row.id));}catch{}}
  try{await sendExpiryReminders();}catch(error){console.error("Expiry reminder scan failed",error);}
}
