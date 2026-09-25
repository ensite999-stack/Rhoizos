"use client";
import {FormEvent,useEffect,useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {useI18n} from "@/components/I18nProvider";
import {addCart,onCartChange,readCart} from "@/lib/cart-client";

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
  const router=useRouter();
  const [query,setQuery]=useState(initialDomain);
  const [result,setResult]=useState<SearchResult|null>(null);
  const [suggestions,setSuggestions]=useState<SearchResult[]>([]);
  const [rdap,setRdap]=useState<RdapInfo|null>(null);
  const [rdapState,setRdapState]=useState<RdapState>("idle");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(true);
  const [carted,setCarted]=useState<Set<string>>(new Set());

  useEffect(()=>{
    const sync=()=>setCarted(new Set(readCart().map(item=>item.domain)));
    sync();
    return onCartChange(sync);
  },[]);

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

  function statusKey(item:SearchResult){
    if(item.premium)return "premium";
    if(item.available===true)return "available";
    if(item.available===false)return "registered";
    return "unknown";
  }

  function statusText(item:SearchResult){
    if(item.premium)return t("detail.premiumLabel");
    if(item.available===true)return t("detail.availableLabel");
    if(item.available===false)return t("detail.registeredLabel");
    return t("detail.resultLabel");
  }

  function go(name:string){
    const value=name.trim().toLowerCase();
    if(!value)return;
    const target="/domain/"+encodeURIComponent(value);
    if(value===initialDomain.toLowerCase())load(value);
    else router.push(target);
  }

  async function load(name:string){
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
        const response=await fetch("/api/domain/search?q="+encodeURIComponent(value),{cache:"no-store"});
        const data=await response.json();
        if(!response.ok)throw new Error(data.error||"Domain search failed.");
        setSuggestions(data.items||[]);
        setQuery(value);
        return;
      }

      const response=await fetch("/api/domain/search?domain="+encodeURIComponent(value),{cache:"no-store"});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"Domain search failed.");
      setResult(data);
      setQuery(data.domain);
    }catch(error){
      setError(error instanceof Error?error.message:"Domain search failed.");
    }finally{
      setBusy(false);
    }
  }

  useEffect(()=>{load(initialDomain);},[initialDomain]);

  function submit(event:FormEvent){
    event.preventDefault();
    go(query);
  }

  function add(item:SearchResult){
    if(item.available!==true||item.premium||item.price===null)return;
    addCart({domain:item.domain,price:item.price,kind:"register"});
  }

  async function loadRdap(){
    if(!result||rdapState==="loading")return;
    setRdapState("loading");
    try{
      const response=await fetch("/api/rdap?domain="+encodeURIComponent(result.domain),{cache:"no-store"});
      const data=await response.json();
      if(!response.ok){setRdapState("unavailable");return;}
      setRdap(data);
      setRdapState("loaded");
    }catch{
      setRdapState("unavailable");
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
        {busy&&!result&&!suggestions.length&&<div className="detailLoading">{t("detail.checking")}</div>}
        {error&&<div className="detailError">{error}</div>}

        {!!suggestions.length&&<>
          <div className="domainResultsHeader">
            <strong>{suggestions.length}</strong>
            <span>{t("detail.resultsFound")}</span>
          </div>
          <div className="domainSuggestions">
            {suggestions.map(item=><div className="domainSuggestion" key={item.domain}>
              <button className="domainSuggestionName" type="button" onClick={()=>go(item.domain)}>
                <h2>{item.domain}</h2>
                <span className={"domainStatus "+statusKey(item)}>{statusText(item)}</span>
              </button>
              <div className="domainSuggestionAction">
                {item.available===true&&!item.premium&&item.price!==null&&<strong>{"$"+item.price.toFixed(2)}<small>{t("detail.priceYear")}</small></strong>}
                {item.available===true&&!item.premium&&item.price===null&&<span className="pricePending">{t("detail.priceUnavailable")}</span>}
                {item.premium&&<span className="pricePending">{t("detail.premiumShort")}</span>}
                {item.available===true&&!item.premium&&item.price!==null
                  ?<button className={carted.has(item.domain)?"secondary":"primary"} type="button" onClick={()=>add(item)}>
                    {carted.has(item.domain)?t("cart.added"):t("cart.add")}
                  </button>
                  :<button className="secondary" type="button" onClick={()=>go(item.domain)}>{t("detail.view")}</button>}
              </div>
            </div>)}
          </div>
        </>}

        {result&&<div className="domainSummary">
          <div>
            <span className={"domainStatus "+statusKey(result)}>{statusText(result)}</span>
            <h1>{result.domain}</h1>
            <p>{result.preview?t("detail.preview"):result.premium?t("detail.premium"):result.available?t("detail.available"):t("detail.registered")}</p>
          </div>

          {result.available===true&&!result.premium&&<div className="availabilityAction">
            {result.price!==null
              ?<strong>{"$"+result.price.toFixed(2)}<small>{t("detail.priceYear")}</small></strong>
              :<span className="pricePending">{t("detail.priceUnavailable")}</span>}
            {result.price!==null&&(carted.has(result.domain)
              ?<Link className="secondaryLink" href="/cart">{t("cart.view")}</Link>
              :<button className="primary" onClick={()=>add(result)}>{t("cart.add")}</button>)}
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
