"use client";
import Link from "next/link";
import {useI18n} from "@/components/I18nProvider";
import BackLink from "@/components/BackLink";

export default function DropcatchInfo(){
  const {t}=useI18n();

  return <div className="page wide serviceLanding">
    <BackLink fallbackHref="/"/>
    <p className="kicker">{t("dropcatch.kicker")}</p>
    <h1 className="pageTitle">{t("dropcatch.title")}</h1>
    <p className="pageIntro">{t("dropcatch.copy")}</p>

    <div className="serviceDetailLead">
      <strong>{t("dropcatch.whatTitle")}</strong>
      <p>{t("dropcatch.whatCopy")}</p>
    </div>

    <div className="serviceSteps">
      <article><span>01</span><h2>{t("dropcatch.step1Title")}</h2><p>{t("dropcatch.step1Copy")}</p></article>
      <article><span>02</span><h2>{t("dropcatch.step2Title")}</h2><p>{t("dropcatch.step2Copy")}</p></article>
      <article><span>03</span><h2>{t("dropcatch.step3Title")}</h2><p>{t("dropcatch.step3Copy")}</p></article>
    </div>

    <div className="legalSections pricingTerms">
      <section>
        <h2>{t("dropcatch.outcomesTitle")}</h2>
        <p>{t("dropcatch.outcomesCopy")}</p>
      </section>
      <section>
        <h2>{t("dropcatch.priceTitle")}</h2>
        <p>{t("dropcatch.priceCopy")}</p>
      </section>
      <section>
        <h2>{t("dropcatch.paymentTitle")}</h2>
        <p>{t("dropcatch.paymentCopy")}</p>
      </section>
      <section>
        <h2>{t("dropcatch.guaranteeTitle")}</h2>
        <p>{t("dropcatch.guaranteeCopy")}</p>
      </section>
    </div>

    <div className="warningCard">
      <strong>{t("payment.cryptoOnlyTitle")}</strong>
      <p>{t("payment.cryptoOnlyCopy")}</p>
    </div>

    <div className="serviceGate">
      <strong>{t("dropcatch.signInTitle")}</strong>
      <p>{t("dropcatch.signInCopy")}</p>
      <div className="serviceCta">
        <Link className="primaryLink" href="/login?next=%2Fdropcatch%2Frequest">{t("dropcatch.startNow")}</Link>
      </div>
    </div>
  </div>;
}
