"use client";
import {FormEvent,useEffect,useState} from "react";
import {useI18n} from "@/components/I18nProvider";
import {adminTranslate} from "@/lib/admin-i18n";

type Item={
  tld:string;
  active:boolean;
  featured:boolean;
  cost:{register:number;renew:number;transfer:number};
  effective:{register:number;renew:number;transfer:number};
};
type Data={
  settings:{serviceMargin:number;paymentFeeRate:number;currency:string};
  items:Item[];
};

export default function PricingClient(){
  const {locale}=useI18n();
  const t=(key:string)=>adminTranslate(locale,key);
  const [data,setData]=useState<Data|null>(null);
  const [error,setError]=useState("");

  async function load(){
    const response=await fetch("/api/admin/pricing",{cache:"no-store"});
    if(response.status===401){location.href="/admin/login";return;}
    const next=await response.json();
    if(!response.ok){setError(next.error||t("loadPricingFailed"));return;}
    setData(next);
  }
  useEffect(()=>{load();},[]);

  async function rowSave(tld:string,event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    setError("");
    const form=new FormData(event.currentTarget);
    const response=await fetch("/api/admin/pricing/"+encodeURIComponent(tld),{
      method:"PATCH",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        costRegister:Number(form.get("costRegister")),
        costRenew:Number(form.get("costRenew")),
        costTransfer:Number(form.get("costTransfer")),
        featured:form.get("featured")==="on",
        active:form.get("active")==="on"
      })
    });
    const next=await response.json();
    if(!response.ok){setError(next.error||t("saveFailed"));return;}
    setData(next);
  }

  if(!data)return <div className="adminPanel"><div className="adminPanelHeader"><h2>{t("loadingPricing")}</h2></div>{error&&<p className="error adminPad">{error}</p>}</div>;

  return <>
    {error&&<p className="error">{error}</p>}
    <div className="adminPanel adminPricingPolicy">
      <div>
        <span>{t("pricingPolicy")}</span>
        <strong>{t("pricingFormula")}</strong>
      </div>
      <dl>
        <div><dt>{t("paymentFeeRate")}</dt><dd>{(data.settings.paymentFeeRate*100).toFixed(1)}%</dd></div>
        <div><dt>{t("serviceMargin")}</dt><dd>{"$"+data.settings.serviceMargin.toFixed(2)}</dd></div>
      </dl>
    </div>

    <div className="adminPanel">
      <div className="adminPanelHeader"><h2>{t("tldPricing")}</h2><span>{t("pricingPriority")}</span></div>
      <div className="adminTableWrap">
        <div className="adminPriceRow fixed pricingPolicyRow header">
          <span>TLD</span><span>{t("costRegister")}</span><span>{t("costRenew")}</span><span>{t("costTransfer")}</span>
          <span>{t("featured")}</span><span>{t("active")}</span><span>{t("effective")}</span>
        </div>
        {data.items.map(item=><form className="adminPriceRow fixed pricingPolicyRow" key={item.tld} onSubmit={event=>rowSave(item.tld,event)}>
          <strong>.{item.tld}</strong>
          <input name="costRegister" type="number" step="0.01" min="0.01" defaultValue={item.cost.register}/>
          <input name="costRenew" type="number" step="0.01" min="0.01" defaultValue={item.cost.renew}/>
          <input name="costTransfer" type="number" step="0.01" min="0.01" defaultValue={item.cost.transfer}/>
          <label className="adminCheck"><input name="featured" type="checkbox" defaultChecked={item.featured}/></label>
          <label className="adminCheck"><input name="active" type="checkbox" defaultChecked={item.active}/></label>
          <div className="adminEffective">
            {"Register $"+item.effective.register.toFixed(2)+" · Renew $"+item.effective.renew.toFixed(2)+" · Transfer $"+item.effective.transfer.toFixed(2)}
            <br/><button className="adminSmallButton">{t("save")}</button>
          </div>
        </form>)}
      </div>
    </div>
  </>;
}
