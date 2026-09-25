"use client";
import Link from "next/link";
import {useEffect,useRef,useState} from "react";
import {useI18n} from "./I18nProvider";

function MenuIcon(){
  return <svg viewBox="0 0 22 18" aria-hidden="true">
    <path d="M2 3h18M2 9h18M2 15h18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
  </svg>;
}

export default function AccountMenu(){
  const {t}=useI18n();
  const [open,setOpen]=useState(false);
  const ref=useRef<HTMLDivElement>(null);

  useEffect(()=>{
    const outside=(event:PointerEvent)=>{if(ref.current&&!ref.current.contains(event.target as Node))setOpen(false);};
    const escape=(event:KeyboardEvent)=>{if(event.key==="Escape")setOpen(false);};
    document.addEventListener("pointerdown",outside);
    document.addEventListener("keydown",escape);
    return ()=>{document.removeEventListener("pointerdown",outside);document.removeEventListener("keydown",escape);};
  },[]);

  async function logout(){
    await fetch("/api/auth/logout",{method:"POST"}).catch(()=>{});
    location.href="/";
  }

  return <div className="accountMenu" ref={ref}>
    <button
      className="accountMenuTrigger"
      type="button"
      onClick={()=>setOpen(v=>!v)}
      aria-expanded={open}
      aria-label={t("nav.myDomains")}
      title={t("nav.myDomains")}
    >
      <MenuIcon/>
    </button>
    {open&&<div className="accountPopover">
      <Link href="/domains" onClick={()=>setOpen(false)}><strong>{t("accountMenu.domains")}</strong><span>{t("accountMenu.domainsHint")}</span></Link>
      <Link href="/account/activity" onClick={()=>setOpen(false)}><strong>{t("accountMenu.activity")}</strong><span>{t("accountMenu.activityHint")}</span></Link>
      <Link href="/account/orders" onClick={()=>setOpen(false)}><strong>{t("accountMenu.orders")}</strong><span>{t("accountMenu.ordersHint")}</span></Link>
      <div className="accountPopoverDivider"/>
      <Link href="/account/profile" onClick={()=>setOpen(false)}><strong>{t("accountMenu.profile")}</strong></Link>
      <Link href="/account/security" onClick={()=>setOpen(false)}><strong>{t("accountMenu.security")}</strong></Link>
      <button className="accountLogout" type="button" onClick={logout}>{t("accountMenu.logout")}</button>
    </div>}
  </div>;
}
