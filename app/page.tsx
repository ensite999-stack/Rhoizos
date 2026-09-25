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
          <span className="heroEyebrow">DOMAIN SEARCH</span>
          <h1 className="heroTitle">Start with the right domain.</h1>
          <p className="heroCopy">Search for a domain name, see the price, and keep the essentials in one place.</p>
        </div>

        <div className="searchPanel">
          <form className="searchForm" onSubmit={search}>
            <input value={domain} onChange={e=>setDomain(e.target.value)} placeholder="Search for a domain name…" aria-label="Domain name" required autoComplete="off" spellCheck={false}/>
            <button className="primary searchButton" disabled={busy}>{busy?"Checking…":"Search"}</button>
          </form>

          <div className="searchUnderbar">
            <div className="searchMeta">
              <Link href="/transfer">Transfer to Rhoizos</Link>
              <Link href="/rdap">RDAP lookup</Link>
            </div>
            <div className="searchPromos">
              {featured.slice(0,2).map(p=><span key={p.tld}><b>{p.tld}</b> {"$"+p.register.toFixed(2)}</span>)}
            </div>
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
      </div>
    </section>

    <section className="lightSection offersSection" id="pricing">
      <div className="lightInner">
        <div className="sectionHeading">
          <div><span className="sectionLabel">DOMAIN PRICING</span><h2>Popular extensions.</h2></div>
          <p>Registration, renewal and transfer prices shown separately. No hosting bundle required.</p>
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
        <div><span className="sectionLabel">DOMAIN MANAGEMENT</span><h2>Everything around your domain.</h2></div>
        <p>Register, transfer, renew, manage DNS, and keep private notes beside the records that matter.</p>
      </div>

      <div className="lightInner serviceRows">
        <Link href="/" className="serviceRow"><div><h3>Register domains</h3><p>Search availability, see pricing, and register from one flow.</p></div><span className="rowArrow">→</span></Link>
        <Link href="/transfer" className="serviceRow"><div><h3>Transfer & renew</h3><p>Transfer in with an Auth Code, renew normally, or transfer out.</p></div><span className="rowArrow">→</span></Link>
        <Link href="/domains" className="serviceRow"><div><h3>DNS management</h3><p>Edit records and keep private notes inside Rhoizos.</p></div><span className="rowArrow">→</span></Link>
      </div>
    </section>

    <section className="lightSection trustSection">
      <div className="lightInner trustGrid">
        <div><span className="sectionLabel">FOCUSED BY DESIGN</span><h2>Domain tools without the clutter.</h2></div>
        <div className="trustPoints">
          <div><strong>Clear pricing</strong><p>Registration, renewal and transfer prices stay visible.</p></div>
          <div><strong>Direct DNS control</strong><p>Manage records without a hosting panel getting in the way.</p></div>
          <div><strong>Private DNS notes</strong><p>Your notes stay inside Rhoizos and are never sent upstream.</p></div>
          <div><strong>Transfer freedom</strong><p>Lock controls and Auth Code access stay in your account.</p></div>
        </div>
      </div>
    </section>
  </div>;
}
