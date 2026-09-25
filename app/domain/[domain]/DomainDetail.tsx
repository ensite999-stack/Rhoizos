"use client";
import {FormEvent,useEffect,useState} from "react";
import {useI18n} from "@/components/I18nProvider";

type SearchResult={
  domain:string;
  available:boolean|null;
  premium:boolean;
  price:number|null;
  preview?:boolean;
};
type RdapInfo={
  domain:string;
  registrar:string|null;
  registeredAt:string|null;
  expiresAt:string|null;
  updatedAt:string|null;
  statuses:string[];
  nameservers:string[];
  dnssec:boolean;
};
type RdapState="idle"|"loading"|"loaded"|"unavailable";

function SearchIcon(){
  return <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="2"/>
    <path d="m16 16 4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>;
}

export default function DomainDetail({initialDomain}:{initialDomain:string}){
  const {t,locale}=useI18n();
  const [query,setQuery]=useState(initialDomain);
  const [result,setResult]=useState<SearchResult|null>(null);\n  const [suggestions,setSuggestions]=useState<SearchResult[]>([]);
  const [rdap,setRdap]=useState<RdapInfo|null>(null);
  const [rdapState,setRdapState]=useState<RdapState>("idle");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(true);

  function formatDate(value:string|null){
    if(!value)return t("common.notPublished");
    const date=new Date(value);
    return Number.isNaN(date.getTime())
      ?t("common.notPublished")
      :date.toLocaleDateString(locale,{year:"numeric",month:"short",day:"numeric"});
  }

  function friendlyStatus(status:string){
    const value=status.toLowerCase();
    if(value.includes("client transfer prohibited"))return t("status.transferLock");
    if(value.includes("server transfer prohibited"))return t("status.registryTransferLock");
    if(value.includes("client delete prohibited"))return t("status.deleteProtected");
    if(value.includes("client update prohibited"))return t("status.updateProtected");
    if(value==="active"||value.endsWith(" active"))return t("status.active");
    return status.replace(/[_-]+/g," ");
  }

  async function load(name:string,push=false){
    const value=name.trim().toLowerCase();
    if(!value)return;
    setBusy(true);
    setError("");
    setResult(null);
    setSuggestions([]);
    setRdap(null);
    setRdapState("idle");

    try{
      const bareLabel=!value.includes(".")&&/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(value);
      if(bareLabel){
        const candidates=["com","net","org","io"].map(tld=>value+"."+tld);
        const matches=await Promise.all(candidates.map(async domain=>{
          const response=await fetch("/api/domain/search?domain="+encodeURIComponent(domain),{cache:"no-store"});
          const data=await response.json();
          if(!response.ok)throw new Error(data.error||"Domain search failed.");
          return data as SearchResult;
        }));
        setSuggestions(matches);
        setQuery(value);
        if(push)window.history.pushState(null,"","/domain/"+encodeURIComponent(value));
        return;
      }

      const response=await fetch("/api/domain/search?domain="+encodeURIComponent(value),{cache:"no-store"});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"Domain search failed.");
      setResult(data);
      setQuery(data.domain);
      if(push)window.history.pushState(null,"","/domain/"+encodeURIComponent(data.domain));
    }catch(error){
      setError(error instanceof Error?error.message:"Domain search failed.");
    }finally{
      setBusy(false);
    }
  }

  useEffect(()=>{load(initialDomain);},[initialDomain]);

  function submit(event:FormEvent){
    event.preventDefault();
    load(query,true);
  }

  async function loadRdap(){
    if(!result||rdapState==="loading")return;
    setRdapState("loading");
    try{
      const response=await fetch("/api/rdap?domain="+encodeURIComponent(result.domain),{cache:"no-store"});
      const data=await response.json();
      if(!response.ok){
        setRdapState("unavailable");
        return;
      }
      setRdap(data);
      setRdapState("loaded");
    }catch{
      setRdapState("unavailable");
    }
  }

  async function register(){
    if(!result?.available||result.premium)return;
    setBusy(true);
    setError("");
    try{
      const response=await fetch("/api/orders/register",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({domain:result.domain})
      });
      if(response.status===401){location.href="/login";return;}
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"Could not start checkout.");
      location.href=data.checkoutUrl;
    }catch(error){
      setError(error instanceof Error?error.message:"Could not start checkout.");
      setBusy(false);
    }
  }

  const registered=result?.available===false;

  return <div className="domainDetailPage">
    <section className="detailSearchBand">
      <div className="detailInner">
        <p>{t("detail.search")}</p>
        <form className="detailSearchForm" onSubmit={submit}>
          <input value={query} onChange={event=>setQuery(event.target.value)} placeholder={t("detail.searchAnother")} aria-label={t("common.domain")} required spellCheck={false}/>
          <button aria-label={t("detail.search")} disabled={busy}><SearchIcon/></button>
        </form>
      </div>
    </section>

    <section className="detailContent">
      <div className="detailInner">
        {busy&&!result&&<div className="detailLoading">{t("detail.checking")}</div>}
        {error&&<div className="detailError">{error}</div>}

        {!!suggestions.length&&<div className="domainSuggestions">
          {suggestions.map(item=><div className="domainSuggestion" key={item.domain}>
            <div>
              <span className="detailEyebrow">
                {item.available===true?t("detail.availableLabel"):item.available===false?t("detail.registeredLabel"):t("detail.resultLabel")}
              </span>
              <h2>{item.domain}</h2>
            </div>
            <div className="domainSuggestionAction">
              {item.price!==null&&<strong>{"$"+item.price.toFixed(2)}</strong>}
              <button className="textAction" type="button" onClick={()=>load(item.domain,true)}>{t("home.check")}</button>
            </div>
          </div>)}
        </div>}

        {result&&<div className="domainSummary">
          <div>
            <span className="detailEyebrow">
              {registered?t("detail.registeredLabel"):result.available===true?t("detail.availableLabel"):t("detail.resultLabel")}
            </span>
            <h1>{result.domain}</h1>
            <p>{result.preview?t("detail.preview"):result.premium?t("detail.premium"):result.available?t("detail.available"):t("detail.registered")}</p>
          </div>

          {result.available===true&&!result.premium&&<div className="availabilityAction">
            {result.price!==null&&<strong>{"$"+result.price.toFixed(2)}<small>{t("detail.priceYear")}</small></strong>}
            <button className="primary" onClick={register} disabled={busy}>{busy?t("detail.starting"):t("detail.registerButton")}</button>
          </div>}

          {registered&&<div className="availabilityAction registeredAction">
            <button className="secondary publicDetailsButton" onClick={loadRdap} disabled={rdapState==="loading"}>
              {rdapState==="loading"?t("detail.rdapLoading"):t("detail.rdapButton")}
            </button>
          </div>}
        </div>}

        {rdapState==="loaded"&&rdap&&<div className="rdapFriendly">
          <div className="rdapIntro"><h2>{t("detail.rdapTitle")}</h2><p>{t("detail.rdapCopy")}</p></div>
          <dl className="rdapFacts">
            <div><dt>{t("detail.registrar")}</dt><dd>{rdap.registrar||t("common.notPublished")}</dd></div>
            <div><dt>{t("detail.registeredSince")}</dt><dd>{formatDate(rdap.registeredAt)}</dd></div>
            <div><dt>{t("detail.expires")}</dt><dd>{formatDate(rdap.expiresAt)}</dd></div>
            <div><dt>{t("detail.updated")}</dt><dd>{formatDate(rdap.updatedAt)}</dd></div>
            <div><dt>{t("detail.dnssec")}</dt><dd>{rdap.dnssec?t("detail.enabled"):t("detail.notEnabled")}</dd></div>
          </dl>

          {!!rdap.nameservers.length&&<div className="rdapSection">
            <h3>{t("detail.nameservers")}</h3>
            <div className="nameserverList">{rdap.nameservers.map(nameserver=><span key={nameserver}>{nameserver}</span>)}</div>
          </div>}

          {!!rdap.statuses.length&&<div className="rdapSection">
            <h3>{t("detail.status")}</h3>
            <div className="statusTextList">{rdap.statuses.map(status=><p key={status}>{friendlyStatus(status)}</p>)}</div>
          </div>}
        </div>}

        {rdapState==="unavailable"&&<div className="detailNotice">
          <h2>{t("detail.unavailableTitle")}</h2>
          <p>{t("detail.unavailable")}</p>
        </div>}
      </div>
    </section>
  </div>;
}
