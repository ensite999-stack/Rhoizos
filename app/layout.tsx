import type {Metadata} from "next";
import Link from "next/link";
import "./globals.css";

export const metadata:Metadata={
  title:"Rhoizos — Domains, simply managed.",
  description:"Search, register, transfer, renew and manage domains with Rhoizos."
};

export default function RootLayout({children}:{children:React.ReactNode}){
  const year=new Date().getFullYear();

  return <html lang="en"><body>
    <header className="siteHeader">
      <div className="headerInner">
        <Link className="brand" href="/">
          <img src="/assets/rhoizos-mark.svg" alt=""/>
          <span>Rhoizos<sup className="tmMark">™</sup></span>
        </Link>

        <nav className="mainNav" aria-label="Primary">
          <Link href="/">Domains</Link>
          <Link href="/#pricing">Pricing</Link>
          <Link href="/transfer">Transfer</Link>
          <Link href="/rdap">RDAP</Link>
        </nav>

        <nav className="accountNav" aria-label="Account">
          <Link href="/support">Support</Link>
          <span className="languageLabel">EN</span>
          <Link href="/login">Log in</Link>
          <Link className="accountButton" href="/domains">My domains</Link>
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
          <Link href="/">Search domains</Link>
          <Link href="/transfer">Transfer a domain</Link>
          <Link href="/rdap">RDAP lookup</Link>
          <Link href="/domains">My domains</Link>
          <Link href="/support">Support</Link>
          <a href="mailto:hello@rhoizos.com">hello@rhoizos.com</a>
          <Link href="/policies">Privacy & terms</Link>
        </nav>

        <div className="footerCopyright">© {year} Rhoizos</div>
      </div>
    </footer>
  </body></html>;
}
