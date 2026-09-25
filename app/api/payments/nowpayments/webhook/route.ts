import {db} from "@/lib/db";
import {verifyNowPaymentsSignature,getPayment} from "@/lib/nowpayments";
import {startProvisioning} from "@/lib/provision";
import {liveRegistration} from "@/lib/env";

export const runtime="nodejs";

export async function POST(request:Request){
  const raw=await request.text();
  if(raw.length>65536) return new Response("Payload too large",{status:413});
  let body:Record<string,unknown>;
  try{body=JSON.parse(raw) as Record<string,unknown>;}catch{return new Response("Invalid JSON",{status:400});}
  const signature=request.headers.get("x-nowpayments-sig")||"";
  if(!verifyNowPaymentsSignature(body,signature)) return new Response("Invalid signature",{status:401});

  const paymentId=String(body.payment_id||"");
  if(!/^\d+$/.test(paymentId)) return new Response("Invalid payment ID",{status:400});

  const payment=await getPayment(paymentId);
  if(String(payment.payment_id||"")!==paymentId) return new Response("Payment mismatch",{status:400});
  const orderId=String(payment.order_id||"");
  const sql=db();
  const rows=await sql`select id,amount_usd,provider_invoice_id,payment_status,payment_id from orders where id=${orderId} limit 1`;
  const order=rows[0];
  if(!order) return new Response("Unknown order",{status:404});

  const status=String(payment.payment_status||"unknown");
  await sql`insert into payment_events (payment_id,order_id,provider_status,payload)
    values (${paymentId},${orderId},${status},${JSON.stringify(payment)}::jsonb)
    on conflict (payment_id) do update set provider_status=excluded.provider_status,payload=excluded.payload,received_at=now()`;

  if(status!=="finished"){
    await sql`update orders set payment_status=${status},updated_at=now() where id=${orderId} and payment_status<>'paid'`;
    return new Response("ok");
  }

  if(String(payment.invoice_id||"")!==String(order.provider_invoice_id)) return new Response("Invoice mismatch",{status:400});
  if(String(payment.price_currency||"").toLowerCase()!=="usd") return new Response("Currency mismatch",{status:400});
  if(Math.abs(Number(payment.price_amount||0)-Number(order.amount_usd))>0.000001) return new Response("Amount mismatch",{status:400});
  if(Number(payment.pay_amount||0)<=0||Number(payment.actually_paid||0)+1e-12<Number(payment.pay_amount||0)){
    await sql`update orders set payment_status='underpaid',status='payment_review',updated_at=now() where id=${orderId}`;
    return new Response("ok");
  }

  await sql.begin(async tx=>{
    const locked=await tx`select payment_status,payment_id from orders where id=${orderId} for update`;
    const current=locked[0];
    if(current.payment_status==="paid"){
      if(String(current.payment_id)!==paymentId) throw new Error("A different payment already settled this order.");
      return;
    }
    await tx`update orders set payment_status='paid',payment_id=${paymentId},status='paid',updated_at=now() where id=${orderId}`;
  });

  if(liveRegistration()){
    try{await startProvisioning(orderId);}catch{}
  }
  return new Response("ok");
}
