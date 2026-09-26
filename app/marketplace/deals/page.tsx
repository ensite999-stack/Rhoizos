"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {useI18n} from "@/components/I18nProvider";

type Deal={
  id:string;
  listingId:string;
  domain:string;
  role:"seller"|"buyer";
  status:"pending"|"accepted"|"rejected"|"cancelled"|"released";
  askingPrice:number|null;
  offerAmount:number|null;
  message:string;
  counterpartyEmail:string|null;
  acceptedAt:string|null;
  releasedAt:string|null;
};

export default function MarketplaceDeals(){
  const {t}=useI18n();
  const [items,setItems]=useState<Deal[]>([]);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState("");

  async function load(){
    const response=await fetch("/api/marketplace/deals",{cache:"no-store"});
    if(response.status===401){location.href="/login";return;}
    const data=await response.json();
    if(!response.ok){setError(data.error||t("marketplace.loadFailed"));return;}
    setItems(data.items||[]);
  }
  useEffect(()=>{load();},[]);

  async function act(deal:Deal,action:"accept"|"reject"|"cancel"|"release"){
    if(action==="release"&&!window.confirm(t("marketplace.releaseConfirm"))) return;
    setBusy(deal.id+action);setError("");
    const response=await fetch("/api/marketplace/deals/"+deal.id,{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({action,confirmRelease:action==="release"})
    });
    const data=await response.json();setBusy("");
    if(!response.ok){setError(data.error||t("marketplace.actionFailed"));return;}
    await load();
  }

  return <div className="page wide">
    <div className="marketHeroRow">
      <div>
        <p className="kicker">{t("marketplace.myDealsKicker")}</p>
        <h1 className="pageTitle">{t("marketplace.myDealsTitle")}</h1>
        <p className="pageIntro">{t("marketplace.myDealsCopy")}</p>
      </div>
      <Link className="secondaryLink" href="/marketplace">{t("marketplace.backToMarket")}</Link>
    </div>
    {error&&<p className="error">{error}</p>}
    <div className="marketDeals">
      {items.map(item=><article className="marketDealCard" key={item.id}>
        <div className="marketDealHeading">
          <div><span>{item.role==="seller"?t("marketplace.youSell"):t("marketplace.youBuy")}</span><h2>{item.domain}</h2></div>
          <b className={"dealStatus "+item.status}>{t("marketplace.status."+item.status)}</b>
        </div>
        <dl>
          <div><dt>{t("marketplace.offerAmount")}</dt><dd>{item.offerAmount?"$"+item.offerAmount.toFixed(2):"—"}</dd></div>
          {item.askingPrice&&<div><dt>{t("marketplace.askingPrice")}</dt><dd>{"$"+item.askingPrice.toFixed(2)}</dd></div>}
        </dl>
        {item.message&&<p className="marketDealMessage">{item.message}</p>}
        {item.counterpartyEmail&&<div className="marketContact">
          <span>{t("marketplace.counterpartyContact")}</span>
          <a href={"mailto:"+item.counterpartyEmail}>{item.counterpartyEmail}</a>
          <small>{t("marketplace.externalPaymentReminder")}</small>
        </div>}
        {item.status==="released"&&<p className="success">{item.role==="buyer"?t("marketplace.releasedToYou"):t("marketplace.releaseComplete")}</p>}
        <div className="formActions marketDealActions">
          {item.role==="seller"&&item.status==="pending"&&<>
            <button className="primary" disabled={!!busy} onClick={()=>act(item,"accept")}>{t("marketplace.accept")}</button>
            <button className="secondary" disabled={!!busy} onClick={()=>act(item,"reject")}>{t("marketplace.reject")}</button>
          </>}
          {item.status==="accepted"&&item.role==="seller"&&<>
            <button className="primary" disabled={!!busy} onClick={()=>act(item,"release")}>{t("marketplace.releaseDomain")}</button>
            <button className="secondary" disabled={!!busy} onClick={()=>act(item,"cancel")}>{t("marketplace.cancelDeal")}</button>
          </>}
          {item.role==="buyer"&&(item.status==="pending"||item.status==="accepted")&&
            <button className="secondary" disabled={!!busy} onClick={()=>act(item,"cancel")}>{t("marketplace.cancelDeal")}</button>}
        </div>
      </article>)}
    </div>
    {!items.length&&!error&&<p className="fine marketEmpty">{t("marketplace.noDeals")}</p>}
  </div>;
}
