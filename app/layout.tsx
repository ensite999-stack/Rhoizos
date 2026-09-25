import type {Metadata} from "next";
import {cookies} from "next/headers";
import "./globals.css";
import {I18nProvider} from "@/components/I18nProvider";
import SiteChrome from "@/components/SiteChrome";
import {htmlLanguage,normalizeLocale,translate} from "@/lib/i18n";
import type {Theme} from "@/components/ThemeToggle";

async function preferences(){
  const store=await cookies();
  const locale=normalizeLocale(store.get("rhoizos_locale")?.value);
  const theme:Theme=store.get("rhoizos_theme")?.value==="dark"?"dark":"light";
  return {locale,theme};
}

export async function generateMetadata():Promise<Metadata>{
  const {locale}=await preferences();
  const title=translate(locale,"meta.title");
  const description=translate(locale,"meta.description");
  return {
    title,
    description,
    applicationName:"Rhoizos",
    openGraph:{title,description,siteName:"Rhoizos",type:"website"},
    twitter:{title,description,card:"summary"},
    other:{google:"notranslate"}
  };
}

export default async function RootLayout({children}:{children:React.ReactNode}){
  const {locale,theme}=await preferences();
  return <html lang={htmlLanguage(locale)} data-theme={theme} suppressHydrationWarning>
    <body>
      <I18nProvider locale={locale}>
        <SiteChrome year={new Date().getFullYear()} theme={theme}>{children}</SiteChrome>
      </I18nProvider>
    </body>
  </html>;
}
