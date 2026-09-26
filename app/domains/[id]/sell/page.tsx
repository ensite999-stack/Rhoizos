"use client";
import Link from "next/link";
import {FormEvent,useEffect,useState} from "react";
import {useParams} from "next/navigation";
import {useI18n} from "@/components/I18nProvider";

type Sale={
  id:string;
  domain:string;
  status:"active"|"reserved";
  askingPrice:number|null;
  allowOffers:boolean;
  description:string;
};

export default function SellDomain(){
  const {id}=useParams<{id:string}>();
  const {t}=useI18n();
  const [domain,setDomain]=useState("");
  const [sale,setSale]=useState<Sale|null>(null);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);

  async function load(){
    const response=await fetch("/api/domains/"+id+"/marketplace",{cache:"no-store"});
    if(response.status===401){location.href="/login";return;}
    const data=await response.json();
    if(!response.ok){setError(data.error||t("marketplace.loadFailed"));return;}
    setDomain(data.domain||"");setSale(data.sale||null);
  }
  useEffect(()=>{load();},[id]);

  async function save(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setBusy(true);setError("");
    const form=new FormData(event.currentTarget);
    const raw=String(form.get("askingPrice")||"").trim();
    const response=await fetch("/api/domains/"+id+"/marketplace",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        askingPrice:raw?Number(raw):null,
        allowOffers:form.get("allowOffers")==="on",
        description:form.get("description")
      })
    });
    const data=await response.json();setBusy(false);
    if(!response.ok){setError(data.error||t("marketplace.saveFailed"));return;}
    setSale(data.sale||null);
  }

  async function cancel(){
    setBusy(true);setError("");
    const response=await fetch("/api/domains/"+id+"/marketplace",{method:"DELETE"});
    const data=await response.json();setBusy(false);
    if(!response.ok){setError(data.error||t("marketplace.cancelFailed"));return;}
    setSale(null);
  }

  const reserved=sale?.status==="reserved";

  return <div className="page">
    <p className="kicker">{t("marketplace.sellKicker")}</p>
    <h1 className="pageTitle">{t("marketplace.sellTitle")}</h1>
    <p className="pageIntro">{domain||t("common.loading")}</p>

    {sale&&<div className="featureStatus">
      <strong>{reserved?t("marketplace.reservedListing"):t("marketplace.activeListing")}</strong>
      <span>{sale.askingPrice?t("marketplace.askingPrice")+": $"+sale.askingPrice.toFixed(2):t("marketplace.offersOpen")}</span>
      {reserved&&<Link href="/marketplace/deals">{t("marketplace.manageDeal")}</Link>}
    </div>}

    <div className="warningCard">
      <strong>{t("marketplace.noticeTitle")}</strong>
      <p>{t("marketplace.notice")}</p>
    </div>

    <form key={(sale?.id||"new")+"-"+(sale?.askingPrice??"")+"-"+sale?.allowOffers} className="form featureForm" onSubmit={save}>
      <label className="field">{t("marketplace.askingPrice")}
        <input name="askingPrice" type="number" min="0.01" step="0.01" defaultValue={sale?.askingPrice??""} disabled={reserved}/>
      </label>
      <label className="featureConsent">
        <input name="allowOffers" type="checkbox" defaultChecked={sale?.allowOffers??true} disabled={reserved}/>
        <span>{t("marketplace.allowOffers")}</span>
      </label>
      <label className="field">{t("marketplace.description")}
        <textarea name="description" maxLength={2000} rows={5} defaultValue={sale?.description||""} disabled={reserved}/>
      </label>
      {error&&<p className="error">{error}</p>}
      <div className="formActions">
        <button className="primary" disabled={busy||reserved}>{busy?t("common.loading"):sale?t("marketplace.update"):t("marketplace.list")}</button>
        {sale&&<button className="secondary" type="button" onClick={cancel} disabled={busy||reserved}>{t("marketplace.cancel")}</button>}
        <Link className="secondaryLink" href="/marketplace/deals">{t("marketplace.myDeals")}</Link>
      </div>
    </form>
  </div>;
}
