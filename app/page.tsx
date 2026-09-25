"use client";
import {FormEvent,useEffect,useState} from "react";
import Link from "next/link";

type Result={domain:string;available:boolean|null;premium:boolean;price:number|null;preview?:boolean};
type Price={tld:string;register:number;renew:number;transfer:number;featured?:boolean};

function SearchIcon(){
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="2"/><path d="m16 16 4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;
}

export default function Home(){
  const [mode,setMode]=useState<"register"|"transfer">("register");
  const [domain,setDomain]=useState("");
  const [result,setResult]=useState<Result|null>(null);
  const [prices,setPrices]=useState<Price[]>([]);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);

  useEffect(()=>{
    fetch("/api/domain/search").then(r=>r.json()).then(d=>setPrices(d.prices||[])).catch(()=>{});
  },[]);

  async function search(e:FormEvent){
    e.preventDefault();
    if(mode==="transfer"){
      location.href="/transfer?domain="+encodeURIComponent(domain);
      return;
    }

    setBusy(true);setError("");setResult(null);
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

  const featured=prices.filter(p=>p.featured!==false).slice(0,4);

  return <div className="homePage">
    <section className="homeHero">
      <div className="heroInner">
        <div className="heroLead">
          <h1 className="heroTitle">Your domain.<br/>Your world!</h1>
          <p className="heroCopy">A clean place to find, register and manage the name that represents you online.</p>
        </div>

        <div className="searchPanel">
          <div className="searchModes" role="tablist" aria-label="Domain action">
            <button type="button" className={mode==="register"?"active":""} onClick={()=>setMode("register")}>Register</button>
            <button type="button" className={mode==="transfer"?"active":""} onClick={()=>setMode("transfer")}>Transfer</button>
          </div>

          <form className="searchForm" onSubmit={search}>
            <input value={domain} onChange={e=>setDomain(e.target.value)} placeholder={mode==="register"?"Search for a domain name…":"Enter a domain to transfer…"} aria-label="Domain name" required autoComplete="off" spellCheck={false}/>
            <button className="searchButton" aria-label={mode==="register"?"Search":"Continue transfer"} disabled={busy}><SearchIcon/></button>
          </form>

          <div className="searchUnderbar">
            <div className="searchPromos">
              {featured.slice(0,2).map(p=><span key={p.tld}><b>{p.tld}</b> {"$"+p.register.toFixed(2)}</span>)}
            </div>
            <Link href="/rdap">RDAP lookup</Link>
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
          <p>These prices come directly from our current backend settings, including registration, renewal and transfer pricing.</p>
        </div>

        <div className="offerGrid">
          {featured.map(p=><div className="offerItem" key={p.tld}>
            <div className="offerTop"><strong>{p.tld}</strong><span>{"$"+p.register.toFixed(2)}</span></div>
            <p>Registration / year</p>
            <div className="offerDetails"><span>Renew <b>{"$"+p.renew.toFixed(2)}</b></span><span>Transfer <b>{"$"+p.transfer.toFixed(2)}</b></span></div>
            <button className="textAction" onClick={()=>{setDomain("example"+p.tld);setMode("register");window.scrollTo({top:0,behavior:"smooth"});}}>Check availability →</button>
          </div>)}
        </div>
      </div>
    </section>

    <section className="whySection">
      <div className="lightInner whyGrid">
        <div>
          <span className="sectionLabel">WHY RHOIZOS?</span>
          <h2>Simple. Clean.<br/>No distractions.</h2>
        </div>
        <div className="whyCopy">
          <p>Domain registration should not feel like navigating a store full of unrelated products. Rhoizos focuses on domains and the tools around them.</p>
          <p>We collect only the information needed to create your account, satisfy registry requirements, and operate your domain. No hosting bundles, no page-builder prompts, no unnecessary checkout noise.</p>
          <div className="principles">
            <span>Focused domain tools</span>
            <span>Necessary registration data only</span>
            <span>Clear pricing</span>
            <span>Private DNS notes</span>
          </div>
        </div>
      </div>
    </section>

    <section className="learnSection" id="learn">
      <div className="lightInner">
        <div className="sectionHeading learnHeading">
          <div><span className="sectionLabel">DOMAIN BASICS</span><h2>Know what you are buying.</h2></div>
          <p>A domain is simple once the moving parts are explained clearly.</p>
        </div>

        <div className="learnGrid">
          <article><span>01</span><h3>What is a domain?</h3><p>A domain is the human-readable address people use to reach a website or online service, such as example.com. It points visitors toward the systems that actually host your content.</p></article>
          <article><span>02</span><h3>How do I buy one?</h3><p>Search for an available name, review the yearly registration price, provide the contact information required by the registry, pay, and wait for the registrar to confirm registration.</p></article>
          <article><span>03</span><h3>How should I choose a name?</h3><p>Prefer something short, easy to spell, easy to remember, and clearly connected to the person, product or organization it represents. Avoid unnecessary hyphens and confusing spelling.</p></article>
          <article><span>04</span><h3>What does DNS do?</h3><p>DNS connects your domain to services such as websites and email. Records like A, AAAA, CNAME, MX and TXT tell the internet where different parts of your domain should go.</p></article>
          <article><span>05</span><h3>How do I set DNS?</h3><p>Open your domain in Rhoizos, go to DNS, add the record type supplied by your website or email provider, enter its host and value, then save. DNS changes can take time to propagate.</p></article>
          <article><span>06</span><h3>Can I move my domain later?</h3><p>Yes. Eligible domains can be unlocked and transferred using an Auth Code. Registry rules and transfer-lock periods can still apply.</p></article>
        </div>
      </div>
    </section>
  </div>;
}
