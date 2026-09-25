"use client";
import {FormEvent,useState} from "react";
import {useI18n} from "@/components/I18nProvider";
export default function Security(){
  const {t}=useI18n();const [error,setError]=useState("");const [saved,setSaved]=useState(false);
  async function change(e:FormEvent<HTMLFormElement>){e.preventDefault();setError("");setSaved(false);const f=new FormData(e.currentTarget);const r=await fetch("/api/account/security",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({currentPassword:f.get("currentPassword"),newPassword:f.get("newPassword")})});const d=await r.json();if(r.status===401){location.href="/login";return;}if(!r.ok){setError(d.error);return;}setSaved(true);e.currentTarget.reset();}
  async function signOutAll(){const r=await fetch("/api/account/security",{method:"DELETE"});if(r.ok)location.href="/login";}
  return <div className="page accountPage"><p className="kicker">{t("account.securityKicker")}</p><h1 className="pageTitle">{t("account.securityTitle")}</h1><p className="pageIntro">{t("account.securityCopy")}</p><form className="form securityForm" onSubmit={change}><label className="field">{t("account.currentPassword")}<input name="currentPassword" type="password" required/></label><label className="field">{t("account.newPassword")}<input name="newPassword" type="password" minLength={12} required/></label>{saved&&<p className="success">{t("account.passwordSaved")}</p>}{error&&<p className="error">{error}</p>}<button className="primary">{t("account.changePassword")}</button></form><div className="securityDanger"><h2>{t("account.sessionsTitle")}</h2><p>{t("account.sessionsCopy")}</p><button className="secondary" type="button" onClick={signOutAll}>{t("account.signOutAll")}</button></div></div>;
}
