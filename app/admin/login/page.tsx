"use client";
import {FormEvent,useState} from "react";

export default function AdminLogin(){
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);

  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    setBusy(true);setError("");
    const f=new FormData(e.currentTarget);
    const r=await fetch("/api/admin/auth/login",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({email:f.get("email"),password:f.get("password")})
    });
    const d=await r.json();
    if(!r.ok){setError(d.error||"Login failed.");setBusy(false);return;}
    location.href="/admin";
  }

  return <div className="adminBody"><div className="adminLogin">
    <h1>Rhoizos Admin</h1>
    <p>Operations, customers, domains and pricing.</p>
    <form onSubmit={submit}>
      <label className="field">Admin email<input name="email" type="email" autoComplete="username" required/></label>
      <label className="field">Password<input name="password" type="password" autoComplete="current-password" required/></label>
      {error&&<p className="error">{error}</p>}
      <button className="primary" disabled={busy}>{busy?"Signing in…":"Sign in"}</button>
    </form>
  </div></div>;
}
