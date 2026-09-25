"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import LocaleMenu from "./LocaleMenu";
import ThemeToggle,{type Theme} from "./ThemeToggle";
import CartLink from "./CartLink";
import AccountMenu from "./AccountMenu";
import {useI18n} from "./I18nProvider";

export default function SiteChrome({children,year,theme}:{children:React.ReactNode;year:number;theme:Theme}){
  const {t}=useI18n();
  const pathname=usePathname();
  const overlay=pathname==="/"||pathname.startsWith("/domain/");

  return <>
    <header className={"siteHeader"+(overlay?" overlayHeader":"")}>
      <div className="headerInner">
        <Link className="brand notranslate" href="/" translate="no" aria-label="Rhoizos"><img src="/assets/rhoizos-mark.svg" alt="Rhoizos"/></Link>
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
