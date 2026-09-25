"use client";
import Link from "next/link";
import LocaleMenu from "./LocaleMenu";
import ThemeToggle,{type Theme} from "./ThemeToggle";
import {useI18n} from "./I18nProvider";

function CartIcon(){
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l1.4 9.1a2 2 0 0 0 2 1.7h7.9a2 2 0 0 0 1.9-1.4L20 7H6.2M9 20h.01M17 20h.01" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

export default function SiteChrome({children,year,theme}:{children:React.ReactNode;year:number;theme:Theme}){
  const {t}=useI18n();

  return <>
    <header className="siteHeader">
      <div className="headerInner">
        <Link className="brand" href="/"><img src="/assets/rhoizos-mark.svg" alt=""/><span>Rhoizos</span></Link>
        <nav className="mainNav" aria-label="Primary">
          <Link href="/">{t("nav.domain")}</Link>
          <Link href="/#pricing">{t("nav.pricing")}</Link>
          <Link href="/transfer">{t("nav.transfer")}</Link>
          <Link href="/#learn">{t("nav.learn")}</Link>
          <Link href="/rdap">{t("nav.rdap")}</Link>
        </nav>
        <nav className="accountNav" aria-label="Account">
          <Link href="/support" className="desktopUtility">{t("nav.support")}</Link>
          <LocaleMenu/>
          <Link href="/login" className="desktopUtility">{t("nav.login")}</Link>
          <Link href="/cart" className="cartLink" aria-label={t("nav.cart")}><CartIcon/></Link>
          <Link href="/domains" className="domainsLink">{t("nav.myDomains")}</Link>
        </nav>
      </div>
    </header>

    <main>{children}</main>

    <footer className="siteFooter">
      <div className="footerStack">
        <Link className="footerLogo" href="/"><img src="/assets/rhoizos-mark.svg" alt=""/><strong>Rhoizos<sup className="footerTm">™</sup></strong></Link>
        <nav className="footerNav" aria-label="Footer">
          <Link href="/">{t("footer.search")}</Link>
          <Link href="/transfer">{t("footer.transfer")}</Link>
          <Link href="/rdap">{t("footer.rdap")}</Link>
          <Link href="/domains">{t("footer.domains")}</Link>
          <Link href="/#learn">{t("footer.learn")}</Link>
          <Link href="/support">{t("footer.support")}</Link>
          <a href="mailto:hello@rhoizos.com">hello@rhoizos.com</a>
          <Link href="/policies">{t("footer.policies")}</Link>
        </nav>
        <div className="footerPreferences">
          <div className="footerPreferenceBlock"><span>{t("footer.language")}</span><LocaleMenu variant="footer"/></div>
          <ThemeToggle initialTheme={theme}/>
        </div>
        <div className="footerCopyright">© {year} Rhoizos</div>
      </div>
    </footer>
  </>;
}
