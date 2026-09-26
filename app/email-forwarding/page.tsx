"use client";
import Link from "next/link";
import {useI18n} from "@/components/I18nProvider";

export default function EmailForwardingInfo(){
  const {t}=useI18n();
  return <div className="page wide serviceLanding">
    <Link className="backHomeLink" href="/">← {t("common.backHome")}</Link>
    <p className="kicker">{t("emailForward.kicker")}</p>
    <h1 className="pageTitle">{t("emailForward.publicTitle")}</h1>
    <p className="pageIntro">{t("emailForward.publicCopy")}</p>
    <div className="serviceSteps">
      <article><span>01</span><h2>{t("emailForward.publicStep1Title")}</h2><p>{t("emailForward.publicStep1Copy")}</p></article>
      <article><span>02</span><h2>{t("emailForward.publicStep2Title")}</h2><p>{t("emailForward.publicStep2Copy")}</p></article>
      <article><span>03</span><h2>{t("emailForward.publicStep3Title")}</h2><p>{t("emailForward.publicStep3Copy")}</p></article>
    </div>
    <div className="serviceGate">
      <strong>{t("emailForward.manage")}</strong>
      <p>{t("domains.publicCopy")}</p>
      <div className="serviceCta">
        <Link className="primaryLink" href="/domains">{t("emailForward.manage")}</Link>
        <Link className="secondaryLink" href="/login?next=%2Fdomains">{t("login.button")}</Link>
      </div>
    </div>
  </div>;
}
