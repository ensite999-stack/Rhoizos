import {createHash,randomBytes} from "node:crypto";
import {db} from "./db";
import {appUrl,requiredEnv} from "./env";
import {normalizeDomain,validateContact,type ContactInput} from "./domain";
import {hashPassword,createSession} from "./auth";
import {createCheckout,createRegisterOrder} from "./orders";
import {domainAvailability} from "./spaceship";
import {retailFromCost,retailPrice} from "./pricing";

function tokenHash(token:string){return createHash("sha256").update(token).digest("hex");}
function normalizeEmail(input:string){
  const email=input.trim().toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
  return email;
}
function escapeHtml(value:string){
  return value.replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[char]||char));
}

export async function quoteRegisterDomain(input:string){
  const domain=normalizeDomain(input);
  const availability=await domainAvailability(domain);
  if(!availability.available) throw new Error("Domain is not available.");
  const price=availability.registerPrice
    ?await retailFromCost(availability.registerPrice,"register")
    :await retailPrice(domain,"register");
  return {domain,price,premium:availability.premium};
}

async function sendPurchaseEmail(email:string,domain:string,token:string){
  const apiKey=requiredEnv("RESEND_API_KEY");
  const from=requiredEnv("RHOIZOS_EMAIL_FROM");
  const url=appUrl()+"/checkout/guest?token="+encodeURIComponent(token);
  const response=await fetch("https://api.resend.com/emails",{
    method:"POST",
    headers:{"Authorization":"Bearer "+apiKey,"Content-Type":"application/json"},
    body:JSON.stringify({
      from,
      to:[email],
      subject:"Continue your Rhoizos domain purchase",
      html:`<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
        <h2 style="margin:0 0 16px">Continue your Rhoizos purchase</h2>
        <p>You requested to purchase <strong>${escapeHtml(domain)}</strong> without creating a password.</p>
        <p><a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 18px;background:#702963;color:#fff;text-decoration:none;border-radius:6px">Continue purchase</a></p>
        <p>This link expires in 30 minutes and can be used once.</p>
        <p>If you did not request this, you can ignore this email.</p>
      </div>`
    }),
    signal:AbortSignal.timeout(15000)
  });
  if(!response.ok){
    const body=await response.text().catch(()=>"");
    throw new Error("Could not send the purchase email."+ (body?" Email provider rejected the request.":""));
  }
}

export async function createGuestPurchaseLink(emailInput:string,domainInput:string){
  const email=normalizeEmail(emailInput);
  const {domain}=await quoteRegisterDomain(domainInput);

  const recent=await db()`
    select count(*)::int as count
    from guest_purchase_links
    where email=${email} and created_at>now()-interval '15 minutes'
  `;
  if(Number(recent[0]?.count||0)>=5) throw new Error("Too many email-link requests. Please wait a few minutes.");

  const token=randomBytes(32).toString("base64url");
  const hash=tokenHash(token);
  const rows=await db()`
    insert into guest_purchase_links (email,domain,token_hash,expires_at)
    values (${email},${domain},${hash},now()+interval '30 minutes')
    returning id
  `;

  try{
    await sendPurchaseEmail(email,domain,token);
  }catch(error){
    await db()`delete from guest_purchase_links where id=${String(rows[0].id)}`;
    throw error;
  }
  return {sent:true};
}

export async function guestPurchaseLink(token:string){
  if(!token||token.length>200) throw new Error("This purchase link is invalid.");
  const rows=await db()`
    select id,email,domain,expires_at
    from guest_purchase_links
    where token_hash=${tokenHash(token)}
      and used_at is null
      and expires_at>now()
    limit 1
  `;
  if(!rows[0]) throw new Error("This purchase link is invalid or has expired.");
  const quote=await quoteRegisterDomain(String(rows[0].domain));
  return {
    id:String(rows[0].id),
    email:String(rows[0].email),
    domain:quote.domain,
    price:quote.price,
    premium:quote.premium,
    expiresAt:new Date(rows[0].expires_at as string|Date).toISOString()
  };
}

export async function completeGuestPurchase(token:string,input:ContactInput){
  const link=await guestPurchaseLink(token);
  const contact=validateContact({...input,email:link.email});

  const claimed=await db()`
    update guest_purchase_links
    set used_at=now()
    where id=${link.id} and used_at is null and expires_at>now()
    returning id
  `;
  if(!claimed[0]) throw new Error("This purchase link has already been used.");

  let rows=await db()`select id,active from users where email=${link.email} limit 1`;
  let userId:string;

  if(rows[0]){
    if(!rows[0].active) throw new Error("This account is disabled.");
    userId=String(rows[0].id);
    await db()`
      update users set
        first_name=${contact.firstName},last_name=${contact.lastName},company=${contact.company||null},
        account_type=${contact.accountType||"individual"},country=${contact.country},state=${contact.state},
        city=${contact.city},address1=${contact.address1},postcode=${contact.postcode},phone=${contact.phone},
        updated_at=now()
      where id=${userId}
    `;
  }else{
    const unusablePassword=hashPassword(randomBytes(32).toString("base64url"));
    rows=await db()`
      insert into users (email,password_hash,first_name,last_name,company,account_type,country,state,city,address1,postcode,phone)
      values (
        ${link.email},${unusablePassword},${contact.firstName},${contact.lastName},${contact.company||null},
        ${contact.accountType||"individual"},${contact.country},${contact.state},${contact.city},
        ${contact.address1},${contact.postcode},${contact.phone}
      )
      returning id
    `;
    userId=String(rows[0].id);
  }

  await createSession(userId);
  const orderId=await createRegisterOrder(userId,link.domain);
  const checkoutUrl=await createCheckout(orderId,userId);
  return {orderId,checkoutUrl};
}
