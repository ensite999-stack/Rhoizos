"use client";
import {FormEvent,useState} from "react";
import {useI18n} from "@/components/I18nProvider";
import {adminTranslate} from "@/lib/admin-i18n";

export default function AdminLogin(){
  const {locale}=useI18n();
  const t=(key:string)=>adminTranslate(locale,key);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    setBusy(true);
    setError("");
    const form=new FormData(event.currentTarget);
    const response=await fetch("/api/admin/auth/login",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({email:form.get("email"),password:form.get("password")})
    });
    const data=await response.json();
    if(!response.ok){setError(data.error||t("loginFailed"));setBusy(false);return;}
    location.href="/admin";
  }

  return <div className="adminBody"><div className="adminLogin">
    <h1>{t("title")}</h1>
    <p>{t("subtitle")}</p>
    <form onSubmit={submit}>
      <label className="field">{t("adminEmail")}<input name="email" type="email" autoComplete="username" required/></label>
      <label className="field">{t("password")}<input name="password" type="password" autoComplete="current-password" required/></label>
      {error&&<p className="error">{error}</p>}
      <button className="primary" disabled={busy}>{busy?t("signingIn"):t("signIn")}</button>
    </form>
  </div></div>;
}
