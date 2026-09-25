"use client";
import {FormEvent,useEffect,useState} from "react";
import Link from "next/link";
type Result={domain:string;available:boolean;premium:boolean;price:number|null};
type Price={tld:string;register:number;renew:number;transfer:number};
export default function Home(){
  const [domain,setDomain]=useState("");
  const [result,setResult]=useState<Result|null>(null);
  const [prices,setPrices]=useState<Price[]>([]);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  useEffect(()=>{fetch("/api/domain/search").then(r=>r.json()).then(d=>setPrices(d.prices||[])).catch(()=>{});},[]);
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
  return <><section className="homeHero"><div className="heroInner">
    <p className="kicker">Your domain. Your world.</p>
    <h1 className="heroTitle">你的域名，<br/>你的世界。</h1>
    <p className="heroCopy">搜索、注册、转移、续费和 DNS 管理。只做域名真正需要的事。</p>
    <form className="searchForm" onSubmit={search}>
      <input value={domain} onChange={e=>setDomain(e.target.value)} placeholder="Search your domain" aria-label="Domain name" required/>
      <button className="primary" disabled={busy}>{busy?"Checking…":"Search"}</button>
    </form>
    <div className="miniLinks"><Link href="/transfer">Transfer a domain</Link><Link href="/rdap">RDAP lookup</Link></div>
    {!!prices.length&&<div className="priceRow">{prices.slice(0,6).map(p=><span key={p.tld}><b>{p.tld}</b>{"$"+p.register.toFixed(2)} / year</span>)}</div>}
    {error&&<p className="error">{error}</p>}
    {result&&<div className="searchResult"><h2>{result.domain}</h2><p>{result.premium?"Premium domain — manual quote required.":result.available?"Available":"Already registered"}</p><div className="searchResultActions">{result.price!==null&&<strong>{"$"+result.price.toFixed(2)}</strong>}{result.available&&!result.premium&&<button className="primary" onClick={register} disabled={busy}>Register</button>}</div></div>}
  </div></section>
  <section className="section"><p className="kicker">Domain services</p><h2>Everything essential.<br/>Nothing in the way.</h2><div className="services">
    <div><h3>Register</h3><p>Live availability, clear retail pricing, and direct checkout.</p><Link href="/">Search domains →</Link></div>
    <div><h3>Transfer & renew</h3><p>Transfer in with Auth Code, renew normally, or unlock and move out.</p><Link href="/transfer">Transfer a domain →</Link></div>
    <div><h3>DNS management</h3><p>Edit DNS records and keep one private note beside each record.</p><Link href="/domains">My domains →</Link></div>
  </div></section></>;
}
