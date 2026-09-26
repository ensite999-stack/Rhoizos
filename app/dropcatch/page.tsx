"use client";
import {FormEvent,useEffect,useState} from "react";
import {useI18n} from "@/components/I18nProvider";

type RequestItem={
  id:string;domain:string;years:number;private:boolean;auto_renew:boolean;status:string;
  last_error:string|null;attempts:number;caught_at:string|null;order_id:string|null;
  amount_usd:number|null;payment_status:string|null;checkout_url:string|null;
};

export default function Dropcatch(){
  const {t}=useI18n();
  const [items,setItems]=useState<RequestItem[]>([]);
  const [windowOpen,setWindowOpen]=useState(false);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);

  async function load(){
    const response=await fetch("/api/dropcatch",{cache:"no-store"});
    if(response.status===401){location.href="/login";return;}
    const data=await response.json();
    if(!response.ok){setError(data.error||t("dropcatch.loadFailed"));return;}
    setItems(data.items||[]);setWindowOpen(Boolean(data.windowOpen));
  }
  useEffect(()=>{load();},[]);

  async function create(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setBusy(true);setError("");
    const form=new FormData(event.currentTarget);
    const response=await fetch("/api/dropcatch",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        domain:form.get("domain"),
        years:Number(form.get("years")||1),
        private:form.get("private")==="on",
        autoRenew:form.get("autoRenew")==="on"
      })
    });
    const data=await response.json();setBusy(false);
    if(!response.ok){setError(data.error||t("dropcatch.createFailed"));return;}
    event.currentTarget.reset();await load();
  }

  async function cancel(id:string){
    const response=await fetch("/api/dropcatch/"+id,{method:"DELETE"});
    const data=await response.json();
    if(!response.ok){setError(data.error||t("dropcatch.cancelFailed"));return;}
    await load();
  }

  async function checkout(item:RequestItem){
    if(item.checkout_url){location.href=item.checkout_url;return;}
    const response=await fetch("/api/dropcatch/"+item.id+"/checkout",{method:"POST"});
    const data=await response.json();
    if(!response.ok){setError(data.error||t("dropcatch.checkoutFailed"));return;}
    location.href=data.checkoutUrl;
  }

  return <div className="page wide">
    <p className="kicker">{t("dropcatch.kicker")}</p>
    <h1 className="pageTitle">{t("dropcatch.title")}</h1>
    <p className="pageIntro">{t("dropcatch.copy")}</p>

    <div className="warningCard">
      <strong>{windowOpen?t("dropcatch.windowOpen"):t("dropcatch.windowClosed")}</strong>
      <p>{t("dropcatch.billingNote")}</p>
    </div>

    <form className="form dropcatchForm" onSubmit={create}>
      <div className="formGrid">
        <label className="field">{t("common.domain")}<input name="domain" placeholder="example.com" required spellCheck={false}/></label>
        <label className="field">{t("dropcatch.years")}<input name="years" type="number" min="1" max="10" defaultValue="1"/></label>
      </div>
      <div className="featureChecks">
        <label className="featureConsent"><input name="private" type="checkbox" defaultChecked/><span>{t("dropcatch.privacy")}</span></label>
        <label className="featureConsent"><input name="autoRenew" type="checkbox"/><span>{t("dropcatch.autoRenew")}</span></label>
      </div>
      {error&&<p className="error">{error}</p>}
      <button className="primary" disabled={busy}>{busy?t("common.loading"):t("dropcatch.submit")}</button>
    </form>

    <div className="featureList">
      {items.map(item=><div className="featureListRow dropcatchRow" key={item.id}>
        <div>
          <strong>{item.domain}</strong>
          <span>{t("dropcatch.status")}: {item.status.replace(/_/g," ")} · {t("dropcatch.attempts")}: {item.attempts}</span>
          {item.last_error&&<small>{item.last_error}</small>}
          {item.amount_usd&&<small>{t("dropcatch.claimPrice")}: {"$"+Number(item.amount_usd).toFixed(2)}</small>}
        </div>
        <div className="actions">
          {(item.status==="caught"||item.status==="awaiting_payment")&&item.payment_status!=="paid"&&
            <button className="primary" onClick={()=>checkout(item)}>{t("dropcatch.payToClaim")}</button>}
          {(item.status==="pending"||item.status==="failed")&&<button className="secondary" onClick={()=>cancel(item.id)}>{t("dropcatch.cancel")}</button>}
        </div>
      </div>)}
    </div>
  </div>;
}
