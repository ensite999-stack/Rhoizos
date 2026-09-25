"use client";
import {FormEvent,useEffect,useState} from "react";

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
  const [data,setData]=useState<Data|null>(null);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);

  async function load(){
    const r=await fetch("/api/admin/pricing",{cache:"no-store"});
    if(r.status===401){location.href="/admin/login";return;}
    const d=await r.json();
    if(!r.ok){setError(d.error||"Could not load pricing.");return;}
    setData(d);
  }
  useEffect(()=>{load();},[]);

  async function globalSave(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setBusy(true);setError("");
    const f=new FormData(e.currentTarget);
    const r=await fetch("/api/admin/pricing",{
      method:"PATCH",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        registerMarkup:f.get("registerMarkup"),
        renewMarkup:f.get("renewMarkup"),
        transferMarkup:f.get("transferMarkup"),
        minimumMargin:f.get("minimumMargin")
      })
    });
    const d=await r.json();setBusy(false);
    if(!r.ok){setError(d.error||"Save failed.");return;}
    setData(d);
  }

  async function rowSave(tld:string,e:FormEvent<HTMLFormElement>){
    e.preventDefault();setError("");
    const f=new FormData(e.currentTarget);
    const val=(name:string)=>{const x=String(f.get(name)||"").trim();return x===""?null:Number(x);};
    const r=await fetch("/api/admin/pricing/"+encodeURIComponent(tld),{
      method:"PATCH",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        costRegister:val("costRegister"),costRenew:val("costRenew"),costTransfer:val("costTransfer"),
        markupRegister:val("markupRegister"),markupRenew:val("markupRenew"),markupTransfer:val("markupTransfer"),
        overrideRegister:val("overrideRegister"),overrideRenew:val("overrideRenew"),overrideTransfer:val("overrideTransfer"),
        featured:f.get("featured")==="on",active:f.get("active")==="on"
      })
    });
    const d=await r.json();
    if(!r.ok){setError(d.error||"Save failed.");return;}
    setData(d);
  }

  if(!data) return <div className="adminPanel"><div className="adminPanelHeader"><h2>Loading pricing…</h2></div>{error&&<p className="error adminPad">{error}</p>}</div>;

  return <>
    {error&&<p className="error">{error}</p>}
    <form className="adminPanel adminPricingGlobal" onSubmit={globalSave}>
      <label className="adminInput">Register markup %<input name="registerMarkup" type="number" step="0.01" defaultValue={data.settings.registerMarkup}/></label>
      <label className="adminInput">Renew markup %<input name="renewMarkup" type="number" step="0.01" defaultValue={data.settings.renewMarkup}/></label>
      <label className="adminInput">Transfer markup %<input name="transferMarkup" type="number" step="0.01" defaultValue={data.settings.transferMarkup}/></label>
      <label className="adminInput">Minimum margin {data.settings.currency}<input name="minimumMargin" type="number" step="0.01" defaultValue={data.settings.minimumMargin}/></label>
      <button className="adminSmallButton" disabled={busy}>{busy?"Saving…":"Save global"}</button>
    </form>

    <div className="adminPanel">
      <div className="adminPanelHeader"><h2>TLD pricing</h2><span>Override → custom markup → global markup</span></div>
      <div className="adminTableWrap">
        <div className="adminPriceRow header"><span>TLD</span><span>Cost reg.</span><span>Cost renew</span><span>Cost transfer</span><span>Markup R</span><span>Markup N</span><span>Markup T</span><span>Override R</span><span>Override N</span><span>Override T</span><span>Featured</span><span>Active</span><span>Effective / Save</span></div>
        {data.items.map(item=><form className="adminPriceRow" key={item.tld} onSubmit={e=>rowSave(item.tld,e)}>
          <strong>.{item.tld}</strong>
          <input name="costRegister" type="number" step="0.01" defaultValue={item.cost.register}/>
          <input name="costRenew" type="number" step="0.01" defaultValue={item.cost.renew}/>
          <input name="costTransfer" type="number" step="0.01" defaultValue={item.cost.transfer}/>
          <input name="markupRegister" type="number" step="0.01" placeholder="global" defaultValue={item.markup.register??""}/>
          <input name="markupRenew" type="number" step="0.01" placeholder="global" defaultValue={item.markup.renew??""}/>
          <input name="markupTransfer" type="number" step="0.01" placeholder="global" defaultValue={item.markup.transfer??""}/>
          <input name="overrideRegister" type="number" step="0.01" placeholder="none" defaultValue={item.override.register??""}/>
          <input name="overrideRenew" type="number" step="0.01" placeholder="none" defaultValue={item.override.renew??""}/>
          <input name="overrideTransfer" type="number" step="0.01" placeholder="none" defaultValue={item.override.transfer??""}/>
          <label className="adminCheck"><input name="featured" type="checkbox" defaultChecked={item.featured}/></label>
          <label className="adminCheck"><input name="active" type="checkbox" defaultChecked={item.active}/></label>
          <div className="adminEffective">
            {"$"+item.effective.register.toFixed(2)+" / $"+item.effective.renew.toFixed(2)+" / $"+item.effective.transfer.toFixed(2)}
            <br/><button className="adminSmallButton">Save</button>
          </div>
        </form>)}
      </div>
    </div>
  </>;
}
