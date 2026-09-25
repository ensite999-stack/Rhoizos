"use client";
import {useI18n} from "@/components/I18nProvider";

export default function Support(){
  const {t}=useI18n();
  return <article className="page">
    <p className="kicker">{t("support.kicker")}</p>
    <h1 className="pageTitle">{t("support.title")}</h1>
    <p className="pageIntro">{t("support.copy")}</p>
    <a className="supportEmail" href="mailto:hello@rhoizos.com">hello@rhoizos.com</a>
  </article>;
}
