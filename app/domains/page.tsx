"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {useI18n} from "@/components/I18nProvider";

type Domain={
  id:string;name:string;lifecycle_status:string;expires_at:string|null;transfer_locked:boolean;
  privacy_supported:boolean;privacy_protected:boolean|null;
};

export default function Domains(){
  const {t,locale}=useI18n();
  const [items,setItems]=useState<Domain[]>([]);
  const [error,setError]=useState("");
  const [codes,setCodes]=useState<Record<string,string>>({});
  const [authRequired,setAuthRequired]=useState(false);
  const [loading,setLoading]=useState(true);

  async function load(){
    setLoading(true);
    const response=await fetch("/api/domains",{cache:"no-store"});
    if(response.status===401){setAuthRequired(true);setLoading(false);return;}
    const data=await response.json();setLoading(false);
    if(!response.ok){setError(data.error||t("domains.loadFailed"));return;}
    setAuthRequired(false);setItems(data.items||[]);
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
    if(!response.ok){setError(data.error||t("domains.lockFailed"));return;}load();
  }
  async function updatePrivacy(id:string,enabled:boolean){
    const response=await fetch("/api/domains/"+id+"/privacy",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({enabled})});
    const data=await response.json();
    if(!response.ok){setError(data.error||t("domains.privacyFailed"));return;}
    setItems(current=>current.map(item=>item.id===id?{...item,privacy_protected:enabled}:item));
  }
  async function revealCode(id:string){
    const response=await fetch("/api/domains/"+id+"/auth-code",{cache:"no-store"});
    const data=await response.json();
    if(!response.ok){setError(data.error||t("domains.codeFailed"));return;}
    setCodes(current=>({...current,[id]:data.authCode}));
  }

  if(authRequired)return <div className="page wide serviceLanding">
    <Link className="backHomeLink" href="/">← {t("common.backHome")}</Link>
    <p className="kicker">{t("domains.kicker")}</p>
    <h1 className="pageTitle">{t("domains.publicTitle")}</h1>
    <p className="pageIntro">{t("domains.publicCopy")}</p>
    <div className="serviceSteps">
      <article><span>01</span><h2>{t("domains.publicStep1Title")}</h2><p>{t("domains.publicStep1Copy")}</p></article>
      <article><span>02</span><h2>{t("domains.publicStep2Title")}</h2><p>{t("domains.publicStep2Copy")}</p></article>
      <article><span>03</span><h2>{t("domains.publicStep3Title")}</h2><p>{t("domains.publicStep3Copy")}</p></article>
    </div>
    <div className="serviceCta">
      <Link className="primaryLink" href="/login?next=%2Fdomains">{t("login.button")}</Link>
      <Link className="secondaryLink" href="/signup?next=%2Fdomains">{t("login.create")}</Link>
    </div>
  </div>;

  return <div className="page wide">
    <Link className="backHomeLink" href="/">← {t("common.backHome")}</Link>
    <p className="kicker">{t("domains.kicker")}</p>
    <h1 className="pageTitle">{t("domains.title")}</h1>
    <p className="pageIntro">{loading?t("common.loading"):t("domains.copy")}</p>
    {error&&<p className="error">{error}</p>}
    <div className="table">
      {items.map(item=><div className="domainRow" key={item.id}>
        <div>
          <h3>{item.name}</h3>
          <p>{item.lifecycle_status.replace(/_/g," ")} · {item.expires_at?new Date(item.expires_at).toLocaleDateString(locale):t("domains.expiryPending")}</p>
          <div className="domainPrivacyRow">
            <span>{t("domains.privacy")}</span>
            {item.privacy_supported?<label className="privacySwitch">
              <input type="checkbox" checked={item.privacy_protected===true} onChange={event=>updatePrivacy(item.id,event.target.checked)}/>
              <span aria-hidden="true"></span><b>{item.privacy_protected?t("domains.privacyOn"):t("domains.privacyOff")}</b>
            </label>:<span className="privacyUnavailable">{t("domains.privacyUnavailable")}</span>}
          </div>
          {codes[item.id]&&<div className="codeBox">{codes[item.id]}</div>}
        </div>
        <div className="actions">
          <Link className="secondary" href={"/dns/"+item.id}>{t("domains.dns")}</Link>
          <Link className="secondary" href={"/domains/"+item.id+"/forwarding"}>{t("domains.forwarding")}</Link>
          <Link className="secondary" href={"/domains/"+item.id+"/email-forwarding"}>{t("domains.emailForwarding")}</Link>
          <button className="secondary" onClick={()=>renew(item.id)}>{t("domains.renew")}</button>
          <button className="secondary" onClick={()=>updateLock(item.id,!item.transfer_locked)}>{item.transfer_locked?t("domains.unlock"):t("domains.lock")}</button>
          <button className="secondary" onClick={()=>revealCode(item.id)}>{t("domains.authCode")}</button>
        </div>
      </div>)}
    </div>
  </div>;
}
