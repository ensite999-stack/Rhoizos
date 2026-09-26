"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {useEffect,useRef,useState} from "react";
import {useI18n} from "./I18nProvider";

function MenuIcon(){
  return <span className="menuGlyph" aria-hidden="true"><span/><span/></span>;
}

function CloseIcon(){
  return <span className="drawerCloseGlyph" aria-hidden="true"><span/><span/></span>;
}

type AccountIcon="domains"|"activity"|"orders"|"profile"|"security";
type NavIcon="domain"|"pricing"|"transfer"|"backorder"|"rdap"|"learn"|"contact"|"login";

function AccountItemIcon({type}:{type:AccountIcon}){
  const paths={
    domains:<><rect x="3.5" y="4.5" width="17" height="15" rx="3"/><path d="M8 4.5V2.8m8 1.7V2.8M7 9h10M8 13h3m2 0h3"/></>,
    activity:<><path d="M4 12a8 8 0 1 0 2.3-5.7"/><path d="M4 5v4h4M12 7v5l3 2"/></>,
    orders:<><path d="M5 3.5h14v17l-3-1.6-4 1.6-4-1.6-3 1.6z"/><path d="M8 8h8m-8 4h8m-8 4h5"/></>,
    profile:<><circle cx="12" cy="8" r="3.5"/><path d="M5 20c.8-4 3.1-6 7-6s6.2 2 7 6"/></>,
    security:<><path d="M12 2.8 19 6v5.2c0 4.4-2.7 7.6-7 9.8-4.3-2.2-7-5.4-7-9.8V6z"/><path d="m9.3 12 1.8 1.8 3.8-4"/></>
  };
  return <span className="accountItemIcon" aria-hidden="true"><svg viewBox="0 0 24 24">{paths[type]}</svg></span>;
}

function NavItemIcon({type}:{type:NavIcon}){
  const paths={
    domain:<><circle cx="12" cy="12" r="8.5"/><path d="M3.8 12h16.4M12 3.5c2.2 2.3 3.4 5.1 3.4 8.5S14.2 18.2 12 20.5C9.8 18.2 8.6 15.4 8.6 12S9.8 5.8 12 3.5z"/></>,
    pricing:<><path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5z"/><path d="M12 7v10m-3-7.5h4.2a1.8 1.8 0 0 1 0 3.6H11a1.8 1.8 0 0 0 0 3.6h4"/></>,
    transfer:<><path d="M5 8h12m-3-3 3 3-3 3M19 16H7m3 3-3-3 3-3"/></>,
    backorder:<><path d="M12 3v4m0 10v4M3 12h4m10 0h4"/><circle cx="12" cy="12" r="4.5"/><path d="M18.4 5.6 16 8m-8 8-2.4 2.4M5.6 5.6 8 8m8 8 2.4 2.4"/></>,
    rdap:<><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5M8 10.5h5m-2.5-2.5v5"/></>,
    learn:<><path d="M4 5.5c2.7 0 5 .8 8 2.5 3-1.7 5.3-2.5 8-2.5v12c-2.7 0-5 .8-8 2.5-3-1.7-5.3-2.5-8-2.5z"/><path d="M12 8v12"/></>,
    contact:<><path d="M4 5h16v12H8l-4 4z"/><path d="M8 9h8m-8 4h5"/></>,
    login:<><path d="M10 5H5v14h5M13 8l4 4-4 4m4-4H9"/></>
  };
  return <span className="mobileDrawerIcon" aria-hidden="true"><svg viewBox="0 0 24 24">{paths[type]}</svg></span>;
}

function AccountMenuItem({href,icon,title,hint,onClick}:{href:string;icon:AccountIcon;title:string;hint?:string;onClick:()=>void}){
  return <Link className="accountMenuItem" href={href} onClick={onClick}>
    <AccountItemIcon type={icon}/>
    <span className="accountMenuItemCopy"><strong>{title}</strong>{hint&&<small>{hint}</small>}</span>
    <span className="accountMenuArrow" aria-hidden="true">→</span>
  </Link>;
}

function MobileNavItem({href,icon,title,onClick}:{href:string;icon:NavIcon;title:string;onClick:()=>void}){
  return <Link className="mobileDrawerRow" href={href} onClick={onClick}>
    <NavItemIcon type={icon}/>
    <strong>{title}</strong>
    <span className="mobileDrawerChevron" aria-hidden="true">›</span>
  </Link>;
}

export default function AccountMenu(){
  const {t}=useI18n();
  const pathname=usePathname();
  const [open,setOpen]=useState(false);
  const [panel,setPanel]=useState<"main"|"account">("main");
  const ref=useRef<HTMLDivElement>(null);

  useEffect(()=>{
    const outside=(event:PointerEvent)=>{
      if(window.matchMedia("(min-width:901px)").matches&&ref.current&&!ref.current.contains(event.target as Node))setOpen(false);
    };
    const escape=(event:KeyboardEvent)=>{if(event.key==="Escape")setOpen(false);};
    document.addEventListener("pointerdown",outside);
    document.addEventListener("keydown",escape);
    return ()=>{document.removeEventListener("pointerdown",outside);document.removeEventListener("keydown",escape);};
  },[]);

  useEffect(()=>{setOpen(false);setPanel("main");},[pathname]);

  useEffect(()=>{
    if(!open||!window.matchMedia("(max-width:900px)").matches)return;
    const previous=document.body.style.overflow;
    document.body.style.overflow="hidden";
    return ()=>{document.body.style.overflow=previous;};
  },[open]);

  async function logout(){
    await fetch("/api/auth/logout",{method:"POST"}).catch(()=>{});
    location.href="/";
  }

  const close=()=>{setOpen(false);setPanel("main");};

  return <div className="accountMenu" ref={ref}>
    <button
      className={"accountMenuTrigger"+(open?" open":"")}
      type="button"
      onClick={()=>{setOpen(v=>!v);setPanel("main");}}
      aria-expanded={open}
      aria-label={t("accountMenu.title")}
      title={t("accountMenu.title")}
    >
      <MenuIcon/>
    </button>

    {open&&<>
      <div className="accountPopover accountPopoverDesktop">
        <div className="accountPopoverHead">
          <div><span>{t("accountMenu.title")}</span><strong>{t("accountMenu.subtitle")}</strong></div>
          <span className="accountPopoverMark" aria-hidden="true">R</span>
        </div>
        <div className="accountMenuSection">
          <span className="accountSectionLabel">{t("accountMenu.domainSection")}</span>
          <AccountMenuItem href="/domains" icon="domains" title={t("accountMenu.domains")} hint={t("accountMenu.domainsHint")} onClick={close}/>
          <AccountMenuItem href="/account/activity" icon="activity" title={t("accountMenu.activity")} hint={t("accountMenu.activityHint")} onClick={close}/>
          <AccountMenuItem href="/account/orders" icon="orders" title={t("accountMenu.orders")} hint={t("accountMenu.ordersHint")} onClick={close}/>
        </div>
        <div className="accountMenuSection accountMenuSectionSecondary">
          <span className="accountSectionLabel">{t("accountMenu.accountSection")}</span>
          <AccountMenuItem href="/account/profile" icon="profile" title={t("accountMenu.profile")} onClick={close}/>
          <AccountMenuItem href="/account/security" icon="security" title={t("accountMenu.security")} onClick={close}/>
        </div>
        <button className="accountLogout" type="button" onClick={logout}>{t("accountMenu.logout")}<span aria-hidden="true">→</span></button>
      </div>

      <div className="mobileNavDrawer" role="dialog" aria-modal="true" aria-label={t("accountMenu.title")}>
        {panel==="main"?<>
          <header className="mobileDrawerHeader">
            <Link className="mobileDrawerBrand notranslate" href="/" onClick={close} translate="no">
              <img src="/assets/rhoizos-mark.svg" alt=""/><strong>Rhoizos</strong>
            </Link>
            <button className="mobileDrawerClose" type="button" onClick={close} aria-label="Close"><CloseIcon/></button>
          </header>

          <div className="mobileDrawerScroll">
            <button className="mobileAccountEntry" type="button" onClick={()=>setPanel("account")}>
              <AccountItemIcon type="profile"/>
              <span><strong>{t("accountMenu.yourAccount")}</strong><small>{t("accountMenu.subtitle")}</small></span>
              <b aria-hidden="true">›</b>
            </button>

            <section className="mobileDrawerSection">
              <span className="mobileDrawerLabel">{t("accountMenu.exploreRhoizos")}</span>
              <MobileNavItem href="/" icon="domain" title={t("nav.domain")} onClick={close}/>
              <MobileNavItem href="/pricing" icon="pricing" title={t("nav.pricing")} onClick={close}/>
              <MobileNavItem href="/transfer" icon="transfer" title={t("nav.transfer")} onClick={close}/>
              <MobileNavItem href="/dropcatch" icon="backorder" title={t("nav.dropcatch")} onClick={close}/>
              <MobileNavItem href="/rdap" icon="rdap" title={t("nav.rdap")} onClick={close}/>
              <MobileNavItem href="/#learn" icon="learn" title={t("nav.learn")} onClick={close}/>
              <MobileNavItem href="/support" icon="contact" title={t("nav.support")} onClick={close}/>
            </section>

            <section className="mobileDrawerSection mobileDrawerSectionLast">
              <span className="mobileDrawerLabel">{t("accountMenu.access")}</span>
              <MobileNavItem href="/login" icon="login" title={t("nav.login")} onClick={close}/>
            </section>
          </div>
        </>:<>
          <header className="mobileDrawerHeader accountSubHeader">
            <button className="mobileDrawerBack" type="button" onClick={()=>setPanel("main")} aria-label={t("common.back")}>←</button>
            <span className="accountSubTitle"><AccountItemIcon type="profile"/><strong>{t("accountMenu.yourAccount")}</strong></span>
            <button className="mobileDrawerClose" type="button" onClick={close} aria-label="Close"><CloseIcon/></button>
          </header>

          <div className="mobileDrawerScroll mobileAccountPanel">
            <AccountMenuItem href="/domains" icon="domains" title={t("accountMenu.domains")} hint={t("accountMenu.domainsHint")} onClick={close}/>
            <AccountMenuItem href="/account/activity" icon="activity" title={t("accountMenu.activity")} hint={t("accountMenu.activityHint")} onClick={close}/>
            <AccountMenuItem href="/account/orders" icon="orders" title={t("accountMenu.orders")} hint={t("accountMenu.ordersHint")} onClick={close}/>
            <AccountMenuItem href="/account/profile" icon="profile" title={t("accountMenu.profile")} onClick={close}/>
            <AccountMenuItem href="/account/security" icon="security" title={t("accountMenu.security")} onClick={close}/>
            <button className="mobileAccountLogout" type="button" onClick={logout}>{t("accountMenu.logout")}</button>
          </div>
        </>}
      </div>
    </>}
  </div>;
}
