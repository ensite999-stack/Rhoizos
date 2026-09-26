"use client";
import {FormEvent,useEffect,useState} from "react";
import {useParams} from "next/navigation";
import {useI18n} from "@/components/I18nProvider";

type State={domain:string;forwarding:{enabled:boolean;url:string|null;type:string|null}};

export default function Forwarding(){
  const {id}=useParams<{id:string}>();
  const {t}=useI18n();
  const [data,setData]=useState<State|null>(null);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);

  async function load(){
    const response=await fetch("/api/domains/"+id+"/forwarding",{cache:"no-store"});
    if(response.status===401){location.replace("/forwarding");return;}
    const next=await response.json();
    if(!response.ok){setError(next.error||t("forwarding.loadFailed"));return;}
    setData(next);
  }
  useEffect(()=>{load();},[id]);

  async function save(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setBusy(true);setError("");
    const form=new FormData(event.currentTarget);
    const response=await fetch("/api/domains/"+id+"/forwarding",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        targetUrl:form.get("targetUrl"),
        method:form.get("method"),
        acknowledgeDnsImpact:form.get("acknowledgeDnsImpact")==="on"
      })
    });
    const next=await response.json();setBusy(false);
    if(!response.ok){setError(next.error||t("forwarding.saveFailed"));return;}
    await load();
  }

  async function disable(){
    setBusy(true);setError("");
    const response=await fetch("/api/domains/"+id+"/forwarding",{method:"DELETE"});
    const next=await response.json();setBusy(false);
    if(!response.ok){setError(next.error||t("forwarding.disableFailed"));return;}
    await load();
  }

  return <div className="page">
    <p className="kicker">{t("forwarding.kicker")}</p>
    <h1 className="pageTitle">{t("forwarding.title")}</h1>
    <p className="pageIntro">{data?.domain||t("common.loading")}</p>

    {data?.forwarding.enabled&&<div className="featureStatus">
      <strong>{t("forwarding.active")}</strong>
      <span>{data.forwarding.url}</span>
      <small>{data.forwarding.type||""}</small>
    </div>}

    <div className="warningCard">
      <strong>{t("forwarding.warningTitle")}</strong>
      <p>{t("forwarding.warning")}</p>
    </div>

    <form className="form featureForm" onSubmit={save}>
      <label className="field">{t("forwarding.destination")}
        <input name="targetUrl" type="url" placeholder="https://example.com/path" defaultValue={data?.forwarding.url||""} required/>
      </label>
      <label className="field">{t("forwarding.type")}
        <select name="method" defaultValue={data?.forwarding.type?.includes("302")?"302":"301"}>
          <option value="301">{t("forwarding.permanent")}</option>
          <option value="302">{t("forwarding.temporary")}</option>
        </select>
      </label>
      <label className="featureConsent">
        <input name="acknowledgeDnsImpact" type="checkbox" required/>
        <span>{t("forwarding.acknowledge")}</span>
      </label>
      {error&&<p className="error">{error}</p>}
      <div className="formActions">
        <button className="primary" disabled={busy}>{busy?t("common.loading"):t("common.save")}</button>
        {data?.forwarding.enabled&&<button className="secondary" type="button" onClick={disable} disabled={busy}>{t("forwarding.disable")}</button>}
      </div>
    </form>
  </div>;
}
