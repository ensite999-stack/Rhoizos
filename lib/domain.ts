import {createHash} from "node:crypto";
import {domainToASCII} from "node:url";

export type ContactInput={
  firstName:string;lastName:string;email:string;country:string;state:string;city:string;
  address1:string;postcode:string;phone:string;company?:string;accountType?:"individual"|"company";
};
export type DnsRecord={
  type:"A"|"AAAA"|"CNAME"|"TXT"|"MX";name:string;ttl:number;
  address?:string;cname?:string;value?:string;exchange?:string;preference?:number;
};

export function normalizeDomain(input:string){
  const ascii=domainToASCII(input.trim().toLowerCase().replace(/\.$/,""));
  if(!ascii||ascii.length>253||!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(ascii)){
    throw new Error("Enter a valid domain name.");
  }
  return ascii;
}
export function tldOf(domain:string){return normalizeDomain(domain).split(".").at(-1)!;}

export function validateContact(input:ContactInput):ContactInput{
  const c:ContactInput={
    ...input,
    firstName:input.firstName?.trim(),lastName:input.lastName?.trim(),
    email:input.email?.trim().toLowerCase(),country:input.country?.trim().toUpperCase(),
    state:input.state?.trim(),city:input.city?.trim(),address1:input.address1?.trim(),
    postcode:input.postcode?.trim(),phone:input.phone?.trim(),
    company:input.company?.trim()||"",accountType:input.accountType==="company"?"company":"individual"
  };
  for(const k of ["firstName","lastName","email","country","state","city","address1","postcode","phone"] as const){
    if(!c[k]) throw new Error(`Required contact field: ${k}`);
  }
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) throw new Error("Invalid email address.");
  if(!/^[A-Z]{2}$/.test(c.country)) throw new Error("Use an ISO two-letter country code.");
  if(!/^\+[0-9]{1,3}\.[0-9]{4,14}$/.test(c.phone)||c.phone.length>17) throw new Error("Phone must use +countrycode.number format.");
  for(const k of ["firstName","lastName","state","city","address1"] as const){
    if(!/^[\x20-\x7e]+$/.test(c[k])||c[k].length>255) throw new Error(`Use Latin characters in ${k}.`);
  }
  if(c.firstName.length>125||c.lastName.length>125||c.postcode.length>16) throw new Error("Contact field is too long.");
  if(c.accountType==="company"&&!c.company) throw new Error("Company name is required.");
  return c;
}

export function validateRecord(input:Partial<DnsRecord>):DnsRecord{
  const type=String(input.type||"").toUpperCase() as DnsRecord["type"];
  if(!["A","AAAA","CNAME","TXT","MX"].includes(type)) throw new Error("Unsupported DNS record type.");
  const name=String(input.name||"");
  if(!/^(?:@|\*|[a-zA-Z0-9_*.-]{1,253})$/.test(name)) throw new Error("Invalid DNS host.");
  const ttl=Number(input.ttl??3600);
  if(!Number.isInteger(ttl)||ttl<60||ttl>3600) throw new Error("TTL must be between 60 and 3600 seconds.");

  const record:DnsRecord={type,name,ttl};
  if(type==="A"){
    const v=String(input.address||"");
    const parts=v.split(".").map(Number);
    if(parts.length!==4||parts.some(x=>!Number.isInteger(x)||x<0||x>255)) throw new Error("An IPv4 address is required.");
    record.address=v;
  }else if(type==="AAAA"){
    const v=String(input.address||"");
    if(!v.includes(":")) throw new Error("An IPv6 address is required.");
    record.address=v;
  }else if(type==="CNAME"){
    record.cname=normalizeDomain(String(input.cname||"").replace(/\.$/,""));
  }else if(type==="TXT"){
    const v=String(input.value||"");
    if(!v||v.length>2048) throw new Error("Invalid TXT value.");
    record.value=v;
  }else{
    record.exchange=normalizeDomain(String(input.exchange||"").replace(/\.$/,""));
    const p=Number(input.preference??10);
    if(!Number.isInteger(p)||p<0||p>65535) throw new Error("Invalid MX priority.");
    record.preference=p;
  }
  return record;
}

export function recordFingerprint(record:DnsRecord){
  const copy:Record<string,unknown>={...record};
  delete copy.ttl;
  for(const [k,v] of Object.entries(copy)){
    if(typeof v==="string"&&!(record.type==="TXT"&&k==="value")) copy[k]=v.toLowerCase();
  }
  const canonical=Object.fromEntries(Object.entries(copy).sort(([a],[b])=>a.localeCompare(b)));
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}
