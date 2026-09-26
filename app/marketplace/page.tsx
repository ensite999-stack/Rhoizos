"use client";
import {useEffect,useState} from "react";
import {useI18n} from "@/components/I18nProvider";

type Sale={
  domain:string;status:string;reserve:number|null;buyNow:number|null;saleType:string;
  paymentPlanOffered:boolean;endDate:string|null;timeRemaining:string|null;
};

export default function Marketplace(){
  const {t}=useI18n();
  const [items,setItems]=useState<Sale[]>([]);
  const [error,setError]=useState("");

  useEffect(()=>{
    fetch("/api/marketplace",{cache:"no-store"}).then(async response=>{
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||t("marketplace.loadFailed"));
      setItems(data.items||[]);
    }).catch(error=>setError(error.message));
  },[t]);

  function namesiloUrl(domain:string){
    const params=new URLSearchParams({
      domain_search_keyword:domain,
      domain_search_keyword_location:"anywhere"
    });
    return "https://www.namesilo.com/Marketplace?"+params.toString();
  }

  return <div className="page wide">
    <p className="kicker">{t("marketplace.kicker")}</p>
    <h1 className="pageTitle">{t("marketplace.title")}</h1>
    <p className="pageIntro">{t("marketplace.copy")}</p>
    {error&&<p className="error">{error}</p>}
    <div className="marketGrid">
      {items.map(item=><article className="marketCard" key={item.domain}>
        <div><span>{item.saleType==="auction"?t("marketplace.auction"):t("marketplace.offer")}</span><h2>{item.domain}</h2></div>
        <dl>
          <div><dt>{t("marketplace.buyNow")}</dt><dd>{item.buyNow?"$"+item.buyNow.toFixed(2):"—"}</dd></div>
          <div><dt>{t("marketplace.reserve")}</dt><dd>{item.reserve?"$"+item.reserve.toFixed(2):"—"}</dd></div>
        </dl>
        <a className="primaryLink" href={namesiloUrl(item.domain)} target="_blank" rel="noopener noreferrer">{t("marketplace.viewAtNameSilo")}</a>
      </article>)}
    </div>
    {!items.length&&!error&&<p className="fine marketEmpty">{t("marketplace.empty")}</p>}
  </div>;
}
