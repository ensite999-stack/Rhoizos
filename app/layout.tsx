import type {Metadata} from "next";
import Link from "next/link";
import "./globals.css";

export const metadata:Metadata={
  title:"Rhoizos — Your Domain. Your World!",
  description:"A simple, focused place to search, register, transfer, renew and manage Domains."
};

function CartIcon(){
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l1.4 9.1a2 2 0 0 0 2 1.7h7.9a2 2 0 0 0 1.9-1.4L20 7H6.2M9 20h.01M17 20h.01" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

export default function RootLayout({children}:{children:React.ReactNode}){
  const year=new Date().getFullYear();

  return <html lang="en"><body>
    <header className="siteHeader">
      <div className="headerInner">
        <Link className="brand" href="/">
          <img src="/assets/rhoizos-mark.svg" alt=""/>
          <span>Rhoizos</span>
        </Link>

        <nav className="mainNav" aria-label="Primary">
          <Link href="/">Domain</Link>
          <Link href="/#pricing">Pricing</Link>
          <Link href="/transfer">Transfer</Link>
          <Link href="/#learn">Learn</Link>
          <Link href="/rdap">RDAP</Link>
        </nav>

        <nav className="accountNav" aria-label="Account">
          <Link href="/support" className="desktopUtility">Support</Link>
          <span className="languageLabel">EN</span>
          <Link href="/login" className="desktopUtility">Log in</Link>
          <Link href="/cart" className="cartLink" aria-label="Cart"><CartIcon/></Link>
          <Link href="/domains" className="domainsLink">My Domains</Link>
        </nav>
      </div>
    </header>

    <main>{children}</main>

    <footer className="siteFooter">
      <div className="footerStack">
        <Link className="footerLogo" href="/">
          <img src="/assets/rhoizos-mark.svg" alt=""/>
          <strong>Rhoizos<sup className="footerTm">™</sup></strong>
        </Link>

        <nav className="footerNav" aria-label="Footer">
          <Link href="/">Search Domains</Link>
          <Link href="/transfer">Transfer a Domain</Link>
          <Link href="/rdap">RDAP lookup</Link>
          <Link href="/domains">My Domains</Link>
          <Link href="/#learn">Learn about Domains</Link>
          <Link href="/support">Support</Link>
          <a href="mailto:hello@rhoizos.com">hello@rhoizos.com</a>
          <Link href="/policies">Privacy & terms</Link>
        </nav>

        <div className="footerCopyright">© {year} Rhoizos</div>
      </div>
    </footer>
  </body></html>;
}
