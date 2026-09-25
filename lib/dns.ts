import {db} from "./db";
import {recordFingerprint,validateRecord,type DnsRecord} from "./domain";
import {addDnsRecord,deleteDnsRecord,listDnsRecords} from "./spaceship";

export async function ownedDomain(userId:string,domainId:string){
  const rows=await db()`select id,user_id,name,lifecycle_status,expires_at,transfer_locked from domains
    where id=${domainId} and user_id=${userId} limit 1`;
  if(!rows[0]) throw new Error("Domain not found.");
  return rows[0];
}
export async function recordsWithNotes(userId:string,domainId:string){
  const domain=await ownedDomain(userId,domainId),records=await listDnsRecords(String(domain.name));
  const notes=await db()`select fingerprint,note from dns_notes where user_id=${userId} and domain_id=${domainId}`;
  const map=new Map(notes.map(r=>[String(r.fingerprint),String(r.note)]));
  return records.map(record=>({...record,note:map.get(recordFingerprint(validateRecord(record)))||""}));
}
async function current(domainName:string,input:Partial<DnsRecord>){
  const record=validateRecord(input),fp=recordFingerprint(record),items=await listDnsRecords(domainName);
  if(!items.some(item=>recordFingerprint(validateRecord(item))===fp)) throw new Error("Record changed or no longer exists. Refresh and try again.");
  return record;
}
export async function addRecord(userId:string,domainId:string,input:Partial<DnsRecord>,note=""){
  if(note.length>80) throw new Error("Private notes may contain up to 80 characters.");
  const domain=await ownedDomain(userId,domainId),record=validateRecord(input);
  await addDnsRecord(String(domain.name),record);
  await saveNote(userId,domainId,record,note);
}
export async function saveNote(userId:string,domainId:string,input:Partial<DnsRecord>,note:string){
  if(note.length>80) throw new Error("Private notes may contain up to 80 characters.");
  const domain=await ownedDomain(userId,domainId),record=await current(String(domain.name),input);
  await db()`insert into dns_notes (user_id,domain_id,fingerprint,note) values
    (${userId},${domainId},${recordFingerprint(record)},${note})
    on conflict (user_id,domain_id,fingerprint) do update set note=excluded.note,updated_at=now()`;
}
export async function removeRecord(userId:string,domainId:string,input:Partial<DnsRecord>){
  const domain=await ownedDomain(userId,domainId),record=await current(String(domain.name),input);
  await deleteDnsRecord(String(domain.name),record);
  await db()`delete from dns_notes where user_id=${userId} and domain_id=${domainId}
    and fingerprint=${recordFingerprint(record)}`;
}
