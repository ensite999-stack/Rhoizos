"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {useI18n} from "@/components/I18nProvider";

type Domain={
  id:string;
  name:string;
  lifecycle_status:string;
  expires_at:string|null;
  transfer_locked:boolean;
};

export default function Domains(){
  const {t,locale}=useI18n();
  const [items,setItems]=useState<Domain[]>([]);
  const [error,setError]=useState("");
  const [codes,setCodes]=useState<Record<string,string>>({});

  async function load(){
    const response=await fetch("/api/domains",{cache:"no-store"});
    if(response.status===401){location.href="/login";return;}
    const data=await response.json();
    if(!response.ok){setError(data.error||t("domains.loadFailed"));return;}
    setItems(data.items||[]);
  }

  useEffect(()=>{load();},[]);

  async function renew(id:string){
    const response=await fetch("/api/orders/renew",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({domainId:id})});
    const data=await response.json();
    if(!response.ok){setError(data.error||t("domains.renewFailed"));return;}
    location.href=data.checkoutUrl;
  }

  async function updateLock(id:string,locked:boolean){
    const response=await fetch("/api/domains/"+id+"/lock",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({locked})});
    const data=await response.json();
    if(!response.ok){setError(data.error||t("domains.lockFailed"));return;}
    load();
  }

  async function revealCode(id:string){
    const response=await fetch("/api/domains/"+id+"/auth-code",{cache:"no-store"});
    const data=await response.json();
    if(!response.ok){setError(data.error||t("domains.codeFailed"));return;}
    setCodes(current=>({...current,[id]:data.authCode}));
  }

  return <div className="page wide">
    <p className="kicker">{t("domains.kicker")}</p>
    <h1 className="pageTitle">{t("domains.title")}</h1>
    <p className="pageIntro">{t("domains.copy")}</p>
    {error&&<p className="error">{error}</p>}
    <div className="table">
      {items.map(item=><div className="domainRow" key={item.id}>
        <div>
          <h3>{item.name}</h3>
          <p>{item.lifecycle_status.replace(/_/g," ")} · {item.expires_at?new Date(item.expires_at).toLocaleDateString(locale):t("domains.expiryPending")}</p>
          {codes[item.id]&&<div className="codeBox">{codes[item.id]}</div>}
        </div>
        <div className="actions">
          <Link className="secondary" href={"/dns/"+item.id}>{t("domains.dns")}</Link>
          <button className="secondary" onClick={()=>renew(item.id)}>{t("domains.renew")}</button>
          <button className="secondary" onClick={()=>updateLock(item.id,!item.transfer_locked)}>{item.transfer_locked?t("domains.unlock"):t("domains.lock")}</button>
          <button className="secondary" onClick={()=>revealCode(item.id)}>{t("domains.authCode")}</button>
        </div>
      </div>)}
    </div>
  </div>;
}
