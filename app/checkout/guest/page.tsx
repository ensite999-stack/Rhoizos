"use client";
import {FormEvent,useEffect,useState} from "react";
import {useI18n} from "@/components/I18nProvider";

type LinkInfo={email:string;domain:string;price:number;premium:boolean;expiresAt:string};

export default function GuestCheckout(){
  const {t}=useI18n();
  const [token,setToken]=useState("");
  const [domain,setDomain]=useState("");
  const [info,setInfo]=useState<LinkInfo|null>(null);
  const [sent,setSent]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");

  useEffect(()=>{
    const params=new URLSearchParams(window.location.search);
    const nextToken=params.get("token")||"";
    const nextDomain=params.get("domain")||"";
    setToken(nextToken);
    setDomain(nextDomain);
    if(nextToken){
      setBusy(true);
      fetch("/api/guest/purchase-link?token="+encodeURIComponent(nextToken),{cache:"no-store"})
        .then(async response=>{
          const data=await response.json();
          if(!response.ok)throw new Error(data.error||t("guest.invalid"));
          setInfo(data);
        })
        .catch(error=>setError(error instanceof Error?error.message:t("guest.invalid")))
        .finally(()=>setBusy(false));
    }
  },[t]);

  async function requestLink(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    setBusy(true);setError("");
    const form=new FormData(event.currentTarget);
    const response=await fetch("/api/guest/purchase-link",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({email:form.get("email"),domain})
    });
    const data=await response.json();
    if(!response.ok){setError(data.error||t("guest.sendFailed"));setBusy(false);return;}
    setSent(true);setBusy(false);
  }

  async function complete(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    setBusy(true);setError("");
    const body=Object.fromEntries(new FormData(event.currentTarget));
    const response=await fetch("/api/guest/complete",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({...body,token})
    });
    const data=await response.json();
    if(!response.ok){setError(data.error||t("guest.completeFailed"));setBusy(false);return;}
    location.href=data.checkoutUrl;
  }

  if(token&&busy&&!info)return <div className="page"><p className="pageIntro">{t("common.loading")}</p></div>;

  return <div className="page guestCheckout">
    <p className="kicker">{t("guest.kicker")}</p>
    <h1 className="pageTitle">{t("guest.title")}</h1>

    {!token&&<>
      <p className="pageIntro">{t("guest.copy")}</p>
      {domain&&<div className="guestDomainCard"><strong>{domain}</strong></div>}
      {sent
        ?<div className="guestSent"><strong>{t("guest.sentTitle")}</strong><p>{t("guest.sentCopy")}</p></div>
        :<form className="form" onSubmit={requestLink}>
          <label className="field">{t("common.email")}<input name="email" type="email" autoComplete="email" required/></label>
          {error&&<p className="error">{error}</p>}
          <button className="primary" disabled={busy||!domain}>{busy?t("guest.sending"):t("guest.sendLink")}</button>
        </form>}
    </>}

    {token&&info&&<>
      <p className="pageIntro">{t("guest.verifiedCopy")}</p>
      <div className="guestDomainCard"><div><span>{t("common.domain")}</span><strong>{info.domain}</strong></div><b>{"$"+info.price.toFixed(2)}</b></div>
      <form className="form" onSubmit={complete}>
        <div className="formGrid">
          <label className="field">{t("signup.first")}<input name="firstName" required/></label>
          <label className="field">{t("signup.last")}<input name="lastName" required/></label>
          <label className="field full">{t("common.email")}<input value={info.email} readOnly/></label>
          <label className="field">{t("signup.accountType")}<select name="accountType"><option value="individual">{t("signup.individual")}</option><option value="company">{t("common.company")}</option></select></label>
          <label className="field">{t("common.company")}<input name="company"/></label>
          <label className="field">{t("signup.phone")}<input name="phone" type="tel" autoComplete="tel" required/></label>
          <label className="field">{t("signup.country")}<input name="country" autoComplete="country" maxLength={2} required/></label>
          <label className="field">{t("signup.state")}<input name="state" required/></label>
          <label className="field">{t("common.city")}<input name="city" required/></label>
          <label className="field full">{t("signup.street")}<input name="address1" required/></label>
          <label className="field">{t("signup.postcode")}<input name="postcode" required/></label>
        </div>
        <p className="fine">{t("guest.contactWhy")}</p>
        {error&&<p className="error">{error}</p>}
        <button className="primary" disabled={busy}>{busy?t("guest.starting"):t("guest.pay")}</button>
      </form>
    </>}
  </div>;
}
