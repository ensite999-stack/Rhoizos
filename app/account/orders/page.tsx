"use client";
import {useEffect,useState} from "react";
import {useI18n} from "@/components/I18nProvider";
type Order={id:string;kind:string;domain:string;amount_usd:number|string;status:string;payment_status:string;created_at:string};
export default function Orders(){
  const {t,locale}=useI18n();
  const [items,setItems]=useState<Order[]>([]);
  const [error,setError]=useState("");
  useEffect(()=>{fetch("/api/account/orders",{cache:"no-store"}).then(async r=>{if(r.status===401){location.href="/login";return null;}const d=await r.json();if(!r.ok)throw new Error(d.error);return d;}).then(d=>d&&setItems(d.items||[])).catch(e=>setError(e.message));},[]);
  return <div className="page wide accountPage"><p className="kicker">{t("account.ordersKicker")}</p><h1 className="pageTitle">{t("account.ordersTitle")}</h1><p className="pageIntro">{t("account.ordersCopy")}</p>{error&&<p className="error">{error}</p>}<div className="accountList">{items.map(item=><div className="accountListRow" key={item.id}><div><strong>{item.domain}</strong><span>{item.kind} · {new Date(item.created_at).toLocaleDateString(locale)}</span></div><div><b>{"$"+Number(item.amount_usd).toFixed(2)}</b><span>{item.payment_status} · {item.status}</span></div></div>)}</div></div>;
}
