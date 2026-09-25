import type {MetadataRoute} from "next";
const SITE_URL=(process.env.RHOIZOS_APP_URL||"https://rhoizos.com").replace(/\/+$/,"");
export default function robots():MetadataRoute.Robots{return {rules:[{userAgent:"*",allow:"/",disallow:["/api/","/admin/","/cart","/dns","/domains","/login","/signup"]}],sitemap:SITE_URL+"/sitemap.xml",host:SITE_URL};}
