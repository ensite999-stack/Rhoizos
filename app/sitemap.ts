import type {MetadataRoute} from "next";
const SITE_URL=(process.env.RHOIZOS_APP_URL||"https://rhoizos.com").replace(/\/+$/,"");
export default function sitemap():MetadataRoute.Sitemap{const now=new Date();return [
{url:SITE_URL+"/",lastModified:now,changeFrequency:"daily",priority:1},
{url:SITE_URL+"/transfer",lastModified:now,changeFrequency:"weekly",priority:.85},
{url:SITE_URL+"/rdap",lastModified:now,changeFrequency:"weekly",priority:.75},
{url:SITE_URL+"/support",lastModified:now,changeFrequency:"monthly",priority:.5},
{url:SITE_URL+"/pricing",lastModified:now,changeFrequency:"weekly",priority:.8},
{url:SITE_URL+"/privacy",lastModified:now,changeFrequency:"monthly",priority:.45},
{url:SITE_URL+"/terms",lastModified:now,changeFrequency:"monthly",priority:.45},
{url:SITE_URL+"/policies",lastModified:now,changeFrequency:"monthly",priority:.3}
];}
