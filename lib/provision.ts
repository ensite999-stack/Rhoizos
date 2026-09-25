import {db} from "./db";
import {openSecret} from "./crypto";
import {liveRegistration} from "./env";
import {createContact,domainAvailability,domainDetails,spaceshipRequest} from "./spaceship";
import type {ContactInput} from "./domain";
import {retailFromCost} from "./pricing";

function contacts(id:string){return {registrant:id,admin:id,tech:id,billing:id};}

export async function startProvisioning(orderId:string){
  if(!liveRegistration()) throw new Error("Live registration is not enabled.");
  const sql=db();
  const rows=await sql`select id,user_id,kind,domain,status,payment_status,request from orders where id=${orderId} limit 1`;
  const order=rows[0];if(!order) throw new Error("Order not found.");
  if(order.payment_status!=="paid") throw new Error("Order is not paid.");

  const claim=await sql`insert into operations (order_id,kind,status) values (${orderId},${String(order.kind)},'submitting')
    on conflict (order_id) do nothing returning id`;
  if(!claim[0]) return;

  try{
    const domain=String(order.domain),kind=String(order.kind);
    let response:{body:unknown;headers:Headers};
    if(kind==="register"){
      const a=await domainAvailability(domain);
      if(!a.available) throw new Error("Domain is no longer available for registration.");
      if(a.registerPrice){
        const latest=await retailFromCost(a.registerPrice,"register");
        if(latest>Number(order.amount_usd)+0.009) throw new Error("The live premium price increased after payment. Manual review is required.");
      }
      const contact=(order.request as {contact:ContactInput}).contact;
      const contactId=await createContact(contact);
      response=await spaceshipRequest("POST",`/domains/${encodeURIComponent(domain)}`,{
        autoRenew:false,privacyProtection:{level:"high",userConsent:true},contacts:contacts(contactId),
        years:Number((order.request as {years?:number}).years||1)
      });
    }else if(kind==="transfer"){
      const req=order.request as {contact:ContactInput;authCode:string};
      const contactId=await createContact(req.contact);
      response=await spaceshipRequest("POST",`/domains/${encodeURIComponent(domain)}/transfer`,{
        autoRenew:false,privacyProtection:{level:"high",userConsent:true},contacts:contacts(contactId),
        authCode:openSecret(req.authCode)
      });
    }else{
      const details=await domainDetails(domain);
      if(details.lifecycleStatus!=="registered"||!details.expirationDate) throw new Error("Domain is not eligible for normal renewal.");
      response=await spaceshipRequest("POST",`/domains/${encodeURIComponent(domain)}/renew`,{
        years:Number((order.request as {years?:number}).years||1),currentExpirationDate:details.expirationDate
      });
    }
    const providerId=response.headers.get("spaceship-async-operationid");
    if(!providerId) throw new Error("Spaceship did not return an operation ID.");
    await sql`update operations set provider_operation_id=${providerId},status='pending',updated_at=now() where order_id=${orderId}`;
    await sql`update orders set status='provisioning',updated_at=now() where id=${orderId}`;
  }catch(error){
    const message=error instanceof Error?error.message.slice(0,500):"Provisioning failed.";
    await sql`update operations set last_error=${message},updated_at=now() where order_id=${orderId}`;
    await sql`update orders set status='manual_review',last_error=${message},updated_at=now() where id=${orderId}`;
    throw error;
  }
}

async function syncOwnedDomain(row:Record<string,unknown>){
  const details=await domainDetails(String(row.domain));
  if(String(row.kind)==="transfer"&&details.lifecycleStatus!=="registered") return false;
  await db()`
    insert into domains (user_id,name,registrar,lifecycle_status,expires_at,transfer_locked)
    values (
      ${String(row.user_id)},${String(row.domain)},'spaceship',
      ${String(details.lifecycleStatus||"registered")},${details.expirationDate||null},
      ${Boolean(details.eppStatuses?.includes("clientTransferProhibited"))}
    )
    on conflict (name) do update set user_id=excluded.user_id,lifecycle_status=excluded.lifecycle_status,
      expires_at=excluded.expires_at,transfer_locked=excluded.transfer_locked,updated_at=now()
  `;
  return true;
}
export async function reconcileOperation(operationId:string){
  const sql=db();
  const rows=await sql`
    select o.id as operation_id,o.order_id,o.status as operation_status,o.provider_operation_id,
      r.user_id,r.domain,r.kind,r.status as order_status
    from operations o join orders r on r.id=o.order_id where o.id=${operationId} limit 1
  `;
  const row=rows[0];if(!row) return;
  if(row.operation_status==="accepted"&&row.kind==="transfer"){
    if(await syncOwnedDomain(row)){
      await sql`update operations set status='success',updated_at=now() where id=${operationId}`;
      await sql`update orders set status='active',updated_at=now() where id=${String(row.order_id)}`;
    }
    return;
  }
  if(!row.provider_operation_id) return;
  const remote=await spaceshipRequest<{status?:string}>("GET",`/async-operations/${encodeURIComponent(String(row.provider_operation_id))}`);
  const status=String(remote.body.status||"pending");
  if(status==="failed"){
    await sql`update operations set status='failed',updated_at=now() where id=${operationId}`;
    await sql`update orders set status='failed',updated_at=now() where id=${String(row.order_id)}`;
    return;
  }
  if(status!=="success"){
    await sql`update operations set status=${status},updated_at=now() where id=${operationId}`;return;
  }
  if(row.kind==="transfer"&&!(await syncOwnedDomain(row))){
    await sql`update operations set status='accepted',updated_at=now() where id=${operationId}`;
    await sql`update orders set status='transferring',updated_at=now() where id=${String(row.order_id)}`;return;
  }
  await syncOwnedDomain(row);
  await sql`update operations set status='success',updated_at=now() where id=${operationId}`;
  await sql`update orders set status='active',updated_at=now() where id=${String(row.order_id)}`;
}
export async function reconcileAll(limit=50){
  const sql=db();
  const paid=await sql`select id from orders where payment_status='paid' and status='paid' order by updated_at asc limit ${limit}`;
  for(const row of paid){try{await startProvisioning(String(row.id));}catch{}}
  const ops=await sql`select id from operations where status in ('pending','accepted') order by updated_at asc limit ${limit}`;
  for(const row of ops){try{await reconcileOperation(String(row.id));}catch{}}
}
