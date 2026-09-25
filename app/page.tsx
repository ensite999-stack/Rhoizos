"use client";
import {FormEvent,useEffect,useState} from "react";

type Price={tld:string;register:number;renew:number;transfer:number;featured?:boolean};

function SearchIcon(){
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="2"/><path d="m16 16 4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;
}

export default function Home(){
  const [mode,setMode]=useState<"register"|"transfer">("register");
  const [domain,setDomain]=useState("");
  const [prices,setPrices]=useState<Price[]>([]);

  useEffect(()=>{
    fetch("/api/domain/search").then(r=>r.json()).then(d=>setPrices(d.prices||[])).catch(()=>{});
  },[]);

  function search(e:FormEvent){
    e.preventDefault();
    const value=domain.trim();
    if(!value)return;
    location.href=mode==="transfer"
      ?"/transfer?domain="+encodeURIComponent(value)
      :"/domain/"+encodeURIComponent(value.toLowerCase());
  }

  const featured=prices.filter(p=>p.featured!==false).slice(0,4);

  return <div className="homePage">
    <section className="homeHero">
      <div className="heroInner">
        <div className="heroLead">
          <h1 className="heroTitle">Your Domain.<br/>Your World!</h1>
          <p className="heroCopy">A quiet, focused place to find and manage the name that represents you online.</p>
        </div>

        <div className="searchPanel">
          <div className="searchModes" role="tablist" aria-label="Domain action">
            <button type="button" className={mode==="register"?"active":""} onClick={()=>setMode("register")}>Register</button>
            <button type="button" className={mode==="transfer"?"active":""} onClick={()=>setMode("transfer")}>Transfer</button>
          </div>

          <form className="searchForm" onSubmit={search}>
            <input value={domain} onChange={e=>setDomain(e.target.value)} placeholder={mode==="register"?"Search for a Domain name…":"Enter a Domain to transfer…"} aria-label="Domain name" required autoComplete="off" spellCheck={false}/>
            <button className="searchButton" aria-label={mode==="register"?"Search":"Continue transfer"}><SearchIcon/></button>
          </form>

          {!!featured.length&&<div className="searchPromos">
            {featured.slice(0,3).map((p,i)=><span key={p.tld}>{i>0&&<i>·</i>}<b>{p.tld}</b> {"$"+p.register.toFixed(2)}</span>)}
          </div>}
        </div>
      </div>
    </section>

    <section className="lightSection offersSection" id="pricing">
      <div className="lightInner">
        <div className="sectionHeading">
          <div><span className="sectionLabel">DOMAIN PRICING</span><h2>Popular Domain extensions.</h2></div>
          <p>Registration, renewal and transfer prices come directly from the current Rhoizos pricing settings.</p>
        </div>

        <div className="offerGrid">
          {featured.map(p=><div className="offerItem" key={p.tld}>
            <div className="offerTop"><strong>{p.tld}</strong><span>{"$"+p.register.toFixed(2)}</span></div>
            <p>Registration / year</p>
            <div className="offerDetails"><span>Renew <b>{"$"+p.renew.toFixed(2)}</b></span><span>Transfer <b>{"$"+p.transfer.toFixed(2)}</b></span></div>
            <button className="textAction" onClick={()=>{location.href="/domain/example"+p.tld}}>Check availability →</button>
          </div>)}
        </div>
      </div>
    </section>

    <section className="whySection">
      <div className="lightInner whyEditorial">
        <div className="whyTitle">
          <span className="sectionLabel">WHY RHOIZOS?</span>
          <h2>Why choose<br/>Rhoizos?</h2>
        </div>
        <div className="whyText">
          <p className="whyLead">Because buying a Domain should feel simple, clear and calm.</p>
          <p>Rhoizos is deliberately focused on Domains. There are no hosting bundles, page-builder prompts, unrelated product shelves or checkout distractions competing for your attention.</p>
          <p>We collect only the information needed to operate your account and meet registrar or registry requirements. Pricing stays visible. DNS stays understandable. Your private DNS notes stay private.</p>
          <p><strong>Simple tools.</strong> Search, register, transfer, renew and manage DNS.</p>
          <p><strong>Necessary information only.</strong> We avoid collecting data that the Domain workflow does not need.</p>
          <p><strong>No distractions.</strong> The product is the Domain and the controls around it.</p>
        </div>
      </div>
    </section>

    <section className="learnSection" id="learn">
      <div className="lightInner">
        <div className="sectionHeading learnHeading">
          <div><span className="sectionLabel">DOMAIN BASICS</span><h2>Understand your Domain.</h2></div>
          <p>The important parts, explained without registrar jargon.</p>
        </div>

        <div className="learnList">
          <article><h3>What is a Domain?</h3><p>A Domain is the human-readable address people use to reach a website or online service, such as example.com. It points people toward the systems that host your site, email or other services.</p></article>
          <article><h3>How do I buy a Domain?</h3><p>Search for an available name, review its yearly price, provide the contact information required by the registry, pay, and wait for registration to be confirmed.</p></article>
          <article><h3>How should I choose a Domain?</h3><p>Choose something short, easy to spell, easy to remember and clearly connected to you, your product or your organization. Avoid confusing spelling and unnecessary punctuation.</p></article>
          <article><h3>What does DNS do?</h3><p>DNS connects your Domain to services. Records such as A, AAAA, CNAME, MX and TXT tell the internet where your website, email and verification services should go.</p></article>
          <article><h3>How do I set DNS?</h3><p>Open your Domain in Rhoizos, enter the record type, host and value supplied by your service provider, then save. DNS changes can take time to propagate around the internet.</p></article>
          <article><h3>Can I move my Domain later?</h3><p>Yes. Eligible Domains can be unlocked and transferred using an Auth Code. Registry restrictions and temporary transfer-lock periods can still apply.</p></article>
        </div>
      </div>
    </section>
  </div>;
}
