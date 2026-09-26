"use client";
import {FormEvent,useEffect,useState} from "react";
import {useI18n} from "@/components/I18nProvider";
import {adminTranslate} from "@/lib/admin-i18n";

type Item={
  tld:string;active:boolean;featured:boolean;promoRegister:number|null;
  cost:{register:number;renew:number;transfer:number};
  effective:{register:number;firstYear:number;promo:number|null;renew:number;transfer:number};
};
type Data={
  settings:{fixedMarkup:number;currency:string};
  items:Item[];
};

export default function PricingClient(){
  const {locale}=useI18n();
  const t=(key:string)=>adminTranslate(locale,key);
  const [data,setData]=useState<Data|null>(null);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);

  async function load(){
    const response=await fetch("/api/admin/pricing",{cache:"no-store"});
    if(response.status===401){location.href="/admin/login";return;}
    const data=await response.json();
    if(!response.ok){setError(data.error||t("loadPricingFailed"));return;}
    setData(data);
  }
  useEffect(()=>{load();},[]);

  async function globalSave(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    setBusy(true);setError("");
    const form=new FormData(event.currentTarget);
    const response=await fetch("/api/admin/pricing",{
      method:"PATCH",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({fixedMarkup:Number(form.get("fixedMarkup"))})
    });
    const next=await response.json();
    setBusy(false);
    if(!response.ok){setError(next.error||t("saveFailed"));return;}
    setData(next);
  }

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
        promoRegister:form.get("promoRegister")?Number(form.get("promoRegister")):null,
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
    <form className="adminPanel adminPricingGlobal" onSubmit={globalSave}>
      <label className="adminInput">{t("fixedMarkup")} {data.settings.currency}
        <input name="fixedMarkup" type="number" step="0.01" min="0" defaultValue={data.settings.fixedMarkup}/>
      </label>
      <p className="adminPricingFormula">{t("pricingFormula")}</p>
      <button className="adminSmallButton" disabled={busy}>{busy?t("saving"):t("saveGlobal")}</button>
    </form>

    <div className="adminPanel">
      <div className="adminPanelHeader"><h2>{t("tldPricing")}</h2><span>{t("pricingPriority")}</span></div>
      <div className="adminTableWrap">
        <div className="adminPriceRow fixed header">
          <span>TLD</span><span>{t("costRegister")}</span><span>{t("costRenew")}</span><span>{t("costTransfer")}</span>
          <span>Promo</span><span>{t("featured")}</span><span>{t("active")}</span><span>{t("effective")}</span>
        </div>
        {data.items.map(item=><form className="adminPriceRow fixed" key={item.tld} onSubmit={event=>rowSave(item.tld,event)}>
          <strong>.{item.tld}</strong>
          <input name="costRegister" type="number" step="0.01" min="0.01" defaultValue={item.cost.register}/>
          <input name="costRenew" type="number" step="0.01" min="0.01" defaultValue={item.cost.renew}/>
          <input name="costTransfer" type="number" step="0.01" min="0.01" defaultValue={item.cost.transfer}/>
          <input name="promoRegister" type="number" step="0.01" min="0.01" placeholder="—" defaultValue={item.promoRegister??""}/>
          <label className="adminCheck"><input name="featured" type="checkbox" defaultChecked={item.featured}/></label>
          <label className="adminCheck"><input name="active" type="checkbox" defaultChecked={item.active}/></label>
          <div className="adminEffective">
            {"1st $"+item.effective.firstYear.toFixed(2)+" · Promo "+(item.effective.promo?"$"+item.effective.promo.toFixed(2):"—")+" · Renew $"+item.effective.renew.toFixed(2)}
            <br/><button className="adminSmallButton">{t("save")}</button>
          </div>
        </form>)}
      </div>
    </div>
  </>;
}
