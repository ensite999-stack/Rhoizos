"use client";
import {FormEvent,useEffect,useState} from "react";

type SearchResult={
  domain:string;available:boolean|null;premium:boolean;price:number|null;preview?:boolean;
};
type RdapInfo={
  domain:string;registrar:string|null;registeredAt:string|null;expiresAt:string|null;updatedAt:string|null;
  statuses:string[];nameservers:string[];dnssec:boolean;
};

function SearchIcon(){
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="2"/><path d="m16 16 4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;
}
function date(value:string|null){
  if(!value)return "Not published";
  const d=new Date(value);
  return Number.isNaN(d.getTime())?"Not published":d.toLocaleDateString(undefined,{year:"numeric",month:"short",day:"numeric"});
}
function friendlyStatus(status:string){
  const value=status.toLowerCase();
  if(value.includes("client transfer prohibited")) return "Transfer lock is enabled";
  if(value.includes("server transfer prohibited")) return "Registry transfer lock is enabled";
  if(value.includes("client delete prohibited")) return "Protected from deletion";
  if(value.includes("client update prohibited")) return "Protected from unauthorized updates";
  if(value==="active"||value.endsWith(" active")) return "Active";
  return status.replace(/[_-]+/g," ");
}

export default function DomainDetail({initialDomain}:{initialDomain:string}){
  const [query,setQuery]=useState(initialDomain);
  const [result,setResult]=useState<SearchResult|null>(null);
  const [rdap,setRdap]=useState<RdapInfo|null>(null);
  const [rdapUnavailable,setRdapUnavailable]=useState(false);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(true);

  async function load(name:string,push=false){
    const value=name.trim().toLowerCase();
    if(!value)return;
    setBusy(true);setError("");setResult(null);setRdap(null);setRdapUnavailable(false);
    try{
      const response=await fetch("/api/domain/search?domain="+encodeURIComponent(value),{cache:"no-store"});
      const data=await response.json();
      if(!response.ok) throw new Error(data.error||"Domain search failed.");
      setResult(data);
      setQuery(data.domain);
      if(push) window.history.pushState(null,"","/domain/"+encodeURIComponent(data.domain));

      if(data.available===false||data.preview){
        const rdapResponse=await fetch("/api/rdap?domain="+encodeURIComponent(data.domain),{cache:"no-store"});
        const rdapData=await rdapResponse.json();
        if(rdapResponse.ok) setRdap(rdapData);
        else setRdapUnavailable(true);
      }
    }catch(err){setError(err instanceof Error?err.message:"Domain search failed.");}
    finally{setBusy(false);}
  }

  useEffect(()=>{load(initialDomain);},[initialDomain]);

  function submit(e:FormEvent){
    e.preventDefault();
    load(query,true);
  }

  async function register(){
    if(!result?.available||result.premium)return;
    setBusy(true);setError("");
    try{
      const response=await fetch("/api/orders/register",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({domain:result.domain})
      });
      if(response.status===401){location.href="/login";return;}
      const data=await response.json();
      if(!response.ok) throw new Error(data.error||"Could not start checkout.");
      location.href=data.checkoutUrl;
    }catch(err){setError(err instanceof Error?err.message:"Could not start checkout.");setBusy(false);}
  }

  const registered=Boolean(rdap)||result?.available===false;

  return <div className="domainDetailPage">
    <section className="detailSearchBand">
      <div className="detailInner">
        <p>Domain Search</p>
        <form className="detailSearchForm" onSubmit={submit}>
          <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search another Domain…" aria-label="Domain name" required spellCheck={false}/>
          <button aria-label="Search" disabled={busy}><SearchIcon/></button>
        </form>
      </div>
    </section>

    <section className="detailContent">
      <div className="detailInner">
        {busy&&!result&&<div className="detailLoading">Checking Domain…</div>}
        {error&&<div className="detailError">{error}</div>}

        {result&&<div className="domainSummary">
          <div>
            <span className="detailEyebrow">{registered?"REGISTERED DOMAIN":result.available===true?"AVAILABLE DOMAIN":"DOMAIN RESULT"}</span>
            <h1>{result.domain}</h1>
            <p>{rdap?"This Domain is already registered. Here is the useful public information about it.":result.preview?"Live registrar availability is not connected yet.":result.premium?"This is a premium Domain and needs a manual quote.":result.available?"This Domain is available to register.":"This Domain is already registered."}</p>
          </div>

          {result.available===true&&!result.premium&&<div className="availabilityAction">
            {result.price!==null&&<strong>{"$"+result.price.toFixed(2)}<small>/ year</small></strong>}
            <button className="primary" onClick={register} disabled={busy}>{busy?"Starting…":"Register Domain"}</button>
          </div>}
        </div>}

        {rdap&&<div className="rdapFriendly">
          <div className="rdapIntro"><h2>Public Domain information</h2><p>RDAP is the public registration record for a Domain. We have translated the useful parts below instead of showing raw registry data.</p></div>

          <dl className="rdapFacts">
            <div><dt>Registrar</dt><dd>{rdap.registrar||"Not published"}</dd></div>
            <div><dt>Registered since</dt><dd>{date(rdap.registeredAt)}</dd></div>
            <div><dt>Registration expires</dt><dd>{date(rdap.expiresAt)}</dd></div>
            <div><dt>Last updated</dt><dd>{date(rdap.updatedAt)}</dd></div>
            <div><dt>DNSSEC</dt><dd>{rdap.dnssec?"Enabled":"Not shown as enabled"}</dd></div>
          </dl>

          {!!rdap.nameservers.length&&<div className="rdapSection">
            <h3>Nameservers</h3>
            <div className="nameserverList">{rdap.nameservers.map(ns=><span key={ns}>{ns}</span>)}</div>
          </div>}

          {!!rdap.statuses.length&&<div className="rdapSection">
            <h3>Domain status</h3>
            <div className="statusTextList">{rdap.statuses.map(status=><p key={status}>{friendlyStatus(status)}</p>)}</div>
          </div>}
        </div>}

        {result&&registered&&!rdap&&rdapUnavailable&&<div className="detailNotice">
          <h2>Registered Domain</h2>
          <p>Public registration details are not available through Rhoizos for this extension yet.</p>
        </div>}
      </div>
    </section>
  </div>;
}
