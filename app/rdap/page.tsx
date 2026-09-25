"use client";
import {FormEvent,useState} from "react";
import {useI18n} from "@/components/I18nProvider";

export default function Rdap(){
  const {t}=useI18n();
  const [domain,setDomain]=useState("");

  function submit(event:FormEvent){
    event.preventDefault();
    const value=domain.trim().toLowerCase();
    if(!value)return;
    location.href="/domain/"+encodeURIComponent(value);
  }

  return <div className="page">
    <p className="kicker">{t("rdap.kicker")}</p>
    <h1 className="pageTitle">{t("rdap.title")}</h1>
    <p className="pageIntro">{t("rdap.copy")}</p>
    <form className="form rdapSearchClean" onSubmit={submit}>
      <label className="field">{t("common.domain")}<input value={domain} onChange={event=>setDomain(event.target.value)} placeholder="example.com" required spellCheck={false}/></label>
      <button className="primary">{t("rdap.view")}</button>
    </form>
  </div>;
}
