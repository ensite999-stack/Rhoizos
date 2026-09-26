"use client";
import {useEffect,useState} from "react";
import {useI18n} from "@/components/I18nProvider";

type Price={tld:string;register:number;renew:number;transfer:number;featured?:boolean};

export default function Pricing(){
  const {locale}=useI18n();
  const zh=locale.startsWith("zh");
  const [items,setItems]=useState<Price[]>([]);

  useEffect(()=>{
    fetch("/api/domain/search",{cache:"no-store"})
      .then(r=>r.json())
      .then(d=>setItems(d.prices||[]))
      .catch(()=>{});
  },[]);

  return <article className="page wide pricingPage">
    <p className="kicker">Rhoizos</p>
    <h1 className="pageTitle">{zh?"域名定价。":"Domain pricing."}</h1>
    <p className="pageIntro">{zh
      ?"注册、续费和转入都直接显示当前应付价格，不展示内部成本或加价结构。"
      :"Registration, renewal and transfer show the current customer price directly, without exposing internal cost calculations."}</p>

    <div className="pricingNotice">
      <strong>{zh?"价格说明":"Price notes"}</strong>
      <p>{zh
        ?"所有价格以美元显示。注册局费用、支付处理费用或高级域名实时价格发生变化时，最终价格可能相应调整；付款前会重新检查可用性和价格。"
        :"Prices are shown in USD. Registry costs, payment processing costs and live premium-domain pricing can change; availability and the applicable price are rechecked before payment."}</p>
    </div>

    <div className="publicPriceTable">
      <div className="publicPriceRow header">
        <span>{zh?"后缀":"TLD"}</span>
        <span>{zh?"注册":"Registration"}</span>
        <span>{zh?"续费":"Renew"}</span>
        <span>{zh?"转入":"Transfer"}</span>
      </div>
      {items.map(item=><div className="publicPriceRow" key={item.tld}>
        <strong>{item.tld}</strong>
        <span>{"$"+item.register.toFixed(2)}</span>
        <span>{"$"+item.renew.toFixed(2)}</span>
        <span>{"$"+item.transfer.toFixed(2)}</span>
      </div>)}
    </div>

    <div className="legalSections pricingTerms">
      <section><h2>{zh?"高级域名":"Premium domains"}</h2><p>{zh?"部分短词、常用词或注册局指定名称会被标记为高级域名。注册、续费或转入价格可能显著高于普通域名，也可能彼此不同。":"Some short, common or registry-designated names are premium domains. Registration, renewal and transfer prices can be much higher than standard domains and may differ from each other."}</p></section>
      <section><h2>{zh?"转入价格":"Transfer pricing"}</h2><p>{zh?"许多后缀的转入费用包含增加一个注册年限，但具体规则由注册局决定。部分后缀可能不增加年限或采用不同期限。":"Many transfers include an additional registration term, but registry rules vary. Some TLDs may not add a year or may use a different term."}</p></section>
      <section><h2>{zh?"到期与赎回":"Expiry and redemption"}</h2><p>{zh?"域名进入赎回期后，费用通常不再等同普通续费，可能包含注册局额外赎回费用。Rhoizos 会在能够恢复域名时显示实际费用。":"Once a domain enters redemption, recovery can cost more than a standard renewal because registries may add redemption fees. Rhoizos will show the applicable recovery cost when restoration is available."}</p></section>
    </div>
  </article>;
}
