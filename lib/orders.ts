import {randomUUID} from "node:crypto";
import {db} from "./db";
import {normalizeDomain,validateContact,type ContactInput} from "./domain";
import {appUrl,livePayments} from "./env";
import {createInvoice} from "./nowpayments";
import {retailFromCost,retailPrice} from "./pricing";
import {namesiloAvailability,namesiloDomainDetails,namesiloStandardCost} from "./namesilo";
import {sealSecret} from "./crypto";

async function contactSnapshot(userId:string):Promise<ContactInput>{
  const rows=await db()`
    select first_name as "firstName",last_name as "lastName",email,country,state,city,
      address1,postcode,phone,company,account_type as "accountType"
    from users where id=${userId} limit 1
  `;
  if(!rows[0]) throw new Error("Account not found.");
  return validateContact(rows[0] as unknown as ContactInput);
}

async function insertOrder(userId:string,kind:"register"|"transfer"|"renew",domain:string,amount:number,request:Record<string,unknown>){
  const id=randomUUID();
  const rows=await db()`
    insert into orders (id,user_id,kind,domain,amount_usd,status,payment_status,request)
    values (${id},${userId},${kind},${domain},${amount},'awaiting_payment','new',${JSON.stringify(request)}::jsonb)
    returning id
  `;
  return String(rows[0].id);
}

export async function createRegisterOrder(userId:string,input:string){
  const domain=normalizeDomain(input);
  const [a]=await namesiloAvailability([domain]);
  if(!a.available) throw new Error("Domain is not available.");
  const cost=a.quotedPrice??(a.premium?null:await namesiloStandardCost(domain,"register"));
  if(!cost) throw new Error("Premium pricing is unavailable for this domain. Contact support.");
  const amount=await retailFromCost(cost,"register");
  return insertOrder(userId,"register",domain,amount,{years:1,contact:await contactSnapshot(userId)});
}

export async function createTransferOrder(userId:string,input:string,authCode:string){
  const domain=normalizeDomain(input);
  if(!authCode.trim()||authCode.length>80) throw new Error("A valid EPP/Auth Code is required.");
  const [a]=await namesiloAvailability([domain]);
  if(a.available===true) throw new Error("Domain is not registered and cannot be transferred.");
  if(a.available===null) throw new Error("Transfer eligibility could not be confirmed.");
  const amount=await retailPrice(domain,"transfer");
  return insertOrder(userId,"transfer",domain,amount,{
    contact:await contactSnapshot(userId),authCode:sealSecret(authCode.trim())
  });
}

export async function createRenewOrder(userId:string,domainId:string){
  const rows=await db()`select name from domains where id=${domainId} and user_id=${userId} limit 1`;
  if(!rows[0]) throw new Error("Domain not found.");
  const domain=normalizeDomain(String(rows[0].name)),details=await namesiloDomainDetails(domain);
  if(details.lifecycleStatus!=="registered") throw new Error("This domain is outside the normal renewal path. Contact support.");
  const amount=await retailPrice(domain,"renew");
  return insertOrder(userId,"renew",domain,amount,{years:1,domainId});
}

export async function createCheckout(orderId:string,userId:string){
  if(!livePayments()) throw new Error("Live payments are not enabled.");
  const sql=db();
  const rows=await sql`select amount_usd,payment_status,checkout_url from orders where id=${orderId} and user_id=${userId} limit 1`;
  const order=rows[0];if(!order) throw new Error("Order not found.");
  if(order.payment_status==="ready"&&order.checkout_url) return String(order.checkout_url);
  if(order.payment_status==="creating") throw new Error("Checkout creation outcome is uncertain. Contact support before retrying.");
  if(order.payment_status!=="new") throw new Error("Order is not eligible for checkout.");

  const claim=await sql`update orders set payment_status='creating',updated_at=now()
    where id=${orderId} and payment_status='new' returning id`;
  if(!claim[0]) throw new Error("Checkout is already being created.");

  const root=appUrl();
  const invoice=await createInvoice({
    orderId,amount:Number(order.amount_usd),
    callbackUrl:`${root}/api/payments/nowpayments/webhook`,
    successUrl:`${root}/domains?payment=returned`,
    cancelUrl:`${root}/domains?payment=cancelled`
  });
  const url=new URL(invoice.invoice_url);
  if(url.protocol!=="https:"||url.hostname!=="nowpayments.io") throw new Error("Unexpected NOWPayments checkout URL.");

  await sql`update orders set provider_invoice_id=${String(invoice.id)},checkout_url=${url.toString()},
    payment_status='ready',updated_at=now() where id=${orderId}`;
  return url.toString();
}
