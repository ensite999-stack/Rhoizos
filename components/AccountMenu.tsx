"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {useEffect,useRef,useState} from "react";
import {useI18n} from "./I18nProvider";

function MenuIcon(){
  return <svg viewBox="0 0 22 18" aria-hidden="true">
    <path d="M2 3h18M2 9h18M2 15h18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
  </svg>;
}

export default function AccountMenu(){
  const {t}=useI18n();
  const pathname=usePathname();
  const [open,setOpen]=useState(false);
  const ref=useRef<HTMLDivElement>(null);

  useEffect(()=>{
    const outside=(event:PointerEvent)=>{if(ref.current&&!ref.current.contains(event.target as Node))setOpen(false);};
    const escape=(event:KeyboardEvent)=>{if(event.key==="Escape")setOpen(false);};
    document.addEventListener("pointerdown",outside);
    document.addEventListener("keydown",escape);
    return ()=>{document.removeEventListener("pointerdown",outside);document.removeEventListener("keydown",escape);};
  },[]);

  useEffect(()=>{setOpen(false);},[pathname]);

  async function logout(){
    await fetch("/api/auth/logout",{method:"POST"}).catch(()=>{});
    location.href="/";
  }

  return <div className="accountMenu" ref={ref}>
    <button
      className={"accountMenuTrigger"+(open?" open":"")}
      type="button"
      onClick={()=>setOpen(v=>!v)}
      aria-expanded={open}
      aria-label={t("nav.myDomains")}
      title={t("nav.myDomains")}
    >
      <MenuIcon/>
    </button>
    {open&&<div className="accountPopover">
      <nav className="mobileMenuNav" aria-label="Mobile">
        <Link href="/" onClick={()=>setOpen(false)}>{t("nav.domain")}</Link>
        <Link href="/pricing" onClick={()=>setOpen(false)}>{t("nav.pricing")}</Link>
        <Link href="/transfer" onClick={()=>setOpen(false)}>{t("nav.transfer")}</Link>
        <Link href="/dropcatch" onClick={()=>setOpen(false)}>{t("nav.dropcatch")}</Link>
        <Link href="/#learn" onClick={()=>setOpen(false)}>{t("nav.learn")}</Link>
        <Link href="/rdap" onClick={()=>setOpen(false)}>{t("nav.rdap")}</Link>
        <Link href="/support" onClick={()=>setOpen(false)}>{t("nav.support")}</Link>
        <Link href="/login" onClick={()=>setOpen(false)}>{t("nav.login")}</Link>
      </nav>
      <div className="mobileMenuDivider"/>
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
