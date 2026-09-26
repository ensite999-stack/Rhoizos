"use client";
import Link from "next/link";
import {FormEvent,useEffect,useState} from "react";
import {useParams} from "next/navigation";
import {useI18n} from "@/components/I18nProvider";

type Listing={
  id:string;
  domain:string;
  askingPrice:number|null;
  allowOffers:boolean;
  description:string;
  status:"active"|"reserved";
};

export default function MarketplaceListingPage(){
  const {id}=useParams<{id:string}>();
  const {t}=useI18n();
  const [item,setItem]=useState<Listing|null>(null);
  const [error,setError]=useState("");
  const [success,setSuccess]=useState("");
  const [busy,setBusy]=useState(false);

  useEffect(()=>{
    fetch("/api/marketplace/"+id,{cache:"no-store"}).then(async response=>{
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||t("marketplace.loadFailed"));
      setItem(data.item||null);
    }).catch(error=>setError(error.message));
  },[id,t]);

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setBusy(true);setError("");setSuccess("");
    const form=new FormData(event.currentTarget);
    const raw=String(form.get("offerAmount")||"").trim();
    const response=await fetch("/api/marketplace/"+id+"/offers",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        offerAmount:raw?Number(raw):null,
        message:String(form.get("message")||"")
      })
    });
    if(response.status===401){
      location.href="/login";
      return;
    }
    const data=await response.json();setBusy(false);
    if(!response.ok){setError(data.error||t("marketplace.offerFailed"));return;}
    setSuccess(t("marketplace.offerSent"));
  }

  if(!item&&!error) return <div className="page"><p>{t("common.loading")}</p></div>;

  return <div className="page">
    <Link className="backLink" href="/marketplace">← {t("marketplace.backToMarket")}</Link>
    {error&&!item&&<p className="error">{error}</p>}
    {item&&<>
      <p className="kicker">{t("marketplace.kicker")}</p>
      <h1 className="pageTitle marketDomainTitle">{item.domain}</h1>
      <div className="marketListingSummary">
        <div><span>{t("marketplace.askingPrice")}</span><strong>{item.askingPrice?"$"+item.askingPrice.toFixed(2):t("marketplace.makeOffer")}</strong></div>
        <div><span>{t("marketplace.platformFee")}</span><strong>0%</strong></div>
        <div><span>{t("marketplace.statusLabel")}</span><strong>{item.status==="reserved"?t("marketplace.reserved"):t("status.active")}</strong></div>
      </div>

      {item.description&&<div className="marketListingDescription"><p>{item.description}</p></div>}

      <div className="warningCard">
        <strong>{t("marketplace.directTradeTitle")}</strong>
        <p>{t("marketplace.directTradeCopy")}</p>
      </div>

      {item.status==="active"
        ?<form className="form featureForm marketOfferForm" onSubmit={submit}>
          <h2>{item.allowOffers?t("marketplace.makeOffer"):t("marketplace.requestAtPrice")}</h2>
          <label className="field">{t("marketplace.offerAmount")}
            <input
              name="offerAmount"
              type="number"
              min="0.01"
              step="0.01"
              required={item.allowOffers&&item.askingPrice===null}
              defaultValue={item.askingPrice??""}
              readOnly={!item.allowOffers}
            />
          </label>
          <label className="field">{t("marketplace.message")}
            <textarea name="message" maxLength={1000} rows={5} placeholder={t("marketplace.messagePlaceholder")}/>
          </label>
          <p className="fine">{t("marketplace.contactAfterAccept")}</p>
          {error&&<p className="error">{error}</p>}
          {success&&<p className="success">{success} <Link href="/marketplace/deals">{t("marketplace.openDeals")}</Link></p>}
          <button className="primary" disabled={busy}>{busy?t("common.loading"):t("marketplace.sendOffer")}</button>
        </form>
        :<div className="featureStatus"><strong>{t("marketplace.reservedListing")}</strong><span>{t("marketplace.reservedCopy")}</span></div>}
    </>}
  </div>;
}
