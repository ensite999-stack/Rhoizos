"use client";
import {FormEvent,useEffect,useState} from "react";
import {useParams} from "next/navigation";
import {useI18n} from "@/components/I18nProvider";
import BackLink from "@/components/BackLink";

type Forward={email:string;forwardsTo:string[]};

export default function EmailForwarding(){
  const {id}=useParams<{id:string}>();
  const {t}=useI18n();
  const [domain,setDomain]=useState("");
  const [items,setItems]=useState<Forward[]>([]);
  const [error,setError]=useState("");

  async function load(){
    const response=await fetch("/api/domains/"+id+"/email-forwards",{cache:"no-store"});
    if(response.status===401){location.replace("/email-forwarding");return;}
    const data=await response.json();
    if(!response.ok){setError(data.error||t("emailForward.loadFailed"));return;}
    setDomain(data.domain||"");setItems(data.items||[]);
  }
  useEffect(()=>{load();},[id]);

  async function save(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setError("");
    const form=new FormData(event.currentTarget);
    const forwardsTo=String(form.get("destinations")||"").split(/[\n,]/).map(v=>v.trim()).filter(Boolean);
    const response=await fetch("/api/domains/"+id+"/email-forwards",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({email:form.get("email"),forwardsTo})
    });
    const data=await response.json();
    if(!response.ok){setError(data.error||t("emailForward.saveFailed"));return;}
    event.currentTarget.reset();setItems(data.items||[]);
  }

  async function remove(email:string){
    const response=await fetch("/api/domains/"+id+"/email-forwards",{
      method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({email})
    });
    const data=await response.json();
    if(!response.ok){setError(data.error||t("emailForward.deleteFailed"));return;}
    setItems(data.items||[]);
  }

  return <div className="page wide">
    <BackLink fallbackHref="/domains"/>
    <p className="kicker">{t("emailForward.kicker")}</p>
    <h1 className="pageTitle">{t("emailForward.title")}</h1>
    <p className="pageIntro">{domain||t("common.loading")}</p>

    <div className="warningCard">
      <strong>{t("emailForward.noteTitle")}</strong>
      <p>{t("emailForward.note")}</p>
    </div>

    <form className="form featureForm" onSubmit={save}>
      <div className="formGrid">
        <label className="field">{t("emailForward.alias")}
          <div className="emailAliasField"><input name="email" placeholder="hello" required/><span>@{domain||"domain"}</span></div>
        </label>
        <label className="field">{t("emailForward.destinations")}
          <textarea name="destinations" rows={4} placeholder={"you@example.com\nteam@example.com"} required/>
        </label>
      </div>
      <p className="fine">{t("emailForward.limit")}</p>
      {error&&<p className="error">{error}</p>}
      <button className="primary">{t("emailForward.save")}</button>
    </form>

    <div className="featureList">
      {items.map(item=><div className="featureListRow" key={item.email}>
        <div><strong>{item.email==="*"?"*":item.email}@{domain}</strong><span>{item.forwardsTo.join(" · ")}</span></div>
        <button className="secondary" onClick={()=>remove(item.email)}>{t("common.delete")}</button>
      </div>)}
      {!items.length&&<p className="fine">{t("emailForward.empty")}</p>}
    </div>
  </div>;
}
