import {requireUser} from "@/lib/auth";
import {db} from "@/lib/db";
import {validateContact,type ContactInput} from "@/lib/domain";
import {fail,ok} from "@/lib/http";

export const runtime="nodejs";

export async function GET(){
  try{
    const user=await requireUser();
    return ok({user});
  }catch(error){return fail(error);}
}

export async function POST(request:Request){
  try{
    const user=await requireUser();
    const body=await request.json() as ContactInput;
    const contact=validateContact({...body,email:user.email});
    await db()`
      update users set
        first_name=${contact.firstName},last_name=${contact.lastName},company=${contact.company||null},
        account_type=${contact.accountType||"individual"},country=${contact.country},state=${contact.state},
        city=${contact.city},address1=${contact.address1},postcode=${contact.postcode},phone=${contact.phone},
        updated_at=now()
      where id=${user.id}
    `;
    return ok({saved:true});
  }catch(error){return fail(error);}
}
