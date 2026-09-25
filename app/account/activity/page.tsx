"use client";
import {useEffect,useState} from "react";
import {useI18n} from "@/components/I18nProvider";
type Item={id:string;kind:string;status:string;last_error:string|null;domain:string;payment_status:string;updated_at:string};
export default function Activity(){
  const {t,locale}=useI18n();
  const [items,setItems]=useState<Item[]>([]);const [error,setError]=useState("");
  useEffect(()=>{fetch("/api/account/activity",{cache:"no-store"}).then(async r=>{if(r.status===401){location.href="/login";return null;}const d=await r.json();if(!r.ok)throw new Error(d.error);return d;}).then(d=>d&&setItems(d.items||[])).catch(e=>setError(e.message));},[]);
  return <div className="page wide accountPage"><p className="kicker">{t("account.activityKicker")}</p><h1 className="pageTitle">{t("account.activityTitle")}</h1><p className="pageIntro">{t("account.activityCopy")}</p>{error&&<p className="error">{error}</p>}<div className="accountList">{items.map(item=><div className="accountListRow" key={item.id}><div><strong>{item.domain}</strong><span>{item.kind} · {new Date(item.updated_at).toLocaleString(locale)}</span>{item.last_error&&<p className="error">{item.last_error}</p>}</div><div><span className="accountStatus">{item.status}</span></div></div>)}</div></div>;
}
