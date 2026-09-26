"use client";
import {FormEvent,useEffect,useState} from "react";
import Link from "next/link";
import {useI18n} from "@/components/I18nProvider";

export default function Transfer(){
  const {t}=useI18n();
  const [domain,setDomain]=useState("");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);

  useEffect(()=>{
    const value=new URLSearchParams(window.location.search).get("domain");
    if(value)setDomain(value);
  },[]);

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    setBusy(true);
    setError("");
    const form=new FormData(event.currentTarget);
    const response=await fetch("/api/orders/transfer",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({domain:form.get("domain"),authCode:form.get("authCode")})
    });
    if(response.status===401){location.href="/login?next="+encodeURIComponent("/transfer?domain="+domain);return;}
    const data=await response.json();
    if(!response.ok){setError(data.error||t("transfer.failed"));setBusy(false);return;}
    location.href=data.checkoutUrl;
  }

  return <div className="page">
    <Link className="backHomeLink" href="/">← {t("common.backHome")}</Link>
    <p className="kicker">{t("transfer.kicker")}</p>
    <h1 className="pageTitle">{t("transfer.title")}</h1>
    <p className="pageIntro">{t("transfer.copy")}</p>
    <form className="form" onSubmit={submit}>
      <label className="field">{t("common.domain")}<input name="domain" value={domain} onChange={event=>setDomain(event.target.value)} placeholder="example.com" required/></label>
      <label className="field">{t("transfer.auth")}<input name="authCode" type="password" autoComplete="off" required/></label>
      {error&&<p className="error">{error}</p>}
      <button className="primary" disabled={busy}>{busy?t("transfer.starting"):t("transfer.continue")}</button>
    </form>
  </div>;
}
