"use client";
import {FormEvent,useEffect,useState} from "react";
import {useI18n} from "@/components/I18nProvider";
import {adminTranslate} from "@/lib/admin-i18n";

type Item={
  tld:string;active:boolean;featured:boolean;
  cost:{register:number;renew:number;transfer:number};
  markup:{register:number|null;renew:number|null;transfer:number|null};
  override:{register:number|null;renew:number|null;transfer:number|null};
  effective:{register:number;renew:number;transfer:number};
};
type Data={
  settings:{registerMarkup:number;renewMarkup:number;transferMarkup:number;minimumMargin:number;currency:string};
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
    setBusy(true);
    setError("");
    const form=new FormData(event.currentTarget);
    const response=await fetch("/api/admin/pricing",{
      method:"PATCH",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        registerMarkup:form.get("registerMarkup"),
        renewMarkup:form.get("renewMarkup"),
        transferMarkup:form.get("transferMarkup"),
        minimumMargin:form.get("minimumMargin")
      })
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
    const value=(name:string)=>{
      const raw=String(form.get(name)||"").trim();
      return raw===""?null:Number(raw);
    };
    const response=await fetch("/api/admin/pricing/"+encodeURIComponent(tld),{
      method:"PATCH",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        costRegister:value("costRegister"),costRenew:value("costRenew"),costTransfer:value("costTransfer"),
        markupRegister:value("markupRegister"),markupRenew:value("markupRenew"),markupTransfer:value("markupTransfer"),
        overrideRegister:value("overrideRegister"),overrideRenew:value("overrideRenew"),overrideTransfer:value("overrideTransfer"),
        featured:form.get("featured")==="on",active:form.get("active")==="on"
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
      <label className="adminInput">{t("registerMarkup")}<input name="registerMarkup" type="number" step="0.01" defaultValue={data.settings.registerMarkup}/></label>
      <label className="adminInput">{t("renewMarkup")}<input name="renewMarkup" type="number" step="0.01" defaultValue={data.settings.renewMarkup}/></label>
      <label className="adminInput">{t("transferMarkup")}<input name="transferMarkup" type="number" step="0.01" defaultValue={data.settings.transferMarkup}/></label>
      <label className="adminInput">{t("minimumMargin")} {data.settings.currency}<input name="minimumMargin" type="number" step="0.01" defaultValue={data.settings.minimumMargin}/></label>
      <button className="adminSmallButton" disabled={busy}>{busy?t("saving"):t("saveGlobal")}</button>
    </form>

    <div className="adminPanel">
      <div className="adminPanelHeader"><h2>{t("tldPricing")}</h2><span>{t("pricingPriority")}</span></div>
      <div className="adminTableWrap">
        <div className="adminPriceRow header">
          <span>TLD</span><span>{t("costRegister")}</span><span>{t("costRenew")}</span><span>{t("costTransfer")}</span>
          <span>{t("markupRegister")}</span><span>{t("markupRenew")}</span><span>{t("markupTransfer")}</span>
          <span>{t("overrideRegister")}</span><span>{t("overrideRenew")}</span><span>{t("overrideTransfer")}</span>
          <span>{t("featured")}</span><span>{t("active")}</span><span>{t("effective")}</span>
        </div>
        {data.items.map(item=><form className="adminPriceRow" key={item.tld} onSubmit={event=>rowSave(item.tld,event)}>
          <strong>.{item.tld}</strong>
          <input name="costRegister" type="number" step="0.01" defaultValue={item.cost.register}/>
          <input name="costRenew" type="number" step="0.01" defaultValue={item.cost.renew}/>
          <input name="costTransfer" type="number" step="0.01" defaultValue={item.cost.transfer}/>
          <input name="markupRegister" type="number" step="0.01" placeholder={t("global")} defaultValue={item.markup.register??""}/>
          <input name="markupRenew" type="number" step="0.01" placeholder={t("global")} defaultValue={item.markup.renew??""}/>
          <input name="markupTransfer" type="number" step="0.01" placeholder={t("global")} defaultValue={item.markup.transfer??""}/>
          <input name="overrideRegister" type="number" step="0.01" placeholder={t("none")} defaultValue={item.override.register??""}/>
          <input name="overrideRenew" type="number" step="0.01" placeholder={t("none")} defaultValue={item.override.renew??""}/>
          <input name="overrideTransfer" type="number" step="0.01" placeholder={t("none")} defaultValue={item.override.transfer??""}/>
          <label className="adminCheck"><input name="featured" type="checkbox" defaultChecked={item.featured}/></label>
          <label className="adminCheck"><input name="active" type="checkbox" defaultChecked={item.active}/></label>
          <div className="adminEffective">
            {"$"+item.effective.register.toFixed(2)+" / $"+item.effective.renew.toFixed(2)+" / $"+item.effective.transfer.toFixed(2)}
            <br/><button className="adminSmallButton">{t("save")}</button>
          </div>
        </form>)}
      </div>
    </div>
  </>;
}
