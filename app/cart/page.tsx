"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {useI18n} from "@/components/I18nProvider";
import {onCartChange,readCart,removeCart,type CartItem} from "@/lib/cart-client";

export default function Cart(){
  const {t}=useI18n();
  const [items,setItems]=useState<CartItem[]>([]);
  const [busy,setBusy]=useState("");
  const [error,setError]=useState("");

  useEffect(()=>{
    const sync=()=>setItems(readCart());
    sync();
    return onCartChange(sync);
  },[]);

  async function checkout(item:CartItem){
    setBusy(item.domain);
    setError("");
    try{
      const response=await fetch("/api/orders/register",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({domain:item.domain})
      });
      if(response.status===401){location.href="/checkout/guest?domain="+encodeURIComponent(item.domain);return;}
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||t("cart.checkoutFailed"));
      location.href=data.checkoutUrl;
    }catch(error){
      setError(error instanceof Error?error.message:t("cart.checkoutFailed"));
      setBusy("");
    }
  }

  const total=items.reduce((sum,item)=>sum+item.price,0);

  return <article className="page cartPage">
    <p className="kicker">{t("cart.kicker")}</p>
    <h1 className="pageTitle">{t("cart.title")}</h1>

    {!items.length?<>
      <p className="pageIntro">{t("cart.copy")}</p>
      <div className="cartActions">
        <Link className="primaryLink" href="/">{t("cart.search")}</Link>
        <Link className="secondaryLink" href="/transfer">{t("cart.transfer")}</Link>
      </div>
    </>:<>
      <p className="pageIntro">{t("cart.review")}</p>
      <div className="cartList">
        {items.map(item=><div className="cartItem" key={item.domain}>
          <div>
            <span className="cartItemType">{t("cart.registration")}</span>
            <strong>{item.domain}</strong>
          </div>
          <div className="cartItemPrice">
            <strong>{"$"+item.price.toFixed(2)}</strong>
            <span>{t("detail.priceYear")}</span>
          </div>
          <div className="cartItemActions">
            <button className="secondary" type="button" onClick={()=>removeCart(item.domain)}>{t("cart.remove")}</button>
            <button className="primary" type="button" disabled={busy===item.domain} onClick={()=>checkout(item)}>
              {busy===item.domain?t("cart.starting"):t("cart.checkout")}
            </button>
          </div>
        </div>)}
      </div>
      <div className="cartSummary">
        <span>{t("cart.displayTotal")}</span>
        <strong>{"$"+total.toFixed(2)}</strong>
      </div>
      <p className="fine cartPriceNote">{t("cart.priceNote")}</p>
      {error&&<p className="error">{error}</p>}
    </>}
  </article>;
}
