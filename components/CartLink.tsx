"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {readCart,onCartChange} from "@/lib/cart-client";
import {useI18n} from "./I18nProvider";

function CartIcon(){
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l1.4 9.1a2 2 0 0 0 2 1.7h7.9a2 2 0 0 0 1.9-1.4L20 7H6.2M9 20h.01M17 20h.01" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

export default function CartLink(){
  const {t}=useI18n();
  const [count,setCount]=useState(0);
  useEffect(()=>{
    const sync=()=>setCount(readCart().length);
    sync();
    return onCartChange(sync);
  },[]);
  return <Link href="/cart" className="cartLink" aria-label={t("nav.cart")}>
    <CartIcon/>
    {count>0&&<span className="cartBadge">{count>99?"99+":count}</span>}
  </Link>;
}
