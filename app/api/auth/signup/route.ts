import {db} from "@/lib/db";
import {createSession,hashPassword} from "@/lib/auth";
import {validateContact,type ContactInput} from "@/lib/domain";
import {fail,ok} from "@/lib/http";
import {appUrl} from "@/lib/env";
import {safeSendTemplateEmail} from "@/lib/email";

export const runtime="nodejs";

export async function POST(request:Request){
  try{
    const body=await request.json() as ContactInput&{password?:string};
    const contact=validateContact(body);
    const password=String(body.password||"");
    const passwordHash=hashPassword(password);
    const rows=await db()`
      insert into users (email,password_hash,first_name,last_name,company,account_type,country,state,city,address1,postcode,phone)
      values (
        ${contact.email},${passwordHash},${contact.firstName},${contact.lastName},${contact.company||null},
        ${contact.accountType||"individual"},${contact.country},${contact.state},${contact.city},
        ${contact.address1},${contact.postcode},${contact.phone}
      )
      on conflict (email) do nothing returning id
    `;
    if(!rows[0]) throw new Error("An account with this email already exists.");
    await safeSendTemplateEmail(
      contact.email,
      "rhoizos-account-created",
      {DOMAINS_URL:appUrl()+"/domains"},
      "rhoizos:account-created:"+String(rows[0].id)
    );
    await createSession(String(rows[0].id));
    return ok({created:true,authenticated:true},201);
  }catch(error){return fail(error);}
}
