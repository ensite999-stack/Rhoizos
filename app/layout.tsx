import type {Metadata} from "next";
import Link from "next/link";
import "./globals.css";

export const metadata:Metadata={
  title:"Rhoizos — Domains, simply managed.",
  description:"Search, register, transfer, renew and manage domains with Rhoizos."
};

export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="en"><body>
    <header className="siteHeader">
      <div className="headerInner">
        <Link className="brand" href="/"><img src="/assets/rhoizos-mark.svg" alt=""/><span>Rhoizos</span></Link>
        <nav className="mainNav" aria-label="Primary">
          <Link href="/">Domains</Link>
          <Link href="/#pricing">Pricing</Link>
          <Link href="/transfer">Transfer</Link>
          <Link href="/rdap">RDAP</Link>
        </nav>
        <nav className="accountNav" aria-label="Account">
          <Link className="supportLink" href="/support">Support</Link>
          <span className="languageLabel">EN</span>
          <Link className="loginLink" href="/login">Log in</Link>
          <Link className="accountButton" href="/domains">My domains</Link>
        </nav>
      </div>
    </header>
    <main>{children}</main>
    <footer className="siteFooter">
      <div className="footerGrid">
        <div className="footerBrand">
          <Link className="footerLogo" href="/"><img src="/assets/rhoizos-mark.svg" alt=""/><strong>Rhoizos</strong></Link>
          <p>Simple domain infrastructure for people who want control without clutter.</p>
        </div>
        <div className="footerColumn"><strong>Domains</strong><Link href="/">Search</Link><Link href="/transfer">Transfer in</Link><Link href="/rdap">RDAP lookup</Link></div>
        <div className="footerColumn"><strong>Account</strong><Link href="/domains">My domains</Link><Link href="/login">Log in</Link><Link href="/signup">Create account</Link></div>
        <div className="footerColumn"><strong>Rhoizos</strong><Link href="/support">Support</Link><Link href="/policies">Privacy & terms</Link><span>English</span></div>
      </div>
      <div className="footerBottom"><span>© 2026 Rhoizos</span><span>Search · Register · Transfer · Renew · DNS</span></div>
    </footer>
  </body></html>;
}
