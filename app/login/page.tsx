"use client";
import {FormEvent,useState} from "react";
import Link from "next/link";
import {useI18n} from "@/components/I18nProvider";

export default function Login(){
  const {t}=useI18n();
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    setBusy(true);
    setError("");
    const form=new FormData(event.currentTarget);
    const response=await fetch("/api/auth/login",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({email:form.get("email"),password:form.get("password")})
    });
    const data=await response.json();
    if(!response.ok){setError(data.error||t("login.failed"));setBusy(false);return;}
    const params=new URLSearchParams(window.location.search);
    const next=params.get("next");
    location.href=next&&next.startsWith("/")&&!next.startsWith("//")?next:"/domains";
  }

  return <div className="page">
    <p className="kicker">{t("login.kicker")}</p>
    <h1 className="pageTitle">{t("login.title")}</h1>
    <p className="pageIntro">{t("login.copy")}</p>
    <form className="form" onSubmit={submit}>
      <label className="field">{t("common.email")}<input name="email" type="email" autoComplete="email" required/></label>
      <label className="field">{t("common.password")}<input name="password" type="password" autoComplete="current-password" required/></label>
      {error&&<p className="error">{error}</p>}
      <div className="formActions"><button className="primary" disabled={busy}>{t("login.button")}</button><Link href="/signup">{t("login.create")}</Link></div>
    </form>
  </div>;
}
