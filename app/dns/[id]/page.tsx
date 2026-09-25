"use client";
import {FormEvent,useEffect,useState} from "react";
import {useParams} from "next/navigation";

type RecordItem={type:string;name:string;ttl:number;address?:string;cname?:string;value?:string;exchange?:string;preference?:number;note?:string};
function valueOf(r:RecordItem){return r.address||r.cname||r.value||r.exchange||"";}

export default function Dns(){
  const {id}=useParams<{id:string}>();
  const [items,setItems]=useState<RecordItem[]>([]);
  const [error,setError]=useState("");

  async function load(){
    const r=await fetch("/api/domains/"+id+"/dns",{cache:"no-store"});
    if(r.status===401){location.href="/login";return;}
    const d=await r.json();
    if(!r.ok){setError(d.error||"Could not load DNS.");return;}
    setItems(d.items||[]);
  }
  useEffect(()=>{load();},[id]);

  async function add(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setError("");
    const f=new FormData(e.currentTarget),type=String(f.get("type")),value=String(f.get("value")||"");
    const record:Record<string,unknown>={type,name:f.get("name"),ttl:Number(f.get("ttl")||3600)};
    if(type==="A"||type==="AAAA")record.address=value;
    else if(type==="CNAME")record.cname=value;
    else if(type==="TXT")record.value=value;
    else{record.exchange=value;record.preference=Number(f.get("preference")||10);}
    const r=await fetch("/api/domains/"+id+"/dns",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({record,note:f.get("note")})});
    const d=await r.json();
    if(!r.ok){setError(d.error||"Could not add record.");return;}
    e.currentTarget.reset();load();
  }
  async function saveNote(record:RecordItem,note:string){
    const r=await fetch("/api/domains/"+id+"/dns",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({record,note})});
    const d=await r.json();if(!r.ok)setError(d.error||"Could not save note.");else load();
  }
  async function remove(record:RecordItem){
    const r=await fetch("/api/domains/"+id+"/dns",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({record})});
    const d=await r.json();if(!r.ok)setError(d.error||"Could not delete record.");else load();
  }
  return <div className="page wide"><p className="kicker">DNS</p><h1 className="pageTitle">DNS management.</h1><p className="pageIntro">Private notes stay in Rhoizos and are never sent to DNS.</p>
    <form className="dnsToolbar" onSubmit={add}>
      <label className="field">Type<select name="type"><option>A</option><option>AAAA</option><option>CNAME</option><option>TXT</option><option>MX</option></select></label>
      <label className="field">Host<input name="name" defaultValue="@" required/></label>
      <label className="field">Value<input name="value" required/></label>
      <label className="field">TTL<input name="ttl" type="number" defaultValue="3600" min="60" max="3600"/></label>
      <label className="field">MX priority<input name="preference" type="number" defaultValue="10"/></label>
      <label className="field">Private note<input name="note" maxLength={80}/></label>
      <button className="primary">Add record</button>
    </form>
    {error&&<p className="error">{error}</p>}
    <div className="dnsTable">{items.map((r,i)=><DnsRow key={i} record={r} onSave={saveNote} onDelete={remove}/>)}</div>
  </div>;
}

function DnsRow({record,onSave,onDelete}:{record:RecordItem;onSave:(r:RecordItem,n:string)=>void;onDelete:(r:RecordItem)=>void}){
  const [note,setNote]=useState(record.note||"");
  return <div className="dnsRow"><strong>{record.type}</strong><span>{record.name}</span><span className="dnsValue">{valueOf(record)}</span><span>{record.ttl}</span><input value={note} onChange={e=>setNote(e.target.value)} maxLength={80}/><div className="actions"><button className="secondary" onClick={()=>onSave(record,note)}>Save</button><button className="secondary" onClick={()=>onDelete(record)}>Delete</button></div></div>;
}
