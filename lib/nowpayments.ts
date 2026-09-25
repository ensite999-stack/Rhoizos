import {createHmac,timingSafeEqual} from "node:crypto";
import {requiredEnv} from "./env";

const BASE="https://api.nowpayments.io/v1";

function canonicalize(value:unknown):unknown{
  if(Array.isArray(value)) return value.map(canonicalize);
  if(value&&typeof value==="object"){
    return Object.fromEntries(Object.entries(value as Record<string,unknown>)
      .sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,canonicalize(v)]));
  }
  return value;
}
export function verifyNowPaymentsSignature(body:unknown,signature:string){
  if(!/^[a-f0-9]{128}$/i.test(signature)) return false;
  const expected=createHmac("sha512",requiredEnv("NOWPAYMENTS_IPN_SECRET"))
    .update(JSON.stringify(canonicalize(body))).digest();
  const received=Buffer.from(signature,"hex");
  return expected.length===received.length&&timingSafeEqual(expected,received);
}
export async function nowpaymentsRequest<T>(method:"GET"|"POST",path:string,body?:unknown):Promise<T>{
  const response=await fetch(BASE+path,{
    method,
    headers:{Accept:"application/json","Content-Type":"application/json","x-api-key":requiredEnv("NOWPAYMENTS_API_KEY")},
    body:body===undefined?undefined:JSON.stringify(body),
    cache:"no-store",redirect:"manual",signal:AbortSignal.timeout(20000)
  });
  if(!response.ok) throw new Error(`NOWPayments rejected the request (HTTP ${response.status}).`);
  return response.json() as Promise<T>;
}
export function createInvoice(input:{orderId:string;amount:number;callbackUrl:string;successUrl:string;cancelUrl:string}){
  return nowpaymentsRequest<{id:string|number;invoice_url:string}>("POST","/invoice",{
    price_amount:input.amount,price_currency:"usd",order_id:input.orderId,
    order_description:`Rhoizos order ${input.orderId}`,ipn_callback_url:input.callbackUrl,
    success_url:input.successUrl,cancel_url:input.cancelUrl,is_fee_paid_by_user:false
  });
}
export function getPayment(paymentId:string){
  return nowpaymentsRequest<{
    payment_id?:string|number;payment_status?:string;invoice_id?:string|number;order_id?:string;
    price_currency?:string;price_amount?:number|string;pay_amount?:number|string;actually_paid?:number|string;
  }>("GET",`/payment/${encodeURIComponent(paymentId)}`);
}
