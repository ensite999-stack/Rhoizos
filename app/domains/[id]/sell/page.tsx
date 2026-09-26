"use client";
import {FormEvent,useEffect,useState} from "react";
import {useParams} from "next/navigation";
import {useI18n} from "@/components/I18nProvider";

type Sale={
  domain:string;status:string;reserve:number|null;buyNow:number|null;saleType:string;
  paymentPlanOffered:boolean;endDate:string|null;timeRemaining:string|null;
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
    const numberOrNull=(name:string)=>form.get(name)?Number(form.get(name)):null;
    const response=await fetch("/api/domains/"+id+"/marketplace",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        saleType:form.get("saleType"),
        reserve:numberOrNull("reserve"),
        buyNow:numberOrNull("buyNow"),
        description:form.get("description"),
        paymentPlanOffered:form.get("paymentPlanOffered")==="on"
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

  return <div className="page">
    <p className="kicker">{t("marketplace.sellKicker")}</p>
    <h1 className="pageTitle">{t("marketplace.sellTitle")}</h1>
    <p className="pageIntro">{domain||t("common.loading")}</p>

    {sale&&<div className="featureStatus">
      <strong>{t("marketplace.activeListing")}</strong>
      <span>{sale.saleType.replace(/_/g," ")} · {sale.status||t("status.active")}</span>
      <small>{sale.buyNow?t("marketplace.buyNow")+": $"+sale.buyNow.toFixed(2):""}</small>
    </div>}

    <div className="warningCard">
      <strong>{t("marketplace.noticeTitle")}</strong>
      <p>{t("marketplace.notice")}</p>
    </div>

    <form key={(sale?.domain||"new")+"-"+(sale?.saleType||"")+"-"+(sale?.buyNow||"")+"-"+(sale?.reserve||"")} className="form featureForm" onSubmit={save}>
      <label className="field">{t("marketplace.saleType")}
        <select name="saleType" defaultValue={sale?.saleType==="auction"?"auction":"offer_counter_offer"}>
          <option value="offer_counter_offer">{t("marketplace.offer")}</option>
          <option value="auction">{t("marketplace.auction")}</option>
        </select>
      </label>
      <div className="formGrid">
        <label className="field">{t("marketplace.buyNow")}<input name="buyNow" type="number" min="0.01" step="0.01" defaultValue={sale?.buyNow??""}/></label>
        <label className="field">{t("marketplace.reserve")}<input name="reserve" type="number" min="0.01" step="0.01" defaultValue={sale?.reserve??""}/></label>
      </div>
      <label className="field">{t("marketplace.description")}<textarea name="description" maxLength={2000} rows={5}/></label>
      <label className="featureConsent"><input name="paymentPlanOffered" type="checkbox" defaultChecked={sale?.paymentPlanOffered}/><span>{t("marketplace.paymentPlan")}</span></label>
      {error&&<p className="error">{error}</p>}
      <div className="formActions">
        <button className="primary" disabled={busy}>{busy?t("common.loading"):sale?t("marketplace.update"):t("marketplace.list")}</button>
        {sale&&<button className="secondary" type="button" onClick={cancel} disabled={busy}>{t("marketplace.cancel")}</button>}
      </div>
    </form>
  </div>;
}
