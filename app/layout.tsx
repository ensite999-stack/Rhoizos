import type {Metadata,Viewport} from "next";
import {cookies} from "next/headers";
import "./globals.css";
import {I18nProvider} from "@/components/I18nProvider";
import SiteChrome from "@/components/SiteChrome";
import {htmlLanguage,normalizeLocale,translate} from "@/lib/i18n";
import type {Theme} from "@/components/ThemeToggle";

const SITE_URL=(process.env.RHOIZOS_APP_URL||"https://rhoizos.com").replace(/\/+$/,"");

async function preferences(){
  const store=await cookies();
  const locale=normalizeLocale(store.get("rhoizos_locale")?.value);
  const theme:Theme=store.get("rhoizos_theme")?.value==="dark"?"dark":"light";
  return {locale,theme};
}

export const viewport:Viewport={themeColor:"#702963",colorScheme:"light dark"};

export async function generateMetadata():Promise<Metadata>{
  const {locale}=await preferences();
  const title=translate(locale,"meta.title");
  const description=translate(locale,"meta.description");
  return {
    metadataBase:new URL(SITE_URL),
    title,description,
    applicationName:"Rhoizos",
    creator:"Rhoizos",
    publisher:"Rhoizos",
    category:"technology",
    keywords:["domain search","domain registration","domain transfer","domain renewal","DNS management","RDAP lookup","private DNS notes","Rhoizos"],
    icons:{icon:[{url:"/icon.svg",type:"image/svg+xml",sizes:"any"}],shortcut:"/icon.svg"},
    manifest:"/manifest.webmanifest",
    robots:{index:true,follow:true,googleBot:{index:true,follow:true,"max-image-preview":"large","max-snippet":-1,"max-video-preview":-1}},
    openGraph:{title,description,siteName:"Rhoizos",type:"website",images:[{url:"/assets/logo-source.png",alt:"Rhoizos"}]},
    twitter:{title,description,card:"summary_large_image",images:["/assets/logo-source.png"]},
    other:{google:"notranslate"}
  };
}

export default async function RootLayout({children}:{children:React.ReactNode}){
  const {locale,theme}=await preferences();
  const language=htmlLanguage(locale);
  const structuredData={
    "@context":"https://schema.org",
    "@graph":[
      {"@type":"Organization","@id":SITE_URL+"/#organization",name:"Rhoizos",url:SITE_URL,logo:{"@type":"ImageObject",url:SITE_URL+"/icon.svg"},email:"hello@rhoizos.com"},
      {"@type":"WebSite","@id":SITE_URL+"/#website",url:SITE_URL,name:"Rhoizos",publisher:{"@id":SITE_URL+"/#organization"},inLanguage:language}
    ]
  };
  return <html lang={language} data-theme={theme} suppressHydrationWarning>
    <body>
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(structuredData).replace(/</g,"\\u003c")}}/>
      <I18nProvider locale={locale}>
        <SiteChrome year={new Date().getFullYear()} theme={theme}>{children}</SiteChrome>
      </I18nProvider>
    </body>
  </html>;
}
