"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {MouseEvent,useEffect,useRef,useState} from "react";
import LocaleMenu from "./LocaleMenu";
import ThemeToggle,{type Theme} from "./ThemeToggle";
import CartLink from "./CartLink";
import AccountMenu from "./AccountMenu";
import {useI18n} from "./I18nProvider";

export default function SiteChrome({children,year,theme}:{children:React.ReactNode;year:number;theme:Theme}){
  const {t}=useI18n();
  const pathname=usePathname();
  const overlay=pathname==="/"||pathname.startsWith("/domain/");
  const [headerHidden,setHeaderHidden]=useState(false);
  const [headerScrolled,setHeaderScrolled]=useState(false);
  const lastY=useRef(0);

  useEffect(()=>{
    lastY.current=window.scrollY;
    const onScroll=()=>{
      const y=Math.max(0,window.scrollY);
      const delta=y-lastY.current;
      setHeaderScrolled(y>16);

      if(y<=18){
        setHeaderHidden(false);
      }else if(delta>7&&y>96){
        setHeaderHidden(true);
      }else if(delta<-7){
        setHeaderHidden(false);
      }
      if(Math.abs(delta)>7)lastY.current=y;
    };
    window.addEventListener("scroll",onScroll,{passive:true});
    onScroll();
    return ()=>window.removeEventListener("scroll",onScroll);
  },[pathname]);

  function returnToTop(event:MouseEvent<HTMLAnchorElement>){
    event.preventDefault();
    setHeaderHidden(false);
    window.scrollTo({top:0,behavior:"smooth"});
  }

  return <>
    <header className={[
      "siteHeader",
      overlay?"overlayHeader":"",
      headerHidden?"headerHidden":"",
      headerScrolled?"headerScrolled":""
    ].filter(Boolean).join(" ")}>
      <div className="headerInner">
        <a className="brand notranslate" href={pathname||"/"} onClick={returnToTop} translate="no" aria-label="Rhoizos — back to top">
          <img src="/assets/rhoizos-mark.svg" alt="Rhoizos"/>
        </a>
        <nav className="mainNav" aria-label="Primary">
          <Link href="/">{t("nav.domain")}</Link>
          <Link href="/pricing">{t("nav.pricing")}</Link>
          <Link href="/transfer">{t("nav.transfer")}</Link>
          <Link href="/#learn">{t("nav.learn")}</Link>
          <Link href="/rdap">{t("nav.rdap")}</Link>
        </nav>
        <nav className="accountNav" aria-label="Account">
          <Link href="/support" className="desktopUtility">{t("nav.support")}</Link>
          <LocaleMenu/>
          <Link href="/login" className="desktopUtility">{t("nav.login")}</Link>
          <CartLink/>
          <AccountMenu/>
        </nav>
      </div>
    </header>

    <main>{children}</main>

    <footer className="siteFooter">
      <div className="footerStack">
        <Link className="footerLogo notranslate" href="/" translate="no"><img src="/assets/rhoizos-mark.svg" alt=""/><strong>Rhoizos<sup className="footerTm">™</sup></strong></Link>
        <nav className="footerNav" aria-label="Footer">
          <Link href="/">{t("footer.search")}</Link>
          <Link href="/transfer">{t("footer.transfer")}</Link>
          <Link href="/rdap">{t("footer.rdap")}</Link>
          <Link href="/domains">{t("footer.domains")}</Link>
          <Link href="/#learn">{t("footer.learn")}</Link>
          <Link href="/pricing">{t("footer.pricing")}</Link>
          <Link href="/privacy">{t("footer.privacy")}</Link>
          <Link href="/terms">{t("footer.terms")}</Link>
          <Link href="/support">{t("footer.support")}</Link>
          <a href="mailto:hello@rhoizos.com">hello@rhoizos.com</a>
        </nav>
        <div className="footerPreferences">
          <ThemeToggle initialTheme={theme}/>
        </div>
        <div className="footerCopyright">© {year} <span className="notranslate" translate="no">Rhoizos</span></div>
      </div>
    </footer>
  </>;
}
