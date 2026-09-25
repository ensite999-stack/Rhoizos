"use client";
import {FormEvent,useEffect,useState} from "react";
import Link from "next/link";

type Result={domain:string;available:boolean|null;premium:boolean;price:number|null;preview?:boolean};
type Price={tld:string;register:number;renew:number;transfer:number};

export default function Home(){
  const [domain,setDomain]=useState("");
  const [result,setResult]=useState<Result|null>(null);
  const [prices,setPrices]=useState<Price[]>([]);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);

  useEffect(()=>{
    fetch("/api/domain/search").then(r=>r.json()).then(d=>setPrices(d.prices||[])).catch(()=>{});
  },[]);

  async function search(e:FormEvent){
    e.preventDefault();setBusy(true);setError("");setResult(null);
    try{
      const r=await fetch("/api/domain/search?domain="+encodeURIComponent(domain),{cache:"no-store"});
      const d=await r.json();
      if(!r.ok) throw new Error(d.error||"Search failed.");
      setResult(d);
    }catch(err){setError(err instanceof Error?err.message:"Search failed.");}
    finally{setBusy(false);}
  }

  async function register(){
    if(!result?.available||result.premium)return;
    setBusy(true);setError("");
    try{
      const r=await fetch("/api/orders/register",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({domain:result.domain})});
      if(r.status===401){location.href="/login";return;}
      const d=await r.json();
      if(!r.ok) throw new Error(d.error||"Could not start checkout.");
      location.href=d.checkoutUrl;
    }catch(err){setError(err instanceof Error?err.message:"Could not start checkout.");setBusy(false);}
  }

  const featured=(prices.length?prices:[
    {tld:".com",register:19.99,renew:19.99,transfer:18.99},
    {tld:".net",register:21.99,renew:21.99,transfer:20.99},
    {tld:".org",register:17.99,renew:17.99,transfer:16.99},
    {tld:".io",register:59.99,renew:59.99,transfer:58.99}
  ]).slice(0,4);

  return <div className="homePage">
    <section className="homeHero">
      <div className="heroInner">
        <div className="heroLead">
          <p className="heroEyebrow">Domains without the noise.</p>
          <h1 className="heroTitle">Find the domain<br/>that fits.</h1>
          <p className="heroCopy">Search, register, transfer, renew and manage DNS from one focused registrar.</p>
        </div>

        <div className="searchPanel">
          <form className="searchForm" onSubmit={search}>
            <span className="searchIcon" aria-hidden="true">⌕</span>
            <input value={domain} onChange={e=>setDomain(e.target.value)} placeholder="Enter a domain name" aria-label="Domain name" required autoComplete="off" spellCheck={false}/>
            <button className="primary" disabled={busy}>{busy?"Checking…":"Search"}</button>
          </form>
          <div className="searchMeta">
            <Link href="/transfer">Transfer a domain</Link>
            <Link href="/rdap">RDAP lookup</Link>
            <span>Clear yearly pricing</span>
          </div>
          {error&&<p className="heroError">{error}</p>}
          {result&&<div className="searchResult">
            <div><h2>{result.domain}</h2><p>{result.preview?"Live availability is not connected yet.":result.premium?"Premium domain — manual quote required.":result.available?"Available to register":"Already registered"}</p></div>
            <div className="searchResultActions">
              {result.price!==null&&<strong>{"$"+result.price.toFixed(2)}<small>/year</small></strong>}
              {result.available===true&&!result.premium&&<button className="primary" onClick={register} disabled={busy}>Register</button>}
            </div>
          </div>}
        </div>

        <div className="heroPrices">
          {featured.map(p=><div className="heroPrice" key={p.tld}><strong>{p.tld}</strong><span>{"$"+p.register.toFixed(2)}</span><small>/ year</small></div>)}
          <Link className="allPricesLink" href="/#pricing">View pricing →</Link>
        </div>
      </div>
    </section>

    <section className="lightSection offersSection" id="pricing">
      <div className="lightInner">
        <div className="sectionHeading compactHeading">
          <div><span className="sectionLabel">POPULAR DOMAINS</span><h2>Straightforward prices.</h2></div>
          <p>No bundles and no hosting upsells. Registration, renewal and transfer prices stay visible.</p>
        </div>
        <div className="offerGrid">
          {featured.map(p=><div className="offerItem" key={p.tld}>
            <div className="offerTop"><strong>{p.tld}</strong><span>{"$"+p.register.toFixed(2)}</span></div>
            <p>Registration / year</p>
            <div className="offerDetails"><span>Renew <b>{"$"+p.renew.toFixed(2)}</b></span><span>Transfer <b>{"$"+p.transfer.toFixed(2)}</b></span></div>
            <button className="textAction" onClick={()=>{setDomain("example"+p.tld);window.scrollTo({top:0,behavior:"smooth"});}}>Check availability →</button>
          </div>)}
        </div>
      </div>
    </section>

    <section className="lightSection domainSection">
      <div className="lightInner splitIntro">
        <div><span className="sectionLabel">DOMAIN MANAGEMENT</span><h2>Everything you need around a domain.</h2></div>
        <p>Rhoizos stays deliberately small: the core registrar workflows, a clean DNS editor, and nothing unrelated.</p>
      </div>
      <div className="lightInner serviceRows">
        <Link href="/" className="serviceRow"><span className="serviceNumber">01</span><div><h3>Register domains</h3><p>Check availability, see the yearly price, and register from one flow.</p></div><span className="rowArrow">→</span></Link>
        <Link href="/transfer" className="serviceRow"><span className="serviceNumber">02</span><div><h3>Transfer & renew</h3><p>Transfer in with an Auth Code, renew normally, or unlock and transfer out.</p></div><span className="rowArrow">→</span></Link>
        <Link href="/domains" className="serviceRow"><span className="serviceNumber">03</span><div><h3>DNS management</h3><p>Edit DNS records and keep a private note beside the records that matter.</p></div><span className="rowArrow">→</span></Link>
      </div>
    </section>

    <section className="lightSection trustSection">
      <div className="lightInner trustGrid">
        <div><span className="sectionLabel">BUILT FOR CONTROL</span><h2>Small registrar.<br/>Serious essentials.</h2></div>
        <div className="trustPoints">
          <div><strong>Clear pricing</strong><p>Registration, renewal and transfer prices are shown separately.</p></div>
          <div><strong>Direct DNS control</strong><p>Manage the records you need without a hosting control panel in the way.</p></div>
          <div><strong>Private DNS notes</strong><p>Your notes stay inside Rhoizos and are never sent upstream.</p></div>
          <div><strong>Transfer freedom</strong><p>Lock controls and Auth Code access stay in your account.</p></div>
        </div>
      </div>
    </section>
  </div>;
}
