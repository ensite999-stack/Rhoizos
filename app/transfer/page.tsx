"use client";
import {FormEvent,useEffect,useState} from "react";

export default function Transfer(){
  const [domain,setDomain]=useState("");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);

  useEffect(()=>{
    const value=new URLSearchParams(window.location.search).get("domain");
    if(value) setDomain(value);
  },[]);

  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    setBusy(true);
    setError("");

    const f=new FormData(e.currentTarget);
    const r=await fetch("/api/orders/transfer",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({domain:f.get("domain"),authCode:f.get("authCode")})
    });

    if(r.status===401){location.href="/login";return;}

    const d=await r.json();
    if(!r.ok){
      setError(d.error||"Transfer could not start.");
      setBusy(false);
      return;
    }
    location.href=d.checkoutUrl;
  }

  return <div className="page">
    <p className="kicker">Transfer in</p>
    <h1 className="pageTitle">Bring your domain.</h1>
    <p className="pageIntro">Unlock it at the current registrar, then enter the domain and EPP/Auth Code. Registry transfer restrictions still apply.</p>
    <form className="form" onSubmit={submit}>
      <label className="field">Domain<input name="domain" value={domain} onChange={e=>setDomain(e.target.value)} placeholder="example.com" required/></label>
      <label className="field">EPP / Auth Code<input name="authCode" type="password" autoComplete="off" required/></label>
      {error&&<p className="error">{error}</p>}
      <button className="primary" disabled={busy}>{busy?"Starting transfer…":"Continue to payment"}</button>
    </form>
  </div>;
}
