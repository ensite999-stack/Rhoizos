import {requireUser} from "@/lib/auth";
import {addRecord,recordsWithNotes,removeRecord,saveNote} from "@/lib/dns";
import {fail,ok} from "@/lib/http";
import type {DnsRecord} from "@/lib/domain";

export const runtime="nodejs";

export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
  try{const user=await requireUser(),{id}=await params;return ok({items:await recordsWithNotes(user.id,id)});}
  catch(error){return fail(error);}
}
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const user=await requireUser(),{id}=await params,body=await request.json() as {record?:Partial<DnsRecord>;note?:string};
    await addRecord(user.id,id,body.record||{},String(body.note||""));return ok({ok:true},201);
  }catch(error){return fail(error);}
}
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const user=await requireUser(),{id}=await params,body=await request.json() as {record?:Partial<DnsRecord>;note?:string};
    await saveNote(user.id,id,body.record||{},String(body.note||""));return ok({ok:true});
  }catch(error){return fail(error);}
}
export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const user=await requireUser(),{id}=await params,body=await request.json() as {record?:Partial<DnsRecord>};
    await removeRecord(user.id,id,body.record||{});return ok({ok:true});
  }catch(error){return fail(error);}
}
