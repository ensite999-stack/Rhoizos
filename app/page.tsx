"use client";
import Link from "next/link";
import {FormEvent,useEffect,useState} from "react";
import {useI18n} from "@/components/I18nProvider";

type Price={tld:string;register:number;renew:number;transfer:number;featured?:boolean};

function SearchIcon(){
  return <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="2"/>
    <path d="m16 16 4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>;
}

export default function Home(){
  const {t}=useI18n();
  const [mode,setMode]=useState<"register"|"transfer">("register");
  const [domain,setDomain]=useState("");
  const [prices,setPrices]=useState<Price[]>([]);

  useEffect(()=>{
    fetch("/api/domain/search")
      .then(response=>response.json())
      .then(data=>setPrices(data.prices||[]))
      .catch(()=>{});
  },[]);

  function search(event:FormEvent){
    event.preventDefault();
    const value=domain.trim();
    if(!value)return;
    location.href=mode==="transfer"
      ?"/transfer?domain="+encodeURIComponent(value)
      :"/domain/"+encodeURIComponent(value.toLowerCase());
  }

  const featured=prices.filter(item=>item.featured!==false).slice(0,4);
  const questions=[1,2,3,4,5,6];

  return <div className="homePage">
    <section className="homeHero">
      <div className="heroInner">
        <div className="heroLead">
          <h1 className="heroTitle">{t("home.hero.title1")}<br/>{t("home.hero.title2")}</h1>
          <p className="heroCopy">{t("home.hero.copy")}</p>
        </div>

        <div className="searchPanel">
          <div className="searchModes" role="tablist" aria-label={t("home.domainAction")}>
            <button type="button" className={mode==="register"?"active":""} onClick={()=>setMode("register")}>{t("home.register")}</button>
            <button type="button" className={mode==="transfer"?"active":""} onClick={()=>setMode("transfer")}>{t("home.transfer")}</button>
          </div>

          <form className="searchForm" onSubmit={search}>
            <input
              value={domain}
              onChange={event=>setDomain(event.target.value)}
              placeholder={mode==="register"?t("home.searchRegister"):t("home.searchTransfer")}
              aria-label={t("common.domain")}
              required
              autoComplete="off"
              spellCheck={false}
            />
            <button className="searchButton" aria-label={mode==="register"?t("home.register"):t("home.transfer")}>
              <SearchIcon/>
            </button>
          </form>

          {!!featured.length&&<div className="searchPromos">
            {featured.slice(0,3).map((item,index)=><span key={item.tld}>
              {index>0&&<i>·</i>}<b>{item.tld}</b> {"$"+item.register.toFixed(2)}
            </span>)}
          </div>}
        </div>
      </div>
    </section>

    <section className="lightSection offersSection" id="pricing">
      <div className="lightInner">
        <div className="sectionHeading">
          <div><span className="sectionLabel">{t("home.pricingLabel")}</span><h2>{t("home.pricingTitle")}</h2></div>
          <p>{t("home.pricingCopy")}</p>
        </div>

        <div className="offerGrid">
          {featured.map(item=><div className="offerItem" key={item.tld}>
            <div className="offerTop"><strong>{item.tld}</strong><span>{"$"+item.register.toFixed(2)}</span></div>
            <p>{t("home.registrationYear")}</p>
            <div className="offerDetails">
              <span>{t("home.renew")} <b>{"$"+item.renew.toFixed(2)}</b></span>
              <span>{t("home.transfer")} <b>{"$"+item.transfer.toFixed(2)}</b></span>
            </div>
            <button className="textAction" onClick={()=>{location.href="/domain/example"+item.tld}}>{t("home.check")}</button>
          </div>)}
        </div>
      </div>
    </section>

    <section className="lightSection homeServicesSection">
      <div className="lightInner">
        <div className="sectionHeading">
          <div>
            <span className="sectionLabel">{t("home.servicesLabel")}</span>
            <h2>{t("home.servicesTitle")}</h2>
          </div>
          <p>{t("home.servicesCopy")}</p>
        </div>

        <div className="homeServiceGrid">
          <Link className="homeServiceCard" href="/dropcatch">
            <div className="homeServiceMeta">
              <span>{t("home.dropcatchEyebrow")}</span>
            </div>
            <h3>{t("home.dropcatchTitle")}</h3>
            <p>{t("home.dropcatchCopy")}</p>
            <strong>{t("home.dropcatchAction")}</strong>
          </Link>

          <Link className="homeServiceCard" href="/forwarding">
            <div className="homeServiceMeta">
              <span>{t("home.forwardingEyebrow")}</span>
              <b>{t("home.freeBadge")}</b>
            </div>
            <h3>{t("home.forwardingTitle")}</h3>
            <p>{t("home.forwardingCopy")}</p>
            <strong>{t("home.forwardingAction")}</strong>
          </Link>

          <Link className="homeServiceCard" href="/email-forwarding">
            <div className="homeServiceMeta">
              <span>{t("home.emailForwardEyebrow")}</span>
              <b>{t("home.freeBadge")}</b>
            </div>
            <h3>{t("home.emailForwardTitle")}</h3>
            <p>{t("home.emailForwardCopy")}</p>
            <strong>{t("home.emailForwardAction")}</strong>
          </Link>
        </div>
      </div>
    </section>

    <section className="whySection">
      <div className="lightInner whyEditorial">
        <div className="whyTitle">
          <h2>{t("home.whyTitle1")}<br/>{t("home.whyTitle2")}</h2>
        </div>
        <div className="whyText">
          <p className="whyLead">{t("home.whyLead")}</p>
          <p>{t("home.whyP1")}</p>
          <p>{t("home.whyP2")}</p>
          <p><strong>{t("home.whySimpleStrong")}</strong>{t("home.whySimple")}</p>
          <p><strong>{t("home.whyNecessaryStrong")}</strong>{t("home.whyNecessary")}</p>
          <p><strong>{t("home.whyNoDistractionsStrong")}</strong>{t("home.whyNoDistractions")}</p>
        </div>
      </div>
    </section>

    <section className="learnSection" id="learn">
      <div className="lightInner">
        <div className="sectionHeading learnHeading">
          <div><span className="sectionLabel">{t("home.learnLabel")}</span><h2>{t("home.learnTitle")}</h2></div>
          <p>{t("home.learnCopy")}</p>
        </div>

        <div className="learnAccordion">
          {questions.map(index=><details className="learnItem" key={index}>
            <summary><span>{t("home.q"+index)}</span><i aria-hidden="true">+</i></summary>
            <div className="learnAnswer"><p>{t("home.a"+index)}</p></div>
          </details>)}
        </div>
      </div>
    </section>
  </div>;
}
