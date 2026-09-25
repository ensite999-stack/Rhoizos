"use client";
import {FormEvent,useEffect,useState} from "react";
import {useParams} from "next/navigation";
import {useI18n} from "@/components/I18nProvider";

type RecordItem={
  type:string;name:string;ttl:number;address?:string;cname?:string;value?:string;
  exchange?:string;preference?:number;note?:string;
};

function valueOf(record:RecordItem){
  return record.address||record.cname||record.value||record.exchange||"";
}

export default function Dns(){
  const {id}=useParams<{id:string}>();
  const {t}=useI18n();
  const [items,setItems]=useState<RecordItem[]>([]);
  const [error,setError]=useState("");

  async function load(){
    const response=await fetch("/api/domains/"+id+"/dns",{cache:"no-store"});
    if(response.status===401){location.href="/login";return;}
    const data=await response.json();
    if(!response.ok){setError(data.error||t("dns.loadFailed"));return;}
    setItems(data.items||[]);
  }

  useEffect(()=>{load();},[id]);

  async function add(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    setError("");
    const form=new FormData(event.currentTarget);
    const type=String(form.get("type"));
    const value=String(form.get("value")||"");
    const record:Record<string,unknown>={type,name:form.get("name"),ttl:Number(form.get("ttl")||3600)};

    if(type==="A"||type==="AAAA")record.address=value;
    else if(type==="CNAME")record.cname=value;
    else if(type==="TXT")record.value=value;
    else{record.exchange=value;record.preference=Number(form.get("preference")||10);}

    const response=await fetch("/api/domains/"+id+"/dns",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({record,note:form.get("note")})
    });
    const data=await response.json();
    if(!response.ok){setError(data.error||t("dns.addFailed"));return;}
    event.currentTarget.reset();
    load();
  }

  async function saveNote(record:RecordItem,note:string){
    const response=await fetch("/api/domains/"+id+"/dns",{
      method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({record,note})
    });
    const data=await response.json();
    if(!response.ok)setError(data.error||t("dns.noteFailed")); else load();
  }

  async function remove(record:RecordItem){
    const response=await fetch("/api/domains/"+id+"/dns",{
      method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({record})
    });
    const data=await response.json();
    if(!response.ok)setError(data.error||t("dns.deleteFailed")); else load();
  }

  return <div className="page wide">
    <p className="kicker">{t("dns.kicker")}</p>
    <h1 className="pageTitle">{t("dns.title")}</h1>
    <p className="pageIntro">{t("dns.copy")}</p>

    <form className="dnsToolbar" onSubmit={add}>
      <label className="field">{t("dns.type")}<select name="type"><option>A</option><option>AAAA</option><option>CNAME</option><option>TXT</option><option>MX</option></select></label>
      <label className="field">{t("dns.host")}<input name="name" defaultValue="@" required/></label>
      <label className="field">{t("dns.value")}<input name="value" required/></label>
      <label className="field">{t("dns.ttl")}<input name="ttl" type="number" defaultValue="3600" min="60" max="3600"/></label>
      <label className="field">{t("dns.priority")}<input name="preference" type="number" defaultValue="10"/></label>
      <label className="field">{t("dns.note")}<input name="note" maxLength={80}/></label>
      <button className="primary">{t("dns.add")}</button>
    </form>

    {error&&<p className="error">{error}</p>}
    <div className="dnsTable">{items.map((record,index)=><DnsRow key={index} record={record} onSave={saveNote} onDelete={remove}/>)}</div>
  </div>;
}

function DnsRow({record,onSave,onDelete}:{record:RecordItem;onSave:(record:RecordItem,note:string)=>void;onDelete:(record:RecordItem)=>void}){
  const {t}=useI18n();
  const [note,setNote]=useState(record.note||"");
  return <div className="dnsRow">
    <strong>{record.type}</strong>
    <span>{record.name}</span>
    <span className="dnsValue">{valueOf(record)}</span>
    <span>{record.ttl}</span>
    <input value={note} onChange={event=>setNote(event.target.value)} maxLength={80}/>
    <div className="actions">
      <button className="secondary" onClick={()=>onSave(record,note)}>{t("common.save")}</button>
      <button className="secondary" onClick={()=>onDelete(record)}>{t("common.delete")}</button>
    </div>
  </div>;
}
