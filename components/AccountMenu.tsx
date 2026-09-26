"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {ReactNode,useEffect,useRef,useState} from "react";
import {useI18n} from "./I18nProvider";

function MenuIcon(){
  return <span className="menuGlyph" aria-hidden="true">
    <span/><span/>
  </span>;
}

function ItemIcon({type}:{type:"domains"|"activity"|"orders"|"profile"|"security"}){
  const paths={
    domains:<><rect x="3.5" y="4.5" width="17" height="15" rx="3"/><path d="M8 4.5V2.8m8 1.7V2.8M7 9h10M8 13h3m2 0h3"/></>,
    activity:<><path d="M4 12a8 8 0 1 0 2.3-5.7"/><path d="M4 5v4h4M12 7v5l3 2"/></>,
    orders:<><path d="M5 3.5h14v17l-3-1.6-4 1.6-4-1.6-3 1.6z"/><path d="M8 8h8m-8 4h8m-8 4h5"/></>,
    profile:<><circle cx="12" cy="8" r="3.5"/><path d="M5 20c.8-4 3.1-6 7-6s6.2 2 7 6"/></>,
    security:<><path d="M12 2.8 19 6v5.2c0 4.4-2.7 7.6-7 9.8-4.3-2.2-7-5.4-7-9.8V6z"/><path d="m9.3 12 1.8 1.8 3.8-4"/></>
  };
  return <span className="accountItemIcon" aria-hidden="true"><svg viewBox="0 0 24 24">{paths[type]}</svg></span>;
}

function MenuItem({href,icon,title,hint,onClick}:{href:string;icon:"domains"|"activity"|"orders"|"profile"|"security";title:string;hint?:string;onClick:()=>void}){
  return <Link className="accountMenuItem" href={href} onClick={onClick}>
    <ItemIcon type={icon}/>
    <span className="accountMenuItemCopy"><strong>{title}</strong>{hint&&<small>{hint}</small>}</span>
    <span className="accountMenuArrow" aria-hidden="true">→</span>
  </Link>;
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

  const close=()=>setOpen(false);

  return <div className="accountMenu" ref={ref}>
    <button
      className={"accountMenuTrigger"+(open?" open":"")}
      type="button"
      onClick={()=>setOpen(v=>!v)}
      aria-expanded={open}
      aria-label={t("accountMenu.title")}
      title={t("accountMenu.title")}
    >
      <MenuIcon/>
    </button>

    {open&&<div className="accountPopover">
      <div className="accountPopoverHead">
        <div>
          <span>{t("accountMenu.title")}</span>
          <strong>{t("accountMenu.subtitle")}</strong>
        </div>
        <span className="accountPopoverMark" aria-hidden="true">R</span>
      </div>

      <div className="mobileMenuSection">
        <span className="accountSectionLabel">{t("accountMenu.explore")}</span>
        <nav className="mobileMenuNav" aria-label="Mobile">
          <Link href="/" onClick={close}>{t("nav.domain")}</Link>
          <Link href="/pricing" onClick={close}>{t("nav.pricing")}</Link>
          <Link href="/transfer" onClick={close}>{t("nav.transfer")}</Link>
          <Link href="/dropcatch" onClick={close}>{t("nav.dropcatch")}</Link>
          <Link href="/#learn" onClick={close}>{t("nav.learn")}</Link>
          <Link href="/rdap" onClick={close}>{t("nav.rdap")}</Link>
          <Link href="/support" onClick={close}>{t("nav.support")}</Link>
          <Link href="/login" onClick={close}>{t("nav.login")}</Link>
        </nav>
      </div>

      <div className="accountMenuSection">
        <span className="accountSectionLabel">{t("accountMenu.domainSection")}</span>
        <MenuItem href="/domains" icon="domains" title={t("accountMenu.domains")} hint={t("accountMenu.domainsHint")} onClick={close}/>
        <MenuItem href="/account/activity" icon="activity" title={t("accountMenu.activity")} hint={t("accountMenu.activityHint")} onClick={close}/>
        <MenuItem href="/account/orders" icon="orders" title={t("accountMenu.orders")} hint={t("accountMenu.ordersHint")} onClick={close}/>
      </div>

      <div className="accountMenuSection accountMenuSectionSecondary">
        <span className="accountSectionLabel">{t("accountMenu.accountSection")}</span>
        <MenuItem href="/account/profile" icon="profile" title={t("accountMenu.profile")} onClick={close}/>
        <MenuItem href="/account/security" icon="security" title={t("accountMenu.security")} onClick={close}/>
      </div>

      <button className="accountLogout" type="button" onClick={logout}>{t("accountMenu.logout")}<span aria-hidden="true">→</span></button>
    </div>}
  </div>;
}
