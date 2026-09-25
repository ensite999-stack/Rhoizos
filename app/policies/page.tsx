"use client";
import {useI18n} from "@/components/I18nProvider";

export default function Policies(){
  const {t}=useI18n();
  return <article className="page">
    <p className="kicker">{t("policies.kicker")}</p>
    <h1 className="pageTitle">{t("policies.title")}</h1>
    <p className="pageIntro">{t("policies.copy")}</p>
  </article>;
}
