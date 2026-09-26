"use client";
import Link from "next/link";
import {useEffect,useMemo,useState} from "react";
import {useI18n} from "@/components/I18nProvider";

type Listing={
  id:string;
  domain:string;
  askingPrice:number|null;
  allowOffers:boolean;
  description:string;
  status:string;
};

export default function Marketplace(){
  const {t}=useI18n();
  const [items,setItems]=useState<Listing[]>([]);
  const [query,setQuery]=useState("");
  const [error,setError]=useState("");

  useEffect(()=>{
    fetch("/api/marketplace",{cache:"no-store"}).then(async response=>{
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||t("marketplace.loadFailed"));
      setItems(data.items||[]);
    }).catch(error=>setError(error.message));
  },[t]);

  const visible=useMemo(()=>{
    const needle=query.trim().toLowerCase();
    return needle?items.filter(item=>item.domain.toLowerCase().includes(needle)):items;
  },[items,query]);

  return <div className="page wide">
    <div className="marketHeroRow">
      <div>
        <p className="kicker">{t("marketplace.kicker")}</p>
        <h1 className="pageTitle">{t("marketplace.title")}</h1>
        <p className="pageIntro">{t("marketplace.copy")}</p>
      </div>
      <Link className="secondaryLink" href="/marketplace/deals">{t("marketplace.myDeals")}</Link>
    </div>

    <div className="marketTrustStrip">
      <strong>{t("marketplace.freeTitle")}</strong>
      <span>{t("marketplace.freeCopy")}</span>
    </div>

    <label className="marketSearch">
      <span>{t("marketplace.search")}</span>
      <input value={query} onChange={event=>setQuery(event.target.value)} placeholder="example.com"/>
    </label>

    {error&&<p className="error">{error}</p>}
    <div className="marketGrid">
      {visible.map(item=><article className="marketCard" key={item.id}>
        <div>
          <span>{item.allowOffers?t("marketplace.offersOpen"):t("marketplace.fixedPrice")}</span>
          <h2>{item.domain}</h2>
        </div>
        <dl>
          <div><dt>{t("marketplace.askingPrice")}</dt><dd>{item.askingPrice?"$"+item.askingPrice.toFixed(2):t("marketplace.makeOffer")}</dd></div>
          <div><dt>{t("marketplace.platformFee")}</dt><dd>0%</dd></div>
        </dl>
        {item.description&&<p className="marketDescription">{item.description}</p>}
        <Link className="primaryLink" href={"/marketplace/"+item.id}>{t("marketplace.viewListing")}</Link>
      </article>)}
    </div>
    {!visible.length&&!error&&<p className="fine marketEmpty">{query?t("marketplace.noSearchResults"):t("marketplace.empty")}</p>}
  </div>;
}
