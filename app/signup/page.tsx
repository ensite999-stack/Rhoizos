"use client";
import {FormEvent,useEffect,useState} from "react";
import Link from "next/link";
import {useI18n} from "@/components/I18nProvider";
import BackLink from "@/components/BackLink";

export default function Signup(){
  const {t}=useI18n();
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const [next,setNext]=useState("");

  useEffect(()=>{
    const value=new URLSearchParams(window.location.search).get("next")||"";
    if(value.startsWith("/")&&!value.startsWith("//"))setNext(value);
  },[]);

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setBusy(true);setError("");
    const body=Object.fromEntries(new FormData(event.currentTarget));
    const response=await fetch("/api/auth/signup",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    const data=await response.json();
    if(!response.ok){setError(data.error||t("signup.failed"));setBusy(false);return;}
    location.href=next||"/domains";
  }

  return <div className="page authPage">
    <BackLink fallbackHref="/"/>
    <p className="kicker">{t("signup.kicker")}</p>
    <h1 className="pageTitle">{t("signup.title")}</h1>
    <p className="pageIntro">{t("signup.copy")}</p>
    <form className="form" onSubmit={submit}>
      <div className="formGrid">
        <label className="field">{t("signup.first")}<input name="firstName" required/></label>
        <label className="field">{t("signup.last")}<input name="lastName" required/></label>
        <label className="field">{t("common.email")}<input name="email" type="email" required/></label>
        <label className="field">{t("common.password")}<input name="password" type="password" minLength={12} required/></label>
        <label className="field">{t("signup.accountType")}<select name="accountType"><option value="individual">{t("signup.individual")}</option><option value="company">{t("common.company")}</option></select></label>
        <label className="field">{t("common.company")}<input name="company"/></label>
        <label className="field">{t("signup.phone")}<input name="phone" type="tel" autoComplete="tel" required/></label>
        <label className="field">{t("signup.country")}<input name="country" autoComplete="country" maxLength={2} required/></label>
        <label className="field">{t("signup.state")}<input name="state" required/></label>
        <label className="field">{t("common.city")}<input name="city" required/></label>
        <label className="field full">{t("signup.street")}<input name="address1" required/></label>
        <label className="field">{t("signup.postcode")}<input name="postcode" required/></label>
      </div>
      <p className="fine">{t("signup.latin")}</p>
      {error&&<p className="error">{error}</p>}
      <button className="primary" disabled={busy}>{t("signup.button")}</button>
    </form>
  </div>;
}
