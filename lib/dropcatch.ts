import {randomUUID} from "node:crypto";
import {db} from "./db";
import {normalizeDomain} from "./domain";
import {liveDropcatch,livePayments} from "./env";
import {namesiloDomainDetails,namesiloRegisterDomainDrop,namesiloStandardCost} from "./namesilo";
import {retailFromCost} from "./pricing";
import {createCheckout} from "./orders";

export type DropcatchStatus=
  |"pending"|"processing"|"caught"|"awaiting_payment"|"completed"|"failed"|"cancelled";

function dropWindow(){
  const parts=new Intl.DateTimeFormat("en-US",{
    timeZone:"America/Los_Angeles",
    hour:"2-digit",
    minute:"2-digit",
    hourCycle:"h23"
  }).formatToParts(new Date());
  const hour=Number(parts.find(part=>part.type==="hour")?.value||0);
  const minute=Number(parts.find(part=>part.type==="minute")?.value||0);
  const total=hour*60+minute;
  return total>=10*60+45&&total<=12*60+15;
}

export function dropcatchWindowOpen(){
  return dropWindow();
}

export async function listDropcatchRequests(userId:string){
  return db()`
    select r.id,r.domain,r.years,r.private,r.auto_renew,r.status,r.last_error,
      r.attempts,r.last_attempt_at,r.caught_at,r.order_id,r.created_at,
      o.amount_usd,o.payment_status,o.checkout_url
    from dropcatch_requests r
    left join orders o on o.id=r.order_id
    where r.user_id=${userId}
    order by r.created_at desc
  `;
}

export async function createDropcatchRequest(
  userId:string,
  domainInput:string,
  options:{years?:number;private?:boolean;autoRenew?:boolean}={}
){
  const domain=normalizeDomain(domainInput);
  const years=Math.max(1,Math.min(10,Math.trunc(Number(options.years)||1)));

  const existing=await db()`
    select id,status from dropcatch_requests
    where user_id=${userId} and domain=${domain}
    limit 1
  `;
  if(existing[0]&&!["failed","cancelled"].includes(String(existing[0].status))){
    throw new Error("You already have an active drop-catch request for this domain.");
  }

  if(existing[0]){
    await db()`
      update dropcatch_requests set
        years=${years},private=${options.private!==false},auto_renew=${Boolean(options.autoRenew)},
        status='pending',last_error=null,provider_order_amount=null,attempts=0,last_attempt_at=null,
        caught_at=null,order_id=null,updated_at=now()
      where id=${String(existing[0].id)}
    `;
    return String(existing[0].id);
  }

  const rows=await db()`
    insert into dropcatch_requests (user_id,domain,years,private,auto_renew)
    values (${userId},${domain},${years},${options.private!==false},${Boolean(options.autoRenew)})
    returning id
  `;
  return String(rows[0].id);
}

export async function cancelDropcatchRequest(userId:string,id:string){
  const rows=await db()`
    update dropcatch_requests
    set status='cancelled',updated_at=now()
    where id=${id} and user_id=${userId} and status in ('pending','failed')
    returning id
  `;
  if(!rows[0])throw new Error("This drop-catch request can no longer be cancelled.");
}

async function createClaimOrder(row:Record<string,unknown>,providerCost:number){
  const amount=await retailFromCost(providerCost,"register");
  const orderId=randomUUID();

  await db().begin(async tx=>{
    await tx`
      insert into orders (id,user_id,kind,domain,amount_usd,status,payment_status,request)
      values (
        ${orderId},${String(row.user_id)},'dropcatch',${String(row.domain)},${amount},
        'awaiting_payment','new',
        ${JSON.stringify({
          dropcatchRequestId:String(row.id),
          providerCost,
          years:Number(row.years||1)
        })}::jsonb
      )
    `;
    await tx`
      update dropcatch_requests set
        status='caught',provider_order_amount=${providerCost},caught_at=now(),
        order_id=${orderId},last_error=null,updated_at=now()
      where id=${String(row.id)}
    `;
  });

  if(livePayments()){
    try{
      await createCheckout(orderId,String(row.user_id));
      await db()`update dropcatch_requests set status='awaiting_payment',updated_at=now() where id=${String(row.id)}`;
    }catch(error){
      await db()`
        update dropcatch_requests
        set last_error=${error instanceof Error?error.message.slice(0,500):"Checkout creation failed."},updated_at=now()
        where id=${String(row.id)}
      `;
    }
  }
}

async function processOne(id:string){
  const claimed=await db()`
    update dropcatch_requests
    set status='processing',attempts=attempts+1,last_attempt_at=now(),updated_at=now()
    where id=${id} and status='pending'
    returning *
  `;
  const row=claimed[0];
  if(!row)return;

  try{
    const result=await namesiloRegisterDomainDrop({
      domain:String(row.domain),
      years:Number(row.years||1),
      private:Boolean(row.private),
      autoRenew:Boolean(row.auto_renew)
    });
    const providerCost=result.orderAmount??await namesiloStandardCost(String(row.domain),"register");
    await createClaimOrder(row,providerCost);
  }catch(error){
    const message=error instanceof Error?error.message.slice(0,500):"Drop-catch attempt failed.";
    await db()`
      update dropcatch_requests
      set status='pending',last_error=${message},updated_at=now()
      where id=${id} and status='processing'
    `;
  }
}

export async function processDropcatchBatch(limit=3){
  if(!liveDropcatch())return {processed:0,reason:"disabled"};
  if(!livePayments())return {processed:0,reason:"payments_disabled"};
  if(!dropWindow())return {processed:0,reason:"outside_window"};

  const rows=await db()`
    select id from dropcatch_requests
    where status='pending'
    order by last_attempt_at asc nulls first,created_at asc
    limit ${Math.max(1,Math.min(10,limit))}
  `;
  await Promise.all(rows.map(row=>processOne(String(row.id))));
  return {processed:rows.length,reason:"attempted"};
}

export async function createDropcatchCheckout(userId:string,id:string){
  const rows=await db()`
    select r.id,r.status,r.order_id,o.payment_status,o.checkout_url
    from dropcatch_requests r
    join orders o on o.id=r.order_id
    where r.id=${id} and r.user_id=${userId}
    limit 1
  `;
  const row=rows[0];
  if(!row)throw new Error("Drop-catch request not found.");
  if(String(row.payment_status)==="paid")throw new Error("This caught domain is already paid.");
  const url=await createCheckout(String(row.order_id),userId);
  await db()`update dropcatch_requests set status='awaiting_payment',updated_at=now() where id=${id}`;
  return url;
}

export async function deliverPaidDropcatch(orderId:string){
  const rows=await db()`
    select r.id,r.user_id,r.domain,r.status,o.payment_status
    from dropcatch_requests r
    join orders o on o.id=r.order_id
    where r.order_id=${orderId}
    limit 1
  `;
  const row=rows[0];
  if(!row)throw new Error("Drop-catch request not found.");
  if(String(row.payment_status)!=="paid")throw new Error("Drop-catch order is not paid.");
  if(String(row.status)==="completed")return;

  const details=await namesiloDomainDetails(String(row.domain));
  await db().begin(async tx=>{
    await tx`
      insert into domains (user_id,name,registrar,lifecycle_status,expires_at,transfer_locked)
      values (
        ${String(row.user_id)},${String(row.domain)},'namesilo',
        ${details.lifecycleStatus||"registered"},${details.expirationDate||null},
        ${details.eppStatuses.includes("clientTransferProhibited")}
      )
      on conflict (name) do update set
        user_id=excluded.user_id,registrar='namesilo',lifecycle_status=excluded.lifecycle_status,
        expires_at=excluded.expires_at,transfer_locked=excluded.transfer_locked,updated_at=now()
    `;
    await tx`
      update dropcatch_requests
      set status='completed',last_error=null,updated_at=now()
      where id=${String(row.id)}
    `;
    await tx`update orders set status='active',updated_at=now() where id=${orderId}`;
  });
}
