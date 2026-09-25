"use client";
import {FormEvent,useState} from "react";

export default function Rdap(){
  const [domain,setDomain]=useState("");

  function submit(e:FormEvent){
    e.preventDefault();
    const value=domain.trim().toLowerCase();
    if(!value)return;
    location.href="/domain/"+encodeURIComponent(value);
  }

  return <div className="page">
    <p className="kicker">Public Domain information</p>
    <h1 className="pageTitle">Understand a registered Domain.</h1>
    <p className="pageIntro">Search a Domain and Rhoizos will turn its public RDAP record into clear registration dates, registrar details, nameservers, DNSSEC and transfer-lock information.</p>
    <form className="form rdapSearchClean" onSubmit={submit}>
      <label className="field">Domain<input value={domain} onChange={e=>setDomain(e.target.value)} placeholder="example.com" required spellCheck={false}/></label>
      <button className="primary">View Domain information</button>
    </form>
  </div>;
}
